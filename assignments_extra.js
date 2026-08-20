
  // ─────────────────────────────────────────────────────────────
  // PDF / DOCX QUESTION EXTRACTOR
  // ─────────────────────────────────────────────────────────────
  let _extractedData = null;

  // Drag-and-drop and file-change using event delegation (modal is dynamic)
  document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'pdf-q-file') {
      const fn = e.target.files[0] && e.target.files[0].name;
      if (fn) {
        const label = document.getElementById('pdf-q-filename');
        if (label) { label.textContent = '\uD83D\uDCC4 ' + fn; label.style.display = 'block'; }
      }
    }
  });
  document.addEventListener('dragover', function(e) {
    if (e.target && e.target.closest && e.target.closest('#pdf-drop-zone')) e.preventDefault();
  });
  document.addEventListener('drop', function(e) {
    const zone = e.target.closest && e.target.closest('#pdf-drop-zone');
    if (!zone) return;
    e.preventDefault();
    if (e.dataTransfer.files.length) {
      const fileInput = document.getElementById('pdf-q-file');
      if (!fileInput) return;
      try {
        const dt = new DataTransfer();
        dt.items.add(e.dataTransfer.files[0]);
        fileInput.files = dt.files;
      } catch(ex) {}
      const label = document.getElementById('pdf-q-filename');
      if (label) { label.textContent = '\uD83D\uDCC4 ' + e.dataTransfer.files[0].name; label.style.display = 'block'; }
    }
  });

  async function extractQuestionsFromFile() {
    const fileInput = document.getElementById('pdf-q-file');
    if (!fileInput || !fileInput.files.length) {
      Toast.warning('Please select a PDF or DOCX file first.');
      return;
    }

    const btn = document.getElementById('btn-extract-q');
    const origText = btn.innerHTML;
    btn.innerHTML = '\u23F3 AI is reading your file...';
    btn.disabled = true;

    try {
      const cos = DB.cos.byCourse(currentCourseId).filter(function(c) { return c.text; });
      const cosContext = cos.map(function(c) { return 'CO' + c.no + ': ' + c.text; }).join('\n');

      const formData = new FormData();
      formData.append('file', fileInput.files[0]);
      formData.append('cos_context', cosContext);

      const res = await fetch((window.API_BASE || 'http://127.0.0.1:8000') + '/api/extract-assignment-questions', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        let errMsg = res.statusText;
        try { const e = await res.json(); errMsg = e.detail || errMsg; } catch(ex) {}
        throw new Error(errMsg);
      }

      const json = await res.json();
      if (!json.success || !json.data) throw new Error('No data returned from AI');

      _extractedData = json.data;
      renderExtractedPreview(_extractedData);
      Toast.success('\u2705 Extracted ' + (_extractedData.questions && _extractedData.questions.length || 0) + ' questions!');
    } catch (err) {
      console.error(err);
      Toast.error('Extraction failed: ' + err.message);
    } finally {
      btn.innerHTML = origText;
      btn.disabled = false;
    }
  }

  function renderExtractedPreview(data) {
    const resultDiv = document.getElementById('pdf-extract-result');
    const preview   = document.getElementById('pdf-extract-preview');
    if (!resultDiv || !preview) return;

    const rbtColors = { L1:'#64748b', L2:'#0ea5e9', L3:'#10b981', L4:'#f59e0b', L5:'#f97316', L6:'#8b5cf6' };
    preview.innerHTML = (data.questions || []).map(function(q, i) {
      const rbt = q.rbt || 'L3';
      const color = rbtColors[rbt] || '#64748b';
      return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<span style="font-weight:700;color:var(--primary)">Q' + (q.q_no || (i+1)) + '</span>' +
          '<div style="display:flex;gap:6px">' +
            '<span class="badge badge-info">CO' + (q.co_no || '?') + '</span>' +
            '<span style="padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;background:' + color + '22;color:' + color + '">RBT ' + rbt + '</span>' +
            '<span style="padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;background:rgba(245,158,11,.15);color:#d97706">' + (q.marks || 10) + ' marks</span>' +
          '</div>' +
        '</div>' +
        '<p style="font-size:13px;color:var(--text-primary);margin:0 0 8px">' + escHtml(q.text || '') + '</p>' +
        (q.rubric ? '<div style="font-size:11px;color:var(--text-secondary);border-top:1px solid var(--border);padding-top:6px;margin-top:6px"><strong>Rubric:</strong> ' + escHtml(q.rubric) + '</div>' : '') +
      '</div>';
    }).join('');

    resultDiv.style.display = 'block';

    const titleEl = document.getElementById('aTitle');
    const marksEl = document.getElementById('aMaxMarks');
    if (titleEl && !titleEl.value && data.title) titleEl.value = data.title;
    if (marksEl && data.total_marks) marksEl.value = data.total_marks;
  }

  function applyExtractedQuestions() {
    if (!_extractedData || !(_extractedData.questions && _extractedData.questions.length)) {
      Toast.warning('No questions to apply. Please extract first.');
      return;
    }

    // Switch to Manual tab
    const manualBtn = document.querySelector('[data-tab="manualTab"]');
    if (manualBtn) manualBtn.click();

    const titleEl = document.getElementById('aTitle');
    const marksEl = document.getElementById('aMaxMarks');
    if (titleEl && _extractedData.title) titleEl.value = _extractedData.title;
    if (marksEl && _extractedData.total_marks) marksEl.value = _extractedData.total_marks;

    const area = document.getElementById('questionsArea');
    if (area) {
      area.querySelectorAll('.qrow[id]').forEach(function(r) { r.remove(); });
      _extractedData.questions.forEach(function(q, i) {
        const tmp = document.createElement('div');
        tmp.innerHTML = qRowHtml(i, { text: q.text || '', marks: q.marks || 10, coNo: q.co_no || '', rbt: q.rbt || 'L3' });
        area.appendChild(tmp.firstElementChild);
      });
    }

    const rubricArea = document.getElementById('rubricsArea');
    if (rubricArea) {
      rubricArea.querySelectorAll('.rubric-row[id]').forEach(function(r) { r.remove(); });
      _extractedData.questions.forEach(function(q, i) {
        if (!q.rubric) return;
        const tmp = document.createElement('div');
        tmp.innerHTML = rubricRowHtml(i, {
          criterion: q.rubric || '',
          coNo: q.co_no || '',
          exceptional: q.rubric_exceptional || '',
          best: q.rubric_good || '',
          average: q.rubric_avg || ''
        });
        rubricArea.appendChild(tmp.firstElementChild);
      });
    }

    const uniqueCos = [];
    _extractedData.questions.forEach(function(q) { if (q.co_no && uniqueCos.indexOf(q.co_no) < 0) uniqueCos.push(q.co_no); });
    const coNosEl = document.getElementById('aCoNos');
    if (coNosEl && uniqueCos.length) coNosEl.value = uniqueCos.join(',');

    Toast.success('Questions and rubrics applied! Review and save.');
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

