import re

# 1. Update HTML
html_path = 'frontend/faculty/auto-grade.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Insert the Assignment Question textarea right after the Assignment Select
insert_target = """              <div class="form-group">
                <label class="form-label">Select Assignment</label>
                <select class="form-control" id="assignment-select">
                  <option value="manual">-- Custom / Manual Entry --</option>
                  <option value="">-- Choose Assignment --</option>
                </select>
              </div>
            </div>"""

question_field = """
            <div class="form-group" id="question-group">
              <label class="form-label">Assignment Question / Topic</label>
              <textarea class="form-control" id="manual-question" rows="2" placeholder="Enter the question the student was asked to answer..."></textarea>
            </div>
"""
if 'id="manual-question"' not in html:
    html = html.replace(insert_target, insert_target + question_field)
    
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

# 2. Update JS
js_path = 'frontend/scripts/auto-grade.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Make sure it fetches courses from the DB if localStorage is empty to fix the "I cannot see course" bug
fetch_logic = """
  // Load courses
  let courses = JSON.parse(localStorage.getItem('obe_courses') || '[]');
  if (courses.length === 0) {
    // If not in local storage for some reason, try to fetch directly
    apiFetch('/api/courses').then(data => {
        localStorage.setItem('obe_courses', JSON.stringify(data));
        window.location.reload();
    }).catch(err => console.error("Could not fetch courses:", err));
  }
"""
js = js.replace("  // Load courses\n  const courses = JSON.parse(localStorage.getItem('obe_courses') || '[]');", fetch_logic)
js = js.replace("  // Load courses\n  let courses = JSON.parse(localStorage.getItem('obe_courses') || '[]');", fetch_logic)


# Add the question field logic
if "const manualQuestionInput = document.getElementById('manual-question');" not in js:
    js = js.replace(
        "const rubricsInput = document.getElementById('rubrics-text');",
        "const rubricsInput = document.getElementById('rubrics-text');\n  const manualQuestionInput = document.getElementById('manual-question');"
    )

js = js.replace(
    "const rubricsRaw = rubricsInput.value.trim();",
    "const rubricsRaw = rubricsInput.value.trim();\n    const questionText = manualQuestionInput ? manualQuestionInput.value.trim() : '';"
)

js = js.replace(
    "formData.append('maxMarks', maxMarks);",
    "formData.append('maxMarks', maxMarks);\n        formData.append('question', questionText);"
)

js = js.replace(
    "rubrics,\n          maxMarks",
    "rubrics,\n          maxMarks,\n          question: questionText"
)

# On assignment change, populate the question if the assignment object has one
assignment_change_logic = """  // Handle assignment change
  assignmentSelect.addEventListener('change', () => {
    const selected = assignmentSelect.options[assignmentSelect.selectedIndex];
    if (selected && selected.dataset.marks) {
      maxMarksInput.value = selected.dataset.marks;
    }
    if (selected && selected.dataset.topic && manualQuestionInput) {
      manualQuestionInput.value = selected.dataset.topic;
    } else if (manualQuestionInput) {
      manualQuestionInput.value = "";
    }
  });"""
old_assignment_change_logic = """  // Handle assignment change
  assignmentSelect.addEventListener('change', () => {
    const selected = assignmentSelect.options[assignmentSelect.selectedIndex];
    if (selected && selected.dataset.marks) {
      maxMarksInput.value = selected.dataset.marks;
    }
  });"""
js = js.replace(old_assignment_change_logic, assignment_change_logic)

# Set dataset.topic when loading assignments
js = js.replace(
    "opt.dataset.marks = a.marks || a.maxMarks || 10;",
    "opt.dataset.marks = a.marks || a.maxMarks || 10;\n      opt.dataset.topic = a.topic || '';"
)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)

print("Updated auto-grade.html and auto-grade.js to support manual question field and fetching empty courses.")
