js_content = """document.addEventListener('DOMContentLoaded', () => {
  const user = checkAuth();
  if (!user || user.role !== 'faculty') {
    window.location.href = '../login.html';
    return;
  }
  
  document.querySelector('.user-name').textContent = user.name;
  document.querySelector('.user-role').textContent = user.role.toUpperCase();
  document.querySelector('.user-avatar').textContent = user.name.charAt(0);

  const courseSelect = document.getElementById('course-select');
  const assignmentSelect = document.getElementById('assignment-select');
  const maxMarksInput = document.getElementById('max-marks');
  const form = document.getElementById('grade-form');
  const btn = document.getElementById('btn-grade');
  const btnText = document.getElementById('btn-grade-text');
  const resultDiv = document.getElementById('grade-result');
  const feedbackContainer = document.getElementById('feedback-container');
  const finalScoreSpan = document.getElementById('final-score');
  const displayMaxSpan = document.getElementById('display-max');
  const fileInput = document.getElementById('answer-file');
  const textInput = document.getElementById('answer-text');
  const rubricsInput = document.getElementById('rubrics-text');

  // Load courses
  const courses = JSON.parse(localStorage.getItem('obe_courses') || '[]');
  const myCourses = courses.filter(c => c.facultyId === user.id);
  myCourses.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.code} - ${c.name}`;
    courseSelect.appendChild(opt);
  });

  // Handle course change
  courseSelect.addEventListener('change', () => {
    const cid = courseSelect.value;
    assignmentSelect.innerHTML = '<option value="">-- Choose Assignment --</option>';
    if (!cid) {
      assignmentSelect.disabled = true;
      return;
    }
    const assignments = JSON.parse(localStorage.getItem('obe_assignments') || '[]');
    const courseAsgn = assignments.filter(a => a.courseId === cid);
    
    courseAsgn.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.dataset.marks = a.marks || a.maxMarks || 10;
      opt.textContent = a.topic || `Assignment ${a.id}`;
      assignmentSelect.appendChild(opt);
    });
    assignmentSelect.disabled = false;
  });

  // Handle assignment change
  assignmentSelect.addEventListener('change', () => {
    const selected = assignmentSelect.options[assignmentSelect.selectedIndex];
    if (selected && selected.dataset.marks) {
      maxMarksInput.value = selected.dataset.marks;
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const maxMarks = parseInt(maxMarksInput.value, 10);
    const rubricsRaw = rubricsInput.value.trim();
    const hasFile = fileInput.files.length > 0;
    const text = textInput.value.trim();
    
    if (!rubricsRaw || isNaN(maxMarks)) {
      alert("Please provide maximum marks and rubrics.");
      return;
    }
    if (!hasFile && !text) {
      alert("Please upload a file OR paste the student's answer text.");
      return;
    }

    btn.disabled = true;
    btnText.textContent = "⏳ Grading Submission...";
    resultDiv.style.display = "none";

    try {
      let res;
      if (hasFile) {
        // Use native fetch with FormData for file upload
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('rubrics', rubricsRaw);
        formData.append('maxMarks', maxMarks);

        const rawRes = await fetch(API_BASE + '/api/grade-upload', {
          method: 'POST',
          body: formData
        });
        if (!rawRes.ok) {
          const errData = await rawRes.json().catch(() => ({}));
          throw new Error(errData.detail || rawRes.statusText);
        }
        res = await rawRes.json();
      } else {
        // Use JSON for text only
        const rubrics = rubricsRaw.split('\\n').map(r => r.trim()).filter(r => r);
        res = await apiFetch('/api/grade', 'POST', {
          text,
          rubrics,
          maxMarks
        });
      }

      if (res.success && res.data) {
        finalScoreSpan.textContent = res.data.totalScore;
        displayMaxSpan.textContent = maxMarks;

        feedbackContainer.innerHTML = '';
        if (res.data.evaluation && res.data.evaluation.length > 0) {
          res.data.evaluation.forEach(item => {
            const div = document.createElement('div');
            div.className = 'rubric-item';
            div.innerHTML = `
              <div style="font-weight:600; margin-bottom:4px; display:flex; justify-content:space-between;">
                <span>🎯 ${item.rubric}</span>
                <span style="color:var(--primary); font-weight:800;">${item.scoreAllocated} / ${item.maxMarksForRubric}</span>
              </div>
              <div style="font-size:13px; color:var(--text-secondary);">${item.justification}</div>
            `;
            feedbackContainer.appendChild(div);
          });
        } else {
          feedbackContainer.innerHTML = `<div class="rubric-item">No detailed evaluation available.</div>`;
        }
        resultDiv.style.display = "block";
      } else {
        alert("Failed to grade submission: " + (res.detail || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while grading: " + err.message);
    } finally {
      btn.disabled = false;
      btnText.textContent = "🤖 Grade with AI";
    }
  });
});
"""

with open("frontend/scripts/auto-grade.js", "w", encoding="utf-8") as f:
    f.write(js_content)
print("Updated auto-grade.js")
