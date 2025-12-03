<template>
  <div 
    v-if="visible"
    class="image-toolbar"
    :style="toolbarStyle"
    @mousedown.stop
    @click.stop
  >
    <!-- 滤镜类型选择 -->
    <div class="toolbar-group">
      <select 
        :value="imageElement.filter || 'none'"
        @change="handleFilterChange"
        class="toolbar-select"
        title="滤镜类型"
      >
        <option value="none">无滤镜</option>
        <option value="grayscale">灰度</option>
        <option value="blur">模糊</option>
        <option value="contrast">对比度</option>
      </select>
    </div>

    <!-- 滤镜强度调整（仅在非 none 滤镜时显示） -->
    <div v-if="imageElement.filter && imageElement.filter !== 'none'" class="toolbar-group">
      <input
        type="range"
        :value="imageElement.filterIntensity || 0"
        @input="handleFilterIntensityChange"
        :min="getFilterMin()"
        :max="getFilterMax()"
        step="1"
        class="toolbar-range"
        :title="getFilterIntensityTitle()"
      />
      <input
        type="number"
        :value="imageElement.filterIntensity || 0"
        @input="handleFilterIntensityInput"
        @change="handleFilterIntensityInput"
        :min="getFilterMin()"
        :max="getFilterMax()"
        class="toolbar-input-small"
        :title="getFilterIntensityTitle()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ImageElement } from '../types/canvas'

const props = defineProps<{
  imageElement: ImageElement | null
  visible: boolean
  position: { x: number; y: number }
  scale?: number
}>()

const emit = defineEmits<{
  'update:filter': [value: 'none' | 'grayscale' | 'blur' | 'contrast']
  'update:filterIntensity': [value: number]
}>()

// 工具栏样式（位置）
const toolbarStyle = computed(() => {
  return {
    left: `${props.position.x}px`,
    top: `${props.position.y}px`
  }
})

// 滤镜类型变更
const handleFilterChange = (e: Event) => {
  const target = e.target as HTMLSelectElement
  const value = target.value as 'none' | 'grayscale' | 'blur' | 'contrast'
  emit('update:filter', value)
  
  // 如果切换到 none，重置强度为 0
  if (value === 'none') {
    emit('update:filterIntensity', 0)
  } else {
    // 如果切换到其他滤镜，设置默认强度
    const defaultIntensity = value === 'blur' ? 3 : value === 'contrast' ? 150 : 100
    emit('update:filterIntensity', defaultIntensity)
  }
}

// 获取滤镜最小值
const getFilterMin = (): number => {
  return 0
}

// 获取滤镜最大值
const getFilterMax = (): number => {
  if (!props.imageElement?.filter) {
    return 100
  }
  
  const filter = props.imageElement.filter
  switch (filter) {
    case 'grayscale':
      return 100
    case 'blur':
      return 100
    case 'contrast':
      return 200
    default:
      return 100
  }
}

// 滤镜强度变更（滑块）
const handleFilterIntensityChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const value = parseInt(target.value, 10)
  if (!isNaN(value)) {
    const min = getFilterMin()
    const max = getFilterMax()
    const clampedValue = Math.max(min, Math.min(max, value))
    emit('update:filterIntensity', clampedValue)
  }
}

// 滤镜强度变更（输入框）
const handleFilterIntensityInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  const value = parseInt(target.value, 10)
  if (!isNaN(value)) {
    const min = getFilterMin()
    const max = getFilterMax()
    const clampedValue = Math.max(min, Math.min(max, value))
    emit('update:filterIntensity', clampedValue)
  }
}

// 获取滤镜强度标题
const getFilterIntensityTitle = (): string => {
  if (!props.imageElement?.filter) {
    return '滤镜强度'
  }
  
  const filter = props.imageElement.filter
  switch (filter) {
    case 'grayscale':
      return '灰度强度 (0-100%)'
    case 'blur':
      return '模糊强度 (0-100px)'
    case 'contrast':
      return '对比度 (0-200%)'
    default:
      return '滤镜强度'
  }
}
</script>

<style scoped>
.image-toolbar {
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

.toolbar-select {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  background: #fff;
  cursor: pointer;
  min-width: 100px;
}

.toolbar-select:hover {
  border-color: #999;
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
</style>

