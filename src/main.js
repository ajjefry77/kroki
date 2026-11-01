import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { router } from "./router";
import "./style.css";
import "./styles/transitions.css";
import "@fortawesome/fontawesome-free/css/fontawesome.min.css";
import "@fortawesome/fontawesome-free/css/solid.min.css";
import "@fortawesome/fontawesome-free/css/regular.min.css";

const app = createApp(App);
app.use(createPinia());
app.use(router);

// مونت بعد از کامل شدن حل مسیر اولیه تا صفحه‌ی درست بدون پرش رندر شود
router.isReady().then(() => app.mount("#app"));
