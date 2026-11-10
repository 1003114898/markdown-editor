# Markdown 编辑器

一个 Windows 桌面 Markdown 编辑器。用 Go + Wails v2 写成，前端是纯 HTML / CSS / JavaScript，没有 npm 依赖，也没有前端构建步骤。

**单个 exe，15,581,696 字节（约 14.9 MiB）。** 不打包 Chromium，不附带 DLL，不需要安装，下载即用。

A lightweight Windows Markdown editor built with Go and Wails v2. The frontend is plain HTML/CSS/JS with no npm dependencies.

> 本项目面向 Windows，依赖系统已安装的 WebView2 Runtime（Windows 11 一般自带）。目前只在 Windows 11 上完成构建与运行验证。

## 下载

到 [Releases](https://github.com/1003114898/markdown-editor/releases) 下载 `markdown.exe`，双击运行。

| 项目 | 数值 |
| --- | --- |
| 文件 | `markdown.exe`，单文件，无随包目录 |
| 大小 | 15,581,696 字节 ≈ 14.9 MiB |
| SHA-256 | `309385dc9a3f7258f4da33bc419ee5f96d70d39efa1380c7100e5808b9018a98` |
| 依赖 | 系统 WebView2 Runtime |

用 PowerShell 校验：

```powershell
Get-FileHash .\markdown.exe -Algorithm SHA256
```

## 为什么这么小

基于 Electron 的桌面编辑器会把整套 Chromium 渲染引擎打进安装包，这类安装包通常在数百 MB 量级。本程序不自带浏览器内核：

- 界面交给系统 WebView2 渲染，不打包 Chromium
- Go 静态编译，前端文件通过 `//go:embed` 打进二进制
- 前端是原生 HTML / CSS / JS，没有框架、没有 `node_modules`、没有 npm 依赖
- Markdown 渲染用 goldmark，没有引入 PDF 解析、OCR 或图像识别模型

结果是 14.9 MiB 的一个文件。同类工具里这个体积属于极简一档。

> 诚实边界：WebView2 Runtime 的体积**不在**这 14.9 MiB 里。它由系统提供，多个程序共用。Windows 11 一般已自带；如果系统没有，需要先安装微软的 WebView2 Runtime，那部分体积在百 MB 量级。这是把浏览器内核换成系统级依赖，不是把体积藏起来。精简系统首次运行可能失败，这一点省不掉。

## 功能一览

### 编辑与预览

- 输入即预览，由 Go 侧的 goldmark 渲染
- 三种视图：分栏、仅编辑、仅预览；分栏宽度可拖动分隔条调整
- 编辑区与预览区滚动位置双向同步
- 标题目录侧栏，点击跳转
- 代码块语法高亮，右上角一键复制
- 深色 / 浅色主题，四档字号
- 状态栏显示文件名、未保存标记、字数与行数
- 原生右键菜单可用，复制、粘贴、剪切、撤销等基础操作不被拦截
- `Tab` 键在编辑区插入两个空格

### 文件与多标签

- 一个窗口里开多个标签，分别保存，独立标记未保存状态
- 新建、打开、保存、另存为；另存为自动补 `.md` 后缀
- 导出为带内联样式的独立 HTML 文件
- 拖放文件到窗口打开
- 文件关联与命令行打开：`markdown.exe path\to\file.md`
- 单实例：程序已运行时再次打开文档，会在已有窗口新增标签，不再启动新进程
- 关闭窗口时若有未保存内容，弹出「全部保存 / 放弃修改 / 取消」
- 会话恢复：编辑过程自动落盘草稿，下次启动恢复标签与内容

### 查找与替换

- 普通查找、正则表达式、区分大小写三种开关
- 查找框与替换框支持 `\n`、`\r`、`\t`、`\\` 转义序列
- 替换框支持 `$1`、`$2`、`$&`、`$$`、`$<name>` 反向引用
- 上一个 / 下一个（`Shift+Enter` / `Enter`）、替换单个、全部替换
- 非法正则会显示错误状态；匹配数量上限 20000

### Markdown 语法

- GFM：表格、删除线、任务列表、自动链接
- 脚注、分隔线、引用、行内代码、围栏代码块
- 标题自动生成 id，供目录跳转
- 相对路径的本地图片内联为 data URI（单张上限 8 MiB）
- 预览里的外部链接交给系统浏览器打开
- 按 `F1` 或点「帮助」打开内置的完整语法示例文档

### Word 导入

- `.docx`：解析 `word/document.xml`，转换标题、粗体、斜体、有序 / 无序列表、表格、超链接
- `.doc`：旧二进制格式，只做启发式正文提取
- 导入结果是一个未保存的新标签，默认另存为同名 `.md`，不会写回原 Word 文件

## 从源码构建

### 获取源码

```bash
git clone https://github.com/1003114898/markdown-editor.git
cd markdown-editor
```

### 环境要求

| 组件 | 版本 |
| --- | --- |
| Windows | 10 / 11 |
| Go | 1.25+ |
| Wails CLI | v2.16.0 |
| WebView2 Runtime | 系统已安装 |

### 命令

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@v2.16.0
wails build
```

产物在 `build/bin/markdown.exe`。这是一个可单独分发的 GUI 程序，前端文件通过 `//go:embed` 打进二进制，不需要附带额外目录。

`frontend/wailsjs/` 是 Wails 自动生成的 Go 方法绑定，构建时会刷新，不要手工修改。改完 Go 或前端源码后重新执行 `wails build` 即可。

> git 仓库只包含源码。编译好的 exe 在 [Releases](https://github.com/1003114898/markdown-editor/releases) 提供。构建产物、本地打包目录和会话草稿都不入库。

## 快捷键

| 快捷键 | 操作 |
| --- | --- |
| `Ctrl+N` | 新建标签 |
| `Ctrl+O` | 打开文档 |
| `Ctrl+W` | 关闭当前标签 |
| `Ctrl+S` | 保存 |
| `Ctrl+Shift+S` | 另存为 |
| `Ctrl+F` | 查找 |
| `Ctrl+H` | 查找并替换 |
| `Enter` / `Shift+Enter`（查找栏内） | 下一个 / 上一个 |
| `Esc` | 关闭查找栏 |
| `F1` | 打开 Markdown 语法示例 |
| `Tab`（编辑区） | 插入两个空格 |

## 支持的文件

打开对话框支持 `.md`、`.markdown`、`.txt`、`.doc`、`.docx`。命令行与拖放另外接受 `.mdown`、`.text`、`.rst` 以及无后缀文件，这些按纯文本读入编辑区。

Word 文件会转成 Markdown 文本。其余后缀都是纯文本，`.rst` 不会按 reStructuredText 规则渲染。

## 会话与隐私

编辑过程中，所有标签的内容会以 700 ms 防抖写入用户配置目录：

```
%APPDATA%\markdown-editor\session.json
```

这是**明文 JSON**，包含未保存的草稿正文。下次启动自动恢复。通过命令行或文件关联打开指定文档时，不恢复旧会话，避免混入无关标签。想清空草稿，删除该文件即可。

如不希望草稿内容落盘，请不要在编辑器里写入敏感内容，或在退出前手动保存并清空会话。

## 已知边界

- 只面向 Windows。macOS / Linux 需要替换 WebView2 相关配置，本项目没有做适配与验证。
- **不支持 PDF 导入，也不支持扫描件 OCR。** 这两个方向做过试验，识别质量与排版还原不达标，已从代码中彻底移除。
- Markdown 源文档里的原生 HTML 标签不会渲染。这是刻意的安全设置（未启用 goldmark 的 `html.WithUnsafe()`），可避免脚本注入。需要自定义 HTML 时，请用「导出 HTML」生成文件后自行编辑。
- `.doc` 导入是尽力而为。合并单元格、图片、文本框、页眉页脚等复杂排版不保证还原。
- 预览里的相对图片按当前文档所在目录解析。**未保存的新文档**没有基准目录，相对图片不会显示。
- 正则查找使用 JavaScript 正则引擎，没有执行超时。复杂嵌套量词作用于超长文本时可能卡顿。
- 单张图片超过 8 MiB 不内联，避免拖慢实时预览。

## 项目结构

```
main.go                 Wails 窗口配置、绑定、单实例与拖放
app.go                  文件读写、Markdown 渲染、会话、二次启动、导出 HTML
word.go                 .doc / .docx 转 Markdown
frontend/src/index.html 界面骨架
frontend/src/main.css   主题变量与布局
frontend/src/main.js    标签状态机、查找替换、滚动同步、快捷键
frontend/src/icon.svg   应用图标源图
frontend/wailsjs/       Wails 自动生成的绑定
build/                  Windows 图标与打包资源
wails.json              项目配置
```

## 依赖

- [Wails](https://wails.io/) v2.16.0 — 桌面壳与 Go / JS 绑定
- [goldmark](https://github.com/yuin/goldmark) v1.8.7 — Markdown 解析，启用 GFM 与 Footnote 扩展
- [goldmark-highlighting](https://github.com/yuin/goldmark-highlighting) v2 + [chroma](https://github.com/alecthomas/chroma) v2 — 代码高亮

完整依赖见 `go.mod`。第三方依赖各自遵循其许可证。

## 贡献

欢迎提 issue 和 PR。提交前请执行一次 `wails build`，确认能正常出包。

## 许可证

本项目采用 [MIT License](LICENSE)。
