<template>
  <div class="message-bar mt-4">
    <div 
      class="message-content px-6 py-3 rounded-xl text-center font-medium"
      :class="messageClass"
    >
      <span v-if="combo > 1" class="combo-badge bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold mr-2">
        🔥 {{ combo }}连击!
      </span>
      {{ message }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  message: String,
  combo: Number,
  type: {
    type: String,
    default: 'info'
  }
})

const messageClass = computed(() => {
  const classes = ['bg-white/90', 'text-gray-700']
  if (props.type === 'success') {
    classes.push('bg-green-100', 'text-green-700')
  } else if (props.type === 'warning') {
    classes.push('bg-yellow-100', 'text-yellow-700')
  } else if (props.type === 'error') {
    classes.push('bg-red-100', 'text-red-700')
  }
  return classes
})
</script>

<style scoped>
</style>
