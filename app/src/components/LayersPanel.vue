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
        :class="{ 
          'selected': isSelected(element.id), 
          'hover': hoveredId === element.id,
          'drag-over-top': dragOverIndex === index && dragPosition === 'top',
          'drag-over-bottom': dragOverIndex === index && dragPosition === 'bottom',
          'is-dragging': draggedIndex === index
        }"
        draggable="true"
        @click.stop="handleLayerClick(element.id, $event)"
        @mouseenter="hoveredId = element.id"
        @mouseleave="hoveredId = null"
        @dragstart="handleDragStart(index, $event)"
        @dragover="handleDragOver(index, $event)"
        @dragleave="handleDragLeave"
        @drop="handleDrop(index, $event)"
        @dragend="handleDragEnd"
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
  reorderElement: [fromIndex: number, toIndex: number]
}>()

const hoveredId = ref<string | null>(null)
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)
const dragPosition = ref<'top' | 'bottom' | null>(null)

// 反转元素列表，使最新的元素显示在顶部（类似 Figma）
const reversedElements = computed(() => {
  return [...props.elements].reverse()
})

// 拖拽处理
const handleDragStart = (index: number, e: DragEvent) => {
  if (e.dataTransfer) {
    draggedIndex.value = index
    e.dataTransfer.effectAllowed = 'move'
    // 设置透明拖拽图像或使用默认
    // e.dataTransfer.setDragImage(img, 0, 0)
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

const handleDragLeave = () => {
  // 简单的离开不清除，防止闪烁，drop 或 end 时清除
}

const handleDrop = (index: number, e: DragEvent) => {
  e.preventDefault()
  
  if (draggedIndex.value !== null && draggedIndex.value !== index) {
    // 计算真实索引
    // UI Index: 0 is Top (End of Array), N is Bottom (Start of Array)
    // Real Index = Length - 1 - UI Index
    
    const len = props.elements.length
    const uiFrom = draggedIndex.value
    const uiTo = index
    
    // 转换为真实数组索引
    const realFrom = len - 1 - uiFrom
    
    // 计算目标真实索引
    // 如果放在 top (before in UI)，意味着在 Array 中是后面 (Index + 1?)
    // 让我们用简单的逻辑：
    // UI: [A, B, C]. A is Top (Real 2). B (Real 1). C (Real 0).
    // Drag A (UI 0) to C (UI 2).
    // If Drop 'bottom' of C -> Insert at UI 3 (End of UI list) -> Real 0 (Start of Array).
    // If Drop 'top' of C -> Insert at UI 2 (Before C) -> Real 1.
    
    // UI Target Index (insertion point in UI list)
    let uiTargetIndex = uiTo
    if (dragPosition.value === 'bottom') {
      uiTargetIndex += 1
    }
    
    // Convert UI Target Index to Real Target Index
    // UI 0 -> Real Length (Append)
    // UI Length -> Real 0 (Prepend)
    // Formula: realTo = len - uiTargetIndex
    
    let realTo = len - uiTargetIndex
    
    // 修正：如果 realTo > realFrom，因为移除元素导致索引变化，需要 -1
    // 但是这里我们传递给 Canvas 的 reorderElement 方法通常处理原始索引
    // 不过我们之前的 Canvas.vue 实现是先 remove 再 insert
    // 如果 realTo > realFrom (Move from 0 to 2)
    // Remove 0. Index 2 becomes 1. We want to insert at 2.
    // So if we pass 2, it inserts at 2 (which was 3).
    // Wait, let's look at Canvas implementation again.
    /*
      newElements.splice(fromIndex, 1)
      newElements.splice(toIndex, 0, element)
    */
    // If [A, B, C]. Move A (0) to C (2). Target 2.
    // Splice(0, 1) -> [B, C].
    // Splice(2, 0, A) -> [B, C, A]. Correct.
    // So if we want to be at Top (Index 2), we pass 2.
    
    // Let's check our formula `realTo = len - uiTargetIndex`
    // Example: Drag Top (UI 0) to Bottom (UI 2 'bottom').
    // uiFrom = 0. uiTo = 2 ('bottom') -> uiTarget = 3.
    // realFrom = 3 - 1 - 0 = 2.
    // realTo = 3 - 3 = 0.
    // Canvas: splice(2, 1) -> [A, B]. splice(0, 0, C) -> [C, A, B].
    // Result: C is Bottom. Correct.
    
    // Example: Drag Bottom (UI 2) to Top (UI 0 'top').
    // uiFrom = 2. uiTo = 0 ('top') -> uiTarget = 0.
    // realFrom = 3 - 1 - 2 = 0.
    // realTo = 3 - 0 = 3.
    // Canvas: splice(0, 1) -> [B, C]. splice(3, 0, A) -> [B, C, A].
    // Result: A is Top. Correct.
    
    // Adjustment needed if realTo > realFrom?
    // Canvas implementation: `newElements.splice(toIndex, 0, element)`
    // If I move 0 to 2. `toIndex` 2 means after element at index 1 (in reduced array).
    // Original array indices: 0, 1, 2.
    // If I want to be after 2. Target index should be 2 (in reduced array of size 2, index 2 is append).
    // My formula gave 3 for "Top".
    // Splice(3, 0, A) on array of length 2 works?
    // Yes, splice allows index > length, it appends.
    // But `reorderElement` has a check: `toIndex >= elements.value.length`.
    // Wait, `elements.value.length` is original length (3).
    // If I pass 3, it returns early!
    
    // Canvas.vue check:
    /*
      if (toIndex >= elements.value.length) return
    */
    // This check is too strict for append!
    // We should allow toIndex == length (append).
    // I need to fix Canvas.vue first.
    
    // For now, let's assume I fix Canvas.vue.
    // But wait, `realTo` calculation `3` is correct for splice.
    // But if I want to insert at position `len` (Top), I should pass `len`.
    // But `reorderElement` needs to allow `toIndex === len`.
    
    // Actually, if `realTo > realFrom`, the target index in the new array is `realTo - 1`.
    // Example: Move 0 to 2. Target 2.
    // Formula gave 3.
    // If I adjust: `if (realTo > realFrom) realTo -= 1`.
    // 3 - 1 = 2.
    // Splice(2, 0, A) -> [B, C, A]. Correct.
    
    // So yes, I should decrement if realTo > realFrom.
    
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
    'text': '文本',
    'brush': '画笔'
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
    'text': 'Text',
    'brush': 'Brush'
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

.layer-item.is-dragging {
  opacity: 0.5;
  background: #f0f0f0;
}

.layer-item.drag-over-top {
  border-top: 2px solid #0066ff;
}

.layer-item.drag-over-bottom {
  border-bottom: 2px solid #0066ff;
}
</style>

