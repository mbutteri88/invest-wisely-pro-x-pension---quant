// ══════════════════════════════════════════════════════════════════════════════
// GESTORE SCENARI NOMINATI
// Salva/carica/elimina configurazioni complete con nome personalizzato.
// Usa localStorage con chiave separata dalla sessione automatica.
// ══════════════════════════════════════════════════════════════════════════════

const LS_SCENARIOS_KEY = 'suitePro_v2_scenarios';
const MAX_SCENARIOS = 20;

// ── Leggi/scrivi lista scenari ────────────────────────────────────────────────
function _readScenarios() {
  try {
    const raw = localStorage.getItem(LS_SCENARIOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) { return []; }
}

function _writeScenarios(list) {
  try {
    localStorage.setItem(LS_SCENARIOS_KEY, JSON.stringify(list));
    return true;
  } catch (_) { return false; }
}

// ── Costruisce snapshot completo dello stato corrente ─────────────────────────
function _buildSnapshot() {
  return {
    // state principale
    w: state.w, pac: state.pac, age: state.age, years: state.years,
    opt: state.opt, ter: state.ter, taxEq: state.taxEq, taxOb: state.taxOb,
    inflBottom: state.inflBottom, inflVol: state.inflVol,
    portfolio: state.portfolio,
    seq: { on: state.seq.on, severity: state.seq.severity, timing: state.seq.timing, mode: state.seq.mode, dynCorr: !!state.seq.dynCorr },
    pics: JSON.parse(JSON.stringify(state.pics)),
    exps: JSON.parse(JSON.stringify(state.exps)),
    pacChanges: JSON.parse(JSON.stringify(state.pacChanges)),
    allRows: state.allRows, showLiq: state.showLiq, showVolBands: state.showVolBands,
    activeEcoScenario: state.activeEcoScenario, ecoTiming: state.ecoTiming,
    fxHedge: !!state.fxHedge, fxVol: state.fxVol, fxHedgeCost: state.fxHedgeCost,
    customPortfolio: JSON.parse(JSON.stringify(state.customPortfolio || {})),
    // stateB
    stateB: { portfolio: stateB.portfolio, ter: stateB.ter, pac: stateB.pac },
    // decState
    decState: {
      portfolio: decState.portfolio, strategy: decState.strategy,
      startPortfolio: decState.startPortfolio, withdrawal: decState.withdrawal,
      years: decState.years, inflation: decState.inflation, ter: decState.ter,
    },
  };
}

// ── Applica snapshot allo stato ───────────────────────────────────────────────
function _applySnapshot(snap) {
  const n = (v, def) => (v != null && !isNaN(+v)) ? +v : def;
  state.w             = n(snap.w, 0);
  state.pac           = n(snap.pac, 0);
  state.age           = n(snap.age, 30);
  state.years         = n(snap.years, 35);
  state.opt           = n(snap.opt, 450000);
  state.ter           = n(snap.ter, 0.20);
  state.taxEq         = n(snap.taxEq, 26.0);
  state.taxOb         = n(snap.taxOb, 12.5);
  state.inflBottom    = n(snap.inflBottom, 2.0);
  state.inflVol       = n(snap.inflVol, 1.0);
  state.portfolio     = snap.portfolio || 'eq60';
  state.allRows       = !!snap.allRows;
  state.showLiq       = !!snap.showLiq;
  state.showVolBands  = !!snap.showVolBands;
  state.activeEcoScenario = snap.activeEcoScenario || 'normal_growth';
  state.ecoTiming     = snap.ecoTiming || 'early';
  state.fxHedge       = !!snap.fxHedge;
  state.fxVol         = n(snap.fxVol, 0.085);
  state.fxHedgeCost   = n(snap.fxHedgeCost, 0.003);

  if (snap.seq) {
    state.seq.on       = !!snap.seq.on;
    state.seq.severity = snap.seq.severity || 'moderate';
    state.seq.timing   = snap.seq.timing   || 'early';
    state.seq.mode     = snap.seq.mode     || 'single';
    state.seq.dynCorr  = !!snap.seq.dynCorr;
  }

  state.pics        = Array.isArray(snap.pics)        ? snap.pics        : [];
  state.exps        = Array.isArray(snap.exps)        ? snap.exps        : [];
  state.pacChanges  = Array.isArray(snap.pacChanges)  ? snap.pacChanges  : [];

  // Ripristina ID counters
  picId    = state.pics.length       ? Math.max(...state.pics.map(p => p.id || 0))       + 1 : 0;
  expId    = state.exps.length       ? Math.max(...state.exps.map(e => e.id || 0))       + 1 : 0;
  pacChgId = state.pacChanges.length ? Math.max(...state.pacChanges.map(c => c.id || 0)) + 1 : 0;

  if (snap.customPortfolio && Array.isArray(snap.customPortfolio.slots)) {
    state.customPortfolio = snap.customPortfolio;
  }

  if (snap.stateB) {
    stateB.portfolio = snap.stateB.portfolio || 'eq50';
    stateB.ter       = n(snap.stateB.ter, 0.20);
    stateB.pac       = n(snap.stateB.pac, -1);
  }
  if (snap.decState) {
    const d = snap.decState;
    decState.portfolio      = d.portfolio       || 'eq60';
    decState.strategy       = d.strategy        || 'inflation';
    decState.startPortfolio = n(d.startPortfolio, 500000);
    decState.withdrawal     = n(d.withdrawal, 20000);
    decState.years          = n(d.years, 30);
    decState.inflation      = n(d.inflation, 2.0);
    decState.ter            = n(d.ter, 0.20);
  }
}

// ── Riallinea tutti gli slider UI dopo il caricamento ────────────────────────
function _syncUIFromState() {
  const _s = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  const _l = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  const fmt2 = v => { const a = Math.abs(v), s = v < 0 ? '−' : ''; if (a >= 1e6) return s + '€' + (a/1e6).toFixed(2) + 'M'; if (a >= 1e3) return s + '€' + Math.round(a/1e3) + 'k'; return s + '€' + Math.round(a); };
  const fmtN2 = v => Math.round(v).toLocaleString('it-IT');

  _s('sW',          state.w);           _l('lW',          fmt2(state.w));
  _s('sP',          state.pac);         _l('lP',          '€' + fmtN2(state.pac) + '/m');
  _s('sA',          state.age);         _l('lA',          state.age + ' anni');
  _s('sY',          state.years);       _l('lY',          state.years + ' anni');
  _s('sO',          state.opt);         _l('lO',          fmt2(state.opt));
  _s('sTer',        state.ter);         _l('lTer',        state.ter.toFixed(2) + '%');
  _s('sTeq',        state.taxEq);       _l('lTeq',        state.taxEq.toFixed(1) + '%');
  _s('sTob',        state.taxOb);       _l('lTob',        state.taxOb.toFixed(1) + '%');
  _s('sInflBottom', state.inflBottom);  _l('lInflBottom', state.inflBottom.toFixed(1) + '%');
  _s('sInflVol',    state.inflVol);     _l('lInflVol',    state.inflVol.toFixed(1) + '%');

  // Sincronizza i campi numerici digitabili affiancati agli slider di importo
  if (typeof window.syncNumBox === 'function') {
    ['sW', 'sP', 'sO', 'sDecStart', 'sGoalW0', 'sGoalPAC', 'sGoalTarget'].forEach(window.syncNumBox);
  }

  // Portafoglio
  document.querySelectorAll('#allocBtns .gbtn').forEach(b =>
    b.classList.toggle('a-blue', b.dataset.k === state.portfolio));

  // Sequence risk toggle
  const seqTog  = document.getElementById('seqTog');
  const seqOpts = document.getElementById('seqOpts');
  if (seqTog)  seqTog.classList.toggle('on', !!state.seq.on);
  if (seqOpts) seqOpts.style.display = state.seq.on ? 'block' : 'none';

  document.querySelectorAll('#sevBtns .gbtn').forEach(b =>
    b.classList.toggle('a-purple', b.dataset.s === state.seq.severity));
  document.querySelectorAll('#timBtns .gbtn').forEach(b =>
    b.classList.toggle('a-amber', b.dataset.t === state.seq.timing));
  document.querySelectorAll('#seqModeBtns .gbtn').forEach(b =>
    b.classList.toggle('a-purple', b.dataset.sm === state.seq.mode));

  // Re-render liste dinamiche se le funzioni esistono
  if (typeof renderPics      === 'function') renderPics();
  if (typeof renderExps      === 'function') renderExps();
  if (typeof renderPacChgs   === 'function') renderPacChgs();
  if (typeof renderCustomBuilder === 'function') renderCustomBuilder();
}

// ── API pubblica ──────────────────────────────────────────────────────────────

window.scenarioSave = function(name) {
  name = (name || '').trim();
  if (!name) return { ok: false, msg: 'Nome scenario non può essere vuoto.' };

  const list = _readScenarios();
  if (list.length >= MAX_SCENARIOS) {
    return { ok: false, msg: `Limite di ${MAX_SCENARIOS} scenari raggiunto. Elimina uno scenario esistente.` };
  }

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const entry = {
    id,
    name,
    savedAt: new Date().toISOString(),
    summary: _buildScenarioSummary(),
    snapshot: _buildSnapshot(),
  };
  list.push(entry);
  _writeScenarios(list);
  renderScenarioPanel();
  return { ok: true };
};

window.scenarioLoad = function(id) {
  const list = _readScenarios();
  const entry = list.find(s => s.id === id);
  if (!entry) return { ok: false, msg: 'Scenario non trovato.' };

  _applySnapshot(entry.snapshot);
  _syncUIFromState();
  if (typeof render === 'function') render();
  renderScenarioPanel();

  // Flash di conferma
  _flashToast(`✓ Scenario "${entry.name}" caricato`);
  return { ok: true };
};

window.scenarioDelete = function(id) {
  let list = _readScenarios();
  const entry = list.find(s => s.id === id);
  if (!entry) return;
  if (!confirm(`Eliminare lo scenario "${entry.name}"?`)) return;
  list = list.filter(s => s.id !== id);
  _writeScenarios(list);
  renderScenarioPanel();
};

window.scenarioOverwrite = function(id) {
  const list = _readScenarios();
  const idx = list.findIndex(s => s.id === id);
  if (idx < 0) return;
  list[idx].savedAt = new Date().toISOString();
  list[idx].summary = _buildScenarioSummary();
  list[idx].snapshot = _buildSnapshot();
  _writeScenarios(list);
  renderScenarioPanel();
  _flashToast(`✓ Scenario "${list[idx].name}" aggiornato`);
};

window.scenarioExportJSON = function() {
  const list = _readScenarios();
  if (!list.length) { alert('Nessuno scenario salvato da esportare.'); return; }
  const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scenari_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

window.scenarioImportJSON = function(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error('Formato non valido');
      const existing = _readScenarios();
      const existingIds = new Set(existing.map(s => s.id));
      let added = 0;
      for (const entry of imported) {
        if (!entry.id || !entry.name || !entry.snapshot) continue;
        if (existingIds.has(entry.id)) continue; // skip duplicati
        if (existing.length + added >= MAX_SCENARIOS) break;
        existing.push(entry);
        added++;
      }
      _writeScenarios(existing);
      renderScenarioPanel();
      _flashToast(`✓ ${added} scenario/i importati`);
    } catch (err) {
      alert('Errore durante l\'importazione: ' + err.message);
    }
  };
  reader.readAsText(file);
};

// ── Genera riepilogo testuale dello scenario corrente ─────────────────────────
function _buildScenarioSummary() {
  try {
    const portLabel = (() => {
      if (typeof PORT !== 'undefined' && PORT[state.portfolio]) return PORT[state.portfolio].label;
      if (state.portfolio === 'custom') return 'Custom';
      return state.portfolio;
    })();
    const fmt2 = v => { const a = Math.abs(v); if (a >= 1e6) return '€' + (a/1e6).toFixed(1) + 'M'; if (a >= 1e3) return '€' + Math.round(a/1e3) + 'k'; return '€' + Math.round(a); };
    return [
      portLabel,
      `${state.years}a`,
      state.w > 0 ? fmt2(state.w) : null,
      state.pac > 0 ? fmt2(state.pac) + '/m' : null,
    ].filter(Boolean).join(' · ');
  } catch (_) {
    return '—';
  }
}

// ── Toast notification ────────────────────────────────────────────────────────
function _flashToast(msg) {
  const existing = document.getElementById('scenarioToast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'scenarioToast';
  el.textContent = msg;
  el.style.cssText = `
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
    background:#1e8e3e; color:#fff; font-size:13px; font-weight:600;
    padding:10px 20px; border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,.18);
    z-index:9999; pointer-events:none; opacity:1; transition:opacity .4s;
    font-family:'DM Sans',sans-serif;
  `;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 2200);
}

// ── Render pannello scenari ───────────────────────────────────────────────────
function _updateScenarioCount() {
  const list = _readScenarios();
  const el = document.getElementById('scenarioCount');
  if (!el) return;
  el.textContent = list.length > 0 ? list.length + '/' + MAX_SCENARIOS : '';
  el.style.display = list.length > 0 ? '' : 'none';
}

function renderScenarioPanel() {
  _updateScenarioCount();
  const panel = document.getElementById('scenarioPanelBody');
  if (!panel) return;

  const list = _readScenarios();
  const nameInput = document.getElementById('scenarioNameInput');
  const saveBtn   = document.getElementById('scenarioSaveBtn');

  // Gestisci tasto salva
  if (saveBtn) {
    saveBtn.onclick = function() {
      const name = nameInput?.value?.trim();
      if (!name) {
        if (nameInput) { nameInput.focus(); nameInput.style.borderColor = 'var(--red)'; setTimeout(() => nameInput.style.borderColor = '', 1200); }
        return;
      }
      // Controlla se esiste già un nome uguale
      const existing = list.find(s => s.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        if (confirm(`Esiste già uno scenario chiamato "${name}". Sovrascrivere?`)) {
          scenarioOverwrite(existing.id);
          if (nameInput) nameInput.value = '';
        }
        return;
      }
      const result = scenarioSave(name);
      if (result.ok) {
        if (nameInput) nameInput.value = '';
      } else {
        alert(result.msg);
      }
    };
    if (nameInput) {
      nameInput.onkeydown = function(e) { if (e.key === 'Enter') saveBtn.click(); };
    }
  }

  if (!list.length) {
    panel.innerHTML = `
      <div style="text-align:center;padding:24px 12px;color:var(--text3);font-size:13px">
        <div style="font-size:28px;margin-bottom:8px">📂</div>
        Nessuno scenario salvato ancora.<br>
        <span style="font-size:12px">Inserisci un nome e clicca <strong>Salva</strong>.</span>
      </div>`;
    return;
  }

  const fmtDate = iso => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('it-IT', { day:'2-digit', month:'short', year:'2-digit' }) + ' ' +
             d.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' });
    } catch (_) { return ''; }
  };

  panel.innerHTML = list.map(s => `
    <div class="scenario-row" id="srow-${s.id}">
      <div class="scenario-row-main">
        <div class="scenario-info">
          <span class="scenario-name">${_esc(s.name)}</span>
          <span class="scenario-summary">${_esc(s.summary || '—')}</span>
        </div>
        <span class="scenario-date">${fmtDate(s.savedAt)}</span>
      </div>
      <div class="scenario-actions">
        <button class="gbtn a-blue" onclick="scenarioLoad('${s.id}')" title="Carica questo scenario">
          ↩ Carica
        </button>
        <button class="gbtn" onclick="scenarioOverwrite('${s.id}')" title="Aggiorna con lo stato corrente">
          ↑ Aggiorna
        </button>
        <button class="gbtn" onclick="scenarioDelete('${s.id}')" title="Elimina scenario" style="color:var(--red);border-color:rgba(217,48,37,.3)">
          ✕
        </button>
      </div>
    </div>
  `).join('');
}

function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Toggle collasso pannello ──────────────────────────────────────────────────
window.toggleScenarioPanel = function() {
  const body     = document.getElementById('scenarioPanelCollapsible');
  const chevron  = document.getElementById('scenarioChevron');
  if (!body) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
  // Salva preferenza
  try { localStorage.setItem('suitePro_scenarioPanelOpen', isOpen ? '0' : '1'); } catch(_) {}
};

// ── Init al DOM ready ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Ripristina stato aperto/chiuso
  try {
    const pref = localStorage.getItem('suitePro_scenarioPanelOpen');
    if (pref === '1') {
      const body    = document.getElementById('scenarioPanelCollapsible');
      const chevron = document.getElementById('scenarioChevron');
      if (body)    body.style.display = 'block';
      if (chevron) chevron.style.transform = 'rotate(180deg)';
    }
  } catch(_) {}

  renderScenarioPanel();
  _updateScenarioCount();

  // Import file trigger
  const importInput = document.getElementById('scenarioImportInput');
  if (importInput) {
    importInput.onchange = function() {
      if (this.files[0]) scenarioImportJSON(this.files[0]);
      this.value = '';
    };
  }
});

window.renderScenarioPanel = renderScenarioPanel;
