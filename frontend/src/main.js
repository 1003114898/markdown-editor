(function () {
    'use strict';

    const WELCOME = [
        '# 欢迎使用 Markdown 编辑器',
        '',
        '左边写，右边看。**改动会在输入后自动预览**，不需要点按钮。',
        '',
        '## 能做什么',
        '',
        '- 多标签：一个窗口里同时打开多个文档，关闭后自动恢复会话',
        '- 导入 `.docx` / `.doc`，另存为 `.md`',
        '- 导出独立 HTML 文件',
        '- 查找替换：支持正则表达式与 `\\n`、`\\r`、`\\t`、`\\\\` 转义',
        '- 标题目录、代码高亮与一键复制',
        '- 编辑区与预览区滚动位置双向同步',
        '- 深色主题、字号设置、拖放打开文件、文件关联打开',
        '',
        '## 快捷键',
        '',
        '| 快捷键 | 操作 |',
        '| --- | --- |',
        '| `Ctrl+N` | 新建标签 |',
        '| `Ctrl+O` | 打开文档 |',
        '| `Ctrl+W` | 关闭当前标签 |',
        '| `Ctrl+S` | 保存 |',
        '| `Ctrl+Shift+S` | 另存为 |',
        '| `Ctrl+F` | 查找 |',
        '| `Ctrl+H` | 查找并替换 |',
        '| `Esc` | 关闭查找栏 |',
        '| `F1` | 打开 Markdown 语法示例 |',
        '',
        '## 支持的语法',
        '',
        '- 标题、粗体、*斜体*、~~删除线~~、[链接](https://wails.io)',
        '- 有序列表、无序列表、任务列表',
        '- 表格、引用、代码块、分隔线、脚注[^note]',
        '',
        '> 预览由 Go 侧的 goldmark 渲染，支持 GFM 扩展和代码语法高亮。',
        '',
        '```go',
        'func main() {',
        '    fmt.Println("Hello, Wails!")',
        '}',
        '```',
        '',
        '- [x] 打开软件',
        '- [ ] 写点什么',
        '',
        '---',
        '',
        '[^note]: 脚注由 goldmark 的 Footnote 扩展渲染。',
        '',
        '> 点工具栏的「帮助」可以打开完整的 Markdown 语法示例。',
        ''
    ].join('\n');

    // 帮助文档。刻意让每一节都用真实语法书写，这样右侧预览能直接看到渲染结果。
    const HELP = [
        '# Markdown 语法示例',
        '',
        '这是一个可编辑的帮助标签。左侧是源码，右侧是渲染结果。',
        '它不写入会话，也不写到磁盘。可以直接改动试验。',
        '',
        '> 渲染器：goldmark + GFM + 脚注 + 代码高亮 + 自动标题 ID。',
        '',
        '## 1. 标题',
        '',
        '写 `#' + '` 到 `######` 得到 1 到 6 级标题。下面演示三到六级。',
        '',
        '### 三级标题',
        '#### 四级标题',
        '##### 五级标题',
        '###### 六级标题',
        '',
        'Setext 写法：文字下一行放 `===` 得到一级，放 `---` 得到二级。',
        '',
        '```md',
        '一级标题',
        '===',
        '',
        '二级标题',
        '---',
        '```',
        '',
        '## 2. 强调与行内代码',
        '',
        '**粗体** · *斜体* · ***粗斜体*** · ~~删除线~~ · `行内代码`',
        '',
        '转义字符：`\\*这不是斜体\\*`、`\\# 这不是标题`、`\\[不是链接\\]`。',
        '',
        '## 3. 段落与换行',
        '',
        '段落之间必须空一行。同一段落里直接换行会被合并成一行。',
        '这一行会被合并到上一行。',
        '',
        '行尾放两个空格产生硬换行。下面这行末尾就有两个空格。' + '  ',
        '这是硬换行后的第二行。',
        '',
        '行尾放一个反斜杠也能硬换行。' + '\\',
        '这是第二行。',
        '',
        '## 4. 引用',
        '',
        '> 一级引用',
        '> 同一段落的续行仍在引用内',
        '>',
        '> > 嵌套引用',
        '>',
        '> 引用里也可以有 **粗体**、`代码` 和 [链接](https://wails.io)。',
        '',
        '## 5. 列表',
        '',
        '- 无序项一',
        '- 无序项二',
        '  - 嵌套项 A',
        '  - 嵌套项 B',
        '- 无序项三',
        '',
        '1. 有序项一',
        '2. 有序项二',
        '   1. 嵌套有序项',
        '3. 有序项三',
        '',
        '## 6. 任务列表',
        '',
        '- [x] 已完成',
        '- [ ] 未完成',
        '  - [x] 嵌套完成项',
        '',
        '## 7. 链接',
        '',
        '[行内链接](https://wails.io) · [带标题的链接](https://golang.org "Go 官网") · [引用式链接][ref] · [简写][shortcut]。',
        '',
        'GFM 会自动把裸地址转成链接。地址前后要留空格。',
        '',
        '参见 https://github.com/yuin/goldmark 的项目说明。',
        '',
        '地址紧贴中文标点时不会自动转换。这时用 `<https://example.com>` 或 `[文字](地址)`。',
        '',
        '尖括号自动链接：<https://example.com>',
        '',
        '[ref]: https://www.modelscope.cn "ModelScope"',
        '[shortcut]: https://golang.org',
        '',
        '## 8. 图片',
        '',
        '![程序图标](/icon.svg)',
        '',
        '写法：`![替代文字](路径 "可选标题")`。',
        '本地相对路径按当前文档所在目录解析，并转成内联图片。超过 8 MiB 的图片不内联。',
        '',
        '## 9. 代码块与语法高亮',
        '',
        '缩进四空格形成代码块：',
        '',
        '    indented code block',
        '    second line',
        '',
        '围栏代码块带语言名时会着色：',
        '',
        '```go',
        'package main',
        '',
        'import "fmt"',
        '',
        'func main() {',
        '    fmt.Println("Hello, Markdown")',
        '}',
        '```',
        '',
        '```python',
        'def greet(name):',
        '    print(f"Hello, {name}")',
        '```',
        '',
        '```json',
        '{"ok": true, "items": [1, 2, 3]}',
        '```',
        '',
        '不写语言时会自动猜测，也可以写成纯文本：',
        '',
        '```',
        '纯文本 / plain text',
        '```',
        '',
        '常见语言：`go`、`python`、`javascript`、`typescript`、`json`、`html`、`css`、',
        '`bash`、`sql`、`rust`、`java`、`c`、`cpp`、`yaml`、`toml`、`diff`、`markdown`。',
        '',
        '## 10. 表格',
        '',
        '| 左对齐 | 居中 | 右对齐 | 默认 |',
        '| :--- | :---: | ---: | --- |',
        '| 单元格 | 单元格 | 123 | 文本 |',
        '| `代码` | **粗体** | 45.6 | ~~删除线~~ |',
        '',
        '表头下方的冒号决定对齐方式。单元格里可以放行内代码和强调。',
        '',
        '## 11. 分隔线',
        '',
        '上面这个标题下方与下方文字之间的三个短横线会渲染成分隔线。',
        '',
        '---',
        '',
        '## 12. 脚注',
        '',
        '正文里放一个脚注标记[^a]，再放一个[^b]。定义会统一排到文档末尾。',
        '',
        '[^a]: 这是第一个脚注。',
        '[^b]: 脚注可以有多段。',
        '',
        '    缩进四空格的续行属于同一个脚注。',
        '',
        '## 13. 当前不支持',
        '',
        '- 原生 HTML 标签。为安全起见被忽略，文档里的脚本不会执行。',
        '- Mermaid 图与数学公式。它们需要前端 JS 库，本程序没有引入。',
        '- 合并单元格、单元格内换行等复杂表格结构。',
        '',
        '## 14. 查找与替换',
        '',
        '按 `Ctrl+F` 查找，`Ctrl+H` 打开替换栏。`.*` 按钮切换正则，`Aa` 按钮切换区分大小写。',
        '',
        '| 转义写法 | 实际字符 |',
        '| --- | --- |',
        '| `\\n` | 换行 LF |',
        '| `\\r` | 回车 CR |',
        '| `\\t` | 制表符 |',
        '| `\\\\` | 反斜杠 |',
        '',
        '普通模式下，查找框与替换框都支持上表转义。查找内容按字面匹配，不解析正则元字符。',
        '',
        '正则模式下，查找框按正则语法解析。直接写 `\\r?\\n`、`\\d+`、`^#` 等即可。',
        '替换框仍支持转义写法，并支持 `$1` 捕获组、`$&` 整个匹配、`$$` 字面美元符号。',
        '普通模式不展开美元符号，`$1` 会原样写入。',
        '',
        '正则匹配数上限 20000 处。避免写嵌套量词，复杂正则可能让界面卡顿。',
        '',
        '## 15. 快捷键',
        '',
        '| 快捷键 | 操作 |',
        '| --- | --- |',
        '| `Ctrl+N` | 新建标签 |',
        '| `Ctrl+O` | 打开文档 |',
        '| `Ctrl+W` | 关闭当前标签 |',
        '| `Ctrl+S` | 保存 |',
        '| `Ctrl+Shift+S` | 另存为 |',
        '| `Ctrl+F` | 查找 |',
        '| `Ctrl+H` | 查找并替换 |',
        '| `Esc` | 关闭查找栏 |',
        '| `F1` | 打开 Markdown 语法示例 |',
        ''
    ].join('\n');

    let editor, preview, previewPane, workspace, divider, tabbar;
    let statusMessage, statusFile, statusDirty, statusCount;
    let findbar, findInput, replaceInput, findCount;
    let findRegexButton, findCaseButton;
    let outline, outlineList, fontSizeSelect, themeButton;
    let tabs = [];
    let helpTabId = 0;
    let activeId = 0;
    let nextId = 1;
    let renderTimer = null;
    let flashTimer = null;
    let syncTimer = null;
    let findMatches = [];
    let findIndex = -1;

    // 程序写入 scrollTop 也会触发 scroll 事件。按区域记下写入的目标值，
    // 事件到达时用精确匹配把它吞掉，避免两个方向互相追赶、来回抖动。
    // 不用时间锁：输入时 render 很频繁，时间锁会误吞用户自己的滚动。
    let programmaticScroll = {editor: null, preview: null};

    function setScroll(pane, name, value) {
        programmaticScroll[name] = value;
        pane.scrollTop = value;
    }

    function isProgrammatic(pane, name) {
        const expected = programmaticScroll[name];
        if (expected === null) { return false; }
        programmaticScroll[name] = null;
        const max = Math.max(pane.scrollHeight - pane.clientHeight, 0);
        const clamped = Math.min(Math.max(expected, 0), max);
        return Math.abs(pane.scrollTop - clamped) <= 1;
    }

    function binding() {
        return window.go && window.go.main && window.go.main.App;
    }

    function store(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* 隐私模式下忽略 */ }
    }

    function load(key, fallback) {
        try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; }
    }

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, function (ch) {
            return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch];
        });
    }

    function flash(message, isError) {
        statusMessage.textContent = message;
        statusMessage.classList.toggle('error', !!isError);
        clearTimeout(flashTimer);
        flashTimer = setTimeout(function () {
            statusMessage.textContent = '就绪';
            statusMessage.classList.remove('error');
        }, 3500);
    }

    function makeTab(opts) {
        opts = opts || {};
        return {
            id: nextId++,
            name: opts.name || '未命名.md',
            path: opts.path || '',
            suggestedName: opts.suggestedName || '',
            content: opts.content === undefined ? '' : opts.content,
            dirty: !!opts.dirty
        };
    }

    function activeTab() {
        for (let i = 0; i < tabs.length; i++) {
            if (tabs[i].id === activeId) { return tabs[i]; }
        }
        return null;
    }

    function updateStatus() {
        const t = activeTab();
        statusFile.textContent = t ? t.name : '';
        statusDirty.textContent = t && t.dirty ? '● 未保存' : '';
        statusCount.textContent = Array.from(editor.value).length + ' 字 · ' +
            editor.value.split('\n').length + ' 行';
    }

    // ------------------------------------------------------------ 预览 ---

    function render() {
        const api = binding();
        if (!api) {
            preview.innerHTML = '<p class="render-error">Go 绑定未加载，请用 wails build 生成的程序运行。</p>';
            return;
        }
        const t = activeTab();
        const savedScroll = previewPane.scrollTop;
        api.RenderMarkdown(editor.value, t ? t.path : '')
            .then(function (fragment) {
                preview.innerHTML = fragment;
                decorateCodeBlocks();
                buildOutline();
                // 恢复渲染前的预览位置，标记为程序写入，不反向同步编辑区。
                setScroll(previewPane, 'preview', savedScroll);
            })
            .catch(function (err) {
                preview.innerHTML = '<p class="render-error">渲染失败：' + escapeHtml(err) + '</p>';
            });
    }

    function scheduleRender() {
        clearTimeout(renderTimer);
        renderTimer = setTimeout(render, 120);
    }

    function decorateCodeBlocks() {
        preview.querySelectorAll('pre').forEach(function (pre) {
            if (pre.querySelector('.code-copy')) { return; }
            const button = document.createElement('button');
            button.className = 'code-copy';
            button.type = 'button';
            button.textContent = '复制';
            button.title = '复制代码';
            button.addEventListener('click', function (event) {
                event.stopPropagation();
                const code = pre.querySelector('code');
                copyText(code ? code.innerText : pre.innerText);
            });
            pre.appendChild(button);
        });
    }

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text)
                .then(function () { flash('已复制代码'); })
                .catch(function () { legacyCopy(text); });
        } else {
            legacyCopy(text);
        }
    }

    function legacyCopy(text) {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        try {
            document.execCommand('copy');
            flash('已复制代码');
        } catch (e) {
            flash('复制失败', true);
        }
        document.body.removeChild(area);
    }

    function buildOutline() {
        if (!outlineList) { return; }
        outlineList.innerHTML = '';
        const heads = preview.querySelectorAll('h1,h2,h3,h4,h5,h6');
        if (heads.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'outline-empty';
            empty.textContent = '当前文档没有标题';
            outlineList.appendChild(empty);
            return;
        }
        heads.forEach(function (head, index) {
            if (!head.id) { head.id = 'outline-heading-' + index; }
            const link = document.createElement('a');
            link.className = 'outline-item level-' + head.tagName.charAt(1);
            link.textContent = head.textContent;
            link.href = '#' + head.id;
            link.title = head.textContent;
            link.addEventListener('click', function (event) {
                event.preventDefault();
                head.scrollIntoView({behavior: 'smooth', block: 'start'});
            });
            outlineList.appendChild(link);
        });
    }

    function initScrollSync() {
        // 双向同步：任一区域滚动，另一区域按相同比例跟随。
        // 程序写入对方 scrollTop 触发的事件由 isProgrammatic 精确吞掉。
        function sync(srcPane, srcName, dstPane, dstName) {
            if (workspace.dataset.view !== 'split') { return; }
            if (isProgrammatic(srcPane, srcName)) { return; }
            const maxSrc = srcPane.scrollHeight - srcPane.clientHeight;
            const maxDst = dstPane.scrollHeight - dstPane.clientHeight;
            if (maxSrc <= 0 || maxDst <= 0) { return; }
            const target = (srcPane.scrollTop / maxSrc) * maxDst;
            if (Math.abs(dstPane.scrollTop - target) <= 1) { return; }
            setScroll(dstPane, dstName, target);
        }
        editor.addEventListener('scroll', function () {
            sync(editor, 'editor', previewPane, 'preview');
        });
        previewPane.addEventListener('scroll', function () {
            sync(previewPane, 'preview', editor, 'editor');
        });
    }

    // ------------------------------------------------------------ 标签 ---

    function syncToGo(t) {
        const api = binding();
        if (!api || !t) { return; }
        api.SyncTab(String(t.id), t.name, t.path, t.suggestedName, t.content, t.dirty)
            .catch(function () {});
    }

    function scheduleSync() {
        clearTimeout(syncTimer);
        syncTimer = setTimeout(function () { syncToGo(activeTab()); }, 200);
    }

    function renderTabs() {
        tabbar.innerHTML = '';
        tabs.forEach(function (t) {
            const el = document.createElement('div');
            el.className = 'tab' + (t.id === activeId ? ' active' : '');
            el.title = t.path || t.name;
            el.addEventListener('click', function (event) {
                if (event.target.closest('.tab-close')) { return; }
                if (t.id !== activeId) { activate(t.id); }
            });

            const name = document.createElement('span');
            name.className = 'tab-name';
            name.textContent = t.name;
            el.appendChild(name);

            const dirty = document.createElement('span');
            dirty.className = 'tab-dirty';
            dirty.textContent = t.dirty ? '●' : '';
            el.appendChild(dirty);

            const close = document.createElement('button');
            close.className = 'tab-close';
            close.type = 'button';
            close.title = '关闭标签';
            close.textContent = '×';
            close.addEventListener('click', function (event) {
                event.stopPropagation();
                closeTab(t.id);
            });
            el.appendChild(close);
            tabbar.appendChild(el);
        });

        const add = document.createElement('button');
        add.className = 'tab-add';
        add.type = 'button';
        add.title = '新建标签 (Ctrl+N)';
        add.textContent = '+';
        add.addEventListener('click', newFile);
        tabbar.appendChild(add);
    }

    function updateDirtyMarkers() {
        const nodes = tabbar.querySelectorAll('.tab');
        tabs.forEach(function (t, i) {
            const mark = nodes[i] && nodes[i].querySelector('.tab-dirty');
            if (mark) { mark.textContent = t.dirty ? '●' : ''; }
        });
    }

    function activate(id) {
        const old = activeTab();
        if (old) {
            old.content = editor.value;
            syncToGo(old);
        }
        activeId = id;
        const t = activeTab();
        editor.value = t ? t.content : '';
        setScroll(previewPane, 'preview', 0);
        renderTabs();
        updateStatus();
        syncToGo(t);
        render();
        closeFind();
        editor.focus();
    }

    function addTab(opts, message) {
        const t = makeTab(opts);
        tabs.push(t);
        activate(t.id);
        if (message) { flash(message); }
        return t;
    }

    function closeTab(id) {
        const target = tabs.find(function (x) { return x.id === id; });
        if (!target) { return; }
        if (target.dirty && !window.confirm('「' + target.name + '」有未保存的修改，确定关闭吗？')) { return; }
        const api = binding();
        if (api) { api.RemoveTab(String(id)).catch(function () {}); }

        const wasActive = id === activeId;
        tabs = tabs.filter(function (x) { return x.id !== id; });
        if (tabs.length === 0) {
            addTab({name: '未命名.md', content: ''}, '已关闭所有标签');
            return;
        }
        if (wasActive) {
            activate(tabs[tabs.length - 1].id);
        } else {
            renderTabs();
        }
    }

    function applyFileResult(result, silent) {
        if (!result || result.canceled) { return null; }
        if (result.error) { flash(result.error, true); return null; }
        const t = addTab({
            name: result.name || '未命名.md',
            path: result.path || '',
            suggestedName: result.suggestedName || '',
            content: result.content || '',
            dirty: !!result.imported
        });
        if (!silent) {
            flash(result.imported
                ? '已导入 ' + t.name + '，请另存为 Markdown'
                : '已打开 ' + t.name);
        }
        return t;
    }

    function newFile() {
        addTab({name: '未命名.md', content: ''}, '已新建标签');
    }

    // 帮助标签以新标签打开，这样左侧源码和右侧渲染结果能同时看到。
    // 它不带路径、不标脏，也不会进入会话快照。
    function openHelp() {
        const existing = tabs.find(function (t) { return t.id === helpTabId; });
        if (existing) {
            activate(existing.id);
            setView('split');
            flash('已打开 Markdown 语法示例');
            return;
        }
        const t = addTab({name: 'Markdown 语法示例.md', content: HELP},
            '已打开语法示例，可直接编辑试验');
        helpTabId = t.id;
        setView('split');
        editor.setSelectionRange(0, 0);
        editor.focus();
    }

    function openFile() {
        const api = binding();
        if (!api) { flash('Go 绑定未加载', true); return; }
        api.OpenFile()
            .then(function (result) { applyFileResult(result); })
            .catch(function (err) { flash(String(err), true); });
    }

    function save(asNew) {
        const api = binding();
        const t = activeTab();
        if (!api || !t) { return; }
        t.content = editor.value;
        const content = t.content;
        const call = (asNew || !t.path)
            ? api.SaveAs(content, t.suggestedName || t.name)
            : api.SaveFile(t.path, content);
        call.then(function (result) {
                if (!result || result.canceled) { return; }
                if (result.error) { flash(result.error, true); return; }
                t.path = result.path;
                t.name = result.name;
                t.suggestedName = '';
                t.dirty = false;
                renderTabs();
                syncToGo(t);
                if (activeTab() && activeTab().id === t.id) {
                    updateStatus();
                    render();
                }
                flash('已保存到 ' + result.path);
            })
            .catch(function (err) { flash(String(err), true); });
    }

    function onInput() {
        const t = activeTab();
        if (!t) { return; }
        t.content = editor.value;
        t.dirty = true;
        updateStatus();
        updateDirtyMarkers();
        scheduleRender();
        scheduleSync();
        if (!findbar.hidden) { updateFindMatches(); }
    }

    function setView(view) {
        workspace.dataset.view = view;
        document.querySelectorAll('#view-switch button').forEach(function (button) {
            button.classList.toggle('active', button.dataset.view === view);
        });
    }

    function initDivider() {
        divider.addEventListener('mousedown', function (event) {
            if (workspace.dataset.view !== 'split') { return; }
            event.preventDefault();
            const onMove = function (e) {
                const rect = workspace.getBoundingClientRect();
                let percent = ((e.clientX - rect.left) / rect.width) * 100;
                percent = Math.max(20, Math.min(80, percent));
                workspace.style.setProperty('--split', percent + '%');
            };
            const onUp = function () {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }

    // -------------------------------------------------------- 查找替换 ---

    const FIND_INPUT_TIP = '查找：\\n 换行，\\r 回车，\\t 制表符，\\\\ 反斜杠；开启 .* 后按正则解析';
    const REPLACE_INPUT_TIP = '替换为：支持 \\n \\r \\t \\\\ 转义；正则模式下 $1 为第 1 个捕获组，$& 为整个匹配，$$ 为字面 $';
    const FIND_ESCAPES = {'n': '\n', 'r': '\r', 't': '\t', '\\': '\\'};

    // 把用户输入的字面 \n \r \t \\ 转成真实字符。未知转义保持原样，
    // 这样普通模式下查找 "\d" 仍然是两个字符。
    function decodeEscapes(text) {
        return text.replace(/\\([nrt\\])/g, function (all, ch) {
            return FIND_ESCAPES[ch];
        });
    }

    function escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function isRegexMode() {
        return findRegexButton.classList.contains('active');
    }

    function findFlags() {
        let flags = 'gms'; // m 让 ^$ 按行，s 让 . 跨行
        if (!findCaseButton.classList.contains('active')) { flags += 'i'; }
        return flags;
    }

    // 返回 {re, regexMode, error}。正则模式下查找框就是正则源码，
    // 不做转义替换，否则 \n 会被提前吃掉，\r?\n 这类写法会失效。
    function buildFindPattern() {
        const raw = findInput.value;
        if (!raw) { return null; }
        const regexMode = isRegexMode();
        const source = regexMode ? raw : escapeRegex(decodeEscapes(raw));
        try {
            return {re: new RegExp(source, findFlags()), regexMode: regexMode};
        } catch (e) {
            return {error: String(e && e.message ? e.message : e)};
        }
    }

    function updateFindCount() {
        findCount.textContent = findMatches.length === 0
            ? '0 / 0'
            : (findIndex + 1) + ' / ' + findMatches.length;
    }

    function updateFindMatches() {
        findMatches = [];
        findIndex = -1;
        const pattern = buildFindPattern();
        if (pattern && pattern.error) {
            findCount.textContent = '正则错误';
            findCount.classList.add('error');
            findInput.classList.add('invalid');
            findInput.title = '正则表达式无效：' + pattern.error;
            return;
        }
        findCount.classList.remove('error');
        findInput.classList.remove('invalid');
        findInput.title = FIND_INPUT_TIP;
        if (pattern) {
            const text = editor.value;
            const re = pattern.re;
            let m;
            while ((m = re.exec(text)) !== null) {
                findMatches.push({start: m.index, end: m.index + m[0].length});
                if (m[0].length === 0) { re.lastIndex++; } // 防止零宽匹配死循环
                if (findMatches.length >= 20000) { break; }
            }
        }
        updateFindCount();
    }

    function gotoMatch(delta) {
        if (findMatches.length === 0) { return; }
        if (findIndex < 0) {
            findIndex = delta < 0 ? findMatches.length - 1 : 0;
        } else {
            findIndex = (findIndex + delta + findMatches.length) % findMatches.length;
        }
        const m = findMatches[findIndex];
        editor.focus();
        editor.setSelectionRange(m.start, m.end);
        updateFindCount();
    }

    // 展开替换串里的 $1 / $& / $$ / $<name> / $` / $'。
    // args 就是 String.replace 回调收到的 arguments。
    function expandReplacement(decoded, args) {
        const list = Array.prototype.slice.call(args);
        let tail = list.length;
        let named = null;
        if (tail > 0 && list[tail - 1] && typeof list[tail - 1] === 'object') {
            named = list[--tail];
        }
        const whole = list[tail - 1];
        const offset = list[tail - 2];
        const captures = list.slice(1, tail - 2);
        const match = list[0];
        return decoded.replace(/\$(\$|&|`|'|<[^>]+>|\d{1,2})/g, function (all, token) {
            if (token === '$') { return '$'; }
            if (token === '&') { return match; }
            if (token === '`') { return whole.slice(0, offset); }
            if (token === "'") { return whole.slice(offset + match.length); }
            if (token.charAt(0) === '<') {
                const key = token.slice(1, -1);
                return named && named[key] !== undefined ? named[key] : '';
            }
            const n = parseInt(token, 10);
            if (n === 0 || n > captures.length) { return all; }
            return captures[n - 1] === undefined ? '' : captures[n - 1];
        });
    }

    function replacementFor(pattern, args) {
        const decoded = decodeEscapes(replaceInput.value);
        return pattern.regexMode ? expandReplacement(decoded, args) : decoded;
    }

    function replaceOne() {
        const pattern = buildFindPattern();
        if (!pattern || pattern.error) { flash('正则表达式无效，无法替换', true); return; }
        if (findIndex < 0 || findIndex >= findMatches.length) { gotoMatch(1); return; }
        const targetIndex = findIndex;
        let seen = 0;
        editor.value = editor.value.replace(pattern.re, function () {
            if (seen++ !== targetIndex) { return arguments[0]; }
            return replacementFor(pattern, arguments);
        });
        onInput();
        // 被替换的那一项已经消失，定位到它后面的第一个匹配。
        findIndex = Math.min(targetIndex, findMatches.length) - 1;
        gotoMatch(1);
    }

    function replaceAll() {
        const pattern = buildFindPattern();
        if (!pattern || pattern.error) { flash('正则表达式无效，无法替换', true); return; }
        const count = findMatches.length;
        if (count === 0) { flash('没有找到匹配项', true); return; }
        editor.value = editor.value.replace(pattern.re, function () {
            return replacementFor(pattern, arguments);
        });
        onInput();
        findIndex = -1;
        gotoMatch(1);
        flash('已替换 ' + count + ' 处');
    }

    function toggleFindOption(button, key) {
        const on = !button.classList.contains('active');
        button.classList.toggle('active', on);
        button.setAttribute('aria-pressed', String(on));
        store(key, on ? '1' : '0');
        updateFindMatches();
        gotoMatch(1);
        findInput.focus();
    }

    function openFind(withReplace) {
        findbar.hidden = false;
        document.body.classList.toggle('replace-on', !!withReplace);
        const selected = editor.value.slice(editor.selectionStart, editor.selectionEnd);
        if (selected && selected.indexOf('\n') === -1) { findInput.value = selected; }
        findInput.focus();
        findInput.select();
        updateFindMatches();
        gotoMatch(1);
    }

    function closeFind() {
        findbar.hidden = true;
        document.body.classList.remove('replace-on');
    }

    // ------------------------------------------------------------ 偏好 ---

    function applyTheme(theme) {
        const dark = theme === 'dark';
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        themeButton.textContent = dark ? '浅色' : '深色';
        store('md-theme', dark ? 'dark' : 'light');
    }

    function applyFontSize(size) {
        const px = parseInt(size, 10);
        if (isNaN(px)) { return; }
        document.documentElement.style.setProperty('--editor-size', px + 'px');
        document.documentElement.style.setProperty('--preview-size', (px + 1) + 'px');
        fontSizeSelect.value = String(px);
        store('md-fontsize', String(px));
    }

    function exportHtml() {
        const api = binding();
        const t = activeTab();
        if (!api || !t) { return; }
        api.ExportHTML(editor.value, t.path, t.name)
            .then(function (result) {
                if (!result || result.canceled) { return; }
                if (result.error) { flash(result.error, true); return; }
                flash('已导出 ' + result.path);
            })
            .catch(function (err) { flash(String(err), true); });
    }

    // ------------------------------------------------ 会话与外部事件 ---

    function applySession(session) {
        if (!session || !session.tabs || session.tabs.length === 0) { return false; }
        const usable = session.tabs.filter(function (t) {
            if (t.dirty || t.path) { return true; }
            return t.content !== WELCOME && t.content !== HELP;
        });
        if (usable.length === 0) { return false; }
        tabs = [];
        activeId = 0;
        usable.forEach(function (t) {
            tabs.push(makeTab({
                name: t.name, path: t.path, suggestedName: t.suggestedName,
                content: t.content, dirty: t.dirty
            }));
        });
        const index = Math.max(0, Math.min(session.activeIndex || 0, tabs.length - 1));
        activeId = tabs[index].id;
        const act = activeTab();
        editor.value = act ? act.content : '';
        renderTabs();
        updateStatus();
        tabs.forEach(syncToGo);
        syncToGo(act);
        render();
        editor.setSelectionRange(0, 0);
        editor.focus();
        return true;
    }

    function loadStartupFiles(api, hasRestored) {
        if (!api || !api.StartupFiles) { return; }
        let usedFirst = false;
        api.StartupFiles()
            .then(function (list) {
                if (!list || list.length === 0) { return; }
                list.forEach(function (result) {
                    if (result && result.error) { flash(result.error, true); return; }
                    if (!hasRestored && !usedFirst) {
                        const welcome = activeTab();
                        if (welcome && !welcome.dirty && !welcome.path && welcome.content === WELCOME) {
                            welcome.name = result.name || welcome.name;
                            welcome.path = result.path || '';
                            welcome.suggestedName = result.suggestedName || '';
                            welcome.content = result.content || '';
                            welcome.dirty = !!result.imported;
                            editor.value = welcome.content;
                            renderTabs();
                            updateStatus();
                            syncToGo(welcome);
                            render();
                            usedFirst = true;
                            return;
                        }
                    }
                    applyFileResult(result, true);
                });
            })
            .catch(function (err) { flash(String(err), true); });
    }

    function drainPending(api) {
        if (!api || !api.PendingFiles) { return; }
        api.PendingFiles()
            .then(function (list) {
                if (!list || list.length === 0) { return; }
                list.forEach(function (result) { applyFileResult(result, true); });
            })
            .catch(function () {});
    }

    function registerRuntimeEvents(api) {
        if (!window.runtime || !window.runtime.EventsOn) { return; }
        window.runtime.EventsOn('paths-ready', function () { drainPending(api); });
    }

    function startSession(api) {
        const fallback = function () {
            addTab({name: '未命名.md', content: WELCOME});
            editor.setSelectionRange(0, 0);
            editor.focus();
            loadStartupFiles(api, false);
        };
        if (!api || !api.RestoreSession) { fallback(); return; }
        api.RestoreSession()
            .then(function (session) {
                if (applySession(session)) {
                    flash('已恢复上次会话：' + tabs.length + ' 个文档');
                    loadStartupFiles(api, true);
                } else {
                    fallback();
                }
            })
            .catch(function () { fallback(); });
    }

    // ------------------------------------------------------------ init ---

    function init() {
        editor = document.getElementById('editor');
        preview = document.getElementById('preview');
        previewPane = document.getElementById('preview-pane');
        workspace = document.getElementById('workspace');
        divider = document.getElementById('divider');
        tabbar = document.getElementById('tabbar');
        statusMessage = document.getElementById('status-message');
        statusFile = document.getElementById('status-file');
        statusDirty = document.getElementById('status-dirty');
        statusCount = document.getElementById('status-count');
        findbar = document.getElementById('findbar');
        findInput = document.getElementById('find-input');
        replaceInput = document.getElementById('replace-input');
        findCount = document.getElementById('find-count');
        findRegexButton = document.getElementById('find-regex');
        findCaseButton = document.getElementById('find-case');
        outline = document.getElementById('outline');
        outlineList = document.getElementById('outline-list');
        fontSizeSelect = document.getElementById('font-size');
        themeButton = document.getElementById('btn-theme');

        document.getElementById('btn-new').addEventListener('click', newFile);
        document.getElementById('btn-open').addEventListener('click', openFile);
        document.getElementById('btn-save').addEventListener('click', function () { save(false); });
        document.getElementById('btn-save-as').addEventListener('click', function () { save(true); });
        document.getElementById('btn-export').addEventListener('click', exportHtml);
        document.getElementById('btn-find').addEventListener('click', function () { openFind(false); });
        document.getElementById('btn-help').addEventListener('click', openHelp);
        document.getElementById('btn-outline').addEventListener('click', function () {
            outline.hidden = !outline.hidden;
        });
        themeButton.addEventListener('click', function () {
            applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
        });
        fontSizeSelect.addEventListener('change', function () { applyFontSize(fontSizeSelect.value); });

        document.querySelectorAll('#view-switch button').forEach(function (button) {
            button.addEventListener('click', function () { setView(button.dataset.view); });
        });

        findInput.title = FIND_INPUT_TIP;
        replaceInput.title = REPLACE_INPUT_TIP;

        function setFindOption(button, on) {
            button.classList.toggle('active', on);
            button.setAttribute('aria-pressed', String(on));
        }
        setFindOption(findRegexButton, load('md-find-regex', '0') === '1');
        setFindOption(findCaseButton, load('md-find-case', '0') === '1');
        findRegexButton.addEventListener('click', function () {
            toggleFindOption(findRegexButton, 'md-find-regex');
        });
        findCaseButton.addEventListener('click', function () {
            toggleFindOption(findCaseButton, 'md-find-case');
        });

        findInput.addEventListener('input', function () { updateFindMatches(); gotoMatch(1); });
        findInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                gotoMatch(event.shiftKey ? -1 : 1);
            } else if (event.key === 'Escape') {
                closeFind();
                editor.focus();
            }
        });
        replaceInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') { event.preventDefault(); replaceOne(); }
            else if (event.key === 'Escape') { closeFind(); editor.focus(); }
        });
        document.getElementById('find-prev').addEventListener('click', function () { gotoMatch(-1); });
        document.getElementById('find-next').addEventListener('click', function () { gotoMatch(1); });
        document.getElementById('replace-one').addEventListener('click', replaceOne);
        document.getElementById('replace-all').addEventListener('click', replaceAll);
        document.getElementById('find-close').addEventListener('click', function () {
            closeFind();
            editor.focus();
        });

        editor.addEventListener('input', onInput);
        editor.addEventListener('keydown', function (event) {
            if (event.key !== 'Tab') { return; }
            event.preventDefault();
            editor.setRangeText('  ', editor.selectionStart, editor.selectionEnd, 'end');
            onInput();
        });

        preview.addEventListener('click', function (event) {
            const link = event.target.closest('a');
            if (!link) { return; }
            event.preventDefault();
            const href = link.getAttribute('href');
            if (!href) { return; }
            if (href.charAt(0) === '#') {
                let target = null;
                try { target = preview.querySelector('#' + CSS.escape(href.slice(1))); } catch (e) { /* 忽略非法 id */ }
                if (!target) { target = document.getElementById(href.slice(1)); }
                if (target) { target.scrollIntoView({behavior: 'smooth', block: 'start'}); }
                return;
            }
            if (window.runtime && window.runtime.BrowserOpenURL) {
                window.runtime.BrowserOpenURL(href);
            } else {
                window.open(href, '_blank');
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'F1') {
                event.preventDefault();
                openHelp();
                return;
            }
            if (event.key === 'Escape' && !findbar.hidden) {
                closeFind();
                editor.focus();
                return;
            }
            if (!event.ctrlKey && !event.metaKey) { return; }
            const key = event.key.toLowerCase();
            if (key === 's') {
                event.preventDefault();
                save(event.shiftKey);
            } else if (key === 'o' && !event.shiftKey) {
                event.preventDefault();
                openFile();
            } else if (key === 'n' && !event.shiftKey) {
                event.preventDefault();
                newFile();
            } else if (key === 'w' && !event.shiftKey) {
                event.preventDefault();
                if (activeId) { closeTab(activeId); }
            } else if (key === 'f') {
                event.preventDefault();
                openFind(false);
            } else if (key === 'h') {
                event.preventDefault();
                openFind(true);
            }
        });

        initDivider();
        initScrollSync();
        applyTheme(load('md-theme', 'light'));
        applyFontSize(load('md-fontsize', '14'));
        registerRuntimeEvents(binding());
        startSession(binding());
    }

    window.addEventListener('DOMContentLoaded', init);
})();
