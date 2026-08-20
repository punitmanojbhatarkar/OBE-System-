import re

with open('frontend/faculty/assignments.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Match the garbage pattern at the end of the modal HTML
pat = r'<div class="modal-footer">\s*<button class="btn btn-secondary" onclick="Modal\.close\(\)">Cancel</button>\s*<button class="btn btn-success" id="saveAsgnBtn" onclick="saveAssignment\(\'\$\{existing\?\.id\|\|\'\'\}\'\)">💾 Save Assignment</button>\s*</div>\s*n class="btn btn-success" id="saveAsgnBtn" onclick="saveAssignment\(\'\$\{existing\?\.id\|\|\'\'\}\'\)">💾 Save Assignment</button>\s*</div>`;'

fixed = """<div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-success" id="saveAsgnBtn" onclick="saveAssignment('${existing?.id||''}')">💾 Save Assignment</button>
      </div>`;"""

content, count = re.subn(pat, fixed, content, flags=re.DOTALL)
print(f'Replaced garbage html {count} times')

with open('frontend/faculty/assignments.html', 'w', encoding='utf-8') as f:
    f.write(content)
