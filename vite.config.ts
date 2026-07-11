import { fileURLToPath, URL } from "node:url";
import { defineConfig, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { TDesignResolver } from "@tdesign-vue-next/auto-import-resolver";
import { viteSingleFile } from "vite-plugin-singlefile";
import postcsspxtoviewport from "postcss-px-to-viewport";
import { creatorModuleBoundaryPlugin } from "./scripts/build-boundaries.mjs";

function replaceRequired(html: string, search: string, replacement: string, label: string): string {
  if (!html.includes(search)) {
    throw new Error(`无法在 index.html 中定位${label}`);
  }
  return html.replace(search, replacement);
}

function appEntryPlugin(isAdmin: boolean): Plugin {
  const creatorEntry = '<script type="module" src="/src/main.ts"></script>';
  const adminEntry = '<script type="module" src="/src/admin/main.ts"></script>';

  return {
    name: "stars-flow-app-entry",
    enforce: "pre",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        if (!isAdmin) return html;

        const withAdminEntry = replaceRequired(html, creatorEntry, adminEntry, " Creator 入口 /src/main.ts");
        const withChineseLanguage = replaceRequired(withAdminEntry, '<html lang="">', '<html lang="zh-CN">', " html lang 属性");
        return replaceRequired(withChineseLanguage, "<title>Stars Flow</title>", "<title>Stars Flow 管理后台</title>", " Creator 标题");
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const isAdmin = mode === "admin";
  const appName = isAdmin ? "admin" : "creator";
  const appBase = isAdmin ? "/admin/" : "./";

  return {
    base: appBase,
    build: {
      outDir: `dist/${appName}`,
      assetsInlineLimit: Infinity,
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
    plugins: [
      appEntryPlugin(isAdmin),
      ...(isAdmin ? [] : [creatorModuleBoundaryPlugin()]),
      vue(),
      AutoImport({
        dts: isAdmin ? false : "src/types/auto-imports.d.ts",
        imports: ["vue", "pinia", "vue-router"],
        resolvers: [
          TDesignResolver({
            library: "vue-next",
          }),
          TDesignResolver({
            library: "chat",
          }),
        ],
      }),
      Components({
        dts: isAdmin ? false : "src/types/components.d.ts",
        resolvers: [
          TDesignResolver({
            library: "vue-next",
          }),
          TDesignResolver({
            library: "chat",
          }),
        ],
      }),
      viteSingleFile({ overrideConfig: { base: appBase } }),
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    test: {
      exclude: ["**/.worktrees/**", "**/node_modules/**", "**/dist/**", "**/.git/**", "**/.cache/**"],
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: "modern-compiler",
        },
      },
      postcss: {
        plugins: [
          postcsspxtoviewport({
            // 要转化的单位
            unitToConvert: "px",
            // UI设计稿的大小
            viewportWidth: 1600,
            // 转换后的精度
            unitPrecision: 4,
            // 转换后的单位
            viewportUnit: "rem",
            // 字体转换后的单位
            fontViewportUnit: "rem",
            // 能转换的属性，*表示所有属性，!border表示border不转
            propList: ["*"],
            // 指定不转换为视窗单位的类名，
            selectorBlackList: ["ignore"],
            // 最小转换的值，小于等于1不转
            minPixelValue: 1,
            // 是否在媒体查询的css代码中也进行转换，默认false
            mediaQuery: true,
            // 是否转换后直接更换属性值
            replace: true,
            // 忽略某些文件夹下的文件或特定文件，例如 'node_modules' 下的文件
            exclude: [],
            // 包含那些文件或者特定文件
            include: [],
            // 是否处理横屏情况
            landscape: false,
          }),
        ],
      },
    },
    server: {
      port: isAdmin ? 50189 : 50188,
      strictPort: true,
      proxy: isAdmin
        ? {
            "/api": {
              target: "http://127.0.0.1:10588",
              changeOrigin: true,
            },
          }
        : undefined,
    },
  };
});
