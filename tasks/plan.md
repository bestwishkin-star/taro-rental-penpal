# Implementation Plan: 空间记录与居住可信依据

## Overview

从服务端草稿开始，逐步交付单点记录、三维房屋进度、事务发布和可信依据四个可独立验收的垂直切片。完整设计见 `docs/superpowers/specs/2026-08-04-space-record-authenticity-design.md`。

## Architecture Decisions

- 草稿与公开故事分离。
- 共享合同先行，服务端派生完整度与可信依据。
- 私密证据在 repository 边界过滤。
- 新故事聚合到现有 `rentals`，维持列表兼容。

## Task List

### Phase 1: Foundation

- [ ] Task 1: 共享合同与题目配置
- [ ] Task 2: 草稿和空间记录数据结构
- [ ] Task 3: 图片资产与异步分析边界
- [ ] Task 4: 当前草稿摘要闭环

### Checkpoint: Foundation

- [ ] 合同、数据库和草稿 API 一致
- [ ] 所有权与隐私边界有测试用例

### Phase 2: Point Recording

- [ ] Task 5: 单点记录读写接口
- [ ] Task 6: 点位任务页骨架与 API 接入
- [ ] Task 7: 现场照片、隐私选择与分析状态
- [ ] Task 8: 日常场景、具体事件和空间切片

### Checkpoint: Point Recording

- [ ] 单点可进入、保存、退出和恢复
- [ ] 服务端返回正确完成状态

### Phase 3: Publish

- [ ] Task 9: 三维房屋草稿状态接入
- [ ] Task 10: 六点事务发布与安全门禁
- [ ] Task 11: 新旧故事详情兼容

### Checkpoint: Publish

- [ ] 新故事进入既有社区链路
- [ ] 私密内容不出现在公开响应

### Phase 4: Trust Evidence

- [ ] Task 12: 微打卡接口与判定
- [ ] Task 13: 凭证核验状态与可信依据展示
- [ ] Task 14: 家庭空间一致性分析接入

### Checkpoint: Complete

- [ ] 所有规格验收条件均有对应实现和测试用例
- [ ] 等待用户统一运行测试与真机验收

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| 草稿或上传丢失 | High | 分步持久化和失败重试 |
| 私密资源泄漏 | High | 数据分表、白名单映射、专项测试 |
| AI 服务延迟或误判 | High | 异步任务、统一适配器、人工复核兜底 |
| 发布不一致 | High | 单事务与幂等状态 |
| 老故事回归 | Medium | 新字段可选和双渲染路径 |

## Open Questions

- 语音首版的公开形态。
- 管理员凭证核验是否同迭代交付。
