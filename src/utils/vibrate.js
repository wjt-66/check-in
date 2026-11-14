/**
 * 移动端震动反馈（不支持的设备/浏览器静默失败）
 * @param {number|number[]} pattern 震动时长或节奏
 */
export function vibrate(pattern = 10) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern)
  } catch {
    /* ignore */
  }
}
