# 🎮 开心消消乐 - Vue 3

一个功能完整的三消游戏单页应用，使用 Vue 3 + Tailwind CSS 构建。

## ✨ 功能特性

### 🎯 核心游戏机制
- ✅ 8x8 游戏网格
- ✅ 随机砖块生成
- ✅ 砖块交换与匹配检测
- ✅ 消除动画与砖块下落
- ✅ 自动填充新砖块
- ✅ 连消系统（Combo）

### 📊 分数与关卡系统
- ✅ 分数计算（连消加成）
- ✅ 10个关卡递进
- ✅ 步数限制
- ✅ 目标分数
- ✅ 最高分记录

### 🎮 游戏控制
- ✅ 重新开始游戏
- ✅ 重新排列砖块
- ✅ 提示功能
- ✅ 游戏进度本地存储

### 🎨 自定义图标
- ✅ 支持自定义砖块图标
- ✅ PNG/JPG/JPEG/SVG 格式
- ✅ 自动检测与加载
- ✅ 默认 emoji 图标备份

### 📱 移动端适配
- ✅ 响应式设计
- ✅ 触摸操作优化
- ✅ 竖屏模式
- ✅ 不同 DPI 自适应

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:8080 开始游戏！

### 生产构建

```bash
npm run build
```

### 预览构建结果

```bash
npm run preview
```

## 📁 项目结构

```
12happy/
├── public/
│   └── custom-icons/          # 自定义图标目录
│       ├── config.json
│       └── README.md
├── src/
│   ├── components/
│   │   ├── ScorePanel.vue     # 分数面板组件
│   │   ├── GameGrid.vue       # 游戏网格组件
│   │   ├── GameTile.vue       # 游戏砖块组件
│   │   ├── Controls.vue       # 控制按钮组件
│   │   ├── MessageBar.vue     # 消息栏组件
│   │   ├── GameOverModal.vue  # 游戏结束弹窗
│   │   └── GameLogic.js       # 游戏逻辑
│   ├── composables/
│   │   └── useGameState.js    # 游戏状态管理
│   ├── constants.js           # 常量定义
│   ├── App.vue                # 主应用组件
│   ├── main.js                # 入口文件
│   └── style.css              # 全局样式
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🎮 游戏玩法

1. 点击第一个图标选中（高亮显示）
2. 再点击一个相邻的相同图标
3. 如果形成 3 个或以上相同图标，则消除并得分
4. 新图标会自动从上方掉落
5. 如果掉落形成新匹配，触发连消（Combo）

## 🎨 自定义图标

详细说明请参考 [public/custom-icons/README.md](public/custom-icons/README.md)

快速步骤：
1. 在 `public/custom-icons/` 放入 6 个图标文件
2. 命名为 `tile01.png` 至 `tile06.png`
3. 更新 `config.json`
4. 重启服务器

## 💾 本地存储

游戏会自动保存：
- 当前游戏进度
- 最高分记录
- 刷新页面后自动恢复

## 🛠️ 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **Vite** - 下一代前端构建工具
- **Tailwind CSS** - 实用优先的 CSS 框架
- **Composition API** - Vue 3 组合式 API

## 📱 浏览器兼容性

- Chrome 60+
- Safari 12+
- Firefox 55+
- Edge 79+

## 📄 许可证

MIT License

---

玩得开心！🎉
