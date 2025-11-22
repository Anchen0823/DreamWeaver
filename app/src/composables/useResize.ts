import { ref } from 'vue'
import type { CanvasElement, ImageElement } from '../types/canvas'
import type { useViewport } from './useViewport'
import { screenToCanvas } from '../utils/coordinate-utils'

/**
 * 调整大小管理 Composable
 * 处理元素选中框的拖动调整大小功能
 */
export function useResize(
  elements: { value: CanvasElement[] },
  viewport: ReturnType<typeof useViewport>
) {
  // 调整大小状态
  const isResizing = ref(false)
  const resizeElementId = ref<string | null>(null)
  const resizeHandle = ref<'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null>(null) // 'nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'
  const resizeStartX = ref(0)
  const resizeStartY = ref(0)
  const resizeStartElementX = ref(0)
  const resizeStartElementY = ref(0)
  const resizeStartElementWidth = ref(0)
  const resizeStartElementHeight = ref(0)

  // 开始调整大小
  const startResize = (
    elementId: string,
    handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w',
    screenX: number,
    screenY: number,
    containerRect: DOMRect
  ) => {
    const element = elements.value.find(el => el.id === elementId)
    if (!element) {
      return
    }

    // 转换为画布坐标
    const canvasPos = screenToCanvas(
      screenX,
      screenY,
      containerRect,
      viewport.viewportOffsetX.value,
      viewport.viewportOffsetY.value,
      viewport.zoom.value,
      viewport.scale.value
    )

    isResizing.value = true
    resizeElementId.value = elementId
    resizeHandle.value = handle
    resizeStartX.value = canvasPos.x
    resizeStartY.value = canvasPos.y
    resizeStartElementX.value = element.x
    resizeStartElementY.value = element.y
    resizeStartElementWidth.value = element.width
    resizeStartElementHeight.value = element.height
  }

  // 更新调整大小
  const updateResize = (screenX: number, screenY: number, containerRect: DOMRect) => {
    if (!isResizing.value || !resizeElementId.value || !resizeHandle.value) {
      return
    }

    const element = elements.value.find(el => el.id === resizeElementId.value)
    if (!element) {
      return
    }

    // 转换为画布坐标
    const canvasPos = screenToCanvas(
      screenX,
      screenY,
      containerRect,
      viewport.viewportOffsetX.value,
      viewport.viewportOffsetY.value,
      viewport.zoom.value,
      viewport.scale.value
    )

    const deltaX = canvasPos.x - resizeStartX.value
    const deltaY = canvasPos.y - resizeStartY.value

    let newX = resizeStartElementX.value
    let newY = resizeStartElementY.value
    let newWidth = resizeStartElementWidth.value
    let newHeight = resizeStartElementHeight.value

    // 根据控制点位置计算新的大小和位置
    switch (resizeHandle.value) {
      case 'nw': // 左上角
        newX = resizeStartElementX.value + deltaX
        newY = resizeStartElementY.value + deltaY
        newWidth = resizeStartElementWidth.value - deltaX
        newHeight = resizeStartElementHeight.value - deltaY
        break
      case 'n': // 上边
        newY = resizeStartElementY.value + deltaY
        newHeight = resizeStartElementHeight.value - deltaY
        break
      case 'ne': // 右上角
        newY = resizeStartElementY.value + deltaY
        newWidth = resizeStartElementWidth.value + deltaX
        newHeight = resizeStartElementHeight.value - deltaY
        break
      case 'e': // 右边
        newWidth = resizeStartElementWidth.value + deltaX
        break
      case 'se': // 右下角
        newWidth = resizeStartElementWidth.value + deltaX
        newHeight = resizeStartElementHeight.value + deltaY
        break
      case 's': // 下边
        newHeight = resizeStartElementHeight.value + deltaY
        break
      case 'sw': // 左下角
        newX = resizeStartElementX.value + deltaX
        newWidth = resizeStartElementWidth.value - deltaX
        newHeight = resizeStartElementHeight.value + deltaY
        break
      case 'w': // 左边
        newX = resizeStartElementX.value + deltaX
        newWidth = resizeStartElementWidth.value - deltaX
        break
    }

    // 限制最小尺寸
    const minSize = 10
    if (newWidth < minSize) {
      if (resizeHandle.value === 'nw' || resizeHandle.value === 'w' || resizeHandle.value === 'sw') {
        newX = resizeStartElementX.value + resizeStartElementWidth.value - minSize
      }
      newWidth = minSize
    }
    if (newHeight < minSize) {
      if (resizeHandle.value === 'nw' || resizeHandle.value === 'n' || resizeHandle.value === 'ne') {
        newY = resizeStartElementY.value + resizeStartElementHeight.value - minSize
      }
      newHeight = minSize
    }

    // 如果是圆形，保持宽高相等
    if (element.type === 'circle') {
      // 使用较大的尺寸作为最终尺寸
      const size = Math.max(newWidth, newHeight)
      
      // 根据控制点调整位置
      if (resizeHandle.value === 'nw' || resizeHandle.value === 'w' || resizeHandle.value === 'sw') {
        newX = resizeStartElementX.value + resizeStartElementWidth.value - size
      }
      if (resizeHandle.value === 'nw' || resizeHandle.value === 'n' || resizeHandle.value === 'ne') {
        newY = resizeStartElementY.value + resizeStartElementHeight.value - size
      }
      
      newWidth = size
      newHeight = size
    }
    
    // 如果是图片，保持宽高比
    if (element.type === 'image') {
      const imgElement = element as ImageElement
      if (imgElement.originalWidth && imgElement.originalHeight) {
        const aspectRatio = imgElement.originalWidth / imgElement.originalHeight
        
        // 根据拖动方向决定以宽度还是高度为准
        const isHorizontalDrag = Math.abs(deltaX) > Math.abs(deltaY)
        
        if (isHorizontalDrag) {
          // 以宽度为准
          newHeight = newWidth / aspectRatio
          // 调整Y位置
          if (resizeHandle.value === 'nw' || resizeHandle.value === 'n' || resizeHandle.value === 'ne') {
            newY = resizeStartElementY.value + resizeStartElementHeight.value - newHeight
          }
        } else {
          // 以高度为准
          newWidth = newHeight * aspectRatio
          // 调整X位置
          if (resizeHandle.value === 'nw' || resizeHandle.value === 'w' || resizeHandle.value === 'sw') {
            newX = resizeStartElementX.value + resizeStartElementWidth.value - newWidth
          }
        }
      }
    }

    // 更新元素
    const elementIndex = elements.value.findIndex(el => el.id === resizeElementId.value)
    if (elementIndex !== -1) {
      const newElements = [...elements.value]
      const updatedElement = { ...newElements[elementIndex] }
      updatedElement.x = newX
      updatedElement.y = newY
      updatedElement.width = newWidth
      updatedElement.height = newHeight
      newElements[elementIndex] = updatedElement
      elements.value = newElements
    }
  }

  // 结束调整大小
  const endResize = () => {
    isResizing.value = false
    resizeElementId.value = null
    resizeHandle.value = null
  }

  // 获取边缘拖动区域样式
  const getResizeEdgeStyle = (
    elementId: string,
    edge: 'n' | 's' | 'e' | 'w'
  ): Record<string, string | number> => {
    const element = elements.value.find(el => el.id === elementId)
    if (!element) {
      return { display: 'none' }
    }

    const padding = 4
    const scaledPadding = padding * viewport.scale.value
    const edgeThickness = 8 // 边缘拖动区域的厚度（屏幕像素）
    const scaledEdgeThickness = edgeThickness / viewport.zoom.value

    const boxLeft = element.x * viewport.scale.value - scaledPadding
    const boxTop = element.y * viewport.scale.value - scaledPadding
    const boxWidth = element.width * viewport.scale.value + scaledPadding * 2
    const boxHeight = element.height * viewport.scale.value + scaledPadding * 2

    let left = 0
    let top = 0
    let width = 0
    let height = 0

    switch (edge) {
      case 'n': // 上边
        left = boxLeft
        top = boxTop - scaledEdgeThickness / 2
        width = boxWidth
        height = scaledEdgeThickness
        break
      case 's': // 下边
        left = boxLeft
        top = boxTop + boxHeight - scaledEdgeThickness / 2
        width = boxWidth
        height = scaledEdgeThickness
        break
      case 'e': // 右边
        left = boxLeft + boxWidth - scaledEdgeThickness / 2
        top = boxTop
        width = scaledEdgeThickness
        height = boxHeight
        break
      case 'w': // 左边
        left = boxLeft - scaledEdgeThickness / 2
        top = boxTop
        width = scaledEdgeThickness
        height = boxHeight
        break
    }

    return {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      zIndex: 1002
    }
  }

  // 获取角点选择点样式
  const getResizeHandleStyle = (
    elementId: string,
    handle: 'nw' | 'ne' | 'se' | 'sw'
  ): Record<string, string | number> => {
    const element = elements.value.find(el => el.id === elementId)
    if (!element) {
      return { display: 'none' }
    }

    const padding = 4
    const scaledPadding = padding * viewport.scale.value
    const handleSize = 6 * viewport.scale.value
    const halfHandleSize = handleSize / 2

    const boxLeft = element.x * viewport.scale.value - scaledPadding
    const boxTop = element.y * viewport.scale.value - scaledPadding
    const boxWidth = element.width * viewport.scale.value + scaledPadding * 2
    const boxHeight = element.height * viewport.scale.value + scaledPadding * 2

    let left = 0
    let top = 0

    switch (handle) {
      case 'nw':
        left = boxLeft - halfHandleSize
        top = boxTop - halfHandleSize
        break
      case 'ne':
        left = boxLeft + boxWidth - halfHandleSize
        top = boxTop - halfHandleSize
        break
      case 'se':
        left = boxLeft + boxWidth - halfHandleSize
        top = boxTop + boxHeight - halfHandleSize
        break
      case 'sw':
        left = boxLeft - halfHandleSize
        top = boxTop + boxHeight - halfHandleSize
        break
    }

    return {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      width: `${handleSize}px`,
      height: `${handleSize}px`,
      cursor: getCursor(handle),
      zIndex: 1003
    }
  }

  // 获取光标样式
  const getCursor = (handle: 'nw' | 'ne' | 'se' | 'sw'): string => {
    switch (handle) {
      case 'nw':
      case 'se':
        return 'nwse-resize'
      case 'ne':
      case 'sw':
        return 'nesw-resize'
      default:
        return 'default'
    }
  }

  return {
    isResizing,
    resizeElementId,
    resizeHandle,
    startResize,
    updateResize,
    endResize,
    getResizeHandleStyle,
    getResizeEdgeStyle
  }
}

