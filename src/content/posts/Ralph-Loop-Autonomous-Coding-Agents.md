---
title: "Ralph Loop：让 AI 编程 Agent 通宵干活的自主循环范式"
published: 2026-05-13
description: "你还在一轮一轮地给 AI 发指令？Ralph Loop 用一个 while true 循环加 Stop Hook，让 Claude Code 和 Codex CLI 变成了可以连续工作十几个小时的自主 Agent。这篇文章从原理到实操，拆解这个正在重塑 AI 编程工作流的范式。"
image: "/gallery/cover/ralph-loop.png"
tags: ["AI Agent", "Claude Code", "Codex CLI", "自主编程", "Ralph Loop"]
category: "技术"
draft: false
---

## 从 ReAct 到 Ralph Loop：一个问题的演进

所有 AI 编程工具都面临同一个问题：**上下文断裂**。

你给 Claude Code 发一条指令，它写了几个文件、跑了测试、发现报错、修了一轮——然后停下来等你说"继续"。你说"继续"，它又干了一轮——然后又停下来。如此反复，一个原本可以自动完成的任务被切成了十几个人工确认的碎片。

更糟糕的是，每次停顿都意味着上下文窗口在膨胀。几轮之后，agent 开始"健忘"——忘记最初的目标是什么、忘记之前试过哪些方案失败了、忘记代码库的整体结构。你不得不重新描述一遍需求，本质上是在帮 AI 维护它自己的记忆。

2025 年底，一个澳大利亚开发者 Geoffrey Huntley 用最简陋的方式解决了这个问题：一个 shell 脚本加一个 Markdown 文件。他把这个方案叫做 **Ralph Wiggum Technique**——名字来自《辛普森一家》里那个看起来呆呆的、但偶尔语出惊人的小孩。这个命名本身就带着一种极客式的自嘲：方案笨得要死，但它管用。

## Ralph Loop 的核心：比你想象的简单

Ralph Loop 的原始形态只有一行 shell：

```bash
while true; do cat PROMPT.md | claude -p --allowedTools "Edit,Write,Bash,Read" ; done
```

就这么简单。`claude -p` 是 Claude Code 的非交互（headless）模式，`-p` 表示 "print mode"，从 stdin 读入 prompt 后自主执行，完成后退出。外层的 `while true` 则确保——一旦 Claude 退出（不管是完成了还是觉得"我做完了"），立刻带着同一份 PROMPT.md 重新启动一轮新的会话。

这看起来粗暴，但细想一下，它解决了上面说的所有问题：

**上下文不会膨胀** —— 每轮都是全新会话，上下文窗口从零开始。agent 不会被历史对话淹没。

**目标永不丢失** —— PROMPT.md 是持久化在磁盘上的，每轮都会被完整注入。不管 agent 之前做了什么、忘了什么，下一轮它都能重新理解目标。

**进度可以累积** —— agent 每轮的工作成果（代码修改、文件创建）都留在了文件系统上。下一轮的 agent 看到的是上一轮修改后的代码库，自然能接着干。

## 从粗暴循环到智能循环：Stop Hook

原始的 `while true` 方案有一个明显缺陷：agent 每次 session 结束后都会重启，哪怕任务已经完成了。PROMPT.md 里写着"实现用户登录功能"，agent 第三轮就实现完了，但第四轮还是会被叫起来——它可能就开始画蛇添足，加一些没人要的 feature。

解决方案是 Claude Code 的 **Stop Hook**。这是 Claude Code hooks 系统中的一个生命周期事件——当 Claude 完成一轮响应准备停下时触发。你可以在这个 hook 里做判断："任务真的完成了吗？"

一个最基本的 Stop Hook 配置长这样：

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Check if all tasks in PROMPT.md are complete. If not, respond with {\"ok\": false, \"reason\": \"what remains to be done\"}."
          }
        ]
      }
    ]
  }
}
```

这里用了 Claude Code 的 **prompt-based hook**——一种用 LLM（默认 Haiku）做判断的 hook 类型。当 Claude 准备停下时，Haiku 会被调用来评估"PROMPT.md 里的任务做完了没"。如果返回 `"ok": false`，Claude 会收到 `reason` 作为反馈，继续工作；如果 `"ok": true`，则正常结束。

这就把原始的"无脑重启"升级为了"智能续航"——只在任务未完成时才继续，完成后优雅退出。

如果你需要更强的验证能力，还可以用 **agent-based hook**——它会启动一个子 agent，这个子 agent 可以读文件、跑命令、检查测试结果，然后再做出"继续还是停止"的判断：

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "agent",
            "prompt": "Verify that all unit tests pass and the feature works as described in PROMPT.md. Run the test suite and check results.",
            "timeout": 120
          }
        ]
      }
    ]
  }
}
```

## PROMPT.md 的设计：Ralph Loop 的灵魂

如果说 Stop Hook 是 Ralph Loop 的心跳，那 PROMPT.md 就是它的大脑。一份好的 PROMPT.md 决定了 agent 能不能在无人值守的情况下持续输出有价值的工作。

一份生产级 PROMPT.md 的典型结构：

```markdown
# 目标

实现完整的用户认证模块，包含注册、登录、密码重置和 JWT token 管理。

# 约束

- 使用 TypeScript + Express
- 密码用 bcrypt 加盐哈希，salt rounds = 12
- JWT 过期时间 15 分钟，refresh token 7 天
- 所有接口需要有对应的单元测试，覆盖率 > 80%
- 不使用 ORM，直接写 SQL（项目用 PostgreSQL）

# 里程碑

1. [ ] 数据库 migration：users 表、refresh_tokens 表
2. [ ] 注册接口 POST /auth/register
3. [ ] 登录接口 POST /auth/login
4. [ ] Token 刷新接口 POST /auth/refresh
5. [ ] 密码重置流程（发邮件 + 验证 link）
6. [ ] 中间件：requireAuth, requireRole
7. [ ] 集成测试通过

# 进度记录

> agent 每完成一个里程碑后，在这里追加记录

（由 agent 自动更新）
```

关键设计原则：

**里程碑必须有 checkbox** —— 这让 agent 可以自主跟踪进度。每完成一项就勾掉一项，Stop Hook 可以通过检查是否全部勾选来判断任务是否结束。

**包含"进度记录"区域** —— 让 agent 每轮都在 PROMPT.md 里追加一行自己这轮做了什么。下一轮的 agent 读到这个文件时，能快速理解前面的人做了什么、哪些尝试失败了。这就是跨 session 的"记忆"。

**约束要具体** —— 不要写"代码质量要好"，要写"测试覆盖率 > 80%"。agent 需要明确的、可验证的条件。

## 防止无限循环：Stop Hook 的自保机制

Stop Hook 有一个关键细节：当 Stop Hook 返回 `"ok": false` 让 Claude 继续工作时，Claude 完成新一轮后会再次触发 Stop Hook。如果你的 hook 逻辑有 bug（比如永远返回 false），agent 会陷入无限循环。

Claude Code 对此提供了一个 `stop_hook_active` 字段。你的 hook 脚本应该检查这个字段：

```bash
#!/bin/bash
INPUT=$(cat)
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active')" = "true" ]; then
  exit 0  # 已经是 Stop Hook 触发的续航轮次，允许停止
fi
# ... 正常的完成度检查逻辑
```

实际生产中还有几个防护手段：

- 设置最大循环次数（比如在 PROMPT.md 里写"最多执行 20 轮"）
- 用 timeout 限制每轮的最大执行时间
- 在新 Git 分支上运行，方便 rollback

## 官方化：/goal 命令的诞生

Ralph Loop 在社区迅速走红后，两大 AI 编程工具都把它做成了官方功能。

### Codex CLI /goal（2026.4.30，v0.128.0）

> 官方文档：[Follow a goal | Codex use cases](https://developers.openai.com/codex/use-cases/follow-goals)、[Slash commands](https://developers.openai.com/codex/cli/slash-commands)

OpenAI 在 Codex CLI 中推出 `/goal` 命令，本质上就是 Ralph Loop 的官方封装。使用方式：

```bash
codex --full-auto
> /goal 实现完整的 OAuth2 认证流程，包含 Google 和 GitHub 登录，通过所有测试
```

进入 `/goal` 模式后，Codex CLI 会：
1. 解析目标，拆分为子任务计划
2. 进入全自动循环：执行 → 验证 → 自我修正 → 继续
3. 持续运行直到目标达成或遇到无法解决的阻碍

运行过程中可以用 `/goal` 查看当前状态，也支持完整的生命周期管理：

```bash
/goal pause    # 暂停当前目标（agent 停止自动续航）
/goal resume   # 恢复暂停的目标
/goal clear    # 清除目标，回到普通交互模式
```

关键特点：
- **必须开启 Full Auto 模式**（`--full-auto`），因为需要自动批准所有文件编辑和命令执行
- **运行在 OS 级沙盒中**，只能编辑沙盒内文件、执行预定义允许列表中的命令
- **支持长时间运行**——社区报告有 14 小时、18 小时的持续执行案例
- **支持 pause/resume**——可以随时暂停和恢复目标，不丢失进度
- 推荐在新 Git 分支上运行，作为安全护栏

### Claude Code /goal（2026.5.12，v2.1.139）

> 官方文档：[Keep Claude working toward a goal](https://code.claude.com/docs/en/goal)、[Hooks guide](https://code.claude.com/docs/en/hooks-guide)

Anthropic 的实现走了另一条路。Claude Code 的 `/goal` 不要求 full-auto 模式，而是设置一个"完成条件"（completion condition）：

```
/goal all tests in test/auth pass and the lint step is clean
```

根据官方文档，`/goal` 的本质是一个 session 级别的 prompt-based Stop Hook 的快捷封装。每当 Claude 完成一轮工作后，系统会将完成条件和当前对话发送给一个小型快速模型（默认 Haiku）做 yes/no 判断。如果判断为"未完成"，Claude 会带着原因自动开始下一轮。

生命周期管理同样简洁：

```bash
/goal                    # 查看当前状态（运行时间、turn 数、token 消耗）
/goal clear              # 清除目标（stop/off/reset/none/cancel 均可）
```

官方推荐的有效完成条件应包含：
- **一个可测量的终态**：测试结果、构建退出码、文件数量、空队列
- **一个明确的验证方式**：比如"`npm test` exits 0"或"`git status` is clean"
- **不可打破的约束**：比如"不修改其他测试文件"

条件最长支持 4000 字符。如果想限制运行时间，可以在条件中加入 `or stop after 20 turns`。

它还支持多种运行模式：交互模式、`-p` headless 模式、Remote Control 模式。这意味着你可以在 CI/CD 中通过 `-p` 模式使用 `/goal`，也可以在手机上通过 Remote Control 监控执行进度：

```bash
# 非交互模式：一次性运行直到条件满足
claude -p "/goal CHANGELOG.md has an entry for every PR merged this week"
```

Session 中断后恢复时（`--resume`），活跃的 goal 会自动恢复，turn 计数和 timer 重置。

### 两种 /goal 的设计哲学差异

| 维度 | Codex /goal | Claude Code /goal |
|------|-------------|-------------------|
| 权限 | 必须 full-auto，all-in | 不强制，渐进式 |
| 隔离 | OS 沙盒，物理隔离 | Hook 系统，逻辑隔离 |
| 评估机制 | 内置自评循环 | 独立小模型（Haiku）判断 |
| 生命周期 | pause / resume / clear | clear（stop/off/reset/none/cancel） |
| 反馈 | 终端日志 + `/goal` 状态查看 | overlay 面板（时间/turns/tokens） |
| 非交互 | `codex --full-auto` + `/goal` | `claude -p "/goal ..."` |
| 定位 | "放出去跑的 worker" | "有交付标准的 agent" |

## 类似范式的框架横向对比

Ralph Loop 不是孤例。这种"目标驱动 + 自主循环 + 自我验证"的模式正在成为 AI agent 架构的标配。

**AutoGPT / BabyAGI（2023）** 是最早的尝试。AutoGPT 的 Task Loop 和 BabyAGI 的"执行 → 创建新任务 → 排优先级"三 agent 架构，都是这个范式的先驱。但它们缺乏有效的终止条件判断，经常陷入无意义循环。Ralph Loop 的 Stop Hook 机制正是对这个问题的回答。

**SWE-agent（Princeton，2024）** 用 observe → think → act 循环在受限 shell 中自主修 bug。它引入了"Agent-Computer Interface"——为 agent 设计专门的、结构化的操作界面，而不是让它面对原始终端输出。这个思想和 Ralph Loop 中用 PROMPT.md 作为"agent 与目标的接口"异曲同工。

**Devin（Cognition AI）** 实现了分层规划架构：顶层 planner 理解目标、拆分阶段，底层 executor 在沙盒中执行。每阶段完成后控制权返回 planner 重新规划。这本质上是 Ralph Loop 的"企业级版本"——多层级、有状态管理、有专门验证层。

**Cursor Background Agent（2026）** 把类似能力搬到了云端。用户把任务交给 background agent，它在远程沙盒中自主工作，完成后通知用户 review。理念相同，但执行环境从本地终端变成了云服务。

**Gemini CLI Subagents（2026）** 走了另一条路。它不是让单个 agent 循环，而是通过 subagent 分治：主 agent 负责规划和协调，具体任务委派给独立子 agent 在隔离上下文中执行。这解决了长循环中上下文爆炸的问题，代价是架构更复杂。

## 实战：从零搭建一个 Ralph Loop

如果你想现在就试试，不需要等官方的 `/goal` 命令。用 Claude Code 的 hooks 系统就能自己搭建一个生产级的 Ralph Loop。

### 第一步：创建 PROMPT.md

在项目根目录创建：

```markdown
# 目标

将项目中所有 JavaScript 文件迁移为 TypeScript，确保类型安全且通过 tsc --noEmit 检查。

# 规则

- 保持现有功能不变，只做类型迁移
- 优先使用具体类型，避免 any
- 每个文件迁移后运行 tsc --noEmit 确认无错误
- 迁移顺序：utils/ → services/ → controllers/ → routes/

# 进度

（由 agent 自动更新）
```

### 第二步：配置 Stop Hook

在 `.claude/settings.json` 中添加：

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Read PROMPT.md in the project root. Check if all JavaScript files have been migrated to TypeScript and tsc --noEmit passes without errors. If migration is incomplete, respond with {\"ok\": false, \"reason\": \"description of what remains\"}. If complete, respond with {\"ok\": true}."
          }
        ]
      }
    ]
  }
}
```

### 第三步：在新分支上启动

```bash
git checkout -b feat/ts-migration
claude -p "Read PROMPT.md and begin the TypeScript migration. Update the progress section in PROMPT.md after completing each directory." \
  --allowedTools "Edit,Write,Bash,Read,Grep"
```

如果你想要完整的 `while true` 循环（不依赖 Stop Hook），用这种方式：

```bash
git checkout -b feat/ts-migration
while true; do
  claude -p "$(cat PROMPT.md)" --allowedTools "Edit,Write,Bash,Read,Grep"
  # 检查是否所有 .js 文件都已转为 .ts
  if [ -z "$(find src/ -name '*.js' -not -path '*/node_modules/*')" ]; then
    echo "Migration complete!"
    break
  fi
  sleep 2
done
```

### 第四步：监控

开另一个终端窗口，实时观察进度：

```bash
watch -n 5 'echo "=== JS files remaining ===" && find src/ -name "*.js" | wc -l && echo "=== TS files created ===" && find src/ -name "*.ts" | wc -l && echo "=== TSC errors ===" && npx tsc --noEmit 2>&1 | tail -3'
```

## 什么时候不该用 Ralph Loop

Ralph Loop 不是银弹。以下场景它可能不适用：

**需要人类判断的设计决策** —— 如果任务涉及 API 设计、架构选型这类没有客观标准的决策，agent 无法自我验证"设计是否好"，容易在自己的决策上自我强化。

**依赖外部服务的任务** —— 如果任务需要调用第三方 API、操作数据库，长时间无人值守运行可能产生不可逆的副作用。

**代码库缺少测试的项目** —— Ralph Loop 的自我验证严重依赖自动化测试。如果项目没有测试，agent 就失去了判断"我改对了没"的能力，可能引入大量隐蔽 bug。

**Token 预算有限时** —— 一个 14 小时的 Ralph Loop session 可能消耗数百万 token。在启动之前确认你的预算足够。

## 结语：Agent 编程的本质

Ralph Loop 的意义不在于技术有多复杂——它其实简单到令人发指。真正的洞见是：**让 AI agent 持续有效工作的关键不是更大的模型或更长的上下文窗口，而是一套外部的持久化机制**：磁盘上的目标文件、git 上的代码状态、hook 系统提供的"心跳检测"。

这和人类程序员的工作方式其实是一样的：我们也不是把所有上下文装在大脑里。我们用 TODO 列表记录目标、用 git 追踪进度、用 CI 验证正确性。Ralph Loop 只不过是把这套人类早就在用的工程实践，适配给了 AI agent。

从 Geoffrey Huntley 的一行 shell 脚本，到 OpenAI 和 Anthropic 的官方 `/goal` 命令，再到 Devin 和 Cursor 的云端 agent——这条演进线索告诉我们一件事：**AI 编程的未来不是"更聪明的 AI"，而是"更好的 AI 操作系统"**。模型是 CPU，PROMPT.md 是内存，Stop Hook 是中断机制，git 是持久化存储。我们正在为 AI 建造它们的操作系统。
