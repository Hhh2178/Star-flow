import { storeToRefs } from "pinia";
import { MessagePlugin, NotifyPlugin } from "tdesign-vue-next";
import settingStore from "@/stores/setting";
import { createApiClient } from "@/shared/api";
import { h } from "vue";

const instance = createApiClient({
  getBaseURL: () => storeToRefs(settingStore()).runtimeBaseUrl.value,
  getTimeout: () => storeToRefs(settingStore()).otherSetting.value.axiosTimeOut,
  unwrapResponse: true,
  onUnauthorized: () => {
    localStorage.removeItem("token");
    window.location.hash = "#/login";
    MessagePlugin.error(window.$t("common.sessionExpired"));
  },
  onError: (error) => {
    const responseData = error.response?.data as { message?: unknown } | undefined;
    if (error.message.includes("Network Error") || responseData?.message === "Network Error") {
      NotifyPlugin.error({
        title: "Network Error",
        closeBtn: true,
        duration: 3000,
        className: "customNotifyFull",
        content: () =>
          h("div", [
            h("div", { style: { marginBottom: "8px" } }, "网络连接失败，请依次尝试："),
            h("div", { style: { marginBottom: "4px" } }, "1. 右键程序图标 → 以管理员身份运行"),
            h("div", { style: { marginBottom: "4px" } }, "2. 检查后端服务是否已正常启动"),
            h("div", [
              "3. 安装 Visual C++ 运行库：",
              h("div", { style: { display: "flex", gap: "8px", marginTop: "4px" } }, [
                h(
                  "a",
                  {
                    href: "https://aka.ms/vs/17/release/vc_redist.x86.exe",
                    target: "_blank",
                    rel: "noopener noreferrer",
                    style: { color: "#0052d9" },
                  },
                  "32位下载",
                ),
                h(
                  "a",
                  {
                    href: "https://aka.ms/vs/17/release/vc_redist.x64.exe",
                    target: "_blank",
                    rel: "noopener noreferrer",
                    style: { color: "#0052d9" },
                  },
                  "64位下载",
                ),
              ]),
            ]),
          ]),
      });
    }
  },
});

export default instance;
