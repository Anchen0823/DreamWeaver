import { ref } from 'vue'
import type { CanvasElement, ShapeElement, ImageElement, TextElement } from '../types/canvas'
import type { useElementSelection } from './useElementSelection'

/**
 * 元素创建管理 Composable
 * 处理各种类型元素的创建逻辑
 */
export function useElementCreation(
  elements: { value: CanvasElement[] },
  selection: ReturnType<typeof useElementSelection>
) {
  // 生成唯一ID
  const generateId = () => {
    return `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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
      content: '',
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

  return {
    generateId,
    calculateFontSizeFromBoxSize,
    addShape,
    addImage,
    addText
  }
}

