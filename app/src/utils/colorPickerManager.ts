/**
 * 颜色选择器管理器
 * 用于确保同时只有一个颜色选择器打开
 */

let currentOpenPicker: { close: () => void } | null = null

export function setCurrentPicker(picker: { close: () => void } | null) {
  // 如果已经有打开的选择器，先关闭它
  if (currentOpenPicker && currentOpenPicker !== picker) {
    currentOpenPicker.close()
  }
  currentOpenPicker = picker
}

export function clearCurrentPicker(picker: { close: () => void }) {
  if (currentOpenPicker === picker) {
    currentOpenPicker = null
  }
}

export function getCurrentPicker() {
  return currentOpenPicker
}

