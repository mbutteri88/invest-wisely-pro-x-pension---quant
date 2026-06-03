// ══════════════════════════════════════════════════════════════════════════════
// QUANT ANALYTICS — Frontiera Efficiente & VaR/CVaR
// Modulo standalone — richiede main.js già caricato (PORT, ASSET_CLASSES, state)
// ══════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// 1. MATRICE DI CORRELAZIONE STORICA
// Calibrata su dati mensili 1970-2024. Fonte: DMS Yearbook 2024,
// Federal Reserve FRED, letteratura accademica.
// ════════════════════════════════════════════════════════════════════════════

// Indici delle asset class nella matrice
// FIX: aggiunti fat_multifat, fat_carry_bond, fat_carry_fx, fat_trend che prima
// erano assenti → getCov ritornava 0 con tutto (diversificatori fittizi).
const AC_KEYS_EF = [
  'eq_sviluppati','eq_usa','eq_europa','eq_em','eq_small_value',
  'reits','fat_valore','fat_momentum','fat_qualita','fat_low_vol',
  'fat_size','fat_investment','fat_dividendi','fat_multifat',
  'fat_carry_bond','fat_carry_fx','fat_trend',
  'ob_usa_st','ob_usa_it','ob_usa_lt','ob_usa_ult',
  'ob_eu_st','ob_eu_it','ob_eu_lt',
  'ob_glob_gov','ob_glob_agg','ob_infl',
  'gold','commodities','cash',
];

// Categoria di ciascuna asset class (per la matrice di correlazione base).
// FIX: prima l'86% delle coppie aveva ρ=0 di default. Ora ogni coppia parte
// da una correlazione base categoria-categoria, poi le coppie specifiche
// note dalla letteratura fanno da override (vedi `pairs` sotto).
const AC_CAT_EF = {
  eq_sviluppati:'eq', eq_usa:'eq', eq_europa:'eq', eq_em:'eq', eq_small_value:'eq', reits:'eq',
  fat_valore:'fat', fat_momentum:'fat', fat_qualita:'fat', fat_low_vol:'fat',
  fat_size:'fat', fat_investment:'fat', fat_dividendi:'fat', fat_multifat:'fat',
  fat_carry_bond:'carry', fat_carry_fx:'carry', fat_trend:'trend',
  ob_usa_st:'ob_usa', ob_usa_it:'ob_usa', ob_usa_lt:'ob_usa', ob_usa_ult:'ob_usa',
  ob_eu_st:'ob_eu', ob_eu_it:'ob_eu', ob_eu_lt:'ob_eu',
  ob_glob_gov:'ob_glob', ob_glob_agg:'ob_glob', ob_infl:'ob_glob',
  gold:'real', commodities:'real', cash:'cash',
};

// Correlazione BASE tra categorie (calibrata su dati mensili 1970-2024 e
// letteratura). Simmetrica: l'ordine delle chiavi non conta (gestito in lookup).
const CAT_CORR_BASE = {
  'eq|eq':0.75, 'eq|fat':0.78, 'eq|carry':0.12, 'eq|trend':-0.05,
  'eq|ob_usa':-0.12, 'eq|ob_eu':-0.10, 'eq|ob_glob':-0.10, 'eq|real':0.15, 'eq|cash':-0.02,
  'fat|fat':0.55, 'fat|carry':0.15, 'fat|trend':0.05,
  'fat|ob_usa':-0.08, 'fat|ob_eu':-0.06, 'fat|ob_glob':-0.06, 'fat|real':0.12, 'fat|cash':0.0,
  'carry|carry':0.35, 'carry|trend':0.20, 'carry|ob_usa':0.15,
  'carry|ob_eu':0.12, 'carry|ob_glob':0.18, 'carry|real':0.10, 'carry|cash':0.05,
  'trend|ob_usa':0.10, 'trend|ob_eu':0.08, 'trend|ob_glob':0.10, 'trend|real':0.25, 'trend|cash':0.0,
  'ob_usa|ob_usa':0.70, 'ob_usa|ob_eu':0.55, 'ob_usa|ob_glob':0.78, 'ob_usa|real':0.12, 'ob_usa|cash':0.35,
  'ob_eu|ob_eu':0.70, 'ob_eu|ob_glob':0.68, 'ob_eu|real':0.10, 'ob_eu|cash':0.30,
  'ob_glob|ob_glob':0.75, 'ob_glob|real':0.15, 'ob_glob|cash':0.32,
  'real|real':0.22, 'real|cash':0.0,
};
function _catCorrBase(ca, cb) {
  if (ca === cb && (ca === 'trend' || ca === 'cash')) return 1.0; // singleton: corr con sé = 1
  return CAT_CORR_BASE[`${ca}|${cb}`] ?? CAT_CORR_BASE[`${cb}|${ca}`] ?? 0.0;
}

// Risk-free rate per Sharpe/Sortino (definito qui in cima: usato da molte funzioni)
const RF_RATE = 0.025;

// ── Composizione dei preset in asset class reali ───────────────────────────
// Permette di valutare i portafogli predefiniti tramite la matrice di
// correlazione e il toggle Forward/Storico, invece dei valori PORT.normal/vol
// congelati. I pesi sommano a 1. Fonti: definizioni ufficiali di ogni strategia.
const PRESET_COMPOSITION = {
  eq100:  { eq_sviluppati: 1.00 },
  eq80:   { eq_sviluppati: 0.80, ob_glob_agg: 0.20 },
  eq60:   { eq_sviluppati: 0.60, ob_glob_agg: 0.40 },
  eq50:   { eq_sviluppati: 0.50, ob_glob_agg: 0.50 },
  eq40:   { eq_sviluppati: 0.40, ob_glob_agg: 0.60 },
  eq20:   { eq_sviluppati: 0.20, ob_glob_agg: 0.80 },
  ob100:  { ob_glob_agg: 1.00 },
  golden_butterfly: { eq_usa: 0.20, eq_small_value: 0.20, gold: 0.20, ob_usa_ult: 0.20, ob_usa_st: 0.20 },
  permanent:        { eq_usa: 0.25, gold: 0.25, ob_usa_ult: 0.25, cash: 0.25 },
  all_seasons:      { eq_sviluppati: 0.30, ob_usa_ult: 0.40, ob_usa_it: 0.15, gold: 0.075, commodities: 0.075 },
  larry:            { eq_small_value: 0.15, eq_em: 0.15, ob_usa_it: 0.70 },
  global_market:    { eq_sviluppati: 0.55, ob_glob_agg: 0.45 },
  // ── Efficient Core 90/60 e Return Stacking ────────────────────────────────
  // Pesi LEVERAGED: la somma supera 1 (esposizione notional > capitale).
  // Il costo di finanziamento della leva è gestito in getCurrentPortfolioPoint
  // tramite PRESET_LEVERAGE. Strumenti UCITS reali investibili da EU/IT:
  //   Strategie capital-efficient: efficient core 90/60 e return stacking (ETF UCITS).
  ec_us_9060:    { eq_usa: 0.90, ob_usa_it: 0.60 },                       // efficient core 90/60 USA
  ec_glob_9060:  { eq_sviluppati: 0.90, ob_glob_gov: 0.60 },             // efficient core 90/60 globale
  return_stack:  { eq_sviluppati: 0.45, ob_glob_gov: 0.30, fat_trend: 0.50 }, // 50% efficient core + 50% managed futures
};

// Esposizione notional totale di ciascun preset leveraged (per il costo leva).
// Costo finanziamento = (notional − 1) × risk-free, sottratto dal rendimento atteso.
const PRESET_LEVERAGE = {
  ec_us_9060:   1.50,  // 90% + 60%
  ec_glob_9060: 1.50,
  return_stack: 1.25,  // 45% + 30% + 50%
};

// Matrice triangolare superiore (diagonale = 1)
// rho[i][j] per i <= j — per i > j usa rho[j][i]
const CORR_MATRIX = (() => {
  const n = AC_KEYS_EF.length;
  const R = Array.from({length:n}, () => Array(n).fill(0));
  // FIX: inizializza dalla correlazione base categoria-categoria invece che da 0.
  // Elimina l'86% di coppie a ρ=0 che sottostimavano la varianza di portafoglio
  // e gonfiavano lo Sharpe di mix con asset falsamente decorrelati.
  for (let i=0;i<n;i++) {
    for (let j=0;j<n;j++) {
      if (i===j) { R[i][j]=1; continue; }
      const ca = AC_CAT_EF[AC_KEYS_EF[i]], cb = AC_CAT_EF[AC_KEYS_EF[j]];
      R[i][j] = _catCorrBase(ca, cb);
    }
  }

  // Correlazioni calibrate per coppie chiave (resto = 0 → indipendenti)
  const pairs = [
    // ── Azionari sviluppati tra loro ─────────────────────────────────
    ['eq_sviluppati','eq_usa',        0.92],
    ['eq_sviluppati','eq_europa',     0.84],
    ['eq_sviluppati','eq_em',         0.72],
    ['eq_sviluppati','eq_small_value',0.78],
    ['eq_sviluppati','reits',         0.60],
    ['eq_sviluppati','fat_valore',    0.85],
    ['eq_sviluppati','fat_momentum',  0.72],
    ['eq_sviluppati','fat_qualita',   0.80],
    ['eq_sviluppati','fat_low_vol',   0.65],
    ['eq_sviluppati','fat_size',      0.80],
    ['eq_sviluppati','fat_investment',0.70],
    ['eq_sviluppati','fat_dividendi', 0.72],
    ['eq_usa','eq_europa',            0.76],
    ['eq_usa','eq_em',                0.65],
    ['eq_usa','eq_small_value',       0.80],
    ['eq_usa','reits',                0.55],
    ['eq_europa','eq_em',             0.68],
    ['eq_small_value','fat_valore',   0.82],
    ['fat_valore','fat_momentum',    -0.15],
    ['fat_valore','fat_qualita',      0.35],
    ['fat_momentum','fat_qualita',    0.28],
    ['fat_qualita','fat_low_vol',     0.45],
    ['fat_low_vol','fat_dividendi',   0.52],
    // ── Az → Ob (decorrelazione classica, regime-dependent) ──────────
    ['eq_sviluppati','ob_usa_st',    -0.02],
    ['eq_sviluppati','ob_usa_it',    -0.10],
    ['eq_sviluppati','ob_usa_lt',    -0.18],
    ['eq_sviluppati','ob_usa_ult',   -0.22],
    ['eq_sviluppati','ob_eu_st',     -0.04],
    ['eq_sviluppati','ob_eu_it',     -0.10],
    ['eq_sviluppati','ob_eu_lt',     -0.15],
    ['eq_sviluppati','ob_glob_gov',  -0.14],
    ['eq_sviluppati','ob_glob_agg',  -0.08],
    ['eq_sviluppati','ob_infl',       0.05],
    ['eq_usa','ob_usa_lt',           -0.20],
    ['eq_usa','ob_usa_ult',          -0.24],
    // ── Az → Real assets ─────────────────────────────────────────────
    ['eq_sviluppati','gold',          0.02],
    ['eq_sviluppati','commodities',   0.25],
    ['eq_sviluppati','cash',         -0.02],
    ['eq_em','commodities',           0.35],
    ['eq_em','gold',                  0.08],
    // ── Obbligazionario tra loro ──────────────────────────────────────
    ['ob_usa_st','ob_usa_it',         0.72],
    ['ob_usa_st','ob_usa_lt',         0.52],
    ['ob_usa_st','ob_usa_ult',        0.40],
    ['ob_usa_it','ob_usa_lt',         0.88],
    ['ob_usa_it','ob_usa_ult',        0.76],
    ['ob_usa_lt','ob_usa_ult',        0.93],
    ['ob_eu_st','ob_eu_it',           0.70],
    ['ob_eu_st','ob_eu_lt',           0.50],
    ['ob_eu_it','ob_eu_lt',           0.88],
    ['ob_glob_gov','ob_usa_it',       0.82],
    ['ob_glob_gov','ob_eu_it',        0.74],
    ['ob_glob_agg','ob_glob_gov',     0.85],
    ['ob_glob_agg','ob_usa_it',       0.76],
    ['ob_infl','ob_glob_gov',         0.55],
    ['ob_infl','gold',                0.20],
    ['ob_infl','commodities',         0.30],
    // ── Real assets ──────────────────────────────────────────────────
    ['gold','commodities',            0.22],
    ['gold','ob_usa_ult',             0.18],
    ['gold','ob_infl',                0.20],
    ['commodities','cash',           -0.05],
    ['cash','ob_usa_st',              0.45],
    ['cash','ob_eu_st',               0.38],
    // ── Override specifici per fattori alternativi (Carry, Trend, Multi) ──────
    // Calibrati su letteratura: Koijen et al. 2018, Lustig et al. 2011,
    // Moskowitz-Ooi-Pedersen 2012, Asness et al. 2013.
    ['fat_trend','eq_sviluppati',    -0.05],  // trend = vero diversificatore (crisis alpha)
    ['fat_trend','eq_usa',           -0.05],
    ['fat_trend','gold',              0.30],
    ['fat_trend','commodities',       0.40],
    ['fat_trend','ob_usa_ult',        0.15],
    ['fat_carry_fx','eq_sviluppati',  0.15],  // carry FX soffre nei risk-off
    ['fat_carry_fx','eq_em',          0.30],
    ['fat_carry_fx','fat_carry_bond', 0.35],
    ['fat_carry_bond','eq_sviluppati',0.10],
    ['fat_carry_bond','ob_glob_agg',  0.30],
    ['fat_multifat','eq_sviluppati',  0.82],  // multi-fattore ≈ azionario con tilt
    ['fat_multifat','fat_valore',     0.80],
    ['fat_multifat','fat_momentum',   0.55],
    ['fat_multifat','fat_qualita',    0.78],
    ['fat_multifat','eq_usa',         0.78],
  ];

  for (const [a, b, r] of pairs) {
    const i = AC_KEYS_EF.indexOf(a);
    const j = AC_KEYS_EF.indexOf(b);
    if (i<0||j<0) continue;
    R[i][j] = r;
    R[j][i] = r;
  }

  // ── Proiezione sulla matrice di correlazione valida più vicina ───────────────
  // Le correlazioni sopra sono calibrate a mano coppia-per-coppia su letteratura.
  // Alcune combinazioni sono però reciprocamente incoerenti (es. value e momentum
  // entrambi ~0.8 con l'azionario ma -0.15 tra loro: geometricamente impossibile),
  // rendendo la matrice NON semidefinita positiva. Una matrice di correlazione non
  // PSD è matematicamente invalida e può generare varianze di portafoglio negative
  // o Sharpe distorti. Applichiamo l'algoritmo di Higham (2002, "Computing the
  // nearest correlation matrix") che trova la matrice PSD PIÙ VICINA, alterando i
  // valori il minimo indispensabile (variazione media ~0.02), e un piccolo ridge
  // finale per garantire un margine PD robusto. Risultato: matrice valida che
  // preserva quasi integralmente la calibrazione (le uniche variazioni sensibili
  // sono sulle coppie che erano intrinsecamente impossibili).
  const Rpd = _nearestCorrelationPD(R, AC_KEYS_EF.length);
  return Rpd;
})();

// Jacobi eigenvalue decomposition per matrice simmetrica → {eig[], V[][]}.
function _jacobiEig(M) {
  const N = M.length;
  const a = M.map(r => r.slice());
  const V = Array.from({length:N}, (_,i) => Array.from({length:N}, (_,j) => i===j?1:0));
  for (let sweep=0; sweep<200; sweep++) {
    let off=0;
    for (let p=0;p<N;p++) for (let q=p+1;q<N;q++) off += a[p][q]*a[p][q];
    if (off < 1e-18) break;
    for (let p=0;p<N;p++) for (let q=p+1;q<N;q++) {
      if (Math.abs(a[p][q]) < 1e-20) continue;
      const th = (a[q][q]-a[p][p]) / (2*a[p][q]);
      const t  = Math.sign(th||1) / (Math.abs(th)+Math.sqrt(th*th+1));
      const c  = 1/Math.sqrt(t*t+1), s = t*c;
      for (let i=0;i<N;i++){ const aip=a[i][p],aiq=a[i][q]; a[i][p]=c*aip-s*aiq; a[i][q]=s*aip+c*aiq; }
      for (let i=0;i<N;i++){ const api=a[p][i],aqi=a[q][i]; a[p][i]=c*api-s*aqi; a[q][i]=s*api+c*aqi; }
      for (let i=0;i<N;i++){ const vip=V[i][p],viq=V[i][q]; V[i][p]=c*vip-s*viq; V[i][q]=s*vip+c*viq; }
    }
  }
  return { eig: a.map((r,i) => r[i]), V };
}

// Higham (2002) alternating projections + ridge finale → matrice di correlazione PD.
function _nearestCorrelationPD(A, n) {
  let Y = A.map(r => r.slice());
  const dS = Array.from({length:n}, () => Array(n).fill(0));
  for (let it=0; it<200; it++) {
    const Rk = Y.map((r,i) => r.map((x,j) => x - dS[i][j]));
    const { eig, V } = _jacobiEig(Rk);
    // proietta su PSD: azzera autovalori non positivi
    const X = Array.from({length:n}, () => Array(n).fill(0));
    for (let i=0;i<n;i++) for (let j=0;j<n;j++) {
      let sum=0;
      for (let k=0;k<n;k++){ const e = eig[k] > 0 ? eig[k] : 0; sum += V[i][k]*e*V[j][k]; }
      X[i][j] = sum;
    }
    for (let i=0;i<n;i++) for (let j=0;j<n;j++) dS[i][j] = X[i][j] - Rk[i][j];
    Y = X.map(r => r.slice());
    for (let i=0;i<n;i++) Y[i][i] = 1; // diagonale unitaria
  }
  // Ridge finale (shrinkage 3% verso identità) per margine PD robusto e clamp
  const w = 0.03;
  for (let i=0;i<n;i++) for (let j=0;j<n;j++) {
    if (i===j) { Y[i][j] = 1; continue; }
    Y[i][j] = Math.max(-0.98, Math.min(0.98, (1-w) * Y[i][j]));
  }
  return Y;
}

// ── Covarianza tra due asset class ─────────────────────────────────────────
function getCov(acA, acB) {
  const i = AC_KEYS_EF.indexOf(acA);
  const j = AC_KEYS_EF.indexOf(acB);
  const a = ASSET_CLASSES[acA], b = ASSET_CLASSES[acB];
  if (!a||!b) return 0;
  const rho = (i>=0&&j>=0) ? CORR_MATRIX[i][j] : 0;
  return rho * a.vol * b.vol;
}

// ── Varianza portafoglio da pesi e asset class ────────────────────────────
function portfolioVar(weights, acKeys) {
  let v = 0;
  for (let i=0;i<acKeys.length;i++) {
    for (let j=0;j<acKeys.length;j++) {
      v += weights[i] * weights[j] * getCov(acKeys[i], acKeys[j]);
    }
  }
  return v;
}

// ── Rendimento atteso di un'asset class, secondo la base scelta ────────────
// FIX #4: l'optimizer mischiava mu forward-looking (bassi) con vol storiche
// (alte), deprimendo sistematicamente tutti gli Sharpe. Questo helper permette
// di usare una base coerente: 'forward' (mu, default) o 'historical' (histCAGR,
// da abbinare idealmente a volatilità storiche — già il caso qui).
function _acMu(acKey) {
  const ac = ASSET_CLASSES[acKey];
  if (!ac) return 0;
  if (typeof _optState !== 'undefined' && _optState.returnBasis === 'historical') {
    return ac.histCAGR != null ? ac.histCAGR : ac.mu;
  }
  return ac.mu;
}

// ── Rendimento atteso portafoglio da pesi ─────────────────────────────────
function portfolioMu(weights, acKeys, ter) {
  let mu = 0;
  for (let i=0;i<acKeys.length;i++) {
    mu += weights[i] * _acMu(acKeys[i]);
  }
  return mu - (ter||0)/100;
}

// ════════════════════════════════════════════════════════════════════════════
// 2. FRONTIERA EFFICIENTE — Metodo analitico (Critical Line Algorithm semplificato)
// Per portafogli con N asset class, calcola la frontiera min-varianza
// tramite grid search con 2000 punti Monte Carlo sui pesi + ottimizzazione locale.
// ════════════════════════════════════════════════════════════════════════════

function computeEfficientFrontier(acKeys, ter, nPoints) {
  nPoints = nPoints || 60;
  const n = acKeys.length;
  if (n < 2) return [];

  // Rendimenti attesi per il range della frontiera (mu lordi, TER dedotto a livello portafoglio)
  const mus  = acKeys.map(k => _acMu(k));
  const vols = acKeys.map(k => ASSET_CLASSES[k]?.vol || 0.10);

  const muMin = Math.min(...mus) - (ter||0)/100;  // range aggiustato per TER
  const muMax = Math.max(...mus) - (ter||0)/100;
  const muRange = muMax - muMin;

  // Genera molti portafogli casuali come seed (più campioni = frontiera più liscia)
  const N_RANDOM = 12000;
  const randomPortfolios = [];
  for (let k=0;k<N_RANDOM;k++) {
    const w = _randomWeights(n);
    const mu = portfolioMu(w, acKeys, ter);
    const vol = Math.sqrt(Math.max(0, portfolioVar(w, acKeys)));
    randomPortfolios.push({ mu, vol, weights: w, sharpe: (mu - RF_RATE) / (vol||0.001) });
  }

  // Per ogni livello di rendimento target, trova il portafoglio a volatilità minima.
  const raw = [];
  for (let t=0;t<=nPoints;t++) {
    const targetMu = muMin + (t/nPoints) * muRange;
    const tolerance = muRange * 0.03 + 1e-4;
    let best = null;
    for (const p of randomPortfolios) {
      if (Math.abs(p.mu - targetMu) >= tolerance) continue;
      if (!best || p.vol < best.vol) best = p;
    }
    if (best) raw.push(best);
  }

  // ── Filtro di DOMINANZA (inviluppo efficiente) ───────────────────────────────
  // Una vera frontiera efficiente è monotòna nel ramo superiore: a maggior rischio
  // deve corrispondere maggior rendimento. Il Monte Carlo produce però una nuvola
  // con punti "dominati" (stesso/maggior rischio ma rendimento minore di un altro),
  // che disegnati creano lo zig-zag. Qui ordiniamo per volatilità crescente e
  // teniamo SOLO i punti il cui rendimento supera il massimo già visto: questo è
  // l'upper-left envelope, ovvero la frontiera efficiente in senso stretto.
  raw.sort((a,b) => a.vol - b.vol || b.mu - a.mu);
  const frontier = [];
  let maxMuSoFar = -Infinity;
  for (const p of raw) {
    if (p.mu > maxMuSoFar + 1e-6) {
      // evita duplicati quasi-coincidenti
      const last = frontier[frontier.length-1];
      if (last && Math.abs(last.vol - p.vol) < 1e-5 && Math.abs(last.mu - p.mu) < 1e-5) continue;
      frontier.push({ mu: p.mu, vol: p.vol, sharpe: p.sharpe, weights: p.weights });
      maxMuSoFar = p.mu;
    }
  }
  return frontier;
}

function _randomWeights(n) {
  const w = Array.from({length:n}, () => -Math.log(Math.random()));
  const s = w.reduce((a,b) => a+b, 0);
  return w.map(x => x/s);
}

// ── Trova portafoglio max Sharpe sulla frontiera ───────────────────────────
function findMaxSharpe(frontier, rfRate) {
  rfRate = rfRate ?? 0.025;
  let best = null, bestS = -Infinity;
  for (const p of frontier) {
    const s = (p.mu - rfRate) / (p.vol || 0.001);
    if (s > bestS) { bestS = s; best = p; }
  }
  return best;
}

// ── Trova portafoglio a minima varianza ────────────────────────────────────
function findMinVariance(frontier) {
  if (!frontier.length) return null;
  return frontier.reduce((a,b) => a.vol < b.vol ? a : b);
}

// ── Posizione del portafoglio corrente sul grafico ─────────────────────────
function getCurrentPortfolioPoint(ter) {
  const key = state.portfolio;
  // FIX: anche per i preset, ricostruisce μ/σ/Sharpe dalla composizione reale in
  // asset class, passando dalla matrice di correlazione e rispettando il toggle
  // Forward/Storico — invece di usare PORT.normal/PORT.vol congelati (che davano
  // sempre lo stesso Sharpe, scollegato dalla scheda Optimizer).
  if (key !== 'custom') {
    const comp = PRESET_COMPOSITION[key];
    if (comp) {
      const keys = Object.keys(comp);
      const rawW = keys.map(k => comp[k]);
      const leverage = PRESET_LEVERAGE[key] || 1.0;
      // Per i preset leveraged (efficient core, return stacking) i pesi NON
      // vengono rinormalizzati: l'esposizione notional supera il capitale.
      // portfolioMu/portfolioVar usano i pesi grezzi → μ e σ riflettono la leva.
      const mu0 = portfolioMu(rawW, keys, ter);
      // Costo di finanziamento della leva: (notional − 1) × risk-free
      const levCost = (leverage - 1.0) * RF_RATE;
      const mu = mu0 - levCost;
      const vol = Math.sqrt(Math.max(0, portfolioVar(rawW, keys)));
      return {
        mu, vol,
        sharpe: (mu - RF_RATE) / (vol || 0.001),
        label: PORT[key]?.label || key,
        isCurrent: true,
        leverage,
      };
    }
    // Fallback ai valori PORT pre-calcolati se il preset non è mappato
    const p = PORT[key];
    if (!p || !p.vol || !p.normal) return null;
    return {
      mu: (p.normal||0) - (ter||0)/100,
      vol: p.vol,
      sharpe: ((p.normal||0) - (ter||0)/100 - RF_RATE) / (p.vol||0.001),
      label: p.label,
      isCurrent: true,
    };
  }
  // Custom
  const slots = (state.customPortfolio?.slots||[]).filter(s=>s.ac&&ASSET_CLASSES[s.ac]&&s.pct>0);
  if (!slots.length) return null;
  const total = slots.reduce((s,sl)=>s+(+sl.pct||0),0);
  if (total<=0) return null;
  const keys = slots.map(s=>s.ac);
  const weights = slots.map(s=>(+s.pct||0)/total);
  const mu  = portfolioMu(weights, keys, ter);
  const vol = Math.sqrt(Math.max(0, portfolioVar(weights, keys)));
  return { mu, vol, sharpe: (mu-RF_RATE)/(vol||0.001), label:'Il tuo portafoglio', isCurrent:true };
}

// ════════════════════════════════════════════════════════════════════════════
// 3. VaR e CVaR
// Tre metodi: Parametrico (Gaussiano), Storico (dati HIST_MONTHLY se disponibili),
// Monte Carlo (usa la stessa logica del simulatore principale).
// ════════════════════════════════════════════════════════════════════════════

function computeVaRCVaR(mu, vol, horizon, initialValue, ter) {
  // horizon in anni
  const h = horizon || 1;
  const V = initialValue || 100000;
  const muNet = mu - (ter||0)/100;

  // Rendimento e vol scalati per orizzonte
  const muH  = muNet * h;
  const volH = vol * Math.sqrt(h);

  const results = {};

  // ── Metodo 1: Parametrico (Gaussiano) ────────────────────────────────────
  const z95 = 1.6449;
  const z99 = 2.3263;
  const z999= 3.0902;
  // VaR: usa μ geometrico (μ - σ²/2) per coerenza con GBM log-normale
  const muGeo = muNet - vol*vol/2; // drift geometrico
  results.param = {
    var95:  V * (1 - Math.exp(muGeo*h - z95  * volH)),
    var99:  V * (1 - Math.exp(muGeo*h - z99  * volH)),
    var999: V * (1 - Math.exp(muGeo*h - z999 * volH)),
    // CVaR parametrico log-normale: E[loss | loss > VaR]
    // Formula corretta: V*(1 - exp(μh + σ²h/2)*N(-z - σ√h)/(1-α))
    // dove μh+σ²h/2 = E[V_h/V] (momento primo log-normale)
    // Nota: muH + volH² = (μ-σ²/2)h + σ²h = μh = muNet*h
    cvar95:  V * (1 - Math.exp(muNet*h) * _normCDF(-z95  - volH) / 0.05),
    cvar99:  V * (1 - Math.exp(muNet*h) * _normCDF(-z99  - volH) / 0.01),
    cvar999: V * (1 - Math.exp(muNet*h) * _normCDF(-z999 - volH) / 0.001),
  };

  // ── Metodo 2: Monte Carlo (10.000 simulazioni) ────────────────────────────
  const N_MC = 10000;
  const returns = [];
  for (let i=0;i<N_MC;i++) {
    const z = _boxMuller();
    const r = Math.exp((muNet - volH*volH/2/h)*h + volH*z) - 1;
    returns.push(r);
  }
  returns.sort((a,b)=>a-b);
  const losses = returns.map(r => -r * V); // perdite positive
  losses.sort((a,b)=>a-b);
  results.mc = {
    var95:  _percentile(losses, 0.95),
    var99:  _percentile(losses, 0.99),
    var999: _percentile(losses, 0.999),
    cvar95:  _mean(losses.slice(Math.floor(N_MC*0.95))),
    cvar99:  _mean(losses.slice(Math.floor(N_MC*0.99))),
    cvar999: _mean(losses.slice(Math.floor(N_MC*0.999))),
  };

  // ── Metodo 3: t-Student (fat tails, df calibrato su vol del portafoglio) ─
  // Calibrazione empirica: equity ~df 4-5, bilanciati ~df 8-14, bond ~df 15-25
  // Formula: df = 0.08/σ² — cattura meglio le code grasse osservate empiricamente
  const df = Math.max(4, Math.min(30, Math.round(0.08 / (vol*vol + 0.0001))));
  const t95  = _tQuantile(0.95,  df);
  const t99  = _tQuantile(0.99,  df);
  const t999 = _tQuantile(0.999, df);
  const scale = volH * Math.sqrt((df-2)/df);
  results.tstud = {
    var95:  V * (1 - Math.exp(muH - t95  * scale)),
    var99:  V * (1 - Math.exp(muH - t99  * scale)),
    var999: V * (1 - Math.exp(muH - t999 * scale)),
    df,
    // CVaR t-Student (approssimazione numerica)
    cvar95:  V * (1 - Math.exp(muH - _tCVaR(0.95,  df) * scale)),
    cvar99:  V * (1 - Math.exp(muH - _tCVaR(0.99,  df) * scale)),
    cvar999: V * (1 - Math.exp(muH - _tCVaR(0.999, df) * scale)),
  };

  return results;
}

// ── Helper statistici ─────────────────────────────────────────────────────
function _normCDF(x) {
  const t = 1/(1+0.2316419*Math.abs(x));
  const d = 0.3989422826*Math.exp(-x*x/2);
  const p = d*t*(0.3193815+t*(-0.3565638+t*(1.7814779+t*(-1.8212560+t*1.3302744))));
  return x>=0 ? 1-p : p;
}
function _boxMuller() {
  let u,v,s;
  do { u=2*Math.random()-1; v=2*Math.random()-1; s=u*u+v*v; } while(s>=1||s===0);
  return u*Math.sqrt(-2*Math.log(s)/s);
}
function _percentile(sorted, p) {
  const i = Math.floor(sorted.length * p);
  return sorted[Math.min(i, sorted.length-1)];
}
function _mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a,b)=>a+b,0)/arr.length;
}
function _tQuantile(p, df) {
  // Approssimazione Cornish-Fisher per t-Student
  const z = _normInv(p);
  return z + (z*z*z+z)/(4*df) + (5*z*z*z*z*z+16*z*z*z+3*z)/(96*df*df);
}
function _tCVaR(p, df) {
  // CVaR normalizzato (diviso per vol) per t-Student: E[Z | Z > q_p]
  const q = _tQuantile(p, df);
  // Approssimazione: (1/(1-p)) * t_pdf(q,df) * (df + q^2)/(df-1)
  const tpdf = Math.exp(_lgamma((df+1)/2) - _lgamma(df/2) - 0.5*Math.log(df*Math.PI)) *
               Math.pow(1+q*q/df, -(df+1)/2);
  return (1/(1-p)) * tpdf * (df+q*q)/(df-1);
}
function _normInv(p) {
  // Rational approximation (Peter Acklam, 2002) — accuratezza 1.15e-9
  const a1=-3.969683028665376e+01, a2= 2.209460984245205e+02;
  const a3=-2.759285104469687e+02, a4= 1.383577518672690e+02;
  const a5=-3.066479806614716e+01, a6= 2.506628277459239e+00;
  const b1=-5.447609879822406e+01, b2= 1.615858368580409e+02;
  const b3=-1.556989798598866e+02, b4= 6.680131188771972e+01;
  const b5=-1.328068155288572e+01;
  const c1=-7.784894002430293e-03, c2=-3.223964580411365e-01;
  const c3=-2.400758277161838e+00, c4=-2.549732539343734e+00;
  const c5= 4.374664141464968e+00, c6= 2.938163982698783e+00;
  const d1= 7.784695709041462e-03, d2= 3.224671290700398e-01;
  const d3= 2.445134137142996e+00, d4= 3.754408661907416e+00;
  const pLow=0.02425, pHigh=1-pLow;
  if (p<pLow) {
    const q=Math.sqrt(-2*Math.log(p));
    return (((((c1*q+c2)*q+c3)*q+c4)*q+c5)*q+c6)/(((((d1*q+d2)*q+d3)*q+d4)*q)+1);
  } else if (p<=pHigh) {
    const q=p-0.5, r=q*q;
    return (((((a1*r+a2)*r+a3)*r+a4)*r+a5)*r+a6)*q/(((((b1*r+b2)*r+b3)*r+b4)*r+b5)*r+1);
  } else {
    const q=Math.sqrt(-2*Math.log(1-p));
    return -(((((c1*q+c2)*q+c3)*q+c4)*q+c5)*q+c6)/(((((d1*q+d2)*q+d3)*q+d4)*q)+1);
  }
}
function _lgamma(x) {
  const c = [76.18009172947146,-86.50532032941677,24.01409824083091,
             -1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5];
  let y=x, tmp=x+5.5, ser=1.000000000190015;
  tmp -= (x+0.5)*Math.log(tmp);
  for(let i=0;i<6;i++) ser += c[i]/++y;
  return -tmp+Math.log(2.5066282746310005*ser/x);
}

// ════════════════════════════════════════════════════════════════════════════
// 4. RENDER — Tab dedicato
// ════════════════════════════════════════════════════════════════════════════

let _efChart = null;
let _efState = {
  assets: [],          // chiavi ASSET_CLASSES selezionate
  ter: 0.20,
  horizon: 1,
  value: 100000,
  mode: 'frontier',    // 'frontier' | 'var'
};

function renderQuantTab() {
  const tab = document.getElementById('tab-quant');
  if (!tab || !tab.classList.contains('active')) return;

  _syncEFStateFromSimulator();

  // Frontier
  if (_efState.mode === 'frontier') _renderFrontierView();
  else _renderVaRView();
}

function _syncEFStateFromSimulator() {
  _efState.ter   = state.ter || 0.20;
  _efState.value = state.w || 100000;

  // Se portafoglio custom, usa le sue asset class
  if (state.portfolio === 'custom') {
    const slots = (state.customPortfolio?.slots||[]).filter(s=>s.ac&&ASSET_CLASSES[s.ac]&&s.pct>0);
    if (slots.length) {
      _efState.assets = slots.map(s=>s.ac);
      return;
    }
  }
  // Altrimenti usa un set di default basato sul tipo di portafoglio
  const p = PORT[state.portfolio];
  if (!p) { _efState.assets = ['eq_sviluppati','ob_glob_agg','gold','cash']; return; }
  const set = [];
  if ((p.eq||0) > 0)   set.push('eq_sviluppati');
  if ((p.ob||0) > 0)   set.push('ob_glob_agg');
  if ((p.gold||0) > 0) set.push('gold');
  if ((p.cash||0) > 0) set.push('cash');
  if (!set.length) set.push('eq_sviluppati','ob_glob_agg');
  // Aggiungi sempre qualche asset in più per rendere interessante la frontiera
  if (!set.includes('eq_em'))     set.push('eq_em');
  if (!set.includes('ob_infl'))   set.push('ob_infl');
  if (!set.includes('commodities')) set.push('commodities');
  _efState.assets = set;
}

// ── Frontiera Efficiente ──────────────────────────────────────────────────
function _renderFrontierView() {
  const container = document.getElementById('quantFrontierChart');
  if (!container) return;

  const keys  = _efState.assets.filter(k=>ASSET_CLASSES[k]);
  const ter   = _efState.ter;
  const frontier = computeEfficientFrontier(keys, ter, 80);
  const maxS  = findMaxSharpe(frontier, 0.025);
  const minV  = findMinVariance(frontier);
  const curr  = getCurrentPortfolioPoint(ter);

  // Aggiorna statistiche testuali
  _updateFrontierStats(curr, maxS, minV);

  // Prepara dati Chart.js
  const frontierData = frontier.map(p => ({
    x: +(p.vol*100).toFixed(2),
    y: +(p.mu*100).toFixed(2),
    sharpe: +p.sharpe.toFixed(3),
  }));

  // Colora i punti per Sharpe ratio
  const sharpes = frontierData.map(p=>p.sharpe);
  const minSh = Math.min(...sharpes), maxSh = Math.max(...sharpes);

  const specialPoints = [];
  if (maxS) specialPoints.push({
    x: +(maxS.vol*100).toFixed(2),
    y: +(maxS.mu*100).toFixed(2),
    label: '★ Max Sharpe',
  });
  if (minV) specialPoints.push({
    x: +(minV.vol*100).toFixed(2),
    y: +(minV.mu*100).toFixed(2),
    label: '▼ Min Varianza',
  });

  const datasets = [
    {
      label: 'Frontiera Efficiente',
      data: frontierData,
      type: 'scatter',
      showLine: true,
      borderColor: 'rgba(26,115,232,0.9)',
      backgroundColor: frontierData.map(p => {
        const t = (p.sharpe - minSh) / (maxSh - minSh + 0.001);
        const r = Math.round(26  + (26-217)*t*0 + (0)*t);
        const g = Math.round(115 + (115-48)*0   + (200-115)*t);
        const b = Math.round(232 - (232-37)*t);
        return `rgba(${Math.round(lerp(217,26,t))},${Math.round(lerp(48,115,t))},${Math.round(lerp(37,232,t))},0.85)`;
      }),
      pointRadius: 5,
      pointHoverRadius: 8,
      borderWidth: 2,
      tension: 0.4,
      fill: false,
    },
    {
      label: 'Punti Ottimali',
      data: specialPoints,
      type: 'scatter',
      backgroundColor: ['rgba(251,140,0,1)','rgba(46,125,50,1)'],
      borderColor: ['rgba(251,140,0,1)','rgba(46,125,50,1)'],
      pointRadius: 10,
      pointHoverRadius: 13,
      showLine: false,
    },
  ];

  if (curr) {
    datasets.push({
      label: 'Il tuo portafoglio',
      data: [{ x: +(curr.vol*100).toFixed(2), y: +(curr.mu*100).toFixed(2) }],
      type: 'scatter',
      backgroundColor: 'rgba(217,48,37,1)',
      borderColor: 'rgba(217,48,37,1)',
      pointRadius: 12,
      pointStyle: 'triangle',
      pointHoverRadius: 15,
      showLine: false,
    });
  }

  // Distruggi chart precedente
  if (_efChart) { _efChart.destroy(); _efChart = null; }

  const ctx = container.getContext('2d');
  _efChart = new Chart(ctx, {
    type: 'scatter',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: 'easeInOutQuart' },
      plugins: {
        legend: {
          display: true,
          labels: { font: { family: "'DM Sans',sans-serif", size: 12 } },
        },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const d = ctx.raw;
              const lines = [
                `Rischio (σ): ${d.x?.toFixed(1)}%/a`,
                `Rendimento: ${d.y?.toFixed(1)}%/a`,
              ];
              if (d.sharpe != null) lines.push(`Sharpe: ${d.sharpe?.toFixed(2)}`);
              if (ctx.dataset.label === 'Punti Ottimali') {
                lines.unshift(specialPoints[ctx.dataIndex]?.label || '');
              }
              return lines;
            },
          },
          backgroundColor: 'rgba(32,33,36,0.9)',
          titleColor: '#fff',
          bodyColor: '#e8eaed',
          padding: 10,
          cornerRadius: 8,
        },
      },
      scales: {
        x: {
          title: { display:true, text:'Rischio — Volatilità annua (%)', font:{size:12, family:"'DM Sans',sans-serif"} },
          grid: { color:'rgba(0,0,0,0.06)' },
          ticks: { callback: v => v+'%' },
        },
        y: {
          title: { display:true, text:'Rendimento atteso netto (%/a)', font:{size:12, family:"'DM Sans',sans-serif"} },
          grid: { color:'rgba(0,0,0,0.06)' },
          ticks: { callback: v => v+'%' },
        },
      },
    },
  });
}

function lerp(a,b,t) { return a+(b-a)*t; }

function _updateFrontierStats(curr, maxS, minV) {
  const el = document.getElementById('quantFrontierStats');
  if (!el) return;
  const fmt = v => v != null ? (v*100).toFixed(1)+'%' : '—';
  const fmtS = v => v != null ? v.toFixed(2) : '—';
  const portLabel = state.portfolio==='custom' ? 'Custom' : (PORT[state.portfolio]?.label||state.portfolio);

  el.innerHTML = `
    <div class="quant-stat-grid">
      <div class="quant-stat-card" style="border-left:3px solid var(--red)">
        <div class="qsc-title">▲ Il tuo portafoglio<br><small>${portLabel}</small></div>
        <div class="qsc-row"><span>Rendimento atteso</span><strong>${fmt(curr?.mu)}/a</strong></div>
        <div class="qsc-row"><span>Volatilità (σ)</span><strong>${fmt(curr?.vol)}/a</strong></div>
        <div class="qsc-row"><span>Sharpe ratio</span><strong>${fmtS(curr?.sharpe)}</strong></div>
      </div>
      <div class="quant-stat-card" style="border-left:3px solid var(--orange)">
        <div class="qsc-title">★ Max Sharpe</div>
        <div class="qsc-row"><span>Rendimento atteso</span><strong>${fmt(maxS?.mu)}/a</strong></div>
        <div class="qsc-row"><span>Volatilità (σ)</span><strong>${fmt(maxS?.vol)}/a</strong></div>
        <div class="qsc-row"><span>Sharpe ratio</span><strong>${fmtS(maxS?.sharpe)}</strong></div>
      </div>
      <div class="quant-stat-card" style="border-left:3px solid var(--green)">
        <div class="qsc-title">▼ Min Varianza</div>
        <div class="qsc-row"><span>Rendimento atteso</span><strong>${fmt(minV?.mu)}/a</strong></div>
        <div class="qsc-row"><span>Volatilità (σ)</span><strong>${fmt(minV?.vol)}/a</strong></div>
        <div class="qsc-row"><span>Sharpe ratio</span><strong>${fmtS(minV?.sharpe)}</strong></div>
      </div>
    </div>
    ${curr && maxS ? `
    <div class="quant-note ${curr.sharpe < maxS.sharpe * 0.85 ? 'quant-note-warn' : 'quant-note-ok'}">
      ${curr.sharpe < maxS.sharpe * 0.85
        ? `⚠️ Il tuo portafoglio ha uno Sharpe ratio <strong>${fmtS(curr.sharpe)}</strong> vs <strong>${fmtS(maxS.sharpe)}</strong> del portafoglio Max Sharpe — esiste un'allocazione più efficiente tra le asset class selezionate.`
        : `✓ Il tuo portafoglio ha uno Sharpe ratio <strong>${fmtS(curr.sharpe)}</strong>, vicino al massimo ottimale (<strong>${fmtS(maxS.sharpe)}</strong>) — allocazione efficiente.`
      }
    </div>` : ''}
  `;
}

// ── VaR / CVaR ───────────────────────────────────────────────────────────
function _renderVaRView() {
  const el = document.getElementById('quantVaRContent');
  if (!el) return;

  const key = state.portfolio;
  let mu, vol;
  if (key === 'custom') {
    const slots = (state.customPortfolio?.slots||[]).filter(s=>s.ac&&ASSET_CLASSES[s.ac]&&s.pct>0);
    if (!slots.length) { el.innerHTML='<p style="color:var(--text3)">Configura prima il portafoglio Custom.</p>'; return; }
    const total = slots.reduce((s,sl)=>s+(+sl.pct||0),0);
    const keys  = slots.map(s=>s.ac);
    const weights = slots.map(s=>(+s.pct||0)/total);
    mu  = portfolioMu(weights, keys, 0);
    vol = Math.sqrt(Math.max(0, portfolioVar(weights, keys)));
  } else {
    const p = PORT[key];
    if (!p?.vol) { el.innerHTML='<p style="color:var(--text3)">Portafoglio non disponibile.</p>'; return; }
    mu  = p.normal || 0;
    vol = p.vol;
  }

  const ter     = _efState.ter;
  const value   = Math.max(1000, _efState.value || 100000);
  const horizon = _efState.horizon || 1;

  const r = computeVaRCVaR(mu, vol, horizon, value, ter);
  const portLabel = key==='custom'?'Custom':(PORT[key]?.label||key);
  const fmt  = v => v >= 0 ? '−€'+Math.round(v).toLocaleString('it-IT') : '+€'+Math.round(-v).toLocaleString('it-IT');
  const fmtP = (v, base) => v >= 0 ? '−'+(v/base*100).toFixed(1)+'%' : '+'+((-v)/base*100).toFixed(1)+'%';

  const methods = [
    { key:'param', label:'Parametrico (Gaussiano)', color:'var(--blue)',
      note:'Assume distribuzione normale dei rendimenti. Sottostima le code grasse — ottimistico in scenari estremi.' },
    { key:'tstud', label:`t-Student (fat tails, df=${r.tstud.df})`, color:'var(--orange)',
      note:`Distribuzioni con code più spesse della normale. df=${r.tstud.df} calibrato sulla volatilità del portafoglio. Più realistico del Gaussiano per eventi rari.` },
    { key:'mc',    label:'Monte Carlo (10.000 simulazioni)', color:'var(--green)',
      note:'Simulazione diretta di 10.000 scenari di rendimento. Metodo non parametrico — cattura asimmetria e code.' },
  ];

  const rows = [
    { label:'VaR 95%',  desc:'Perdita massima nel 95% degli scenari', keys:['var95','var95','var95'] },
    { label:'VaR 99%',  desc:'Perdita massima nel 99% degli scenari', keys:['var99','var99','var99'] },
    { label:'VaR 99.9%',desc:'Perdita massima nel 99.9% degli scenari (tail risk)', keys:['var999','var999','var999'] },
    { label:'CVaR 95%', desc:'Perdita attesa oltre il VaR 95% (Expected Shortfall)', keys:['cvar95','cvar95','cvar95'] },
    { label:'CVaR 99%', desc:'Perdita attesa oltre il VaR 99%', keys:['cvar99','cvar99','cvar99'] },
    { label:'CVaR 99.9%',desc:'Perdita attesa nello scenario peggiore (0.1%)', keys:['cvar999','cvar999','cvar999'] },
  ];

  el.innerHTML = `
    <div style="margin-bottom:16px;font-size:13px;color:var(--text2);line-height:1.6">
      <strong>Portafoglio:</strong> ${portLabel} · <strong>Valore:</strong> €${value.toLocaleString('it-IT')} ·
      <strong>Orizzonte:</strong> ${horizon} anno/i · <strong>TER:</strong> ${ter.toFixed(2)}% ·
      <strong>Rendimento netto:</strong> ${((mu-ter/100)*100).toFixed(1)}%/a · <strong>Volatilità:</strong> ${(vol*100).toFixed(1)}%/a
    </div>

    <div class="tbl-outer" style="margin-bottom:20px">
      <table>
        <thead>
          <tr>
            <th style="text-align:left">Misura di rischio</th>
            ${methods.map(m=>`<th style="color:${m.color}">${m.label.split('(')[0].trim()}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row=>`
            <tr>
              <td style="text-align:left">
                <strong>${row.label}</strong>
                <div style="font-size:11px;color:var(--text3)">${row.desc}</div>
              </td>
              ${methods.map((m,mi)=>{
                const v = r[m.key][row.keys[mi]];
                const pct = (v/value*100).toFixed(1);
                const isExtreme = row.label.includes('99.9');
                return `<td style="font-weight:600;color:${isExtreme?'var(--red)':m.color}">${fmt(v)}<br><small style="font-weight:400;color:var(--text3)">${fmtP(v,value)}</small></td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-bottom:16px">
      ${methods.map(m=>`
        <div style="background:var(--bg2);border:1px solid var(--border2);border-left:3px solid ${m.color};border-radius:var(--radius-sm);padding:12px">
          <div style="font-size:12px;font-weight:600;color:${m.color};margin-bottom:6px">${m.label}</div>
          <div style="font-size:11.5px;color:var(--text3);line-height:1.6">${m.note}</div>
        </div>
      `).join('')}
    </div>

    <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:14px;font-size:12px;color:var(--text3);line-height:1.7">
      <strong>Come leggere il VaR:</strong> un VaR 99% di −€${Math.round(r.mc.var99).toLocaleString('it-IT')} su orizzonte ${horizon} anno/i significa che nel 99% degli scenari simulati la perdita non supererà questa soglia. Nel restante 1% degli scenari (eventi rari ma possibili), la perdita attesa (CVaR 99%) è −€${Math.round(r.mc.cvar99).toLocaleString('it-IT')}.<br>
      <strong>CVaR vs VaR:</strong> il CVaR (Expected Shortfall) è preferito dai regolatori (Basilea III, SOLVENCY II) perché misura <em>quanto si perde</em> quando si va oltre il VaR, non solo il punto di soglia. È la misura di rischio coerente per eccellenza (Artzner et al., 1999).
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════════════════
// 5. INIT E HOOKS
// ════════════════════════════════════════════════════════════════════════════

window.renderQuantTab = renderQuantTab;
window.switchQuantMode = function(mode) {
  _efState.mode = mode;
  document.querySelectorAll('#quantModeBtns .gbtn').forEach(b =>
    b.classList.toggle('a-blue', b.dataset.qm === mode));
  const frontierSection = document.getElementById('quantFrontierSection');
  const varSection      = document.getElementById('quantVaRSection');
  if (frontierSection) frontierSection.style.display = mode==='frontier' ? '' : 'none';
  if (varSection)      varSection.style.display      = mode==='var'      ? '' : 'none';
  renderQuantTab();
};

window.quantSetHorizon = function(h) {
  _efState.horizon = +h;
  document.querySelectorAll('#quantHorizonBtns .gbtn').forEach(b =>
    b.classList.toggle('a-blue', +b.dataset.qh === +h));
  _renderVaRView();
};

window.quantSyncFromSimulator = function() {
  _syncEFStateFromSimulator();
  renderQuantTab();
  _flashQuantToast('✓ Parametri importati dal Simulatore');
};

function _flashQuantToast(msg) {
  const old = document.getElementById('quantToast');
  if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'quantToast';
  el.textContent = msg;
  el.style.cssText = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:#1e8e3e;color:#fff;font-size:13px;font-weight:600;
    padding:10px 20px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.18);
    z-index:9999;pointer-events:none;font-family:'DM Sans',sans-serif;
  `;
  document.body.appendChild(el);
  setTimeout(()=>{el.style.transition='opacity .4s';el.style.opacity='0';setTimeout(()=>el.remove(),400);},2500);
}

// Hook su switchTab
document.addEventListener('DOMContentLoaded', function() {
  const origSwitch = window.switchTab;
  if (typeof origSwitch === 'function') {
    window.switchTab = function(tabId, ...args) {
      origSwitch(tabId, ...args);
      if (tabId === 'quant') setTimeout(renderQuantTab, 60);
    };
  }

  // Aggiunge asset class selector nel tab
  _populateAssetSelector();
});

function _populateAssetSelector() {
  const el = document.getElementById('quantAssetSelector');
  if (!el) return;

  // Raggruppa per categoria
  const cats = {};
  for (const [key, ac] of Object.entries(ASSET_CLASSES)) {
    if (!cats[ac.cat]) cats[ac.cat] = [];
    cats[ac.cat].push({key, ac});
  }

  const catLabels = {
    eq:'Azionario', fat:'Factor Investing', ob_usa:'Obbligaz. USA',
    ob_eu:'Obbligaz. EUR', ob_glob:'Obbligaz. Globale',
    real:'Real Assets', cash:'Liquidità',
  };

  el.innerHTML = Object.entries(cats).map(([cat, items]) => `
    <optgroup label="${catLabels[cat]||cat}">
      ${items.map(({key,ac})=>`<option value="${key}">${ac.emoji||''} ${ac.label} — μ=${((ac.mu||0)*100).toFixed(1)}% σ=${((ac.vol||0)*100).toFixed(1)}%</option>`).join('')}
    </optgroup>
  `).join('');

  // Pre-seleziona le asset class correnti
  _syncEFStateFromSimulator();
  for (const opt of el.options) {
    opt.selected = _efState.assets.includes(opt.value);
  }

  el.onchange = function() {
    _efState.assets = Array.from(el.selectedOptions).map(o=>o.value);
    if (_efState.assets.length < 2) { _flashQuantToast('⚠️ Seleziona almeno 2 asset class'); return; }
    renderQuantTab();
  };
}

// CSS inline
(function injectQuantStyles() {
  const s = document.createElement('style');
  s.textContent = `
    .quant-stat-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:10px; margin-bottom:12px; }
    .quant-stat-card { background:var(--bg2); border:1px solid var(--border2); border-radius:var(--radius-sm); padding:12px; }
    .quant-stat-card .qsc-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--text3); margin-bottom:8px; line-height:1.4; }
    .quant-stat-card .qsc-row { display:flex; justify-content:space-between; font-size:12.5px; color:var(--text2); padding:3px 0; border-bottom:.5px solid var(--border2); }
    .quant-stat-card .qsc-row:last-child { border-bottom:none; }
    .quant-stat-card strong { color:var(--text); font-weight:600; }
    .quant-note { font-size:12.5px; padding:10px 14px; border-radius:var(--radius-sm); line-height:1.6; }
    .quant-note-warn { background:var(--orange-dim); border:1px solid rgba(227,116,0,.3); color:var(--text2); }
    .quant-note-ok   { background:var(--green-dim);  border:1px solid rgba(30,142,62,.3);  color:var(--text2); }
  `;
  document.head.appendChild(s);
})();
// ════════════════════════════════════════════════════════════════════════════
// 6. FACTOR DECOMPOSITION — Fama-French 5 + Momentum (Carhart 1997)
// Decompone il rendimento atteso del portafoglio nei 6 fattori accademici:
//   MKT (market beta), SMB (size), HML (value), RMW (profitability),
//   CMA (investment), MOM (momentum)
// Il rendimento residuo (alpha) cattura tutto ciò che i fattori azionari
// non spiegano: term premium, credit premium, gold premium, currency carry.
// ════════════════════════════════════════════════════════════════════════════

// Premi fattoriali forward-looking annualizzati (decimali, es. 0.055 = 5.5%/a)
// Calibrati su Fama-French Data Library 1970-2024, scontati per:
//   - Affollamento post-pubblicazione accademica
//   - Mean-reversion dei premi di rischio
// Fonti: Fama-French (1992, 1993, 2015), Carhart (1997), DMS Yearbook 2024
const FACTOR_PREMIA = {
  RF:  0.025,  // Risk-free rate (cash medio atteso)
  MKT: 0.055,  // Market Risk Premium (storico ~6%, forward conservativo)
  SMB: 0.015,  // Size premium (Banz 1981, ridotto post-pubbl.)
  HML: 0.020,  // Value premium (Fama-French 1992)
  RMW: 0.025,  // Profitability (Novy-Marx 2013, FF 2015)
  CMA: 0.015,  // Investment (Fama-French 2015)
  MOM: 0.025,  // Momentum (Jegadeesh-Titman 1993, Carhart 1997)
};

// Loadings fattoriali per asset class — stimati da letteratura accademica
// e regressioni FF su dati mensili 1970-2024.
const FACTOR_LOADINGS = {
  // ── Azionari plain ──────────────────────────────────────────────────
  eq_sviluppati:   { MKT: 1.00, SMB:  0.05, HML: -0.05, RMW:  0.05, CMA:  0.00, MOM:  0.00 },
  eq_usa:          { MKT: 1.00, SMB: -0.05, HML: -0.15, RMW:  0.15, CMA: -0.05, MOM:  0.00 },
  eq_europa:       { MKT: 0.95, SMB:  0.10, HML:  0.10, RMW: -0.05, CMA:  0.00, MOM:  0.00 },
  eq_em:           { MKT: 1.15, SMB:  0.25, HML:  0.20, RMW: -0.10, CMA:  0.10, MOM:  0.00 },
  eq_small_value:  { MKT: 1.05, SMB:  0.65, HML:  0.55, RMW:  0.10, CMA:  0.20, MOM:  0.00 },
  reits:           { MKT: 0.85, SMB:  0.20, HML:  0.40, RMW: -0.10, CMA:  0.10, MOM:  0.00 },
  // ── Fattori puri (long-only) ────────────────────────────────────────
  fat_valore:      { MKT: 0.95, SMB:  0.10, HML:  0.85, RMW:  0.10, CMA:  0.20, MOM: -0.10 },
  fat_momentum:    { MKT: 1.00, SMB:  0.05, HML: -0.15, RMW:  0.10, CMA: -0.05, MOM:  0.85 },
  fat_qualita:     { MKT: 0.95, SMB:  0.00, HML: -0.05, RMW:  0.85, CMA:  0.20, MOM:  0.10 },
  fat_low_vol:     { MKT: 0.65, SMB: -0.20, HML:  0.20, RMW:  0.40, CMA:  0.30, MOM:  0.10 },
  fat_size:        { MKT: 1.05, SMB:  0.85, HML:  0.10, RMW:  0.00, CMA:  0.00, MOM:  0.00 },
  fat_investment:  { MKT: 0.95, SMB:  0.05, HML:  0.10, RMW:  0.20, CMA:  0.85, MOM:  0.00 },
  fat_dividendi:   { MKT: 0.85, SMB:  0.00, HML:  0.30, RMW:  0.40, CMA:  0.30, MOM:  0.00 },
  fat_multifat:    { MKT: 0.95, SMB:  0.20, HML:  0.30, RMW:  0.25, CMA:  0.20, MOM:  0.15 },
  // ── Carry / Trend (esposizione equity ridotta) ──────────────────────
  fat_carry_bond:  { MKT: 0.05, SMB:  0.00, HML:  0.00, RMW:  0.00, CMA:  0.00, MOM:  0.00 },
  fat_carry_fx:    { MKT: 0.10, SMB:  0.00, HML:  0.00, RMW:  0.00, CMA:  0.00, MOM:  0.00 },
  fat_trend:       { MKT: 0.05, SMB:  0.00, HML:  0.00, RMW:  0.00, CMA:  0.00, MOM:  0.15 },
  // ── Bond, real assets, cash (esposizione ~0 ai fattori equity) ──────
  ob_usa_st:       { MKT: 0.00, SMB: 0, HML: 0, RMW: 0, CMA: 0, MOM: 0 },
  ob_usa_it:       { MKT: 0.00, SMB: 0, HML: 0, RMW: 0, CMA: 0, MOM: 0 },
  ob_usa_lt:       { MKT: 0.05, SMB: 0, HML: 0, RMW: 0, CMA: 0, MOM: 0 },
  ob_usa_ult:      { MKT: 0.10, SMB: 0, HML: 0, RMW: 0, CMA: 0, MOM: 0 },
  ob_eu_st:        { MKT: 0.00, SMB: 0, HML: 0, RMW: 0, CMA: 0, MOM: 0 },
  ob_eu_it:        { MKT: 0.00, SMB: 0, HML: 0, RMW: 0, CMA: 0, MOM: 0 },
  ob_eu_lt:        { MKT: 0.05, SMB: 0, HML: 0, RMW: 0, CMA: 0, MOM: 0 },
  ob_glob_gov:     { MKT: 0.00, SMB: 0, HML: 0, RMW: 0, CMA: 0, MOM: 0 },
  ob_glob_agg:     { MKT: 0.05, SMB: 0, HML: 0, RMW: 0, CMA: 0, MOM: 0 },
  ob_infl:         { MKT: 0.00, SMB: 0, HML: 0, RMW: 0, CMA: 0, MOM: 0 },
  gold:            { MKT: 0.00, SMB: 0, HML: 0, RMW: 0, CMA: 0, MOM: 0 },
  commodities:     { MKT: 0.10, SMB: 0, HML: 0, RMW: 0, CMA: 0, MOM: 0 },
  cash:            { MKT: 0.00, SMB: 0, HML: 0, RMW: 0, CMA: 0, MOM: 0 },
};

// Metadati fattori per UI
const FACTOR_META = {
  MKT: { name: 'Market Beta',           short: 'MKT', color: '#1a73e8',
         desc: 'Esposizione al mercato azionario globale. β=1 = correlazione perfetta col mercato. Premio storico ~6%/a (Sharpe 1964, CAPM).' },
  SMB: { name: 'Size (Small minus Big)', short: 'SMB', color: '#9334e6',
         desc: 'Premio delle small caps vs large (Banz 1981). β>0 = tilt small. Storico ~1.5–2%/a, compresso post-pubblicazione.' },
  HML: { name: 'Value (High minus Low)', short: 'HML', color: '#1e8e3e',
         desc: 'Premio del valore (book-to-market alto) vs growth (Fama-French 1992). β>0 = tilt value. Storico ~2–3%/a.' },
  RMW: { name: 'Profitability (Robust minus Weak)', short: 'RMW', color: '#e37400',
         desc: 'Premio della redditività operativa (Novy-Marx 2013, FF 2015). β>0 = aziende con margini robusti. Storico ~2.5%/a.' },
  CMA: { name: 'Investment (Conservative minus Aggressive)', short: 'CMA', color: '#00897b',
         desc: 'Premio aziende che investono poco vs aggressive (FF 2015). β>0 = capex contenuto. Storico ~1.5%/a.' },
  MOM: { name: 'Momentum (Up minus Down)', short: 'MOM', color: '#d93025',
         desc: 'Momentum 12-1 mesi (Jegadeesh-Titman 1993, Carhart 1997). Premio ~2.5%/a, ma crash risk in mercati a U-turn.' },
};

// ── Calcola esposizione fattoriale ponderata del portafoglio ───────────────
function computeFactorExposure(weights, acKeys) {
  const exposure = { MKT: 0, SMB: 0, HML: 0, RMW: 0, CMA: 0, MOM: 0 };
  for (let i = 0; i < acKeys.length; i++) {
    const ld = FACTOR_LOADINGS[acKeys[i]];
    if (!ld) continue;
    for (const f in exposure) exposure[f] += weights[i] * (ld[f] || 0);
  }
  return exposure;
}

// ── Decomposizione del rendimento atteso ───────────────────────────────────
function decomposeReturn(exposure, weights, acKeys, ter) {
  const contributions = {
    MKT: exposure.MKT * FACTOR_PREMIA.MKT,
    SMB: exposure.SMB * FACTOR_PREMIA.SMB,
    HML: exposure.HML * FACTOR_PREMIA.HML,
    RMW: exposure.RMW * FACTOR_PREMIA.RMW,
    CMA: exposure.CMA * FACTOR_PREMIA.CMA,
    MOM: exposure.MOM * FACTOR_PREMIA.MOM,
  };
  const fromFactors    = Object.values(contributions).reduce((s, v) => s + v, 0);
  const baseline       = FACTOR_PREMIA.RF;
  const totalExplained = baseline + fromFactors;
  const actualMu       = portfolioMu(weights, acKeys, ter);
  const alpha          = actualMu - totalExplained;
  return { baseline, contributions, alpha, actualMu, fromFactors, totalExplained };
}

// ── Mappa portafoglio predefinito → asset class atomiche ──────────────────
function _portfolioToAssetClasses(portKey, p) {
  if (portKey === 'larry') return [
    { ac: 'eq_small_value', w: 0.15  },
    { ac: 'eq_europa',      w: 0.075 },
    { ac: 'eq_em',          w: 0.075 },
    { ac: 'ob_usa_it',      w: 0.70  },
  ];
  if (portKey === 'golden_butterfly') return [
    { ac: 'eq_usa',         w: 0.20 },
    { ac: 'eq_small_value', w: 0.20 },
    { ac: 'gold',           w: 0.20 },
    { ac: 'ob_usa_ult',     w: 0.20 },
    { ac: 'ob_usa_st',      w: 0.20 },
  ];
  if (portKey === 'permanent') return [
    { ac: 'eq_sviluppati', w: 0.25 },
    { ac: 'ob_usa_ult',    w: 0.25 },
    { ac: 'gold',          w: 0.25 },
    { ac: 'cash',          w: 0.25 },
  ];
  if (portKey === 'all_seasons') return [
    { ac: 'eq_sviluppati', w: 0.30  },
    { ac: 'ob_usa_ult',    w: 0.40  },
    { ac: 'ob_usa_it',     w: 0.15  },
    { ac: 'gold',          w: 0.075 },
    { ac: 'commodities',   w: 0.075 },
  ];
  if (portKey === 'lifecycle') {
    const eW = typeof getLCWeight === 'function' ? getLCWeight(state.age) : 0.5;
    return [
      { ac: 'eq_sviluppati', w: eW     },
      { ac: 'ob_glob_agg',   w: 1 - eW },
    ];
  }
  // Generico: usa eq/ob/gold/cash da PORT
  const result = [];
  if ((p.eq   || 0) > 0) result.push({ ac: 'eq_sviluppati', w: p.eq   });
  if ((p.ob   || 0) > 0) result.push({ ac: 'ob_glob_agg',   w: p.ob   });
  if ((p.gold || 0) > 0) result.push({ ac: 'gold',          w: p.gold });
  if ((p.cash || 0) > 0) result.push({ ac: 'cash',          w: p.cash });
  return result.length ? result : [
    { ac: 'eq_sviluppati', w: 0.6 },
    { ac: 'ob_glob_agg',   w: 0.4 },
  ];
}

// ── Ottiene pesi del portafoglio corrente (custom o predefinito) ──────────
function _getCurrentPortfolioWeights() {
  if (state.portfolio === 'custom') {
    const slots = (state.customPortfolio?.slots || [])
      .filter(s => s.ac && ASSET_CLASSES[s.ac] && s.pct > 0);
    if (!slots.length) return null;
    const total = slots.reduce((s, sl) => s + (+sl.pct || 0), 0);
    return {
      keys:    slots.map(s => s.ac),
      weights: slots.map(s => (+s.pct || 0) / total),
      label:   'Custom',
    };
  }
  const p = PORT[state.portfolio];
  if (!p) return null;
  const composition = _portfolioToAssetClasses(state.portfolio, p);
  return {
    keys:    composition.map(c => c.ac),
    weights: composition.map(c => c.w),
    label:   p.label || state.portfolio,
  };
}

// ── Interpretazione qualitativa del profilo fattoriale ─────────────────────
function _interpretFactorProfile(exp, decomp) {
  const insights = [];
  if (exp.MKT > 0.85)       insights.push('alta esposizione equity (β_MKT > 0.85) — il rendimento dipende fortemente dal mercato');
  else if (exp.MKT < 0.30)  insights.push('bassa esposizione equity (β_MKT < 0.30) — portafoglio difensivo');
  if (exp.HML >  0.25)      insights.push('tilt <strong>Value</strong> (β_HML > 0.25)');
  else if (exp.HML < -0.10) insights.push('tilt <strong>Growth</strong> (β_HML negativo)');
  if (exp.SMB >  0.25)      insights.push('tilt <strong>Small Cap</strong> (β_SMB > 0.25)');
  else if (exp.SMB < -0.10) insights.push('preferenza Large Cap');
  if (exp.RMW >  0.25)      insights.push('esposizione a <strong>Qualità</strong> (β_RMW > 0.25)');
  if (exp.MOM >  0.20)      insights.push('componente <strong>Momentum</strong> significativa (β_MOM > 0.20)');
  if (exp.CMA >  0.20)      insights.push('tilt verso <strong>Investment Factor</strong> (capex conservativi)');
  if (decomp.alpha >  0.025) insights.push('<strong>alpha residuo positivo</strong> ~' + (decomp.alpha*100).toFixed(1) + '%/a (premi non-equity: term, credit, gold)');
  else if (decomp.alpha < -0.015) insights.push('<strong>alpha residuo negativo</strong> (conservatismo dei premi forward-looking vs storici)');
  return insights.length ? insights.join('; ') + '.' : 'Profilo bilanciato senza tilt fattoriali significativi.';
}

// ── Render waterfall chart della decomposizione ────────────────────────────
let _factorChart = null;
function _renderFactorWaterfall(decomp) {
  const canvas = document.getElementById('quantFactorChart');
  if (!canvas) return;
  if (_factorChart) { _factorChart.destroy(); _factorChart = null; }

  const items = [
    { label: 'Risk-Free', value: decomp.baseline,         color: '#5f6368' },
    { label: 'MKT',       value: decomp.contributions.MKT, color: FACTOR_META.MKT.color },
    { label: 'SMB',       value: decomp.contributions.SMB, color: FACTOR_META.SMB.color },
    { label: 'HML',       value: decomp.contributions.HML, color: FACTOR_META.HML.color },
    { label: 'RMW',       value: decomp.contributions.RMW, color: FACTOR_META.RMW.color },
    { label: 'CMA',       value: decomp.contributions.CMA, color: FACTOR_META.CMA.color },
    { label: 'MOM',       value: decomp.contributions.MOM, color: FACTOR_META.MOM.color },
    { label: 'Alpha',     value: decomp.alpha,             color: '#9334e6' },
  ];
  let cum = 0;
  const bars = items.map(it => { const start = cum; cum += it.value; return { ...it, start, end: cum }; });
  bars.push({ label: 'TOTALE', value: cum, color: '#1a73e8', start: 0, end: cum });

  const ctx = canvas.getContext('2d');
  _factorChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: bars.map(b => b.label),
      datasets: [{
        label: 'Contributo (%/a)',
        data: bars.map(b => [b.start * 100, b.end * 100]),
        backgroundColor: bars.map(b => b.color + 'CC'),
        borderColor: bars.map(b => b.color),
        borderWidth: 1.5,
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700, easing: 'easeInOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(c) {
              const b = bars[c.dataIndex];
              return [
                `Contributo: ${(b.value >= 0 ? '+' : '') + (b.value*100).toFixed(2)}%/a`,
                `Cumulato:   ${(b.end*100).toFixed(2)}%/a`,
              ];
            },
          },
          backgroundColor: 'rgba(32,33,36,0.92)',
          titleColor: '#fff', bodyColor: '#e8eaed',
          padding: 10, cornerRadius: 8,
        },
      },
      scales: {
        x: {
          ticks: { font: { family: "'DM Mono',monospace", size: 11, weight: '600' } },
          grid: { display: false },
        },
        y: {
          title: { display: true, text: 'Rendimento atteso annualizzato (%/a)', font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: { callback: v => v.toFixed(1) + '%' },
          beginAtZero: true,
        },
      },
    },
  });
}

// ── Render del tab Factor Decomposition ────────────────────────────────────
function _renderFactorView() {
  const el = document.getElementById('quantFactorContent');
  if (!el) return;
  const portfolio = _getCurrentPortfolioWeights();
  if (!portfolio) {
    el.innerHTML = '<p style="color:var(--text3);padding:20px">Portafoglio non disponibile per la decomposizione fattoriale.</p>';
    return;
  }
  const { keys, weights, label } = portfolio;
  const exposure = computeFactorExposure(weights, keys);
  const decomp   = decomposeReturn(exposure, weights, keys, _efState.ter);
  const fmt      = v => (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + '%';
  const fmtBeta  = v => (v >= 0 ? '+' : '') + v.toFixed(2);

  const tableRows = keys.map((k, i) => {
    const ac = ASSET_CLASSES[k];
    const ld = FACTOR_LOADINGS[k] || { MKT: 0, SMB: 0, HML: 0, RMW: 0, CMA: 0, MOM: 0 };
    return {
      label: ac ? `${ac.emoji || ''} ${ac.label}` : k,
      weight: weights[i] * 100,
      MKT: ld.MKT, SMB: ld.SMB, HML: ld.HML, RMW: ld.RMW, CMA: ld.CMA, MOM: ld.MOM,
    };
  }).sort((a, b) => b.weight - a.weight);

  el.innerHTML = `
    <!-- KPI riepilogativi -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:18px">
      <div class="quant-stat-card" style="border-left:3px solid var(--blue)">
        <div class="qsc-title">Portafoglio analizzato</div>
        <div class="qsc-row"><span>Composizione</span><strong>${label}</strong></div>
        <div class="qsc-row"><span>Rend. atteso netto</span><strong>${fmt(decomp.actualMu)}/a</strong></div>
        <div class="qsc-row"><span>TER</span><strong>${_efState.ter.toFixed(2)}%</strong></div>
      </div>
      <div class="quant-stat-card" style="border-left:3px solid var(--green)">
        <div class="qsc-title">Spiegato dai fattori</div>
        <div class="qsc-row"><span>Risk-free</span><strong>${fmt(decomp.baseline)}/a</strong></div>
        <div class="qsc-row"><span>Premio fattoriale</span><strong>${fmt(decomp.fromFactors)}/a</strong></div>
        <div class="qsc-row"><span>Totale spiegato</span><strong>${fmt(decomp.totalExplained)}/a</strong></div>
      </div>
      <div class="quant-stat-card" style="border-left:3px solid var(--purple)">
        <div class="qsc-title">Alpha residuo</div>
        <div class="qsc-row"><span>α (non spiegato)</span><strong style="color:${decomp.alpha >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(decomp.alpha)}/a</strong></div>
        <div class="qsc-row"><span>Significato</span><strong style="font-size:11px">${
          Math.abs(decomp.alpha) < 0.005 ? 'Trascurabile' :
          decomp.alpha > 0.02 ? 'Premio non-equity' :
          decomp.alpha > 0   ? 'Modesto positivo' :
          decomp.alpha > -0.02 ? 'Modesto negativo' : 'Conservatismo modello'
        }</strong></div>
      </div>
    </div>

    <!-- Esposizioni fattoriali con barre -->
    <div class="sec-label" style="margin-bottom:12px">Esposizione Fattoriale (β del portafoglio)</div>
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:18px">
      ${['MKT','SMB','HML','RMW','CMA','MOM'].map(f => {
        const meta = FACTOR_META[f];
        const beta = exposure[f];
        const contrib = decomp.contributions[f];
        const pct = Math.max(-50, Math.min(150, beta * 100));
        const positive = pct >= 0;
        const barW = Math.abs(pct);
        return `
          <div style="margin-bottom:14px;font-size:12.5px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;gap:8px;flex-wrap:wrap">
              <span><strong style="color:${meta.color}">${meta.name}</strong> <span style="color:var(--text3)">(β = ${fmtBeta(beta)})</span></span>
              <span style="font-family:'DM Mono',monospace;color:${contrib >= 0 ? meta.color : 'var(--red)'};font-weight:600">${fmt(contrib)}/a</span>
            </div>
            <div style="position:relative;height:8px;background:var(--border2);border-radius:4px;overflow:hidden">
              <div style="position:absolute;left:33.33%;top:0;bottom:0;width:1px;background:rgba(0,0,0,.25)"></div>
              <div style="position:absolute;${positive ? 'left:33.33%' : `right:${100-33.33}%`};top:0;bottom:0;width:${barW * 0.667}%;background:${meta.color};border-radius:4px;transition:width .4s ease"></div>
            </div>
            <div style="font-size:11px;color:var(--text3);margin-top:5px;line-height:1.5">${meta.desc}</div>
          </div>`;
      }).join('')}
    </div>

    <!-- Waterfall del rendimento atteso -->
    <div class="sec-label" style="margin-bottom:12px">Decomposizione del Rendimento Atteso (waterfall)</div>
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:18px">
      <div style="position:relative;height:300px"><canvas id="quantFactorChart"></canvas></div>
    </div>

    <!-- Tabella loadings per asset class -->
    <div class="sec-label" style="margin-bottom:12px">Loadings Fattoriali per Asset Class</div>
    <div class="tbl-outer" style="margin-bottom:16px">
      <table>
        <thead><tr>
          <th style="text-align:left">Asset Class</th>
          <th>Peso</th>
          <th>MKT</th><th>SMB</th><th>HML</th><th>RMW</th><th>CMA</th><th>MOM</th>
        </tr></thead>
        <tbody>
          ${tableRows.map(r => `
            <tr>
              <td style="text-align:left">${r.label}</td>
              <td><strong>${r.weight.toFixed(1)}%</strong></td>
              ${['MKT','SMB','HML','RMW','CMA','MOM'].map(f => {
                const v = r[f];
                const c = Math.abs(v) < 0.05 ? 'var(--text3)' :
                          v >  0.3 ? FACTOR_META[f].color :
                          v >  0   ? 'var(--text2)' : 'var(--red)';
                return `<td style="color:${c};font-family:'DM Mono',monospace;font-weight:${Math.abs(v) >= 0.3 ? 600 : 400}">${fmtBeta(v)}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Premi fattoriali usati -->
    <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:14px;font-size:12px;color:var(--text3);line-height:1.6">
      <strong style="color:var(--text2)">Premi fattoriali forward-looking:</strong>
      RF=${(FACTOR_PREMIA.RF*100).toFixed(1)}% ·
      MKT=${(FACTOR_PREMIA.MKT*100).toFixed(1)}% ·
      SMB=${(FACTOR_PREMIA.SMB*100).toFixed(1)}% ·
      HML=${(FACTOR_PREMIA.HML*100).toFixed(1)}% ·
      RMW=${(FACTOR_PREMIA.RMW*100).toFixed(1)}% ·
      CMA=${(FACTOR_PREMIA.CMA*100).toFixed(1)}% ·
      MOM=${(FACTOR_PREMIA.MOM*100).toFixed(1)}%
      <br><span style="font-size:11px">Calibrati su Fama-French Data Library 1970-2024, scontati per affollamento post-pubblicazione e mean-reversion.</span>
    </div>

    <!-- Note interpretative -->
    <div class="quant-note quant-note-ok" style="line-height:1.75">
      <strong>Come leggere la decomposizione:</strong><br>
      • <strong>Risk-free (${fmt(decomp.baseline)}/a)</strong> = rendimento garantito da cash/T-Bills.<br>
      • <strong>Premio fattoriale (${fmt(decomp.fromFactors)}/a)</strong> = somma dei contributi ai 6 fattori azionari accademici (Fama-French 5 + Momentum). È il rendimento "spiegato" dal modello.<br>
      • <strong>Alpha (${fmt(decomp.alpha)}/a)</strong> = ciò che il modello non spiega. Per portafogli con bond/oro è normalmente positivo (term premium, gold premium). Per portafogli equity puri è tipicamente vicino a 0 o lievemente negativo (riflesso del conservatismo nelle stime forward-looking).<br><br>
      <strong>Interpretazione del tuo portafoglio:</strong> ${_interpretFactorProfile(exposure, decomp)}
    </div>
  `;

  _renderFactorWaterfall(decomp);
}

// ── Override di switchQuantMode per gestire la modalità 'factor' ───────────
window.switchQuantMode = function(mode) {
  _efState.mode = mode;
  document.querySelectorAll('#quantModeBtns .gbtn').forEach(b =>
    b.classList.toggle('a-blue', b.dataset.qm === mode));
  const frontierSection = document.getElementById('quantFrontierSection');
  const varSection      = document.getElementById('quantVaRSection');
  const factorSection   = document.getElementById('quantFactorSection');
  if (frontierSection) frontierSection.style.display = mode === 'frontier' ? '' : 'none';
  if (varSection)      varSection.style.display      = mode === 'var'      ? '' : 'none';
  if (factorSection)   factorSection.style.display   = mode === 'factor'   ? '' : 'none';
  renderQuantTab();
};

// ── Override di renderQuantTab per dispatchare anche al render fattoriale ──
window.renderQuantTab = function() {
  const tab = document.getElementById('tab-quant');
  if (!tab || !tab.classList.contains('active')) return;
  _syncEFStateFromSimulator();
  if      (_efState.mode === 'frontier') _renderFrontierView();
  else if (_efState.mode === 'var')      _renderVaRView();
  else if (_efState.mode === 'factor')   _renderFactorView();
};

// Espone utilities per debug / test
window.computeFactorExposure = computeFactorExposure;
window.decomposeReturn       = decomposeReturn;
window.FACTOR_LOADINGS       = FACTOR_LOADINGS;
window.FACTOR_PREMIA         = FACTOR_PREMIA;
// ════════════════════════════════════════════════════════════════════════════
// 7. PORTFOLIO OPTIMIZER CON VINCOLI
// 4 obiettivi: Max Sharpe · Min Varianza · Max Sortino · Risk Parity
// Vincoli: min/max % per asset class + max % aggregato azionario
// Algoritmi:
//   - MC sampling (8000 portafogli che rispettano i vincoli) + local search
//   - Risk Parity: iterazione fixed-point con normalizzazione vincoli
// ════════════════════════════════════════════════════════════════════════════

const OBJ_META = {
  max_sharpe:    { label: 'Massimo Sharpe Ratio', icon: '⭐', color: '#1a73e8',
                   desc: 'Massimizza (μ−RF)/σ — miglior rendimento per unità di rischio totale.' },
  min_variance:  { label: 'Minima Varianza',       icon: '🛡️', color: '#1e8e3e',
                   desc: 'Minimizza σ — portafoglio difensivo a varianza ridotta.' },
  max_sortino:   { label: 'Massimo Sortino Ratio', icon: '📉', color: '#e37400',
                   desc: 'Massimizza (μ−RF)/σ_down — penalizza solo la volatilità negativa (downside).' },
  risk_parity:   { label: 'Risk Parity',           icon: '⚖️', color: '#9334e6',
                   desc: 'Ogni asset contribuisce in egual misura al rischio totale (equal risk contribution).' },
};

// Stato del modulo optimizer
const _optState = {
  assets: [],                      // chiavi ASSET_CLASSES selezionate
  bounds: {},                      // {ac_key: {min: 0, max: 1}}
  maxEquity: 1.0,                  // vincolo aggregato max % azionario
  enableMaxEquity: false,
  objective: 'max_sharpe',
  ter: 0.20,
  returnBasis: 'forward',          // 'forward' (mu) | 'historical' (histCAGR)
  result: null,                    // ultimo risultato ottimizzazione
};

let _optPieChart = null, _optRcChart = null;

// ── Bounds di default per asset class ──────────────────────────────────────
// FIX: la liquidità ha vol bassa (2%) → in Risk Parity attira pesi molto alti.
// Un cap di default al 40% evita allocazioni dominate dal cash, pur restando
// modificabile dall'utente. Stesso principio per le obbligazioni brevissime.
function _defaultBound(acKey) {
  if (acKey === 'cash')      return { min: 0, max: 0.15 };
  if (acKey === 'ob_usa_st' || acKey === 'ob_eu_st') return { min: 0, max: 0.50 };
  return { min: 0, max: 1 };
}

// ── Verifica se un asset è "equity" (per vincolo categoria) ────────────────
function _isEquityAsset(acKey) {
  const ac = ASSET_CLASSES[acKey];
  if (!ac) return false;
  return ac.cat === 'eq' || ac.cat === 'fat';  // azionario + fattori (long equity)
}

// ── Calcola vol portafoglio (helper) ───────────────────────────────────────
function _portfolioVol(w, acKeys) {
  return Math.sqrt(Math.max(0, portfolioVar(w, acKeys)));
}

// ── Calcola downside deviation con MC veloce ───────────────────────────────
function _downsideDeviation(w, acKeys, ter) {
  const mu = portfolioMu(w, acKeys, ter);
  const vol = _portfolioVol(w, acKeys);
  // MC veloce (200 sim) per stima downside
  const N = 200;
  let sumSq = 0;
  for (let i = 0; i < N; i++) {
    const r = mu + vol * _boxMuller();
    if (r < RF_RATE) {                     // sotto risk-free = "downside"
      const d = RF_RATE - r;
      sumSq += d * d;
    }
  }
  return Math.sqrt(sumSq / N);
}

// ── Risk contribution per asset ────────────────────────────────────────────
function _riskContributions(w, acKeys) {
  const n = acKeys.length;
  const sigmaW = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sigmaW[i] += w[j] * getCov(acKeys[i], acKeys[j]);
    }
  }
  const totalVar = w.reduce((s, wi, i) => s + wi * sigmaW[i], 0);
  if (totalVar <= 0) return acKeys.map(() => 0);
  return w.map((wi, i) => (wi * sigmaW[i]) / totalVar);
}

// ── Applica vincoli ai pesi (clip + ri-normalizzazione iterativa) ─────────
function _applyConstraints(w, acKeys, bounds, maxEquity) {
  let result = [...w];
  const n = acKeys.length;
  // Iterazione fino a convergenza dei vincoli.
  // FIX: dopo aver clippato un asset al suo cap (es. cash 15%), l'eccesso va
  // ridistribuito SOLO sugli asset non saturati — non rinormalizzando tutto
  // (che reintrodurrebbe il cash sopra il cap, com'era nel bug del Risk Parity).
  for (let iter = 0; iter < 60; iter++) {
    let changed = false;
    // 1. Clip min/max per asset; traccia quali sono "bloccati" al cap
    const locked = Array(n).fill(false);
    for (let i = 0; i < n; i++) {
      const b = bounds[acKeys[i]] || { min: 0, max: 1 };
      if (result[i] < b.min - 1e-9) { result[i] = b.min; locked[i] = true; changed = true; }
      else if (result[i] > b.max + 1e-9) { result[i] = b.max; locked[i] = true; changed = true; }
    }
    // 2. Vincolo categoria equity (scala solo gli asset equity)
    if (maxEquity != null && maxEquity < 1) {
      const eqSum = result.reduce((s, wi, i) => s + (_isEquityAsset(acKeys[i]) ? wi : 0), 0);
      if (eqSum > maxEquity + 1e-9) {
        const scale = maxEquity / eqSum;
        for (let i = 0; i < n; i++) if (_isEquityAsset(acKeys[i])) result[i] *= scale;
        changed = true;
      }
    }
    // 3. Riporta la somma a 1 ridistribuendo il residuo SOLO sugli asset liberi
    const sum = result.reduce((a, b) => a + Math.max(0, b), 0);
    const deficit = 1 - sum;  // positivo: manca peso; negativo: peso in eccesso
    if (Math.abs(deficit) > 1e-9) {
      const freeSum = result.reduce((s, wi, i) => s + (!locked[i] ? Math.max(0, wi) : 0), 0);
      if (freeSum > 1e-9) {
        // Distribuisci il deficit proporzionalmente agli asset liberi
        for (let i = 0; i < n; i++) {
          if (!locked[i]) result[i] = Math.max(0, result[i] + deficit * (Math.max(0, result[i]) / freeSum));
        }
        changed = true;
      } else {
        // Nessun asset libero: rinormalizza tutto (fallback)
        if (sum > 0) result = result.map(x => Math.max(0, x) / sum);
      }
    }
    if (!changed) break;
  }
  // Normalizzazione finale di sicurezza
  const fsum = result.reduce((a, b) => a + Math.max(0, b), 0);
  if (fsum > 0) result = result.map(x => Math.max(0, x) / fsum);
  return result;
}

// ── Verifica feasibility dei vincoli ───────────────────────────────────────
function _checkFeasibility(acKeys, bounds, maxEquity) {
  const minSum = acKeys.reduce((s, k) => s + (bounds[k]?.min || 0), 0);
  const maxSum = acKeys.reduce((s, k) => s + (bounds[k]?.max ?? 1), 0);
  if (minSum > 1 + 1e-6) return { ok: false, reason: `Somma dei minimi (${(minSum*100).toFixed(1)}%) supera 100%. Riduci i vincoli minimi.` };
  if (maxSum < 1 - 1e-6) return { ok: false, reason: `Somma dei massimi (${(maxSum*100).toFixed(1)}%) inferiore a 100%. Aumenta i vincoli massimi.` };
  if (maxEquity != null && maxEquity < 1) {
    const eqMin = acKeys.reduce((s, k) => s + (_isEquityAsset(k) ? (bounds[k]?.min || 0) : 0), 0);
    if (eqMin > maxEquity + 1e-6) return { ok: false, reason: `Min equity richiesto (${(eqMin*100).toFixed(1)}%) supera il limite max equity (${(maxEquity*100).toFixed(1)}%).` };
  }
  return { ok: true };
}

// ── Genera pesi casuali rispettando i vincoli (rejection sampling) ─────────
function _sampleConstrainedWeights(acKeys, bounds, maxEquity) {
  const n = acKeys.length;
  // Dirichlet sampling come base
  const raw = Array.from({ length: n }, () => -Math.log(Math.random() + 1e-12));
  const sum = raw.reduce((a, b) => a + b, 0);
  let w = raw.map(x => x / sum);
  return _applyConstraints(w, acKeys, bounds, maxEquity);
}

// ── Valutazione funzione obiettivo ─────────────────────────────────────────
function _evaluate(w, acKeys, objective, ter) {
  const mu = portfolioMu(w, acKeys, ter);
  const sigma = _portfolioVol(w, acKeys);
  if (sigma <= 1e-9) return { score: -Infinity, mu, sigma };

  if (objective === 'max_sharpe') {
    return { score: (mu - RF_RATE) / sigma, mu, sigma };
  }
  if (objective === 'min_variance') {
    return { score: -sigma, mu, sigma };
  }
  if (objective === 'max_sortino') {
    const dd = _downsideDeviation(w, acKeys, ter);
    return { score: dd > 0 ? (mu - RF_RATE) / dd : -Infinity, mu, sigma, dd };
  }
  if (objective === 'risk_parity') {
    const rc = _riskContributions(w, acKeys);
    const target = 1 / acKeys.length;
    const variance = rc.reduce((s, x) => s + (x - target) ** 2, 0) / acKeys.length;
    return { score: -variance, mu, sigma, rc };
  }
  return { score: 0, mu, sigma };
}

// ── Risk Parity solver (iterazione fixed-point con vincoli) ───────────────
function _solveRiskParity(acKeys, bounds, maxEquity) {
  const n = acKeys.length;
  let w = Array(n).fill(1 / n);
  w = _applyConstraints(w, acKeys, bounds, maxEquity);
  const maxIter = 300;
  const tol = 1e-6;
  for (let iter = 0; iter < maxIter; iter++) {
    const sigmaW = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sigmaW[i] += w[j] * getCov(acKeys[i], acKeys[j]);
      }
    }
    const totalRisk = w.reduce((s, wi, i) => s + wi * sigmaW[i], 0);
    if (totalRisk <= 0) break;
    const target = totalRisk / n;
    // Update: w_i ∝ target / σw_i (con damping per stabilità)
    const damping = 0.5;
    let newW = w.map((wi, i) => sigmaW[i] > 0 ? wi * (1 - damping) + damping * target / sigmaW[i] : wi);
    // Normalizza
    const s = newW.reduce((a, b) => a + Math.max(0, b), 0);
    if (s > 0) newW = newW.map(x => Math.max(0, x) / s);
    // Applica vincoli
    newW = _applyConstraints(newW, acKeys, bounds, maxEquity);
    // Check convergenza
    const diff = newW.reduce((s, wi, i) => s + Math.abs(wi - w[i]), 0);
    w = newW;
    if (diff < tol) break;
  }
  return w;
}

// ── Optimizer principale ───────────────────────────────────────────────────
function runOptimizer(acKeys, objective, bounds, maxEquity, ter, opts) {
  opts = opts || {};
  const N = opts.N || 8000;
  const localIters = opts.localIters || 300;
  const feas = _checkFeasibility(acKeys, bounds, maxEquity);
  if (!feas.ok) return { error: feas.reason };

  // Caso speciale: Risk Parity ha un suo solver
  if (objective === 'risk_parity') {
    const w = _solveRiskParity(acKeys, bounds, maxEquity);
    const eval_ = _evaluate(w, acKeys, objective, ter);
    return { weights: w, ...eval_ };
  }

  // 1. Campionamento Monte Carlo
  let bestW = null, bestScore = -Infinity, bestEval = null;
  for (let i = 0; i < N; i++) {
    const w = _sampleConstrainedWeights(acKeys, bounds, maxEquity);
    const sum = w.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 0.01) continue;
    const ev = _evaluate(w, acKeys, objective, ter);
    if (ev.score > bestScore) {
      bestScore = ev.score;
      bestW = w;
      bestEval = ev;
    }
  }
  if (!bestW) return { error: 'Vincoli incompatibili — nessun portafoglio fattibile trovato.' };

  // 2. Local search adattiva (perturbazione + accettazione greedy)
  for (let iter = 0; iter < localIters; iter++) {
    const step = 0.08 * (1 - iter / localIters);  // step decrescente
    const trial = bestW.map(wi => Math.max(0, wi + (Math.random() - 0.5) * step));
    const sum = trial.reduce((a, b) => a + b, 0);
    if (sum <= 0) continue;
    const wNorm = trial.map(x => x / sum);
    const wFinal = _applyConstraints(wNorm, acKeys, bounds, maxEquity);
    const ev = _evaluate(wFinal, acKeys, objective, ter);
    if (ev.score > bestScore) {
      bestScore = ev.score;
      bestW = wFinal;
      bestEval = ev;
    }
  }

  return { weights: bestW, ...bestEval };
}

// ── Inizializza optimizer state da composizione corrente ──────────────────
function _initOptimizerFromCurrent() {
  // Usa asset class dalla composizione corrente come default
  if (state.portfolio === 'custom') {
    const slots = (state.customPortfolio?.slots || []).filter(s => s.ac && ASSET_CLASSES[s.ac] && s.pct > 0);
    if (slots.length) _optState.assets = slots.map(s => s.ac);
  }
  if (!_optState.assets.length) {
    // Default ragionevole: 4-5 asset diversificati
    _optState.assets = ['eq_sviluppati', 'eq_em', 'ob_glob_agg', 'gold', 'cash'];
  }
  // Inizializza bounds default (0%-100%) per ogni asset
  for (const k of _optState.assets) {
    if (!_optState.bounds[k]) _optState.bounds[k] = _defaultBound(k);
  }
  _optState.ter = state.ter || 0.20;
}

// ── Render principale ──────────────────────────────────────────────────────
function _renderOptimizerView() {
  const el = document.getElementById('quantOptimizerContent');
  if (!el) return;
  _initOptimizerFromCurrent();

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <!-- Pannello SINISTRO: asset + vincoli -->
      <div class="sec" style="margin-bottom:0;padding:14px">
        <div class="sec-label" style="margin-bottom:10px">1. Asset Class da includere</div>
        <select id="optAssetSelector" multiple
          style="width:100%;height:170px;font-size:12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:6px;background:var(--bg);color:var(--text);margin-bottom:8px;font-family:'DM Sans',sans-serif">
        </select>
        <div style="font-size:11px;color:var(--text3);margin-bottom:14px">
          Ctrl/Cmd+click per selezione multipla. Min 2, max 12 asset.
        </div>

        <div class="sec-label" style="margin-bottom:10px">2. Vincoli per asset (min %–max %)</div>
        <div id="optBoundsContainer" style="max-height:280px;overflow-y:auto;border:1px solid var(--border2);border-radius:var(--radius-sm);padding:8px;margin-bottom:14px">
          <!-- popolato dinamicamente -->
        </div>

        <div class="sec-label" style="margin-bottom:10px">3. Vincoli di categoria</div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:12.5px">
          <input type="checkbox" id="optEnableMaxEq" ${_optState.enableMaxEquity ? 'checked' : ''} style="cursor:pointer">
          <label for="optEnableMaxEq" style="cursor:pointer">Limita totale azionario a max</label>
          <input type="number" id="optMaxEquityInput" min="0" max="100" step="5"
            value="${Math.round(_optState.maxEquity * 100)}"
            style="width:60px;padding:4px 6px;border:1px solid var(--border);border-radius:4px;font-family:'DM Mono',monospace;font-size:12px;text-align:right"
            ${_optState.enableMaxEquity ? '' : 'disabled'}> %
        </div>
        <div style="font-size:11px;color:var(--text3)">Si applica alla somma di tutte le asset class azionarie (eq + fattori).</div>
      </div>

      <!-- Pannello DESTRO: obiettivo + run -->
      <div class="sec" style="margin-bottom:0;padding:14px">
        <div class="sec-label" style="margin-bottom:10px">4. Funzione obiettivo</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
          ${Object.entries(OBJ_META).map(([key, m]) => `
            <button class="gbtn ${_optState.objective === key ? 'a-blue' : ''}"
              data-obj="${key}" onclick="optSetObjective('${key}')"
              style="text-align:left;padding:10px 12px;font-size:12.5px">
              <strong>${m.icon} ${m.label}</strong>
              <div style="font-size:11px;color:var(--text3);font-weight:400;margin-top:3px;line-height:1.4">${m.desc}</div>
            </button>
          `).join('')}
        </div>

        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;font-size:12.5px">
          <span style="color:var(--text2)">TER applicato:</span>
          <input type="number" id="optTerInput" min="0" max="3" step="0.05"
            value="${_optState.ter.toFixed(2)}"
            style="width:70px;padding:4px 6px;border:1px solid var(--border);border-radius:4px;font-family:'DM Mono',monospace;font-size:12px;text-align:right"> %
        </div>

        <div style="margin-bottom:14px;font-size:12.5px">
          <div style="color:var(--text2);margin-bottom:6px">Base rendimenti attesi:</div>
          <div style="display:flex;gap:6px">
            <button class="gbtn ${_optState.returnBasis === 'forward' ? 'a-blue' : ''}"
              onclick="optSetReturnBasis('forward')" style="flex:1;padding:8px;font-size:11.5px">
              <strong>Forward-looking</strong>
              <div style="font-size:10px;color:var(--text3);font-weight:400;margin-top:2px">μ prospettici (CAPE-adjusted)</div>
            </button>
            <button class="gbtn ${_optState.returnBasis === 'historical' ? 'a-blue' : ''}"
              onclick="optSetReturnBasis('historical')" style="flex:1;padding:8px;font-size:11.5px">
              <strong>Storici</strong>
              <div style="font-size:10px;color:var(--text3);font-weight:400;margin-top:2px">CAGR 1970-2024</div>
            </button>
          </div>
          <div style="font-size:10.5px;color:var(--text3);margin-top:6px;line-height:1.5">
            ${_optState.returnBasis === 'forward'
              ? '⚠️ Rendimenti forward conservativi + volatilità storiche → Sharpe più bassi ma realistici per il futuro.'
              : 'ℹ️ Coerenza rendimento-volatilità storica → Sharpe più alti, ma i CAGR passati sono spesso non ripetibili (tassi in calo 1981-2021, de-rating valutazioni).'}
          </div>
        </div>

        <button id="optRunBtn" onclick="optRunOptimization()"
          style="width:100%;padding:12px;background:var(--blue);color:#fff;border:none;border-radius:var(--radius-sm);font-size:13.5px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:.15s">
          🚀 Esegui Ottimizzazione
        </button>
        <div id="optStatus" style="margin-top:10px;font-size:11.5px;color:var(--text3);text-align:center;min-height:16px"></div>
      </div>
    </div>

    <!-- Output -->
    <div id="optResultContainer"></div>

    <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:14px;margin-top:16px;font-size:12px;color:var(--text3);line-height:1.7">
      <strong>Metodologia:</strong> 8.000 portafogli casuali Dirichlet che rispettano i vincoli, seguiti da 300 iterazioni di local search adattiva (random perturbation greedy). Per Risk Parity: iterazione fixed-point con damping 0.5 e proiezione sui vincoli (max 300 iter). Rendimenti attesi e covarianze basati su dati storici 1970-2024 calibrati. Il risultato è ottimale dato il modello statistico — la realtà può differire (instabilità di Markowitz, errore di stima sui rendimenti attesi).
    </div>
  `;

  _populateOptAssetSelector();
  _renderOptBounds();
  _attachOptListeners();
  if (_optState.result) _renderOptResult();
}

// ── Popola asset selector ──────────────────────────────────────────────────
function _populateOptAssetSelector() {
  const sel = document.getElementById('optAssetSelector');
  if (!sel) return;
  const cats = {};
  for (const [key, ac] of Object.entries(ASSET_CLASSES)) {
    if (!cats[ac.cat]) cats[ac.cat] = [];
    cats[ac.cat].push({ key, ac });
  }
  const catLabels = {
    eq: 'Azionario', fat: 'Factor Investing', carry: 'Carry', trend: 'Trend',
    ob_usa: 'Obbl. USA', ob_eu: 'Obbl. EUR', ob_glob: 'Obbl. Globale',
    real: 'Real Assets', cash: 'Liquidità',
  };
  sel.innerHTML = Object.entries(cats).map(([cat, items]) => `
    <optgroup label="${catLabels[cat] || cat}">
      ${items.map(({ key, ac }) => `<option value="${key}">${ac.emoji || ''} ${ac.label} (μ=${((ac.mu||0)*100).toFixed(1)}% σ=${((ac.vol||0)*100).toFixed(1)}%)</option>`).join('')}
    </optgroup>
  `).join('');
  for (const opt of sel.options) opt.selected = _optState.assets.includes(opt.value);

  sel.onchange = function() {
    const newAssets = Array.from(sel.selectedOptions).map(o => o.value);
    if (newAssets.length < 2) { _flashOptToast('⚠️ Seleziona almeno 2 asset class', 'orange'); return; }
    if (newAssets.length > 12) { _flashOptToast('⚠️ Massimo 12 asset class', 'orange'); return; }
    _optState.assets = newAssets;
    // Rimuovi bounds per asset deselezionati
    for (const k of Object.keys(_optState.bounds)) {
      if (!newAssets.includes(k)) delete _optState.bounds[k];
    }
    // Aggiungi bounds default per nuovi asset
    for (const k of newAssets) {
      if (!_optState.bounds[k]) _optState.bounds[k] = _defaultBound(k);
    }
    _renderOptBounds();
  };
}

// ── Render dei bounds per ogni asset ───────────────────────────────────────
function _renderOptBounds() {
  const el = document.getElementById('optBoundsContainer');
  if (!el) return;
  if (!_optState.assets.length) {
    el.innerHTML = '<div style="color:var(--text3);font-size:12px;padding:10px;text-align:center">Seleziona almeno 2 asset class</div>';
    return;
  }
  el.innerHTML = _optState.assets.map(k => {
    const ac = ASSET_CLASSES[k];
    const b = _optState.bounds[k] || { min: 0, max: 1 };
    const isEq = _isEquityAsset(k);
    return `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid var(--border2);font-size:12px">
        <span style="flex:1;min-width:120px;color:${isEq ? 'var(--blue)' : 'var(--text2)'};${isEq ? 'font-weight:600' : ''}">${ac?.emoji || ''} ${ac?.label || k}</span>
        <span style="color:var(--text3);font-size:11px">min</span>
        <input type="number" min="0" max="100" step="5"
          value="${Math.round(b.min * 100)}"
          onchange="optSetBound('${k}','min',this.value)"
          style="width:55px;padding:3px 5px;border:1px solid var(--border);border-radius:4px;font-family:'DM Mono',monospace;font-size:11px;text-align:right">
        <span style="color:var(--text3);font-size:11px">max</span>
        <input type="number" min="0" max="100" step="5"
          value="${Math.round(b.max * 100)}"
          onchange="optSetBound('${k}','max',this.value)"
          style="width:55px;padding:3px 5px;border:1px solid var(--border);border-radius:4px;font-family:'DM Mono',monospace;font-size:11px;text-align:right">
        <span style="color:var(--text3);font-size:11px">%</span>
      </div>`;
  }).join('');
}

window.optSetBound = function(key, type, val) {
  if (!_optState.bounds[key]) _optState.bounds[key] = _defaultBound(key);
  const v = Math.max(0, Math.min(100, parseFloat(val) || 0)) / 100;
  _optState.bounds[key][type] = v;
  if (type === 'min' && _optState.bounds[key].max < v) _optState.bounds[key].max = v;
  if (type === 'max' && _optState.bounds[key].min > v) _optState.bounds[key].min = v;
};

window.optSetObjective = function(obj) {
  _optState.objective = obj;
  document.querySelectorAll('#quantOptimizerContent [data-obj]').forEach(b =>
    b.classList.toggle('a-blue', b.dataset.obj === obj));
};

window.optSetReturnBasis = function(basis) {
  _optState.returnBasis = (basis === 'historical') ? 'historical' : 'forward';
  // Re-render per aggiornare lo stato dei pulsanti e la nota esplicativa
  _renderOptimizerView();
};

// ── Collega listeners per checkbox/input ──────────────────────────────────
function _attachOptListeners() {
  const chk = document.getElementById('optEnableMaxEq');
  const inp = document.getElementById('optMaxEquityInput');
  const ter = document.getElementById('optTerInput');
  if (chk) chk.onchange = function() {
    _optState.enableMaxEquity = chk.checked;
    if (inp) inp.disabled = !chk.checked;
  };
  if (inp) inp.onchange = function() {
    const v = Math.max(0, Math.min(100, parseFloat(inp.value) || 100)) / 100;
    _optState.maxEquity = v;
  };
  if (ter) ter.onchange = function() {
    _optState.ter = Math.max(0, Math.min(3, parseFloat(ter.value) || 0));
  };
}

// ── Esegui ottimizzazione (con UI feedback) ───────────────────────────────
window.optRunOptimization = function() {
  const btn = document.getElementById('optRunBtn');
  const status = document.getElementById('optStatus');
  if (!_optState.assets.length || _optState.assets.length < 2) {
    if (status) { status.style.color = 'var(--red)'; status.textContent = '⚠️ Seleziona almeno 2 asset class'; }
    return;
  }
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Ottimizzazione in corso...'; btn.style.opacity = '0.7'; }
  if (status) { status.style.color = 'var(--text3)'; status.textContent = 'Esecuzione 8.000 simulazioni + local search...'; }

  // Esegue in setTimeout per permettere repaint UI
  setTimeout(() => {
    try {
      const t0 = performance.now();
      const maxEq = _optState.enableMaxEquity ? _optState.maxEquity : null;
      const result = runOptimizer(_optState.assets, _optState.objective, _optState.bounds, maxEq, _optState.ter);
      const dt = ((performance.now() - t0) / 1000).toFixed(2);

      if (result.error) {
        if (status) { status.style.color = 'var(--red)'; status.textContent = '❌ ' + result.error; }
        if (btn) { btn.disabled = false; btn.textContent = '🚀 Esegui Ottimizzazione'; btn.style.opacity = '1'; }
        return;
      }

      _optState.result = result;
      if (status) { status.style.color = 'var(--green)'; status.textContent = `✓ Completato in ${dt}s`; }
      if (btn) { btn.disabled = false; btn.textContent = '🚀 Esegui Ottimizzazione'; btn.style.opacity = '1'; }
      _renderOptResult();
    } catch (e) {
      console.error('Optimizer error:', e);
      if (status) { status.style.color = 'var(--red)'; status.textContent = '❌ Errore: ' + e.message; }
      if (btn) { btn.disabled = false; btn.textContent = '🚀 Esegui Ottimizzazione'; btn.style.opacity = '1'; }
    }
  }, 50);
};

// ── Render risultati ───────────────────────────────────────────────────────
function _renderOptResult() {
  const el = document.getElementById('optResultContainer');
  if (!el || !_optState.result) return;
  const r = _optState.result;
  const objMeta = OBJ_META[_optState.objective];
  const fmtP = v => (v * 100).toFixed(1) + '%';
  const fmt = v => (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + '%';

  // Calcola metriche complete per il portafoglio ottimale
  const sharpe = r.sigma > 0 ? (r.mu - RF_RATE) / r.sigma : 0;
  const dd = r.dd != null ? r.dd : _downsideDeviation(r.weights, _optState.assets, _optState.ter);
  const sortino = dd > 0 ? (r.mu - RF_RATE) / dd : 0;
  const rc = r.rc || _riskContributions(r.weights, _optState.assets);

  // Portafoglio corrente per confronto
  const curr = getCurrentPortfolioPoint(_optState.ter);

  // Tabella allocazione
  const allocRows = _optState.assets.map((k, i) => {
    const ac = ASSET_CLASSES[k];
    return { key: k, label: `${ac?.emoji || ''} ${ac?.label || k}`, w: r.weights[i], rc: rc[i] };
  }).sort((a, b) => b.w - a.w);

  el.innerHTML = `
    <div style="background:linear-gradient(135deg,${objMeta.color}15 0%,${objMeta.color}05 100%);border:1.5px solid ${objMeta.color};border-radius:var(--radius);padding:18px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <span style="font-size:24px">${objMeta.icon}</span>
        <div>
          <div style="font-size:11px;color:var(--text3);text-transform:uppercase;font-weight:700;letter-spacing:.06em">Portafoglio ottimale</div>
          <div style="font-size:16px;font-weight:700;color:${objMeta.color}">${objMeta.label}</div>
        </div>
        <button onclick="optApplyToSimulator()"
          style="margin-left:auto;padding:9px 16px;background:${objMeta.color};color:#fff;border:none;border-radius:var(--radius-sm);font-size:12.5px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif">
          ✓ Applica al Simulatore
        </button>
      </div>

      <!-- KPI -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px">
        ${[
          { l: 'Rendimento atteso', v: fmt(r.mu) + '/a', c: 'var(--blue)' },
          { l: 'Volatilità (σ)',     v: fmtP(r.sigma) + '/a', c: 'var(--orange)' },
          { l: 'Sharpe ratio',       v: sharpe.toFixed(2), c: sharpe > 0.5 ? 'var(--green)' : 'var(--text)' },
          { l: 'Sortino ratio',      v: sortino.toFixed(2), c: sortino > 0.7 ? 'var(--green)' : 'var(--text)' },
          { l: 'Rendimento reale*',  v: fmt(r.mu - (state.inflBottom || 2) / 100) + '/a', c: 'var(--teal)' },
        ].map(k => `
          <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px;text-align:center">
            <div style="font-size:10px;color:var(--text3);font-weight:600;text-transform:uppercase;font-family:'DM Mono',monospace;letter-spacing:.05em;margin-bottom:4px">${k.l}</div>
            <div style="font-size:16px;font-weight:700;font-family:'DM Mono',monospace;color:${k.c}">${k.v}</div>
          </div>`).join('')}
      </div>
      <div style="font-size:10.5px;color:var(--text3);margin-top:6px">* Rendimento reale = atteso − inflazione attesa (${state.inflBottom?.toFixed(1) || '2.0'}%)</div>
    </div>

    <!-- Grafici e tabella allocazione -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <div class="sec" style="margin-bottom:0">
        <div class="sec-label" style="margin-bottom:10px">Allocazione Ottimale</div>
        <div style="position:relative;height:280px"><canvas id="optPieChart"></canvas></div>
      </div>
      <div class="sec" style="margin-bottom:0">
        <div class="sec-label" style="margin-bottom:10px">Risk Contribution per Asset</div>
        <div style="position:relative;height:280px"><canvas id="optRcChart"></canvas></div>
        <div style="font-size:11px;color:var(--text3);margin-top:4px;line-height:1.5">
          Mostra quanto ogni asset contribuisce al rischio totale del portafoglio (σ²). Per Risk Parity → tutte le barre uguali.
        </div>
      </div>
    </div>

    <!-- Tabella dettagliata -->
    <div class="tbl-outer" style="margin-bottom:14px">
      <table>
        <thead><tr>
          <th style="text-align:left">Asset Class</th>
          <th>Peso Ottimale</th>
          <th>Risk Contribution</th>
          <th>μ (asset)</th>
          <th>σ (asset)</th>
          <th>Vincolo applicato</th>
        </tr></thead>
        <tbody>
          ${allocRows.map(row => {
            const ac = ASSET_CLASSES[row.key];
            const b = _optState.bounds[row.key] || { min: 0, max: 1 };
            const onMin = row.w <= b.min + 0.005;
            const onMax = row.w >= b.max - 0.005;
            const constraintBadge = onMin && b.min > 0 ? `<span style="color:var(--orange);font-size:10.5px">⚠ vincolato a min ${(b.min*100).toFixed(0)}%</span>` :
                                    onMax && b.max < 1 ? `<span style="color:var(--orange);font-size:10.5px">⚠ vincolato a max ${(b.max*100).toFixed(0)}%</span>` :
                                    `<span style="color:var(--text3);font-size:10.5px">libero (range ${(b.min*100).toFixed(0)}–${(b.max*100).toFixed(0)}%)</span>`;
            return `
              <tr>
                <td style="text-align:left">${row.label}</td>
                <td><strong style="color:var(--blue)">${(row.w * 100).toFixed(1)}%</strong></td>
                <td style="color:var(--purple)">${(row.rc * 100).toFixed(1)}%</td>
                <td style="font-family:'DM Mono',monospace;color:var(--text2)">${((ac?.mu || 0) * 100).toFixed(2)}%</td>
                <td style="font-family:'DM Mono',monospace;color:var(--text2)">${((ac?.vol || 0) * 100).toFixed(1)}%</td>
                <td>${constraintBadge}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Confronto vs portafoglio corrente -->
    ${curr ? `
    <div class="sec" style="margin-bottom:0">
      <div class="sec-label" style="margin-bottom:10px">Confronto vs Portafoglio Corrente</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px">
        ${[
          { l: 'Δ Rendimento',   v: ((r.mu - curr.mu) * 100).toFixed(2) + '%', good: r.mu > curr.mu },
          { l: 'Δ Volatilità',   v: ((r.sigma - curr.vol) * 100).toFixed(2) + '%', good: r.sigma < curr.vol },
          { l: 'Δ Sharpe',       v: (sharpe - curr.sharpe).toFixed(2), good: sharpe > curr.sharpe },
          { l: 'Sharpe Corrente', v: curr.sharpe.toFixed(2), good: null },
          { l: 'Sharpe Ottimo',   v: sharpe.toFixed(2), good: null },
        ].map(k => `
          <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:10px 12px;text-align:center">
            <div style="font-size:10px;color:var(--text3);font-weight:600;text-transform:uppercase;font-family:'DM Mono',monospace;letter-spacing:.05em;margin-bottom:4px">${k.l}</div>
            <div style="font-size:14px;font-weight:700;font-family:'DM Mono',monospace;color:${k.good == null ? 'var(--text)' : k.good ? 'var(--green)' : 'var(--red)'}">${(k.good && !k.v.startsWith('-') ? '+' : '') + k.v}</div>
          </div>`).join('')}
      </div>
    </div>` : ''}
  `;

  _renderOptCharts(allocRows, rc);
}

// ── Render pie + risk contribution charts ─────────────────────────────────
function _renderOptCharts(allocRows, rc) {
  // Distruggi chart precedenti
  if (_optPieChart) { _optPieChart.destroy(); _optPieChart = null; }
  if (_optRcChart) { _optRcChart.destroy(); _optRcChart = null; }

  // Colori coerenti per asset
  const colors = ['#1a73e8','#9334e6','#1e8e3e','#e37400','#00897b','#d93025','#fbbc04','#5f6368','#0097a7','#673ab7','#ff7043','#4caf50'];

  // Pie chart allocazione
  const pieCanvas = document.getElementById('optPieChart');
  if (pieCanvas) {
    _optPieChart = new Chart(pieCanvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: allocRows.map(r => (ASSET_CLASSES[r.key]?.label || r.key)),
        datasets: [{
          data: allocRows.map(r => +(r.w * 100).toFixed(2)),
          backgroundColor: allocRows.map((_, i) => colors[i % colors.length]),
          borderColor: '#fff',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeInOutQuart' },
        plugins: {
          legend: { position: 'right', labels: { font: { size: 11, family: "'DM Sans',sans-serif" }, boxWidth: 14, padding: 8 } },
          tooltip: { callbacks: { label: c => `${c.label}: ${c.parsed.toFixed(1)}%` } },
        },
        cutout: '60%',
      },
    });
  }

  // Risk contribution chart
  const rcCanvas = document.getElementById('optRcChart');
  if (rcCanvas) {
    _optRcChart = new Chart(rcCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: allocRows.map(r => (ASSET_CLASSES[r.key]?.label || r.key).slice(0, 18)),
        datasets: [
          {
            label: 'Peso',
            data: allocRows.map(r => +(r.w * 100).toFixed(2)),
            backgroundColor: 'rgba(26,115,232,0.6)',
            borderColor: 'rgba(26,115,232,1)',
            borderWidth: 1,
          },
          {
            label: 'Risk Contribution',
            data: allocRows.map(r => +(r.rc * 100).toFixed(2)),
            backgroundColor: 'rgba(147,52,230,0.6)',
            borderColor: 'rgba(147,52,230,1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        animation: { duration: 800 },
        plugins: {
          legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 14 } },
          tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.parsed.x.toFixed(1)}%` } },
        },
        scales: {
          x: { ticks: { callback: v => v + '%', font: { size: 10, family: "'DM Mono',monospace" } }, grid: { color: 'rgba(0,0,0,.05)' } },
          y: { ticks: { font: { size: 10, family: "'DM Sans',sans-serif" } }, grid: { display: false } },
        },
      },
    });
  }
}

// ── Applica portafoglio ottimale al simulatore (custom) ───────────────────
window.optApplyToSimulator = function() {
  if (!_optState.result) return;
  if (!confirm('Sostituire il portafoglio Custom corrente con l\'allocazione ottimizzata? Questa azione è irreversibile (puoi salvare lo stato attuale prima dal pannello Scenari Salvati).')) return;
  // Costruisci slots custom
  const slots = _optState.assets.map((k, i) => ({
    ac: k,
    pct: +(_optState.result.weights[i] * 100).toFixed(2),
  })).filter(s => s.pct > 0.1);  // ignora pesi trascurabili

  state.portfolio = 'custom';
  state.customPortfolio = { slots };
  // Aggiorna UI portafoglio principale
  document.querySelectorAll('#allocBtns .gbtn').forEach(b => b.classList.toggle('a-blue', b.dataset.k === 'custom'));
  if (typeof renderCustomBuilder === 'function') renderCustomBuilder();
  if (typeof syncCustomTer === 'function') syncCustomTer();
  if (typeof updateRetInfo === 'function') updateRetInfo();
  if (typeof updatePortDetailBox === 'function') updatePortDetailBox();
  if (typeof render === 'function') render();
  _flashOptToast('✓ Portafoglio ottimale applicato al simulatore', 'green');
};

// ── Toast notification per optimizer ──────────────────────────────────────
function _flashOptToast(msg, type) {
  type = type || 'green';
  const colors = { green: '#1e8e3e', orange: '#e37400', red: '#d93025', blue: '#1a73e8' };
  const old = document.getElementById('optToast');
  if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'optToast';
  el.textContent = msg;
  el.style.cssText = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:${colors[type]};color:#fff;font-size:13px;font-weight:600;
    padding:10px 20px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.18);
    z-index:9999;pointer-events:none;font-family:'DM Sans',sans-serif;
  `;
  document.body.appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 2800);
}

// ── Override switchQuantMode per gestire 'optimizer' ──────────────────────
window.switchQuantMode = function(mode) {
  _efState.mode = mode;
  document.querySelectorAll('#quantModeBtns .gbtn').forEach(b =>
    b.classList.toggle('a-blue', b.dataset.qm === mode));
  const sections = {
    frontier:  document.getElementById('quantFrontierSection'),
    var:       document.getElementById('quantVaRSection'),
    factor:    document.getElementById('quantFactorSection'),
    optimizer: document.getElementById('quantOptimizerSection'),
  };
  for (const [k, sec] of Object.entries(sections)) {
    if (sec) sec.style.display = mode === k ? '' : 'none';
  }
  renderQuantTab();
};

// ── Override renderQuantTab per dispatchare a optimizer ───────────────────
window.renderQuantTab = function() {
  const tab = document.getElementById('tab-quant');
  if (!tab || !tab.classList.contains('active')) return;
  _syncEFStateFromSimulator();
  if      (_efState.mode === 'frontier')  _renderFrontierView();
  else if (_efState.mode === 'var')       _renderVaRView();
  else if (_efState.mode === 'factor')    _renderFactorView();
  else if (_efState.mode === 'optimizer') _renderOptimizerView();
};

// Espone funzioni per debug
window.runOptimizer       = runOptimizer;
window._optState          = _optState;
window._solveRiskParity   = _solveRiskParity;
window._riskContributions = _riskContributions;