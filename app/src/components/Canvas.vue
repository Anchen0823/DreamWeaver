<template>
  <div 
    class="canvas-container"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
    :class="{ 'is-dragging': isDragging }"
    :style="gridBackgroundStyle"
  >
    <div 
      class="canvas" 
      :style="canvasStyle"
    >
      <div
        v-for="element in elements"
        :key="element.id"
        :class="['element', element.type]"
        :style="getElementStyle(element)"
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

// 缩放比例
const scale = ref(1)

// 视口偏移量（用于无限画布）
const viewportOffsetX = ref(0)
const viewportOffsetY = ref(0)

// 拖拽状态
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragStartOffsetX = ref(0)
const dragStartOffsetY = ref(0)

// 网格大小
const gridSize = ref(20)

// 画布样式（包含视口偏移）
const canvasStyle = computed(() => {
  return {
    width: '100%',
    height: '100%',
    transform: `translate(${viewportOffsetX.value}px, ${viewportOffsetY.value}px)`
  }
})

// 网格背景位置（相对于视口固定）
const gridBackgroundStyle = computed(() => {
  const offsetX = viewportOffsetX.value % (gridSize.value * 2)
  const offsetY = viewportOffsetY.value % (gridSize.value * 2)
  return {
    backgroundPosition: `${offsetX}px ${offsetY}px`
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
  // 如果点击的是元素，不触发画布拖拽
  const target = e.target as HTMLElement
  if (target.closest('.element')) {
    return
  }
  
  // 只有按住空格键或中键时才拖拽，或者默认允许拖拽
  if (e.button === 1 || e.ctrlKey || e.metaKey || true) { // 默认允许拖拽
    isDragging.value = true
    dragStartX.value = e.clientX
    dragStartY.value = e.clientY
    dragStartOffsetX.value = viewportOffsetX.value
    dragStartOffsetY.value = viewportOffsetY.value
    e.preventDefault()
  }
}

// 处理鼠标移动事件
const handleMouseMove = (e: MouseEvent) => {
  if (isDragging.value) {
    const deltaX = e.clientX - dragStartX.value
    const deltaY = e.clientY - dragStartY.value
    viewportOffsetX.value = dragStartOffsetX.value + deltaX
    viewportOffsetY.value = dragStartOffsetY.value + deltaY
    e.preventDefault()
  }
}

// 处理鼠标释放事件
const handleMouseUp = () => {
  isDragging.value = false
}

// 监听窗口大小变化
onMounted(() => {
  updateCanvasSize()
  window.addEventListener('resize', updateCanvasSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateCanvasSize)
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
    minHeight: element.height + 'px'
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
  cursor: grab;
  background-color: #ffffff;
  background-image: 
    linear-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.08) 1px, transparent 1px);
  background-size: 20px 20px;
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
