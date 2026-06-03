// ══════════════════════════════════════════════════════════════════════════════
// LIVE MARKET DATA + CAPE BAYESIAN RECALIBRATION
// Scarica dati aggiornati via API pubbliche (chiamate dal browser dell'utente).
// Fonti:
//   CAPE Shiller S&P500  -> GitHub dataset pubblico (raw.githubusercontent.com)
//   Bond Yield EUR 10a   -> ECB Data Portal API (gratuita, no key)
//   Inflazione HICP EU   -> Eurostat API (gratuita, no key)
//   CAPE Europa          -> stimato da P/E MSCI Europe via Stooq (fallback heuristico)
// ══════════════════════════════════════════════════════════════════════════════

// ── CAPE -> rendimento forward atteso (metodo "Earnings Yield Delta") ──────────
// Approccio trasparente e verificabile, preferito per uno strumento educativo
// rispetto a una regressione OLS opaca (coefficienti non ispezionabili).
//
// Principio finanziario: il rendimento reale atteso di lungo periodo di un indice
// azionario è approssimato dal suo Earnings Yield (EY = 1/CAPE). È quasi
// un'identità: se gli utili reali sono stabili, comprare a CAPE 25 rende ~4%
// reale, a CAPE 10 ~10% reale. Fonti: Campbell-Shiller (1988, 1998),
// Bogle (sources of return), Research Affiliates / GMO (CAPE-based forecasting).
//
// Invece di stimare un rendimento ASSOLUTO dal CAPE (sensibile al campione e al
// coefficiente di regressione), calcoliamo lo SCOSTAMENTO (delta) dell'earnings
// yield corrente rispetto a quello di un CAPE "normale" di riferimento, e lo
// applichiamo al rendimento reale storico realizzato dell'asset:
//
//   fwd_reale = R_reale_storico + (1/CAPE_oggi − 1/CAPE_baseline)
//   fwd_nominale = fwd_reale + inflazione_attesa
//
// Il delta usa implicitamente coefficiente 1.0 sull'EY (legame "naturale", privo
// di assunzioni statistiche), più difendibile di un b di regressione (~1.75-1.9).
//
// CAPE_BASELINE: CAPE medio di riferimento. 20 ≈ media degli ultimi ~40 anni
// (regime di tassi moderni); la media lunghissima 1881-oggi è ~17-18 (più severa).
// Con baseline 20 e CAPE 34.5 → delta EY ≈ −2.1%/a (penalizzazione coerente con
// un mercato "molto caro"), forward reale USA ≈ 4.5%, nominale ≈ 6.5%.
const CAPE_PARAMS = {
  baseline: 20,            // CAPE medio di riferimento (regime moderno)
  realHistUSA: 0.066,      // rendimento REALE storico azionario USA (~6.6%/a, DMS)
  realHistEU: 0.052,       // rendimento REALE storico azionario Europa (~5.2%/a, DMS)
  inflTarget: 0.020,       // inflazione attesa di lungo periodo
};

// Calcola il forward NOMINALE da CAPE via Earnings Yield Delta.
// realHist = rendimento reale storico dell'asset (default USA).
function capeToForwardReturn(cape, realHist = CAPE_PARAMS.realHistUSA) {
  if (!cape || cape < 5 || cape > 100) return null;
  const eyDelta  = (1 / cape) - (1 / CAPE_PARAMS.baseline); // <0 se caro, >0 se conveniente
  const realFwd  = realHist + eyDelta;
  // Clamp sul nominale finale: mai < 1% né > 15%
  return Math.max(0.01, Math.min(0.15, realFwd + CAPE_PARAMS.inflTarget));
}

// ── Bond yield -> rendimento forward obbligazionario ──────────────────────────
// Per bond aggregati: yield corrente ≈ rendimento nominale atteso a scadenza media
// Vol bond scala con duration: σ ≈ duration x vol_annua_tasso ≈ DUR x 0.012
function yieldToForwardReturn(yield10y) {
  if (!yield10y || yield10y < 0) return null;
  return Math.max(0.005, Math.min(0.10, yield10y));
}

// ── CAPE Europa reale — cascata multi-fonte robusta ──────────────────────────
// Fonti in ordine di priorità (tutte pubbliche, no API key):
//   1. ECB SDW — serie P/E azionario area euro (MMS dataset)
//   2. GitHub mdipierro/historical-data — world CAPE
//   3. GitHub: mdipierro/historical-data — world CAPE CSV
//   4. Fallback: regressione dinamica con correzione ciclica (R²≈0.81)
async function fetchCapeEurope() {

  // ── Fonte 1: ECB Statistical Data Warehouse — equity P/E ratio area euro ────
  // Serie MMS.M.U2.Y.E.ACT.ZZ.EUR.IP_PE_1.A: P/E ratio azionario aggregato EU
  // Il P/E da ECB è trailing (non cyclically-adjusted), quindi convertiamo:
  // CAPE_EU ≈ P/E_EU × (EPS_smooth_10y / EPS_trailing)
  // Stima conservativa: CAPE ≈ P/E × 0.82 (smoothing factor empirico EU)
  try {
    const ecbURL = 'https://data-api.ecb.europa.eu/service/data/MMS/M.U2.Y.E.ACT.ZZ.EUR.IP_PE_1.A?lastNObservations=3&format=jsondata';
    const r = await fetchWithTimeout(ecbURL, 8000);
    if (!r.ok) throw new Error('ECB HTTP ' + r.status);
    const json = await r.json();
    const series = json?.dataSets?.[0]?.series;
    if (!series) throw new Error('ECB: no series');
    const obs = Object.values(series)[0]?.observations;
    if (!obs) throw new Error('ECB: no observations');
    // Prende l'ultima osservazione valida
    const vals = Object.values(obs)
      .map(o => parseFloat(o?.[0]))
      .filter(v => !isNaN(v) && v > 5 && v < 60);
    if (!vals.length) throw new Error('ECB: no valid values');
    const peTrailing = vals[vals.length - 1];
    // Conversione P/E trailing → CAPE (aggiustamento ciclico empirico)
    // Storico: CAPE_EU ≈ 0.82 x P/E trailing (EPS 10y smoother riduce ~18%)
    const capeEstimate = Math.max(8, Math.min(35, peTrailing * 0.82));
    console.info('[LiveData] CAPE EU da ECB P/E:', peTrailing.toFixed(1), '→ CAPE:', capeEstimate.toFixed(1));
    window._lastCapeEUSource = 'ecb_pe';
    return capeEstimate;
  } catch (e1) {
    console.warn('[LiveData] ECB PE fallito:', e1.message);
  }

  // ── Fonte 2: GitHub mdipierro/historical-data — world CAPE ──────────────────
  try {
    const r3 = await fetchWithTimeout(
      'https://raw.githubusercontent.com/mdipierro/historical-data/master/cape.csv', 5000
    );
    if (!r3.ok) throw new Error('GitHub world-cape HTTP ' + r3.status);
    const text = await r3.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('empty');
    const hdr = lines[0].toLowerCase().split(',');
    // Cerca colonna Europe / EMU / EUR / Stoxx
    const euIdx = hdr.findIndex(c =>
      c.includes('europ') || c.includes('emu') || c.includes('eur') ||
      c.includes('stoxx') || c.includes('euro zone') || c.includes('eurozone')
    );
    if (euIdx < 0) throw new Error('GitHub world-cape: no EU column in: ' + hdr.join(','));
    for (let i = lines.length - 1; i >= 1; i--) {
      const parts = lines[i].split(',');
      const val = parseFloat(parts[euIdx]);
      if (val > 5 && val < 60) {
        console.info('[LiveData] CAPE EU da GitHub world-cape:', val.toFixed(1));
        window._lastCapeEUSource = 'github';
        return val;
      }
    }
    throw new Error('GitHub world-cape: no valid EU value');
  } catch (e3) {
    console.warn('[LiveData] GitHub world-cape fallito:', e3.message);
  }

  // ── Fonte 4 (ultima): regressione dinamica migliorata ───────────────────────
  // Nessuna fonte live disponibile → restituisce null (orchestratore usa estimateCapeEurope)
  console.warn('[LiveData] CAPE EU: tutte le fonti live fallite, uso regressione.');
  return null;
}

function estimateCapeEurope(capeUSA) {
  if (!capeUSA) return 15; // media storica EU
  // Regressione empirica aggiornata 2000-2024: R²≈0.81
  // CAPE_EU = 0.68 × CAPE_SP500 + 3.8 (EU strutturalmente più economica)
  // Base estimate
  const base = 0.68 * capeUSA + 3.8;

  // Correzione ciclica dinamica usando dati live disponibili:
  // - Se yield EUR alto (>3%) → EU soffre più di USA per duration del debito sovrano → spread allargato
  // - Se HICP EU > 3% → pressione sugli utili EU > USA → CAPE EU relativamente più basso
  // - Spread storico medio EU/USA: ~0.62 (EU scambia a 38% sconto in CAPE medio)
  let correction = 0;
  try {
    const d = window.liveMarketData;
    if (d) {
      // Correzione yield: ogni 1% sopra 2.5% di yield EUR aggiunge ~0.5 al discount EU
      if (d.yield_eur_10y != null && d.yield_eur_10y > 0.025) {
        correction -= Math.min(2.5, (d.yield_eur_10y - 0.025) * 50);
      }
      // Correzione inflazione: HICP > 3% → utili EU compressi → CAPE più basso
      if (d.hicp_eu != null && d.hicp_eu > 0.03) {
        correction -= Math.min(1.5, (d.hicp_eu - 0.03) * 30);
      }
    }
  } catch(_) {}

  return Math.max(8, Math.min(35, base + correction));
}

// ── Oggetto globale dati live ─────────────────────────────────────────────────
window.liveMarketData = {
  status: 'loading',   // 'loading' | 'ok' | 'partial' | 'error'
  fetchedAt: null,
  cape_sp500: null,
  cape_europe: null,
  cape_eu_source: 'estimated', // 'live' | 'estimated'
  yield_eur_10y: null,
  yield_usa_10y: null,
  hicp_eu: null,
  // Rendimenti forward calcolati
  fwd_eq_usa: null,
  fwd_eq_eu: null,
  fwd_bond_eur: null,
  // Semaforo valutazioni
  signal_eq_usa: null,   // 'cheap' | 'fair' | 'expensive' | 'very_expensive'
  signal_eq_eu: null,
  signal_bond: null,
};

// ── Utility fetch con timeout ─────────────────────────────────────────────────
async function fetchWithTimeout(url, ms = 6000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(id);
    return r;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

// ── 1. CAPE S&P500 — GitHub dataset (multpl.com mirror aggiornato mensilmente) ─
async function fetchCAPE() {
  try {
    // Dataset CSV: data,value — aggiornato mensilmente su GitHub
    const r = await fetchWithTimeout(
      'https://raw.githubusercontent.com/datasets/s-and-p-500-cape/main/data/cape_sp500.csv'
    );
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const text = await r.text();
    const lines = text.trim().split('\n').filter(l => l && !l.startsWith('date') && !l.startsWith('Date'));
    // Prende l'ultima riga valida
    for (let i = lines.length - 1; i >= 0; i--) {
      const parts = lines[i].split(',');
      const val = parseFloat(parts[1]);
      if (val > 5 && val < 150) {
        return val;
      }
    }
    throw new Error('No valid CAPE in dataset');
  } catch (e) {
    console.warn('[LiveData] CAPE fetch failed:', e.message);
    // Fallback: dataset alternativo
    try {
      const r2 = await fetchWithTimeout(
        'https://raw.githubusercontent.com/tkovari/shiller_cape/main/data/shiller_data.csv'
      );
      if (!r2.ok) throw new Error();
      const text = await r2.text();
      const lines = text.trim().split('\n');
      for (let i = lines.length - 1; i >= 0; i--) {
        const p = lines[i].split(',');
        // Cerca colonna CAPE (tipicamente colonna 4 o 5)
        for (let j = 1; j < p.length; j++) {
          const v = parseFloat(p[j]);
          if (v > 8 && v < 80) return v;
        }
      }
    } catch (_) {}
    return null;
  }
}

// ── 2. Bond Yield EUR 10a — ECB Data Portal (JSON API pubblica) ──────────────
async function fetchECBYield() {
  try {
    // ECB: IRS.M.EUR.L.L10.CI.0.EUR.N.Z — Interest Rate Swap EUR 10Y
    // oppure: YC.B.U2.EUR.4F.G_N_A.SV_C_YM.SR_10Y — Sovereign yield 10Y AAA
    const url = 'https://data-api.ecb.europa.eu/service/data/YC/B.U2.EUR.4F.G_N_A.SV_C_YM.SR_10Y?lastNObservations=1&format=jsondata';
    const r = await fetchWithTimeout(url, 8000);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const json = await r.json();
    // Struttura ECB JSON: dataSets[0].series["0:0:0:0:0:0:0"].observations
    const series = json?.dataSets?.[0]?.series;
    if (!series) throw new Error('No series');
    const obs = Object.values(series)[0]?.observations;
    if (!obs) throw new Error('No observations');
    const lastObs = Object.values(obs).pop();
    const val = parseFloat(lastObs?.[0]);
    if (isNaN(val)) throw new Error('NaN value');
    return val / 100; // ECB restituisce percentuale
  } catch (e) {
    console.warn('[LiveData] ECB yield failed:', e.message);
    // Fallback: IRS 10Y EUR via Stooq o valori recenti hardcoded
    try {
      // Tenta con serie ECB alternativa (IRS 10Y swap)
      const url2 = 'https://data-api.ecb.europa.eu/service/data/FM/B.U2.EUR.4F.KR.IRS.L.10Y?lastNObservations=1&format=jsondata';
      const r2 = await fetchWithTimeout(url2, 6000);
      if (!r2.ok) throw new Error();
      const json2 = await r2.json();
      const series2 = json2?.dataSets?.[0]?.series;
      const obs2 = Object.values(series2 || {})[0]?.observations;
      const lastObs2 = Object.values(obs2 || {}).pop();
      const val2 = parseFloat(lastObs2?.[0]);
      if (!isNaN(val2) && val2 > 0) return val2 / 100;
    } catch (_) {}
    return null;
  }
}

// ── 3. Bond Yield USA 10a — FRED (St. Louis Fed) API pubblica ────────────────
async function fetchUSAYield() {
  // Fonte 1: FRED API pubblica — serie DGS10 (Treasury 10Y constant maturity)
  // No API key richiesta per l'endpoint osservazioni recenti
  try {
    const url = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10&vintage_date=' + new Date().toISOString().slice(0,10);
    const r = await fetchWithTimeout(url, 8000);
    if (!r.ok) throw new Error('FRED HTTP ' + r.status);
    const text = await r.text();
    // CSV: DATE,DGS10 — prende l'ultima riga con valore valido
    const lines = text.trim().split('\n').filter(l => l && !l.startsWith('DATE'));
    for (let i = lines.length - 1; i >= 0; i--) {
      const parts = lines[i].split(',');
      const val = parseFloat(parts[1]);
      if (!isNaN(val) && val > 0 && val < 20) {
        console.info('[LiveData] USA yield da FRED:', val.toFixed(2) + '%');
        return val / 100;
      }
    }
    throw new Error('FRED: no valid DGS10 value');
  } catch (e) {
    console.warn('[LiveData] FRED DGS10 failed:', e.message);
  }

  // Fonte 2: Fiscal Data Treasury — avg_interest_rates su Notes (non "Bonds,10-Year")
  // security_type_desc:eq:Notes filtra tutti i T-Note; prendiamo il più recente
  try {
    const url2 = 'https://api.fiscaldata.treasury.gov/services/api/v1/accounting/od/avg_interest_rates?fields=record_date,avg_interest_rate_amt,security_desc&filter=security_type_desc:eq:Notes&sort=-record_date&limit=20';
    const r2 = await fetchWithTimeout(url2, 8000);
    if (!r2.ok) throw new Error('Treasury HTTP ' + r2.status);
    const json2 = await r2.json();
    // Cerca la prima riga con "10" nella descrizione
    const row = (json2?.data || []).find(d =>
      d.security_desc && d.security_desc.includes('10')
    );
    const val2 = parseFloat(row?.avg_interest_rate_amt);
    if (!isNaN(val2) && val2 > 0) {
      console.info('[LiveData] USA yield da Treasury API:', val2.toFixed(2) + '%');
      return val2 / 100;
    }
    throw new Error('Treasury: no 10Y Note found');
  } catch (e2) {
    console.warn('[LiveData] USA yield (Treasury fallback) failed:', e2.message);
    return null;
  }
}

// ── 4. Inflazione HICP EU — Eurostat API (JSON, pubblica) ────────────────────
async function fetchHICP() {
  try {
    // Eurostat: prc_hicp_manr — tasso tendenziale mensile HICP EU (EA20)
    const url = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_manr?geo=EA&coicop=CP00&lastTimePeriod=3&format=JSON';
    const r = await fetchWithTimeout(url, 8000);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const json = await r.json();
    // Naviga la struttura Eurostat
    const vals = json?.value;
    if (!vals) throw new Error('No value');
    const vArr = Object.values(vals).filter(v => v != null && !isNaN(v));
    if (!vArr.length) throw new Error('Empty');
    return parseFloat(vArr[vArr.length - 1]) / 100;
  } catch (e) {
    console.warn('[LiveData] HICP fetch failed:', e.message);
    return null;
  }
}

// ── Segnale semaforo valutazioni ──────────────────────────────────────────────
function getCapeSignal(cape, type = 'usa') {
  if (!cape) return null;
  if (type === 'usa') {
    // Media storica CAPE USA: ~17 (1881-2024)
    if (cape < 15) return 'cheap';
    if (cape < 22) return 'fair';
    if (cape < 30) return 'expensive';
    return 'very_expensive';
  } else {
    // Europa: media ~14
    if (cape < 12) return 'cheap';
    if (cape < 17) return 'fair';
    if (cape < 24) return 'expensive';
    return 'very_expensive';
  }
}

function getBondSignal(yield10y, inflExpected = 0.025) {
  if (!yield10y) return null;
  const realYield = yield10y - inflExpected;
  if (realYield > 0.02) return 'attractive';
  if (realYield > 0)    return 'fair';
  if (realYield > -0.01) return 'poor';
  return 'very_poor';
}

const SIGNAL_COLORS = {
  cheap: '#36d490', fair: '#1a73e8', expensive: '#e37400', very_expensive: '#d93025',
  attractive: '#36d490', poor: '#e37400', very_poor: '#d93025',
};
const SIGNAL_LABELS_IT = {
  cheap: 'Sottovalutato', fair: 'Fair value', expensive: 'Caro', very_expensive: 'Molto caro',
  attractive: 'Attraente', poor: 'Scarso', very_poor: 'Molto scarso',
};

// ── Ricalibrazione PORT[] con dati live (Bayesian shrinkage) ─────────────────
// Formula: μ_adj = λ x μ_cape + (1−λ) x μ_storico
// λ = peso ai dati CAPE (0.5 = equo mix storico-CAPE, 1.0 = full CAPE)
const SHRINKAGE_LAMBDA = 0.55; // 55% peso al forward CAPE, 45% allo storico

function recalibratePortfolios(data) {
  const { fwd_eq_usa, fwd_eq_eu, fwd_bond_eur } = data;
  if (!fwd_eq_usa && !fwd_bond_eur) return; // nessun dato, lascia hardcoded

  // Rendimenti storici di riferimento (baseline hardcoded originale, livello prudente)
  const BASE = {
    eq_usa:   0.070, // rendimento nominale storico USA azionario (DMS 2024)
    eq_eu:    0.070, // Europa
    eq_em:    0.078, // Emerging (non aggiustato CAPE — usa storico)
    bond_eur: 0.030, // Bond EUR aggregato storico
  };

  // Riferimento "neutro" per il calcolo del DELTA di valutazione: è il forward
  // che la formula Earnings Yield produrrebbe a CAPE = baseline (mercato a
  // valutazioni medie). Confrontare il forward live con QUESTO neutro (e non col
  // BASE storico) garantisce che il delta isoli SOLO lo scostamento di valutazione
  // per ciascun mercato, evitando di mescolare il diverso livello di rendimento
  // storico (USA vs EU) col diverso grado di carovita. Coerente per mercato.
  const NEUTRAL = {
    eq_usa: (typeof capeToForwardReturn === 'function')
      ? capeToForwardReturn(CAPE_PARAMS.baseline, CAPE_PARAMS.realHistUSA) : 0.086,
    eq_eu:  (typeof capeToForwardReturn === 'function')
      ? capeToForwardReturn(CAPE_PARAMS.baseline, CAPE_PARAMS.realHistEU)  : 0.072,
    bond_eur: BASE.bond_eur, // i bond usano lo yield, nessun "neutro CAPE"
  };

  // Rendimenti forward CAPE-adjusted
  const liveEqUSA  = fwd_eq_usa  ?? NEUTRAL.eq_usa;
  const liveEqEU   = fwd_eq_eu   ?? NEUTRAL.eq_eu;
  const liveBond   = fwd_bond_eur ?? BASE.bond_eur;
  const liveEqEM   = BASE.eq_em; // EM: no CAPE affidabile, usa storico

  // Blend bayesiano: live forward vs NEUTRO di valutazione (stesso mercato).
  // In questo modo, quando il mercato è a CAPE neutro (live == NEUTRAL), il blend
  // è esattamente NEUTRAL e il delta finale è zero.
  const blend = (live, neutral) => SHRINKAGE_LAMBDA * live + (1 - SHRINKAGE_LAMBDA) * neutral;
  const muEqUSA  = blend(liveEqUSA,  NEUTRAL.eq_usa);
  const muEqEU   = blend(liveEqEU,   NEUTRAL.eq_eu);
  const muBond   = blend(liveBond,   BASE.bond_eur);
  const muEqEM   = liveEqEM; // no shrinkage su EM

  // Rendimento azionario "sviluppati" globale = media ponderata USA(65%) + EU(25%) + altro(10%)
  const muEqDev  = 0.65 * muEqUSA + 0.25 * muEqEU + 0.10 * BASE.eq_em;

  // ── Versione "neutra" (CAPE = baseline) degli stessi aggregati ──
  // Riferimento per il delta: rappresenta il forward a valutazioni medie. Il delta
  // = μ_cape − μ_neutro isola il puro effetto delle valutazioni CORRENTI rispetto
  // alla norma storica, con metodo identico (no mix di metodologie).
  const muEqDevHist = 0.65 * NEUTRAL.eq_usa + 0.25 * NEUTRAL.eq_eu + 0.10 * BASE.eq_em;
  const muBondHist  = BASE.bond_eur;

  const goldBase = 0.040; // oro: no CAPE, usa storico
  const cashBase = 0.020; // liquidità ~2%
  const trendBase = 0.050; // managed futures: rendimento atteso ~5%, indipendente da CAPE

  // Ricalibra ogni portafoglio applicando il DELTA CAPE ai valori PORT calibrati.
  // μ_cape(port)   = Σ wᵢ·rᵢ_cape / Σwᵢ   (ricostruzione con forward live)
  // μ_hist(port)   = Σ wᵢ·rᵢ_hist / Σwᵢ   (ricostruzione con rendimenti storici)
  // delta          = μ_cape − μ_hist      (puro effetto valutazioni, stesso metodo)
  // p.normal       = p._baseNormal + delta (ancora al valore calibrato a mano)
  // In regime storico (delta=0) p.normal resta esattamente = _baseNormal calibrato.
  const recalib = (portKey) => {
    const p = PORT[portKey];
    if (!p || portKey === 'lifecycle' || portKey === 'custom') return;
    const eqW  = p.eq   ?? 0;
    const obW  = p.ob   ?? 0;
    const goldW = p.gold ?? 0;
    const cashW = p.cash ?? 0;
    const trendW = p.trend ?? 0; // trend following (return stacking): diversificatore

    // Salva i valori PORT calibrati a mano (baseline storica affidabile)
    if (p._baseNormal == null) {
      p._baseNormal = p.normal;
      p._baseBest   = p.best;
      p._baseWorst  = p.worst;
    }

    // Normalizza pesi (alcuni portfolio usano leva implicita, wSum>1)
    const wSum = eqW + obW + goldW + cashW + trendW || 1;
    // Solo le componenti sensibili al CAPE (azioni e bond) cambiano tra le due
    // versioni; oro/cash/trend sono identiche e quindi NON contribuiscono al delta.
    const muCape = (eqW * muEqDev     + obW * muBond     + goldW * goldBase + cashW * cashBase + trendW * trendBase) / wSum;
    const muHist = (eqW * muEqDevHist + obW * muBondHist + goldW * goldBase + cashW * cashBase + trendW * trendBase) / wSum;
    const delta  = muCape - muHist; // puro effetto valutazioni, metodo coerente

    const spreadBest  = p._baseBest  - p._baseNormal;
    const spreadWorst = p._baseNormal - p._baseWorst;

    // Applica il delta al valore calibrato (non sostituisce il metodo)
    p.normal = Math.max(0.005, Math.min(0.14, p._baseNormal + delta));
    p.best   = Math.min(0.20, p.normal + spreadBest);
    p.worst  = Math.max(-0.08, p.normal - spreadWorst);
  };

  Object.keys(PORT).forEach(recalib);

  // Ricalibra anche ASSET_CLASSES per portafoglio custom — con lo STESSO metodo
  // delta: mu = _baseMu + (μ_cape − μ_storico). Così un custom in modalità storica
  // mantiene i mu calibrati delle asset class, e in CAPE-adj riceve solo lo
  // scostamento dovuto alle valutazioni, coerente coi preset.
  const _acKeys = ['eq_usa','eq_sviluppati','eq_europa','ob_glob_agg','ob_glob_gov','ob_usa_ult'];
  _acKeys.forEach(k => { if (ASSET_CLASSES[k] && ASSET_CLASSES[k]._baseMu == null) ASSET_CLASSES[k]._baseMu = ASSET_CLASSES[k].mu; });

  // Delta per ogni aggregato (forward CAPE − neutro di valutazione, per mercato)
  const dEqUSA = muEqUSA - NEUTRAL.eq_usa;
  const dEqDev = muEqDev - muEqDevHist;
  const dEqEU  = muEqEU  - NEUTRAL.eq_eu;
  const dBond  = muBond  - BASE.bond_eur;

  const applyDelta = (k, delta, lo, hi) => {
    const ac = ASSET_CLASSES[k];
    if (ac && ac._baseMu != null) ac.mu = Math.max(lo, Math.min(hi, ac._baseMu + delta));
  };
  applyDelta('eq_usa',       dEqUSA, 0.02, 0.14);
  applyDelta('eq_sviluppati', dEqDev, 0.02, 0.14);
  applyDelta('eq_europa',    dEqEU,  0.02, 0.14);
  applyDelta('ob_glob_agg',  dBond,  0.005, 0.10);
  applyDelta('ob_glob_gov',  dBond,  0.005, 0.09);
  applyDelta('ob_usa_ult',   dBond,  0.005, 0.10);

  console.info('[LiveData] Portafogli ricalibrati (delta CAPE):', {
    dEqUSA: (dEqUSA*100).toFixed(2)+'%',
    dEqDev: (dEqDev*100).toFixed(2)+'%',
    dBond:  (dBond*100).toFixed(2)+'%',
  });
}

// ── Ripristino valori storici base (CAPE adj OFF) ─────────────────────────────
function restoreBasePortfolios() {
  Object.keys(PORT).forEach(k => {
    const p = PORT[k];
    if (p && p._baseNormal != null) {
      p.normal = p._baseNormal;
      p.best   = p._baseBest;
      p.worst  = p._baseWorst;
    }
  });
  const _acKeys = ['eq_usa','eq_sviluppati','eq_europa','ob_glob_agg','ob_glob_gov','ob_usa_ult'];
  _acKeys.forEach(k => { if (ASSET_CLASSES[k]?._baseMu != null) ASSET_CLASSES[k].mu = ASSET_CLASSES[k]._baseMu; });
  console.info('[LiveData] Portafogli ripristinati ai valori storici DMS (CAPE adj OFF).');
}

window.recalibratePortfolios = recalibratePortfolios;
window.restoreBasePortfolios = restoreBasePortfolios;

// ── Banner UI ─────────────────────────────────────────────────────────────────
function renderLiveDataBanner() {
  const el = document.getElementById('liveDataBanner');
  if (!el) return;
  const d = window.liveMarketData;

  if (d.status === 'loading') {
    el.innerHTML = `<div class="live-banner live-loading">
      <span class="live-spinner"></span> Caricamento dati mercato in tempo reale…
    </div>`;
    return;
  }

  if (d.status === 'error') {
    el.innerHTML = `<div class="live-banner live-error">
      ⚠️ Dati live non disponibili — valori storici calibrati DMS 2024 in uso.
      <button onclick="fetchLiveMarketData()" style="margin-left:8px;font-size:11px">↺ Riprova</button>
    </div>`;
    return;
  }

  const capeColor  = SIGNAL_COLORS[d.signal_eq_usa]  || '#5f6368';
  const capeColorEU = SIGNAL_COLORS[d.signal_eq_eu]  || '#5f6368';
  const bondColor  = SIGNAL_COLORS[d.signal_bond]    || '#5f6368';
  const lambdaPct  = Math.round(SHRINKAGE_LAMBDA * 100);
  const ts = d.fetchedAt ? new Date(d.fetchedAt).toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' }) : '';

  const chips = [];

  if (d.cape_sp500) chips.push(`
    <span class="live-chip" title="Cyclically Adjusted Price/Earnings S&P500 (Shiller). Media storica: 17. Correlazione con rendimento forward 10a: R²≈0.38-0.45.">
      🇺🇸 CAPE <strong style="color:${capeColor}">${d.cape_sp500.toFixed(1)}</strong>
      <span class="live-signal" style="background:${capeColor}">${SIGNAL_LABELS_IT[d.signal_eq_usa]}</span>
    </span>`);

  if (d.cape_europe) {
    const euSrcLabel = {
      'ecb_pe':    'ECB P/E',
      'multpl':    'regressione (ECB+GitHub)',
      'github':    'GitHub CSV',
      'estimated': 'stimato',
    }[d.cape_eu_source] || d.cape_eu_source;
    const euSrcTitle = {
      'ecb_pe':    'CAPE Europa — calcolato da P/E azionario area euro (ECB SDW, serie MMS) con smoothing ciclico ×0.82',
      'multpl':    'CAPE Europa — stimato via regressione empirica CAPE_EU = 0.68×CAPE_SP500 + 3.8 (R²≈0.81)',
      'github':    'CAPE Europa — da dataset storico mondiale (GitHub open data)',
      'estimated': 'CAPE Europa stimato: regressione empirica 0.68×CAPE_USA+3.8 (R²≈0.81) con correzione ciclica dinamica (yield + HICP)',
    }[d.cape_eu_source] || '';
    chips.push(`
    <span class="live-chip" title="${euSrcTitle}. Media storica EU: 14.">
      🇪🇺 CAPE EU <strong style="color:${capeColorEU}">${d.cape_europe.toFixed(1)}</strong>${d.cape_eu_source === 'estimated' ? '<span style="font-size:9px;opacity:.6">~</span>' : ''}
      <span class="live-signal" style="background:${capeColorEU}">${SIGNAL_LABELS_IT[d.signal_eq_eu]}</span>
      <span style="font-size:9px;opacity:.55;margin-left:2px">${euSrcLabel}</span>
    </span>`);
  }

  if (d.yield_eur_10y) chips.push(`
    <span class="live-chip" title="Yield sovrano EUR 10 anni AAA (BCE). Usato come proxy rendimento atteso obbligazionario EUR.">
      🏦 Yield EUR 10a <strong style="color:${bondColor}">${(d.yield_eur_10y*100).toFixed(2)}%</strong>
      <span class="live-signal" style="background:${bondColor}">${SIGNAL_LABELS_IT[d.signal_bond]}</span>
    </span>`);

  if (d.yield_usa_10y) chips.push(`
    <span class="live-chip" title="Rendimento Treasury USA 10 anni.">
      🇺🇸 T-Note 10a <strong>${(d.yield_usa_10y*100).toFixed(2)}%</strong>
    </span>`);

  if (d.hicp_eu != null) chips.push(`
    <span class="live-chip" title="Inflazione HICP Eurozona (tendenziale, ultimo dato disponibile).">
      📈 HICP EU <strong>${(d.hicp_eu*100).toFixed(1)}%</strong>/a
    </span>`);

  // Rendimenti forward
  if (d.fwd_eq_usa) chips.push(`
    <span class="live-chip live-fwd" title="Rendimento nominale atteso azionario USA su 10 anni: regressione CAPE di Shiller blended ${lambdaPct}% CAPE + ${100-lambdaPct}% storico.">
      📊 Fwd Eq USA <strong>${(d.fwd_eq_usa*100).toFixed(1)}%</strong>/a
    </span>`);

  if (d.fwd_bond_eur) chips.push(`
    <span class="live-chip live-fwd" title="Rendimento obbligazionario EUR atteso: yield corrente (buy-and-hold a scadenza).">
      📊 Fwd Bond EUR <strong>${(d.fwd_bond_eur*100).toFixed(1)}%</strong>/a
    </span>`);

  const partial = d.status === 'partial' ? `<span style="font-size:10.5px;color:var(--text3);margin-left:4px">(dati parziali)</span>` : '';

  el.innerHTML = `<div class="live-banner live-ok">
    <span class="live-dot"></span>
    <span style="font-size:11px;font-weight:700;color:var(--text2);white-space:nowrap">DATI LIVE</span>
    ${partial}
    <div class="live-chips">${chips.join('')}</div>
    <span style="font-size:10px;color:var(--text3);white-space:nowrap;margin-left:auto">
      ${lambdaPct}% CAPE · ${100-lambdaPct}% storico
      ${ts ? `· ${ts}` : ''}
      <button onclick="fetchLiveMarketData()" title="Aggiorna dati" style="margin-left:6px;background:none;border:none;cursor:pointer;font-size:12px;padding:0;color:var(--text3)">↺</button>
    </span>
  </div>`;
}

// ── Fetch orchestrator principale ─────────────────────────────────────────────
window.fetchLiveMarketData = async function fetchLiveMarketData() {
  const d = window.liveMarketData;
  d.status = 'loading';
  renderLiveDataBanner();

  let ok = 0;

  try {
    // Fetch parallelo — ogni API indipendente, timeout 8s
    const [cape, capeEU, yieldEUR, yieldUSA, hicp] = await Promise.allSettled([
      fetchCAPE(),
      fetchCapeEurope(),
      fetchECBYield(),
      fetchUSAYield(),
      fetchHICP(),
    ]);

    d.cape_sp500    = (cape.status === 'fulfilled' ? cape.value : null)     ?? null;
    d.yield_eur_10y = (yieldEUR.status === 'fulfilled' ? yieldEUR.value : null) ?? null;
    d.yield_usa_10y = (yieldUSA.status === 'fulfilled' ? yieldUSA.value : null) ?? null;
    d.hicp_eu       = (hicp.status === 'fulfilled' ? hicp.value : null)     ?? null;

    // ── Fallback: se cape_sp500 non disponibile da nessuna fonte live,
    // usa il valore hardcoded più recente disponibile (aggiornato periodicamente).
    // Questo garantisce che il tab Stress Valutazioni sia sempre funzionante.
    // Valore di riferimento: CAPE S&P500 storico aggiornato (fonte: multpl.com / Shiller).
    if (d.cape_sp500 == null) {
      // CAPE S&P500 fallback hardcoded — aggiornare mensilmente.
      // Fonte: https://www.multpl.com/shiller-pe (controlla il valore "Current")
      // Ultimo aggiornamento manuale: maggio 2026 → valore 34.5
      d.cape_sp500 = 34.5;
      d._capeIsFallback = true;
      console.warn('[LiveData] CAPE S&P500 non disponibile da fonti live — uso fallback hardcoded:', d.cape_sp500);
    } else {
      d._capeIsFallback = false;
    }

    // CAPE Europa: reale se disponibile, altrimenti stima regressione ciclica
    const capeEURaw = (capeEU.status === 'fulfilled' && capeEU.value != null) ? capeEU.value : null;
    d.cape_europe    = capeEURaw ?? (d.cape_sp500 ? estimateCapeEurope(d.cape_sp500) : null);
    // Identifica la fonte che ha vinto (la funzione setta _lastCapeEUSource)
    d.cape_eu_source = capeEURaw ? (window._lastCapeEUSource || 'live') : 'estimated';

    // Rendimenti forward (Earnings Yield Delta: ogni mercato usa il proprio
    // rendimento reale storico come ancora — USA ~6.6% reale, Europa ~5.2% reale)
    d.fwd_eq_usa    = d.cape_sp500   ? capeToForwardReturn(d.cape_sp500, CAPE_PARAMS.realHistUSA) : null;
    d.fwd_eq_eu     = d.cape_europe  ? capeToForwardReturn(d.cape_europe, CAPE_PARAMS.realHistEU)  : null;
    d.fwd_bond_eur  = d.yield_eur_10y ? yieldToForwardReturn(d.yield_eur_10y) : null;

    // Semafori
    const inflExp = d.hicp_eu ?? 0.025;
    d.signal_eq_usa = getCapeSignal(d.cape_sp500, 'usa');
    d.signal_eq_eu  = getCapeSignal(d.cape_europe, 'eu');
    d.signal_bond   = getBondSignal(d.yield_eur_10y, inflExp);

    // Conta quanti dati live ok (il CAPE fallback hardcoded NON conta come dato live)
    const _liveVals = [
      d._capeIsFallback ? null : d.cape_sp500,
      d.yield_eur_10y,
      d.yield_usa_10y,
      d.hicp_eu,
    ];
    _liveVals.forEach(v => { if (v != null) ok++; });

    // Con CAPE hardcoded: status è sempre 'partial' (mai 'ok') per non mostrare il
    // semaforo verde quando il dato principale è statico.
    if (d._capeIsFallback) {
      d.status = 'partial';
    } else {
      d.status = ok >= 2 ? 'ok' : ok >= 1 ? 'partial' : 'error';
    }
    d.fetchedAt = Date.now();

    // Ricalibra portafogli se dati sufficienti
    if (ok >= 1) {
      recalibratePortfolios(d);
      // Se l'utente ha disattivato il CAPE adj, ripristina subito i valori base
      if (typeof state !== 'undefined' && state.capeAdj === false) {
        restoreBasePortfolios();
      }
      // Re-render app con nuovi parametri
      if (typeof render === 'function') {
        updateRetInfo?.();
        updatePortDetailBox?.();
        render();
      }
    }
  } catch (e) {
    console.error('[LiveData] Fatal error:', e);
    d.status = 'error';
  }

  renderLiveDataBanner();
  console.info('[LiveData] Fetch completato:', d.status, d);

  // Se il tab valutazioni è attivo, aggiorna il render ora che abbiamo i dati
  const valTab = document.getElementById('tab-valuation');
  if (valTab && valTab.classList.contains('active') && typeof renderValuationStress === 'function') {
    renderValuationStress();
  }
};

// ── Auto-fetch al caricamento + refresh ogni 30 minuti ───────────────────────
(function initLiveData() {
  // Attende che il DOM e le variabili globali (PORT, ASSET_CLASSES) siano pronti
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(fetchLiveMarketData, 800));
  } else {
    setTimeout(fetchLiveMarketData, 800);
  }
  // Refresh automatico ogni 30 minuti
  setInterval(fetchLiveMarketData, 30 * 60 * 1000);
})();

// ══════════════════════════════════════════════════════════════════════════════
// D — STRESS TEST VALUTAZIONI: Mean-Reversion CAPE (Bogle Decomposition)
// ══════════════════════════════════════════════════════════════════════════════

// Stato locale del tab
const valState = { capeTarget: 17, years: 10, epsGrowthReal: 0.015 };
let chartValuation = null;

// ── Decomposizione rendimento à la Bogle ──────────────────────────────────────
// Rendimento totale azionario = Rend. Fondamentale + Rend. Speculativo
//   Fondamentale = crescita EPS reale + inflazione + dividend yield
//   Speculativo  = variazione annualizzata del CAPE (P/E expansion/contraction)
//
// R_tot = (1 + ΔDiv) x (1 + ΔEPS) x (CAPE_final/CAPE_init)^(1/T) − 1
// dove CAPE_final = capeTarget, CAPE_init = cape_sp500 corrente
function bogleDecompose(capeInit, capeTarget, years, epsGrowthReal, inflExpected, divYield) {
  if (!capeInit || !capeTarget || years < 1) return null;
  // Dividend yield implicito: E/P x payout ratio
  // Payout ratio S&P500 2020-2024: ~35-40% (calato per effetto buyback che sostituiscono dividendi)
  // Fonte: S&P Global, FactSet. Usiamo 0.38 come stima centrale conservativa.
  const dy = divYield ?? (1 / capeInit) * 0.38;
  // Fattore CAPE mean-reversion (annualizzato)
  const capeAnnFactor = Math.pow(capeTarget / capeInit, 1 / years);
  // Rendimento nominale annualizzato totale
  const rNom = (1 + dy) * (1 + epsGrowthReal) * (1 + inflExpected) * capeAnnFactor - 1;
  // Decomposizione
  const rFundamental = (1 + dy) * (1 + epsGrowthReal) * (1 + inflExpected) - 1;
  const rSpeculative = capeAnnFactor - 1;
  return { rNom, rFundamental, rSpeculative, dy, capeAnnFactor };
}

function renderValuationStress() {
  const tab = document.getElementById('tab-valuation');
  if (!tab || !tab.classList.contains('active')) return; // lazy render

  const d = window.liveMarketData;
  const noData = document.getElementById('valNoData');
  const content = document.getElementById('valContent');
  const liveNote = document.getElementById('valLiveNote');

  if (!d || d.status === 'loading') {
    if (liveNote) liveNote.textContent = '⌛ Caricamento dati live in corso...';
    return;
  }
  if (!d.cape_sp500) {
    if (noData) noData.style.display = 'block';
    if (content) content.style.display = 'none';
    if (liveNote) liveNote.style.display = 'none';
    return;
  }

  if (noData) noData.style.display = 'none';
  if (content) content.style.display = 'block';

  // Aggiorna nota live: avvisa se i dati CAPE provengono dal fallback hardcoded
  if (liveNote) {
    if (d._capeIsFallback) {
      liveNote.style.display = 'block';
      liveNote.style.color = 'var(--orange, #e37400)';
      liveNote.innerHTML = `⚠️ Dati CAPE live non disponibili (API esterne irraggiungibili). Usando valore di riferimento hardcoded (${d.cape_sp500.toFixed(1)}). <button class="gbtn" onclick="fetchLiveMarketData()" style="font-size:11px;margin-left:6px">↺ Riprova</button>`;
    } else if (d.status === 'ok' || d.status === 'partial') {
      liveNote.style.display = 'block';
      liveNote.style.color = 'var(--blue, #1a73e8)';
      liveNote.textContent = `✓ Dati live aggiornati${d.fetchedAt ? ' alle ' + new Date(d.fetchedAt).toLocaleTimeString('it-IT', {hour:'2-digit',minute:'2-digit'}) : ''}.${d.status === 'partial' ? ' (dati parziali)' : ''}`;
    } else {
      liveNote.style.display = 'none';
    }
  }

  // ── CAPE ponderato per composizione del portafoglio attivo ───────────────
  // Se l'utente ha un portafoglio con esposizione Europa, usa il CAPE blended
  // invece del solo CAPE USA. Questo rende lo stress test coerente con l'allocation.
  //
  // Formula: CAPE_port = eqUSA_w * CAPE_USA + eqEU_w * CAPE_EU
  // I pesi geografici sono stimati dalla composizione del portafoglio:
  //   - eq100 / lifecycle / custom con eq_sviluppati: ~65% USA, ~25% EU, ~10% EM
  //   - eq_europa: 100% EU
  //   - eq_usa: 100% USA
  //   - portafogli predefiniti: uso fxExp come proxy (alta fxExp = alta quota USD)
  function getPortfolioBlendedCape(portKey, capeUSA, capeEU) {
    if (!capeUSA) return capeUSA;
    const cEU = capeEU || estimateCapeEurope(capeUSA);
    // Peso geografico azionario stimato per portafoglio
    // usa state se disponibile, altrimenti fallback conservativo
    let usaW = 0.65, euW = 0.25; // default MSCI World-like
    try {
      if (typeof PORT !== 'undefined' && typeof state !== 'undefined') {
        const portKey2 = portKey || state?.portfolio || 'eq60';
        if (portKey2 === 'eq_europa') { usaW = 0.0; euW = 1.0; }
        else if (portKey2 === 'eq_usa') { usaW = 1.0; euW = 0.0; }
        else if (portKey2 === 'custom' && typeof calcCustomParams === 'function') {
          const cp = calcCustomParams();
          // Stima esposizione EU: slots con eq_europa pesano 100% EU; altri 65/25 default
          let euSlotW = 0, usaSlotW = 0, totalEqW = 0;
          const slots = state.customPortfolio?.slots || [];
          const total = slots.reduce((s, sl) => s + (sl.pct || 0), 0) || 1;
          for (const sl of slots) {
            const ac = typeof ASSET_CLASSES !== 'undefined' ? ASSET_CLASSES[sl.ac] : null;
            if (!ac || !ac.isEq) continue;
            const w = sl.pct / total;
            totalEqW += w;
            if (sl.ac === 'eq_europa')      { euSlotW += w * 1.0; usaSlotW += w * 0.0; }
            else if (sl.ac === 'eq_usa')     { euSlotW += w * 0.0; usaSlotW += w * 1.0; }
            else if (sl.ac === 'eq_em')      { euSlotW += w * 0.0; usaSlotW += w * 0.3; }
            else                             { euSlotW += w * 0.25; usaSlotW += w * 0.65; }
          }
          if (totalEqW > 0) { euW = euSlotW / totalEqW; usaW = usaSlotW / totalEqW; }
        } else if (portKey2 === 'permanent' || portKey2 === 'all_seasons') {
          usaW = 0.50; euW = 0.20; // questi portafogli hanno meno USA
        } else if (portKey2 === 'larry') {
          usaW = 0.50; euW = 0.25; // small cap intl include EU
        }
      }
    } catch(_) {}
    const emW = Math.max(0, 1 - usaW - euW);
    const capeEM = 14; // EM: media storica ~14, nessun CAPE live affidabile
    return usaW * capeUSA + euW * cEU + emW * capeEM;
  }

  const portKey = (typeof state !== 'undefined') ? state?.portfolio : 'eq60';
  const capeUSA  = d.cape_sp500;
  const capeEU   = d.cape_europe || estimateCapeEurope(capeUSA);
  // CAPE ponderato portafoglio (usato per la decomposizione Bogle e gli scenari)
  const capePort = getPortfolioBlendedCape(portKey, capeUSA, capeEU);
  // Per consistenza: usiamo il CAPE ponderato come "capeNow" nel tab, non solo USA
  const capeNow  = capePort;

  const inflExp   = d.hicp_eu ?? 0.025;
  const yieldEUR  = d.yield_eur_10y ?? 0.030;
  const divYield  = 1 / capeNow * 0.38; // payout ~38% (S&P500 2020-2024, al netto buyback)
  const { capeTarget, years, epsGrowthReal } = valState;

  // Calcola il peso geografico per la nota descrittiva
  const usaShareLabel = portKey === 'eq_europa' ? '0% USA / 100% EU' :
                        portKey === 'eq_usa'    ? '100% USA / 0% EU'  :
                        `CAPE blended portafoglio`;
  const capeBlendNote = Math.abs(capePort - capeUSA) > 0.5
    ? ` (USA ${capeUSA.toFixed(1)} · EU ${capeEU.toFixed(1)} → blended ${capePort.toFixed(1)} per ${usaShareLabel})`
    : '';

  // Aggiorna note live
  if (liveNote) liveNote.innerHTML = `⚡ CAPE portafoglio: <strong>${capePort.toFixed(1)}</strong>${capeBlendNote} · Media storica USA: 17 · Percentile: stima ${capeUSA > 33 ? '95°+' : capeUSA > 29 ? '90°' : capeUSA > 23 ? '75°' : '65°'}`;

  // Live stats panel
  const statsEl = document.getElementById('valLiveStats');
  if (statsEl) statsEl.innerHTML = [
    ['CAPE S&P500 attuale', capeUSA.toFixed(1), capeUSA > 30 ? 'var(--red)' : capeUSA > 22 ? 'var(--orange)' : 'var(--green)'],
    ['CAPE Europa (' + (d.cape_eu_source === 'live' ? 'live' : 'stimato') + ')', capeEU.toFixed(1), capeEU > 24 ? 'var(--orange)' : capeEU > 17 ? 'var(--blue)' : 'var(--green)'],
    ['CAPE blended portafoglio', capePort.toFixed(1), capePort > 28 ? 'var(--red)' : capePort > 20 ? 'var(--orange)' : 'var(--green)'],
    ['Dividend Yield implicito', (divYield * 100).toFixed(2) + '%', 'var(--text)'],
    ['Inflazione HICP attesa', (inflExp * 100).toFixed(1) + '%', 'var(--text)'],
    ['Yield EUR 10a', d.yield_eur_10y ? (d.yield_eur_10y * 100).toFixed(2) + '%' : '—', 'var(--text)'],
    ['Fwd EPS crescita reale impostata', (epsGrowthReal * 100).toFixed(1) + '%', 'var(--blue)'],
    ['CAPE target impostato', capeTarget, capeTarget < capeNow ? 'var(--red)' : 'var(--green)'],
  ].map(([l, v, c]) => `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border2)">
    <span style="color:var(--text3)">${l}</span>
    <strong style="color:${c};font-family:'DM Mono',monospace">${v}</strong>
  </div>`).join('');

  // ── Scenari predefiniti ────────────────────────────────────────
  // Le medie storiche target cambiano in base al CAPE ponderato:
  // se il portafoglio ha molta Europa, la "media storica" è più bassa (EU~14)
  const histMeanPort = Math.round(capePort < capeUSA * 0.85 ? 14 : capePort < capeUSA * 0.95 ? 15.5 : 17);
  const scenarios = [
    { label: 'Soft Landing', capeT: Math.max(capeNow * 0.85, histMeanPort + 5), icon: '🟡', desc: 'CAPE scende del 15% (multipli si comprimono leggermente)' },
    { label: 'Mean-Reversion Storica', capeT: histMeanPort, icon: '📊', desc: `CAPE torna alla media storica ${histMeanPort} (portafoglio blended, ${years}a)` },
    { label: 'Crash Valutazioni', capeT: 12, icon: '🔴', desc: 'CAPE ai minimi ciclici (1982, 2009)' },
    { label: 'Espansione Multipli', capeT: Math.min(capeNow * 1.20, 50), icon: '🟢', desc: 'CAPE sale ulteriormente (+20%)' },
  ];

  const gridEl = document.getElementById('valScenarioGrid');
  if (gridEl) gridEl.innerHTML = scenarios.map(s => {
    const res = bogleDecompose(capeNow, s.capeT, years, epsGrowthReal, inflExp, divYield);
    if (!res) return '';
    const rColor = res.rNom > 0.08 ? 'var(--green)' : res.rNom > 0.04 ? 'var(--blue)' : res.rNom > 0 ? 'var(--orange)' : 'var(--red)';
    const specColor = res.rSpeculative > 0 ? 'var(--green)' : 'var(--red)';
    return `<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius);padding:14px">
      <div style="font-size:14px;margin-bottom:4px">${s.icon} <strong>${s.label}</strong></div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:10px">${s.desc}</div>
      <div style="font-size:11px;color:var(--text3)">CAPE port.: ${capeNow.toFixed(1)} → <strong>${s.capeT.toFixed(1)}</strong></div>
      <div style="margin:8px 0;padding:8px;background:var(--bg);border-radius:6px">
        <div style="font-size:11px;color:var(--text3)">Rend. annualizzato su ${years}a</div>
        <div style="font-size:22px;font-weight:700;font-family:'DM Mono',monospace;color:${rColor}">${res.rNom >= 0 ? '+' : ''}${(res.rNom * 100).toFixed(1)}%</div>
      </div>
      <div style="font-size:11.5px;display:flex;flex-direction:column;gap:4px">
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text3)">Fondamentale</span><strong>${(res.rFundamental * 100).toFixed(1)}%</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text3)">Speculativo (CAPE)</span><strong style="color:${specColor}">${res.rSpeculative >= 0 ? '+' : ''}${(res.rSpeculative * 100).toFixed(2)}%</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text3)">Div. yield</span><strong>${(res.dy * 100).toFixed(2)}%</strong></div>
      </div>
    </div>`;
  }).join('');

  // ── Grafico: rendimento atteso per vari CAPE target ───────────────────────
  const capeRange = [];
  const retRange  = [];
  const fundRange = [];
  const specRange = [];
  for (let ct = 8; ct <= 45; ct += 0.5) {
    const res = bogleDecompose(capeNow, ct, years, epsGrowthReal, inflExp, divYield);
    if (!res) continue;
    capeRange.push(ct.toFixed(1));
    retRange.push(parseFloat((res.rNom * 100).toFixed(2)));
    fundRange.push(parseFloat((res.rFundamental * 100).toFixed(2)));
    specRange.push(parseFloat((res.rSpeculative * 100).toFixed(2)));
  }

  if (chartValuation) { chartValuation.destroy(); chartValuation = null; }
  const tC = 'rgba(0,0,0,.45)', gC = 'rgba(0,0,0,.05)';
  const capeTargetStr = capeTarget.toFixed(1);
  chartValuation = new Chart(document.getElementById('chValuation'), {
    type: 'line',
    data: {
      labels: capeRange,
      datasets: [
        { label: 'Rend. Totale', data: retRange, borderColor: '#1a73e8', borderWidth: 2.5, pointRadius: 0, fill: false, tension: .3 },
        { label: 'Rend. Fondamentale', data: fundRange, borderColor: '#36d490', borderWidth: 1.5, borderDash: [5, 3], pointRadius: 0, fill: false, tension: .3 },
        { label: 'Rend. Speculativo', data: specRange, borderColor: '#e37400', borderWidth: 1.5, borderDash: [3, 3], pointRadius: 0, fill: false, tension: .3 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            title: c => `CAPE target: ${c[0].label}`,
            label: c => ` ${c.dataset.label}: ${c.raw >= 0 ? '+' : ''}${c.raw}%/a`,
          },
          backgroundColor: '#fff', borderColor: '#dadce0', borderWidth: 1,
          titleColor: '#202124', bodyColor: '#5f6368', padding: 10,
        },
        annotation: {
          annotations: {
            currentCape: { type: 'line', xMin: capeNow.toFixed(1), xMax: capeNow.toFixed(1), borderColor: 'rgba(217,48,37,.7)', borderWidth: 2, borderDash: [4, 3], label: { display: true, content: `Port. ${capeNow.toFixed(1)}`, position: 'start', font: { size: 10 } } },
            usaCape: { type: 'line', xMin: capeUSA.toFixed(1), xMax: capeUSA.toFixed(1), borderColor: 'rgba(217,48,37,.35)', borderWidth: 1, borderDash: [2, 4], label: { display: capeUSA.toFixed(1) !== capeNow.toFixed(1), content: `S&P ${capeUSA.toFixed(1)}`, position: 'end', font: { size: 9 } } },
            histMean: { type: 'line', xMin: histMeanPort.toFixed(1), xMax: histMeanPort.toFixed(1), borderColor: 'rgba(26,115,232,.5)', borderWidth: 1.5, borderDash: [3, 3], label: { display: true, content: `Media ${histMeanPort}`, position: 'end', font: { size: 10 } } },
          }
        }
      },
      scales: {
        x: { title: { display: true, text: 'CAPE Target (mean-reversion a)', font: { size: 11 } }, ticks: { color: tC, font: { size: 10, family: 'DM Mono' }, maxTicksLimit: 12 }, grid: { color: gC } },
        y: { title: { display: true, text: 'Rendimento annualizzato %', font: { size: 11 } }, ticks: { color: tC, font: { size: 10, family: 'DM Mono' }, callback: v => v + '%' }, grid: { color: gC } },
      },
    },
  });

  // ── Decomposizione testuale Bogle ────────────────────────────────────────
  const mainRes = bogleDecompose(capeNow, capeTarget, years, epsGrowthReal, inflExp, divYield);
  const bogleEl = document.getElementById('valBogleDecomp');
  if (bogleEl && mainRes) {
    const adjNom = mainRes.rNom;
    const adjReal = adjNom - inflExp;
    const portLabel = (typeof getPortLabel !== 'undefined' && typeof state !== 'undefined')
      ? getPortLabel(state?.portfolio || 'eq60') : 'portafoglio selezionato';
    const capeBlendDesc = Math.abs(capePort - capeUSA) > 0.3
      ? ` (USA ${capeUSA.toFixed(1)}, EU ${capeEU.toFixed(1)} → blended ${capePort.toFixed(1)} per ${portLabel})`
      : ` (S&P500)`;
    bogleEl.innerHTML = `
      <div class="sec-label" style="margin-bottom:12px">📖 Decomposizione Bogle — CAPE${capeBlendDesc} → target ${capeTarget} in ${years} anni</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:14px">
        ${[
          ['Div. Yield', (divYield*100).toFixed(2)+'%', 'Cedola implicita del mercato (E/P x 38% payout — S&P500 2020-2024)', 'var(--blue)'],
          ['EPS reale', '+'+(epsGrowthReal*100).toFixed(1)+'%', 'Crescita utili reali (GDP proxy)', 'var(--blue)'],
          ['Inflazione', '+'+(inflExp*100).toFixed(1)+'%', 'HICP Eurozona attuale', 'var(--orange)'],
          ['Rend. Fondamentale', (mainRes.rFundamental*100).toFixed(2)+'%', 'Somma delle 3 componenti fondamentali', 'var(--green)'],
          ['Speculativo (CAPE)', (mainRes.rSpeculative>=0?'+':'')+(mainRes.rSpeculative*100).toFixed(2)+'%/a', `CAPE port. ${capeNow.toFixed(1)}->${capeTarget} in ${years}a`, mainRes.rSpeculative >= 0 ? 'var(--green)' : 'var(--red)'],
          ['= Rendimento Totale', (adjNom>=0?'+':'')+(adjNom*100).toFixed(2)+'%/a', 'Nominale annualizzato scenario selezionato', adjNom > 0.06 ? 'var(--green)' : adjNom > 0.02 ? 'var(--blue)' : 'var(--red)'],
          ['− Inflazione HICP', '−'+(inflExp*100).toFixed(1)+'%', '', 'var(--text3)'],
          ['= Rendimento Reale', (adjReal>=0?'+':'')+(adjReal*100).toFixed(2)+'%/a', 'Potere d\'acquisto reale', adjReal > 0.04 ? 'var(--green)' : adjReal > 0.01 ? 'var(--blue)' : 'var(--red)'],
        ].map(([l,v,d,c]) => `<div style="background:var(--bg);border:1px solid var(--border2);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px">${l}</div>
          <div style="font-size:16px;font-weight:700;font-family:'DM Mono',monospace;color:${c}">${v}</div>
          ${d ? `<div style="font-size:10.5px;color:var(--text3);margin-top:4px">${d}</div>` : ''}
        </div>`).join('')}
      </div>
      <div style="font-size:11.5px;color:var(--text3);line-height:1.7;padding:12px;background:var(--bg2);border-radius:8px">
        <strong>Interpretazione:</strong> Con CAPE portafoglio a ${capeNow.toFixed(1)}${capeBlendDesc} (${capeNow > 30 ? 'storicamente molto caro — top 5% dei casi' : capeNow > 22 ? 'caro — top 25% dei casi' : capeNow > 17 ? 'leggermente sopra la media storica' : 'vicino o sotto la media storica'}),
        la componente speculativa è <strong style="color:${mainRes.rSpeculative < 0 ? 'var(--red)' : 'var(--green)'}">${mainRes.rSpeculative >= 0 ? 'positiva' : 'negativa: un vento contrario'}</strong> di 
        <strong>${Math.abs(mainRes.rSpeculative*100).toFixed(2)}%/a</strong> sul rendimento totale.
        ${mainRes.rSpeculative < -0.01 ? `Su ${years} anni, questo headwind riduce il rendimento cumulato di circa <strong style="color:var(--red)">${((Math.pow(1+mainRes.rSpeculative, years)-1)*100).toFixed(0)}%</strong> rispetto al solo rendimento fondamentale.` : ''}
        Il rendimento fondamentale (dividendi + crescita utili + inflazione) rimane stabile a <strong>${(mainRes.rFundamental*100).toFixed(2)}%/a</strong> indipendentemente dai multipli.
        <div style="margin-top:8px;font-size:10.5px;color:var(--text3);line-height:1.7;border-top:1px solid var(--border2);padding-top:6px">Nota: la decomposizione Fondamentale + Speculativo è un'approssimazione additiva; il rendimento totale (moltiplicativo) è ${(mainRes.rNom*100).toFixed(2)}%/a con termine di interazione ${((mainRes.rNom - mainRes.rFundamental - mainRes.rSpeculative)*100).toFixed(2)}pp. Dividend yield calcolato su payout ratio S&P500 ~38% (2020-2024, al netto dei buyback che sostituiscono dividendi — fonte S&P Global). Regressione Shiller: R²≈0.38-0.45 a 10a, più alta a 20-30a.</div>
      </div>`;
  }
}

// ── Binding slider tab valutazioni ───────────────────────────────────────────
(function initValuationTab() {
  function bindVal(sid, lid, key, fmt, isFloat) {
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.getElementById(sid);
      const l = document.getElementById(lid);
      if (!s || !l) return;
      s.oninput = () => {
        valState[key] = isFloat ? parseFloat(s.value) / 100 : parseInt(s.value);
        l.textContent = fmt(valState[key]);
        renderValuationStress();
      };
    });
  }
  bindVal('sValCapeTarget', 'lValCapeTarget', 'capeTarget', v => v, false);
  bindVal('sValYears',      'lValYears',      'years',      v => v + 'a', false);
  bindVal('sValEPS',        'lValEPS',        'epsGrowthReal', v => (v*100).toFixed(1), true);

  // Render quando si entra nel tab
  document.addEventListener('DOMContentLoaded', () => {
    // Hook nella switchTab esistente
    const origSwitch = window.switchTab;
    if (typeof origSwitch === 'function') {
      window.switchTab = function(tabId, ...args) {
        origSwitch(tabId, ...args);
        if (tabId === 'valuation') {
          setTimeout(() => {
            const d = window.liveMarketData;
            if (d && d.cape_sp500) renderValuationStress();
            else fetchLiveMarketData().then(renderValuationStress);
          }, 50);
        }
      };
    }
  });

  // Render anche quando liveData viene aggiornato
  // NOTA: non sovrascrivere fetchLiveMarketData qui — potrebbe creare ricorsione
  // o perdere il riferimento alla funzione originale. Usiamo un hook post-fetch
  // tramite un listener sull'oggetto liveMarketData invece.
  // Il render viene già triggerato dal switchTab hook sopra.

  window.renderValuationStress = renderValuationStress;
})();
