<script setup>
/**
 * MessageBar.vue — 消息提示栏组件
 *
 * 【功能概述】
 * 显示游戏中的状态消息（如"消除2个图标"、"第3关开始"等）。
 * 支持四种类型样式：info（灰白）、success（绿）、warning（黄）、error（红）。
 * 连击 ≥2 时显示连击徽章（🔥）。
 *
 * 【Props】
 * @prop {string} message - 消息文本内容
 * @prop {number} combo   - 当前连击数（>1 时显示徽章）
 * @prop {'info'|'success'|'warning'|'error'} type - 消息类型，决定背景色
 *
 * 【使用示例】
 *   <MessageBar message="消除2个图标！" :combo="1" type="success" />
 */

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

<style scoped>
</style>
