import type { CanvasElement, ShapeElement, ImageElement, TextElement } from '../types/canvas'

/**
 * 样式计算工具函数
 * 统一处理各种元素的样式计算逻辑
 */

/**
 * 获取元素的基础样式（位置、尺寸）
 */
export function getBaseStyle(
  element: CanvasElement,
  scale: number
): Record<string, string | number> {
  return {
    position: 'absolute',
    left: (element.x * scale) + 'px',
    top: (element.y * scale) + 'px',
    width: (element.width * scale) + 'px',
    height: (element.height * scale) + 'px',
    boxSizing: 'border-box'
  }
}

/**
 * 获取图形元素的样式
 */
export function getShapeStyle(
  element: ShapeElement,
  scale: number
): Record<string, string | number> {
  const baseStyle = {
    ...getBaseStyle(element, scale),
    backgroundColor: element.backgroundColor,
    borderWidth: element.borderWidth + 'px',
    borderStyle: 'solid',
    borderColor: element.borderColor
  }

  if (element.type === 'rounded-rectangle') {
    return {
      ...baseStyle,
      borderRadius: ((element.borderRadius || 0) * scale) + 'px'
    }
  }

  if (element.type === 'circle') {
    return {
      ...baseStyle,
      borderRadius: '50%'
    }
  }

  if (element.type === 'triangle') {
    // 使用 clip-path 创建三角形，支持轮廓渲染
    const clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)'
    const borderWidth = element.borderWidth * scale
    const scaledWidth = element.width * scale
    const scaledHeight = element.height * scale
    
    // 计算统一的缩放比例（内层三角形相对于外层的比例）
    // 从顶部中心点统一缩放，保持三角形相似性
    // 使用宽度和高度的最小值来确保均匀的边框
    const minDimension = Math.min(scaledWidth, scaledHeight)
    const scaleRatio = borderWidth > 0 && minDimension > 0 
      ? Math.max(0, (minDimension - borderWidth * 2) / minDimension) 
      : 1
    
    return {
      ...getBaseStyle(element, scale),
      backgroundColor: 'transparent', // 背景通过伪元素实现
      clipPath: clipPath,
      WebkitClipPath: clipPath, // Safari 兼容
      border: 'none', // 边框通过伪元素实现
      // 存储边框和背景信息供 CSS 使用
      '--border-width': borderWidth + 'px',
      '--border-color': element.borderColor,
      '--background-color': element.backgroundColor,
      '--scale-ratio': scaleRatio
    }
  }

  return baseStyle
}

/**
 * 获取图片元素的样式
 */
export function getImageStyle(element: ImageElement): Record<string, string | number> {
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

/**
 * 获取文本元素的样式
 */
export function getTextStyle(
  element: TextElement,
  scale: number
): Record<string, string | number> {
  return {
    fontFamily: element.fontFamily,
    fontSize: (element.fontSize * scale) + 'px',
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
    padding: (4 * scale) + 'px',
    boxSizing: 'border-box',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    width: '100%',
    minHeight: '100%',
    height: 'auto',  // 自动高度以适应内容
    overflow: 'hidden',  // 隐藏溢出内容
    display: 'block'
  }
}

/**
 * 获取文本元素容器的样式（允许高度自动适应）
 */
export function getTextElementStyle(
  element: TextElement,
  scale: number
): Record<string, string | number> {
  const baseStyle = getBaseStyle(element, scale)
  // 文本元素使用 min-height 而不是固定 height，允许自动扩展
  return {
    ...baseStyle,
    height: 'auto',
    minHeight: (element.height * scale) + 'px'
  }
}

/**
 * 统一获取元素样式的方法
 */
export function getElementStyle(
  element: CanvasElement,
  scale: number
): Record<string, string | number> {
  if (element.type === 'rectangle' ||
      element.type === 'rounded-rectangle' ||
      element.type === 'circle' ||
      element.type === 'triangle') {
    return getShapeStyle(element as ShapeElement, scale)
  }

  if (element.type === 'image') {
    return getBaseStyle(element, scale)
  }

  if (element.type === 'text') {
    return getTextElementStyle(element as TextElement, scale)
  }

  return getBaseStyle(element, scale)
}

/**
 * 格式化文本内容（处理换行等）
 */
export function formatTextContent(element: TextElement): string {
  return element.content
    .replace(/&/g, '&amp;')  // 先转义 &，因为其他转义序列都包含 &
    .replace(/</g, '&lt;')    // 转义 <
    .replace(/>/g, '&gt;')    // 转义 >
    .replace(/\n/g, '<br>')   // 最后将换行符转换为 <br> 标签
}

