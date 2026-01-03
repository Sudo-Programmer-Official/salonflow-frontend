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
