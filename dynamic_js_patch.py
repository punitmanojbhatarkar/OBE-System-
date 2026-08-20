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
  const manualQuestionInput = document.getElementById('manual-question');

  // Load courses dynamically from backend to avoid localStorage caching issues
  apiFetch('/api/courses').then(courses => {
    if (!courses || courses.length === 0) {
      console.warn("No courses found in database.");
      return;
    }
    
    let myCourses = courses.filter(c => c.facultyId === user.id);
    if (myCourses.length === 0) myCourses = courses; // fallback if no courses assigned
    
    myCourses.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.code} - ${c.name}`;
      courseSelect.appendChild(opt);
    });
  }).catch(err => {
    console.error("Failed to load courses from API:", err);
    alert("Could not connect to backend to load courses. Please ensure the server is running.");
  });

  // Handle course change
  courseSelect.addEventListener('change', () => {
    const cid = courseSelect.value;
    assignmentSelect.innerHTML = '<option value="">-- Choose Assignment (Optional) --</option><option value="manual">-- Custom / Manual Entry --</option>';
    if (!cid || cid === 'manual') {
      return;
    }
    
    // Fetch assignments dynamically
    apiFetch(`/api/courses/${cid}/assignments`).then(courseAsgn => {
      if (!courseAsgn || courseAsgn.length === 0) return;
      
      courseAsgn.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.dataset.marks = a.marks || a.maxMarks || 10;
        opt.dataset.topic = a.topic || '';
        opt.textContent = a.topic || `Assignment ${a.id}`;
        assignmentSelect.appendChild(opt);
      });
    }).catch(err => console.error("Failed to load assignments:", err));
  });

  // Handle assignment change
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
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const maxMarks = parseInt(maxMarksInput.value, 10);
    const rubricsRaw = rubricsInput.value.trim();
    const questionText = manualQuestionInput ? manualQuestionInput.value.trim() : '';
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
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('rubrics', rubricsRaw);
        formData.append('maxMarks', maxMarks);
        formData.append('question', questionText);

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
        const rubrics = rubricsRaw.split('\\n').map(r => r.trim()).filter(r => r);
        res = await apiFetch('/api/grade', 'POST', {
          text,
          rubrics,
          maxMarks,
          question: questionText
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

with open('frontend/scripts/auto-grade.js', 'w', encoding='utf-8') as f:
    f.write(js_content)
print("Updated auto-grade.js to use direct API fetching.")
