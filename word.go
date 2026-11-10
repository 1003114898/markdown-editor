package main

import (
	"archive/zip"
	"bytes"
	"encoding/binary"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"strconv"
	"strings"
	"unicode"
)

func isWordFile(path string) bool {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".doc", ".docx":
		return true
	}
	return false
}

// wordMarkdownName 把 Word 文件名换成建议的 .md 文件名。
func wordMarkdownName(path string) string {
	base := filepath.Base(path)
	return strings.TrimSuffix(base, filepath.Ext(base)) + ".md"
}

// importWord 把 Word 文档转成 Markdown 文本。
func importWord(path string, data []byte) (string, error) {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".docx":
		return docxToMarkdown(data)
	case ".doc":
		return docToMarkdown(data)
	default:
		return "", fmt.Errorf("不支持的格式：%s", filepath.Ext(path))
	}
}

// ---------------------------------------------------------------- .docx ---

func docxToMarkdown(data []byte) (string, error) {
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "", fmt.Errorf("不是有效的 .docx：%w", err)
	}
	var document, rels []byte
	for _, f := range zr.File {
		switch f.Name {
		case "word/document.xml":
			document, err = readZipEntry(f)
		case "word/_rels/document.xml.rels":
			rels, err = readZipEntry(f)
		}
		if err != nil {
			return "", err
		}
	}
	if len(document) == 0 {
		return "", errors.New(".docx 缺少 word/document.xml")
	}
	var doc docxDocument
	if err := xml.Unmarshal(document, &doc); err != nil {
		return "", fmt.Errorf("document.xml 解析失败：%w", err)
	}
	md := doc.Body.markdown(parseDocxRels(rels))
	if strings.TrimSpace(md) == "" {
		return "", errors.New(".docx 里没有可转换的文字")
	}
	return md, nil
}

func readZipEntry(f *zip.File) ([]byte, error) {
	rc, err := f.Open()
	if err != nil {
		return nil, err
	}
	defer rc.Close()
	return io.ReadAll(rc)
}

func parseDocxRels(data []byte) map[string]string {
	links := make(map[string]string)
	if len(data) == 0 {
		return links
	}
	dec := xml.NewDecoder(bytes.NewReader(data))
	for {
		tok, err := dec.Token()
		if err != nil {
			break
		}
		se, ok := tok.(xml.StartElement)
		if !ok || se.Name.Local != "Relationship" {
			continue
		}
		var id, target, typ string
		for _, a := range se.Attr {
			switch a.Name.Local {
			case "Id":
				id = a.Value
			case "Target":
				target = a.Value
			case "Type":
				typ = a.Value
			}
		}
		if strings.HasSuffix(typ, "/hyperlink") {
			links[id] = target
		}
	}
	return links
}

type docxDocument struct {
	Body docxBody `xml:"body"`
}

type docxBlock struct {
	para  *docxPara
	table *docxTable
}

type docxBody struct {
	blocks []docxBlock
}

// UnmarshalXML 保留段落与表格在文档里的先后顺序。
func (b *docxBody) UnmarshalXML(d *xml.Decoder, start xml.StartElement) error {
	for {
		tok, err := d.Token()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}
		switch t := tok.(type) {
		case xml.StartElement:
			switch t.Name.Local {
			case "p":
				var p docxPara
				if err := d.DecodeElement(&p, &t); err != nil {
					return err
				}
				b.blocks = append(b.blocks, docxBlock{para: &p})
			case "tbl":
				var tbl docxTable
				if err := d.DecodeElement(&tbl, &t); err != nil {
					return err
				}
				b.blocks = append(b.blocks, docxBlock{table: &tbl})
			default:
				if err := d.Skip(); err != nil {
					return err
				}
			}
		case xml.EndElement:
			if t.Name == start.Name {
				return nil
			}
		}
	}
}

type docxInline struct {
	text   string
	bold   bool
	italic bool
	linkID string
}

type docxPara struct {
	heading int
	list    bool
	inlines []docxInline
}

func (p *docxPara) UnmarshalXML(d *xml.Decoder, start xml.StartElement) error {
	for {
		tok, err := d.Token()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}
		switch t := tok.(type) {
		case xml.StartElement:
			switch t.Name.Local {
			case "pPr":
				var pr docxParaProps
				if err := d.DecodeElement(&pr, &t); err != nil {
					return err
				}
				p.heading = pr.headingLevel()
				p.list = pr.NumPr != nil
			case "r":
				var r docxRun
				if err := d.DecodeElement(&r, &t); err != nil {
					return err
				}
				p.inlines = append(p.inlines, docxInline{text: r.text, bold: r.bold, italic: r.italic})
			case "hyperlink":
				var h docxHyperlink
				if err := d.DecodeElement(&h, &t); err != nil {
					return err
				}
				p.inlines = append(p.inlines, docxInline{text: h.text(), linkID: h.ID})
			default:
				if err := d.Skip(); err != nil {
					return err
				}
			}
		case xml.EndElement:
			if t.Name == start.Name {
				return nil
			}
		}
	}
}

type docxParaProps struct {
	Style struct {
		Val string `xml:"val,attr"`
	} `xml:"pStyle"`
	NumPr *struct{} `xml:"numPr"`
}

func (pr docxParaProps) headingLevel() int {
	v := strings.ToLower(strings.TrimSpace(pr.Style.Val))
	if v == "" {
		return 0
	}
	if n, err := strconv.Atoi(v); err == nil && n >= 1 && n <= 6 {
		return n // 中文版 Word 的样式名可能直接是「1」
	}
	if strings.Contains(v, "title") {
		return 1
	}
	if !strings.Contains(v, "heading") && !strings.Contains(v, "标题") {
		return 0
	}
	end := len(v)
	for end > 0 && v[end-1] >= '0' && v[end-1] <= '9' {
		end--
	}
	if end == len(v) {
		return 1
	}
	n, err := strconv.Atoi(v[end:])
	if err != nil || n < 1 {
		return 1
	}
	if n > 6 {
		return 6
	}
	return n
}

type docxRunProps struct {
	Bold   *struct{} `xml:"b"`
	Italic *struct{} `xml:"i"`
}

type docxRun struct {
	text   string
	bold   bool
	italic bool
}

func (r *docxRun) UnmarshalXML(d *xml.Decoder, start xml.StartElement) error {
	var sb strings.Builder
	for {
		tok, err := d.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		switch t := tok.(type) {
		case xml.StartElement:
			switch t.Name.Local {
			case "rPr":
				var pr docxRunProps
				if err := d.DecodeElement(&pr, &t); err != nil {
					return err
				}
				r.bold = pr.Bold != nil
				r.italic = pr.Italic != nil
			case "t":
				var s string
				if err := d.DecodeElement(&s, &t); err != nil {
					return err
				}
				sb.WriteString(s)
			case "tab":
				sb.WriteByte('\t')
				if err := d.Skip(); err != nil {
					return err
				}
			case "br":
				sb.WriteByte('\n')
				if err := d.Skip(); err != nil {
					return err
				}
			default:
				if err := d.Skip(); err != nil {
					return err
				}
			}
		case xml.EndElement:
			if t.Name == start.Name {
				r.text = sb.String()
				return nil
			}
		}
	}
	r.text = sb.String()
	return nil
}

type docxHyperlink struct {
	ID   string `xml:"id,attr"`
	Runs []struct {
		Texts []string `xml:"t"`
	} `xml:"r"`
}

func (h docxHyperlink) text() string {
	var sb strings.Builder
	for _, r := range h.Runs {
		for _, t := range r.Texts {
			sb.WriteString(t)
		}
	}
	return sb.String()
}

func (p docxPara) plainText() string {
	var sb strings.Builder
	for _, in := range p.inlines {
		sb.WriteString(in.text)
	}
	return strings.TrimSpace(sb.String())
}

func (p docxPara) markdown(links map[string]string) string {
	var sb strings.Builder
	for _, in := range p.inlines {
		text := strings.TrimSpace(in.text)
		if text == "" {
			continue
		}
		if in.bold {
			text = "**" + text + "**"
		}
		if in.italic {
			text = "*" + text + "*"
		}
		if target := links[in.linkID]; in.linkID != "" && target != "" {
			text = "[" + text + "](" + target + ")"
		}
		sb.WriteString(text)
	}
	line := strings.TrimSpace(sb.String())
	if line == "" {
		return ""
	}
	switch {
	case p.heading > 0:
		return strings.Repeat("#", p.heading) + " " + line
	case p.list:
		return "- " + line
	default:
		return line
	}
}

type docxTable struct {
	Rows []docxRow `xml:"tr"`
}

type docxRow struct {
	Cells []docxCell `xml:"tc"`
}

type docxCell struct {
	Paras []docxPara `xml:"p"`
}

func (t docxTable) markdown() string {
	var lines []string
	for ri, row := range t.Rows {
		if len(row.Cells) == 0 {
			continue
		}
		cells := make([]string, 0, len(row.Cells))
		for _, c := range row.Cells {
			var sb strings.Builder
			for _, p := range c.Paras {
				if s := p.plainText(); s != "" {
					if sb.Len() > 0 {
						sb.WriteByte(' ')
					}
					sb.WriteString(s)
				}
			}
			cells = append(cells, strings.ReplaceAll(sb.String(), "|", `\|`))
		}
		lines = append(lines, "| "+strings.Join(cells, " | ")+" |")
		if ri == 0 {
			sep := make([]string, len(cells))
			for i := range sep {
				sep[i] = "---"
			}
			lines = append(lines, "| "+strings.Join(sep, " | ")+" |")
		}
	}
	return strings.Join(lines, "\n")
}

func (b docxBody) markdown(links map[string]string) string {
	var blocks []string
	prevList := false
	for _, blk := range b.blocks {
		if blk.para != nil {
			line := blk.para.markdown(links)
			if line == "" {
				prevList = false
				continue
			}
			if blk.para.list && prevList && len(blocks) > 0 {
				blocks[len(blocks)-1] += "\n" + line
			} else {
				blocks = append(blocks, line)
			}
			prevList = blk.para.list
			continue
		}
		if blk.table != nil {
			if table := blk.table.markdown(); table != "" {
				blocks = append(blocks, table)
			}
			prevList = false
		}
	}
	return strings.TrimSpace(strings.Join(blocks, "\n\n")) + "\n"
}

// ----------------------------------------------------------------- .doc ---
// Word 97-2003 是 OLE2 复合文档，正文以 UTF-16LE 或压缩的单字节编码存放。
// 这里只做文字提取：不还原表格、图片、标题层级，也不保证零噪声。

func docToMarkdown(data []byte) (string, error) {
	text := extractUTF16Runs(data, 0)
	if alt := extractUTF16Runs(data, 1); len([]rune(alt)) > len([]rune(text)) {
		text = alt
	}
	if len([]rune(strings.TrimSpace(text))) < 8 {
		text = extractANSIRuns(data)
	}
	md := plainLinesToMarkdown(text)
	if strings.TrimSpace(md) == "" {
		return "", errors.New("无法从这个 .doc 中提取文字")
	}
	return md, nil
}

func isTextRune(r rune) bool {
	if r >= 0x20 && r <= 0x7e {
		return true
	}
	if r >= 0x4e00 && r <= 0x9fff { // 汉字
		return true
	}
	if r >= 0x3000 && r <= 0x303f { // 中文标点
		return true
	}
	if r >= 0xff00 && r <= 0xffef { // 全角字符
		return true
	}
	return unicode.IsLetter(r) || unicode.IsDigit(r)
}

func extractUTF16Runs(data []byte, offset int) string {
	var out, run strings.Builder
	flush := func() {
		s := strings.TrimSpace(run.String())
		if len([]rune(s)) >= 4 {
			if out.Len() > 0 {
				out.WriteByte('\n')
			}
			out.WriteString(s)
		}
		run.Reset()
	}
	for i := offset; i+1 < len(data); i += 2 {
		r := rune(binary.LittleEndian.Uint16(data[i : i+2]))
		if r == '\r' || r == '\n' || r == 0x07 {
			flush()
			continue
		}
		if isTextRune(r) {
			run.WriteRune(r)
		} else {
			flush()
		}
	}
	flush()
	return out.String()
}

func extractANSIRuns(data []byte) string {
	var out, run strings.Builder
	flush := func() {
		s := strings.TrimSpace(run.String())
		if len([]rune(s)) >= 12 {
			if out.Len() > 0 {
				out.WriteByte('\n')
			}
			out.WriteString(s)
		}
		run.Reset()
	}
	for _, b := range data {
		if (b >= 0x20 && b <= 0x7e) || b == '\t' {
			run.WriteByte(b)
		} else {
			flush()
		}
	}
	flush()
	return out.String()
}

func plainLinesToMarkdown(text string) string {
	var paras []string
	for _, line := range strings.Split(text, "\n") {
		if s := strings.TrimSpace(line); s != "" {
			paras = append(paras, s)
		}
	}
	if len(paras) == 0 {
		return ""
	}
	return strings.Join(paras, "\n\n") + "\n"
}
