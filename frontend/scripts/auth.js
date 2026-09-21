/* ============================================================
   AUTH.JS — Authentication & Role-Based Routing
   ============================================================ */

const Auth = (() => {

  const SESSION_KEY = 'obe_session';

  /* ── Find the project root URL ──
     Works reliably from ANY page at ANY depth and across server ports.
  */
  function _root() {
    const href = window.location.href;
    const lower = href.toLowerCase();
    
    // Check if we are inside a specific module directory (admin/faculty/hod/student)
    const moduleMatch = lower.match(/\/(admin|faculty|hod|student)\//);
    if (moduleMatch && moduleMatch.index !== undefined) {
      return href.substring(0, moduleMatch.index + 1);
    }
    
    const idx = lower.lastIndexOf('/frontend/');
    if (idx !== -1) return href.substring(0, idx + 10); // includes /frontend/
    
    // Fallback: assume the project root is the server root
    return window.location.origin + '/';
  }

  function _go(path) {
    window.location.href = _root() + path;
  }

  /* Role → dashboard page */
  const DASHBOARDS = {
    admin   : 'admin/dashboard.html',
    faculty : 'faculty/dashboard.html',
    hod     : 'hod/dashboard.html',
    student : 'student/dashboard.html',
  };

  /* ── Login ── */
  async function login(email, password) {
    try {
      const isLocal = typeof window !== 'undefined' && (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const apiBase = typeof window !== 'undefined' && window.API_BASE !== undefined ? window.API_BASE : (isLocal ? 'http://127.0.0.1:8080' : 'https://obe-system-backend.onrender.com');
      const res = await fetch(apiBase + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      if (!res.ok) {
        if (res.status === 401) return { ok: false, error: 'Invalid email or password.' };
        return { ok: false, error: 'Backend error: ' + res.status };
      }
      const data = await res.json();
      const user = data.user;
      const session = {
        id      : user.id,
        name    : user.name,
        email   : user.email,
        role    : user.role,
        deptId  : user.deptId || null,
        prn     : user.prn   || null,
        avatar  : user.avatar || user.name[0].toUpperCase(),
        loginAt : Date.now(),
        token   : data.access_token
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return { ok: true, user: session };
    } catch (e) {
      return { ok: false, error: 'Failed to connect to the backend server.' };
    }
  }

  /* ── Logout ── */
  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem('obe_chat_session');
    sessionStorage.removeItem('selected_course_id');
    sessionStorage.removeItem('6a_selected_course');
    _go('login.html');
  }

  /* ── Get current session ── */
  function getUser() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
    catch(e) { return null; }
  }

  /* ── Get current token ── */
  function getToken() {
    const user = getUser();
    return user ? user.token : null;
  }

  /* ── Require auth (call at top of each protected page) ── */
  function requireAuth(allowedRoles) {
    const user = getUser();
    if (!user) { _go('login.html'); return null; }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      _go(DASHBOARDS[user.role] || 'login.html');
      return null;
    }
    return user;
  }

  /* ── Redirect after login ── */
  function redirectToDashboard() {
    const user = getUser();
    if (!user) return;
    const dest = DASHBOARDS[user.role];
    if (dest) _go(dest);
  }

  /* ── Export and Import Database Helpers ── */
  function exportDatabase() {
    const backup = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('obe_')) {
        try {
          backup[key] = JSON.parse(localStorage.getItem(key));
        } catch(e) {
          backup[key] = localStorage.getItem(key);
        }
      }
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute("download", `obe_database_backup_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  function importDatabasePrompt() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = readerEvent => {
        try {
          const content = JSON.parse(readerEvent.target.result);
          const keys = Object.keys(content);
          const obeKeys = keys.filter(k => k.startsWith('obe_'));
          if (obeKeys.length === 0) {
            if (window.Toast) Toast.error('The uploaded file is not a valid OBE database backup.');
            else alert('Error: The uploaded file is not a valid OBE database backup.');
            return;
          }
          const doRestore = () => {
            // Clear existing obe_ keys
            for (let i = localStorage.length - 1; i >= 0; i--) {
              const key = localStorage.key(i);
              if (key && key.startsWith('obe_')) localStorage.removeItem(key);
            }
            // Write new keys
            obeKeys.forEach(key => {
              const val = content[key];
              localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
            });
            if (window.Toast) Toast.success('Database restored! Reloading…');
            setTimeout(() => window.location.reload(), 800);
          };
          const msg = `This will overwrite your current data with <strong>${obeKeys.length} tables</strong> from the backup. Are you sure?`;
          if (window.Modal) {
            Modal.confirm('Restore Database', msg, doRestore, 'Yes, Restore', true);
          } else if (confirm(`Restore database? This will overwrite ${obeKeys.length} tables.`)) {
            doRestore();
          }
        } catch (err) {
          if (window.Toast) Toast.error('Error parsing backup file: ' + err.message);
          else alert('Error parsing backup file: ' + err.message);
        }
      };
      reader.readAsText(file, 'UTF-8');
    };
    input.click();
  }

  /* ── Populate sidebar user info ── */
  function populateSidebar(user) {
    const u = user || getUser();
    if (!u) return;
    const nameEl   = document.querySelector('.user-name');
    const roleEl   = document.querySelector('.user-role');
    const avatarEl = document.querySelector('.user-avatar');
    if (nameEl)   nameEl.textContent   = u.name || 'User';
    if (roleEl)   roleEl.innerHTML     = (u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : '') + '<br><span style="font-size:10px;opacity:0.8;font-weight:normal">' + (u.username || '') + '</span>';
    if (avatarEl) avatarEl.textContent = u.avatar || (u.name ? u.name[0].toUpperCase() : 'U');

    // Unified Sidebar for HOD
    if (u.role === 'hod') {
      const nav = document.querySelector('.sidebar-nav');
      if (nav) {
        nav.innerHTML = `
          <p class="nav-section-label">Department</p>
          <a class="nav-item" href="../hod/dashboard.html"><span class="nav-icon" data-icon="dashboard"></span><span>Dept Overview</span></a>
          <a class="nav-item" href="../hod/reports.html"><span class="nav-icon" data-icon="reports"></span><span>Dept Reports</span></a>
          <p class="nav-section-label">My Teaching</p>
          <a class="nav-item" href="../faculty/dashboard.html"><span class="nav-icon" data-icon="dashboard"></span><span>My Dashboard</span></a>
          <a class="nav-item" href="../faculty/courses.html"><span class="nav-icon" data-icon="courses"></span><span>My Courses</span></a>
          <p class="nav-section-label">Course Management</p>
          <a class="nav-item" href="../faculty/syllabus.html"><span class="nav-icon" data-icon="syllabus"></span><span>Syllabus Setup</span></a>
          <a class="nav-item" href="../faculty/outcomes.html"><span class="nav-icon" data-icon="outcomes"></span><span>CO & PO Setup</span></a>
          <a class="nav-item" href="../faculty/co-po-map.html"><span class="nav-icon" data-icon="map"></span><span>CO-PO Mapping</span></a>
          <a class="nav-item" href="../faculty/6a-matrix.html"><span class="nav-icon" data-icon="matrix"></span><span>6A Indicator Matrix</span></a>
          <a class="nav-item" href="../faculty/students.html"><span class="nav-icon" data-icon="students"></span><span>Students</span></a>
          <p class="nav-section-label">Assessment</p>
          <a class="nav-item" href="../faculty/marks.html"><span class="nav-icon" data-icon="marks"></span><span>Marks Entry</span></a>
          <a class="nav-item" href="../faculty/attainment.html"><span class="nav-icon" data-icon="attainment"></span><span>Attainment</span></a>
          <a class="nav-item" href="../faculty/assignments.html"><span class="nav-icon" data-icon="assignments"></span><span>Assignments</span></a>
          <a class="nav-item" href="../faculty/auto-grade.html"><span class="nav-icon" data-icon="grade"></span><span>Auto-Grading</span></a>
          <a class="nav-item" href="../faculty/question-paper.html"><span class="nav-icon" data-icon="paper"></span><span>Question Paper</span></a>
          <a class="nav-item" href="../faculty/reports.html"><span class="nav-icon" data-icon="reports"></span><span>Course Reports</span></a>
        `;
      }
    }

    // Always highlight active nav
    highlightNav();

    // Inject date into every topbar-right (if not already there)
    document.querySelectorAll('.topbar-right').forEach(topbarRight => {
      if (!topbarRight.querySelector('.topbar-date')) {
        const dateEl = document.createElement('span');
        dateEl.className = 'topbar-date';
        dateEl.textContent = new Date().toLocaleDateString('en-IN', {
          weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
        });
        topbarRight.prepend(dateEl);
      }
    });

    // Inject Backup & Restore buttons (if not already injected)
    document.querySelectorAll('.sidebar-footer').forEach(footer => {
      if (!footer.querySelector('.db-backup-restore-container')) {
        const logoutBtn = footer.querySelector('[data-action="logout"]');
        if (logoutBtn) {
          const container = document.createElement('div');
          container.className = 'db-backup-restore-container';
          container.style.cssText = 'display:flex;gap:6px;margin-top:10px;margin-bottom:4px';
          container.innerHTML = `
            <button class="btn btn-secondary btn-sm db-backup-btn" style="flex:1;justify-content:center;font-size:11px;padding:5px 4px;color:#94A3B8;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);">
              Backup
            </button>
            <button class="btn btn-secondary btn-sm db-restore-btn" style="flex:1;justify-content:center;font-size:11px;padding:5px 4px;color:#94A3B8;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);">
              Restore
            </button>
          `;
          footer.insertBefore(container, logoutBtn);
          container.querySelector('.db-backup-btn').addEventListener('click', exportDatabase);
          container.querySelector('.db-restore-btn').addEventListener('click', importDatabasePrompt);
        }
      }
    });

    // Wire logout button
    document.querySelectorAll('[data-action="logout"]').forEach(el => {
      el.addEventListener('click', () => Auth.logout());
    });
  }

  /* ── Active nav item ── */
  function highlightNav() {
    const currentFile = window.location.pathname.split('/').pop().toLowerCase();
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.remove('active');
      const href = (el.getAttribute('href') || '').toLowerCase().split('?')[0].split('/').pop();
      if (href && href === currentFile) {
        el.classList.add('active');
      }
    });
  }

  /* ── Global Click Listener for Sign Out Delegation ── */
  document.addEventListener('click', (e) => {
    const logoutBtn = e.target.closest('[data-action="logout"], .btn-logout, [data-logout]');
    if (logoutBtn) {
      e.preventDefault();
      logout();
    }
  });

  /* ── Auto-initialize on load ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const u = getUser();
      if (u) populateSidebar(u);
    });
  } else {
    const u = getUser();
    if (u) populateSidebar(u);
  }

  return {
    login,
    logout,
    getUser,
    getToken,
    requireAuth,
    requireRole: requireAuth,
    redirectToDashboard,
    populateSidebar,
    highlightNav,
    DASHBOARDS,
    exportDatabase,
    importDatabasePrompt
  };
})();
