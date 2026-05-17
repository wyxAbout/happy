# Victory Images 资源说明

## 目录结构

```
public/victory_images/
  ├── victory_01.png
  ├── victory_02.png
  ├── victory_03.png
  ├── ...
  └── victory_24.png
```

## 图片要求

| 项目 | 规范 |
|------|------|
| 数量 | 24张（victory_01.png ~ victory_24.png） |
| 格式 | PNG（推荐）、JPG、JPEG、WebP |
| 尺寸 | 建议 1080x1920（竖屏）或 1920x1080（横屏） |
| 背景 | 建议包含透明或半透明背景，以便与遮罩层融合 |
| 命名 | 必须严格遵循 `victory_XX.png` 格式，XX为01-24的两位数字 |

## 使用方式

1. 将24张胜利图案放入此目录
2. 确保文件名符合 `victory_01.png` ~ `victory_24.png` 的命名规范
3. 重新构建项目（`npm run build`）
4. 游戏胜利时将随机展示其中一张

## 显示效果

- 全屏居中显示，带淡入淡出动画
- 默认显示时长：2.5秒
- 点击或倒计时结束后自动关闭
- 显示期间屏蔽所有游戏操作