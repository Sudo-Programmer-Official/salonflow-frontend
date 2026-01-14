import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import './style.css';
import App from './App.vue';
import router from './router';
import { setupTrialInterceptor } from './api/trialBanner';

const app = createApp(App);

setupTrialInterceptor();
app.use(router);
app.use(ElementPlus);

app.mount('#app');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Fail silently; app still works without SW.
    });
  });
}
