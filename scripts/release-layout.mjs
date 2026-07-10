import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function assertBuildEntry(directory, label) {
  try {
    await fs.access(path.join(directory, "index.html"));
  } catch {
    throw new Error(`${label} build is missing index.html: ${directory}`);
  }
}

async function copyDirectoryContents(source, destination) {
  await fs.mkdir(destination, { recursive: true });
  for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    await fs.cp(path.join(source, entry.name), path.join(destination, entry.name), {
      recursive: entry.isDirectory(),
      force: true,
    });
  }
}

export async function copyWebRelease({ creatorDir, adminDir, outputDir }) {
  await Promise.all([
    assertBuildEntry(creatorDir, "Creator"),
    assertBuildEntry(adminDir, "Admin"),
  ]);

  await copyDirectoryContents(creatorDir, outputDir);
  await copyDirectoryContents(adminDir, path.join(outputDir, "admin"));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const [creatorDir, adminDir, outputDir] = process.argv.slice(2);
  if (!creatorDir || !adminDir || !outputDir) {
    throw new Error("Usage: node release-layout.mjs <creator-dir> <admin-dir> <output-dir>");
  }
  await copyWebRelease({ creatorDir, adminDir, outputDir });
}
