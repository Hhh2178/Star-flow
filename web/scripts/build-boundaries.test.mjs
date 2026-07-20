import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const projectRoot = process.cwd();

let boundaryHelpers;
let boundaryHelpersImportError;
try {
  boundaryHelpers = await import("./build-boundaries.mjs");
} catch (error) {
  boundaryHelpersImportError = error;
}

test("Creator 模块边界拒绝 Admin 源码路径", () => {
  assert.ifError(boundaryHelpersImportError);
  assert.throws(
    () => boundaryHelpers.assertCreatorModuleBoundary(["C:\\workspace\\src\\admin\\main.ts"]),
    /Creator 构建禁止包含 Admin 模块.*\/src\/admin\/main\.ts/,
  );
});

test("Creator 模块边界允许 Creator 源码路径", () => {
  assert.ifError(boundaryHelpersImportError);
  assert.doesNotThrow(() => boundaryHelpers.assertCreatorModuleBoundary(["C:\\workspace\\src\\main.ts"]));
});

test("Creator 构建插件遍历 chunk.modules 并拒绝 Admin 模块", () => {
  assert.ifError(boundaryHelpersImportError);
  const plugin = boundaryHelpers.creatorModuleBoundaryPlugin();
  const bundle = {
    "index.js": {
      type: "chunk",
      modules: {
        "/workspace/src/main.ts": {},
        "/workspace/src/admin/AdminApp.vue": {},
      },
    },
    "favicon.ico": {
      type: "asset",
    },
  };

  assert.throws(() => plugin.generateBundle({}, bundle), /Creator 构建禁止包含 Admin 模块.*\/src\/admin\/AdminApp\.vue/);
});

test("Creator 产物拒绝 Provider 配置和协议编辑标记", () => {
  assert.ifError(boundaryHelpersImportError);
  for (const marker of ["/setting/vendorConfig/", "/api/admin/providers/updateProvider", "ProviderProtocolPanel"]) {
    assert.throws(
      () => boundaryHelpers.assertCreatorArtifactBoundary([["creator.js", `prefix-${marker}-suffix`]]),
      /Creator 构建禁止包含 Provider 配置标记/,
    );
  }
});

test("singlefile 配置显式保留当前应用 base", async () => {
  const config = await readFile(join(projectRoot, "vite.config.ts"), "utf8");
  assert.match(config, /viteSingleFile\(\{\s*overrideConfig:\s*\{\s*base:\s*appBase\s*\}\s*\}\)/);
  assert.match(config, /\.\.\.\(isAdmin \? \[\] : \[creatorModuleBoundaryPlugin\(\)\]\)/);
});

test("Admin 构建 HTML 使用 /admin/ base 和中文元数据", async () => {
  const sourceHtml = await readFile(join(projectRoot, "index.html"), "utf8");
  const adminHtml = await readFile(join(projectRoot, "dist", "admin", "index.html"), "utf8");
  assert.ok(sourceHtml.includes('href="/src/assets/brand/brand-favicon.svg"'), "源码未使用品牌 favicon");
  assert.ok(adminHtml.includes('<html lang="zh-CN">'), "Admin HTML 缺少 lang=zh-CN");
  assert.ok(adminHtml.includes("<title>Stars Flow 管理后台</title>"), "Admin HTML 标题不正确");
  assert.match(adminHtml, /href="\/admin\/brand-favicon-[^"]+\.svg"/, "Admin 品牌 favicon 未保留 /admin/ base");
});

test("test:admin 会先运行单测再重建双端产物和检查边界", async () => {
  const packageJson = JSON.parse(await readFile(join(projectRoot, "package.json"), "utf8"));
  assert.equal(
    packageJson.scripts["test:admin"],
    "yarn test:admin:unit && yarn build-only && node --test scripts/build-boundaries.test.mjs && yarn check:build-boundaries",
  );
});

test("test:ci 会先构建双端产物再检查产品身份", async () => {
  const packageJson = JSON.parse(await readFile(join(projectRoot, "package.json"), "utf8"));
  const command = packageJson.scripts["test:ci"];
  assert.ok(command.indexOf("yarn build") < command.indexOf("yarn test:product-identity"));
  assert.ok(command.indexOf("yarn build") < command.indexOf("yarn check:product-identity"));
});

test("CodeGraph 本地索引被 Git 忽略", async () => {
  const gitignore = await readFile(join(projectRoot, ".gitignore"), "utf8");
  assert.match(gitignore, /^\.codegraph\/$/m);
});
