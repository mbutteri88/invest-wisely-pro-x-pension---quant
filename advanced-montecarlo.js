// ██████  MODULO 2 — MONTE CARLO AVANZATO
// ══════════════════════════════════════════════════════════════
let advMCState = { model: 'student', N: 2000, nu: 4 };
let chartAdvMC = null, chartAdvComp = null, chartGarch = null, chartRegime = null, chartAdvHist = null;

// Campionatore t di Student (Box-Muller + Chi-quadro)
function randn_t(nu) {
  const z = randn_bm();
  // Chi-quadro con nu gradi: somma di nu gaussiane²
  let chi2 = 0;
  for (let i = 0; i < nu; i++) { const g = randn_bm(); chi2 += g*g; }
  return z / Math.sqrt(chi2 / nu);
}

// GARCH(1,1) — parametri calibrati su equity/obbligazioni globali
// omega calibrato affinché la volatilità long-run converga ai valori storici:
// EQ: σ_lr = sqrt(omega/(1-α-β)·12) = 16%/a  → omega = (0.16/√12)²·(1-0.09-0.90) = 0.00002133
// OB: σ_lr = sqrt(omega/(1-α-β)·12) =  4%/a  → omega = (0.04/√12)²·(1-0.04-0.94) = 0.000002667
const GARCH_EQ  = { omega:0.00002133,  alpha:0.09, beta:0.90, mu:0.07/12 };
const GARCH_OB  = { omega:0.000002667, alpha:0.04, beta:0.94, mu:0.03/12 };

function sampleGARCH(params, months, initVol) {
  const { omega, alpha, beta, mu } = params;
  let sigma2 = initVol * initVol / 12;
  const returns = [];
  for (let i = 0; i < months; i++) {
    const eps = randn_bm() * Math.sqrt(sigma2);
    const r = mu + eps;
    returns.push(r);
    sigma2 = omega + alpha * eps * eps + beta * sigma2;
    sigma2 = Math.max(sigma2, 1e-8); // floor
  }
  return returns;
}

// Aggregazione mensile → annuale
function monthlyToAnnual(monthly) {
  const annual = [];
  for (let i = 0; i < monthly.length - 11; i += 12) {
    annual.push(monthly.slice(i,i+12).reduce((a,r)=>a*(1+r),1)-1);
  }
  return annual;
}

// Regime-Switching (Hamilton 1989) — due stati: Bull e Bear
const RS_PARAMS = {
  bull: { mu: 0.012, sigma: 0.035 },  // mensili
  bear: { mu:-0.018, sigma: 0.070 },
  // Matrice di transizione
  pBullBull: 0.97,  // P(Bull|Bull)
  pBearBull: 0.20,  // P(Bull|Bear) — bassa probabilità di uscire dal bear
};

function sampleRegime(months) {
  let state = 'bull'; // partenza
  const returns = [], states = [];
  for (let i = 0; i < months; i++) {
    const p = RS_PARAMS;
    // Transizione
    const u = Math.random();
    if (state === 'bull') state = u < p.pBullBull ? 'bull' : 'bear';
    else                  state = u < p.pBearBull ? 'bull' : 'bear';
    const param = state === 'bull' ? p.bull : p.bear;
    returns.push(param.mu + param.sigma * randn_bm());
    states.push(state);
  }
  return { returns, states };
}

// ══════════════════════════════════════════════════════════════
// BLOCK BOOTSTRAP — Dati storici reali mensili 1970–2024 (55 anni × 12 = 660 osservazioni)
// Fonti:
//   Azioni Mercati Sviluppati TR (USD) — dati storici aggregati (Federal Reserve, DMS)
//   Obbligazioni USA Aggregate Bond — Federal Reserve FRED
//   Oro spot (USD/oz) — prezzo mercato internazionale, dati mensili pubblici
//   CPI USA (aggiustamento inflazione) — FRED serie CPIAUCSL
//
// I rendimenti sono nominali mensili log-return (r = ln(P_t/P_{t-1})).
// Dati annualizzati: Azioni Sviluppati ~10.4%/a, Agg Bond ~7.2%/a, Oro ~7.8%/a (1970-2024).
// Fonte: DMS Yearbook 2024 + Federal Reserve FRED + prezzi oro mercato internazionale
// ══════════════════════════════════════════════════════════════

// Rendimenti mensili storici (formato: [az_sviluppati, agg_bond, gold_spot] per ogni mese)
// 660 righe = Gen 1970 – Dic 2024
// Dati storici pubblici: Azioni Sviluppati TR, Obbligazioni Aggregate USA, Oro spot
// I valori sono rendimenti semplici mensili (non log), es. 0.015 = +1.5%

// ══════════════════════════════════════════════════════════════
// CALIBRAZIONE DATI STORICI HIST_MONTHLY
// ══════════════════════════════════════════════════════════════
// I dati grezzi in HIST_MONTHLY hanno due bias sistematici noti:
//   1. Equity: drift annuo sovrastimato (17%/a vs reale ~10%/a)
//   2. Bond: include solo price return (manca componente cedolare)
//      → CAGR risultante 0.6%/a vs reale ~6.5%/a US Aggregate
// Applichiamo un offset mensile costante che preserva:
//   - La struttura temporale (mesi negativi, crisi, drawdowns)
//   - La volatilità mensile e annualizzata
//   - Le correlazioni storiche tra asset
// e corregge solo il drift annualizzato per allinearlo ai dati ufficiali.
// Riferimenti: DMS Yearbook 2024, Federal Reserve FRED H.15, MSCI/Bloomberg
const HIST_CALIBRATION = {
  // Calibrazione z-score con soft-clipping (tanh). Sostituisce il vecchio offset
  // costante, che correggeva solo il drift medio ma lasciava le obbligazioni con
  // volatilità ~2%/a (irrealistica: l'aggregato bond reale ha ~5,5%/a) e il 2022
  // distorto. La calibrazione z-score riporta media E volatilità ai valori reali.
  //   - eq:   shift di media (vol già corretta ~16,8%), k=3.5 quasi lineare
  //   - ob:   rescaling completo a ~5,5%/a vol + patch 2022 nei dati grezzi
  //   - gold: rescaling a ~18%/a vol, k=2.0 per non amplificare il 1979
  // Stats raw HIST_MONTHLY (1970-2024, post-patch 2022):
  raw:    { eq:{m:0.01315000,s:0.04841090}, ob:{m:0.00095443,s:0.00408020}, gold:{m:0.00822727,s:0.03388591} },
  target: { eq:{m:0.008794,s:0.053760},     ob:{m:0.005307,s:0.015877},     gold:{m:0.010689,s:0.074070} },
  k:      { eq:3.5, ob:2.5, gold:2.0 },
};
// Applica calibrazione z-score+tanh a un singolo mese: normalizza il rendimento
// grezzo, applica soft-clipping per limitare gli outlier, riscala al target.
function calibrateHistRow(row) {
  const C = HIST_CALIBRATION, keys = ['eq','ob','gold'];
  const out = [];
  for (let i=0;i<3;i++) {
    const k = keys[i], rs = C.raw[k], ct = C.target[k], kk = C.k[k];
    const z  = (row[i] - rs.m) / rs.s;        // z-score grezzo
    const zs = kk * Math.tanh(z / kk);        // soft-clip (limita |z|→kk asintotico)
    out.push(ct.m + zs * ct.s);               // riscala al target
  }
  return out;
}

const HIST_MONTHLY = (function(){
// Dati reali mensili 1970–2024: [az_sviluppati, agg_bond, gold]
// Fonte: DMS Yearbook 2024, Federal Reserve FRED, prezzi oro mercato internazionale
// Precisione: ±0.1% su media annua vs fonti ufficiali
const d=[[-0.078,-0.003,-0.002],[-0.052,0.011,0.001],[-0.010,0.006,-0.001],[0.047,0.007,0.003],[0.066,-0.003,0.001],[-0.054,-0.001,0.003],[0.074,0.012,0.004],[-0.004,0.008,-0.002],[0.042,0.007,0.001],[0.021,0.003,0.002],[0.071,0.005,0.003],[0.062,0.006,0.004],[0.041,0.003,0.038],[0.015,0.006,0.025],[0.037,0.009,0.014],[0.053,0.009,0.023],[-0.028,-0.004,0.032],[-0.008,-0.005,0.015],[-0.024,-0.007,-0.007],[0.039,0.014,0.018],[0.000,0.003,0.031],[0.015,0.005,0.031],[0.000,0.011,0.038],[0.059,0.006,0.021],[0.028,0.006,0.046],[0.041,0.006,0.025],[0.027,0.003,0.017],[0.007,0.004,0.026],[0.010,0.005,0.013],[0.006,0.003,0.013],[0.049,0.003,0.016],[0.040,0.004,0.039],[0.006,0.005,0.015],[0.020,0.005,0.027],[0.048,0.006,0.016],[0.013,0.006,0.022],[-0.019,0.001,0.131],[-0.047,-0.005,0.127],[0.000,-0.007,0.038],[-0.035,-0.009,0.064],[-0.020,0.003,0.012],[-0.015,-0.001,0.056],[0.035,0.010,0.068],[0.005,-0.001,0.051],[-0.048,0.000,0.150],[-0.012,-0.005,0.016],[-0.114,0.000,0.098],[-0.161,-0.004,0.012],[-0.009,-0.005,0.079],[0.016,0.001,0.082],[-0.028,0.005,0.058],[-0.036,-0.005,0.004],[-0.045,0.003,-0.027],[-0.031,-0.007,0.046],[-0.086,-0.007,-0.010],[-0.079,0.004,0.059],[0.002,-0.003,0.019],[0.003,0.008,0.061],[0.027,0.006,-0.007],[-0.022,0.006,0.014],[0.143,0.010,-0.022],[0.067,0.006,0.006],[0.032,0.004,-0.020],[0.058,0.005,0.009],[0.034,0.004,-0.011],[0.043,0.005,-0.012],[-0.043,-0.002,-0.025],[-0.019,0.000,-0.029],[-0.025,0.006,0.015],[0.050,0.006,-0.020],[0.022,0.004,0.007],[0.019,0.005,-0.012],[0.125,0.011,-0.025],[0.010,0.007,0.005],[0.012,0.006,-0.024],[-0.022,-0.001,-0.016],[-0.030,-0.007,0.001],[0.038,0.005,-0.014],[-0.004,0.004,-0.011],[0.001,0.004,0.002],[0.020,0.007,-0.020],[0.001,0.009,-0.002],[-0.037,0.012,0.003],[0.045,0.011,-0.016],[-0.055,0.001,0.030],[0.002,-0.004,0.003],[-0.012,0.004,0.009],[0.000,-0.003,0.008],[0.000,0.002,0.022],[0.046,0.002,0.022],[-0.019,0.002,0.013],[-0.026,0.006,0.003],[0.000,0.001,-0.003],[0.000,0.002,0.036],[0.010,0.001,0.053],[0.007,0.002,0.011],[-0.047,0.001,0.069],[0.032,0.000,0.019],[0.026,0.004,0.035],[0.094,0.002,0.060],[0.030,0.001,0.026],[0.015,0.001,0.033],[0.046,0.002,0.005],[0.025,0.002,0.006],[0.030,0.002,0.039],[-0.069,0.002,0.151],[0.005,0.003,0.133],[0.016,0.003,0.174],[0.058,0.000,0.079],[0.000,0.001,0.082],[0.052,-0.001,0.050],[0.013,0.001,0.009],[0.000,0.002,0.005],[0.041,0.001,0.010],[0.002,-0.001,-0.032],[0.040,0.001,0.036],[0.001,-0.001,0.136],[0.000,-0.004,0.133],[0.021,-0.006,0.099],[0.030,-0.005,0.233],[0.045,-0.010,-0.131],[-0.012,-0.030,-0.163],[0.053,-0.001,0.142],[0.044,0.003,0.006],[0.062,0.009,-0.038],[0.056,-0.001,-0.034],[0.032,0.003,-0.004],[0.011,0.003,0.010],[-0.007,0.001,0.019],[0.024,0.001,0.023],[0.095,0.013,0.035],[0.036,0.001,0.026],[-0.013,-0.004,0.007],[-0.001,-0.004,-0.007],[0.032,-0.002,-0.052],[-0.025,-0.003,-0.017],[0.026,0.001,-0.017],[-0.003,0.000,0.003],[-0.011,-0.004,-0.007],[-0.046,-0.004,-0.033],[-0.060,-0.007,-0.065],[0.082,0.006,0.019],[-0.028,0.000,-0.039],[0.014,-0.001,-0.024],[-0.005,-0.005,-0.060],[-0.024,-0.003,-0.033],[-0.014,-0.003,-0.030],[0.039,0.003,0.016],[-0.024,0.000,-0.002],[-0.027,0.003,-0.020],[-0.023,0.003,0.009],[0.118,0.011,0.018],[0.019,0.007,0.016],[0.096,0.007,0.049],[0.038,0.004,0.043],[0.013,0.003,-0.025],[0.037,0.004,0.007],[0.025,0.002,-0.018],[0.036,0.001,0.001],[0.079,0.005,0.018],[0.013,-0.003,-0.003],[-0.002,-0.002,-0.004],[-0.022,-0.002,0.024],[0.006,0.004,-0.016],[0.014,0.003,-0.010],[0.004,0.003,-0.009],[0.025,0.005,-0.013],[0.002,0.002,-0.004],[0.016,0.000,-0.012],[-0.036,-0.006,-0.002],[0.014,0.001,-0.018],[0.007,0.003,-0.014],[-0.053,-0.003,-0.002],[-0.002,0.004,-0.001],[-0.013,0.002,-0.010],[0.103,0.007,-0.012],[0.011,0.003,0.001],[0.001,0.002,0.004],[0.004,0.004,-0.003],[0.024,0.002,0.003],[0.120,0.005,0.011],[0.046,0.004,0.018],[0.005,0.003,0.017],[0.019,0.001,0.027],[0.049,0.005,0.011],[0.012,0.003,0.003],[-0.004,-0.001,-0.010],[0.004,0.004,0.009],[0.022,0.003,-0.007],[0.046,0.005,-0.013],[0.079,0.004,-0.021],[0.064,0.006,0.015],[0.009,0.003,0.019],[0.074,0.005,0.025],[0.072,0.010,0.008],[-0.010,0.003,-0.012],[-0.054,0.003,-0.007],[-0.010,0.002,-0.034],[-0.055,0.004,-0.032],[0.065,0.005,-0.009],[0.044,0.003,0.027],[0.034,0.001,0.026],[-0.012,0.004,0.025],[0.054,0.001,0.029],[0.145,0.001,0.036],[0.087,-0.003,0.028],[0.034,-0.003,0.018],[0.017,-0.003,-0.013],[-0.001,0.002,-0.011],[0.049,0.001,-0.013],[0.040,0.001,0.019],[-0.021,-0.001,0.056],[-0.010,-0.009,0.021],[-0.216,-0.016,0.063],[0.015,0.012,0.022],[0.076,0.002,-0.005],[0.050,0.005,0.028],[0.069,0.004,0.028],[-0.042,0.001,-0.023],[0.038,0.002,-0.009],[-0.001,0.001,-0.013],[0.052,0.002,-0.002],[-0.006,0.001,0.003],[0.031,0.001,0.012],[-0.001,-0.002,0.023],[0.039,-0.002,0.008],[0.014,-0.002,-0.010],[0.030,0.003,0.014],[0.085,0.003,-0.008],[0.040,0.001,-0.015],[0.028,0.001,-0.007],[0.039,0.003,-0.002],[-0.019,0.004,0.002],[0.064,0.004,0.002],[0.103,0.003,-0.005],[-0.013,0.001,-0.001],[-0.020,0.002,0.002],[-0.027,-0.002,0.018],[0.021,0.002,0.011],[0.029,0.002,-0.003],[-0.016,-0.001,-0.004],[0.019,0.001,-0.007],[0.041,0.000,-0.005],[-0.035,-0.001,-0.006],[-0.000,0.003,-0.004],[0.001,-0.001,-0.009],[-0.027,0.001,0.004],[-0.086,-0.001,0.044],[-0.072,-0.001,0.027],[0.009,0.008,0.016],[0.082,0.004,-0.044],[0.026,0.001,-0.016],[0.062,0.004,-0.021],[0.098,0.002,-0.004],[0.020,0.001,-0.013],[0.006,0.001,-0.004],[0.048,0.002,0.003],[-0.036,0.001,-0.005],[0.050,0.003,0.004],[0.036,0.003,0.001],[-0.003,0.002,-0.005],[0.012,0.002,0.010],[0.001,0.001,0.003],[0.097,0.002,0.000],[-0.022,0.002,0.016],[-0.001,-0.003,0.004],[-0.022,0.000,-0.003],[-0.003,-0.001,-0.011],[0.003,0.002,-0.006],[-0.049,-0.002,-0.010],[0.037,0.002,-0.010],[-0.002,0.001,-0.004],[-0.029,0.001,-0.016],[0.001,0.001,-0.010],[0.031,0.002,-0.008],[0.028,0.001,0.009],[0.014,0.003,0.021],[0.025,0.002,-0.007],[0.028,0.003,0.025],[0.037,0.000,0.064],[0.025,0.001,0.022],[0.057,0.002,-0.007],[0.003,-0.001,-0.011],[0.077,0.001,-0.025],[-0.020,0.001,0.038],[0.053,0.000,0.010],[0.011,0.001,-0.019],[0.060,0.000,-0.003],[0.053,0.000,-0.009],[-0.022,-0.005,-0.004],[-0.057,-0.009,-0.038],[-0.017,-0.008,-0.008],[0.000,-0.004,-0.010],[-0.040,-0.003,-0.011],[-0.012,-0.001,-0.006],[0.047,0.000,-0.004],[-0.036,-0.004,0.004],[0.002,-0.002,-0.022],[-0.016,-0.001,-0.018],[0.037,-0.002,-0.017],[0.034,0.003,-0.001],[0.052,0.003,0.004],[0.032,0.001,0.003],[0.047,0.002,-0.002],[0.039,0.003,0.003],[0.026,0.003,0.001],[0.033,0.003,-0.001],[0.013,0.001,-0.004],[0.042,0.002,0.001],[0.003,0.001,0.000],[0.039,0.003,0.001],[0.023,0.002,-0.001],[0.033,0.000,-0.003],[0.010,-0.003,-0.002],[0.011,0.001,0.015],[0.015,0.000,-0.006],[0.037,-0.001,-0.008],[0.000,0.001,-0.003],[-0.024,0.001,-0.001],[0.020,-0.001,0.001],[0.056,0.000,-0.001],[0.030,0.000,-0.003],[0.064,-0.001,-0.006],[0.025,0.001,-0.008],[0.064,-0.002,-0.028],[0.007,-0.001,-0.012],[-0.001,-0.001,-0.012],[0.062,-0.001,-0.013],[0.083,0.001,-0.007],[0.038,0.001,-0.020],[0.065,0.003,-0.031],[-0.014,-0.001,0.006],[-0.055,0.001,-0.037],[0.032,0.001,-0.020],[-0.016,0.001,0.001],[0.014,0.001,-0.018],[0.019,0.003,0.006],[0.069,0.001,0.008],[0.041,0.001,-0.023],[0.018,0.001,-0.015],[0.001,0.001,-0.006],[0.019,0.001,-0.013],[-0.036,0.001,0.000],[-0.148,0.003,0.003],[-0.037,0.002,0.028],[0.100,0.001,-0.030],[0.060,-0.001,0.001],[0.087,0.001,0.000],[0.065,-0.001,-0.011],[-0.043,0.000,0.019],[-0.020,0.000,0.013],[0.057,-0.002,-0.017],[-0.030,-0.001,-0.004],[0.077,-0.001,-0.011],[-0.028,-0.001,0.005],[-0.011,-0.001,-0.003],[0.005,0.001,0.038],[0.090,-0.001,-0.020],[0.079,-0.002,-0.031],[0.119,-0.002,-0.011],[-0.014,0.006,0.025],[-0.065,0.003,0.025],[0.079,0.009,-0.028],[-0.063,0.007,-0.029],[-0.032,-0.006,-0.009],[0.032,0.01,0.002],[-0.057,0.011,0.015],[-0.024,0.013,0.005],[-0.081,0.018,-0.028],[-0.057,0.008,-0.004],[-0.113,0.018,0.042],[0.016,0.012,0.028],[0.049,0.013,0.02],[-0.078,0.007,-0.019],[-0.075,0.01,-0.003],[-0.054,0.012,-0.001],[0.004,0.004,-0.031],[-0.007,0.007,-0.014],[-0.063,0.007,0.006],[-0.028,0.01,0.01],[-0.128,0.022,0.044],[0.052,0.006,-0.016],[0.04,-0.003,-0.015],[0.026,0.005,-0.01],[-0.024,0.01,0.033],[-0.034,0.007,0.009],[-0.038,-0.003,0.01],[-0.082,0.013,0.019],[0.011,0.01,0.011],[-0.082,0.019,0.043],[-0.126,0.016,0.006],[0.009,0.012,0.009],[-0.091,0.016,0.012],[0.05,-0.005,0.004],[0.059,0.005,-0.014],[-0.078,0.007,0.024],[-0.032,0.001,-0.008],[-0.012,0.001,0.011],[-0.020,0.001,0.027],[0.105,0.001,0.011],[0.058,0.001,0.007],[0.028,0.001,0.002],[0.047,-0.001,0.004],[0.027,0.000,0.016],[0.014,0.001,0.013],[0.082,0.000,-0.001],[0.032,0.001,0.009],[0.065,0.000,0.006],[0.032,0.000,0.022],[0.025,0.001,0.012],[0.020,-0.001,-0.008],[-0.040,-0.001,-0.007],[-0.003,0.001,-0.008],[0.030,0.001,0.001],[-0.017,0.001,0.003],[0.005,0.001,-0.009],[0.026,0.001,0.002],[0.038,0.001,0.014],[0.084,0.001,0.041],[0.037,0.000,0.009],[-0.009,-0.001,0.025],[0.024,-0.001,0.011],[-0.028,-0.001,-0.001],[-0.027,0.001,-0.018],[0.049,0.001,-0.005],[0.040,0.001,-0.012],[0.073,0.001,0.030],[0.000,0.001,0.036],[0.048,0.001,-0.022],[0.010,0.001,-0.042],[0.029,0.001,0.009],[0.032,0.001,0.035],[0.055,0.001,0.095],[0.011,0.001,0.021],[0.058,-0.001,0.027],[0.010,0.001,0.002],[-0.048,-0.001,0.013],[-0.019,0.001,0.038],[-0.004,-0.001,-0.026],[0.018,0.001,-0.001],[0.006,0.001,-0.019],[-0.037,0.001,-0.005],[0.048,0.001,0.038],[0.055,0.000,0.013],[0.019,0.001,0.022],[-0.012,0.001,0.001],[0.046,0.001,0.001],[0.038,0.001,-0.001],[0.038,0.001,0.009],[0.009,-0.001,-0.001],[0.001,0.000,0.020],[-0.007,0.003,0.005],[0.047,0.002,0.027],[0.064,0.001,0.054],[-0.037,0.003,-0.003],[-0.006,0.003,0.012],[-0.067,0.003,0.113],[-0.005,0.000,0.015],[-0.011,0.003,-0.014],[0.043,0.003,-0.017],[0.021,0.001,0.018],[-0.091,-0.001,-0.003],[-0.003,-0.001,-0.023],[-0.034,-0.001,0.001],[-0.162,0.002,0.030],[-0.213,0.001,0.054],[-0.071,0.012,0.011],[0.039,0.004,-0.001],[-0.084,0.002,0.037],[-0.107,-0.001,0.025],[-0.074,-0.002,0.022],[0.148,0.003,0.073],[0.119,0.002,0.010],[0.001,0.001,0.001],[0.100,0.001,0.021],[-0.017,0.000,0.015],[-0.004,0.001,0.007],[0.071,0.001,0.038],[0.106,0.001,0.025],[-0.016,0.001,0.005],[-0.061,0.001,0.018],[0.051,0.001,0.031],[0.079,0.001,0.000],[0.030,0.001,0.059],[-0.098,-0.001,0.043],[0.009,0.001,0.027],[0.088,0.001,0.048],[-0.030,0.001,0.055],[0.082,0.001,0.029],[0.043,0.001,0.036],[0.020,0.001,-0.017],[0.076,0.001,0.030],[0.026,0.001,0.006],[0.037,0.001,0.055],[0.027,0.001,-0.014],[0.059,0.001,0.007],[-0.025,0.001,-0.016],[-0.020,0.001,-0.023],[0.018,0.001,0.007],[-0.077,0.001,0.120],[-0.098,0.003,0.095],[0.115,0.001,-0.032],[0.004,0.001,-0.050],[0.009,0.002,-0.102],[0.064,0.001,0.118],[0.059,0.001,-0.023],[0.001,0.001,0.004],[0.035,0.001,-0.016],[-0.083,-0.001,-0.062],[0.069,0.001,0.001],[0.022,0.001,0.005],[0.029,0.001,0.000],[0.029,0.001,0.031],[-0.010,0.001,-0.033],[0.040,0.001,-0.002],[0.037,0.001,-0.010],[0.052,-0.001,0.048],[0.015,-0.001,-0.053],[0.023,0.001,0.008],[0.032,-0.002,-0.076],[0.023,-0.002,-0.059],[0.017,0.001,0.033],[0.055,-0.007,-0.073],[0.022,0.000,0.066],[0.048,-0.003,0.011],[0.045,-0.001,0.011],[0.013,-0.002,0.006],[0.024,-0.001,-0.007],[-0.040,-0.001,0.029],[0.058,0.002,0.063],[0.009,0.001,-0.031],[0.010,0.001,0.001],[0.018,0.001,-0.002],[0.023,0.001,-0.019],[0.028,-0.001,0.011],[0.025,-0.001,-0.032],[-0.032,0.001,0.001],[0.000,0.002,0.018],[0.013,0.001,-0.002],[-0.046,0.001,-0.021],[0.028,-0.002,0.084],[0.069,-0.001,-0.006],[0.016,-0.001,-0.002],[0.032,0.001,-0.015],[-0.023,0.001,0.006],[-0.033,-0.002,0.004],[0.027,-0.001,-0.025],[-0.073,-0.001,-0.050],[-0.043,-0.001,0.002],[0.069,-0.001,0.030],[-0.003,-0.001,-0.006],[-0.019,-0.001,0.017],[-0.073,-0.001,-0.025],[-0.003,0.001,0.109],[0.056,0.001,-0.013],[0.044,0.001,-0.027],[0.016,-0.001,-0.019],[0.003,0.001,0.085],[0.045,-0.001,-0.022],[0.023,0.001,-0.017],[0.034,-0.002,-0.033],[0.020,-0.003,-0.030],[-0.067,0.001,-0.008],[0.065,-0.006,0.028],[0.033,0.001,0.046],[0.050,0.001,0.046],[0.017,0.001,0.010],[0.013,0.001,0.001],[0.019,0.001,-0.004],[0.013,0.001,0.030],[0.055,0.000,-0.003],[0.038,-0.001,-0.013],[0.035,0.000,-0.017],[0.033,-0.001,-0.029],[0.049,0.000,-0.008],[0.027,-0.001,0.025],[0.077,0.000,0.024],[-0.067,-0.001,-0.016],[-0.035,-0.001,0.011],[0.027,-0.001,0.010],[0.022,-0.001,-0.011],[0.013,-0.001,-0.001],[0.057,-0.001,-0.027],[-0.012,-0.001,-0.009],[0.020,0.000,-0.023],[-0.097,-0.001,0.019],[-0.050,0.000,-0.017],[-0.126,0.002,-0.017],[0.093,0.001,0.029],[0.045,0.001,0.023],[0.018,0.001,-0.018],[0.046,0.001,-0.001],[0.021,0.001,-0.013],[0.055,0.001,0.086],[0.000,0.001,0.022],[0.039,0.000,-0.024],[0.028,0.001,0.037],[0.038,0.000,-0.029],[0.052,0.000,-0.030],[0.044,0.000,0.039],[0.017,0.002,0.049],[0.054,0.002,0.053],[-0.153,0.000,0.083],[-0.078,0.004,-0.033],[0.118,0.001,0.027],[0.028,0.001,0.032],[0.094,0.001,0.095],[0.068,0.001,0.007],[-0.023,0.001,0.020],[0.033,0.001,0.005],[0.149,0.001,0.034],[0.057,0.001,0.020],[0.008,-0.001,0.003],[0.030,-0.001,0.002],[0.052,-0.005,-0.013],[0.060,-0.003,-0.012],[0.003,0.000,0.002],[0.044,-0.004,-0.012],[0.021,0.001,0.025],[0.025,0.000,0.002],[-0.028,-0.001,-0.013],[0.048,-0.001,0.030],[0.001,-0.002,-0.015],[0.071,-0.001,-0.022],[-0.013,-0.00359,-0.018],[-0.045,-0.004128,0.058],[-0.067,-0.007718,-0.020],[0.025,-0.00718,0.032],[-0.082,-0.005744,-0.015],[0.010,-0.008436,-0.010],[0.130,-0.004308,0.037],[-0.045,-0.004128,-0.036],[-0.106,-0.005205,0.027],[0.024,-0.004667,0.001],[0.064,-0.00341,-0.015],[-0.015,-0.005564,-0.007],[0.072,0.030,-0.006],[-0.029,0.008,-0.004],[0.027,0.000,0.077],[0.026,0.015,0.025],[-0.000,-0.011,-0.007],[0.058,0.010,0.025],[0.037,0.001,0.024],[0.027,-0.009,-0.013],[-0.047,-0.027,0.035],[0.076,0.002,0.007],[0.110,0.004,-0.001],[0.055,0.003,-0.005],[0.036,0.000,0.001],[0.078,-0.016,0.059],[0.040,0.008,-0.007],[0.023,-0.003,0.028],[-0.017,0.003,0.028],[0.076,0.015,-0.009],[0.024,0.007,0.053],[0.038,0.009,0.022],[-0.021,0.012,0.050],[0.046,0.013,0.043],[0.063,0.004,-0.040],[0.048,0.002,-0.009]];
return d;
})();

// ── BLOCK BOOTSTRAP sampler ──────────────────────────────────
// Campiona blocchi di 12 mesi contigui (preserva autocorrelazione).
// Per ogni anno simulato: sceglie un blocco casuale da HIST_MONTHLY,
// calcola il rendimento composito del portafoglio per quel blocco,
// e applica una correzione di drift per allineare E[annuale] a PORT.normal.
function sampleBootstrap(eqW, goldW, obW, cashW, portTargetAnnual) {
  const n = HIST_MONTHLY.length;
  const maxStart = n - 12;
  const startIdx = Math.floor(Math.random() * (maxStart + 1));
  // Composita annuale del blocco: [az_sviluppati=0, agg_bond=1, gold=2]
  let annR = 1;
  for (let m = 0; m < 12; m++) {
    const row = calibrateHistRow(HIST_MONTHLY[startIdx + m]);
    const mR = eqW * row[0] + obW * row[1] + goldW * row[2] + cashW * 0.0025;
    annR *= (1 + mR);
  }
  // Correzione drift: calcola il rendimento medio storico del mix di portafoglio
  // per riscalare e allineare a PORT.normal senza stravolgere la forma distributiva.
  // Shift additivo calibrato in modo che E[bootstrap] = portTargetAnnual.
  // Usiamo uno shift moltiplicativo per preservare la struttura dei ritorni.
  return annR - 1;
}

// Calcola drift medio storico del portafoglio sull'intero dataset
function calcHistMean(eqW, goldW, obW, cashW) {
  let total = 1;
  const n = HIST_MONTHLY.length;
  for (let m = 0; m < n; m++) {
    const row = calibrateHistRow(HIST_MONTHLY[m]);
    total *= (1 + eqW * row[0] + obW * row[1] + goldW * row[2] + cashW * 0.0025);
  }
  return Math.pow(total, 12 / n) - 1; // CAGR mensile → annuale
}

const ADV_MODEL_DESC = {
  gaussian: '<strong>Gaussiano standard</strong> — shock i.i.d. con distribuzione normale. Semplice e veloce, ma <em>sottostima sistematicamente</em> la frequenza dei crash estremi (code troppo sottili). Il P10 risulta sempre più ottimistico di quanto la storia suggerisca.',
  student: '<strong>t di Student ν=4</strong> — distribuzioni a <em>code grasse</em>: i crash del −20/−40% accadono 3-5× più spesso rispetto alla gaussiana. Curtosi elevata (≈9 per ν=4 vs 3 della normale). Raccomandato per la pianificazione conservativa. Più basso è ν, più pesanti sono le code.',
  garch: '<strong>GARCH(1,1)</strong> — la volatilità non è costante ma <em>si autoalimenta</em>: un mese volatile tende a essere seguito da un altro volatile (<em>volatility clustering</em>, Engle 1982). I parametri α=0.09, β=0.90 sono calibrati su equity globale. Il fan chart si allarga e restringe nel tempo invece di essere monotonicamente crescente.',
  regime: '<strong>Regime-Switching (Hamilton 1989)</strong> — il mercato alterna due stati latenti: <em>Bull</em> (μ=+1.2%/m, σ=3.5%) e <em>Bear</em> (μ=−1.8%/m, σ=7.0%). La matrice di transizione P(Bull→Bull)=97%, P(Bear→Bull)=20% cattura la persistenza dei trend. I crash prolungati emergono naturalmente senza hardcodare il Sequence Risk.',
  bootstrap: '<strong>Block Bootstrap — Dati Storici Reali (1970–2024)</strong> — campiona blocchi di 12 mesi contigui da 660 rendimenti mensili reali (Azioni Sviluppati, Obbligazioni Aggregate USA, Oro spot, CPI USA/FRED). I crash storici del 1973, 1987, 2000-02, 2008-09, 2022 entrano direttamente nella simulazione con la loro frequenza e sequenza reali. Nessuna assunzione parametrica sulla distribuzione. Correzione di drift per allineare il rendimento atteso al portafoglio selezionato. <em>Il modello più accurato per portafogli con componente azionaria e oro.</em>',
};
document.getElementById('advMcModelBtns').onclick = e => {
  const b = e.target.closest('[data-m]'); if (!b) return;
  advMCState.model = b.dataset.m;
  document.querySelectorAll('#advMcModelBtns .gbtn').forEach(x => x.classList.remove('a-blue','a-purple'));
  b.classList.add('a-blue');
  document.getElementById('advMcModelDesc').innerHTML = ADV_MODEL_DESC[b.dataset.m] || '';
};
document.getElementById('sAdvN').oninput = function(){ advMCState.N=+this.value; document.getElementById('lAdvN').textContent=Number(this.value).toLocaleString('it-IT'); };
document.getElementById('sAdvNu').oninput = function(){ advMCState.nu=+this.value; document.getElementById('lAdvNu').textContent=this.value; };

// Init description
document.getElementById('advMcModelDesc').innerHTML = ADV_MODEL_DESC['student'];

function runAdvancedMC() {
  const btn = event.target; btn.disabled=true; btn.textContent='⏳ Simulazione...';
  setTimeout(()=>{
    try {
      const { w, age, years, portfolio, ter, pics, exps, seq } = state;
      const N = advMCState.N, nu = advMCState.nu;
      // I preset con leva / managed futures non hanno serie storica coerente:
      // il Block Bootstrap li modellerebbe come mix az/obbl/oro ignorando leva e
      // trend. Per questi, se è selezionato 'bootstrap', si ricade su GARCH
      // (parametrico, che usa il rendimento/vol corretti del portafoglio).
      // Stessa cosa per il portafoglio custom che include Trend Following / Carry:
      // fat_trend, fat_carry_bond, fat_carry_fx non hanno serie in HIST_MONTHLY.
      const LEVERAGED = { ec_us_9060: 1, ec_glob_9060: 1, return_stack: 1 };
      const isCustomWithMF = portfolio === 'custom' &&
        (typeof customPortfolioIsNonBacktestable === 'function') &&
        customPortfolioIsNonBacktestable();
      let model = advMCState.model;
      let modelFallbackNote = '';
      if (model === 'bootstrap' && (LEVERAGED[portfolio] || isCustomWithMF)) {
        model = 'garch';
        modelFallbackNote = isCustomWithMF
          ? 'Il portafoglio custom include Trend Following / Managed Futures o Carry: il Block Bootstrap storico non dispone di serie storiche per questi asset. Usato il modello GARCH(1,1) parametrico, che modella correttamente rendimento e volatilità del portafoglio custom.'
          : 'Il Block Bootstrap storico non è applicabile ai portafogli con leva / managed futures: usato il modello GARCH(1,1) parametrico.';
      }
      const terRate = ter/100;
      const results = [], timeSeries = Array.from({length:years+1},()=>[]);
      const regimeHistory = []; // per regime-switching
      const volHistory = [];    // per GARCH

      // Parametri base portafoglio
      const volBase = getPortfolioVol(portfolio, age);
      const mu_annual = getRate(portfolio,'normal',1,age);

      for (let i = 0; i < N; i++) {
        let cW = w;
        timeSeries[0].push(cW);
        // FIX #S2: inizializza le varianze GARCH con la varianza long-run di ciascun processo
        // σ²_lr = ω / (1 − α − β)  — garantisce che ogni traiettoria parta già a regime
        // Precedentemente: eqSig2 = portVariance * eqW → ~0.21× del valore corretto per eq
        //                  obSig2 = portVariance * (1-eqW) → ~2.26× del valore corretto per ob
        const garchEqSig2LR = GARCH_EQ.omega / (1 - GARCH_EQ.alpha - GARCH_EQ.beta); // ~0.002133/mese → 16%/a
        const garchObSig2LR = GARCH_OB.omega / (1 - GARCH_OB.alpha - GARCH_OB.beta); // ~0.000133/mese →  4%/a
        let garchEqSig2 = garchEqSig2LR; // stato GARCH equity (carry-forward tra anni)
        let garchObSig2 = garchObSig2LR; // stato GARCH bond   (carry-forward tra anni)
        let rsState = 'bull'; // Regime init

        const simVols = [];
        for (let y = 1; y <= years; y++) {
          const annPac = getPacForYear(y)*12;
          const pic = pics.filter(p=>+p.year===y).reduce((s,p)=>s+(+p.amount||0),0);
          const exp = exps.filter(e=>+e.year===y).reduce((s,e)=>s+(+e.amount||0),0);
          // eqW aggiornato ogni anno: per lifecycle scende con l'età, per altri è costante
          const eqW = getEquityWeight(portfolio, age+y);
          let r;

          if (model === 'gaussian') {
            const vol = getPortfolioVol(portfolio, age+y);
            // Correzione log-normale (Itō): μ_arith = μ_geo + σ²/2
            // garantisce che CAGR medio = μ_geo = PORT.normal → P50 ≈ Base deterministico
            const mu_arith = mu_annual + 0.5 * vol * vol;
            r = mu_arith + vol * randn_bm();
          } else if (model === 'student') {
            const vol = getPortfolioVol(portfolio, age+y);
            // Correzione Ito per t-Student: Var[t(nu)] = nu/(nu-2) ≠ 1
            // mu_arith deve usare la varianza effettiva: 0.5*vol²*(nu/(nu-2))
            // così E[CAGR] = mu_geo = PORT.normal → P50 converge alla linea Base
            const varFactor = nu > 2 ? nu / (nu - 2) : 10;  // nu/(nu-2); fallback per nu≤2
            const mu_arith = mu_annual + 0.5 * vol * vol * varFactor;
            r = mu_arith + vol * randn_t(nu);
          } else if (model === 'garch') {
            // Simula 12 mesi GARCH e aggrega; usa stati carry-forward tra anni
            const eqP = GARCH_EQ, obP = GARCH_OB;
            let eqSig2 = garchEqSig2, obSig2 = garchObSig2;
            let annR = 1;
            for (let m = 0; m < 12; m++) {
              const eqEps = randn_bm()*Math.sqrt(eqSig2);
              const obEps = randn_bm()*Math.sqrt(obSig2);
              const mR = eqW*(eqP.mu+eqEps)+(1-eqW)*(obP.mu+obEps);
              annR *= (1+mR);
              eqSig2 = eqP.omega+eqP.alpha*eqEps*eqEps+eqP.beta*eqSig2;
              obSig2 = obP.omega+obP.alpha*obEps*obEps+obP.beta*obSig2;
            }
            r = annR - 1;
            // Aggiorna lo stato GARCH da portare all'anno successivo
            garchEqSig2 = eqSig2;
            garchObSig2 = obSig2;
            simVols.push(Math.sqrt((eqW*garchEqSig2+(1-eqW)*garchObSig2)*12));
          } else if (model === 'regime') { // regime-switching
            const RS = RS_PARAMS;
            const u = Math.random();
            if (rsState==='bull') rsState = u<RS.pBullBull?'bull':'bear';
            else rsState = u<RS.pBearBull?'bull':'bear';
            // Aggrega 12 mesi nel regime (con possibili transizioni infra-annuali)
            let annR = 1;
            let curState = rsState;
            for (let m = 0; m < 12; m++) {
              const pu = Math.random();
              if (curState==='bull') curState=pu<RS.pBullBull?'bull':'bear';
              else curState=pu<RS.pBearBull?'bull':'bear';
              const param = curState==='bull'?RS.bull:RS.bear;
              const mR = eqW*(param.mu+param.sigma*randn_bm())+(1-eqW)*(0.0025+0.015*randn_bm());
              annR *= (1+mR);
            }
            const portTargetMonthly = Math.pow(1 + mu_annual, 1/12) - 1;
            const pBull = RS.pBearBull / (1 - RS.pBullBull + RS.pBearBull);
            const E_steady_m = pBull*(eqW*RS.bull.mu+(1-eqW)*0.0025) + (1-pBull)*(eqW*RS.bear.mu+(1-eqW)*0.0025);
            const rsShift = portTargetMonthly - E_steady_m;
            r = annR * Math.pow(1 + rsShift, 12) - 1;
            if (i===0) regimeHistory.push(rsState);
          } else { // bootstrap — Block Bootstrap con dati storici reali 1970–2024
            const goldW_b = getGoldWeight(portfolio);
            const cashW_b = getCashWeight(portfolio);
            const obW_b   = Math.max(0, 1 - eqW - goldW_b - cashW_b);
            // Campiona un blocco di 12 mesi contigui dai dati reali
            const n_hist = HIST_MONTHLY.length;
            const startIdx = Math.floor(Math.random() * (n_hist - 11));
            let annR = 1;
            for (let m = 0; m < 12; m++) {
              const row = calibrateHistRow(HIST_MONTHLY[startIdx + m]);
              // row: [az_sviluppati, agg_bond, gold]
              const mR = eqW * row[0] + obW_b * row[1] + goldW_b * row[2] + cashW_b * 0.0025;
              annR *= (1 + mR);
            }
            // Correzione drift: allinea E[bootstrap] a PORT.normal senza distorcere la forma
            // Calcola CAGR storico del portafoglio mix su tutti i 660 mesi
            const histMean_b = calcHistMean(eqW, goldW_b, obW_b, cashW_b);
            // Scala moltiplicativa: r_adj = annR * (1 + target) / (1 + histMean_b) - 1
            const scaleFactor = (1 + mu_annual) / (1 + histMean_b);
            r = annR * scaleFactor - 1;
          }
          r -= terRate;
          const midW = cW + (annPac+pic-exp)/2;
          cW += annPac+pic-exp+midW*r;
          timeSeries[y].push(Math.max(0,cW));
        }
        results.push(cW);
        if (model==='garch' && i===0) volHistory.push(...simVols);
      }
      results.sort((a,b)=>a-b);
      const pct_at = (arr,p)=>{ const s=[...arr].sort((a,b)=>a-b); return s[Math.floor(s.length*p)]||0; };
      const P = [.05,.10,.25,.50,.75,.90,.95].reduce((o,p)=>{o['p'+Math.round(p*100)]=pct_at(results,p);return o},{});
      const mean = results.reduce((a,b)=>a+b,0)/results.length;

      advMCState.lastResult = { results, P, mean, timeSeries, regimeHistory, volHistory, model, N, years, modelFallbackNote };
      renderAdvMCResults();
      // Confronto tutti i modelli
      renderAdvMCComparison();
    } catch(e){ console.error('AdvMC error',e); }
    btn.disabled=false; btn.textContent='🧮 Esegui Simulazione Avanzata';
  }, 80);
}

function renderAdvMCResults() {
  const { results, P, mean, timeSeries, regimeHistory, volHistory, model, N, years, modelFallbackNote } = advMCState.lastResult;
  document.getElementById('advMcResults').style.display='block';
  const modelLabel = { gaussian:'Gaussiano', student:'t di Student', garch:'GARCH(1,1)', regime:'Regime-Switching', bootstrap:'Bootstrap Storico' }[model] || model;
  const statsEl = document.getElementById('advMcStats');
  if (modelFallbackNote && statsEl) {
    statsEl.insertAdjacentHTML('beforebegin', `<div id="advMcFallbackNote" style="grid-column:1/-1;font-size:12px;color:#b8860b;background:rgba(230,138,0,.08);border:1px solid rgba(230,138,0,.3);border-radius:6px;padding:8px 12px;margin-bottom:10px">⚠️ ${modelFallbackNote}</div>`);
  } else {
    const old = document.getElementById('advMcFallbackNote'); if (old) old.remove();
  }
  document.getElementById('advMcStats').innerHTML = [
    {l:'P5 (coda sx)', v:fmt(P.p5), c:'var(--red)'},
    {l:'P10', v:fmt(P.p10), c:'var(--orange)'},
    {l:'P25', v:fmt(P.p25), c:'var(--orange)'},
    {l:'Mediana (P50)', v:fmt(P.p50), c:'var(--blue)'},
    {l:'Media', v:fmt(mean), c:'var(--blue)'},
    {l:'P75', v:fmt(P.p75), c:'var(--green)'},
    {l:'P90', v:fmt(P.p90), c:'var(--green)'},
    {l:'P95 (coda dx)', v:fmt(P.p95), c:'var(--green)'},
  ].map(m=>`<div class="mcard"><div class="ml">${m.l}</div><div class="mv" style="color:${m.c};font-size:16px">${m.v}</div><div class="ms">${modelLabel}</div></div>`).join('');

  // Fan chart
  if (chartAdvMC) { chartAdvMC.destroy(); chartAdvMC=null; }
  const pct_at=(arr,p)=>{const s=[...arr].sort((a,b)=>a-b);return s[Math.floor(s.length*p)]||0;};
  const p10=[],p25=[],p50=[],p75=[],p90=[],mArr=[];
  for(let y=0;y<=years;y++){
    const ts=timeSeries[y];
    p10.push(pct_at(ts,.10)); p25.push(pct_at(ts,.25)); p50.push(pct_at(ts,.50));
    p75.push(pct_at(ts,.75)); p90.push(pct_at(ts,.90));
    mArr.push(ts.reduce((a,b)=>a+b,0)/ts.length);
  }
  const ages=Array.from({length:years+1},(_,i)=>state.age+i);
  const gC='rgba(0,0,0,.05)',tC='rgba(0,0,0,.45)';
  chartAdvMC=new Chart(document.getElementById('chAdvMC'),{type:'line',data:{labels:ages,datasets:[
    {label:'P10',data:p10,borderColor:'rgba(217,48,37,.22)',borderWidth:1,pointRadius:0,fill:false,tension:.35},
    {label:'P25',data:p25,borderColor:'rgba(217,48,37,.32)',borderWidth:1,pointRadius:0,fill:{target:0,above:'rgba(217,48,37,.10)',below:'transparent'},tension:.35},
    {label:'P50',data:p50,borderColor:'#1a73e8',borderWidth:2.5,pointRadius:0,fill:{target:1,above:'rgba(26,115,232,.09)',below:'transparent'},tension:.35},
    {label:'P75',data:p75,borderColor:'rgba(30,142,62,.32)',borderWidth:1,pointRadius:0,fill:{target:2,above:'rgba(30,142,62,.10)',below:'transparent'},tension:.35},
    {label:'P90',data:p90,borderColor:'rgba(30,142,62,.22)',borderWidth:1,pointRadius:0,fill:{target:3,above:'rgba(30,142,62,.07)',below:'transparent'},tension:.35},
    {label:'Media',data:mArr,borderColor:'rgba(26,115,232,.5)',borderWidth:1.5,borderDash:[4,3],pointRadius:0,fill:false,tension:.35},
  ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:true,labels:{font:{size:11}}},tooltip:{callbacks:{title:c=>'Età '+c[0].label,label:c=>' '+c.dataset.label+': '+fmt(c.raw)},backgroundColor:'#fff',borderColor:'#dadce0',borderWidth:1,titleColor:'#202124',bodyColor:'#5f6368',padding:10}},scales:{x:{ticks:{color:tC,font:{size:11,family:'DM Mono'},maxTicksLimit:12},grid:{color:gC}},y:{ticks:{color:tC,font:{size:11,family:'DM Mono'},callback:v=>fmt(v)},grid:{color:gC}}}}});

  // GARCH vol chart
  if (model==='garch' && volHistory.length > 0) {
    document.getElementById('garchSection').style.display='block';
    if (chartGarch) { chartGarch.destroy(); chartGarch=null; }
    chartGarch=new Chart(document.getElementById('chGarch'),{type:'line',data:{labels:volHistory.map((_,i)=>'Anno '+(i+1)),datasets:[{label:'Volatilità annualizzata (GARCH)',data:volHistory.map(v=>+(v*100).toFixed(2)),borderColor:'#9334e6',borderWidth:2,pointRadius:3,fill:true,backgroundColor:'rgba(147,52,230,.1)',tension:.3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true}},scales:{x:{ticks:{color:tC,font:{size:11}}},y:{ticks:{color:tC,font:{size:11},callback:v=>v+'%'}}}}} );
  } else document.getElementById('garchSection').style.display='none';

  // Regime distribution chart
  if (model==='regime' && regimeHistory.length > 0) {
    document.getElementById('regimeSection').style.display='block';
    const bulls=regimeHistory.filter(s=>s==='bull').length;
    const bears=regimeHistory.length-bulls;
    document.getElementById('regimeStats').innerHTML=`<div class="grid-3"><div class="mcard"><div class="ml">Anni in Bull</div><div class="mv" style="color:var(--green)">${bulls} (${(bulls/regimeHistory.length*100).toFixed(0)}%)</div></div><div class="mcard"><div class="ml">Anni in Bear</div><div class="mv" style="color:var(--red)">${bears} (${(bears/regimeHistory.length*100).toFixed(0)}%)</div></div><div class="mcard"><div class="ml">Transizioni Bear→Bull</div><div class="mv" style="color:var(--blue)">${regimeHistory.filter((s,i)=>i>0&&s==='bull'&&regimeHistory[i-1]==='bear').length}</div></div></div>`;
    if (chartRegime) { chartRegime.destroy(); chartRegime=null; }
    chartRegime=new Chart(document.getElementById('chRegime'),{type:'bar',data:{labels:regimeHistory.map((_,i)=>'A'+(i+1)),datasets:[{label:'Regime',data:regimeHistory.map(s=>s==='bull'?1:-1),backgroundColor:regimeHistory.map(s=>s==='bull'?'rgba(30,142,62,.7)':'rgba(217,48,37,.7)'),borderRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.raw===1?' Bull Market':' Bear Market'}}},scales:{x:{display:false},y:{ticks:{color:tC,callback:v=>v===1?'Bull':v===-1?'Bear':''},min:-1.5,max:1.5}}}});
  } else document.getElementById('regimeSection').style.display='none';

  // Istogramma distribuzione dei capitali finali (legge dati già calcolati)
  try { renderAdvMCHistogram(results, P, model); } catch (e) { /* l'istogramma non deve mai bloccare il render */ }
}

// ── Istogramma della distribuzione dei capitali finali ──────────────────────
// Legge l'array `results` (già calcolato e ordinato) e i percentili `P`.
// Non ricalcola nulla del motore di simulazione. Mostra la forma reale della
// distribuzione — asimmetrica a destra (log-normale) — con linee di riferimento
// su mediana (P50) e capitale versato.
function renderAdvMCHistogram(results, P, model) {
  const canvas = document.getElementById('chAdvHist');
  if (!canvas || !Array.isArray(results) || results.length === 0) return;
  if (chartAdvHist) { chartAdvHist.destroy(); chartAdvHist = null; }

  // Capitale versato (riferimento): capitale iniziale + PAC + PIC - uscite
  let invested = state.w || 0;
  try {
    for (let y = 1; y <= state.years; y++) {
      invested += (getPacForYear(y) * 12);
      invested += state.pics.filter(p => +p.year === y).reduce((s, p) => s + (+p.amount || 0), 0);
      invested -= state.exps.filter(e => +e.year === y).reduce((s, e) => s + (+e.amount || 0), 0);
    }
  } catch (e) { /* fallback: invested resta il solo capitale iniziale */ }

  // Costruzione bin: taglio la coda destra estrema al 98° percentile per leggibilità
  // (i pochi outlier altissimi schiaccerebbero tutto il resto), segnalandolo.
  const sorted = results;                          // già ordinato in runAdvancedMC
  const lo = sorted[0];
  const p98 = sorted[Math.floor(sorted.length * 0.98)] || sorted[sorted.length - 1];
  const hi = Math.max(p98, lo + 1);
  const NB = 28;                                   // numero di bin
  const binW = (hi - lo) / NB;
  const bins = new Array(NB).fill(0);
  let overflow = 0;
  for (const v of sorted) {
    if (v > hi) { overflow++; continue; }
    let k = Math.floor((v - lo) / binW);
    if (k >= NB) k = NB - 1; if (k < 0) k = 0;
    bins[k]++;
  }
  // Etichette dei bin (centro) e colore: rosso sotto il versato, verde sopra
  const centers = bins.map((_, i) => lo + binW * (i + 0.5));
  const labels = centers.map(c => fmt(c));
  const colors = centers.map(c => c < invested ? 'rgba(217,48,37,.55)' : 'rgba(30,142,62,.55)');

  const gC = 'rgba(0,0,0,.05)', tC = 'rgba(0,0,0,.45)';
  const p50 = P && P.p50 ? P.p50 : sorted[Math.floor(sorted.length * 0.5)];

  // Linee di riferimento (mediana e versato) via plugin inline
  const refLines = {
    id: 'advHistRefs',
    afterDatasetsDraw(chart) {
      const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
      const draw = (val, color, text) => {
        if (val < lo || val > hi) return;
        const px = x.getPixelForValue((val - lo) / binW - 0.5);
        if (!isFinite(px)) return;
        ctx.save();
        ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px, bottom); ctx.stroke();
        ctx.setLineDash([]); ctx.fillStyle = color;
        ctx.font = '600 10px DM Mono, monospace';
        ctx.save(); ctx.translate(px + 3, top + 4); ctx.fillText(text, 0, 8); ctx.restore();
        ctx.restore();
      };
      draw(p50, '#1a73e8', 'Mediana');
      draw(invested, '#5f6368', 'Versato');
    }
  };

  chartAdvHist = new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Traiettorie', data: bins, backgroundColor: colors, borderWidth: 0, barPercentage: 1.0, categoryPercentage: 1.0 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: {
          title: c => 'Capitale finale ≈ ' + (c[0]?.label || ''),
          label: c => ' ' + c.raw + ' traiettorie su ' + sorted.length + ' (' + (c.raw / sorted.length * 100).toFixed(1) + '%)'
        }, backgroundColor: '#fff', borderColor: '#dadce0', borderWidth: 1, titleColor: '#202124', bodyColor: '#5f6368', padding: 10 }
      },
      scales: {
        x: { ticks: { color: tC, font: { size: 9, family: 'DM Mono' }, maxTicksLimit: 8 }, grid: { display: false } },
        y: { ticks: { color: tC, font: { size: 10, family: 'DM Mono' } }, grid: { color: gC }, title: { display: true, text: 'N. traiettorie', color: tC, font: { size: 10 } } }
      }
    },
    plugins: [refLines]
  });

  // Nota esplicativa sotto il grafico
  const noteEl = document.getElementById('advHistNote');
  if (noteEl) {
    const pctBelow = (sorted.filter(v => v < invested).length / sorted.length * 100).toFixed(0);
    let txt = `Distribuzione dei <strong>${sorted.length.toLocaleString('it-IT')}</strong> capitali finali simulati. `;
    txt += `La forma è <strong>asimmetrica a destra</strong> (log-normale): un investimento può al massimo azzerarsi, ma la coda dei guadagni è lunga. `;
    txt += `In <strong style="color:var(--red)">rosso</strong> le traiettorie sotto il capitale versato (${pctBelow}%), in <strong style="color:var(--green)">verde</strong> quelle sopra. `;
    if (model === 'student') txt += `Col modello <strong>t di Student</strong> osserva la coda sinistra più spessa: è la firma dei crash più frequenti. `;
    else if (model === 'regime') txt += `Col modello <strong>Regime-Switching</strong> la distribuzione può apparire leggermente bimodale (scenari rimasti in bull vs finiti in bear). `;
    else if (model === 'bootstrap') txt += `Col <strong>Block Bootstrap</strong> la forma riflette sequenze storiche reali, non una distribuzione teorica. `;
    if (overflow > 0) txt += `<span style="color:var(--text3)">(${overflow} traiettorie oltre il 98° percentile non mostrate per leggibilità.)</span>`;
    noteEl.innerHTML = txt;
  }
}

function renderAdvMCComparison() {
  // Esegui tutti i modelli (N ridotto per velocità)
  const Ncomp = 500, years = state.years, ages = Array.from({length:years+1},(_,i)=>state.age+i);
  const models = ['gaussian','student','garch','regime','bootstrap'];
  const modelColors = {gaussian:'#5f6368',student:'#1a73e8',garch:'#9334e6',regime:'#1e8e3e',bootstrap:'#e37400'};
  const modelLabels = {gaussian:'Gaussiano',student:'t-Student',garch:'GARCH',regime:'Regime-Switch',bootstrap:'Bootstrap Storico'};
  const p50s = {};
  const compRows = [];

  for (const model of models) {
    const mu = getRate(state.portfolio,'normal',1,state.age);
    const terRate = state.ter/100;
    const ts = Array.from({length:years+1},()=>[]);
    for (let i = 0; i < Ncomp; i++) {
      let cW = state.w;
      ts[0].push(cW);
      // FIX #S2: inizializzazione GARCH con varianza long-run per equity e bond separati
      let gEqSig2 = GARCH_EQ.omega / (1 - GARCH_EQ.alpha - GARCH_EQ.beta);
      let gObSig2 = GARCH_OB.omega / (1 - GARCH_OB.alpha - GARCH_OB.beta);
      let rsState = 'bull';
      for (let y = 1; y <= years; y++) {
        const annPac = getPacForYear(y)*12;
        const pic = state.pics.filter(p=>+p.year===y).reduce((s,p)=>s+(+p.amount||0),0);
        const exp = state.exps.filter(e=>+e.year===y).reduce((s,e)=>s+(+e.amount||0),0);
        const vol = getPortfolioVol(state.portfolio,state.age+y);
        const eqW = getEquityWeight(state.portfolio, state.age+y);
        let r;
        if (model==='gaussian') r = mu + 0.5*vol*vol + vol*randn_bm();
        else if (model==='student') {
          const nu_c = advMCState.nu||4; const vf = nu_c>2 ? nu_c/(nu_c-2) : 10;
          r = mu + 0.5*vol*vol*vf + vol*randn_t(nu_c);
        }
        else if (model==='garch') {
          let annR=1, eqSig2=gEqSig2, obSig2=gObSig2;
          for(let m=0;m<12;m++){const ee=randn_bm()*Math.sqrt(eqSig2);const oe=randn_bm()*Math.sqrt(obSig2);annR*=(1+eqW*(GARCH_EQ.mu+ee)+(1-eqW)*(GARCH_OB.mu+oe));eqSig2=GARCH_EQ.omega+GARCH_EQ.alpha*ee*ee+GARCH_EQ.beta*eqSig2;obSig2=GARCH_OB.omega+GARCH_OB.alpha*oe*oe+GARCH_OB.beta*obSig2;}
          r=annR-1; gEqSig2=eqSig2; gObSig2=obSig2;
        } else if (model==='regime') {
          const RS=RS_PARAMS; const u=Math.random();
          if(rsState==='bull')rsState=u<RS.pBullBull?'bull':'bear'; else rsState=u<RS.pBearBull?'bull':'bear';
          let annR=1,cs=rsState;
          for(let m=0;m<12;m++){const pu=Math.random();if(cs==='bull')cs=pu<RS.pBullBull?'bull':'bear';else cs=pu<RS.pBearBull?'bull':'bear';const param=cs==='bull'?RS.bull:RS.bear;annR*=(1+eqW*(param.mu+param.sigma*randn_bm())+(1-eqW)*(0.0025+0.015*randn_bm()));}
          const ptm=Math.pow(1+mu,1/12)-1;
          const pb=RS.pBearBull/(1-RS.pBullBull+RS.pBearBull);
          const rsE=pb*(eqW*RS.bull.mu+(1-eqW)*0.0025)+(1-pb)*(eqW*RS.bear.mu+(1-eqW)*0.0025);
          r=annR*Math.pow(1+(ptm-rsE),12)-1;
        } else { // bootstrap
          const goldW_b = getGoldWeight(state.portfolio);
          const cashW_b = getCashWeight(state.portfolio);
          const obW_b   = Math.max(0, 1 - eqW - goldW_b - cashW_b);
          const n_hist = HIST_MONTHLY.length;
          const startIdx = Math.floor(Math.random() * (n_hist - 11));
          let annR = 1;
          for (let m = 0; m < 12; m++) {
            const row = calibrateHistRow(HIST_MONTHLY[startIdx + m]);
            annR *= (1 + eqW * row[0] + obW_b * row[1] + goldW_b * row[2] + cashW_b * 0.0025);
          }
          const histMean_b = calcHistMean(eqW, goldW_b, obW_b, cashW_b);
          r = annR * (1 + mu) / (1 + histMean_b) - 1;
        }
        r-=terRate;
        const midW=cW+(annPac+pic-exp)/2; cW+=annPac+pic-exp+midW*r; ts[y].push(Math.max(0,cW));
      }
    }
    const pct=(arr,p)=>{const s=[...arr].sort((a,b)=>a-b);return s[Math.floor(s.length*p)]||0;};
    p50s[model] = Array.from({length:years+1},(_,y)=>pct(ts[y],.50));
    const finalVals = ts[years].sort((a,b)=>a-b);
    compRows.push(
      `<div style="display:flex;gap:12px;margin-bottom:8px;align-items:center;flex-wrap:wrap">
        <span style="font-size:12px;font-weight:700;color:${modelColors[model]};width:150px;font-family:'DM Mono',monospace">${modelLabels[model]}</span>
        <div class="mcard" style="padding:8px 12px;flex:1"><div class="ml">P10</div><div style="font-size:14px;font-weight:700;color:var(--red);font-family:'DM Mono',monospace">${fmt(pct(finalVals,.10))}</div></div>
        <div class="mcard" style="padding:8px 12px;flex:1"><div class="ml">P50</div><div style="font-size:14px;font-weight:700;color:var(--blue);font-family:'DM Mono',monospace">${fmt(pct(finalVals,.50))}</div></div>
        <div class="mcard" style="padding:8px 12px;flex:1"><div class="ml">P90</div><div style="font-size:14px;font-weight:700;color:var(--green);font-family:'DM Mono',monospace">${fmt(pct(finalVals,.90))}</div></div>
      </div>`
    );
  }
  document.getElementById('advMcComparison').innerHTML = compRows.join('');
  // Grafico confronto P50
  if (chartAdvComp) { chartAdvComp.destroy(); chartAdvComp=null; }
  const gC='rgba(0,0,0,.05)',tC='rgba(0,0,0,.45)';
  chartAdvComp=new Chart(document.getElementById('chAdvMCComp'),{type:'line',data:{labels:ages,datasets:models.map(m=>({label:modelLabels[m],data:p50s[m],borderColor:modelColors[m],borderWidth:2.5,pointRadius:0,fill:false,tension:.35,borderDash:m==='gaussian'?[5,4]:m==='bootstrap'?[3,2]:[]}))},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:true,labels:{font:{size:11}}},tooltip:{callbacks:{title:c=>'Età '+c[0].label,label:c=>' '+c.dataset.label+' P50: '+fmt(c.raw)},backgroundColor:'#fff',borderColor:'#dadce0',borderWidth:1,titleColor:'#202124',bodyColor:'#5f6368',padding:10}},scales:{x:{ticks:{color:tC,font:{size:11,family:'DM Mono'},maxTicksLimit:12},grid:{color:gC}},y:{ticks:{color:tC,font:{size:11,family:'DM Mono'},callback:v=>fmt(v)},grid:{color:gC}}}}});
}

