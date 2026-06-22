// @file: scripts/validate-certs.mjs
import { access, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT_DIR = process.cwd();
const REQUIRED_CERTS = [
  {
    path: path.join("certs", "skynet.pem"),
    label: "HTTPS certificate",
  },
  {
    path: path.join("certs", "skynet-key.pem"),
    label: "HTTPS private key",
  },
  {
    path: path.join("certs", "rootCA.pem"),
    label: "HTTPS CA certificate",
  },
];

const issues = [];

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

function err(message) {
  console.log(`${paint("[error]", "red")} ${message}`);
}

async function validateCert(requiredCert) {
  const absolutePath = path.resolve(ROOT_DIR, requiredCert.path);
  const relativePath = toPosix(path.relative(ROOT_DIR, absolutePath));

  try {
    await access(absolutePath);
    const stats = await stat(absolutePath);

    if (!stats.isFile()) {
      issues.push({
        type: "not-file",
        label: requiredCert.label,
        path: relativePath,
      });
      return;
    }

    if (stats.size === 0) {
      issues.push({
        type: "empty-file",
        label: requiredCert.label,
        path: relativePath,
      });
      return;
    }

    ok(`${requiredCert.label} exists: ${paint(relativePath, "gray")}`);
  } catch (error) {
    issues.push({
      type: "missing-file",
      label: requiredCert.label,
      path: relativePath,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function printIssue(issue) {
  switch (issue.type) {
    case "missing-file":
      err(`Missing ${issue.label}: ${paint(issue.path, "bold")}`);
      return;

    case "not-file":
      err(`${issue.label} path is not a file: ${paint(issue.path, "bold")}`);
      return;

    case "empty-file":
      err(`${issue.label} file is empty: ${paint(issue.path, "bold")}`);
      return;

    default:
      err(`Unknown validation issue: ${JSON.stringify(issue)}`);
  }
}

async function main() {
  info(`Scanning workspace: ${toPosix(ROOT_DIR)}`);
  info(`Checking ${paint(String(REQUIRED_CERTS.length), "bold")} required certificate file(s).`);

  for (const requiredCert of REQUIRED_CERTS) {
    await validateCert(requiredCert);
  }

  if (issues.length === 0) {
    ok("All required certificate files exist.");
    return;
  }

  console.log("");
  err(`Certificate validation failed with ${issues.length} issue(s).`);

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
