# Taro Rental Penpal V2 项目指南

## 项目概述

租房笔友小程序 v2 - pnpm monorepo 架构，前后端分离

**技术栈**:
- 前端: Taro v4 + React + TypeScript (微信小程序)
- 后端: Next.js 15 App Router + MongoDB + TypeScript
- 包管理: pnpm workspace

## 目录结构

```
taro-rental-penpal-v2/
├── apps/
│   ├── backend/              # Next.js 后端
│   │   ├── src/app/api/     # API 路由
│   │   ├── src/lib/         # 工具库 (MongoDB, env)
│   │   └── src/modules/     # 业务模块 (chat, rentals, users)
│   └── frontend/             # Taro 小程序
│       ├── config/          # Taro 配置
│       ├── src/pages/       # 页面 (home, find, profile, share)
│       └── src/shared/      # 共享代码 (api, hooks, store, ui)
├── packages/
│   └── shared/              # 前后端共享类型和 API contracts
└── pnpm-workspace.yaml
```

## 常用命令

```bash
pnpm install              # 安装依赖
pnpm dev:frontend         # 开发前端 (微信小程序)
pnpm dev:backend          # 开发后端
pnpm lint                 # 代码检查
pnpm typecheck            # 类型检查
```

## 开发规范

### 路径别名
- `@shared/*` → `packages/shared/src/*`
- `@/*` → `apps/frontend/src/*` (前端)

### 架构模式
- **后端**: API 路由 → Service → Repository → MongoDB
- **前端**: 页面 → API Service → HTTP 封装 → 后端 API
- **共享**: 统一的 `ApiResponse<T>` 响应格式

### 新增功能
1. **后端 API**: 在 `packages/shared/src/contracts/` 定义类型 → 在 `modules/` 创建 service/repository → 在 `app/api/` 创建路由
2. **前端页面**: 在 `pages/` 创建目录 (tsx + config + scss) → 在 `app.config.ts` 注册路由
3. **共享类型**: 在 `packages/shared/src/contracts/` 添加 → 在 `index.ts` 导出

## 环境变量

**后端** (`.env.local`):
- `MONGODB_URI`: MongoDB 连接字符串
- `MONGODB_DB`: 数据库名称

**前端** (`src/shared/config/env.ts`):
- `apiBaseUrl`: 后端 API 地址

### 前端组件原子化规范

页面组件必须按业务拆分，禁止将整个页面写在一个组件文件里。

**目录结构**：

```
pages/<page>/
├── components/          # 该页面专属业务组件
│   └── <ComponentName>/
│       ├── index.tsx
│       └── index.scss
├── assets/              # 该页面专属静态资源
│   └── icons/
├── index.tsx            # 页面入口，只负责状态管理和组合组件
├── index.config.ts
└── index.scss           # 只放页面级样式（覆盖、布局容器等）

shared/ui/               # 跨页面公共组件（PageShell、LoginModal 等）
shared/assets/           # 跨页面公共静态资源
```

**拆分原则**：
- `index.tsx` 只做：状态管理、数据获取、组件组合，不写 UI 细节
- 每个业务模块提取为独立组件（如 `PhotoUploader`、`FormSection`、`FormRow`）
- 组件有自己的 SCSS 文件，使用组件名作为 CSS 类名前缀（BEM）
- 页面专属资源放 `pages/<page>/assets/`，公共资源放 `shared/assets/`
- 可复用的组件（跨页面使用）放 `shared/ui/`

### 图标与图片资源

**禁止**使用字体图标（如 lucide、feather、iconfont）或 emoji 作为 UI 图标。

**必须**从 Pencil 设计稿直接切图使用：

1. 在 Pencil 中选中目标图标/图片节点，使用 `mcp__pencil__export_nodes` 导出
2. 导出参数：`scale: 2`（2倍图）、`format: "png"`
3. 输出目录：`apps/frontend/src/assets/icons/<页面名>/`
4. 文件命名：语义化英文，如 `icon-price.png`、`icon-location.png`
5. 在代码中通过 `import` 引入，使用 `<Image>` 组件渲染，需显式指定 `width` 和 `height`

```tsx
import iconPrice from '@/assets/icons/share/icon-price.png';
// ...
<Image src={iconPrice} className="icon" mode="aspectFit" />
```

```scss
.icon {
  width: 18px;   /* 设计稿尺寸，非切图尺寸 */
  height: 18px;
}
```

## 注意事项

- 前端设计稿宽度: 375px
- MongoDB 使用全局单例模式
- 所有 API 响应遵循 `ApiResponse<T>` 格式
- 支持多平台: 微信(weapp)、抖音(tt)、京东(jd)

---

**最后更新**: 2026-03-31
