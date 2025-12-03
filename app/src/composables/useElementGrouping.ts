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

    // 递归解组函数
    // 如果列表中的元素被选中且是 Group，则展开它
    // 如果 Group 没被选中，但包含了被选中的子 Group，则需要进入递归
    // 注意：目前的选中逻辑是“选中了组，就等于选中了组ID”。不会单独选中子元素ID。
    // 所以如果是“选中顶层组”，则只解散这一层。
    // 如果要支持解散深层组，则需要 UI 支持选中深层组。
    // 假设 selectedIds 包含了需要解散的组的 ID（无论层级）。

    let hasChanges = false
    const newSelectedIds: string[] = []

    const processList = (list: CanvasElement[]): CanvasElement[] => {
      const result: CanvasElement[] = []
      
      for (const el of list) {
        if (selectedIds.includes(el.id) && el.type === 'group') {
          // 这是一个需要解散的组
          hasChanges = true
          const group = el as GroupElement
          
          // 转换子元素坐标为相对父级（如果有）的坐标
          // 注意：这里的 processList 是处理当前层级的。
          // group.children 的坐标是相对于 group 的。
          // 当 group 被解散，children 的坐标变为相对于 group 的父级（或世界）。
          // 所以 newChild.x = child.x + group.x
          
          const children = group.children.map(child => {
            const newChild = JSON.parse(JSON.stringify(child)) as CanvasElement
            newChild.x = newChild.x + group.x
            newChild.y = newChild.y + group.y
            
            // 保持子元素选中状态
            // 或者是让解散出来的子元素被选中？通常是后者。
            newSelectedIds.push(newChild.id)
            return newChild
          })
          
          // 递归处理子元素（如果子元素也是组且被选中，或者是普通元素）
          // 但这里我们已经解散了当前组，children 现在变成了当前层级的元素。
          // 是否需要继续解散 children 中的组？
          // 如果用户选中了父组，通常只解散父组。
          // 如果用户同时选中了父组和子组（在支持多选的层级视图中），那么应该解散两层。
          // 但如果 selectedIds 只包含父组 ID，子组 ID 不在其中，就不解散子组。
          // 我们这里递归调用 processList 处理 children，以支持多层解散。
          
          result.push(...processList(children))
          
        } else if (el.type === 'group') {
          // 这是一个不需要解散的组，但可能内部包含需要解散的组
          const group = el as GroupElement
          const processedChildren = processList(group.children)
          
          // 如果子元素有变化，我们需要创建一个新的 group 对象
          // 简单的判断 processedChildren !== group.children
          // 由于我们每次都返回新数组，这里可能需要更精确的 hasChanges 标志
          // 或者我们在 processList 外部控制。
          // 只要进入了 processList 并且发生了操作，hasChanges 就会为 true。
          
          // 如果这个组本身没变（children 也没变），我们应该保留引用？
          // 为了简单，我们重建对象。
          
          const newGroup: GroupElement = {
            ...group,
            children: processedChildren
          }
          
          result.push(newGroup)
          
          if (selectedIds.includes(el.id)) {
            newSelectedIds.push(el.id)
          }
        } else {
          result.push(el)
          if (selectedIds.includes(el.id)) {
            newSelectedIds.push(el.id)
          }
        }
      }
      
      return result
    }

    const newElements = processList(elements.value)

    if (hasChanges) {
      elements.value = newElements
      selection.selectedElementIds.value = newSelectedIds
    }
  }

  return {
    groupElements,
    ungroupElements
  }
}

