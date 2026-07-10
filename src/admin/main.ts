import { createApp } from "vue";
import "tdesign-vue-next/es/style/index.css";

import "@/assets/starsflow-theme.scss";
import AdminApp from "./AdminApp.vue";
import "./styles/admin.scss";

createApp(AdminApp).mount("#app");
