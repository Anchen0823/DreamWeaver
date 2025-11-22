<template>
  <div 
    class="canvas-container"
    @mousedown="events.handleContainerMouseDown"
    @mousemove="events.handleContainerMouseMove"
    @mouseup="events.handleContainerMouseUp"
    @mouseleave="events.handleContainerMouseUp"
    @wheel="events.handleContainerWheel"
    :class="{ 
      'is-dragging': interaction.isDragging.value, 
      'can-drag': interaction.isSpacePressed.value,
      'is-drawing': drawing.isDrawing.value,
      'tool-active': !!props.activeTool && props.activeTool !== 'text' && props.activeTool !== 'image',
      'tool-text': props.activeTool === 'text',
      'tool-image': props.activeTool === 'image' && drawing.pendingImageData.value
    }"
    :style="viewport.gridBackgroundStyle.value"
    ref="containerRef"
  >
    <div 
      class="canvas" 
      :style="viewport.canvasStyle.value"
    >
      <!-- 画布元素 -->
      <CanvasElement
        v-for="element in elements"
        :key="element.id"
        :ref="(el: any) => { if (el && element.id === textEditing.editingTextElementId.value) { textEditing.textEditInputRef.value = el.textEditInputRef } }"
        :element="element"
        :scale="viewport.scale.value"
        :is-selected="selection.isElementSelected(element.id)"
        :is-editing="textEditing.editingTextElementId.value === element.id"
        @element-mouse-down="selection.handleElementMouseDown"
        @text-double-click="textEditing.handleTextDoubleClick"
        @text-edit-input="textEditing.handleTextEditInput"
        @text-edit-save="textEditing.handleTextEditSave"
        @text-edit-cancel="textEditing.handleTextEditCancel"
        @text-edit-blur="textEditing.handleTextEditBlur"
      />
      
      <!-- 选中框和框选框 -->
      <CanvasSelection
        :selection="selection"
        :resize="resize"
        :viewport="viewport"
        :elements="toRef(() => elements)"
        :editing-text-element-id="textEditing.editingTextElementId.value"
        :container-ref="containerRef"
      />
      
      <!-- 文本浮动工具栏 -->
      <TextToolbar
        v-if="textEditing.selectedTextElement.value"
        :text-element="textEditing.selectedTextElement.value"
        :visible="!!textEditing.selectedTextElement.value"
        :position="textToolbarPosition"
        :scale="viewport.scale.value"
        @update:font-family="handleTextPropertyUpdate('fontFamily', $event)"
        @update:font-size="handleTextPropertyUpdate('fontSize', $event)"
        @update:color="handleTextPropertyUpdate('color', $event)"
        @update:background-color="handleTextPropertyUpdate('backgroundColor', $event)"
        @update:bold="handleTextPropertyUpdate('bold', $event)"
        @update:italic="handleTextPropertyUpdate('italic', $event)"
        @update:underline="handleTextPropertyUpdate('underline', $event)"
        @update:strikethrough="handleTextPropertyUpdate('strikethrough', $event)"
        @update:text-align="handleTextPropertyUpdate('textAlign', $event)"
        @update:line-height="handleTextPropertyUpdate('lineHeight', $event)"
      />
      
      <!-- 绘制预览 -->
      <CanvasPreview
        :drawing="drawing"
        :viewport="viewport"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, toRef } from 'vue'
import type { TextElement, CanvasElement as CanvasElementType } from '../types/canvas'
import { useViewport } from '../composables/useViewport'
import { useCanvasInteraction } from '../composables/useCanvasInteraction'
import { useElementSelection } from '../composables/useElementSelection'
import { useClipboard } from '../composables/useClipboard'
import { usePersistence } from '../composables/usePersistence'
import { useTextEditing } from '../composables/useTextEditing'
import { useDrawing } from '../composables/useDrawing'
import { useElementCreation } from '../composables/useElementCreation'
import { useResize } from '../composables/useResize'
import { useCanvasEvents } from '../composables/useCanvasEvents'
import { mockElements } from '../utils/mock-data'
import TextToolbar from './TextToolbar.vue'
import CanvasElement from './CanvasElement.vue'
import CanvasSelection from './CanvasSelection.vue'
import CanvasPreview from './CanvasPreview.vue'

// Props
const props = defineProps<{
  activeTool?: string | null
}>()

// Emits
const emit = defineEmits<{
  'update:activeTool': [tool: string | null]
}>()

// 画布元素数据（初始为空，由持久化服务加载）
const elements = ref<CanvasElementType[]>([])

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

// 元素创建
const elementCreation = useElementCreation(elements, selection)

// 绘制管理
const drawing = useDrawing(
  viewport,
  elementCreation.generateId,
  elementCreation.calculateFontSizeFromBoxSize
)

// 文本编辑
const textEditing = useTextEditing(elements, selection)

// 调整大小
const resize = useResize(elements, viewport)

// 文本工具栏位置（使用画布坐标系，与选中框一致）
const textToolbarPosition = computed(() => {
  const selectedText = textEditing.selectedTextElement.value
  if (!selectedText) {
    return { x: 0, y: 0 }
  }
  
  const element = selectedText
  
  // 使用画布坐标系，与选中框的计算方式一致
  // 位置会通过 .canvas 的 transform 自动应用视口偏移和缩放
  // 工具栏显示在元素上方居中，偏移量需要考虑 zoom（因为 .canvas 有 scale(zoom)）
  const toolbarX = element.x * viewport.scale.value + (element.width * viewport.scale.value) / 2
  const toolbarY = element.y * viewport.scale.value - 70 / viewport.zoom.value // 元素上方 70px（屏幕像素），需要除以 zoom 转换为画布坐标
  
  return { x: toolbarX, y: toolbarY }
})

// 处理文本属性更新
const handleTextPropertyUpdate = (property: string, value: any) => {
  const selectedText = textEditing.selectedTextElement.value
  if (!selectedText) {
    return
  }
  
  const elementId = selectedText.id
  const elementIndex = elements.value.findIndex(el => el.id === elementId)
  if (elementIndex === -1) {
    return
  }
  
  const element = elements.value[elementIndex] as TextElement
  if (element.type !== 'text') {
    return
  }
  
  // 创建新数组以确保响应式更新
  const newElements = [...elements.value]
  const updatedElement = { ...newElements[elementIndex] } as TextElement
  
  // 更新属性
  ;(updatedElement as any)[property] = value
  
  // 替换元素
  newElements[elementIndex] = updatedElement
  elements.value = newElements
}

// 事件处理
const events = useCanvasEvents(
  containerRef,
  elements,
  computed(() => props.activeTool),
  viewport,
  interaction,
  selection,
  clipboard,
  drawing,
  textEditing,
  resize,
  (tool) => emit('update:activeTool', tool)
)

// 监听activeTool变化，取消绘制状态
watch(() => props.activeTool, (newTool) => {
  if (!newTool && drawing.isDrawing.value) {
    drawing.cancelDrawing()
  }
  // 如果切换到非图片工具，清除待插入的图片数据
  if (newTool !== 'image') {
    drawing.pendingImageData.value = null
  }
})

// 监听选中状态变化，当取消选中时检查并删除空的新创建文本元素
watch(() => selection.selectedElementIds.value, (newIds, oldIds) => {
  // 找出被取消选中的元素ID
  const deselectedIds = oldIds?.filter(id => !newIds.includes(id)) || []
  
  // 检查每个被取消选中的元素
  deselectedIds.forEach(elementId => {
    // 如果正在编辑该元素，先保存
    if (textEditing.editingTextElementId.value === elementId) {
      textEditing.handleTextEditSave(elementId)
    } else {
      // 否则直接检查并删除
      textEditing.checkAndDeleteEmptyNewText(elementId)
    }
  })
})

// 处理图片选择
const handleImageSelected = (src: string, width: number, height: number) => {
  drawing.pendingImageData.value = { src, originalWidth: width, originalHeight: height }
}

// 包装 addText 方法，标记新创建的文本元素并自动进入编辑模式
const addText = async () => {
  elementCreation.addText()
  // 获取最后添加的元素（应该是刚创建的文本元素）
  const lastElement = elements.value[elements.value.length - 1]
  if (lastElement && lastElement.type === 'text') {
    textEditing.markAsNewlyCreated(lastElement.id)
    // 自动进入编辑模式
    await textEditing.autoStartEditing(lastElement.id)
  }
}

// 暴露方法供父组件调用
defineExpose({
  addShape: elementCreation.addShape,
  addImage: elementCreation.addImage,
  addText,
  handleImageSelected,
  elements,
  selection
})

// 持久化服务
const persistence = usePersistence(elements, {
  zoom: viewport.zoom,
  viewportOffsetX: viewport.viewportOffsetX,
  viewportOffsetY: viewport.viewportOffsetY
})

// 监听窗口大小变化
onMounted(async () => {
  viewport.updateCanvasSize()
  window.addEventListener('resize', viewport.updateCanvasSize)
  window.addEventListener('keydown', events.handleKeyDown)
  window.addEventListener('keyup', events.handleKeyUp)
  // 阻止默认的滚轮缩放行为
  if (containerRef.value) {
    containerRef.value.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
      }
    }, { passive: false })
  }
  
  // 初始化持久化服务并加载数据
  await persistence.init()
  
  // 如果没有保存的数据，使用 mock 数据
  if (elements.value.length === 0) {
    elements.value = [...mockElements]
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', viewport.updateCanvasSize)
  window.removeEventListener('keydown', events.handleKeyDown)
  window.removeEventListener('keyup', events.handleKeyUp)
})
</script>

<style scoped>
.canvas-container {
  position: absolute;
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
