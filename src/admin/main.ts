import { createApp } from "vue";
import { createPinia } from "pinia";
import TDesign from "tdesign-vue-next";
import { install } from "@icon-park/vue-next/es/all";
import AdminApp from "./AdminApp.vue";
import { createAdminRouter } from "./router";
import { initAdminTheme } from "./theme";

import "tdesign-vue-next/es/style/index.css";
import "@icon-park/vue-next/styles/index.css";
import "../assets/starsflow-theme.scss";
import "./styles/admin.scss";

initAdminTheme();

const app = createApp(AdminApp);
const pinia = createPinia();

install(app, "i");
app.use(pinia);
app.use(createAdminRouter());
app.use(TDesign);
app.mount("#app");
