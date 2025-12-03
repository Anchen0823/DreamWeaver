<template>
  <div class="layers-panel">
    <div class="layers-header">
      <h3 class="layers-title">图层</h3>
    </div>
    <div class="layers-list">
      <LayerTreeItem
        v-for="(element, index) in reversedElements"
        :key="element.id"
        :element="element"
        :index="index"
        :selected-element-ids="selectedElementIds"
        :hovered-id="hoveredId"
        :dragged-index="draggedIndex"
        :drag-over-index="dragOverIndex"
        :drag-position="dragPosition"
        :expanded-group-ids="expandedGroupIds"
        @select-element="handleSelectElement"
        @hover-element="hoveredId = $event"
        @toggle-group="toggleGroup"
        @drag-start="handleDragStart"
        @drag-over="handleDragOver"
        @drop="handleDrop"
        @drag-end="handleDragEnd"
      />
      
      <div v-if="elements.length === 0" class="empty-state">
        <div class="empty-text">暂无元素</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CanvasElement, ShapeElement, ImageElement, TextElement, GroupElement } from '../types/canvas'
import LayerTreeItem from './LayerTreeItem.vue'

interface Props {
  elements: CanvasElement[]
  selectedElementIds: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  selectElement: [elementId: string, ctrlKey: boolean]
  reorderElement: [fromIndex: number, toIndex: number]
}>()

const hoveredId = ref<string | null>(null)
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)
const dragPosition = ref<'top' | 'bottom' | null>(null)
const expandedGroupIds = ref<string[]>([])

const handleSelectElement = (elementId: string, ctrlKey: boolean) => {
  emit('selectElement', elementId, ctrlKey)
}

// 切换组合展开状态
const toggleGroup = (groupId: string) => {
  const index = expandedGroupIds.value.indexOf(groupId)
  if (index > -1) {
    expandedGroupIds.value.splice(index, 1)
  } else {
    expandedGroupIds.value.push(groupId)
  }
}

// 获取组合的子元素（反转顺序显示）
const getReversedChildren = (group: CanvasElement) => {
  if (group.type !== 'group') return []
  return [...(group as GroupElement).children].reverse()
}

// 反转元素列表，使最新的元素显示在顶部（类似 Figma）
const reversedElements = computed(() => {
  return [...props.elements].reverse()
})

// 拖拽处理
const handleDragStart = (index: number, e: DragEvent) => {
  if (e.dataTransfer) {
    draggedIndex.value = index
    e.dataTransfer.effectAllowed = 'move'
  }
}

const handleDragOver = (index: number, e: DragEvent) => {
  e.preventDefault() // 允许放置
  
  if (draggedIndex.value === null || draggedIndex.value === index) {
    dragOverIndex.value = null
    dragPosition.value = null
    return
  }
  
  dragOverIndex.value = index
  
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const midY = rect.top + rect.height / 2
  
  dragPosition.value = e.clientY < midY ? 'top' : 'bottom'
}

const handleDrop = (index: number, e: DragEvent) => {
  e.preventDefault()
  
  if (draggedIndex.value !== null && draggedIndex.value !== index) {
    // 简化处理：仅支持顶层排序
    // 注意：嵌套拖拽需要更复杂的逻辑（判断目标是否在组内，计算新父级等）
    // 当前版本只支持根层级排序
    
    const len = props.elements.length
    const uiFrom = draggedIndex.value
    const uiTo = index
    
    const realFrom = len - 1 - uiFrom
    let uiTargetIndex = uiTo
    if (dragPosition.value === 'bottom') {
      uiTargetIndex += 1
    }
    let realTo = len - uiTargetIndex
    
    if (realTo > realFrom) {
      realTo -= 1
    }
    
    emit('reorderElement', realFrom, realTo)
  }
  
  handleDragEnd()
}

const handleDragEnd = () => {
  draggedIndex.value = null
  dragOverIndex.value = null
  dragPosition.value = null
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
  padding: 8px 10px; /* 增大内边距 */
  cursor: pointer;
  transition: background-color 0.15s ease;
  height: 48px; /* 增大行高 */
  border-bottom: 1px solid transparent;
  border-top: 1px solid transparent;
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
  width: 40px; /* 增大缩略图 */
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 10px;
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
  gap: 1px;
}

.layer-name {
  font-size: 13px; /* 增大字体 */
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
  font-size: 11px; /* 增大字体 */
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

