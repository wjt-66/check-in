<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { showToast } from 'vant'
import { store, createPlan, updatePlan } from '../store/plans'

const route = useRoute()
const router = useRouter()

/** 编辑模式：路由为 /plans/:id/edit */
const editing = computed(() => !!route.params.id)
const original = editing.value ? store.plans.find((p) => p.id === route.params.id) : null
if (editing.value && !original) {
  showToast('计划不存在')
  router.replace('/plans')
}

const fmt = (d) => dayjs(d).format('YYYY-MM-DD')

const name = ref(original ? original.name : '')
const range = ref(
  original
    ? [new Date(original.startDate), new Date(original.endDate)]
    : [dayjs().toDate(), dayjs().add(20, 'day').toDate()]
)
const tasks = ref(original ? original.tasks.map((t) => ({ ...t })) : [{ name: '' }, { name: '' }])
const showRange = ref(false)

const rangeText = computed(() =>
  range.value && range.value.length === 2 ? `${fmt(range.value[0])} ~ ${fmt(range.value[1])}` : ''
)
const minDate = new Date(2020, 0, 1)
const maxDate = dayjs().add(2, 'year').toDate()

function onRangeConfirm(dates) {
  range.value = dates
  showRange.value = false
}
function addTask() {
  tasks.value.push({ name: '' })
}
function removeTask(i) {
  tasks.value.splice(i, 1)
}

function onSave() {
  const planName = name.value.trim()
  if (!planName) return showToast('请填写计划名称')
  const [s, e] = range.value || []
  if (!s || !e) return showToast('请选择打卡周期')
  // 过滤空行，至少保留一个有效任务
  const cleaned = tasks.value
    .map((t) => ({ id: t.id || '', name: (t.name || '').trim() }))
    .filter((t) => t.name)
  if (!cleaned.length) return showToast('请至少添加一个任务项')

  const payload = { name: planName, startDate: fmt(s), endDate: fmt(e), tasks: cleaned }
  if (editing.value) updatePlan(route.params.id, payload)
  else createPlan(payload)
  showToast(editing.value ? '已保存' : '创建成功')
  router.back()
}
</script>

<template>
  <div>
    <van-nav-bar :title="editing ? '编辑计划' : '新建计划'" left-arrow placeholder fixed @click-left="router.back()">
      <template #right>
        <span class="save-btn" @click="onSave">保存</span>
      </template>
    </van-nav-bar>

    <div class="page-body">
      <van-cell-group inset>
        <van-field v-model="name" label="计划名称" placeholder="如：21天早起挑战" maxlength="20" />
        <van-field
          :model-value="rangeText"
          label="周期范围"
          placeholder="点击选择开始 / 结束日期"
          readonly
          is-link
          @click="showRange = true"
        />
      </van-cell-group>

      <van-cell-group inset title="每日任务项（周期内每天重复）">
        <van-field
          v-for="(task, i) in tasks"
          :key="i"
          v-model="task.name"
          :label="`任务${i + 1}`"
          placeholder="如：阅读 30 分钟"
          maxlength="30"
        >
          <template #button>
            <van-icon name="cross" class="del-icon" @click="removeTask(i)" />
          </template>
        </van-field>
      </van-cell-group>

      <van-button class="add-btn" plain type="primary" size="small" block icon="plus" @click="addTask">
        添加任务
      </van-button>
      <div class="tip">提示：周期内每天都会生成以上任务，在首页点击任务即可打卡</div>
    </div>

    <van-calendar
      v-model:show="showRange"
      type="range"
      allow-same-day
      :min-date="minDate"
      :max-date="maxDate"
      :default-date="range"
      color="#4f46e5"
      @confirm="onRangeConfirm"
    />
  </div>
</template>

<style scoped>
.save-btn {
  color: #4f46e5;
  font-size: 14px;
  font-weight: 600;
}
.del-icon {
  color: #c8c9cc;
  font-size: 16px;
  padding: 2px 4px;
}
.add-btn {
  border-radius: 8px;
  margin: 0 16px;
  width: calc(100% - 32px);
}
.tip {
  margin-top: 10px;
  text-align: center;
  font-size: 11px;
  color: #969799;
}
</style>
