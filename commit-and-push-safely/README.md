# Commit And Push Safely（中文说明）

`commit-and-push-safely` 是一个“只检查与撰写、不执行提交”的安全技能，用于在代码提交前完成变更审查、校验记录和提交信息草稿生成。

## Skill 功能

- 审查仓库状态与变更范围，帮助识别是否混入无关改动
- 基于实际 diff 生成可直接使用的提交信息草稿
- 按统一模板输出 `Why / What changed / Validation / Notes`
- 在推送前执行清单式核对，降低误提交流程风险
- 提供手动交接结果，提醒用户自行执行 Git 写操作

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
1. **执行前检查**：调用 Bash 前验证命令不匹配禁止模式
2. **输出审计**：生成输出后扫描是否意外包含 git 写命令
3. **拒绝危险请求**：用户明确要求自动提交时拒绝并解释手动交接政策
4. **违规即停止**：检测到任何禁止操作立即停止并报告错误

#### 防御性提示
当用户请求不安全操作时，skill 必须回复：
```
本 skill 无法执行 git 写操作。您必须手动执行：
- git add <files>
- git commit（使用提供的草稿）
- git push <remote> <branch>
``

## 适用场景

- 提交前希望先做一次变更体检
- 需要根据真实改动生成规范 commit message
- 推送前需要结构化检查清单
- 希望明确记录“做了什么、为什么做、如何验证”

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

## 运作流程

1. 检查当前仓库状态（分支、工作区、变更文件）
2. **全面改动检测**：执行多个 git 命令确保捕获所有改动类型
   - `git status` - 追踪文件、未追踪文件、删除文件
   - `git diff` - 标准文本改动
   - `git diff --stat` - 二进制文件改动（文件大小）
   - `git diff --summary` - 文件权限、符号链接改动
   - `git diff --submodule` - 子模块更新（如有）
   - `git ls-files -s` - 已暂存文件的权限模式
3. 审阅所有改动，按严重程度总结风险（含特殊改动类型警告）
4. 运行最小必要校验并记录真实结果
5. 给出建议提交文件集，若混入无关改动则停止
6. 依据模板逐行生成提交信息草稿，包含所有检测到的改动类型
7. 用预推送清单复核模板完整性与顺序一致性
8. 在”准备输出”处硬停止，不触发任何 Git 写操作
9. 提醒用户手动复核所有文件（含未追踪、二进制、权限改动）及分支/远端后再提交与推送

## 改动检测范围

标准 `git diff` 可能遗漏以下改动，本 skill 通过多命令组合确保全面捕获：

- ✅ **未追踪文件**：新建空文件需先 `git add`
- ✅ **文件权限**：`chmod` 改动（`git diff --summary`）
- ✅ **二进制文件**：图片、编译产物（`git diff --stat`）
- ✅ **空白字符**：空格/换行符改动（可能被编辑器隐藏）
- ✅ **符号链接**：链接目标改动（`git diff --summary`）
- ✅ **子模块**：子模块内容更新（`git diff --submodule`）
- ✅ **Git 内部文件**：`.git/hooks`、`.git/config`（需手动检查）
- ✅ **换行符转换**：CRLF/LF 转换（受 `core.autocrlf` 影响）
- ✅ **大文件限制**：超大文件可能被截断
- ✅ **Git 对象损坏**：`.git/objects` 损坏（需 `git fsck`）
- ✅ **多工作树**：其他工作树的改动不可见
- ✅ **外部 diff 工具**：可能过滤输出格式

## Commit Message 规则（摘要）

- 推荐主题格式：`type(scope): short summary`
- `type` 仅允许：`feat` `fix` `docs` `style` `refactor` `test` `chore`
- 主题行建议小于 72 字符，且与真实 diff 一致
- 模板区块顺序必须固定：`Why` → `What changed` → `Validation` → `Notes`
- 区块不可缺失：无内容用 `- None`；未执行校验写 `- Not run`（可附原因）

## 相关文件

- Skill 定义：`commit-and-push-safely/SKILL.md`
- 预推送清单：`commit-and-push-safely/checklists/pre-push-checklist.md`
- 提交模板：`commit-and-push-safely/templates/commit-message-template.md`
