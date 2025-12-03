<template>
  <div 
    v-if="visible"
    class="brush-toolbar"
    @mousedown.stop
    @click.stop
  >
    <!-- 画笔颜色 -->
    <div class="toolbar-group">
      <ColorPicker
        :model-value="color"
        @update:model-value="handleColorChange"
        title="画笔颜色"
      />
    </div>

    <!-- 分隔线 -->
    <div class="toolbar-divider"></div>

    <!-- 画笔宽度 -->
    <div class="toolbar-group">
      <input
        type="range"
        :value="strokeWidth"
        @input="handleStrokeWidthChange"
        min="1"
        max="50"
        step="1"
        class="toolbar-range"
        title="画笔宽度 (1-50px)"
      />
      <input
        type="number"
        :value="strokeWidth"
        @input="handleStrokeWidthInput"
        @change="handleStrokeWidthInput"
        min="1"
        max="50"
        class="toolbar-input-small"
        title="画笔宽度 (1-50px)"
      />
      <span class="toolbar-label">px</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import ColorPicker from './ColorPicker.vue'

const props = defineProps<{
  color: string
  strokeWidth: number
  visible: boolean
}>()

const emit = defineEmits<{
  'update:color': [value: string]
  'update:strokeWidth': [value: number]
}>()

// 颜色变更
const handleColorChange = (value: string) => {
  emit('update:color', value)
}

// 画笔宽度变更（滑块）
const handleStrokeWidthChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const value = parseInt(target.value, 10)
  if (!isNaN(value) && value >= 1 && value <= 50) {
    emit('update:strokeWidth', value)
  }
}

// 画笔宽度变更（输入框）
const handleStrokeWidthInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  const value = parseInt(target.value, 10)
  if (!isNaN(value)) {
    const clampedValue = Math.max(1, Math.min(50, value))
    emit('update:strokeWidth', clampedValue)
  }
}
</script>

<style scoped>
.brush-toolbar {
  position: fixed;
  bottom: 88px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1001;
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

/* 响应式设计 */
@media (max-width: 768px) {
  .brush-toolbar {
    bottom: 80px;
    padding: 6px 10px;
  }
}
</style>

