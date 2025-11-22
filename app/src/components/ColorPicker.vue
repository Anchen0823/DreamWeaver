<template>
  <div class="color-picker-wrapper" ref="wrapperRef">
    <!-- 颜色预览按钮 -->
    <div
      class="color-preview"
      :style="previewButtonStyle"
      @click="togglePicker"
      :title="title"
    ></div>
    
    <!-- 颜色选择器弹窗 -->
    <div
      v-if="isOpen"
      class="color-picker-popup popup-up"
      @mousedown.stop
      @click.stop
    >
      <!-- 主颜色选择区域（颜色滚动条） -->
      <div class="color-picker-main" ref="mainColorRef" @mousedown="handleMainColorMouseDown">
        <div class="color-gradient" :style="gradientStyle"></div>
        <div
          class="color-selector"
          :style="selectorStyle"
          @mousedown.stop="handleSelectorMouseDown"
        ></div>
      </div>
      
      <!-- 色相滑块 -->
      <div class="hue-slider-wrapper" ref="hueSliderRef" @mousedown="handleHueMouseDown">
        <div class="hue-slider" :style="hueGradientStyle"></div>
        <div
          class="hue-handle"
          :style="hueHandleStyle"
          @mousedown.stop="handleHueHandleMouseDown"
        ></div>
      </div>
      
      <!-- RGB 输入框 -->
      <div class="color-inputs">
        <div class="color-input-group">
          <label>R</label>
          <input
            type="number"
            v-model.number="rgb.r"
            @input="handleRgbInput"
            min="0"
            max="255"
            class="color-input"
          />
        </div>
        <div class="color-input-group">
          <label>G</label>
          <input
            type="number"
            v-model.number="rgb.g"
            @input="handleRgbInput"
            min="0"
            max="255"
            class="color-input"
          />
        </div>
        <div class="color-input-group">
          <label>B</label>
          <input
            type="number"
            v-model.number="rgb.b"
            @input="handleRgbInput"
            min="0"
            max="255"
            class="color-input"
          />
        </div>
      </div>
      
      <!-- 透明度滑块 -->
      <div class="alpha-slider-wrapper" ref="alphaSliderRef" @mousedown="handleAlphaMouseDown">
        <div class="alpha-slider" :style="alphaGradientStyle"></div>
        <div
          class="alpha-handle"
          :style="alphaHandleStyle"
          @mousedown.stop="handleAlphaHandleMouseDown"
        ></div>
      </div>
      
      <!-- 透明按钮 -->
      <button class="transparent-button" @click="setTransparent" title="设置为透明">
        透明
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { setCurrentPicker, clearCurrentPicker } from '../utils/colorPickerManager'

const props = defineProps<{
  modelValue: string
  title?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isOpen = ref(false)
const wrapperRef = ref<HTMLElement>()
const mainColorRef = ref<HTMLElement>()
const hueSliderRef = ref<HTMLElement>()
const alphaSliderRef = ref<HTMLElement>()

// HSV 颜色值
const hsv = ref({ h: 0, s: 100, v: 100 })

// RGB 颜色值
const rgb = ref({ r: 0, g: 0, b: 0 })

// 透明度 (0-100)
const alpha = ref(100)

// 从 hex 转换为 HSV
function hexToHsv(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min
  
  let h = 0
  if (diff !== 0) {
    if (max === r) {
      h = ((g - b) / diff) % 6
    } else if (max === g) {
      h = (b - r) / diff + 2
    } else {
      h = (r - g) / diff + 4
    }
  }
  h = Math.round(h * 60)
  if (h < 0) h += 360
  
  const s = max === 0 ? 0 : Math.round((diff / max) * 100)
  const v = Math.round(max * 100)
  
  return { h, s, v }
}

// 从 HSV 转换为 hex
function hsvToHex(h: number, s: number, v: number) {
  s /= 100
  v /= 100
  
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  
  let r = 0, g = 0, b = 0
  
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x
  }
  
  r = Math.round((r + m) * 255)
  g = Math.round((g + m) * 255)
  b = Math.round((b + m) * 255)
  
  return `#${[r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')}`
}

// 从 hex 转换为 RGB
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

// 从 RGB 转换为 hex
function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, x)).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')}`
}

// 从颜色字符串解析颜色和透明度
function parseColor(color: string): { r: number; g: number; b: number; a: number } {
  // 处理 rgba 格式
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1]),
      g: parseInt(rgbaMatch[2]),
      b: parseInt(rgbaMatch[3]),
      a: rgbaMatch[4] ? Math.round(parseFloat(rgbaMatch[4]) * 100) : 100
    }
  }
  
  // 处理 hex 格式
  if (color.startsWith('#')) {
    const hex = color.length === 7 ? color : color.padEnd(7, '0')
    const rgb = hexToRgb(hex)
    return { ...rgb, a: 100 }
  }
  
  // 处理 transparent
  if (color === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 }
  }
  
  // 默认值
  return { r: 0, g: 0, b: 0, a: 100 }
}

// 将颜色和透明度转换为颜色字符串
function formatColor(r: number, g: number, b: number, a: number): string {
  // 即使透明度为 0，也返回 rgba 格式以保留 RGB 信息
  // 这样预览按钮可以显示原来的颜色
  if (a === 0) {
    return `rgba(${r}, ${g}, ${b}, 0)`
  }
  if (a === 100) {
    return rgbToHex(r, g, b)
  }
  return `rgba(${r}, ${g}, ${b}, ${a / 100})`
}

// 初始化颜色值
function updateColorFromValue(color: string) {
  const parsed = parseColor(color)
  rgb.value = { r: parsed.r, g: parsed.g, b: parsed.b }
  alpha.value = parsed.a
  
  // 转换为 HSV
  const hex = rgbToHex(parsed.r, parsed.g, parsed.b)
  hsv.value = hexToHsv(hex)
}

// 计算渐变样式
const gradientStyle = computed(() => {
  const hue = hsv.value.h
  return {
    background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))`
  }
})

// 计算色相渐变样式
const hueGradientStyle = computed(() => {
  return {
    background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
  }
})

// 计算透明度渐变样式
const alphaGradientStyle = computed(() => {
  const hex = rgbToHex(rgb.value.r, rgb.value.g, rgb.value.b)
  return {
    background: `linear-gradient(to right, transparent, ${hex})`
  }
})

// 计算透明度滑块位置
const alphaHandleStyle = computed(() => {
  return {
    left: `${alpha.value}%`,
    transform: 'translateX(-50%)'
  }
})

// 计算预览按钮样式
// 预览按钮只显示颜色，忽略透明度
const previewButtonStyle = computed(() => {
  const colorValue = props.modelValue || '#000000'
  
  // 如果是 transparent（旧数据可能还是这个格式），显示白色作为默认
  if (colorValue === 'transparent') {
    return {
      backgroundColor: '#fff'
    }
  }
  
  // 解析颜色值（rgba 或 hex）
  const parsed = parseColor(colorValue)
  
  // 提取 RGB 值，转换为 hex，忽略透明度
  const hexColor = rgbToHex(parsed.r, parsed.g, parsed.b)
  
  return {
    backgroundColor: hexColor
  }
})


// 计算选择器位置
const selectorStyle = computed(() => {
  const s = hsv.value.s / 100
  const v = hsv.value.v / 100
  return {
    left: `${s * 100}%`,
    top: `${(1 - v) * 100}%`,
    transform: 'translate(-50%, -50%)'
  }
})

// 计算色相滑块位置
const hueHandleStyle = computed(() => {
  return {
    left: `${(hsv.value.h / 360) * 100}%`,
    transform: 'translateX(-50%)'
  }
})

// 选择器实例引用
let pickerInstanceRef: { close: () => void } | null = null

// 关闭选择器
function closePicker() {
  isOpen.value = false
  if (pickerInstanceRef) {
    clearCurrentPicker(pickerInstanceRef)
    pickerInstanceRef = null
  }
}

// 切换选择器显示
function togglePicker() {
  if (isOpen.value) {
    closePicker()
  } else {
    // 创建当前选择器实例
    pickerInstanceRef = {
      close: closePicker
    }
    // 设置当前选择器（会自动关闭其他已打开的选择器）
    setCurrentPicker(pickerInstanceRef)
    // 打开当前选择器
    isOpen.value = true
    updateColorFromValue(props.modelValue)
  }
}

// 处理主颜色区域鼠标按下
function handleMainColorMouseDown(e: MouseEvent) {
  if (!mainColorRef.value) return
  updateMainColor(e)
  
  const handleMouseMove = (e: MouseEvent) => {
    updateMainColor(e)
  }
  
  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// 更新主颜色
function updateMainColor(e: MouseEvent) {
  if (!mainColorRef.value) return
  
  const rect = mainColorRef.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
  
  hsv.value.s = x * 100
  hsv.value.v = (1 - y) * 100
  
  updateRgbFromHsv()
  emitColor()
}

// 处理选择器拖拽
function handleSelectorMouseDown(e: MouseEvent) {
  e.stopPropagation()
  handleMainColorMouseDown(e)
}

// 处理色相滑块鼠标按下
function handleHueMouseDown(e: MouseEvent) {
  if (!hueSliderRef.value) return
  updateHue(e)
  
  const handleMouseMove = (e: MouseEvent) => {
    updateHue(e)
  }
  
  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// 更新色相
function updateHue(e: MouseEvent) {
  if (!hueSliderRef.value) return
  
  const rect = hueSliderRef.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  
  hsv.value.h = x * 360
  updateRgbFromHsv()
  emitColor()
}

// 处理色相滑块拖拽
function handleHueHandleMouseDown(e: MouseEvent) {
  e.stopPropagation()
  handleHueMouseDown(e)
}

// 从 HSV 更新 RGB
function updateRgbFromHsv() {
  const hex = hsvToHex(hsv.value.h, hsv.value.s, hsv.value.v)
  rgb.value = hexToRgb(hex)
}

// 处理 RGB 输入
function handleRgbInput() {
  const hex = rgbToHex(rgb.value.r, rgb.value.g, rgb.value.b)
  hsv.value = hexToHsv(hex)
  emitColor()
}

// 处理透明度滑块鼠标按下
function handleAlphaMouseDown(e: MouseEvent) {
  if (!alphaSliderRef.value) return
  updateAlpha(e)
  
  const handleMouseMove = (e: MouseEvent) => {
    updateAlpha(e)
  }
  
  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// 更新透明度
function updateAlpha(e: MouseEvent) {
  if (!alphaSliderRef.value) return
  
  const rect = alphaSliderRef.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  
  alpha.value = Math.round(x * 100)
  emitColor()
}

// 处理透明度滑块拖拽
function handleAlphaHandleMouseDown(e: MouseEvent) {
  e.stopPropagation()
  handleAlphaMouseDown(e)
}

// 处理透明度输入
function handleAlphaInput() {
  alpha.value = Math.max(0, Math.min(100, alpha.value))
  emitColor()
}

// 设置为透明
function setTransparent() {
  alpha.value = 0
  emitColor()
}

// 发送颜色更新
function emitColor() {
  const color = formatColor(rgb.value.r, rgb.value.g, rgb.value.b, alpha.value)
  emit('update:modelValue', color)
}

// 监听外部点击关闭
function handleClickOutside(e: MouseEvent) {
  if (isOpen.value && wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    closePicker()
  }
}

// 监听 modelValue 变化
watch(() => props.modelValue, (newValue) => {
  if (!isOpen.value) {
    updateColorFromValue(newValue)
  }
})

onMounted(() => {
  updateColorFromValue(props.modelValue)
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  // 如果当前选择器是打开的，清除引用
  if (pickerInstanceRef) {
    clearCurrentPicker(pickerInstanceRef)
    pickerInstanceRef = null
  }
})
</script>

<style scoped>
.color-picker-wrapper {
  position: relative;
  display: inline-block;
}

.color-preview {
  width: 32px;
  height: 32px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.color-preview:hover {
  border-color: #999;
}

.color-picker-popup {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10003;
  min-width: 180px;
}

.color-picker-main {
  position: relative;
  width: 100%;
  height: 120px;
  margin-bottom: 8px;
  border-radius: 4px;
  overflow: hidden;
  cursor: crosshair;
}

.color-gradient {
  width: 100%;
  height: 100%;
}

.color-selector {
  position: absolute;
  width: 12px;
  height: 12px;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

.hue-slider-wrapper {
  position: relative;
  width: 100%;
  height: 16px;
  margin-bottom: 8px;
  border-radius: 3px;
  overflow: hidden;
  cursor: pointer;
}

.hue-slider {
  width: 100%;
  height: 100%;
}

.hue-handle {
  position: absolute;
  top: 0;
  width: 4px;
  height: 100%;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.3);
  border-radius: 2px;
  pointer-events: none;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.2);
}

.color-inputs {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.color-input-group {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 3px;
}

.color-input-group label {
  font-size: 11px;
  color: #666;
  min-width: 14px;
}

.color-input {
  flex: 1;
  padding: 3px 4px;
  border: 1px solid #ddd;
  border-radius: 3px;
  font-size: 11px;
  text-align: center;
}

.color-input:focus {
  outline: none;
  border-color: #4a90e2;
}

.alpha-slider-wrapper {
  position: relative;
  width: 100%;
  height: 16px;
  margin-bottom: 8px;
  border-radius: 3px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #ddd;
}

.alpha-slider {
  width: 100%;
  height: 100%;
}

.alpha-handle {
  position: absolute;
  top: 0;
  width: 4px;
  height: 100%;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.3);
  border-radius: 2px;
  pointer-events: none;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.2);
}

.transparent-button {
  width: 100%;
  padding: 5px 8px;
  border: 1px solid #ddd;
  border-radius: 3px;
  background: #fff;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
}

.transparent-button:hover {
  background: #f5f5f5;
  border-color: #999;
}

</style>

