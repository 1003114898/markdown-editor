package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"html"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"github.com/yuin/goldmark"
	highlighting "github.com/yuin/goldmark-highlighting/v2"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
)

// FileResult 是文件操作返回给前端的结果。
type FileResult struct {
	Path          string `json:"path"`
	Name          string `json:"name"`
	Content       string `json:"content"`
	SuggestedName string `json:"suggestedName"`
	Canceled      bool   `json:"canceled"`
	Imported      bool   `json:"imported"`
	Error         string `json:"error"`
}

// SessionTab 是落盘的一个标签快照，用于会话恢复。
type SessionTab struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Path          string `json:"path"`
	SuggestedName string `json:"suggestedName"`
	Content       string `json:"content"`
	Dirty         bool   `json:"dirty"`
}

// Session 是落盘的整个会话。
type Session struct {
	Tabs        []SessionTab `json:"tabs"`
	ActiveIndex int          `json:"activeIndex"`
}

type cachedImage struct {
	modTime int64
	size    int64
	uri     string
}

// tabSnapshot 是前端某个标签的快照，关闭窗口时用于批量保存。
type tabSnapshot struct {
	name          string
	path          string
	suggestedName string
	content       string
	dirty         bool
}

// App struct
type App struct {
	ctx          context.Context
	mu           sync.Mutex
	images       map[string]cachedImage
	md           goldmark.Markdown
	startupArgs  []string
	tabs         map[string]tabSnapshot
	order        []string
	activeID     string
	pending      []FileResult
	sessionTimer *time.Timer
}

var imageSrcPattern = regexp.MustCompile(`src="([^"]+)"`)

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		images:      make(map[string]cachedImage),
		tabs:        make(map[string]tabSnapshot),
		startupArgs: findStartupFiles(os.Args[1:]),
		// 不启用 html.WithUnsafe()，源文档里的原生 HTML 会被忽略，避免脚本注入。
		md: goldmark.New(
			goldmark.WithExtensions(
				extension.GFM,
				extension.Footnote,
				highlighting.NewHighlighting(
					highlighting.WithStyle("github"),
					highlighting.WithGuessLanguage(true),
				),
			),
			goldmark.WithParserOptions(parser.WithAutoHeadingID()),
		),
	}
}

// startup is called at application startup
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	runtime.OnFileDrop(ctx, func(x, y int, paths []string) {
		a.pushPaths(paths)
	})
}

// isSupportedDoc 过滤命令行与拖放传入的文件，避免把可执行文件路径当文档打开。
func isSupportedDoc(path string) bool {
	switch strings.ToLower(filepath.Ext(path)) {
	case "", ".md", ".markdown", ".mdown", ".txt", ".text", ".doc", ".docx", ".rst":
		return true
	}
	return false
}

// findStartupFiles 取出启动参数里所有存在的文档。
// Windows 通过文件关联双击文档时，路径会作为命令行参数传入。
func findStartupFiles(args []string) []string {
	var files []string
	seen := make(map[string]bool)
	for _, arg := range args {
		if arg == "" || strings.HasPrefix(arg, "-") || !isSupportedDoc(arg) {
			continue
		}
		info, err := os.Stat(arg)
		if err != nil || info.IsDir() {
			continue
		}
		abs, err := filepath.Abs(arg)
		if err != nil {
			abs = arg
		}
		key := strings.ToLower(abs)
		if seen[key] {
			continue
		}
		seen[key] = true
		files = append(files, abs)
	}
	return files
}

// SyncTab 同步一个标签的快照，同时更新窗口标题并安排会话落盘。
func (a *App) SyncTab(id, name, path, suggestedName, content string, dirty bool) {
	a.mu.Lock()
	if _, exists := a.tabs[id]; !exists {
		a.order = append(a.order, id)
	}
	a.tabs[id] = tabSnapshot{
		name: name, path: path, suggestedName: suggestedName,
		content: content, dirty: dirty,
	}
	a.activeID = id
	if a.sessionTimer != nil {
		a.sessionTimer.Stop()
	}
	a.sessionTimer = time.AfterFunc(700*time.Millisecond, a.saveSession)
	a.mu.Unlock()
	if a.ctx != nil {
		runtime.WindowSetTitle(a.ctx, windowTitle(name, dirty))
	}
}

// RemoveTab 删除标签快照。
func (a *App) RemoveTab(id string) {
	a.mu.Lock()
	delete(a.tabs, id)
	for i, v := range a.order {
		if v == id {
			a.order = append(a.order[:i], a.order[i+1:]...)
			break
		}
	}
	if a.activeID == id {
		a.activeID = ""
	}
	if a.sessionTimer != nil {
		a.sessionTimer.Stop()
	}
	a.sessionTimer = time.AfterFunc(700*time.Millisecond, a.saveSession)
	a.mu.Unlock()
}

func windowTitle(name string, dirty bool) string {
	title := "Markdown 编辑器"
	if name != "" {
		title = name + " - Markdown 编辑器"
	}
	if dirty {
		title = "● " + title
	}
	return title
}

// ---------------------------------------------------------------- 会话 ---

func sessionFilePath() string {
	dir, err := os.UserConfigDir()
	if err != nil {
		dir = os.TempDir()
	}
	return filepath.Join(dir, "markdown-editor", "session.json")
}

// saveSession 把全部标签写入本地配置目录。用临时文件加改名，避免写一半断电损坏。
func (a *App) saveSession() {
	a.mu.Lock()
	session := Session{Tabs: make([]SessionTab, 0, len(a.order)), ActiveIndex: 0}
	for _, id := range a.order {
		t, ok := a.tabs[id]
		if !ok {
			continue
		}
		if id == a.activeID {
			session.ActiveIndex = len(session.Tabs)
		}
		session.Tabs = append(session.Tabs, SessionTab{
			ID: id, Name: t.name, Path: t.path, SuggestedName: t.suggestedName,
			Content: t.content, Dirty: t.dirty,
		})
	}
	a.mu.Unlock()

	data, err := json.Marshal(session)
	if err != nil {
		return
	}
	path := sessionFilePath()
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0644); err != nil {
		return
	}
	_ = os.Rename(tmp, path)
}

// RestoreSession 返回上次会话的标签快照，供前端在启动时恢复。
func (a *App) RestoreSession() Session {
	// 通过文件关联 / 命令行打开指定文档时，不恢复旧会话，避免混入无关标签。
	if len(a.startupArgs) > 0 {
		return Session{}
	}
	data, err := os.ReadFile(sessionFilePath())
	if err != nil {
		return Session{}
	}
	var session Session
	if err := json.Unmarshal(data, &session); err != nil {
		return Session{}
	}
	for i := range session.Tabs {
		t := &session.Tabs[i]
		if t.Path == "" {
			continue
		}
		if _, err := os.Stat(t.Path); err != nil {
			// 源文件已被移动或删除，内容只存在于会话快照里，标记为未保存。
			t.Path = ""
			t.Dirty = true
		}
	}
	// 前端会用新 id 重新同步，先清掉旧快照，避免残留。
	a.mu.Lock()
	a.tabs = make(map[string]tabSnapshot)
	a.order = nil
	a.activeID = ""
	a.mu.Unlock()
	return session
}

// ClearSession 删除会话快照，让下次启动回到空白文档。
func (a *App) ClearSession() {
	_ = os.Remove(sessionFilePath())
}

// -------------------------------------------------- 二次启动与拖放事件 ---

// pushPaths 把二次启动或拖放传入的文档读好，存进待取队列并通知前端。
func (a *App) pushPaths(paths []string) {
	files := findStartupFiles(paths)
	if len(files) == 0 {
		return
	}
	var results []FileResult
	for _, path := range files {
		results = append(results, a.readDocument(path))
	}
	a.mu.Lock()
	a.pending = append(a.pending, results...)
	a.mu.Unlock()
	if a.ctx != nil {
		runtime.EventsEmit(a.ctx, "paths-ready")
	}
}

// PendingFiles 取出待打开的文档。取完即清空，重复调用不会重复打开。
func (a *App) PendingFiles() []FileResult {
	a.mu.Lock()
	defer a.mu.Unlock()
	results := a.pending
	a.pending = nil
	return results
}

// StartupFiles 读取命令行 / 文件关联传入的所有文档，并合并启动前到达的待取文档。
func (a *App) StartupFiles() []FileResult {
	var results []FileResult
	for _, path := range a.startupArgs {
		results = append(results, a.readDocument(path))
	}
	return append(results, a.PendingFiles()...)
}

// OpenPaths 供前端在拖放后按路径打开文档。
func (a *App) OpenPaths(paths []string) []FileResult {
	var results []FileResult
	for _, path := range findStartupFiles(paths) {
		results = append(results, a.readDocument(path))
	}
	return results
}

// beforeClose 在窗口关闭前处理所有未保存的标签。
// 返回 true 表示阻止关闭。
func (a *App) beforeClose(ctx context.Context) (prevent bool) {
	a.mu.Lock()
	var dirty []tabSnapshot
	for _, t := range a.tabs {
		if t.dirty {
			dirty = append(dirty, t)
		}
	}
	a.mu.Unlock()
	if len(dirty) == 0 {
		return false
	}

	choice, err := runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
		Type:          runtime.QuestionDialog,
		Title:         "未保存的修改",
		Message:       fmt.Sprintf("有 %d 个文档未保存。要全部保存后退出吗？", len(dirty)),
		Buttons:       []string{"全部保存", "放弃修改", "取消"},
		DefaultButton: "全部保存",
		CancelButton:  "取消",
	})
	if err != nil {
		return true
	}
	switch choice {
	case "放弃修改":
		return false
	case "取消", "":
		return true
	}

	for _, t := range dirty {
		target := t.path
		if target == "" {
			name := t.suggestedName
			if name == "" {
				name = t.name
			}
			selected, err := runtime.SaveFileDialog(ctx, saveDialogOptions(name))
			if err != nil || selected == "" {
				return true
			}
			target = ensureMarkdownExt(selected)
		}
		if err := os.WriteFile(target, []byte(t.content), 0644); err != nil {
			runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
				Type:    runtime.ErrorDialog,
				Title:   "保存失败",
				Message: err.Error(),
			})
			return true
		}
	}
	return false
}

// ---------------------------------------------------------------- 渲染 ---

// RenderMarkdown 把 Markdown 文本渲染为 HTML 片段。
// currentPath 是当前文档路径，用于解析文档里的本地相对图片路径。
func (a *App) RenderMarkdown(source, currentPath string) string {
	var buf bytes.Buffer
	if err := a.md.Convert([]byte(source), &buf); err != nil {
		return `<p class="render-error">渲染失败：` + html.EscapeString(err.Error()) + `</p>`
	}
	return a.inlineLocalImages(buf.String(), currentPath)
}

// inlineLocalImages 把本地图片转成 data URI。
func (a *App) inlineLocalImages(doc, currentPath string) string {
	baseDir := ""
	if currentPath != "" {
		baseDir = filepath.Dir(currentPath)
	}

	return imageSrcPattern.ReplaceAllStringFunc(doc, func(match string) string {
		src := match[len(`src="`) : len(match)-1]
		lower := strings.ToLower(src)
		for _, prefix := range []string{"http://", "https://", "data:", "file:", "//"} {
			if strings.HasPrefix(lower, prefix) {
				return match
			}
		}
		src = html.UnescapeString(src)
		if decoded, err := url.PathUnescape(src); err == nil {
			src = decoded
		}
		path := src
		if !filepath.IsAbs(path) {
			if baseDir == "" {
				return match
			}
			path = filepath.Join(baseDir, path)
		}
		uri, ok := a.localImageURI(path)
		if !ok {
			return match
		}
		return `src="` + uri + `"`
	})
}

func (a *App) localImageURI(path string) (string, bool) {
	info, err := os.Stat(path)
	if err != nil || info.IsDir() {
		return "", false
	}
	modTime, size := info.ModTime().UnixNano(), info.Size()

	a.mu.Lock()
	cached, hit := a.images[path]
	a.mu.Unlock()
	if hit && cached.modTime == modTime && cached.size == size {
		return cached.uri, true
	}
	if size > 8<<20 { // 超过 8 MiB 的图片不内联，避免拖慢实时预览
		return "", false
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return "", false
	}
	uri := "data:" + imageMIME(filepath.Ext(path)) + ";base64," + base64.StdEncoding.EncodeToString(data)
	a.mu.Lock()
	a.images[path] = cachedImage{modTime: modTime, size: size, uri: uri}
	a.mu.Unlock()
	return uri, true
}

func imageMIME(ext string) string {
	switch strings.ToLower(ext) {
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".bmp":
		return "image/bmp"
	case ".svg":
		return "image/svg+xml"
	default:
		return "application/octet-stream"
	}
}

// ---------------------------------------------------------------- 文件 ---

// OpenFile 弹出打开对话框并读取选中的文件。
func (a *App) OpenFile() FileResult {
	selection, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "打开文档",
		Filters: []runtime.FileFilter{
			{DisplayName: "支持的文档", Pattern: "*.md;*.markdown;*.txt;*.doc;*.docx"},
			{DisplayName: "Markdown 文件", Pattern: "*.md;*.markdown;*.txt"},
			{DisplayName: "Word 文档", Pattern: "*.doc;*.docx"},
			{DisplayName: "所有文件", Pattern: "*.*"},
		},
	})
	if err != nil {
		return FileResult{Error: err.Error()}
	}
	if selection == "" {
		return FileResult{Canceled: true}
	}
	return a.readDocument(selection)
}

func (a *App) readDocument(path string) FileResult {
	data, err := os.ReadFile(path)
	if err != nil {
		return FileResult{Error: err.Error()}
	}
	abs, err := filepath.Abs(path)
	if err != nil {
		abs = path
	}
	base := filepath.Base(abs)

	if isWordFile(abs) {
		md, err := importWord(abs, data)
		if err != nil {
			return FileResult{Error: err.Error()}
		}
		name := wordMarkdownName(abs)
		// 导入不绑定原 Word 路径，避免保存时把 Markdown 写回 .doc/.docx。
		return FileResult{Name: name, SuggestedName: name, Content: md, Imported: true}
	}
	return FileResult{Path: abs, Name: base, Content: string(data)}
}

// SaveFile 把内容写到指定路径。
func (a *App) SaveFile(path, content string) FileResult {
	if path == "" {
		return a.SaveAs(content, "未命名.md")
	}
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		return FileResult{Error: err.Error()}
	}
	return FileResult{Path: path, Name: filepath.Base(path)}
}

// SaveAs 弹出保存对话框后写入文件。
func (a *App) SaveAs(content, defaultName string) FileResult {
	if defaultName == "" {
		defaultName = "未命名.md"
	}
	selection, err := runtime.SaveFileDialog(a.ctx, saveDialogOptions(defaultName))
	if err != nil {
		return FileResult{Error: err.Error()}
	}
	if selection == "" {
		return FileResult{Canceled: true}
	}
	path := ensureMarkdownExt(selection)
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		return FileResult{Error: err.Error()}
	}
	return FileResult{Path: path, Name: filepath.Base(path)}
}

// ExportHTML 把当前文档渲染成带内联样式的独立 HTML 文件。
func (a *App) ExportHTML(content, currentPath, defaultName string) FileResult {
	body := a.RenderMarkdown(content, currentPath)
	css, _ := assets.ReadFile("frontend/src/main.css")
	title := strings.TrimSuffix(defaultName, filepath.Ext(defaultName))
	if title == "" {
		title = "未命名"
	}
	doc := `<!DOCTYPE html>` + "\n" +
		`<html lang="zh-CN"><head><meta charset="UTF-8"/>` +
		`<meta name="viewport" content="width=device-width, initial-scale=1.0"/>` +
		`<title>` + html.EscapeString(title) + `</title><style>` + string(css) +
		`</style><style>body{margin:0;padding:28px;background:#fff;color:#24292f}` +
		`.markdown-body{max-width:860px;margin:0 auto;padding:0 0 60px}</style>` +
		`</head><body><article class="markdown-body">` + body + `</article></body></html>`

	name := title + ".html"
	selection, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "导出 HTML 文件",
		DefaultFilename: name,
		Filters: []runtime.FileFilter{
			{DisplayName: "HTML 文件", Pattern: "*.html;*.htm"},
			{DisplayName: "所有文件", Pattern: "*.*"},
		},
	})
	if err != nil {
		return FileResult{Error: err.Error()}
	}
	if selection == "" {
		return FileResult{Canceled: true}
	}
	if err := os.WriteFile(selection, []byte(doc), 0644); err != nil {
		return FileResult{Error: err.Error()}
	}
	return FileResult{Path: selection, Name: filepath.Base(selection)}
}

func saveDialogOptions(defaultName string) runtime.SaveDialogOptions {
	return runtime.SaveDialogOptions{
		Title:           "保存 Markdown 文件",
		DefaultFilename: defaultName,
		Filters: []runtime.FileFilter{
			{DisplayName: "Markdown 文件", Pattern: "*.md;*.markdown"},
			{DisplayName: "所有文件", Pattern: "*.*"},
		},
	}
}

func ensureMarkdownExt(path string) string {
	if filepath.Ext(path) == "" {
		return path + ".md"
	}
	return path
}
