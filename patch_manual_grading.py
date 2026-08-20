import re

# Update HTML
with open('frontend/faculty/auto-grade.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace(
    '<select class="form-control" id="course-select" required>',
    '<select class="form-control" id="course-select">\n                  <option value="manual">-- Custom / Manual Entry --</option>'
)
html = html.replace(
    '<select class="form-control" id="assignment-select" required disabled>',
    '<select class="form-control" id="assignment-select">\n                  <option value="manual">-- Custom / Manual Entry --</option>'
)

with open('frontend/faculty/auto-grade.html', 'w', encoding='utf-8') as f:
    f.write(html)

# Update JS
with open('frontend/scripts/auto-grade.js', 'r', encoding='utf-8') as f:
    js = f.read()

js = js.replace(
    "const myCourses = courses.filter(c => c.facultyId === user.id);",
    "let myCourses = courses.filter(c => c.facultyId === user.id);\n  if (myCourses.length === 0) myCourses = courses; // fallback if no courses assigned"
)

js = js.replace(
    "assignmentSelect.innerHTML = '<option value=\"\">-- Choose Assignment --</option>';",
    "assignmentSelect.innerHTML = '<option value=\"\">-- Choose Assignment (Optional) --</option><option value=\"manual\">-- Custom / Manual Entry --</option>';"
)

js = js.replace(
    "assignmentSelect.disabled = true;",
    "// assignmentSelect.disabled = true; // allow manual"
)
js = js.replace(
    "assignmentSelect.disabled = false;",
    "// assignmentSelect.disabled = false;"
)

with open('frontend/scripts/auto-grade.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Patched HTML and JS to support manual assignments and fix empty courses.")
