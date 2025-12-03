<template>
  <div class="layer-tree-item">
    <!-- 组合元素 -->
    <div 
      v-if="element.type === 'group'"
      class="layer-group"
    >
      <div
        class="layer-item group-header"
        :class="{ 
          'selected': isSelected(element.id), 
          'hover': hoveredId === element.id,
          'drag-over-top': dragOverIndex === index && dragPosition === 'top',
          'drag-over-bottom': dragOverIndex === index && dragPosition === 'bottom',
          'is-dragging': draggedIndex === index
        }"
        draggable="true"
        @click.stop="handleClick"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
        @dragstart="handleDragStart"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
        @dragend="handleDragEnd"
      >
        <!-- 缩进垫片 -->
        <div 
          v-if="depth > 0" 
          class="indent-spacer"
          :style="{ width: `${depth * 8}px` }"
        ></div>

        <!-- 展开/折叠图标 -->
        <div 
          class="group-toggle"
          @click.stop="toggleGroup"
        >
          <svg 
            class="toggle-icon" 
            :class="{ 'expanded': isExpanded }"
            width="10" 
            height="10" 
            viewBox="0 0 12 12" 
            fill="none"
          >
            <path d="M4 2L8 6L4 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        
        <div class="layer-thumbnail">
          <div class="thumbnail-content" :style="getThumbnailStyle(element)">
            <LayerThumbnail :element="element" />
          </div>
        </div>
        <div class="layer-info">
          <div class="layer-name">{{ getElementName(element) }}</div>
          <div class="layer-type">Group</div>
        </div>
      </div>
      
      <!-- 组内元素列表（递归渲染） -->
      <div v-if="isExpanded" class="group-children">
        <LayerTreeItem
          v-for="(child, childIndex) in getReversedChildren(element)"
          :key="child.id"
          :element="child"
          :index="childIndex"
          :depth="depth + 1"
          :parent-group-id="element.id"
          :selected-element-ids="selectedElementIds"
          :hovered-id="hoveredId"
          :dragged-index="draggedIndex"
          :drag-over-index="dragOverIndex"
          :drag-position="dragPosition"
          :expanded-group-ids="expandedGroupIds"
          @select-element="(id, ctrl) => $emit('selectElement', id, ctrl)"
          @hover-element="(id) => $emit('hoverElement', id)"
          @toggle-group="(id) => $emit('toggleGroup', id)"
          @drag-start="(idx, e, elId, parentId) => $emit('dragStart', idx, e, elId, parentId)"
          @drag-over="(idx, e) => $emit('dragOver', idx, e)"
          @drop="(idx, e, parentId) => $emit('drop', idx, e, parentId)"
          @drag-end="() => $emit('dragEnd')"
        />
      </div>
    </div>
    
    <!-- 普通元素 -->
    <div
      v-else
      class="layer-item"
      :class="{ 
        'selected': isSelected(element.id), 
        'hover': hoveredId === element.id,
        'drag-over-top': dragOverIndex === index && dragPosition === 'top',
        'drag-over-bottom': dragOverIndex === index && dragPosition === 'bottom',
        'is-dragging': draggedIndex === index
      }"
      draggable="true"
      @click.stop="handleClick"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      @dragstart="handleDragStart"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @dragend="handleDragEnd"
    >
      <!-- 缩进垫片 -->
      <div 
        v-if="depth > 0" 
        class="indent-spacer"
        :style="{ width: `${depth * 8}px` }"
      ></div>

      <!-- 占位符，对齐图标 -->
      <div class="group-toggle-placeholder"></div>

      <div class="layer-thumbnail">
        <div class="thumbnail-content" :style="getThumbnailStyle(element)">
          <LayerThumbnail :element="element" />
        </div>
      </div>
      <div class="layer-info">
        <div class="layer-name">{{ getElementName(element) }}</div>
        <div class="layer-type">{{ getElementTypeLabel(element.type) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import type { CanvasElement, GroupElement } from '../types/canvas'
import LayerThumbnail from './LayerThumbnail.vue'

interface Props {
  element: CanvasElement
  index: number
  depth?: number
  selectedElementIds: string[]
  hoveredId: string | null
  draggedIndex: number | null
  dragOverIndex: number | null
  dragPosition: 'top' | 'bottom' | null
  expandedGroupIds: string[]
  parentGroupId?: string // 父组ID，用于识别是否在组内拖动
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
  parentGroupId: undefined
})

const emit = defineEmits<{
  selectElement: [elementId: string, ctrlKey: boolean]
  hoverElement: [elementId: string | null]
  toggleGroup: [groupId: string]
  dragStart: [index: number, event: DragEvent, elementId: string, parentGroupId?: string]
  dragOver: [index: number, event: DragEvent]
  drop: [index: number, event: DragEvent, parentGroupId?: string]
  dragEnd: []
}>()

const isSelected = (elementId: string) => {
  return props.selectedElementIds.includes(elementId)
}

const isExpanded = computed(() => {
  return props.expandedGroupIds.includes(props.element.id)
})

const handleClick = (event: MouseEvent) => {
  emit('selectElement', props.element.id, event.ctrlKey || event.metaKey)
}

const handleMouseEnter = () => {
  emit('hoverElement', props.element.id)
}

const handleMouseLeave = () => {
  emit('hoverElement', null)
}

const toggleGroup = () => {
  emit('toggleGroup', props.element.id)
}

const handleDragStart = (e: DragEvent) => {
  emit('dragStart', props.index, e, props.element.id, props.parentGroupId)
}

const handleDragOver = (e: DragEvent) => {
  emit('dragOver', props.index, e)
}

const handleDragLeave = () => {
  // 
}

const handleDrop = (e: DragEvent) => {
  emit('drop', props.index, e, props.parentGroupId)
}

const handleDragEnd = () => {
  emit('dragEnd')
}

// 获取组合的子元素（反转顺序显示）
const getReversedChildren = (group: CanvasElement) => {
  if (group.type !== 'group') return []
  return [...(group as GroupElement).children].reverse()
}

// 获取元素名称
const getElementName = (element: CanvasElement): string => {
  // 优先使用自定义名称
  if (element.name) {
    return element.name
  }
  
  // 回退到默认名称（类型名）
  const typeNames: Record<string, string> = {
    'rectangle': '矩形',
    'rounded-rectangle': '圆角矩形',
    'circle': '圆形',
    'triangle': '三角形',
    'image': '图片',
    'text': '文本',
    'brush': '画笔',
    'group': '组合'
  }
  return typeNames[element.type] || '元素'
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
    'brush': 'Brush',
    'group': 'Group'
  }
  return labels[type] || type
}

// 获取缩略图样式
const getThumbnailStyle = (element: CanvasElement) => {
  const maxSize = 40 // 增大缩略图尺寸
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
.layer-tree-item {
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

.layer-item.is-dragging {
  opacity: 0.5;
  background: #f0f0f0;
}

.layer-item.drag-over-top {
  border-top-color: #0066ff;
}

.layer-item.drag-over-bottom {
  border-bottom-color: #0066ff;
}

.indent-spacer {
  height: 100%;
  flex-shrink: 0;
}

.group-toggle {
  width: 18px; /* 稍微增大按钮 */
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
  cursor: pointer;
  color: #666;
  border-radius: 2px;
}

.group-toggle:hover {
  background: rgba(0, 0, 0, 0.05);
}

.group-toggle-placeholder {
  width: 18px;
  height: 18px;
  margin-right: 4px;
  flex-shrink: 0;
}

.toggle-icon {
  transition: transform 0.2s ease;
  width: 12px;
  height: 12px;
}

.toggle-icon.expanded {
  transform: rotate(90deg);
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

.layer-group {
  display: block;
}

.group-children {
  margin-left: 8px; /* 减小缩进，更紧凑 */
}
</style>

