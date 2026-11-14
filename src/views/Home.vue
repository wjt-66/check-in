<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import {
  store,
  toggleCheck,
  dayRecord,
  isDateActive,
  completionRate,
  todayStr,
  togglePlanPaused
} from '../store/plans'
import { vibrate } from '../utils/vibrate'

const router = useRouter()

/** 当前查看的日期（默认今天），可切换到历史日期补卡 */
const selected = ref(todayStr())
const showCalendar = ref(false)

const isToday = computed(() => selected.value === todayStr())
const canGoNext = computed(() => selected.value < todayStr())
const dateText = computed(() => dayjs(selected.value).format('M月D日 dddd'))

function prevDay() {
  selected.value = dayjs(selected.value).subtract(1, 'day').format('YYYY-MM-DD')
}
function nextDay() {
  if (canGoNext.value) {
    selected.value = dayjs(selected.value).add(1, 'day').format('YYYY-MM-DD')
  }
}
function onCalendarConfirm(date) {
  selected.value = dayjs(date).format('YYYY-MM-DD')
  showCalendar.value = false
}

/** 日期选择范围：最早计划开始日 ~ 今天 */
const minDate = computed(() => {
  const stamps = store.plans.map((p) => dayjs(p.startDate).valueOf())
  return new Date(stamps.length ? Math.min(...stamps) : dayjs().subtract(90, 'day').valueOf())
})
const maxDate = new Date()
const calendarDefault = computed(() => new Date(selected.value))

/** 当前日期进行中 / 已暂停的计划 */
const activePlans = computed(() => store.plans.filter((p) => isDateActive(p, selected.value) && !p.paused))
const pausedPlans = computed(() => store.plans.filter((p) => isDateActive(p, selected.value) && p.paused))

/** 当日总进度（跨计划汇总） */
const summary = computed(() => {
  let total = 0
  let done = 0
  for (const p of activePlans.value) {
    total += p.tasks.length
    done += dayRecord(p.id, selected.value).length
  }
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 }
})

/** 打卡 / 取消打卡，带震动反馈 */
function onToggle(plan, task) {
  const checked = toggleCheck(plan.id, selected.value, task.id)
  vibrate(checked ? 15 : [10, 40, 10])
}

function onResume(p) {
  togglePlanPaused(p.id)
  vibrate(15)
}
</script>

<template>
  <div>
    <van-nav-bar placeholder fixed>
      <template #left>
        <div class="nav-arrow" @click="prevDay"><van-icon name="arrow-left" /></div>
      </template>
      <template #title>
        <div class="date-title" @click="showCalendar = true">
          <div class="date-main">{{ dateText }} <van-icon name="arrow-down" size="12" /></div>
          <div class="date-sub">{{ isToday ? '今天 · 点日期可查历史' : '历史日期 · 可补卡' }}</div>
        </div>
      </template>
      <template #right>
        <div class="nav-arrow" :class="{ disabled: !canGoNext }" @click="nextDay">
          <van-icon name="arrow" />
        </div>
      </template>
    </van-nav-bar>

    <div class="page-body">
      <!-- 当日总进度 -->
      <div v-if="summary.total" class="card sum-card">
        <div class="sum-row">
          <span class="sum-label">当日完成</span>
          <span class="sum-num">{{ summary.done }}<i>/{{ summary.total }}</i></span>
        </div>
        <van-progress
          :percentage="summary.percent"
          :show-pivot="false"
          stroke-width="8"
          color="linear-gradient(to right, #6366f1, #34d399)"
        />
      </div>

      <van-notice-bar
        v-if="!isToday"
        left-icon="info-o"
        text="补卡模式：勾选任务即可为该日期补打/取消打卡"
      />

      <!-- 进行中计划 -->
      <div v-for="plan in activePlans" :key="plan.id" class="card">
        <div class="plan-head" @click="router.push(`/plans/${plan.id}`)">
          <span class="plan-name">{{ plan.name }}</span>
          <van-icon name="arrow" class="plan-arrow" />
        </div>
        <div
          v-for="task in plan.tasks"
          :key="task.id"
          class="task"
          :class="{ done: dayRecord(plan.id, selected).includes(task.id) }"
          @click="onToggle(plan, task)"
        >
          <van-icon :name="dayRecord(plan.id, selected).includes(task.id) ? 'checked' : 'circle'" />
          <span class="task-name">{{ task.name }}</span>
        </div>
        <div class="plan-foot" @click="router.push(`/plans/${plan.id}`)">
          <van-progress :percentage="completionRate(plan)" :show-pivot="false" stroke-width="4" />
          <span class="plan-rate">整体完成率 {{ completionRate(plan) }}%</span>
        </div>
      </div>

      <!-- 暂停中计划 -->
      <div v-for="plan in pausedPlans" :key="plan.id" class="card">
        <div class="paused-row">
          <div>
            <div class="plan-name muted">{{ plan.name }}</div>
            <div class="paused-sub">已暂停，恢复后继续打卡</div>
          </div>
          <van-button size="small" plain type="primary" @click="onResume(plan)">继续</van-button>
        </div>
      </div>

      <!-- 空状态 -->
      <van-empty v-if="!store.plans.length" description="还没有打卡计划">
        <van-button round type="primary" size="small" class="empty-btn" @click="router.push('/plans/new')">
          去创建
        </van-button>
      </van-empty>
      <van-empty
        v-else-if="!activePlans.length && !pausedPlans.length"
        image="search"
        description="当前日期没有进行中的计划"
      />
    </div>

    <van-calendar
      v-model:show="showCalendar"
      :min-date="minDate"
      :max-date="maxDate"
      :default-date="calendarDefault"
      color="#4f46e5"
      @confirm="onCalendarConfirm"
    />
  </div>
</template>

<style scoped>
.date-title {
  text-align: center;
  line-height: 1.25;
}
.date-main {
  font-size: 15px;
  font-weight: 600;
  color: #323233;
}
.date-sub {
  font-size: 10px;
  color: #969799;
  margin-top: 2px;
}
.nav-arrow {
  padding: 0 6px;
  font-size: 18px;
  color: #323233;
}
.nav-arrow.disabled {
  color: #c8c9cc;
}
.sum-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}
.sum-label {
  font-size: 14px;
  color: #646566;
}
.sum-num {
  font-size: 22px;
  font-weight: 700;
  color: #4f46e5;
}
.sum-num i {
  font-style: normal;
  font-size: 14px;
  font-weight: 400;
  color: #969799;
}
.plan-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 6px;
  border-bottom: 1px solid #f2f3f5;
}
.plan-name {
  font-size: 16px;
  font-weight: 600;
}
.plan-name.muted {
  color: #969799;
}
.plan-arrow {
  color: #c8c9cc;
}
.plan-foot {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #f2f3f5;
}
.plan-rate {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  color: #969799;
  text-align: right;
}
.paused-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.paused-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #969799;
}
.empty-btn {
  width: 120px;
}
</style>
