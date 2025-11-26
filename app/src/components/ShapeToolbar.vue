<template>
  <div 
    v-if="visible"
    class="shape-toolbar"
    :style="toolbarStyle"
    @mousedown.stop
    @click.stop
  >
    <!-- 背景色 -->
    <div class="toolbar-group">
      <ColorPicker
        :model-value="shapeElement.backgroundColor"
        @update:model-value="handleBackgroundColorChange"
        title="背景颜色"
      />
    </div>

    <!-- 分隔线 -->
    <div class="toolbar-divider"></div>

    <!-- 边框宽度 -->
    <div class="toolbar-group">
      <input
        type="range"
        :value="shapeElement.borderWidth"
        @input="handleBorderWidthChange"
        min="0"
        max="20"
        step="1"
        class="toolbar-range"
        title="边框宽度 (0-20px)"
      />
      <input
        type="number"
        :value="shapeElement.borderWidth"
        @input="handleBorderWidthInput"
        @change="handleBorderWidthInput"
        min="0"
        max="20"
        class="toolbar-input-small"
        title="边框宽度 (0-20px)"
      />
      <span class="toolbar-label">px</span>
    </div>

    <!-- 边框颜色 -->
    <div class="toolbar-group">
      <ColorPicker
        :model-value="shapeElement.borderColor"
        @update:model-value="handleBorderColorChange"
        title="边框颜色"
      />
    </div>

    <!-- 圆角半径（仅圆角矩形时显示） -->
    <template v-if="shapeElement.type === 'rounded-rectangle'">
      <div class="toolbar-divider"></div>
      <div class="toolbar-group">
        <input
          type="range"
          :value="shapeElement.borderRadius || 0"
          @input="handleBorderRadiusChange"
          min="0"
          max="50"
          step="1"
          class="toolbar-range"
          title="圆角半径 (0-50px)"
        />
        <input
          type="number"
          :value="shapeElement.borderRadius || 0"
          @input="handleBorderRadiusInput"
          @change="handleBorderRadiusInput"
          min="0"
          max="50"
          class="toolbar-input-small"
          title="圆角半径 (0-50px)"
        />
        <span class="toolbar-label">px</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ShapeElement } from '../types/canvas'
import ColorPicker from './ColorPicker.vue'

const props = defineProps<{
  shapeElement: ShapeElement | null
  visible: boolean
  position: { x: number; y: number }
  scale?: number
}>()

const emit = defineEmits<{
  'update:backgroundColor': [value: string]
  'update:borderWidth': [value: number]
  'update:borderColor': [value: string]
  'update:borderRadius': [value: number]
}>()

// 工具栏样式（位置）
const toolbarStyle = computed(() => {
  return {
    left: `${props.position.x}px`,
    top: `${props.position.y}px`
  }
})

// 背景色变更
const handleBackgroundColorChange = (value: string) => {
  emit('update:backgroundColor', value)
}

// 边框宽度变更（滑块）
const handleBorderWidthChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const value = parseInt(target.value, 10)
  if (!isNaN(value) && value >= 0 && value <= 20) {
    emit('update:borderWidth', value)
  }
}

// 边框宽度变更（输入框）
const handleBorderWidthInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  const value = parseInt(target.value, 10)
  if (!isNaN(value)) {
    const clampedValue = Math.max(0, Math.min(20, value))
    emit('update:borderWidth', clampedValue)
  }
}

// 边框颜色变更
const handleBorderColorChange = (value: string) => {
  emit('update:borderColor', value)
}

// 圆角半径变更（滑块）
const handleBorderRadiusChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const value = parseInt(target.value, 10)
  if (!isNaN(value) && value >= 0 && value <= 50) {
    emit('update:borderRadius', value)
  }
}

// 圆角半径变更（输入框）
const handleBorderRadiusInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  const value = parseInt(target.value, 10)
  if (!isNaN(value)) {
    const clampedValue = Math.max(0, Math.min(50, value))
    emit('update:borderRadius', clampedValue)
  }
}
</script>

<style scoped>
.shape-toolbar {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10002;
  transform: translateX(-50%);
  pointer-events: auto;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #e5e5e5;
  margin: 0 4px;
}

.toolbar-range {
  width: 100px;
  height: 6px;
  border-radius: 3px;
  background: #e5e5e5;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
}

.toolbar-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #4a90e2;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.toolbar-range::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #4a90e2;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.toolbar-range::-webkit-slider-thumb:hover {
  background: #357abd;
}

.toolbar-range::-moz-range-thumb:hover {
  background: #357abd;
}

.toolbar-input-small {
  width: 50px;
  padding: 4px 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  text-align: center;
}

.toolbar-input-small:focus {
  outline: none;
  border-color: #4a90e2;
}

.toolbar-label {
  font-size: 12px;
  color: #666;
  margin-left: 2px;
}
</style>

