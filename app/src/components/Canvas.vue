<template>
  <div 
    class="canvas-container"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
    @wheel="handleWheel"
    :class="{ 'is-dragging': isDragging, 'can-drag': isSpacePressed }"
    :style="gridBackgroundStyle"
  >
    <div 
      class="canvas" 
      :style="canvasStyle"
    >
      <div
        v-for="element in elements"
        :key="element.id"
        :class="['element', element.type, { 'selected': isElementSelected(element.id) }]"
        :style="getElementStyle(element)"
        @mousedown.stop="handleElementMouseDown(element.id, $event)"
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
            :style="getTextStyle(element)"
            class="text-content"
            v-html="formatTextContent(element)"
          ></div>
        </template>
      </div>
      
      <!-- 选中框 -->
      <div
        v-for="elementId in selectedElementIds"
        :key="`selection-${elementId}`"
        class="selection-box"
        :style="getSelectionBoxStyle(elementId)"
      ></div>
      
      <!-- 框选框 -->
      <div
        v-if="isSelecting"
        class="selection-rect"
        :style="getSelectionRectStyle()"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type {
  CanvasElement,
  ShapeElement,
  ImageElement,
  TextElement
} from '../types/canvas'

// 响应式画布尺寸
const canvasWidth = computed(() => '100%')
const canvasHeight = computed(() => '100%')

// 画布的实际像素尺寸（用于计算元素位置）
const actualCanvasWidth = ref(1280)
const actualCanvasHeight = ref(720)

// 响应式缩放比例（基于窗口大小）
const scale = ref(1)

// 用户控制的缩放比例（通过滚轮缩放）
const zoom = ref(1)
const minZoom = 0.1
const maxZoom = 5

// 视口偏移量（用于无限画布）
const viewportOffsetX = ref(0)
const viewportOffsetY = ref(0)

// 拖拽状态
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragStartOffsetX = ref(0)
const dragStartOffsetY = ref(0)

// 空格键状态
const isSpacePressed = ref(false)

// 网格大小
const gridSize = ref(20)

// 选中的元素ID列表
const selectedElementIds = ref<string[]>([])

// 框选状态
const isSelecting = ref(false)
const selectionStartX = ref(0)
const selectionStartY = ref(0)
const selectionCurrentX = ref(0)
const selectionCurrentY = ref(0)
const isClick = ref(true) // 用于区分点击和拖动
const clickThreshold = 5 // 移动超过5px才算拖动
const isCtrlPressedDuringSelection = ref(false) // 记录框选开始时是否按住了 Ctrl/Cmd

// 画布样式（包含视口偏移和缩放）
const canvasStyle = computed(() => {
  return {
    width: '100%',
    height: '100%',
    transform: `translate(${viewportOffsetX.value}px, ${viewportOffsetY.value}px) scale(${zoom.value})`,
    transformOrigin: '0 0'
  }
})

// 网格背景位置（相对于视口固定，考虑缩放）
const gridBackgroundStyle = computed(() => {
  const scaledGridSize = gridSize.value * zoom.value
  const offsetX = viewportOffsetX.value % (scaledGridSize * 2)
  const offsetY = viewportOffsetY.value % (scaledGridSize * 2)
  return {
    backgroundPosition: `${offsetX}px ${offsetY}px`,
    backgroundSize: `${scaledGridSize}px ${scaledGridSize}px`
  }
})

// 更新画布尺寸
const updateCanvasSize = () => {
  const canvasElement = document.querySelector('.canvas-container') as HTMLElement
  if (canvasElement) {
    const rect = canvasElement.getBoundingClientRect()
    actualCanvasWidth.value = rect.width
    actualCanvasHeight.value = rect.height
    scale.value = actualCanvasWidth.value / 1280 // 基于设计稿宽度计算缩放比例
  }
}

// 处理鼠标按下事件
const handleMouseDown = (e: MouseEvent) => {
  // 如果点击的是元素，不触发画布拖拽或框选
  const target = e.target as HTMLElement
  if (target.closest('.element')) {
    return
  }
  
  // 左键处理
  if (e.button === 0) {
    // 如果按住空格键，则拖拽画布
    if (isSpacePressed.value) {
      isDragging.value = true
      dragStartX.value = e.clientX
      dragStartY.value = e.clientY
      dragStartOffsetX.value = viewportOffsetX.value
      dragStartOffsetY.value = viewportOffsetY.value
      e.preventDefault()
      return
    }
    
    // 否则开始框选
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    selectionStartX.value = e.clientX - rect.left
    selectionStartY.value = e.clientY - rect.top
    selectionCurrentX.value = selectionStartX.value
    selectionCurrentY.value = selectionStartY.value
    isSelecting.value = true
    isClick.value = true
    isCtrlPressedDuringSelection.value = e.ctrlKey || e.metaKey
    
    // 如果之前没有按住 Ctrl/Cmd，清空选中
    if (!isCtrlPressedDuringSelection.value) {
      selectedElementIds.value = []
    }
    
    e.preventDefault()
  }
  
  // 中键拖拽画布
  if (e.button === 1) {
    isDragging.value = true
    dragStartX.value = e.clientX
    dragStartY.value = e.clientY
    dragStartOffsetX.value = viewportOffsetX.value
    dragStartOffsetY.value = viewportOffsetY.value
    e.preventDefault()
  }
}

// 处理元素鼠标按下事件
const handleElementMouseDown = (elementId: string, e: MouseEvent) => {
  e.stopPropagation()
  
  // 左键点击：选中/取消选中元素
  if (e.button === 0) {
    if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd + 点击：多选/取消选中
      const index = selectedElementIds.value.indexOf(elementId)
      if (index > -1) {
        selectedElementIds.value.splice(index, 1)
      } else {
        selectedElementIds.value.push(elementId)
      }
    } else {
      // 普通点击：单选
      if (selectedElementIds.value.includes(elementId)) {
        // 如果已选中，不取消选中（保持选中状态）
        return
      } else {
        selectedElementIds.value = [elementId]
      }
    }
  }
}

// 检查元素是否被选中
const isElementSelected = (elementId: string): boolean => {
  return selectedElementIds.value.includes(elementId)
}

// 获取选中框样式
const getSelectionBoxStyle = (elementId: string): Record<string, string | number> => {
  const element = elements.value.find(el => el.id === elementId)
  if (!element) {
    return {}
  }
  
  const padding = 4 // 选中框与元素的间距
  const scaledPadding = padding * scale.value
  
  return {
    position: 'absolute',
    left: (element.x * scale.value - scaledPadding) + 'px',
    top: (element.y * scale.value - scaledPadding) + 'px',
    width: (element.width * scale.value + scaledPadding * 2) + 'px',
    height: (element.height * scale.value + scaledPadding * 2) + 'px',
    boxSizing: 'border-box',
    pointerEvents: 'none',
    zIndex: 1000
  }
}

// 获取框选框样式
const getSelectionRectStyle = (): Record<string, string | number> => {
  const startX = Math.min(selectionStartX.value, selectionCurrentX.value)
  const startY = Math.min(selectionStartY.value, selectionCurrentY.value)
  const width = Math.abs(selectionCurrentX.value - selectionStartX.value)
  const height = Math.abs(selectionCurrentY.value - selectionStartY.value)
  
  // 需要考虑视口偏移和缩放
  const adjustedX = (startX - viewportOffsetX.value) / zoom.value
  const adjustedY = (startY - viewportOffsetY.value) / zoom.value
  const adjustedWidth = width / zoom.value
  const adjustedHeight = height / zoom.value
  
  return {
    position: 'absolute',
    left: adjustedX + 'px',
    top: adjustedY + 'px',
    width: adjustedWidth + 'px',
    height: adjustedHeight + 'px',
    boxSizing: 'border-box',
    pointerEvents: 'none',
    zIndex: 999
  }
}

// 根据框选框更新选中元素
const updateSelectionFromRect = () => {
  if (!isSelecting.value) {
    return
  }
  
  // 计算框选框的边界（考虑视口偏移和缩放）
  const rectLeft = Math.min(selectionStartX.value, selectionCurrentX.value)
  const rectTop = Math.min(selectionStartY.value, selectionCurrentY.value)
  const rectRight = Math.max(selectionStartX.value, selectionCurrentX.value)
  const rectBottom = Math.max(selectionStartY.value, selectionCurrentY.value)
  
  // 转换为画布坐标（考虑视口偏移和缩放）
  const canvasRectLeft = (rectLeft - viewportOffsetX.value) / zoom.value / scale.value
  const canvasRectTop = (rectTop - viewportOffsetY.value) / zoom.value / scale.value
  const canvasRectRight = (rectRight - viewportOffsetX.value) / zoom.value / scale.value
  const canvasRectBottom = (rectBottom - viewportOffsetY.value) / zoom.value / scale.value
  
  const newSelectedIds: string[] = []
  
  // 检查每个元素是否在框选范围内
  elements.value.forEach(element => {
    const elementLeft = element.x
    const elementTop = element.y
    const elementRight = element.x + element.width
    const elementBottom = element.y + element.height
    
    // 检查元素是否与框选框相交
    const isIntersecting = !(
      elementRight < canvasRectLeft ||
      elementLeft > canvasRectRight ||
      elementBottom < canvasRectTop ||
      elementTop > canvasRectBottom
    )
    
    if (isIntersecting) {
      newSelectedIds.push(element.id)
    }
  })
  
  // 如果按住 Ctrl/Cmd，则添加到现有选中列表，否则替换
  if (isCtrlPressedDuringSelection.value) {
    // 合并选中列表，去重
    const combined = [...new Set([...selectedElementIds.value, ...newSelectedIds])]
    selectedElementIds.value = combined
  } else {
    selectedElementIds.value = newSelectedIds
  }
}

// 处理鼠标移动事件
const handleMouseMove = (e: MouseEvent) => {
  // 画布拖拽
  if (isDragging.value) {
    const deltaX = e.clientX - dragStartX.value
    const deltaY = e.clientY - dragStartY.value
    viewportOffsetX.value = dragStartOffsetX.value + deltaX
    viewportOffsetY.value = dragStartOffsetY.value + deltaY
    e.preventDefault()
    return
  }
  
  // 框选
  if (isSelecting.value) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    selectionCurrentX.value = e.clientX - rect.left
    selectionCurrentY.value = e.clientY - rect.top
    
    // 检测是否移动超过阈值，如果是则认为是拖动而不是点击
    const deltaX = Math.abs(selectionCurrentX.value - selectionStartX.value)
    const deltaY = Math.abs(selectionCurrentY.value - selectionStartY.value)
    if (deltaX > clickThreshold || deltaY > clickThreshold) {
      isClick.value = false
    }
    
    // 实时更新选中元素
    updateSelectionFromRect()
    
    e.preventDefault()
  }
}

// 处理鼠标释放事件
const handleMouseUp = (e: MouseEvent) => {
  // 结束画布拖拽
  if (isDragging.value) {
    isDragging.value = false
  }
  
  // 结束框选
  if (isSelecting.value) {
    // 如果是点击（不是拖动），则清空选中（已在 handleMouseDown 中处理）
    if (isClick.value) {
      // 点击空白处，已清空选中，无需额外处理
    } else {
      // 拖动结束，更新选中元素
      updateSelectionFromRect()
    }
    
    isSelecting.value = false
    isClick.value = true
  }
}

// 处理滚轮事件
const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  
  // Ctrl/Cmd + 滚轮：缩放
  if (e.ctrlKey || e.metaKey) {
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom.value + delta))
    
    // 以鼠标位置为中心进行缩放
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    // 计算缩放前后的坐标转换
    const scaleFactor = newZoom / zoom.value
    const newOffsetX = mouseX - (mouseX - viewportOffsetX.value) * scaleFactor
    const newOffsetY = mouseY - (mouseY - viewportOffsetY.value) * scaleFactor
    
    zoom.value = newZoom
    viewportOffsetX.value = newOffsetX
    viewportOffsetY.value = newOffsetY
  } 
  // Shift + 滚轮：水平滚动
  else if (e.shiftKey) {
    viewportOffsetX.value -= e.deltaY
  }
  // 普通滚轮：垂直滚动
  else {
    viewportOffsetY.value -= e.deltaY
  }
}

// 处理键盘按下事件
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Space' || e.key === ' ') {
    isSpacePressed.value = true
    e.preventDefault() // 防止页面滚动
  }
}

// 处理键盘释放事件
const handleKeyUp = (e: KeyboardEvent) => {
  if (e.code === 'Space' || e.key === ' ') {
    isSpacePressed.value = false
    // 如果正在拖拽，停止拖拽
    if (isDragging.value) {
      isDragging.value = false
    }
  }
}

// 监听窗口大小变化
onMounted(() => {
  updateCanvasSize()
  window.addEventListener('resize', updateCanvasSize)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  // 阻止默认的滚轮缩放行为
  const container = document.querySelector('.canvas-container') as HTMLElement
  if (container) {
    container.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
      }
    }, { passive: false })
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateCanvasSize)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})

const elements = ref<CanvasElement[]>([
  {
    id: 'rect1',
    type: 'rectangle',
    x: 50,
    y: 50,
    width: 100,
    height: 80,
    backgroundColor: '#ff6b6b',
    borderWidth: 2,
    borderColor: '#ff4757'
  },
  {
    id: 'rounded-rect1',
    type: 'rounded-rectangle',
    x: 200,
    y: 50,
    width: 120,
    height: 80,
    backgroundColor: '#4ecdc4',
    borderWidth: 3,
    borderColor: '#26d0ce',
    borderRadius: 10
  },
  {
    id: 'circle1',
    type: 'circle',
    x: 400,
    y: 50,
    width: 80,
    height: 80,
    backgroundColor: '#45b7d1',
    borderWidth: 2,
    borderColor: '#3a9fbf'
  },
  {
    id: 'triangle1',
    type: 'triangle',
    x: 550,
    y: 50,
    width: 100,
    height: 80,
    backgroundColor: '#96ceb4',
    borderWidth: 2,
    borderColor: '#88c5a8'
  },
  {
    id: 'image1',
    type: 'image',
    x: 50,
    y: 200,
    width: 150,
    height: 100,
    src: '/test1.jpg',
    originalWidth: 150,
    originalHeight: 100,
    filter: 'none'
  },
  {
    id: 'image2',
    type: 'image',
    x: 220,
    y: 200,
    width: 150,
    height: 100,
    src: '/test1.jpg',
    originalWidth: 150,
    originalHeight: 100,
    filter: 'grayscale',
    filterIntensity: 100
  },
  {
    id: 'image3',
    type: 'image',
    x: 390,
    y: 200,
    width: 150,
    height: 100,
    src: '/test1.jpg',
    originalWidth: 150,
    originalHeight: 100,
    filter: 'blur',
    filterIntensity: 3
  },
  {
    id: 'image4',
    type: 'image',
    x: 560,
    y: 200,
    width: 150,
    height: 100,
    src: '/test1.jpg',
    originalWidth: 150,
    originalHeight: 100,
    filter: 'contrast',
    filterIntensity: 150
  },
  {
    id: 'text1',
    type: 'text',
    x: 50,
    y: 320,
    width: 200,
    height: 50,
    content: 'Bold Text',
    fontFamily: 'Arial, sans-serif',
    fontSize: 24,
    color: '#333333',
    bold: true,
    italic: false,
    underline: false,
    strikethrough: false,
    textAlign: 'left',
    lineHeight: 1.5
  },
  {
    id: 'text2',
    type: 'text',
    x: 270,
    y: 320,
    width: 200,
    height: 50,
    content: 'Italic Text',
    fontFamily: 'Arial, sans-serif',
    fontSize: 24,
    color: '#333333',
    bold: false,
    italic: true,
    underline: false,
    strikethrough: false,
    textAlign: 'left',
    lineHeight: 1.5
  },
  {
    id: 'text3',
    type: 'text',
    x: 490,
    y: 320,
    width: 200,
    height: 50,
    content: 'Underline Text',
    fontFamily: 'Arial, sans-serif',
    fontSize: 24,
    color: '#333333',
    bold: false,
    italic: false,
    underline: true,
    strikethrough: false,
    textAlign: 'left',
    lineHeight: 1.5
  },
  {
    id: 'text4',
    type: 'text',
    x: 50,
    y: 390,
    width: 200,
    height: 50,
    content: 'Strikethrough Text',
    fontFamily: 'Arial, sans-serif',
    fontSize: 24,
    color: '#333333',
    bold: false,
    italic: false,
    underline: false,
    strikethrough: true,
    textAlign: 'left',
    lineHeight: 1.5
  },
  {
    id: 'text5',
    type: 'text',
    x: 270,
    y: 390,
    width: 200,
    height: 50,
    content: 'Bold & Italic',
    fontFamily: 'Arial, sans-serif',
    fontSize: 24,
    color: '#333333',
    bold: true,
    italic: true,
    underline: false,
    strikethrough: false,
    textAlign: 'left',
    lineHeight: 1.5
  },
  {
    id: 'text6',
    type: 'text',
    x: 490,
    y: 390,
    width: 200,
    height: 50,
    content: 'All Styles',
    fontFamily: 'Arial, sans-serif',
    fontSize: 24,
    color: '#333333',
    bold: true,
    italic: true,
    underline: true,
    strikethrough: true,
    textAlign: 'left',
    lineHeight: 1.5
  },
  {
    id: 'text7',
    type: 'text',
    x: 50,
    y: 460,
    width: 200,
    height: 50,
    content: 'Large Font Size',
    fontFamily: 'Arial, sans-serif',
    fontSize: 32,
    color: '#ff6b6b',
    bold: true,
    italic: false,
    underline: false,
    strikethrough: false,
    textAlign: 'left',
    lineHeight: 1.5
  },
  {
    id: 'text8',
    type: 'text',
    x: 270,
    y: 460,
    width: 200,
    height: 50,
    content: 'Center Aligned',
    fontFamily: 'Arial, sans-serif',
    fontSize: 24,
    color: '#4ecdc4',
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    textAlign: 'center',
    lineHeight: 1.5
  },
  {
    id: 'text9',
    type: 'text',
    x: 490,
    y: 460,
    width: 200,
    height: 50,
    content: 'Right Aligned',
    fontFamily: 'Arial, sans-serif',
    fontSize: 24,
    color: '#45b7d1',
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    textAlign: 'right',
    lineHeight: 1.5
  }
])

// 获取元素的基础样式（位置、尺寸）
// 注意：缩放已经在画布级别应用，这里只需要响应式缩放
const getBaseStyle = (element: CanvasElement): Record<string, string | number> => {
  return {
    position: 'absolute',
    left: (element.x * scale.value) + 'px',
    top: (element.y * scale.value) + 'px',
    width: (element.width * scale.value) + 'px',
    height: (element.height * scale.value) + 'px',
    boxSizing: 'border-box'
  }
}

// 获取图形元素的样式
const getShapeStyle = (element: ShapeElement): Record<string, string | number> => {
  const baseStyle = {
    ...getBaseStyle(element),
    backgroundColor: element.backgroundColor,
    borderWidth: element.borderWidth + 'px',
    borderStyle: 'solid',
    borderColor: element.borderColor
  }

  if (element.type === 'rounded-rectangle') {
    return {
      ...baseStyle,
      borderRadius: ((element.borderRadius || 0) * scale.value) + 'px'
    }
  }

  if (element.type === 'circle') {
    return {
      ...baseStyle,
      borderRadius: '50%'
    }
  }

  if (element.type === 'triangle') {
    const scaledWidth = element.width * scale.value
    const scaledHeight = element.height * scale.value
    return {
      ...getBaseStyle(element),
      width: '0',
      height: '0',
      backgroundColor: 'transparent',
      border: 'none',
      borderLeft: `${scaledWidth / 2}px solid transparent`,
      borderRight: `${scaledWidth / 2}px solid transparent`,
      borderBottom: `${scaledHeight}px solid ${element.backgroundColor}`,
      borderTopWidth: '0'
    }
  }

  return baseStyle
}

// 获取图片元素的样式
const getImageStyle = (element: ImageElement): Record<string, string | number> => {
  const style: Record<string, string | number> = {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  }

  // 应用滤镜
  if (element.filter && element.filter !== 'none') {
    switch (element.filter) {
      case 'grayscale':
        style.filter = `grayscale(${element.filterIntensity || 100}%)`
        break
      case 'blur':
        style.filter = `blur(${element.filterIntensity || 5}px)`
        break
      case 'contrast':
        style.filter = `contrast(${element.filterIntensity || 150}%)`
        break
    }
  }

  return style
}

// 获取文本元素的样式
const getTextStyle = (element: TextElement): Record<string, string | number> => {
  return {
    fontFamily: element.fontFamily,
    fontSize: (element.fontSize * scale.value) + 'px',
    color: element.color,
    backgroundColor: element.backgroundColor || 'transparent',
    fontWeight: element.bold ? 'bold' : 'normal',
    fontStyle: element.italic ? 'italic' : 'normal',
    textDecoration: [
      element.underline ? 'underline' : '',
      element.strikethrough ? 'line-through' : ''
    ].filter(Boolean).join(' ') || 'none',
    textAlign: element.textAlign || 'left',
    lineHeight: element.lineHeight || 1.5,
    padding: (4 * scale.value) + 'px',
    boxSizing: 'border-box',
    wordWrap: 'break-word',
    width: '100%',
    minHeight: '100%',
    height: 'auto'  // 自动高度以适应内容
  }
}

// 格式化文本内容（处理换行等）
const formatTextContent = (element: TextElement): string => {
  return element.content
    .replace(/&/g, '&amp;')  // 先转义 &，因为其他转义序列都包含 &
    .replace(/</g, '&lt;')    // 转义 <
    .replace(/>/g, '&gt;')    // 转义 >
    .replace(/\n/g, '<br>')   // 最后将换行符转换为 <br> 标签
}

// 获取文本元素容器的样式（允许高度自动适应）
const getTextElementStyle = (element: TextElement): Record<string, string | number> => {
  const baseStyle = getBaseStyle(element)
  // 文本元素使用 min-height 而不是固定 height，允许自动扩展
  return {
    ...baseStyle,
    height: 'auto',
    minHeight: (element.height * scale.value) + 'px'
  }
}

// 统一获取元素样式的方法
const getElementStyle = (element: CanvasElement): Record<string, string | number> => {
  if (element.type === 'rectangle' || 
      element.type === 'rounded-rectangle' || 
      element.type === 'circle' || 
      element.type === 'triangle') {
    return getShapeStyle(element as ShapeElement)
  }
  
  if (element.type === 'image') {
    return getBaseStyle(element)
  }
  
  if (element.type === 'text') {
    return getTextElementStyle(element as TextElement)
  }
  
  return getBaseStyle(element)
}
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
