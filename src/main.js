import { createApp } from 'vue'
import Vant from 'vant'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import 'vant/lib/index.css'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import router from './router'
import './main.css'

dayjs.locale('zh-cn')

// 注册 Service Worker，实现离线可用与资源缓存
registerSW({ immediate: true })

const app = createApp(App)
app.use(Vant)
app.use(router)
app.mount('#app')
