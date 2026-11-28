import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import Landing from "./components/Landing.vue";
import Faq from "./components/Faq.vue";
import "./style.css";
import "./landing.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("Landing", Landing);
    app.component("Faq", Faq);
  },
} satisfies Theme;
