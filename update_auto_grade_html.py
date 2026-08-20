with open("frontend/faculty/auto-grade.html", "r", encoding="utf-8") as f:
    content = f.read()

# Replace the old form with the new one
old_form_start = '<form id="grade-form">'
old_form_end = '</form>'
start_idx = content.find(old_form_start)
end_idx = content.find(old_form_end) + len(old_form_end)

new_form = """<form id="grade-form">
            <div class="grid-2 mb-md">
              <div class="form-group">
                <label class="form-label">Select Course</label>
                <select class="form-control" id="course-select" required>
                  <option value="">-- Choose Course --</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Select Assignment</label>
                <select class="form-control" id="assignment-select" required disabled>
                  <option value="">-- Choose Assignment --</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Student Submission (File Upload)</label>
              <input type="file" class="form-control" id="answer-file" accept=".pdf,.doc,.docx,.txt" style="padding: 8px;">
              <small style="color: var(--text-secondary); margin-top: 4px; display: block;">Supported formats: PDF, DOCX, TXT. If no file is provided, you must paste the text below.</small>
            </div>
            
            <div class="form-group">
              <label class="form-label">OR: Paste Student Answer Text</label>
              <textarea class="form-control" id="answer-text" rows="4" placeholder="Paste the student's full descriptive answer here if not uploading a file..."></textarea>
            </div>
            
            <div class="grid-2 mb-md">
              <div class="form-group">
                <label class="form-label">Maximum Marks</label>
                <input type="number" class="form-control" id="max-marks" value="10" required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Grading Rubrics (One per line)</label>
              <textarea class="form-control" id="rubrics-text" rows="4" placeholder="E.g., Clear understanding of the core concept.&#10;Correct application of mathematical formulas.&#10;Logical flow and well-structured argument." required></textarea>
            </div>

            <button type="submit" class="btn btn-primary" id="btn-grade">
              <span id="btn-grade-text">🤖 Grade with AI</span>
            </button>
          </form>"""

new_content = content[:start_idx] + new_form + content[end_idx:]

with open("frontend/faculty/auto-grade.html", "w", encoding="utf-8") as f:
    f.write(new_content)
print("Updated auto-grade.html")
