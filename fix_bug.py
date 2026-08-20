with open('frontend/faculty/assignments.html', 'r', encoding='utf-8') as f:
    content = f.read()

broken = '\'<div class="markdown-body" style="font-size:13px;color:var(--text-primary);margin:0 0 8px;line-height:1.5">\\\' + (typeof marked !== "undefined" ? marked.parse(q.text || "") : escHtml(q.text || "")) + \\\'</div>\''

fixed = '\'<div class="markdown-body" style="font-size:13px;color:var(--text-primary);margin:0 0 8px;line-height:1.5">\' + (typeof marked !== "undefined" ? marked.parse(q.text || "") : escHtml(q.text || "")) + \'</div>\''

content = content.replace(broken, fixed)

with open('frontend/faculty/assignments.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed literal quotes bug.')
