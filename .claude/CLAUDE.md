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

## 注意事项

- 前端设计稿宽度: 375px
- MongoDB 使用全局单例模式
- 所有 API 响应遵循 `ApiResponse<T>` 格式
- 支持多平台: 微信(weapp)、抖音(tt)、京东(jd)

---

**最后更新**: 2026-03-26
