// ══════════════════════════════════════════════════════════════════════════════
// PRO FEATURES — Obiettivo Inverso · Cookie Consent GDPR · Avvisi Contestuali
// ══════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// 1. COOKIE CONSENT GDPR
// ════════════════════════════════════════════════════════════════════════════

(function initCookieConsent() {
  const LS_CONSENT = 'suitePro_cookieConsent_v1';

  function getConsent() {
    try { return localStorage.getItem(LS_CONSENT); } catch(_) { return null; }
  }
  function setConsent(val) {
    try { localStorage.setItem(LS_CONSENT, val); } catch(_) {}
  }

  function renderBanner() {
    if (getConsent()) return; // già risposto

    const banner = document.createElement('div');
    banner.id = 'cookieConsentBanner';
    banner.innerHTML = `
      <div style="
        position:fixed; bottom:0; left:0; right:0; z-index:10000;
        background:#fff; border-top:2px solid #dadce0;
        box-shadow:0 -4px 20px rgba(0,0,0,.10);
        padding:16px 24px; display:flex; align-items:center; gap:16px;
        flex-wrap:wrap; font-family:'DM Sans',sans-serif; font-size:13px;
        color:#202124;
      ">
        <div style="flex:1;min-width:240px;line-height:1.6">
          🍪 <strong>Questo sito usa localStorage</strong> per salvare le impostazioni del simulatore
          <strong>solo sul tuo dispositivo</strong> — nessun dato viene inviato a server esterni,
          nessun tracciamento, nessuna profilazione.
          <a href="#" onclick="showView('cookie');document.getElementById('cookieConsentBanner').remove();return false;"
             style="color:#1a73e8;margin-left:4px">Leggi la Cookie Policy</a>
        </div>
        <div style="display:flex;gap:10px;flex-shrink:0">
          <button id="cookieAcceptBtn" style="
            padding:9px 20px; border-radius:8px; border:none;
            background:#1a73e8; color:#fff; font-size:13px; font-weight:600;
            cursor:pointer; font-family:'DM Sans',sans-serif;
          ">Accetta</button>
          <button id="cookieDeclineBtn" style="
            padding:9px 20px; border-radius:8px;
            border:1px solid #dadce0; background:#fff; color:#5f6368;
            font-size:13px; font-weight:500; cursor:pointer;
            font-family:'DM Sans',sans-serif;
          ">Solo tecnici</button>
        </div>
      </div>`;

    document.body.appendChild(banner);

    document.getElementById('cookieAcceptBtn').onclick = function() {
      setConsent('accepted');
      banner.style.transition = 'opacity .3s';
      banner.style.opacity = '0';
      setTimeout(() => banner.remove(), 320);
    };
    document.getElementById('cookieDeclineBtn').onclick = function() {
      setConsent('technical_only');
      banner.style.transition = 'opacity .3s';
      banner.style.opacity = '0';
      setTimeout(() => banner.remove(), 320);
    };
  }

  // Mostra il banner dopo 800ms dalla prima visita (non interrompe il caricamento)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(renderBanner, 800));
  } else {
    setTimeout(renderBanner, 800);
  }

  window.resetCookieConsent = function() {
    try { localStorage.removeItem(LS_CONSENT); } catch(_) {}
    renderBanner();
  };
})();


// ════════════════════════════════════════════════════════════════════════════
// 1b. DISCLAIMER MODALE — PRIMA VISITA
// Appare una sola volta. L'utente deve cliccare "Ho capito" per continuare.
// Separato dal cookie consent per chiarezza legale.
// ════════════════════════════════════════════════════════════════════════════

(function initDisclaimerModal() {
  const LS_DISC = 'suitePro_disclaimerAccepted_v1';

  function hasAccepted() {
    try { return localStorage.getItem(LS_DISC) === '1'; } catch(_) { return false; }
  }
  function markAccepted() {
    try { localStorage.setItem(LS_DISC, '1'); } catch(_) {}
  }

  function showDisclaimerModal() {
    if (hasAccepted()) return;

    const overlay = document.createElement('div');
    overlay.id = 'disclaimerModal';
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:10001;
      background:rgba(0,0,0,.65);
      display:flex; align-items:center; justify-content:center;
      padding:16px; box-sizing:border-box;
      font-family:'DM Sans',sans-serif;
    `;

    overlay.innerHTML = `
      <div style="
        background:#fff; border-radius:16px; max-width:520px; width:100%;
        padding:32px 28px; box-shadow:0 8px 40px rgba(0,0,0,.25);
        max-height:90vh; overflow-y:auto;
      ">
        <div style="font-size:28px; text-align:center; margin-bottom:12px">⚠️</div>
        <h2 style="margin:0 0 16px; font-size:18px; font-weight:700; color:#202124; text-align:center">
          Avviso legale importante
        </h2>
        <div style="font-size:13.5px; color:#3c4043; line-height:1.75; margin-bottom:20px">
          <p style="margin:0 0 12px">
            <strong>Suite Patrimoniale Pro</strong> è uno strumento
            <strong>esclusivamente informativo ed educativo</strong>.
          </p>
          <p style="margin:0 0 12px">
            Le proiezioni, le simulazioni e i calcoli mostrati:
          </p>
          <ul style="margin:0 0 12px; padding-left:20px">
            <li style="margin-bottom:6px"><strong>non costituiscono consulenza finanziaria</strong>, fiscale, legale o di investimento</li>
            <li style="margin-bottom:6px"><strong>non rappresentano una garanzia</strong> di rendimenti futuri</li>
            <li style="margin-bottom:6px">si basano su dati storici e modelli statistici soggetti a <strong>incertezza significativa</strong></li>
            <li style="margin-bottom:6px">potrebbero non riflettere la tua situazione personale e fiscale</li>
          </ul>
          <p style="margin:0 0 12px">
            I rendimenti passati non sono indicativi di quelli futuri.
            <strong>Prima di qualsiasi decisione finanziaria rilevante, consulta un consulente
            finanziario abilitato e iscritto all'albo OCF.</strong>
          </p>
          <p style="margin:0; font-size:12px; color:#5f6368">
            Continuando a usare questo strumento dichiari di aver letto e compreso questo avviso.
          </p>
        </div>
        <button id="disclaimerAcceptBtn" style="
          width:100%; padding:13px; background:#1a73e8; color:#fff;
          border:none; border-radius:8px; font-size:14px; font-weight:700;
          cursor:pointer; font-family:'DM Sans',sans-serif; letter-spacing:.01em;
        ">✓ Ho capito — continua</button>
        <div style="margin-top:10px; text-align:center; font-size:11.5px; color:#5f6368">
          Questo avviso viene mostrato una sola volta.
        </div>
      </div>`;

    document.body.appendChild(overlay);

    document.getElementById('disclaimerAcceptBtn').onclick = function() {
      markAccepted();
      overlay.style.transition = 'opacity .3s';
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 320);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(showDisclaimerModal, 400));
  } else {
    setTimeout(showDisclaimerModal, 400);
  }

  // Permette reset per test
  window.resetDisclaimerModal = function() {
    try { localStorage.removeItem(LS_DISC); } catch(_) {}
    showDisclaimerModal();
  };
})();


// ════════════════════════════════════════════════════════════════════════════
// 2. AVVISI CONTESTUALI
// Controlla lo stato del simulatore e mostra warning inline pertinenti.
// ════════════════════════════════════════════════════════════════════════════

// Container avvisi: aggiunto dinamicamente sopra le metriche
function _ensureWarningContainer() {
  let el = document.getElementById('contextualWarnings');
  if (!el) {
    el = document.createElement('div');
    el.id = 'contextualWarnings';
    el.style.cssText = 'margin-bottom:10px';
    // Inserisce prima di #metrics
    const metrics = document.getElementById('metrics');
    if (metrics && metrics.parentNode) {
      metrics.parentNode.insertBefore(el, metrics);
    }
  }
  return el;
}

function renderContextualWarnings() {
  const container = _ensureWarningContainer();
  if (!container) return;

  const warnings = [];
  const p = typeof getPortParams === 'function' ? getPortParams(state.portfolio) : null;
  const normalNet = p && p.normal ? p.normal - state.ter / 100 : null;

  // ── W1: SWR insostenibile
  // Se il montante atteso con SWR 4% genera meno del PAC corrente, c'è un problema
  if (p && p.normal && state.years >= 5) {
    const projectedNormal = _quickProject(state.w, state.pac, p.normal - state.ter / 100, state.years);
    const swr4pct = projectedNormal * 0.04 * (1 - 0.26); // netto approx
    if (state.pac > 0 && swr4pct < state.pac * 12 * 0.5 && projectedNormal > 0) {
      warnings.push({
        type: 'orange',
        icon: '⚠️',
        title: 'SWR potenzialmente insufficiente',
        msg: `Con il montante base atteso (${_fmtW(projectedNormal)}), la rendita SWR 4% netta sarebbe circa ${_fmtW(swr4pct)}/anno — inferiore al tuo PAC attuale di ${_fmtW(state.pac * 12)}/anno. Considera di aumentare il PAC, l'orizzonte o ridurre le aspettative di prelievo.`,
      });
    }
  }

  // ── W2: Orizzonte molto breve per portafoglio aggressivo
  const eqW = typeof getEquityWeight === 'function' ? getEquityWeight(state.portfolio, state.age) : 0.6;
  if (eqW >= 0.8 && state.years <= 5) {
    warnings.push({
      type: 'red',
      icon: '🔴',
      title: 'Portafoglio aggressivo su orizzonte breve',
      msg: `Un portafoglio con ${Math.round(eqW * 100)}% azionario su soli ${state.years} anni espone a rischio di perdita in caso di mercato avverso alla scadenza. Per orizzonti ≤5 anni si consiglia generalmente un'allocazione difensiva (≤40% azioni).`,
    });
  }

  // ── W3: TER elevato
  if (state.ter >= 1.0) {
    const terDragApprox = normalNet ? (Math.pow(1 + normalNet + state.ter / 100, state.years) - Math.pow(1 + normalNet, state.years)) : null;
    warnings.push({
      type: 'orange',
      icon: '💸',
      title: 'TER elevato — costo composto significativo',
      msg: `Un TER di ${state.ter.toFixed(2)}% è alto rispetto agli ETF a basso costo (0.07–0.25%). Su ${state.years} anni il costo composto erode una quota rilevante del montante. Considera ETF equivalenti con TER inferiore.`,
    });
  }

  // ── W4: PAC = 0 senza patrimonio iniziale significativo
  if (state.pac === 0 && state.w < 5000 && state.years >= 10) {
    warnings.push({
      type: 'blue',
      icon: 'ℹ️',
      title: 'Nessun versamento impostato',
      msg: `Patrimonio iniziale e PAC sono entrambi molto bassi. Le proiezioni mostrano solo la crescita di €${state.w.toLocaleString('it-IT')} senza apporti. Imposta un PAC mensile per vedere l'impatto della capitalizzazione nel tempo.`,
    });
  }

  // ── W5: Rendimento reale negativo (inflazione > rendimento atteso)
  if (normalNet !== null && state.pac >= 0) {
    const inflExp = (window.liveMarketData?.hicp_eu) ?? state.inflBottom / 100;
    const realNet = normalNet - inflExp;
    if (realNet < 0 && p) {
      warnings.push({
        type: 'orange',
        icon: '📉',
        title: 'Rendimento reale negativo nello scenario base',
        msg: `Con rendimento nominale netto ${(normalNet * 100).toFixed(2)}%/a e inflazione attesa ${(inflExp * 100).toFixed(1)}%/a, il rendimento reale è <strong style="color:var(--red)">${(realNet * 100).toFixed(2)}%/a</strong>. Il portafoglio perde potere d'acquisto in termini reali nello scenario base.`,
      });
    }
  }

  // ── W6: Età avanzata con portafoglio molto aggressivo
  if (state.age >= 55 && eqW >= 0.8 && state.portfolio !== 'lifecycle') {
    warnings.push({
      type: 'orange',
      icon: '🕐',
      title: 'Allocazione aggressiva in fase avanzata',
      msg: `A ${state.age} anni, un'allocazione ${Math.round(eqW * 100)}% azionaria lascia poco tempo per recuperare da un mercato avverso. Il portafoglio Lifecycle riduce automaticamente il rischio con l'età.`,
    });
  }

  // ── W7: PAC superiore al 50% del patrimonio iniziale su orizzonte <5 anni
  // (configurazione incoerente — versamenti che dominano la proiezione a breve)
  if (state.w > 0 && state.pac * 12 > state.w * 0.5 && state.years <= 3) {
    warnings.push({
      type: 'blue',
      icon: 'ℹ️',
      title: 'Patrimonio iniziale basso rispetto al PAC',
      msg: `Su ${state.years} anni, i versamenti mensili (${_fmtW(state.pac * 12)}/anno) dominano la proiezione rispetto al patrimonio iniziale (${_fmtW(state.w)}). Le proiezioni sono principalmente determinate dai versamenti, non dalla crescita composta.`,
    });
  }

  // ── Render
  if (!warnings.length) {
    container.innerHTML = '';
    return;
  }

  const colorMap = {
    red:    { bg: 'var(--red-dim)',    border: 'rgba(217,48,37,.35)',    text: 'var(--red)' },
    orange: { bg: 'var(--orange-dim)', border: 'rgba(227,116,0,.35)',    text: 'var(--orange)' },
    blue:   { bg: 'var(--blue-dim)',   border: 'rgba(26,115,232,.25)',   text: 'var(--blue)' },
  };

  container.innerHTML = warnings.map(w => {
    const c = colorMap[w.type] || colorMap.blue;
    return `
      <div style="
        display:flex; gap:10px; align-items:flex-start;
        background:${c.bg}; border:1px solid ${c.border};
        border-left:3px solid ${c.text};
        border-radius:var(--radius-sm); padding:10px 14px;
        margin-bottom:6px; font-size:12.5px; line-height:1.6;
      ">
        <span style="font-size:16px;flex-shrink:0;margin-top:1px">${w.icon}</span>
        <div>
          <strong style="color:${c.text};display:block;margin-bottom:2px">${w.title}</strong>
          <span style="color:var(--text2)">${w.msg}</span>
        </div>
      </div>`;
  }).join('');
}

// Proiezione rapida semplice per i warning (senza tutti gli aggiustamenti)
function _quickProject(w0, pac, rate, years) {
  let v = w0;
  const monthly = rate / 12;
  for (let m = 0; m < years * 12; m++) {
    v = v * (1 + monthly) + pac;
  }
  return v;
}

function _fmtW(v) {
  const a = Math.abs(v);
  if (a >= 1e6) return '€' + (a / 1e6).toFixed(2) + 'M';
  if (a >= 1e3) return '€' + Math.round(a / 1e3) + 'k';
  return '€' + Math.round(a);
}

// Aggancia i warning al ciclo render esistente
(function hookWarningsToRender() {
  const _origRender = window.render;
  if (typeof _origRender !== 'function') {
    // render non ancora definita — riprova al DOM ready
    document.addEventListener('DOMContentLoaded', function() {
      const _r = window.render;
      if (typeof _r === 'function') {
        window.render = function(...args) { _r(...args); renderContextualWarnings(); };
        render = window.render;
      }
    });
    return;
  }
  window.render = function(...args) {
    _origRender(...args);
    renderContextualWarnings();
  };
  render = window.render;
})();


// ════════════════════════════════════════════════════════════════════════════
// 3. CALCOLATORE OBIETTIVO INVERSO
// Tre modalità:
//   A) Dato target capitale + anni → PAC necessario
//   B) Dato target capitale + PAC → anni necessari
//   C) Dato PAC + anni → capitale raggiungibile (con parametri personalizz.)
// ════════════════════════════════════════════════════════════════════════════

// Stato del tab obiettivo inverso
const goalState = {
  mode: 'pac',        // 'pac' | 'years' | 'target'
  targetCapital: 500000,
  years: 20,
  pac: 500,
  w0: 0,
  portfolio: 'eq60',
  ter: 0.20,
  scenario: 'normal', // 'best' | 'normal' | 'worst'
};

// ── Calcolo PAC necessario per raggiungere target in N anni ──────────────────
// Risolve: FV = w0*(1+r)^n + pac * ((1+r)^n - 1)/r = target
// → pac = (target - w0*(1+r)^n) * r / ((1+r)^n - 1)
function calcRequiredPAC(target, w0, annualRate, years) {
  if (years <= 0 || annualRate < 0) return null;
  const r = annualRate / 12; // monthly
  const n = years * 12;
  const fvW0 = w0 * Math.pow(1 + r, n);
  const remaining = target - fvW0;
  if (remaining <= 0) return 0; // già raggiunto con il solo capitale iniziale
  if (r === 0) return remaining / n;
  const fvFactor = (Math.pow(1 + r, n) - 1) / r;
  return remaining / fvFactor;
}

// ── Calcola anni necessari per raggiungere target con PAC dato ───────────────
// Iterativo (non ha forma chiusa analitica con tasso non zero)
function calcRequiredYears(target, w0, pac, annualRate) {
  if (pac <= 0 && w0 >= target) return 0;
  if (pac <= 0 && w0 < target && annualRate <= 0) return Infinity;
  const r = annualRate / 12;
  let v = w0;
  const maxMonths = 600; // 50 anni limite
  for (let m = 1; m <= maxMonths; m++) {
    v = v * (1 + r) + pac;
    if (v >= target) return m / 12;
  }
  return Infinity;
}

// ── Proiezione completa con tutti gli scenari per il tab ─────────────────────
function calcGoalProjection() {
  const { mode, targetCapital, years, pac, w0, portfolio, ter, scenario } = goalState;
  const p = typeof getPortParams === 'function' ? getPortParams(portfolio) : null;
  if (!p) return null;

  const rates = {
    best:   Math.max(0, p.best   - ter / 100),
    normal: Math.max(0, p.normal - ter / 100),
    worst:  Math.max(0, p.worst  - ter / 100),
  };

  if (mode === 'pac') {
    // Dato target + anni → PAC necessario nei 3 scenari
    return {
      mode,
      best:   calcRequiredPAC(targetCapital, w0, rates.best,   years),
      normal: calcRequiredPAC(targetCapital, w0, rates.normal, years),
      worst:  calcRequiredPAC(targetCapital, w0, rates.worst,  years),
      targetCapital, years, w0, rates,
    };
  }

  if (mode === 'years') {
    // Dato target + PAC → anni necessari
    return {
      mode,
      best:   calcRequiredYears(targetCapital, w0, pac, rates.best),
      normal: calcRequiredYears(targetCapital, w0, pac, rates.normal),
      worst:  calcRequiredYears(targetCapital, w0, pac, rates.worst),
      targetCapital, pac, w0, rates,
    };
  }

  if (mode === 'target') {
    // Dato PAC + anni → capitale raggiungibile
    return {
      mode,
      best:   _quickProject(w0, pac, rates.best,   years),
      normal: _quickProject(w0, pac, rates.normal, years),
      worst:  _quickProject(w0, pac, rates.worst,  years),
      pac, years, w0, rates,
    };
  }

  return null;
}

// ── Render tab obiettivo inverso ─────────────────────────────────────────────
function renderGoalTab() {
  const tab = document.getElementById('tab-goal');
  if (!tab || !tab.classList.contains('active')) return;

  const result = calcGoalProjection();
  const out = document.getElementById('goalOutput');
  if (!out || !result) return;

  const fmt = v => {
    if (!isFinite(v) || v === Infinity) return '> 50 anni';
    if (v === 0) return '€0';
    const a = Math.abs(v);
    if (a >= 1e6) return '€' + (a / 1e6).toFixed(2) + 'M';
    if (a >= 1e3) return '€' + (a / 1e3).toFixed(1) + 'k';
    return '€' + Math.round(a);
  };
  const fmtYears = v => {
    if (!isFinite(v) || v > 50) return '> 50 anni';
    if (v <= 0) return 'già raggiunto';
    const y = Math.floor(v), m = Math.round((v - y) * 12);
    return y > 0 ? `${y} anni${m > 0 ? ` e ${m} mesi` : ''}` : `${m} mesi`;
  };

  const p = typeof getPortParams === 'function' ? getPortParams(goalState.portfolio) : null;
  const portLabel = p ? (p.label || goalState.portfolio) : goalState.portfolio;

  const cards = (mode => {
    if (mode === 'pac') {
      return [
        { label: 'Scenario Pessimistico', val: fmt(result.worst),  sub: `Rendimento ${(result.rates.worst * 100).toFixed(2)}%/a netto`, color: 'var(--orange)', note: result.worst > 0 ? `${fmt(result.worst)}/mese` : null },
        { label: 'Scenario Base',         val: fmt(result.normal), sub: `Rendimento ${(result.rates.normal * 100).toFixed(2)}%/a netto`, color: 'var(--blue)',   note: result.normal > 0 ? `${fmt(result.normal)}/mese` : null },
        { label: 'Scenario Ottimistico',  val: fmt(result.best),   sub: `Rendimento ${(result.rates.best * 100).toFixed(2)}%/a netto`,  color: 'var(--green)', note: result.best > 0 ? `${fmt(result.best)}/mese` : null },
      ];
    }
    if (mode === 'years') {
      return [
        { label: 'Scenario Pessimistico', val: fmtYears(result.worst),  sub: `Rendimento ${(result.rates.worst * 100).toFixed(2)}%/a netto`, color: 'var(--orange)' },
        { label: 'Scenario Base',         val: fmtYears(result.normal), sub: `Rendimento ${(result.rates.normal * 100).toFixed(2)}%/a netto`, color: 'var(--blue)'   },
        { label: 'Scenario Ottimistico',  val: fmtYears(result.best),   sub: `Rendimento ${(result.rates.best * 100).toFixed(2)}%/a netto`,  color: 'var(--green)' },
      ];
    }
    if (mode === 'target') {
      return [
        { label: 'Scenario Pessimistico', val: fmt(result.worst),  sub: `Rendimento ${(result.rates.worst * 100).toFixed(2)}%/a netto`, color: 'var(--orange)' },
        { label: 'Scenario Base',         val: fmt(result.normal), sub: `Rendimento ${(result.rates.normal * 100).toFixed(2)}%/a netto`, color: 'var(--blue)'   },
        { label: 'Scenario Ottimistico',  val: fmt(result.best),   sub: `Rendimento ${(result.rates.best * 100).toFixed(2)}%/a netto`,  color: 'var(--green)' },
      ];
    }
    return [];
  })(result.mode);

  const modeDescriptions = {
    pac:    `PAC mensile necessario per raggiungere ${fmt(goalState.targetCapital)} in ${goalState.years} anni`,
    years:  `Anni necessari per raggiungere ${fmt(goalState.targetCapital)} con PAC di ${fmt(goalState.pac)}/mese`,
    target: `Capitale raggiungibile in ${goalState.years} anni con PAC di ${fmt(goalState.pac)}/mese`,
  };

  out.innerHTML = `
    <div style="margin-bottom:16px">
      <div class="sec-label">${modeDescriptions[result.mode]}</div>
      <div style="font-size:12px;color:var(--text3);margin-top:-8px">
        Portafoglio: <strong>${portLabel}</strong> · TER: <strong>${goalState.ter.toFixed(2)}%</strong>
        · Capitale iniziale: <strong>${fmt(goalState.w0)}</strong>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px">
      ${cards.map(c => `
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:16px;text-align:center">
          <div style="font-size:11px;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">${c.label}</div>
          <div style="font-size:24px;font-weight:700;color:${c.color};font-family:'DM Mono',monospace;margin-bottom:4px">${c.val}</div>
          <div style="font-size:11.5px;color:var(--text3)">${c.sub}</div>
        </div>
      `).join('')}
    </div>

    ${result.mode === 'pac' ? `
    <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:14px;font-size:12.5px;color:var(--text2);line-height:1.7">
      <strong>💡 Come leggere il risultato:</strong> Il PAC nello scenario base (${fmt(result.normal)}/mese)
      è quello necessario assumendo il rendimento storico medio del portafoglio ${portLabel},
      al netto del TER. Lo scenario pessimistico richiede un PAC più alto perché il rendimento
      atteso è inferiore. Se il capitale iniziale (${fmt(goalState.w0)}) è già sufficiente a
      raggiungere l'obiettivo, il PAC necessario è €0.
    </div>` : ''}

    ${result.mode === 'years' ? `
    <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:14px;font-size:12.5px;color:var(--text2);line-height:1.7">
      <strong>💡 Come leggere il risultato:</strong> Con PAC di ${fmt(goalState.pac)}/mese e
      portafoglio ${portLabel} (netto TER ${goalState.ter.toFixed(2)}%),
      raggiungeresti ${fmt(goalState.targetCapital)} in ${fmtYears(result.normal)} nello scenario base.
      La differenza tra scenario pessimistico e ottimistico mostra la forchetta di incertezza del mercato.
    </div>` : ''}

    ${result.mode === 'target' ? `
    <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:14px;font-size:12.5px;color:var(--text2);line-height:1.7">
      <strong>💡 Come leggere il risultato:</strong> Con PAC di ${fmt(goalState.pac)}/mese per ${goalState.years} anni
      e portafoglio ${portLabel} (netto TER ${goalState.ter.toFixed(2)}%), il tuo patrimonio
      raggiungerebbe ${fmt(result.normal)} nello scenario base.
      La forchetta pessimistico–ottimistico (${fmt(result.worst)} – ${fmt(result.best)}) rappresenta
      l'incertezza tipica dei mercati finanziari su questo orizzonte.
    </div>` : ''}

    <div style="margin-top:14px;padding:10px 14px;background:rgba(217,48,37,.06);border:1px solid rgba(217,48,37,.2);border-radius:var(--radius-sm);font-size:11.5px;color:var(--text3)">
      ⚠️ <strong>Nota:</strong> Questi calcoli usano rendimenti storici costanti e non considerano
      inflazione, variazioni di rendimento nel tempo, imposte intermediate o eventi straordinari.
      Per un'analisi completa usa il tab <strong>Simulatore</strong> con Monte Carlo e sequence risk.
    </div>
  `;
}

// ── Sync sliders del goal tab ─────────────────────────────────────────────────
function _bindGoalSlider(sliderId, labelId, stateKey, formatFn, unit) {
  const s = document.getElementById(sliderId);
  const l = document.getElementById(labelId);
  if (!s || !l) return;
  s.oninput = function() {
    goalState[stateKey] = parseFloat(this.value);
    if (l) l.textContent = formatFn(goalState[stateKey]);
    renderGoalTab();
  };
}

function _syncGoalSlidersFromState() {
  const _sv = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  const _sl = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
  const fmt2 = v => { const a = Math.abs(v); if (a >= 1e6) return '€' + (a/1e6).toFixed(1)+'M'; if (a >= 1e3) return '€' + Math.round(a/1e3)+'k'; return '€' + Math.round(a); };

  _sv('sGoalTarget', goalState.targetCapital); _sl('lGoalTarget', fmt2(goalState.targetCapital));
  _sv('sGoalYears',  goalState.years);         _sl('lGoalYears',  goalState.years + ' anni');
  _sv('sGoalPAC',    goalState.pac);           _sl('lGoalPAC',    fmt2(goalState.pac) + '/m');
  _sv('sGoalW0',     goalState.w0);            _sl('lGoalW0',     fmt2(goalState.w0));
  _sv('sGoalTER',    goalState.ter);           _sl('lGoalTER',    goalState.ter.toFixed(2) + '%');
}

function switchGoalMode(mode) {
  goalState.mode = mode;
  document.querySelectorAll('#goalModeBtns .gbtn').forEach(b =>
    b.classList.toggle('a-blue', b.dataset.gm === mode));
  // Mostra/nascondi sezioni rilevanti
  const showTarget = (mode === 'pac' || mode === 'years');
  const showPAC    = (mode === 'years' || mode === 'target');
  const showYears  = (mode === 'pac' || mode === 'target');
  const tEl = document.getElementById('goalTargetBlock');
  const pEl = document.getElementById('goalPACBlock');
  const yEl = document.getElementById('goalYearsBlock');
  if (tEl) tEl.style.display = showTarget ? '' : 'none';
  if (pEl) pEl.style.display = showPAC    ? '' : 'none';
  if (yEl) yEl.style.display = showYears  ? '' : 'none';
  renderGoalTab();
}
window.switchGoalMode = switchGoalMode;

// Sincronizza portafoglio con quello del simulatore principale
function syncGoalPortfolio() {
  goalState.portfolio = state.portfolio;
  goalState.ter       = state.ter;
  goalState.w0        = state.w;
  goalState.pac       = state.pac;
  document.getElementById('sGoalTER') && (document.getElementById('sGoalTER').value = goalState.ter);
  document.getElementById('lGoalTER') && (document.getElementById('lGoalTER').textContent = goalState.ter.toFixed(2) + '%');
  document.getElementById('sGoalW0') && (document.getElementById('sGoalW0').value = goalState.w0);
  document.getElementById('lGoalW0') && (document.getElementById('lGoalW0').textContent = _fmtW(goalState.w0));
  document.getElementById('sGoalPAC') && (document.getElementById('sGoalPAC').value = goalState.pac);
  document.getElementById('lGoalPAC') && (document.getElementById('lGoalPAC').textContent = _fmtW(goalState.pac) + '/m');
  // Sincronizza i campi numerici digitabili affiancati agli slider
  if (typeof syncNumBox === 'function') { syncNumBox('sGoalW0'); syncNumBox('sGoalPAC'); }
  document.querySelectorAll('#goalPortBtns .gbtn').forEach(b =>
    b.classList.toggle('a-blue', b.dataset.gp === goalState.portfolio));
  renderGoalTab();
}
window.syncGoalPortfolio = syncGoalPortfolio;

// ── Init al DOM ready ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  const fmt2 = v => { const a = Math.abs(v); if (a >= 1e6) return '€'+(a/1e6).toFixed(1)+'M'; if (a >= 1e3) return '€'+Math.round(a/1e3)+'k'; return '€'+Math.round(a); };

  _bindGoalSlider('sGoalTarget', 'lGoalTarget', 'targetCapital', fmt2);
  _bindGoalSlider('sGoalYears',  'lGoalYears',  'years',  v => v + ' anni');
  _bindGoalSlider('sGoalPAC',    'lGoalPAC',    'pac',    v => fmt2(v) + '/m');
  _bindGoalSlider('sGoalW0',     'lGoalW0',     'w0',     fmt2);
  _bindGoalSlider('sGoalTER',    'lGoalTER',    'ter',    v => v.toFixed(2) + '%');

  // Portafoglio buttons nel goal tab
  const portBtns = document.getElementById('goalPortBtns');
  if (portBtns) {
    portBtns.onclick = function(e) {
      const b = e.target.closest('[data-gp]');
      if (!b) return;
      goalState.portfolio = b.dataset.gp;
      portBtns.querySelectorAll('.gbtn').forEach(x => x.classList.remove('a-blue'));
      b.classList.add('a-blue');
      renderGoalTab();
    };
  }

  _syncGoalSlidersFromState();

  // Hook nella switchTab esistente per render lazy
  const origSwitch = window.switchTab;
  if (typeof origSwitch === 'function') {
    window.switchTab = function(tabId, ...args) {
      origSwitch(tabId, ...args);
      if (tabId === 'goal') {
        setTimeout(renderGoalTab, 30);
      }
    };
  }
});

window.renderGoalTab = renderGoalTab;
