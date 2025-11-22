import { ref, computed } from 'vue'

/**
 * 视口状态管理 Composable
 * 管理画布的缩放、偏移等视口相关状态
 */
export function useViewport() {
  // 用户控制的缩放比例（通过滚轮缩放）
  const zoom = ref(1)
  const minZoom = 0.1
  const maxZoom = 5

  // 视口偏移量（用于无限画布）
  const viewportOffsetX = ref(0)
  const viewportOffsetY = ref(0)

  // 画布的实际像素尺寸（用于计算元素位置）
  const actualCanvasWidth = ref(1280)
  const actualCanvasHeight = ref(720)

  // 响应式缩放比例（基于窗口大小）
  const scale = ref(1)

  // 网格大小
  const gridSize = ref(20)

  // 画布样式（包含视口偏移和缩放）
  const canvasStyle = computed(() => {
    return {
      width: '100%',
      height: '100%',
      transform: `translate(${viewportOffsetX.value}px, ${viewportOffsetY.value}px) scale(${zoom.value})`,
      transformOrigin: '0 0'
    }
  })

  // 网格背景位置（相对于视口固定，考虑缩放）
  const gridBackgroundStyle = computed(() => {
    const scaledGridSize = gridSize.value * zoom.value
    const offsetX = viewportOffsetX.value % (scaledGridSize * 2)
    const offsetY = viewportOffsetY.value % (scaledGridSize * 2)
    return {
      backgroundPosition: `${offsetX}px ${offsetY}px`,
      backgroundSize: `${scaledGridSize}px ${scaledGridSize}px`
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

  // 设置缩放
  const setZoom = (newZoom: number, mouseX?: number, mouseY?: number) => {
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom))
    
    if (mouseX !== undefined && mouseY !== undefined) {
      // 以鼠标位置为中心进行缩放
      const scaleFactor = clampedZoom / zoom.value
      const newOffsetX = mouseX - (mouseX - viewportOffsetX.value) * scaleFactor
      const newOffsetY = mouseY - (mouseY - viewportOffsetY.value) * scaleFactor
      
      zoom.value = clampedZoom
      viewportOffsetX.value = newOffsetX
      viewportOffsetY.value = newOffsetY
    } else {
      zoom.value = clampedZoom
    }
  }

  // 调整缩放
  const adjustZoom = (delta: number, mouseX?: number, mouseY?: number) => {
    setZoom(zoom.value + delta, mouseX, mouseY)
  }

  // 移动视口
  const moveViewport = (deltaX: number, deltaY: number) => {
    viewportOffsetX.value += deltaX
    viewportOffsetY.value += deltaY
  }

  // 设置视口偏移
  const setViewportOffset = (x: number, y: number) => {
    viewportOffsetX.value = x
    viewportOffsetY.value = y
  }

  return {
    // 状态
    zoom,
    minZoom,
    maxZoom,
    viewportOffsetX,
    viewportOffsetY,
    actualCanvasWidth,
    actualCanvasHeight,
    scale,
    gridSize,
    // 计算属性
    canvasStyle,
    gridBackgroundStyle,
    // 方法
    updateCanvasSize,
    setZoom,
    adjustZoom,
    moveViewport,
    setViewportOffset
  }
}

