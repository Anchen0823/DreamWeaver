import { ref, computed, nextTick } from 'vue'
import type { TextElement, CanvasElement } from '../types/canvas'
import type { useElementSelection } from './useElementSelection'

/**
 * 文本编辑管理 Composable
 * 处理文本元素的编辑、保存、取消等逻辑
 */
export function useTextEditing(
  elements: { value: CanvasElement[] },
  selection: ReturnType<typeof useElementSelection>
) {
  // 正在编辑的文本元素ID
  const editingTextElementId = ref<string | null>(null)
  // 文本编辑输入框引用
  const textEditInputRef = ref<HTMLTextAreaElement | HTMLTextAreaElement[] | null>(null)
  // 编辑中的文本内容
  const editingTextContent = ref<string>('')
  // 跟踪新创建的文本元素ID（用于判断是否应该自动删除）
  const newlyCreatedTextElementIds = ref<Set<string>>(new Set())

  // 选中的文本元素（单选且为文本类型时）
  const selectedTextElement = computed<TextElement | null>(() => {
    if (selection.selectedElementIds.value.length !== 1) {
      return null
    }
    const elementId = selection.selectedElementIds.value[0]
    const element = elements.value.find(el => el.id === elementId)
    return element && element.type === 'text' ? (element as TextElement) : null
  })

  // 启动文本编辑模式（内部函数）
  const startEditing = async (elementId: string) => {
    const element = elements.value.find(el => el.id === elementId) as TextElement
    if (!element || element.type !== 'text') {
      return
    }
    
    // 进入编辑模式
    editingTextElementId.value = elementId
    editingTextContent.value = element.content
    
    // 选中文本元素（如果未选中）
    if (!selection.isElementSelected(elementId)) {
      selection.selectedElementIds.value = [elementId]
    }
    
    // 等待 DOM 更新后聚焦输入框
    await nextTick()
    const inputElement = Array.isArray(textEditInputRef.value) 
      ? textEditInputRef.value[0] 
      : textEditInputRef.value
    if (inputElement && typeof inputElement.focus === 'function') {
      inputElement.focus()
      if (typeof inputElement.select === 'function') {
        inputElement.select()
      }
    }
  }

  // 处理文本双击事件
  const handleTextDoubleClick = async (elementId: string, e: MouseEvent) => {
    e.stopPropagation()
    await startEditing(elementId)
  }

  // 自动启动文本编辑模式（用于新创建的文本元素）
  const autoStartEditing = async (elementId: string) => {
    await startEditing(elementId)
  }

  // 处理文本编辑输入
  const handleTextEditInput = (elementId: string, value: string) => {
    editingTextContent.value = value
  }

  // 处理文本编辑保存
  const handleTextEditSave = (elementId: string) => {
    const elementIndex = elements.value.findIndex(el => el.id === elementId)
    if (elementIndex === -1) {
      editingTextElementId.value = null
      return
    }
    
    const element = elements.value[elementIndex] as TextElement
    if (element.type !== 'text') {
      editingTextElementId.value = null
      return
    }
    
    // 检查是否是新创建的文本元素且内容为空
    const isNewlyCreated = newlyCreatedTextElementIds.value.has(elementId)
    const isEmpty = !editingTextContent.value || editingTextContent.value.trim() === ''
    
    // 如果是新创建的且内容为空，删除该元素
    if (isNewlyCreated && isEmpty) {
      elements.value = elements.value.filter(el => el.id !== elementId)
      newlyCreatedTextElementIds.value.delete(elementId)
      // 取消选中
      selection.selectedElementIds.value = selection.selectedElementIds.value.filter(id => id !== elementId)
      editingTextElementId.value = null
      editingTextContent.value = ''
      return
    }
    
    // 更新文本内容
    const newElements = [...elements.value]
    const updatedElement = { ...newElements[elementIndex] } as TextElement
    updatedElement.content = editingTextContent.value
    
    newElements[elementIndex] = updatedElement
    elements.value = newElements
    
    // 如果内容不为空，移除新创建标记
    if (!isEmpty) {
      newlyCreatedTextElementIds.value.delete(elementId)
    }
    
    // 退出编辑模式
    editingTextElementId.value = null
    editingTextContent.value = ''
  }

  // 处理文本编辑取消
  const handleTextEditCancel = () => {
    const elementId = editingTextElementId.value
    if (elementId) {
      // 检查是否是新创建的文本元素且内容为空
      const isNewlyCreated = newlyCreatedTextElementIds.value.has(elementId)
      const isEmpty = !editingTextContent.value || editingTextContent.value.trim() === ''
      
      // 如果是新创建的且内容为空，删除该元素
      if (isNewlyCreated && isEmpty) {
        elements.value = elements.value.filter(el => el.id !== elementId)
        newlyCreatedTextElementIds.value.delete(elementId)
        // 取消选中
        selection.selectedElementIds.value = selection.selectedElementIds.value.filter(id => id !== elementId)
      } else if (!isEmpty) {
        // 如果内容不为空，移除新创建标记
        newlyCreatedTextElementIds.value.delete(elementId)
      }
    }
    
    editingTextElementId.value = null
    editingTextContent.value = ''
  }

  // 处理文本编辑失去焦点
  const handleTextEditBlur = (elementId: string) => {
    // 延迟处理，以便点击其他元素时能正常处理
    setTimeout(() => {
      if (editingTextElementId.value === elementId) {
        handleTextEditSave(elementId)
      }
    }, 200)
  }

  // 检查是否正在编辑文本
  const isEditingText = computed(() => editingTextElementId.value !== null)

  // 标记新创建的文本元素
  const markAsNewlyCreated = (elementId: string) => {
    newlyCreatedTextElementIds.value.add(elementId)
  }

  // 检查并删除空的新创建文本元素（当取消选中时调用）
  const checkAndDeleteEmptyNewText = (elementId: string) => {
    if (!newlyCreatedTextElementIds.value.has(elementId)) {
      return
    }
    
    const element = elements.value.find(el => el.id === elementId) as TextElement | undefined
    if (!element || element.type !== 'text') {
      return
    }
    
    // 如果内容为空，删除该元素
    if (!element.content || element.content.trim() === '') {
      elements.value = elements.value.filter(el => el.id !== elementId)
      newlyCreatedTextElementIds.value.delete(elementId)
    } else {
      // 如果内容不为空，移除新创建标记
      newlyCreatedTextElementIds.value.delete(elementId)
    }
  }

  return {
    editingTextElementId,
    textEditInputRef,
    editingTextContent,
    selectedTextElement,
    isEditingText,
    handleTextDoubleClick,
    handleTextEditInput,
    handleTextEditSave,
    handleTextEditCancel,
    handleTextEditBlur,
    markAsNewlyCreated,
    checkAndDeleteEmptyNewText,
    autoStartEditing
  }
}

