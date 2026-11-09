/* ============================================================
   UTILS.JS — Shared UI utilities, Toast, Modal, Clean Formatters
   MIT Academy of Engineering - Enterprise OBE Platform
   ============================================================ */

/* ── Auto-render icons on DOMContentLoaded ── */
document.addEventListener('DOMContentLoaded', () => {
  renderAllIcons();
});

function renderAllIcons(context = document) {
  if (typeof OBEIcons === 'undefined') return;
  const elements = context.querySelectorAll('[data-icon]');
  elements.forEach(el => {
    const iconName = el.getAttribute('data-icon');
    const iconSize = parseInt(el.getAttribute('data-icon-size') || '16', 10);
    const className = el.getAttribute('data-icon-class') || 'obe-icon';
    el.innerHTML = OBEIcons.get(iconName, iconSize, className);
  });
}

/* ── Toast Notifications (Flat, Crisp) ── */
const Toast = (() => {
  function ensure() {
    let el = document.getElementById('toast-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-container';
      el.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
      document.body.appendChild(el);
    }
    return el;
  }
  function show(msg, type = 'info', duration = 3500) {
    const iconNames = { success: 'check', error: 'close', warning: 'alert', info: 'info' };
    const colors = {
      success: { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' },
      error:   { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
      warning: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
      info:    { bg: '#F0F9FF', border: '#BAE6FD', text: '#075985' }
    };
    const c = ensure();
    const t = document.createElement('div');
    const color = colors[type] || colors.info;
    const iconSvg = typeof OBEIcons !== 'undefined' ? OBEIcons.get(iconNames[type] || 'info', 16) : '';
    
    t.style.cssText = `
      background:${color.bg};border:1px solid ${color.border};color:${color.text};
      padding:10px 16px;border-radius:6px;font-size:13px;font-weight:600;
      display:flex;align-items:center;gap:10px;pointer-events:auto;
      min-width:240px;max-width:380px;font-family:inherit;
    `;
    t.innerHTML = `<span>${iconSvg}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transition = 'opacity 0.2s ease';
      setTimeout(() => t.remove(), 200);
    }, duration);
  }
  return {
    success : (m, d) => show(m, 'success', d),
    error   : (m, d) => show(m, 'error', d),
    warning : (m, d) => show(m, 'warning', d),
    info    : (m, d) => show(m, 'info', d),
  };
})();

/* ── Modal (Flat, Clean) ── */
const Modal = (() => {
  function open(html, opts = {}) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-overlay open';
    backdrop.id = 'modal-backdrop';
    const closeSvg = typeof OBEIcons !== 'undefined' ? OBEIcons.get('close', 16) : '×';
    backdrop.innerHTML = `
      <div class="modal-content" style="${opts.wide ? 'max-width:800px;' : ''}">
        ${html}
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop && !opts.persistent) close(); });
    renderAllIcons(backdrop);
    return backdrop;
  }
  function close() {
    const b = document.getElementById('modal-backdrop');
    if (b) b.remove();
  }
  function confirm(title, msg, onYes, yesLabel = 'Confirm', dangerBtn = true) {
    const closeSvg = typeof OBEIcons !== 'undefined' ? OBEIcons.get('close', 16) : '×';
    const html = `
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="btn btn-secondary btn-sm btn-icon" onclick="Modal.close()">${closeSvg}</button>
      </div>
      <div class="modal-body">
        <p style="color:var(--text-secondary);font-size:13.5px;line-height:1.5;">${msg}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn ${dangerBtn ? 'btn-danger' : 'btn-primary'}" id="modal-confirm-btn">${yesLabel}</button>
      </div>`;
    open(html);
    document.getElementById('modal-confirm-btn').onclick = () => { close(); onYes(); };
  }
  function alert(title, msg, onOk) {
    const closeSvg = typeof OBEIcons !== 'undefined' ? OBEIcons.get('close', 16) : '&times;';
    const html = `
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="btn btn-secondary btn-sm btn-icon" onclick="Modal.close()">${closeSvg}</button>
      </div>
      <div class="modal-body">
        <div style="color:var(--text-secondary);font-size:13.5px;line-height:1.6;">${msg}</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" id="modal-alert-btn">OK</button>
      </div>`;
    open(html, { wide: true });
    document.getElementById('modal-alert-btn').onclick = () => { close(); if (onOk) onOk(); };
  }

  function impactConfirm({ title = 'Dependency & Impact Warning', subtitle = '', entityName = '', impact = {}, onConfirm, confirmBtnText = 'I Understand, Proceed & Delete' }) {
    const closeSvg = typeof OBEIcons !== 'undefined' ? OBEIcons.get('close', 16) : '&times;';
    const warnSvg = typeof OBEIcons !== 'undefined' ? OBEIcons.get('alert', 18) : '!';

    const sections = impact.sectionsAffected || [];
    const hasDeps = impact.hasDependencies || sections.length > 0;

    const sectionsHtml = sections.map(s => {
      let badgeClass = 'badge-warning';
      let badgeText = 'EMPTY SECTION WARNING';
      let borderCol = 'rgba(245, 158, 11, 0.4)';
      let bgCol = 'rgba(245, 158, 11, 0.05)';

      if (s.severity === 'critical') {
        badgeClass = 'badge-danger';
        badgeText = 'CRITICAL EMPTY SECTION';
        borderCol = 'rgba(239, 68, 68, 0.4)';
        bgCol = 'rgba(239, 68, 68, 0.06)';
      } else if (s.severity === 'info') {
        badgeClass = 'badge-neutral';
        badgeText = 'UNLINK NOTICE';
        borderCol = 'var(--border)';
        bgCol = 'var(--surface-2)';
      }

      return `
        <div style="background:${bgCol}; border:1px solid ${borderCol}; border-radius:var(--r-md); padding:12px 14px; margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:8px;">
            <div style="font-weight:700; font-size:13px; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
              <span>${s.title}</span>
            </div>
            <span class="badge ${badgeClass}" style="font-size:10px; font-weight:700; letter-spacing:0.04em;">${badgeText}</span>
          </div>
          <div style="font-size:12.5px; color:var(--text-secondary); line-height:1.5;">${s.detail}</div>
        </div>
      `;
    }).join('');

    const html = `
      <div class="modal-header" style="border-bottom: 1px solid var(--border);">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:34px; height:34px; border-radius:50%; background:rgba(239, 68, 68, 0.12); display:flex; align-items:center; justify-content:center; color:var(--danger); font-size:16px;">
            ${warnSvg}
          </div>
          <div>
            <h3 class="modal-title" style="font-size:15px; margin:0; line-height:1.3;">${title}</h3>
            ${subtitle ? `<div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">${subtitle}</div>` : ''}
          </div>
        </div>
        <button class="btn btn-secondary btn-sm btn-icon" onclick="Modal.close()">${closeSvg}</button>
      </div>

      <div class="modal-body" style="padding:16px 20px; max-height:70vh; overflow-y:auto;">
        ${entityName ? `
          <div style="background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-md); padding:10px 14px; margin-bottom:14px; display:flex; align-items:center; justify-content:space-between; gap:12px;">
            <div>
              <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Target Entity</div>
              <div style="font-size:14px; font-weight:700; color:var(--text-primary); margin-top:2px;">${entityName}</div>
            </div>
            <span class="badge ${hasDeps ? 'badge-danger' : 'badge-neutral'}">${hasDeps ? (sections.length + ' Linked Sections') : 'No Active Links'}</span>
          </div>
        ` : ''}

        ${hasDeps ? `
          <div style="background:rgba(239, 68, 68, 0.07); border-left:4px solid var(--danger); border-radius:4px; padding:10px 12px; margin-bottom:14px; font-size:12.5px; color:var(--text-primary); line-height:1.5;">
            <strong>Dependency Impact:</strong> Deleting or modifying this item will leave the following system sections <strong>empty, unassigned, or permanently erased</strong>:
          </div>
          <div style="margin-bottom:14px;">
            ${sectionsHtml}
          </div>
        ` : `
          <p style="color:var(--text-secondary); font-size:13.5px; line-height:1.5; margin:10px 0;">
            ${impact.summary || 'Are you sure you want to proceed with this deletion? This action cannot be undone.'}
          </p>
        `}

        <div style="font-size:11.5px; color:var(--text-muted); line-height:1.4; border-top:1px dashed var(--border); padding-top:10px;">
          System Integrity Notice: Associated records will be cleanly unlinked in both the database and cloud sync.
        </div>
      </div>

      <div class="modal-footer" style="padding:12px 20px; display:flex; justify-content:flex-end; gap:8px;">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn ${hasDeps ? 'btn-danger' : 'btn-primary'}" id="modal-impact-btn">${confirmBtnText}</button>
      </div>
    `;

    open(html, { wide: false });
    document.getElementById('modal-impact-btn').onclick = () => {
      close();
      if (onConfirm) onConfirm();
    };
  }

  return { open, close, confirm, alert, impactConfirm };
})();

/* ── Intelligent Dependency Impact Analyzer ── */
const ImpactAnalyzer = (() => {
  async function getUserImpact(userId) {
    try {
      if (typeof apiFetch === 'function') {
        const res = await apiFetch('/api/impact/user/' + userId);
        if (res && res.userId) return res;
      }
    } catch (e) {
      console.warn('[ImpactAnalyzer] API impact call failed, calculating locally', e);
    }
    // Local calculation fallback
    const u = DB.users.byId(userId);
    if (!u) return { hasDependencies: false, sectionsAffected: [], warnings: [] };
    const depts = DB.departments.all();
    const courses = DB.courses.all();
    const allUsers = DB.users.all();

    const sections = [];
    const warnings = [];

    // Check HOD
    const hodDepts = depts.filter(d => d.hodId === userId || (d.hod && d.hod.trim().toLowerCase() === (u.name || '').trim().toLowerCase()));
    hodDepts.forEach(d => {
      const otherFac = allUsers.filter(x => (x.deptId === d.id || x.deptId === d.code) && x.id !== userId && (x.role === 'faculty' || x.role === 'hod')).length;
      sections.push({
        type: 'department_hod',
        title: `Head of Department: ${d.name} (${d.code})`,
        detail: `Department '${d.name}' (${d.code}) will be left with NO Head of Department assigned. The department card will display "Not Assigned".`,
        severity: otherFac === 0 ? 'critical' : 'warning'
      });
      warnings.push(`Department '${d.name}' will have no HOD.`);
    });

    // Check course faculty
    const taughtCourses = courses.filter(c => c.facultyId === userId);
    taughtCourses.forEach(c => {
      sections.push({
        type: 'course_faculty',
        title: `Course Instructor: ${c.name} (${c.code})`,
        detail: `Course '${c.name}' (${c.code}) will lose its assigned faculty instructor and will have no teacher assigned.`,
        severity: 'warning'
      });
      warnings.push(`Course '${c.name}' will have no instructor.`);
    });

    // Check course champion
    const champCourses = courses.filter(c => c.champion === u.name || c.championId === userId);
    champCourses.forEach(c => {
      sections.push({
        type: 'course_champion',
        title: `Course Champion: ${c.name} (${c.code})`,
        detail: `Course '${c.name}' (${c.code}) will have its course champion cleared.`,
        severity: 'info'
      });
      warnings.push(`Course '${c.name}' champion cleared.`);
    });

    return {
      userId: u.id,
      userName: u.name,
      userRole: u.role,
      hasDependencies: sections.length > 0,
      sectionsAffected: sections,
      warnings,
      summary: sections.length > 0 ? `Removing ${u.name} affects ${sections.length} linked sections.` : `${u.name} has no active HOD or course assignments.`
    };
  }

  async function getDeptImpact(deptId) {
    try {
      if (typeof apiFetch === 'function') {
        const res = await apiFetch('/api/impact/department/' + deptId);
        if (res && res.deptId) return res;
      }
    } catch (e) {
      console.warn('[ImpactAnalyzer] API impact call failed, calculating locally', e);
    }
    const d = DB.departments.byId(deptId) || DB.departments.all().find(x => x.code === deptId);
    if (!d) return { hasDependencies: false, sectionsAffected: [], warnings: [] };
    const courses = DB.courses.all().filter(c => c.deptId === d.id || c.deptId === d.code);
    const users = DB.users.all().filter(u => u.deptId === d.id || u.deptId === d.code);

    const sections = [];
    const warnings = [];

    if (d.hod || d.hodId) {
      sections.push({
        type: 'hod_unlinked',
        title: `Assigned HOD: ${d.hod || 'Assigned'}`,
        detail: `Head of Department '${d.hod || d.hodId}' will become unlinked from this department.`,
        severity: 'warning'
      });
      warnings.push(`HOD will become unlinked.`);
    }

    if (courses.length > 0) {
      sections.push({
        type: 'courses_unlinked',
        title: `${courses.length} Department Courses`,
        detail: `${courses.length} courses (${courses.map(c => c.code).slice(0, 3).join(', ')}${courses.length > 3 ? '...' : ''}) will lose their department association.`,
        severity: 'critical'
      });
      warnings.push(`${courses.length} courses will be unlinked.`);
    }

    if (users.length > 0) {
      sections.push({
        type: 'faculty_unlinked',
        title: `${users.length} Faculty / User Accounts`,
        detail: `${users.length} user accounts will have their department cleared to "All Depts".`,
        severity: 'warning'
      });
      warnings.push(`${users.length} users will become unassigned.`);
    }

    return {
      deptId: d.id,
      deptCode: d.code,
      deptName: d.name,
      hasDependencies: sections.length > 0,
      sectionsAffected: sections,
      warnings,
      summary: sections.length > 0 ? `Removing ${d.name} affects ${courses.length} courses and ${users.length} users.` : `Department has no courses or faculty assigned.`
    };
  }

  async function getCourseImpact(courseId) {
    try {
      if (typeof apiFetch === 'function') {
        const res = await apiFetch('/api/impact/course/' + courseId);
        if (res && (res.courseId || res.sectionsAffected)) return res;
      }
    } catch (e) {
      console.warn('[ImpactAnalyzer] API impact call failed, calculating locally', e);
    }
    const c = DB.courses.byId(courseId);
    if (!c) return { hasDependencies: false, sectionsAffected: [], warnings: [] };
    const students = DB.students.byCourse(courseId) || [];
    const cos = DB.cos.byCourse(courseId) || [];
    const marksIA = (DB.marksIA && DB.marksIA.byCourse) ? DB.marksIA.byCourse(courseId) : [];

    const sections = [];
    const warnings = [];

    if (students.length > 0) {
      sections.push({
        type: 'enrolled_students',
        title: `${students.length} Enrolled Students`,
        detail: `${students.length} student enrollments and survey scores will be permanently deleted.`,
        severity: 'critical'
      });
      warnings.push(`${students.length} enrolled students will be purged.`);
    }

    if (cos.length > 0) {
      sections.push({
        type: 'course_outcomes',
        title: `${cos.length} Course Outcomes (COs)`,
        detail: `${cos.length} defined COs and Bloom's mappings will be permanently removed.`,
        severity: 'warning'
      });
      warnings.push(`${cos.length} COs will be removed.`);
    }

    if (marksIA.length > 0) {
      sections.push({
        type: 'assessment_marks',
        title: 'Assessment Marks Data',
        detail: `${marksIA.length} recorded assessment marks will be permanently erased.`,
        severity: 'critical'
      });
      warnings.push('Recorded assessment marks will be deleted.');
    }

    return {
      courseId: c.id,
      courseCode: c.code,
      courseName: c.name,
      hasDependencies: sections.length > 0,
      sectionsAffected: sections,
      warnings,
      summary: sections.length > 0 ? `Course has active enrolled students or assessment data.` : `Course has no students or data.`
    };
  }

  return { getUserImpact, getDeptImpact, getCourseImpact };
})();

/* ── Tab Switcher ── */
function initTabs(container) {
  const tabs = (container || document).querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      (container || document).querySelectorAll('.tab-content').forEach(c => {
        c.classList.toggle('active', c.id === target);
      });
    });
  });
  if (tabs[0]) tabs[0].click();
}

/* ── Academic Formatters (No Emoji) ── */
const Fmt = {
  pct: (v, dec = 1) => v !== null && v !== undefined ? v.toFixed(dec) + '%' : '—',
  num: (v, dec = 2) => v !== null && v !== undefined ? parseFloat(v).toFixed(dec) : '—',
  level: (l) => l !== null && l !== undefined ? `Level ${l}` : '—',
  date: (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
  initials: (name) => (name || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
  bloom: (l) => ({ L1: 'Remember', L2: 'Understand', L3: 'Apply', L4: 'Analyze', L5: 'Evaluate', L6: 'Create' })[l] || l,
  learner: (t) => {
    if (t === 'slow') return '<span class="badge badge-danger">Slow Learner</span>';
    if (t === 'average') return '<span class="badge badge-warning">Average Learner</span>';
    if (t === 'advanced') return '<span class="badge badge-success">Advanced Learner</span>';
    return `<span class="badge badge-neutral">${t || 'Unclassified'}</span>`;
  },
};
