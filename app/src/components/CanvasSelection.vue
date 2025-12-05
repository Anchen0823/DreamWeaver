<template>
  <!-- 选中框 -->
  <template
    v-for="elementId in selectedElementIds"
    :key="`selection-${elementId}`"
  >
    <template v-if="shouldShowSelectionBox(elementId)">
      <div
        class="selection-box"
        :style="getSelectionBoxStyle(elementId)"
      ></div>
      <!-- 角点选择点 -->
      <div
        v-for="handle in cornerHandles"
        :key="`handle-${elementId}-${handle}`"
        class="resize-handle"
        :class="`resize-handle-${handle}`"
        :style="getResizeHandleStyle(elementId, handle)"
        @mousedown.stop="handleCornerResizeMouseDown(elementId, handle, $event)"
      ></div>
      <!-- 边缘拖动区域 -->
      <div
        class="resize-edge resize-edge-top"
        :style="getResizeEdgeStyle(elementId, 'n')"
        @mousedown.stop="handleResizeMouseDown(elementId, 'n', $event)"
      ></div>
      <div
        class="resize-edge resize-edge-bottom"
        :style="getResizeEdgeStyle(elementId, 's')"
        @mousedown.stop="handleResizeMouseDown(elementId, 's', $event)"
      ></div>
      <div
        class="resize-edge resize-edge-left"
        :style="getResizeEdgeStyle(elementId, 'w')"
        @mousedown.stop="handleResizeMouseDown(elementId, 'w', $event)"
      ></div>
      <div
        class="resize-edge resize-edge-right"
        :style="getResizeEdgeStyle(elementId, 'e')"
        @mousedown.stop="handleResizeMouseDown(elementId, 'e', $event)"
      ></div>
      <!-- 尺寸标签 -->
      <div
        v-if="getElement(elementId)"
        class="size-label"
        :style="getSizeLabelStyle(elementId)"
      >
        {{ formatSize(elementId) }}
      </div>
    </template>
  </template>
  
  <!-- 框选框 -->
  <div
    v-if="isSelecting"
    class="selection-rect"
    :style="getSelectionRectStyle()"
  ></div>
</template>

<script setup lang="ts">
import { computed, type Ref } from 'vue'
import type { useElementSelection } from '../composables/useElementSelection'
import type { useResize } from '../composables/useResize'
import type { useViewport } from '../composables/useViewport'
import type { CanvasElement, GroupElement } from '../types/canvas'

interface Props {
  selection: ReturnType<typeof useElementSelection>
  resize: ReturnType<typeof useResize>
  viewport: ReturnType<typeof useViewport>
  elements: Ref<CanvasElement[]>
  editingTextElementId: string | null
  containerRef: HTMLElement | undefined
}

const props = defineProps<Props>()

// 递归查找元素并计算世界坐标
const findElementWithWorldCoords = (
  list: CanvasElement[],
  elementId: string,
  offsetX = 0,
  offsetY = 0
): { element: CanvasElement; worldX: number; worldY: number } | null => {
  for (const el of list) {
    if (el.id === elementId) {
      return {
        element: el,
        worldX: el.x + offsetX,
        worldY: el.y + offsetY
      }
    }
    
    if (el.type === 'group') {
      const group = el as GroupElement
      const found = findElementWithWorldCoords(
        group.children,
        elementId,
        offsetX + el.x,
        offsetY + el.y
      )
      if (found) return found
    }
  }
  
  return null
}

const selectedElementIds = computed(() => props.selection.selectedElementIds.value)
const isSelecting = computed(() => props.selection.isSelecting.value)

const cornerHandles = ['nw', 'ne', 'se', 'sw'] as const

const shouldShowSelectionBox = (elementId: string) => {
  return props.editingTextElementId !== elementId
}

const getSelectionBoxStyle = (elementId: string) => {
  return props.selection.getSelectionBoxStyle(elementId)
}

const getSelectionRectStyle = () => {
  return props.selection.getSelectionRectStyle()
}

const getResizeHandleStyle = (elementId: string, handle: typeof cornerHandles[number]) => {
  return props.resize.getResizeHandleStyle(elementId, handle)
}

const getResizeEdgeStyle = (elementId: string, edge: 'n' | 's' | 'e' | 'w') => {
  return props.resize.getResizeEdgeStyle(elementId, edge)
}

const handleCornerResizeMouseDown = (
  elementId: string,
  handle: typeof cornerHandles[number],
  e: MouseEvent
) => {
  if (!props.containerRef) return
  const rect = props.containerRef.getBoundingClientRect()
  props.resize.startResize(elementId, handle, e.clientX, e.clientY, rect)
  e.preventDefault()
  e.stopPropagation()
}

const handleResizeMouseDown = (
  elementId: string,
  handle: 'n' | 's' | 'e' | 'w',
  e: MouseEvent
) => {
  if (!props.containerRef) return
  const rect = props.containerRef.getBoundingClientRect()
  props.resize.startResize(elementId, handle, e.clientX, e.clientY, rect)
  e.preventDefault()
  e.stopPropagation()
}

const getElement = (elementId: string) => {
  const found = findElementWithWorldCoords(props.elements.value, elementId)
  return found ? found.element : null
}

const formatSize = (elementId: string) => {
  const element = getElement(elementId)
  if (!element) return ''
  const width = Math.round(element.width)
  const height = Math.round(element.height)
  return `${width}px × ${height}px`
}

const getSizeLabelStyle = (elementId: string) => {
  const found = findElementWithWorldCoords(props.elements.value, elementId)
  if (!found) return { display: 'none' }
  
  const element = found.element
  const worldX = found.worldX
  const worldY = found.worldY
  
  // 使用画布坐标系，与选中框和工具栏的计算方式一致
  // 标签显示在元素下方中心
  const padding = 4
  const scaledPadding = padding * props.viewport.scale.value
  const labelX = worldX * props.viewport.scale.value - scaledPadding + (element.width * props.viewport.scale.value + scaledPadding * 2) / 2
  const labelY = worldY * props.viewport.scale.value - scaledPadding + element.height * props.viewport.scale.value + scaledPadding * 2 + 8 / props.viewport.zoom.value // 下方 8px（屏幕像素），需要除以 zoom 转换为画布坐标
  
  return {
    position: 'absolute',
    left: `${labelX}px`,
    top: `${labelY}px`,
    transform: 'translateX(-50%)',
  }
}
</script>

<style scoped>
.selection-box {
  border: 2px solid #4a90e2;
  border-radius: 2px;
  background-color: transparent;
  box-shadow: 0 0 0 1px rgba(74, 144, 226, 0.2);
  pointer-events: none;
}

.selection-rect {
  border: 2px dashed #4a90e2;
  border-radius: 2px;
  background-color: rgba(74, 144, 226, 0.1);
  pointer-events: none;
}

.resize-edge {
  position: absolute;
  background: transparent;
  pointer-events: all;
  z-index: 1002;
}

.resize-edge-top {
  cursor: ns-resize;
}

.resize-edge-bottom {
  cursor: ns-resize;
}

.resize-edge-left {
  cursor: ew-resize;
}

.resize-edge-right {
  cursor: ew-resize;
}

.resize-edge:hover {
  background: rgba(74, 144, 226, 0.1);
}

.resize-handle {
  position: absolute;
  background: #ffffff;
  border: 2px solid #4a90e2;
  border-radius: 2px;
  pointer-events: all;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
  z-index: 1003;
}

.resize-handle:hover {
  border-color: #357abd;
  background: #ffffff;
}

.size-label {
  position: absolute;
  background: #4a90e2;
  color: #ffffff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  white-space: nowrap;
  pointer-events: none;
  z-index: 1001;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
</style>

