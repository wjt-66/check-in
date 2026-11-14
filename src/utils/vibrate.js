import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

/**
 * 移动端震动反馈（不支持的设备/浏览器静默失败）
 * 原生壳（Capacitor）内走 Haptics 插件；浏览器内走 Vibration API
 * @param {number|number[]} pattern 震动时长或节奏
 */
export function vibrate(pattern = 10) {
  try {
    if (Capacitor.isNativePlatform()) {
      // 原生环境：长短节奏统一映射为轻触反馈
      Haptics.impact({ style: ImpactStyle.Light })
      return
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern)
  } catch {
    /* ignore */
  }
}
