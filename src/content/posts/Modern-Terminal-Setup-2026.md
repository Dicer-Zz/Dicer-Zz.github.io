---
title: "我的 2026 终端方案：Ghostty + Starship + Lazygit + Yazi + Claude Code"
published: 2026-05-06
description: "折腾终端这件事，本质上是在回答一个问题：日常开发中，你的手指在哪些操作上浪费了最多时间？这篇文章分享我当前的终端工具链——Ghostty 做渲染、Starship 做 prompt、Lazygit 管 Git、Yazi 管文件、Claude Code 做 AI 辅助——以及它们如何拼成一个流畅的工作流。"
image: "/gallery/cover/modern-terminal.png"
tags: ["终端", "工具链", "开发体验"]
category: "技术"
draft: false
---

## 为什么是这套组合

选终端工具链本质上是在回答一个问题：日常开发中，你在哪些操作上花了不必要的时间？对我来说答案很明确——频繁地在终端和 GUI 应用之间切换。看 diff 切到 Git GUI，浏览文件切到 Finder，问 AI 切到浏览器。这套方案的目标就是**把所有高频操作收拢到终端里**，用键盘完成一切。

## 1. Ghostty：Zig 写的 GPU 终端

Ghostty 是 Mitchell Hashimoto（HashiCorp 创始人）用 Zig 从零写的终端模拟器。选它的理由很简单：**它是我用过的启动最快、渲染最流畅的终端**。

Zig 的零开销抽象和手动内存管理让 Ghostty 的二进制体积极小，冷启动几乎是瞬时的。GPU 渲染走的是 Metal（macOS）/ OpenGL / Vulkan，滚动大量输出时帧率稳定，不会出现 iTerm2 那种"追不上日志"的情况。

macOS 上安装直接去 [ghostty.org](https://ghostty.org) 下载 .dmg，或者 brew：

```bash
brew install --cask ghostty
```

配置文件在 `~/Library/Application Support/com.mitchellh.ghostty/config.ghostty`，语法是 key = value，不需要 JSON 或 TOML：

```ini
# 主题
theme = "Catppuccin Mocha"

# 背景半透明 + macOS 毛玻璃
background-opacity = 0.90
background-blur = true

# 字体
font-family = "JetBrains Mono Nerd Font"
font-size = 14

# 窗口内边距
window-padding-x = 12
window-padding-y = 12
```

几个值得解释的选择：

`background-opacity = 0.90` 配合 `background-blur = true`——这是 macOS 原生的毛玻璃效果，不是简单的半透明。终端背后的窗口内容会被高斯模糊，视觉上非常舒服，同时又不会完全遮挡住背后的参考窗口。0.90 是我试下来最舒服的值：再低会分散注意力，再高毛玻璃效果就看不出来了。

`JetBrains Mono Nerd Font` 是必须的。Nerd Font 补丁包含了大量图标字符（、、 等），Starship 的 powerline 段落、Yazi 的文件图标、Lazygit 的 UI 元素都依赖这些字符。没有 Nerd Font，你看到的将是一堆方块。安装：

```bash
brew install --cask font-jetbrains-mono-nerd-font
```

## 2. Starship：跨 shell 的 prompt

Starship 是 Rust 写的 prompt 工具，跨 shell（zsh / bash / fish / PowerShell 都支持），配置统一，渲染极快。它替代的是 oh-my-zsh 主题里那些缓慢的 prompt——Starship 通过异步检测 git 状态和语言版本，prompt 渲染时间通常在 10ms 以内。

```bash
brew install starship
```

在 `~/.zshrc` 末尾加一行：

```bash
eval "$(starship init zsh)"
```

配置文件在 `~/.config/starship.toml`。我的配置比较长，核心思路是用 **Catppuccin Mocha 调色板 + Powerline 风格分段**，从左到右依次显示：OS 图标 → 用户名 → 路径 → Git 分支/状态 → 语言版本 → Conda 环境 → 时间 → 命令耗时。

```toml
format = """
[](red)\
$os\
$username\
[](bg:peach fg:red)\
$directory\
[](bg:yellow fg:peach)\
$git_branch\
$git_status\
[](fg:yellow bg:green)\
$c\
$rust\
$golang\
$nodejs\
$python\
[](fg:green bg:sapphire)\
$conda\
[](fg:sapphire bg:lavender)\
$time\
[ ](fg:lavender)\
$cmd_duration\
$line_break\
$character"""

palette = 'catppuccin_mocha'
```

每个段落通过 `[](bg:X fg:Y)` 形成 Powerline 箭头过渡。颜色名 `red`、`peach`、`yellow` 等不是标准颜色，而是 Catppuccin Mocha 调色板的命名色——Starship 支持通过 `[palettes.catppuccin_mocha]` 定义自定义调色板：

```toml
[palettes.catppuccin_mocha]
rosewater = "#f5e0dc"
flamingo = "#f2cdcd"
red = "#f38ba8"
peach = "#fab387"
yellow = "#f9e2af"
green = "#a6e3a1"
sapphire = "#74c7ec"
lavender = "#b4befe"
crust = "#11111b"
# ... 完整调色板见 catppuccin/starship
```

几个实用的段落配置：

```toml
# 路径：最多显示 3 级，自动缩写
[directory]
style = "bg:peach fg:crust"
format = "[ $path ]($style)"
truncation_length = 3
truncation_symbol = "…/"

# 路径替换：常用目录用图标
[directory.substitutions]
"Documents" = "󰈙 "
"Downloads" = " "
"Developer" = "󰲋 "

# Git：分支名 + 状态
[git_branch]
symbol = ""
style = "bg:yellow"
format = '[[ $symbol $branch ](fg:crust bg:yellow)]($style)'

# 命令耗时：超过默认阈值才显示
[cmd_duration]
show_milliseconds = true
format = " in $duration "
show_notifications = true
min_time_to_notify = 45000  # 超过 45 秒弹系统通知

# Vim 模式指示
[character]
success_symbol = '[❯](bold fg:green)'
error_symbol = '[❯](bold fg:red)'
vimcmd_symbol = '[❮](bold fg:green)'
```

`cmd_duration` 的 `show_notifications = true` 是一个容易忽略的好功能——当一个长时间命令（比如 `make` 或 `pytest`）执行超过 45 秒后，结束时会弹出 macOS 系统通知。这样你可以切去其他窗口做事，命令跑完了自动提醒你。

## 3. Lazygit：TUI 里的 Git 操作

Lazygit 是一个终端里的 Git UI。说实话，**它是这套方案里改变我工作流最大的工具**。

在用 Lazygit 之前，我的 Git 操作要么在命令行里打一串 `git add -p` / `git rebase -i`，要么切到 VS Code 的 Git 面板。前者繁琐，后者需要离开终端。Lazygit 让我可以在终端里完成几乎所有 Git 操作，而且比命令行快得多——stage 单个文件按 `space`，stage 单个 hunk 按 `enter` 进入文件再按 `space`，interactive rebase 在 commit 列表里按 `e`，cherry-pick 按 `C`。

```bash
brew install lazygit
```

直接在项目目录里输入 `lazygit` 就能启动。我习惯给它绑一个 alias：

```bash
alias lg='lazygit'
```

Lazygit 的默认配置已经足够好用，不需要太多自定义。配置文件在 `~/Library/Application Support/lazygit/config.yml`，如果你想调整可以参考官方文档。几个值得知道的默认快捷键：

| 操作 | 快捷键 |
|------|--------|
| Stage/Unstage 文件 | `space` |
| 进入文件查看 hunk | `enter` |
| Commit | `c` |
| Push | `P` |
| Pull | `p` |
| Interactive rebase | 在 commit 上按 `e` |
| Cherry-pick | `C` 复制，`V` 粘贴 |
| 切换面板 | `Tab` 或 `h/l` |
| 搜索 | `/` |

Lazygit 最让我惊艳的功能是 **交互式 rebase 的可视化操作**。在 commit 列表中按 `e` 进入 rebase 模式后，你可以用 `d` 删除 commit、`s` squash、`r` 重命名、`ctrl+j/k` 上下移动 commit 顺序——所有操作都在一个清晰的 TUI 界面里完成，不用面对 `git rebase -i` 打开的那个编辑器。

## 4. Yazi：异步文件管理器

Yazi 是 Rust 写的终端文件管理器，名字是"鸭子"的意思。它的前辈是 ranger（Python）和 lf（Go），但 Yazi 的异步 IO 设计让它在大目录下的响应速度远超这两个。

```bash
brew install yazi ffmpeg sevenzip jq poppler fd ripgrep fzf zoxide imagemagick font-symbols-only-nerd-font
```

后面一串依赖是可选的预览增强——ffmpeg 用于视频缩略图、poppler 用于 PDF 预览、imagemagick 用于图片预览。Yazi 会自动检测这些工具是否存在，有就用，没有就降级。

在 `~/.zshrc` 里加一个 shell wrapper，让 Yazi 退出时自动 cd 到你最后浏览的目录：

```bash
function y() {
    local tmp="$(mktemp -t "yazi-cwd.XXXXXX")" cwd
    command yazi "$@" --cwd-file="$tmp"
    IFS= read -r -d '' cwd < "$tmp"
    [ "$cwd" != "$PWD" ] && [ -d "$cwd" ] && builtin cd -- "$cwd"
    rm -f -- "$tmp"
}
```

现在输入 `y` 就能启动 Yazi，浏览完按 `q` 退出后，shell 会自动跳到你最后所在的目录。这个小细节非常实用——不然每次 Yazi 退出后你还在原来的目录，白浏览了。

Yazi 的几个亮点：

**实时预览**。右侧面板实时显示文件内容预览——代码文件有语法高亮（通过内置的 Syntect），图片直接在终端里渲染（需要终端支持 Sixel 或 Kitty 图形协议，Ghostty 支持），PDF 显示首页缩略图。

**批量重命名**。选中多个文件后按 `r`，Yazi 会打开 `$EDITOR` 让你批量编辑文件名。这比写一个 `for` 循环快太多了。

**Tab 多窗口**。按 `t` 新开一个 tab，在不同目录间切换。类似文件管理器的多标签页。

**插件系统**。Yazi 有一个 Lua 插件系统，社区已经有了 Git 状态显示、压缩包预览、FTP/SSH 远程浏览等插件。

## 5. Claude Code：终端里的 AI 结对

Claude Code 是 Anthropic 出的命令行 AI 编程助手。它直接在终端里运行，不需要打开任何 IDE 或浏览器。

```bash
npm install -g @anthropic-ai/claude-code
```

安装后在项目目录输入 `claude` 即可启动交互式会话。Claude Code 会自动读取项目结构和上下文，你可以用自然语言描述需求，它会生成代码、修改文件、运行命令。

Claude Code 和 GitHub Copilot / Cursor 最大的区别在于它是 **agentic** 的——它不只是补全当前行，而是能够自主地读文件、写文件、跑测试、看报错、修 bug，完成一整个多步骤的任务。你告诉它"给这个 API 加个分页功能"，它会自己去看现有代码、找到要改的文件、写代码、跑测试，中间遇到报错还会自己修。

几个我常用的模式：

**直接问问题**。启动 `claude` 后直接描述任务，比如"看一下 src/api/users.ts 为什么分页返回的数据不对"，它会自己去读文件、分析逻辑、给出修复方案。

**单次执行**。`claude -p "给所有 Python 文件加上 type hints"` 可以不进交互模式直接执行一次性任务。

**管道输入**。`cat error.log | claude -p "分析这个报错的根因"` 可以把任意输出通过管道传给 Claude 分析。

Claude Code 配合 Lazygit 的工作流特别顺畅：用 Claude Code 写代码 → 用 Lazygit 查看 diff 并逐 hunk stage → commit → push。整个过程不离开终端。

## 6. 配套工具

除了上面五个核心工具，还有几个小工具让整个体验更完整：

**eza**——`ls` 的现代替代，Rust 写的，支持图标、Git 状态、树状视图。

```bash
brew install eza

# 在 .zshrc 里加 alias
alias ls='eza --icons --git'
alias ll='eza -lbGF --icons --git'
alias la='eza -lbhHigmuSa --icons --git --time-style=long-iso'
alias lt='eza --tree --icons --git'
```

**zoxide**——`cd` 的智能替代。它记录你访问过的目录，之后只需要输入路径的一部分就能跳转。比如你去过 `/Users/me/Projects/my-awesome-project`，以后只需要 `z awesome` 就能跳过去。

```bash
brew install zoxide
echo 'eval "$(zoxide init zsh)"' >> ~/.zshrc
```

**zsh-autosuggestions + zsh-syntax-highlighting**——oh-my-zsh 插件，前者根据历史命令给出灰色建议（按 → 接受），后者实时高亮命令语法（合法命令绿色，不存在的命令红色）。

```bash
# oh-my-zsh 插件安装
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
git clone https://github.com/zsh-users/zsh-syntax-highlighting ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting

# .zshrc 里启用
plugins=(git zsh-autosuggestions zsh-syntax-highlighting)
```

## 7. 统一色彩：Catppuccin Mocha

整套方案的视觉一致性靠 **Catppuccin Mocha** 主题保证。Catppuccin 是一套低对比度的暖色调调色板，有 Latte（亮）、Frappe、Macchiato、Mocha（暗）四个变体。我用 Mocha（最深的暗色变体），背景色 `#1e1e2e`，文字色 `#cdd6f4`，对比度刚好不刺眼。

需要统一配色的地方：

| 工具 | 主题设置 |
|------|---------|
| Ghostty | `theme = "Catppuccin Mocha"`（内置） |
| Starship | `palette = 'catppuccin_mocha'`（自定义调色板） |
| Lazygit | 自动跟随终端颜色 |
| Yazi | `flavor = "catppuccin-mocha"`（社区 flavor） |
| bat（代码预览） | `export BAT_THEME="Catppuccin Mocha"` |

Ghostty 内置了 Catppuccin 主题，一行配置搞定。Starship 需要手动定义调色板（上面已经给了配置）。Lazygit 没有独立的主题系统，它直接使用终端的 ANSI 颜色——所以只要 Ghostty 的颜色是 Catppuccin，Lazygit 自动就是 Catppuccin 的配色。Yazi 可以从 [catppuccin/yazi](https://github.com/catppuccin/yazi) 安装官方 flavor。

## 日常工作流

最后串一下这些工具在日常开发中的典型使用流程：

打开 Ghostty → Starship 的 prompt 显示当前目录、Git 分支、语言版本 → 输入 `y` 启动 Yazi 浏览项目结构，找到要改的文件后按 `enter` 用 `$EDITOR` 打开 → 回到 shell，输入 `claude` 启动 Claude Code，描述需求让它帮你改代码 → 改完后输入 `lg` 启动 Lazygit，查看 diff、逐 hunk stage、写 commit message、push → 整个过程不离开终端窗口。

这套方案的核心理念是：**每个工具只做一件事，做到最好，然后通过终端这个统一界面串在一起**。Ghostty 负责把像素推到屏幕上，Starship 负责告诉你"你在哪"，Yazi 负责文件导航，Lazygit 负责版本控制，Claude Code 负责智力劳动。它们之间没有复杂的集成或插件依赖——共享的只是同一个终端、同一套颜色、同一个 shell 环境。

这可能就是 Unix 哲学在 2026 年的样子。
