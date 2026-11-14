<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { showConfirmDialog, showToast } from 'vant'
import {
  store,
  dayRecord,
  dayStatus,
  isDateActive,
  toggleCheck,
  completionRate,
  currentStreak,
  fullDays,
  elapsedDays,
  togglePlanPaused,
  removePlan,
  planPhase,
  todayStr
} from '../store/plans'
import { vibrate } from '../utils/vibrate'

const route = useRoute()
const router = useRouter()

const plan = computed(() => store.plans.find((p) => p.id === route.params.id))

/* ---------------- 月历 ---------------- */
const weekdays = ['一', '二', '三', '四', '五', '六', '日']
const month = ref(dayjs().startOf('month'))
const monthText = computed(() => month.value.format('YYYY年M月'))

const cells = computed(() => {
  const p = plan.value
  if (!p) return []
  const offset = (month.value.day() + 6) % 7 // 周一为一周起点
  const days = month.value.daysInMonth()
  const arr = Array(offset).fill(null)
  for (let d = 1; d <= days; d++) {
    const date = month.value.date(d).format('YYYY-MM-DD')
    arr.push({
      date,
      d,
      status: dayStatus(p, date),
      done: dayRecord(p.id, date).length,
      total: p.tasks.length,
      active: isDateActive(p, date),
      future: date > todayStr()
    })
  }
  return arr
})

function prevMonth() {
  month.value = month.value.subtract(1, 'month')
}
function nextMonth() {
  month.value = month.value.add(1, 'month')
}

function cellClass(cell) {
  if (!cell) return 'empty'
  const cls = []
  if (cell.status === 'all') cls.push('all')
  else if (cell.status === 'partial') cls.push('partial')
  else if (cell.status === 'none') cls.push('none')
  else cls.push('muted')
  if (cell.date === todayStr()) cls.push('today')
  return cls.join(' ')
}

/* ---------------- 单日详情弹层（补卡入口） ---------------- */
const showDay = ref(false)
const activeDate = ref('')

const dayTasks = computed(() => {
  const p = plan.value
  if (!p || !activeDate.value) return []
  const rec = dayRecord(p.id, activeDate.value)
  return p.tasks.map((t) => ({ ...t, done: rec.includes(t.id) }))
})

function openDay(cell) {
  if (!cell || !cell.active) return
  if (cell.future) return showToast('未来日期还不能打卡')
  activeDate.value = cell.date
  showDay.value = true
}

function onToggle(task) {
  const checked = toggleCheck(plan.value.id, activeDate.value, task.id)
  vibrate(checked ? 15 : [10, 40, 10])
}

/* ---------------- 统计 ---------------- */
const streak = computed(() => (plan.value ? currentStreak(plan.value) : 0))
const rate = computed(() => (plan.value ? completionRate(plan.value) : 0))
const full = computed(() => (plan.value ? fullDays(plan.value) : 0))
const elapsed = computed(() => (plan.value ? elapsedDays(plan.value) : 0))
const phase = computed(() => (plan.value ? planPhase(plan.value) : ''))
const tagType = computed(() => ({ 进行中: 'primary', 已暂停: 'warning' }[phase.value] || 'default'))

/* ---------------- 计划操作 ---------------- */
function onPause() {
  const paused = togglePlanPaused(plan.value.id)
  showToast(paused ? '已暂停' : '已继续')
  vibrate(15)
}

async function onDelete() {
  try {
    await showConfirmDialog({
      title: '删除计划',
      message: '删除后打卡记录将一并清除，无法恢复。确定删除吗？'
    })
  } catch {
    return
  }
  removePlan(plan.value.id)
  showToast('已删除')
  router.replace('/plans')
}
</script>

<template>
  <div>
    <template v-if="plan">
      <van-nav-bar title="计划详情" left-arrow placeholder fixed @click-left="router.back()">
        <template #right>
          <van-icon name="edit" size="18" color="#4f46e5" @click="router.push(`/plans/${plan.id}/edit`)" />
        </template>
      </van-nav-bar>

      <div class="page-body">
        <!-- 基本信息 -->
        <div class="card">
          <div class="info-top">
            <div class="info-name">{{ plan.name }}</div>
            <van-tag :type="tagType" plain>{{ phase }}</van-tag>
          </div>
          <div class="info-meta">
            {{ plan.startDate }} ~ {{ plan.endDate }} · 每天 {{ plan.tasks.length }} 项任务
          </div>
          <div class="info-actions">
            <van-button size="small" plain type="warning" @click="onPause">
              {{ plan.paused ? '继续计划' : '暂停计划' }}
            </van-button>
            <van-button size="small" plain type="danger" @click="onDelete">删除计划</van-button>
          </div>
        </div>

        <!-- 统计 -->
        <div class="card stats">
          <div class="stat">
            <div class="num">{{ streak }}</div>
            <div class="label">连续打卡(天)</div>
          </div>
          <div class="stat">
            <div class="num">{{ rate }}%</div>
            <div class="label">总完成率</div>
          </div>
          <div class="stat">
            <div class="num">{{ full }}/{{ elapsed }}</div>
            <div class="label">全完成天数</div>
          </div>
        </div>

        <!-- 打卡日历 -->
        <div class="card">
          <div class="cal-head">
            <van-icon name="arrow-left" @click="prevMonth" />
            <span class="cal-title">{{ monthText }}</span>
            <van-icon name="arrow" @click="nextMonth" />
          </div>
          <div class="cal-week">
            <span v-for="w in weekdays" :key="w">{{ w }}</span>
          </div>
          <div class="cal-grid">
            <div
              v-for="(cell, i) in cells"
              :key="i"
              class="cal-cell"
              :class="cellClass(cell)"
              @click="openDay(cell)"
            >
              <template v-if="cell">
                <span class="cal-num">{{ cell.d }}</span>
                <span v-if="cell.active && !cell.future" class="cal-sub">{{ cell.done }}/{{ cell.total }}</span>
              </template>
            </div>
          </div>
          <div class="cal-legend">
            <span><i class="lg lg-all"></i>全部完成</span>
            <span><i class="lg lg-partial"></i>部分完成</span>
            <span><i class="lg lg-none"></i>未完成</span>
          </div>
        </div>
      </div>

      <!-- 单日详情弹层 -->
      <van-popup v-model:show="showDay" position="bottom" round>
        <div class="day-pop">
          <div class="day-title">{{ activeDate }} 打卡详情</div>
          <div
            v-for="t in dayTasks"
            :key="t.id"
            class="task"
            :class="{ done: t.done }"
            @click="onToggle(t)"
          >
            <van-icon :name="t.done ? 'checked' : 'circle'" />
            <span class="task-name">{{ t.name }}</span>
          </div>
          <div class="day-tip">点击任务可补卡 / 取消打卡</div>
        </div>
      </van-popup>
    </template>

    <van-empty v-else description="计划不存在或已删除">
      <van-button round type="primary" size="small" @click="router.replace('/plans')">
        返回计划列表
      </van-button>
    </van-empty>
  </div>
</template>

<style scoped>
.info-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.info-name {
  font-size: 17px;
  font-weight: 700;
}
.info-meta {
  margin-top: 6px;
  font-size: 12px;
  color: #969799;
}
.info-actions {
  margin-top: 12px;
  display: flex;
  gap: 10px;
}

/* 统计 */
.stats {
  display: flex;
  padding: 16px 0;
}
.stat {
  flex: 1;
  text-align: center;
}
.stat + .stat {
  border-left: 1px solid #f2f3f5;
}
.num {
  font-size: 22px;
  font-weight: 700;
  color: #4f46e5;
}
.label {
  margin-top: 4px;
  font-size: 11px;
  color: #969799;
}

/* 日历 */
.cal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px 10px;
}
.cal-head .van-icon {
  padding: 6px 10px;
  color: #4f46e5;
}
.cal-title {
  font-size: 15px;
  font-weight: 600;
}
.cal-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 4px;
}
.cal-week span {
  text-align: center;
  font-size: 11px;
  color: #969799;
}
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  row-gap: 4px;
}
.cal-cell {
  height: 46px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
}
.cal-cell.empty {
  pointer-events: none;
}
.cal-num {
  font-size: 14px;
  line-height: 1;
}
.cal-sub {
  font-size: 9px;
  margin-top: 3px;
  line-height: 1;
  opacity: 0.9;
}
.cal-cell.all {
  background: #07c160;
  color: #fff;
}
.cal-cell.partial {
  background: #ff976a;
  color: #fff;
}
.cal-cell.none {
  background: rgba(238, 10, 36, 0.1);
  color: #ee0a24;
}
.cal-cell.muted .cal-num {
  color: #c8c9cc;
}
.cal-cell.today {
  box-shadow: inset 0 0 0 2px #4f46e5;
}
.cal-legend {
  display: flex;
  gap: 14px;
  justify-content: center;
  align-items: center;
  margin-top: 12px;
  font-size: 11px;
  color: #646566;
}
.lg {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  display: inline-block;
  margin-right: 4px;
  vertical-align: -1px;
}
.lg-all {
  background: #07c160;
}
.lg-partial {
  background: #ff976a;
}
.lg-none {
  background: rgba(238, 10, 36, 0.15);
}

/* 单日弹层 */
.day-pop {
  padding: 20px 16px calc(20px + env(safe-area-inset-bottom));
}
.day-title {
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 8px;
}
.day-tip {
  text-align: center;
  font-size: 11px;
  color: #969799;
  margin-top: 10px;
}
</style>
