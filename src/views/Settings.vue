<script setup>
import { ref } from 'vue'
import dayjs from 'dayjs'
import { showToast, showConfirmDialog } from 'vant'
import { exportData, importData, clearAll, store } from '../store/plans'

/** 导出全部数据为 JSON 文件并触发下载 */
function onExport() {
  const blob = new Blob([exportData()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `打卡备份-${dayjs().format('YYYYMMDD-HHmmss')}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  showToast('已导出')
}

const fileInput = ref(null)

/** 导入 JSON 备份：解析 → 确认覆盖 → 恢复 */
async function onFile(e) {
  const file = e.target.files && e.target.files[0]
  e.target.value = '' // 允许重复选择同一文件
  if (!file) return
  let data
  try {
    data = JSON.parse(await file.text())
  } catch {
    return showToast('文件解析失败，请选择本应用导出的 JSON 备份')
  }
  if (!data || !Array.isArray(data.plans)) return showToast('备份格式不正确')
  try {
    await showConfirmDialog({
      title: '导入数据',
      message: `将覆盖现有 ${store.plans.length} 个计划，导入 ${data.plans.length} 个计划。确定继续吗？`
    })
  } catch {
    return
  }
  try {
    importData(data)
    showToast('导入成功')
  } catch (err) {
    showToast(err.message || '导入失败')
  }
}

/** 清空全部数据 */
async function onClear() {
  try {
    await showConfirmDialog({
      title: '清空数据',
      message: '将删除全部计划与打卡记录，且无法恢复（建议先导出备份）。'
    })
  } catch {
    return
  }
  clearAll()
  showToast('已清空')
}
</script>

<template>
  <div>
    <van-nav-bar title="设置" placeholder fixed />

    <div class="page-body">
      <van-cell-group inset title="数据备份">
        <van-cell title="导出全部数据" label="下载 JSON 备份文件到本地" icon="down" is-link @click="onExport" />
        <van-cell title="导入备份文件" label="从 JSON 备份恢复数据（覆盖现有）" icon="upgrade" is-link @click="fileInput && fileInput.click()" />
        <van-cell title="清空全部数据" icon="delete-o" is-link @click="onClear" />
      </van-cell-group>
      <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="onFile" />

      <van-cell-group inset title="离线与主屏">
        <van-cell title="iOS" label="Safari → 分享 → 添加到主屏幕" />
        <van-cell title="Android" label="Chrome 菜单 → 安装应用 / 添加到主屏幕" />
        <van-cell title="离线使用" label="应用已缓存全部静态资源，断网也能正常打卡" />
      </van-cell-group>

      <van-cell-group inset title="关于">
        <van-cell title="周期打卡备忘录" value="v1.0.0" />
        <van-cell title="数据存储" value="纯本地 localStorage" />
      </van-cell-group>
    </div>
  </div>
</template>
