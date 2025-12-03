import { type Ref } from 'vue'
import type { CanvasElement, GroupElement } from '../types/canvas'
import type { useElementSelection } from './useElementSelection'

/**
 * 元素组合功能 Composable
 */
export function useElementGrouping(
  elements: Ref<CanvasElement[]>,
  selection: ReturnType<typeof useElementSelection>,
  generateId: () => string
) {
  
  /**
   * 创建组合
   */
  const groupElements = () => {
    const selectedIds = selection.selectedElementIds.value
    if (selectedIds.length < 2) return

    // 1. 找出所有选中的元素
    const selectedElements: CanvasElement[] = []
    const indicesToRemove: number[] = []

    // 遍历 elements 查找选中项
    // 注意：我们要保留层级顺序，所以按 elements 顺序查找
    elements.value.forEach((el, index) => {
      if (selectedIds.includes(el.id)) {
        selectedElements.push(el)
        indicesToRemove.push(index)
      }
    })

    if (selectedElements.length < 2) return

    // 2. 计算组合的边界框 (Bounding Box)
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    selectedElements.forEach(el => {
      minX = Math.min(minX, el.x)
      minY = Math.min(minY, el.y)
      maxX = Math.max(maxX, el.x + el.width)
      maxY = Math.max(maxY, el.y + el.height)
    })

    const groupX = minX
    const groupY = minY
    const groupWidth = maxX - minX
    const groupHeight = maxY - minY

    // 3. 将子元素坐标转换为相对于组合的坐标
    const children = selectedElements.map(el => {
      // 深拷贝元素以避免引用问题
      const newEl = JSON.parse(JSON.stringify(el)) as CanvasElement
      // 转换坐标
      newEl.x = newEl.x - groupX
      newEl.y = newEl.y - groupY
      return newEl
    })

    // 4. 创建组合元素
    const groupElement: GroupElement = {
      id: generateId(),
      type: 'group',
      x: groupX,
      y: groupY,
      width: groupWidth,
      height: groupHeight,
      children: children
    }

    // 5. 更新元素列表
    // 从后往前删除，以免索引错乱
    const newElements = [...elements.value]
    for (let i = indicesToRemove.length - 1; i >= 0; i--) {
      newElements.splice(indicesToRemove[i], 1)
    }
    
    // 将组合元素插入到原来最上层元素的位置（或者最顶层）
    // 为了符合直觉，通常插入到被组合元素中 z-index 最高的那个位置
    const insertIndex = indicesToRemove[indicesToRemove.length - 1] - (indicesToRemove.length - 1)
    // 修正插入位置逻辑：简单起见，我们把它放到被移除的最后一个元素的位置
    // 但因为我们已经移除了多个，索引需要调整
    // indicesToRemove 是升序排列的
    // 比如 [1, 3, 5]，移除后，原位置 5 变成了 5-2=3
    
    // 简单策略：添加到原来最高层级的位置
    // 或者直接 push 到末尾？不，这会改变层级
    // 我们尝试保持在原处的相对位置
    
    // 修正策略：既然我们是一次性构建 newElements，我们可以 filter 掉旧的，然后 splice 插入
    // const newElements = elements.value.filter(el => !selectedIds.includes(el.id))
    // 插入位置？使用最顶层选中元素的索引
    // let maxIndex = -1
    // elements.value.forEach((el, idx) => { if(selectedIds.includes(el.id)) maxIndex = idx })
    // newElements.splice(maxIndex - (selectedIds.length - 1), 0, groupElement)
    
    // 实际上，上面的 indicesToRemove 处理逻辑有点复杂，用 filter 更简单
    // 但为了确定插入位置：
    const lastSelectedIndex = indicesToRemove[indicesToRemove.length - 1]
    // 计算移除后的插入位置
    // 在原数组中，lastSelectedIndex 之前有 indicesToRemove.length - 1 个选中元素被移除
    const targetIndex = lastSelectedIndex - (indicesToRemove.length - 1)
    
    newElements.splice(targetIndex, 0, groupElement)

    elements.value = newElements

    // 6. 选中新组合
    selection.selectedElementIds.value = [groupElement.id]
  }

  /**
   * 解除组合
   */
  const ungroupElements = () => {
    const selectedIds = selection.selectedElementIds.value
    if (selectedIds.length === 0) return

    const newElements = [...elements.value]
    const newSelectedIds: string[] = []
    let hasChanges = false

    // 我们需要处理可能选中了多个组合的情况
    // 使用 for 循环并小心处理索引，或者构建新列表
    
    // 策略：构建一个新的列表，遍历原列表，遇到选中的 Group 就展开，否则保留
    const resultElements: CanvasElement[] = []
    
    elements.value.forEach(el => {
      if (selectedIds.includes(el.id) && el.type === 'group') {
        const group = el as GroupElement
        hasChanges = true
        
        // 转换子元素坐标为世界坐标
        const children = group.children.map(child => {
          const newChild = JSON.parse(JSON.stringify(child)) as CanvasElement
          newChild.x = newChild.x + group.x
          newChild.y = newChild.y + group.y
          // 收集 ID 以便解组后保持选中
          newSelectedIds.push(newChild.id)
          return newChild
        })
        
        resultElements.push(...children)
      } else {
        resultElements.push(el)
        if (selectedIds.includes(el.id)) {
          newSelectedIds.push(el.id)
        }
      }
    })

    if (hasChanges) {
      elements.value = resultElements
      selection.selectedElementIds.value = newSelectedIds
    }
  }

  return {
    groupElements,
    ungroupElements
  }
}

