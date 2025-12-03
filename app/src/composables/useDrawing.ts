import { ref, computed, watch } from 'vue'
import type { CanvasElement, ShapeElement, ImageElement, TextElement } from '../types/canvas'
import type { useViewport } from './useViewport'
import { screenToCanvas } from '../utils/coordinate-utils'

/**
 * 绘制管理 Composable
 * 处理绘制预览、尺寸标签等逻辑
 */
export function useDrawing(
  viewport: ReturnType<typeof useViewport>,
  generateId: () => string,
  calculateFontSizeFromBoxSize: (width: number, height: number) => number
) {
  // 绘制状态
  const isDrawing = ref(false)
  const drawingStartX = ref(0)
  const drawingStartY = ref(0)
  const previewElement = ref<CanvasElement | null>(null)
  // 待插入的图片数据
  const pendingImageData = ref<{ src: string; originalWidth: number; originalHeight: number } | null>(null)

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

  // 开始绘制
  const startDrawing = (
    tool: string,
    canvasPos: { x: number; y: number },
    pendingImage?: { src: string; originalWidth: number; originalHeight: number } | null
  ) => {
    drawingStartX.value = canvasPos.x
    drawingStartY.value = canvasPos.y
    isDrawing.value = true
    
    // 根据工具类型创建预览元素
    if (tool === 'text') {
      previewElement.value = {
        id: 'preview-text',
        type: 'text',
        x: canvasPos.x,
        y: canvasPos.y,
        width: 0,
        height: 0,
        content: '',
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
    } else if (tool === 'image' && pendingImage) {
      previewElement.value = {
        id: 'preview-image',
        type: 'image',
        x: canvasPos.x,
        y: canvasPos.y,
        width: 0,
        height: 0,
        src: pendingImage.src,
        originalWidth: pendingImage.originalWidth,
        originalHeight: pendingImage.originalHeight,
        filter: 'none'
      } as ImageElement
    } else {
      // 图形工具
      previewElement.value = {
        id: 'preview-shape',
        type: tool as 'rectangle' | 'rounded-rectangle' | 'circle' | 'triangle',
        x: canvasPos.x,
        y: canvasPos.y,
        width: 0,
        height: 0,
        backgroundColor: '#4a90e2',
        borderWidth: 2,
        borderColor: '#357abd',
        ...(tool === 'rounded-rectangle' && { borderRadius: 8 })
      } as ShapeElement
    }
  }

  // 更新绘制预览
  const updateDrawing = (canvasPos: { x: number; y: number }) => {
    if (!isDrawing.value || !previewElement.value) {
      return
    }
    
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

  // 完成绘制
  const finishDrawing = (): CanvasElement | null => {
    if (!isDrawing.value || !previewElement.value) {
      return null
    }
    
    const element = previewElement.value
    
    // 检查元素尺寸是否有效
    if (element.width > 0 && element.height > 0) {
      // 创建新元素
      const newElement: CanvasElement = {
        ...element,
        id: generateId()
      } as CanvasElement
      
      // 如果是图片，清除待插入的图片数据
      if (element.type === 'image') {
        pendingImageData.value = null
      }
      
      // 重置绘制状态
      isDrawing.value = false
      previewElement.value = null
      
      return newElement
    }
    
    // 重置绘制状态
    isDrawing.value = false
    previewElement.value = null
    
    return null
  }

  // 取消绘制
  const cancelDrawing = () => {
    isDrawing.value = false
    previewElement.value = null
  }

  return {
    isDrawing,
    drawingStartX,
    drawingStartY,
    previewElement,
    pendingImageData,
    formatSize,
    sizeLabelStyle,
    getPreviewSelectionBoxStyle,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing
  }
}

