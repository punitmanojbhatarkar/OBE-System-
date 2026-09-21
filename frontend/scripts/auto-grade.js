document.addEventListener('DOMContentLoaded', async () => {
  // ── Wait for API sync to complete (required by api.js bootstrap) ──────────
  try { await (window._apiReady || Promise.resolve()); } catch(e) { return; }

  // ── Auth ────────────────────────────────────────────────────────────────
  let user = null;
  try { user = JSON.parse(sessionStorage.getItem('obe_session')); } catch(e) {}
  if (!user || (user.role !== 'faculty' && user.role !== 'hod')) {
    window.location.href = '../login.html';
    return;
  }

  document.querySelector('.user-name').textContent   = user.name;
  document.querySelector('.user-role').textContent   = user.role.toUpperCase();
  document.querySelector('.user-avatar').textContent = user.name.charAt(0).toUpperCase();

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const courseSelect        = document.getElementById('course-select');
  const assignmentSelect    = document.getElementById('assignment-select');
  const maxMarksInput       = document.getElementById('max-marks');
  const form                = document.getElementById('grade-form');
  const btn                 = document.getElementById('btn-grade');
  const btnText             = document.getElementById('btn-grade-text');
  const resultDiv           = document.getElementById('grade-result');
  const fileInput           = document.getElementById('answer-file');
  const textInput           = document.getElementById('answer-text');
  const rubricsInput        = document.getElementById('rubrics-text');
  const manualQuestionInput = document.getElementById('manual-question');
  const dropZone            = document.getElementById('drop-zone');
  const fileSelectedName    = document.getElementById('file-selected-name');
  const btnCopy             = document.getElementById('btn-copy-feedback');

  // ── File drag-drop ────────────────────────────────────────────────────────
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover',  (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', ()  => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      const dt = new DataTransfer();
      dt.items.add(e.dataTransfer.files[0]);
      fileInput.files = dt.files;
      showFileName(e.dataTransfer.files[0].name);
    }
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
      showFileName(fileInput.files[0].name);
      textInput.value = '';
    }
  });
  function showFileName(name) {
    fileSelectedName.textContent = name;
    fileSelectedName.style.display = 'block';
  }

  // ── Load courses belonging strictly to this login ID ─────────────
  let myCourses = DB.courses.byFaculty(user.id);

  myCourses.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.code} – ${c.name}`;
    courseSelect.appendChild(opt);
  });

  // ── Course → Assignments ──────────────────────────────────────────────────
  courseSelect.addEventListener('change', () => {
    const cid = courseSelect.value;
    assignmentSelect.innerHTML = '<option value="">-- Choose Assignment --</option><option value="manual">-- Custom / Manual --</option>';
    if (!cid) return;

    const allAssignments = JSON.parse(localStorage.getItem('obe_assignments') || '[]');
    const courseAsgn = allAssignments.filter(a => a.courseId === cid);
    courseAsgn.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.dataset.marks = a.marks || a.maxMarks || 10;
      opt.dataset.topic = a.title || a.topic || '';
      opt.textContent = a.title || a.topic || `Assignment ${a.id}`;
      assignmentSelect.appendChild(opt);
    });
  });

  // ── Assignment → Pre-fill question & marks ────────────────────────────────
  assignmentSelect.addEventListener('change', () => {
    const sel = assignmentSelect.value;
    if (!sel || sel === 'manual') {
      maxMarksInput.value = '';
      manualQuestionInput.value = '';
      rubricsInput.value = '';
      return;
    }
    const allAssignments = JSON.parse(localStorage.getItem('obe_assignments') || '[]');
    const a = allAssignments.find(x => x.id === sel);
    if (!a) return;
    
    maxMarksInput.value = a.maxMarks || a.marks || 10;
    
    // Assemble all questions into a single text block
    if (a.questions && a.questions.length > 0) {
      manualQuestionInput.value = a.questions.map(q => `Q${q.qNo}: ${q.text} [${q.marks} marks]`).join('\n\n');
      
      // Assemble all rubrics
      const rList = [];
      if (a.rubrics && a.rubrics.length > 0) {
        a.rubrics.forEach(r => { if(r.criterion) rList.push(r.criterion); });
      } else {
        a.questions.forEach(q => { if(q.rubric) rList.push(`Q${q.qNo}: ${q.rubric}`); });
      }
      rubricsInput.value = rList.join('\n');
    } else {
      manualQuestionInput.value = a.title || '';
    }
  });

  // ── Copy feedback ─────────────────────────────────────────────────────────
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const text = document.getElementById('overall-feedback').textContent;
      navigator.clipboard.writeText(text).then(() => {
        btnCopy.textContent = 'Copied to Clipboard';
        setTimeout(() => { btnCopy.textContent = 'Copy Feedback'; }, 2000);
      });
    });
  }

  // ── Form submit ───────────────────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const maxMarks   = parseInt(maxMarksInput.value, 10);
    const rubricsRaw = rubricsInput.value.trim();
    const question   = manualQuestionInput ? manualQuestionInput.value.trim() : '';
    const hasFile    = fileInput.files.length > 0;
    const text       = textInput.value.trim();

    if (!rubricsRaw) {
      alert('Please enter at least one grading rubric criterion.');
      return;
    }
    if (isNaN(maxMarks) || maxMarks < 1) {
      alert('Please enter a valid maximum marks value (must be at least 1).');
      return;
    }
    if (!hasFile && !text) {
      alert("Please either upload a student's answer file, or paste the answer in the text box.");
      return;
    }

    btn.disabled = true;
    btnText.textContent = 'Evaluating submission...';
    resultDiv.style.display = 'none';

    try {
      let data;

      if (hasFile) {
        // ── File upload via FormData ──────────────────────────────────────
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('rubrics', rubricsRaw);
        formData.append('maxMarks', String(maxMarks));
        formData.append('question', question);

        const rawRes = await fetch(API_BASE + '/api/grade-upload', {
          method: 'POST',
          body: formData
          // DO NOT set Content-Type header — browser sets it with boundary for multipart
        });

        if (!rawRes.ok) {
          const errData = await rawRes.json().catch(() => ({}));
          throw new Error(errData.detail || rawRes.statusText);
        }
        const res = await rawRes.json();
        data = res.data;

      } else {
        // ── Plain text via JSON ───────────────────────────────────────────
        const rubrics = rubricsRaw.split('\n').map(r => r.trim()).filter(r => r);

        // CORRECT apiFetch signature: (path, opts={})
        const res = await apiFetch('/api/grade', {
          method: 'POST',
          body: { text, rubrics, maxMarks, question }
        });
        data = res.data;
      }

      if (!data) throw new Error('No grading data returned from server.');
      renderResults(data, maxMarks);

    } catch (err) {
      console.error('Grading error:', err);
      alert('Grading failed: ' + (err.message || 'Unknown error. Check browser console for details.'));
    } finally {
      btn.disabled = false;
      btnText.textContent = 'Grade Submission';
    }
  });

  // ── Render results ────────────────────────────────────────────────────────
  function renderResults(data, maxMarks) {
    const score     = parseFloat(data.totalScore  ?? 0);
    const pct       = parseFloat(data.percentage  ?? 0);
    const grade     = data.grade       || '—';
    const blooms    = data.bloomsLevel || '—';
    const readiness = parseInt(data.examReadinessScore ?? 0);

    // Score ring
    document.getElementById('final-score').textContent   = score;
    document.getElementById('display-max').textContent   = maxMarks;
    document.getElementById('grade-badge').textContent   = grade;
    document.getElementById('pct-display').textContent   = pct.toFixed(1) + '%';
    document.getElementById('blooms-display').textContent    = blooms;
    document.getElementById('readiness-display').textContent = readiness + '/100';

    // Animate SVG ring
    const circumference = 339.3;
    const offset = circumference - (pct / 100) * circumference;
    const ring = document.getElementById('score-ring-fill');
    if (ring) {
      const ringColor = '#2563EB';
      ring.style.stroke = ringColor;
      setTimeout(() => { ring.style.strokeDashoffset = offset; }, 100);
    }

    // Strengths & weaknesses
    document.getElementById('overall-strengths').textContent  = data.overallStrengths  || 'None noted.';
    document.getElementById('overall-weaknesses').textContent = data.overallWeaknesses || 'None noted.';

    // Key concepts missed
    const conceptsWrap = document.getElementById('concepts-missed-wrap');
    const conceptsList = document.getElementById('concepts-missed-list');
    conceptsList.innerHTML = '';
    if (data.keyConceptsMissed && data.keyConceptsMissed.length > 0) {
      data.keyConceptsMissed.forEach(c => {
        const tag = document.createElement('span');
        tag.className = 'concept-tag';
        tag.textContent = c;
        conceptsList.appendChild(tag);
      });
      conceptsWrap.style.display = 'block';
    } else {
      conceptsWrap.style.display = 'none';
    }

    // Exam readiness bar
    const readinessBar    = document.getElementById('readiness-bar');
    const readinessLabel  = document.getElementById('readiness-score-label');
    if (readinessLabel) readinessLabel.textContent = readiness + ' / 100';
    if (readinessBar) {
      readinessBar.style.background = '#2563EB';
      setTimeout(() => { readinessBar.style.width = readiness + '%'; }, 200);
    }

    // Rubric accordion cards
    const container = document.getElementById('feedback-container');
    container.innerHTML = '';

    const evaluation = data.evaluation || [];
    evaluation.forEach((item, idx) => {
      const scoreAllocated = parseFloat(item.scoreAllocated    ?? 0);
      const maxRubric      = parseFloat(item.maxMarksForRubric ?? (maxMarks / Math.max(evaluation.length, 1)));
      const rubricPct      = maxRubric > 0 ? (scoreAllocated / maxRubric) * 100 : 0;
      const barCol         = '#2563EB';
      const scoreColor     = '#0F172A';

      const card = document.createElement('div');
      card.className = 'rubric-card';
      card.innerHTML = `
        <div class="rubric-card-header" onclick="this.parentElement.classList.toggle('open')">
          <span class="rubric-name">${idx + 1}. ${escapeHtml(item.rubric || '')}</span>
          <div class="rubric-score-pill">
            <div class="rubric-score-bar-wrap">
              <div class="rubric-score-bar" style="width:${rubricPct.toFixed(0)}%; background:${barCol};"></div>
            </div>
            <span class="rubric-score-text" style="color:${scoreColor};">
              ${scoreAllocated} / ${maxRubric}
            </span>
            <span class="rubric-chevron">▼</span>
          </div>
        </div>
        <div class="rubric-card-body">
          <div class="rubric-detail-row">
            <div class="rubric-detail-box justification-box">
              <label>Examiner's Justification</label>
              <p>${escapeHtml(item.justification || '—')}</p>
            </div>
            <div class="rubric-detail-box strength-box">
              <label>Strengths Found</label>
              <p>${escapeHtml(item.strengthsFound || '—')}</p>
            </div>
          </div>
          <div class="rubric-detail-row">
            <div class="rubric-detail-box weakness-box">
              <label>Weaknesses / Gaps</label>
              <p>${escapeHtml(item.weaknessesFound || '—')}</p>
            </div>
            <div class="rubric-detail-box improvement-box">
              <label>How to Improve</label>
              <p>${escapeHtml(item.improvementSuggestion || '—')}</p>
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

    // Overall AI feedback
    document.getElementById('overall-feedback').textContent = data.overallFeedback || '—';

    // Show and scroll into view
    resultDiv.style.display = 'block';
    setTimeout(() => resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  // ── Utility ───────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
});
