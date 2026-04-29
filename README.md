# Skill 技能仓库

Claude Code 技能集合中心 - 一套专为安全优先原则设计的可复用专业化能力库。

## 仓库目的

本仓库存储可在 Claude Code 会话中调用的可复用技能。每个技能独立封装，包含完整文档、配置和安全约束。

## 可用技能

### [commit-and-push-safely](commit-and-push-safely/)

一个"只检查与撰写、不执行提交"的安全技能，用于审查仓库变更并准备提交就绪的输出，而不执行任何 git 写操作。

**核心功能**：
- 全面改动检测（捕获标准 `git diff` 遗漏的 12+ 改动类型）
- 技术性硬约束防止自动提交/推送
- 结构化提交信息模板（`Why / What changed / Validation / Notes`）
- 推送前清单式最终验证
- 手动交接工作流确保用户完全控制

**安全保证**：绝不执行 `git add`、`git commit` 或 `git push`。用户完全掌控仓库修改操作。

**适用场景**：提交前审查改动、生成提交信息、执行推送前检查、准备安全手动交接。

**完整文档**：详见 [commit-and-push-safely/README.md](commit-and-push-safely/README.md)

---

*更多技能将随仓库发展陆续添加。*

## 技能结构

每个技能遵循标准化目录结构：

```
技能名称/
├── README.md               # 技能文档
├── SKILL.md                # 技能定义（frontmatter + 指令）
├── checklists/             # 验证清单
├── templates/              # 输出模板
├── tests/                  # 测试规范
└── reference/              # 参考文档
```



## 添加新技能

向本仓库添加新技能步骤：

1. **创建技能目录**：`<技能名称>/`
2. **编写 SKILL.md**：使用 frontmatter（name、description、argument-hint）定义技能并附详细指令
3. **创建 README.md**：用户文档说明目的、功能和用法
4. **添加支持资产**：
   - `checklists/` - 适用时的验证清单
   - `templates/` - 需结构化格式时的输出模板
   - `tests/` - 边界验证的测试规范
   - `reference/` - 实现细节的参考文档
5. **更新根 README.md**：在"可用技能"部分添加技能简述
6. **充分测试**：跨场景和模型版本验证技能行为

### 技能命名约定
- 使用小写加连字符：`技能名称`
- 选择描述性名称指明主要功能
- 避免缩写（除非广泛认知）

### SKILL.md 模板
```markdown
---
name: 技能名称
description: "技能目的和使用时机简述"
argument-hint: "技能调用参数可选指引"
---

# 技能名称

## Goal
[技能达成目标]

## Execution Boundary
[定义安全操作的硬约束]

## Use When
[应调用技能的具体场景]

## Workflow
[步骤式执行流程]

## Output Format
[预期输出结构和格式]
```

## 仓库结构

```
skill_repo/
├── README.md               # 本文件 - 仓库概览
├── LICENSE                 # MIT 许可证
├── commit-and-push-safely/ # 首个技能
│   ├── README.md           # 技能专属文档
│   ├── SKILL.md            # Claude 技能定义
│   ├── checklists/         # 验证清单
│   ├── templates/          # 输出模板
│   ├── tests/              # 测试规范
│   └── reference/          # 参考文档
└── <未来技能>/             # 未来技能遵循相同结构
```

## 版本控制理念

本仓库使用与技能推广的相同原则进行版本控制：

- **原子提交**：每次提交代表聚焦的单项改动
- **结构化信息**：Conventional Commits 格式配合详细上下文
- **提交前审查**：使用 `commit-and-push-safely` 技能在提交前审查改动
- **用户控制执行**：无明确批准不自动提交或推送

## 贡献指南

贡献新技能或改进时：

1. 遵循上述设计原则
2. 确保完整文档（README + SKILL.md + 参考文档）
3. 包含边界验证的测试规范
4. 更新根 README.md 反映新增内容
5. 使用 `commit-and-push-safely` 技能准备提交后再提交

## 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE)

Copyright (c) 2026 SeakingForHeart

---

**仓库维护者**：SeakingForHeart

**仓库用途**：安全优先架构的 Claude Code 技能精选集合

**当前技能数量**：1（commit-and-push-safely）

**最后更新**：2026-04-29