/**
 * 全局数据中心：计划 + 打卡记录
 * 纯 localStorage 持久化，无后端依赖
 */
import { reactive } from 'vue'
import dayjs from 'dayjs'

const PLANS_KEY = 'checkin_plans_v1'
const RECORDS_KEY = 'checkin_records_v1'

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

/** 响应式全局状态 */
export const store = reactive({
  // 计划：[{ id, name, startDate, endDate, paused, createdAt, tasks: [{ id, name }] }]
  plans: loadJSON(PLANS_KEY, []),
  // 打卡记录：{ [planId]: { 'YYYY-MM-DD': [taskId, ...] } }
  records: loadJSON(RECORDS_KEY, {})
})

/** 防抖持久化到 localStorage */
let saveTimer = null
function save() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    localStorage.setItem(PLANS_KEY, JSON.stringify(store.plans))
    localStorage.setItem(RECORDS_KEY, JSON.stringify(store.records))
  }, 200)
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export const todayStr = () => dayjs().format('YYYY-MM-DD')

/** 日期是否在计划周期内（YYYY-MM-DD 字符串比较安全） */
export function isDateActive(plan, date) {
  return date >= plan.startDate && date <= plan.endDate
}

/** 某计划某天的已完成任务 id 列表 */
export function dayRecord(planId, date) {
  return store.records[planId]?.[date] || []
}

/**
 * 单日状态：
 * inactive 周期外/无任务 | future 未来 | none 未完成 | partial 部分完成 | all 全部完成
 */
export function dayStatus(plan, date) {
  if (!isDateActive(plan, date) || !plan.tasks.length) return 'inactive'
  if (date > todayStr()) return 'future'
  const done = dayRecord(plan.id, date).length
  if (done === 0) return 'none'
  return done >= plan.tasks.length ? 'all' : 'partial'
}

/* ---------------- 计划 CRUD ---------------- */

export function createPlan({ name, startDate, endDate, tasks }) {
  const plan = {
    id: uid(),
    name,
    startDate,
    endDate,
    paused: false,
    createdAt: Date.now(),
    tasks: tasks.map((t) => ({ id: t.id || uid(), name: t.name }))
  }
  store.plans.push(plan)
  save()
  return plan
}

export function updatePlan(id, { name, startDate, endDate, tasks }) {
  const plan = store.plans.find((p) => p.id === id)
  if (!plan) return
  Object.assign(plan, {
    name,
    startDate,
    endDate,
    tasks: tasks.map((t) => ({ id: t.id || uid(), name: t.name }))
  })
  // 清理被删除任务的孤儿打卡记录
  const keep = new Set(plan.tasks.map((t) => t.id))
  const rec = store.records[id]
  if (rec) {
    for (const date of Object.keys(rec)) {
      rec[date] = rec[date].filter((tid) => keep.has(tid))
      if (!rec[date].length) delete rec[date]
    }
  }
  save()
}

export function removePlan(id) {
  const i = store.plans.findIndex((p) => p.id === id)
  if (i > -1) store.plans.splice(i, 1)
  delete store.records[id]
  save()
}

/** 暂停 / 继续计划，返回暂停后的状态 */
export function togglePlanPaused(id) {
  const plan = store.plans.find((p) => p.id === id)
  if (!plan) return false
  plan.paused = !plan.paused
  save()
  return plan.paused
}

/** 打卡 / 取消打卡，返回是否为「打卡」动作 */
export function toggleCheck(planId, date, taskId) {
  const recMap = store.records[planId] || (store.records[planId] = {})
  const list = recMap[date] || (recMap[date] = [])
  const i = list.indexOf(taskId)
  let checked
  if (i > -1) {
    list.splice(i, 1)
    checked = false
  } else {
    list.push(taskId)
    checked = true
  }
  if (!list.length) delete recMap[date]
  save()
  return checked
}

/* ---------------- 统计 ---------------- */

/** 计划所处阶段文案 */
export function planPhase(p) {
  const t = todayStr()
  if (p.paused) return '已暂停'
  if (t < p.startDate) return '未开始'
  if (t > p.endDate) return '已结束'
  return '进行中'
}

/** 已进行天数（开始日 ~ min(今天, 结束日)，含首尾） */
export function elapsedDays(plan) {
  const end = dayjs().isAfter(dayjs(plan.endDate)) ? dayjs(plan.endDate) : dayjs()
  const n = end.diff(dayjs(plan.startDate), 'day') + 1
  return n > 0 ? n : 0
}

/** 总完成率 = 已完成任务次数 / (已进行天数 × 每日任务数) */
export function completionRate(plan) {
  if (!plan.tasks.length) return 0
  const total = elapsedDays(plan) * plan.tasks.length
  if (total <= 0) return 0
  let done = 0
  const rec = store.records[plan.id] || {}
  for (const [d, list] of Object.entries(rec)) {
    if (d >= plan.startDate && d <= plan.endDate && d <= todayStr()) done += list.length
  }
  return Math.round((done / total) * 100)
}

/** 当前连续打卡天数（今天尚未全部完成不打断连续，从昨天回溯） */
export function currentStreak(plan) {
  let d = dayjs()
  if (dayStatus(plan, d.format('YYYY-MM-DD')) !== 'all') d = d.subtract(1, 'day')
  let n = 0
  while (dayStatus(plan, d.format('YYYY-MM-DD')) === 'all') {
    n++
    d = d.subtract(1, 'day')
  }
  return n
}

/** 已「全部完成」的天数 */
export function fullDays(plan) {
  let n = 0
  let d = dayjs(plan.startDate)
  const end = dayjs().isAfter(dayjs(plan.endDate)) ? dayjs(plan.endDate) : dayjs()
  while (!d.isAfter(end, 'day')) {
    if (dayStatus(plan, d.format('YYYY-MM-DD')) === 'all') n++
    d = d.add(1, 'day')
  }
  return n
}

/* ---------------- 数据备份 ---------------- */

/** 导出全部数据为 JSON 字符串 */
export function exportData() {
  return JSON.stringify(
    {
      app: 'periodic-checkin',
      version: 1,
      exportedAt: new Date().toISOString(),
      plans: store.plans,
      records: store.records
    },
    null,
    2
  )
}

/** 导入备份（整体覆盖），格式非法时抛错由调用方提示 */
export function importData(data) {
  if (!data || !Array.isArray(data.plans)) throw new Error('备份格式不正确')
  store.plans = data.plans.map((p) => ({
    id: p.id || uid(),
    name: p.name || '未命名计划',
    startDate: p.startDate || todayStr(),
    endDate: p.endDate || todayStr(),
    paused: !!p.paused,
    createdAt: p.createdAt || Date.now(),
    tasks: Array.isArray(p.tasks)
      ? p.tasks.map((t) => ({ id: t.id || uid(), name: t.name || '任务' }))
      : []
  }))
  // 只保留与计划匹配的记录，并过滤非法结构
  const ids = new Set(store.plans.map((p) => p.id))
  const rec =
    data.records && typeof data.records === 'object' && !Array.isArray(data.records)
      ? data.records
      : {}
  const out = {}
  for (const [pid, dates] of Object.entries(rec)) {
    if (!ids.has(pid)) continue
    out[pid] = {}
    for (const [date, list] of Object.entries(dates)) {
      if (Array.isArray(list) && list.length) out[pid][date] = list
    }
  }
  store.records = out
  save()
}

/** 清空全部数据 */
export function clearAll() {
  store.plans = []
  store.records = {}
  save()
}
