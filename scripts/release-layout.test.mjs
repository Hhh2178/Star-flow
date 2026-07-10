import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { copyWebRelease } from "./release-layout.mjs";

test("copies Creator to web root and Admin below /admin without deleting runtime files", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "stars-flow-release-"));
  const creatorDir = path.join(root, "dist", "creator");
  const adminDir = path.join(root, "dist", "admin");
  const outputDir = path.join(root, "app", "data", "web");
  await Promise.all([
    fs.mkdir(creatorDir, { recursive: true }),
    fs.mkdir(adminDir, { recursive: true }),
    fs.mkdir(outputDir, { recursive: true }),
  ]);
  await Promise.all([
    fs.writeFile(path.join(creatorDir, "index.html"), "creator"),
    fs.writeFile(path.join(creatorDir, "creator.worker.js"), "worker"),
    fs.writeFile(path.join(adminDir, "index.html"), "admin"),
    fs.writeFile(path.join(outputDir, "runtime.keep"), "keep"),
  ]);

  await copyWebRelease({ creatorDir, adminDir, outputDir });

  assert.equal(await fs.readFile(path.join(outputDir, "index.html"), "utf8"), "creator");
  assert.equal(await fs.readFile(path.join(outputDir, "admin", "index.html"), "utf8"), "admin");
  assert.equal(await fs.readFile(path.join(outputDir, "creator.worker.js"), "utf8"), "worker");
  assert.equal(await fs.readFile(path.join(outputDir, "runtime.keep"), "utf8"), "keep");
});

test("rejects incomplete dual builds before copying", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "stars-flow-release-invalid-"));
  const creatorDir = path.join(root, "creator");
  const adminDir = path.join(root, "admin");
  await Promise.all([
    fs.mkdir(creatorDir, { recursive: true }),
    fs.mkdir(adminDir, { recursive: true }),
    fs.writeFile(path.join(creatorDir, "index.html"), "creator"),
  ]);

  await assert.rejects(
    copyWebRelease({ creatorDir, adminDir, outputDir: path.join(root, "web") }),
    /Admin build is missing index\.html/,
  );
});
