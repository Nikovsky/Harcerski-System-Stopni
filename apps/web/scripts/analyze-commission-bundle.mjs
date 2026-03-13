// @file: apps/web/scripts/analyze-commission-bundle.mjs
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");
const nextRoot = path.join(appRoot, ".next");
const outputRoot = path.join(appRoot, "generated", "bundle-analysis");

const ROUTES = [
  {
    name: "commission-inbox",
    routeKey: "/[locale]/commission/[commissionUuid]/page",
    routeEntryKey: "[project]/apps/web/src/app/[locale]/commission/[commissionUuid]/page",
    parentLayoutEntryKey: "[project]/apps/web/src/app/[locale]/commission/layout",
    routeChunkPrefix:
      "static/chunks/app/%5Blocale%5D/commission/%5BcommissionUuid%5D/page-",
    clientReferenceManifestPath: path.join(
      nextRoot,
      "server",
      "app",
      "[locale]",
      "commission",
      "[commissionUuid]",
      "page_client-reference-manifest.js",
    ),
  },
  {
    name: "commission-application-detail",
    routeKey:
      "/[locale]/commission/[commissionUuid]/applications/[applicationUuid]/page",
    routeEntryKey:
      "[project]/apps/web/src/app/[locale]/commission/[commissionUuid]/applications/[applicationUuid]/page",
    parentLayoutEntryKey: "[project]/apps/web/src/app/[locale]/commission/layout",
    routeChunkPrefix:
      "static/chunks/app/%5Blocale%5D/commission/%5BcommissionUuid%5D/applications/%5BapplicationUuid%5D/page-",
    clientReferenceManifestPath: path.join(
      nextRoot,
      "server",
      "app",
      "[locale]",
      "commission",
      "[commissionUuid]",
      "applications",
      "[applicationUuid]",
      "page_client-reference-manifest.js",
    ),
  },
];

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function normalizeClientChunkPath(chunkPath) {
  return chunkPath.replace(/^\/_next\//, "");
}

function isStaticClientJsChunk(chunkPath) {
  return (
    typeof chunkPath === "string" &&
    (chunkPath.startsWith("/_next/static/") || chunkPath.startsWith("static/")) &&
    chunkPath.endsWith(".js")
  );
}

function runBuildWithAnalyzer() {
  const result =
    process.platform === "win32"
      ? spawnSync("cmd.exe", ["/d", "/s", "/c", "pnpm exec next build --webpack"], {
          cwd: appRoot,
          env: {
            ...process.env,
            BUNDLE_ANALYZE: "true",
          },
          stdio: "inherit",
          shell: false,
        })
      : spawnSync("pnpm", ["exec", "next", "build", "--webpack"], {
          cwd: appRoot,
          env: {
            ...process.env,
            BUNDLE_ANALYZE: "true",
          },
          stdio: "inherit",
          shell: false,
        });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `Bundle analysis build failed with exit code ${result.status}.`,
    );
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readFileSize(relativePath) {
  const fullPath = path.join(
    nextRoot,
    ...relativePath.split("/").map((segment) => decodeURIComponent(segment)),
  );
  const stats = await fs.stat(fullPath);
  return stats.size;
}

async function collectChunkDetails(chunkPaths) {
  const uniqueChunkPaths = [...new Set(chunkPaths)];
  const chunkDetails = [];

  for (const chunkPath of uniqueChunkPaths) {
    chunkDetails.push({
      path: chunkPath,
      sizeBytes: await readFileSize(chunkPath),
    });
  }

  return chunkDetails.sort((left, right) => right.sizeBytes - left.sizeBytes);
}

async function loadClientReferenceManifest(filePath, routeKey) {
  const source = await fs.readFile(filePath, "utf8");
  const context = {
    globalThis: {},
  };

  vm.runInNewContext(source, context, { filename: filePath });

  const manifest = context.globalThis.__RSC_MANIFEST?.[routeKey];
  if (!manifest) {
    throw new Error(
      `Could not resolve client reference manifest for route ${routeKey}.`,
    );
  }

  return manifest;
}

function uniqueNormalizedChunks(chunks) {
  return [
    ...new Set(
      chunks
        .filter(isStaticClientJsChunk)
        .map((chunkPath) => normalizeClientChunkPath(chunkPath)),
    ),
  ];
}

function collectManifestClientChunks(manifest) {
  return uniqueNormalizedChunks(
    Object.values(manifest.clientModules ?? {}).flatMap(
      (entry) => entry.chunks ?? [],
    ),
  );
}

function resolveEntryChunksFromManifest(manifest, entryKey) {
  return uniqueNormalizedChunks(manifest.entryJSFiles?.[entryKey] ?? []);
}

function resolveRouteEntryChunks(route, manifest) {
  const explicitEntryChunks = resolveEntryChunksFromManifest(
    manifest,
    route.routeEntryKey,
  );
  if (explicitEntryChunks.length > 0) {
    return explicitEntryChunks;
  }

  return collectManifestClientChunks(manifest);
}

function resolveParentLayoutEntryChunks(route, manifest) {
  return resolveEntryChunksFromManifest(manifest, route.parentLayoutEntryKey);
}

function resolveRouteOnlyEntryChunks({
  route,
  routeEntryChunks,
  parentLayoutEntryChunks,
  sharedRootChunks,
}) {
  if (parentLayoutEntryChunks.length > 0) {
    return routeEntryChunks.filter(
      (chunkPath) => !parentLayoutEntryChunks.includes(chunkPath),
    );
  }

  const routeSpecificChunks = routeEntryChunks.filter((chunkPath) =>
    chunkPath.startsWith(route.routeChunkPrefix),
  );
  if (routeSpecificChunks.length > 0) {
    return routeSpecificChunks;
  }

  return routeEntryChunks.filter((chunkPath) => !sharedRootChunks.includes(chunkPath));
}

async function buildRouteReport({
  route,
  buildManifest,
}) {
  const manifest = await loadClientReferenceManifest(
    route.clientReferenceManifestPath,
    route.routeKey,
  );
  const sharedRootChunks = [
    ...uniqueNormalizedChunks(buildManifest.polyfillFiles),
    ...uniqueNormalizedChunks(buildManifest.rootMainFiles),
  ];
  const routeEntryChunks = resolveRouteEntryChunks(route, manifest);
  const parentLayoutEntryChunks = resolveParentLayoutEntryChunks(route, manifest);
  const routeOnlyEntryChunks = resolveRouteOnlyEntryChunks({
    route,
    routeEntryChunks,
    parentLayoutEntryChunks,
    sharedRootChunks,
  });
  const totalRouteChunks = uniqueNormalizedChunks([
    ...sharedRootChunks,
    ...routeEntryChunks,
  ]);
  const routeOnlyNormalizedChunks = uniqueNormalizedChunks(routeOnlyEntryChunks);
  const totalChunkDetails = await collectChunkDetails(totalRouteChunks);
  const routeOnlyChunkDetails = await collectChunkDetails(routeOnlyNormalizedChunks);

  const clientModules = Object.entries(manifest.clientModules ?? {})
    .map(([modulePath, entry]) => ({
      modulePath,
      chunks: uniqueNormalizedChunks(entry.chunks ?? []),
    }))
    .filter((entry) =>
      entry.chunks.some((chunkPath) =>
        routeOnlyNormalizedChunks.includes(chunkPath),
      ),
    )
    .map((entry) => {
      const routeOnlyChunksForModule = entry.chunks.filter((chunkPath) =>
        routeOnlyNormalizedChunks.includes(chunkPath),
      );
      const routeOnlyBytes = routeOnlyChunkDetails
        .filter((chunk) => routeOnlyChunksForModule.includes(chunk.path))
        .reduce((sum, chunk) => sum + chunk.sizeBytes, 0);

      return {
        modulePath: entry.modulePath,
        routeOnlyChunks: routeOnlyChunksForModule,
        routeOnlyBytes,
      };
    })
    .sort((left, right) => right.routeOnlyBytes - left.routeOnlyBytes);

  return {
    name: route.name,
    routeKey: route.routeKey,
    totalClientJsBytes: totalChunkDetails.reduce(
      (sum, chunk) => sum + chunk.sizeBytes,
      0,
    ),
    routeOnlyClientJsBytes: routeOnlyChunkDetails.reduce(
      (sum, chunk) => sum + chunk.sizeBytes,
      0,
    ),
    sharedRootChunks: await collectChunkDetails(uniqueNormalizedChunks(sharedRootChunks)),
    routeEntryChunks: await collectChunkDetails(uniqueNormalizedChunks(routeEntryChunks)),
    routeOnlyEntryChunks: routeOnlyChunkDetails,
    routeOnlyClientModules: clientModules,
  };
}

async function collectVisualReports() {
  const analyzeDir = path.join(nextRoot, "analyze");
  try {
    const files = await fs.readdir(analyzeDir, { withFileTypes: true });
    return files
      .filter((entry) => entry.isFile())
      .map((entry) => path.join(analyzeDir, entry.name))
      .sort();
  } catch {
    return [];
  }
}

function renderMarkdown(report) {
  const lines = [
    "# Commission Bundle Analysis",
    "",
    `Generated: ${report.generatedAt}`,
    "",
  ];

  if (report.visualReports.length > 0) {
    lines.push("## Visual Reports", "");
    for (const visualReport of report.visualReports) {
      lines.push(`- ${path.relative(appRoot, visualReport)}`);
    }
    lines.push("");
  }

  for (const route of report.routes) {
    lines.push(`## ${route.name}`, "");
    lines.push(`- Route key: \`${route.routeKey}\``);
    lines.push(`- Total client JS: ${formatKiB(route.totalClientJsBytes)}`);
    lines.push(`- Route-only client JS: ${formatKiB(route.routeOnlyClientJsBytes)}`);
    lines.push("");

    lines.push("### Route-only Chunks", "");
    if (route.routeOnlyEntryChunks.length === 0) {
      lines.push("- No route-only entry chunks. Cost is dominated by shared layout/app chrome.");
    } else {
      for (const chunk of route.routeOnlyEntryChunks) {
        lines.push(`- \`${chunk.path}\` (${formatKiB(chunk.sizeBytes)})`);
      }
    }
    lines.push("");

    lines.push("### Modules Touching Route-only Chunks", "");
    if (route.routeOnlyClientModules.length === 0) {
      lines.push("- No route-only client modules detected.");
    } else {
      for (const moduleInfo of route.routeOnlyClientModules.slice(0, 12)) {
        lines.push(
          `- \`${moduleInfo.modulePath}\` -> ${moduleInfo.routeOnlyChunks.join(", ")} (${formatKiB(moduleInfo.routeOnlyBytes)})`,
        );
      }
    }
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

await fs.mkdir(outputRoot, { recursive: true });
runBuildWithAnalyzer();

const buildManifest = await readJson(path.join(nextRoot, "build-manifest.json"));
const routes = [];
for (const route of ROUTES) {
  routes.push(await buildRouteReport({ route, buildManifest }));
}

const report = {
  generatedAt: new Date().toISOString(),
  visualReports: await collectVisualReports(),
  routes,
};

await fs.writeFile(
  path.join(outputRoot, "commission-bundle-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
await fs.writeFile(
  path.join(outputRoot, "commission-bundle-report.md"),
  renderMarkdown(report),
  "utf8",
);

console.log("Commission bundle analysis report written to:");
console.log(`- ${path.join(outputRoot, "commission-bundle-report.json")}`);
console.log(`- ${path.join(outputRoot, "commission-bundle-report.md")}`);
if (report.visualReports.length > 0) {
  console.log("Visual bundle reports:");
  for (const visualReport of report.visualReports) {
    console.log(`- ${visualReport}`);
  }
}
