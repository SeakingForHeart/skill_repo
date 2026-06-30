# Latest Diff And Migration Guide（中文说明）

`latest-diff-and-migration-guide` 用于读取当前工程或依赖包相对“最新版”（或同分支最新提交）的差异，并输出三类结果：

- 当前版本到最新版之间每个提交的逐项分析
- 最新版改动概括
- 当前项目更新后在使用方法上需要做出的变更

## Skill 功能

- 对比当前工作区与目标版本（同分支最新、最新 tag/release、依赖最新版）
- 读取当前版本到最新版之间的每个提交，并总结每个提交的影响范围和迁移相关性
- 提炼改动摘要：破坏性改动、功能新增、行为变化、修复项
- 汇总依赖升级影响：版本跨度、潜在兼容性风险、关联模块
- 产出迁移建议：API/CLI/配置/环境/流程层面的必改项和建议项
- 输出可执行的验证与回滚提示

## 安全边界（必须遵守）

- 仅做读取、分析和报告输出
- 不自动执行升级、不安装依赖、不写入仓库
- 不执行 `git add`、`git commit`、`git push` 等写操作
- 若用户要求“直接升级并提交”，仅提供手动执行计划

## Runtime 脚本

本 skill 提供零额外依赖的 CommonJS runtime：

- 入口：`latest-diff-and-migration-guide/runtime/cli.js`
- 测试：`latest-diff-and-migration-guide/__tests__/`
- 仅使用 Node.js 内置模块和 `node:test`
- 输出结构化 JSON，其中包含渲染后的 Markdown 报告
- 目标无法解析时返回 `blocked` / `ready-with-unknowns`，不会猜测最新版

常用命令：

```bash
npm --silent run analyze -- <repoPath> <target> --mode branch
npm test
```

## 适用场景

- 拉取同分支最新版本前后，想先了解影响面
- 计划升级依赖前，需要迁移风险评估
- 团队升级后，希望统一更新使用方式与注意事项

## 输入与输出

输入（建议提供）：
- 对比目标：`origin/<branch>`、`latest tag/release`、或依赖最新版
- 范围：全仓、指定目录、指定依赖
- 包管理器（可选）：`npm/pnpm/yarn/pip/poetry/uv`

输出（固定包含）：
- 目标版本说明
- 逐提交分析（当前版本到最新版的每个 commit）
- 改动概括（按影响级别）
- 依赖更新摘要
- 更新后必须变更的使用方法
- 可选优化项
- 验证清单
- 风险与回滚建议

## 运作流程

1. 确定对比目标（同分支最新、tag/release 或依赖最新版）
2. 只读采集当前状态与目标状态
3. 读取当前版本到最新版之间的每个提交
4. 归类并总结差异（功能、行为、破坏性变更、依赖）
5. 输出“必须改动”和“建议改动”两级迁移动作
6. 给出验证重点与回滚提示

## 相关文件

- Skill 定义：`latest-diff-and-migration-guide/SKILL.md`
- 检查清单：`latest-diff-and-migration-guide/checklists/latest-diff-checklist.md`
- 输出模板：`latest-diff-and-migration-guide/templates/report-template.md`
- 策略参考：`latest-diff-and-migration-guide/reference/version-comparison-strategy.md`
