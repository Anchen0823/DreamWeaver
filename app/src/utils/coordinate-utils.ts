/**
 * 坐标转换工具函数
 * 处理画布坐标和屏幕坐标之间的转换
 */

/**
 * 将屏幕坐标转换为画布坐标
 */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  containerRect: DOMRect,
  viewportOffsetX: number,
  viewportOffsetY: number,
  zoom: number,
  scale: number
): { x: number; y: number } {
  return {
    x: (screenX - containerRect.left - viewportOffsetX) / zoom / scale,
    y: (screenY - containerRect.top - viewportOffsetY) / zoom / scale
  }
}

/**
 * 将画布坐标转换为屏幕坐标
 */
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  containerRect: DOMRect,
  viewportOffsetX: number,
  viewportOffsetY: number,
  zoom: number,
  scale: number
): { x: number; y: number } {
  return {
    x: containerRect.left + viewportOffsetX + canvasX * zoom * scale,
    y: containerRect.top + viewportOffsetY + canvasY * zoom * scale
  }
}

