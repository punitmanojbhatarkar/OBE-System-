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

// Non-blocking navigation: all data writes are immediately persisted to local storage synchronously,
// so users can freely navigate between pages without invasive browser "Leave site?" interruption dialogs.

/* ── Low-level fetch helper with strict AbortController timeout ── */
async function apiFetch(path, opts = {}) {
  const isWrite = opts.method && ['POST', 'PUT', 'DELETE'].includes(opts.method.toUpperCase());
  const isAiPath = path.includes('/api/extract') || path.includes('/api/generate') || 
                   path.includes('/api/grade') || path.includes('/api/chat') || 
                   path.includes('/api/nba-report') || path.includes('/api/attainment-agent') ||
                   path.includes('/api/auto-map') || path.includes('/api/analyze-blooms') ||
                   path.includes('/api/philosophy') || path.includes('/api/remedial');
  
  const exec = async () => {
    const controller = new AbortController();
    const defaultTimeout = isAiPath ? 90000 : (isWrite ? 25000 : 12000);
    const timeoutMs = opts.timeout || defaultTimeout;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const sessionRaw = sessionStorage.getItem('obe_session');
      const session = sessionRaw ? JSON.parse(sessionRaw) : null;
      const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
      if (session && session.token) {
        headers['Authorization'] = `Bearer ${session.token}`;
      }

      const res = await fetch(API_BASE + path, {
        signal: controller.signal,
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
        let errMsg = res.statusText;
        if (typeof err.detail === 'string') {
          errMsg = err.detail;
        } else if (Array.isArray(err.detail)) {
          errMsg = err.detail.map(d => (d.msg ? `${(d.loc || []).slice(1).join('.')}: ${d.msg}` : JSON.stringify(d))).join('; ');
        } else if (err.detail && typeof err.detail === 'object') {
          errMsg = JSON.stringify(err.detail);
        }
        throw new Error(errMsg || `Request failed (${res.status})`);
      }
      return await res.json();
    } catch (e) {
      if (e.name === 'AbortError') {
        console.warn(`[API] Network request timed out after ${timeoutMs}ms:`, path);
        throw new Error(`Request timed out (${timeoutMs}ms)`);
      }
      console.error('[API]', path, e.message);
      throw e;
    } finally {
      clearTimeout(timer);
    }
  };

  if (isWrite && !isAiPath) {
    activeApiRequests++;
    const resultPromise = apiQueue.then(() => exec());
    apiQueue = resultPromise.catch(() => {}).finally(() => { activeApiRequests--; });
    return resultPromise;
  }
  return exec();
}

/* ── Sleek non-blocking sync status indicator (never freezes or covers the UI) ── */
function showSyncOverlay() {
  let el = document.getElementById('api-sync-indicator');
  if (!el) {
    el = document.createElement('div');
    el.id = 'api-sync-indicator';
    el.style.cssText = `
      position:fixed;bottom:20px;right:20px;z-index:9999;
      background:rgba(15,23,42,0.92);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
      border:1px solid rgba(59,130,246,0.3);border-radius:30px;
      padding:8px 16px;display:flex;align-items:center;gap:10px;
      font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;color:#94A3B8;
      box-shadow:0 10px 25px rgba(0,0,0,0.4);transition:opacity 0.4s ease, transform 0.4s ease;
      pointer-events:none;
    `;
    el.innerHTML = `
      <div id="api-sync-spinner" style="width:13px;height:13px;border:2px solid rgba(59,130,246,0.25);border-top-color:#3B82F6;border-radius:50%;animation:api-spin 0.8s linear infinite;"></div>
      <span id="api-sync-msg" style="color:#E2E8F0;font-weight:600;letter-spacing:0.2px;">Syncing cloud data…</span>
      <style>@keyframes api-spin{to{transform:rotate(360deg)}}</style>
    `;
    if (document.body) {
      document.body.appendChild(el);
    } else {
      document.addEventListener('DOMContentLoaded', () => document.body.appendChild(el));
    }
  } else {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
    const spinner = el.querySelector('#api-sync-spinner');
    if (spinner) spinner.style.display = 'block';
  }

  return {
    msg: (t) => {
      const m = document.getElementById('api-sync-msg');
      if (m) m.textContent = t;
    },
    done: (status = 'success') => {
      const pill = document.getElementById('api-sync-indicator');
      if (!pill) return;
      const spinner = document.getElementById('api-sync-spinner');
      const m = document.getElementById('api-sync-msg');
      if (spinner) spinner.style.display = 'none';
      if (m) {
        if (status === 'success') {
          m.innerHTML = '<span style="color:#10B981;">✓ Cloud Synced</span>';
        } else if (status === 'offline') {
          m.innerHTML = '<span style="color:#94A3B8;">• Offline Mode</span>';
        } else {
          m.innerHTML = '<span style="color:#3B82F6;">• Ready</span>';
        }
      }
      setTimeout(() => {
        pill.style.opacity = '0';
        pill.style.transform = 'translateY(8px)';
        setTimeout(() => pill.remove(), 400);
      }, 1500);
    }
  };
}

/* ── Non-blocking offline notice ── */
function showOfflineError(err) {
  console.warn('[API] Cloud sync unavailable or offline:', err);
  const pill = document.getElementById('api-sync-indicator');
  if (pill) {
    const spinner = document.getElementById('api-sync-spinner');
    const m = document.getElementById('api-sync-msg');
    if (spinner) spinner.style.display = 'none';
    if (m) m.innerHTML = '<span style="color:#94A3B8;">• Offline Mode (Local Cache Active)</span>';
    setTimeout(() => {
      pill.style.opacity = '0';
      setTimeout(() => pill.remove(), 400);
    }, 2000);
  }
}

/* ── Transform backend course to match frontend data.js shape ── */
function normalizeCourse(c) {
  


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
async function syncFromBackend(force = false) {
  // Session throttling: don't re-sync every single page navigation if synced within last 3 minutes (unless forced)
  const lastSync = sessionStorage.getItem('obe_last_synced_at');
  const now = Date.now();
  if (!force && lastSync && (now - parseInt(lastSync, 10)) < 180000) {
    console.log('[API] Backend sync skipped — synced within the last 3 minutes.');
    return;
  }

  const overlay = showSyncOverlay();

  try {
    // ── Fast Bulk Bootstrap: 1 HTTP request fetches the complete system dataset ──
    try {
      overlay.msg('Syncing with OBE cloud backend…');
      const bootstrap = await apiFetch('/api/bootstrap', { timeout: 6500 });
      if (bootstrap && bootstrap.departments && Array.isArray(bootstrap.departments)) {
        if (bootstrap.config) {
          const storedCfg = { ...bootstrap.config };
          const iaQGrouped = {};
          for (const item of (bootstrap.config.iaQuestions || [])) {
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
        }
        localStorage.setItem('obe_departments', JSON.stringify(bootstrap.departments || []));
        localStorage.setItem('obe_users', JSON.stringify(bootstrap.users || []));
        localStorage.setItem('obe_patterns', JSON.stringify(bootstrap.patterns || []));
        localStorage.setItem('obe_outcomes', JSON.stringify(bootstrap.outcomes || []));

        const courses = (bootstrap.courses || []).map(normalizeCourse);
        mergeLocalStore('obe_courses', courses, (a, b) => a.id === b.id);
        mergeLocalStore('obe_cos', bootstrap.cos || [], (a, b) => a.id === b.id || (a.courseId === b.courseId && String(a.no) === String(b.no)));
        mergeLocalStore('obe_po_mapping', bootstrap.po_mappings || [], (a, b) => a.courseId === b.courseId && String(a.coNo) === String(b.coNo) && a.po === b.po);
        localStorage.setItem('obe_indicator_mapping', JSON.stringify(bootstrap.indicator_mappings || {}));
        mergeLocalStore('obe_students', bootstrap.students || [], (a, b) => a.id === b.id || (a.courseId === b.courseId && a.prn === b.prn));
        mergeLocalStore('obe_marks_ia', bootstrap.marks_ia || [], (a, b) => a.courseId === b.courseId && a.prn === b.prn && String(a.qNo) === String(b.qNo));
        mergeLocalStore('obe_marks_mse', bootstrap.marks_mse || [], (a, b) => a.courseId === b.courseId && a.prn === b.prn && String(a.qNo) === String(b.qNo));
        mergeLocalStore('obe_marks_ese', bootstrap.marks_ese || [], (a, b) => a.courseId === b.courseId && a.prn === b.prn && String(a.qNo) === String(b.qNo));

        const mergedCfg = JSON.parse(localStorage.getItem('obe_config') || '{}');
        mergedCfg.iaQuestions = bootstrap.ia_questions || [];
        localStorage.setItem('obe_config', JSON.stringify(mergedCfg));

        mergeLocalStore('obe_assignments', bootstrap.assignments || [], (a, b) => a.id === b.id);

        let allAssessments = [];
        (bootstrap.assignments || []).forEach(asgn => {
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
        (bootstrap.marks_ia || []).forEach(m => {
          allMarksUnified.push({
            courseId: m.courseId,
            prn: m.prn,
            assessId: `iaq-${m.courseId}-ia-${m.assessmentNo || 1}`,
            qNo: m.qNo,
            marks: m.marks
          });
        });
        (bootstrap.marks_mse || []).forEach(m => {
          allMarksUnified.push({
            courseId: m.courseId,
            prn: m.prn,
            assessId: `iaq-${m.courseId}-mse-1`,
            qNo: m.qNo,
            marks: m.marks
          });
        });
        (bootstrap.marks_ese || []).forEach(m => {
          allMarksUnified.push({
            courseId: m.courseId,
            prn: m.prn,
            assessId: `iaq-${m.courseId}-ese-1`,
            qNo: m.qNo,
            marks: m.marks
          });
        });
        mergeLocalStore('obe_marks_unified', allMarksUnified, (a, b) => a.courseId === b.courseId && a.prn === b.prn && a.assessId === b.assessId && String(a.qNo) === String(b.qNo));
        mergeLocalStore('obe_survey', bootstrap.surveys || [], (a, b) => a.courseId === b.courseId && a.prn === b.prn && String(a.co) === String(b.co));

        sessionStorage.setItem('obe_last_synced_at', now.toString());
        localStorage.setItem('obe_initialized_v2', '1');
        overlay.done('success');
        console.log('[API] Bootstrap sync complete — instant bulk load finished in single roundtrip.');
        window.dispatchEvent(new CustomEvent('obe_data_synced'));
        return;
      }
    } catch (bootstrapErr) {
      console.warn('[API] Bootstrap endpoint unavailable or timed out:', bootstrapErr.message);
    }

    // ── Resilient Fallback ──
    // If local courses already exist, DO NOT execute a 50-request waterfall that freezes the browser.
    const localCourses = JSON.parse(localStorage.getItem('obe_courses') || '[]');
    if (localCourses && localCourses.length > 0) {
      console.log('[API] Existing cached dataset active; skipping slow sequential waterfall.');
      sessionStorage.setItem('obe_last_synced_at', now.toString());
      overlay.done('offline');
      return;
    }

    // If device is completely empty (first run), fetch core collections concurrently
    overlay.msg('Loading initial core datasets…');
    const [cfgRes, deptsRes, usersRes, patternsRes, outcomesRes, coursesRes] = await Promise.allSettled([
      apiFetch('/api/config', { timeout: 4500 }),
      apiFetch('/api/departments', { timeout: 4500 }),
      apiFetch('/api/users', { timeout: 4500 }),
      apiFetch('/api/patterns', { timeout: 4500 }),
      apiFetch('/api/outcomes', { timeout: 4500 }),
      apiFetch('/api/courses', { timeout: 4500 })
    ]);

    if (cfgRes.status === 'fulfilled' && cfgRes.value) {
      localStorage.setItem('obe_config', JSON.stringify(cfgRes.value));
    }
    if (deptsRes.status === 'fulfilled' && deptsRes.value) {
      localStorage.setItem('obe_departments', JSON.stringify(deptsRes.value));
    }
    if (usersRes.status === 'fulfilled' && usersRes.value) {
      localStorage.setItem('obe_users', JSON.stringify(usersRes.value));
    }
    if (patternsRes.status === 'fulfilled' && patternsRes.value) {
      localStorage.setItem('obe_patterns', JSON.stringify(patternsRes.value));
    }
    if (outcomesRes.status === 'fulfilled' && outcomesRes.value) {
      localStorage.setItem('obe_outcomes', JSON.stringify(outcomesRes.value));
    }
    if (coursesRes.status === 'fulfilled' && Array.isArray(coursesRes.value)) {
      mergeLocalStore('obe_courses', coursesRes.value.map(normalizeCourse), (a, b) => a.id === b.id);
    }

    sessionStorage.setItem('obe_last_synced_at', now.toString());
    localStorage.setItem('obe_initialized_v2', '1');
    overlay.done('success');
    window.dispatchEvent(new CustomEvent('obe_data_synced'));
  } catch (e) {
    console.warn('[API] Cloud sync timed out or offline, operating in resilient local DB mode:', e);
    overlay.done('offline');
    window.dispatchEvent(new CustomEvent('obe_data_synced'));
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
  let _poDebounceTimer = null;
  const _poSetValue = DB.poMapping.setValue.bind(DB.poMapping);
  DB.poMapping.setValue = function(cid, coNo, po, val, justification='') {
    _poSetValue(cid, coNo, po, val, justification);
    clearTimeout(_poDebounceTimer);
    _poDebounceTimer = setTimeout(() => {
      const currentMatrix = DB.poMapping.byCourse(cid);
      apiFetch('/api/pomapping/save', { method: 'POST', body: { courseId: cid, matrix: currentMatrix } })
        .catch(e => console.warn('[API] po mapping setValue failed', e));
    }, 400);
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

  async function getAdminAnalytics() {
    try { return await apiFetch('/api/admin/analytics', { timeout: 4000 }); } catch(e) { return null; }
  }
  async function getPatterns() {
    try { return await apiFetch('/api/patterns'); } catch(e) { return []; }
  }
  async function getOutcomes() {
    try { return await apiFetch('/api/outcomes'); } catch(e) { return []; }
  }
  async function generateNBAReport(course_id) {
    try { return await apiFetch('/api/nba-report', { method: 'POST', body: { course_id } }); } catch(e) { return null; }
  }
  async function generateCurriculumGapPlan(course_id) {
    try { return await apiFetch('/api/curriculum-gap-plan', { method: 'POST', body: { course_id } }); } catch(e) { return null; }
  }

  window.getAdminAnalytics = getAdminAnalytics;
  window.getPatterns = getPatterns;
  window.getOutcomes = getOutcomes;
  window.generateNBAReport = generateNBAReport;
  window.generateCurriculumGapPlan = generateCurriculumGapPlan;
  window.syncFromBackend = syncFromBackend;
  window.syncNow = () => syncFromBackend(true);

  /* ════════════════════════════════════════════
     BOOTSTRAP — exposes window._apiReady Promise
     All protected pages await this before init.
     If local data exists, resolves INSTANTLY in 0ms
     so the page renders immediately with 0 delay.
     Background sync runs non-blockingly.
     ════════════════════════════════════════════ */
  window._apiReady = (async function bootstrap() {
    const sessionRaw = sessionStorage.getItem('obe_session');
    if (!sessionRaw) {
      // Login page — no sync needed
      return;
    }

    // Patch write methods immediately so local DB writes persist
    patchDBWriteMethods();

    // Check if local cached data is already available
    const hasCachedCourses = !!(localStorage.getItem('obe_courses') && JSON.parse(localStorage.getItem('obe_courses') || '[]').length > 0);

    if (hasCachedCourses) {
      // INSTANT RESOLVE: Allow pages to render immediately in 0ms!
      // Background sync runs quietly without blocking page init.
      syncFromBackend().catch(e => console.warn('[API] Background sync error:', e));
      return;
    }

    // First time on an empty browser: await sync with a short fallback
    try {
      await syncFromBackend();
    } catch(e) {
      console.warn('[API] Initial sync error, using local defaults:', e);
    }
  })();


