import re

with open('frontend/faculty/assignments.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add marked.js before ai-chat.js
if 'marked.min.js' not in content:
    content = content.replace(
        '<script src="../scripts/ai-chat.js"></script>',
        '<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>\n<script src="../scripts/ai-chat.js"></script>'
    )
    print("Added marked.js")

# 2. Update renderExtractedPreview to use marked.parse and div instead of p
preview_pat = r'<p style="font-size:13px;color:var\(--text-primary\);margin:0 0 8px">\' \+ escHtml\(q\.text \|\| \'\'\) \+ \'</p>'
preview_repl = r'<div class="markdown-body" style="font-size:13px;color:var(--text-primary);margin:0 0 8px;line-height:1.5">\' + (typeof marked !== "undefined" ? marked.parse(q.text || "") : escHtml(q.text || "")) + \'</div>'
content, count = re.subn(preview_pat, preview_repl, content)
if count > 0: print("Updated renderExtractedPreview")

# 3. Update qRowHtml to use textarea instead of input
qrow_pat = r'<input type="text" class="form-control" style="font-size:12px" placeholder="Question text…" value="\$\{\(q\.text\|\|\'\'\)\.replace\(/"/g,\'&quot;\'\)\}" data-q="text" data-idx="\$\{i\}">'
qrow_repl = r'<textarea class="form-control" style="font-size:12px; resize:vertical; min-height:36px; line-height:1.4" placeholder="Question text…" data-q="text" data-idx="${i}" rows="3">${(q.text||"").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</textarea>'
content, count = re.subn(qrow_pat, qrow_repl, content)
if count > 0: print("Updated qRowHtml")

# 4. Also need to make sure the .qrow grid layout can handle textarea height
grid_pat = r'\.qrow \{ display:grid; grid-template-columns: 40px 1fr 80px 80px 80px 44px; gap: var\(--sp-sm\); align-items:center; margin-bottom:var\(--sp-sm\); \}'
grid_repl = r'.qrow { display:grid; grid-template-columns: 40px 1fr 80px 80px 80px 44px; gap: var(--sp-sm); align-items:start; margin-bottom:var(--sp-sm); }'
content, count = re.subn(grid_pat, grid_repl, content)
if count > 0: print("Updated grid layout")

# 5. Add minimal markdown styles for tables
style_marker = '</style>'
markdown_styles = """
.markdown-body table { border-collapse: collapse; width: 100%; margin-bottom: 8px; font-size: 11px; }
.markdown-body th, .markdown-body td { border: 1px solid var(--border); padding: 4px 8px; text-align: left; }
.markdown-body th { background: rgba(0,0,0,0.05); font-weight: 600; }
.markdown-body p { margin-bottom: 6px; }
.markdown-body ul, .markdown-body ol { margin: 0 0 8px 20px; padding: 0; }
"""
if '.markdown-body table' not in content:
    content = content.replace(style_marker, markdown_styles + '\n' + style_marker)
    print("Added markdown styles")


with open('frontend/faculty/assignments.html', 'w', encoding='utf-8') as f:
    f.write(content)
