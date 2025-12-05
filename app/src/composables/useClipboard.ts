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
  const pasteElements = (
    elements: CanvasElement[], 
    selectedIds: { value: string[] },
    generateName?: (type: string) => string
  ) => {
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

    // 如果提供了生成名称的函数，预先计算每种类型的起始编号
    const typeCounters: Record<string, number> = {}
    
    if (generateName) {
      // 查找每种类型的最大编号
      const findMaxNumber = (list: CanvasElement[], targetType: string): number => {
        let maxNum = 0
        for (const el of list) {
          if (el.type === targetType && el.name) {
            const match = el.name.match(/\d+$/)
            if (match) {
              const num = parseInt(match[0], 10)
              if (num > maxNum) {
                maxNum = num
              }
            }
          }
          if (el.type === 'group' && 'children' in el) {
            const childMaxNum = findMaxNumber((el as any).children || [], targetType)
            if (childMaxNum > maxNum) {
              maxNum = childMaxNum
            }
          }
        }
        return maxNum
      }
      
      // 统计剪贴板中所有元素类型（包括嵌套的）
      const collectTypes = (list: CanvasElement[]): Set<string> => {
        const types = new Set<string>()
        for (const el of list) {
          types.add(el.type)
          if (el.type === 'group' && 'children' in el) {
            const childTypes = collectTypes((el as any).children || [])
            childTypes.forEach(t => types.add(t))
          }
        }
        return types
      }
      
      const allTypes = collectTypes(clipboard.value)
      allTypes.forEach(type => {
        typeCounters[type] = findMaxNumber(elements, type) + 1
      })
    }
    
    // 生成唯一名称的辅助函数
    const generateUniqueName = (type: string): string => {
      if (!generateName) {
        return ''
      }
      
      const typeNames: Record<string, string> = {
        'rectangle': '矩形',
        'rounded-rectangle': '圆角矩形',
        'circle': '圆形',
        'triangle': '三角形',
        'image': '图片',
        'text': '文本',
        'brush': '画笔',
        'group': '组合'
      }
      
      const baseName = typeNames[type] || '元素'
      const number = typeCounters[type] || 1
      typeCounters[type] = number + 1
      
      return `${baseName} ${number}`
    }

    // 递归更新元素（包括组合内的子元素）
    const updateElement = (element: CanvasElement): CanvasElement => {
      const newElement = deepCloneElement(element)
      newElement.id = generateNewElementId(element.type)
      
      // 如果提供了生成名称的函数，更新元素名称
      if (generateName) {
        newElement.name = generateUniqueName(element.type)
      }
      
      // 如果是组合元素，递归更新子元素
      if (newElement.type === 'group' && 'children' in newElement) {
        newElement.children = newElement.children.map(child => updateElement(child))
      }
      
      return newElement
    }

    // 创建新元素并添加到画布
    const newElements: CanvasElement[] = clipboard.value.map(element => {
      const newElement = updateElement(element)
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

