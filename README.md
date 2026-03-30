# Taro Rental Penpal Monorepo

`pnpm` monorepo，当前以微信小程序为首发目标，目录和配置已预留抖音、京东等平台扩展位。整体采用前后端分离、模块化、可扩展的组织方式。

## 技术栈

- 前端：Taro v4 + React + TypeScript
- 后端：Next.js App Router + MongoDB Node Driver + TypeScript
- 规范：ESLint + Prettier
- 包管理：pnpm workspace

## 目录结构

```text
apps/
  backend/        Next.js API 与后台管理入口
  frontend/       Taro 小程序前端
packages/
  shared/         前后端共享类型与常量
```

## 常用命令

```bash
pnpm install
pnpm dev:frontend
pnpm dev:backend
pnpm lint
pnpm typecheck
pnpm format
```

## 设计约定

- `apps/frontend/src/features`：按业务域拆分页面和组件。
- `apps/frontend/src/shared`：沉淀跨页面通用 UI、常量、工具。
- `apps/backend/src/modules`：后端按模块拆分服务逻辑。
- `packages/shared`：沉淀 API contract、跨端常量和基础类型。

## 后续扩展建议

1. 在 `packages/shared` 中继续抽象 DTO、鉴权声明和业务枚举。
2. 在 `apps/frontend/config/index.ts` 中继续补充 `tt`、`jd` 平台差异配置。
3. 在 `apps/backend/src/modules` 中按租房、消息、用户等域继续拆模块。
