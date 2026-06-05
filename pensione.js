// ██████  MODULO — PIANO PENSIONISTICO INTEGRATO
// Stima INPS contributivo/misto/retributivo + Fondo Pensione + ETF Portfolio
// ══════════════════════════════════════════════════════════════

// ── Stato modulo ─────────────────────────────────────────────
let penState = {
  age:        35,
  retAge:     67,
  lifeExp:    85,
  contYears:  10,      // anni contributi già versati
  ral:        35000,   // RAL attuale lordo annuo
  ralGrowth:  0.015,   // crescita reale RAL annua
  aliqCont:   0.33,    // aliquota contributiva IVS (dip. priv. = 33%)
  montante:   0,       // montante contributivo già accumulato
  desired:    2000,    // spesa mensile desiderata in pensione (€ oggi)
  infl:       0.02,    // inflazione attesa
  pil:        0.015,   // rivalutazione montante INPS (PIL reale medio)
  coeffDecl:  0.003,   // declino annuo del coeff. di trasformazione (revisioni biennali ISTAT)
  fpVers:     100,     // versamento mensile fondo pensione (quota lavoratore)
  fpRet:      0.04,    // rendimento annuo fondo pensione (lordo)
  tfrSi:      true,    // TFR versato al fondo pensione (quota = RAL/13.5, auto)
  regime:     'contributivo',
  // Fondo negoziale
  isNegoziale:      false,   // è un fondo negoziale (con contributo datoriale)?
  contDatoriale:    0.015,   // contributo datoriale (% RAL, default 1,5%)
  contLavoratore:   0.013,   // contributo lavoratore aggiuntivo contrattuale (% RAL, default 1,3%)
  // Risparmio fiscale
  rispFiscDest:     'reinvesti_fp', // 'spendi' | 'reinvesti_fp' | 'reinvesti_etf'
  // Dati ETF ereditati dal Simulatore (aggiornati su importa)
  etfCapital: 0,       // capitale ETF stimato al pensionamento
  etfRet:     0.05,    // rendimento annuo NETTO del portafoglio del Simulatore (default ~bilanciato; aggiornato su importa)
};

let chartPen     = null;
let chartPenFisc = null;
let chartRispFisc = null;

// ── Coefficienti di trasformazione INPS — biennio 2025/2026 ──
// Fonte: DM 436/2024 (Min. Lavoro, 20/11/2024), in vigore dal 1°/1/2025.
// Valori ufficiali verificati per le età 57-67 e 71. Le età 68-69-70
// (assenti nelle fonti testuali consultate) sono interpolate
// geometricamente tra i valori ufficiali certi a 67 (5,608%) e 71
// (6,510%), con progressione monotòna coerente col trend reale.
const COEFF_TRASF = {
  57: 0.04204, 58: 0.04308, 59: 0.04419, 60: 0.04536,
  61: 0.04661, 62: 0.04795, 63: 0.04936, 64: 0.05088,
  65: 0.05250, 66: 0.05423, 67: 0.05608, 68: 0.05821,
  69: 0.06042, 70: 0.06272, 71: 0.06510,
};

function getCoeffTrasf(age) {
  const ages = Object.keys(COEFF_TRASF).map(Number).sort((a, b) => a - b);
  if (age <= ages[0]) return COEFF_TRASF[ages[0]];
  if (age >= ages[ages.length - 1]) return COEFF_TRASF[ages[ages.length - 1]];
  const lo = ages.filter(a => a <= age).pop();
  const hi = ages.filter(a => a >  age)[0];
  const t  = (age - lo) / (hi - lo);
  return COEFF_TRASF[lo] + t * (COEFF_TRASF[hi] - COEFF_TRASF[lo]);
}

// ── Descrizioni regime ────────────────────────────────────────
const PEN_REGIME_DESC = {
  contributivo: `<strong>Contributivo puro (L. 335/1995):</strong> per chi ha iniziato a lavorare dopo il 31/12/1995 o ha meno di 18 anni di contributi al 31/12/1995.
    Il montante individuale viene rivalutato annualmente al tasso di capitalizzazione (media quinquennale PIL nominale).
    La pensione lorda = montante × coefficiente di trasformazione (per età). <em>Pensione minima di importo almeno pari all'assegno sociale × 1,5 per accedere a 64 anni.</em>`,
  misto: `<strong>Sistema misto (L. 335/1995):</strong> per chi aveva almeno 18 anni di contributi al 31/12/1995.
    La quota ante-1996 è calcolata con il metodo retributivo (% del reddito degli ultimi anni × anni di servizio × aliquota di rendimento).
    La quota post-1996 è contributiva. Il modello calcola entrambe le quote e le somma.`,
  retributivo: `<strong>Retributivo (solo ante-1996, meno di 18 anni contrib. al 31/12/1995):</strong>
    Tutto calcolato con il metodo retributivo sulla media degli ultimi redditi. Progressivamente meno frequente — si applica solo a casi residuali con contributi pre-1996 e meno di 18 anni di anzianità al 31/12/1995.`,
};

// ── Calcolo core ──────────────────────────────────────────────
function calcPensione() {
  const { age, retAge, lifeExp, contYears, ral, ralGrowth, aliqCont,
          montante, desired, infl, pil, fpVers, fpRet,
          tfrSi, regime, isNegoziale, contDatoriale, contLavoratore,
          rispFiscDest } = penState;

  const yearsToRet   = Math.max(0, retAge - age);
  const yearsInPen   = Math.max(0, lifeExp - retAge);

  // ── 1. Calcolo deducibilità e risparmio fiscale annuo ─────
  // Limite deducibilità annua D.Lgs. 252/2005: €5.300,00 (dal 2026; era €5.164,57 fino al 2025)
  // Versamento lavoratore volontario (mensile × 12)
  const fpVersAnnVolont = fpVers * 12;
  // Quota lavoratore contrattuale da fondo negoziale (% RAL)
  const fpVersAnnLav = isNegoziale ? ral * contLavoratore : 0;
  // Quota datoriale (non è reddito del lavoratore → non entra nella deducibilità IRPEF del lavoratore)
  const fpVersAnnDat = (isNegoziale && tfrSi) ? ral * contDatoriale : 0;
  // TFR annuo (non deducibile, è accantonamento figurativo)
  const TFR_DIVISOR  = 13.5;
  const tfrAnnBase   = tfrSi ? (ral / TFR_DIVISOR) : 0;

  // Contributi deducibili = versamento volontario + quota lavoratore contrattuale.
  // Il plafond di legge (5.300€/anno dal 2026) è COMPLESSIVO: vi concorre anche il contributo
  // DATORIALE, che pur non essendo dedotto dal lavoratore erode lo spazio deducibile
  // disponibile. Il TFR conferito resta invece fuori dal plafond (non deducibile).
  const deduzMassima      = 5300.00;
  const plafondResiduo    = Math.max(0, deduzMassima - fpVersAnnDat);
  const deduzLorda        = fpVersAnnVolont + fpVersAnnLav;
  const deduzEffettiva    = Math.min(deduzLorda, plafondResiduo);
  const aliqMargIRPEF  = calcAliqMargIRPEF(ral);
  const risparmioFisc  = deduzEffettiva * aliqMargIRPEF; // risparmio IRPEF annuo

  // Risparmio fiscale destinazione:
  // 'spendi'        → esce dal sistema (extra consumo, non investe)
  // 'reinvesti_fp'  → aggiunto come versamento extra al FP
  // 'reinvesti_etf' → investito nel portafoglio ETF (fuori dal FP)
  const rispFiscMens = risparmioFisc / 12;
  const extraFP  = rispFiscDest === 'reinvesti_fp'  ? risparmioFisc : 0;
  const extraETF = rispFiscDest === 'reinvesti_etf' ? risparmioFisc : 0;

  // ── 2. Proiezione anno per anno ──────────────────────────
  let montanteIniziale = montante;
  if (montanteIniziale <= 0 && contYears > 0) {
    let stima = 0;
    for (let k = 0; k < contYears; k++) {
      const ralPassata = ral / Math.pow(1 + ralGrowth, k);
      stima = stima * (1 + pil) + ralPassata * aliqCont;
    }
    montanteIniziale = stima;
  }
  let cumMontante  = montanteIniziale;
  let capFP        = 0;
  let capETFBonus  = 0;   // capital accumulato dal risparmio fiscale reinvestito in ETF
  let capETFBonusVers = 0; // base di costo (somma dei versamenti) per il capital gain
  let capTfrAz     = 0;   // TFR lasciato in azienda: liquidazione separata (rivalutaz. di legge)
  let capTfrFp     = 0;   // TFR conferito al fondo: quota di capFP derivante dal solo TFR
  const revAzienda = 0.015 + 0.75 * infl; // rivalutazione TFR di legge (art. 2120 c.c.)
  const rateCapIT  = pil + infl;

  const accData = [];
  for (let y = 0; y < yearsToRet; y++) {
    const curRal     = ral * Math.pow(1 + ralGrowth + infl, y);
    const contAnn    = curRal * aliqCont;
    cumMontante      = cumMontante * (1 + rateCapIT) + contAnn;

    // TFR corrente sull'anno
    const tfrAnnCur  = tfrSi ? (curRal / TFR_DIVISOR) : 0;
    // Se il TFR resta in azienda, si accumula come liquidazione separata, rivalutata
    // per legge (1,5% + 75% inflazione). Verrà tassato separatamente al riscatto.
    if (!tfrSi) {
      capTfrAz = capTfrAz * (1 + revAzienda) + (curRal / TFR_DIVISOR);
    }
    // Fondo negoziale: contributo datoriale + lavoratore proporzionali alla RAL corrente.
    // Il contributo DATORIALE richiede il conferimento del TFR al fondo (requisito di legge/CCNL):
    // se il TFR resta in azienda, il datore non versa la sua quota. Il contributo del lavoratore
    // e il versamento volontario restano invece possibili anche con TFR in azienda.
    const fpDatCur   = (isNegoziale && tfrSi) ? curRal * contDatoriale  : 0;
    const fpLavCur   = isNegoziale ? curRal * contLavoratore : 0;

    // Totale versato nel FP quest'anno:
    // versamento volontario + quota negoziale lavoratore + TFR + eventuale extra da risparmio fiscale reinvestito
    const fpAnn      = fpVers * 12 + fpLavCur + tfrAnnCur + fpDatCur + extraFP;

    // NOTA FISCALE FP: il rendimento annuo è tassato al 20% ogni anno (non al 26% come ETF).
    // Implementazione: il rendimento netto è fpRet * (1 - 0.20) = fpRet * 0.80
    // (a differenza del portafoglio ETF ad accumulazione dove la tassazione è differita)
    capFP = capFP * (1 + fpRet * 0.80) + fpAnn;
    // Quota del capitale FP derivante dal solo TFR conferito (per mostrarne lordo/netto)
    if (tfrSi) {
      capTfrFp = capTfrFp * (1 + fpRet * 0.80) + tfrAnnCur;
    }

    // ETF bonus da risparmio fiscale reinvestito nel portafoglio del Simulatore.
    // Cresce al rendimento NETTO del portafoglio scelto (etfRet), con tassazione
    // del capital gain DIFFERITA al riscatto (a differenza del FP, tassato lungo il
    // percorso al 20%). La tassa sulla plusvalenza viene applicata più sotto, al riscatto.
    if (extraETF > 0) {
      capETFBonus = capETFBonus * (1 + penState.etfRet) + extraETF;
      capETFBonusVers += extraETF;
    }

    accData.push({
      year:         y + 1,
      age:          age + y + 1,
      ral:          Math.round(curRal),
      contrib:      Math.round(contAnn),
      montanteINPS: Math.round(cumMontante),
      capFP:        Math.round(capFP),
      fpVersAnn:    Math.round(fpAnn),
      tfrAnn:       Math.round(tfrAnnCur),
      fpDatAnn:     Math.round(fpDatCur),
      fpLavAnn:     Math.round(fpLavCur),
      rispFiscAnn:  Math.round(risparmioFisc),
    });
  }

  // ── 3. Pensione INPS lorda ─────────────────────────────
  const coeffTrasfBase = getCoeffTrasf(retAge);
  const coeffTrasf     = coeffTrasfBase * Math.pow(1 - (penState.coeffDecl ?? 0), yearsToRet);

  let pensioneLordaAnn;
  if (regime === 'contributivo') {
    pensioneLordaAnn = cumMontante * coeffTrasf;
  } else if (regime === 'misto') {
    const anniAnte   = Math.min(contYears, Math.max(0, 1996 - (new Date().getFullYear() - contYears)));
    const rdtMedio   = ral * 0.85;
    const quotaRet   = rdtMedio * 0.02 * anniAnte;
    const quotaCont  = cumMontante * coeffTrasf;
    pensioneLordaAnn = quotaRet + quotaCont;
  } else {
    const totalAnni  = contYears + yearsToRet;
    const rdtMedioFin= ral * Math.pow(1 + ralGrowth, yearsToRet) * 0.80;
    pensioneLordaAnn = rdtMedioFin * 0.02 * Math.min(totalAnni, 40);
  }

  const pensioneLordaMens = pensioneLordaAnn / 12;
  const irpefAnn          = calcIRPEF(pensioneLordaAnn);
  const pensioneNettaAnn  = pensioneLordaAnn - irpefAnn;
  const pensioneNettaMens = pensioneNettaAnn / 12;
  const ralFinale         = ral * Math.pow(1 + ralGrowth + infl, yearsToRet);
  const tassoSost         = pensioneLordaAnn / ralFinale;

  // ── 4. Rendita fondo pensione ──────────────────────────
  const anniAdesione   = yearsToRet;
  const aliqFP         = Math.max(0.09, 0.15 - Math.max(0, anniAdesione - 15) * 0.003);
  const anniVita       = Math.max(1, lifeExp - retAge);
  const iTecnico       = Math.max(0.005, fpRet * (1 - aliqFP) * 0.6);
  const annuityFactor  = iTecnico > 0 ? iTecnico / (1 - Math.pow(1 + iTecnico, -anniVita)) : 1 / anniVita;
  const rendFPAnn      = capFP * annuityFactor;
  const rendFPNetta    = rendFPAnn * (1 - aliqFP);
  const rendFPMens     = rendFPNetta / 12;

  // ── 5. ETF portafoglio (da Simulatore + bonus risparmio fiscale) ──
  // L'ETF bonus sconta la tassazione del capital gain (26%) DIFFERITA al riscatto,
  // solo sulla plusvalenza (capitale meno base di costo) — a differenza del FP,
  // già tassato al 20% lungo il percorso.
  const capETFBonusGain = Math.max(0, capETFBonus - capETFBonusVers);
  const capETFBonusNetto = capETFBonusVers + capETFBonusGain * (1 - 0.26);

  // TFR lasciato in azienda: liquidazione separata netta (tassazione separata
  // all'aliquota media IRPEF, proxy clampata 23-43%). Mostrato come VOCE SEPARATA
  // (è un incasso una tantum, non un capitale a rendita), non sommato all'ETF.
  const aliqSepTFR     = Math.min(0.43, Math.max(0.23, aliqMargIRPEF));
  const capTfrAzNetto  = capTfrAz * (1 - aliqSepTFR);
  // Lordo/netto del TFR nei due regimi (per la card di trasparenza fiscale):
  //  • azienda: tassazione separata all'aliquota media IRPEF
  //  • fondo:   tassazione agevolata 15%→9% (aliqFP)
  const tfrInfo = {
    azienda: { lordo: Math.round(capTfrAz),  netto: Math.round(capTfrAzNetto),        aliq: aliqSepTFR },
    fondo:   { lordo: Math.round(capTfrFp),  netto: Math.round(capTfrFp*(1-aliqFP)),  aliq: aliqFP },
  };
  const etfCap         = penState.etfCapital + capETFBonusNetto;
  const swr            = 0.04;
  const etfPrelievoAnn = etfCap * swr;
  const etfPrelievoMens = etfPrelievoAnn / 12;

  // ── 6. Gap analysis in pensione ───────────────────────
  const decData = [];
  let capFPResiduo  = capFP;
  let capETFResiduo = etfCap;
  for (let y = 0; y < yearsInPen; y++) {
    const curAge         = retAge + y;
    const fabbisognoMens = desired * Math.pow(1 + infl, yearsToRet + y);
    const fabbisognoAnn  = fabbisognoMens * 12;
    const pensNettaY     = pensioneNettaAnn * Math.pow(1 + infl * 0.75, y);
    const rendFPY        = rendFPNetta * Math.pow(1 + fpRet * (1 - aliqFP) * 0.5, y);
    const etfY           = Math.min(capETFResiduo * swr, Math.max(0, fabbisognoAnn - pensNettaY - rendFPY));
    capETFResiduo        = Math.max(0, capETFResiduo * (1 + fpRet * 0.7) - etfY);
    const coperto        = pensNettaY + rendFPY + etfY;
    const gap            = Math.max(0, fabbisognoAnn - coperto);
    decData.push({
      year: y + 1, age: curAge,
      fabbisognoMens: Math.round(fabbisognoMens), fabbisognoAnn: Math.round(fabbisognoAnn),
      pensNettaMens:  Math.round(pensNettaY / 12), pensNettaAnn:  Math.round(pensNettaY),
      rendFPMens:     Math.round(rendFPY / 12),    rendFPAnn:     Math.round(rendFPY),
      etfMens:        Math.round(etfY / 12),        etfAnn:        Math.round(etfY),
      gapMens:        Math.round(gap / 12),          gapAnn:        Math.round(gap),
      copertoPct:     fabbisognoAnn > 0 ? Math.round((coperto / fabbisognoAnn) * 100) : 100,
    });
  }

  // ── 7. fiscData completo ───────────────────────────────
  const tfrAnnuoMedio = tfrSi ? (ral / TFR_DIVISOR) : 0;
  const fiscData = {
    aliqFP, aliqMargIRPEF, risparmioFisc, rispFiscMens,
    deduzEffettiva, deduzLorda, anniAdesione, capFP, rendFPNetta,
    tfrAnnuoMedio, extraFP, extraETF, capETFBonus,
    fpDatoriale: fpVersAnnDat, fpLavoratore: fpVersAnnLav, fpVersAnnDat, plafondResiduo,
    fpVersAnnVolont, rispFiscDest,
  };

  return {
    accData, decData, fiscData,
    pensioneLordaMens: Math.round(pensioneLordaMens),
    pensioneLordaAnn:  Math.round(pensioneLordaAnn),
    pensioneNettaMens: Math.round(pensioneNettaMens),
    pensioneNettaAnn:  Math.round(pensioneNettaAnn),
    irpefAnn:          Math.round(irpefAnn),
    tassoSost, coeffTrasf, coeffTrasfBase,
    cumMontante:       Math.round(cumMontante),
    montanteIniziale:  Math.round(montanteIniziale),
    capFP:             Math.round(capFP),
    rendFPMens:        Math.round(rendFPMens),
    rendFPNetta:       Math.round(rendFPNetta),
    aliqFP,
    etfPrelievoMens:   Math.round(etfPrelievoMens),
    etfCap:            Math.round(etfCap),
    capETFBonus:       Math.round(capETFBonus),
    capTfrAzNetto:     Math.round(capTfrAzNetto),
    tfrInfo,
    yearsToRet, yearsInPen,
    dec0: decData[0] ?? null,
  };
}

// ── IRPEF scaglioni 2025 ──────────────────────────────────────
function calcIRPEF(reddito) {
  const scaglioni = [
    { max: 28000,    aliq: 0.23 },
    { max: 50000,    aliq: 0.35 },
    { max: Infinity, aliq: 0.43 },
  ];
  let imposta = 0, prev = 0;
  for (const { max, aliq } of scaglioni) {
    if (reddito <= prev) break;
    imposta += (Math.min(reddito, max) - prev) * aliq;
    prev = max;
  }
  const detrazione = reddito <= 8000 ? reddito : reddito <= 55000 ? Math.max(0, 1955 + 1190 * (55000 - reddito) / 47000) : 0;
  return Math.max(0, imposta - detrazione);
}

function calcAliqMargIRPEF(ral) {
  if (ral <= 28000) return 0.23;
  if (ral <= 50000) return 0.35;
  return 0.43;
}

// ── Suggerisci versamento ottimale ─────────────────────────
function calcPenSuggerito() {
  const original = penState.fpVers;
  let lo = 0, hi = 5000, best = original;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    penState.fpVers = mid;
    const r = calcPensione();
    const dec0 = r.dec0;
    if (!dec0) break;
    const coperto = dec0.pensNettaAnn + dec0.rendFPAnn + dec0.etfAnn;
    if (coperto < dec0.fabbisognoAnn) lo = mid;
    else { best = mid; hi = mid; }
  }
  penState.fpVers = Math.ceil(best / 10) * 10;
  const sl = document.getElementById('sPenFPVers');
  if (sl) { sl.value = penState.fpVers; document.getElementById('lPenFPVers').textContent = fmt(penState.fpVers); }
  renderPensione();
}

// ── Import dati dal Simulatore ─────────────────────────────
function importPenFromSim() {
  if (typeof state === 'undefined') return;
  penState.age = state.age || penState.age;
  let capStimato = 0;
  try {
    const yearsToRet = Math.max(0, penState.retAge - penState.age);
    const dSim = project('normal', false);
    capStimato = dSim[Math.min(yearsToRet, dSim.length - 1)]?.value ?? 0;
    penState.etfCapital = capStimato;
    // Rendimento NETTO del portafoglio scelto nel Simulatore (per il reinvestimento del risparmio fiscale in ETF)
    if (typeof getRate === 'function') {
      const terRate = (typeof state.ter === 'number' ? state.ter : 0) / 100;
      const rNet = getRate(state.portfolio, 'normal', 0, state.age) - terRate;
      if (isFinite(rNet) && rNet > 0) penState.etfRet = rNet;
    }
  } catch(e) { penState.etfCapital = 0; }
  const slAge = document.getElementById('sPenAge');
  if (slAge) { slAge.value = penState.age; document.getElementById('lPenAge').textContent = penState.age; }
  const swrMens = Math.round(capStimato * 0.04 / 12);
  document.getElementById('penImportStatus').innerHTML =
    `<span style="color:var(--green)">✅ Importato dal Simulatore: età <strong>${penState.age}</strong> anni · capitale ETF stimato al pensionamento (scenario Base): <strong>${fmt(penState.etfCapital)}</strong> → ~${fmt(swrMens)}/mese al 4% SWR, a completamento di INPS e fondo pensione.</span>`;
  renderPensione();
}

// ── Render principale ─────────────────────────────────────
function renderPensione() {
  try {
    const r = calcPensione();
    window.lastPenResult = { r, params: { ...penState } };
    const tfrLbl = document.getElementById('lPenTFRAuto');
    if (tfrLbl) tfrLbl.textContent = penState.tfrSi ? fmt(Math.round(penState.ral / 13.5)) + '/anno' : 'non conferito';
    const mHint = document.getElementById('penMontanteHint');
    if (mHint) {
      if (penState.montante <= 0 && penState.contYears > 0)
        mHint.innerHTML = `Stimato automaticamente da <strong>${penState.contYears} anni</strong> già versati: <strong>${fmt(r.montanteIniziale)}</strong>. Inserisci il valore esatto dal sito INPS per più precisione.`;
      else if (penState.montante <= 0)
        mHint.innerHTML = `Nessun contributo pregresso. Imposta gli "anni già versati" o inserisci il montante dal sito INPS.`;
      else
        mHint.innerHTML = `Valore inserito manualmente. Riporta a <strong>0</strong> per stimarlo dagli anni già versati.`;
    }
    const negBlock = document.getElementById('penNegozialBlock');
    if (negBlock) negBlock.style.display = penState.isNegoziale ? 'block' : 'none';
    const negRAL = document.getElementById('penNegRALShow');
    const negDat = document.getElementById('penNegDatShow');
    const negLav = document.getElementById('penNegLavShow');
    if (negRAL) negRAL.textContent = Math.round(penState.ral).toLocaleString('it-IT');
    if (negDat) negDat.textContent = '€' + Math.round(penState.ral * penState.contDatoriale).toLocaleString('it-IT');
    if (negLav) negLav.textContent = '€' + Math.round(penState.ral * penState.contLavoratore).toLocaleString('it-IT');
    // sync slider labels
    const lDat = document.getElementById('lPenContDat');
    const lLav = document.getElementById('lPenContLav');
    if (lDat) lDat.textContent = (penState.contDatoriale * 100).toFixed(2) + '%';
    if (lLav) lLav.textContent = (penState.contLavoratore * 100).toFixed(2) + '%';

    try { renderPenKPI(r); }      catch(e) { console.error('renderPenKPI:', e); }
    try { renderPenChart(r); }    catch(e) { console.error('renderPenChart:', e); }
    try { renderPenINPS(r); }     catch(e) { console.error('renderPenINPS:', e); }
    try { renderPenFP(r); }       catch(e) { console.error('renderPenFP:', e); }
    try { renderPenRispFisc(r); } catch(e) { console.error('renderPenRispFisc:', e); }
    try { renderPenFiscComp(r); } catch(e) { console.error('renderPenFiscComp:', e); }
    try { renderPenAccTable(r); } catch(e) { console.error('renderPenAccTable:', e); }
    try { renderPenDecTable(r); } catch(e) { console.error('renderPenDecTable:', e); }
  } catch(e) {
    console.error('renderPensione fatale:', e);
  }
}

// ── KPI Cards ────────────────────────────────────────────────
function renderPenKPI(r) {
  const { pensioneNettaMens, rendFPMens, etfPrelievoMens, dec0, yearsToRet, tassoSost, cumMontante, capFP, etfCap, coeffTrasf, capTfrAzNetto, tfrInfo } = r;
  const deflaz     = Math.pow(1 + penState.infl, yearsToRet);
  const toReal     = v => v / deflaz;
  const fabb       = dec0?.fabbisognoMens ?? (penState.desired * deflaz);
  const totMens    = pensioneNettaMens + rendFPMens + etfPrelievoMens;
  const gap        = Math.max(0, fabb - totMens);
  const copertoPct = fabb > 0 ? Math.round((totMens / fabb) * 100) : 100;
  const gapCol     = gap === 0 ? 'var(--green)' : gap < fabb * 0.2 ? 'var(--orange)' : 'var(--red)';
  const tsCol      = tassoSost >= 0.7 ? 'var(--green)' : tassoSost >= 0.5 ? 'var(--orange)' : 'var(--red)';
  const inpsReal   = toReal(pensioneNettaMens), fpReal = toReal(rendFPMens), etfReal = toReal(etfPrelievoMens), totReal = toReal(totMens);

  document.getElementById('penKpiCards').innerHTML = `
    <div class="mcard">
      <div class="ml">Pensione INPS netta</div>
      <div class="mv" style="color:var(--blue)">${fmt(pensioneNettaMens)}<span style="font-size:11px;opacity:.6">/m</span></div>
      <div class="ms">≈ ${fmt(inpsReal)}/m in € di oggi · coeff. ${(coeffTrasf*100).toFixed(3)}%${r.coeffTrasfBase && Math.abs(r.coeffTrasfBase-coeffTrasf)>1e-5?` (2025: ${(r.coeffTrasfBase*100).toFixed(3)}%)`:''}</div>
    </div>
    <div class="mcard">
      <div class="ml">Rendita Fondo Pensione</div>
      <div class="mv" style="color:var(--purple)">${fmt(rendFPMens)}<span style="font-size:11px;opacity:.6">/m</span></div>
      <div class="ms">≈ ${fmt(fpReal)}/m in € di oggi · cap. ${fmt(capFP)}</div>
    </div>
    ${tfrInfo && tfrInfo.fondo.lordo > 0 ? `
    <div class="mcard">
      <div class="ml">TFR nel fondo (quota)</div>
      <div class="mv" style="color:var(--purple)">${fmt(tfrInfo.fondo.netto)}</div>
      <div class="ms">${fmt(tfrInfo.fondo.lordo)} lordo → ${fmt(tfrInfo.fondo.netto)} netto (tass. agevolata ${(tfrInfo.fondo.aliq*100).toFixed(1)}%) · già incluso nel capitale FP</div>
    </div>` : ''}
    <div class="mcard">
      <div class="ml">Prelievo ETF Portfolio</div>
      <div class="mv" style="color:var(--teal)">${fmt(etfPrelievoMens)}<span style="font-size:11px;opacity:.6">/m</span></div>
      <div class="ms">≈ ${fmt(etfReal)}/m in € di oggi · cap. ${fmt(etfCap)} · SWR 4%</div>
    </div>
    ${capTfrAzNetto > 0 ? `
    <div class="mcard">
      <div class="ml">TFR liquidazione (azienda)</div>
      <div class="mv" style="color:var(--orange)">${fmt(capTfrAzNetto)}</div>
      <div class="ms">${fmt(tfrInfo.azienda.lordo)} lordo → ${fmt(tfrInfo.azienda.netto)} netto (tass. separata ${(tfrInfo.azienda.aliq*100).toFixed(0)}%) · incasso una tantum · ≈ ${fmt(Math.round(toReal(capTfrAzNetto)))} in € di oggi</div>
    </div>` : ''}
    <div class="mcard">
      <div class="ml">Totale disponibile</div>
      <div class="mv" style="color:${copertoPct>=100?'var(--green)':'var(--orange)'}">${fmt(totMens)}<span style="font-size:11px;opacity:.6">/m</span></div>
      <div class="ms">≈ ${fmt(totReal)}/m oggi · fabbisogno ${fmt(Math.round(fabb))}/m</div>
    </div>
    <div class="mcard">
      <div class="ml">Gap previdenziale</div>
      <div class="mv" style="color:${gapCol}">${gap === 0 ? '✅ Zero' : fmt(gap) + '/m'}</div>
      <div class="ms" style="color:${gapCol};font-weight:600">Copertura: ${copertoPct}%</div>
    </div>
    <div class="mcard">
      <div class="ml">Tasso di sostituzione</div>
      <div class="mv" style="color:${tsCol}">${(tassoSost*100).toFixed(1)}%</div>
      <div class="ms">INPS lorda / RAL finale</div>
    </div>
    <div class="mcard">
      <div class="ml">Montante INPS al pensionamento</div>
      <div class="mv" style="color:var(--blue)">${fmt(cumMontante)}</div>
      <div class="ms">${yearsToRet} anni di accumulo</div>
    </div>`;

  // Incidenza tre gambe
  const incEl = document.getElementById('penLegsBox');
  if (incEl) {
    const pI = totMens > 0 ? pensioneNettaMens / totMens * 100 : 0;
    const pF = totMens > 0 ? rendFPMens / totMens * 100 : 0;
    const pE = totMens > 0 ? etfPrelievoMens / totMens * 100 : 0;
    incEl.innerHTML = `
      <div class="sec-label" style="font-size:11px;margin-bottom:10px">⚖️ Da dove arriva il tuo reddito in pensione (${fmt(totMens)}/mese)</div>
      <div style="display:flex;height:34px;border-radius:8px;overflow:hidden;border:1px solid var(--border2);margin-bottom:10px">
        <div style="width:${pI}%;background:var(--blue);min-width:${pI>0?'2px':'0'}"></div>
        <div style="width:${pF}%;background:var(--purple);min-width:${pF>0?'2px':'0'}"></div>
        <div style="width:${pE}%;background:var(--teal);min-width:${pE>0?'2px':'0'}"></div>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px">
        <span style="color:var(--blue)">● <strong>INPS ${pI.toFixed(0)}%</strong> — ${fmt(pensioneNettaMens)}/m</span>
        <span style="color:var(--purple)">● <strong>Fondo Pensione ${pF.toFixed(0)}%</strong> — ${fmt(rendFPMens)}/m</span>
        <span style="color:var(--teal)">● <strong>ETF ${pE.toFixed(0)}%</strong> — ${fmt(etfPrelievoMens)}/m</span>
      </div>
      <div style="font-size:11.5px;color:var(--text3);margin-top:8px;line-height:1.5">
        Il <strong>fondo pensione integrativo incide per il ${pF.toFixed(0)}%</strong> del tuo reddito in pensione${pF < 1 ? ' (aumenta il versamento mensile per farlo crescere)' : ''}.
        ${pE < 1 ? 'Il piano ETF non è ancora collegato: usa "Importa dal Simulatore" per includerlo.' : 'Il piano ETF copre il ' + pE.toFixed(0) + '% a completamento delle altre due gambe.'}
      </div>`;
  }

  // Alert gap
  const alertEl = document.getElementById('penGapAlert');
  if (gap === 0) {
    alertEl.innerHTML = `<div style="background:#e6f4ea;border:1px solid #81c995;border-radius:var(--radius-sm);padding:12px 16px;font-size:13px;color:#1e8e3e;margin-bottom:4px">
      ✅ <strong>Piano completo:</strong> le tre fonti coprono interamente il fabbisogno desiderato.
    </div>`;
  } else {
    alertEl.innerHTML = `<div style="background:#fce8e6;border:1px solid #f28b82;border-radius:var(--radius-sm);padding:12px 16px;font-size:13px;color:#c5221f;margin-bottom:4px">
      ⚠️ <strong>Gap di ${fmt(gap)}/mese</strong> (${fmt(gap*12)}/anno) non coperto al primo anno di pensione.
      Aumenta il versamento mensile al fondo pensione o il PAC ETF, oppure usa <em>"Calcola versamento ottimale"</em>.
    </div>`;
  }
}

// ── Grafico principale copertura ─────────────────────────────
function renderPenChart(r) {
  if (chartPen) { chartPen.destroy(); chartPen = null; }
  const { decData } = r;
  if (!decData.length) return;
  const labels  = decData.map(d => d.age + 'a');
  const gC = 'rgba(0,0,0,.05)', tC = 'rgba(0,0,0,.45)';
  const canvasPen = document.getElementById('chPen');
  // Canvas in tab nascosto (display:none) → offsetParent null → 0×0 → Chart.js errore.
  // Verrà ridisegnato dal setTimeout in switchTab quando il tab diventa visibile.
  if (!canvasPen || canvasPen.offsetParent === null) return;
  chartPen = new Chart(canvasPen, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Pensione INPS netta',   data: decData.map(d => d.pensNettaMens), backgroundColor: 'rgba(26,115,232,0.75)',  stack: 'cover', order: 2 },
        { label: 'Rendita Fondo Pensione',data: decData.map(d => d.rendFPMens),    backgroundColor: 'rgba(147,52,230,0.75)', stack: 'cover', order: 2 },
        { label: 'Prelievo ETF Portfolio',data: decData.map(d => d.etfMens),       backgroundColor: 'rgba(0,150,136,0.75)',  stack: 'cover', order: 2 },
        { label: 'Gap non coperto',       data: decData.map(d => d.gapMens),       backgroundColor: 'rgba(217,48,37,0.35)',  stack: 'cover', order: 2 },
        { label: 'Fabbisogno reale',      data: decData.map(d => d.fabbisognoMens),type: 'line', borderColor: '#d93025', borderWidth: 2, borderDash: [5,4], backgroundColor: 'transparent', pointRadius: 0, fill: false, tension: .3, order: 1 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { font: { family: 'DM Mono', size: 11 }, boxWidth: 16 } },
        tooltip: {
          callbacks: {
            title: c => 'Età ' + c[0].label,
            label: c => ' ' + c.dataset.label + ': ' + fmt(c.raw) + '/m',
            afterBody: items => { const d = decData[items[0].dataIndex]; return [`Copertura totale: ${d.copertoPct}%`]; }
          },
          backgroundColor: '#fff', borderColor: '#dadce0', borderWidth: 1, titleColor: '#202124', bodyColor: '#5f6368', padding: 10
        }
      },
      scales: {
        x: { stacked: true, ticks: { color: tC, font: { size: 11, family: 'DM Mono' } }, grid: { color: gC } },
        y: { stacked: true, ticks: { color: tC, font: { size: 11, family: 'DM Mono' }, callback: v => fmt(v) + '/m' }, grid: { color: gC } }
      }
    }
  });
}

// ── Dettaglio INPS ───────────────────────────────────────────
function renderPenINPS(r) {
  const { pensioneLordaMens, pensioneNettaMens, irpefAnn, tassoSost, cumMontante, coeffTrasf, pensioneLordaAnn } = r;
  const tsCol = tassoSost >= 0.7 ? 'var(--green)' : tassoSost >= 0.5 ? 'var(--orange)' : 'var(--red)';
  document.getElementById('penINPSDetail').innerHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">
      <div class="mcard"><div class="ml">Montante al pensionamento</div><div class="mv" style="color:var(--blue)">${fmt(cumMontante)}</div><div class="ms">Rivalutato PIL nom. (${((penState.pil+penState.infl)*100).toFixed(1)}%/a)</div></div>
      <div class="mcard"><div class="ml">Coeff. trasformazione</div><div class="mv" style="color:var(--blue)">${(coeffTrasf*100).toFixed(3)}%</div><div class="ms">Età ${penState.retAge}${r.coeffTrasfBase && Math.abs(r.coeffTrasfBase-coeffTrasf)>1e-5?` · futuro stimato (2025: ${(r.coeffTrasfBase*100).toFixed(3)}%)`:'· tabella INPS 2025'}</div></div>
      <div class="mcard"><div class="ml">Pensione lorda annua</div><div class="mv" style="color:var(--blue)">${fmt(pensioneLordaAnn)}</div><div class="ms">${fmt(pensioneLordaMens)}/mese</div></div>
      <div class="mcard"><div class="ml">IRPEF stimata annua</div><div class="mv" style="color:var(--red)">${fmt(irpefAnn)}</div><div class="ms">Scaglioni 2025 + detrazione</div></div>
      <div class="mcard"><div class="ml">Pensione netta mensile</div><div class="mv" style="color:var(--blue)">${fmt(pensioneNettaMens)}</div><div class="ms">× 13 mensilità INPS</div></div>
      <div class="mcard"><div class="ml">Tasso di sostituzione</div><div class="mv" style="color:${tsCol}">${(tassoSost*100).toFixed(1)}%</div><div class="ms">Lorda / RAL finale</div></div>
    </div>
    <div style="background:#e8f0fe;border:1px solid #aecbfa;border-radius:var(--radius-sm);padding:12px 16px;font-size:12px;color:#1a73e8;line-height:1.7">
      <strong>Formula (metodo contributivo):</strong>
      Pensione lorda = Montante (${fmt(cumMontante)}) × Coefficiente (${(coeffTrasf*100).toFixed(3)}%) = <strong>${fmt(r.pensioneLordaAnn)}/anno</strong>.<br>
      Montante rivalutato a PIL nom. (PIL reale ${(penState.pil*100).toFixed(1)}% + inflaz. ${(penState.infl*100).toFixed(1)}% = ${((penState.pil+penState.infl)*100).toFixed(1)}%/a).
    </div>`;
}

// ── Dettaglio Fondo Pensione ─────────────────────────────────
function renderPenFP(r) {
  const { capFP, rendFPMens, rendFPNetta, fiscData } = r;
  const { aliqFP, anniAdesione, risparmioFisc, deduzEffettiva, aliqMargIRPEF,
          fpDatoriale, fpLavoratore, fpVersAnnVolont, fpVersAnnDat, plafondResiduo } = fiscData;
  const isNeg = penState.isNegoziale;
  const negRow = isNeg ? `
      <div class="mcard"><div class="ml">Contrib. datoriale</div><div class="mv" style="color:${penState.tfrSi?'var(--green)':'var(--red)'}">${penState.tfrSi ? fmt(Math.round(fpDatoriale/12)) : '€0'}<span style="font-size:11px;opacity:.6">/m</span></div><div class="ms">${penState.tfrSi ? `${(penState.contDatoriale*100).toFixed(1)}% RAL · ${fmt(fpDatoriale)}/a` : '⚠️ Richiede il TFR al fondo'}</div></div>
      <div class="mcard"><div class="ml">Contrib. lavoratore negoziale</div><div class="mv" style="color:var(--blue)">${fmt(Math.round(fpLavoratore/12))}<span style="font-size:11px;opacity:.6">/m</span></div><div class="ms">${(penState.contLavoratore*100).toFixed(1)}% RAL · ${fmt(fpLavoratore)}/a</div></div>` : '';
  document.getElementById('penFPDetail').innerHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">
      <div class="mcard"><div class="ml">Capitale accumulato</div><div class="mv" style="color:var(--purple)">${fmt(capFP)}</div><div class="ms">Vers. ${fmt(penState.fpVers)}/m + ${penState.tfrSi ? 'TFR' : 'no TFR'}${isNeg?' + contributi negoziali':''}</div></div>
      <div class="mcard"><div class="ml">Rendita netta mensile</div><div class="mv" style="color:var(--purple)">${fmt(rendFPMens)}</div><div class="ms">Al netto tassazione ${(aliqFP*100).toFixed(0)}%</div></div>
      <div class="mcard"><div class="ml">Tassazione rendimento</div><div class="mv" style="color:var(--orange)">20%</div><div class="ms">Annua sulle plusvalenze (vs 26% ETF)</div></div>
      <div class="mcard"><div class="ml">Tassazione prestazione</div><div class="mv" style="color:${aliqFP<=0.12?'var(--green)':'var(--orange)'}">${(aliqFP*100).toFixed(1)}%</div><div class="ms">${anniAdesione} anni adesione (min 9%)</div></div>
      <div class="mcard"><div class="ml">Deducibilità annua</div><div class="mv" style="color:var(--green)">${fmt(deduzEffettiva)}</div><div class="ms">${fpVersAnnDat > 0 ? `Plafond €5.300 − ${fmt(Math.round(fpVersAnnDat))} datoriale = ${fmt(Math.round(plafondResiduo))} disp.` : 'Limite €5.300/a (2026)'} · applicata ${(aliqMargIRPEF*100).toFixed(0)}%</div></div>
      <div class="mcard"><div class="ml">Risparmio IRPEF annuo</div><div class="mv" style="color:var(--green)">${fmt(risparmioFisc)}</div><div class="ms">${fmt(Math.round(risparmioFisc/12))}/mese · aliq. marg. ${(aliqMargIRPEF*100).toFixed(0)}%</div></div>
      <div class="mcard"><div class="ml">TFR al fondo</div><div class="mv" style="color:${penState.tfrSi?'var(--green)':'var(--red)'}">${penState.tfrSi ? '✅ Sì' : '❌ No'}</div><div class="ms">${penState.tfrSi ? fmt(Math.round(penState.ral/13.5/12))+'/m (RAL÷13,5)' : 'Resta in azienda'}</div></div>
      ${negRow}
    </div>
    <div style="background:#f3e8fd;border:1px solid #d7aefb;border-radius:var(--radius-sm);padding:12px 16px;font-size:12px;color:#6200ea;line-height:1.7">
      <strong>Vantaggi fiscali (D.Lgs. 252/2005):</strong>
      Contributi fino a €5.300 deducibili dall'IRPEF → risparmio immediato di <strong>${fmt(risparmioFisc)}/anno</strong>.
      Rendimenti tassati al <strong>20% annuo</strong> (vs 26% ETF, ma con tassazione immediata vs tax deferral ETF).
      Prestazione finale tassata al ${(aliqFP*100).toFixed(1)}% (scende dal 15% al 9% con 35+ anni di adesione).
      ${isNeg ? `<br><strong>Fondo negoziale:</strong> il datore contribuisce ${fmt(fpDatoriale)}/anno (${(penState.contDatoriale*100).toFixed(1)}% RAL) — versamento "gratuito" per il lavoratore che entra solo versando la quota contrattuale (${fmt(fpLavoratore)}/anno).` : ''}
    </div>`;
}

// ── Sezione Risparmio Fiscale ─────────────────────────────────
function renderPenRispFisc(r) {
  const { fiscData, yearsToRet, capFP, capETFBonus } = r;
  const { risparmioFisc, rispFiscMens, aliqMargIRPEF, deduzEffettiva, rispFiscDest } = fiscData;
  const totRisp = risparmioFisc * yearsToRet; // totale risparmio fiscale cumulato (senza interessi)

  // Simula accumulazione del risparmio fiscale nelle 3 destinazioni
  let capSpeso = totRisp; // speso anno per anno: valore nominale cumulato
  let capReinvFP  = 0;
  let capReinvETF = 0;
  const fpRet = penState.fpRet;
  const etfRet = penState.etfRet;
  for (let y = 0; y < yearsToRet; y++) {
    capReinvFP  = capReinvFP  * (1 + fpRet * 0.80) + risparmioFisc; // FP: 20% tassa sui rendimenti, lungo il percorso
    capReinvETF = capReinvETF * (1 + etfRet)        + risparmioFisc; // ETF: rendimento del portafoglio, tassazione differita
  }
  // ETF netto alla vendita finale
  const costBaseETF  = risparmioFisc * yearsToRet;
  const capReinvETFNetto = capReinvETF - Math.max(0, capReinvETF - costBaseETF) * 0.26;

  const destLabel = { spendi: '🛍️ Speso/consumato', reinvesti_fp: '💼 Reinvestito nel Fondo Pensione', reinvesti_etf: '📈 Reinvestito nel portafoglio ETF' };
  const activeStyle = (d) => rispFiscDest === d ? 'background:var(--blue);color:#fff;border-color:var(--blue)' : '';

  document.getElementById('penRispFiscBox').innerHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
      <div class="mcard" style="flex:1;min-width:160px">
        <div class="ml">Risparmio IRPEF annuo</div>
        <div class="mv" style="color:var(--green)">${fmt(risparmioFisc)}</div>
        <div class="ms">${fmt(rispFiscMens)}/mese · aliq. ${(aliqMargIRPEF*100).toFixed(0)}% su €${fmt(deduzEffettiva)}</div>
      </div>
      <div class="mcard" style="flex:1;min-width:160px">
        <div class="ml">Totale IRPEF risparmiata</div>
        <div class="mv" style="color:var(--green)">${fmt(Math.round(totRisp))}</div>
        <div class="ms">Su ${yearsToRet} anni (nominale)</div>
      </div>
    </div>

    <div class="sec-label" style="margin-bottom:8px">📌 Cosa fai con il risparmio fiscale ogni anno?</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
      <button class="gbtn" style="${activeStyle('spendi')}" onclick="penState.rispFiscDest='spendi'; renderPensione()">🛍️ Lo spendo</button>
      <button class="gbtn" style="${activeStyle('reinvesti_fp')}" onclick="penState.rispFiscDest='reinvesti_fp'; renderPensione()">💼 Reinvesto nel FP</button>
      <button class="gbtn" style="${activeStyle('reinvesti_etf')}" onclick="penState.rispFiscDest='reinvesti_etf'; renderPensione()">📈 Reinvesto in ETF</button>
    </div>

    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">
      <div class="mcard" style="flex:1;min-width:140px;${rispFiscDest==='spendi'?'border-color:var(--orange)':''}">
        <div class="ml">🛍️ Se lo spendi</div>
        <div class="mv" style="color:var(--orange)">${fmt(Math.round(totRisp))}</div>
        <div class="ms">Consumato anno per anno · nessun accumulo</div>
      </div>
      <div class="mcard" style="flex:1;min-width:140px;${rispFiscDest==='reinvesti_fp'?'border-color:var(--purple)':''}">
        <div class="ml">💼 Se reinvesti nel FP</div>
        <div class="mv" style="color:var(--purple)">${fmt(Math.round(capReinvFP))}</div>
        <div class="ms">Rendimento ${(fpRet*100).toFixed(1)}% − 20%/a plusval. FP · +${fmt(Math.round(capReinvFP - totRisp))} vs speso</div>
      </div>
      <div class="mcard" style="flex:1;min-width:140px;${rispFiscDest==='reinvesti_etf'?'border-color:var(--teal)':''}">
        <div class="ml">📈 Se reinvesti in ETF</div>
        <div class="mv" style="color:var(--teal)">${fmt(Math.round(capReinvETFNetto))}</div>
        <div class="ms">Rendimento ${(etfRet*100).toFixed(1)}% (piano simulatore) · tax deferral → 26% solo alla fine · +${fmt(Math.round(capReinvETFNetto - totRisp))} vs speso</div>
      </div>
    </div>

    <div style="background:#e6f4ea;border:1px solid #81c995;border-radius:var(--radius-sm);padding:12px 16px;font-size:12px;color:#1e8e3e;line-height:1.7">
      <strong>Modalità attiva: ${destLabel[rispFiscDest]}</strong><br>
      ${rispFiscDest === 'spendi'
        ? `Il risparmio IRPEF viene consumato ogni anno. Non si accumula capitale aggiuntivo, ma aumenta il tenore di vita attuale (${fmt(rispFiscMens)}/mese extra).`
        : rispFiscDest === 'reinvesti_fp'
        ? `Il risparmio IRPEF (${fmt(risparmioFisc)}/anno) viene versato ogni anno come contributo aggiuntivo al fondo pensione. Beneficia anche lui della deducibilità (fino al limite €5.300). Rendimento netto: ${(fpRet*80).toFixed(1)}%/a (tassazione 20% annua plusvalenze). Capitale aggiuntivo stimato: <strong>${fmt(Math.round(capReinvFP))}</strong>.`
        : `Il risparmio IRPEF (${fmt(risparmioFisc)}/anno) viene investito nel portafoglio ETF del simulatore (fuori dal FP) al rendimento netto <strong>${(etfRet*100).toFixed(1)}%/a</strong>. Sfrutta il <em>tax deferral</em>: nessuna tassazione intermedia, solo 26% sulla plusvalenza alla vendita finale. Capitale netto stimato: <strong>${fmt(Math.round(capReinvETFNetto))}</strong>.`
      }
    </div>`;
}

// ── Confronto fiscale FP vs ETF ───────────────────────────────
function renderPenFiscComp(r) {
  const { capFP, fiscData, yearsToRet } = r;
  const { aliqFP, risparmioFisc, deduzEffettiva, aliqMargIRPEF, tfrAnnuoMedio, fpDatoriale } = fiscData;
  const fpVersAnn   = penState.fpVers * 12;
  const rispAnn     = risparmioFisc;

  // Scenario FP: versamento volontario + TFR + contrib. negoziale + risparmio fiscale reinvestito (se applicabile)
  // Con tassazione 20% ANNUA sui rendimenti (non differita)
  const fpTotAnn    = fpVersAnn + tfrAnnuoMedio + (penState.isNegoziale ? fiscData.fpLavoratore + fpDatoriale : 0);
  const etfEquivAnn = fpTotAnn + rispAnn; // scenario ETF: stesso totale + risparmio IRPEF reinvestito

  let capFPSim = 0, capETFSim = 0;
  const fpYears = [], etfYears = [];
  for (let y = 0; y < yearsToRet; y++) {
    // FP: rendimento netto 20% annuo sulle plusvalenze (tassazione immediata ogni anno)
    capFPSim  = capFPSim  * (1 + penState.fpRet * 0.80) + fpTotAnn;
    // ETF accumulazione: nessuna tassazione intermedia (tax deferral), solo 26% alla fine
    capETFSim = capETFSim * (1 + penState.fpRet)        + etfEquivAnn;
    fpYears.push(Math.round(capFPSim));
    etfYears.push(Math.round(capETFSim));
  }

  // ETF: tassa 26% sulla sola plusvalenza finale (vantaggio del tax deferral)
  const etfCostBase    = etfEquivAnn * yearsToRet;
  const capETFNetto    = capETFSim - Math.max(0, capETFSim - etfCostBase) * 0.26;

  // FP: già tassato annualmente al 20%, la prestazione ha poi aliquota ridotta (9-15%)
  // Il capitale finale FP deve essere ridotto dell'aliquota prestazione per confronto netto
  const capFPNetto     = capFPSim * (1 - aliqFP);

  const winner = capFPNetto >= capETFNetto ? 'Fondo Pensione' : 'ETF (acc.)';
  const diff   = Math.abs(capFPNetto - capETFNetto);
  const gC = 'rgba(0,0,0,.05)', tC = 'rgba(0,0,0,.45)';

  // ── Confronto destinazione TFR: in azienda vs conferito al fondo ──────────
  // Il TFR ha due regimi distinti per RIVALUTAZIONE e TASSAZIONE:
  //  • In azienda: rivalutazione di legge (art. 2120 c.c.) = 1,5% fisso + 75%
  //    dell'inflazione; tassazione separata all'aliquota media IRPEF (~23-43%).
  //  • Al fondo: rende come il fondo (fpRet); tassazione agevolata 15%→9%.
  // Calcolato solo se c'è un TFR (tfrAnnuoMedio > 0).
  let tfrCompHtml = '';
  if (tfrAnnuoMedio > 0) {
    const revAzienda = 0.015 + 0.75 * penState.infl;          // rivalutazione legale TFR
    // Aliquota media IRPEF per tassazione separata (proxy: IRPEF media sulla RAL)
    const aliqMediaTFR = Math.min(0.43, Math.max(0.23, calcIRPEF(penState.ral) / penState.ral));
    let capTfrAzienda = 0, capTfrFondo = 0;
    for (let y = 0; y < yearsToRet; y++) {
      capTfrAzienda = capTfrAzienda * (1 + revAzienda)     + tfrAnnuoMedio;
      capTfrFondo   = capTfrFondo   * (1 + penState.fpRet) + tfrAnnuoMedio;
    }
    const tfrAziendaNetto = capTfrAzienda * (1 - aliqMediaTFR);
    const tfrFondoNetto   = capTfrFondo   * (1 - aliqFP);
    const tfrDiff         = tfrFondoNetto - tfrAziendaNetto;
    const tfrWinner       = tfrDiff >= 0 ? 'al Fondo' : 'in Azienda';
    const tfrWinColor     = tfrDiff >= 0 ? 'var(--green)' : 'var(--red)';
    tfrCompHtml = `
    <div style="font-size:11px;color:var(--text3);font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:.05em;font-weight:600;margin:4px 0 8px">Destinazione del TFR — Azienda vs Fondo Pensione</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
      <div class="mcard"><div class="ml">TFR in azienda (netto)</div><div class="mv" style="color:var(--orange)">${fmt(Math.round(tfrAziendaNetto))}</div><div class="ms">Rival. legale ${(revAzienda*100).toFixed(2)}%/a (1,5% + 75% infl.) · tass. separata ${(aliqMediaTFR*100).toFixed(0)}%</div></div>
      <div class="mcard"><div class="ml">TFR al fondo (netto)</div><div class="mv" style="color:var(--purple)">${fmt(Math.round(tfrFondoNetto))}</div><div class="ms">Rend. fondo ${(penState.fpRet*100).toFixed(1)}%/a · tass. agevolata ${(aliqFP*100).toFixed(1)}%</div></div>
      <div class="mcard"><div class="ml">Conviene ${tfrWinner}</div><div class="mv" style="color:${tfrWinColor}">${fmt(Math.abs(Math.round(tfrDiff)))}</div><div class="ms">Differenza netta su ${yearsToRet} anni · TFR ${fmt(Math.round(tfrAnnuoMedio))}/a</div></div>
    </div>
    <div style="background:#f3e5f5;border:1px solid #e1bee7;border-radius:var(--radius-sm);padding:10px 14px;font-size:11.5px;color:#6a1b9a;margin-bottom:12px;line-height:1.6">
      <strong>📌 Perché il TFR cambia molto:</strong> in azienda si rivaluta solo all'<strong>${(revAzienda*100).toFixed(2)}%/a</strong> (1,5% fisso + 75% inflazione, art. 2120 c.c.) e alla liquidazione sconta la <strong>tassazione separata</strong> all'aliquota media IRPEF (~${(aliqMediaTFR*100).toFixed(0)}%). Conferito al fondo rende come il comparto scelto (${(penState.fpRet*100).toFixed(1)}%/a) e la prestazione è tassata col regime agevolato <strong>${(aliqFP*100).toFixed(1)}%</strong> (dal 15% al 9% in base agli anni di adesione). La differenza nasce dal doppio effetto rivalutazione + fiscalità.
    </div>`;
  }

  document.getElementById('penFiscComp').innerHTML = `
    ${tfrCompHtml}
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
      <div class="mcard"><div class="ml">Capitale FP netto a ${penState.retAge}a</div><div class="mv" style="color:var(--purple)">${fmt(capFPNetto)}</div><div class="ms">Lordo ${fmt(capFPSim)} · tass. 20%/a rendim. + ${(aliqFP*100).toFixed(0)}% prestaz.</div></div>
      <div class="mcard"><div class="ml">Capitale ETF equiv. netto</div><div class="mv" style="color:var(--teal)">${fmt(capETFNetto)}</div><div class="ms">Tax deferral + 26% plusval. finale · vers. + IRPEF reinvestita</div></div>
      <div class="mcard"><div class="ml">Vantaggio ${winner}</div><div class="mv" style="color:var(--green)">${fmt(diff)}</div><div class="ms">Su ${yearsToRet} anni · entrambi al netto imposte</div></div>
    </div>
    <div style="background:#fff3e0;border:1px solid #ffe082;border-radius:var(--radius-sm);padding:10px 14px;font-size:11.5px;color:#e65100;margin-bottom:12px;line-height:1.6">
      <strong>📌 Nota tassazione:</strong> Il fondo pensione tassa i rendimenti al <strong>20% ogni anno</strong> (vs 26% ETF ma con tax deferral).
      L'ETF ad accumulazione rinvia tutta la tassazione alla vendita finale: il capitale "lavora" intero per anni, con effetto compounding più potente.
      Il FP recupera parte del vantaggio grazie alla deducibilità dei contributi e all'aliquota ridotta sulla prestazione finale (${(aliqFP*100).toFixed(0)}%).
    </div>`;

  if (chartPenFisc) { chartPenFisc.destroy(); chartPenFisc = null; }
  const labels = Array.from({ length: yearsToRet }, (_, i) => penState.age + i + 1 + 'a');
  const canvasFisc = document.getElementById('chPenFisc');
  // Canvas dentro <details> chiuso ha offsetParent===null → dimensioni 0×0 → Chart.js errore.
  // Saltiamo: verrà creato al toggle del details (listener sotto).
  if (canvasFisc && canvasFisc.offsetParent !== null) {
  chartPenFisc = new Chart(canvasFisc, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Fondo Pensione (rend. 20%/a)', data: fpYears, borderColor: '#9334e6', borderWidth: 2.5, backgroundColor: 'rgba(147,52,230,.08)', fill: true, pointRadius: 0, tension: .35 },
        { label: 'ETF equiv. (tax deferral, stesso vers.+IRPEF)', data: etfYears, borderColor: '#00897b', borderWidth: 2, borderDash: [5, 4], backgroundColor: 'transparent', fill: false, pointRadius: 0, tension: .35 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { font: { family: 'DM Mono', size: 11 }, boxWidth: 16 } },
        tooltip: { callbacks: { title: c => 'Età ' + c[0].label, label: c => ' ' + c.dataset.label + ': ' + fmt(c.raw) }, backgroundColor: '#fff', borderColor: '#dadce0', borderWidth: 1, titleColor: '#202124', bodyColor: '#5f6368', padding: 10 }
      },
      scales: {
        x: { ticks: { color: tC, font: { size: 11, family: 'DM Mono' }, maxTicksLimit: 14 }, grid: { color: gC } },
        y: { ticks: { color: tC, font: { size: 11, family: 'DM Mono' }, callback: v => fmt(v) }, grid: { color: gC } }
      }
    }
  });
  } // fine guard canvas visibile
}

// ── Tabella accumulo ─────────────────────────────────────────
function renderPenAccTable(r) {
  const { accData } = r;
  const isNeg = penState.isNegoziale;
  const stp = Math.max(1, Math.floor(accData.length / 12));
  const header = `<thead><tr style="background:var(--bg2)">
    <th>Età</th><th>Anno</th><th>RAL</th><th>Contrib. INPS</th><th>Montante INPS</th><th>Cap. FP</th><th>Vers. FP</th>
    ${isNeg ? '<th>Di cui datoriale</th>' : ''}
    <th>Risp. IRPEF</th>
  </tr></thead>`;
  const rows = accData
    .filter((_, i) => i % stp === 0 || i === accData.length - 1)
    .map(d => `<tr>
      <td><strong>${d.age}</strong></td>
      <td>+${d.year}a</td>
      <td style="color:var(--text2)">${fmt(d.ral)}</td>
      <td style="color:var(--blue)">${fmt(d.contrib)}</td>
      <td style="font-weight:600;color:var(--blue)">${fmt(d.montanteINPS)}</td>
      <td style="font-weight:600;color:var(--purple)">${fmt(d.capFP)}</td>
      <td style="color:var(--text3)">${fmt(d.fpVersAnn)}</td>
      ${isNeg ? `<td style="color:var(--green)">${fmt(d.fpDatAnn)}</td>` : ''}
      <td style="color:var(--green)">${fmt(d.rispFiscAnn)}</td>
    </tr>`).join('');
  document.getElementById('penAccTable').innerHTML = `<table class="data-table" style="width:100%;border-collapse:collapse">${header}<tbody>${rows}</tbody></table>`;
}

// ── Tabella decumulo ─────────────────────────────────────────
function renderPenDecTable(r) {
  const { decData } = r;
  const stp = Math.max(1, Math.floor(decData.length / 12));
  const header = `<thead><tr style="background:var(--bg2)">
    <th>Età</th><th>Anno pensione</th><th>Fabbisogno/m</th><th>INPS netta/m</th><th>Rendita FP/m</th><th>Prelievo ETF/m</th><th>Copertura</th>
  </tr></thead>`;
  const rows = decData
    .filter((_, i) => i % stp === 0 || i === decData.length - 1)
    .map(d => `<tr>
      <td><strong>${d.age}</strong></td>
      <td>+${d.year}a pens.</td>
      <td style="color:var(--text2)">${fmt(d.fabbisognoMens)}/m</td>
      <td style="color:var(--blue);font-weight:600">${fmt(d.pensNettaMens)}/m</td>
      <td style="color:var(--purple)">${fmt(d.rendFPMens)}/m</td>
      <td style="color:var(--teal)">${fmt(d.etfMens)}/m</td>
      <td class="${d.gapMens===0?'pos':'neg'}">${d.gapMens===0?'✅ Coperto':'−'+fmt(d.gapMens)+'/m'}</td>
    </tr>`).join('');
  document.getElementById('penDecTable').innerHTML = `<table class="data-table" style="width:100%;border-collapse:collapse">${header}<tbody>${rows}</tbody></table>`;
}

// ── Event listeners + Init (lazy, al primo render del tab) ───
// Gli elementi esistono solo quando il tab è nel DOM — registriamo
// tutto su DOMContentLoaded così il parse avviene dopo l'HTML completo.
document.addEventListener('DOMContentLoaded', () => {
  const regime  = document.getElementById('penRegimeBtns');
  const tfr     = document.getElementById('penTFRBtns');
  const negoz   = document.getElementById('penNegozialeBtns');
  const regDesc = document.getElementById('penRegimeDesc');

  if (regime) regime.onclick = e => {
    const b = e.target.closest('[data-reg]'); if (!b) return;
    penState.regime = b.dataset.reg;
    regime.querySelectorAll('.gbtn').forEach(x => x.classList.remove('a-blue'));
    b.classList.add('a-blue');
    if (regDesc) regDesc.innerHTML = PEN_REGIME_DESC[b.dataset.reg] || '';
    renderPensione();
  };

  if (tfr) tfr.onclick = e => {
    const b = e.target.closest('[data-tfr]'); if (!b) return;
    penState.tfrSi = b.dataset.tfr === 'si';
    tfr.querySelectorAll('.gbtn').forEach(x => x.classList.remove('a-blue'));
    b.classList.add('a-blue');
    // Vincolo normativo: il fondo NEGOZIALE (di categoria) è il veicolo del conferimento
    // collettivo del TFR e del contributo datoriale. Se il TFR resta in azienda, l'adesione
    // sensata è a un fondo APERTO con solo versamento volontario → disattiviamo il negoziale.
    if (!penState.tfrSi && penState.isNegoziale) {
      penState.isNegoziale = false;
      if (negoz) {
        negoz.querySelectorAll('.gbtn').forEach(x => x.classList.remove('a-blue'));
        const bNo = negoz.querySelector('[data-neg="no"]');
        if (bNo) bNo.classList.add('a-blue');
      }
    }
    renderPensione();
  };

  if (negoz) negoz.onclick = e => {
    const b = e.target.closest('[data-neg]'); if (!b) return;
    penState.isNegoziale = b.dataset.neg === 'si';
    negoz.querySelectorAll('.gbtn').forEach(x => x.classList.remove('a-blue'));
    b.classList.add('a-blue');
    // Il fondo negoziale implica il conferimento del TFR al fondo: se l'utente attiva
    // il negoziale, forziamo coerentemente il TFR al fondo (e aggiorniamo i bottoni TFR).
    if (penState.isNegoziale && !penState.tfrSi) {
      penState.tfrSi = true;
      if (tfr) {
        tfr.querySelectorAll('.gbtn').forEach(x => x.classList.remove('a-blue'));
        const bSi = tfr.querySelector('[data-tfr="si"]');
        if (bSi) bSi.classList.add('a-blue');
      }
    }
    renderPensione();
  };

  // Descrizione regime iniziale (testo statico, nessun calcolo)
  if (regDesc) regDesc.innerHTML = PEN_REGIME_DESC['contributivo'];

  // Quando l'utente apre il <details> del confronto fiscale, chPenFisc diventa
  // visibile: se il chart non era stato creato (canvas era nascosto), lo creiamo ora.
  const chPenFiscEl = document.getElementById('chPenFisc');
  const detailsFisc = chPenFiscEl ? chPenFiscEl.closest('details') : null;
  if (detailsFisc) {
    detailsFisc.addEventListener('toggle', () => {
      if (detailsFisc.open && !chartPenFisc && window.lastPenResult) {
        try { renderPenFiscComp(window.lastPenResult.r); } catch(e) { console.error('FiscComp toggle:', e); }
      }
    });
  }

  // Resize listener per ridisegnare i grafici al cambio dimensione finestra
  window.addEventListener('resize', () => {
    if (chartPen)     { try { chartPen.resize(); }     catch(e) {} }
    if (chartPenFisc) { try { chartPenFisc.resize(); } catch(e) {} }
  });
});
