<template>
  <div 
    class="canvas-container"
    @mousedown="handleContainerMouseDown"
    @mousemove="handleContainerMouseMove"
    @mouseup="handleContainerMouseUp"
    @mouseleave="handleContainerMouseUp"
    @wheel="handleContainerWheel"
    :class="{ 'is-dragging': interaction.isDragging.value, 'can-drag': interaction.isSpacePressed.value }"
    :style="viewport.gridBackgroundStyle.value"
    ref="containerRef"
  >
    <div 
      class="canvas" 
      :style="viewport.canvasStyle.value"
    >
      <div
        v-for="element in elements"
        :key="element.id"
        :class="['element', element.type, { 'selected': selection.isElementSelected(element.id) }]"
        :style="getElementStyle(element, viewport.scale.value)"
        @mousedown.stop="selection.handleElementMouseDown(element.id, $event)"
      >
        <!-- 图形元素 -->
        <template v-if="element.type === 'rectangle' || element.type === 'rounded-rectangle' || element.type === 'circle' || element.type === 'triangle'">
          <!-- 图形通过CSS样式渲染，无需内容 -->
        </template>
        
        <!-- 图片元素 -->
        <template v-else-if="element.type === 'image'">
          <img
            :src="element.src"
            :alt="element.id"
            :style="getImageStyle(element)"
            class="image-content"
          />
        </template>
        
        <!-- 文本元素 -->
        <template v-else-if="element.type === 'text'">
          <div
            :style="getTextStyle(element, viewport.scale.value)"
            class="text-content"
            v-html="formatTextContent(element)"
          ></div>
        </template>
      </div>
      
      <!-- 选中框 -->
      <div
        v-for="elementId in selection.selectedElementIds.value"
        :key="`selection-${elementId}`"
        class="selection-box"
        :style="selection.getSelectionBoxStyle(elementId)"
      ></div>
      
      <!-- 框选框 -->
      <div
        v-if="selection.isSelecting.value"
        class="selection-rect"
        :style="selection.getSelectionRectStyle()"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { CanvasElement, ImageElement, TextElement } from '../types/canvas'
import { useViewport } from '../composables/useViewport'
import { useCanvasInteraction } from '../composables/useCanvasInteraction'
import { useElementSelection } from '../composables/useElementSelection'
import { useClipboard } from '../composables/useClipboard'
import { getElementStyle, getImageStyle, getTextStyle, formatTextContent } from '../utils/style-calculator'
import { screenToCanvas } from '../utils/coordinate-utils'
import { mockElements } from '../utils/mock-data'

// 画布元素数据
const elements = ref<CanvasElement[]>(mockElements)

// 容器引用
const containerRef = ref<HTMLElement>()

// 视口管理
const viewport = useViewport()

// 画布交互
const interaction = useCanvasInteraction(viewport)

// 元素选择
const selection = useElementSelection(elements, viewport)

// 剪贴板
const clipboard = useClipboard()

// 处理容器鼠标按下事件
const handleContainerMouseDown = (e: MouseEvent) => {
  // 先尝试处理画布拖拽
  const handled = interaction.handleMouseDown(e)
  if (handled) {
    return
  }

  // 如果点击的是元素，不触发框选
  const target = e.target as HTMLElement
  if (target.closest('.element')) {
    return
  }

  // 左键处理框选
  if (e.button === 0) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    selection.startSelection(x, y, e.ctrlKey || e.metaKey)
    e.preventDefault()
  }
}

// 处理容器鼠标移动事件
const handleContainerMouseMove = (e: MouseEvent) => {
  // 更新鼠标位置（用于粘贴）
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    const canvasPos = screenToCanvas(
      e.clientX,
      e.clientY,
      rect,
      viewport.viewportOffsetX.value,
      viewport.viewportOffsetY.value,
      viewport.zoom.value,
      viewport.scale.value
    )
    clipboard.updateMousePosition(canvasPos.x, canvasPos.y)
  }

  // 处理画布拖拽
  const dragHandled = interaction.handleMouseMove(e)
  if (dragHandled) {
    return
  }

  // 处理框选
  if (selection.isSelecting.value) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    selection.updateSelectionPosition(x, y)
    selection.updateSelectionFromRect()
    e.preventDefault()
  }
}

// 处理容器鼠标释放事件
const handleContainerMouseUp = (e: MouseEvent) => {
  // 结束画布拖拽
  const dragHandled = interaction.handleMouseUp()
  if (dragHandled) {
    return
  }

  // 结束框选
  selection.endSelection()
}

// 处理容器滚轮事件
const handleContainerWheel = (e: WheelEvent) => {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    interaction.handleWheel(e, rect)
  }
}

// 处理键盘按下事件
const handleKeyDown = (e: KeyboardEvent) => {
  // 处理空格键
  const spaceHandled = interaction.handleKeyDown(e)
  if (spaceHandled) {
    return
  }

  // Ctrl/Cmd + C: 复制
  if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
    if (selection.selectedElementIds.value.length > 0) {
      clipboard.copySelectedElements(selection.selectedElementIds.value, elements.value)
      e.preventDefault()
    }
    return
  }

  // Ctrl/Cmd + V: 粘贴
  if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
    if (clipboard.clipboard.value.length > 0) {
      const newElements = clipboard.pasteElements(elements.value, selection.selectedElementIds)
      elements.value.push(...newElements)
      e.preventDefault()
    }
    return
  }
}

// 处理键盘释放事件
const handleKeyUp = (e: KeyboardEvent) => {
  interaction.handleKeyUp(e)
}

// 监听窗口大小变化
onMounted(() => {
  viewport.updateCanvasSize()
  window.addEventListener('resize', viewport.updateCanvasSize)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  // 阻止默认的滚轮缩放行为
  if (containerRef.value) {
    containerRef.value.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
      }
    }, { passive: false })
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', viewport.updateCanvasSize)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})
</script>

<style scoped>
.canvas-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  margin: 0;
  padding: 0;
  cursor: default;
  background-color: #ffffff;
  background-image: 
    linear-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.08) 1px, transparent 1px);
  background-size: 20px 20px;
}

.canvas-container.can-drag {
  cursor: grab;
}

.canvas-container.is-dragging {
  cursor: grabbing;
}

.canvas {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 10000px;
  min-height: 10000px;
  background-color: transparent;
  margin: 0;
  padding: 0;
  will-change: transform;
}

.element {
  cursor: pointer;
}

.element:hover {
  opacity: 0.9;
}

/* 选中状态通过选中框显示 */

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

.image-content {
  display: block;
  user-select: none;
  pointer-events: none;
}

.text-content {
  user-select: text;
  white-space: pre-wrap;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .canvas {
    background-size: 15px 15px;
  }
}

@media (max-width: 480px) {
  .canvas {
    background-size: 10px 10px;
  }
}
</style>
