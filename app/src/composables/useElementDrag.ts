import { ref } from 'vue'
import type { CanvasElement } from '../types/canvas'
import type { useViewport } from './useViewport'
import type { useElementSelection } from './useElementSelection'
import { screenToCanvas } from '../utils/coordinate-utils'

/**
 * 元素拖拽管理 Composable
 * 处理选中元素的拖拽移动逻辑
 */
export function useElementDrag(
  elements: { value: CanvasElement[] },
  viewport: ReturnType<typeof useViewport>,
  selection: ReturnType<typeof useElementSelection>
) {
  // 拖拽状态
  const isDragging = ref(false)
  const isDragStarted = ref(false) // 是否真正开始拖拽（移动超过阈值）
  const dragStartX = ref(0)
  const dragStartY = ref(0)
  const dragStartScreenX = ref(0)
  const dragStartScreenY = ref(0)
  const dragStartElementPositions = ref<Map<string, { x: number; y: number }>>(new Map())
  const dragThreshold = 3 // 移动超过3px才算拖拽

  // 开始拖拽元素（准备阶段）
  const startDrag = (elementId: string, clientX: number, clientY: number, containerRect: DOMRect) => {
    // 检查元素是否被选中
    if (!selection.isElementSelected(elementId)) {
      return false
    }

    // 转换为画布坐标
    const canvasPos = screenToCanvas(
      clientX,
      clientY,
      containerRect,
      viewport.viewportOffsetX.value,
      viewport.viewportOffsetY.value,
      viewport.zoom.value,
      viewport.scale.value
    )

    // 记录拖拽开始位置（屏幕坐标和画布坐标）
    dragStartScreenX.value = clientX
    dragStartScreenY.value = clientY
    dragStartX.value = canvasPos.x
    dragStartY.value = canvasPos.y

    // 记录所有选中元素的初始位置
    dragStartElementPositions.value.clear()
    selection.selectedElementIds.value.forEach(id => {
      const element = elements.value.find(el => el.id === id)
      if (element) {
        dragStartElementPositions.value.set(id, { x: element.x, y: element.y })
      }
    })

    isDragging.value = true
    isDragStarted.value = false
    return true
  }

  // 更新拖拽位置
  const updateDrag = (clientX: number, clientY: number, containerRect: DOMRect) => {
    if (!isDragging.value) {
      return false
    }

    // 检查是否移动超过阈值
    const screenDeltaX = Math.abs(clientX - dragStartScreenX.value)
    const screenDeltaY = Math.abs(clientY - dragStartScreenY.value)
    
    if (!isDragStarted.value) {
      // 如果还没有真正开始拖拽，检查是否超过阈值
      if (screenDeltaX > dragThreshold || screenDeltaY > dragThreshold) {
        isDragStarted.value = true
      } else {
        // 还没超过阈值，不更新位置
        return false
      }
    }

    // 转换为画布坐标
    const canvasPos = screenToCanvas(
      clientX,
      clientY,
      containerRect,
      viewport.viewportOffsetX.value,
      viewport.viewportOffsetY.value,
      viewport.zoom.value,
      viewport.scale.value
    )

    // 计算偏移量
    const deltaX = canvasPos.x - dragStartX.value
    const deltaY = canvasPos.y - dragStartY.value

    // 更新所有选中元素的位置
    selection.selectedElementIds.value.forEach(id => {
      const startPos = dragStartElementPositions.value.get(id)
      if (startPos) {
        const elementIndex = elements.value.findIndex(el => el.id === id)
        if (elementIndex !== -1) {
          const element = elements.value[elementIndex]
          // 创建新数组以确保响应式更新
          const newElements = [...elements.value]
          newElements[elementIndex] = {
            ...element,
            x: startPos.x + deltaX,
            y: startPos.y + deltaY
          }
          elements.value = newElements
        }
      }
    })

    return true
  }

  // 结束拖拽
  const endDrag = () => {
    if (isDragging.value) {
      isDragging.value = false
      isDragStarted.value = false
      dragStartElementPositions.value.clear()
      return true
    }
    return false
  }

  return {
    isDragging,
    startDrag,
    updateDrag,
    endDrag
  }
}

