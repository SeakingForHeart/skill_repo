# Commit And Push Safely（中文说明）

`commit-and-push-safely` 是一个“只检查与撰写、不执行提交”的安全技能，用于在代码提交前完成变更审查、校验记录和提交信息草稿生成。

## Skill 功能

- 审查仓库状态与变更范围，帮助识别是否混入无关改动
- 基于实际 diff 生成可直接使用的提交信息草稿
- 按统一模板输出 `Why / What changed / Validation / Notes`
- 在推送前执行清单式核对，降低误提交流程风险
- 提供手动交接结果，提醒用户自行执行 Git 写操作
- 新增可执行只读运行时：命令边界检查、变更采集、草稿渲染、checklist 校验、输出审计

## 安全边界（必须遵守）

- 该 skill 仅做检查与文本输出
- **绝不执行** `git add`、`git commit`、`git push`
- 不做自动提交、不做自动推送、不做写操作重试
- 若出现冲突或风险，停止并交由用户决策

### 技术性硬约束

#### 禁止的工具调用
该 skill 在技术上禁止调用 Bash 工具执行以下命令：
- `git add`、`git commit`、`git push`（核心写操作）
- `git reset --hard`、`git clean -fd`（破坏性操作）
- `git checkout`（丢弃变更）
- `git stash`、`git merge`、`git rebase`（状态修改操作）
- 任何修改工作区、索引或远程状态的 git 命令

#### 允许的命令（仅读操作）
仅允许执行以下只读 git 命令：
- `git status`、`git diff`、`git log`（状态查看）
- `git branch`（无 `-d/-D` 标志时）
- `git remote -v`、`git ls-files`、`git show`
- 其他不修改仓库状态的查询命令

#### 运行时强制机制
1. **执行前检查**：运行时模块会对 git 命令做 allow/deny/gray-area 分类
2. **输出审计**：生成输出后扫描是否意外包含 git 写命令或自动执行措辞
3. **拒绝危险请求**：用户明确要求自动提交时拒绝并解释手动交接政策
4. **违规即停止**：检测到任何禁止操作立即停止并报告错误

## 运行时实现

新增目录：
- `commit-and-push-safely/runtime/`：只读运行时实现
- `commit-and-push-safely/__tests__/`：自动化测试

可执行入口：
- 无需构建步骤：运行时为纯 CommonJS JavaScript，零 npm 依赖 / devDependencies
- `npm run analyze -- <repoPath> [subject]`：直接运行 `runtime/cli.js`，输出结构化 report / draft / checklist / audit JSON
- `npm test`：直接使用 Node 内置 `node:test` 与 `node:assert/strict` 运行自动化测试

主要模块：
- `runtime/enforce.js`：git 命令分类与只读边界断言
- `runtime/collect.js`：变更采集与结构化 change report
- `runtime/draft.js`：commit 草稿模板渲染
- `runtime/validate.js`：checklist 规则校验
- `runtime/audit.js`：输出审计
- `runtime/cli.js`：聚合入口，输出 JSON 结果

## 输入与输出

输入（可选）：
- 审查范围（单文件或全仓）
- 提交风格（Conventional 或普通风格）
- 仓库已有的校验命令（如测试/静态检查）

输出（固定包含）：
- 建议暂存文件清单（仅建议）
- 严格按模板生成的提交信息草稿
- 实际执行过的校验结果摘要
- 手动检查提醒与剩余风险说明
- 结构化 report / checklist / audit 结果（用于程序化消费）

## 运作流程

1. 检查当前仓库状态（分支、工作区、变更文件）
2. **全面改动检测**：执行多个 git 命令确保捕获所有改动类型
3. 审阅所有改动，按严重程度总结风险（含特殊改动类型警告）
4. 运行最小必要校验并记录真实结果
5. 给出建议提交文件集，若混入无关改动则停止
6. 依据模板逐行生成提交信息草稿，包含所有检测到的改动类型
7. 用预推送清单复核模板完整性与顺序一致性
8. 在“准备输出”处硬停止，不触发任何 Git 写操作
9. 提醒用户手动复核所有文件及分支/远端后再提交与推送

## 相关文件

- Skill 定义：`commit-and-push-safely/SKILL.md`
- 预推送清单：`commit-and-push-safely/checklists/pre-push-checklist.md`
- 提交模板：`commit-and-push-safely/templates/commit-message-template.md`
- 运行时入口：`commit-and-push-safely/runtime/cli.js`
