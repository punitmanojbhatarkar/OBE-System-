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
    const closeSvg = typeof OBEIcons !== 'undefined' ? OBEIcons.get('close', 16) : '×';
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
  return { open, close, confirm, alert };
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
