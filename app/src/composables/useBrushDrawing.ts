import { ref, computed } from 'vue'
import type { BrushElement, BrushPoint } from '../types/canvas'
import type { useViewport } from './useViewport'

/**
 * 画笔绘制管理 Composable
 * 处理画笔轨迹记录和元素创建
 */
export function useBrushDrawing(
  viewport: ReturnType<typeof useViewport>,
  generateId: () => string
) {
  // 绘制状态
  const isDrawing = ref(false)
  const currentBrushElement = ref<BrushElement | null>(null)
  const points = ref<BrushPoint[]>([])
  
  // 画笔默认属性
  const defaultColor = ref('#ff6b6b')
  const defaultStrokeWidth = ref(5)
  const defaultLineCap = ref<'butt' | 'round' | 'square'>('round')
  const defaultLineJoin = ref<'miter' | 'round' | 'bevel'>('round')

  // 计算点的边界框
  const calculateBounds = (points: BrushPoint[], strokeWidth: number) => {
    if (points.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
    }

    const halfStroke = strokeWidth / 2
    const firstPoint = points[0]!
    let minX = firstPoint.x - halfStroke
    let minY = firstPoint.y - halfStroke
    let maxX = firstPoint.x + halfStroke
    let maxY = firstPoint.y + halfStroke

    for (const point of points) {
      minX = Math.min(minX, point.x - halfStroke)
      minY = Math.min(minY, point.y - halfStroke)
      maxX = Math.max(maxX, point.x + halfStroke)
      maxY = Math.max(maxY, point.y + halfStroke)
    }

    return { minX, minY, maxX, maxY }
  }

  // 开始绘制
  const startDrawing = (canvasPos: { x: number; y: number }) => {
    isDrawing.value = true
    points.value = [{ x: 0, y: 0 }] // 第一个点相对于元素左上角为 (0, 0)
    
    // 创建初始画笔元素
    currentBrushElement.value = {
      id: 'preview-brush',
      type: 'brush',
      x: canvasPos.x,
      y: canvasPos.y,
      width: 0,
      height: 0,
      points: points.value,
      color: defaultColor.value,
      strokeWidth: defaultStrokeWidth.value,
      lineCap: defaultLineCap.value,
      lineJoin: defaultLineJoin.value
    }
  }

  // 添加点
  const addPoint = (canvasPos: { x: number; y: number }) => {
    if (!isDrawing.value || !currentBrushElement.value) {
      return
    }

    // 计算相对于初始位置的坐标
    const initialX = currentBrushElement.value.x
    const initialY = currentBrushElement.value.y
    const relativeX = canvasPos.x - initialX
    const relativeY = canvasPos.y - initialY

    // 添加新点（相对于初始位置）
    points.value.push({ x: relativeX, y: relativeY })

    // 重新计算边界框（基于所有点）
    const bounds = calculateBounds(points.value, currentBrushElement.value.strokeWidth)
    
    // 更新元素位置（初始位置 + 边界框的最小值）
    currentBrushElement.value.x = initialX + bounds.minX
    currentBrushElement.value.y = initialY + bounds.minY
    currentBrushElement.value.width = bounds.maxX - bounds.minX
    currentBrushElement.value.height = bounds.maxY - bounds.minY

    // 调整所有点的坐标，使其相对于新的左上角
    const offsetX = bounds.minX
    const offsetY = bounds.minY
    currentBrushElement.value.points = points.value.map(p => ({
      x: p.x - offsetX,
      y: p.y - offsetY
    }))
    
    // 更新 points 数组以保持同步
    points.value = currentBrushElement.value.points
  }

  // 完成绘制
  const finishDrawing = (): BrushElement | null => {
    if (!isDrawing.value || !currentBrushElement.value || points.value.length < 2) {
      // 如果点数少于2，取消绘制
      cancelDrawing()
      return null
    }

    const element: BrushElement = {
      ...currentBrushElement.value,
      id: generateId()
    }

    // 重置状态
    cancelDrawing()

    return element
  }

  // 取消绘制
  const cancelDrawing = () => {
    isDrawing.value = false
    currentBrushElement.value = null
    points.value = []
  }

  // 设置画笔颜色
  const setColor = (color: string) => {
    defaultColor.value = color
    if (currentBrushElement.value) {
      currentBrushElement.value.color = color
    }
  }

  // 设置画笔宽度
  const setStrokeWidth = (width: number) => {
    defaultStrokeWidth.value = width
    if (currentBrushElement.value) {
      currentBrushElement.value.strokeWidth = width
      // 重新计算边界框
      if (points.value.length > 0) {
        const bounds = calculateBounds(points.value, width)
        if (currentBrushElement.value) {
          const currentX = currentBrushElement.value.x
          const currentY = currentBrushElement.value.y
          currentBrushElement.value.x = currentX + bounds.minX
          currentBrushElement.value.y = currentY + bounds.minY
          currentBrushElement.value.width = bounds.maxX - bounds.minX
          currentBrushElement.value.height = bounds.maxY - bounds.minY
          
          // 调整点的坐标
          const offsetX = bounds.minX
          const offsetY = bounds.minY
          currentBrushElement.value.points = points.value.map(p => ({
            x: p.x - offsetX,
            y: p.y - offsetY
          }))
          points.value = currentBrushElement.value.points
        }
      }
    }
  }

  return {
    isDrawing,
    currentBrushElement,
    defaultColor,
    defaultStrokeWidth,
    defaultLineCap,
    defaultLineJoin,
    startDrawing,
    addPoint,
    finishDrawing,
    cancelDrawing,
    setColor,
    setStrokeWidth
  }
}

