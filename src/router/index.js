import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import PlanList from '../views/PlanList.vue'
import PlanForm from '../views/PlanForm.vue'
import PlanDetail from '../views/PlanDetail.vue'
import Settings from '../views/Settings.vue'

const routes = [
  { path: '/', name: 'home', component: Home, meta: { tabbar: true } },
  { path: '/plans', name: 'plans', component: PlanList, meta: { tabbar: true } },
  { path: '/plans/new', name: 'plan-new', component: PlanForm },
  { path: '/plans/:id/edit', name: 'plan-edit', component: PlanForm },
  { path: '/plans/:id', name: 'plan-detail', component: PlanDetail },
  { path: '/settings', name: 'settings', component: Settings, meta: { tabbar: true } }
]

// hash 模式：纯静态托管即可运行，无需服务端 SPA 回退配置
export default createRouter({
  history: createWebHashHistory(),
  routes
})
