<template>
  <!-- 选中框 -->
  <template
    v-for="elementId in selectedElementIds"
    :key="`selection-${elementId}`"
  >
    <div
      v-if="shouldShowSelectionBox(elementId)"
      class="selection-box"
      :style="getSelectionBoxStyle(elementId)"
    ></div>
  </template>
  
  <!-- 框选框 -->
  <div
    v-if="isSelecting"
    class="selection-rect"
    :style="getSelectionRectStyle()"
  ></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { useElementSelection } from '../composables/useElementSelection'

interface Props {
  selection: ReturnType<typeof useElementSelection>
  editingTextElementId: string | null
}

const props = defineProps<Props>()

const selectedElementIds = computed(() => props.selection.selectedElementIds.value)
const isSelecting = computed(() => props.selection.isSelecting.value)

const shouldShowSelectionBox = (elementId: string) => {
  return props.editingTextElementId !== elementId
}

const getSelectionBoxStyle = (elementId: string) => {
  return props.selection.getSelectionBoxStyle(elementId)
}

const getSelectionRectStyle = () => {
  return props.selection.getSelectionRectStyle()
}
</script>

<style scoped>
.selection-box {
  border: 2px solid #4a90e2;
  border-radius: 2px;
  background-color: transparent;
  box-shadow: 0 0 0 1px rgba(74, 144, 226, 0.2);
  pointer-events: none;
}

.selection-rect {
  border: 2px dashed #4a90e2;
  border-radius: 2px;
  background-color: rgba(74, 144, 226, 0.1);
  pointer-events: none;
}
</style>

