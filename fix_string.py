import re

with open('frontend/faculty/assignments.html', 'r', encoding='utf-8') as f:
    content = f.read()

fixed_str = """        <h3 class="modal-title">${isEdit ? '✏️ Edit Assignment' : '✨ Create Assignment'}</h3>
        <button class="modal-close" onclick="Modal.close()">✕</button>
      </div>
      <div class="tabs" id="createTabs" style="margin-bottom:var(--sp-lg)">
        <button class="tab-btn" data-tab="manualTab">📝 Manual</button>
        <button class="tab-btn" data-tab="aiTab">🤖 AI Generate</button>
        <button class="tab-btn" data-tab="pdfImportTab">📂 Import from PDF/DOCX</button>
      </div>"""

# Match the broken chunk
pat = r'<h3 class="modal-title">\$\{isEdit \? \'✏️ Edit Assignment\' : \'.*?<div class="tabs" id="createTabs" style="margin-bottom:var\(--sp-lg\)">(.*?)</button>\s*</div>'

content, count = re.subn(pat, fixed_str, content, flags=re.DOTALL)
print(f'Replaced {count} occurrences.')

with open('frontend/faculty/assignments.html', 'w', encoding='utf-8') as f:
    f.write(content)
