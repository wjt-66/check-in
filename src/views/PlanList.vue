<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import {
  store,
  completionRate,
  planPhase,
  togglePlanPaused,
  removePlan,
  todayStr
} from '../store/plans'
import { vibrate } from '../utils/vibrate'

const router = useRouter()

/** 排序：进行中 > 未开始 > 已暂停 > 已结束 */
const plans = computed(() => {
  const t = todayStr()
  const rank = (p) => (p.paused ? 2 : t < p.startDate ? 3 : t > p.endDate ? 4 : 1)
  return [...store.plans].sort((a, b) => rank(a) - rank(b))
})

const tagType = (p) => {
  const phase = planPhase(p)
  return { 进行中: 'primary', 已暂停: 'warning' }[phase] || 'default'
}

function onPause(p) {
  const paused = togglePlanPaused(p.id)
  showToast(paused ? '已暂停' : '已继续')
  vibrate(15)
}

async function onDelete(p) {
  try {
    await showConfirmDialog({
      title: '删除计划',
      message: `删除「${p.name}」后，其打卡记录将一并清除，且无法恢复。`
    })
  } catch {
    return
  }
  removePlan(p.id)
  showToast('已删除')
}
</script>

<template>
  <div>
    <van-nav-bar title="我的计划" placeholder fixed>
      <template #right>
        <van-icon name="plus" size="18" color="#4f46e5" @click="router.push('/plans/new')" />
      </template>
    </van-nav-bar>

    <div class="page-body">
      <van-swipe-cell v-for="p in plans" :key="p.id" class="swipe-item">
        <div class="card plan-item" @click="router.push(`/plans/${p.id}`)">
          <div class="plan-top">
            <span class="plan-name">{{ p.name }}</span>
            <van-tag :type="tagType(p)" plain>{{ planPhase(p) }}</van-tag>
          </div>
          <div class="plan-meta">
            {{ p.startDate }} ~ {{ p.endDate }} · 每天 {{ p.tasks.length }} 项任务
          </div>
          <van-progress
            class="plan-bar"
            :percentage="completionRate(p)"
            :show-pivot="false"
            stroke-width="6"
            color="linear-gradient(to right, #6366f1, #34d399)"
          />
          <div class="plan-rate">整体完成率 {{ completionRate(p) }}%</div>
        </div>
        <template #right>
          <van-button square type="primary" text="编辑" class="swipe-btn" @click="router.push(`/plans/${p.id}/edit`)" />
          <van-button square type="warning" :text="p.paused ? '继续' : '暂停'" class="swipe-btn" @click="onPause(p)" />
          <van-button square type="danger" text="删除" class="swipe-btn" @click="onDelete(p)" />
        </template>
      </van-swipe-cell>

      <van-empty v-if="!plans.length" description="还没有计划，点击右上角创建">
        <van-button round type="primary" size="small" class="empty-btn" @click="router.push('/plans/new')">
          新建计划
        </van-button>
      </van-empty>
    </div>
  </div>
</template>

<style scoped>
.swipe-item {
  display: block;
  margin-bottom: 12px;
}
.swipe-btn {
  height: 100%;
}
.plan-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.plan-name {
  font-size: 16px;
  font-weight: 600;
}
.plan-meta {
  margin: 6px 0 12px;
  font-size: 12px;
  color: #969799;
}
.plan-rate {
  margin-top: 6px;
  font-size: 11px;
  color: #969799;
  text-align: right;
}
.empty-btn {
  width: 120px;
}
</style>
