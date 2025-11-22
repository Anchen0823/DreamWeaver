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
            v-if="editingTextElementId !== element.id"
            :style="getTextStyle(element, viewport.scale.value)"
            class="text-content"
            v-html="formatTextContent(element as TextElement)"
            @dblclick.stop="handleTextDoubleClick(element.id, $event)"
          ></div>
          <!-- 文本编辑输入框 -->
          <textarea
            v-else
            ref="textEditInputRef"
            :value="(element as TextElement).content"
            @blur="handleTextEditBlur(element.id)"
            @keydown.esc="handleTextEditCancel"
            @keydown.ctrl.enter.exact.prevent="handleTextEditSave(element.id)"
            @keydown.meta.enter.exact.prevent="handleTextEditSave(element.id)"
            @input="handleTextEditInput(element.id, ($event.target as HTMLTextAreaElement).value)"
            @mousedown.stop
            @click.stop
            :style="getTextEditStyle(element as TextElement, viewport.scale.value)"
            class="text-edit-input"
          ></textarea>
        </template>
      </div>
      
      <!-- 选中框 -->
      <template
        v-for="elementId in selection.selectedElementIds.value"
        :key="`selection-${elementId}`"
      >
        <div
          v-if="editingTextElementId !== elementId"
          class="selection-box"
          :style="selection.getSelectionBoxStyle(elementId)"
        ></div>
      </template>
      
      <!-- 框选框 -->
      <div
        v-if="selection.isSelecting.value"
        class="selection-rect"
        :style="selection.getSelectionRectStyle()"
      ></div>
      
      <!-- 文本浮动工具栏 -->
      <TextToolbar
        v-if="showTextToolbar && selectedTextElement"
        :text-element="selectedTextElement"
        :visible="showTextToolbar"
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
      <template v-if="isDrawing && previewElement">
        <div
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
          
          <!-- 文本预览：绘制时不显示文本内容，只显示空框 -->
          <template v-else-if="previewElement.type === 'text'">
            <!-- 预览时不显示文本内容 -->
          </template>
        </div>
        
        <!-- 预览选中框轮廓 -->
        <div
          v-if="previewElement.width > 0 && previewElement.height > 0"
          class="preview-selection-box"
          :style="getPreviewSelectionBoxStyle()"
        ></div>
        
        <!-- 尺寸标签 -->
        <div
          v-if="previewElement.width > 0 && previewElement.height > 0"
          class="size-label"
          :style="sizeLabelStyle"
        >
          {{ formatSize(previewElement) }}
        </div>
      </template>
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
import { usePersistence } from '../composables/usePersistence'
import { getElementStyle, getImageStyle, getTextStyle, formatTextContent } from '../utils/style-calculator'
import { screenToCanvas } from '../utils/coordinate-utils'
import { mockElements } from '../utils/mock-data'
import TextToolbar from './TextToolbar.vue'

// Props
const props = defineProps<{
  activeTool?: string | null
}>()

// Emits
const emit = defineEmits<{
  'update:activeTool': [tool: string | null]
}>()

// 画布元素数据（初始为空，由持久化服务加载）
const elements = ref<CanvasElement[]>([])

// 绘制状态
const isDrawing = ref(false)
const drawingStartX = ref(0)
const drawingStartY = ref(0)
const previewElement = ref<CanvasElement | null>(null)
// 待插入的图片数据
const pendingImageData = ref<{ src: string; originalWidth: number; originalHeight: number } | null>(null)

// 文本编辑状态
const editingTextElementId = ref<string | null>(null)
const textEditInputRef = ref<HTMLTextAreaElement>()
const editingTextContent = ref<string>('')

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
    fontSize: calculateFontSizeFromBoxSize(defaultWidth, defaultHeight),
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

// 根据文本框大小计算合适的字体大小
const calculateFontSizeFromBoxSize = (width: number, height: number): number => {
  if (width <= 0 || height <= 0) {
    return 24 // 默认字体大小
  }
  
  // 使用较小的边来计算字体大小，确保文本能够适应文本框
  // 字体大小 = 较小边 / 比例系数
  // 比例系数可以根据需要调整，这里使用 8，意味着如果文本框高度是80px，字体大小约为10px
  const minSize = Math.min(width, height)
  const fontSize = Math.max(12, Math.min(48, minSize / 8)) // 限制在12-48px之间
  
  return Math.round(fontSize)
}

// 格式化尺寸显示
const formatSize = (element: CanvasElement | null) => {
  if (!element) return ''
  const width = Math.round(element.width)
  const height = Math.round(element.height)
  return `${width}px × ${height}px`
}

// 计算尺寸标签的样式（使用computed确保响应式更新）
// 使用画布坐标系，与文本工具栏一致，位置会通过 .canvas 的 transform 自动应用视口偏移和缩放
const sizeLabelStyle = computed(() => {
  if (!isDrawing.value || !previewElement.value) {
    return { display: 'none' }
  }
  
  const element = previewElement.value
  
  // 使用画布坐标系，与选中框和工具栏的计算方式一致
  // 位置会通过 .canvas 的 transform 自动应用视口偏移和缩放
  // 标签显示在元素右上角，稍微上浮
  const labelX = element.x * viewport.scale.value + element.width * viewport.scale.value
  const labelY = element.y * viewport.scale.value - 8 / viewport.zoom.value // 上浮 8px（屏幕像素），需要除以 zoom 转换为画布坐标
  
  return {
    left: `${labelX}px`,
    top: `${labelY}px`,
    transform: 'translateX(-100%) translateY(-100%)',
    marginRight: '4px'
  }
})

// 获取尺寸标签的样式（用于模板）
const getSizeLabelStyle = (element: CanvasElement | null) => {
  return sizeLabelStyle.value
}

// 获取预览选中框的样式
const getPreviewSelectionBoxStyle = (): Record<string, string | number> => {
  if (!previewElement.value) {
    return { display: 'none' }
  }
  
  const element = previewElement.value
  const padding = 4 // 选中框与元素的间距
  const scaledPadding = padding * viewport.scale.value
  
  return {
    position: 'absolute',
    left: (element.x * viewport.scale.value - scaledPadding) + 'px',
    top: (element.y * viewport.scale.value - scaledPadding) + 'px',
    width: (element.width * viewport.scale.value + scaledPadding * 2) + 'px',
    height: (element.height * viewport.scale.value + scaledPadding * 2) + 'px',
    boxSizing: 'border-box',
    pointerEvents: 'none',
    zIndex: 10001
  }
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

// 持久化服务
const persistence = usePersistence(elements, {
  zoom: viewport.zoom,
  viewportOffsetX: viewport.viewportOffsetX,
  viewportOffsetY: viewport.viewportOffsetY
})

// 文本工具栏相关
// 选中的文本元素（单选且为文本类型时）
const selectedTextElement = computed<TextElement | null>(() => {
  if (selection.selectedElementIds.value.length !== 1) {
    return null
  }
  const elementId = selection.selectedElementIds.value[0]
  const element = elements.value.find(el => el.id === elementId)
  return element && element.type === 'text' ? (element as TextElement) : null
})

// 是否显示文本工具栏（单选文本元素时）
const showTextToolbar = computed(() => {
  return selectedTextElement.value !== null
})

// 文本工具栏位置（使用画布坐标系，与选中框一致）
const textToolbarPosition = computed(() => {
  if (!selectedTextElement.value) {
    return { x: 0, y: 0 }
  }
  
  const element = selectedTextElement.value
  
  // 使用画布坐标系，与选中框的计算方式一致
  // 位置会通过 .canvas 的 transform 自动应用视口偏移和缩放
  // 工具栏显示在元素上方居中，偏移量需要考虑 zoom（因为 .canvas 有 scale(zoom)）
  const toolbarX = element.x * viewport.scale.value + (element.width * viewport.scale.value) / 2
  const toolbarY = element.y * viewport.scale.value - 70 / viewport.zoom.value // 元素上方 70px（屏幕像素），需要除以 zoom 转换为画布坐标
  
  return { x: toolbarX, y: toolbarY }
})

// 处理文本属性更新
const handleTextPropertyUpdate = (property: string, value: any) => {
  if (!selectedTextElement.value) {
    return
  }
  
  const elementId = selectedTextElement.value.id
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

// 处理文本双击事件
const handleTextDoubleClick = (elementId: string, e: MouseEvent) => {
  e.stopPropagation()
  
  const element = elements.value.find(el => el.id === elementId) as TextElement
  if (!element || element.type !== 'text') {
    return
  }
  
  // 进入编辑模式
  editingTextElementId.value = elementId
  editingTextContent.value = element.content
  
  // 选中文本元素（如果未选中）
  if (!selection.isElementSelected(elementId)) {
    selection.selectedElementIds.value = [elementId]
  }
  
  // 下一帧聚焦输入框
  setTimeout(() => {
    if (textEditInputRef.value) {
      textEditInputRef.value.focus()
      textEditInputRef.value.select()
    }
  }, 0)
}

// 获取文本编辑输入框样式
const getTextEditStyle = (element: TextElement, scale: number): Record<string, string | number> => {
  const textStyle = getTextStyle(element, scale)
  return {
    ...textStyle,
    position: 'absolute',
    left: '0',
    top: '0',
    width: '100%',
    height: '100%',
    resize: 'none',
    border: '2px solid #4a90e2',
    outline: 'none',
    padding: textStyle.padding || `${4 * scale}px`,
    margin: '0',
    boxSizing: 'border-box',
    overflow: 'hidden',
    borderRadius: '2px',
    background: element.backgroundColor || 'transparent',
    zIndex: 10001
  }
}

// 处理文本编辑输入
const handleTextEditInput = (elementId: string, value: string) => {
  editingTextContent.value = value
}

// 处理文本编辑保存
const handleTextEditSave = (elementId: string) => {
  const elementIndex = elements.value.findIndex(el => el.id === elementId)
  if (elementIndex === -1) {
    editingTextElementId.value = null
    return
  }
  
  const element = elements.value[elementIndex] as TextElement
  if (element.type !== 'text') {
    editingTextElementId.value = null
    return
  }
  
  // 更新文本内容
  const newElements = [...elements.value]
  const updatedElement = { ...newElements[elementIndex] } as TextElement
  updatedElement.content = editingTextContent.value
  
  newElements[elementIndex] = updatedElement
  elements.value = newElements
  
  // 退出编辑模式
  editingTextElementId.value = null
  editingTextContent.value = ''
}

// 处理文本编辑取消
const handleTextEditCancel = () => {
  editingTextElementId.value = null
  editingTextContent.value = ''
}

// 处理文本编辑失去焦点
const handleTextEditBlur = (elementId: string) => {
  // 延迟处理，以便点击其他元素时能正常处理
  setTimeout(() => {
    if (editingTextElementId.value === elementId) {
      handleTextEditSave(elementId)
    }
  }, 200)
}

// 处理容器鼠标按下事件
const handleContainerMouseDown = (e: MouseEvent) => {
  // 如果正在编辑文本，不处理其他鼠标事件
  if (editingTextElementId.value !== null) {
    const target = e.target as HTMLElement
    // 如果点击的是文本编辑输入框，不处理
    if (target.closest('.text-edit-input')) {
      return
    }
    // 否则保存并退出编辑模式
    if (editingTextElementId.value) {
      handleTextEditSave(editingTextElementId.value)
    }
    return
  }
  
  // 如果点击的是元素，不触发绘制或框选
  const target = e.target as HTMLElement
  if (target.closest('.element') && !target.closest('.preview')) {
    return
  }

  // 如果点击的是文本工具栏，不触发框选
  if (target.closest('.text-toolbar')) {
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
          fontSize: 24, // 初始字体大小，会在绘制过程中动态更新
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
      
      // 如果是文本，根据文本框大小动态调整字体大小
      if (previewElement.value.type === 'text') {
        const textElement = previewElement.value as TextElement
        textElement.fontSize = calculateFontSizeFromBoxSize(
          previewElement.value.width,
          previewElement.value.height
        )
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
      
      // 如果是图片，清除待插入的图片数据
      if (element.type === 'image') {
        pendingImageData.value = null
      }
      
      // 绘制完成后，自动切换回move状态（取消工具选择）
      emit('update:activeTool', null)
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
  // 如果正在编辑文本，不处理其他键盘事件
  if (editingTextElementId.value !== null) {
    // 只处理 Esc 键（已在 textarea 上处理）
    return
  }
  
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

  // Delete/Backspace: 删除选中元素
  if (e.key === 'Delete' || e.key === 'Backspace') {
    // 如果正在编辑文本（焦点在输入框内），不处理删除
    const activeElement = document.activeElement
    if (activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' || 
      (activeElement instanceof HTMLElement && activeElement.isContentEditable)
    )) {
      return
    }

    if (selection.selectedElementIds.value.length > 0) {
      // 从元素数组中移除选中的元素
      const selectedIds = selection.selectedElementIds.value
      elements.value = elements.value.filter(element => !selectedIds.includes(element.id))
      
      // 清空选中状态
      selection.selectedElementIds.value = []
      
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
onMounted(async () => {
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
  
  // 初始化持久化服务并加载数据
  await persistence.init()
  
  // 如果没有保存的数据，使用 mock 数据
  if (elements.value.length === 0) {
    elements.value = [...mockElements]
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

.text-edit-input {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  line-height: inherit;
  text-align: inherit;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
  cursor: text;
  border: none;
  outline: none;
  background: transparent;
  resize: none;
}

.text-edit-input:focus {
  outline: none;
  box-shadow: none;
}

/* 绘制预览样式 */
.element.preview {
  opacity: 0.7;
  pointer-events: none;
  z-index: 10000;
}

/* 预览选中框样式 */
.preview-selection-box {
  border: 2px solid #4a90e2;
  border-radius: 2px;
  background-color: transparent;
  box-shadow: 0 0 0 1px rgba(74, 144, 226, 0.2);
  pointer-events: none;
}

/* 尺寸标签样式 */
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
  z-index: 10001;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
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
