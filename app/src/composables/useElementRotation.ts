import { ref } from 'vue'
import type { CanvasElement } from '../types/canvas'
import type { useViewport } from './useViewport'
import type { useElementSelection } from './useElementSelection'
import { screenToCanvas } from '../utils/coordinate-utils'

/**
 * 元素旋转管理 Composable
 * 处理选中元素的旋转逻辑
 */
export function useElementRotation(
  elements: { value: CanvasElement[] },
  viewport: ReturnType<typeof useViewport>,
  selection: ReturnType<typeof useElementSelection>
) {
  // 旋转状态
  const isRotating = ref(false)
  const rotateElementId = ref<string | null>(null)
  const rotateStartAngle = ref(0)
  const rotateStartRotation = ref(0)
  const rotateCenterX = ref(0)
  const rotateCenterY = ref(0)

  /**
   * 计算元素中心点
   */
  const getElementCenter = (element: CanvasElement): { x: number; y: number } => {
    return {
      x: element.x + element.width / 2,
      y: element.y + element.height / 2
    }
  }

  /**
   * 计算两点之间的角度（度）
   */
  const getAngle = (x1: number, y1: number, x2: number, y2: number): number => {
    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)
    return angle
  }

  /**
   * 开始旋转
   */
  const startRotate = (
    elementId: string,
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

    // 计算元素中心点
    const center = getElementCenter(element)
    rotateCenterX.value = center.x
    rotateCenterY.value = center.y

    // 计算初始角度
    const initialAngle = getAngle(center.x, center.y, canvasPos.x, canvasPos.y)
    rotateStartAngle.value = initialAngle

    // 记录初始旋转角度
    rotateStartRotation.value = element.rotation || 0

    isRotating.value = true
    rotateElementId.value = elementId
  }

  /**
   * 更新旋转
   */
  const updateRotate = (screenX: number, screenY: number, containerRect: DOMRect) => {
    if (!isRotating.value || !rotateElementId.value) {
      return
    }

    const element = elements.value.find(el => el.id === rotateElementId.value)
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

    // 计算当前角度
    const currentAngle = getAngle(rotateCenterX.value, rotateCenterY.value, canvasPos.x, canvasPos.y)

    // 计算旋转角度差
    let angleDelta = currentAngle - rotateStartAngle.value

    // 标准化角度到 -180 到 180 度
    if (angleDelta > 180) {
      angleDelta -= 360
    } else if (angleDelta < -180) {
      angleDelta += 360
    }

    // 计算新的旋转角度
    let newRotation = rotateStartRotation.value + angleDelta

    // 标准化旋转角度到 0 到 360 度
    newRotation = ((newRotation % 360) + 360) % 360

    // 更新元素
    const elementIndex = elements.value.findIndex(el => el.id === rotateElementId.value)
    if (elementIndex !== -1) {
      const newElements = [...elements.value]
      const updatedElement = { ...newElements[elementIndex] }
      updatedElement.rotation = newRotation
      newElements[elementIndex] = updatedElement
      elements.value = newElements
    }
  }

  /**
   * 结束旋转
   */
  const endRotate = () => {
    isRotating.value = false
    rotateElementId.value = null
  }

  /**
   * 获取旋转控制点样式
   */
  const getRotateHandleStyle = (elementId: string): Record<string, string | number> => {
    const element = elements.value.find(el => el.id === elementId)
    if (!element) {
      return { display: 'none' }
    }

    const padding = 4
    const scaledPadding = padding * viewport.scale.value
    const handleSize = 8 * viewport.scale.value
    const halfHandleSize = handleSize / 2
    const handleOffset = 20 / viewport.zoom.value // 控制点距离元素上边缘的距离（屏幕像素）

    const boxLeft = element.x * viewport.scale.value - scaledPadding
    const boxTop = element.y * viewport.scale.value - scaledPadding
    const boxWidth = element.width * viewport.scale.value + scaledPadding * 2
    const boxHeight = element.height * viewport.scale.value + scaledPadding * 2

    // 旋转控制点位于元素上方中心
    const centerX = boxLeft + boxWidth / 2
    const centerY = boxTop + boxHeight / 2
    const left = centerX - halfHandleSize
    const top = boxTop - handleOffset - halfHandleSize

    const style: Record<string, string | number> = {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      width: `${handleSize}px`,
      height: `${handleSize}px`,
      cursor: 'grab',
      zIndex: 1004
    }

    // 如果元素已旋转，旋转控制点也需要旋转
    if (element.rotation && element.rotation !== 0) {
      // 计算控制点相对于元素中心的偏移
      const offsetX = left + halfHandleSize - centerX
      const offsetY = top + halfHandleSize - centerY

      // 旋转偏移量
      const radians = (element.rotation * Math.PI) / 180
      const cos = Math.cos(radians)
      const sin = Math.sin(radians)
      const rotatedX = offsetX * cos - offsetY * sin
      const rotatedY = offsetX * sin + offsetY * cos

      // 更新位置
      style.left = `${centerX + rotatedX - halfHandleSize}px`
      style.top = `${centerY + rotatedY - halfHandleSize}px`
    }

    return style
  }

  return {
    isRotating,
    rotateElementId,
    startRotate,
    updateRotate,
    endRotate,
    getRotateHandleStyle,
    getElementCenter
  }
}

