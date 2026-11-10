package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/src
var assets embed.FS

func main() {
	app := NewApp()

	err := wails.Run(&options.App{
		Title:            "Markdown 编辑器",
		Width:            1200,
		Height:           800,
		MinWidth:         720,
		MinHeight:        480,
		BackgroundColour: &options.RGBA{R: 255, G: 255, B: 255, A: 1},
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		// Wails 在 production 构建里默认关闭 WebView2 的原生右键菜单，
		// 编辑器的复制、粘贴、剪切、全选、撤销都靠它。必须显式开启。
		EnableDefaultContextMenu: true,
		// 程序已运行时，第二次双击文档把路径交给已有窗口，不再开新进程。
		SingleInstanceLock: &options.SingleInstanceLock{
			UniqueId: "workbuddy-markdown-editor-v1",
			OnSecondInstanceLaunch: func(data options.SecondInstanceData) {
				app.pushPaths(data.Args)
			},
		},
		// 交给 Go 侧处理拖入的文件，禁止 WebView 自己导航到文件。
		DragAndDrop: &options.DragAndDrop{
			EnableFileDrop:     true,
			DisableWebViewDrop: true,
		},
		OnStartup:     app.startup,
		OnBeforeClose: app.beforeClose,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
