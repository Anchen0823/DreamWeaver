import { ref } from 'vue'
import type { CanvasElement, ImageElement } from '../types/canvas'
import type { useViewport } from './useViewport'
import type { useElementSelection } from './useElementSelection'
import { screenToCanvas } from '../utils/coordinate-utils'

/**
 * 元素缩放管理 Composable
 * 处理选中元素的滚轮缩放逻辑
 */
export function useElementZoom(
  elements: { value: CanvasElement[] },
  viewport: ReturnType<typeof useViewport>,
  selection: ReturnType<typeof useElementSelection>
) {
  // 缩放中心点（画布坐标）
  const zoomCenterX = ref(0)
  const zoomCenterY = ref(0)

  // 缩放元素
  const zoomElements = (delta: number, mouseX: number, mouseY: number, containerRect: DOMRect) => {
    // 如果没有选中的元素，不处理
    if (selection.selectedElementIds.value.length === 0) {
      return false
    }

    // 转换为画布坐标
    const canvasPos = screenToCanvas(
      mouseX,
      mouseY,
      containerRect,
      viewport.viewportOffsetX.value,
      viewport.viewportOffsetY.value,
      viewport.zoom.value,
      viewport.scale.value
    )

    zoomCenterX.value = canvasPos.x
    zoomCenterY.value = canvasPos.y

    // 缩放比例（向上滚动放大，向下滚动缩小）
    const scaleFactor = delta > 0 ? 1.1 : 0.9

    // 更新所有选中元素
    const newElements = [...elements.value]
    let hasChanges = false

    selection.selectedElementIds.value.forEach(elementId => {
      const elementIndex = newElements.findIndex(el => el.id === elementId)
      if (elementIndex === -1) {
        return
      }

      const element = newElements[elementIndex]
      
      // 计算缩放后的尺寸
      let newWidth = element.width * scaleFactor
      let newHeight = element.height * scaleFactor

      // 对于圆形和图片，保持宽高比
      if (element.type === 'circle' || element.type === 'image') {
        if (element.type === 'circle') {
          // 圆形：使用较小的尺寸作为直径
          const minSize = Math.min(newWidth, newHeight)
          newWidth = minSize
          newHeight = minSize
        } else if (element.type === 'image') {
          // 图片：保持原始宽高比
          const imageElement = element as ImageElement
          const aspectRatio = imageElement.originalWidth / imageElement.originalHeight
          if (newWidth / newHeight > aspectRatio) {
            newWidth = newHeight * aspectRatio
          } else {
            newHeight = newWidth / aspectRatio
          }
        }
      }

      // 限制最小尺寸
      const minSize = 10
      if (newWidth < minSize || newHeight < minSize) {
        return
      }

      // 计算缩放后的位置（以鼠标位置为固定点）
      // 鼠标相对于元素左上角的位置
      const relativeX = zoomCenterX.value - element.x
      const relativeY = zoomCenterY.value - element.y
      
      // 缩放后，保持鼠标指向的点在元素上的相对位置不变
      const newX = zoomCenterX.value - relativeX * scaleFactor
      const newY = zoomCenterY.value - relativeY * scaleFactor

      // 更新元素
      newElements[elementIndex] = {
        ...element,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      }

      hasChanges = true
    })

    if (hasChanges) {
      elements.value = newElements
      return true
    }

    return false
  }

  return {
    zoomElements
  }
}

