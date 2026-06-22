// @file: scripts/infra.mjs
import { spawn } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const COMPOSE_DIR = path.join(REPO_ROOT, "docker");
const COMPOSE_FILE = path.join(COMPOSE_DIR, "docker-compose.yml");

function supportsColor() {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR && process.env.FORCE_COLOR !== "0") return true;
  return Boolean(process.stdout.isTTY);
}

const COLOR = supportsColor();
const ansi = {
  reset: COLOR ? "\x1b[0m" : "",
  red: COLOR ? "\x1b[31m" : "",
  yellow: COLOR ? "\x1b[33m" : "",
  cyan: COLOR ? "\x1b[36m" : "",
};

function paint(value, color) {
  return `${ansi[color]}${value}${ansi.reset}`;
}

function info(message) {
  console.log(`${paint("[INFO ]", "cyan")} ${message}`);
}

function warn(message) {
  console.log(`${paint("[WARN ]", "yellow")} ${message}`);
}

function error(message) {
  console.error(`${paint("[ERROR]", "red")} ${message}`);
}

function showUsage() {
  console.log(`HSS stack helper

Usage:
  infra -u | --up          Pull images (if needed) and start the stack (detached)
  infra -a | --start       Start existing containers
  infra -t | --stop        Stop containers
  infra -d | --down        Down + remove volumes (docker compose down -v)
  infra -s | --status      Show status
  infra -r | --is-running  Print: true/false (machine-readable)
  infra -h | --help        Show this help

Examples:
  node ./scripts/infra.mjs --is-running
  node ./scripts/infra.mjs --up`);
}

async function pathExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveComposeDirectory() {
  if (!(await pathExists(COMPOSE_FILE))) {
    throw new Error(`docker-compose.yml not found: ${COMPOSE_FILE}`);
  }

  return COMPOSE_DIR;
}

function runCommand(command, args, options = {}) {
  const { cwd = process.cwd(), capture = false, quiet = false } = options;

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      windowsHide: true,
      stdio: capture || quiet ? ["ignore", "pipe", "pipe"] : "inherit",
    });

    let stdout = "";
    let stderr = "";

    if (child.stdout) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on("error", (spawnError) => {
      resolve({
        code: 127,
        stdout,
        stderr: spawnError instanceof Error ? spawnError.message : String(spawnError),
      });
    });

    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

async function assertCommand(command, args, failureMessage, exitCode) {
  const result = await runCommand(command, args, { quiet: true });
  if (result.code !== 0) {
    const details = result.stderr.trim() || result.stdout.trim();
    throw Object.assign(new Error(details ? `${failureMessage} ${details}` : failureMessage), {
      exitCode,
    });
  }
}

async function invokeCompose(args, options = {}) {
  const composeDir = await resolveComposeDirectory();
  return runCommand("docker", ["compose", ...args], { cwd: composeDir, ...options });
}

async function walkShellScripts(currentDir, files = []) {
  const entries = await readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      await walkShellScripts(fullPath, files);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".sh")) {
      files.push(fullPath);
    }
  }

  return files;
}

async function convertFileToLfIfNeeded(filePath) {
  const content = await readFile(filePath);
  if (content.includes(0)) {
    warn(`Skipping (contains NUL bytes, looks like UTF-16/binary): ${filePath}`);
    return false;
  }

  let changed = false;
  const output = [];

  for (let index = 0; index < content.length; index += 1) {
    const byte = content[index];

    if (byte === 13) {
      changed = true;
      if (index < content.length - 1 && content[index + 1] === 10) {
        continue;
      }
      continue;
    }

    output.push(byte);
  }

  if (!changed) {
    return false;
  }

  await writeFile(filePath, Buffer.from(output));
  return true;
}

async function ensureShellScriptsLf() {
  await resolveComposeDirectory();
  const files = await walkShellScripts(COMPOSE_DIR);

  if (files.length === 0) {
    info("No .sh files found under docker.");
    return;
  }

  let converted = 0;
  for (const file of files) {
    if (await convertFileToLfIfNeeded(file)) {
      converted += 1;
      info(`Converted to LF: ${file}`);
    }
  }

  if (converted === 0) {
    info(`All .sh files are already LF (${files.length} checked).`);
    return;
  }

  info(`LF normalization done (${converted} converted, ${files.length} checked).`);
}

async function showStackStatus() {
  const result = await invokeCompose(["ps"]);
  process.exitCode = result.code;
}

async function doUp() {
  await ensureShellScriptsLf();
  info("Pulling images (if needed)...");
  let result = await invokeCompose(["pull"]);
  if (result.code !== 0) process.exit(result.code);

  info("Starting stack...");
  result = await invokeCompose(["up", "-d", "--remove-orphans"]);
  if (result.code !== 0) process.exit(result.code);

  info("Stack status:");
  await showStackStatus();
}

async function doDown() {
  info("Stopping stack and removing volumes...");
  const result = await invokeCompose(["down", "--remove-orphans", "--volumes"]);
  if (result.code !== 0) process.exit(result.code);
  info("Done.");
}

async function doStart() {
  await ensureShellScriptsLf();
  info("Starting existing containers...");
  const result = await invokeCompose(["start"]);
  if (result.code !== 0) process.exit(result.code);

  info("Stack status:");
  await showStackStatus();
}

async function doStop() {
  info("Stopping containers...");
  const result = await invokeCompose(["stop"]);
  if (result.code !== 0) process.exit(result.code);

  info("Stack status:");
  await showStackStatus();
}

function parseServices(output) {
  return output
    .split(/\r?\n/)
    .map((service) => service.trim())
    .filter(Boolean);
}

async function getExpectedServices() {
  const result = await invokeCompose(["config", "--services"], { capture: true });
  if (result.code !== 0) {
    return [];
  }

  return parseServices(result.stdout);
}

async function getRunningServices() {
  const result = await invokeCompose(["ps", "--services", "--status", "running"], { capture: true });
  if (result.code !== 0) {
    return [];
  }

  return parseServices(result.stdout);
}

async function doIsRunning() {
  const expected = await getExpectedServices();
  if (expected.length === 0) {
    console.log("false");
    process.exit(1);
  }

  const running = await getRunningServices();
  if (running.length >= expected.length) {
    console.log("true");
    process.exit(0);
  }

  console.log("false");
  process.exit(1);
}

function parseArgs(rawArgs) {
  let action = null;

  for (const rawArg of rawArgs) {
    const arg = rawArg.trim();
    if (!arg) continue;

    switch (arg) {
      case "-h":
      case "--help":
        return "help";
      case "-u":
      case "--up":
        action = "up";
        break;
      case "-d":
      case "--down":
        action = "down";
        break;
      case "-a":
      case "--start":
        action = "start";
        break;
      case "-t":
      case "--stop":
        action = "stop";
        break;
      case "-s":
      case "--status":
        action = "status";
        break;
      case "-r":
      case "--is-running":
        action = "is-running";
        break;
      default:
        throw new Error(`Unknown argument: ${arg} (use -h / --help)`);
    }
  }

  return action ?? "up";
}

async function main() {
  const action = parseArgs(process.argv.slice(2));

  if (action === "help") {
    showUsage();
    return;
  }

  await assertCommand("docker", ["version"], "Docker CLI not found or not reachable.", 1);
  await assertCommand("docker", ["info"], "Docker Engine is not running or not reachable.", 2);
  await assertCommand("docker", ["compose", "version"], "'docker compose' is not available.", 3);

  switch (action) {
    case "up":
      await doUp();
      break;
    case "down":
      await doDown();
      break;
    case "start":
      await doStart();
      break;
    case "stop":
      await doStop();
      break;
    case "status":
      await showStackStatus();
      break;
    case "is-running":
      await doIsRunning();
      break;
    default:
      throw new Error(`Unsupported action: ${action}`);
  }
}

main().catch((mainError) => {
  const isRunningCheck = process.argv.includes("--is-running") || process.argv.includes("-r");
  if (isRunningCheck) {
    console.log("false");
    process.exit(1);
  }

  const message = mainError instanceof Error ? mainError.message : String(mainError);
  error(message);
  warn("Tip: run 'node ./scripts/infra.mjs -h'");
  process.exit(typeof mainError?.exitCode === "number" ? mainError.exitCode : 99);
});
