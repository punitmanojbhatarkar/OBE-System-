import sys, re

# Read raw bytes to avoid encoding issues
with open('frontend/faculty/assignments.html', 'rb') as f:
    raw = f.read()

content = raw.decode('utf-8', errors='replace')

# 1. Remove the broken duplicate modal footer line
# It looks like: n class="btn btn-success" id="saveAsgnBtn" ...  </div>`;\n
dupe_pat = r'n class="btn btn-success" id="saveAsgnBtn" onclick="saveAssignment\(\'.*?\'\)">.*?Save Assignment</button>\s*</div>`;\n'
content, count = re.subn(dupe_pat, '`;\n', content, flags=re.DOTALL)
print(f"Duplicate footer removed: {count}")

# 2. Fix broken </body> tag
broken_body = '<script src="../scripts/ai-chat.js"></script>\\n</body>'
fixed_body  = '<script src="../scripts/ai-chat.js"></script>\n</body>'
if broken_body in content:
    content = content.replace(broken_body, fixed_body)
    print("Fixed broken </body>")
else:
    print("No broken </body> found")

# 3. Inject extra JS functions
marker = '  // Auto-exposed: onclick handlers need to be on window'
if marker in content:
    with open('assignments_extra.js', encoding='utf-8') as f:
        extra_js = f.read()
    content = content.replace(marker, extra_js + marker)
    print("Injected extra JS functions")
else:
    print("ERROR: marker not found in file!")

# 4. Add to window scope
old_w = '  window.viewSubmissions = viewSubmissions;\n})();'
new_w = ('  window.viewSubmissions = viewSubmissions;\n'
         '  window.extractQuestionsFromFile = extractQuestionsFromFile;\n'
         '  window.applyExtractedQuestions  = applyExtractedQuestions;\n'
         '})();')
if old_w in content:
    content = content.replace(old_w, new_w)
    print("Updated window scope assignments")
else:
    print("Window scope marker not found")

# Write back
with open('frontend/faculty/assignments.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("\nPatch complete!")
print(f"Total lines: {content.count(chr(10))}")
