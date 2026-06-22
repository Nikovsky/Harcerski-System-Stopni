// @file: scripts/validate-env.mjs
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT_DIR = process.cwd();
const EXAMPLE_FILE_NAME = ".env.example";
const ENV_FILE_NAME = ".env";
const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
  ".turbo",
  ".cache",
  "bin",
  "obj",
  "target",
  ".venv",
  "venv",
]);

const envExamplePaths = [];
const issues = [];

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function relativeToRoot(filePath) {
  return toPosix(path.relative(ROOT_DIR, filePath));
}

function supportsColor() {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR && process.env.FORCE_COLOR !== "0") return true;
  return Boolean(process.stdout.isTTY);
}

const COLOR = supportsColor();
const ansi = {
  reset: COLOR ? "\x1b[0m" : "",
  red: COLOR ? "\x1b[31m" : "",
  green: COLOR ? "\x1b[32m" : "",
  yellow: COLOR ? "\x1b[33m" : "",
  cyan: COLOR ? "\x1b[36m" : "",
  gray: COLOR ? "\x1b[90m" : "",
  bold: COLOR ? "\x1b[1m" : "",
};

function paint(value, color) {
  return `${ansi[color]}${value}${ansi.reset}`;
}

function info(message) {
  console.log(`${paint("[info]", "cyan")} ${message}`);
}

function ok(message) {
  console.log(`${paint("[ok]", "green")} ${message}`);
}

function warn(message) {
  console.log(`${paint("[warn]", "yellow")} ${message}`);
}

function err(message) {
  console.log(`${paint("[error]", "red")} ${message}`);
}

function parseEnvContent(filePath, content) {
  const keys = new Map();
  const duplicates = [];
  const invalidLines = [];
  const lines = content.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;
    const trimmed = line.trim();

    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    const envLine = trimmed.startsWith("export ") ? trimmed.slice("export ".length).trimStart() : trimmed;
    const match = envLine.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);

    if (!match) {
      invalidLines.push({ filePath, lineNumber, text: line });
      continue;
    }

    const key = match[1];

    if (keys.has(key)) {
      duplicates.push({
        filePath,
        key,
        firstLine: keys.get(key).lineNumber,
        duplicateLine: lineNumber,
      });
      continue;
    }

    keys.set(key, { filePath, lineNumber });
  }

  return { keys, duplicates, invalidLines };
}

async function readEnvFile(filePath) {
  const content = await readFile(filePath, "utf8");
  return parseEnvContent(filePath, content);
}

async function findEnvExamples(currentDirPath) {
  let entries;

  try {
    entries = await readdir(currentDirPath, { withFileTypes: true });
  } catch (error) {
    issues.push({
      type: "read-error",
      filePath: currentDirPath,
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(currentDirPath, entry.name);

    if (entry.isFile() && entry.name === EXAMPLE_FILE_NAME) {
      envExamplePaths.push(fullPath);
      continue;
    }

    if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) {
      continue;
    }

    let stats;

    try {
      stats = await lstat(fullPath);
    } catch (error) {
      issues.push({
        type: "read-error",
        filePath: fullPath,
        message: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    if (!stats.isSymbolicLink()) {
      await findEnvExamples(fullPath);
    }
  }
}

function addParseIssues(result) {
  for (const invalidLine of result.invalidLines) {
    issues.push({ type: "invalid-line", ...invalidLine });
  }

  for (const duplicate of result.duplicates) {
    issues.push({ type: "duplicate-key", ...duplicate });
  }
}

function compareEnvFiles(examplePath, exampleResult, envPath, envResult) {
  for (const [key, location] of exampleResult.keys.entries()) {
    if (!envResult.keys.has(key)) {
      issues.push({
        type: "missing-key",
        envPath,
        examplePath,
        key,
        lineNumber: location.lineNumber,
      });
    }
  }

  for (const [key, location] of envResult.keys.entries()) {
    if (!exampleResult.keys.has(key)) {
      issues.push({
        type: "extra-key",
        envPath,
        examplePath,
        key,
        lineNumber: location.lineNumber,
      });
    }
  }
}

async function validateEnvPair(examplePath) {
  const envPath = path.join(path.dirname(examplePath), ENV_FILE_NAME);
  const exampleResult = await readEnvFile(examplePath);
  addParseIssues(exampleResult);

  let envResult;

  try {
    envResult = await readEnvFile(envPath);
  } catch (error) {
    issues.push({
      type: "missing-env-file",
      envPath,
      examplePath,
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  addParseIssues(envResult);
  compareEnvFiles(examplePath, exampleResult, envPath, envResult);
}

function printIssue(issue) {
  switch (issue.type) {
    case "missing-env-file":
      err(`Missing env file: ${paint(relativeToRoot(issue.envPath), "bold")}`);
      console.log(`  Required by: ${relativeToRoot(issue.examplePath)}`);
      return;

    case "missing-key":
      err(`Missing variable in ${paint(relativeToRoot(issue.envPath), "bold")}: ${paint(issue.key, "bold")}`);
      console.log(`  Expected from: ${relativeToRoot(issue.examplePath)}:${issue.lineNumber}`);
      return;

    case "extra-key":
      warn(`Extra variable in ${paint(relativeToRoot(issue.envPath), "bold")}: ${paint(issue.key, "bold")}`);
      console.log(`  Defined at: ${relativeToRoot(issue.envPath)}:${issue.lineNumber}`);
      console.log(`  Not present in: ${relativeToRoot(issue.examplePath)}`);
      return;

    case "duplicate-key":
      err(`Duplicate variable in ${paint(relativeToRoot(issue.filePath), "bold")}: ${paint(issue.key, "bold")}`);
      console.log(`  First line: ${issue.firstLine}`);
      console.log(`  Duplicate line: ${issue.duplicateLine}`);
      return;

    case "invalid-line":
      err(`Invalid env line in ${paint(relativeToRoot(issue.filePath), "bold")}:${issue.lineNumber}`);
      console.log(`  ${issue.text}`);
      return;

    case "read-error":
      err(`Cannot read ${paint(relativeToRoot(issue.filePath), "bold")}: ${issue.message}`);
      return;

    default:
      err(`Unknown validation issue: ${JSON.stringify(issue)}`);
  }
}

async function main() {
  info(`Scanning workspace: ${toPosix(ROOT_DIR)}`);
  await findEnvExamples(ROOT_DIR);

  if (envExamplePaths.length === 0) {
    warn(`No ${EXAMPLE_FILE_NAME} files found.`);
    return;
  }

  info(`Found ${paint(String(envExamplePaths.length), "bold")} ${EXAMPLE_FILE_NAME} file(s).`);

  for (const examplePath of envExamplePaths.sort()) {
    await validateEnvPair(examplePath);
  }

  if (issues.length === 0) {
    ok("All env files match their examples.");
    return;
  }

  console.log("");
  err(`Env validation failed with ${issues.length} issue(s).`);

  for (const issue of issues) {
    console.log("");
    printIssue(issue);
  }

  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
