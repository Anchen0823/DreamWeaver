<script setup lang="ts">
import Canvas from './components/Canvas.vue'
</script>

<template>
  <div class="app">
    <h1>DreamWeaver</h1>
    <Canvas />
  </div>
</template>

<style scoped>
.app {
  padding: 1.25rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 1400px;
  margin: 0 auto;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 1.25rem;
  font-size: 2rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app {
    padding: 1rem;
  }

  h1 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }
}

@media (max-width: 480px) {
  .app {
    padding: 0.75rem;
  }

  h1 {
    font-size: 1.25rem;
    margin-bottom: 0.75rem;
  }
}
</style>

