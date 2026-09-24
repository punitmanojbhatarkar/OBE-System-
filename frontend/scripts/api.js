/* ============================================================
   API.JS — Real Backend Bridge for OBE System
   Fetches ALL data from Python SQLite backend at startup,
   then hydrates localStorage so all pages work transparently.
   Also overrides all DB write methods to POST/PUT/DELETE to the backend.
   ============================================================ */

// Auto-detect: if served from the backend (same origin), use relative URLs.
// If opened as file:// or locally, use hardcoded local URL. Otherwise use Render backend.
const isLocal = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isLocal ? 'http://127.0.0.1:8080' : 'https://obe-system-backend-t0ri.onrender.com';
window.API_BASE = API_BASE;

let apiQueue = Promise.resolve();
let activeApiRequests = 0;

// Prevent navigation if we are still saving to the backend
window.addEventListener('beforeunload', (e) => {
  if (activeApiRequests > 0) {
    e.preventDefault();
    e.returnValue = 'Changes are still saving to the database. Are you sure you want to leave?';
  }
});

/* ── Low-level fetch helper ── */
async function apiFetch(path, opts = {}) {
  const isWrite = opts.method && ['POST', 'PUT', 'DELETE'].includes(opts.method.toUpperCase());
  
  const exec = async () => {
    try {
      const sessionRaw = sessionStorage.getItem('obe_session');
      const session = sessionRaw ? JSON.parse(sessionRaw) : null;
      const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
      if (session && session.token) {
        headers['Authorization'] = `Bearer ${session.token}`;
      }

      const res = await fetch(API_BASE + path, {
        headers: headers,
        ...opts,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });
      if (!res.ok) {
        if (res.status === 401 && !path.includes('/api/auth/login')) {
          // Token expired or invalid, auto logout
          sessionStorage.removeItem('obe_session');
          window.location.href = 'login.html';
        }
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || res.statusText);
      }
      return await res.json();
    } catch (e) {
      console.error('[API]', path, e.message);
      throw e;
    }
  };

  if (isWrite) {
    activeApiRequests++;
    const resultPromise = apiQueue.then(() => exec());
    apiQueue = resultPromise.catch(() => {}).finally(() => { activeApiRequests--; });
    return resultPromise;
  }
  return exec();
}

/* ── Show loading overlay while syncing ── */
function showSyncOverlay() {
  const el = document.createElement('div');
  el.id = 'api-sync-overlay';
  el.style.cssText = `
    position:fixed;inset:0;background:rgba(15,23,42,0.85);z-index:99999;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;
    font-family:'Plus Jakarta Sans',sans-serif;color:#fff;
  `;
  el.innerHTML = `
    <div style="width:48px;height:48px;border:4px solid rgba(255,255,255,0.2);border-top-color:#3B82F6;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
    <div style="font-size:18px;font-weight:700;">Connecting to database…</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.6);" id="api-sync-msg">Loading data from backend</div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  `;
  if (document.body) {
    document.body.prepend(el);
  } else {
    document.addEventListener('DOMContentLoaded', () => document.body.prepend(el));
  }
  
  // Phase 2: Patterns and Outcomes
  async function getPatterns() {
    const res = await fetch(API_BASE + '/api/patterns');
    return await res.json();
  }
  async function getOutcomes() {
    const res = await fetch(API_BASE + '/api/outcomes');
    return await res.json();
  }

  
  // Phase 3: Reports
  async function generateNBAReport(course_id) {
    const res = await fetch(API_BASE + '/api/nba-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id })
    });
    return await res.json();
  }
  
  async function generateCurriculumGapPlan(course_id) {
    const res = await fetch(API_BASE + '/api/curriculum-gap-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id })
    });
    return await res.json();
  }

  return {
    msg: (t) => { const m = el.querySelector('#api-sync-msg'); if (m) m.textContent = t; },
    done: () => { el.remove(); }
  };
}

/* ── Show error overlay if backend is down ── */
function showOfflineError(err) {
  const el = document.getElementById('api-sync-overlay');
  if (el) {
    el.innerHTML = `
      <div style="color:#EF4444;margin-bottom:12px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </div>
      <div style="font-size:20px;font-weight:700;color:#EF4444;">Backend Not Running</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.7);max-width:420px;text-align:center;">
        Could not connect to the Python backend at <strong>${API_BASE}</strong>.<br>
        Please start it by running:<br>
        <code style="background:rgba(255,255,255,0.1);padding:6px 12px;border-radius:6px;margin-top:8px;display:inline-block;">
          cd backend && .\\venv\\Scripts\\activate && uvicorn main:app --reload
        </code>
      </div>
      <button onclick="location.reload()" style="margin-top:16px;padding:10px 24px;background:#2563EB;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;">
        Retry Connection
      </button>
    `;
  }
}

/* ── Transform backend course to match frontend data.js shape ── */
function normalizeCourse(c) {
  
  // Phase 2: Patterns and Outcomes
  async function getPatterns() {
    const res = await fetch(API_BASE + '/api/patterns');
    return await res.json();
  }
  async function getOutcomes() {
    const res = await fetch(API_BASE + '/api/outcomes');
    return await res.json();
  }

  
  // Phase 3: Reports
  async function generateNBAReport(course_id) {
    const res = await fetch(API_BASE + '/api/nba-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id })
    });
    return await res.json();
  }
  
  async function generateCurriculumGapPlan(course_id) {
    const res = await fetch(API_BASE + '/api/curriculum-gap-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id })
    });
    return await res.json();
  }

  return {
    ...c,
    class: c.class || c.klass || '',
    examScheme: c.examScheme || { ia: 30, mse: 20, ese: 50 },
    attainmentLevels: c.attainmentLevels || { 1: 65, 2: 75, 3: 85 },
    directWeight: c.directWeight || 80,
    indirectWeight: c.indirectWeight || 20,
    status: c.status || 'active',
  };
}

function mergeLocalStore(key, newItems, isMatch) {
  try {
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(existing) || existing.length === 0) {
      localStorage.setItem(key, JSON.stringify(newItems || []));
      return;
    }
    const merged = [...existing];
    (newItems || []).forEach(newItem => {
      const idx = merged.findIndex(oldItem => isMatch(oldItem, newItem));
      if (idx >= 0) {
        // Backend data wins — overwrite local with backend, keeping any local-only fields
        merged[idx] = { ...merged[idx], ...newItem };
      } else {
        merged.push(newItem);
      }
    });
    localStorage.setItem(key, JSON.stringify(merged));
  } catch (e) {
    localStorage.setItem(key, JSON.stringify(newItems || []));
  }
}

/* ── Main sync function: load ALL data from backend into localStorage ── */
async function syncFromBackend() {
  const overlay = showSyncOverlay();

  try {
    overlay.msg('Loading configuration…');
    const config = await apiFetch('/api/config');
    const storedCfg = { ...config };
    const iaQGrouped = {};
    for (const item of (config.iaQuestions || [])) {
      const key = `${item.courseId}::${item.assessmentType}::${item.assessmentNo}`;
      if (!iaQGrouped[key]) {
        iaQGrouped[key] = { courseId: item.courseId, assessmentType: item.assessmentType, assessmentNo: item.assessmentNo, questions: [] };
      }
      if (item.questions) {
        iaQGrouped[key].questions.push(...item.questions);
      }
    }
    storedCfg.iaQuestions = Object.values(iaQGrouped);
    localStorage.setItem('obe_config', JSON.stringify(storedCfg));

    overlay.msg('Loading departments…');
    const depts = await apiFetch('/api/departments');
    localStorage.setItem('obe_departments', JSON.stringify(depts || []));

    overlay.msg('Loading users…');
    const users = await apiFetch('/api/users');
    localStorage.setItem('obe_users', JSON.stringify(users || []));

    overlay.msg('Loading courses…');
    const courses = await apiFetch('/api/courses');
    mergeLocalStore('obe_courses', courses.map(normalizeCourse), (a, b) => a.id === b.id);

    overlay.msg('Loading course outcomes…');
    let allCOs = [];
    for (const c of courses) {
      const cos = await apiFetch(`/api/courses/${c.id}/cos`);
      allCOs = allCOs.concat(cos);
    }
    mergeLocalStore('obe_cos', allCOs, (a, b) => a.id === b.id || (a.courseId === b.courseId && String(a.no) === String(b.no)));

    overlay.msg('Loading PO mappings…');
    let allPO = [];
    let allIndicatorMapping = {};
    for (const c of courses) {
      const po = await apiFetch(`/api/courses/${c.id}/pomapping`);
      allPO = allPO.concat(po);
      
      try {
        const im = await apiFetch(`/api/courses/${c.id}/indicatormapping`);
        if (im && Object.keys(im.mappingData || {}).length > 0) {
          allIndicatorMapping[c.id] = im.mappingData;
        }
      } catch (err) {
        console.warn(`Failed to fetch indicator mapping for course ${c.id}:`, err);
      }
    }
    mergeLocalStore('obe_po_mapping', allPO, (a, b) => a.courseId === b.courseId && String(a.coNo) === String(b.coNo) && a.po === b.po);
    localStorage.setItem('obe_indicator_mapping', JSON.stringify(allIndicatorMapping));

    overlay.msg('Loading students…');
    let allStudents = [];
    for (const c of courses) {
      const sts = await apiFetch(`/api/courses/${c.id}/students`);
      allStudents = allStudents.concat(sts);
    }
    mergeLocalStore('obe_students', allStudents, (a, b) => a.id === b.id || (a.courseId === b.courseId && a.prn === b.prn));

    overlay.msg('Loading marks…');
    let allIA = [], allMSE = [], allESE = [];
    for (const c of courses) {
      const ia = await apiFetch(`/api/courses/${c.id}/marks/ia`);
      const mse = await apiFetch(`/api/courses/${c.id}/marks/mse`);
      const ese = await apiFetch(`/api/courses/${c.id}/marks/ese`);
      allIA = allIA.concat(ia);
      allMSE = allMSE.concat(mse);
      allESE = allESE.concat(ese);
    }
    mergeLocalStore('obe_marks_ia', allIA, (a, b) => a.courseId === b.courseId && a.prn === b.prn && String(a.qNo) === String(b.qNo));
    mergeLocalStore('obe_marks_mse', allMSE, (a, b) => a.courseId === b.courseId && a.prn === b.prn && String(a.qNo) === String(b.qNo));
    mergeLocalStore('obe_marks_ese', allESE, (a, b) => a.courseId === b.courseId && a.prn === b.prn && String(a.qNo) === String(b.qNo));

    overlay.msg('Loading IA questions…');
    let allIAQ = [];
    for (const c of courses) {
      const iaq = await apiFetch(`/api/courses/${c.id}/ia-questions`);
      allIAQ = allIAQ.concat(iaq);
    }
    const mergedCfg = JSON.parse(localStorage.getItem('obe_config') || '{}');
    mergedCfg.iaQuestions = allIAQ;
    localStorage.setItem('obe_config', JSON.stringify(mergedCfg));

    overlay.msg('Loading assignments & syllabus…');
    let allAssignments = [];
    for (const c of courses) {
      const asgn = await apiFetch(`/api/courses/${c.id}/assignments`);
      allAssignments = allAssignments.concat(asgn);
    }
    mergeLocalStore('obe_assignments', allAssignments, (a, b) => a.id === b.id);

    // Hydrate unified obe_assessments — only REAL faculty-created assessments from the DB.
    // ia_questions are for marks-entry structure only and must NOT create assessment cards.
    let allAssessments = [];
    allAssignments.forEach(asgn => {
      allAssessments.push({
        id: asgn.id,
        courseId: asgn.courseId,
        type: asgn.type || 'assignment',
        no: asgn.no || 1,
        title: asgn.title || 'Assignment',
        description: asgn.description || '',
        maxMarks: asgn.maxMarks || 10,
        dueDate: asgn.dueDate || null,
        rbtLevel: asgn.rbtLevel || null,
        coNos: asgn.coNos || (asgn.coNo ? [asgn.coNo] : []),
        aiGenerated: asgn.aiGenerated || false,
        questions: asgn.questions || [],
        rubrics: asgn.rubrics || [],
        createdAt: asgn.createdAt || new Date().toISOString()
      });
    });
    // Purge stale iaq- ghost entries from old code, then hard-set from backend.
    {
      const existingRaw = JSON.parse(localStorage.getItem('obe_assessments') || '[]');
      const cleaned = existingRaw.filter(a => !String(a.id || '').startsWith('iaq-'));
      const merged = [...allAssessments];
      cleaned.forEach(localItem => {
        if (!allAssessments.some(b => b.id === localItem.id)) { merged.push(localItem); }
      });
      localStorage.setItem('obe_assessments', JSON.stringify(merged));
    }

    let allMarksUnified = [];
    allIA.forEach(m => {
      allMarksUnified.push({
        courseId: m.courseId,
        prn: m.prn,
        assessId: `iaq-${m.courseId}-ia-${m.assessmentNo || 1}`,
        qNo: m.qNo,
        marks: m.marks
      });
    });
    allMSE.forEach(m => {
      allMarksUnified.push({
        courseId: m.courseId,
        prn: m.prn,
        assessId: `iaq-${m.courseId}-mse-1`,
        qNo: m.qNo,
        marks: m.marks
      });
    });
    allESE.forEach(m => {
      allMarksUnified.push({
        courseId: m.courseId,
        prn: m.prn,
        assessId: `iaq-${m.courseId}-ese-1`,
        qNo: m.qNo,
        marks: m.marks
      });
    });
    mergeLocalStore('obe_marks_unified', allMarksUnified, (a, b) => a.courseId === b.courseId && a.prn === b.prn && a.assessId === b.assessId && String(a.qNo) === String(b.qNo));

    let allSurvey = [];
    for (const c of courses) {
      const sv = await apiFetch(`/api/courses/${c.id}/survey`);
      allSurvey = allSurvey.concat(sv);
    }
    mergeLocalStore('obe_survey', allSurvey, (a, b) => a.courseId === b.courseId && a.prn === b.prn && String(a.co) === String(b.co));

    // Mark as initialized so data.js doesn't re-seed with initial institutional data
    localStorage.setItem('obe_initialized_v2', '1');

    overlay.done();
    console.log('[API] Sync complete — all data loaded from backend.');
    window.dispatchEvent(new CustomEvent('obe_data_synced'));
  } catch (e) {
    console.error('[API] Sync failed:', e);
    showOfflineError(e);
    throw e; // Prevent page from running without backend
  }
}

/* ════════════════════════════════════════════
   PATCH DB WRITE METHODS to also persist to backend
   These run AFTER data.js loads, so they wrap the original methods.
   ════════════════════════════════════════════ */
function patchDBWriteMethods() {
  if (typeof DB === 'undefined') { console.warn('[API] DB not found, skip patching'); return; }

  // ── Courses ──
  const _courseAdd = DB.courses.add.bind(DB.courses);
  DB.courses.add = function(c) {
    const result = _courseAdd(c);
    apiFetch('/api/courses', { method: 'POST', body: { ...c, klass: c.class } }).catch(e => console.warn('[API] course add failed', e));
    return result;
  };

  const _courseUpdate = DB.courses.update.bind(DB.courses);
  DB.courses.update = function(c) {
    const result = _courseUpdate(c);
    apiFetch(`/api/courses/${c.id}`, { method: 'PUT', body: { ...c, klass: c.class } }).catch(e => console.warn('[API] course update failed', e));
    return result;
  };

  const _courseDelete = DB.courses.delete.bind(DB.courses);
  DB.courses.delete = function(id) {
    _courseDelete(id);
    apiFetch(`/api/courses/${id}`, { method: 'DELETE' }).catch(e => {});
  };

  // ── Course Outcomes ──
  const _coSaveAll = DB.cos.saveAll.bind(DB.cos);
  DB.cos.saveAll = function(cid, list) {
    _coSaveAll(cid, list);
    apiFetch('/api/cos/saveall', { method: 'POST', body: { courseId: cid, cos: list } }).catch(e => console.warn('[API] co saveAll failed', e));
  };

  // ── PO Mapping ──
  const _poSetValue = DB.poMapping.setValue.bind(DB.poMapping);
  DB.poMapping.setValue = function(cid, coNo, po, val, justification='') {
    _poSetValue(cid, coNo, po, val, justification);
    // Also persist individual cell change to backend
    const currentMatrix = DB.poMapping.byCourse(cid);
    apiFetch('/api/pomapping/save', { method: 'POST', body: { courseId: cid, matrix: currentMatrix } })
      .catch(e => console.warn('[API] po mapping setValue failed', e));
  };

  const _poSaveMatrix = DB.poMapping.saveMatrix.bind(DB.poMapping);
  DB.poMapping.saveMatrix = function(cid, matrix) {
    _poSaveMatrix(cid, matrix);
    apiFetch('/api/pomapping/save', { method: 'POST', body: { courseId: cid, matrix } }).catch(e => console.warn('[API] po mapping save failed', e));
  };

  // ── Indicator Mapping (6A) ──
  const _imSave = DB.indicatorMapping.save.bind(DB.indicatorMapping);
  DB.indicatorMapping.save = function(cid, mapping) {
    _imSave(cid, mapping);
    apiFetch('/api/indicatormapping/save', { method: 'POST', body: { courseId: cid, mappingData: mapping } }).catch(e => console.warn('[API] indicator mapping save failed', e));
  };


  // ── Students ──
  const _stSaveAll = DB.students.saveAll.bind(DB.students);
  DB.students.saveAll = function(cid, list) {
    _stSaveAll(cid, list);
    apiFetch('/api/students/saveall', { method: 'POST', body: { courseId: cid, students: list } }).catch(e => console.warn('[API] students saveAll failed', e));
  };

  const _stAdd = DB.students.add.bind(DB.students);
  DB.students.add = function(s) {
    const result = _stAdd(s);
    apiFetch('/api/students', { method: 'POST', body: s }).catch(e => console.warn('[API] students add failed', e));
    return result;
  };

  const _stUpdate = DB.students.update.bind(DB.students);
  DB.students.update = function(s) {
    const result = _stUpdate(s);
    apiFetch(`/api/students/${s.id}`, { method: 'PUT', body: s }).catch(e => console.warn('[API] students update failed', e));
    return result;
  };

  const _stDelete = DB.students.delete.bind(DB.students);
  DB.students.delete = function(id) {
    _stDelete(id);
    apiFetch(`/api/students/${id}`, { method: 'DELETE' }).catch(e => console.warn('[API] students delete failed', e));
  };

  // ── Assignments ──
  const _asgnAdd = DB.assignments.add.bind(DB.assignments);
  DB.assignments.add = function(a) {
    const result = _asgnAdd(a);
    apiFetch('/api/assignments', { method: 'POST', body: a }).catch(e => console.warn('[API] assignment add failed', e));
    return result;
  };

  // ── Syllabus ──
  const _sylSave = DB.syllabus.save.bind(DB.syllabus);
  DB.syllabus.save = function(cid, data) {
    _sylSave(cid, data);
    apiFetch('/api/syllabus/save', { method: 'POST', body: { courseId: cid, ...data } }).catch(e => console.warn('[API] syllabus save failed', e));
  };

  // ── Users ──
  const _userAdd = DB.users.add.bind(DB.users);
  DB.users.add = function(u) {
    const result = _userAdd(u);
    apiFetch('/api/users', { method: 'POST', body: u }).catch(e => {});
    return result;
  };

  const _userUpdate = DB.users.update.bind(DB.users);
  DB.users.update = function(u) {
    const result = _userUpdate(u);
    apiFetch(`/api/users/${u.id}`, { method: 'PUT', body: u }).catch(e => {});
    return result;
  };

  const _userDelete = DB.users.delete.bind(DB.users);
  DB.users.delete = function(id) {
    _userDelete(id);
    apiFetch(`/api/users/${id}`, { method: 'DELETE' }).catch(e => {});
  };

  // ── Departments ──
  const _deptAdd = DB.departments.add.bind(DB.departments);
  DB.departments.add = function(d) {
    const result = _deptAdd(d);
    apiFetch('/api/departments', { method: 'POST', body: d }).catch(e => {});
    return result;
  };

  const _deptUpdate = DB.departments.update.bind(DB.departments);
  DB.departments.update = function(d) {
    const result = _deptUpdate(d);
    apiFetch(`/api/departments/${d.id}`, { method: 'PUT', body: d }).catch(e => {});
    return result;
  };

  const _deptDelete = DB.departments.delete.bind(DB.departments);
  DB.departments.delete = function(id) {
    _deptDelete(id);
    apiFetch(`/api/departments/${id}`, { method: 'DELETE' }).catch(e => {});
  };

  // ── Config (Settings) ──
  const _configUpdate = DB.config.update.bind(DB.config);
  DB.config.update = function(cfg) {
    const result = _configUpdate(cfg);
    const { iaQuestions, ...flatConfig } = cfg;
    apiFetch('/api/config', { method: 'PUT', body: flatConfig }).catch(e => console.warn('[API] config save failed', e));
    return result;
  };

  // ── Survey ──
  const _surveySaveAll = DB.survey.saveAll.bind(DB.survey);
  DB.survey.saveAll = function(cid, list) {
    _surveySaveAll(cid, list);
    apiFetch('/api/survey/save', { method: 'POST', body: { courseId: cid, survey: list } }).catch(e => console.warn('[API] survey save failed', e));
  };
  const _surveySetScore = DB.survey.setScore.bind(DB.survey);
  DB.survey.setScore = function(cid, prn, co, score) {
    _surveySetScore(cid, prn, co, score);
    apiFetch('/api/survey/save', { method: 'POST', body: { courseId: cid, survey: DB.survey.byCourse(cid) } }).catch(e => console.warn('[API] survey set failed', e));
  };

  // ── Config (IA Questions) ──
  const _saveIAQ = DB.config.saveIAQuestions ? DB.config.saveIAQuestions.bind(DB.config) : null;
  if (_saveIAQ) {
    DB.config.saveIAQuestions = function(cid, type, list) {
      _saveIAQ(cid, type, list);
      apiFetch('/api/ia-questions/save', { method: 'POST', body: { courseId: cid, assessmentType: type || 'ia', assessmentNo: 1, questions: list } }).catch(e => console.warn('[API] ia-questions save failed', e));
    };
  }

  // ── Assessments ──
  if (DB.assessments) {
    const _asgnAdd = DB.assessments.add.bind(DB.assessments);
    DB.assessments.add = function(a) {
      const res = _asgnAdd(a);
      if (a.type === 'assignment') {
        apiFetch('/api/assignments', { method: 'POST', body: a }).catch(e => console.warn('[API] asgn add failed', e));
      } else {
        apiFetch('/api/ia-questions/save', { method: 'POST', body: { courseId: a.courseId, assessmentType: a.type || 'ia', assessmentNo: a.no || 1, questions: a.questions } }).catch(e => console.warn('[API] ia-questions save failed', e));
      }
      return res;
    };
    const _asgnUpdate = DB.assessments.update.bind(DB.assessments);
    DB.assessments.update = function(a) {
      const res = _asgnUpdate(a);
      if (a.type === 'assignment') {
        apiFetch('/api/assignments', { method: 'POST', body: a }).catch(e => console.warn('[API] asgn update failed', e));
      } else {
        apiFetch('/api/ia-questions/save', { method: 'POST', body: { courseId: a.courseId, assessmentType: a.type || 'ia', assessmentNo: a.no || 1, questions: a.questions } }).catch(e => console.warn('[API] ia-questions update failed', e));
      }
      return res;
    };
    const _asgnDelete = DB.assessments.delete.bind(DB.assessments);
    DB.assessments.delete = function(id) {
      _asgnDelete(id);
      if (String(id).startsWith('iaq-')) {
        const parts = String(id).split('-');
        const courseId = parts[1];
        const assessmentType = parts[2];
        const assessmentNo = parseInt(parts[3]) || 1;
        apiFetch(`/api/ia-questions/${courseId}/${assessmentType}/${assessmentNo}`, { method: 'DELETE' }).catch(e => {});
      } else {
        apiFetch(`/api/assignments/${id}`, { method: 'DELETE' }).catch(e => {});
      }
    };
  }

  // ── Marks Unified (Debounced & Clean Sync) ──
  function _syncCourseMarksToBackend(cid) {
    if (!cid || typeof DB === 'undefined' || !DB.marks) return;
    const allForCourse = DB.marks.get(cid) || [];
    const iaList = [], mseList = [], eseList = [], asgnMarksMap = {};

    allForCourse.forEach(m => {
      if (!m || !m.assessId) return;
      const aid = String(m.assessId);

      if (aid.includes('-mse-') || aid === 'mse') {
        mseList.push({ prn: m.prn, qNo: m.qNo, marks: m.marks });
      } else if (aid.includes('-ese-') || aid === 'ese') {
        eseList.push({ prn: m.prn, qNo: m.qNo, marks: m.marks });
      } else if (aid.startsWith('iaq-')) {
        // Legacy iaq- marks for IA question structure marks entry
        const parts = aid.split('-');
        const aNo = parseInt(parts[parts.length - 1]) || 1;
        iaList.push({ prn: m.prn, assessmentNo: aNo, qNo: m.qNo, marks: m.marks });
      } else {
        // Real assignment/question_paper marks — save against the assignment record
        if (!asgnMarksMap[aid]) asgnMarksMap[aid] = [];
        asgnMarksMap[aid].push({ prn: m.prn, qNo: m.qNo, marks: m.marks });
      }
    });

    if (iaList.length > 0) {
      apiFetch('/api/marks/ia/save', { method: 'POST', body: { courseId: cid, marks: iaList } }).catch(e => console.warn('[API] marks IA sync failed', e));
    }
    if (mseList.length > 0) {
      apiFetch('/api/marks/mse/save', { method: 'POST', body: { courseId: cid, marks: mseList } }).catch(e => console.warn('[API] marks MSE sync failed', e));
    }
    if (eseList.length > 0) {
      apiFetch('/api/marks/ese/save', { method: 'POST', body: { courseId: cid, marks: eseList } }).catch(e => console.warn('[API] marks ESE sync failed', e));
    }
    // Save assignment-type marks bundled into obe_marks_unified (backend stored in localStorage only for now,
    // full persistence handled on next sync via unified endpoint when available)
    Object.entries(asgnMarksMap).forEach(([aid, marksList]) => {
      // Best-effort: store marks against the assignment in marks_unified (already done by DB.marks.set)
      // This ensures marks survive page reload via localStorage until a dedicated endpoint is added
      console.log(`[API] marks for assignment ${aid}: ${marksList.length} entries stored locally.`);
    });
  }


  if (DB.marks) {
    let _marksSyncTimer = null;
    const _marksSet = DB.marks.set.bind(DB.marks);
    DB.marks.set = function(cid, prn, assessId, qNo, v) {
      _marksSet(cid, prn, assessId, qNo, v);
      if (_marksSyncTimer) clearTimeout(_marksSyncTimer);
      _marksSyncTimer = setTimeout(() => _syncCourseMarksToBackend(cid), 300);
    };
    const _marksSaveAll = DB.marks.saveAll.bind(DB.marks);
    DB.marks.saveAll = function(cid, list) {
      _marksSaveAll(cid, list);
      if (_marksSyncTimer) clearTimeout(_marksSyncTimer);
      _marksSyncTimer = setTimeout(() => _syncCourseMarksToBackend(cid), 100);
    };
  }

    // ── Action Plans ──
    if (DB.actionPlans && DB.actionPlans.savePlan) {
      const _apSave = DB.actionPlans.savePlan.bind(DB.actionPlans);
      DB.actionPlans.savePlan = function(plan) {
        _apSave(plan);
        apiFetch('/api/actionplans', { method: 'POST', body: plan })
          .catch(e => console.warn('[API] action plan save failed', e));
      };
    }

    console.log('[API] DB write methods patched to persist to backend.');
  }

  /* ════════════════════════════════════════════
     GLOBALS — expose helpers so page scripts can use them
     ════════════════════════════════════════════ */
  window.apiFetch = apiFetch;
  window.mergeLocalStore = mergeLocalStore;

  /* ════════════════════════════════════════════
     BOOTSTRAP — exposes window._apiReady Promise
     All protected pages await this before init.
     _apiReady now AWAITS the full backend sync so
     all localStorage data is ready before pages run.
     ════════════════════════════════════════════ */
  window._apiReady = (async function bootstrap() {
    const sessionRaw = sessionStorage.getItem('obe_session');
    if (!sessionRaw) {
      // Login page — no sync needed
      return;
    }

    // Patch write methods immediately so local DB writes persist
    patchDBWriteMethods();

    // AWAIT full sync — pages should not render until data is ready
    try {
      await syncFromBackend();
    } catch(e) {
      console.warn('[API] Sync failed, pages will use cached localStorage data:', e);
    }
  })();
