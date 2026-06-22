// @file: scripts/clean.mjs
import { readdir, rm, lstat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT_DIR = process.cwd();
const ALLOWED_FLAGS = new Set(["--build", "--deps", "--dry-run", "--help"]);
const FLAGS = new Set(process.argv.slice(2));
const GLOBAL_BUILD_TARGETS = new Set(["dist", ".next", "coverage", ".turbo"]);
const GLOBAL_DEPS_TARGETS = new Set(["node_modules"]);
const GENERATED_DIR_NAME = "generated";
const SKIP_DIRS = new Set([".git"]);
const DRY_RUN = FLAGS.has("--dry-run");
const DEFAULT_FULL_CLEAN = !FLAGS.has("--build") && !FLAGS.has("--deps");
const CLEAN_BUILD = DEFAULT_FULL_CLEAN || FLAGS.has("--build");
const CLEAN_DEPS = DEFAULT_FULL_CLEAN || FLAGS.has("--deps");

const targetsToDelete = [];
const deletedPaths = [];
const skippedPaths = [];
const failedPaths = [];

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
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

function showUsage() {
  console.log(`Usage: node scripts/clean.mjs [--build] [--deps] [--dry-run]

Options:
  --build    Remove build artifacts: .turbo, .next, dist, coverage, generated, tsbuildinfo.
  --deps     Remove dependency folders: node_modules.
  --dry-run  Print matched targets without deleting them.

No --build/--deps flag means full cleanup.`);
}

function validateFlags() {
  for (const flag of FLAGS) {
    if (!ALLOWED_FLAGS.has(flag)) {
      throw new Error(`Unknown flag: ${flag}`);
    }
  }
}

async function removePath(targetPath) {
  const relativePath = toPosix(path.relative(ROOT_DIR, targetPath));

  if (DRY_RUN) {
    skippedPaths.push(relativePath);
    return;
  }

  try {
    await rm(targetPath, { recursive: true, force: true });
    deletedPaths.push(relativePath);
  } catch (error) {
    failedPaths.push({
      path: relativePath,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function shouldDeleteDirectory(name, relativePathPosix) {
  if (CLEAN_DEPS && GLOBAL_DEPS_TARGETS.has(name)) {
    return true;
  }

  if (CLEAN_BUILD && GLOBAL_BUILD_TARGETS.has(name)) {
    return true;
  }

  if (CLEAN_BUILD && name === GENERATED_DIR_NAME) {
    return relativePathPosix.startsWith("packages/");
  }

  if (CLEAN_BUILD && name === "target") {
    return relativePathPosix.startsWith("services/lambda/");
  }

  return false;
}

function shouldDeleteFile(name, relativePathPosix) {
  if (!CLEAN_BUILD) {
    return false;
  }

  if (!name.endsWith(".tsbuildinfo")) {
    return false;
  }

  return relativePathPosix.startsWith("apps/") || relativePathPosix.startsWith("packages/");
}

async function walkDirectory(currentDirPath) {
  let entries;
  try {
    entries = await readdir(currentDirPath, { withFileTypes: true });
  } catch (error) {
    failedPaths.push({
      path: toPosix(path.relative(ROOT_DIR, currentDirPath)),
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(currentDirPath, entry.name);
    const relativePathPosix = toPosix(path.relative(ROOT_DIR, fullPath));

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }

      if (!CLEAN_DEPS && GLOBAL_DEPS_TARGETS.has(entry.name)) {
        continue;
      }

      if (!CLEAN_BUILD && GLOBAL_BUILD_TARGETS.has(entry.name)) {
        continue;
      }

      if (!CLEAN_BUILD && entry.name === GENERATED_DIR_NAME && relativePathPosix.startsWith("packages/")) {
        continue;
      }

      if (!CLEAN_BUILD && entry.name === "target" && relativePathPosix.startsWith("services/lambda/")) {
        continue;
      }

      let stats;
      try {
        stats = await lstat(fullPath);
      } catch (error) {
        failedPaths.push({
          path: relativePathPosix,
          message: error instanceof Error ? error.message : String(error),
        });
        continue;
      }

      if (stats.isSymbolicLink()) {
        continue;
      }

      if (shouldDeleteDirectory(entry.name, relativePathPosix)) {
        targetsToDelete.push(fullPath);
        continue;
      }

      await walkDirectory(fullPath);
      continue;
    }

    if (entry.isFile() && shouldDeleteFile(entry.name, relativePathPosix)) {
      targetsToDelete.push(fullPath);
    }
  }
}

async function main() {
  validateFlags();

  if (FLAGS.has("--help")) {
    showUsage();
    return;
  }

  info(`Scanning workspace: ${toPosix(ROOT_DIR)}`);
  info(`Mode: build=${CLEAN_BUILD ? "yes" : "no"}, deps=${CLEAN_DEPS ? "yes" : "no"}`);
  await walkDirectory(ROOT_DIR);

  const totalTargets = targetsToDelete.length;
  info(`Found ${paint(String(totalTargets), "bold")} target(s) matching clean rules.`);

  if (totalTargets === 0) {
    ok("Nothing to clean.");
    return;
  }

  if (DRY_RUN) {
    warn("Dry run mode enabled. No targets will be deleted.");
  } else {
    info("Starting deletion...");
  }

  for (const targetPath of targetsToDelete) {
    const relativePath = toPosix(path.relative(ROOT_DIR, targetPath));
    info(`${DRY_RUN ? "Would delete" : "Deleting"} ${paint(relativePath, "gray")}`);
    await removePath(targetPath);
  }

  if (DRY_RUN) {
    ok(`Dry run complete. ${skippedPaths.length} target(s) marked for deletion.`);
  } else if (deletedPaths.length > 0) {
    ok(`Deleted ${deletedPaths.length} target(s).`);
  }

  const summaryLine = [
    `targets=${totalTargets}`,
    `deleted=${deletedPaths.length}`,
    `failed=${failedPaths.length}`,
    `dryRun=${DRY_RUN ? "yes" : "no"}`,
  ].join(", ");
  info(`Summary: ${summaryLine}`);

  if (!DRY_RUN && deletedPaths.length > 0) {
    console.log("");
    info("Deleted targets:");
    for (const deletedPath of deletedPaths.sort()) {
      console.log(`- ${deletedPath}`);
    }
  }

  if (failedPaths.length > 0) {
    console.log("");
    err(`Failures (${failedPaths.length}):`);
    for (const failure of failedPaths) {
      console.log(`- ${failure.path}: ${failure.message}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
