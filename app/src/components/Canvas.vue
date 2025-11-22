<template>
  <div 
    class="canvas-container"
    @mousedown="handleContainerMouseDown"
    @mousemove="handleContainerMouseMove"
    @mouseup="handleContainerMouseUp"
    @mouseleave="handleContainerMouseUp"
    @wheel="handleContainerWheel"
    :class="{ 
      'is-dragging': interaction.isDragging.value, 
      'can-drag': interaction.isSpacePressed.value,
      'is-drawing': isDrawing,
      'tool-active': !!props.activeTool && props.activeTool !== 'text' && props.activeTool !== 'image',
      'tool-text': props.activeTool === 'text',
      'tool-image': props.activeTool === 'image' && pendingImageData
    }"
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
      
      <!-- 绘制预览 -->
      <div
        v-if="isDrawing && previewElement"
        :class="['element', 'preview', previewElement.type]"
        :style="getElementStyle(previewElement, viewport.scale.value)"
      >
        <!-- 图片预览 -->
        <template v-if="previewElement.type === 'image'">
          <img
            :src="(previewElement as ImageElement).src"
            :alt="previewElement.id"
            :style="getImageStyle(previewElement as ImageElement)"
            class="image-content"
          />
        </template>
        
        <!-- 文本预览 -->
        <template v-else-if="previewElement.type === 'text'">
          <div
            :style="getTextStyle(previewElement as TextElement, viewport.scale.value)"
            class="text-content"
            v-html="formatTextContent(previewElement as TextElement)"
          ></div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { CanvasElement, ImageElement, TextElement, ShapeElement } from '../types/canvas'
import { useViewport } from '../composables/useViewport'
import { useCanvasInteraction } from '../composables/useCanvasInteraction'
import { useElementSelection } from '../composables/useElementSelection'
import { useClipboard } from '../composables/useClipboard'
import { getElementStyle, getImageStyle, getTextStyle, formatTextContent } from '../utils/style-calculator'
import { screenToCanvas } from '../utils/coordinate-utils'
import { mockElements } from '../utils/mock-data'

// Props
const props = defineProps<{
  activeTool?: string | null
}>()

// 画布元素数据
const elements = ref<CanvasElement[]>(mockElements)

// 绘制状态
const isDrawing = ref(false)
const drawingStartX = ref(0)
const drawingStartY = ref(0)
const previewElement = ref<CanvasElement | null>(null)
// 待插入的图片数据
const pendingImageData = ref<{ src: string; originalWidth: number; originalHeight: number } | null>(null)

// 生成唯一ID
const generateId = () => {
  return `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// 添加图形元素
const addShape = (type: 'rectangle' | 'rounded-rectangle' | 'circle' | 'triangle') => {
  // 默认位置在画布中心附近
  const defaultX = 400
  const defaultY = 300
  const defaultWidth = 120
  const defaultHeight = 80

  const newElement: ShapeElement = {
    id: generateId(),
    type,
    x: defaultX,
    y: defaultY,
    width: type === 'circle' ? 80 : defaultWidth,
    height: type === 'circle' ? 80 : defaultHeight,
    backgroundColor: '#4a90e2',
    borderWidth: 2,
    borderColor: '#357abd',
    ...(type === 'rounded-rectangle' && { borderRadius: 8 })
  }

  elements.value.push(newElement)
  
  // 选中新创建的元素
  selection.selectedElementIds.value = [newElement.id]
}

// 添加图片元素
const addImage = (src: string, originalWidth: number, originalHeight: number) => {
  // 默认位置在画布中心附近
  const defaultX = 400
  const defaultY = 300
  
  // 限制最大尺寸
  const maxWidth = 400
  const maxHeight = 300
  let width = originalWidth
  let height = originalHeight
  
  if (width > maxWidth || height > maxHeight) {
    const scale = Math.min(maxWidth / width, maxHeight / height)
    width = width * scale
    height = height * scale
  }

  const newElement: ImageElement = {
    id: generateId(),
    type: 'image',
    x: defaultX,
    y: defaultY,
    width,
    height,
    src,
    originalWidth,
    originalHeight,
    filter: 'none'
  }

  elements.value.push(newElement)
  
  // 选中新创建的元素
  selection.selectedElementIds.value = [newElement.id]
}

// 添加文本元素
const addText = () => {
  // 默认位置在画布中心附近
  const defaultX = 400
  const defaultY = 300
  const defaultWidth = 200
  const defaultHeight = 50

  const newElement: TextElement = {
    id: generateId(),
    type: 'text',
    x: defaultX,
    y: defaultY,
    width: defaultWidth,
    height: defaultHeight,
    content: '双击编辑文本',
    fontFamily: 'Arial, sans-serif',
    fontSize: 24,
    color: '#333333',
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    textAlign: 'left',
    lineHeight: 1.5
  }

  elements.value.push(newElement)
  
  // 选中新创建的元素
  selection.selectedElementIds.value = [newElement.id]
}

// 监听activeTool变化，取消绘制状态
watch(() => props.activeTool, (newTool) => {
  if (!newTool && isDrawing.value) {
    isDrawing.value = false
    previewElement.value = null
  }
  // 如果切换到非图片工具，清除待插入的图片数据
  if (newTool !== 'image') {
    pendingImageData.value = null
  }
})

// 处理图片选择
const handleImageSelected = (src: string, width: number, height: number) => {
  pendingImageData.value = { src, originalWidth: width, originalHeight: height }
}

// 暴露方法供父组件调用
defineExpose({
  addShape,
  addImage,
  addText,
  handleImageSelected
})

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
  // 如果点击的是元素，不触发绘制或框选
  const target = e.target as HTMLElement
  if (target.closest('.element') && !target.closest('.preview')) {
    return
  }

  // 如果有激活的工具，开始绘制
  if (props.activeTool && (props.activeTool === 'rectangle' || props.activeTool === 'rounded-rectangle' || props.activeTool === 'circle' || props.activeTool === 'triangle' || props.activeTool === 'text' || props.activeTool === 'image')) {
    if (e.button === 0) {
      // 图片工具需要先选择图片
      if (props.activeTool === 'image' && !pendingImageData.value) {
        e.preventDefault()
        return
      }
      
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      
      // 转换为画布坐标
      const canvasPos = screenToCanvas(
        e.clientX,
        e.clientY,
        rect,
        viewport.viewportOffsetX.value,
        viewport.viewportOffsetY.value,
        viewport.zoom.value,
        viewport.scale.value
      )
      
      // 开始拖拽绘制
      drawingStartX.value = canvasPos.x
      drawingStartY.value = canvasPos.y
      isDrawing.value = true
      
      // 根据工具类型创建预览元素
      if (props.activeTool === 'text') {
        previewElement.value = {
          id: 'preview-text',
          type: 'text',
          x: canvasPos.x,
          y: canvasPos.y,
          width: 0,
          height: 0,
          content: '双击编辑文本',
          fontFamily: 'Arial, sans-serif',
          fontSize: 24,
          color: '#333333',
          bold: false,
          italic: false,
          underline: false,
          strikethrough: false,
          textAlign: 'left',
          lineHeight: 1.5
        } as TextElement
      } else if (props.activeTool === 'image' && pendingImageData.value) {
        previewElement.value = {
          id: 'preview-image',
          type: 'image',
          x: canvasPos.x,
          y: canvasPos.y,
          width: 0,
          height: 0,
          src: pendingImageData.value.src,
          originalWidth: pendingImageData.value.originalWidth,
          originalHeight: pendingImageData.value.originalHeight,
          filter: 'none'
        } as ImageElement
      } else {
        // 图形工具
        previewElement.value = {
          id: 'preview-shape',
          type: props.activeTool as 'rectangle' | 'rounded-rectangle' | 'circle' | 'triangle',
          x: canvasPos.x,
          y: canvasPos.y,
          width: 0,
          height: 0,
          backgroundColor: '#4a90e2',
          borderWidth: 2,
          borderColor: '#357abd',
          ...(props.activeTool === 'rounded-rectangle' && { borderRadius: 8 })
        } as ShapeElement
      }
      
      e.preventDefault()
      return
    }
  }

  // 先尝试处理画布拖拽
  const handled = interaction.handleMouseDown(e)
  if (handled) {
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
    
    // 如果正在绘制，更新预览元素
    if (isDrawing.value && previewElement.value) {
      const deltaX = canvasPos.x - drawingStartX.value
      const deltaY = canvasPos.y - drawingStartY.value
      
      previewElement.value.x = Math.min(drawingStartX.value, canvasPos.x)
      previewElement.value.y = Math.min(drawingStartY.value, canvasPos.y)
      previewElement.value.width = Math.abs(deltaX)
      previewElement.value.height = Math.abs(deltaY)
      
      // 如果是圆形，保持宽高相等
      if (previewElement.value.type === 'circle') {
        const size = Math.max(Math.abs(deltaX), Math.abs(deltaY))
        previewElement.value.width = size
        previewElement.value.height = size
      }
      
      // 如果是图片，保持宽高比
      if (previewElement.value.type === 'image') {
        const imgElement = previewElement.value as ImageElement
        const aspectRatio = imgElement.originalWidth / imgElement.originalHeight
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          previewElement.value.width = Math.abs(deltaX)
          previewElement.value.height = Math.abs(deltaX) / aspectRatio
        } else {
          previewElement.value.height = Math.abs(deltaY)
          previewElement.value.width = Math.abs(deltaY) * aspectRatio
        }
      }
      
      // 最小尺寸限制
      if (previewElement.value.width < 10) {
        previewElement.value.width = 10
      }
      if (previewElement.value.height < 10) {
        previewElement.value.height = 10
      }
    }
  }

  // 如果正在绘制，不处理其他交互
  if (isDrawing.value) {
    e.preventDefault()
    return
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
const handleContainerMouseUp = (e?: MouseEvent) => {
  // 如果正在绘制，完成绘制
  if (isDrawing.value && previewElement.value) {
    const element = previewElement.value
    
    // 检查元素尺寸是否有效（只有在鼠标事件有效时才创建元素）
    if (e && element.width > 0 && element.height > 0) {
      // 创建新元素
      const newElement: CanvasElement = {
        ...element,
        id: generateId()
      } as CanvasElement
      
      elements.value.push(newElement)
      
      // 选中新创建的元素
      selection.selectedElementIds.value = [newElement.id]
      
      // 如果是图片，清除待插入的图片数据并取消工具选择
      if (element.type === 'image') {
        pendingImageData.value = null
        // 通过emit通知父组件取消图片工具选择
        // 这里暂时保留工具选择，用户可以继续绘制
      }
    }
    
    // 重置绘制状态
    isDrawing.value = false
    previewElement.value = null
    if (e) {
      e.preventDefault()
    }
    return
  }

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
  height: calc(100% - 64px);
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

.canvas-container.is-drawing {
  cursor: crosshair;
}

.canvas-container.is-drawing.can-drag {
  cursor: crosshair;
}

.canvas-container.tool-active {
  cursor: crosshair;
}

.canvas-container.tool-active.can-drag {
  cursor: crosshair;
}

.canvas-container.tool-text {
  cursor: text;
}

.canvas-container.tool-text.can-drag {
  cursor: text;
}

.canvas-container.tool-image {
  cursor: crosshair;
}

.canvas-container.tool-image.can-drag {
  cursor: crosshair;
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

/* 绘制预览样式 */
.element.preview {
  opacity: 0.7;
  pointer-events: none;
  z-index: 10000;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .canvas-container {
    height: calc(100% - 56px);
  }
  
  .canvas {
    background-size: 15px 15px;
  }
}

@media (max-width: 480px) {
  .canvas-container {
    height: calc(100% - 56px);
  }
  
  .canvas {
    background-size: 10px 10px;
  }
}
</style>
