import json
with open('C:\\Users\\LOQ\\OneDrive\\Desktop\\AI_OBE_System\\frontend\\faculty\\co-po-map.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add styles for the panel
style_injection = '''
    .justification-panel {
      position: fixed;
      top: 0;
      right: -400px;
      width: 400px;
      height: 100vh;
      background: var(--surface);
      box-shadow: -4px 0 15px rgba(0,0,0,0.1);
      z-index: 1000;
      transition: right 0.3s ease;
      display: flex;
      flex-direction: column;
      border-left: 1px solid var(--border);
    }
    .justification-panel.open {
      right: 0;
    }
    .jp-header {
      padding: 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .jp-body {
      padding: 20px;
      flex: 1;
      overflow-y: auto;
    }
    .jp-footer {
      padding: 20px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .jp-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.4);
      z-index: 999;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    .jp-overlay.open {
      opacity: 1;
      pointer-events: auto;
    }
    .mapping-level-selector {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
    }
    .mapping-btn {
      flex: 1;
      padding: 10px;
      border: 1px solid var(--border);
      background: var(--bg);
      border-radius: var(--r-md);
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }
    .mapping-btn:hover { background: var(--surface-hover); }
    .mapping-btn.active[data-val="0"] { background: var(--border); color: var(--text-primary); border-color: var(--text-muted); }
    .mapping-btn.active[data-val="1"] { background: rgba(245,158,11,0.15); color: #d97706; border-color: #d97706; }
    .mapping-btn.active[data-val="2"] { background: rgba(249,115,22,0.15); color: #ea580c; border-color: #ea580c; }
    .mapping-btn.active[data-val="3"] { background: rgba(37,99,235,0.15); color: #2563eb; border-color: #2563eb; }
'''

content = content.replace('</style>', style_injection + '\\n</style>')

# Add HTML for the panel before </div><!-- /page-content -->
html_injection = '''
      <!-- Justification Panel -->
      <div class="jp-overlay" id="jp-overlay" onclick="closeJustificationPanel()"></div>
      <div class="justification-panel" id="justification-panel">
        <div class="jp-header">
          <div>
            <h3 style="margin:0; font-size:16px;">CO-PO Mapping Details</h3>
            <div id="jp-title" style="font-size:13px; color:var(--text-muted); margin-top:4px;"></div>
          </div>
          <button class="btn btn-ghost" style="padding:4px" onclick="closeJustificationPanel()">✕</button>
        </div>
        <div class="jp-body">
          <div class="form-group">
            <label class="form-label">Mapping Level (Correlation)</label>
            <div class="mapping-level-selector" id="jp-level-selector">
              <button class="mapping-btn" data-val="0">0 - None</button>
              <button class="mapping-btn" data-val="1">1 - Low</button>
              <button class="mapping-btn" data-val="2">2 - Medium</button>
              <button class="mapping-btn" data-val="3">3 - High</button>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Justification (Optional but Recommended)</label>
            <p style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">NBA requires justification for how this CO strongly/moderately contributes to the PO.</p>
            <textarea id="jp-justification" class="form-control" rows="6" placeholder="Provide reason for this mapping level..."></textarea>
          </div>
        </div>
        <div class="jp-footer">
          <button class="btn btn-secondary" onclick="closeJustificationPanel()">Cancel</button>
          <button class="btn btn-primary" onclick="saveJustification()">Save Mapping</button>
        </div>
      </div>
'''

content = content.replace('    </div><!-- /page-content -->', html_injection + '\\n    </div><!-- /page-content -->')

# Update script to handle the panel
script_updates = '''
  let currentActiveBtn = null;

  function openJustificationPanel(btn) {
    currentActiveBtn = btn;
    const coNo = parseInt(btn.dataset.coNo);
    const po   = btn.dataset.po;
    const val  = parseInt(btn.dataset.val);
    const justification = DB.poMapping.getJustification(currentCourseId, coNo, po) || '';
    
    document.getElementById('jp-title').textContent = CO × ;
    document.getElementById('jp-justification').value = justification;
    
    document.querySelectorAll('.mapping-btn').forEach(b => {
      b.classList.remove('active');
      if (parseInt(b.dataset.val) === val) b.classList.add('active');
    });

    document.getElementById('jp-overlay').classList.add('open');
    document.getElementById('justification-panel').classList.add('open');
  }

  function closeJustificationPanel() {
    document.getElementById('jp-overlay').classList.remove('open');
    document.getElementById('justification-panel').classList.remove('open');
    currentActiveBtn = null;
  }

  document.querySelectorAll('.mapping-btn').forEach(b => {
    b.addEventListener('click', function() {
      document.querySelectorAll('.mapping-btn').forEach(bb => bb.classList.remove('active'));
      this.classList.add('active');
    });
  });

  function saveJustification() {
    if (!currentActiveBtn) return;
    const coNo = parseInt(currentActiveBtn.dataset.coNo);
    const po   = currentActiveBtn.dataset.po;
    
    const activeValBtn = document.querySelector('.mapping-btn.active');
    const val = activeValBtn ? parseInt(activeValBtn.dataset.val) : 0;
    const justification = document.getElementById('jp-justification').value.trim();

    // Update button
    currentActiveBtn.dataset.val = val;
    currentActiveBtn.textContent = val === 0 ? '—' : val;
    currentActiveBtn.title = CO × : ;
    if(justification) currentActiveBtn.title +=  | ;

    // Persist to DB
    DB.poMapping.setValue(currentCourseId, coNo, po, val, justification);

    // Update average row
    updateAvgCell(po);
    updateSummaryCard(po);

    closeJustificationPanel();
    showSaved();
  }
'''

content = content.replace("btn.addEventListener('click', () => cycleCell(btn));", "btn.addEventListener('click', () => openJustificationPanel(btn));")

content = content.replace('  /* ── Cycle cell value on click ── */', script_updates + '\\n  /* ── Cycle cell value on click ── */')

with open('C:\\Users\\LOQ\\OneDrive\\Desktop\\AI_OBE_System\\frontend\\faculty\\co-po-map.html', 'w', encoding='utf-8') as f:
    f.write(content)
