// ██████  MODULO 3 — FISCALITÀ ITALIANA COMPLETA
// ══════════════════════════════════════════════════════════════
let fiscState = {
  regime: 'amministrato',
  method: 'avg',          // avg | lifo | fifo
  aliqGain: 26,           // %
  aliqOb: 12.5,           // % per titoli stato
  bollo: 0.20,            // % annuo
  strumento: 'etf_ucits',
  sellAmount: 50000,
  sellYear: 10,
  minusvalenze: [],       // {id, amount, year, scadenza}
  // Dati importati dal simulatore
  pac: 0, w: 0, years: 0,
  loaded: false,
};
let fiscMinusId = 0;
let chartFisc = null, chartFiscComp = null;

const FISC_REGIME_DESC = {
  amministrato: `<strong>Regime Amministrato (art. 6 D.Lgs. 461/1997):</strong> Il broker/banca agisce da <em>sostituto d'imposta</em> — calcola e versa le tasse automaticamente. <strong>Vantaggi:</strong> semplicità, nessun obbligo dichiarativo. <strong>Limiti:</strong> le minusvalenze compensano solo redditi diversi (ETF non-UCITS, azioni, derivati) — <strong>non</strong> i redditi di capitale (cedole, dividendi, rendimento ETF UCITS). Metodo obbligatorio: <strong>costo medio ponderato</strong> per ETF. Imposta di bollo detratta direttamente dal conto.`,
  dichiarativo: `<strong>Regime Dichiarativo (art. 5 D.Lgs. 461/1997):</strong> L'investitore dichiara autonomamente plusvalenze e minusvalenze nel Modello Redditi. <strong>Vantaggi:</strong> <em>compensazione totale</em> tra redditi diversi (incluso offset più ampio di minus vs plus), possibilità di usare metodo LIFO. <strong>Limiti:</strong> obbligo dichiarativo, pagamento imposte con F24 entro le scadenze. Adatto a portafogli complessi con strumenti diversificati e uso attivo dello zainetto fiscale.`,
};

const STRUMENTO_DESC = {
  etf_ucits: { label:'ETF UCITS', tipo:'Reddito di Capitale', aliq:'26% (o 12,5% su quota obblig. gov.)', compensabile:false, note:'Le plus sono reddito di capitale — non compensabili con minus da redditi diversi in regime amministrato. Il broker applica la ritenuta direttamente.' },
  etf_nonutf: { label:'ETF non-UCITS', tipo:'Reddito Diverso', aliq:'26%', compensabile:true, note:'Trattato come reddito diverso — le plus sono compensabili con minusvalenze pregresse in entrambi i regimi.' },
  azioni: { label:'Azioni dirette', tipo:'Reddito Diverso', aliq:'26%', compensabile:true, note:'Capital gain da azioni: reddito diverso, compensabile con minus. Dividendi: reddito di capitale (26%).' },
  btp: { label:'BTP / Titoli di Stato', tipo:'Misto (cedole: capitale / plus da cessione: diversi)', aliq:'12.5%', compensabile:true, note:'Aliquota agevolata 12,5%. Le cedole sono redditi di capitale (non compensabili); le plusvalenze da cessione prima della scadenza sono redditi diversi, compensabili con minus pregresse (le minus da titoli di Stato entrano in zainetto al 48,08% del loro ammontare).' },
  obblig: { label:'Obbligaz. Corporate', tipo:'Reddito di Capitale / Diverso', aliq:'26%', compensabile:false, note:'Cedole: reddito di capitale (26%). Capital gain da vendita: reddito diverso, compensabile.' },
};

document.getElementById('fiscRegimeBtns').onclick = e => {
  const b = e.target.closest('[data-r]'); if (!b) return;
  fiscState.regime = b.dataset.r;
  document.querySelectorAll('#fiscRegimeBtns .gbtn').forEach(x=>x.classList.remove('a-blue'));
  b.classList.add('a-blue');
  document.getElementById('fiscRegimeDesc').innerHTML = FISC_REGIME_DESC[b.dataset.r]||'';
  renderFiscale();
};
document.getElementById('fiscMethodBtns').onclick = e => {
  const b = e.target.closest('[data-mth]'); if (!b) return;
  fiscState.method = b.dataset.mth;
  document.querySelectorAll('#fiscMethodBtns .gbtn').forEach(x=>x.classList.remove('a-blue'));
  b.classList.add('a-blue');
  renderFiscale();
};
document.getElementById('fiscStrumBtns').onclick = e => {
  const b = e.target.closest('[data-st]'); if (!b) return;
  fiscState.strumento = b.dataset.st;
  document.querySelectorAll('#fiscStrumBtns .gbtn').forEach(x=>x.classList.remove('a-blue'));
  b.classList.add('a-blue');
  renderFiscale();
};

// Init regime desc
document.getElementById('fiscRegimeDesc').innerHTML = FISC_REGIME_DESC['amministrato'];

function addFiscMinus() {
  fiscState.minusvalenze.push({ id: fiscMinusId++, amount: 5000, year: new Date().getFullYear(), scadenza: new Date().getFullYear()+4 });
  renderFiscMinusList(); renderFiscale();
}
function delFiscMinus(id) {
  fiscState.minusvalenze = fiscState.minusvalenze.filter(m=>m.id!==id);
  renderFiscMinusList(); renderFiscale();
}
function renderFiscMinusList() {
  const el = document.getElementById('fiscMinusList');
  if (!fiscState.minusvalenze.length) { el.innerHTML='<div class="empty-entry">Nessuna minusvalenza in zainetto</div>'; return; }
  el.innerHTML = fiscState.minusvalenze.map(m=>`
    <div class="erow">
      <span class="elab">€ minus.</span>
      <input class="einput" type="number" min="0" step="100" value="${m.amount}" onchange="(function(){fiscState.minusvalenze.find(x=>x.id===${m.id}).amount=+this.value;renderFiscale()}).call(this)">
      <span class="elab">Anno</span>
      <input class="einput" type="number" min="2018" max="2030" value="${m.year}" onchange="(function(){const x=fiscState.minusvalenze.find(x=>x.id===${m.id});x.year=+this.value;x.scadenza=+this.value+4;renderFiscale()}).call(this)" style="width:70px">
      <span style="font-size:10.5px;color:var(--text3);font-family:'DM Mono',monospace">scad. ${m.year+4}</span>
      <button class="dbtn" onclick="delFiscMinus(${m.id})">✕</button>
    </div>`).join('');
}

function importFiscFromSim() {
  fiscState.pac = state.pac;
  fiscState.w = state.w;
  fiscState.years = state.years;
  fiscState.loaded = true;
  document.getElementById('fiscImportStatus').innerHTML = `<strong style="color:var(--green)">✅ Importato:</strong> Capitale €${fmtN(state.w)}, PAC €${fmtN(state.pac)}/m, ${state.years} anni`;
  renderFiscale();
}

// Calcola lotti e base di costo con metodo scelto
function calcFiscalLots(pac, w0, years, annualReturnRate, method) {
  // Simula acquisti mensili a prezzi diversi (prezzo unitario normalizzato)
  let price = 100; // prezzo normalizzato iniziale
  const lots = []; // {qty, cost} per LIFO/FIFO
  let totalQty = 0, totalCost = 0;
  // Acquisto iniziale
  if (w0 > 0) {
    const qty0 = w0 / price;
    lots.push({ qty: qty0, cost: price });
    totalQty += qty0; totalCost += w0;
  }
  const monthlyRate = Math.pow(1 + annualReturnRate, 1/12) - 1;
  const yearlyData = [];
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      price *= (1 + monthlyRate);
      if (pac > 0) {
        const qty = pac / price;
        lots.push({ qty, cost: price });
        totalQty += qty; totalCost += pac;
      }
    }
    const currentValue = totalQty * price;
    // Costo medio ponderato
    const avgCost = totalQty > 0 ? totalCost / totalQty : price;
    yearlyData.push({ year:y, price, currentValue: Math.round(currentValue), totalInvested: Math.round(totalCost), avgCost: Math.round(avgCost*100)/100, totalQty });
  }
  return { lots, yearlyData, finalPrice: price, totalQty, totalCost };
}

function calcTaxOnSell(sellAmount, currentPrice, lots, method, regime, strumento, aliqGain, aliqOb, minusvalenze, currentYear) {
  const strDesc = STRUMENTO_DESC[strumento];
  // BTP e Titoli di Stato applicano aliquota ridotta 12.5%; tutto il resto aliqGain
  const actualAliq = strumento === 'btp' ? aliqOb : aliqGain;

  // Quota di strumento venduta
  const totalQty = lots.reduce((s,l)=>s+l.qty,0);
  const totalValue = totalQty * currentPrice;
  const sellFraction = Math.min(1, sellAmount / totalValue);
  const qtyToSell = totalQty * sellFraction;

  let costBasis = 0;
  if (method === 'avg') {
    const avgCost = lots.reduce((s,l)=>s+l.qty*l.cost,0) / totalQty;
    costBasis = qtyToSell * avgCost;
  } else if (method === 'lifo') {
    let remaining = qtyToSell;
    const lifo = [...lots].reverse();
    for (const l of lifo) {
      if (remaining <= 0) break;
      const use = Math.min(remaining, l.qty);
      costBasis += use * l.cost;
      remaining -= use;
    }
  } else { // fifo
    let remaining = qtyToSell;
    for (const l of lots) {
      if (remaining <= 0) break;
      const use = Math.min(remaining, l.qty);
      costBasis += use * l.cost;
      remaining -= use;
    }
  }

  const grossGain = sellAmount - costBasis;
  const isGain = grossGain > 0;
  let taxableGain = Math.max(0, grossGain);

  // Utilizzo zainetto fiscale (solo se regime dichiarativo o strumento compensabile)
  // La compensabilita' dipende dalla CATEGORIA DI REDDITO dello strumento, non dal regime:
  // plus da ETF UCITS = redditi di capitale -> MAI compensabili (in amministrato e dichiarativo);
  // plus da cessione di azioni, ETF non-UCITS, BTP = redditi diversi -> compensabili in entrambi.
  // Il regime cambia chi dichiara/versa e l'ampiezza pratica dello zainetto, non la categoria.
  const canUseMinus = strDesc.compensabile;
  let minusUsed = 0;
  const currentYearN = currentYear || 2025;
  const validMinus = minusvalenze.filter(m => m.scadenza >= currentYearN && m.amount > 0);
  const totalMinus = validMinus.reduce((s,m)=>s+m.amount,0);

  if (canUseMinus && taxableGain > 0) {
    minusUsed = Math.min(taxableGain, totalMinus);
    taxableGain -= minusUsed;
  }

  const tax = taxableGain * (actualAliq / 100);
  const netProceeds = sellAmount - tax;
  const effectiveRate = sellAmount > 0 ? tax / sellAmount * 100 : 0;

  return { sellAmount, costBasis: Math.round(costBasis), grossGain: Math.round(grossGain), taxableGain: Math.round(taxableGain), tax: Math.round(tax), netProceeds: Math.round(netProceeds), effectiveRate, minusUsed: Math.round(minusUsed), canUseMinus, aliq: actualAliq, method };
}

function renderFiscale() {
  if (!fiscState.loaded) {
    // Usa dati di default se non importati dal simulatore.
    // FIX #F1: state.pac può essere 0 (piano solo-PIC) — non usare || 300
    // altrimenti un piano senza PAC verrebbe simulato con €300/m falsi.
    fiscState.pac   = (state.pac   !== undefined && state.pac   !== null) ? state.pac   : 300;
    fiscState.w     = (state.w     !== undefined && state.w     > 0)      ? state.w     : 10000;
    fiscState.years = (state.years !== undefined && state.years > 0)      ? state.years : 20;
  }
  const { pac, w, years, regime, method, aliqGain, aliqOb, bollo, strumento, sellAmount, sellYear, minusvalenze } = fiscState;
  const annRate = (getPortParams(state.portfolio)?.normal) || 0.055;
  const terRate = state.ter/100;
  const netRate = annRate - terRate;

  const fiscData = calcFiscalLots(pac, w, years, netRate, method);
  const { yearlyData, lots, finalPrice, totalQty, totalCost } = fiscData;

  // Grafico valore vs costo
  if (chartFisc) { chartFisc.destroy(); chartFisc=null; }
  const labels = yearlyData.map(d=>'Anno '+d.year);
  const gC='rgba(0,0,0,.05)',tC='rgba(0,0,0,.45)';
  chartFisc=new Chart(document.getElementById('chFisc'),{type:'line',data:{labels,datasets:[
    {label:'Valore di mercato',data:yearlyData.map(d=>d.currentValue),borderColor:'#1a73e8',borderWidth:2.5,pointRadius:0,fill:true,backgroundColor:'rgba(26,115,232,.08)',tension:.35},
    {label:'Capitale investito',data:yearlyData.map(d=>d.totalInvested),borderColor:'#1e8e3e',borderWidth:2,pointRadius:0,fill:false,borderDash:[5,4],tension:.35},
  ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:true},tooltip:{callbacks:{title:c=>c[0].label,label:c=>' '+c.dataset.label+': '+fmt(c.raw)},backgroundColor:'#fff',borderColor:'#dadce0',borderWidth:1,titleColor:'#202124',bodyColor:'#5f6368',padding:10}},scales:{x:{ticks:{color:tC,font:{size:11,family:'DM Mono'},maxTicksLimit:15},grid:{color:gC}},y:{ticks:{color:tC,font:{size:11,family:'DM Mono'},callback:v=>fmt(v)},grid:{color:gC}}}}});

  // Summary lotti
  const finalData = yearlyData[yearlyData.length-1];
  const avgCostFinal = finalData ? finalData.avgCost : 0;
  const strDesc = STRUMENTO_DESC[strumento];
  document.getElementById('fiscLotSummary').innerHTML = `
    <div class="grid-4" style="margin-bottom:12px">
      <div class="mcard"><div class="ml">Valore finale</div><div class="mv" style="color:var(--blue)">${fmt(finalData?.currentValue||0)}</div></div>
      <div class="mcard"><div class="ml">Totale investito</div><div class="mv" style="color:var(--green)">${fmt(finalData?.totalInvested||0)}</div></div>
      <div class="mcard"><div class="ml">Plusvalenza lorda</div><div class="mv" style="color:var(--green)">${fmt((finalData?.currentValue||0)-(finalData?.totalInvested||0))}</div></div>
      <div class="mcard"><div class="ml">Costo medio ponderato</div><div class="mv" style="color:var(--text)">€${avgCostFinal.toFixed(2)}</div><div class="ms">per quota (norm. €100)</div></div>
    </div>
    <div style="padding:12px 16px;background:${strDesc.compensabile?'var(--green-dim)':'var(--orange-dim)'};border:1px solid ${strDesc.compensabile?'rgba(30,142,62,.3)':'rgba(227,116,0,.3)'};border-radius:var(--radius-sm);font-size:12.5px;color:var(--text2);line-height:1.7">
      <strong style="color:${strDesc.compensabile?'var(--green)':'var(--orange)'}">${strDesc.label} — ${strDesc.tipo}</strong> · Aliquota: <strong>${strDesc.aliq}</strong><br>
      ${strDesc.note}<br>
      <strong>Compensazione minus:</strong> ${strDesc.compensabile?'✅ Sì (reddito diverso)':'❌ No in regime amm. (reddito di capitale)'} · <strong>Metodo:</strong> ${method==='avg'?'Costo Medio Ponderato':method==='lifo'?'LIFO':'FIFO'}
    </div>`;

  // Simulazione vendita parziale
  const sellYearData = yearlyData[Math.min(sellYear, years)-1];
  if (sellYearData && lots.length > 0) {
    // Lotti fino all'anno di vendita
    const lotsAtSell = calcFiscalLots(pac, w, Math.min(sellYear, years), netRate, method);
    const currentPriceAtSell = lotsAtSell.yearlyData[lotsAtSell.yearlyData.length-1]?.price || finalPrice;
    const taxResult = calcTaxOnSell(Math.min(sellAmount, sellYearData.currentValue), currentPriceAtSell, lotsAtSell.lots, method, regime, strumento, aliqGain, aliqOb, minusvalenze, 2025+sellYear);
    document.getElementById('fiscSellResult').innerHTML = `
      <div class="grid-4" style="margin-bottom:12px">
        <div class="mcard"><div class="ml">Provento lordo</div><div class="mv" style="color:var(--text)">${fmt(taxResult.sellAmount)}</div></div>
        <div class="mcard"><div class="ml">Base di costo (${method})</div><div class="mv" style="color:var(--blue)">${fmt(taxResult.costBasis)}</div></div>
        <div class="mcard"><div class="ml">Plusvalenza tassabile</div><div class="mv" style="color:${taxResult.grossGain>0?'var(--orange)':'var(--green)}'}">${fmt(taxResult.taxableGain)}</div></div>
        <div class="mcard"><div class="ml">Imposta dovuta (${taxResult.aliq}%)</div><div class="mv" style="color:var(--red)">${fmt(taxResult.tax)}</div></div>
        <div class="mcard"><div class="ml">Netto incassato</div><div class="mv" style="color:var(--green)">${fmt(taxResult.netProceeds)}</div></div>
        <div class="mcard"><div class="ml">Aliquota effettiva</div><div class="mv" style="color:var(--text)">${taxResult.effectiveRate.toFixed(1)}%</div></div>
        ${taxResult.minusUsed>0?`<div class="mcard"><div class="ml">Minus utilizzate</div><div class="mv" style="color:var(--green)">−${fmt(taxResult.minusUsed)}</div><div class="ms">dallo zainetto</div></div>`:''}
      </div>
      ${!taxResult.canUseMinus&&regime==='amministrato'&&strDesc.compensabile===false?`<div style="padding:10px 14px;background:var(--orange-dim);border:1px solid rgba(227,116,0,.3);border-radius:var(--radius-sm);font-size:12.5px;color:var(--orange)">⚠️ In regime amministrato con ${strDesc.label}, le minusvalenze pregresse <strong>non possono</strong> essere utilizzate in compensazione. Passare al regime dichiarativo per ottimizzare il carico fiscale.</div>`:''}`;
  }

  // Confronto regimi — simulazione piano completo
  const computeNetForRegime = (rgm, mth) => {
    const fD = calcFiscalLots(pac, w, years, netRate, mth);
    const fData = fD.yearlyData[years-1];
    if (!fData) return {net:0, totalTax:0, bolloTot:0};
    const totalValue = fData.currentValue;
    const totalInv = fData.totalInvested;
    const gain = Math.max(0, totalValue - totalInv);
    // Bollo annuo
    let bolloTot = 0;
    for (const yd of fD.yearlyData) bolloTot += yd.currentValue * (bollo/100);
    // Tasse capital gain
    const aliq = strumento==='btp' ? aliqOb : aliqGain;
    // Zainetto
    const validM = minusvalenze.filter(m=>m.scadenza>=(2025+years)&&m.amount>0);
    const totM = validM.reduce((s,m)=>s+m.amount,0);
    const canUse = rgm==='dichiarativo' || STRUMENTO_DESC[strumento].compensabile;
    const taxableGain = canUse ? Math.max(0, gain-totM) : gain;
    const tax = taxableGain * (aliq/100);
    const net = totalValue - tax - bolloTot;
    return { net: Math.round(net), totalTax: Math.round(tax), bolloTot: Math.round(bolloTot), totalValue: Math.round(totalValue) };
  };

  const scenarios = [
    { l:'Amm. + Costo Medio', r:'amministrato', m:'avg' },
    { l:'Dich. + LIFO', r:'dichiarativo', m:'lifo' },
    { l:'Dich. + FIFO', r:'dichiarativo', m:'fifo' },
    { l:'Dich. + Costo Medio', r:'dichiarativo', m:'avg' },
  ];
  const scResults = scenarios.map(s=>({ ...s, ...computeNetForRegime(s.r, s.m) }));
  const bestNet = Math.max(...scResults.map(s=>s.net));

  document.getElementById('fiscCompare').innerHTML = `
    <div class="tbl-outer" style="margin-bottom:14px"><table>
      <thead><tr><th style="text-align:left">Regime + Metodo</th><th>Valore lordo</th><th>Imposta CG</th><th>Bollo (cum.)</th><th>Netto finale</th><th>Risparmio vs peggiore</th></tr></thead>
      <tbody>${scResults.map(s=>{const isBest=s.net===bestNet;const worst=Math.min(...scResults.map(x=>x.net));const saving=s.net-worst;return`<tr style="${isBest?'background:var(--green-dim)':''}"><td style="text-align:left;font-weight:${isBest?700:400}">${isBest?'⭐ ':''}${s.l}</td><td>${fmt(s.totalValue)}</td><td style="color:var(--red)">−${fmt(s.totalTax)}</td><td style="color:var(--orange)">−${fmt(s.bolloTot)}</td><td style="color:${isBest?'var(--green)':'var(--text)'};font-weight:${isBest?700:400}">${fmt(s.net)}</td><td class="${saving>0?'pos':'neutral'}">${saving>0?'+'+fmt(saving):'—'}</td></tr>`;}).join('')}</tbody>
    </table></div>`;

  // Chart confronto
  if (chartFiscComp) { chartFiscComp.destroy(); chartFiscComp=null; }
  const colors=['#1a73e8','#9334e6','#1e8e3e','#00897b'];
  chartFiscComp=new Chart(document.getElementById('chFiscComp'),{type:'bar',data:{labels:scResults.map(s=>s.l),datasets:[{label:'Netto finale',data:scResults.map(s=>s.net),backgroundColor:colors.map((c,i)=>scResults[i].net===bestNet?c+'dd':c+'66'),borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' Netto: '+fmt(c.raw)}}},scales:{x:{ticks:{color:tC,font:{size:11}}},y:{ticks:{color:tC,font:{size:11},callback:v=>fmt(v)},grid:{color:gC}}}}});

  // Bollo nel tempo
  let bolloDetails='';
  let cumBollo=0;
  const bolloPeriods=[5,10,15,years];
  for (const yy of bolloPeriods.filter(p=>p<=years)) {
    const yd = yearlyData[yy-1];
    if (!yd) continue;
    // Approssimazione cumulativa
    let cumB=0;
    for (let i=0;i<yy;i++) cumB += (yearlyData[i]?.currentValue||0)*(bollo/100);
    bolloDetails+=`<div class="infl-swr-row"><span style="font-weight:600;color:var(--orange)">Anno ${yy}</span><span>Patrimonio: <strong>${fmt(yd.currentValue)}</strong></span><span>Bollo anno: <strong style="color:var(--orange)">${fmt(yd.currentValue*(bollo/100))}</strong></span><span>Bollo cum.: <strong style="color:var(--red)">${fmt(cumB)}</strong></span></div>`;
  }
  document.getElementById('fiscBollo').innerHTML=`
    <div style="padding:12px 16px;background:#fff3e0;border:1px solid #ffe0b2;border-radius:var(--radius-sm);font-size:12.5px;color:#795548;margin-bottom:10px">
      Imposta di bollo: <strong>${bollo.toFixed(2)}%/a</strong> sul valore del dossier titoli (D.L. 201/2011). Applicata sul saldo medio annuo. Soglia minima: €34,20 (pers. fisiche); nessuna franchigia per pers. giuridiche. Alcune banche applicano il bollo proporzionale al controvalore effettivo di fine periodo.
    </div>
    <div style="background:#fff;border:1px solid #ffe0b2;border-radius:var(--radius-sm);padding:14px">${bolloDetails||'<span style="color:var(--text3)">Nessun dato</span>'}</div>`;

  // Zainetto
  const currentYearN = 2025;
  const validMinus = minusvalenze.filter(m=>m.scadenza>=currentYearN);
  const expiredMinus = minusvalenze.filter(m=>m.scadenza<currentYearN);
  const totValid = validMinus.reduce((s,m)=>s+m.amount,0);
  const totExpired = expiredMinus.reduce((s,m)=>s+m.amount,0);
  document.getElementById('fiscZainetto').innerHTML = minusvalenze.length===0
    ? `<div class="info-box">Nessuna minusvalenza inserita. Usa il pannello in alto per aggiungere minusvalenze pregresse allo zainetto fiscale.</div>`
    : `<div class="grid-4" style="margin-bottom:12px">
        <div class="mcard"><div class="ml">Minus valide totali</div><div class="mv" style="color:var(--green)">${fmt(totValid)}</div></div>
        <div class="mcard"><div class="ml">Minus scadute</div><div class="mv" style="color:var(--red)">${fmt(totExpired)}</div></div>
        <div class="mcard"><div class="ml">Utilizzabili (regime amm.)</div><div class="mv" style="color:var(--blue)">${STRUMENTO_DESC[strumento].compensabile?fmt(totValid):'€0'}</div><div class="ms">${STRUMENTO_DESC[strumento].compensabile?'reddito diverso':'reddito di capitale — non compensabile'}</div></div>
        <div class="mcard"><div class="ml">Utilizzabili (dich.)</div><div class="mv" style="color:var(--purple)">${fmt(totValid)}</div><div class="ms">compensazione totale</div></div>
      </div>
      <div class="tbl-outer"><table>
        <thead><tr><th style="text-align:left">Anno maturazione</th><th>Importo</th><th>Scadenza</th><th>Stato</th><th>Risparmio fiscale potenziale (${aliqGain}%)</th></tr></thead>
        <tbody>${minusvalenze.map(m=>{const valid=m.scadenza>=currentYearN;return`<tr><td style="text-align:left">${m.year}</td><td>${fmt(m.amount)}</td><td>${m.year+4}</td><td class="${valid?'pos':'neg'}">${valid?'✅ Valida':'❌ Scaduta'}</td><td class="${valid?'pos':'neutral'}">${valid?'+'+fmt(m.amount*(aliqGain/100)):'—'}</td></tr>`;}).join('')}</tbody>
      </table></div>`;
}

// ══════════════════════════════════════════════════════════════
// switchTab — versione completa (unica definizione)
// ══════════════════════════════════════════════════════════════
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  const btn = document.querySelector(`[data-tab="${tabId}"]`);
  if (btn) btn.classList.add('active');
  const panel = document.getElementById(`tab-${tabId}`);
  if (panel) panel.classList.add('active');
  if (tabId==='scenarios') { updateEcoTimDesc(); renderEcoScenarios(); if (typeof initMultiRegime === 'function') initMultiRegime(); }
  if (tabId==='ab') renderAB();
  if (tabId==='mc') document.getElementById('mcAccYears').textContent=state.years;
  if (tabId==='decumulo') renderDecumulo();
  if (tabId==='fiscale') renderFiscale();
  if (tabId==='backtest') initBacktest();
  if (tabId==='advmc') document.getElementById('advMcModelDesc').innerHTML=ADV_MODEL_DESC[advMCState.model]||'';
  if (tabId==='pensione') { setTimeout(() => { if (typeof renderPensione === 'function') renderPensione(); }, 20); }
}
// Esponi su window così i monkey-patch degli altri moduli trovano la funzione
window.switchTab = switchTab;

