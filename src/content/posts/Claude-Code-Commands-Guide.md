---
title: Claude Code 黑科技手册：10 个大多数人不知道的隐藏玩法
published: 2026-04-27
description: 你以为 Claude Code 只是个聊天框？自定义命令、Hooks 自动化、多 Agent 并行、手机遥控、AI 审查 AI……这些骚操作才是它真正的杀手锏。
tags: ["Claude Code", "AI", "开发工具", "效率"]
category: 工具
draft: false
---

大多数人用 Claude Code 的方式是：打开终端，输入需求，等它写完代码，然后手动检查。这就像买了一台高性能跑车却只用来上下班代步——能用，但浪费了 90% 的能力。

这篇文章不讲基础命令。我要聊的是那些藏在文档深处、需要你翻好几页才能找到、但一旦用上就回不去的「黑科技」。每个技巧都配有可以直接复制的配置和代码。

## 1. 自定义 Slash Command：把你的工作流变成一键命令

你知道 Claude Code 的 `/` 命令可以自己造吗？

在项目根目录创建 `.claude/commands/` 文件夹，往里面扔一个 Markdown 文件，文件名就是命令名。比如创建一个 `.claude/commands/review.md`：

```markdown
---
description: 审查当前分支的变更
allowed-tools: Bash, Read, Grep
---

请审查当前分支与 main 分支的差异：

当前 diff：
!`git diff main...HEAD`

最近提交记录：
!`git log --oneline main...HEAD`

重点关注：
1. 是否有安全隐患（硬编码密钥、SQL 注入等）
2. 是否有性能问题（N+1 查询、不必要的循环等）
3. 是否有明显的逻辑错误
4. 代码风格是否一致

给出具体的改进建议，按严重程度排序。
```

之后在 Claude Code 里直接输入 `/review` 就能用了。

这里有几个关键技巧。`!` 前缀后跟反引号包裹的命令会在发送给 Claude 之前执行，把命令输出直接注入 prompt 里——Claude 拿到的是真实的 diff 内容，而不是一个"请你执行 git diff"的指令。`$ARGUMENTS` 占位符可以接收你在命令后面追加的参数，比如 `/review --focus security` 里的 `--focus security` 就会替换到 `$ARGUMENTS` 的位置。而 `$1`、`$2` 可以接收位置参数。

再来一个更实用的例子——一键生成 commit message：

```markdown
---
description: 根据 staged changes 生成 commit
allowed-tools: Bash
model: haiku
argument-hint: <commit type: feat|fix|refactor|docs>
---

Staged changes：
!`git diff --cached`

请根据以上变更生成一条 conventional commit message。
commit 类型：$1（如未指定，请自行判断）

要求：
- 标题不超过 72 字符
- 用中文写 body 部分
- 直接执行 git commit，不要问我确认
```

注意 `model: haiku` 这一行——对于这种简单任务，指定用 Haiku 模型可以大幅降低成本，响应也更快。

放在 `.claude/commands/` 里的命令跟着项目走，团队成员 clone 下来就能用。放在 `~/.claude/commands/` 里的则是你的个人全局命令。

## 2. Hooks：给 Claude 装上「自动驾驶」

Hooks 是 Claude Code 最被低估的特性。它让你在 Claude 的生命周期里插入自动执行的 shell 命令——编辑文件后自动 format、执行危险命令前拦截、任务完成后发通知，全都不需要你手动干预。

在 `~/.claude/settings.json` 里加一段配置就行：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write"
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "osascript -e 'display notification \"Claude Code 需要你的注意\" with title \"Claude Code\"'"
          }
        ]
      }
    ]
  }
}
```

这段配置做了两件事：每次 Claude 编辑或写入文件后，自动用 Prettier 格式化；每次 Claude 等待你输入时，弹出 macOS 系统通知——从此你可以安心切到别的窗口干活，不用盯着终端。

Hooks 的生命周期事件多达 20+ 种。几个最实用的：

**PreToolUse** 在工具调用之前触发，可以拦截危险操作。比如阻止 Claude 碰你的 `.env` 文件：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path // empty' | grep -qE '(\\.env|credentials)' && echo 'Blocked: 不允许修改敏感文件' >&2 && exit 2 || exit 0"
          }
        ]
      }
    ]
  }
}
```

退出码 2 表示「拦截」，Claude 会收到你 stderr 里的反馈并自动调整策略。

**SessionStart** 在会话开始时触发，`compact` matcher 专门匹配上下文压缩后的重启场景——你可以用它把被压缩掉的关键信息重新注入：

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "compact",
        "hooks": [
          {
            "type": "command",
            "command": "echo '提醒：本项目使用 Bun 而非 npm；提交前必须通过 bun test；当前 sprint 重点是 auth 重构。'"
          }
        ]
      }
    ]
  }
}
```

## 3. Headless 模式：让 Claude 变成你 CI 管道里的打工人

`claude -p` 是一切自动化的起点。它跳过交互界面，直接给 prompt 拿结果。

最基础的用法——用 Claude 自动生成 commit message：

```bash
claude -p "看看我的 staged changes，生成一条合适的 commit message 并执行 commit" \
  --allowedTools "Bash(git diff *),Bash(git log *),Bash(git status *),Bash(git commit *)"
```

`--allowedTools` 的通配符写法很讲究：`Bash(git diff *)` 中空格 + `*` 表示前缀匹配，允许所有以 `git diff ` 开头的命令。没有空格的 `Bash(git diff*)` 会匹配到 `git diff-index`——这是官方文档里特别提醒的坑。

更强大的是结构化输出。你可以让 Claude 从代码库里提取结构化数据，输出严格符合 JSON Schema 的结果：

```bash
claude -p "分析 src/ 目录，列出所有暴露的 API 端点" \
  --output-format json \
  --json-schema '{
    "type": "object",
    "properties": {
      "endpoints": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "method": {"type": "string"},
            "path": {"type": "string"},
            "auth_required": {"type": "boolean"}
          },
          "required": ["method", "path", "auth_required"]
        }
      }
    },
    "required": ["endpoints"]
  }' | jq '.structured_output'
```

这东西配合 CI/CD 简直是降维打击。写一个 GitHub Action，每次 PR 自动做安全审查：

```yaml
# .github/workflows/ai-review.yml
name: AI Security Review
on: [pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: AI Review
        run: |
          gh pr diff ${{ github.event.pull_request.number }} | \
          claude -p --bare \
            --append-system-prompt "你是一个安全工程师，审查代码变更中的安全漏洞。" \
            --output-format json
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

`--bare` 参数跳过所有本地配置（hooks、plugins、MCP servers、CLAUDE.md），确保 CI 环境下结果完全可复现。

## 4. Subagents：分身术，让多个 Claude 同时替你打工

当你告诉 Claude "调研一下这个项目的认证模块"时，它可能会读一大堆文件，吐一大坨搜索结果到你的上下文里——然后你的 context window 就被撑爆了。

Subagent 解决的就是这个问题。它在独立的上下文窗口里工作，完事后只把摘要返回给主对话。

你可以创建自定义 subagent。在 `.claude/agents/` 下写一个 Markdown 文件：

```markdown
---
name: test-runner
description: 运行测试并修复失败用例。写完代码后主动使用。
tools: Bash, Read, Edit, Grep, Glob
model: sonnet
background: true
---

你是一个测试专家。被调用时：

1. 运行完整测试套件
2. 分析失败原因
3. 修复失败的测试
4. 重新运行验证
5. 只向主对话报告最终结果（通过/失败数量 + 修复摘要）

不要在回复中输出完整的测试日志。
```

`background: true` 是关键——它让这个 subagent 在后台运行，你可以继续在主对话里写代码。按 `Ctrl+B` 也能把一个正在前台运行的 subagent 扔到后台。

真正的杀手锏是并行。你可以一句话让 Claude 同时派出多个 agent：

```
分别用 subagent 并行调研 authentication、database 和 API 三个模块的架构
```

三个 agent 同时开工，各自在自己的上下文里翻文件、读代码，最后 Claude 把三份报告综合起来给你。

## 5. Git Worktree 隔离：给 Agent 一个沙箱

让 AI 直接改你的工作目录总觉得不踏实？`isolation: worktree` 让 subagent 在一个独立的 git worktree 里工作——它是你仓库的一个平行拷贝，agent 在里面随便改，改完如果不满意直接丢掉，不影响你的一行代码。

```markdown
---
name: refactor-experiment
description: 在隔离环境中尝试重构方案
tools: Bash, Read, Edit, Write
isolation: worktree
---

你在一个隔离的 git worktree 中工作。大胆尝试重构方案。
完成后总结你的变更和取舍，由主对话决定是否合并。
```

这个特性和 `/batch` 命令搭配使用效果拉满——`/batch` 可以自动为每个并行任务创建独立的 worktree，多个 agent 同时在不同分支上改代码，互不干扰。

## 6. Agent Memory：让 AI 越用越聪明

普通 subagent 每次调用都从零开始。但如果你给它加上 `memory` 字段，它就有了跨会话的持久记忆：

```markdown
---
name: code-reviewer
description: 代码审查专家，会积累项目知识
tools: Read, Grep, Glob, Bash
memory: project
---

你是一个高级代码审查员。

在审查代码时，请参考你的 agent memory 中积累的项目知识。
审查完成后，将发现的模式、约定和常见问题记录到你的 memory 中。

重点关注：
- 项目特有的编码约定
- 反复出现的问题模式
- 架构决策的上下文
```

`memory` 有三个级别：`user`（存在 `~/.claude/agent-memory/`，跨项目通用）、`project`（存在 `.claude/agent-memory/`，可以提交到 git 让团队共享）、`local`（本地项目级，不提交）。

Agent 会自动维护一个 `MEMORY.md` 文件，里面记录它在多次会话中积累的洞察。用得越久，它对你项目的理解越深。

## 7. Prompt-based Hooks + Agent Hooks：让 AI 审查 AI

这是我最喜欢的黑科技。你可以配置一个 Hook，在 Claude 说"我做完了"的时候，自动用另一个 AI 来检查它的工作：

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "检查所有被要求完成的任务是否真的完成了。如果有遗漏，返回 {\"ok\": false, \"reason\": \"还需要做什么\"}。"
          }
        ]
      }
    ]
  }
}
```

`type: "prompt"` 表示这是一个 AI 驱动的 hook——Claude Code 会把当前上下文发给一个轻量模型（默认 Haiku），让它判断任务是否真的完成。如果判定没完成，Claude 会继续干活，把 `reason` 当作下一步指令。

更强力的是 `type: "agent"`，它会启动一个有工具访问权限的 subagent 来验证：

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "agent",
            "prompt": "运行测试套件，验证所有单元测试通过。如果有失败，返回失败详情。",
            "timeout": 120
          }
        ]
      }
    ]
  }
}
```

这意味着 Claude 每次说"搞定了"，都会有另一个 agent 自动跑一遍测试来验证。再也不用人肉 review "你确定改完了？"

## 8. 手机遥控：不在电脑前也能指挥 Claude

这个特性知道的人极少。在 Claude Code 里输入：

```
/mobile
```

它会生成一个二维码。用手机扫一下，你就可以在手机上给 Claude 发指令、查看输出了。

想象一下：你在吃午饭的时候掏出手机，让 Claude 跑一个重构任务，回到座位时代码已经改好了。

类似的还有 `/remote-control`（从 claude.ai 网页端控制本地 Claude Code）和 `/desktop`（切换到桌面 App 继续操作）。这三个命令组合起来，你几乎可以在任何设备上操控同一个 Claude Code 实例。

## 9. CLAUDE.md 分层记忆系统：比你想的强大得多

大多数人知道 CLAUDE.md 是项目配置文件，但很少有人用到它的全部能力。

Claude Code 的记忆系统实际上是分层的。`~/.claude/CLAUDE.md` 是全局记忆，对所有项目生效，适合放你的编码风格偏好和通用规则。项目根目录的 `CLAUDE.md` 是项目级记忆，可以提交到 git 让团队共享。而子目录里还可以放自己的 `CLAUDE.md`——当 Claude 操作到该目录下的文件时，会自动加载对应的规则。

更灵活的方式是用 `.claude/rules/` 目录存放规则文件。你可以在 frontmatter 里指定 `globs` 让规则只对特定文件生效：

```markdown
---
globs: "*.test.ts,*.spec.ts"
---

测试文件规则：
- 使用 describe/it 结构
- 每个 it 块只测试一个行为
- mock 外部依赖，不要 mock 内部模块
```

这样当 Claude 编辑测试文件时会自动加载这些规则，编辑其他文件时则不会。

真正的黑科技是 `/memory` 命令配合自动记忆功能。开启后，Claude 会自动把你在对话中提到的偏好写入 CLAUDE.md——比如你说"以后都用 Bun 不要用 npm"，它会自己记住，下次就不用你重复了。

## 10. Fork Mode：从同一起点并行探索多条路径

这是最新的实验性特性（需要设置 `CLAUDE_CODE_FORK_SUBAGENT=1`），但绝对值得尝试。

Fork 不同于普通 subagent——它继承了当前对话的完整历史。这意味着你不用重新解释背景，fork 出来的 agent 已经知道你们之前聊了什么。

```
/fork 尝试用 Redis 做缓存层
/fork 尝试用 Memcached 做缓存层
/fork 尝试用本地 LRU cache 做缓存层
```

三个 fork 从同一个上下文出发，各自实现不同的方案。你可以在下方面板里用方向键切换、查看各自进度，最后挑一个最好的方案合并。因为 fork 共享父会话的 prompt cache，所以成本比启动三个独立 subagent 低得多。

配合 `isolation: "worktree"`，每个 fork 还能在独立的 git worktree 里工作，真正做到互不干扰。

---

这 10 个技巧只是冰山一角。Claude Code 的能力边界远比"在终端里和 AI 聊天"宽广得多——它本质上是一个可编程的 AI agent 框架，Slash Commands 是你给它写的剧本，Hooks 是自动触发器，Subagents 是它的分身，而 Headless 模式让它融入你的整个工程体系。

把这些拼在一起，你得到的不是一个更好的代码补全工具，而是一个可以 7x24 帮你干活的 AI 工程团队。
