import re

# 1. Fix 'undefined' description in assignments.html
html_path = 'frontend/faculty/assignments.html'
with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

pat_desc = r'\$\{a\.description\}'
repl_desc = r'${a.description || ""}'
content, count_html = re.subn(pat_desc, repl_desc, content)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Fix 'undefined' topic vs title in auto-grade.js
js_path = 'frontend/scripts/auto-grade.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js_content = f.read()

# opt.dataset.topic = a.topic || ''; -> a.title || a.topic || ''
js_content = js_content.replace("a.topic || ''", "a.title || a.topic || ''")

# opt.textContent = a.topic || `Assignment ${a.id}`; -> a.title || a.topic || `Assignment ${a.id}`;
js_content = js_content.replace("a.topic || `Assignment", "a.title || a.topic || `Assignment")

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"Fixed {count_html} descriptions in assignments.html")
print("Fixed topic/title mapping in auto-grade.js")
