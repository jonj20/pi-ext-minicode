
# pi-extensions 对 Coding Agent 的适用性分析

本文基于 `minicode/pi-extensions-main` 仓库的 README.md 与 AGENTS.md，对其中 30+ 个 Pi 原生扩展插件在 Coding Agent 场景下的适用性进行分类与选型建议。

---

## 1. 项目概览

`pi-extensions` 是 Pi coding agent 的原生扩展包仓库，每个包独立发布为 `@bacnh85/pi-*` npm 包。每个包包含：
- `extensions/index.ts`：扩展入口，注册工具、命令、钩子
- `extensions/package.json`：`{ "type": "module" }`
- `extensions/test/`：测试（mocha+tsx 或 `node --test`）
- `skills/<name>/SKILL.md`：技能文档
- `CHANGELOG.md`, `README.md`

安装方式：
- 推荐：`npx @bacnh85/pi-hub add <pkg1> <pkg2> ...`
- 手动：`pi install npm:@bacnh85/<pkg-name>`
- 项目本地安装：`pi install -l npm:@bacnh85/<pkg-name>`（写入 `.pi/settings.json`，团队共享）

管理：
- `pi list` 查看已安装
- `pi config` 启用/禁用扩展
- `pi update --extensions` 更新

> 注意：**安装 ≠ 启用**。全部 `pi install` 下载无害，但建议只通过 `pi config` 启用需要的，避免上下文压力。

---

## 2. 与编码直接相关的插件（推荐安装集合）

### 第一梯队：编码核心能力（强烈建议安装）

| 插件 | 功能 | 对 Coding Agent 的价值 | 上下文压力 |
|------|------|----------------------|-----------|
| **pi-serena** | 语义代码导航：查找/替换/重命名符号、LSP 诊断、引用追踪 | AGENTS.md 明确指定为**主导航工具**，优先于 grep，精准定位代码位置 | 中 |
| **pi-plan** | plan → implement → verify → review 工作流，只读守护、回退模型链 | 让 agent 分阶段工作，避免直接乱改，提升复杂任务成功率 | 中高 |
| **pi-subagent** | 隔离内嵌子代理，并行/链式模式、git worktree 沙箱、后台运行、herdr 委派 | 并行探索代码库、运行测试、review，不污染主会话 | 中 |
| **pi-model-tools** | 参数修复、`apply_patch` diff 工具、bash 自动后台、防御性泄漏清理、DeepSeek/GLM 指导 | 修复工具调用失败，统一 diff 格式，提升编辑可靠性 | 低 |
| **pi-review** | 隔离的只读代码审查，同会话回退 | 质量把关，发现 bug 和滥用前拦截 | 低 |
| **pi-checkpoint** | git 备份的 undo/redo，回滚消息及其文件变更 | 试错安全网，误改代码可一键回滚 | 低 |

### 第二梯队：编码质量与纪律（建议按需安装）

| 插件 | 功能 | 对 Coding Agent 的价值 | 上下文压力 |
|------|------|----------------------|-----------|
| **pi-advisor** | 第二个模型逐轮评审，注入 severity-routed 笔记（nit / concern） | OMP 风格自动顾问，持续质量把关 | 中高 |
| **pi-munin** | 长期记忆：search/get/store/list/delete/跨项目共享 | `munin_search` 前置检索，避免重复踩坑 | 中 |
| **pi-ponytail** | YAGNI / stdlib-first 编码纪律，每次变更运行 | 防止过度设计，保持代码简洁 | 低 |
| **pi-classifier** | 类型化概率判定 `classify`，可选 Jev-gated 权限自动批准 | 辅助决策，如“这个改动是否风险高” | 低 |
| **pi-selfskills** | `skill_manage` 工具，agent 自身修补/创建技能 | 让 agent 能自我进化，编写适合当前代码库的技能 | 中 |

### 第三梯队：编码辅助工具（按场景安装）

| 插件 | 功能 | 对 Coding Agent 的价值 |
|------|------|----------------------|
| **pi-fff** | FFF 模糊文件 / 内容搜索 | 代码快速检索，serena 不可用时的备选 |
| **pi-init** | 扫描仓库生成 / 更新 AGENTS.md | 让 agent 快速了解新代码库的 build / test / lint |
| **pi-references** | 外部目录 / git 仓库别名为 `@docs` / `@sdk` | 注入外部依赖文档到上下文 |
| **pi-evolve** | 轨迹自学习，反思并持久化学习 | 长期运行的 agent 随时间变强 |

---

## 3. 基础设施插件（已选定）

用户选定的基础设施插件如下：

| 插件 | 功能 | 选型原因 |
|------|------|----------|
| **pi-web** | 联网搜索、文档抓取、报错查询、网页交互 | 补齐 agent 联网能力 |
| **pi-evolve** | 轨迹自学习，长期积累经验并注入后续会话 | 让 agent 随时间进化 |
| **pi-notify** | 桌面通知与声音（任务完成、错误、提问） | 适合后台长耗时任务提醒 |
| **pi-cron** | 定时任务，向活跃会话触发 prompt | 适合夜ly 构建检查、定时回归触发 |
| **pi-windows-tools** | Windows 原生工具链 / WSL 桥接 | Windows 平台原生工具支持 |

**安装命令示例：**
```bash
npx @bacnh85/pi-hub add pi-web pi-evolve pi-notify pi-cron pi-windows-tools
# 或逐条安装
pi install npm:@bacnh85/pi-web
pi install npm:@bacnh85/pi-evolve
pi install npm:@bacnh85/pi-notify
pi install npm:@bacnh85/pi-cron
pi install npm:@bacnh85/pi-windows-tool
```

---

## 4. 较不适合纯编码（可跳过）

| 插件 | 理由 |
|------|------|
| **pi-kicad** | KiCad 电路板设计，硬件非软件编码 |
| **pi-notebooklm** | Google NotebookLM 笔记集成，非代码核心 |
| **pi-obsidian** | Obsidian vault 集成，非代码核心 |
| **pi-sub** | 订阅费用页脚，非核心 |
| **pi-themes** | 纯 TUI 主题，无扩展代码 |
| **pi-windows-tools** | 已选作基础设施，平台特定 |

---

## 5. 建议的编码插件安装集合

### 核心集（必装）
```bash
npx @bacnh85/pi-hub add pi-serena pi-plan pi-subagent pi-model-tools pi-review pi-checkpoint
```

### 质量集（按需开启）
```bash
npx @bacnh85/pi-hub add pi-advisor pi-munin pi-ponytail pi-classifier pi-selfskills
```

### 辅助集（按场景）
```bash
npx @bacnh85/pi-hub add pi-fff pi-init pi-references pi-evolve
```

### 基础设施集（已选定）
```bash
npx @bacnh85/pi-hub add pi-web pi-evolve pi-notify pi-cron pi-windows-tools
```

---

## 6. 上下文压力说明

全部安装 30+ 个插件**会有上下文压力**：

- 压力来源：每个启用的扩展会把工具 Schema、技能文档（SKILL.md）、命令和钩子注入模型上下文。
- 全部启用会导致可选工具和系统提示显著膨胀，增加 token 消耗和模型选型难度。
- 建议：全部 `pi install` 下载，但只用 `pi config` 启用核心集；其余按需开启。

**Agent-specific 使用指南（来自 AGENTS.md）：**
- Serena 是主导航工具，优先于 grep
- Subagents（scout/tester）并行化读密集型探索
- Munin 存储/复用耐久知识，`munin_search` 前置检索
- Ponytail 运行于每次变更
- Lockfiles 必须刷新（不仅 `npm ci`）当 Pi SDK 版本变更

---

## 7. 安装与验证

```bash
# 安装单个包
pi install npm:@bacnh85/pi-serena

# 批量安装
npx @bacnh85/pi-hub add pi-serena pi-plan pi-subagent pi-model-tools pi-review pi-checkpoint

# 查看已安装
pi list

# 启用/禁用
pi config

# 更新
pi update --extensions

# 测试单个包
cd pi-serena && npm test
```

---

*文档生成于 pi-extensions 分析会话，基于 README.md 与 AGENTS.md 内容。*