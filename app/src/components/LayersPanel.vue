<template>
  <div class="layers-panel">
    <div class="layers-header">
      <h3 class="layers-title">图层</h3>
    </div>
    <div class="layers-list">
      <div
        v-for="(element, index) in reversedElements"
        :key="element.id"
        class="layer-item"
        :class="{ 'selected': isSelected(element.id), 'hover': hoveredId === element.id }"
        @click.stop="handleLayerClick(element.id, $event)"
        @mouseenter="hoveredId = element.id"
        @mouseleave="hoveredId = null"
      >
        <div class="layer-thumbnail">
          <div class="thumbnail-content" :style="getThumbnailStyle(element)">
            <LayerThumbnail :element="element" />
          </div>
        </div>
        <div class="layer-info">
          <div class="layer-name">{{ getElementName(element, index) }}</div>
          <div class="layer-type">{{ getElementTypeLabel(element.type) }}</div>
        </div>
      </div>
      <div v-if="elements.length === 0" class="empty-state">
        <div class="empty-text">暂无元素</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CanvasElement, ShapeElement, ImageElement, TextElement } from '../types/canvas'
import LayerThumbnail from './LayerThumbnail.vue'

interface Props {
  elements: CanvasElement[]
  selectedElementIds: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  selectElement: [elementId: string, ctrlKey: boolean]
}>()

const hoveredId = ref<string | null>(null)

// 反转元素列表，使最新的元素显示在顶部（类似 Figma）
const reversedElements = computed(() => {
  return [...props.elements].reverse()
})

const isSelected = (elementId: string) => {
  return props.selectedElementIds.includes(elementId)
}

const handleLayerClick = (elementId: string, event: MouseEvent) => {
  emit('selectElement', elementId, event.ctrlKey || event.metaKey)
}

// 获取元素名称
const getElementName = (element: CanvasElement, index: number): string => {
  // 根据元素类型生成名称
  const typeNames: Record<string, string> = {
    'rectangle': '矩形',
    'rounded-rectangle': '圆角矩形',
    'circle': '圆形',
    'triangle': '三角形',
    'image': '图片',
    'text': '文本'
  }
  
  const baseName = typeNames[element.type] || '元素'
  // 计算在原始列表中的索引（从底部开始计数）
  const originalIndex = props.elements.length - 1 - index
  return `${baseName} ${originalIndex + 1}`
}

// 获取元素类型标签
const getElementTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'rectangle': 'Rectangle',
    'rounded-rectangle': 'Rounded Rectangle',
    'circle': 'Circle',
    'triangle': 'Triangle',
    'image': 'Image',
    'text': 'Text'
  }
  return labels[type] || type
}

// 获取缩略图样式
const getThumbnailStyle = (element: CanvasElement) => {
  // 计算缩略图尺寸，保持宽高比
  const maxSize = 40
  const aspectRatio = element.width / element.height
  
  let width = maxSize
  let height = maxSize
  
  if (aspectRatio > 1) {
    height = maxSize / aspectRatio
  } else {
    width = maxSize * aspectRatio
  }
  
  return {
    width: `${width}px`,
    height: `${height}px`
  }
}
</script>

<style scoped>
.layers-panel {
  width: 240px;
  flex-shrink: 0;
  height: 100%;
  background: #ffffff;
  border-right: 1px solid #e5e5e5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.layers-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e5e5;
  flex-shrink: 0;
}

.layers-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.layers-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.layers-list::-webkit-scrollbar {
  width: 8px;
  display: none;
}

.layers-panel:hover .layers-list::-webkit-scrollbar {
  display: block;
}

.layer-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.layer-item:hover {
  background-color: #f9f9f9;
}

.layer-item.hover {
  background-color: #f5f5f5;
}

.layer-item.selected {
  background-color: #e8f4ff;
}

.layer-item.selected:hover {
  background-color: #d4e9ff;
}

.layer-thumbnail {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 8px;
  background: #f9f9f9;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  overflow: hidden;
}

.thumbnail-content {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.layer-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.layer-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layer-item.selected .layer-name {
  color: #0066ff;
}

.layer-type {
  font-size: 11px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-state {
  padding: 32px 16px;
  text-align: center;
}

.empty-text {
  font-size: 13px;
  color: #999;
}

/* 滚动条样式 - 仅在悬停时显示 */
.layers-panel:hover .layers-list {
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: #ccc #f5f5f5; /* Firefox */
}

.layers-panel:hover .layers-list::-webkit-scrollbar {
  display: block;
}

.layers-panel:hover .layers-list::-webkit-scrollbar-track {
  background: #f5f5f5;
}

.layers-panel:hover .layers-list::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}

.layers-panel:hover .layers-list::-webkit-scrollbar-thumb:hover {
  background: #999;
}
</style>

