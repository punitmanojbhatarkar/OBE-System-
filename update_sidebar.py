import os
import glob

html_files = glob.glob("frontend/faculty/*.html")
for file in html_files:
    if "auto-grade.html" in file: continue
    with open(file, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Check if already added
    if "auto-grade.html" not in content:
        target = '<a class="nav-item" href="assignments.html">🤖 Assignments & AI</a>'
        replacement = target + '\n      <a class="nav-item" href="auto-grade.html">✅ Auto-Grading</a>'
        content = content.replace(target, replacement)
        
        with open(file, "w", encoding="utf-8") as f:
            f.write(content)
print("Updated all sidebars!")
