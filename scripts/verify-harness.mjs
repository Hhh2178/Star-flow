import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const requiredFiles = [
  "AGENTS.md",
  "README.md",
  "docs/INDEX.md",
  "docs/governance/root-entry-responsibility-matrix.md",
  "docs/governance/documentation-governance-standard.md",
  "docs/governance/engineering-guardrails.md",
  "docs/governance/github-and-ci-policy.md",
  "docs/governance/worktree-and-branch-policy.md",
  "docs/governance/secrets-and-access-policy.md",
  "docs/systems/README.md",
  "docs/systems/harness/README.md",
  "docs/systems/app/README.md",
  "docs/systems/frontend/README.md",
  "docs/systems/admin/README.md",
  "docs/systems/ops/README.md",
  "docs/systems/ops/monorepo-release-runbook.md",
  "docs/logbooks/daily/2026-07-09.md",
  "docs/decisions/ADR-0003-private-monorepo-consolidation.md",
  "app/package.json",
  "web/package.json",
  ".github/workflows/ci.yml",
  ".codegraph/.gitignore",
  ".env.example",
];

function fail(message) {
  console.error(`[harness] ${message}`);
  process.exitCode = 1;
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    fail(`missing required file: ${file}`);
  }
}

const agents = read("AGENTS.md");
for (const text of ["docs/INDEX.md", "main", "dev", "harness:verify:project"]) {
  if (!agents.includes(text)) fail(`AGENTS.md missing anchor: ${text}`);
}

const readme = read("README.md");
for (const text of ["Hhh2178/Star-flow", "main", "dev", "ci:governance"]) {
  if (!readme.includes(text)) fail(`README.md missing anchor: ${text}`);
}

const rootPackage = JSON.parse(read("package.json"));
if (!rootPackage.scripts?.["ci:governance"]) {
  fail("package.json must define ci:governance");
}

for (const packagePath of ["app/package.json", "web/package.json"]) {
  const packageJson = JSON.parse(read(packagePath));
  if (!packageJson.scripts?.["test:ci"]) {
    fail(`${packagePath} must define test:ci`);
  }
}

const ciWorkflow = read(".github/workflows/ci.yml");
for (const text of ["name: Governance", "name: App", "name: Web", "npm run ci:governance", "yarn test:ci"]) {
  if (!ciWorkflow.includes(text)) fail(`CI workflow missing anchor: ${text}`);
}

if (fs.existsSync(path.join(root, ".gitmodules"))) {
  fail(".gitmodules must not exist after monorepo consolidation");
}

let outerBranch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || "";
if (!outerBranch) {
  try {
    outerBranch = execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).trim();
  } catch (error) {
    fail(`failed to read outer branch: ${error.message}`);
  }
}
if (!/^(main|dev|feature\/.+|hotfix\/.+|chore\/.+)$/.test(outerBranch)) {
  fail(`repository branch violates branch policy: ${outerBranch}`);
}

const appPath = path.join(root, "app");
if (!fs.existsSync(appPath)) {
  fail("app source path is missing");
}

const webPath = path.join(root, "web");
if (!fs.existsSync(webPath)) {
  fail("web source path is missing");
}

for (const sourcePath of [appPath, webPath]) {
  if (fs.existsSync(path.join(sourcePath, ".git"))) {
    fail(`${path.basename(sourcePath)} must be a normal monorepo directory, not a nested repository`);
  }
}

try {
  const stagedEntries = execFileSync("git", ["ls-files", "--stage", "app", "web"], {
    cwd: root,
    encoding: "utf8",
  });
  if (stagedEntries.split(/\r?\n/).some((line) => line.startsWith("160000 "))) {
    fail("app/web must not be gitlinks");
  }
} catch (error) {
  fail(`failed to inspect monorepo entries: ${error.message}`);
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("[harness] project verification passed");
