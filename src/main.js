/**
 * Vue 3 应用入口。
 *
 * <p>通过 createApp 创建 Vue 实例，挂载根组件 App.vue 到 #app 元素，
 * 并注入全局样式 style.css。</p>
 *
 * <h3>技术栈</h3>
 * Vue 3 Composition API + Vite 5 + Tailwind CSS 3
 */
import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')
