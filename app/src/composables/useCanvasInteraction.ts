import { ref } from 'vue'
import type { useViewport } from './useViewport'

/**
 * 画布交互管理 Composable
 * 处理鼠标拖拽、滚轮缩放等交互逻辑
 */
export function useCanvasInteraction(viewport: ReturnType<typeof useViewport>) {
  // 拖拽状态
  const isDragging = ref(false)
  const dragStartX = ref(0)
  const dragStartY = ref(0)
  const dragStartOffsetX = ref(0)
  const dragStartOffsetY = ref(0)

  // 空格键状态
  const isSpacePressed = ref(false)

  // 处理鼠标按下事件
  const handleMouseDown = (e: MouseEvent) => {
    // 如果点击的是元素，不触发画布拖拽或框选
    const target = e.target as HTMLElement
    if (target.closest('.element')) {
      return false
    }

    // 左键处理
    if (e.button === 0) {
      // 如果按住空格键，则拖拽画布
      if (isSpacePressed.value) {
        startDrag(e.clientX, e.clientY)
        e.preventDefault()
        return true
      }
      return false
    }

    // 中键拖拽画布
    if (e.button === 1) {
      startDrag(e.clientX, e.clientY)
      e.preventDefault()
      return true
    }

    return false
  }

  // 开始拖拽
  const startDrag = (clientX: number, clientY: number) => {
    isDragging.value = true
    dragStartX.value = clientX
    dragStartY.value = clientY
    dragStartOffsetX.value = viewport.viewportOffsetX.value
    dragStartOffsetY.value = viewport.viewportOffsetY.value
  }

  // 处理鼠标移动事件（拖拽）
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging.value) {
      const deltaX = e.clientX - dragStartX.value
      const deltaY = e.clientY - dragStartY.value
      viewport.setViewportOffset(
        dragStartOffsetX.value + deltaX,
        dragStartOffsetY.value + deltaY
      )
      e.preventDefault()
      return true
    }
    return false
  }

  // 处理鼠标释放事件
  const handleMouseUp = () => {
    if (isDragging.value) {
      isDragging.value = false
      return true
    }
    return false
  }

  // 处理滚轮事件
  const handleWheel = (e: WheelEvent, containerRect: DOMRect) => {
    e.preventDefault()

    // Ctrl/Cmd + 滚轮：缩放
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      const mouseX = e.clientX - containerRect.left
      const mouseY = e.clientY - containerRect.top
      viewport.adjustZoom(delta, mouseX, mouseY)
      return true
    }
    // Shift + 滚轮：水平滚动
    else if (e.shiftKey) {
      viewport.moveViewport(-e.deltaY, 0)
      return true
    }
    // 普通滚轮：垂直滚动
    else {
      viewport.moveViewport(0, -e.deltaY)
      return true
    }
  }

  // 处理键盘按下事件
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.key === ' ') {
      isSpacePressed.value = true
      e.preventDefault()
      return true
    }
    return false
  }

  // 处理键盘释放事件
  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.key === ' ') {
      isSpacePressed.value = false
      // 如果正在拖拽，停止拖拽
      if (isDragging.value) {
        isDragging.value = false
      }
      return true
    }
    return false
  }

  return {
    // 状态
    isDragging,
    isSpacePressed,
    // 方法
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleKeyDown,
    handleKeyUp
  }
}

