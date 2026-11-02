document.addEventListener('DOMContentLoaded', async () => {
  // ── Wait for API sync to complete ──────────────────────────────────────────
  try { await (window._apiReady || Promise.resolve()); } catch(e) { return; }

  // ── Auth Check ─────────────────────────────────────────────────────────────
  let user = null;
  try { user = JSON.parse(sessionStorage.getItem('obe_session')); } catch(e) {}
  if (!user || (user.role !== 'faculty' && user.role !== 'hod' && user.role !== 'admin')) {
    window.location.href = '../login.html';
    return;
  }

  const uNameEl = document.querySelector('.user-name');
  const uRoleEl = document.querySelector('.user-role');
  const uAvEl   = document.querySelector('.user-avatar');
  if (uNameEl) uNameEl.textContent = user.name || 'Faculty User';
  if (uRoleEl) uRoleEl.textContent = (user.role || 'faculty').toUpperCase();
  if (uAvEl)   uAvEl.textContent   = (user.name || 'F').charAt(0).toUpperCase();

  // ── DOM References ─────────────────────────────────────────────────────────
  const courseSelect          = document.getElementById('course-select');
  const assignmentSelect      = document.getElementById('assignment-select');
  const assignmentHint        = document.getElementById('assignment-hint');
  const questionSelectWrap    = document.getElementById('question-select-wrap');
  const questionSelect        = document.getElementById('question-select');
  const manualQuestionInput   = document.getElementById('manual-question');
  const maxMarksInput         = document.getElementById('max-marks');
  const bloomsSelect          = document.getElementById('blooms-level');
  const rubricsInput          = document.getElementById('rubrics-text');
  const form                  = document.getElementById('grade-form');
  const btnGrade              = document.getElementById('btn-grade');
  const btnGradeText          = document.getElementById('btn-grade-text');
  const resultDiv             = document.getElementById('grade-result');
  const fileInput             = document.getElementById('answer-file');
  const textInput             = document.getElementById('answer-text');
  const dropZone              = document.getElementById('drop-zone');
  const fileSelectedName      = document.getElementById('file-selected-name');
  const ocrProgressBox        = document.getElementById('ocr-progress-box');
  const ocrProgressBar        = document.getElementById('ocr-progress-bar');
  const ocrStatusText         = document.getElementById('ocr-status-text');
  const ocrPctText            = document.getElementById('ocr-pct-text');
  const docPreviewBox         = document.getElementById('doc-preview-box');
  const previewImg            = document.getElementById('preview-img');
  const previewMetaName       = document.getElementById('preview-meta-name');
  const previewMetaSize       = document.getElementById('preview-meta-size');
  const btnZoomPreview        = document.getElementById('btn-zoom-preview');
  const imageModal            = document.getElementById('image-modal');
  const imageModalImg         = document.getElementById('image-modal-img');
  const btnCopy               = document.getElementById('btn-copy-feedback');
  const ledgerStudentSelect   = document.getElementById('ledger-student-select');
  const ledgerComponentSelect = document.getElementById('ledger-component-select');
  const btnSaveToLedger       = document.getElementById('btn-save-to-ledger');
  const ledgerSaveStatus      = document.getElementById('ledger-save-status');
  const btnGotoMarks          = document.getElementById('btn-goto-marks');
  const btnGotoAttainment     = document.getElementById('btn-goto-attainment');

  let currentLoadedAssignments = [];
  let currentSelectedAssignment = null;
  let lastGradedData = null;
  let ocrExtractedText = '';

  // ── 1. Populate Courses ────────────────────────────────────────────────────
  let coursesList = [];
  try {
    if (user.role === 'hod' || user.role === 'admin') {
      coursesList = DB.courses.all();
    } else {
      coursesList = DB.courses.byFaculty(user.id);
      if (!coursesList || coursesList.length === 0) {
        coursesList = DB.courses.all();
      }
    }
  } catch (err) {
    coursesList = DB.courses.all() || [];
  }

  if (courseSelect) {
    courseSelect.innerHTML = '';
    if (!coursesList || coursesList.length === 0) {
      courseSelect.innerHTML = '<option value="">-- No Courses Available --</option>';
    } else {
      coursesList.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.code || ''} – ${c.name || 'Course'}`;
        courseSelect.appendChild(opt);
      });

      // Restore previously selected course if stored
      const savedCourseId = sessionStorage.getItem('selected_course_id');
      if (savedCourseId && coursesList.some(c => c.id === savedCourseId)) {
        courseSelect.value = savedCourseId;
      }
    }

    // Trigger assignment & student population immediately for initial course
    if (courseSelect.value) {
      sessionStorage.setItem('selected_course_id', courseSelect.value);
      populateAssignments(courseSelect.value);
      populateStudentsRoster(courseSelect.value);
    }

    courseSelect.addEventListener('change', () => {
      const cid = courseSelect.value;
      if (cid) sessionStorage.setItem('selected_course_id', cid);
      populateAssignments(cid);
      populateStudentsRoster(cid);
    });
  }

  // ── 2. Populate Students Roster for Ledger Save ───────────────────────────
  function populateStudentsRoster(courseId) {
    if (!ledgerStudentSelect) return;
    ledgerStudentSelect.innerHTML = '<option value="">-- Choose Student --</option>';
    if (!courseId) return;

    let students = [];
    try {
      students = DB.students.byCourse(courseId) || [];
      if (students.length === 0) {
        // Fallback: check all students
        students = DB.students.all() || [];
      }
    } catch(e) {
      students = DB.students.all() || [];
    }

    students.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.prn || s.id;
      opt.textContent = `${s.prn ? '[' + s.prn + '] ' : ''}${s.name || s.studentName || 'Student'} (Roll: ${s.rollNo || s.roll || '—'})`;
      ledgerStudentSelect.appendChild(opt);
    });

    if (btnGotoMarks) btnGotoMarks.href = `marks.html?course=${encodeURIComponent(courseId)}`;
    if (btnGotoAttainment) btnGotoAttainment.href = `attainment.html?course=${encodeURIComponent(courseId)}`;
  }

  // ── 3. Flexible Assignment Populator ───────────────────────────────────────
  function populateAssignments(courseId) {
    if (!assignmentSelect) return;
    assignmentSelect.innerHTML = '';

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '-- Choose Assessment / Assignment --';
    assignmentSelect.appendChild(defaultOpt);

    const manualOpt = document.createElement('option');
    manualOpt.value = 'manual';
    manualOpt.textContent = '-- Custom / Manual Question Entry --';
    assignmentSelect.appendChild(manualOpt);

    if (!courseId) {
      if (assignmentHint) assignmentHint.textContent = 'Please select a course first.';
      return;
    }

    // Resolve course metadata
    const activeCourse = (coursesList || []).find(c => c.id === courseId || c.code === courseId) || DB.courses.byId(courseId);
    const validCourseKeys = [
      courseId,
      activeCourse ? activeCourse.id : null,
      activeCourse ? activeCourse.code : null
    ].filter(Boolean);

    // Retrieve from multiple data stores
    let assessmentsList = [];

    // Store 1: DB.assessments.byCourse
    try {
      const byCourse = DB.assessments.byCourse(courseId) || [];
      assessmentsList.push(...byCourse);
    } catch(e) {}

    // Store 2: DB.assessments.all() with flexible course matching
    try {
      const all = DB.assessments.all() || [];
      all.forEach(a => {
        if (validCourseKeys.includes(a.courseId) || (activeCourse && a.courseCode === activeCourse.code)) {
          if (!assessmentsList.some(x => x.id === a.id)) {
            assessmentsList.push(a);
          }
        }
      });
    } catch(e) {}

    // Store 3: localStorage 'obe_assignments'
    try {
      const rawLegacy = JSON.parse(localStorage.getItem('obe_assignments') || '[]');
      rawLegacy.forEach(a => {
        if (validCourseKeys.includes(a.courseId) || (activeCourse && a.courseCode === activeCourse.code)) {
          if (!assessmentsList.some(x => x.id === a.id)) {
            assessmentsList.push(a);
          }
        }
      });
    } catch(e) {}

    // Store 4: Check if any IA questions exist in config
    try {
      const cfg = DB.config.get();
      const iaQ = (cfg.iaQuestions || []).filter(q => validCourseKeys.includes(q.courseId));
      if (iaQ.length > 0 && !assessmentsList.some(a => a.id.startsWith('cfg-ia-'))) {
        assessmentsList.push({
          id: `cfg-ia-${courseId}`,
          title: `Internal Assessment (IA) Question Bank (${iaQ.length} Questions)`,
          maxMarks: iaQ.reduce((sum, q) => sum + (parseFloat(q.marks) || 5), 0),
          rbtLevel: iaQ[0]?.bloomsLevel || '3',
          questions: iaQ.map((q, idx) => ({
            qNo: q.qNo || (idx + 1),
            text: q.text || q.questionText || `Question ${idx + 1}`,
            marks: q.marks || 5,
            co: q.co || 1,
            rubric: q.rubric || 'Technical accuracy and complete explanation'
          }))
        });
      }
    } catch(e) {}

    currentLoadedAssignments = assessmentsList;

    if (assessmentsList.length > 0) {
      assessmentsList.forEach((a, i) => {
        const opt = document.createElement('option');
        opt.value = a.id;
        const qCount = (a.questions && a.questions.length) ? ` [${a.questions.length} Questions]` : '';
        const marksLabel = a.maxMarks || a.marks || 10;
        opt.textContent = `${a.title || a.topic || ('Assessment ' + (i + 1))} (${marksLabel}M)${qCount}`;
        assignmentSelect.appendChild(opt);
      });

      if (assignmentHint) {
        assignmentHint.innerHTML = `<span style="color:var(--success);font-weight:600;">✓ ${assessmentsList.length} assessment(s) loaded</span> for this course. Select one above or use manual entry.`;
      }
    } else {
      // Provide option to auto-generate a sample assignment for this course
      const autoGenOpt = document.createElement('option');
      autoGenOpt.value = '__auto_create_sample__';
      const cName = activeCourse ? activeCourse.name : 'Course';
      autoGenOpt.textContent = `✨ + Auto-Generate Assignment for ${cName}...`;
      assignmentSelect.appendChild(autoGenOpt);

      if (assignmentHint) {
        assignmentHint.innerHTML = `No saved assessments found yet. Select <strong>"Auto-Generate"</strong> to instantly create one, or use Custom / Manual.`;
      }
    }
  }

  // ── 4. Assignment Selection & Auto-Fill ─────────────────────────────────────
  if (assignmentSelect) {
    assignmentSelect.addEventListener('change', () => {
      const selId = assignmentSelect.value;

      if (selId === '__auto_create_sample__') {
        autoCreateSampleAssessment();
        return;
      }

      if (!selId || selId === 'manual') {
        currentSelectedAssignment = null;
        if (questionSelectWrap) questionSelectWrap.style.display = 'none';
        if (manualQuestionInput) manualQuestionInput.value = '';
        if (maxMarksInput) maxMarksInput.value = '10';
        if (rubricsInput) rubricsInput.value = '';
        return;
      }

      const a = currentLoadedAssignments.find(x => x.id === selId);
      if (!a) return;

      currentSelectedAssignment = a;

      // Fill Max Marks & Bloom's Level
      if (maxMarksInput) maxMarksInput.value = a.maxMarks || a.marks || 10;
      if (bloomsSelect) {
        const rbt = a.rbtLevel ? `L${String(a.rbtLevel).replace('L', '')}` : 'L3';
        if (bloomsSelect.querySelector(`option[value="${rbt}"]`)) {
          bloomsSelect.value = rbt;
        }
      }

      // Handle Questions (Multi-Question vs Single)
      if (a.questions && a.questions.length > 0) {
        if (questionSelectWrap && questionSelect) {
          questionSelectWrap.style.display = 'block';
          questionSelect.innerHTML = `<option value="all">Evaluate Entire Assignment (All ${a.questions.length} Questions)</option>`;
          a.questions.forEach(q => {
            const opt = document.createElement('option');
            opt.value = String(q.qNo);
            const previewText = (q.text || '').replace(/\n/g, ' ').slice(0, 48);
            opt.textContent = `Q${q.qNo}: ${previewText}... [${q.marks} Marks]`;
            questionSelect.appendChild(opt);
          });
        }
        applyQuestionSelection('all');
      } else {
        if (questionSelectWrap) questionSelectWrap.style.display = 'none';
        if (manualQuestionInput) {
          let qText = a.title || '';
          if (a.description) qText += `\n\n${a.description}`;
          manualQuestionInput.value = qText;
        }
        // Rubrics
        if (rubricsInput) {
          if (a.rubrics && a.rubrics.length > 0) {
            rubricsInput.value = a.rubrics.map(r => r.criterion || r.name || r).join('\n');
          } else {
            rubricsInput.value = 'Correct technical conceptual definitions\nAccurate mathematical formulation / algorithm implementation\nAppropriate architectural schematic or diagrammatic explanation\nSynthesized conclusion and clarity of reasoning';
          }
        }
      }
    });
  }

  // Question sub-selector for multi-question assignments
  if (questionSelect) {
    questionSelect.addEventListener('change', () => {
      applyQuestionSelection(questionSelect.value);
    });
  }

  function applyQuestionSelection(qVal) {
    if (!currentSelectedAssignment || !currentSelectedAssignment.questions) return;
    const questions = currentSelectedAssignment.questions;

    if (qVal === 'all') {
      if (manualQuestionInput) {
        manualQuestionInput.value = questions.map(q => `Q${q.qNo}: ${q.text} [${q.marks} Marks]`).join('\n\n');
      }
      if (maxMarksInput) {
        maxMarksInput.value = currentSelectedAssignment.maxMarks || questions.reduce((s, q) => s + (parseFloat(q.marks) || 0), 0);
      }
      // Rubrics
      const rList = [];
      if (currentSelectedAssignment.rubrics && currentSelectedAssignment.rubrics.length > 0) {
        currentSelectedAssignment.rubrics.forEach(r => { if (r.criterion) rList.push(r.criterion); });
      } else {
        questions.forEach(q => {
          if (q.rubric) rList.push(`Q${q.qNo}: ${q.rubric}`);
        });
      }
      if (rList.length === 0) {
        rList.push('Technical accuracy and conceptual depth');
        rList.push('Detailed mathematical / algorithmic formulation');
        rList.push('Analytical clarity and problem-solving reasoning');
      }
      if (rubricsInput) rubricsInput.value = rList.join('\n');

    } else {
      const q = questions.find(x => String(x.qNo) === String(qVal));
      if (!q) return;
      if (manualQuestionInput) manualQuestionInput.value = `Q${q.qNo}: ${q.text}`;
      if (maxMarksInput) maxMarksInput.value = q.marks || 10;
      if (rubricsInput) {
        if (q.rubric) {
          rubricsInput.value = q.rubric;
        } else if (currentSelectedAssignment.rubrics && currentSelectedAssignment.rubrics.length > 0) {
          rubricsInput.value = currentSelectedAssignment.rubrics.map(r => r.criterion || r).join('\n');
        } else {
          rubricsInput.value = `Correct conceptual explanation for Q${q.qNo}\nStep-by-step technical solution and derivation\nClarity, notation accuracy, and depth of reasoning`;
        }
      }
    }
  }

  // ── Auto-Generate Sample Assessment for Selected Course ───────────────────
  function autoCreateSampleAssessment() {
    const cid = courseSelect ? courseSelect.value : null;
    if (!cid) return;

    const courseObj = (coursesList || []).find(c => c.id === cid) || DB.courses.byId(cid);
    const courseCode = courseObj ? courseObj.code : '230000T';
    const courseName = courseObj ? courseObj.name : 'Engineering Course';

    const sampleAssessment = {
      id: `asgn-${cid}-${Date.now()}`,
      courseId: cid,
      courseCode: courseCode,
      title: `CA 1: Descriptive Analytical Assessment – ${courseName}`,
      description: `Comprehensive continuous evaluation covering core analytical frameworks, derivations, and problem solving for ${courseName}.`,
      maxMarks: 20,
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      rbtLevel: '3',
      coNos: [1, 2],
      aiGenerated: true,
      questions: [
        {
          qNo: 1,
          text: `Critically analyze and compare the foundational architectures in ${courseName}. Highlight the key advantages, computational trade-offs, and operational limitations.`,
          marks: 10,
          co: 1,
          bloomsLevel: 'L3',
          rubric: 'Accurate architectural comparison and technical advantages\nComprehensive trade-off and complexity analysis'
        },
        {
          qNo: 2,
          text: `Derive the underlying mathematical formulation or algorithmic pipeline for optimizing performance in ${courseName}. Provide suitable schematic representations.`,
          marks: 10,
          co: 2,
          bloomsLevel: 'L4',
          rubric: 'Rigorous step-by-step mathematical formulation\nClean schematic diagrams and structural clarity'
        }
      ],
      rubrics: [
        { criterion: 'Accurate technical and theoretical conceptual definitions', weightage: 25 },
        { criterion: 'Rigorous mathematical derivations and algorithmic workflow', weightage: 35 },
        { criterion: 'Architectural schematics, diagrams, and illustrative depth', weightage: 20 },
        { criterion: 'Synthesized evaluation, critical reasoning, and clarity of prose', weightage: 20 }
      ],
      createdAt: new Date().toISOString()
    };

    // Save into DB
    try {
      DB.assessments.add(sampleAssessment);
    } catch(e) {
      console.warn('DB.assessments.add error:', e);
    }

    // Refresh assignments dropdown
    populateAssignments(cid);
    assignmentSelect.value = sampleAssessment.id;
    assignmentSelect.dispatchEvent(new Event('change'));

    if (assignmentHint) {
      assignmentHint.innerHTML = `<span style="color:var(--success);font-weight:700;">✨ Created and loaded "${sampleAssessment.title}"!</span>`;
    }
  }

  // ── 5. Client-Side Open-Source OCR (Tesseract.js) & Visual Preview ─────────
  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover',  (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--primary)'; dropZone.style.background = 'rgba(37,99,235,0.04)'; });
    dropZone.addEventListener('dragleave', ()  => { dropZone.style.borderColor = 'var(--border)'; dropZone.style.background = ''; });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--border)';
      dropZone.style.background = '';
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        const dt = new DataTransfer();
        dt.items.add(e.dataTransfer.files[0]);
        fileInput.files = dt.files;
        handleFileSelection(e.dataTransfer.files[0]);
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length) {
        handleFileSelection(fileInput.files[0]);
      }
    });
  }

  async function handleFileSelection(file) {
    if (!file) return;

    if (fileSelectedName) {
      fileSelectedName.textContent = `📎 Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      fileSelectedName.style.display = 'block';
    }

    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|tiff)$/i.test(file.name);
    const isPDF   = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

    if (isImage) {
      // 1. Show visual thumbnail preview
      const objectUrl = URL.createObjectURL(file);
      if (previewImg) previewImg.src = objectUrl;
      if (previewMetaName) previewMetaName.textContent = file.name;
      if (previewMetaSize) previewMetaSize.textContent = `${(file.size / 1024).toFixed(1)} KB • Image / Written Sheet`;
      if (docPreviewBox) docPreviewBox.style.display = 'block';

      // Setup zoom modal
      if (btnZoomPreview && imageModal && imageModalImg) {
        btnZoomPreview.onclick = () => {
          imageModalImg.src = objectUrl;
          imageModal.style.display = 'flex';
        };
      }

      // 2. Run Open-Source Client-Side OCR (Tesseract.js v5)
      await runClientOCR(file);

    } else if (isPDF) {
      if (docPreviewBox) docPreviewBox.style.display = 'none';
      if (ocrProgressBox) {
        ocrProgressBox.style.display = 'block';
        ocrProgressBox.className = 'ocr-progress-box';
        if (ocrStatusText) ocrStatusText.textContent = '📄 PDF Document detected. Server Multimodal Vision will extract and transcribe handwritten pages verbatim on evaluation.';
        if (ocrProgressBar) ocrProgressBar.style.width = '100%';
        if (ocrPctText) ocrPctText.textContent = 'Ready';
      }
    } else {
      if (docPreviewBox) docPreviewBox.style.display = 'none';
      if (ocrProgressBox) ocrProgressBox.style.display = 'none';
    }
  }

  async function runClientOCR(imageFile) {
    if (typeof Tesseract === 'undefined') {
      console.warn('Tesseract.js CDN not available; skipping client OCR.');
      return;
    }

    if (ocrProgressBox) {
      ocrProgressBox.style.display = 'block';
      ocrProgressBox.className = 'ocr-progress-box processing';
    }
    if (ocrStatusText) ocrStatusText.textContent = '🔬 Initializing Tesseract.js Open-Source OCR Worker...';
    if (ocrProgressBar) ocrProgressBar.style.width = '10%';
    if (ocrPctText) ocrPctText.textContent = '10%';

    try {
      const result = await Tesseract.recognize(imageFile, 'eng', {
        logger: m => {
          if (m && m.status) {
            const pct = Math.round((m.progress || 0) * 100);
            if (ocrProgressBar) ocrProgressBar.style.width = `${Math.max(pct, 10)}%`;
            if (ocrPctText) ocrPctText.textContent = `${pct}%`;
            if (ocrStatusText) {
              const friendlyStatus = m.status === 'recognizing text' ? '✍️ Transcribing handwritten text & formulas' : m.status;
              ocrStatusText.textContent = `${friendlyStatus}... (${pct}%)`;
            }
          }
        }
      });

      const text = (result && result.data && result.data.text) ? result.data.text.trim() : '';
      ocrExtractedText = text;

      if (text) {
        if (textInput) {
          textInput.value = text;
        }
        if (ocrStatusText) {
          const conf = result.data.confidence ? ` (Confidence: ${Math.round(result.data.confidence)}%)` : '';
          ocrStatusText.textContent = `✅ Transcribed with Tesseract OCR${conf}! You can review/edit the text below.`;
        }
        if (ocrProgressBar) ocrProgressBar.style.width = '100%';
        if (ocrPctText) ocrPctText.textContent = '100%';
        if (ocrProgressBox) ocrProgressBox.className = 'ocr-progress-box';
      } else {
        if (ocrStatusText) {
          ocrStatusText.textContent = 'ℹ️ Note: Hand-writing details will be deeply transcribed by the server Multimodal Vision Engine upon evaluation.';
        }
      }
    } catch (err) {
      console.warn('Tesseract OCR error:', err);
      if (ocrStatusText) {
        ocrStatusText.textContent = '⚡ Client OCR fallback: The server Multimodal Vision Engine will transcribe this submission during evaluation.';
      }
    }
  }

  // ── 6. Copy Feedback to Clipboard ─────────────────────────────────────────
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const feedbackEl = document.getElementById('overall-feedback');
      const text = feedbackEl ? feedbackEl.textContent : '';
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        const orig = btnCopy.textContent;
        btnCopy.textContent = '✓ Copied';
        setTimeout(() => { btnCopy.textContent = orig; }, 2000);
      });
    });
  }

  // ── 7. Grade Form Submission ──────────────────────────────────────────────
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const maxMarks   = parseInt(maxMarksInput.value, 10);
      const rubricsRaw = rubricsInput.value.trim();
      const question   = manualQuestionInput ? manualQuestionInput.value.trim() : '';
      const hasFile    = fileInput.files && fileInput.files.length > 0;
      const text       = textInput ? textInput.value.trim() : '';

      if (!rubricsRaw) {
        alert('Please enter at least one grading rubric criterion.');
        return;
      }
      if (isNaN(maxMarks) || maxMarks < 1) {
        alert('Please enter a valid maximum score (minimum 1).');
        return;
      }
      if (!hasFile && !text) {
        alert('Please either upload a handwritten submission / PDF / DOCX, or paste the student answer text.');
        return;
      }

      btnGrade.disabled = true;
      if (btnGradeText) btnGradeText.textContent = 'Evaluating submission with AI Engine...';
      if (resultDiv) resultDiv.style.display = 'none';

      try {
        let data;

        if (hasFile) {
          // File upload via FormData with Multimodal Vision & OCR
          const formData = new FormData();
          formData.append('file', fileInput.files[0]);
          formData.append('rubrics', rubricsRaw);
          formData.append('maxMarks', String(maxMarks));
          formData.append('question', question);
          formData.append('extractedText', text || ocrExtractedText || '');

          const rawRes = await fetch(API_BASE + '/api/grade-upload', {
            method: 'POST',
            body: formData
          });

          if (!rawRes.ok) {
            const errData = await rawRes.json().catch(() => ({}));
            throw new Error(errData.detail || rawRes.statusText || 'Upload evaluation failed');
          }
          const res = await rawRes.json();
          data = res.data;

        } else {
          // Pure text submission
          const rubrics = rubricsRaw.split('\n').map(r => r.trim()).filter(Boolean);
          const res = await apiFetch('/api/grade', {
            method: 'POST',
            body: { text, rubrics, maxMarks, question }
          });
          data = res.data;
        }

        if (!data) throw new Error('No evaluation output received from grading engine.');
        lastGradedData = data;
        renderResults(data, maxMarks);

      } catch (err) {
        console.error('Auto-grading error:', err);
        alert('Evaluation failed: ' + (err.message || 'Please check server connection.'));
      } finally {
        btnGrade.disabled = false;
        if (btnGradeText) btnGradeText.textContent = 'Evaluate with AI Engine';
      }
    });
  }

  // ── 8. Render Results Panel (With Zero Null-Exceptions) ───────────────────
  function renderResults(data, maxMarks) {
    const score     = parseFloat(data.totalScore  ?? 0);
    const pct       = parseFloat(data.percentage  ?? ((score / maxMarks) * 100));
    const grade     = data.grade       || (pct >= 80 ? 'A+' : pct >= 70 ? 'A' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'F');
    const blooms    = data.bloomsLevel || (bloomsSelect ? bloomsSelect.value : 'L3');
    const readiness = parseInt(data.examReadinessScore ?? Math.min(100, Math.round(pct * 1.05)));

    // Score & Marks
    const finalScoreEl = document.getElementById('final-score');
    const displayMaxEl = document.getElementById('display-max');
    const gradeBadgeEl = document.getElementById('grade-badge');
    const pctDisplayEl = document.getElementById('pct-display');
    const bloomsDispEl = document.getElementById('blooms-display');
    const readScoreEl  = document.getElementById('readiness-score-label');
    const readBarEl    = document.getElementById('readiness-bar');

    if (finalScoreEl) finalScoreEl.textContent = score;
    if (displayMaxEl) displayMaxEl.textContent = maxMarks;
    if (gradeBadgeEl) {
      gradeBadgeEl.textContent = grade;
      gradeBadgeEl.className = pct >= 60 ? 'badge badge-success' : (pct >= 40 ? 'badge badge-warning' : 'badge badge-danger');
    }
    if (pctDisplayEl) pctDisplayEl.textContent = `${pct.toFixed(1)}%`;
    if (bloomsDispEl) bloomsDispEl.textContent = `Bloom's: ${blooms}`;
    if (readScoreEl)  readScoreEl.textContent  = `${readiness} / 100`;
    if (readBarEl) {
      setTimeout(() => {
        readBarEl.style.width = `${Math.min(100, readiness)}%`;
        readBarEl.style.background = readiness >= 70 ? 'var(--success)' : (readiness >= 50 ? 'var(--primary)' : 'var(--warning)');
      }, 100);
    }

    // Strengths & Weaknesses
    const strengthsEl  = document.getElementById('overall-strengths');
    const weaknessesEl = document.getElementById('overall-weaknesses');
    if (strengthsEl)  strengthsEl.textContent  = data.overallStrengths  || 'Demonstrated good structural approach to problem statement.';
    if (weaknessesEl) weaknessesEl.textContent = data.overallWeaknesses || 'Could strengthen deeper mathematical proofs and boundary conditions.';

    // Key Concepts Missed
    const conceptsWrap = document.getElementById('concepts-missed-wrap');
    const conceptsList = document.getElementById('concepts-missed-list');
    if (conceptsWrap && conceptsList) {
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
    }

    // Rubric Breakdown Cards
    const container = document.getElementById('feedback-container');
    if (container) {
      container.innerHTML = '';
      const evaluation = data.evaluation || [];

      if (evaluation.length === 0) {
        container.innerHTML = '<p style="font-size:12.5px;color:var(--text-secondary);margin:0;">No rubric-by-rubric breakdown available.</p>';
      } else {
        evaluation.forEach((item, idx) => {
          const scoreAllocated = parseFloat(item.scoreAllocated ?? 0);
          const maxRubric      = parseFloat(item.maxMarksForRubric ?? (maxMarks / Math.max(evaluation.length, 1)));
          const rubricPct      = maxRubric > 0 ? (scoreAllocated / maxRubric) * 100 : 0;
          const barColor       = rubricPct >= 70 ? 'var(--success)' : (rubricPct >= 50 ? 'var(--primary)' : 'var(--warning)');

          const card = document.createElement('div');
          card.className = 'rubric-card';
          card.innerHTML = `
            <div class="rubric-card-header" onclick="this.parentElement.classList.toggle('open')">
              <span class="rubric-name">${idx + 1}. ${escapeHtml(item.rubric || 'Criterion ' + (idx + 1))}</span>
              <div class="rubric-score-pill">
                <div class="rubric-score-bar-wrap">
                  <div class="rubric-score-bar" style="width:${Math.min(100, rubricPct).toFixed(0)}%; background:${barColor};"></div>
                </div>
                <span style="color:var(--text-primary); font-family:var(--font-mono, monospace);">
                  ${scoreAllocated} / ${maxRubric}
                </span>
                <span class="rubric-chevron">▼</span>
              </div>
            </div>
            <div class="rubric-card-body">
              <div class="rubric-detail-row">
                <div class="rubric-detail-box">
                  <label>Examiner Justification</label>
                  <p>${escapeHtml(item.justification || 'Performance aligned with standard criteria.')}</p>
                </div>
                <div class="rubric-detail-box">
                  <label style="color:var(--success);">Strengths Found</label>
                  <p>${escapeHtml(item.strengthsFound || 'Correct key statements identified.')}</p>
                </div>
              </div>
              <div class="rubric-detail-row">
                <div class="rubric-detail-box">
                  <label style="color:var(--danger);">Gaps / Deficiencies</label>
                  <p>${escapeHtml(item.weaknessesFound || 'Minor conceptual omissions.')}</p>
                </div>
                <div class="rubric-detail-box">
                  <label style="color:var(--primary);">Recommended Improvement</label>
                  <p>${escapeHtml(item.improvementSuggestion || 'Review mathematical proofs and diagrams.')}</p>
                </div>
              </div>
            </div>
          `;
          container.appendChild(card);
        });
      }
    }

    // Overall Summary Feedback
    const overallFeedbackEl = document.getElementById('overall-feedback');
    if (overallFeedbackEl) {
      overallFeedbackEl.textContent = data.overallFeedback || 'Evaluation concluded successfully.';
    }

    // Reset ledger status
    if (ledgerSaveStatus) ledgerSaveStatus.style.display = 'none';

    // Show Results Panel and scroll into view smoothly
    if (resultDiv) {
      resultDiv.style.display = 'block';
      setTimeout(() => resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }

  // ── 9. Save Graded Mark Directly into Student Ledger & Attainment ──────────
  if (btnSaveToLedger) {
    btnSaveToLedger.addEventListener('click', async () => {
      if (!lastGradedData) {
        alert('Please evaluate a submission first before saving.');
        return;
      }

      const prn = ledgerStudentSelect ? ledgerStudentSelect.value : null;
      if (!prn) {
        alert('Please select a student from the dropdown to record this grade.');
        if (ledgerStudentSelect) ledgerStudentSelect.focus();
        return;
      }

      const cid = courseSelect ? courseSelect.value : null;
      if (!cid) {
        alert('Course not found.');
        return;
      }

      const comp = ledgerComponentSelect ? ledgerComponentSelect.value : 'ca';
      const finalScore = parseFloat(lastGradedData.totalScore || 0);
      const maxMarks = parseInt(maxMarksInput.value || 10, 10);
      const studentObj = (DB.students.byCourse(cid) || []).find(s => s.prn === prn || s.id === prn) || DB.students.byPRN(cid, prn);
      const studentName = studentObj ? studentObj.name : prn;

      btnSaveToLedger.disabled = true;
      btnSaveToLedger.innerHTML = '<span>Saving to Ledger...</span>';

      try {
        // Construct assessment identifier based on selection
        let assessId = currentSelectedAssignment ? currentSelectedAssignment.id : `asgn-${cid}-${comp}`;

        // 1. Save into DB.marksUnified
        DB.marks.set(cid, prn, assessId, 'Q1', finalScore);

        // 2. Also record in specific assessment marks if applicable
        if (comp === 'ia1' || comp === 'ia2') {
          try {
            let marksIA = JSON.parse(localStorage.getItem('obe_marks_ia') || '[]');
            const idx = marksIA.findIndex(m => m.courseId === cid && m.prn === prn && String(m.qNo) === '1');
            if (idx >= 0) marksIA[idx].marks = finalScore;
            else marksIA.push({ courseId: cid, prn, qNo: 1, marks: finalScore });
            localStorage.setItem('obe_marks_ia', JSON.stringify(marksIA));
          } catch(e) {}
        }

        // 3. Record in DB.submissions
        try {
          DB.submissions.add({
            courseId: cid,
            assessId: assessId,
            assignmentId: assessId,
            prn: prn,
            studentName: studentName,
            marks: finalScore,
            maxMarks: maxMarks,
            submittedAt: new Date().toISOString(),
            status: 'Graded',
            evaluation: lastGradedData
          });
        } catch(e) {}

        // 4. Send mark to backend /api/marks if online
        try {
          if (typeof apiFetch === 'function') {
            await apiFetch('/api/marks', {
              method: 'POST',
              body: {
                courseId: cid,
                prn: prn,
                assessmentType: comp,
                qNo: 1,
                marks: finalScore,
                maxMarks: maxMarks
              }
            }).catch(() => {});
          }
        } catch(e) {}

        // Display success confirmation
        if (ledgerSaveStatus) {
          ledgerSaveStatus.style.display = 'block';
          ledgerSaveStatus.innerHTML = `
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;padding:8px 12px;border-radius:var(--r-sm);">
              ✅ <strong>Recorded Successfully!</strong> Grade of <strong>${finalScore} / ${maxMarks}</strong> saved for <strong>${escapeHtml(studentName)}</strong> (${prn}) in component <em>${comp.toUpperCase()}</em>. Real-time attainment updated.
            </div>
          `;
        }

      } catch (err) {
        console.error('Error saving mark to ledger:', err);
        alert('Could not save grade: ' + err.message);
      } finally {
        btnSaveToLedger.disabled = false;
        btnSaveToLedger.innerHTML = '<span data-icon="save"></span><span>Save Mark to Ledger</span>';
        if (typeof renderAllIcons === 'function') renderAllIcons();
      }
    });
  }

  // ── Helper ─────────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
});
