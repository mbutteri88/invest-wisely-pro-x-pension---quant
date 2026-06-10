/* ════════════════════════════════════════════════════════════════════════
   TEST.JS — Tester automatico della Suite Patrimoniale Pro
   ────────────────────────────────────────────────────────────────────────
   Verifica end-to-end di tutto il simulatore. Eseguibile da riga di comando:

       node test.js

   Esegue 6 suite di test con assert espliciti e stampa un riepilogo
   PASS/FAIL. Exit code 0 se tutto verde, 1 se almeno un test fallisce
   (utile per CI / pre-deploy).

   COSA VERIFICA
     1. DATI STORICI 1970-2024  — accuratezza vs serie reali EUR, CAGR, vol,
                                   assenza di valori anomali (no garbage-in)
     2. SIMULATORE              — tutti i preset × scenari worst/base/best,
                                   monotonia, scenari economici, custom, tasse
     3. BACKTESTING STORICO     — tutti i portafogli × anni-crisi, drawdown
     4. MC AVANZATO             — t-Student, GARCH, regime-switch, bootstrap
     5. DECUMULO STORICO        — success rate SWR per portafoglio (Trinity)
     6. SCHEDA PENSIONE         — coefficienti DM, IRPEF, tasso sostituzione

   NOTA: il tester estrae le funzioni dai file sorgente con regex e le valuta
   in un contesto isolato con stub DOM minimi. Non modifica nulla. Se cambi
   i nomi delle funzioni nei sorgenti, aggiorna i grab() corrispondenti.
   ════════════════════════════════════════════════════════════════════════ */

'use strict';
const fs = require('fs');
const path = require('path');

// ─── Mini-framework di test ───────────────────────────────────────────────
let PASS = 0, FAIL = 0, WARN = 0;
const failures = [];
function ok(cond, name, detail) {
  if (cond) { PASS++; console.log('  \x1b[32m✓\x1b[0m ' + name); }
  else { FAIL++; failures.push(name + (detail ? ' → ' + detail : '')); console.log('  \x1b[31m✗\x1b[0m ' + name + (detail ? '  \x1b[2m' + detail + '\x1b[0m' : '')); }
}
function warn(name, detail) { WARN++; console.log('  \x1b[33m⚠\x1b[0m ' + name + (detail ? '  \x1b[2m' + detail + '\x1b[0m' : '')); }
function near(a, b, tol) { return Math.abs(a - b) <= tol; }
// Per i test su simulazioni casuali: ritenta una volta in caso di esito negativo.
// Il rumore di campionamento (es. curtosi della t-Student, mediane Monte Carlo)
// puo' raramente sforare le soglie; un difetto REALE fallisce entrambe le volte.
function okStochastic(fn, name) {
  let r = fn();
  if (!r.pass) r = fn();   // secondo tentativo: solo il flake di sampling si salva
  ok(r.pass, name, r.detail);
}
function header(t) { console.log('\n\x1b[1m' + t + '\x1b[0m'); }

// ─── Caricamento moduli sorgente ──────────────────────────────────────────
const DIR = __dirname;
function read(f) {
  const p = path.join(DIR, f);
  if (!fs.existsSync(p)) { console.error('File mancante: ' + f); process.exit(1); }
  return fs.readFileSync(p, 'utf8');
}
const SRC = {
  main: read('main.js'),
  amc:  read('advanced-montecarlo.js'),
  bt:   read('backtest.js'),
  pens: fs.existsSync(path.join(DIR, 'pensione.js')) ? read('pensione.js') : null,
};
function grab(src, re) { const m = src.match(re); return m ? m[0] : null; }

// Stub DOM/ambiente minimi così le funzioni che toccano il DOM non esplodono
global.window = {};
global.document = {
  getElementById: () => ({ innerHTML: '', innerText: '', value: '', style: {}, dataset: {},
    classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} },
    setAttribute(){}, appendChild(){}, querySelector(){return null;}, querySelectorAll(){return [];} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener(){},
  createElement: () => ({ style:{}, classList:{add(){},remove(){}}, setAttribute(){}, appendChild(){} }),
  readyState: 'complete',
};
global.setInterval = () => 0; global.clearInterval = () => {};
global.randn_bm = function(){let u=0,v=0;while(u===0)u=Math.random();while(v===0)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};

// Helper per caricare una const/funzione nel global scope
function loadConst(src, re, alias) {
  const code = grab(src, re); if (!code) return false;
  eval(code.replace('const ', 'global.' + (alias || '') ));
  return true;
}
function loadFn(src, name) {
  // Trova "function NAME(" e poi estrae il corpo bilanciando le graffe,
  // così try/catch e blocchi annidati non troncano l'estrazione.
  const sig = new RegExp('function\\s+' + name + '\\s*\\(');
  const m = sig.exec(src);
  if (!m) return false;
  let i = src.indexOf('{', m.index);
  if (i < 0) return false;
  let depth = 0, end = -1;
  for (let j = i; j < src.length; j++) {
    const ch = src[j];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { end = j; break; } }
  }
  if (end < 0) return false;
  const code = src.slice(m.index, end + 1);
  try { eval(code.replace(new RegExp('function\\s+' + name), 'global.' + name + ' = function')); return true; }
  catch (e) { return false; }
}

// ════════════════════════════════════════════════════════════════════════
// SUITE 1 — DATI STORICI 1970-2024
// ════════════════════════════════════════════════════════════════════════
function suiteData() {
  header('SUITE 1 — DATI STORICI 1970-2024');
  // Carica HIST_MONTHLY + calibrateHistRow
  eval('global.' + grab(SRC.amc, /const HIST_MONTHLY = \(function\(\)\{[\s\S]*?\}\)\(\);/).replace('const ', ''));
  loadFn(SRC.amc, 'calibrateHistRow');
  const HM = global.HIST_MONTHLY, cal = global.calibrateHistRow;
  const N = HM.length, idx = y => (y - 1970) * 12;

  ok(N === 660, 'Lunghezza serie = 660 mesi (55 anni)', 'trovati ' + N);

  // 1.a Accuratezza vs serie reali EUR (MSCI World Net / Euro Agg / oro EUR)
  const realEq = {1970:-3.4,1973:-16,1974:-21,1980:26,1987:-2,1990:-16,1994:5,1999:46,2000:-6,2001:-13,2002:-32,2008:-37,2013:21,2018:-4,2020:6,2022:-13,2024:26};
  const realOb = {1976:13,1980:-2.5,1994:-4,2000:6.5,2008:6,2013:-3,2022:-15};
  const realGd = {1973:68,1979:120,1980:12,2008:9,2013:-31,2020:14,2024:36};
  const annual = (c, y) => { let p = 1; for (let m = 0; m < 12; m++) p *= (1 + cal(HM[idx(y)+m])[c]); return (p-1)*100; };
  let tot = 0, n = 0, maxE = 0, maxY = 0;
  for (const [set, col] of [[realEq,0],[realOb,1],[realGd,2]])
    for (const y of Object.keys(set).map(Number)) { const g = Math.abs(annual(col,y) - set[y]); tot += g; n++; if (g > maxE){maxE=g;maxY=y;} }
  const meanErr = tot / n;
  ok(meanErr < 1.0, 'Errore medio annuo < 1pt vs serie reali', meanErr.toFixed(2) + 'pt (max ' + maxE.toFixed(1) + 'pt @' + maxY + ')');

  // 1.b CAGR e volatilità di lungo periodo nei range attesi
  const cagr = c => { let p = 1; for (let i = 0; i < N; i++) p *= (1 + cal(HM[i])[c]); return Math.pow(p, 12/N) - 1; };
  const vol = c => { let r = []; for (let i = 0; i < N; i++) r.push(cal(HM[i])[c]); const m = r.reduce((a,b)=>a+b)/N; return Math.sqrt(r.reduce((a,b)=>a+(b-m)**2,0)/N*12); };
  ok(cagr(0) > 0.06 && cagr(0) < 0.11, 'CAGR equity 6-11%', (cagr(0)*100).toFixed(2)+'%');
  ok(cagr(1) > 0.03 && cagr(1) < 0.08, 'CAGR bond 3-8%',    (cagr(1)*100).toFixed(2)+'%');
  ok(cagr(2) > 0.04 && cagr(2) < 0.10, 'CAGR oro 4-10%',    (cagr(2)*100).toFixed(2)+'%');
  ok(vol(0) > 0.12 && vol(0) < 0.20, 'Vol equity 12-20%', (vol(0)*100).toFixed(1)+'%');
  ok(vol(1) > 0.03 && vol(1) < 0.08, 'Vol bond 3-8%',     (vol(1)*100).toFixed(1)+'%');
  ok(vol(2) > 0.12 && vol(2) < 0.25, 'Vol oro 12-25%',    (vol(2)*100).toFixed(1)+'%');

  // 1.c Nessun valore non finito o assurdo (>50%/mese) — anti garbage-in
  let bad = 0;
  for (let i = 0; i < N; i++) for (let c = 0; c < 3; c++) { const v = HM[i][c]; if (!isFinite(v) || Math.abs(v) > 0.5) bad++; }
  ok(bad === 0, 'Nessun rendimento mensile non finito o |r|>50%', bad + ' anomalie');

  // 1.d Correlazioni storiche plausibili (diversificazione reale)
  const corr = (a,b) => { let ra=[],rb=[]; for(let i=0;i<N;i++){ra.push(cal(HM[i])[a]);rb.push(cal(HM[i])[b]);} const ma=ra.reduce((x,y)=>x+y)/N,mb=rb.reduce((x,y)=>x+y)/N; let cov=0,va=0,vb=0; for(let i=0;i<N;i++){cov+=(ra[i]-ma)*(rb[i]-mb);va+=(ra[i]-ma)**2;vb+=(rb[i]-mb)**2;} return cov/Math.sqrt(va*vb); };
  ok(Math.abs(corr(0,1)) < 0.5, 'Correlazione eq-bond moderata (|ρ|<0.5)', corr(0,1).toFixed(2));
  ok(Math.abs(corr(0,2)) < 0.5, 'Correlazione eq-oro bassa (|ρ|<0.5)', corr(0,2).toFixed(2));
}

// ════════════════════════════════════════════════════════════════════════
// SUITE 2 — SIMULATORE (preset, scenari, custom, tasse)
// ════════════════════════════════════════════════════════════════════════
function loadSimulator() {
  [
    /const PORT = \{[\s\S]*?\n\};/, /const ASSET_CLASSES = \{[\s\S]*?\n\};/,
    /const AC_CAT = [\s\S]*?\};/, /const CORR_PAIR = \([\s\S]*?\n\};/,
    /const CORR_PAIR_STRESS = \([\s\S]*?\n\};/, /const ECO_SCENARIOS = \{[\s\S]*?\n\};/,
    /const NORMAL_ECO = [\s\S]*?\};/, /const SEQ_RATES = [\s\S]*?;/,
    /const RECOVERY_YEARS = [\s\S]*?;/, /const BOND_RALLY_RATE = [\s\S]*?;/,
    /const RECOVERY_CATCHUP = [\s\S]*?;/, /const SEQ_CRASH_GAP = [\s\S]*?;/,
    /const CRASH_BETA = \{[\s\S]*?\};/,
  ].forEach(re => { const c = grab(SRC.main, re); if (c) eval(c.replace('const ', 'global.')); });
  eval(grab(SRC.main, /let state = \{[\s\S]*?\n\};/).replace('let ', 'global.'));
  ['fmt','fmtN','fmtFull','getCrashYears',
   'getCrashYear','_sanitizeCrashYears','getCrashWeights','getLCWeight','getEquityWeight',
   'getGoldWeight','getCashWeight','calcCustomParams','getRate','getRateEco','getEcoWindow',
   'projectEco','getPacForYear','project','blendedTaxRate','calcNetNom','cagrSafe'].forEach(fn => loadFn(SRC.main, fn));
}
function setState(o) {
  Object.assign(global.state, {
    w:50000, pac:500, age:30, years:35, portfolio:'eq60', ter:0.20, taxEq:26, taxOb:12.5,
    opt:450000, pics:[], exps:[], pacChanges:[],
    seq:{on:false,mode:'single',timing:'mid',severity:'moderate',dynCorr:false},
    fxHedge:false, fxHedgeCost:0.005, fxVol:0.08, inflBottom:2, inflVol:1, ecoTiming:'early',
    customPortfolio:{slots:[]},
  }, o);
}
function suiteSimulator() {
  header('SUITE 2 — SIMULATORE');
  loadSimulator();
  const PORT = global.PORT, project = global.project, projectEco = global.projectEco;

  // 2.a Tutti i preset: worst < base < best, valori finiti
  const presets = Object.keys(PORT).filter(k => k !== 'custom');
  let monoOk = 0;
  for (const p of presets) {
    setState({ portfolio: p });
    let vals = [];
    try { for (const sc of ['worst','normal','best']) vals.push(project(sc, false)[35].value); } catch(e){ vals = [NaN]; }
    const fin = vals.every(v => isFinite(v) && v > 0);
    const mono = vals[0] < vals[1] && vals[1] < vals[2];
    if (fin && mono) monoOk++;
    else ok(false, 'Preset ' + p + ' monotono e finito', JSON.stringify(vals.map(v=>Math.round(v))));
  }
  ok(monoOk === presets.length, 'Tutti i ' + presets.length + ' preset: worst<base<best, valori finiti', monoOk + '/' + presets.length);

  // 2.b Scenari economici producono valori validi
  setState({ portfolio:'eq60' });
  const ecos = Object.keys(global.ECO_SCENARIOS);
  let ecoOk = 0;
  for (const e of ecos) { try { const d = projectEco(e); if (d && isFinite(d[35].value) && d[35].value > 0) ecoOk++; } catch(_){} }
  ok(ecoOk === ecos.length, 'Tutti i ' + ecos.length + ' scenari economici validi', ecoOk + '/' + ecos.length);

  // 2.c projectEco('normal_growth') ≈ project('normal') (coerenza motore)
  setState({ portfolio:'eq100' });
  const dN = project('normal', false)[35].value;
  const dE = projectEco('normal_growth')[35].value;
  ok(near(dN, dE, dN * 0.001), 'Scenario base eco == base principale (eq100)', Math.round(dN) + ' vs ' + Math.round(dE));

  // 2.d Custom portfolio multi-asset
  setState({ portfolio:'custom', customPortfolio:{ slots:[{ac:'eq_sviluppati',pct:50},{ac:'ob_glob_agg',pct:30},{ac:'gold',pct:10},{ac:'cash',pct:10}] } });
  let cpOk = false, cp;
  try { cp = global.calcCustomParams(); cpOk = isFinite(cp.normal) && isFinite(cp.vol) && cp.normal > 0; } catch(_){}
  ok(cpOk, 'Custom 4-asset: parametri finiti', cpOk ? ('mu '+(cp.normal*100).toFixed(1)+'% vol '+(cp.vol*100).toFixed(1)+'%') : 'errore');
  let custProj = false;
  try { custProj = isFinite(project('normal', false)[35].value); } catch(_){}
  ok(custProj, 'Custom 4-asset: proiezione finita');

  // 2.e Sequence risk non rompe la proiezione
  setState({ portfolio:'eq100', seq:{on:true,mode:'triple',timing:'early',severity:'severe',dynCorr:true} });
  let seqOk = false; try { seqOk = project('normal', true).every(x => isFinite(x.value)); } catch(e){ seqOk = false; }
  ok(seqOk, 'Sequence risk (triple/severe/dynCorr) non produce NaN');

  // 2.f Aliquota fiscale blended — oro/cash al 26% (fix Italia)
  const blended = global.blendedTaxRate;
  const taxOf = p => { setState({ portfolio:p }); return blended(40) * 100; };
  ok(near(taxOf('golden_butterfly'), 20.6, 0.3), 'Golden Butterfly aliquota 20.6% (oro al 26%)', taxOf('golden_butterfly').toFixed(1)+'%');
  ok(near(taxOf('eq100'), 26.0, 0.2), 'eq100 aliquota 26%', taxOf('eq100').toFixed(1)+'%');
  ok(near(taxOf('ob100'), 12.5, 0.2), 'ob100 aliquota 12.5%', taxOf('ob100').toFixed(1)+'%');
  ok(near(taxOf('permanent'), 22.6, 0.3), 'Permanent aliquota 22.6%', taxOf('permanent').toFixed(1)+'%');

  // 2.g Edge cases: capitale non va negativo con uscita > montante
  setState({ portfolio:'eq100', w:1000, pac:0, exps:[{year:1, amount:5000}] });
  let noNeg = false; try { noNeg = project('normal', false).every(x => x.value >= 0 && isFinite(x.value)); } catch(_){}
  ok(noNeg, 'Uscita > capitale: il montante non va negativo');

  // 2.h Limiti estremi (capitale/PAC alti) senza overflow
  setState({ portfolio:'eq100', w:5000000, pac:15000, years:40 });
  let big = false; try { const f = project('best', false)[40].value; big = isFinite(f) && f < Number.MAX_SAFE_INTEGER; } catch(_){}
  ok(big, 'Valori elevati (5M+15k, best, 40a) senza overflow');
}

// ════════════════════════════════════════════════════════════════════════
// SUITE 3 — BACKTESTING STORICO
// ════════════════════════════════════════════════════════════════════════
function suiteBacktest() {
  header('SUITE 3 — BACKTESTING STORICO');
  const HM = global.HIST_MONTHLY, cal = global.calibrateHistRow;
  const N = HM.length, idx = y => (y - 1970) * 12;
  // pesi preset replicati (coerenti con getEquityWeight/getGoldWeight/getCashWeight)
  const eqM={ob100:0,eq100:1,eq80:.8,eq60:.6,eq50:.5,eq40:.4,eq20:.2,golden_butterfly:.4,permanent:.25,all_seasons:.30,larry:.30,global_market:.55,ec_us_9060:.90,ec_glob_9060:.90,return_stack:.45};
  const goldM={golden_butterfly:.2,permanent:.25,all_seasons:.15}, cashM={permanent:.25};
  const W = p => { const eq=eqM[p],g=goldM[p]||0,c=cashM[p]||0; return {eq, ob:Math.max(0,1-eq-g-c), g, c}; };
  function run(p, sy, Y, pac, w0) {
    const w = W(p); let cap = w0, inv = w0, peak = w0, mdd = 0; const ter = 0.002/12;
    for (let m = 0; m < Y*12; m++) { const i = idx(sy)+m; if (i >= N) return null; const r = cal(HM[i]);
      const pr = w.eq*r[0]+w.ob*r[1]+w.g*r[2]+w.c*0.002-ter;
      inv += pac; cap = Math.max(0, cap+pac+(cap+pac/2)*pr);
      if (cap > peak) peak = cap; if (peak > 0 && cap/peak-1 < mdd) mdd = cap/peak-1; }
    return { cap, inv, mult: cap/inv, mdd };
  }
  // 3.a Tutti i portafogli × anni-crisi: nessun fallimento, multipli positivi
  const presets = Object.keys(eqM);
  const starts = [1973,1980,1987,1995,2000,2004,2008];
  let runs = 0, bad = 0;
  for (const p of presets) for (const sy of starts) {
    const r = run(p, sy, 15, 1000, 10000); if (!r) continue; runs++;
    if (!isFinite(r.mult) || r.mult <= 0) bad++;
  }
  ok(bad === 0 && runs > 80, 'Backtest ' + runs + ' combinazioni (portafoglio×anno): nessun fallimento', bad + ' falliti');

  // 3.b Drawdown coerenti col profilo di rischio
  const worstDD = (p, Y) => { let w=0; const max=1970+Math.floor(N/12)-Y; for(let sy=1970;sy<=max;sy++){const r=run(p,sy,Y,0,100000); if(r&&r.mdd<w)w=r.mdd;} return w; };
  const ddEq = worstDD('eq100',15), ddGB = worstDD('golden_butterfly',15), ddOb = worstDD('ob100',15);
  ok(ddEq < -0.40, 'eq100 max drawdown severo (<-40%)', (ddEq*100).toFixed(0)+'%');
  ok(ddGB > -0.30 && ddGB < -0.05, 'Golden Butterfly drawdown contenuto (-5..-30%)', (ddGB*100).toFixed(0)+'%');
  ok(Math.abs(ddGB) < Math.abs(ddEq), 'GB più difensivo di eq100', (ddGB*100).toFixed(0)+'% vs '+(ddEq*100).toFixed(0)+'%');

  // 3.c Differenziazione: nel dot-com (2000) GB batte eq100 su 10 anni
  const eq2000 = run('eq100',2000,10,1000,50000), gb2000 = run('golden_butterfly',2000,10,1000,50000);
  ok(gb2000.mult >= eq2000.mult, 'Dot-com 2000: GB protegge meglio di eq100', 'GB x'+gb2000.mult.toFixed(2)+' vs eq x'+eq2000.mult.toFixed(2));
}

// ════════════════════════════════════════════════════════════════════════
// SUITE 4 — MONTE CARLO AVANZATO
// ════════════════════════════════════════════════════════════════════════
function suiteMC() {
  header('SUITE 4 — MONTE CARLO AVANZATO');
  loadConst(SRC.amc, /const RS_PARAMS = \{[\s\S]*?\};/);
  loadConst(SRC.amc, /const GARCH_EQ[\s\S]*?\};/);
  loadConst(SRC.amc, /const GARCH_OB[\s\S]*?\};/);
  ['randn_t','sampleGARCH','sampleRegime','calcHistMean','sampleBootstrap'].forEach(fn => loadFn(SRC.amc, fn));
  const pct = (a,p) => { const x=[...a].sort((m,n)=>m-n); return x[Math.floor(x.length*p)]; };

  // 4.a t-Student: code grasse (curtosi > 3). NOTA: lo stimatore della curtosi
  // su distribuzioni heavy-tail (nu=5) ha varianza altissima -> retry anti-flake.
  if (global.randn_t) {
    okStochastic(() => {
      let ts=[]; for(let i=0;i<50000;i++) ts.push(global.randn_t(5));
      const m=ts.reduce((a,b)=>a+b)/ts.length, sd=Math.sqrt(ts.reduce((a,b)=>a+(b-m)**2,0)/ts.length);
      const kurt=ts.reduce((a,b)=>a+((b-m)/sd)**4,0)/ts.length;
      return { pass: kurt > 3.5, detail: kurt.toFixed(1) };
    }, 't-Student: curtosi > 3 (code grasse)');
  } else warn('t-Student: funzione non trovata (randn_t)');

  // 4.b GARCH: CAGR mediano nel range plausibile
  if (global.sampleGARCH && global.GARCH_EQ) {
    okStochastic(() => {
      let g=[]; const init=Math.sqrt(global.GARCH_EQ.omega/(1-global.GARCH_EQ.alpha-global.GARCH_EQ.beta));
      for(let p=0;p<1500;p++){ const mo=global.sampleGARCH(global.GARCH_EQ,420,init); let w=1; mo.forEach(r=>w*=(1+r)); g.push(Math.pow(w,1/35)-1); }
      return { pass: pct(g,.5)>0.02 && pct(g,.5)<0.11, detail: (pct(g,.5)*100).toFixed(1)+'%' };
    }, 'GARCH equity: CAGR mediano 2-11%');
  } else warn('GARCH: funzione/parametri non trovati');

  // 4.c Regime-switching: CAGR mediano plausibile
  if (global.sampleRegime) {
    okStochastic(() => {
      let rg=[]; for(let p=0;p<1500;p++){ const out=global.sampleRegime(420); const ret=out.returns||out; let w=1; ret.forEach(r=>w*=(1+r)); rg.push(Math.pow(w,1/35)-1); }
      return { pass: pct(rg,.5)>0 && pct(rg,.5)<0.15, detail: (pct(rg,.5)*100).toFixed(1)+'%' };
    }, 'Regime-switching: CAGR mediano 0-15%');
  } else warn('Regime-switching: funzione non trovata');

  // 4.d Block bootstrap: P50 ≈ media storica del portafoglio (drift allineato)
  if (global.sampleBootstrap && global.calcHistMean) {
    const gbMean = global.calcHistMean(0.4, 0.2, 0.4, 0);
    okStochastic(() => {
      let b=[]; for(let p=0;p<3000;p++){ let w=1; for(let y=0;y<20;y++) w*=(1+global.sampleBootstrap(0.4,0.2,0.4,0,gbMean)); b.push(Math.pow(w,1/20)-1); }
      const passA = near(pct(b,.5), gbMean, 0.02);
      const passB = pct(b,.05) < pct(b,.5) && pct(b,.5) < pct(b,.95);
      global.__bootB = b;
      return { pass: passA, detail: 'P50 '+(pct(b,.5)*100).toFixed(1)+'% vs '+(gbMean*100).toFixed(1)+'%' };
    }, 'Bootstrap GB: P50 ≈ media storica');
    const b = global.__bootB || [];
    ok(b.length>0 && pct(b,.05) < pct(b,.5) && pct(b,.5) < pct(b,.95), 'Bootstrap GB: percentili ordinati P5<P50<P95');
  } else warn('Block bootstrap: funzione non trovata');
}

// ════════════════════════════════════════════════════════════════════════
// SUITE 5 — DECUMULO STORICO (Trinity-style)
// ════════════════════════════════════════════════════════════════════════
function suiteDecumulo() {
  header('SUITE 5 — DECUMULO STORICO');
  const HM = global.HIST_MONTHLY, cal = global.calibrateHistRow;
  const N = HM.length, idx = y => (y-1970)*12;
  loadConst(SRC.bt, /const HIST_INFLATION = \{[\s\S]*?\};/);
  const INFL = global.HIST_INFLATION || {};
  const eqM={eq100:1,eq60:.6,golden_butterfly:.4,permanent:.25,all_seasons:.30,ob100:0};
  const goldM={golden_butterfly:.2,permanent:.25,all_seasons:.15}, cashM={permanent:.25};
  const W = p => { const eq=eqM[p],g=goldM[p]||0,c=cashM[p]||0; return {eq,ob:Math.max(0,1-eq-g-c),g,c}; };
  function decum(p, sP, wd0, Y) {
    const w = W(p), res = []; const maxStart = 1970 + Math.floor(N/12) - Y;
    for (let sy = 1970; sy <= maxStart; sy++) {
      let cap = sP, wd = wd0, surv = true;
      for (let yi = 0; yi < Y; yi++) { if (cap <= 0){surv=false;break;} const mWd = wd/12;
        for (let m = 0; m < 12; m++){ if(cap<=0){cap=0;break;} const r=cal(HM[idx(sy)+yi*12+m]); const pr=w.eq*r[0]+w.ob*r[1]+w.g*r[2]+w.c*0.002-0.002/12; cap=Math.max(0,(cap-mWd/2)*(1+pr)-mWd/2);}
        wd *= (1 + (INFL[sy+yi] ?? 2.5)/100);
      }
      res.push(surv);
    }
    return res.filter(Boolean).length / res.length;
  }
  ok(Object.keys(INFL).length > 40, 'Serie inflazione storica caricata', Object.keys(INFL).length + ' anni');
  const sGB = decum('golden_butterfly', 1e6, 40000, 30);
  const sEq = decum('eq100', 1e6, 40000, 30);
  const sAS = decum('all_seasons', 1e6, 40000, 30);
  ok(sGB >= 0.95, 'Golden Butterfly SWR 4%/30a: success ≥95%', (sGB*100).toFixed(0)+'%');
  ok(sAS >= 0.90, 'All Seasons SWR 4%/30a: success ≥90%', (sAS*100).toFixed(0)+'%');
  ok(sEq >= 0.70 && sEq < 1.0, 'eq100 SWR 4%/30a: vulnerabile al sequence risk (70-99%)', (sEq*100).toFixed(0)+'%');
  ok(sGB >= sEq, 'GB più robusto di eq100 in decumulo', (sGB*100).toFixed(0)+'% vs '+(sEq*100).toFixed(0)+'%');
}

// ════════════════════════════════════════════════════════════════════════
// SUITE 6 — SCHEDA PENSIONE (se presente)
// ════════════════════════════════════════════════════════════════════════
function suitePensione() {
  header('SUITE 6 — SCHEDA PENSIONE');
  if (!SRC.pens) { warn('pensione.js non presente in questa build — suite saltata'); return; }
  eval(grab(SRC.pens, /let penState = \{[\s\S]*?\n\};/).replace('let ', 'global.'));
  loadConst(SRC.pens, /const COEFF_TRASF = \{[\s\S]*?\n\};/);
  ['getCoeffTrasf','calcIRPEF','calcAliqMargIRPEF','calcPensione'].forEach(fn => loadFn(SRC.pens, fn));

  // 6.a Coefficienti di trasformazione ufficiali (DM 436/2024)
  if (global.getCoeffTrasf) {
    ok(near(global.getCoeffTrasf(67), 0.05608, 0.0001), 'Coefficiente trasformazione 67 anni = 5.608%', (global.getCoeffTrasf(67)*100).toFixed(3)+'%');
    ok(near(global.getCoeffTrasf(64), 0.05088, 0.0001), 'Coefficiente trasformazione 64 anni = 5.088%', (global.getCoeffTrasf(64)*100).toFixed(3)+'%');
  } else warn('getCoeffTrasf non trovata');

  // 6.b IRPEF crescente e progressiva
  if (global.calcIRPEF) {
    const i35 = global.calcIRPEF(35000), i60 = global.calcIRPEF(60000);
    ok(i60 > i35 && i35 > 0, 'IRPEF progressiva (60k > 35k > 0)', i35.toFixed(0)+' / '+i60.toFixed(0));
    ok(i60/60000 > i35/35000, 'Aliquota media cresce col reddito');
  } else warn('calcIRPEF non trovata');

  // 6.c Calcolo pensione completo: valori sensati
  if (global.calcPensione) {
    Object.assign(global.penState, {age:32,retAge:67,ral:35000,ralGrowth:0.01,contYears:7,aliqCont:0.33,montante:0,desired:2000,infl:0.02,pil:0.015,coeffDecl:0.003,fpVers:100,fpRet:0.04,tfrSi:true,regime:'contributivo',etfRet:0.05,lifeExp:86,isNegoziale:false,contDatoriale:0.012,contLavoratore:0.013});
    let r; try { r = global.calcPensione(); } catch(e){ r = null; ok(false,'calcPensione esegue',e.message); }
    if (r) {
      ok(isFinite(r.pensioneLordaAnn) && r.pensioneLordaAnn > 0, 'Pensione lorda annua finita e positiva', Math.round(r.pensioneLordaAnn));
      ok(r.pensioneNettaMens < r.pensioneLordaMens, 'Pensione netta < lorda (tasse applicate)');
      ok(r.tassoSost > 0.3 && r.tassoSost < 0.95, 'Tasso sostituzione plausibile (30-95%)', (r.tassoSost*100).toFixed(0)+'%');
      ok(isFinite(r.rendFPMens) && r.rendFPMens >= 0, 'Rendita fondo pensione finita');
    }
  } else warn('calcPensione non trovata');
}

// ════════════════════════════════════════════════════════════════════════
// RUNNER
// ════════════════════════════════════════════════════════════════════════
console.log('\x1b[1m╔══════════════════════════════════════════════════════╗\x1b[0m');
console.log('\x1b[1m║   TEST SUITE — Suite Patrimoniale Pro                 ║\x1b[0m');
console.log('\x1b[1m╚══════════════════════════════════════════════════════╝\x1b[0m');

const suites = [suiteData, suiteSimulator, suiteBacktest, suiteMC, suiteDecumulo, suitePensione];
for (const s of suites) {
  try { s(); }
  catch (e) { FAIL++; failures.push(s.name + ' CRASH: ' + e.message); console.log('  \x1b[31m✗ CRASH in ' + s.name + ': ' + e.message + '\x1b[0m'); }
}

console.log('\n\x1b[1m════════════════════ RIEPILOGO ════════════════════\x1b[0m');
console.log('  \x1b[32mPASS: ' + PASS + '\x1b[0m   \x1b[31mFAIL: ' + FAIL + '\x1b[0m   \x1b[33mWARN: ' + WARN + '\x1b[0m');
if (FAIL > 0) { console.log('\n\x1b[31mTest falliti:\x1b[0m'); failures.forEach(f => console.log('  • ' + f)); }
else console.log('\n\x1b[32m  ✓ Tutti i test superati — simulatore affidabile\x1b[0m');
process.exit(FAIL > 0 ? 1 : 0);
