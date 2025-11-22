import { ref } from 'vue'
import type { CanvasElement } from '../types/canvas'
import type { useViewport } from './useViewport'

/**
 * 元素选择管理 Composable
 * 处理元素的选择、框选等逻辑
 */
export function useElementSelection(
  elements: { value: CanvasElement[] },
  viewport: ReturnType<typeof useViewport>
) {
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

  // 检查元素是否被选中
  const isElementSelected = (elementId: string): boolean => {
    return selectedElementIds.value.includes(elementId)
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

  // 开始框选
  const startSelection = (x: number, y: number, ctrlKey: boolean) => {
    selectionStartX.value = x
    selectionStartY.value = y
    selectionCurrentX.value = x
    selectionCurrentY.value = y
    isSelecting.value = true
    isClick.value = true
    isCtrlPressedDuringSelection.value = ctrlKey

    // 如果之前没有按住 Ctrl/Cmd，清空选中
    if (!isCtrlPressedDuringSelection.value) {
      selectedElementIds.value = []
    }
  }

  // 更新框选位置
  const updateSelectionPosition = (x: number, y: number) => {
    selectionCurrentX.value = x
    selectionCurrentY.value = y

    // 检测是否移动超过阈值，如果是则认为是拖动而不是点击
    const deltaX = Math.abs(selectionCurrentX.value - selectionStartX.value)
    const deltaY = Math.abs(selectionCurrentY.value - selectionStartY.value)
    if (deltaX > clickThreshold || deltaY > clickThreshold) {
      isClick.value = false
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
    const canvasRectLeft = (rectLeft - viewport.viewportOffsetX.value) / viewport.zoom.value / viewport.scale.value
    const canvasRectTop = (rectTop - viewport.viewportOffsetY.value) / viewport.zoom.value / viewport.scale.value
    const canvasRectRight = (rectRight - viewport.viewportOffsetX.value) / viewport.zoom.value / viewport.scale.value
    const canvasRectBottom = (rectBottom - viewport.viewportOffsetY.value) / viewport.zoom.value / viewport.scale.value

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

  // 结束框选
  const endSelection = () => {
    if (isSelecting.value) {
      // 如果是点击（不是拖动），则清空选中（已在 startSelection 中处理）
      if (!isClick.value) {
        // 拖动结束，更新选中元素
        updateSelectionFromRect()
      }

      isSelecting.value = false
      isClick.value = true
    }
  }

  // 清空选中
  const clearSelection = () => {
    selectedElementIds.value = []
  }

  // 获取选中框样式
  const getSelectionBoxStyle = (elementId: string): Record<string, string | number> => {
    const element = elements.value.find(el => el.id === elementId)
    if (!element) {
      return {}
    }

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
    const adjustedX = (startX - viewport.viewportOffsetX.value) / viewport.zoom.value
    const adjustedY = (startY - viewport.viewportOffsetY.value) / viewport.zoom.value
    const adjustedWidth = width / viewport.zoom.value
    const adjustedHeight = height / viewport.zoom.value

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

  return {
    // 状态
    selectedElementIds,
    isSelecting,
    selectionStartX,
    selectionStartY,
    selectionCurrentX,
    selectionCurrentY,
    // 方法
    isElementSelected,
    handleElementMouseDown,
    startSelection,
    updateSelectionPosition,
    updateSelectionFromRect,
    endSelection,
    clearSelection,
    getSelectionBoxStyle,
    getSelectionRectStyle
  }
}

