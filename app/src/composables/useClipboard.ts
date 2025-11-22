import { ref } from 'vue'
import type { CanvasElement } from '../types/canvas'

/**
 * 剪贴板管理 Composable
 * 处理元素的复制粘贴逻辑
 */
export function useClipboard() {
  // 剪贴板（存储复制的元素）
  const clipboard = ref<CanvasElement[]>([])

  // 鼠标位置（用于粘贴）
  const mouseX = ref(0)
  const mouseY = ref(0)

  // 深拷贝元素
  const deepCloneElement = (element: CanvasElement): CanvasElement => {
    return JSON.parse(JSON.stringify(element))
  }

  // 生成新的元素ID
  const generateNewElementId = (type: string): string => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 9)
    return `${type}-${timestamp}-${random}`
  }

  // 复制选中的元素
  const copySelectedElements = (selectedIds: string[], elements: CanvasElement[]) => {
    if (selectedIds.length === 0) {
      return
    }

    // 深拷贝选中的元素
    clipboard.value = selectedIds
      .map(id => elements.find(el => el.id === id))
      .filter((el): el is CanvasElement => el !== undefined)
      .map(el => deepCloneElement(el))
  }

  // 粘贴元素
  const pasteElements = (elements: CanvasElement[], selectedIds: { value: string[] }) => {
    if (clipboard.value.length === 0) {
      return []
    }

    // 计算粘贴偏移量（如果粘贴多个元素，保持相对位置）
    let offsetX = 0
    let offsetY = 0

    const firstElement = clipboard.value[0]
    if (!firstElement) {
      return []
    }

    if (clipboard.value.length === 1) {
      // 单个元素：粘贴到鼠标位置
      offsetX = mouseX.value - firstElement.x
      offsetY = mouseY.value - firstElement.y
    } else {
      // 多个元素：计算中心点偏移
      const centerX = clipboard.value.reduce((sum, el) => sum + el.x + el.width / 2, 0) / clipboard.value.length
      const centerY = clipboard.value.reduce((sum, el) => sum + el.y + el.height / 2, 0) / clipboard.value.length
      offsetX = mouseX.value - centerX
      offsetY = mouseY.value - centerY
    }

    // 创建新元素并添加到画布
    const newElements: CanvasElement[] = clipboard.value.map(element => {
      const newElement = deepCloneElement(element)
      newElement.id = generateNewElementId(element.type)
      newElement.x = element.x + offsetX
      newElement.y = element.y + offsetY
      return newElement
    })

    // 选中新粘贴的元素
    selectedIds.value = newElements.map(el => el.id)

    return newElements
  }

  // 更新鼠标位置
  const updateMousePosition = (x: number, y: number) => {
    mouseX.value = x
    mouseY.value = y
  }

  return {
    clipboard,
    copySelectedElements,
    pasteElements,
    updateMousePosition
  }
}

