/* ============================================================
   AUTH.JS — Authentication & Role-Based Routing
   ============================================================ */

const Auth = (() => {

  const SESSION_KEY = 'obe_session';

  /* ── Find the project root URL ──
     Works from ANY page at ANY depth.
     Looks for /OBE/ in the URL and uses everything up to it as root.
     Example: file:///c:/Users/.../OBE/admin/dashboard.html
           → root = file:///c:/Users/.../OBE/
  */
  function _root() {
    const href = window.location.href;
    const lower = href.toLowerCase();
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
      const apiBase = typeof window !== 'undefined' && window.API_BASE !== undefined ? window.API_BASE : 'http://127.0.0.1:8080';
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
          <a class="nav-item" href="../hod/dashboard.html">📊 Dept Overview</a>
          <a class="nav-item" href="../hod/reports.html">📄 Dept Reports</a>
          <p class="nav-section-label">My Teaching</p>
          <a class="nav-item" href="../faculty/dashboard.html">📈 My Dashboard</a>
          <a class="nav-item" href="../faculty/courses.html">📚 My Courses</a>
          <p class="nav-section-label">Course Management</p>
          <a class="nav-item" href="../faculty/syllabus.html">📖 Syllabus Setup</a>
          <a class="nav-item" href="../faculty/outcomes.html">🎯 CO & PO Setup</a>
          <a class="nav-item" href="../faculty/co-po-map.html">🗺️ CO-PO Mapping</a>
          <a class="nav-item" href="../faculty/6a-matrix.html">📋 6A Indicator Mapping</a>
          <a class="nav-item" href="../faculty/students.html">👥 Students</a>
          <p class="nav-section-label">Assessment</p>
          <a class="nav-item" href="../faculty/marks.html">📝 Marks Entry</a>
          <a class="nav-item" href="../faculty/attainment.html">📈 Attainment</a>
          <a class="nav-item" href="../faculty/assignments.html">🤖 Assignments & AI</a>
          <a class="nav-item" href="../faculty/auto-grade.html">✅ Auto-Grading</a>
          <a class="nav-item" href="../faculty/question-paper.html">📄 Question Paper</a>
          <a class="nav-item" href="../faculty/reports.html">📄 Course Reports</a>
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
            <button class="btn btn-ghost btn-sm db-backup-btn" style="flex:1;justify-content:center;font-size:11px;padding:5px 4px;color:#64748B;border:1px solid rgba(255,255,255,0.08);">
              📥 Backup
            </button>
            <button class="btn btn-ghost btn-sm db-restore-btn" style="flex:1;justify-content:center;font-size:11px;padding:5px 4px;color:#64748B;border:1px solid rgba(255,255,255,0.08);">
              📤 Restore
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

  return { login, logout, getUser, getToken, requireAuth, redirectToDashboard, populateSidebar, highlightNav, DASHBOARDS, exportDatabase, importDatabasePrompt };
})();
