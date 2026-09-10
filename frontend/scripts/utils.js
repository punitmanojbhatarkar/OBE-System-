/* ============================================================
   UTILS.JS — Shared UI utilities, toast, modal, helpers
   ============================================================ */

/* ── Toast Notifications ── */
const Toast = (() => {
  function ensure() {
    let el = document.getElementById('toast-container');
    if (!el) { el = document.createElement('div'); el.id='toast-container'; document.body.appendChild(el); }
    return el;
  }
  function show(msg, type='info', duration=3500) {
    const icons = { success:'✓', error:'✕', warning:'⚠', info:'ℹ' };
    const c = ensure();
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span style="font-size:18px">${icons[type]||'ℹ'}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(120px)'; t.style.transition='all 0.3s ease'; setTimeout(()=>t.remove(),300); }, duration);
  }
  return {
    success : (m,d) => show(m,'success',d),
    error   : (m,d) => show(m,'error',d),
    warning : (m,d) => show(m,'warning',d),
    info    : (m,d) => show(m,'info',d),
  };
})();

/* ── Modal ── */
const Modal = (() => {
  function open(html, opts={}) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop active';
    backdrop.id = 'modal-backdrop';
    backdrop.innerHTML = `<div class="modal" style="${opts.wide?'max-width:800px':''}">${html}</div>`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if(e.target===backdrop && !opts.persistent) close(); });
    return backdrop;
  }
  function close() {
    const b = document.getElementById('modal-backdrop');
    if (b) b.remove();
  }
  function confirm(title, msg, onYes, yesLabel='Confirm', dangerBtn=true) {
    const html = `
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" onclick="Modal.close()">✕</button>
      </div>
      <p style="color:var(--text-secondary);font-size:14px">${msg}</p>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn ${dangerBtn?'btn-danger':'btn-primary'}" id="modal-confirm-btn">${yesLabel}</button>
      </div>`;
    open(html);
    document.getElementById('modal-confirm-btn').onclick = () => { close(); onYes(); };
  }
  function alert(title, msg, onOk) {
    const html = `
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" onclick="Modal.close()">✕</button>
      </div>
      <div style="color:var(--text-secondary);font-size:14px;margin-bottom:16px;">${msg}</div>
      <div class="modal-footer">
        <button class="btn btn-primary" id="modal-alert-btn">OK</button>
      </div>`;
    open(html, {wide: true});
    document.getElementById('modal-alert-btn').onclick = () => { close(); if(onOk) onOk(); };
  }
  return { open, close, confirm, alert };
})();

/* ── Tab Switcher ── */
function initTabs(container) {
  const tabs = (container||document).querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      (container||document).querySelectorAll('.tab-content').forEach(c => {
        c.classList.toggle('active', c.id === target);
      });
    });
  });
  if (tabs[0]) tabs[0].click();
}

/* ── Format helpers ── */
const Fmt = {
  pct    : (v, dec=1) => v !== null && v !== undefined ? v.toFixed(dec)+'%' : '—',
  num    : (v, dec=2) => v !== null && v !== undefined ? parseFloat(v).toFixed(dec) : '—',
  level  : (l) => l !== null && l !== undefined ? `Level ${l}` : '—',
  date   : (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—',
  initials:(name)=>name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2),
  bloom  : (l) => ({L1:'Remember',L2:'Understand',L3:'Apply',L4:'Analyze',L5:'Evaluate',L6:'Create'})[l]||l,
  learner: (t) => ({slow:'🔴 Slow',average:'🟡 Average',advanced:'🟢 Advanced'})[t]||t,
};

/* ── Badge HTML ── */
function attBadge(level) {
  const map = { 3:'att-3', 2:'att-2', 1:'att-1', 0:'att-0' };
  const lbl = { 3:'Level 3 ✅', 2:'Level 2 ⚡', 1:'Level 1 ⚠️', 0:'Not Attained ❌' };
  const cls = map[level] ?? 'badge-muted';
  const txt = lbl[level] ?? '—';
  return `<span class="badge ${cls}">${txt}</span>`;
}

/* ── Learner type badge ── */
function learnerBadge(type) {
  const map = { slow:'badge-danger', average:'badge-warning', advanced:'badge-success' };
  return `<span class="badge ${map[type]||'badge-muted'}">${type||'—'}</span>`;
}

/* ── Animated Number Counter ── */
function animateCounter(el, target, duration = 900, suffix = '', decimals = 0) {
  if (!el) return;
  const start = performance.now();
  const startVal = 0;
  const endVal = parseFloat(target) || 0;
  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = startVal + (endVal - startVal) * ease;
    el.textContent = (decimals > 0 ? current.toFixed(decimals) : Math.round(current)) + suffix;
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = (decimals > 0 ? endVal.toFixed(decimals) : endVal) + suffix;
  }
  requestAnimationFrame(update);
}

/* ── Set stat card value with animation ── */
function setStatValue(id, value, suffix = '', decimals = 0) {
  const el = document.getElementById(id);
  if (!el) return;
  animateCounter(el, value, 800, suffix, decimals);
}

/* ── Simple search filter on table ── */
function filterTable(inputId, tableId) {
  const input = document.getElementById(inputId);
  const table = document.getElementById(tableId);
  if (!input || !table) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    table.querySelectorAll('tbody tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

/* ── Loading state on button ── */
function btnLoading(btn, loading) {
  if (loading) {
    btn.dataset.origText = btn.innerHTML;
    btn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;margin-right:6px;vertical-align:middle"></span> Loading…';
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.origText || 'Submit';
    btn.disabled = false;
  }
}

/* ── Scroll to element ── */
function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
}

/* ── Parse tab-delimited paste from Excel ── */
function parsePaste(text) {
  return text.trim().split('\n').map(row => {
    if (row.includes('\t')) return row.split('\t').map(c=>c.trim());
    if (row.includes(',')) return row.split(',').map(c=>c.trim());
    return row.split(/\s{2,}/).map(c=>c.trim());
  });
}

/* ── Light-mode chart color palette ── */
function chartColors(n) {
  const palette = ['#2563EB','#0284C7','#059669','#D97706','#DC2626','#7C3AED','#0891B2','#65A30D','#EA580C','#DB2777','#0D9488','#4F46E5'];
  return Array.from({length:n},(_, i)=>palette[i%palette.length]);
}

/* ── Default Chart.js options for light mode ── */
function lightChartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#475569', font: { family: 'Plus Jakarta Sans', size: 12 } } },
      tooltip: {
        backgroundColor: '#0F172A',
        titleColor: '#F8FAFC',
        bodyColor: '#CBD5E1',
        borderColor: '#1E293B',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
      }
    },
    scales: {
      x: {
        ticks: { color: '#64748B', font: { family: 'Plus Jakarta Sans', size: 11 } },
        grid:  { color: 'rgba(0,0,0,0.05)', drawBorder: false }
      },
      y: {
        ticks: { color: '#64748B', font: { family: 'Plus Jakarta Sans', size: 11 } },
        grid:  { color: 'rgba(0,0,0,0.05)', drawBorder: false }
      }
    }
  };
}

/* ── CO-PO color for cell value (light-mode) ── */
function coPoColor(val) {
  const map = {0:'transparent',1:'rgba(217,119,6,0.12)',2:'rgba(217,119,6,0.22)',3:'rgba(37,99,235,0.15)'};
  return map[val]||'transparent';
}

/* ── Confirm delete helper ── */
function confirmDelete(name, onConfirm) {
  Modal.confirm(
    'Delete Confirmation',
    `Are you sure you want to delete <strong>${name}</strong>? This action cannot be undone.`,
    onConfirm, 'Delete', true
  );
}

/* ── Export table to CSV ── */
function exportTableCSV(tableId, filename) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const rows  = [...table.querySelectorAll('tr')];
  const csv   = rows.map(r=>[...r.querySelectorAll('th,td')].map(c=>'"'+c.textContent.trim().replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob  = new Blob([csv], {type:'text/csv'});
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a'); a.href=url; a.download=filename||'export.csv'; a.click();
  URL.revokeObjectURL(url);
}

/* Auto-run on DOM ready */
document.addEventListener('DOMContentLoaded', () => {
  if (window.Auth && Auth.highlightNav) Auth.highlightNav();
  else {
    const currentFile = window.location.pathname.split('/').pop().toLowerCase();
    document.querySelectorAll('.nav-item').forEach(el => {
      const href = (el.getAttribute('href')||'').toLowerCase().split('?')[0].split('/').pop();
      if (href && href === currentFile) el.classList.add('active');
    });
  }
});



