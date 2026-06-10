// ── Chart.js global defaults — leggibilità
if (window.Chart) {
  Chart.defaults.font.family = "'DM Sans', system-ui, sans-serif";
  Chart.defaults.font.size = 12.5;
  Chart.defaults.color = '#202124';
  Chart.defaults.borderColor = 'rgba(0,0,0,.08)';
  Chart.defaults.plugins.legend.labels.font = { size: 12.5, weight: '600', family: "'DM Sans', sans-serif" };
  Chart.defaults.plugins.legend.labels.boxWidth = 18;
  Chart.defaults.plugins.legend.labels.padding = 14;
  Chart.defaults.plugins.tooltip.titleFont = { size: 13, weight: '700' };
  Chart.defaults.plugins.tooltip.bodyFont = { size: 12.5 };
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.elements.line.borderWidth = 2.5;
  Chart.defaults.elements.point.radius = 0;
  Chart.defaults.elements.point.hoverRadius = 5;
}

// ══════════════════════════════════════════════════════════════
// CUSTOM PORTFOLIO — definizione asset class con metadati
// Tutti ETF/ETC ad accumulo. Parametri storici calibrati.
// ══════════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════════
// PORTAFOGLI — parametri storici reali + volatilità storica
// Fonti: Dimson-Marsh-Staunton, Credit Suisse Global Investment
//        Returns Yearbook, Dalio/Browne per PP/GB
// ══════════════════════════════════════════════════════════════
const PORT = {
  eq100: {
    label: '100% Azioni',
    desc: 'Portafoglio interamente azionario Massimo rendimento atteso, massima volatilità. Adatto a orizzonti ≥15 anni con alta tolleranza alle perdite temporanee.',
    best: .102, normal: .070, worst: .007, vol: .160,
    eq: 1.0, ob: 0.0, gold: 0.0, cash: 0.0,
    realRet: .050, inflBeta: 0.3, fxExp: 0.85,  // ~85% non-EUR (MSCI World: 65% USA + altri)
  },
  eq80: {
    label: '80/20 Az/Ob', desc: '80% azioni, 20% obbligazioni. Portafoglio aggressivo con lieve ammortizzatore obbligazionario.',
    best: .091, normal: .065, worst: .013, vol: .130,
    eq: .8, ob: .2, gold: 0, cash: 0, realRet: .045, inflBeta: 0.2, fxExp: 0.70,
  },
  eq60: {
    label: '60/40 Az/Ob', desc: '60/40 classico — il portafoglio bilanciato per eccellenza. Riduce la volatilità rispetto al 100% azioni mantenendo rendimenti solidi nel lungo periodo.',
    best: .074, normal: .055, worst: .016, vol: .095,
    eq: .6, ob: .4, gold: 0, cash: 0, realRet: .037, inflBeta: 0.05, fxExp: 0.55,
  },
  eq50: {
    label: '50/50 Az/Ob', desc: 'Portafoglio equilibrato. Più difensivo del 60/40, adatto a chi ha orizzonte medio e tolleranza moderata al rischio.',
    best: .066, normal: .050, worst: .020, vol: .080,
    eq: .5, ob: .5, gold: 0, cash: 0, realRet: .032, inflBeta: -0.05, fxExp: 0.47,
  },
  eq40: {
    label: '40/60 Az/Ob', desc: 'Prevalenza obbligazionaria. Bassa volatilità, rendimento contenuto. Adatto a chi si avvicina alla pensione.',
    best: .058, normal: .045, worst: .020, vol: .065,
    eq: .4, ob: .6, gold: 0, cash: 0, realRet: .025, inflBeta: -0.15, fxExp: 0.38,
  },
  eq20: {
    label: '20/80 Az/Ob', desc: 'Portafoglio molto conservativo. Minima esposizione azionaria, massima stabilità. Rendimento reale spesso prossimo a zero in contesti di alta inflazione.',
    best: .044, normal: .035, worst: .018, vol: .045,
    eq: .2, ob: .8, gold: 0, cash: 0, realRet: .015, inflBeta: -0.25, fxExp: 0.19,
  },
  ob100: {
    label: '100% Obbligaz.', desc: 'Portafoglio interamente obbligazionario. Protezione del capitale nominale, ma soffre molto in periodi di alta inflazione e rialzo tassi. Volatilità effettiva ~4% (includendo duration risk su scadenze medie 5-7a).',
    best: .038, normal: .030, worst: .015, vol: .040,
    eq: 0, ob: 1.0, gold: 0, cash: 0, realRet: .010, inflBeta: -0.35, fxExp: 0.05,
  },
  lifecycle: {
    label: 'Lifecycle ♻', desc: 'Portafoglio che riduce automaticamente la quota azionaria con l\'età Parte ~80% azioni a 20 anni, arriva a ~20% a 70 anni.',
    best: null, normal: null, worst: null, vol: null,
    eq: null, ob: null, gold: 0, cash: 0, realRet: .035, inflBeta: 0.1, fxExp: null, // variabile con età
  },
  golden_butterfly: {
    label: '🦋 Golden Butterfly',
    desc: 'Ideato da Tyler from Portfolio Charts (2012). Composizione: 20% Az. Large Cap, 20% Az. Small Cap Value, 20% Oro, 20% Ob. Lungo Termine, 20% Ob. Breve Termine. Ottimizzato per massimizzare la peggior performance storica su 30 anni (\'worst case\'). Volatilità molto bassa, ottimo Sharpe ratio storico (1970-2023: ~9.7%/a lordo — gonfiato dal bull market oro anni \'70 e dal bull bond 1980-2020, non ripetibili). Rendimento atteso forward-looking: ~5.2%/a.',
    best: .067, normal: .052, worst: .023, vol: .075,
    eq: .4, ob: .4, gold: .2, cash: 0, realRet: .032, inflBeta: 0.14, fxExp: 0.55,  // 40%eq*0.85 + 20%oro*1.0 + 40%ob*0.05 ≈ 0.56
    breakdown: {
      'Az. Large Cap (US)': '20%',
      'Az. Small Cap Value': '20%',
      'Oro': '20%',
      'Ob. Lungo Termine': '20%',
      'Ob. Breve Termine': '20%',
    }
  },
  permanent: {
    label: '🏛️ Permanent Portfolio',
    desc: 'Ideato da Harry Browne (1981). Composizione: 25% Azioni, 25% Oro, 25% Ob. Lungo Termine, 25% Liquidità. Progettato per funzionare in OGNI regime economico: prosperità (azioni), inflazione (oro), deflazione (obbligazioni), recessione (liquidità). Volatilità storica molto bassa (σ≈7%), rendimento nominale storico 1970-2023: ~8%/a lordo (beneficio del gold rush degli anni \'70 e del bull bond 1980-2020). Rendimento atteso forward-looking: ~4.4%/a. Beta inflazione calcolato ≈ +0.13: oro e liquidità a tasso variabile coprono parzialmente l\'impatto negativo delle obbligazioni lunghe in regime inflattivo.',
    best: .058, normal: .044, worst: .018, vol: .070,
    eq: .25, ob: .25, gold: .25, cash: .25, realRet: .024, inflBeta: 0.13, fxExp: 0.47, // 25%eq*0.85 + 25%oro*1.0 + 25%ob*0.05 + 25%cash*0
    breakdown: {
      'Azioni': '25%',
      'Oro': '25%',
      'Ob. Lungo Termine': '25%',
      'Liquidità (T-Bills)': '25%',
    }
  },
  all_seasons: {
    label: '🌤️ All Seasons (Dalio)',
    desc: 'Versione retail dell\'All Weather di Ray Dalio (Bridgewater). Composizione: 30% Azioni, 40% Ob. Lungo Termine, 15% Ob. Medio Termine, 7.5% Oro, 7.5% Commodities. Progettato per distribuire il rischio su quattro regimi macro (crescita alta/bassa × inflazione alta/bassa). Storicamente: ~7.5%/a nominale, σ≈8%. Rendimento atteso forward-looking: ~5.0%/a. Nota: l\'allocazione del 40% in obbligazioni a lungo termine lo rende più vulnerabile all\'inflazione di quanto sembri (beta inflazione calcolato ≈ −0.03: la perdita sulle obbligazioni compensa quasi del tutto la protezione di oro e commodities).',
    best: .066, normal: .050, worst: .020, vol: .080,
    eq: .30, ob: .55, gold: .15, cash: 0,
    realRet: .030, inflBeta: -0.03, fxExp: 0.40, // 30%eq*0.85 + 15%real(oro 7.5%+comm 7.5%) + 55%ob*0.05
    breakdown: {
      'Azioni Globali': '30%',
      'Ob. Lungo Termine': '40%',
      'Ob. Medio Termine': '15%',
      'Oro': '7.5%',
      'Commodities': '7.5%',
    }
  },
  larry: {
    label: '📐 Larry Portfolio',
    desc: 'Ideato da Larry Swedroe. Alta concentrazione su fattori di rischio accademici (small cap value, emerging). Composizione: 15% US Small Cap Value, 7.5% Intl Small Cap Value, 7.5% Emerging Markets, 70% Ob. Breve/Medio Termine. L\'idea: concentrare il rischio solo sull\'azionario ad alto rendimento atteso (small cap value, emerging) ammortizzato da bond a bassa duration. Volatilità portafoglio calcolata ~7.5%/a. Rendimento atteso ~5.8%/a. Beta inflazione calcolato ≈ −0.02: il contributo del bond breve (tassi flottanti) è quasi neutralizzato dalla quota azionaria value.',
    best: .073, normal: .058, worst: .030, vol: .075,
    eq: .30, ob: .70, gold: 0, cash: 0,
    realRet: .038, inflBeta: -0.02, fxExp: 0.29, // 30%eq*0.85 + 70%ob*0.05
    breakdown: {
      'US Small Cap Value': '15%',
      'Intl Small Cap Value': '7.5%',
      'Emerging Markets': '7.5%',
      'Ob. Breve/Medio Termine': '70%',
    }
  },
  global_market: {
    label: '🗺️ Global Market Portfolio',
    desc: 'Portafoglio che replica la capitalizzazione del mercato mondiale: ~55% azioni globali sviluppati, ~45% obbligazioni globali aggregate. È il portafoglio "neutro" per definizione — rappresenta la quota detenuta dall\'investitore medio mondiale. Rendimento storico ~6%/a, vol ~9%. Ottimo benchmark passivo.',
    best: .071, normal: .053, worst: .020, vol: .088,
    eq: .55, ob: .45, gold: 0, cash: 0,
    realRet: .033, inflBeta: 0.02, fxExp: 0.49, // 55%eq*0.85 + 45%ob*0.05
    breakdown: {
      'Azioni Globali Sviluppati': '55%',
      'Obbligaz. Globali (Agg.)': '45%',
    }
  },
  ec_us_9060: {
    label: '⚡ Efficient Core 90/60 USA',
    desc: 'Strategia capital-efficient (efficient core 90/60 USA): 90% azioni large cap USA + 60% futures su Treasury USA, per un\'esposizione notional del 150% (leva 1,5x su un 60/40). L\'idea, fondata sulla teoria di Markowitz, è che il portafoglio a miglior Sharpe vada usato con leva invece di puntare al 100% azioni. La leva ha un costo di finanziamento (~tasso a breve) già dedotto dal rendimento atteso. Volatilità ~14%/a, tra un 60/40 e un 100% azioni. Disponibile come ETF UCITS. Il 10% di cassa funge da collaterale per i futures.',
    best: .098, normal: .071, worst: .021, vol: .139,
    eq: .90, ob: .60, gold: 0, cash: 0, leverage: 1.5,
    realRet: .051, inflBeta: -0.05, fxExp: 0.95,
    breakdown: {
      'Az. Large Cap USA': '90%',
      'Futures Treasury USA': '60%',
      '(Cassa collaterale)': '10%',
    }
  },
  ec_glob_9060: {
    label: '⚡ Efficient Core 90/60 Globale',
    desc: 'Versione globale della strategia capital-efficient (efficient core 90/60 globale): 90% azioni globali sviluppati + 60% futures su titoli di stato globali (USA, UK, Germania, Giappone), esposizione notional 150%. Più diversificata della versione USA sia sul lato azionario sia obbligazionario. Costo di finanziamento della leva già dedotto. Volatilità ~14%/a. Disponibile come ETF UCITS. Adatta come "core" di un portafoglio per liberare spazio ad asset diversificanti senza ridurre l\'esposizione azionaria.',
    best: .102, normal: .076, worst: .024, vol: .142,
    eq: .90, ob: .60, gold: 0, cash: 0, leverage: 1.5,
    realRet: .056, inflBeta: -0.04, fxExp: 0.70,
    breakdown: {
      'Az. Globali Sviluppati': '90%',
      'Futures Gov. Globali': '60%',
      '(Cassa collaterale)': '10%',
    }
  },
  return_stack: {
    label: '🔀 Return Stacking (UCITS)',
    desc: 'Strategia "return stacking" replicabile con ETF UCITS: combina un efficient core globale (90/60 azioni-bond) con un ETF managed futures / trend following. Esposizione effettiva ~45% azioni + 30% obbligazioni + 50% trend = 125% notional. Il trend following è un "vero diversificatore" (correlazione ~−0,05 con azioni) che storicamente genera "crisis alpha" nelle crisi prolungate (2002, 2008, 2022). Sharpe atteso superiore grazie alla decorrelazione. Costi più alti (TER più elevato) e complessità maggiore — adatto a investitori esperti. Versione semplificata e didattica del concetto di portable alpha.',
    best: .085, normal: .065, worst: .027, vol: .101,
    eq: .45, ob: .30, gold: 0, cash: 0, trend: .50, leverage: 1.25,
    realRet: .045, inflBeta: 0.10, fxExp: 0.65,
    breakdown: {
      'Efficient Core Globale 90/60': '50%',
      'Managed Futures / Trend': '50%',
      '(Esposizione: 45% az + 30% ob + 50% trend)': '125%',
    }
  },
  custom: {
    label: '🔧 Custom',
    desc: 'Portafoglio personalizzato. Scegli le asset class e le percentuali nel pannello sottostante.',
    best: null, normal: null, worst: null, vol: null,
    eq: null, ob: null, gold: null, cash: null,
    realRet: null, inflBeta: null, fxExp: null,
  },
};

// ══════════════════════════════════════════════════════════════
// ASSET CLASSES — per portafoglio custom
// Parametri calibrati su dati storici e forward-looking consensus
// ══════════════════════════════════════════════════════════════
const ASSET_CLASSES = {
  // ══════════════════════════════════════════════════════════════
  // AZIONI
  // mu = rendimento nominale forward-looking (10-20a)
  // vol = volatilità storica annualizzata 1970-2024
  // Fonti: DMS Global Investment Returns Yearbook 2024,
  //        dati storici mercati finanziari (Federal Reserve,
  //        Banche Centrali, letteratura accademica)
  // ══════════════════════════════════════════════════════════════
  eq_sviluppati: {
    label: 'Azioni Mercati Sviluppati', emoji: '🌍', cat: 'eq', isEq: true,
    mu: 0.067, vol: 0.158, inflBeta: 0.30, ter: 0.2, fxExp: 0.85,
    histCAGR: 0.102, histPeriod: '1970-2024', src: 'DMS Yearbook 2024',
    desc: 'Paniere di azioni di paesi sviluppati con composizione geografica ampia (America del Nord, Europa, Pacifico). CAGR storico 10.2%/a. Rendimento atteso forward-looking ~6.7%/a, più conservativo per effetto della mean-reversion delle valutazioni (CAPE elevati nel 2024) e coerente con la media pesata dei componenti (~65-70% USA + Europa + Pacifico).',
  },
  eq_usa: {
    label: 'Azioni USA Large Cap', emoji: '🇺🇸', cat: 'eq', isEq: true,
    mu: 0.063, vol: 0.155, inflBeta: 0.28, ter: 0.07, fxExp: 1.0,
    histCAGR: 0.105, histPeriod: '1970-2024', src: 'Dati storici mercato azionario USA',
    desc: 'Grandi capitalizzazioni americane. CAGR storico 10.5%/a. Valutazioni elevate al 2024 (CAPE ~30-32) comprimono il rendimento atteso a ~7%/a. Massima liquidità e profondità di mercato a livello globale.',
  },
  eq_europa: {
    label: 'Azioni Europa', emoji: '🇪🇺', cat: 'eq', isEq: true,
    mu: 0.07, vol: 0.170, inflBeta: 0.25, ter: 0.15, fxExp: 0.1,
    histCAGR: 0.095, histPeriod: '1970-2024', src: 'DMS Yearbook 2024',
    desc: 'Mercati azionari europei (Germania, Francia, UK, Svizzera, Olanda, Italia ecc.). CAGR storico ~9.5%/a. Valutazioni storicamente più convenienti rispetto agli USA (CAPE ~14-16 in media), ma crescita degli utili inferiore nel lungo periodo.',
  },
  eq_em: {
    label: 'Azioni Mercati Emergenti', emoji: '🌏', cat: 'eq', isEq: true,
    mu: 0.078, vol: 0.225, inflBeta: 0.35, ter: 0.2, fxExp: 1.0,
    histCAGR: 0.098, histPeriod: '1988-2024', src: 'DMS Yearbook 2024',
    desc: 'Cina, India, Brasile, Taiwan, Corea del Sud e altri mercati in sviluppo. CAGR dal 1988: ~9.8%/a. Alta volatilità (σ≈22%) e rischio politico/valutario. Premio di crescita economica parzialmente eroso da perdite da valuta e governance societaria più debole.',
  },
  eq_small_value: {
    label: 'Azioni Small Cap Value (fattore)', emoji: '📐', cat: 'eq', isEq: true,
    mu: 0.085, vol: 0.205, inflBeta: 0.25, ter: 0.3, fxExp: 1.0,
    histCAGR: 0.135, histPeriod: '1970-2024', src: 'Fama-French Data Library',
    desc: 'Piccole capitalizzazioni a bassa valutazione (P/B basso). Premio documentato da Fama & French (1992, 1993). CAGR US Small Cap Value ~13.5%/a (1970-2024) — fortemente influenzato dagli anni \'70-\'80. Forward-looking più moderato (~8.5%/a) per mean-reversion dei premi di rischio.',
  },
  reits: {
    label: 'Immobiliare Quotato (REITs)', emoji: '🏢', cat: 'eq', isEq: true,
    mu: 0.065, vol: 0.175, inflBeta: 0.20, ter: 0.4, fxExp: 0.8,
    histCAGR: 0.112, histPeriod: '1972-2024', src: 'Dati storici mercato immobiliare quotato',
    desc: 'Fondi immobiliari quotati su borsa. CAGR 1972-2024: ~11.2%/a. Obbligo di distribuzione ≥90% degli utili → elevata cedola. Copertura parziale dell\'inflazione tramite canoni di affitto indicizzati. Correlazione con azioni ~0.60, parzialmente decorrelante.',
  },

  // ══════════════════════════════════════════════════════════════
  // FATTORI ACCADEMICI (FACTOR INVESTING)
  // Rendimenti basati su implementazioni long-only dei premi di
  // rischio documentati dalla letteratura finanziaria accademica.
  // Dati: Fama-French Data Library, letteratura peer-reviewed.
  // mu = forward-looking (premi storici spesso sovrastimati).
  // vol = volatilità storica implementazione long-only globale.
  // ══════════════════════════════════════════════════════════════
  // ── Fattori azionari (cat: 'fat') ─────────────────────────
  // Correlazione intra-fattore calibrata empiricamente (ρ≈0.52)
  // — inferiore alle azioni pure (ρ≈0.65) per effetto della
  // decorrelazione tra i diversi premi di rischio.
  // Fonti: Fama-French Data Library, letteratura peer-reviewed
  // (Jegadeesh & Titman 1993, Carhart 1997, Novy-Marx 2013,
  //  Frazzini & Pedersen 2014, Lustig et al. 2011).
  // mu = forward-looking conservativo (premi storici tendono a
  //      comprimersi post-pubblicazione e per affollamento).
  fat_valore: {
    label: 'Fattore Valore (Value)', emoji: '💎', cat: 'fat', isEq: true,
    mu: 0.072, vol: 0.175, inflBeta: 0.35, ter: 0.3, fxExp: 0.85,
    histCAGR: 0.105, histPeriod: '1970-2024', src: 'Fama & French (1992, 1993)',
    desc: 'Azioni con basse valutazioni (P/B, P/E, EV/EBITDA bassi). CAGR storico long-only ~10.5%/a. Ha sottoperformato il mercato tra 2007 e 2020, recuperando dal 2021. Forward-looking ~7.5%/a. Alta correlazione con azioni cicliche e finanziarie — soffre in recessioni profonde. Correlazione con Momentum ρ≈−0.15: ottima complementarità.',
  },
  fat_momentum: {
    label: 'Fattore Momentum (Prezzo)', emoji: '🚀', cat: 'fat', isEq: true,
    mu: 0.075, vol: 0.195, inflBeta: 0.05, ter: 0.3, fxExp: 0.85,
    histCAGR: 0.120, histPeriod: '1970-2024', src: 'Jegadeesh & Titman (1993), Carhart (1997)',
    desc: 'Strategia long sistematica sui vincitori degli ultimi 12-1 mesi. CAGR storico long-only ~12%/a (1970-2024). Rendimento elevato ma con crash risk: drawdown violenti nei mercati a U-turn (es. 2009: −60%). Forward-looking ~8%/a. Correlazione con Valore ρ≈−0.15 — principale beneficio del multi-fattore.',
  },
  fat_qualita: {
    label: 'Fattore Qualità / Redditività', emoji: '⭐', cat: 'fat', isEq: true,
    mu: 0.075, vol: 0.150, inflBeta: 0.18, ter: 0.3, fxExp: 0.85,
    histCAGR: 0.095, histPeriod: '1990-2024', src: 'Novy-Marx (2013), Fama & French (2015)',
    desc: 'Aziende con alta redditività operativa, bassa leva finanziaria e stabilità degli utili (RMW: Robust Minus Weak). CAGR storico long-only ~9.5%/a (1990-2024). Carattere difensivo: sovra-performa in crisi, sotto-performa nei rally euforici. Parte del modello accademico a 5 fattori. Forward-looking ~7.5%/a.',
  },
  fat_low_vol: {
    label: 'Fattore Bassa Volatilità (Difensivo)', emoji: '📉', cat: 'fat', isEq: true,
    mu: 0.070, vol: 0.120, inflBeta: 0.12, ter: 0.3, fxExp: 0.85,
    histCAGR: 0.085, histPeriod: '1970-2024', src: 'Frazzini & Pedersen (2014)',
    desc: 'Azioni con volatilità storica e beta di mercato bassi (BAB: Betting Against Beta). Anomalia CAPM: il rendimento aggiustato per il rischio supera quello del mercato. CAGR storico ~8.5%/a con σ ~12% (1970-2024). Concentrato in settori difensivi: utilities, consumer staples, healthcare. Forward-looking ~7.0%/a. Ottimo abbinamento con Momentum.',
  },
  fat_size: {
    label: 'Fattore Dimensione (Small Cap)', emoji: '🔬', cat: 'fat', isEq: true,
    mu: 0.075, vol: 0.190, inflBeta: 0.20, ter: 0.25, fxExp: 0.85,
    histCAGR: 0.095, histPeriod: '1970-2024', src: 'Banz (1981), Fama-French Data Library',
    desc: 'Premio di dimensione (SMB: Small Minus Big) — le piccole capitalizzazioni tendono a sovra-performare le grandi nel lungo periodo. CAGR storico ~9.5%/a (1970-2024). Il premio è più robusto nel segmento value. Parzialmente compresso post-pubblicazione accademica. Forward-looking ~7.5%/a. Correlazione con mercato ~0.80.',
  },
  fat_investment: {
    label: 'Fattore Investimento (CMA)', emoji: '🏗️', cat: 'fat', isEq: true,
    mu: 0.072, vol: 0.130, inflBeta: 0.10, ter: 0.35, fxExp: 0.85,
    histCAGR: 0.080, histPeriod: '1990-2024', src: 'Fama & French (2015)',
    desc: 'Aziende con crescita degli attivi bassa (Conservative Minus Aggressive — CMA). Le imprese che investono meno producono rendimenti più alti nel lungo periodo. Parte del modello a 5 fattori (Fama-French 2015). CAGR storico ~8%/a (1990-2024). Carattere difensivo, alta correlazione con Qualità (ρ≈0.40). Forward-looking ~7.2%/a.',
  },
  fat_dividendi: {
    label: 'Fattore Dividendi / Dividend Growth', emoji: '💰', cat: 'fat', isEq: true,
    mu: 0.072, vol: 0.145, inflBeta: 0.22, ter: 0.3, fxExp: 0.85,
    histCAGR: 0.092, histPeriod: '1970-2024', src: 'Literatura accademica sui dividendi',
    desc: 'Aziende con dividend yield elevato e/o storia di crescita dei dividendi (Dividend Aristocrats). CAGR storico ~9.2%/a (1970-2024). Sovrapposizione parziale con Qualità e Valore. Flusso cedolare elevato riduce la volatilità percepita. Settori tipici: utility, finanziari, consumer staples. Forward-looking ~7.2%/a.',
  },
  fat_multifat: {
    label: 'Multi-Fattore (Val+Mom+Qual+LowVol+CMA)', emoji: '🎯', cat: 'fat', isEq: true,
    mu: 0.074, vol: 0.138, inflBeta: 0.20, ter: 0.4, fxExp: 0.85,
    histCAGR: 0.100, histPeriod: '1990-2024', src: 'Letteratura accademica multi-fattore',
    desc: 'Combinazione sistematica di Valore, Momentum, Qualità, Bassa Volatilità e Investimento con pesi uguali. CAGR storico ~10%/a (1990-2024). La diversificazione tra fattori decorrelati (Value-Momentum ρ≈−0.15) riduce la volatilità complessiva (σ≈13.8%). Migliore profilo rischio/rendimento dei singoli fattori nel lungo periodo.',
  },

  // ── Fattori alternativi — Carry, Valute, Trend ───────────────
  // Categorie speciali per correlazioni più accurate:
  // cat:'fat'   → fattori azionari sistematici
  // cat:'carry' → premi carry cross-asset
  // cat:'trend' → trend following / managed futures
  // I fattori carry e trend hanno correlazioni molto diverse
  // dai fattori azionari — trattati separatamente nella matrice.
  fat_carry_bond: {
    label: 'Carry Obbligazionario', emoji: '📊', cat: 'carry',
    mu: 0.045, vol: 0.085, inflBeta: 0.05, ter: 0.5, fxExp: 0.0,
    histCAGR: 0.062, histPeriod: '1990-2024', src: 'Koijen et al. (2018), letteratura carry',
    desc: 'Premio carry sul reddito fisso: posizione long su curve dei tassi ad alto carry e short su curve a basso carry tra paesi sviluppati. CAGR storico ~6.2%/a (1990-2024), σ ~8.5%. Bassa correlazione con azioni (ρ≈0.10) e con il trend following (ρ≈0.20). Soffre in crisi di risk-off globali. Forward-looking ~4.5%/a normalizzato.',
  },
  fat_carry_fx: {
    label: 'Carry Valutario (FX Carry)', emoji: '💱', cat: 'carry',
    mu: 0.040, vol: 0.095, inflBeta: 0.08, ter: 0.5, fxExp: 0.0,
    histCAGR: 0.055, histPeriod: '1990-2024', src: 'Lustig, Roussanov & Verdelhan (2011)',
    desc: 'Premio carry valutario: long valute ad alto tasso di interesse, short valute a basso tasso. CAGR storico ~5.5%/a (1990-2024), σ ~9.5%. Storicamente uno dei premi più stabili nei mercati valutari. Soffre violentemente nei crash globali (es. 2008: −30%). Correlazione con azioni ρ≈0.15, con carry obbligazionario ρ≈0.35. Forward-looking ~4.0%/a.',
  },
  fat_trend: {
    label: 'Trend Following / Managed Futures', emoji: '🌊', cat: 'trend',
    mu: 0.055, vol: 0.150, inflBeta: 0.30, ter: 0.8, fxExp: 0.0,
    histCAGR: 0.082, histPeriod: '1990-2024', src: 'Moskowitz, Ooi & Pedersen (2012)',
    desc: 'Momentum time-series sistematico su più asset class (azioni, bond, valute, commodity). CAGR storico ~8.2%/a (1990-2024), σ ~15%. Caratteristica chiave: correlazione con azioni ρ≈−0.05 — vero diversificatore. "Crisis alpha": tende a performare bene in crisi sostenute (2002, 2008, 2022). In periodi inflattivi va tipicamente long commodity e gold. Forward-looking ~5.5%/a al netto dei costi.',
  },

  // ══════════════════════════════════════════════════════════════
  // OBBLIGAZIONARIO GOVERNATIVO USA
  // mu = forward-looking basato sui livelli di yield 2024-2025
  //      normalizzati su orizzonte 10-20a
  // vol = volatilità storica 1970-2024
  // Fonte: dati storici Federal Reserve (FRED) e mercato USA
  // ══════════════════════════════════════════════════════════════
  ob_usa_st: {
    label: 'Gov. USA Breve (1-3a)', emoji: '🇺🇸', cat: 'ob_usa',
    mu: 0.043, vol: 0.027, inflBeta: 0.10, ter: 0.07, fxExp: 1.0,
    histCAGR: 0.048, histPeriod: '1970-2024', src: 'Federal Reserve (FRED)',
    desc: 'Titoli del Tesoro USA a scadenza 1-3 anni. Duration ~1.8. Volatilità storica ~2.7%. Rendimento legato al tasso di policy della Federal Reserve. Ottimo sostituto della liquidità in contesti di tassi elevati. Quasi nulla sensibilità ai tassi a lungo termine.',
  },
  ob_usa_it: {
    label: 'Gov. USA Intermedio (3-7a)', emoji: '🇺🇸', cat: 'ob_usa',
    mu: 0.045, vol: 0.055, inflBeta: -0.15, ter: 0.07, fxExp: 1.0,
    histCAGR: 0.062, histPeriod: '1970-2024', src: 'Federal Reserve (FRED)',
    desc: 'Treasury USA 3-7 anni. Duration ~4.5. Volatilità ~5.5%. Punto di riferimento del mercato obbligazionario USA. Buona decorrelazione dall\'azionario in recessione (flight to quality). CAGR storico 6.2%/a gonfiato dal ciclo di calo dei tassi 1981-2021.',
  },
  ob_usa_lt: {
    label: 'Gov. USA Lungo (7-10a)', emoji: '🇺🇸', cat: 'ob_usa',
    mu: 0.047, vol: 0.085, inflBeta: -0.30, ter: 0.1, fxExp: 1.0,
    histCAGR: 0.068, histPeriod: '1970-2024', src: 'Federal Reserve (FRED)',
    desc: 'Treasury USA 7-10 anni. Duration ~7-8. Forte apprezzamento in recessioni/deflazione. Soffre in regimi inflattivi (perdite reali del 30-40% negli anni \'70). Correlazione con azioni ~−0.15 in era post-2000.',
  },
  ob_usa_ult: {
    label: 'Gov. USA Ultra-Lungo (20-30a)', emoji: '🇺🇸', cat: 'ob_usa',
    mu: 0.048, vol: 0.145, inflBeta: -0.45, ter: 0.1, fxExp: 1.0,
    histCAGR: 0.074, histPeriod: '1970-2024', src: 'Federal Reserve (FRED)',
    desc: 'Titoli del Tesoro USA 20-30 anni. Duration ~17-19. Volatilità ~14.5%/a — paragonabile alle azioni. Sensibilità massima ai tassi: −17% circa per ogni +1% di rialzo. Usato come deflation hedge (All Seasons 40%, Permanent Portfolio 25%). Anno 2022: −30%.',
  },

  // ══════════════════════════════════════════════════════════════
  // OBBLIGAZIONARIO GOVERNATIVO EURO
  // Fonte: dati Banca Centrale Europea e mercati obbligazionari
  //        area euro (periodo post-introduzione euro: 1999-2024)
  // ══════════════════════════════════════════════════════════════
  ob_eu_st: {
    label: 'Gov. Euro Breve (1-3a)', emoji: '🇪🇺', cat: 'ob_eu',
    mu: 0.032, vol: 0.024, inflBeta: 0.05, ter: 0.1, fxExp: 0.0,
    histCAGR: 0.035, histPeriod: '1999-2024', src: 'Banca Centrale Europea',
    desc: 'Titoli di stato area euro a 1-3 anni (emittenti investment grade: Germania, Francia, Italia, Spagna ecc.). Volatilità minima (~2.4%). Rendimento tornato positivo dopo la fase ZIRP. Rischio spread paese in fasi di stress (2010-2012, 2022).',
  },
  ob_eu_it: {
    label: 'Gov. Euro Intermedio (3-7a)', emoji: '🇪🇺', cat: 'ob_eu',
    mu: 0.033, vol: 0.055, inflBeta: -0.15, ter: 0.1, fxExp: 0.0,
    histCAGR: 0.043, histPeriod: '1999-2024', src: 'Banca Centrale Europea',
    desc: 'Governativi area euro 3-7 anni. Duration ~4. Principale riferimento per portafogli obbligazionari europei. Include spread paese: differenziale BTP/Bund storicamente 100-200 bps in media, oltre 500 bps in crisi 2012. CAGR storico comprende il ciclo di QE della BCE (2015-2022).',
  },
  ob_eu_lt: {
    label: 'Gov. Euro Lungo (7-10a)', emoji: '🇪🇺', cat: 'ob_eu',
    mu: 0.035, vol: 0.090, inflBeta: -0.30, ter: 0.1, fxExp: 0.0,
    histCAGR: 0.051, histPeriod: '1999-2024', src: 'Banca Centrale Europea',
    desc: 'Governativi area euro 7-10 anni. Duration ~7.5. Forte sensibilità ai tassi BCE. Decorrelazione dall\'azionario in recessione. Correlazione positiva con azioni in stagflazione (perdita doppia — raro ma storicamente osservato negli anni \'70 e nel 2022).',
  },

  // ══════════════════════════════════════════════════════════════
  // OBBLIGAZIONARIO GLOBALE
  // Dati: indici aggregati governativi/obbligazionari globali
  //       con copertura valutaria in EUR (hedged)
  // ══════════════════════════════════════════════════════════════
  ob_glob_gov: {
    label: 'Gov. Globale Intermedio (hedged EUR)', emoji: '🌐', cat: 'ob_glob',
    mu: 0.042, vol: 0.048, inflBeta: -0.12, ter: 0.1, fxExp: 0.0,
    histCAGR: 0.056, histPeriod: '1990-2024', src: 'Indici governativi globali aggregati',
    desc: 'Paniere di titoli di stato dei principali paesi sviluppati (USA ~40%, Europa ~30%, Giappone ~15%, UK ~5%, altri) con duration ~6 anni e copertura valutaria in EUR. Diversifica il rischio di singola curva dei tassi. Rendimento mediano tra USA (~4.1%) ed Euro (~3.1%).',
  },
  ob_glob_agg: {
    label: 'Aggregato Obbligazionario Globale (hedged EUR)', emoji: '🌐', cat: 'ob_glob',
    mu: 0.047, vol: 0.055, inflBeta: -0.08, ter: 0.1, fxExp: 0.0,
    histCAGR: 0.060, histPeriod: '1990-2024', src: 'Indice aggregato obbligazionario globale',
    desc: 'Universo obbligazionario globale aggregato: titoli di stato (~50%), corporate investment grade (~35%), cartolarizzati ABS/MBS (~15%), con copertura valutaria in EUR. Duration ~6.5 anni. Il riferimento per portafogli multi-asset a livello globale.',
  },
  ob_infl: {
    label: 'Obblig. Indicizzate Inflazione', emoji: '🛡️', cat: 'ob_glob',
    mu: 0.042, vol: 0.060, inflBeta: 0.80, ter: 0.15, fxExp: 0.5,
    histCAGR: 0.050, histPeriod: '1997-2024', src: 'Mercati obbligazioni indicizzate',
    desc: 'Titoli di stato indicizzati all\'inflazione (BTPi italiani, Bund indicizzati, OATi francesi, TIPS USA). Il capitale cresce con l\'indice dei prezzi: protezione diretta dall\'inflazione. Rendimento reale garantito se tenuti a scadenza (~1.5-2% reale nel 2024). Volatilità simile alla duration nominale equivalente (~7 anni).',
  },

  // ══════════════════════════════════════════════════════════════
  // REAL ASSETS — ORO, COMMODITIES, LIQUIDITA
  // ══════════════════════════════════════════════════════════════
  gold: {
    label: 'Oro (metallo fisico / ETC)', emoji: '🥇', cat: 'real', isGold: true,
    mu: 0.038, vol: 0.150, inflBeta: 0.50, ter: 0.2, fxExp: 1.0,
    histCAGR: 0.078, histPeriod: '1970-2024', src: 'Prezzo spot oro (mercato internazionale)',
    desc: 'Prezzo spot oro in USD, convertito in EUR. CAGR 1970-2024: 7.8%/a — fortemente gonfiato dalla fine del gold standard 1971 e dal rialzo degli anni \'70-\'80. Forward-looking ~3.8%/a (inflazione + premio di scarsità). Nessun dividendo o cedola — rendimento da solo apprezzamento. Forte decorrelazione con azioni in crisi.',
  },
  commodities: {
    label: 'Commodities Diversificate', emoji: '⚡', cat: 'real',
    mu: 0.032, vol: 0.185, inflBeta: 0.65, ter: 0.3, fxExp: 1.0,
    histCAGR: 0.052, histPeriod: '1970-2024', src: 'Indici commodity diversificati (dati aggregati)',
    desc: 'Paniere diversificato di materie prime: energia ~55%, metalli industriali ~20%, agricoltura ~25%. CAGR storico ~5.2%/a influenzato dagli shock petroliferi degli anni \'70. Rendimento reale di lungo periodo vicino a zero per i costi di roll sui futures. Ottima copertura inflazione a breve termine (β≈0.65).',
  },
  cash: {
    label: 'Liquidità / Mercato Monetario', emoji: '💵', cat: 'cash', isCash: true,
    mu: 0.025, vol: 0.020, inflBeta: 0.15, ter: 0.05, fxExp: 0.0,
    histCAGR: 0.048, histPeriod: '1970-2024', src: 'Dati storici tassi breve termine (Fed/BCE)',
    desc: 'BOT, T-Bills, fondi monetari, conti deposito. Rendimento = tasso di policy della banca centrale. Volatilità ~2% (include rischio di reinvestimento/variazione tassi: il rendimento atteso cambia ad ogni rinnovo). Rendimento reale spesso negativo in periodi inflattivi. CAGR storico 4.8%/a gonfiato dall\'era dei tassi alti anni \'80. Forward-looking normalizzato ~2.5%/a.',
  },
};

// ── Mappa categoria per calcolo correlazioni portafoglio custom ──
const AC_CAT = (key) => {
  const a = ASSET_CLASSES[key];
  if (!a) return 'other';
  return a.cat || 'other';
};

// ── Matrice di correlazione per categoria (empirica, 1970-2024) ───────────────
// Categorie:
//   eq      — azioni pure (plain equity)
//   fat     — fattori azionari sistematici (Value, Momentum, Quality, LowVol, Size, CMA, Div)
//   carry   — premi carry cross-asset (bond carry, FX carry)
//   trend   — trend following / managed futures (decorrelato da tutto)
//   ob_usa  — governativi USA varie durate
//   ob_eu   — governativi Euro varie durate
//   ob_glob — aggregato e indicizzati globali
//   real    — oro, commodities
//   cash    — liquidità
// Fonti: DMS Yearbook 2024, Pedersen (2015) "Efficiently Inefficient",
//        Moskowitz et al. (2012), Koijen et al. (2018), Lustig et al. (2011)
const CORR_PAIR = (cat1, cat2) => {
  if (cat1 === cat2) {
    if (cat1 === 'eq')    return 0.65;  // intra-azionario
    if (cat1 === 'fat')   return 0.52;  // fattori decorrelati tra loro (es. Value-Mom ρ≈−0.15)
    if (cat1 === 'carry') return 0.35;  // bond carry e FX carry moderatamente correlati
    if (cat1 === 'trend') return 1.00;  // unico asset nella categoria
    if (cat1 === 'ob_usa' || cat1 === 'ob_eu') return 0.78;
    if (cat1 === 'ob_glob') return 0.72;
    if (cat1 === 'real')  return 0.15;
    return 1.0;
  }
  const pair = [cat1, cat2].sort().join('|');
  const map = {
    // ── Azioni pure vs altri ──────────────────────────────────
    'eq|fat':         0.72,   // fattori = mostly equity market exposure
    'eq|carry':       0.12,
    'eq|trend':      -0.05,   // trend following: decorrelato o lievemente negativo
    'eq|ob_eu':      -0.05,
    'eq|ob_glob':    -0.05,
    'eq|ob_usa':     -0.05,
    'eq|real':        0.05,
    'eq|cash':        0.02,
    // ── Fattori azionari vs altri ─────────────────────────────
    'fat|carry':      0.18,
    'fat|trend':      0.05,   // trend following poco correlato anche con fattori eq
    'fat|ob_eu':     -0.03,
    'fat|ob_glob':   -0.03,
    'fat|ob_usa':    -0.03,
    'fat|real':       0.06,
    'fat|cash':       0.02,
    // ── Carry vs altri ───────────────────────────────────────
    'carry|trend':    0.20,   // entrambi sistematici ma diversi
    'carry|ob_eu':    0.28,
    'carry|ob_glob':  0.25,
    'carry|ob_usa':   0.22,
    'carry|real':     0.08,
    'carry|cash':     0.05,
    // ── Trend following vs altri ──────────────────────────────
    'ob_eu|trend':    0.18,   // trend spesso long bond in recessioni
    'ob_glob|trend':  0.16,
    'ob_usa|trend':   0.20,
    'real|trend':     0.28,   // trend spesso long gold/commodity in inflazione
    'cash|trend':     0.02,
    // ── Obbligazionario cross-categoria ──────────────────────
    'ob_eu|ob_glob':  0.65,
    'ob_eu|ob_usa':   0.62,
    'ob_glob|ob_usa': 0.68,
    'ob_eu|real':     0.04,
    'ob_eu|cash':     0.05,
    'ob_glob|real':   0.04,
    'ob_glob|cash':   0.05,
    'ob_usa|real':    0.03,
    'ob_usa|cash':    0.06,
    // ── Real assets vs cash ───────────────────────────────────
    'cash|real':      0.02,
  };
  return map[pair] ?? 0.03;
};

// ── Matrice di correlazione in REGIME DI STRESS ──────────────────────────────
// In crisi storiche (2008, 2020, 2022) le correlazioni "esplodono" verso 1
// per gli asset rischiosi — il classico "correlations go to 1 in a crash".
// Fenomeno documentato in Longin & Solnik (2001), Forbes & Rigobon (2002).
// I bond governativi possono mantenere la decorrelazione (flight to quality)
// oppure perderla in inflazione (2022: azioni e bond entrambi −15%).
// Fonti: Ang, Bekaert (2002) regime-switching, Pollet & Wilson (2010).
const CORR_PAIR_STRESS = (cat1, cat2) => {
  // Intra-categoria: tutte salgono verso 0.85-0.95
  if (cat1 === cat2) {
    if (cat1 === 'eq')    return 0.88;  // azioni: ρ→0.88 in crisi
    if (cat1 === 'fat')   return 0.78;  // fattori: alcuni mantengono diversificazione (es. Trend)
    if (cat1 === 'carry') return 0.65;
    if (cat1 === 'trend') return 1.00;
    if (cat1 === 'ob_usa' || cat1 === 'ob_eu') return 0.88;
    if (cat1 === 'ob_glob') return 0.85;
    if (cat1 === 'real')  return 0.50;
    return 1.0;
  }
  const pair = [cat1, cat2].sort().join('|');
  const map = {
    // ── Azioni vs altri in stress ──────────────────────────
    'eq|fat':         0.85,   // fattori azionari saltano con il mercato
    'eq|carry':       0.55,   // carry trade unwinding
    'eq|trend':       0.10,   // trend following spesso si mantiene decorrelato
    'eq|ob_eu':       0.25,   // in inflazione (2022): bond ed equity giù insieme
    'eq|ob_glob':     0.25,
    'eq|ob_usa':      0.20,   // US Treasury spesso ancora flight-to-quality
    'eq|real':        0.30,   // commodities/oro salgono in alcune crisi (inflattive)
    'eq|cash':        0.05,
    // ── Fattori vs altri ───────────────────────────────────
    'fat|carry':      0.50,
    'fat|trend':      0.10,
    'fat|ob_eu':      0.20,
    'fat|ob_glob':    0.20,
    'fat|ob_usa':     0.15,
    'fat|real':       0.25,
    'fat|cash':       0.05,
    // ── Carry vs altri (carry trade unwinding è correlato) ─
    'carry|trend':    0.30,
    'carry|ob_eu':    0.45,
    'carry|ob_glob':  0.45,
    'carry|ob_usa':   0.40,
    'carry|real':     0.20,
    'carry|cash':     0.10,
    // ── Trend following: spesso mantiene decorrelazione ────
    'ob_eu|trend':    0.20,
    'ob_glob|trend':  0.20,
    'ob_usa|trend':   0.20,
    'real|trend':     0.35,   // trend long commodity in inflazione
    'cash|trend':     0.02,
    // ── Obbligazionario in stress (corre ridotto) ──────────
    'ob_eu|ob_glob':  0.82,
    'ob_eu|ob_usa':   0.78,
    'ob_glob|ob_usa': 0.82,
    'ob_eu|real':     0.15,
    'ob_eu|cash':     0.15,
    'ob_glob|real':   0.15,
    'ob_glob|cash':   0.15,
    'ob_usa|real':    0.10,
    'ob_usa|cash':    0.20,
    'cash|real':      0.05,
  };
  return map[pair] ?? 0.20;
};


// ══════════════════════════════════════════════════════════════
// SCENARI ECONOMICI — parametri calibrati sui dati storici
// ══════════════════════════════════════════════════════════════
const ECO_SCENARIOS = {
  normal_growth: {
    label: 'Crescita Normale',
    emoji: '📈',
    desc: 'Economia in espansione moderata, inflazione sotto controllo (2-3%), tassi stabili. Simile agli anni 1990-2000 e 2012-2020. Il contesto migliore per portafogli bilanciati.',
    color: '#1e8e3e',
    bg: 'rgba(30,142,62,.08)',
    border: 'rgba(30,142,62,.4)',
    // Moltiplicatori sui rendimenti base del portafoglio
    eqMult: 1.0, obMult: 1.0, goldMult: 0.7,
    inflMean: 2.0, inflSigma: 0.8,
    volMult: 1.0, cashRet: 0.02,
    duration: 99, // baseline — sempre attivo
  },
  stagflation: {
    label: 'Stagflazione',
    emoji: '🔥',
    desc: 'Alta inflazione + bassa crescita. Scenario anni \'70 (inflazione 7-12%). Le azioni perdono in termini reali, le obbligazioni nominali crollano, l\'oro e le materie prime performano. Devastante per 60/40, ottimo per Permanent Portfolio.',
    color: '#e37400',
    bg: 'rgba(227,116,0,.08)',
    border: 'rgba(227,116,0,.4)',
    eqMult: 0.6, obMult: 0.3, goldMult: 2.2,
    inflMean: 7.0, inflSigma: 2.0,
    volMult: 1.4, cashRet: 0.05,
    duration: 10, // anni '70: ~1973-1982
  },
  recession: {
    label: 'Recessione / Crisi',
    emoji: '📉',
    desc: 'Contrazione economica severa (tipo 2008-2009 o 2001). Azioni -30/-50%, obbligazioni governative salgono (flight to quality), oro positivo. Inflazione bassa o negativa. Test per la tenuta dei portafogli.',
    color: '#d93025',
    bg: 'rgba(217,48,37,.08)',
    border: 'rgba(217,48,37,.4)',
    eqMult: 0.3, obMult: 1.4, goldMult: 1.3,
    inflMean: 0.5, inflSigma: 1.0,
    volMult: 2.0, cashRet: 0.015,
    duration: 3, // recessione tipica: 2-3 anni
  },
  deflation: {
    label: 'Deflazione / Japanification',
    emoji: '🧊',
    desc: 'Inflazione negativa, tassi zero o negativi, crescita stagnante. Scenario Giappone 1990-2020. Le obbligazioni sono le star, le azioni vanno laterali per decenni, l\'oro è inerte, la liquidità perde valore in termini reali.',
    color: '#0097a7',
    bg: 'rgba(0,151,167,.08)',
    border: 'rgba(0,151,167,.4)',
    eqMult: 0.5, obMult: 1.2, goldMult: 0.5,
    inflMean: -0.5, inflSigma: 0.8,
    volMult: 1.1, cashRet: 0.005,
    duration: 20, // Giappone: decenni
  },
  bull_market: {
    label: 'Bull Market Prolungato',
    emoji: '🚀',
    desc: 'Forte crescita azionaria sostenuta (tipo 1982-1999 o 2009-2021). Azioni +12-15%/a, obbligazioni stabili, oro piatto. Il sogno di ogni investitore azionario.',
    color: '#9334e6',
    bg: 'rgba(147,52,230,.08)',
    border: 'rgba(147,52,230,.4)',
    eqMult: 1.5, obMult: 0.9, goldMult: 0.6,
    inflMean: 2.5, inflSigma: 0.7,
    volMult: 0.8, cashRet: 0.03,
    duration: 12, // bull tipico: 10-15 anni
  },
  high_rates: {
    label: 'Rialzo Tassi',
    emoji: '📊',
    desc: 'Banche centrali alzano i tassi rapidamente (tipo 2022-2023). Le obbligazioni a lungo termine crollano, le azioni growth soffrono, le obbligazioni brevi e la liquidità rendono di più. Il contesto peggiore per il 60/40 tradizionale.',
    color: '#00897b',
    bg: 'rgba(0,137,123,.08)',
    border: 'rgba(0,137,123,.4)',
    eqMult: 0.75, obMult: 0.4, goldMult: 0.8,
    inflMean: 4.5, inflSigma: 1.5,
    volMult: 1.3, cashRet: 0.04,
    duration: 4, // ciclo rialzo: 2-4 anni
  },
};

// Rendimento "normale" usato come baseline post-regime
const NORMAL_ECO = { eqMult: 1.0, obMult: 1.0, goldMult: 0.7, cashRet: 0.02, inflMean: 2.0, inflSigma: 0.8 };


const SEQ_RATES = { mild: -.20, moderate: -.35, severe: -.50 };
const RECOVERY_YEARS = 5;
const BOND_RALLY_RATE = .05;
// Frazione di recupero del gap durante la fase di recovery (0<f<1).
// Con f=1 il rimbalzo annullerebbe interamente il crollo (irrealistico: il
// catch-up moltiplicativo riportava il capitale sulla traiettoria base e per i
// crash severi addirittura la superava, cancellando il sequence-of-returns risk).
// Con f=0.6 il recupero del prezzo è parziale e lascia una "cicatrice" permanente
// differenziata per severità, coerente con l'evidenza empirica del rischio sequenza.
const RECOVERY_CATCHUP = 0.6;

// ══════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════
let state = {
  w: 0, pac: 0, age: 0, years: 35, opt: 450000,
  ter: .20, taxEq: 26.0, taxOb: 12.5, inflBottom: 2.0, inflVol: 1.0,
  portfolio: 'eq60',
  seq: { on: false, severity: 'moderate', timing: 'early', mode: 'single', dynCorr: false },
  pics: [], exps: [], pacChanges: [],
  allRows: false, showLiq: false, showVolBands: false,
  activeEcoScenario: 'normal_growth',
  ecoTiming: 'early',
  customPortfolio: {
    slots: [
      { ac: 'eq_sviluppati', pct: 60 },
      { ac: 'ob_glob_agg',   pct: 40 },
    ]
  },
  fxHedge: false,        // se true, copertura cambio attiva (costo ~0.3%/a)
  fxVol: 0.085,          // volatilità storica EUR/USD ~8.5%/a (1999-2024)
  fxHedgeCost: 0.003,    // costo annuo della copertura valutaria ~0.3%
  capeAdj: true,         // se true: baseline + scostamento da CAPE/yield live (metodo delta coerente)
};
let stateB = { portfolio: 'eq50', ter: .20, pac: -1 };
let decState = { portfolio: 'eq60', strategy: 'inflation', startPortfolio: 500000, withdrawal: 20000, years: 30, inflation: 2.0, ter: .20, ecoScenario: null, ecoTiming: 'early', seq: { on: false, severity: 'moderate', timing: 'early', mode: 'single' } };
let mcState = { withdrawal: 24000, years: 25, inflation: 2.0 };
let lastMCSuccessResult = null;
let picId = 0, expId = 0, pacChgId = 0;

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
function fmt(v) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  const a = Math.abs(v), s = v < 0 ? '−' : '';
  if (a >= 1e6) return s + '€' + (a / 1e6).toFixed(2) + 'M';
  if (a >= 1e3) return s + '€' + Math.round(a / 1e3) + 'k';
  return s + '€' + Math.round(a);
}
function fmtFull(v) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return (v < 0 ? '−' : '') + '€' + Math.round(Math.abs(v)).toLocaleString('it-IT');
}
function fmtN(v) { return Math.round(v).toLocaleString('it-IT'); }
function pct(v, dec = 1) { return (v * 100).toFixed(dec) + '%'; }

function getLCWeight(age) { return Math.max(.20, Math.min(.80, .80 - Math.max(0, (age - 20)) / 50 * .60)); }

function getEquityWeight(port, age) {
  if (port === 'lifecycle') return getLCWeight(age);
  if (port === 'custom') return calcCustomParams().eq;
  const m = { ob100: 0, eq100: 1, eq80: .8, eq60: .6, eq50: .5, eq40: .4, eq20: .2, golden_butterfly: .4, permanent: .25, all_seasons: .30, larry: .30, global_market: .55, ec_us_9060: .90, ec_glob_9060: .90, return_stack: .45 };
  return m[port] ?? 0.6;
}

function getGoldWeight(port) {
  if (port === 'custom') return calcCustomParams().goldW;
  const m = { golden_butterfly: .2, permanent: .25, all_seasons: .15 };
  return m[port] ?? 0;
}

function getCashWeight(port) {
  if (port === 'custom') return calcCustomParams().cashW;
  const m = { permanent: .25 };
  return m[port] ?? 0;
}

// ── Beta di crash per categoria di asset (sequence risk) ──────────────────────
// Quanto ciascuna categoria si muove durante un crash AZIONARIO severo, espresso
// come frazione del crollo azionario (1.0 = crolla come le azioni; 0 = neutro;
// valori negativi = guadagna). Calibrati sull'evidenza dei crash storici reali
// e tarati come impatto NETTO (gli asset alternativi recuperano meno dell'equity,
// che beneficia del catch-up post-crash; quindi beta moderati evitano di renderli
// paradossalmente peggiori delle azioni stesse):
//   • equity      1.00  → subisce il crollo pieno (con recupero parziale successivo)
//   • commodity   0.35  → nei crash di liquidità (2008, mar-2020) le materie prime
//                          calano con le azioni (de-leveraging, calo domanda), ma
//                          meno in profondità e con dinamica diversa. NON un rifugio.
//   • carry       0.45  → le strategie di carry soffrono nelle crisi ("pennies in
//                          front of a steamroller"): downside reale ma inferiore
//                          all'azionario puro.
//   • trend (MF)  -0.20 → "crisis alpha": il trend following tende a guadagnare
//                          nei crash prolungati (2008, 2022). Beta negativo prudente.
//   • gold/bond/cash → ricevono BOND_RALLY_RATE (fuga verso la sicurezza).
// Beta deliberatamente prudenti: migliorano il realismo (commodity e carry NON
// sono più trattati come rifugi) senza sovrastimare il danno né creare fragilità.
const CRASH_BETA = { commodity: 0.35, carry: 0.45, trend: -0.20 };

// IRR money-weighted del piano di accumulo fino all'anno targetIdx.
// data = array di project() con {invested, value}. Flussi: t=0 capitale iniziale,
// ogni anno il contributo PAC di quell'anno, alla fine il valore del portafoglio.
// Più corretto del CAGR semplice (valore/iniziale)^(1/anni), che ignora i PAC e
// quindi sovrastima il rendimento attribuendo alla crescita anche i versamenti.
function planIRR(data, targetIdx) {
  if (!data || targetIdx <= 0) return 0;
  const w0 = data[0].invested || 0;
  const contrib = [];
  for (let y = 1; y <= targetIdx; y++) {
    contrib.push(Math.max(0, (data[y].invested || 0) - (data[y - 1].invested || 0)));
  }
  const finalValue = data[targetIdx].value || 0;
  if (w0 <= 0 && contrib.every(c => c === 0)) return 0;
  const npv = (r) => {
    let v = -w0;
    for (let y = 1; y <= targetIdx; y++) v += (-contrib[y - 1]) / Math.pow(1 + r, y);
    v += finalValue / Math.pow(1 + r, targetIdx);
    return v;
  };
  let lo = -0.9, hi = 1.0;
  if (npv(lo) * npv(hi) >= 0) {
    const totInv = w0 + contrib.reduce((s, c) => s + c, 0);
    return totInv > 0 && finalValue > 0 ? Math.pow(finalValue / totInv, 1 / targetIdx) - 1 : 0;
  }
  for (let it = 0; it < 200; it++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) > 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// Restituisce i pesi per categoria di sensibilità al crash di un portafoglio.
// { eq, trendW, carryW, commodW, defensive } dove defensive = bond+gold+cash
// (riceve il bond rally). La somma è 1.
function getCrashWeights(port, age) {
  let eq, trendW = 0, carryW = 0, commodW = 0, goldW = 0, cashW = 0;
  if (port === 'custom') {
    const cp = calcCustomParams();
    eq = cp.eq; trendW = cp.trendW || 0; carryW = cp.carryW || 0;
    commodW = cp.commodW || 0; goldW = cp.goldW || 0; cashW = cp.cashW || 0;
  } else {
    eq = getEquityWeight(port, age);
    goldW = getGoldWeight(port);
    cashW = getCashWeight(port);
    // return_stack ha una quota trend (managed futures) esplicita
    trendW = PORT[port]?.trend || 0;
  }
  const defensive = Math.max(0, 1 - eq - trendW - carryW - commodW - goldW - cashW) + goldW + cashW;
  return { eq, trendW, carryW, commodW, defensive };
}

// ── Calcola parametri blended del portafoglio custom ──────────
function calcCustomParams() {
  // ── 1. Filtra slot validi e normalizza i pesi ─────────────────
  const slots = (state.customPortfolio?.slots || []).filter(s => s.ac && ASSET_CLASSES[s.ac] && s.pct > 0);
  const total = slots.reduce((s, sl) => s + sl.pct, 0) || 1;

  // ── 2. Rendimento atteso ponderato e beta inflazione ──────────
  let mu = 0, inflBeta = 0, eqW = 0, obW = 0, goldW = 0, cashW = 0, terW = 0, fxExpW = 0, otherFullW = 0;
  // Pesi per categoria di sensibilità al crash (sequence risk). Sottoinsiemi di
  // otherFullW: servono SOLO per modellare il comportamento in crisi (crash beta),
  // non alterano la classificazione fiscale (otherFullW resta invariato).
  let trendW = 0, carryW = 0, commodW = 0;
  for (const sl of slots) {
    const ac = ASSET_CLASSES[sl.ac];
    if (!ac) continue;
    const w = sl.pct / total;
    mu       += w * ac.mu;
    inflBeta += w * ac.inflBeta;
    terW     += w * (ac.ter ?? 0.20);  // TER pesato (ipotesi ETF tipici retail)
    fxExpW   += w * (ac.fxExp ?? 0);    // esposizione FX pesata (% non-EUR)
    if (ac.isEq)        eqW   += w;
    else if (ac.isGold) goldW += w;
    else if (ac.isCash) cashW += w;
    else if (ac.cat === 'ob_usa' || ac.cat === 'ob_eu' || ac.cat === 'ob_glob') obW += w; // obblig. governative → 12,5%
    else                otherFullW += w;          // trend/carry/commodities/reit/factor → 26% (redditi diversi)
    // Categorizzazione per crash beta (non altera eqW/obW/otherFullW)
    if (ac.cat === 'trend')      trendW  += w;
    else if (ac.cat === 'carry') carryW  += w;
    else if (ac.cat === 'real' && !ac.isGold) commodW += w; // commodities (oro escluso)
  }
  const obW2 = Math.max(0, obW || (1 - eqW - goldW - cashW - otherFullW));

  // ── 3. Volatilità con matrice di correlazione semplificata ────
  // σ²_p = Σᵢ Σⱼ wᵢ wⱼ σᵢ σⱼ ρᵢⱼ
  // Calcoliamo DUE versioni:
  //   sigma       = volatilità in regime normale (correlaz. storiche medie)
  //   sigmaStress = volatilità in regime di crisi (correlaz. ↑ verso 1)
  // Quest'ultima dà una stima realistica della tail risk: in crisi
  // la diversificazione si riduce drasticamente.
  let variance = 0, varianceStress = 0;
  for (let i = 0; i < slots.length; i++) {
    const si = slots[i];
    const ai = ASSET_CLASSES[si.ac];
    if (!ai) continue;
    const wi = si.pct / total;
    for (let j = 0; j < slots.length; j++) {
      const sj = slots[j];
      const aj = ASSET_CLASSES[sj.ac];
      if (!aj) continue;
      const wj = sj.pct / total;
      let rho, rhoS;
      if (i === j) {
        rho = 1.0; rhoS = 1.0;
      } else if (si.ac === sj.ac) {
        rho = 1.0; rhoS = 1.0;
      } else {
        rho  = CORR_PAIR       (AC_CAT(si.ac), AC_CAT(sj.ac));
        rhoS = CORR_PAIR_STRESS(AC_CAT(si.ac), AC_CAT(sj.ac));
      }
      variance       += wi * wj * ai.vol * aj.vol * rho;
      varianceStress += wi * wj * ai.vol * aj.vol * rhoS;
    }
  }
  const sigma       = Math.sqrt(Math.max(0, variance));
  const sigmaStress = Math.sqrt(Math.max(0, varianceStress));

  // ── 4 → 5. Effetto cambio EUR/USD (e altre non-EUR) ─────────────
  // best/worst calcolati DOPO la correzione FX su muNet e sigmaFx.
  // Le variabili intermedie pre-FX erano inutilizzate — rimosse per chiarezza.
  // Convenzione PORT: best = muNet + 0.20·σFx, worst = muNet − 0.38·σFx.
  // Se hedged: costo annuo = fxExpW * fxHedgeCost (sottratto da mu)
  // Se unhedged: aggiungi varianza FX (fxExpW * fxVol)² alla varianza portafoglio
  // Modello: ρ(equity, EUR/USD) ≈ 0 nel lungo periodo → varianze si sommano
  const fxHedged = !!state.fxHedge;
  const fxCost = fxHedged ? fxExpW * state.fxHedgeCost : 0;
  const muNet = mu - fxCost;
  const fxAddVar = fxHedged ? 0 : Math.pow(fxExpW * state.fxVol, 2);
  const sigmaFx = Math.sqrt(sigma*sigma + fxAddVar);
  const sigmaStressFx = Math.sqrt(sigmaStress*sigmaStress + fxAddVar * 1.5); // FX vol +50% in crisi
  // Ricalcola best/worst usando muNet e sigmaFx
  const bestFx = Math.min(muNet + 0.20 * sigmaFx, 0.20);
  const worstFx = Math.max(muNet - 0.38 * sigmaFx, -0.08);

  return {
    label: '🔧 Custom',
    desc:  'Portafoglio personalizzato.',
    normal: muNet, best: bestFx, worst: worstFx,
    vol:  sigmaFx,
    volStress: sigmaStressFx,      // vol in regime di crisi (FX vol amplificata)
    volNoFx: sigma,                // vol senza componente FX (riferimento)
    eq:   eqW, ob: obW2, gold: goldW, cash: cashW,
    goldW, cashW, otherFullW,
    trendW, carryW, commodW,        // pesi per categoria (modellazione crash/sequence risk)
    realRet:  Math.max(0, muNet - 0.021),
    inflBeta,
    ter:  terW,                    // TER pesato suggerito (ETF tipici)
    fxExposure: fxExpW,            // % esposizione valuta non-EUR
    fxHedged,                      // stato hedging attivo
    fxCost,                        // costo annuo hedging (se attivo)
    fxAddVol: Math.sqrt(fxAddVar), // vol aggiuntiva da FX (se non hedged)
  };
}

function getRate(key, scenario, year, startAge) {
  // ── Helpers FX comuni a tutti i branch ──────────────────────
  // Applica la correzione FX (hedging/unhedging) al rendimento/vol di portafoglio
  // coerentemente con calcCustomParams() per garantire che il toggle FX
  // abbia effetto su tutti i tipi di portafoglio, non solo su 'custom'.
  const _applyFx = (muBase, volBase, fxExp) => {
    const fxHedged = !!state.fxHedge;
    const fxCost   = fxHedged ? fxExp * state.fxHedgeCost : 0;
    const muNet    = muBase - fxCost;
    const fxAddVar = fxHedged ? 0 : Math.pow(fxExp * state.fxVol, 2);
    const sigmaFx  = Math.sqrt(volBase * volBase + fxAddVar);
    if (scenario === 'normal') return muNet;
    if (scenario === 'best')   return Math.min(muNet + 0.20 * sigmaFx, 0.20);
    /* worst */                 return Math.max(muNet - 0.38 * sigmaFx, -0.08);
  };

  if (key === 'lifecycle') {
    const age = startAge + year;
    const eq = getLCWeight(age);
    // Rendimenti calibrati coerentemente con i portafogli statici:
    // best ≈ +0.20σ sopra normal, worst ≈ −0.38σ sotto normal
    // σ lifecycle @ age: 0.16*eq + 0.03*(1-eq)
    const vol = 0.16 * eq + 0.03 * (1 - eq);
    const muEq = 0.07, muOb = 0.03;
    const normalR = eq * muEq + (1 - eq) * muOb;
    // fxExp lifecycle varia con l'età (come il peso azionario)
    const fxExpLC = eq * 0.85; // ~85% delle azioni è non-EUR; ob/cash ≈ 0
    return _applyFx(normalR, vol, fxExpLC);
  }

  if (key === 'custom') { const cp = calcCustomParams(); return cp[scenario] ?? cp.normal; }

  const p = PORT[key];
  if (!p) return 0.055;

  // Portafogli predefiniti: applica correzione FX usando fxExp del portafoglio
  const fxExp  = p.fxExp ?? 0;
  const muBase = p.normal ?? 0.055;
  const volBase = p.vol   ?? 0.10;
  return _applyFx(muBase, volBase, fxExp);
}

// Rendimento portafoglio nello scenario economico — applica i moltiplicatori
// del regime SOLO per gli anni di durata storica dello scenario; oltre quella
// soglia ritorna al baseline "Crescita Normale", indipendentemente dalla
// durata totale dell'investimento dell'utente.
//
// COERENZA CON getRate(): in regime "normale" (eco === NORMAL_ECO, tutti i
// moltiplicatori = 1) il risultato coincide ESATTAMENTE con getRate() per
// qualsiasi portafoglio, inclusi golden_butterfly, permanent, all_seasons,
// larry e i portafogli a leva (ec_us_9060, ec_glob_9060, return_stack).
// Metodo: si parte da muNormal (fonte di verita calibrata), si calcola il
// delta di regime come scostamento relativo ponderato sui pesi normalizzati,
// e si aggiunge il delta. In regime normale delta=0 quindi identico a getRate().
function getRateEco(portKey, ecoKey, year, startAge, ecoWin) {
  const ecoSel = ECO_SCENARIOS[ecoKey];
  const p = portKey === 'custom' ? calcCustomParams() : PORT[portKey];
  if (!p || !ecoSel) return 0.05;
  // Rispetta la finestra temporale (early/mid/late) se fornita, altrimenti usa la durata
  const inRegime = ecoWin
    ? (year >= ecoWin.s && year <= ecoWin.e)
    : (year <= (ecoSel.duration ?? 99));
  const eco = inRegime ? ecoSel : NORMAL_ECO;

  // FX cost coerente con getRate()
  const fxExpPort = portKey === 'custom'
    ? (p.fxExposure ?? p.fxExp ?? 0)
    : (PORT[portKey]?.fxExp ?? 0);
  const fxCostEco = (!!state.fxHedge && fxExpPort > 0) ? fxExpPort * state.fxHedgeCost : 0;

  // Lifecycle: stessa logica di getRate()
  if (portKey === 'lifecycle') {
    const age = startAge + year;
    const eqW = getLCWeight(age);
    const obW = 1 - eqW;
    const muEq = 0.07, muOb = 0.03;
    const muNormalLC = eqW * muEq + obW * muOb;
    const wSum = eqW + obW || 1;
    const deltaEco = (eqW * muEq * (eco.eqMult - 1) + obW * muOb * (eco.obMult - 1)) / wSum;
    return muNormalLC + deltaEco - fxCostEco;
  }

  // Portafogli predefiniti e custom
  // muNormal e la fonte di verita: coincide con getRate() in regime normale.
  const muNormal = portKey === 'custom'
    ? (p.normal ?? p.normalR ?? 0.055)
    : (PORT[portKey]?.normal ?? 0.055);

  // Pesi nominali del portafoglio (possono sommare >1 per portafogli a leva)
  const eqW   = Math.max(0, p.eq   ?? getEquityWeight(portKey, startAge + year));
  const goldW = Math.max(0, p.gold ?? getGoldWeight(portKey));
  const cashW = Math.max(0, p.cash ?? getCashWeight(portKey));
  const obW   = Math.max(0, p.ob   ?? Math.max(0, 1 - eqW - goldW - cashW));
  // Trend following (return stacking): diversificatore. Reagisce ai regimi in
  // modo simile all'oro (crisis alpha nelle crisi prolungate); usa goldMult.
  const trendW = Math.max(0, p.trend ?? 0);
  // Normalizza i pesi a 1 per calcolare i contributi relativi al delta di regime.
  // Per portafogli a leva (wSum > 1) questo rispecchia la sensibilita relativa
  // di ciascuna asset class al ciclo economico, senza amplificare il delta.
  const wSum = eqW + obW + goldW + cashW + trendW || 1;

  // Rendimenti "anchor" per il calcolo del delta: valori medi coerenti con
  // i portafogli semplici (eq100 -> 7%, ob100 -> 3%, gold puro -> 4%).
  const anchorEq = 0.07, anchorOb = 0.03, anchorGold = 0.04, anchorCash = 0.025, anchorTrend = 0.05;
  const nrm = NORMAL_ECO;
  const deltaEco = (
      eqW    * anchorEq    * (eco.eqMult   - nrm.eqMult)
    + obW    * anchorOb    * (eco.obMult   - nrm.obMult)
    + goldW  * anchorGold  * (eco.goldMult - nrm.goldMult)
    + trendW * anchorTrend * (eco.goldMult - nrm.goldMult)
    + cashW  * ((eco.cashRet ?? nrm.cashRet) - nrm.cashRet)
  ) / wSum;

  return muNormal + deltaEco - fxCostEco;
}

function getPortfolioVol(portKey, age) {
  // Aggiunge componente volatilità FX quando non hedged,
  // coerente con getRate() e calcCustomParams().
  const _addFxVol = (baseVol, fxExp) => {
    if (!!state.fxHedge || fxExp <= 0) return baseVol;
    const fxAddVar = Math.pow(fxExp * state.fxVol, 2);
    return Math.sqrt(baseVol * baseVol + fxAddVar);
  };
  if (portKey === 'lifecycle') {
    const eq = getLCWeight(age);
    const baseVol = 0.16 * eq + 0.03 * (1 - eq);
    return _addFxVol(baseVol, eq * 0.85);
  }
  if (portKey === 'custom') return calcCustomParams().vol; // già include FX vol
  const p = PORT[portKey];
  return _addFxVol(p?.vol ?? 0.10, p?.fxExp ?? 0);
}

function getCrashYear(timing, years) {
  if (timing === 'early') return Math.max(1, Math.min(3, years));
  if (timing === 'mid') return Math.max(1, Math.round(years / 2));
  return Math.max(1, Math.round(years * .80));
}

function randn_bm() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function getPacForYear(year) {
  let p = state.pac;
  const sorted = [...state.pacChanges].sort((a, b) => +a.year - +b.year);
  for (const ch of sorted) {
    if (+ch.year <= year) p = +ch.amount;
    else break;
  }
  return p;
}

function hasAnyActivePac() {
  if (state.pac > 0) {
    const s = [...state.pacChanges].sort((a, b) => +a.year - +b.year);
    if (!s.length) return true;
    if (s[0].year > 1) return true;
    return s.some(c => +c.amount > 0);
  }
  return state.pacChanges.some(c => +c.amount > 0);
}

function blendedTaxRate(age) {
  // Clamp equity a [0,1] per il calcolo dell'aliquota blended
  // (la leva implicita nei portafogli efficient core non aumenta l'aliquota fiscale)
  if (state.portfolio === 'custom') {
    const cp = calcCustomParams();
    const eqW    = Math.max(0, Math.min(1, cp.eq   ?? 0));
    const obW    = Math.max(0, cp.ob    ?? 0);
    const goldW  = Math.max(0, cp.goldW ?? 0);
    const cashW  = Math.max(0, cp.cashW ?? 0);
    const otherW = Math.max(0, cp.otherFullW ?? 0);  // trend/carry/commodities/reit/factor
    // Oro, liquidità, trend following, commodities, REIT, fattori → aliquota piena (taxEq, 26%)
    // Solo la quota obbligazionaria gode dell'aliquota ridotta (taxOb, 12.5% per gov IT/EU)
    // Normalizza per evitare somme > 1 (es. portafogli con leva implicita)
    const total = eqW + obW + goldW + cashW + otherW || 1;
    return (
      (eqW    / total) * state.taxEq / 100 +
      (obW    / total) * state.taxOb / 100 +
      (goldW  / total) * state.taxEq / 100 +
      (cashW  / total) * state.taxEq / 100 +
      (otherW / total) * state.taxEq / 100
    );
  }
  const rawEq = getEquityWeight(state.portfolio, age);
  const eq = Math.max(0, Math.min(1, rawEq));
  // Trend following (es. return stacking): redditi diversi → aliquota piena (taxEq).
  // Lo scorporo dal residuo obbligazionario evita di tassarlo erroneamente al 12.5%.
  const pMeta = PORT[state.portfolio];
  const trendW = pMeta?.trend ?? 0;
  if (trendW > 0) {
    const obMetaW = Math.max(0, pMeta.ob ?? 0);
    const tot = eq + obMetaW + trendW || 1;
    return (eq / tot) * state.taxEq / 100
         + (obMetaW / tot) * state.taxOb / 100
         + (trendW / tot) * state.taxEq / 100;
  }
  // Composizione completa: oro (ETC) e liquidità sono tassati al 26% (taxEq) in Italia,
  // come le azioni. Solo la quota obbligazionaria (gov IT/EU) gode del 12.5% (taxOb).
  // Allinea i preset con oro/cash (GB, Permanent, All Seasons) al ramo custom.
  const goldW = Math.max(0, getGoldWeight(state.portfolio));
  const cashW = Math.max(0, getCashWeight(state.portfolio));
  const obW   = Math.max(0, 1 - eq - goldW - cashW);   // residuo = obbligazionario
  const total = eq + goldW + cashW + obW || 1;
  return (
    (eq    / total) * state.taxEq / 100 +
    (goldW / total) * state.taxEq / 100 +
    (cashW / total) * state.taxEq / 100 +
    (obW   / total) * state.taxOb / 100
  );
}

function calcNetNom(g, inv, tx) {
  const gain = Math.max(0, g - inv);
  return g - gain * tx;
}

// ══════════════════════════════════════════════════════════════
// PROJECTION — scenario deterministico
// ══════════════════════════════════════════════════════════════
function getCrashYears(mode, timing, years) {
  // Returns array of crash years for multi-crash modes.
  // Vincoli: gap minimo cy2-cy1 ≥ 7 anni; gap minimo cy3-cy2 ≥ 6 anni.
  // Con timing='late' i vincoli prevalgono sul timing tardivo, anticipando
  // i crash precedenti per rispettare le distanze minime.
  // Tutti i risultati passano da _sanitizeCrashYears, che garantisce anni
  // distinti, crescenti e dentro [1, years-1] anche su orizzonti brevi in cui
  // i gap minimi non sono soddisfacibili (es. 3 crash su < 13 anni).
  const cy1Raw = getCrashYear(timing, years);
  if (mode === 'single' || !mode) return _sanitizeCrashYears([cy1Raw], years);

  if (mode === 'double') {
    // Vogliamo cy1 < cy2, cy2 ≤ years-2, gap ≥ 8
    // Se timing='late', anticipiamo cy1 per fare spazio a cy2
    let cy2 = Math.min(years - 2, Math.max(cy1Raw + 8, Math.round(years * 0.62)));
    let cy1 = Math.max(1, Math.min(cy1Raw, cy2 - 8));
    return _sanitizeCrashYears([cy1, cy2], years);
  }

  if (mode === 'triple') {
    // Vogliamo cy3 ≤ years-1, gap cy3-cy2 ≥ 6, gap cy2-cy1 ≥ 7
    // Strategia: posiziona cy3 vicino a 'timing', poi cy2 e cy1 a ritroso
    let cy3 = Math.min(years - 1, Math.max(cy1Raw, Math.round(years * 0.82)));
    let cy2 = Math.max(1, cy3 - 6);
    let cy1 = Math.max(1, cy2 - 7);
    // Se timing è 'early', spingiamo tutto in avanti il meno possibile
    if (timing === 'early') {
      cy1 = Math.max(1, Math.min(3, years));
      cy2 = Math.min(years - 7, cy1 + 7);
      cy3 = Math.min(years - 1, cy2 + 6);
    } else if (timing === 'mid') {
      cy1 = Math.max(1, Math.round(years * 0.30));
      cy2 = Math.max(cy1 + 7, Math.round(years * 0.55));
      cy3 = Math.min(years - 1, Math.max(cy2 + 6, Math.round(years * 0.82)));
    }
    return _sanitizeCrashYears([cy1, cy2, cy3], years);
  }
  return _sanitizeCrashYears([cy1Raw], years);
}

// Garantisce che gli anni di crash siano: dentro [1, years-1], interi, distinti
// e in ordine crescente. Se i valori grezzi si accavallano o escono dall'intervallo
// (tipico con 3 crash su orizzonti brevi, dove i gap minimi non sono soddisfacibili),
// ridistribuisce gli anni il piu uniformemente possibile preservando l'ordine.
function _sanitizeCrashYears(arr, years) {
  const maxY = Math.max(1, years - 1);
  // Se non c'e spazio fisico per N anni distinti in [1, maxY], riduci il numero
  // di crash al massimo rappresentabile (caso degenere: orizzonti molto brevi).
  let n = Math.min(arr.length, maxY);
  let src = arr.slice(0, n);
  // 1) clamp + arrotonda + ordina
  let ys = src.map(v => Math.max(1, Math.min(maxY, Math.round(v)))).sort((a, b) => a - b);
  // 2) forza distinti e crescenti spingendo in avanti
  for (let i = 1; i < n; i++) if (ys[i] <= ys[i - 1]) ys[i] = ys[i - 1] + 1;
  // 3) se l'ultimo sfora, comprimi all'indietro mantenendo distinti
  if (ys[n - 1] > maxY) {
    ys[n - 1] = maxY;
    for (let i = n - 2; i >= 0; i--) if (ys[i] >= ys[i + 1]) ys[i] = ys[i + 1] - 1;
  }
  // 4) se non c'e abbastanza spazio per n anni distinti (es. n>maxY), distribuisci uniformemente
  if (ys[0] < 1) {
    ys = [];
    for (let i = 0; i < n; i++) ys.push(Math.max(1, Math.min(maxY, 1 + Math.round(i * (maxY - 1) / Math.max(1, n - 1)))));
    for (let i = 1; i < n; i++) if (ys[i] <= ys[i - 1]) ys[i] = ys[i - 1] + 1;
  }
  return ys;
}

// Volatilità "dynCorr" portafoglio — usa correlazioni stress in crisi
function getPortfolioVolDynamic(portKey, age, isStress) {
  if (portKey !== 'custom') return getPortfolioVol(portKey, age);
  if (!isStress) return calcCustomParams().vol;
  // Ricalcola vol con matrice stress
  const slots = (state.customPortfolio?.slots || []).filter(s => s.ac && ASSET_CLASSES[s.ac] && s.pct > 0);
  const total = slots.reduce((s, sl) => s + sl.pct, 0) || 1;
  let variance = 0;
  for (let i = 0; i < slots.length; i++) {
    const si = slots[i]; const ai = ASSET_CLASSES[si.ac]; if (!ai) continue;
    const wi = si.pct / total;
    for (let j = 0; j < slots.length; j++) {
      const sj = slots[j]; const aj = ASSET_CLASSES[sj.ac]; if (!aj) continue;
      const wj = sj.pct / total;
      const rho = (i === j || si.ac === sj.ac) ? 1.0 : CORR_PAIR_STRESS(AC_CAT(si.ac), AC_CAT(sj.ac));
      variance += wi * wj * ai.vol * aj.vol * rho;
    }
  }
  return Math.sqrt(Math.max(0, variance));
}

function project(scenario, withSeq, terOverride = null, portOverride = null) {
  const { w, age, years, portfolio, pics, exps, seq } = state;
  const portKey = portOverride ?? portfolio;
  const terRate = (terOverride !== null ? terOverride : state.ter) / 100;
  const mode = seq.mode || 'single';
  const crashYears = withSeq && seq.on ? getCrashYears(mode, seq.timing, years) : [];
  const crashYear = crashYears[0] ?? -1; // primary crash (for legend/annotation)
  const eqCR = SEQ_RATES[seq.severity] ?? -0.35;

  // Build crash map: year → crash rate (subsequent crashes use reduced severity)
  const crashMap = {};
  crashYears.forEach((cy, idx) => {
    const severityFactor = idx === 0 ? 1.0 : idx === 1 ? 0.65 : 0.45; // diminishing severity
    const hasCrash = getCrashYear(seq.timing, years) >= 0;
    const acw = hasCrash ? getEquityWeight(portKey, age + cy) : 0;
    // Crash rate per categoria: equity crollo pieno; commodity/carry partecipano
    // (beta>0); trend fa crisis alpha (beta<0); difensivo (bond/gold/cash) → rally.
    let crRate;
    if (hasCrash) {
      const cw = getCrashWeights(portKey, age + cy);
      const sev = eqCR * severityFactor;
      crRate =
          sev * cw.eq
        + sev * CRASH_BETA.commodity * cw.commodW
        + sev * CRASH_BETA.carry     * cw.carryW
        + sev * CRASH_BETA.trend     * cw.trendW
        + BOND_RALLY_RATE            * cw.defensive;
    } else {
      crRate = 0;
    }
    const cuf = acw > 0 ? Math.pow(Math.pow(1 / (1 + eqCR * severityFactor), 1 / RECOVERY_YEARS), RECOVERY_CATCHUP) : 1;
    crashMap[cy] = { rate: crRate, cuf, acw, severityFactor };
  });

  let w2 = w, inv = w;
  const data = [{ year: 0, age, value: w2, invested: inv, returns: 0, annRetNet: 0, annPac: state.pac * 12, event: '' }];
  
  for (let y = 1; y <= years; y++) {
    const annPac = getPacForYear(y) * 12;
    const pic = pics.filter(p => +p.year === y).reduce((s, p) => s + (+p.amount || 0), 0);
    const exp = exps.filter(e => +e.year === y).reduce((s, e) => s + (+e.amount || 0), 0);
    const eqW = getEquityWeight(portKey, age + y);
    // FIX #M2: usa blendedTaxRate() per calcolare annRetNet correttamente anche per
    // portafogli custom con oro/cash (che altrimenti otterrebbero taxOb=12.5% invece di taxEq=26%)
    const txRate = blendedTaxRate(age + y);
    let r, isRebound = false;

    // Check if this year is a crash year
    const crashInfo = crashMap[y];
    // Check if this year is in recovery from any crash
    const inRecovery = crashYears.find(cy => y > cy && y <= cy + RECOVERY_YEARS && crashMap[cy]?.acw > 0);

    if (crashInfo) {
      // Apply dynamic correlation penalty if enabled: vol increases in crisi
      const dynPenalty = seq.dynCorr ? 0.03 * crashInfo.severityFactor : 0; // extra drag from corr breakdown
      r = crashInfo.rate - dynPenalty;
    } else if (inRecovery) {
      const cy = inRecovery;
      const baseR = getRate(portKey, scenario, y, age);
      const rebEqR = (1 + baseR) * crashMap[cy].cuf - 1;
      const cEqW = getEquityWeight(portKey, age + y);
      const rebObR = scenario === 'best' ? .04 : scenario === 'normal' ? .03 : .01;
      r = rebEqR * cEqW + rebObR * (1 - cEqW);
      isRebound = true;
    } else {
      r = getRate(portKey, scenario, y, age);
    }
    r -= terRate;
    const midW = w2 + (annPac + pic - exp) / 2;
    const aRG = midW * r;
    w2 = Math.max(0, w2 + annPac + pic - exp + aRG);   // il capitale non può andare sotto zero: un'uscita superiore al montante lo azzera
    inv += annPac + pic;
    const aRN = aRG > 0 ? aRG * (1 - txRate) : aRG;
    const evts = [];
    const pAP = y === 1 ? state.pac * 12 : getPacForYear(y - 1) * 12;
    if (annPac !== pAP) { if (annPac === 0) evts.push('⏸ PAC sospeso'); else if (annPac < pAP) evts.push(`↓ PAC: €${fmtN(annPac / 12)}/m`); else evts.push(`↑ PAC: €${fmtN(annPac / 12)}/m`); }
    if (crashInfo && withSeq && seq.on) evts.push(crashInfo.rate < 0 ? `⚡ Crash#${crashYears.indexOf(y)+1} (${(crashInfo.rate * 100).toFixed(1)}%)` : `🛡️ FtQ (+${(crashInfo.rate * 100).toFixed(1)}%)`);
    else if (isRebound) evts.push('📈 Rally');
    if (pic > 0) evts.push('▲ PIC ' + fmt(pic));
    if (exp > 0) evts.push('▼ ' + fmt(exp));
    data.push({ year: y, age: age + y, value: Math.round(w2), invested: Math.round(inv), returns: Math.round(w2 - inv), annRetNet: Math.round(aRN), annPac, event: evts.join(' · '), isCrash: !!crashInfo, isRebound });
  }
  return data;
}

// Calcola la finestra temporale [s, e] in cui il regime eco è attivo
function getEcoWindow(ecoKey, totalYears, timing) {
  const eco = ECO_SCENARIOS[ecoKey];
  if (!eco) return { s: 1, e: totalYears };
  const dur = Math.min(eco.duration ?? 99, totalYears);
  if (timing === 'early') return { s: 1, e: dur };
  if (timing === 'mid') {
    const s = Math.max(1, Math.round((totalYears - dur) / 2) + 1);
    return { s, e: Math.min(totalYears, s + dur - 1) };
  }
  // late
  return { s: Math.max(1, totalYears - dur + 1), e: totalYears };
}

// Proiezione in scenario economico — usa la media dell'inflazione del regime
// (deterministica) in modo che il grafico Scenari Economici sia stabile e
// riproducibile. Il rumore inflattivo è disponibile nel tab MC Avanzato.
function projectEco(ecoKey) {
  const { w, age, years, portfolio, pics, exps, ter } = state;
  const ecoSel = ECO_SCENARIOS[ecoKey];
  const terRate = ter / 100;
  const win = getEcoWindow(ecoKey, years, state.ecoTiming);
  let ww = w, inv = w;
  const startInflMean = ecoSel.inflMean / 100;
  const data = [{ year: 0, age, value: ww, invested: inv, inflYear: startInflMean * 100, real: ww, regime: ecoSel.label }];
  let cumInfl = 1;
  for (let y = 1; y <= years; y++) {
    const inRegime = y >= win.s && y <= win.e;
    const ecoY = inRegime ? ecoSel : NORMAL_ECO;
    // Inflazione deterministica (media del regime): grafico stabile
    const inflYear = ecoY.inflMean / 100;
    cumInfl *= (1 + inflYear);
    const annPac = getPacForYear(y) * 12;
    const pic = pics.filter(p => +p.year === y).reduce((s, p) => s + (+p.amount || 0), 0);
    const exp = exps.filter(e => +e.year === y).reduce((s, e) => s + (+e.amount || 0), 0);
    const r = getRateEco(portfolio, ecoKey, y, age, win) - terRate;
    const midW = ww + (annPac + pic - exp) / 2;
    ww += annPac + pic - exp + midW * r;
    inv += annPac + pic;
    data.push({ year: y, age: age + y, value: Math.round(ww), invested: Math.round(inv), inflYear: +(inflYear * 100).toFixed(2), real: Math.round(ww / cumInfl), regime: inRegime ? ecoSel.label : 'Crescita Normale' });
  }
  return data;
}

function projectWithOverrides(overrides, scenario) {
  const saved = {};
  for (const k of Object.keys(overrides)) { saved[k] = state[k]; state[k] = overrides[k]; }
  const data = project(scenario, false);
  for (const k of Object.keys(overrides)) state[k] = saved[k];
  return data;
}

// ══════════════════════════════════════════════════════════════
// MONTECARLO PRINCIPALE — Gaussiano standard
// Usa μ = rendimento atteso portafoglio · σ = volatilità storica
// (parametri da PORT[key] / getRate / getPortfolioVol).
// Coerente con le linee deterministiche Ott/Base/Pess del grafico:
// ~P80 ≈ scenario Ottimistico · ~P20 ≈ scenario Pessimistico.
// Il Block Bootstrap è disponibile nel tab "MC Avanzato" con tutti
// i modelli avanzati (t-Student, GARCH, Regime-Switching).
// ══════════════════════════════════════════════════════════════
function runMontecarlo() {
  const { w, age, years, portfolio, seq, pics, exps, ter } = state;
  const N = 1000, results = [], timeSeries = Array.from({ length: years + 1 }, () => []);
  const terRate = ter / 100;
  const mode = seq.mode || 'single';
  const crashYearsList = seq.on ? getCrashYears(mode, seq.timing, years) : [];
  const crashYear = crashYearsList[0] ?? -1; // primary for legacy compat
  const acw = crashYear > 0 ? getEquityWeight(portfolio, age + crashYear) : 0;
  const eqCR = SEQ_RATES[seq.severity] ?? -0.35;
  const acr = eqCR * acw + BOND_RALLY_RATE * (1 - acw);
  const cuf = acw > 0 ? Math.pow(Math.pow(1 / (1 + eqCR), 1 / RECOVERY_YEARS), RECOVERY_CATCHUP) : 1;
  
  // Build crash map for multi-crash
  const crashMap = {};
  crashYearsList.forEach((cy, idx) => {
    const sf = idx === 0 ? 1.0 : idx === 1 ? 0.65 : 0.45;
    const cw2 = getEquityWeight(portfolio, age + cy);
    // Crash rate per categoria (coerente con project)
    const cwCat = getCrashWeights(portfolio, age + cy);
    const sev2 = eqCR * sf;
    const cr2 =
        sev2 * cwCat.eq
      + sev2 * CRASH_BETA.commodity * cwCat.commodW
      + sev2 * CRASH_BETA.carry     * cwCat.carryW
      + sev2 * CRASH_BETA.trend     * cwCat.trendW
      + BOND_RALLY_RATE             * cwCat.defensive;
    const cuf2 = cw2 > 0 ? Math.pow(Math.pow(1 / (1 + eqCR * sf), 1 / RECOVERY_YEARS), RECOVERY_CATCHUP) : 1;
    crashMap[cy] = { rate: cr2, cuf: cuf2, acw: cw2, sf };
  });

  for (let i = 0; i < N; i++) {
    let cW = w;
    timeSeries[0].push(cW);
    for (let y = 1; y <= years; y++) {
      const annPac = getPacForYear(y) * 12;
      const pic = pics.filter(p => +p.year === y).reduce((s, p) => s + (+p.amount || 0), 0);
      const exp = exps.filter(e => +e.year === y).reduce((s, e) => s + (+e.amount || 0), 0);
      const curAge = age + y;
      let r;
      const crashInfo = crashMap[y];
      const inRecovery = crashYearsList.find(cy => y > cy && y <= cy + RECOVERY_YEARS && crashMap[cy]?.acw > 0);

      if (crashInfo) {
        // Crash year: apply dynamic corr penalty if enabled
        const dynPenalty = seq.dynCorr ? 0.025 * crashInfo.sf : 0;
        r = crashInfo.rate - dynPenalty;
      } else if (inRecovery) {
        const cy = inRecovery;
        // FIX #S1: usa getRate() per il rendimento corretto del portafoglio scelto
        // invece del 7% hardcoded — coerente con project() deterministico
        const baseR = getRate(portfolio, 'normal', y, age);
        const boR   = (1 + baseR) * crashMap[cy].cuf - 1;
        const cEqW  = getEquityWeight(portfolio, curAge);
        // Rendimento bond in recovery: derivato dal rendimento base del portafoglio.
        // FIX #MC1: clamp bidirezionale [-5%, +15%] per evitare valori anomali
        // quando cEqW → 0 (portafogli quasi-obbligazionari: divisione per valore piccolo)
        // o quando baseR è negativo in scenario pessimistico.
        // Se cEqW = 0 (ob100) → usa baseR direttamente come rebObR.
        const obBaseR = cEqW > 0.01
          ? Math.max(-0.05, Math.min(0.15, baseR * (1 - cEqW) / cEqW))
          : baseR;
        const rebObR  = obBaseR;
        r = boR * cEqW + rebObR * (1 - cEqW);
      } else {
        // Gaussiano log-normale corretto: per ottenere CAGR medio = μ_geometrico
        // occorre campionare dalla media ARITMETICA = μ + σ²/2 (correzione di Itō).
        // Senza correzione: E[CAGR] = μ − σ²/2, che abbassa il P50 sotto la linea Base.
        // Con correzione: E[CAGR] = (μ + σ²/2) − σ²/2 = μ → P50 ≈ linea Base. ✅
        const mu  = getRate(portfolio, 'normal', y, age);
        // Se dynCorr è attivo, usa volatilità stress in periodi vicini a crash
        const nearCrash = crashYearsList.some(cy => Math.abs(y - cy) <= 2);
        const volBase = getPortfolioVol(portfolio, curAge);
        const vol = (seq.on && seq.dynCorr && nearCrash) ? getPortfolioVolDynamic(portfolio, curAge, true) : volBase;
        const mu_arith = mu + 0.5 * vol * vol;   // correzione log-normale
        r = mu_arith + vol * randn_bm();
      }
      r -= terRate;
      const midW = cW + (annPac + pic - exp) / 2;
      cW += annPac + pic - exp + midW * r;
      timeSeries[y].push(Math.max(0, cW));
    }
    results.push(cW);
  }
  results.sort((a, b) => a - b);
  _saveMCResults(results); // salva per export Excel
  const pct_at = (arr, p) => { const sorted = [...arr].sort((a, b) => a - b); return sorted[Math.floor(sorted.length * p)] || 0; };
  const p10 = [], p25 = [], p50 = [], p75 = [], p90 = [], mean = [];
  for (let y = 0; y <= years; y++) {
    const ts = timeSeries[y];
    p10.push(pct_at(ts, .10));
    p25.push(pct_at(ts, .25));
    p50.push(pct_at(ts, .50));
    p75.push(pct_at(ts, .75));
    p90.push(pct_at(ts, .90));
    mean.push(ts.reduce((a, b) => a + b, 0) / ts.length);
  }

  document.getElementById('mcP10').innerText = fmt(results[Math.floor(N * .1)]);
  document.getElementById('mcP25').innerText = fmt(results[Math.floor(N * .25)]);
  document.getElementById('mcP50').innerText = fmt(results[Math.floor(N * .5)]);
  document.getElementById('mcP75').innerText = fmt(results[Math.floor(N * .75)]);
  document.getElementById('mcP90').innerText = fmt(results[Math.floor(N * .9)]);
  document.getElementById('mcMean').innerText = fmt(results.reduce((a, b) => a + b, 0) / N);

  const terStr = state.ter > 0 ? `, TER ${state.ter.toFixed(2)}%` : '';
  const dynCorrStr = seq.on && seq.dynCorr ? ' · <strong style="color:var(--red)">Correlazioni dinamiche attive</strong>' : '';
  const modeStr = seq.on && mode !== 'single' ? ` · ${mode === 'double' ? '2' : '3'} crash` : '';
  document.getElementById('mcDesc').innerHTML = `Monte Carlo 1.000 scenari — <strong>Gaussiano log-normale corretto</strong> (correzione Itō: μ<sub>arith</sub>=μ+σ²/2 → CAGR medio = μ target, P50 ≈ linea Base)${terStr}${modeStr}${dynCorrStr}. Per modelli avanzati (fat-tail, GARCH, Regime-Switching) usa il tab <em>MC Avanzato</em>. Lordi Nominali.`;

  return { p10, p25, p50, p75, p90, mean };
}

// ══════════════════════════════════════════════════════════════
// CROSSOVER
// ══════════════════════════════════════════════════════════════
function findCrossover(data) {
  if (!hasAnyActivePac()) return null;
  for (let i = 1; i < data.length; i++) {
    const ap = getPacForYear(i) * 12;
    if (ap === 0) continue;
    if (data[i].annRetNet >= ap) return data[i].age;
  }
  return null;
}

// ══════════════════════════════════════════════════════════════
// CHART MAIN
// ══════════════════════════════════════════════════════════════
let chart = null;

function buildChart(best, normal, worst, seqNorm, ages, opt, crashAge, crossAge, picY, expY, pacY, mcFan) {
  if (chart) { chart.destroy(); chart = null; }
  const ptPic = ages.map((_, i) => picY.includes(i) && i > 0 ? best[i] : null);
  const ptExp = ages.map((_, i) => expY.includes(i) && i > 0 ? normal[i] : null);
  const ptPac = ages.map((_, i) => pacY.includes(i) && i > 0 ? normal[i] : null);

  // Correct fan chart: build as separate array to know exact indices
  const baseDsCount = seqNorm ? 4 : 3; // Ott + Base + Pess [+ Seq]
  const fanBands = [];
  if (mcFan && state.showVolBands) {
    // ds indices after base lines:
    // b+0 = P10, b+1 = P25, b+2 = P50mc, b+3 = P75, b+4 = P90
    const b = baseDsCount;
    fanBands.push({ label:'P10',  data:mcFan.p10, borderColor:'rgba(26,115,232,.15)', borderWidth:1, pointRadius:0, fill:false, tension:.35 });
    fanBands.push({ label:'P25',  data:mcFan.p25, borderColor:'rgba(26,115,232,.25)', borderWidth:1, pointRadius:0, fill:{target:b,   above:'rgba(26,115,232,.07)', below:'transparent'}, tension:.35 });
    fanBands.push({ label:'P50mc',data:mcFan.p50, borderColor:'rgba(26,115,232,.45)', borderWidth:2, borderDash:[4,3], pointRadius:0, fill:{target:b+1, above:'rgba(26,115,232,.10)', below:'transparent'}, tension:.35 });
    fanBands.push({ label:'P75',  data:mcFan.p75, borderColor:'rgba(26,115,232,.25)', borderWidth:1, pointRadius:0, fill:{target:b+2, above:'rgba(26,115,232,.10)', below:'transparent'}, tension:.35 });
    fanBands.push({ label:'P90',  data:mcFan.p90, borderColor:'rgba(26,115,232,.15)', borderWidth:1, pointRadius:0, fill:{target:b+3, above:'rgba(26,115,232,.06)', below:'transparent'}, tension:.35 });
  }

  // Curva "Reale" = Base deflazionata per HICP live (o inflBottom se non disponibile)
  const _liveInfl = (() => {
    const d = window.liveMarketData;
    if (d && (d.status === 'ok' || d.status === 'partial') && d.hicp_eu != null) return d.hicp_eu;
    return state.inflBottom / 100;
  })();
  const realBase = normal.map((v, i) => v != null ? Math.round(v / Math.pow(1 + _liveInfl, i)) : null);
  const inflSource = (window.liveMarketData?.hicp_eu != null) ? `HICP ${(_liveInfl*100).toFixed(1)}%` : `${(_liveInfl*100).toFixed(1)}%`;

  const ds = [
    { label:'Ott.', data:best, borderColor:'#36d490', borderWidth:2, pointRadius:0, fill:false, tension:.35 },
    { label:'Base', data:normal, borderColor:'#1a73e8', borderWidth:3, pointRadius:0, fill:false, tension:.35 },
    { label:'Pess.', data:worst, borderColor:'#e37400', borderWidth:2, pointRadius:0, fill:false, tension:.35 },
    ...(seqNorm ? [{ label:'Seq.', data:seqNorm, borderColor:'#9334e6', borderWidth:2.2, borderDash:[7,4], pointRadius:0, fill:false, tension:.35 }] : []),
    ...fanBands,
    { label:`Reale (${inflSource})`, data:realBase, borderColor:'rgba(0,0,0,.28)', borderWidth:1.5, borderDash:[4,3], pointRadius:0, fill:false, tension:.35 },
    { label:'PIC', data:ptPic, borderColor:'transparent', backgroundColor:'#36d490', pointRadius:6, showLine:false },
    { label:'Exp', data:ptExp, borderColor:'transparent', backgroundColor:'#d93025', pointRadius:6, showLine:false },
    { label:'PacChg', data:ptPac, borderColor:'transparent', backgroundColor:'rgba(26,115,232,.9)', pointRadius:7, pointStyle:'rectRot', showLine:false },
  ];

  const gC = 'rgba(0,0,0,.05)', tC = 'rgba(0,0,0,.45)';
  chart = new Chart(document.getElementById('ch'), {
    type: 'line', data: { labels: ages, datasets: ds },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          filter: i => !['PIC', 'Exp', 'PacChg', 'P90', 'P75', 'P50mc', 'P25', 'P10'].includes(i.dataset.label),
          callbacks: {
            title: c => 'Età ' + c[0].label,
            label: c => ' ' + c.dataset.label + ': ' + fmt(c.raw),
          },
          backgroundColor: '#fff', borderColor: '#dadce0', borderWidth: 1,
          titleColor: '#202124', bodyColor: '#5f6368', padding: 10,
          titleFont: { family: 'DM Mono', size: 13, weight: 'bold' },
          bodyFont: { family: 'DM Mono', size: 12 },
        }
      },
      scales: {
        x: { ticks: { color: tC, font: { size: 11, family: 'DM Mono', weight: '500' }, maxTicksLimit: 12 }, grid: { color: gC } },
        y: { ticks: { color: tC, font: { size: 11, family: 'DM Mono', weight: '500' }, callback: v => fmt(v) }, grid: { color: gC } },
      }
    },
    plugins: [{
      id: 'ov', afterDraw(c) {
        const { ctx, scales: { x, y } } = c;
        if (opt >= y.min && opt <= y.max) {
          const yp = y.getPixelForValue(opt);
          ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(x.left, yp); ctx.lineTo(x.right, yp); ctx.stroke();
          ctx.setLineDash([]); ctx.font = '10.5px DM Mono,monospace'; ctx.fillStyle = 'rgba(0,0,0,.35)';
          ctx.fillText('💎 optionality ' + fmt(opt), x.left + 6, yp - 4); ctx.restore();
        }
        if (crossAge !== null) {
          const xi = ages.indexOf(crossAge);
          if (xi >= 0) {
            const xp = x.getPixelForValue(crossAge);
            ctx.save(); ctx.setLineDash([5, 3]); ctx.strokeStyle = 'rgba(147,52,230,.6)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(xp, y.top); ctx.lineTo(xp, y.bottom); ctx.stroke();
            ctx.setLineDash([]); ctx.font = '10px DM Mono,monospace'; ctx.fillStyle = 'rgba(147,52,230,.9)';
            ctx.fillText('⬤ crossover', xp + 4, y.top + 14); ctx.restore();
          }
        }
        if (crashAge) {
          const xp = x.getPixelForValue(crashAge);
          if (xp) {
            ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(147,52,230,.4)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(xp, y.top); ctx.lineTo(xp, y.bottom); ctx.stroke();
            ctx.setLineDash([]); ctx.restore();
          }
        }
      }
    }]
  });
}

function toggleLiq() { state.showLiq = !state.showLiq; render(); }
function toggleVolBands() { state.showVolBands = !state.showVolBands; document.getElementById('volBandsTog').classList.toggle('on', state.showVolBands); document.getElementById('legVol').style.display = state.showVolBands ? 'flex' : 'none'; render(); }

// ══════════════════════════════════════════════════════════════
// MODULO INFLAZIONE — con correlazione asset
// ══════════════════════════════════════════════════════════════
function renderInflation(vN, vW, vBt, inv, years, dN) {
  const inflBase = state.inflBottom / 100;
  const inflSig = state.inflVol / 100;
  const dF_base = Math.pow(1 + inflBase, years);
  const txF = blendedTaxRate(state.age + years);
  const nN = calcNetNom(vN, inv, txF);
  const nP = calcNetNom(vW, inv, txF);
  const nO = calcNetNom(vBt, inv, txF);

  // Scenari inflazione: bassa/centrale/alta + stocastici
  const inflScenarios = [
    { l: 'Bassa inflazione', rate: Math.max(0, inflBase - inflSig * 2), c: '#1e8e3e', bg: '#e8f5e9' },
    { l: 'Centrale (' + state.inflBottom.toFixed(1) + '%)', rate: inflBase, c: '#1a73e8', bg: '#e8f0fe' },
    { l: 'Alta inflazione', rate: inflBase + inflSig * 2, c: '#e37400', bg: '#fff3e0' },
    { l: 'Stocastica (σ=' + state.inflVol.toFixed(1) + '%)', rate: inflBase + inflSig, c: '#9334e6', bg: '#f3e8ff' },
  ];

  document.getElementById('inflScenarios').innerHTML = inflScenarios.map(s => {
    const df = Math.pow(1 + s.rate, years);
    const rN = nN / df;
    return `<div class="infl-card" style="border-color:${s.bg};background:${s.bg}">
      <div style="font-size:11px;font-weight:700;color:${s.c};margin-bottom:4px">${s.l}</div>
      <div style="font-size:12px;color:var(--text3)">Inflaz.: <strong>${(s.rate * 100).toFixed(1)}%/a</strong></div>
      <div style="font-size:11px;color:var(--text3)">Fattore: ÷${df.toFixed(2)}</div>
      <div style="font-size:10px;color:var(--text3);margin:4px 0">Netto Nominale Base</div>
      <div style="font-size:13px;font-weight:600;font-family:'DM Mono',monospace;color:var(--text2)">${fmt(nN)}</div>
      <div style="font-size:10px;color:#bbb;margin:2px 0">→ in potere d'acquisto oggi</div>
      <div style="font-size:20px;font-weight:700;font-family:'DM Mono',monospace;color:${s.c}">${fmt(rN)}</div>
      <div style="font-size:10.5px;color:var(--text3);margin-top:4px">Erosione: <strong style="color:var(--red)">${fmt(nN - rN)}</strong></div>
    </div>`;
  }).join('');

  // Tabella correlazione asset-inflazione
  const port = getPortParams(state.portfolio);
  const eqW = getEquityWeight(state.portfolio, state.age + years);
  const goldW = getGoldWeight(state.portfolio);
  const obW = Math.max(0, 1 - eqW - goldW);
  const assets = [
    { name: 'Azioni (' + (eqW * 100).toFixed(0) + '%)', corr: '+0.3', desc: 'Coprono l\'inflazione nel lungo periodo (+2-3% reale storico)', color: 'var(--green)' },
    { name: 'Obbligaz. nominali (' + (obW * 100).toFixed(0) + '%)', corr: '−0.35', desc: 'Soffrono molto in stagflazione: cedola fissa, rendimento reale negativo', color: 'var(--red)' },
    { name: 'Oro (' + (goldW * 100).toFixed(0) + '%)', corr: '+0.5', desc: 'Forte correlazione positiva con inflazione elevata (1970-80, 2020-22)', color: 'var(--orange)' },
    { name: 'Liquidità (' + (getCashWeight(state.portfolio) * 100).toFixed(0) + '%)', corr: '+0.2', desc: 'Tassi flottanti mitigano l\'erosione in contesti di rialzo', color: 'var(--teal)' },
  ].filter(a => parseFloat(a.name.match(/\((\d+)/)?.[1] ?? '0') > 0);

  const portInflBeta = port?.inflBeta ?? 0.1;
  const betaDesc = portInflBeta > 0.3 ? 'BUONA copertura inflazione' : portInflBeta > 0 ? 'DISCRETA copertura' : 'SCARSA copertura — soffre l\'inflazione';

  document.getElementById('inflCorrTable').innerHTML = `
    <div style="background:#fff;border:1px solid #ffe0b2;border-radius:var(--radius-sm);padding:14px;margin-bottom:10px">
      <div style="font-size:11px;font-weight:700;color:#e65100;text-transform:uppercase;font-family:'DM Mono',monospace;margin-bottom:10px">
        Correlazione Asset–Inflazione · ${getPortLabel(state.portfolio)}
      </div>
      <div style="display:flex;align-items:center;gap:12px;padding:10px;background:#fff3e0;border-radius:var(--radius-sm);margin-bottom:10px">
        <div style="font-size:24px;font-weight:700;font-family:'DM Mono',monospace;color:${portInflBeta > 0.2 ? '#1e8e3e' : portInflBeta > 0 ? '#e37400' : '#d93025'}">${portInflBeta > 0 ? '+' : ''}${portInflBeta.toFixed(2)}</div>
        <div><div style="font-size:12px;font-weight:700;color:#e65100">Beta Inflazione del Portafoglio</div><div style="font-size:11.5px;color:#795548">${betaDesc}</div></div>
      </div>
      ${assets.map(a => `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:8px 0;border-bottom:1px solid #ffe0b2;gap:10px">
        <div style="font-weight:600;color:${a.color};min-width:130px;font-size:12.5px">${a.name}</div>
        <div style="font-size:12px;font-weight:700;color:${a.corr.startsWith('+') ? 'var(--green)' : 'var(--red)'};width:50px;text-align:center">${a.corr}</div>
        <div style="font-size:11.5px;color:var(--text2);flex:1">${a.desc}</div>
      </div>`).join('')}
    </div>
    <div style="background:#fff3e0;border:1px solid #ffe0b2;border-radius:var(--radius-sm);padding:12px;font-size:12px;color:#795548;line-height:1.7">
      In <strong>${years} anni</strong> al <strong>${(inflBase * 100).toFixed(1)}%</strong> (inflaz. centrale): ogni €100 oggi = €${(100 * dF_base).toFixed(0)} nominali. Erosione potere d'acquisto: <strong style="color:var(--red)">${((1 - 1 / dF_base) * 100).toFixed(1)}%</strong>. 
      Il portafoglio <strong>${getPortLabel(state.portfolio)}</strong> ha un beta inflazione di <strong>${portInflBeta > 0 ? '+' : ''}${portInflBeta.toFixed(2)}</strong> — 
      ${portInflBeta > 0.3 ? 'ottima difesa contro l\'erosione monetaria' : portInflBeta > 0 ? 'copertura parziale — i rendimenti reali potrebbero ridursi in contesti di alta inflazione' : 'attenzione: questo portafoglio soffre significativamente in periodi di alta inflazione'}.
    </div>`;

  // SWR con inflazione reale
  // Fraction of gross withdrawal that is gain (proporzione gain/valore)
  const gainFrac = vN > 0 && inv < vN ? Math.min(1, (vN - inv) / vN) : 0;
  const eT = gainFrac * txF;
  const df = dF_base;
  document.getElementById('inflDetails').innerHTML = `
    <div style="background:#fff;border:1px solid #ffe0b2;border-radius:var(--radius-sm);padding:14px;margin-bottom:14px">
      <div style="font-size:11px;color:#e65100;font-weight:700;text-transform:uppercase;font-family:'DM Mono',monospace;margin-bottom:10px">Rendita Sostenibile in Potere d'Acquisto Reale</div>
      ${[{ r: .03, l: '3%', c: '#1a73e8' }, { r: .035, l: '3.5%', c: '#1e8e3e' }, { r: .04, l: '4%', c: '#1e8e3e' }].map(s => {
    const gA = vN * s.r, nA = gA * (1 - eT), nR = nA / df;
    return `<div class="infl-swr-row"><span style="font-weight:600;color:#e65100;width:40px">SWR ${s.l}</span><span style="color:#795548">Net nom. <strong>${fmt(nA)}</strong>/a</span><span>→</span><span><strong style="color:${s.c};font-size:14px">${fmt(nR)}</strong>/a reali (${fmt(nR / 12)}/m)</span></div>`;
  }).join('')}
      <div style="font-size:11px;color:#bbb;margin-top:8px">Scontato ÷${df.toFixed(2)} = potere d'acquisto in euro di oggi.</div>
    </div>`;
}

// ══════════════════════════════════════════════════════════════
// RENDER MAIN
// ══════════════════════════════════════════════════════════════
function render() {
  const { w, pac, age, years, opt, portfolio, seq, ter } = state;
  const endAge = age + years;
  const txS = blendedTaxRate(age) * 100, txE = blendedTaxRate(endAge) * 100;
  document.getElementById('blendedTaxBadge').innerText = Math.abs(txE - txS) < .5 ? `Aliquota blended: ${txS.toFixed(1)}%` : `Aliquota blended: ${txS.toFixed(1)}% → ${txE.toFixed(1)}% (lifecycle)`;

  const dB = project('best', false), dN = project('normal', false), dW = project('worst', false);
  const dS = seq.on ? project('normal', true) : null;
  const dNT = ter > 0 ? project('normal', false, 0) : null;
  const ages = dN.map(d => d.age);
  const vB = dB.map(d => d.value), vN = dN.map(d => d.value), vW = dW.map(d => d.value);
  const vS = dS ? dS.map(d => d.value) : null;
  const terDrag = dNT ? dNT[years].value - vN[years] : 0;
  const crashYearsList = seq.on ? getCrashYears(seq.mode || 'single', seq.timing, years) : [];
  const crashY = crashYearsList[0] ?? -1;
  const crashAge = crashY > 0 ? age + crashY : null;
  const bCA = findCrossover(dN), aCA = findCrossover(seq.on ? dS : dN);
  const picY = state.pics.map(p => +p.year);
  const expY = state.exps.map(e => +e.year);
  const pacY = state.pacChanges.map(c => +c.year);

  const mcFan = runMontecarlo();
  buildChart(vB, vN, vW, vS, ages, opt, crashAge, aCA, picY, expY, pacY, mcFan);

  document.getElementById('legSeq').style.display = seq.on ? 'flex' : 'none';
  document.getElementById('legPacChg').style.display = state.pacChanges.length > 0 ? 'flex' : 'none';

  const oA = arr => { const d = arr.find(d => d.value >= opt); return d ? d.age : null; };
  const oB = oA(dB), oN = oA(dN), oW = oA(dW);
  const md = [
    { l: `Pessimistico — età ${endAge}`, v: fmt(vW[years]), s: 'opt: ' + (oW || '>' + endAge), c: 'var(--orange)' },
    { l: `Base — età ${endAge}`, v: fmt(vN[years]), s: 'opt: ' + (oN || '>' + endAge), c: 'var(--blue)' },
    { l: `Ottimistico — età ${endAge}`, v: fmt(vB[years]), s: 'opt: ' + (oB || '>' + endAge), c: 'var(--green)' },
    ...(dS ? [{ l: `+Seq.Risk — età ${endAge}`, v: fmt(vS[years]), s: (vS[years] > vN[years] ? '+' : '') + fmt(vS[years] - vN[years]), c: 'var(--purple)' }] : []),
    { l: 'Totale versato', v: fmt(dN[years].invested), s: pac > 0 ? fmt(pac * 12) + '/anno' : 'solo PIC', c: 'var(--text)' },
    { l: 'Plusvalenza Lorda Nom.', v: fmt(dN[years].returns), s: dN[years].invested > 0 ? '×' + (dN[years].value / dN[years].invested).toFixed(2) + ' molt.' : '', c: dN[years].returns >= 0 ? 'var(--green)' : 'var(--red)' },
  ];
  document.getElementById('metrics').innerHTML = md.map(m => `<div class="mcard"><div class="ml">${m.l}</div><div class="mv" style="color:${m.c}">${m.v}</div><div class="ms">${m.s}</div></div>`).join('');

  const te = document.getElementById('terDragContent');
  if (ter === 0) te.innerHTML = `<span style="color:var(--green);font-weight:600">TER = 0%</span> — nessun costo fondo.`;
  else { const tp = (terDrag / dNT[years].value * 100).toFixed(1); te.innerHTML = `Con TER <strong>${ter.toFixed(2)}%</strong> su ${years} anni: costo stimato <strong style="color:var(--orange)">${fmt(terDrag)}</strong> vs TER 0% (${tp}% del montante — compounding dell'erosione annua)`; }

  const tI = dN[years].invested, txF = blendedTaxRate(endAge);
  const nB = calcNetNom(vN[years], tI, txF), nP = calcNetNom(vW[years], tI, txF), nO = calcNetNom(vB[years], tI, txF);
  document.getElementById('liqAge').innerText = endAge;
  const lb = document.getElementById('liqBtn'), ld = document.getElementById('liqData');
  if (state.showLiq) {
    lb.innerText = 'Nascondi'; lb.style.background = 'var(--bg)'; lb.style.color = 'var(--blue)'; ld.style.display = 'block';
    const lC = (t, g, n, col) => { const gain = Math.max(0, g - tI), tax = gain * txF; return `<div class="liq-card"><div class="liq-card-title">${t}</div><div class="liq-row"><span style="color:var(--text2)">Lordo Nominale</span><strong>${fmt(g)}</strong></div><div class="liq-row"><span style="color:var(--text2)">Capitale versato</span><span>${fmt(tI)}</span></div><div class="liq-row" style="color:var(--red)"><span>Tasse CG (${(txF * 100).toFixed(1)}%)</span><span>−${fmt(tax)}</span></div><div class="liq-row" style="border-top:1px solid var(--border);padding-top:8px;margin-bottom:0"><strong style="color:${col}">Netto Nominale</strong><strong style="color:${col};font-size:15px">${fmt(n)}</strong></div></div>`; };
    ld.innerHTML = `<div class="grid-3" style="gap:14px">${lC('Pessimistico', vW[years], nP, 'var(--orange)')}${lC('Scenario Base', vN[years], nB, 'var(--blue)')}${lC('Ottimistico', vB[years], nO, 'var(--green)')}</div><div style="font-size:11.5px;color:var(--text3);margin-top:12px">Aliquota ponderata finale: <strong>${(txF * 100).toFixed(1)}%</strong> (solo sulla plusvalenza).</div>`;
  } else { lb.innerText = '💰 Simula Vendita Totale (Netto)'; lb.style.background = 'var(--blue-dim)'; lb.style.color = 'var(--blue)'; ld.style.display = 'none'; }

  // Frazione media di plusvalenza sul valore finale (approx. per prelievi parziali proporzionali)
  const gainFrac = tI > 0 && vN[years] > tI ? Math.min(1, (vN[years] - tI) / vN[years]) : 0;
  // Aliquota effettiva sul prelievo lordo: solo la quota gain è tassata
  const eT = gainFrac * txF;
  const swrI = [{ r: .03, l: '3%', s: 'Conservativo', c: 'var(--blue)' }, { r: .035, l: '3.5%', s: 'Moderato', c: 'var(--green)' }, { r: .04, l: '4%', s: 'Regola del 4%', c: 'var(--green)' }];
  document.getElementById('swrData').innerHTML = `<div style="font-size:12.5px;color:var(--text2);margin-bottom:12px">Montante base <strong>${fmt(vN[years])}</strong>. Tassa effettiva prelievo: <strong>${(eT * 100).toFixed(1)}%</strong>.</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px">${swrI.map(s => { const gA = vN[years] * s.r, nA = gA * (1 - eT), vP = pac > 0 ? ` — ${(nA / (pac * 12) * 100).toFixed(0)}% del PAC` : ''; return `<div class="liq-card"><div class="liq-card-title">SWR ${s.l} · ${s.s}</div><div class="liq-row"><span style="color:var(--text2)">Lorda/anno</span><strong>${fmt(gA)}</strong></div><div class="liq-row"><span style="color:var(--text2)">Lorda/mese</span><span>${fmt(gA / 12)}</span></div><div class="liq-row" style="border-top:1px solid var(--border);padding-top:8px;margin-bottom:0"><strong style="color:${s.c}">Netta/anno</strong><strong style="color:${s.c}">${fmt(nA)}${vP}</strong></div></div>`; }).join('')}</div>`;

  // INFLAZIONE AVANZATA
  renderInflation(vN[years], vW[years], vB[years], tI, years, dN);

  // CROSSOVER
  let cxt = '';
  if (!hasAnyActivePac()) cxt = 'Nessun PAC attivo. Nessun crossover calcolabile.';
  else if (aCA) { const cPac = getPacForYear(aCA - age) * 12; cxt = `A <strong>${aCA} anni</strong> la rendita annua netta supera il PAC di <strong>${fmt(cPac / 12)}/m</strong> (${fmt(cPac)}/a) — il portafoglio diventa <em>autosufficiente</em>.`; }
  else { const mp = Math.max(state.pac, ...state.pacChanges.map(c => +c.amount)); cxt = `Con PAC di ${fmt(mp * 12)}/anno il crossover netto non viene raggiunto nell'orizzonte impostato.`; }
  document.getElementById('cxText').innerHTML = cxt;

  // BAR CHART
  const inv2 = dN[years].invested, tot = dN[years].value, ret = tot - inv2;
  const iP = tot > 0 ? Math.max(2, (inv2 / tot * 100)).toFixed(1) : 100;
  const rP = tot > 0 ? Math.max(0, (ret / tot * 100)).toFixed(1) : 0;
  document.getElementById('barTrack').innerHTML = `<div class="bar-inv" style="width:${iP}%"></div><div class="bar-ret" style="width:${rP}%"></div>`;
  document.getElementById('barStats').innerHTML = `<div><span class="bar-dot" style="background:var(--blue)"></span>Versato: <strong>${fmt(inv2)}</strong> (${iP}%)</div><div><span class="bar-dot" style="background:var(--green)"></span>Plusvalenza: <strong style="color:var(--green)">${fmt(ret)}</strong> (${rP}%)</div><div style="color:var(--text3)">Moltiplicatore: <strong style="color:var(--text)">${tot > 0 && inv2 > 0 ? (tot / inv2).toFixed(2) : '—'}×</strong></div>`;

  // TABELLA
  const eY = new Set([0, years]);
  picY.forEach(y => { if (y > 0 && y <= years) eY.add(y); });
  expY.forEach(y => { if (y > 0 && y <= years) eY.add(y); });
  pacY.forEach(y => { if (y > 0 && y <= years) eY.add(y); });
  if (aCA) eY.add(aCA - age);
  if (crashY > 0) eY.add(crashY);
  crashYearsList.forEach(cy => { if (cy > 0 && cy <= years) eY.add(cy); });
  const stp = Math.max(1, Math.floor(years / 10));
  for (let y = 0; y <= years; y += stp) eY.add(y);
  const rows = state.allRows ? dN : dN.filter((_, i) => eY.has(i));
  const isCx = y => aCA && (age + y) === aCA;
  document.getElementById('tb').innerHTML = rows.map(d => {
    const iC = d.year === crashY && seq.on;
    const iPC = pacY.includes(d.year) && d.year > 0;
    const iPic = picY.includes(d.year) && d.year > 0;
    const iExp = expY.includes(d.year) && d.year > 0;
    const iCxR = isCx(d.year);
    const rc = []; if (iC) rc.push('tr-crash'); if (iPC) rc.push('tr-pac'); if (iPic) rc.push('tr-pic'); if (iExp) rc.push('tr-exp'); if (iCxR) rc.push('tr-cross');
    const rA = d.year > 0 ? d.annRetNet : 0, rPac = d.year > 0 ? getPacForYear(d.year) * 12 : state.pac * 12;
    const rCls = d.returns > 0 ? 'pos' : d.returns < 0 ? 'neg' : 'neutral';
    const aC = rA > rPac ? 'pos' : rA > 0 ? 'neutral' : 'neg';
    const vsP = d.year > 0 ? fmt(rA - rPac) : '—', vsCls = d.year > 0 && (rA - rPac) >= 0 ? 'pos' : 'neg';
    const pN = (d.year > 0 && rPac !== state.pac * 12) ? `<span style="font-size:10px;color:var(--blue);font-family:'DM Mono',monospace;background:var(--blue-dim);padding:1px 5px;border-radius:3px;margin-left:4px">${rPac === 0 ? '⏸' : fmt(rPac / 12) + '/m'}</span>` : '';
    return `<tr class="${rc.join(' ')}"><td><strong>${d.age}</strong></td><td>+${d.year}a${pN}</td><td>${fmt(d.invested)}</td><td class="${rCls}">${d.year > 0 ? fmt(d.returns) : '—'}</td><td><strong>${fmt(d.value)}</strong></td><td class="${aC}">${d.year > 0 ? fmt(rA) : '—'}</td><td class="${vsCls}">${vsP}</td><td style="font-size:11.5px;color:var(--text3);white-space:nowrap">${d.event || ''}</td></tr>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
// TAB SCENARI ECONOMICI
// ══════════════════════════════════════════════════════════════
let chartEco = null;

function renderEcoScenarios() {
  // Sync banner — mostra i parametri ereditati dal Simulatore
  const pName = getPortLabel(state.portfolio);
  const seqOn = state.seq && state.seq.on;
  document.getElementById('ecoSyncBanner').innerHTML =
    `<span style="color:var(--text2)">Parametri ereditati dal <strong style="color:var(--blue)">Simulatore</strong>:</span> ` +
    `<strong>${fmt(state.w)}</strong> capitale · ` +
    `<strong>€${fmtN(state.pac)}/m</strong> PAC · ` +
    `<strong>${state.years} anni</strong> · ` +
    `<strong>${pName}</strong>` +
    (seqOn ? ` · <span style="color:var(--purple)">⚠ Sequence Risk attivo</span>` : '');

  // Build scenario cards
  document.getElementById('ecoScenarioGrid').innerHTML = Object.entries(ECO_SCENARIOS).map(([k, s]) => `
    <div class="eco-card ${state.activeEcoScenario === k ? 'active' : ''}" 
         style="background:${s.bg};border-color:${state.activeEcoScenario === k ? s.color : 'transparent'}"
         onclick="selectEcoScenario('${k}')">
      <div class="eco-card-title" style="color:${s.color}">${s.emoji} ${s.label}</div>
      <div class="eco-card-desc">${s.desc.substring(0, 80)}…</div>
      <div style="margin-top:6px;font-size:10.5px;font-family:'DM Mono',monospace;color:${s.color};font-weight:600">⏱ ${s.duration >= 99 ? 'baseline' : '~' + s.duration + ' anni'}</div>
    </div>`).join('');

  const eco = ECO_SCENARIOS[state.activeEcoScenario];
  // Coerenza con il Simulatore: rispetta il toggle Sequence Risk per la baseline
  const dBase = project('normal', seqOn);
  const dEco = projectEco(state.activeEcoScenario);
  const ages = dBase.map(d => d.age);
  const vBase = dBase.map(d => d.value);
  const vEco = dEco.map(d => d.value);
  const vReal = dEco.map(d => d.real);

  document.getElementById('ecoSelectedDesc').style.display = 'block';
  const dur = ECO_SCENARIOS[state.activeEcoScenario].duration ?? 99;
  const win = getEcoWindow(state.activeEcoScenario, state.years, state.ecoTiming);
  const timingLabel = { early: '🌅 Inizio', mid: '🌤 Metà', late: '🌆 Fine' }[state.ecoTiming] || '';
  const winLabel = dur >= 99 ? 'permanente' : `anni ${win.s}–${win.e} su ${state.years}`;
  const durLabel = dur >= 99 ? 'permanente (baseline)' : `~${dur} anni (poi ritorno a Crescita Normale)`;
  document.getElementById('ecoSelectedDesc').innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap">
      <div style="font-size:28px">${eco.emoji}</div>
      <div style="flex:1">
        <div style="font-size:15px;font-weight:700;color:${eco.color};margin-bottom:6px">${eco.label}</div>
        <div style="font-size:12.5px;color:var(--text2);line-height:1.7;margin-bottom:10px">${eco.desc}</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;font-family:'DM Mono',monospace">
          <span><b>Durata regime:</b> ${durLabel}</span>
          <span style="color:var(--purple);font-weight:600">${timingLabel} · regime attivo: ${winLabel}</span>
          <span>Az. ×${eco.eqMult}</span>
          <span>Ob. ×${eco.obMult}</span>
          <span>Oro ×${eco.goldMult}</span>
          <span>Inflaz. ${eco.inflMean}% (σ=${eco.inflSigma}%)</span>
          <span>Vol. ×${eco.volMult}</span>
          <span>Cash ${(eco.cashRet * 100).toFixed(1)}%</span>
        </div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="mcard"><div class="ml">Scenario Economico</div><div class="mv" style="color:${eco.color};font-size:16px">${fmt(vEco[state.years])}</div><div class="ms">Valore finale</div></div>
        <div class="mcard"><div class="ml">Scenario Base</div><div class="mv" style="color:var(--blue);font-size:16px">${fmt(vBase[state.years])}</div><div class="ms">Riferimento</div></div>
        <div class="mcard"><div class="ml">Differenza</div><div class="mv" style="color:${vEco[state.years] > vBase[state.years] ? 'var(--green)' : 'var(--red)'};font-size:16px">${vEco[state.years] > vBase[state.years] ? '+' : ''}${fmt(vEco[state.years] - vBase[state.years])}</div><div class="ms">${((vEco[state.years] / vBase[state.years] - 1) * 100).toFixed(1)}%</div></div>
      </div>
    </div>`;

  if (chartEco) { chartEco.destroy(); chartEco = null; }
  const gC = 'rgba(0,0,0,.05)', tC = 'rgba(0,0,0,.45)';
  chartEco = new Chart(document.getElementById('chEco'), {
    type: 'line',
    data: {
      labels: ages,
      datasets: [
        { label: 'Base', data: vBase, borderColor: '#1a73e8', borderWidth: 2.5, pointRadius: 0, fill: false, tension: .35 },
        { label: eco.label, data: vEco, borderColor: eco.color, borderWidth: 3, pointRadius: 0, fill: false, tension: .35 },
        { label: 'Reale (deflatato)', data: vReal, borderColor: eco.color, borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0, fill: false, tension: .35 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { font: { family: 'DM Mono', size: 11 }, boxWidth: 16 } },
        tooltip: { callbacks: { title: c => 'Età ' + c[0].label, label: c => ' ' + c.dataset.label + ': ' + fmt(c.raw) }, backgroundColor: '#fff', borderColor: '#dadce0', borderWidth: 1, titleColor: '#202124', bodyColor: '#5f6368', padding: 10 }
      },
      scales: {
        x: { ticks: { color: tC, font: { size: 11, family: 'DM Mono' }, maxTicksLimit: 12 }, grid: { color: gC } },
        y: { ticks: { color: tC, font: { size: 11, family: 'DM Mono' }, callback: v => fmt(v) }, grid: { color: gC } }
      }
    },
    plugins: [{
      id: 'opt', afterDraw(c) {
        const { ctx, scales: { x, y } } = c;
        if (state.opt >= y.min && state.opt <= y.max) {
          const yp = y.getPixelForValue(state.opt);
          ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(x.left, yp); ctx.lineTo(x.right, yp); ctx.stroke();
          ctx.setLineDash([]); ctx.font = '10px DM Mono,monospace'; ctx.fillStyle = 'rgba(0,0,0,.3)';
          ctx.fillText('💎 optionality', x.left + 6, yp - 4); ctx.restore();
        }
        // Linee verticali inizio/fine regime (usa win.e per rispettare il timing scelto)
        const ecoC = ECO_SCENARIOS[state.activeEcoScenario];
        if (ecoC && (ecoC.duration ?? 99) < 99) {
          ctx.save();
          ctx.setLineDash([5, 4]); ctx.strokeStyle = ecoC.color; ctx.lineWidth = 1.5;
          ctx.font = 'bold 10.5px DM Mono,monospace'; ctx.fillStyle = ecoC.color;
          if (win.s > 1) {
            const xpS = x.getPixelForValue(state.age + win.s - 1);
            ctx.beginPath(); ctx.moveTo(xpS, y.top); ctx.lineTo(xpS, y.bottom); ctx.stroke();
            ctx.fillText('inizio regime (a.' + win.s + ')', xpS + 4, y.top + 28);
          }
          if (win.e < state.years) {
            const xpE = x.getPixelForValue(state.age + win.e);
            ctx.beginPath(); ctx.moveTo(xpE, y.top); ctx.lineTo(xpE, y.bottom); ctx.stroke();
            ctx.fillText('\u27f5 fine regime (a.' + win.e + ')', xpE + 4, y.top + 14);
          }
          ctx.restore();
        }
      }
    }]
  });

  // Compare table — all scenarios
  const rows = Object.entries(ECO_SCENARIOS).map(([k, s]) => {
    const dE = projectEco(k);
    const vE = dE[state.years].value, vR = dE[state.years].real;
    const delta = vE - vBase[state.years], pct = ((vE / vBase[state.years] - 1) * 100).toFixed(1);
    const durTxt = s.duration >= 99 ? 'baseline' : `${Math.min(s.duration, state.years)}/${state.years} a`;
    return `<tr><td style="text-align:left"><span style="font-size:13px">${s.emoji}</span> ${s.label}</td>
      <td style="font-family:'DM Mono',monospace;color:${s.color};font-weight:600">${durTxt}</td>
      <td style="font-weight:600;color:${s.color}">${fmt(vE)}</td>
      <td class="${delta >= 0 ? 'pos' : 'neg'}">${delta >= 0 ? '+' : ''}${fmt(delta)}</td>
      <td class="${delta >= 0 ? 'pos' : 'neg'}">${delta >= 0 ? '+' : ''}${pct}%</td>
      <td style="color:var(--text3)">${fmt(vR)}</td>
      <td style="color:var(--text3)">${s.inflMean.toFixed(1)}%</td></tr>`;
  }).join('');
  document.getElementById('ecoCompareTable').innerHTML = `
    <div class="tbl-outer"><table>
      <thead><tr>
        <th style="text-align:left">Scenario</th>
        <th>Durata regime</th>
        <th>Valore Finale</th>
        <th>Δ vs Base</th>
        <th>Δ %</th>
        <th>Valore Reale</th>
        <th>Inflaz. media (regime)</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;

  // Tabella anno per anno
  const stp = Math.max(1, Math.floor(state.years / 12));
  document.getElementById('ecoTable').innerHTML = dEco.filter((_, i) => i % stp === 0 || i === state.years).map(d => {
    const bv = dBase[d.year]?.value ?? 0;
    const delta = d.value - bv;
    return `<tr>
      <td><strong>${d.age}</strong></td>
      <td>+${d.year}a</td>
      <td style="color:var(--blue)">${fmt(bv)}</td>
      <td style="color:${eco.color};font-weight:600">${fmt(d.value)}</td>
      <td class="${delta >= 0 ? 'pos' : 'neg'}">${delta >= 0 ? '+' : ''}${fmt(delta)}</td>
      <td style="color:${d.inflYear > 4 ? 'var(--red)' : d.inflYear < 0 ? 'var(--blue)' : 'var(--text2)'}">${d.inflYear.toFixed(1)}%</td>
      <td style="color:var(--teal)">${fmt(d.real)}</td>
    </tr>`;
  }).join('');
}

function selectEcoScenario(key) {
  state.activeEcoScenario = key;
  renderEcoScenarios();
}

// ══════════════════════════════════════════════════════════════
// SIMULAZIONE MULTI-REGIME STOCASTICA
//
// Idea: in un piano di 30 anni non vivi un solo regime economico
// ma una SEQUENZA di regimi consecutivi (es. crescita → recessione
// → ripresa → stagflazione...). Questa sezione lo simula.
//
// Due modalità:
//  • Automatico: matrice di transizione storica calibrata sui cicli
//    economici USA/EU post-1945. Ad ogni anno il regime corrente
//    ha una certa probabilità di continuare o cambiare.
//  • Manuale: l'utente compone la sequenza a mano (regime + durata)
//    e lancia 1.000 percorsi con inflazione e rendimenti stocastici
//    dentro ogni fase.
//
// Metodologia rendimenti intra-regime:
//  • μ = getRateEco() col regime attivo in quell'anno (coerente con
//    il tab Scenari Economici deterministico)
//  • σ = getPortfolioVol() × volMult del regime
//  • Correzione Itō: μ_arith = μ + σ²/2  → E[CAGR] = μ target
//  • Inflazione stocastica: N(inflMean, inflSigma) per anno,
//    clampata a ±3σ (stesso approccio del MC Avanzato)
//  • mid-year convention identica al simulatore principale
// ══════════════════════════════════════════════════════════════

// ── Matrice di transizione calibrata sui cicli 1945-2023 ─────
// Righe = regime CORRENTE, colonne = regime SUCCESSIVO (anno dopo anno)
// Fonte: NBER business cycles, Reinhart & Rogoff, dati BCE/Fed
// Probabilità di RIMANERE nello stesso regime dipende dalla durata
// media storica: crescita ~5a, recessione ~1.5a, bull ~8a, ecc.
// Qui usiamo probabilità annue di transizione.
const ECO_TRANSITION = {
  //                       norm   stag   rec    defl   bull   hrate
  normal_growth: { normal_growth:0.70, stagflation:0.06, recession:0.10, deflation:0.03, bull_market:0.08, high_rates:0.03 },
  stagflation:   { normal_growth:0.20, stagflation:0.55, recession:0.08, deflation:0.02, bull_market:0.03, high_rates:0.12 },
  recession:     { normal_growth:0.45, stagflation:0.05, recession:0.30, deflation:0.12, bull_market:0.06, high_rates:0.02 },
  deflation:     { normal_growth:0.25, stagflation:0.02, recession:0.15, deflation:0.50, bull_market:0.05, high_rates:0.03 },
  bull_market:   { normal_growth:0.15, stagflation:0.04, recession:0.08, deflation:0.02, bull_market:0.65, high_rates:0.06 },
  high_rates:    { normal_growth:0.20, stagflation:0.15, recession:0.12, deflation:0.02, bull_market:0.08, high_rates:0.43 },
};
const ECO_KEYS = Object.keys(ECO_SCENARIOS);

// Stato UI multi-regime
const multiRegimeState = {
  mode: 'auto',           // 'auto' | 'manual'
  startRegime: 'normal_growth',  // regime iniziale (auto)
  manualSeq: [],          // [{key, years}] — sequenza manuale
  lastResult: null,       // cache ultimo risultato
};

// ── Campionamento dalla matrice di transizione ────────────────
function _sampleNextRegime(currentKey) {
  const row = ECO_TRANSITION[currentKey] || ECO_TRANSITION.normal_growth;
  let r = Math.random(), cumul = 0;
  for (const [k, p] of Object.entries(row)) {
    cumul += p;
    if (r <= cumul) return k;
  }
  return ECO_KEYS[ECO_KEYS.length - 1];
}

// ── Costruisce la sequenza di regimi per un percorso (modo auto) ─
// Ritorna array[0..years-1] dove ogni elemento è la chiave del regime
// attivo in quell'anno. Anno 0 = startRegime.
function _buildRegimeSequence(startKey, years) {
  const seq = [];
  let cur = startKey;
  for (let y = 0; y < years; y++) {
    seq.push(cur);
    cur = _sampleNextRegime(cur);
  }
  return seq;
}

// ── Costruisce la sequenza di regimi per un percorso (modo manuale) ─
// Espande [{key, years}] in un array[0..totalYears-1].
// Se la sequenza è più corta del piano, l'ultimo regime si estende fino alla fine.
function _expandManualSeq(manualSeq, totalYears) {
  const seq = [];
  for (const { key, years: d } of manualSeq) {
    for (let i = 0; i < d && seq.length < totalYears; i++) seq.push(key);
  }
  // Riempi eventuale residuo con l'ultimo regime della sequenza
  const last = manualSeq[manualSeq.length - 1]?.key || 'normal_growth';
  while (seq.length < totalYears) seq.push(last);
  return seq;
}

// ── Core: proietta un singolo percorso data una sequenza di regimi ──
// Restituisce il valore finale e l'array di valori anno per anno.
function _projectOnePathMultiRegime(regimeSeq) {
  const { w, age, years, portfolio, pics, exps, ter, pac } = state;
  const terRate = ter / 100;
  const vals = [w];
  let cW = w, cumInfl = 1;

  for (let y = 1; y <= years; y++) {
    const ecoKey  = regimeSeq[y - 1];      // regime attivo anno y
    const eco     = ECO_SCENARIOS[ecoKey] || ECO_SCENARIOS.normal_growth;
    const curAge  = age + y;

    // Costruisce una finestra "intera" per getRateEco (l'anno è sempre "in regime")
    const fakeWin = { s: y, e: y };
    const mu = getRateEco(portfolio, ecoKey, y, age, fakeWin);

    // Volatilità × moltiplicatore di regime
    const volBase = getPortfolioVol(portfolio, curAge);
    const vol     = volBase * eco.volMult;

    // Correzione Itō (uguale al MC principale)
    const mu_arith = mu + 0.5 * vol * vol;
    const r        = mu_arith + vol * randn_bm() - terRate;

    // Inflazione stocastica del regime (clamp ±3σ)
    const iMean = eco.inflMean  / 100;
    const iSig  = eco.inflSigma / 100;
    const iRaw  = iMean + iSig * randn_bm();
    const inflY = Math.max(iMean - 3 * iSig, Math.min(iMean + 3 * iSig, iRaw));
    cumInfl *= (1 + inflY);

    const annPac = getPacForYear(y) * 12;
    const pic    = pics.filter(p => +p.year === y).reduce((s, p) => s + (+p.amount || 0), 0);
    const exp    = exps.filter(e => +e.year === y).reduce((s, e) => s + (+e.amount || 0), 0);

    const midW = cW + (annPac + pic - exp) / 2;
    cW += annPac + pic - exp + midW * r;
    cW  = Math.max(0, cW);
    vals.push(cW);
  }
  return { vals, finalVal: cW };
}

// ── Motore MC multi-regime principale ─────────────────────────
// N = 1000 percorsi. Ritorna strutture per grafico + statistiche.
function runMultiRegimeMC(N = 1000) {
  const { years, age, opt } = state;
  const mode     = multiRegimeState.mode;
  const startKey = multiRegimeState.startRegime;

  const timeSeries = Array.from({ length: years + 1 }, () => []);
  // Conta frequenza regime per anno (per heatmap / regime più frequente)
  const regimeFreq = Array.from({ length: years }, () => ({}));

  for (let i = 0; i < N; i++) {
    let regSeq;
    if (mode === 'auto') {
      regSeq = _buildRegimeSequence(startKey, years);
    } else {
      regSeq = _expandManualSeq(multiRegimeState.manualSeq, years);
      // In modo manuale ogni percorso ha stessa sequenza deterministica di regimi
      // ma rendimenti e inflazione restano stocastici → distribuzione valida
    }

    // Conta frequenza regimi per anno
    regSeq.forEach((k, y) => {
      regimeFreq[y][k] = (regimeFreq[y][k] || 0) + 1;
    });

    const { vals } = _projectOnePathMultiRegime(regSeq);
    vals.forEach((v, y) => timeSeries[y].push(v));
  }

  // Percentili anno per anno
  const pct = (arr, p) => {
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length * p)] ?? 0;
  };
  const p10 = [], p25 = [], p50 = [], p75 = [], p90 = [], mean = [];
  for (let y = 0; y <= years; y++) {
    const ts = timeSeries[y];
    p10.push(pct(ts, .10));
    p25.push(pct(ts, .25));
    p50.push(pct(ts, .50));
    p75.push(pct(ts, .75));
    p90.push(pct(ts, .90));
    mean.push(ts.reduce((a, b) => a + b, 0) / ts.length);
  }

  // Tasso di successo
  const finals = timeSeries[years];
  const successRate = opt > 0
    ? (finals.filter(v => v >= opt).length / N * 100)
    : null;

  // Regime più frequente per anno (per annotazione grafico)
  const dominantRegime = regimeFreq.map(freq =>
    Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'normal_growth'
  );

  // Frequenze globali (% tempo in ciascun regime, media su tutti i percorsi)
  const globalFreq = {};
  for (const k of ECO_KEYS) globalFreq[k] = 0;
  regimeFreq.forEach(freq => {
    for (const [k, c] of Object.entries(freq)) globalFreq[k] = (globalFreq[k] || 0) + c;
  });
  const totalSlots = years * N;
  for (const k of ECO_KEYS) globalFreq[k] = (globalFreq[k] / totalSlots * 100);

  return { p10, p25, p50, p75, p90, mean, successRate, dominantRegime, globalFreq, N, finals };
}

// ── Render sezione multi-regime ───────────────────────────────
let chartMultiRegime = null;

function renderMultiRegime() {
  const { years, age, opt } = state;
  const ages = Array.from({ length: years + 1 }, (_, i) => age + i);

  // Calcola baseline deterministica per confronto
  const seqOn = state.seq && state.seq.on;
  const dBase  = project('normal', seqOn);
  const vBase  = dBase.map(d => d.value);

  const res = runMultiRegimeMC(1000);
  multiRegimeState.lastResult = res;

  // ── KPI cards ────────────────────────────────────────────────
  const succColor = res.successRate === null ? 'var(--text3)'
    : res.successRate >= 70 ? 'var(--green)'
    : res.successRate >= 40 ? 'var(--orange)'
    : 'var(--red)';
  const succTxt = res.successRate !== null ? res.successRate.toFixed(1) + '%' : '—';
  const optNote = opt > 0
    ? `soglia ${fmt(opt)}`
    : 'imposta optionality nel Simulatore';

  // Top-3 regimi per frequenza
  const topRegimes = Object.entries(res.globalFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, pct]) => `${ECO_SCENARIOS[k].emoji} ${ECO_SCENARIOS[k].label} ${pct.toFixed(0)}%`)
    .join(' · ');

  document.getElementById('mrKpi').innerHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">
      <div class="mcard">
        <div class="ml">Mediana finale (P50)</div>
        <div class="mv" style="color:var(--text);font-size:17px">${fmt(res.p50[years])}</div>
        <div class="ms">1.000 percorsi multi-regime</div>
      </div>
      <div class="mcard">
        <div class="ml">Range P10–P90</div>
        <div class="mv" style="font-size:14px;color:var(--text2)">${fmt(res.p10[years])} – ${fmt(res.p90[years])}</div>
        <div class="ms">intervallo 80% dei percorsi</div>
      </div>
      <div class="mcard">
        <div class="ml">Prob. successo</div>
        <div class="mv" style="color:${succColor};font-size:17px">${succTxt}</div>
        <div class="ms">${optNote}</div>
      </div>
      <div class="mcard">
        <div class="ml">Baseline (deterministico)</div>
        <div class="mv" style="color:var(--blue);font-size:17px">${fmt(vBase[years])}</div>
        <div class="ms">crescita normale senza regime</div>
      </div>
    </div>
    <div style="font-size:12px;color:var(--text3);font-family:'DM Mono',monospace;margin-bottom:4px">
      Regimi più frequenti nella simulazione: <strong style="color:var(--text2)">${topRegimes}</strong>
    </div>`;

  // ── Grafico ──────────────────────────────────────────────────
  if (chartMultiRegime) { chartMultiRegime.destroy(); chartMultiRegime = null; }
  const gC = 'rgba(0,0,0,.05)', tC = 'rgba(0,0,0,.45)';

  chartMultiRegime = new Chart(document.getElementById('chMultiRegime'), {
    type: 'line',
    data: {
      labels: ages,
      datasets: [
        // Banda esterna P10–P90
        { label: 'P10', data: res.p10, borderColor: 'transparent', backgroundColor: 'rgba(100,100,200,.10)', pointRadius: 0, fill: '+1', tension: .35, borderWidth: 0 },
        { label: 'P90', data: res.p90, borderColor: 'rgba(100,100,200,.25)', backgroundColor: 'rgba(100,100,200,.10)', pointRadius: 0, fill: false, tension: .35, borderWidth: 1, borderDash: [3, 3] },
        // Banda interna P25–P75
        { label: 'P25', data: res.p25, borderColor: 'transparent', backgroundColor: 'rgba(100,100,200,.15)', pointRadius: 0, fill: '+1', tension: .35, borderWidth: 0 },
        { label: 'P75', data: res.p75, borderColor: 'transparent', backgroundColor: 'rgba(100,100,200,.15)', pointRadius: 0, fill: false, tension: .35, borderWidth: 0 },
        // Mediana
        { label: 'Mediana (P50)', data: res.p50, borderColor: '#5c6bc0', borderWidth: 2.5, pointRadius: 0, fill: false, tension: .35 },
        // Media
        { label: 'Media', data: res.mean, borderColor: '#9c27b0', borderWidth: 1.5, borderDash: [5, 4], pointRadius: 0, fill: false, tension: .35 },
        // Baseline deterministica
        { label: 'Base (crescita normale)', data: vBase, borderColor: '#1a73e8', borderWidth: 2, pointRadius: 0, fill: false, tension: .35, borderDash: [6, 3] },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            font: { family: 'DM Mono', size: 11 }, boxWidth: 16,
            filter: item => !['P10', 'P25', 'P75'].includes(item.text),
          }
        },
        tooltip: {
          callbacks: {
            title: c => 'Età ' + c[0].label,
            label: c => {
              if (['P10', 'P25', 'P75'].includes(c.dataset.label)) return null;
              return ' ' + c.dataset.label + ': ' + fmt(c.raw);
            },
            afterBody: items => {
              const idx = ages.indexOf(items[0].label);
              if (idx < 0) return [];
              return [
                ' ─────────────────────',
                ' P10: ' + fmt(res.p10[idx]),
                ' P25: ' + fmt(res.p25[idx]),
                ' P75: ' + fmt(res.p75[idx]),
                ' P90: ' + fmt(res.p90[idx]),
              ];
            }
          },
          filter: item => !['P10', 'P25', 'P75'].includes(item.dataset.label),
          backgroundColor: '#fff', borderColor: '#dadce0', borderWidth: 1,
          titleColor: '#202124', bodyColor: '#5f6368', padding: 10,
        }
      },
      scales: {
        x: { ticks: { color: tC, font: { size: 11, family: 'DM Mono' }, maxTicksLimit: 12 }, grid: { color: gC } },
        y: { ticks: { color: tC, font: { size: 11, family: 'DM Mono' }, callback: v => fmt(v) }, grid: { color: gC } }
      }
    },
    plugins: [{
      id: 'mrOpt', afterDraw(c) {
        const { ctx, scales: { x, y } } = c;
        if (opt >= y.min && opt <= y.max) {
          const yp = y.getPixelForValue(opt);
          ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(x.left, yp); ctx.lineTo(x.right, yp); ctx.stroke();
          ctx.setLineDash([]); ctx.font = '10px DM Mono,monospace'; ctx.fillStyle = 'rgba(0,0,0,.3)';
          ctx.fillText('💎 optionality', x.left + 6, yp - 4); ctx.restore();
        }
      }
    }]
  });

  // ── Heatmap regimi (barra colorata per anno) ─────────────────
  // Mostra il regime DOMINANTE (più frequente tra i 1000 percorsi) per ogni anno.
  const heatCells = res.dominantRegime.map((k, y) => {
    const eco = ECO_SCENARIOS[k];
    const freq = (res.lastResult?.globalFreq?.[k] ?? ((multiRegimeState.lastResult?.lastResult?.globalFreq ?? res.globalFreq)[k] ?? 0));
    // Usa la frequenza in quell'anno specifico
    return `<div title="Anno ${y + 1}: regime dominante ${eco.label}"
                 style="flex:1;height:18px;background:${eco.color};opacity:.75;min-width:2px;cursor:default"></div>`;
  }).join('');

  // Frequenza regime per anno (per tooltip preciso) — calcolata inline
  document.getElementById('mrHeatmap').innerHTML = `
    <div style="font-size:11px;color:var(--text3);font-family:'DM Mono',monospace;margin-bottom:4px">
      Regime dominante per anno (tra i 1000 percorsi simulati):
    </div>
    <div style="display:flex;gap:1px;border-radius:4px;overflow:hidden">${heatCells}</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px">
      ${ECO_KEYS.map(k => `<div style="display:flex;align-items:center;gap:4px;font-size:11px;font-family:'DM Mono',monospace">
        <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${ECO_SCENARIOS[k].color}"></span>
        ${ECO_SCENARIOS[k].emoji} ${ECO_SCENARIOS[k].label} — ${res.globalFreq[k].toFixed(1)}% del tempo
      </div>`).join('')}
    </div>`;

  // ── Tabella percentili finale ─────────────────────────────────
  const stp = Math.max(1, Math.floor(years / 10));
  const tableRows = [];
  for (let y = 0; y <= years; y += (y === 0 ? 1 : stp)) {
    const bv    = vBase[y] ?? 0;
    const delta = res.p50[y] - bv;
    tableRows.push(`<tr>
      <td><strong>${ages[y]}</strong></td>
      <td>+${y}a</td>
      <td style="color:var(--blue)">${fmt(bv)}</td>
      <td style="color:#b0bec5">${fmt(res.p10[y])}</td>
      <td style="color:#7986cb">${fmt(res.p25[y])}</td>
      <td style="font-weight:700;color:#5c6bc0">${fmt(res.p50[y])}</td>
      <td style="color:#7986cb">${fmt(res.p75[y])}</td>
      <td style="color:#b0bec5">${fmt(res.p90[y])}</td>
      <td class="${delta >= 0 ? 'pos' : 'neg'}">${delta >= 0 ? '+' : ''}${fmt(delta)}</td>
    </tr>`);
  }
  // Assicura che l'anno finale sia sempre presente
  if (years % stp !== 0) {
    const bv    = vBase[years] ?? 0;
    const delta = res.p50[years] - bv;
    tableRows.push(`<tr>
      <td><strong>${ages[years]}</strong></td>
      <td>+${years}a</td>
      <td style="color:var(--blue)">${fmt(bv)}</td>
      <td style="color:#b0bec5">${fmt(res.p10[years])}</td>
      <td style="color:#7986cb">${fmt(res.p25[years])}</td>
      <td style="font-weight:700;color:#5c6bc0">${fmt(res.p50[years])}</td>
      <td style="color:#7986cb">${fmt(res.p75[years])}</td>
      <td style="color:#b0bec5">${fmt(res.p90[years])}</td>
      <td class="${delta >= 0 ? 'pos' : 'neg'}">${delta >= 0 ? '+' : ''}${fmt(delta)}</td>
    </tr>`);
  }

  document.getElementById('mrTable').innerHTML = `
    <div class="tbl-outer"><table>
      <thead><tr>
        <th style="text-align:left">Età</th>
        <th>Anno</th>
        <th>Base</th>
        <th>P10</th>
        <th>P25</th>
        <th>Mediana</th>
        <th>P75</th>
        <th>P90</th>
        <th>Δ vs Base</th>
      </tr></thead>
      <tbody>${tableRows.join('')}</tbody>
    </table></div>`;
}

// ── UI: render pannello controlli modalità auto/manuale ────────
function renderMultiRegimeControls() {
  const mode = multiRegimeState.mode;

  // Toggle auto/manuale
  document.querySelectorAll('#mrModeBtns .gbtn').forEach(b =>
    b.classList.toggle('a-blue', b.dataset.mr === mode));

  // Pannello auto
  const autoPanel = document.getElementById('mrAutoPanel');
  const manPanel  = document.getElementById('mrManualPanel');
  if (autoPanel) autoPanel.style.display = mode === 'auto' ? '' : 'none';
  if (manPanel)  manPanel.style.display  = mode === 'manual' ? '' : 'none';

  // Aggiorna regime iniziale auto
  document.querySelectorAll('#mrStartBtns .gbtn').forEach(b =>
    b.classList.toggle('a-blue', b.dataset.sr === multiRegimeState.startRegime));

  // Render lista sequenza manuale
  renderManualSeqList();
}

// ── Render lista fasi sequenza manuale ───────────────────────
function renderManualSeqList() {
  const container = document.getElementById('mrManualList');
  if (!container) return;
  const seq = multiRegimeState.manualSeq;

  if (!seq.length) {
    container.innerHTML = `<div style="color:var(--text3);font-size:12.5px;padding:8px 0">
      Nessuna fase aggiunta. Usa il pulsante + per costruire la sequenza.</div>`;
    return;
  }

  const totalY = seq.reduce((s, f) => s + f.years, 0);
  container.innerHTML = seq.map((f, i) => {
    const eco = ECO_SCENARIOS[f.key];
    return `<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;margin-bottom:4px;
                background:${eco.bg};border:1px solid ${eco.color}44;border-radius:var(--radius-sm)">
      <span style="font-size:16px">${eco.emoji}</span>
      <span style="flex:1;font-size:13px;font-weight:600;color:${eco.color}">${eco.label}</span>
      <input type="number" min="1" max="40" value="${f.years}"
             style="width:52px;font-family:'DM Mono',monospace;font-size:12px;border:1px solid var(--border2);
                    border-radius:4px;padding:3px 6px;background:var(--bg);color:var(--text);text-align:right"
             onchange="multiRegimeState.manualSeq[${i}].years=Math.max(1,+this.value);renderManualSeqList()">
      <span style="font-size:11.5px;color:var(--text3)">anni</span>
      <button class="dbtn" onclick="multiRegimeState.manualSeq.splice(${i},1);renderManualSeqList()" title="Rimuovi">✕</button>
    </div>`;
  }).join('');

  // Totale anni e avviso se supera il piano
  const planY = state.years;
  const warnHtml = totalY !== planY
    ? `<div style="font-size:11.5px;margin-top:6px;color:${totalY < planY ? 'var(--orange)' : 'var(--text3)'}">
        Totale: <strong>${totalY} anni</strong> su ${planY} del piano.
        ${totalY < planY ? `L\'ultimo regime si estende per i restanti ${planY - totalY} anni.` : totalY > planY ? 'La sequenza supera il piano — gli anni extra saranno ignorati.' : ''}
      </div>`
    : `<div style="font-size:11.5px;margin-top:6px;color:var(--green)">✓ Sequenza: ${totalY} anni = piano completo.</div>`;
  container.insertAdjacentHTML('beforeend', warnHtml);
}

// ── Aggiunge una fase alla sequenza manuale ───────────────────
window.mrAddPhase = function(key) {
  multiRegimeState.manualSeq.push({ key, years: ECO_SCENARIOS[key]?.duration < 99 ? ECO_SCENARIOS[key].duration : 5 });
  renderManualSeqList();
};

// ── Init sezione multi-regime (chiamato da switchTab) ─────────
window.initMultiRegime = function() {
  renderMultiRegimeControls();
  // Non lancia subito la simulazione — aspetta che l'utente prema "Lancia"
  // per evitare calcolo automatico ogni volta che si apre la tab
  const resultArea = document.getElementById('mrResults');
  if (resultArea && !multiRegimeState.lastResult) {
    resultArea.style.display = 'none';
    document.getElementById('mrPlaceholder').style.display = '';
  }
};

// ── Lancia la simulazione (bottone) ──────────────────────────
window.launchMultiRegime = function() {
  document.getElementById('mrPlaceholder').style.display = 'none';
  document.getElementById('mrResults').style.display = '';
  renderMultiRegime();
};

// ══════════════════════════════════════════════════════════════
// TAB A/B
// ══════════════════════════════════════════════════════════════
let chartAB = null;
function renderAB() {
  const dA = project('best', false), dAn = project('normal', false), dAw = project('worst', false);
  const pacBoverride = stateB.pac >= 0 ? stateB.pac : state.pac;
  const dBb = projectWithOverrides({ portfolio: stateB.portfolio, ter: stateB.ter, pac: pacBoverride }, 'best');
  const dBn = projectWithOverrides({ portfolio: stateB.portfolio, ter: stateB.ter, pac: pacBoverride }, 'normal');
  const dBw = projectWithOverrides({ portfolio: stateB.portfolio, ter: stateB.ter, pac: pacBoverride }, 'worst');
  const ages = dAn.map(d => d.age);
  const { years, age } = state, endAge = age + years;
  const pA = getPortParams(state.portfolio);

  // ── Sync banner: mostra esattamente cosa è condiviso tra A e B ──
  const picCount = state.pics.length, expCount = state.exps.length, pacChgCount = state.pacChanges.length;
  const sharedItems = [
    `<strong>${fmt(state.w)}</strong> patrimonio`,
    `<strong>${state.years} anni</strong>`,
    `<strong>età ${state.age}</strong>`,
    `<strong>${state.taxEq.toFixed(0)}%/${state.taxOb.toFixed(0)}%</strong> tasse Az/Ob`,
    ...(picCount > 0    ? [`<strong>${picCount} PIC</strong> aggiuntivi (condivisi)`] : []),
    ...(expCount > 0    ? [`<strong>${expCount} spese</strong> straordinarie (condivise)`] : []),
    ...(pacChgCount > 0 ? [`<strong>${pacChgCount} variaz.</strong> PAC base (condivise)`] : []),
  ];
  const syncEl = document.getElementById('abSyncDetails');
  if (syncEl) syncEl.innerHTML = sharedItems.join(' · ') + (picCount + expCount > 0
    ? `<span style="margin-left:8px;color:var(--orange);font-size:11px">⚠ PIC e spese identici per entrambi i portafogli</span>` : '');

  document.getElementById('ab-a-info').innerHTML = `<div style="display:flex;gap:20px;flex-wrap:wrap;font-size:12.5px"><div><strong>${pA?.label ?? state.portfolio}</strong></div><div>TER: <strong>${state.ter.toFixed(2)}%</strong></div><div>PAC: <strong>${fmt(state.pac)}/m</strong></div>${pA && pA.normal ? `<div>Rend. base: <strong>${((pA.normal - state.ter / 100) * 100).toFixed(2)}%</strong>/a</div>` : ''}</div><div style="margin-top:8px;font-size:12px;color:var(--text2)">Valore finale base: <strong style="color:var(--blue)">${fmt(dAn[years].value)}</strong></div>`;
  if (chartAB) { chartAB.destroy(); chartAB = null; }
  const ds = [
    { label: 'A Ott.', data: dA.map(d => d.value), borderColor: 'rgba(26,115,232,.4)', borderWidth: 1, pointRadius: 0, fill: false, tension: .35, borderDash: [4, 3] },
    { label: 'A Base', data: dAn.map(d => d.value), borderColor: '#1a73e8', borderWidth: 3, pointRadius: 0, fill: false, tension: .35 },
    { label: 'A Pess.', data: dAw.map(d => d.value), borderColor: 'rgba(26,115,232,.4)', borderWidth: 1, pointRadius: 0, fill: false, tension: .35, borderDash: [4, 3] },
    { label: 'B Ott.', data: dBb.map(d => d.value), borderColor: 'rgba(147,52,230,.4)', borderWidth: 1, pointRadius: 0, fill: false, tension: .35, borderDash: [4, 3] },
    { label: 'B Base', data: dBn.map(d => d.value), borderColor: '#9334e6', borderWidth: 3, pointRadius: 0, fill: false, tension: .35 },
    { label: 'B Pess.', data: dBw.map(d => d.value), borderColor: 'rgba(147,52,230,.4)', borderWidth: 1, pointRadius: 0, fill: false, tension: .35, borderDash: [4, 3] },
  ];
  const gC = 'rgba(0,0,0,.05)', tC = 'rgba(0,0,0,.45)';
  chartAB = new Chart(document.getElementById('chAB'), { type: 'line', data: { labels: ages, datasets: ds }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { filter: i => ['A Base', 'B Base'].includes(i.dataset.label), callbacks: { title: c => 'Età ' + c[0].label, label: c => ' ' + c.dataset.label + ': ' + fmt(c.raw) }, backgroundColor: '#fff', borderColor: '#dadce0', borderWidth: 1, titleColor: '#202124', bodyColor: '#5f6368', padding: 10 } }, scales: { x: { ticks: { color: tC, font: { size: 11, family: 'DM Mono' }, maxTicksLimit: 12 }, grid: { color: gC } }, y: { ticks: { color: tC, font: { size: 11, family: 'DM Mono' }, callback: v => fmt(v) }, grid: { color: gC } } } } });
  const invA = dAn[years].invested, invB = dBn[years].invested;
  const txFA = blendedTaxRate(endAge);
  // FIX #M1: usa blendedTaxRate() per portafoglio B (include oro e cash a taxEq=26%)
  // Precedentemente: (eqB * taxEq + (1-eqB) * taxOb) assegnava taxOb a oro/cash erroneamente
  const _savedPort = state.portfolio;
  state.portfolio = stateB.portfolio;
  const txFB = blendedTaxRate(endAge);
  state.portfolio = _savedPort;
  const nA = calcNetNom(dAn[years].value, invA, txFA), nB = calcNetNom(dBn[years].value, invB, txFB);
  const delta = dBn[years].value - dAn[years].value, deltaN = nB - nA;
  const mRows = [
    ['Valore finale lordo (base)', fmt(dAn[years].value), fmt(dBn[years].value), (delta >= 0 ? '+' : '') + fmt(delta)],
    ['Valore finale (ottimistico)', fmt(dA[years].value), fmt(dBb[years].value), '—'],
    ['Valore finale (pessimistico)', fmt(dAw[years].value), fmt(dBw[years].value), '—'],
    ['Totale versato', fmt(invA), fmt(invB), '—'],
    ['Moltiplicatore', '×' + (dAn[years].value / invA).toFixed(2), '×' + (dBn[years].value / invB).toFixed(2), 'Δ ' + ((dBn[years].value / invB - dAn[years].value / invA)).toFixed(2) + 'x'],
    ['Netto fiscale finale', fmt(nA), fmt(nB), (deltaN >= 0 ? '+' : '') + fmt(deltaN)],
  ];
  document.getElementById('ab-metrics').innerHTML = `<div class="tbl-outer"><table><thead><tr><th style="text-align:left">Metrica</th><th style="color:var(--blue)">A — ${pA?.label ?? state.portfolio}</th><th style="color:var(--purple)">B — ${PORT[stateB.portfolio]?.label ?? stateB.portfolio}</th><th>Δ (B−A)</th></tr></thead><tbody>${mRows.map(r => `<tr><td style="text-align:left">${r[0]}</td><td style="color:var(--blue);font-weight:600">${r[1]}</td><td style="color:var(--purple);font-weight:600">${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table></div>`;
  const gainA = Math.max(0, dAn[years].value - invA), gainB = Math.max(0, dBn[years].value - invB);
  document.getElementById('ab-fiscal').innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="liq-card" style="border:1px solid rgba(26,115,232,.3)"><div class="liq-card-title" style="color:var(--blue)">A — ${pA?.label ?? state.portfolio}</div><div class="liq-row"><span style="color:var(--text2)">Lordo</span><strong>${fmt(dAn[years].value)}</strong></div><div class="liq-row" style="color:var(--red)"><span>Tasse CG (${(txFA * 100).toFixed(1)}%)</span><span>−${fmt(gainA * txFA)}</span></div><div class="liq-row" style="border-top:1px solid var(--border);padding-top:8px;margin-bottom:0"><strong style="color:var(--blue)">Netto</strong><strong style="color:var(--blue);font-size:15px">${fmt(nA)}</strong></div></div><div class="liq-card" style="border:1px solid rgba(147,52,230,.3)"><div class="liq-card-title" style="color:var(--purple)">B — ${PORT[stateB.portfolio]?.label ?? stateB.portfolio}</div><div class="liq-row"><span style="color:var(--text2)">Lordo</span><strong>${fmt(dBn[years].value)}</strong></div><div class="liq-row" style="color:var(--red)"><span>Tasse CG (${(txFB * 100).toFixed(1)}%)</span><span>−${fmt(gainB * txFB)}</span></div><div class="liq-row" style="border-top:1px solid var(--border);padding-top:8px;margin-bottom:0"><strong style="color:var(--purple)">Netto</strong><strong style="color:var(--purple);font-size:15px">${fmt(nB)}</strong></div></div></div><div style="margin-top:10px;padding:10px 14px;background:${deltaN >= 0 ? 'var(--green-dim)' : 'var(--red-dim)'};border-radius:var(--radius-sm);font-size:13px;color:${deltaN >= 0 ? 'var(--green)' : 'var(--red)'};font-weight:600">Portafoglio B porta ${deltaN >= 0 ? '+' + fmt(deltaN) + ' netti IN PIÙ rispetto ad A' : fmt(Math.abs(deltaN)) + ' netti IN MENO rispetto ad A'} in scenario base.</div>`;
  const step = Math.max(1, Math.floor(years / 12));
  const rowsAB = []; for (let i = 0; i <= years; i += step) rowsAB.push(i);
  document.getElementById('ab-table').innerHTML = rowsAB.map(i => {
    const vA = dAn[i].value, vBv = dBn[i].value, d = vBv - vA, dp = vA > 0 ? (d / vA * 100) : 0;
    const cls = d > 0 ? 'pos' : d < 0 ? 'neg' : 'neutral';
    return `<tr><td><strong>${state.age + i}</strong></td><td>+${i}a</td><td style="color:var(--blue);font-weight:600">${fmt(vA)}</td><td style="color:var(--purple);font-weight:600">${fmt(vBv)}</td><td class="${cls}">${d >= 0 ? '+' : ''}${fmt(d)}</td><td class="${cls}">${d >= 0 ? '+' : ''}${dp.toFixed(1)}%</td></tr>`;
  }).join('');
}
document.getElementById('abAllocBtns').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; stateB.portfolio = b.dataset.k; document.querySelectorAll('#abAllocBtns .gbtn').forEach(x => x.classList.remove('a-purple')); b.classList.add('a-purple'); renderAB(); };

// ══════════════════════════════════════════════════════════════
// TAB MC SUCCESS
// ══════════════════════════════════════════════════════════════
function runSuccessMC() {
  const btn = event.target; btn.disabled = true; btn.textContent = '⏳ Calcolo...';
  setTimeout(() => {
    const { w, age, years, portfolio, ter, pics, exps } = state;
    const { withdrawal, years: wY, inflation: wI } = mcState;
    const N = 1000, terRate = ter / 100;
    const inflRate = wI / 100;
    const retAge = age + years; // età all'inizio del decumulo
    let successes = 0;
    const finalVals = [], ruinYears = [];
    for (let i = 0; i < N; i++) {
      let cW = w;
      // Fase accumulo — Gaussiano log-normale corretto (stesso metodo di runMontecarlo)
      // Correzione Ito: mu_arith = mu_geo + σ²/2  →  E[CAGR] = mu_geo = PORT.normal
      // Senza correzione il P50 accumulo sarebbe ~17% sotto la linea Base su 35 anni.
      for (let y = 1; y <= years; y++) {
        const annPac = getPacForYear(y) * 12;
        const pic = pics.filter(p => +p.year === y).reduce((s, p) => s + (+p.amount || 0), 0);
        const exp = exps.filter(e => +e.year === y).reduce((s, e) => s + (+e.amount || 0), 0);
        const mu  = getRate(portfolio, 'normal', y, age);
        const vol = getPortfolioVol(portfolio, age + y);
        const mu_arith = mu + 0.5 * vol * vol;         // correzione log-normale (Itō)
        const r   = mu_arith + vol * randn_bm() - terRate;
        const midW = cW + (annPac + pic - exp) / 2;
        cW += annPac + pic - exp + midW * r;
      }
      let wd = withdrawal, ruined = false;
      // Fase prelievo — stesso portafoglio, età progredisce dal retAge
      for (let y = 1; y <= wY; y++) {
        if (cW <= 0) { ruined = true; ruinYears.push(y - 1); break; }
        if (y > 1) wd *= (1 + inflRate);
        const wAge = retAge + y;
        const mu  = getRate(portfolio, 'normal', y, retAge);
        const vol = getPortfolioVol(portfolio, wAge);
        const mu_arith = mu + 0.5 * vol * vol;         // correzione log-normale (Itō)
        const r   = mu_arith + vol * randn_bm() - terRate;
        const midW = Math.max(0, cW - wd / 2);
        cW += midW * r - wd;
      }
      if (!ruined && cW > 0) successes++;
      else if (!ruined && cW <= 0) ruinYears.push(wY);
      finalVals.push(Math.max(0, cW));
    }
    finalVals.sort((a, b) => a - b);
    const sr = successes / N * 100;
    const avgRuinYear = ruinYears.length > 0 ? (ruinYears.reduce((a, b) => a + b, 0) / ruinYears.length).toFixed(1) : null;
    const col = sr >= 90 ? 'var(--green)' : sr >= 80 ? 'var(--orange)' : sr >= 70 ? '#e65100' : 'var(--red)';
    const label = sr >= 90 ? 'Piano molto solido ✅' : sr >= 80 ? 'Piano accettabile ⚠️' : sr >= 70 ? 'Piano a rischio 🔶' : 'Piano critico — revisione necessaria ❌';
    const desc = sr >= 90 ? `Il portafoglio rimane positivo in ${successes}/1.000 scenari. Robusto (soglia professionale: >90%).` : sr >= 80 ? `Fallisce in ${N - successes}/1.000 scenari. Accettabile ma con margine ridotto.` : `Fallisce in ${N - successes}/1.000 scenari. Considera di ridurre il prelievo o aumentare il patrimonio.`;
    lastMCSuccessResult = { sr, successes, N, label, desc, avgRuinYear, p10: finalVals[Math.floor(N * .10)], p50: finalVals[Math.floor(N * .50)], p90: finalVals[Math.floor(N * .90)], withdrawal, wY, wI, years, portfolio, ter };
    document.getElementById('mc-success-result').innerHTML = `
      <div class="success-display sec" style="border-color:${col};background:${sr >= 90 ? 'var(--green-dim)' : sr >= 80 ? 'var(--orange-dim)' : sr >= 70 ? 'rgba(230,81,0,.08)' : 'var(--red-dim)'}">
        <div class="success-pct" style="color:${col}">${sr.toFixed(1)}%</div>
        <div style="font-size:16px;font-weight:600;margin-top:8px;color:${col}">${label}</div>
        <div style="font-size:13px;margin-top:6px;color:var(--text2)">${desc}</div>
        <div class="success-bar"><div class="success-bar-fill" style="width:${sr}%;background:${col}">${sr.toFixed(0)}%</div></div>
      </div>
      <div class="grid-3" style="margin-bottom:10px">
        <div class="mc-box"><div class="mc-lbl">Successi</div><div class="mc-val" style="color:var(--green)">${successes}/1.000</div></div>
        <div class="mc-box"><div class="mc-lbl">Fallimenti</div><div class="mc-val" style="color:var(--red)">${N - successes}/1.000</div></div>
        <div class="mc-box"><div class="mc-lbl">Anno rovina (med.)</div><div class="mc-val" style="color:var(--orange)">${avgRuinYear ? 'Anno ' + avgRuinYear : '—'}</div></div>
      </div>
      <div class="sec"><div class="sec-label">Patrimonio residuo a fine prelievo</div>
        <div class="mc-grid">
          <div class="mc-box"><div class="mc-lbl">10° percentile</div><div class="mc-val" style="color:var(--orange)">${fmt(finalVals[Math.floor(N * .10)])}</div></div>
          <div class="mc-box"><div class="mc-lbl">Mediana</div><div class="mc-val" style="color:var(--blue)">${fmt(finalVals[Math.floor(N * .50)])}</div></div>
          <div class="mc-box"><div class="mc-lbl">90° percentile</div><div class="mc-val" style="color:var(--green)">${fmt(finalVals[Math.floor(N * .90)])}</div></div>
        </div>
      </div>`;
    btn.disabled = false; btn.textContent = '🎯 Calcola Probabilità';
  }, 80);
}

// ══════════════════════════════════════════════════════════════
// TAB DECUMULO — Guyton-Klinger corretto
// ══════════════════════════════════════════════════════════════
function simulateDecumulo(sc) {
  const { startPortfolio: sP, withdrawal: w0, years: Y, portfolio: port, strategy: strat, inflation: infl, ter, ecoScenario, ecoTiming } = decState;
  const terRate = ter / 100, inflRate = infl / 100;
  const initialWithdrawalRate = sP > 0 ? w0 / sP : 0;
  // Età di inizio decumulo — usata per lifecycle weight corretto
  const decStartAge = state.age + state.years;
  let cW = sP, wd = w0, prevReturn = null;
  // Traccia il costo medio ponderato per calcolare la quota di plusvalenza
  // tassabile ad ogni prelievo (metodo del costo medio, regime amministrato ETF UCITS)
  let totalCostBasis = sP; // all'inizio il costo base = capitale importato
  const ecoWin = ecoScenario ? getEcoWindow(ecoScenario, Y, ecoTiming) : null;

  // ── Sequence risk in DECUMULO ────────────────────────────────────────────────
  // Il rischio di sequenza è il pericolo PIÙ rilevante in fase di decumulo: un crash
  // nei primi anni, mentre si preleva, costringe a vendere quote in perdita ed erode
  // il capitale in modo potenzialmente irreversibile (a differenza dell'accumulo, dove
  // un crash iniziale fa comprare a sconto). Qui iniettiamo uno/più crash deterministici
  // nell'anno scelto dal timing, usando lo stesso modello di crash beta del Simulatore
  // (commodity/carry partecipano, trend fa crisis alpha, difensivi → rally).
  const decSeq = decState.seq || { on: false };
  const decCrashMap = {};
  if (decSeq.on) {
    const eqCRdec = (SEQ_RATES[decSeq.severity] ?? -0.35);
    const decCrashYears = getCrashYears(decSeq.mode || 'single', decSeq.timing, Y);
    decCrashYears.forEach((cy, idx) => {
      const sf = idx === 0 ? 1.0 : idx === 1 ? 0.65 : 0.45;
      const cw = getCrashWeights(port, decStartAge + cy);
      const sev = eqCRdec * sf;
      decCrashMap[cy] = sev * cw.eq
        + sev * CRASH_BETA.commodity * cw.commodW
        + sev * CRASH_BETA.carry     * cw.carryW
        + sev * CRASH_BETA.trend     * cw.trendW
        + BOND_RALLY_RATE            * cw.defensive;
    });
  }

  const data = [];
  for (let y = 1; y <= Y; y++) {
    if (cW <= 0) { data.push({ year: y, start: 0, ret: 0, withdrawal: 0, withdrawalNet: 0, tax: 0, end: 0, rate: 0, note: 'Portafoglio esaurito', eco: false }); continue; }
    const startW = cW;
    const inEcoRegime = ecoWin && y >= ecoWin.s && y <= ecoWin.e;
    let grossRate;
    if (inEcoRegime) {
      const spread = sc === 'best' ? 0.02 : sc === 'worst' ? -0.025 : 0;
      grossRate = getRateEco(port, ecoScenario, y, decStartAge, ecoWin) + spread;
    } else {
      grossRate = getRate(port, sc, y, decStartAge);
    }
    // Sovrascrive il rendimento con il crash di sequenza, se l'anno è colpito
    let crashNote = '';
    if (decCrashMap[y] !== undefined) {
      grossRate = decCrashMap[y];
      crashNote = '⚠ crash di sequenza';
    }
    const netRate = grossRate - terRate;
    // Mid-point: interessi maturano sulla media tra inizio e fine anno
    // Equivalente a: cW_dopo = (cW - wd/2) * (1+r) - wd/2
    const midW = Math.max(0, cW - wd / 2);
    const annRet = midW * netRate;
    cW = Math.max(0, cW - wd + annRet);

    // ── Tassazione del prelievo (ETF UCITS, regime amministrato) ──────────────
    // Quota di plusvalenza proporzionale al prelievo (metodo costo medio):
    //   gain_frac = max(0, (valore_mercato - costo_base) / valore_mercato)
    //   imposta   = prelievo * gain_frac * aliquota_blended
    // Il prelievo nominale (wd) è l'importo lordo necessario; il netto è wd - imposta.
    // Il costo base si riduce proporzionalmente alla quota di portafoglio venduta.
    const taxRateDec = blendedTaxRate(decStartAge + y);
    const gainFrac = startW > 0 ? Math.max(0, (startW - totalCostBasis) / startW) : 0;
    const taxOnWd = wd * gainFrac * taxRateDec;
    const withdrawalNet = Math.round(wd - taxOnWd);
    // Aggiorna il costo base: ridotto proporzionalmente alla quota venduta
    const sellFrac = startW > 0 ? Math.min(1, wd / startW) : 0;
    totalCostBasis = Math.max(0, totalCostBasis * (1 - sellFrac));

    let note = crashNote, nextWd = wd;
    if (inEcoRegime && y === ecoWin.s) note = (note ? note + ' · ' : '') + ECO_SCENARIOS[ecoScenario].emoji + ' regime attivo';
    if (ecoWin && y === ecoWin.e + 1) note = '↩ ritorno normale';
    if (strat === 'fixed') { nextWd = wd; }
    else if (strat === 'inflation') { nextWd = wd * (1 + inflRate); if (!note && infl > 0 && y > 1) note = `+${infl.toFixed(1)}% inflaz.`; }
    else if (strat === 'gk') {
      const currentRate = cW > 0 ? wd / cW : Infinity;
      const portfolioRuleBlocks = prevReturn !== null && prevReturn < 0;
      if (currentRate > initialWithdrawalRate * 1.20) { nextWd = wd * 0.90; note = (note ? note + ' · ' : '') + 'GK: -10% (tasso alto)'; }
      else if (currentRate < initialWithdrawalRate * 0.80) {
        if (!portfolioRuleBlocks) { nextWd = wd * 1.10; note = (note ? note + ' · ' : '') + 'GK: +10% (tasso basso)'; }
        else { nextWd = wd; note = (note ? note + ' · ' : '') + 'GK: blocco PMR'; }
      } else {
        if (!portfolioRuleBlocks && inflRate > 0) { nextWd = wd * (1 + inflRate); if (!note) note = `GK: +${infl.toFixed(1)}% inflaz.`; }
        else if (portfolioRuleBlocks) { nextWd = wd; note = (note ? note + ' · ' : '') + 'GK: no aumento (ann. neg.)'; }
      }
      prevReturn = netRate;
    }
    data.push({ year: y, start: Math.round(startW), ret: Math.round(annRet), withdrawal: Math.round(wd), withdrawalNet, tax: Math.round(taxOnWd), end: Math.round(cW), rate: startW > 0 ? wd / startW : 0, note, eco: !!inEcoRegime });
    wd = nextWd;
  }
  return data;
}

// ══════════════════════════════════════════════════════════════
// DECUMULO STORICO — sequenze reali (bootstrap by starting year)
// "Cosa sarebbe successo se fossi andato in pensione nel 1973?"
// Per ogni anno di partenza 1970-(2024-Y) esegue il decumulo usando
// le sequenze mensili storiche reali (calibrate) di equity/bond/gold.
// Ritorna: tasso di sopravvivenza, peggior anno di start, statistiche.
// ══════════════════════════════════════════════════════════════
function runDecumuloHistorical() {
  const { startPortfolio: sP, withdrawal: w0, years: Y, portfolio: port, strategy: strat, inflation: inflFixed, ter } = decState;
  const terRateM = ter / 100 / 12;

  // Gate: i preset con leva / managed futures (efficient core, return stacking) e i
  // custom con trend/carry non hanno serie storica coerente in HIST_MONTHLY (solo
  // azioni/obbligazioni/oro). Simularli falserebbe rischio e decorrelazione.
  const DEC_HIST_SKIP = { ec_us_9060: 1, ec_glob_9060: 1, return_stack: 1 };
  const customNonBT = port === 'custom' && typeof customPortfolioIsNonBacktestable === 'function' && customPortfolioIsNonBacktestable();
  if (DEC_HIST_SKIP[port] || customNonBT) {
    const lbl = (typeof getPortLabel === 'function') ? getPortLabel(port) : port;
    const err = new Error(`Backtest storico non disponibile per "${lbl}": i portafogli con leva (efficient core, return stacking) o con trend following / carry non hanno una serie storica coerente nel dataset 1970-2024 (azioni/obbligazioni/oro). Usa il Monte Carlo Avanzato con un modello parametrico.`);
    err.decHistBlocked = true;
    throw err;
  }

  // Pesi del portafoglio
  const decAge = state.age + state.years;
  const eqW = getEquityWeight(port, decAge);
  const goldW = getGoldWeight(port);
  const cashW = getCashWeight(port);
  const obW = Math.max(0, 1 - eqW - goldW - cashW);

  // Anni di partenza disponibili (servono Y anni di dati dopo)
  const totalYearsAvail = Math.floor(HIST_MONTHLY.length / 12);
  const maxStartYear = 1970 + totalYearsAvail - Y;
  const startYears = [];
  for (let y = 1970; y <= maxStartYear; y++) startYears.push(y);

  const results = [];

  for (const startYr of startYears) {
    const startIdx = (startYr - 1970) * 12;
    let cap = sP, wd = w0, prevYearRet = null;
    let survived = true, exhaustYear = null;
    const annualEndCap = [sP];

    for (let yi = 0; yi < Y; yi++) {
      if (cap <= 0) { survived = false; exhaustYear = exhaustYear ?? yi; cap = 0; }
      // 12 mesi di rendimenti reali, sottraendo prelievo mensile (wd/12)
      const monthlyWd = wd / 12;
      let yearRet = 1; // moltiplicatore lordo
      for (let m = 0; m < 12; m++) {
        if (cap <= 0) { cap = 0; break; }
        const idx = startIdx + yi * 12 + m;
        if (idx >= HIST_MONTHLY.length) break;
        const row = calibrateHistRow(HIST_MONTHLY[idx]);
        const eqR = row[0], obR = row[1], goldR = row[2];
        const cashR = 0.002; // ~2.4% annuo cash
        const portR = eqW*eqR + obW*obR + goldW*goldR + cashW*cashR - terRateM;
        // Prelievo a metà mese: cap_dopo = (cap - wd/2)(1+r) - wd/2
        cap = Math.max(0, (cap - monthlyWd/2) * (1 + portR) - monthlyWd/2);
        yearRet *= (1 + portR);
      }
      annualEndCap.push(Math.round(cap));

      // Inflazione storica reale dell'anno
      const histInfl = (HIST_INFLATION[startYr + yi] ?? 2.5) / 100;
      const inflRate = histInfl; // usa sempre inflazione storica per realismo

      // Adatta prelievo per anno successivo (strategia)
      let nextWd = wd;
      const initialWR = sP > 0 ? w0 / sP : 0;
      const currentWR = cap > 0 ? wd / cap : Infinity;
      if (strat === 'fixed') { nextWd = wd; }
      else if (strat === 'inflation') { nextWd = wd * (1 + inflRate); }
      else if (strat === 'gk') {
        const pmrBlock = prevYearRet !== null && prevYearRet < 1;
        if (currentWR > initialWR * 1.20) nextWd = wd * 0.90;
        else if (currentWR < initialWR * 0.80 && !pmrBlock) nextWd = wd * 1.10;
        else if (!pmrBlock && inflRate > 0) nextWd = wd * (1 + inflRate);
        prevYearRet = yearRet;
      }
      wd = nextWd;
    }

    results.push({
      startYear: startYr,
      survived,
      exhaustYear,
      finalCap: Math.round(cap),
      annualEndCap,
      maxDrawdown: maxDrawdownArr(annualEndCap),
    });
  }

  // Statistiche aggregate
  const nTotal = results.length;
  const nSurvived = results.filter(r => r.survived).length;
  const successRate = nTotal > 0 ? nSurvived / nTotal : 0;
  const failed = results.filter(r => !r.survived).sort((a,b) => a.exhaustYear - b.exhaustYear);
  const worstStart = failed.length > 0 ? failed[0] : null;
  const median = (() => {
    const sorted = [...results].sort((a,b) => a.finalCap - b.finalCap);
    return sorted[Math.floor(sorted.length/2)];
  })();

  return {
    results, nTotal, nSurvived, successRate,
    worstStart, median,
    years: Y,
  };
}

// Drawdown massimo (negativo) da array di valori
function maxDrawdownArr(arr) {
  let peak = arr[0] || 0, maxDD = 0;
  for (const v of arr) {
    if (v > peak) peak = v;
    if (peak > 0) {
      const dd = (v - peak) / peak;
      if (dd < maxDD) maxDD = dd;
    }
  }
  return maxDD;
}

// Render UI risultati decumulo storico
function runDecHistorical() {
  const btn = document.getElementById('decHistBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Calcolo...'; }
  setTimeout(() => {
    try {
      const r = runDecumuloHistorical();
      const succPct = (r.successRate * 100).toFixed(0);
      const succColor = r.successRate >= 0.90 ? 'var(--green)' : r.successRate >= 0.70 ? 'var(--orange)' : 'var(--red)';
      const worstYr = r.worstStart;
      const failedList = r.results.filter(x => !x.survived).map(x => `${x.startYear} (esaurito anno ${x.exhaustYear})`);
      const sorted = [...r.results].sort((a,b) => a.finalCap - b.finalCap);
      const median = sorted[Math.floor(sorted.length/2)];
      const p10 = sorted[Math.floor(sorted.length*0.10)];
      const p90 = sorted[Math.floor(sorted.length*0.90)];

      // Identifica anni famosi nel dataset
      const famousYears = [1970, 1973, 1980, 1987, 1990, 2000, 2008];
      const famousResults = famousYears
        .map(y => r.results.find(x => x.startYear === y))
        .filter(x => x !== undefined);

      const html = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:14px">
          <div class="dec-stat">
            <div class="dec-stat-label">Tasso Sopravvivenza</div>
            <div class="dec-stat-value" style="color:${succColor};font-size:24px">${succPct}%</div>
            <div style="font-size:10.5px;color:var(--text3);margin-top:3px">${r.nSurvived}/${r.nTotal} anni di partenza</div>
          </div>
          <div class="dec-stat">
            <div class="dec-stat-label">Capitale Finale Mediano</div>
            <div class="dec-stat-value" style="color:var(--blue)">${fmt(median?.finalCap || 0)}</div>
            <div style="font-size:10.5px;color:var(--text3);margin-top:3px">P10: ${fmt(p10?.finalCap || 0)} · P90: ${fmt(p90?.finalCap || 0)}</div>
          </div>
          <div class="dec-stat">
            <div class="dec-stat-label">Worst Year (peggior partenza)</div>
            <div class="dec-stat-value" style="color:var(--red);font-size:20px">${worstYr ? worstYr.startYear : 'Nessun fail'}</div>
            <div style="font-size:10.5px;color:var(--text3);margin-top:3px">${worstYr ? `Esaurito anno ${worstYr.exhaustYear}` : 'Tutti gli anni hanno retto'}</div>
          </div>
          <div class="dec-stat">
            <div class="dec-stat-label">Drawdown Mediano</div>
            <div class="dec-stat-value" style="color:var(--orange)">${(median?.maxDrawdown*100 || 0).toFixed(0)}%</div>
            <div style="font-size:10.5px;color:var(--text3);margin-top:3px">Picco-fondo del capitale</div>
          </div>
        </div>

        ${failedList.length > 0 ? `
          <div class="info-box" style="background:var(--red-dim);border-color:var(--red);color:var(--red);margin-bottom:12px">
            <strong>❌ Anni di partenza che hanno ESAURITO il capitale:</strong><br>
            ${failedList.join(' · ')}
          </div>` : `
          <div class="info-box" style="background:var(--green-dim);border-color:var(--green);color:var(--green);margin-bottom:12px">
            <strong>✅ Tutti gli ${r.nTotal} anni di partenza hanno completato il piano senza esaurire il capitale</strong>
          </div>`}

        <div class="sec-label" style="margin-top:14px">📌 Esiti per anni notevoli (eventi storici)</div>
        <div class="tbl-outer">
          <table>
            <thead><tr>
              <th style="text-align:left">Anno Start</th>
              <th style="text-align:left">Evento</th>
              <th>Esito</th>
              <th>Capitale Finale</th>
              <th>Max Drawdown</th>
            </tr></thead>
            <tbody>
              ${famousResults.map(x => {
                const events = {
                  1970: '🛢️ Pre oil shock',
                  1973: '🔥 Stagflazione & oil shock',
                  1980: '📈 Volcker disinflazione',
                  1987: '💥 Black Monday',
                  1990: '🇯🇵 Giappone burst',
                  2000: '💻 Dot-com bust',
                  2008: '🏦 Crisi finanziaria',
                };
                const evtName = events[x.startYear] || '';
                const status = x.survived ? `<span class="pos">✅ Successo</span>` : `<span class="neg">❌ Fallito anno ${x.exhaustYear}</span>`;
                return `<tr>
                  <td>${x.startYear}</td>
                  <td>${evtName}</td>
                  <td>${status}</td>
                  <td>${fmt(x.finalCap)}</td>
                  <td><span class="neg">${(x.maxDrawdown*100).toFixed(0)}%</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div style="font-size:11.5px;color:var(--text3);margin-top:10px;line-height:1.5">
          <strong>Note metodologiche:</strong> usa rendimenti mensili reali calibrati e inflazione effettiva di ogni anno. Il portafoglio è ribilanciato implicitamente ai pesi target ogni mese. La strategia di prelievo applicata è quella selezionata sopra. Risultati confrontabili con Trinity Study (Bengen 1994) e successivi aggiornamenti (Pfau, Kitces).
        </div>`;
      document.getElementById('decHistResults').innerHTML = html;
    } catch (e) {
      document.getElementById('decHistResults').innerHTML = `<div class="info-box" style="color:var(--red)">Errore: ${e.message}</div>`;
      console.error(e);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '📅 Esegui Backtest Storico'; }
    }
  }, 80);
}

let chartDec = null;
function renderDecumulo() {
  const dBase = simulateDecumulo('normal'), dBest = simulateDecumulo('best'), dWorst = simulateDecumulo('worst');
  const { years: Y } = decState;
  const endBase = dBase[Y - 1]?.end || 0, endBest = dBest[Y - 1]?.end || 0, endWorst = dWorst[Y - 1]?.end || 0;
  const ruinBase = dBase.findIndex(d => d.note && d.note.includes('esaurito'));
  const ruinWorst = dWorst.findIndex(d => d.note && d.note.includes('esaurito'));
  const totalExtracted = dBase.reduce((s, d) => s + d.withdrawal, 0);
  const totalExtractedNet = dBase.reduce((s, d) => s + (d.withdrawalNet ?? d.withdrawal), 0);
  const totalTax = dBase.reduce((s, d) => s + (d.tax || 0), 0);
  document.getElementById('dec-stats').innerHTML = [
    { l: 'Patrimonio finale (base)', v: fmt(endBase), c: endBase > 0 ? 'var(--blue)' : 'var(--red)' },
    { l: 'Patrimonio finale (ott.)', v: fmt(endBest), c: 'var(--green)' },
    { l: 'Patrimonio finale (pess.)', v: fmt(endWorst), c: endWorst > 0 ? 'var(--orange)' : 'var(--red)' },
    { l: 'Totale prelevato lordo (base)', v: fmt(totalExtracted), c: 'var(--text)' },
    { l: 'Totale prelevato netto (base)', v: fmt(totalExtractedNet), c: 'var(--teal)' },
    { l: 'Totale imposte pagate (base)', v: fmt(totalTax), c: 'var(--orange)' },
    { l: 'Rovina scenario base', v: ruinBase < 0 ? 'Non si esaurisce' : 'Anno ' + (ruinBase + 1), c: ruinBase < 0 ? 'var(--green)' : 'var(--red)' },
    { l: 'Rovina pessimistico', v: ruinWorst < 0 ? 'Regge' : 'Anno ' + (ruinWorst + 1), c: ruinWorst < 0 ? 'var(--green)' : 'var(--red)' },
  ].map(s => `<div class="dec-stat"><div class="dec-stat-label">${s.l}</div><div class="dec-stat-value" style="color:${s.c}">${s.v}</div></div>`).join('');
  if (chartDec) { chartDec.destroy(); chartDec = null; }
  const labels = dBase.map(d => 'Anno ' + d.year);
  chartDec = new Chart(document.getElementById('chDec'), {
    type: 'line', data: { labels, datasets: [
      { label: 'Ottimistico', data: dBest.map(d => d.end), borderColor: '#36d490', borderWidth: 2, pointRadius: 0, fill: false, tension: .35 },
      { label: 'Base', data: dBase.map(d => d.end), borderColor: '#1a73e8', borderWidth: 3, pointRadius: 0, fill: 'origin', backgroundColor: 'rgba(26,115,232,.06)', tension: .35 },
      { label: 'Pessimistico', data: dWorst.map(d => d.end), borderColor: '#e37400', borderWidth: 2, pointRadius: 0, fill: false, tension: .35 },
    ] },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { callbacks: { title: c => c[0].label, label: c => ' ' + c.dataset.label + ': ' + fmt(c.raw) }, backgroundColor: '#fff', borderColor: '#dadce0', borderWidth: 1, titleColor: '#202124', bodyColor: '#5f6368', padding: 10 } }, scales: { x: { ticks: { color: 'rgba(0,0,0,.45)', font: { size: 11, family: 'DM Mono' }, maxTicksLimit: 12 }, grid: { color: 'rgba(0,0,0,.05)' } }, y: { ticks: { color: 'rgba(0,0,0,.45)', font: { size: 11, family: 'DM Mono' }, callback: v => fmt(v) }, grid: { color: 'rgba(0,0,0,.05)' } } } },
    plugins: [{ id: 'zero', afterDraw(c) { const { ctx, scales: { x, y } } = c; if (y.getPixelForValue) { const yp = y.getPixelForValue(0); if (yp > y.top && yp < y.bottom) { ctx.save(); ctx.strokeStyle = 'rgba(217,48,37,.6)'; ctx.lineWidth = 2; ctx.setLineDash([6, 3]); ctx.beginPath(); ctx.moveTo(x.left, yp); ctx.lineTo(x.right, yp); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); } } } }]
  });
  document.getElementById('dec-table').innerHTML = dBase.map(d => {
    const rateCls = d.rate > .06 ? 'neg' : d.rate > .04 ? 'neutral' : 'pos';
    const endCls = d.end <= 0 ? 'neg' : d.end < decState.startPortfolio * .5 ? 'neutral' : 'pos';
    const ecoStyle = d.eco ? 'background:rgba(147,52,230,.05);border-left:2px solid rgba(147,52,230,.4)' : '';
    const taxStr = d.tax > 0 ? `<span style="color:var(--orange);font-size:11px">−${fmt(d.tax)}</span>` : '—';
    const netStr = d.withdrawalNet != null ? `<strong style="color:var(--teal)">${fmt(d.withdrawalNet)}</strong>` : fmt(d.withdrawal);
    return `<tr style="${ecoStyle}"><td style="text-align:left"><strong>${d.year}</strong></td><td>${fmt(d.start)}</td><td class="${d.ret >= 0 ? 'pos' : 'neg'}">${fmt(d.ret)}</td><td style="color:var(--red)">${fmt(d.withdrawal)}</td><td>${taxStr}</td><td>${netStr}</td><td class="${endCls}"><strong>${fmt(d.end)}</strong></td><td class="${rateCls}">${(d.rate * 100).toFixed(2)}%</td><td style="font-size:11.5px;color:var(--text3)">${d.note || ''}</td></tr>`;
  }).join('');
}

function importFromSim() {
  const dN = project('normal', false);
  decState.startPortfolio = dN[state.years].value;
  document.getElementById('sDecStart').value = Math.min(decState.startPortfolio, 5000000);
  document.getElementById('lDecStart').textContent = fmt(decState.startPortfolio);
  document.getElementById('sDecStart').dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('importStatus').textContent = `Importato: ${fmtFull(decState.startPortfolio)} (scenario base, età ${state.age + state.years} anni)`;
  renderDecumulo();
}

const decStratDescs = {
  fixed: '<strong>Fisso Nominale:</strong> La stessa somma ogni anno. Semplice, ma il potere d\'acquisto reale decresce per inflazione.',
  inflation: '<strong>Indicizzato Inflazione:</strong> Il prelievo cresce ogni anno dell\'inflazione impostata, mantenendo costante il potere d\'acquisto reale. Standard per la pianificazione pensionistica.',
  gk: '<strong>Guyton-Klinger (paper originale 2006):</strong> 4 regole — (1) <em>Portfolio Management Rule</em>: nessun aumento se l\'anno precedente il rendimento era negativo; (2) <em>Capital Preservation Rule</em>: se il tasso di prelievo supera del 20% quello iniziale → taglio 10%; (3) <em>Prosperity Rule</em>: se è inferiore del 20% → aumento 10% (solo se PMR non blocca); (4) altrimenti → aumento per inflazione. Massimizza il reddito con la longevità.',
};

// ══════════════════════════════════════════════════════════════
// VALUATION DASHBOARD — mini-pannello CAPE/yield per portafoglio
// ══════════════════════════════════════════════════════════════
function buildValuationDashboard(portKey) {
  const d = window.liveMarketData;
  if (!d || d.status === 'loading' || d.status === 'error') return '';
  if (!d.cape_sp500 && !d.yield_eur_10y) return '';

  const p = PORT[portKey];
  const eqW  = p?.eq  ?? getEquityWeight(portKey, state.age);
  const obW  = p?.ob  ?? Math.max(0, 1 - eqW - (p?.gold ?? 0) - (p?.cash ?? 0));
  const goldW = p?.gold ?? 0;

  // Rendimento atteso ponderato per composizione portafoglio
  const fwdEq   = d.fwd_eq_usa ?? 0.070;
  const fwdBond = d.fwd_bond_eur ?? 0.030;
  const fwdGold = 0.040; // oro: nessun CAPE disponibile
  const fwdPort = eqW * fwdEq + obW * fwdBond + goldW * fwdGold;

  // Baseline storico (prima della ricalibrazione)
  const baseNormal = p?._baseNormal ?? p?.normal ?? 0.055;
  const delta = fwdPort - baseNormal;
  const deltaStr = (delta >= 0 ? '+' : '') + (delta * 100).toFixed(2) + '%';
  const deltaColor = delta >= 0 ? 'var(--green)' : 'var(--red)';

  // Percentile storico CAPE S&P500 (distribuzione 1881-2024)
  // Quantili empirici: p10=10, p25=13, p50=17, p75=23, p90=29, p95=33
  const CAPE_QUANTILES = [
    [10, 10], [13, 25], [17, 50], [23, 75], [29, 90], [33, 95], [40, 99]
  ];
  function capePercentile(cape) {
    if (!cape) return null;
    for (let i = 0; i < CAPE_QUANTILES.length - 1; i++) {
      const [c0, p0] = CAPE_QUANTILES[i];
      const [c1, p1] = CAPE_QUANTILES[i + 1];
      if (cape <= c1) return Math.round(p0 + (p1 - p0) * (cape - c0) / (c1 - c0));
    }
    return 99;
  }
  const capePct = capePercentile(d.cape_sp500);
  const capePctColor = capePct > 85 ? 'var(--red)' : capePct > 65 ? 'var(--orange)' : capePct > 35 ? 'var(--blue)' : 'var(--green)';

  // Stima rendimento reale atteso (fwd nominale - HICP)
  const inflExp = d.hicp_eu ?? (state.inflBottom / 100);
  const realFwd = fwdPort - inflExp;
  const realFwdColor = realFwd > 0.04 ? 'var(--green)' : realFwd > 0.02 ? 'var(--blue)' : realFwd > 0 ? 'var(--orange)' : 'var(--red)';

  const chips = [];
  if (d.cape_sp500) chips.push(`
    <span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-family:'DM Mono',monospace;background:var(--bg);border:1px solid var(--border2);border-radius:5px;padding:3px 8px" title="CAPE S&P500 attuale — percentile ${capePct}° sulla distribuzione storica 1881-2024">
      CAPE ${d.cape_sp500.toFixed(1)} · <strong style="color:${capePctColor}">${capePct}° pct</strong>
    </span>`);
  if (d.yield_eur_10y) chips.push(`
    <span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-family:'DM Mono',monospace;background:var(--bg);border:1px solid var(--border2);border-radius:5px;padding:3px 8px" title="Yield sovrano EUR 10a (BCE). Proxy rendimento bond forward.">
      Yield EUR ${(d.yield_eur_10y*100).toFixed(2)}%
    </span>`);
  chips.push(`
    <span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-family:'DM Mono',monospace;background:var(--bg);border:1px solid var(--border2);border-radius:5px;padding:3px 8px" title="Rendimento nominale forward atteso per questo portafoglio. Metodo Earnings Yield Delta: il rendimento reale atteso ≈ 1/CAPE; lo scostamento dell'earnings yield corrente dalla media storica (CAPE~20) viene applicato al rendimento storico, poi miscelato 55% live / 45% baseline.">
      Fwd nom. <strong>${(fwdPort*100).toFixed(1)}%</strong>/a <span style="color:${deltaColor}">(${deltaStr} vs storico)</span>
    </span>`);
  chips.push(`
    <span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-family:'DM Mono',monospace;background:var(--bg);border:1px solid var(--border2);border-radius:5px;padding:3px 8px" title="Rendimento reale atteso = forward nominale − HICP Eurozona corrente.">
      Fwd reale <strong style="color:${realFwdColor}">${(realFwd*100).toFixed(1)}%</strong>/a
    </span>`);

  return `<div style="margin-top:10px;padding:10px;background:rgba(26,115,232,.04);border:1px solid rgba(26,115,232,.15);border-radius:8px">
    <div style="font-size:10.5px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">⚡ Valutazioni Live · ${new Date(d.fetchedAt).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">${chips.join('')}</div>
  </div>`;
}

// ══════════════════════════════════════════════════════════════
// PORTFOLIO INFO BOX
// ══════════════════════════════════════════════════════════════
function updatePortDetailBox() {
  const isCustom = state.portfolio === 'custom';
  const p = isCustom ? calcCustomParams() : PORT[state.portfolio];
  const builder = document.getElementById('customBuilder');
  if (builder) builder.classList.toggle('visible', isCustom);
  if (isCustom) { renderCustomBuilder(); return; }
  if (!p) { document.getElementById('portDetailBox').innerHTML = ''; return; }
  const bd = (state.portfolio !== 'custom' && PORT[state.portfolio]?.breakdown)
    ? Object.entries(PORT[state.portfolio].breakdown).map(([k,v])=>`<span style="background:var(--bg);border:1px solid var(--border2);padding:2px 8px;border-radius:4px;font-size:11.5px;font-family:'DM Mono',monospace"><strong>${v}</strong> ${k}</span>`).join(' '):'';
  // FX badge per portafogli predefiniti
  const fxExp = getFxExposure(state.portfolio, state.age);
  const fxHedged = !!state.fxHedge;
  const fxBadge = fxExp > 0.01
    ? `<span style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-family:'DM Mono',monospace;font-weight:600;color:var(--purple);background:var(--purple-dim);border:1px solid rgba(147,52,230,.3);padding:2px 8px;border-radius:4px" onclick="toggleFxHedge()" title="Esposizione cambio EUR/USD. Click per attivare/disattivare copertura valutaria (hedging)">💱 FX ${(fxExp*100).toFixed(0)}% ${fxHedged?'<span style=\'color:var(--green)\'>hedged ✓</span>':'unhedged'}</span>`
    : '';
  const fxCostNote = fxHedged && fxExp > 0.01
    ? `<div style="margin-top:6px;font-size:11px;color:var(--text3)">⚠️ Copertura valutaria attiva: costo stimato −${(fxExp * state.fxHedgeCost * 100).toFixed(2)}%/a sul rendimento netto.</div>`
    : (fxExp > 0.01 ? `<div style="margin-top:6px;font-size:11px;color:var(--text3)">⚠️ Esposizione cambio EUR/USD non coperta: vol. aggiuntiva ~${(fxExp * state.fxVol * 100).toFixed(1)}%/a. Clicca 💱 per attivare hedging.</div>` : '');
  document.getElementById('portDetailBox').innerHTML = `
    <div style="font-size:12.5px;color:var(--text2);line-height:1.6;margin-bottom:${bd?'8px':'4px'}">${p.desc||''}</div>
    ${bd?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">${bd}</div>`:''}
    ${fxBadge ? `<div style="margin-bottom:4px">${fxBadge}</div>` : ''}
    ${fxCostNote}
    ${p.realRet!=null?`<div style="margin-top:8px;font-size:11.5px;color:var(--text3)">Rendimento reale: <strong style="color:var(--green)">${(p.realRet*100).toFixed(1)}%/a</strong> · Beta infl.: <strong style="color:${p.inflBeta>0.2?'var(--green)':p.inflBeta>0?'var(--orange)':'var(--red)'}">${p.inflBeta>0?'+':''}${p.inflBeta.toFixed(2)}</strong> · Vol.: <strong>${p.vol?(p.vol*100).toFixed(0)+'%':'variabile'}</strong></div>`:''}
    ${buildValuationDashboard(state.portfolio)}`;
}

// ── Custom Portfolio builder ──────────────────────────────────
function renderCustomBuilder() {
  const el = document.getElementById('customBuilder');
  if (!el) return;
  el.classList.add('visible');
  const slots = state.customPortfolio.slots;
  const total = slots.reduce((s,sl)=>s+(+sl.pct||0),0);
  const totalOk = Math.abs(total-100)<0.5;
  const cp = calcCustomParams();
  document.getElementById('portDetailBox').innerHTML = `
    <div style="font-size:12px;color:var(--text2);margin-bottom:6px">Parametri calcolati in tempo reale sulla composizione sotto.</div>
    <div class="custom-params">
      <span class="custom-param-chip" style="color:var(--blue)">Base: <strong>${(cp.normal*100).toFixed(2)}%/a</strong></span>
      <span class="custom-param-chip" style="color:var(--green)">Ott.: <strong>${(cp.best*100).toFixed(2)}%/a</strong></span>
      <span class="custom-param-chip" style="color:var(--orange)">Pess.: <strong>${(cp.worst*100).toFixed(2)}%/a</strong></span>
      <span class="custom-param-chip">σ: <strong>${(cp.vol*100).toFixed(1)}%</strong></span>
      <span class="custom-param-chip" style="color:var(--red)" title="Volatilità in regime di crisi (correlazioni → 1)">σ-crisi: <strong>${(cp.volStress*100).toFixed(1)}%</strong></span>
      <span class="custom-param-chip" style="color:${cp.inflBeta>0.2?'var(--green)':cp.inflBeta>0?'var(--orange)':'var(--red)'}">β-infl: <strong>${cp.inflBeta>0?'+':''}${cp.inflBeta.toFixed(2)}</strong></span>
      <span class="custom-param-chip" style="color:var(--orange)" title="TER medio ponderato sugli ETF selezionati — applicato automaticamente alla simulazione">TER applicato: <strong>${cp.ter.toFixed(2)}%</strong></span>
      <span class="custom-param-chip" style="color:var(--purple);cursor:pointer" onclick="toggleFxHedge()" title="Esposizione cambio EUR/USD e altre valute. Click per attivare/disattivare la copertura">💱 FX: <strong>${(cp.fxExposure*100).toFixed(0)}% ${cp.fxHedged?'(hedged)':'(unhedged)'}</strong></span>
      <span class="custom-param-chip">Az: <strong>${(cp.eq*100).toFixed(0)}%</strong></span>
      <span class="custom-param-chip">Ob: <strong>${(cp.ob*100).toFixed(0)}%</strong></span>
      ${cp.goldW>0?`<span class="custom-param-chip">Oro: <strong>${(cp.goldW*100).toFixed(0)}%</strong></span>`:''}
      ${cp.cashW>0?`<span class="custom-param-chip">Cash: <strong>${(cp.cashW*100).toFixed(0)}%</strong></span>`:''}
      ${cp.otherFullW>0?`<span class="custom-param-chip" title="Trend following, carry, commodities, REIT, fattori — tassati al 26%">Alt: <strong>${(cp.otherFullW*100).toFixed(0)}%</strong></span>`:''}
    </div>`;
  el.innerHTML = `
    <div class="sec-label" style="margin-bottom:12px">🔧 Builder Portafoglio Custom</div>
    <div id="customSlots">${slots.map((sl,i)=>`
      <div class="custom-slot">
        <select class="custom-select" onchange="updCustomAc(${i},this.value)">
          <option value="">— Seleziona asset class —</option>
          ${Object.entries(ASSET_CLASSES).map(([k,v])=>`<option value="${k}"${sl.ac===k?' selected':''}>${v.emoji} ${v.label}</option>`).join('')}
        </select>
        <input class="custom-pct-input" type="number" min="0" max="100" step="5" value="${sl.pct}" placeholder="%" onchange="updCustomPct(${i},+this.value)">
        <span style="font-size:11px;color:var(--text3);font-family:'DM Mono',monospace">%</span>
        <button class="dbtn" onclick="delCustomSlot(${i})">✕</button>
      </div>`).join('')}</div>
    <div class="custom-total ${totalOk?'ok':total>0?'warn':'err'}">
      Totale: ${total.toFixed(1)}% ${totalOk?'✅ OK':total<100?'⚠️ mancano '+(100-total).toFixed(1)+'%':'❌ eccedenza '+(total-100).toFixed(1)+'%'}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <button class="addbtn" style="flex:1;min-width:140px" onclick="addCustomSlot()">+ Aggiungi asset class</button>
      <button class="gbtn a-blue" onclick="normalizeCustom()">⚖️ Normalizza a 100%</button>
      <button class="gbtn" onclick="resetCustomPreset('eq60')" title="60% Az. Globali + 40% Aggregato">60/40</button>
      <button class="gbtn" onclick="resetCustomPreset('all_seasons')" title="All Seasons di Dalio">All Seasons</button>
      <button class="gbtn" onclick="resetCustomPreset('permanent')" title="Permanent Portfolio di Browne">Permanent</button>
      <button class="gbtn" onclick="resetCustomPreset('larry')" title="Larry Portfolio di Swedroe">Larry</button>
      <button class="gbtn" onclick="resetCustomPreset('global')" title="Mercato Globale">Global</button>
      <button class="gbtn" onclick="resetCustomPreset('inflaz')" title="Anti-inflazione: Az+TIPS+Oro+Comm">Anti-Inflaz.</button>
      <button class="gbtn" onclick="resetCustomPreset('multifat')" title="Multi-fattore + Bond + Oro">Multi-Fat.</button>
      <button class="gbtn" onclick="resetCustomPreset('trend_div')" title="Azioni + Trend Following + Bond + Oro">Trend+Div.</button>
      <button class="gbtn" onclick="resetCustomPreset('carry_mix')" title="Carry Bond + FX Carry + Azioni + Bond">Carry Mix</button>
    </div>
    <div class="info-box" style="font-size:11.5px">
      <strong>Dati:</strong> mu = rendimento nominale forward-looking (10-20a), σ = volatilità storica 1970-2024. Fonti: DMS Yearbook 2024, dati Federal Reserve (FRED), Banche Centrali, letteratura accademica (Fama-French, Jegadeesh-Titman, Carhart). La volatilità usa una matrice di correlazione semplificata tra categorie (es. ρ(az,bond)≈−0.05, ρ(az,oro)≈0.05) — risultato più realistico della semplice media ponderata.
    </div>`;
}

// ── Helper unificato: restituisce parametri portafoglio (custom o PORT) ──────
// Usato da tutti i moduli che prima accedevano direttamente a PORT[key].
// Per 'custom' chiama calcCustomParams(); per gli altri restituisce PORT[key].
function getPortParams(portKey) {
  if (portKey === 'custom') return calcCustomParams();
  // Per portafogli predefiniti, restituisce una copia con best/normal/worst
  // aggiustati per FX hedging — così updateRetInfo mostra valori coerenti con render()
  const p = PORT[portKey];
  if (!p) return null;
  if (portKey === 'lifecycle') return p; // lifecycle non ha best/normal/worst fissi
  const fxExp   = p.fxExp ?? 0;
  const fxHedged = !!state.fxHedge;
  const fxCost   = fxHedged ? fxExp * state.fxHedgeCost : 0;
  const fxAddVar = fxHedged ? 0 : Math.pow(fxExp * state.fxVol, 2);
  const sigmaFx  = Math.sqrt((p.vol ?? 0.10) ** 2 + fxAddVar);
  const muNet    = (p.normal ?? 0.055) - fxCost;
  return {
    ...p,
    normal: muNet,
    best:   Math.min(muNet + 0.20 * sigmaFx, 0.20),
    worst:  Math.max(muNet - 0.38 * sigmaFx, -0.08),
    vol:    sigmaFx,
  };
}
// ── Label portafoglio (anche per 'custom') ────────────────────────────────────
function getPortLabel(portKey) {
  if (portKey === 'custom') return '🔧 Custom';
  return PORT[portKey]?.label ?? portKey;
}

// ── Esposizione FX (% patrimonio in valuta non-EUR) ──────────────────────────
// Per 'custom': usa calcCustomParams().fxExposure
// Per lifecycle: interpolato con l'età (più equity = più FX USD)
// Per gli altri: usa PORT[key].fxExp
function getFxExposure(portKey, age) {
  if (portKey === 'custom') return calcCustomParams().fxExposure ?? 0;
  if (portKey === 'lifecycle') {
    const eq = getLCWeight(age ?? state.age);
    return eq * 0.85 + (1 - eq) * 0.05; // equity ~85% USD, bond ~5%
  }
  return PORT[portKey]?.fxExp ?? 0;
}

// ── Calcola effetto FX netto per portafogli predefiniti (investitore EUR) ─────
// Restituisce { fxExposure, fxHedged, fxCost, fxAddVol, fxAdjMu, fxAdjVol }
function getFxAdjustment(portKey, age) {
  const fxExp  = getFxExposure(portKey, age);
  const hedged = !!state.fxHedge;
  const fxCost    = hedged ? fxExp * state.fxHedgeCost : 0;
  const fxAddVar  = hedged ? 0 : Math.pow(fxExp * state.fxVol, 2);
  const fxAddVol  = Math.sqrt(fxAddVar);
  return { fxExposure: fxExp, fxHedged: hedged, fxCost, fxAddVol };
}
// ── Applica il TER ponderato del portafoglio custom allo slider e a state.ter ──
// Chiamata ogni volta che la composizione custom cambia, così la simulazione usa
// sempre il TER coerente con gli ETF selezionati (e non il default 0.20%).
function syncCustomTer() {
  if (state.portfolio !== 'custom') return;
  const cp = calcCustomParams();
  const suggestedTer = Math.round(cp.ter * 100) / 100; // cp.ter è già in % (es. 0.165 = 0.165%)
  state.ter = suggestedTer;
  const sl = document.getElementById('sTer');
  const lb = document.getElementById('lTer');
  if (sl) sl.value = suggestedTer;
  if (lb) lb.textContent = suggestedTer.toFixed(2) + '%';
  updateRetInfo();
}

function addCustomSlot(){ state.customPortfolio.slots.push({ac:'',pct:0}); renderCustomBuilder(); syncCustomTer(); render(); }
function delCustomSlot(i){ state.customPortfolio.slots.splice(i,1); if(!state.customPortfolio.slots.length) state.customPortfolio.slots.push({ac:'eq_world',pct:100}); renderCustomBuilder(); syncCustomTer(); render(); }
function updCustomAc(i,ac){ state.customPortfolio.slots[i].ac=ac; renderCustomBuilder(); syncCustomTer(); render(); }
function updCustomPct(i,pct){ state.customPortfolio.slots[i].pct=Math.max(0,pct); renderCustomBuilder(); syncCustomTer(); render(); }
function normalizeCustom(){ const s=state.customPortfolio.slots.filter(sl=>sl.ac&&sl.pct>0); const t=s.reduce((acc,sl)=>acc+sl.pct,0); if(!t) return; state.customPortfolio.slots=s.map(sl=>({...sl,pct:Math.round(sl.pct/t*1000)/10})); renderCustomBuilder(); syncCustomTer(); render(); }

// ── Toggle copertura cambio EUR/USD ────────────────────────────────
// Modella l'effetto valutario per investitore EUR:
// - Unhedged: aggiunge vol da EUR/USD (~8.5%/a) proporzionalmente all'esposizione
// - Hedged: costo annuo ~0.3% (forward FX), elimina la vol valutaria
// Fonte: differenziale tassi EUR/USD storico, costi hedging ETF UCITS
function toggleFxHedge() {
  state.fxHedge = !state.fxHedge;
  renderCustomBuilder();
  updateRetInfo();
  updatePortDetailBox();
  render();
}
function resetCustomPreset(key){
  const p = {
    eq60:         [{ac:'eq_sviluppati',pct:60},{ac:'ob_glob_agg',pct:40}],
    all_seasons:  [{ac:'eq_sviluppati',pct:30},{ac:'ob_usa_ult',pct:40},{ac:'ob_usa_it',pct:15},{ac:'gold',pct:7.5},{ac:'commodities',pct:7.5}],
    permanent:    [{ac:'eq_sviluppati',pct:25},{ac:'ob_usa_ult',pct:25},{ac:'gold',pct:25},{ac:'cash',pct:25}],
    larry:        [{ac:'eq_small_value',pct:15},{ac:'eq_europa',pct:7.5},{ac:'eq_em',pct:7.5},{ac:'ob_usa_it',pct:70}],
    global:       [{ac:'eq_sviluppati',pct:55},{ac:'ob_glob_agg',pct:45}],
    inflaz:       [{ac:'eq_sviluppati',pct:30},{ac:'ob_infl',pct:30},{ac:'gold',pct:20},{ac:'commodities',pct:20}],
    multifat:     [{ac:'fat_multifat',pct:70},{ac:'ob_glob_agg',pct:20},{ac:'gold',pct:10}],
    trend_div:    [{ac:'eq_sviluppati',pct:40},{ac:'fat_trend',pct:25},{ac:'ob_glob_gov',pct:25},{ac:'gold',pct:10}],
    carry_mix:    [{ac:'fat_carry_bond',pct:30},{ac:'fat_carry_fx',pct:20},{ac:'eq_sviluppati',pct:30},{ac:'ob_glob_agg',pct:20}],
  };
  if(p[key]){state.customPortfolio.slots=p[key].map(s=>({...s}));renderCustomBuilder();syncCustomTer();render();}
}


// ══════════════════════════════════════════════════════════════
// SLIDERS + BINDING
// ══════════════════════════════════════════════════════════════
function bindSlider(sid, lid, key, fmtFn, cb) {
  const s = document.getElementById(sid), l = document.getElementById(lid);
  s.oninput = () => { state[key] = +s.value; l.textContent = fmtFn(+s.value); if (key === 'pac') renderPacChgList(); if (key === 'years') { const el = document.getElementById('mcAccYears'); if (el) el.textContent = +s.value; } if (cb) cb(); render(); };
}
bindSlider('sW', 'lW', 'w', v => '€' + fmtN(v));
bindSlider('sP', 'lP', 'pac', v => '€' + fmtN(v) + '/m');

// ── Valore digitabile da tastiera: clic sulla label → input numerico ──
// Rende il valore mostrato (span .pval) cliccabile: si apre un campo dove
// scrivere la cifra esatta. Alla conferma (Invio o blur) il valore viene
// limitato al range dello slider, sincronizzato con slider+stato, e il
// grafico si aggiorna. Esc annulla. Funziona per qualsiasi slider numerico.
function makeEditable(labelId, sliderId, stateKey, fmtFn, opts) {
  opts = opts || {};
  const lab = document.getElementById(labelId);
  const sld = document.getElementById(sliderId);
  if (!lab || !sld) return;
  lab.style.cursor = 'text';
  lab.title = 'Clicca per scrivere il valore';
  lab.addEventListener('click', () => {
    if (lab.querySelector('input')) return;           // già in modifica
    const cur = +sld.value;
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.inputMode = 'numeric';
    inp.value = cur;                                   // numero grezzo, niente € o punti
    inp.style.cssText = 'width:9ch;font:inherit;color:inherit;background:var(--bg2,#1a1a1a);border:1px solid var(--blue,#1a73e8);border-radius:5px;padding:1px 5px;text-align:right';
    const oldHTML = lab.innerHTML;
    lab.innerHTML = '';
    lab.appendChild(inp);
    inp.focus(); inp.select();
    const commit = () => {
      // estrai solo le cifre (tollera punti, spazi, € incollati).
      // Un eventuale segno meno iniziale → valore 0 (importi negativi non hanno senso).
      const negative = /^\s*-/.test(String(inp.value));
      let n = negative ? 0 : parseInt(String(inp.value).replace(/[^\d]/g, ''), 10);
      if (isNaN(n)) n = cur;
      const min = +sld.min, max = +sld.max, step = +sld.step || 1;
      n = Math.max(min, Math.min(max, n));             // clamp al range
      n = Math.round(n / step) * step;                 // allinea allo step
      sld.value = n;
      sld.dispatchEvent(new Event('input', { bubbles: true })); // riusa bindSlider
    };
    const cancel = () => { lab.innerHTML = oldHTML; };
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    });
    inp.addEventListener('blur', commit);
  });
}
makeEditable('lW', 'sW', 'w');
makeEditable('lP', 'sP', 'pac');

// ── Campo numerico digitabile accanto agli slider di importo ──────────────
// Inserisce un <input type="number"> sincronizzato bidirezionalmente con lo
// slider: digitare aggiorna lo slider (e dispatcha 'input', riusando tutta la
// logica esistente di bindSlider/oninput); muovere lo slider aggiorna il campo.
// Pensato per importi elevati (milioni) dove il trascinamento è impreciso.
// withEuro=true mostra il prefisso €. Allinea allo step e limita al range solo
// al blur/Invio, così durante la digitazione non si "salta".
function attachNumberBox(sliderId, withEuro = true) {
  const sld = document.getElementById(sliderId);
  if (!sld || sld._numBoxAttached) return;
  sld._numBoxAttached = true;

  const wrap = document.createElement('div');
  wrap.className = withEuro ? 'num-box-wrap' : '';
  const box = document.createElement('input');
  box.type = 'number';
  box.className = 'num-box';
  box.min = sld.min; box.max = sld.max; box.step = sld.step;
  box.setAttribute('inputmode', 'numeric');
  box.value = sld.value;
  box.setAttribute('aria-label', 'Inserisci il valore esatto');
  wrap.appendChild(box);
  sld._numBox = box; // riferimento per sincronizzazione programmatica
  // Inserisce subito dopo lo slider (o dopo gli hint di range se presenti)
  const hints = sld.nextElementSibling && sld.nextElementSibling.classList?.contains('range-hints')
    ? sld.nextElementSibling : null;
  (hints || sld).insertAdjacentElement('afterend', wrap);

  // slider → box
  const syncFromSlider = () => { if (document.activeElement !== box) box.value = sld.value; };
  sld.addEventListener('input', syncFromSlider);

  // box → slider (in tempo reale mentre si digita, senza clamp brusco)
  box.addEventListener('input', () => {
    if (box.value === '' || box.value === '-') return;       // consente digitazione parziale
    let n = parseFloat(box.value);
    if (isNaN(n)) return;
    const min = +sld.min, max = +sld.max;
    n = Math.max(min, Math.min(max, n));
    sld.value = n;
    sld.dispatchEvent(new Event('input', { bubbles: true })); // riusa logica esistente
  });
  // al blur/Invio: pulisce, allinea allo step e mostra il valore finale
  const finalize = () => {
    let n = parseFloat(box.value);
    const min = +sld.min, max = +sld.max, step = +sld.step || 1;
    if (isNaN(n)) n = +sld.value;
    n = Math.max(min, Math.min(max, n));
    n = Math.round(n / step) * step;
    sld.value = n;
    box.value = n;
    sld.dispatchEvent(new Event('input', { bubbles: true }));
  };
  box.addEventListener('blur', finalize);
  box.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); box.blur(); } });
}

// Applica i campi numerici a tutti gli slider di IMPORTO (€).
// Simulatore principale, soglia optionality, decumulo, backtest, A/B, goal.
[
  'sW', 'sP', 'sO',           // simulatore: patrimonio, PAC, soglia optionality
  'sDecStart', 'sDecW',       // decumulo: patrimonio iniziale + prelievo annuo
  'sMcW',                     // monte carlo: prelievo annuo target
  'sBtW', 'sBtPac',           // backtest: capitale + PAC
  'sAbPac',                   // confronto A/B: PAC B
  'sGoalTarget', 'sGoalPAC', 'sGoalW0', // calcolatore obiettivo
].forEach(id => attachNumberBox(id, true));
// Prelievo annuo decumulo, se presente
if (document.getElementById('sDecWd')) attachNumberBox('sDecWd', true);

// Helper globale: dopo aver impostato slider.value via codice, aggiorna il box.
function syncNumBox(sliderId) {
  const sld = document.getElementById(sliderId);
  if (sld && sld._numBox && document.activeElement !== sld._numBox) sld._numBox.value = sld.value;
}
window.syncNumBox = syncNumBox;


bindSlider('sA', 'lA', 'age', v => v + ' anni');
bindSlider('sY', 'lY', 'years', v => v + ' anni');
bindSlider('sO', 'lO', 'opt', v => '€' + fmtN(v));
bindSlider('sTer', 'lTer', 'ter', v => v.toFixed(2) + '%', updateRetInfo);
bindSlider('sTeq', 'lTeq', 'taxEq', v => v.toFixed(1) + '%', updateRetInfo);
bindSlider('sTob', 'lTob', 'taxOb', v => v.toFixed(1) + '%', updateRetInfo);
bindSlider('sInflBottom', 'lInflBottom', 'inflBottom', v => v.toFixed(1) + '%');
bindSlider('sInflVol', 'lInflVol', 'inflVol', v => v.toFixed(2) + '%');

document.getElementById('sMcW').oninput = function () { mcState.withdrawal = +this.value; document.getElementById('lMcW').textContent = fmt(+this.value) + '/a'; };
document.getElementById('sMcY').oninput = function () { mcState.years = +this.value; document.getElementById('lMcY').textContent = this.value + ' anni'; };
document.getElementById('sMcI').oninput = function () { mcState.inflation = +this.value; document.getElementById('lMcI').textContent = (+this.value).toFixed(1) + '%'; };

function bindDecSlider(sid, lid, key, fmtFn) { const s = document.getElementById(sid), l = document.getElementById(lid); s.oninput = () => { decState[key] = +s.value; l.textContent = fmtFn(+s.value); renderDecumulo(); }; }
bindDecSlider('sDecStart', 'lDecStart', 'startPortfolio', v => fmt(v));
bindDecSlider('sDecW', 'lDecW', 'withdrawal', v => fmt(v) + '/a');
bindDecSlider('sDecY', 'lDecY', 'years', v => v + ' anni');
bindDecSlider('sDecTer', 'lDecTer', 'ter', v => v.toFixed(2) + '%');
bindDecSlider('sDecI', 'lDecI', 'inflation', v => v.toFixed(1) + '%');

document.getElementById('decAllocBtns').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; decState.portfolio = b.dataset.k; document.querySelectorAll('#decAllocBtns .gbtn').forEach(x => x.classList.remove('a-blue')); b.classList.add('a-blue'); 
  // Avviso se si sceglie "Mia allocazione" ma il Simulatore non ha un'allocazione custom configurata
  const decAllocWarn = document.getElementById('decAllocWarn');
  if (decAllocWarn) {
    const slots = (state.customPortfolio?.slots || []).filter(s => s.ac && s.pct > 0);
    if (b.dataset.k === 'custom' && slots.length === 0) {
      decAllocWarn.style.display = 'block';
      decAllocWarn.innerHTML = '⚠️ Non hai ancora configurato un\'allocazione personalizzata nella scheda Simulatore. Vai al Simulatore, scegli "Allocazione personalizzata" e imposta gli asset, poi torna qui.';
    } else {
      decAllocWarn.style.display = 'none';
    }
  }
  renderDecumulo(); };
document.getElementById('decStratBtns').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; decState.strategy = b.dataset.s; document.querySelectorAll('#decStratBtns .gbtn').forEach(x => x.classList.remove('a-blue')); b.classList.add('a-blue'); document.getElementById('decStratDesc').innerHTML = decStratDescs[b.dataset.s] || ''; renderDecumulo(); };

// ── Sequence risk DECUMULO: handlers UI ──────────────────────────────────────
function toggleDecSeq() {
  decState.seq.on = !decState.seq.on;
  document.getElementById('decSeqTog').classList.toggle('on', decState.seq.on);
  document.getElementById('decSeqOpts').style.display = decState.seq.on ? 'block' : 'none';
  updateDecSeqDesc(); renderDecumulo();
}
document.getElementById('decSevBtns').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; decState.seq.severity = b.dataset.s; document.querySelectorAll('#decSevBtns .gbtn').forEach(x => x.classList.remove('a-purple')); b.classList.add('a-purple'); updateDecSeqDesc(); renderDecumulo(); };
document.getElementById('decTimBtns').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; decState.seq.timing = b.dataset.t; document.querySelectorAll('#decTimBtns .gbtn').forEach(x => x.classList.remove('a-amber')); b.classList.add('a-amber'); updateDecSeqDesc(); renderDecumulo(); };
document.getElementById('decSeqModeBtns').onclick = e => { const b = e.target.closest('[data-sm]'); if (!b) return; decState.seq.mode = b.dataset.sm; document.querySelectorAll('#decSeqModeBtns .gbtn').forEach(x => x.classList.remove('a-purple')); b.classList.add('a-purple'); updateDecSeqDesc(); renderDecumulo(); };
function updateDecSeqDesc() {
  const el = document.getElementById('decSeqDesc');
  if (!el || !decState.seq.on) { if (el) el.innerHTML = ''; updateDecOverlapWarning(); return; }
  const Y = decState.years;
  const years = getCrashYears(decState.seq.mode || 'single', decState.seq.timing, Y);
  const sevLabel = { mild: '−20%', moderate: '−35%', severe: '−50%' }[decState.seq.severity] || '';
  const yearsTxt = years.map((cy, i) => `Crash #${i + 1}: anno ${cy}`).join(' · ');
  el.innerHTML = `<strong>Crash di sequenza ${sevLabel} azionario</strong> — ${yearsTxt}. ` +
    `Un crollo nei primi anni di prelievo è molto più dannoso: si vendono quote in perdita proprio mentre il capitale dovrebbe durare. ` +
    `Commodities e carry partecipano al crollo, il trend following attenua (crisis alpha), bond/oro/liquidità fanno da rifugio.`;
  updateDecOverlapWarning();
}

// Avviso quando sequence risk e scenario economico sono attivi insieme.
function updateDecOverlapWarning() {
  const el = document.getElementById('decOverlapWarn');
  if (!el) return;
  const both = decState.seq && decState.seq.on && decState.ecoScenario;
  if (both) {
    el.style.display = 'block';
    el.innerHTML = `⚠ <strong>Stai sovrapponendo due stress</strong>: un crash di sequenza e un regime macro (${ECO_SCENARIOS[decState.ecoScenario]?.label || decState.ecoScenario}). ` +
      `Negli anni colpiti dal crash, il crollo prevale sul rendimento del regime; negli altri anni resta attivo il regime macro. ` +
      `È uno scenario di stress combinato volutamente severo — utile per testare la tenuta nel caso peggiore, ma poco probabile come evento congiunto.`;
  } else {
    el.style.display = 'none';
    el.innerHTML = '';
  }
}

// Eco timing — Scenari tab
function updateEcoTimDesc() {
  const win = getEcoWindow(state.activeEcoScenario, state.years, state.ecoTiming);
  const eco = ECO_SCENARIOS[state.activeEcoScenario];
  const labels = { early: 'Inizio: il regime inizia subito (anni 1–' + win.e + '). Massima esposizione nella fase di accumulo iniziale — i mercati colpiti quando il capitale è ancora basso.', mid: 'Metà: il regime si attiva a metà orizzonte (anni ' + win.s + '–' + win.e + '). Il portafoglio è già cresciuto; l\'impatto è più ampio in termini assoluti.', late: 'Fine: il regime si manifesta negli ultimi anni (anni ' + win.s + '–' + win.e + '). Vero sequence risk — manca il tempo per il recupero prima della liquidazione.' };
  document.getElementById('ecoTimDesc').innerHTML = (labels[state.ecoTiming] || '') + (eco?.duration >= 99 ? ' <em style="color:var(--text3)">(Scenario permanente: copre tutto l\'orizzonte indipendentemente dalla fase.)</em>' : '');
}
document.getElementById('ecoTimBtns').onclick = e => {
  const b = e.target.closest('[data-t]'); if (!b) return;
  state.ecoTiming = b.dataset.t;
  document.querySelectorAll('#ecoTimBtns .gbtn').forEach(x => x.classList.remove('a-blue'));
  b.classList.add('a-blue');
  updateEcoTimDesc();
  renderEcoScenarios();
};

// Eco scenario + timing — Decumulo tab
function initDecEcoBtns() {
  const wrap = document.getElementById('decEcoBtns');
  Object.entries(ECO_SCENARIOS).forEach(([k, s]) => {
    const btn = document.createElement('button');
    btn.className = 'gbtn'; btn.dataset.e = k;
    btn.innerHTML = s.emoji + ' ' + s.label;
    wrap.appendChild(btn);
  });
}
function updateDecEcoTimDesc() {
  if (!decState.ecoScenario) { document.getElementById('decEcoTimDesc').innerHTML = ''; return; }
  const win = getEcoWindow(decState.ecoScenario, decState.years, decState.ecoTiming);
  const eco = ECO_SCENARIOS[decState.ecoScenario];
  const labels = { early: 'Inizio decumulo (anni 1–' + win.e + '): colpisce nella fase in cui il portafoglio è ancora grande — massimo impatto assoluto.', mid: 'Metà decumulo (anni ' + win.s + '–' + win.e + '): il prelievo ha già ridotto il capitale; la volatilità è più gestibile.', late: 'Fine decumulo (anni ' + win.s + '–' + win.e + '): il patrimonio residuo è limitato; l\'effetto sul totale è contenuto.' };
  document.getElementById('decEcoTimDesc').innerHTML = (labels[decState.ecoTiming] || '') + (eco?.duration >= 99 ? ' <em style="color:var(--text3)">(Scenario permanente.)</em>' : '');
}
document.getElementById('decEcoBtns').onclick = e => {
  const b = e.target.closest('[data-e]'); if (!b) return;
  const k = b.dataset.e;
  decState.ecoScenario = k === 'none' ? null : k;
  document.querySelectorAll('#decEcoBtns .gbtn').forEach(x => x.classList.remove('a-blue'));
  b.classList.add('a-blue');
  document.getElementById('decEcoTimRow').style.display = decState.ecoScenario ? 'block' : 'none';
  updateDecEcoTimDesc();
  updateDecOverlapWarning();
  renderDecumulo();
};
document.getElementById('decEcoTimBtns').onclick = e => {
  const b = e.target.closest('[data-t]'); if (!b) return;
  decState.ecoTiming = b.dataset.t;
  document.querySelectorAll('#decEcoTimBtns .gbtn').forEach(x => x.classList.remove('a-blue'));
  b.classList.add('a-blue');
  updateDecEcoTimDesc();
  renderDecumulo();
};

document.getElementById('allocBtns').onclick = e => {
  const b = e.target.closest('[data-k]'); if (!b) return;
  state.portfolio = b.dataset.k;
  document.querySelectorAll('#allocBtns .gbtn').forEach(x => x.classList.remove('a-blue'));
  b.classList.add('a-blue');
  const builder = document.getElementById('customBuilder');
  if (builder) builder.classList.toggle('visible', b.dataset.k === 'custom');
  if (b.dataset.k === 'custom') syncCustomTer();
  updateRetInfo(); updatePortDetailBox(); updateSeqDesc(); render();
};

function updateRetInfo() {
  const p = getPortParams(state.portfolio);
  const el = document.getElementById('retInfo'), terRate = state.ter / 100;
  const nT = r => (r - terRate) * 100;
  const liveNote = (() => {
    const d = window.liveMarketData;
    if (!d || d.status === 'loading' || d.status === 'error') return '';
    if (!d.cape_sp500 && !d.yield_eur_10y) return '';

    const isOn = state.capeAdj !== false;
    const p = getPortParams(state.portfolio);

    // Calcola delta tra CAPE-adj e storico base (per mostrare l'impatto)
    let deltaHtml = '';
    if (isOn && p && p._baseNormal != null) {
      const deltaRaw = (p.normal - p._baseNormal) * 100;
      const sign = deltaRaw >= 0 ? '+' : '';
      const col  = deltaRaw < -0.05 ? 'var(--red)' : deltaRaw > 0.05 ? 'var(--green)' : 'var(--text3)';
      deltaHtml = `<span style="color:${col};font-weight:700">${sign}${deltaRaw.toFixed(2)}%/a vs storico</span>`;
    }

    const btnLabel = isOn
      ? `⚡ CAPE-adj <span style="font-size:10px;opacity:.7">(valutazioni live)</span>`
      : `📊 Storico puro <span style="font-size:10px;opacity:.7">(baseline)</span>`;
    const btnTitle = isOn
      ? 'Rendimenti = baseline + scostamento dovuto alle valutazioni correnti (CAPE/yield), calcolato con metodo coerente col baseline. Clicca per disattivare.'
      : 'Rendimenti baseline forward-looking (non aggiustati per le valutazioni di mercato correnti). Clicca per applicare lo scostamento da CAPE/yield live.';

    const parts = [];
    if (d.cape_sp500)    parts.push(`CAPE S&P ${d.cape_sp500.toFixed(1)}`);
    if (d.yield_eur_10y) parts.push(`Yield EUR ${(d.yield_eur_10y*100).toFixed(2)}%`);
    if (d.fwd_eq_usa)    parts.push(`Fwd Eq USA ${(d.fwd_eq_usa*100).toFixed(1)}%/a`);

    return `<div class="live-recalib-note" style="display:flex;align-items:center;flex-wrap:wrap;gap:6px">
      <button onclick="toggleCapeAdj()" title="${btnTitle}"
        style="font-size:11px;font-family:'DM Mono',monospace;border:1px solid ${isOn ? 'var(--blue)' : 'var(--border2)'};
               background:${isOn ? 'var(--blue-dim)' : 'var(--bg)'};color:${isOn ? 'var(--blue)' : 'var(--text2)'};
               border-radius:5px;padding:2px 8px;cursor:pointer;white-space:nowrap;line-height:1.6">
        ${btnLabel}
      </button>
      <span style="color:var(--text3);font-size:11px">${parts.join(' · ')}</span>
      ${deltaHtml}
    </div>`;
  })();
  if (!p || !p.normal) el.innerHTML = `<span>Lifecycle: equity 80%→20% con l'età.</span><span style="color:var(--text3);width:100%;margin-top:2px">Tassi nominali netti TER ${state.ter.toFixed(2)}%. Tasse solo alla vendita finale.</span>${liveNote}`;
  else el.innerHTML = `<span>🔴 Pess. <strong>${nT(p.worst).toFixed(2)}%</strong>/a</span><span>🔵 Base <strong>${nT(p.normal).toFixed(2)}%</strong>/a</span><span>🟢 Ott. <strong>${nT(p.best).toFixed(2)}%</strong>/a</span><span>📊 Vol. <strong>${p.vol ? (p.vol * 100).toFixed(0) + '%' : 'var.'}</strong>/a</span><span style="color:var(--text3);width:100%;margin-top:2px">Tassi nominali lordi netti TER ${state.ter.toFixed(2)}%. Tasse solo alla liquidazione.</span>${liveNote}`;
}

function toggleSeq() { state.seq.on = !state.seq.on; document.getElementById('seqTog').classList.toggle('on', state.seq.on); document.getElementById('seqOpts').style.display = state.seq.on ? 'block' : 'none'; updateSeqDesc(); render(); }

function toggleCapeAdj() {
  state.capeAdj = !state.capeAdj;
  const d = window.liveMarketData;
  const hasLive = d && d.cape_sp500 && (d.status === 'ok' || d.status === 'partial');
  if (state.capeAdj && hasLive && window.recalibratePortfolios) {
    window.recalibratePortfolios(d);
  } else if (!state.capeAdj && window.restoreBasePortfolios) {
    window.restoreBasePortfolios();
  }
  updateRetInfo();
  updatePortDetailBox();
  render();
}
window.toggleCapeAdj = toggleCapeAdj;
document.getElementById('sevBtns').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; state.seq.severity = b.dataset.s; document.querySelectorAll('#sevBtns .gbtn').forEach(x => x.classList.remove('a-purple')); b.classList.add('a-purple'); updateSeqDesc(); render(); };
document.getElementById('timBtns').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; state.seq.timing = b.dataset.t; document.querySelectorAll('#timBtns .gbtn').forEach(x => x.classList.remove('a-amber')); b.classList.add('a-amber'); updateSeqDesc(); render(); };

function updateSeqDesc() {
  const mode = state.seq.mode || 'single';
  const crashYears = getCrashYears(mode, state.seq.timing, state.years);
  const cY = crashYears[0] ?? 1;
  const aw = getEquityWeight(state.portfolio, state.age + cY);
  const cwD = getCrashWeights(state.portfolio, state.age + cY);
  const sevD = SEQ_RATES[state.seq.severity];
  const acr = sevD * cwD.eq
            + sevD * CRASH_BETA.commodity * cwD.commodW
            + sevD * CRASH_BETA.carry     * cwD.carryW
            + sevD * CRASH_BETA.trend     * cwD.trendW
            + BOND_RALLY_RATE             * cwD.defensive;
  const pctv = Math.abs((acr * 100).toFixed(1)) + '%';
  const prefix = aw === 0 ? `Portafoglio 100% obbligazionario: Flight to Quality (+5%). ` : `Impatto portafoglio: −${pctv} nominale anno ${cY}. `;
  const msgs = { early: `${prefix}Magia del PAC in accumulo: comprando a sconto, il portafoglio può recuperare più velocemente.`, mid: `${prefix}Il PAC media al ribasso. Un PAC alto può annullare il danno nel medio periodo.`, late: `${prefix}Vero Sequence Risk: manca tempo per il recupero. La decorrelazione obbligazionaria è fondamentale.` };
  document.getElementById('seqDesc').innerHTML = msgs[state.seq.timing] || '';
  
  // Multi-crash info
  const mcInfo = document.getElementById('multiCrashInfo');
  if (mode !== 'single' && mcInfo) {
    mcInfo.style.display = 'block';
    const crashDescs = crashYears.map((cy, i) => {
      const sf = i === 0 ? 1.0 : i === 1 ? 0.65 : 0.45;
      const sevPct = Math.abs(SEQ_RATES[state.seq.severity] * sf * 100).toFixed(0);
      return `<strong>Crash #${i+1}</strong> (anno ${cy}): severità −${sevPct}% azionario`;
    });
    mcInfo.innerHTML = `<strong>Modalità ${mode === 'double' ? '2 crash' : '3 crash'} realistici</strong> — ` + crashDescs.join(' · ') + 
      `<br><span style="font-size:11px;opacity:.8">I crash successivi al primo hanno severità ridotta (−35% / −55% del primo): storicamente i mercati già depressi rimbalzano più velocemente.</span>`;
  } else if (mcInfo) mcInfo.style.display = 'none';
}

// Multi-crash mode buttons
document.getElementById('seqModeBtns').onclick = e => {
  const b = e.target.closest('[data-sm]'); if (!b) return;
  state.seq.mode = b.dataset.sm;
  document.querySelectorAll('#seqModeBtns .gbtn').forEach(x => x.classList.remove('a-purple'));
  b.classList.add('a-purple');
  updateSeqDesc(); render();
};

function toggleDynCorr() {
  state.seq.dynCorr = !state.seq.dynCorr;
  document.getElementById('dynCorrTog').classList.toggle('on', state.seq.dynCorr);
  updateSeqDesc(); render();
}

function toggleAllRows() { state.allRows = !state.allRows; document.getElementById('allRowsTog').classList.toggle('on', state.allRows); render(); }

// ══════════════════════════════════════════════════════════════
// PAC VARIABILE + ENTRY LISTS
// ══════════════════════════════════════════════════════════════
function renderPacChgList() {
  const el = document.getElementById('pacChgList'), sumEl = document.getElementById('pacSummary');
  if (!state.pacChanges.length) { el.innerHTML = '<div class="empty-entry">PAC fisso per tutto l\'orizzonte</div>'; sumEl.style.display = 'none'; return; }
  el.innerHTML = state.pacChanges.map(p => { const amt = +p.amount; let bc = 'pac-badge pac-badge-same', bt = '= uguale'; if (amt === 0) { bc = 'pac-badge pac-badge-stop'; bt = 'SOSPESO'; } else if (amt > state.pac) { bc = 'pac-badge pac-badge-up'; bt = '+ €' + fmtN(amt - state.pac) + '/m'; } else if (amt < state.pac) { bc = 'pac-badge pac-badge-down'; bt = '- €' + fmtN(state.pac - amt) + '/m'; } return `<div class="erow"><span class="elab">Anno</span><input class="einput" type="number" min="1" max="${state.years}" value="${p.year}" onchange="updPacChg(${p.id},'year',this.value)"><span class="elab">€/mese</span><input class="einput" type="number" min="0" step="50" value="${p.amount}" placeholder="0=sospeso" onchange="updPacChg(${p.id},'amount',this.value)"><span class="${bc}">${bt}</span><button class="dbtn" onclick="delPacChg(${p.id})">✕</button></div>`; }).join('');
  const sorted = [...state.pacChanges].sort((a, b) => +a.year - +b.year); let tl = '';
  if (sorted[0].year > 1) tl = `Anni 1-${sorted[0].year - 1}: €${fmtN(state.pac)}/m`;
  sorted.forEach((c, i) => { const nxt = sorted[i + 1] ? sorted[i + 1].year - 1 : state.years; const rng = +c.year === nxt ? `Anno ${c.year}` : `Anni ${c.year}-${nxt}`; const sep = tl ? ' → ' : ''; tl += +c.amount === 0 ? `${sep}${rng}: SOSPESO` : `${sep}${rng}: €${fmtN(c.amount)}/m`; });
  sumEl.innerHTML = '📅 ' + tl; sumEl.style.display = 'block';
}
function renderPicList() { const el = document.getElementById('picList'); if (!state.pics.length) { el.innerHTML = '<div class="empty-entry">Nessun versamento aggiuntivo</div>'; return; } el.innerHTML = state.pics.map(p => `<div class="erow"><span class="elab">Anno</span><input class="einput" type="number" min="1" max="${state.years}" value="${p.year}" onchange="updPic(${p.id},'year',this.value)"><span class="elab">Importo €</span><input class="einput" type="number" min="0" step="1000" value="${p.amount}" onchange="updPic(${p.id},'amount',this.value)"><button class="dbtn" onclick="delPic(${p.id})">✕</button></div>`).join(''); }
function renderExpList() { const el = document.getElementById('expList'); if (!state.exps.length) { el.innerHTML = '<div class="empty-entry">Nessuna spesa straordinaria</div>'; return; } el.innerHTML = state.exps.map(e => `<div class="erow"><span class="elab">Anno</span><input class="einput" type="number" min="1" max="${state.years}" value="${e.year}" onchange="updExp(${e.id},'year',this.value)"><span class="elab">Importo €</span><input class="einput" type="number" min="0" step="1000" value="${e.amount}" onchange="updExp(${e.id},'amount',this.value)"><button class="dbtn" onclick="delExp(${e.id})">✕</button></div>`).join(''); }
function addPic() { state.pics.push({ id: picId++, year: 5, amount: 10000 }); renderPicList(); render(); }
function addExp() { state.exps.push({ id: expId++, year: 6, amount: 20000 }); renderExpList(); render(); }
function delPic(id) { state.pics = state.pics.filter(p => p.id !== id); renderPicList(); render(); }
function delExp(id) { state.exps = state.exps.filter(e => e.id !== id); renderExpList(); render(); }
function updPic(id, k, v) { const p = state.pics.find(p => p.id === id); if (p) { p[k] = +v; render(); } }
function updExp(id, k, v) { const e = state.exps.find(e => e.id === id); if (e) { e[k] = +v; render(); } }
function addPacChg() { state.pacChanges.push({ id: pacChgId++, year: Math.min(Math.max(1, Math.round(state.years / 2)), state.years), amount: 0 }); renderPacChgList(); render(); }
function delPacChg(id) { state.pacChanges = state.pacChanges.filter(c => c.id !== id); renderPacChgList(); render(); }
function updPacChg(id, k, v) { const c = state.pacChanges.find(c => c.id === id); if (c) { c[k] = +v; renderPacChgList(); render(); } }

// Startup
initDecEcoBtns();

// ══════════════════════════════════════════════════════════════
// PERSISTENZA STATO — localStorage
// Salva automaticamente state, stateB, decState ad ogni render.
// Ripristina al caricamento. Compatibile con tutti i browser moderni.
// Chiave: 'suitePro_v2_state' (versione nel nome per reset automatico)
// ══════════════════════════════════════════════════════════════
const LS_KEY   = 'suitePro_v2_state';
const LS_KEYB  = 'suitePro_v2_stateB';
const LS_KEYD  = 'suitePro_v2_decState';
const LS_KEYCUSTOM = 'suitePro_v2_custom';

function saveStateToLS() {
  try {
    // Serializza solo i campi primitivi / sicuri di state
    const snap = {
      w: state.w, pac: state.pac, age: state.age, years: state.years,
      opt: state.opt, ter: state.ter, taxEq: state.taxEq, taxOb: state.taxOb,
      inflBottom: state.inflBottom, inflVol: state.inflVol,
      portfolio: state.portfolio,
      seq: { on: state.seq.on, severity: state.seq.severity, timing: state.seq.timing, mode: state.seq.mode, dynCorr: !!state.seq.dynCorr },
      pics: state.pics, exps: state.exps, pacChanges: state.pacChanges,
      allRows: state.allRows, showLiq: state.showLiq, showVolBands: state.showVolBands,
      activeEcoScenario: state.activeEcoScenario, ecoTiming: state.ecoTiming,
      fxHedge: !!state.fxHedge, fxVol: state.fxVol, fxHedgeCost: state.fxHedgeCost,
      capeAdj: state.capeAdj !== false,
    };
    localStorage.setItem(LS_KEY, JSON.stringify(snap));
    localStorage.setItem(LS_KEYB, JSON.stringify({ portfolio: stateB.portfolio, ter: stateB.ter, pac: stateB.pac }));
    localStorage.setItem(LS_KEYD, JSON.stringify({ portfolio: decState.portfolio, strategy: decState.strategy, startPortfolio: decState.startPortfolio, withdrawal: decState.withdrawal, years: decState.years, inflation: decState.inflation, ter: decState.ter }));
    localStorage.setItem(LS_KEYCUSTOM, JSON.stringify(state.customPortfolio));
  } catch(e) { /* storage pieno o disabilitato — silenzioso */ }
}

function loadStateFromLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const snap = JSON.parse(raw);
    // Campi numerici
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
    state.fxVol         = n(snap.fxVol, 0.085);    state.fxHedgeCost   = n(snap.fxHedgeCost, 0.003);
    state.capeAdj       = snap.capeAdj !== false; // default true se non presente
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
    picId    = state.pics.length       ? Math.max(...state.pics.map(p=>p.id||0))      + 1 : 0;
    expId    = state.exps.length       ? Math.max(...state.exps.map(e=>e.id||0))      + 1 : 0;
    pacChgId = state.pacChanges.length ? Math.max(...state.pacChanges.map(c=>c.id||0)) + 1 : 0;

    // stateB
    const rawB = localStorage.getItem(LS_KEYB);
    if (rawB) {
      const snapB = JSON.parse(rawB);
      stateB.portfolio = snapB.portfolio || 'eq50';
      stateB.ter       = n(snapB.ter, 0.20);
      stateB.pac       = n(snapB.pac, -1);
    }
    // decState
    const rawD = localStorage.getItem(LS_KEYD);
    if (rawD) {
      const snapD = JSON.parse(rawD);
      decState.portfolio      = snapD.portfolio       || 'eq60';
      decState.strategy       = snapD.strategy        || 'inflation';
      decState.startPortfolio = n(snapD.startPortfolio, 500000);
      decState.withdrawal     = n(snapD.withdrawal, 20000);
      decState.years          = n(snapD.years, 30);
      decState.inflation      = n(snapD.inflation, 2.0);
      decState.ter            = n(snapD.ter, 0.20);
    }
    // Portfolio custom
    const rawC = localStorage.getItem(LS_KEYCUSTOM);
    if (rawC) {
      const snapC = JSON.parse(rawC);
      if (snapC && Array.isArray(snapC.slots)) state.customPortfolio = snapC;
    }
    return true;
  } catch(e) { return false; }
}

// Patch render() per auto-salvataggio
const _render_orig = render;
window.render = function(...args) {
  _render_orig(...args);
  saveStateToLS();
};
render = window.render;

// Mostra badge quando il restore avviene
function _showRestoreBadge() {
  const el = document.getElementById('liveDataBanner');
  if (!el) return;
  const badge = document.createElement('div');
  badge.style.cssText = 'display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--green);background:var(--green-dim);border:1px solid rgba(30,142,62,.3);border-radius:5px;padding:3px 10px;margin-left:8px';
  badge.innerHTML = '💾 Sessione precedente ripristinata <button onclick="clearSavedState()" style="margin-left:6px;border:none;background:none;cursor:pointer;font-size:11px;color:var(--text3)" title="Cancella e riparte da zero">✕</button>';
  el.parentNode && el.parentNode.insertBefore(badge, el.nextSibling);
  setTimeout(() => badge.remove(), 6000);
}

function clearSavedState() {
  try {
    [LS_KEY, LS_KEYB, LS_KEYD, LS_KEYCUSTOM].forEach(k => localStorage.removeItem(k));
  } catch(_) {}
  location.reload();
}
window.clearSavedState = clearSavedState;

// ── Ripristino al caricamento ─────────────────────────────────
(function restoreOnLoad() {
  const restored = loadStateFromLS();
  if (!restored) return;
  // Riallinea gli slider UI ai valori ripristinati
  const _s = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  const _l = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  _s('sW', state.w);           _l('lW', fmt(state.w));
  _s('sPac', state.pac);       _l('lPac', '€' + fmtN(state.pac) + '/m');
  _s('sAge', state.age);       _l('lAge', state.age + ' anni');
  _s('sYears', state.years);   _l('lYears', state.years + ' anni');
  _s('sOpt', state.opt);       _l('lOpt', fmt(state.opt));
  _s('sTer', state.ter);       _l('lTer', state.ter.toFixed(2) + '%');
  _s('sTaxEq', state.taxEq);   _l('lTaxEq', state.taxEq.toFixed(1) + '%');
  _s('sTaxOb', state.taxOb);   _l('lTaxOb', state.taxOb.toFixed(1) + '%');
  _s('sInflBottom', state.inflBottom); _l('lInflBottom', state.inflBottom.toFixed(1) + '%');
  _s('sInflVol', state.inflVol);       _l('lInflVol', state.inflVol.toFixed(1) + '%');
  // Portafoglio
  document.querySelectorAll('#allocBtns .gbtn').forEach(b => b.classList.toggle('a-blue', b.dataset.k === state.portfolio));
  // Sequence risk
  if (state.seq.on) {
    const tog = document.getElementById('seqTog');
    const opts = document.getElementById('seqOpts');
    if (tog) tog.classList.add('on');
    if (opts) opts.style.display = 'block';
  }
  document.querySelectorAll('#sevBtns .gbtn').forEach(b => b.classList.toggle('a-purple', b.dataset.s === state.seq.severity));
  document.querySelectorAll('#timBtns .gbtn').forEach(b => b.classList.toggle('a-amber', b.dataset.t === state.seq.timing));
  document.querySelectorAll('#seqModeBtns .gbtn').forEach(b => b.classList.toggle('a-purple', b.dataset.sm === state.seq.mode));
  setTimeout(_showRestoreBadge, 1800);
})();

// ══════════════════════════════════════════════════════════════
// PDF GENERATION
// ══════════════════════════════════════════════════════════════

// Normalizza caratteri accentati per compatibilità con font Helvetica di jsPDF
function pdfSafe(s) {
  // Mappa simboli Unicode comuni a equivalenti rappresentabili in Helvetica/WinAnsi.
  // Strategy: accenti italiani -> lettere semplici (no apostrofo brutto), simboli
  // matematici/freccie -> equivalenti ASCII, smart-quotes -> ASCII quotes.
  const map = {
    'à':'a','è':'e','é':'e','ì':'i','í':'i','ò':'o','ó':'o','ù':'u','ú':'u',
    'À':'A','È':'E','É':'E','Ì':'I','Í':'I','Ò':'O','Ó':'O','Ù':'U','Ú':'U',
    'â':'a','ê':'e','î':'i','ô':'o','û':'u','Â':'A','Ê':'E','Î':'I','Ô':'O','Û':'U',
    'ä':'a','ö':'o','ü':'u','Ä':'A','Ö':'O','Ü':'U','ñ':'n','Ñ':'N','ç':'c','Ç':'C',
    'ß':'ss',
    // smart quotes -> ASCII
    '\u2018':"'", '\u2019':"'", '\u201A':"'", '\u201B':"'",
    '\u201C':'"', '\u201D':'"', '\u201E':'"', '\u201F':'"',
    '\u2032':"'", '\u2033':'"',
    // trattini e ellissi
    '\u2010':'-','\u2011':'-','\u2012':'-','\u2013':'-','\u2014':'-','\u2015':'-',
    '\u2026':'...',
    // simboli matematici e tipografici
    '\u00B1':'+/-',    // ±
    '\u00D7':'x',       // ×
    '\u00F7':'/',       // ÷
    '\u2260':'!=',      // ≠
    '\u2264':'<=',      // ≤
    '\u2265':'>=',      // ≥
    '\u00B0':' gradi',  // °
    '\u00B2':'^2','\u00B3':'^3',
    '\u00BC':'1/4','\u00BD':'1/2','\u00BE':'3/4',
    '\u00A9':'(c)','\u00AE':'(R)','\u2122':'(TM)',
    '\u20AC':'EUR ',    // € -> EUR con spazio per staccare dal numero
    '\u00A3':'GBP','\u00A5':'JPY','\u00A2':'c',
    // freccie
    '\u2192':'->','\u2190':'<-','\u2194':'<->','\u21D2':'=>','\u21D0':'<=',
    '\u2191':'^','\u2193':'v',
    // bullet
    '\u2022':'-','\u00B7':'-','\u25E6':'-','\u25AA':'-','\u25CF':'-',
    // Greek (uso scientifico/finanziario)
    '\u0394':'Delta','\u03B4':'delta','\u03A3':'Sigma','\u03C3':'sigma',
    '\u03BC':'mu','\u03B1':'alpha','\u03B2':'beta','\u03B3':'gamma',
    '\u03C0':'pi','\u03BB':'lambda','\u03B8':'theta','\u03C1':'rho',
    '\u03C7':'chi','\u03C6':'phi','\u03A9':'Omega','\u03C9':'omega',
    // spazi non-breaking e zero-width
    '\u00A0':' ','\u202F':' ','\u2009':' ','\u200B':'','\u200C':'','\u200D':'','\uFEFF':'',
    // box drawing usato nei commenti
    '\u2500':'-','\u2501':'-','\u2550':'=','\u2014':'-',
  };
  let out = '';
  for (const ch of String(s)) {
    const code = ch.charCodeAt(0);
    if (code < 128) { out += ch; continue; }
    if (map[ch] != null) { out += map[ch]; continue; }
    // Latin-1 supplement (à-ÿ, A-Ÿ) renderizzabile da Helvetica/WinAnsi
    if (code >= 0x00A0 && code <= 0x00FF) { out += ch; continue; }
    // fallback: rimuovi caratteri non rappresentabili (no più "?")
    out += '';
  }
  return out;
}

// ══════════════════════════════════════════════════════════════
// EXPORT EXCEL — genera .xlsx con proiezioni, MC, tabella annuale
// Usa la libreria SheetJS (xlsx) caricata via CDN in index.html.
// ══════════════════════════════════════════════════════════════
async function exportExcel() {
  const btn = document.getElementById('excelBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Generazione…'; }
  try {
    if (typeof XLSX === 'undefined') throw new Error('SheetJS non caricato');
    const { w, age, years, ter, portfolio, seq } = state;
    const terRate = ter / 100;
    const endAge = age + years;
    const portMeta = getPortParams(portfolio) || {};
    const portLabel = getPortLabel(portfolio);

    // ── 1. Dati proiezione annuale (3 scenari) ─────────────────
    const dN = project('normal', seq?.on);
    const dB = project('best',   seq?.on);
    const dW = project('worst',  seq?.on);
    const txF = blendedTaxRate(endAge);

    const hdrProj = ['Anno','Età','Investito (€)','Valore Base (€)','Valore Ott. (€)',
                     'Valore Pess. (€)','Guadagno Base (€)','Netto Fiscale Base (€)','Rend. annuo IRR (%)'];
    const rowsProj = dN.map((d, i) => {
      const vN = d.value, inv = d.invested;
      const vB = dB[i]?.value ?? vN, vW = dW[i]?.value ?? vN;
      const gain = Math.max(0, vN - inv);
      const netto = vN - gain * txF;
      // IRR money-weighted: tiene conto del capitale iniziale E dei versamenti PAC.
      const cagr = i > 0 ? (planIRR(dN, i) * 100).toFixed(2) : 0;
      return [d.year ?? i, d.age ?? age + i, Math.round(inv), Math.round(vN),
              Math.round(vB), Math.round(vW), Math.round(vN - inv), Math.round(netto), +cagr];
    });

    // ── 2. Riepilogo parametri ──────────────────────────────────
    const hdrParam = ['Parametro', 'Valore'];
    const rowsParam = [
      ['Portafoglio', portLabel],
      ['Capitale iniziale (€)', w],
      ['PAC mensile (€)', state.pac],
      ['Orizzonte (anni)', years],
      ['Età inizio', age],
      ['TER (%)', ter],
      ['Rendimento base (%/a)', portMeta.normal ? (portMeta.normal * 100).toFixed(2) : 'variabile'],
      ['Rendimento ott. (%/a)', portMeta.best   ? (portMeta.best   * 100).toFixed(2) : 'variabile'],
      ['Rendimento pess. (%/a)',portMeta.worst  ? (portMeta.worst  * 100).toFixed(2) : 'variabile'],
      ['Volatilità σ (%/a)',   portMeta.vol    ? (portMeta.vol    * 100).toFixed(1) : 'variabile'],
      ['Beta inflazione',       portMeta.inflBeta != null ? portMeta.inflBeta.toFixed(2) : 'n/d'],
      ['Tassa az. (%)',         state.taxEq],
      ['Tassa ob. (%)',         state.taxOb],
      ['Aliquota blended (%)',  (txF * 100).toFixed(2)],
      ['Sequence Risk',         seq?.on ? `Sì — ${seq.severity} / ${seq.timing}` : 'No'],
      ['CAPE-adjusted returns',  state.capeAdj ? 'Attivo' : 'Disattivo'],
      ['CAPE S&P500 (live)',     window._liveData?.capeUSA ? window._liveData.capeUSA.toFixed(1) : 'n/d'],
      ['CAPE Europa (live)',     window._liveData?.capeEU  ? window._liveData.capeEU.toFixed(1)  : 'n/d'],
      ['Delta rendimento CAPE',  window._liveData?.capeDeltaEq != null ? (window._liveData.capeDeltaEq * 100).toFixed(2) + '%/a' : 'n/d'],
      ['Data generazione', new Date().toLocaleDateString('it-IT')],
    ];

    // ── 3. Asset class custom (se applicabile) ──────────────────
    let wsCustom = null;
    if (portfolio === 'custom' && state.customPortfolio?.slots?.length) {
      const hdrAC = ['Asset Class', 'Peso (%)', 'Rendimento μ (%/a)',
                     'Volatilità σ (%/a)', 'Beta Inflazione', 'Categoria', 'Fonte (indicativa)'];
      const total = state.customPortfolio.slots.reduce((s,sl)=>s+(+sl.pct||0),0)||1;
      const rowsAC = state.customPortfolio.slots.filter(s=>s.ac&&s.pct>0).map(sl => {
        const ac = ASSET_CLASSES[sl.ac] || {};
        return [
          ac.label || sl.ac,
          (sl.pct / total * 100).toFixed(1),
          ac.mu  ? (ac.mu  * 100).toFixed(2) : '',
          ac.vol ? (ac.vol * 100).toFixed(1) : '',
          ac.inflBeta != null ? ac.inflBeta.toFixed(2) : '',
          ac.cat || '',
          ac.src || '',
        ];
      });
      wsCustom = XLSX.utils.aoa_to_sheet([hdrAC, ...rowsAC]);
      wsCustom['!cols'] = [30,10,14,14,14,10,30].map(w=>({wch:w}));
    }

    // ── 4. Monte Carlo (se già eseguito) ────────────────────────
    let wsMC = null;
    if (window._lastMCResults && window._lastMCResults.length > 0) {
      const sorted = [...window._lastMCResults].sort((a,b)=>a-b);
      const N = sorted.length;
      const pct = p => sorted[Math.max(0, Math.floor(p/100*N)-1)];
      const hdrMC = ['Percentile','Valore Finale (€)'];
      const pctiles = [5,10,25,50,75,90,95];
      const rowsMC = pctiles.map(p => [p + '°', Math.round(pct(p))]);
      rowsMC.push(['Media', Math.round(sorted.reduce((s,v)=>s+v,0)/N)]);
      rowsMC.push(['Simulazioni', N]);
      wsMC = XLSX.utils.aoa_to_sheet([hdrMC, ...rowsMC]);
      wsMC['!cols'] = [{wch:12},{wch:16}];
    }

    // ── 5. Backtesting storico ─────────────────────────────────
    const hdrBT = ['Anno Inizio', 'Evento', 'Rend. Piano IRR (%/a)', 'Rend. Asset TWR (%/a)', 'Valore Finale (€)', 'Max Drawdown (%)', 'Totale Versato (€)', 'Ritorno Nominale (%)'];
    const btPortKey = btState?.port === 'sim' ? portfolio : (btState?.port || portfolio);
    const btPac = btState?.pac ?? state.pac;
    const btW0 = btState?.w ?? state.w;
    const btRows = [];
    // I preset con leva / managed futures non sono backtestabili (vedi backtest.js)
    const BT_SKIP = { ec_us_9060: 1, ec_glob_9060: 1, return_stack: 1 };
    if (!BT_SKIP[btPortKey]) {
      for (const [syStr, period] of Object.entries(BT_PERIODS)) {
        const sy = +syStr;
        try {
          const res = simulateBacktest(btPortKey, sy, btPac, btW0);
          btRows.push([
            sy,
            period.label.split('—')[1]?.trim() || period.label,
            +((res.irr * 100).toFixed(2)),
            +((res.twr * 100).toFixed(2)),
            Math.round(res.finalValue),
            +((res.maxDD * 100).toFixed(1)),
            Math.round(res.finalInvested),
            +((res.totalReturn * 100).toFixed(1)),
          ]);
        } catch(e) { /* skip if data unavailable */ }
      }
      btRows.sort((a, b) => b[3] - a[3]); // sort by TWR desc (confrontabile tra anni)
    } else {
      btRows.push(['—', 'Backtest non applicabile a portafogli con leva / managed futures', '', '', '', '', '', '']);
    }
    const wsBT = XLSX.utils.aoa_to_sheet([hdrBT, ...btRows]);
    wsBT['!cols'] = [10,28,18,18,16,16,16,14].map(w=>({wch:w}));
    // Nota: analisi interattive aggiuntive non esportabili per combinazione
    XLSX.utils.sheet_add_aoa(wsBT, [
      [],
      ['Analisi interattive aggiuntive (nell\'applicazione):'],
      ['Rischio di Sequenza', 'Stessa crisi a inizio/meta/fine piano — la perdita in € cresce col capitale accumulato'],
      ['Stress Test Macro', 'Percorso mensile esatto durante le 10 crisi storiche principali'],
      ['Modalita versamento', 'Capitale + PAC · Solo capitale · Solo PAC — usano i valori del simulatore'],
      ['Eventi inclusi', 'La tabella sopra riflette aggiunte una tantum (PIC) e prelievi impostati nel simulatore'],
    ], { origin: -1 });

    // ── 6. Sequence Risk multiplo ──────────────────────────────
    const hdrSR = ['Modalità Crash', 'Timing', 'Severità', 'Valore Finale (€)', 'Gap vs Base (€)', 'Gap vs Base (%)'];
    const srBase = project('normal', false);
    const srBaseVal = srBase[years].value;
    const srRows = [];
    const severities = ['mild', 'moderate', 'severe'];
    const timings = ['early', 'mid', 'late'];
    const modes = ['single', 'double', 'triple'];
    const severityLabels = { mild: 'Lieve (−20%)', moderate: 'Moderato (−35%)', severe: 'Severo (−50%)' };
    const modeLabels = { single: 'Crash singolo', double: 'Doppio crash', triple: 'Triplo crash' };
    const timingLabels = { early: 'Inizio piano', mid: 'Metà piano', late: 'Fine piano' };
    // Sample key scenarios for the SR table
    const srScenarios = [
      { mode: 'single', timing: 'early', severity: 'moderate' },
      { mode: 'single', timing: 'late',  severity: 'moderate' },
      { mode: 'single', timing: 'early', severity: 'severe'   },
      { mode: 'double', timing: 'early', severity: 'moderate' },
      { mode: 'triple', timing: 'early', severity: 'moderate' },
    ];
    for (const sc of srScenarios) {
      const savedSeq = { ...state.seq };
      state.seq = { on: true, severity: sc.severity, timing: sc.timing, mode: sc.mode, dynCorr: false };
      const dSR = project('normal', true);
      state.seq = savedSeq;
      const val = dSR[years].value;
      const gap = val - srBaseVal;
      const gapPct = srBaseVal > 0 ? (gap / srBaseVal * 100).toFixed(1) : '0';
      srRows.push([
        modeLabels[sc.mode], timingLabels[sc.timing], severityLabels[sc.severity],
        Math.round(val), Math.round(gap), +gapPct,
      ]);
    }
    const wsSR = XLSX.utils.aoa_to_sheet([hdrSR, ...srRows]);
    wsSR['!cols'] = [18,16,16,16,14,12].map(w=>({wch:w}));

    // ── 6b. Stress Test Macro Storici ─────────────────────────
    const CRISIS_XLS = [
      { label:'1973-74 Stagflazione OPEC',   startYr:1972, startMo:10, windowMonths:36, sp500:'-48%', macro:'Inflaz. 12% / Tassi 12% (Fed)',       note:'Unica crisi in cui l\'oro batte tutte le asset class (+162%). Bond reale negativo per inflazione.' },
      { label:'1987 Black Monday',           startYr:1987, startMo:8,  windowMonths:24, sp500:'-34%', macro:'Inflaz. 3.6% / Tassi 7.25% (Fed)',     note:'Crash istantaneo (-22.6% in 1 giorno), recovery in 22 mesi. Bond tengono.' },
      { label:'2000-02 Bolla Dot-com',       startYr:2000, startMo:1,  windowMonths:48, sp500:'-49%', macro:'CAPE 44 / Tassi 6.5%->1% (Fed)',       note:'Crisi lenta. Bond positivi per tutto il periodo. Recovery azionaria > 5 anni.' },
      { label:'2008-09 Crisi Finanziaria',   startYr:2007, startMo:10, windowMonths:48, sp500:'-57%', macro:'Inflaz. 3.8%->-0.4% / Tassi -> 0.25%', note:'Correlazioni esplodono: solo Treasury e oro tengono. Recovery 54 mesi.' },
      { label:'2020 COVID-19',               startYr:2020, startMo:1,  windowMonths:18, sp500:'-34%', macro:'Inflaz. 1.2% / QE illimitato',         note:'Crash piu veloce della storia. Recovery < 6 mesi. Bond e oro positivi.' },
      { label:'2022 Inflazione & Tassi',     startYr:2021, startMo:12, windowMonths:30, sp500:'-20%', macro:'Inflaz. 8% / Tassi 0.25%->4.5%',      note:'Azioni -20% E bond -15% simultaneamente. 60/40 peggiore dal 1937.' },
    ];

    const btPortKeyXLS = btState?.port === 'sim' ? portfolio : (btState?.port || portfolio);
    const btW0XLS      = btState?.w  ?? state.w;
    const eqWxls   = typeof getEquityWeight === 'function' ? getEquityWeight(btPortKeyXLS, age) : 0.6;
    const goldWxls = typeof getGoldWeight   === 'function' ? getGoldWeight(btPortKeyXLS)   : 0;
    const cashWxls = typeof getCashWeight   === 'function' ? getCashWeight(btPortKeyXLS)   : 0;
    const obWxls   = Math.max(0, 1 - eqWxls - goldWxls - cashWxls);
    const terMxls  = (state.ter / 100) / 12;

    const hdrCS = [
      'Crisi', 'S&P500 Storico', 'Contesto Macro',
      'Max Drawdown Port. (%)', 'Perdita Max (€)', 'Mese Peggiore (%)',
      'Recovery (mesi)', 'Valore Fine Finestra (base 100)',
      'Az.(' + (eqWxls*100).toFixed(0) + '%)', 'Ob.(' + (obWxls*100).toFixed(0) + '%)',
      'Oro(' + (goldWxls*100).toFixed(0) + '%)', 'Liq.(' + (cashWxls*100).toFixed(0) + '%)',
      'Note',
    ];

    const xlsCrisisRows = [];
    for (const c of CRISIS_XLS) {
      try {
        const startIdx = Math.max(0, (c.startYr - 1970) * 12 + (c.startMo - 1));
        const endIdx   = Math.min(startIdx + c.windowMonths, HIST_MONTHLY.length - 1);
        let cum = 100, peak = 100, maxDD = 0, maxDDM = 0, worstRet = 0;
        const path = [];
        for (let idx = startIdx; idx <= endIdx; idx++) {
          if (idx >= HIST_MONTHLY.length) break;
          const row = calibrateHistRow(HIST_MONTHLY[idx]);
          const pr = eqWxls*row[0] + obWxls*row[1] + goldWxls*row[2] + cashWxls*0.002 - terMxls;
          cum = Math.max(0, cum*(1+pr));
          if (cum > peak) peak = cum;
          const dd = (cum-peak)/peak;
          if (dd < maxDD) { maxDD = dd; maxDDM = idx - startIdx; }
          if (pr < worstRet) worstRet = pr;
          path.push(cum);
        }
        let recovM = null, pastTrough = false;
        for (let i = 0; i < path.length; i++) {
          if (i >= maxDDM) pastTrough = true;
          if (pastTrough && path[i] >= 100) { recovM = i; break; }
        }
        const lossEur = Math.round(btW0XLS * maxDD);
        xlsCrisisRows.push([
          c.label, c.sp500, c.macro,
          +(maxDD*100).toFixed(2),
          lossEur,
          +(worstRet*100).toFixed(2),
          recovM !== null ? recovM : '>' + c.windowMonths,
          +(path[path.length-1] ?? 100).toFixed(2),
          +(eqWxls*100).toFixed(1),
          +(obWxls*100).toFixed(1),
          +(goldWxls*100).toFixed(1),
          +(cashWxls*100).toFixed(1),
          c.note,
        ]);
      } catch(e) { /* skip */ }
    }

    // Aggiunge riga di intestazione con portafoglio usato
    const xlsCrisisInfo = [
      ['── STRESS TEST MACRO STORICI ──', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Portafoglio', portLabel, '', '', '', '', '', '', '', '', '', '', ''],
      ['Capitale simulato (€)', btW0XLS, '', '', '', '', '', '', '', '', '', '', ''],
      ['TER (%/a)', state.ter, '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '', ''],
    ];
    const wsCS = XLSX.utils.aoa_to_sheet([...xlsCrisisInfo, hdrCS, ...xlsCrisisRows]);
    wsCS['!cols'] = [30,12,30,14,14,14,14,16,10,10,10,10,40].map(w=>({wch:w}));

    // ── 7. Quant Analytics — VaR/CVaR e Sharpe ──────────────────
    let wsQuant = null;
    try {
      if (typeof computeVaRCVaR === 'function') {
        const qPort = portMeta;
        const qMu  = (portfolio === 'custom') ? (calcCustomParams()?.normal ?? 0.055) : (qPort.normal ?? 0.055);
        const qVol = (portfolio === 'custom') ? (calcCustomParams()?.vol ?? 0.095)    : (qPort.vol    ?? 0.095);
        const qTer = ter;
        const qVal = w || 100000;
        const horizons = [1, 3, 5, 10];
        const hdrQ = ['Orizzonte', 'Metodo', 'VaR 95% (€)', 'VaR 99% (€)', 'VaR 99.9% (€)', 'CVaR 95% (€)', 'CVaR 99% (€)', 'CVaR 99.9% (€)'];
        const rowsQ = [];
        const methodLabels = { param: 'Gaussiano', tstud: 't-Student', mc: 'Monte Carlo' };
        for (const h of horizons) {
          const r = computeVaRCVaR(qMu, qVol, h, qVal, qTer);
          for (const [mk, ml] of Object.entries(methodLabels)) {
            const m = r[mk];
            rowsQ.push([
              h + (h === 1 ? ' anno' : ' anni'),
              ml,
              Math.round(m.var95),
              Math.round(m.var99),
              Math.round(m.var999),
              Math.round(m.cvar95),
              Math.round(m.cvar99),
              Math.round(m.cvar999),
            ]);
          }
          rowsQ.push(['', '', '', '', '', '', '', '']); // spacer tra orizzonti
        }
        // Sharpe e metriche portafoglio corrente
        const muNet = qMu - qTer / 100;
        const sharpe = qVol > 0 ? (muNet - 0.025) / qVol : 0;
        const infoRows = [
          ['── METRICHE PORTAFOGLIO ──', ''],
          ['Portafoglio', portLabel],
          ['Valore portafoglio (€)', qVal],
          ['Rendimento atteso netto (%/a)', (muNet * 100).toFixed(2) + '%'],
          ['Volatilità σ (%/a)', (qVol * 100).toFixed(1) + '%'],
          ['Sharpe ratio (RF=2.5%)', sharpe.toFixed(3)],
          ['TER (%)', qTer.toFixed(2) + '%'],
          ['', ''],
          ['── VaR/CVaR (perdita massima attesa in €) ──', ''],
        ];
        wsQuant = XLSX.utils.aoa_to_sheet([
          ...infoRows.map(r => [r[0], r[1], '', '', '', '', '', '']),
          ['', '', '', '', '', '', '', ''],
          hdrQ,
          ...rowsQ,
        ]);
        wsQuant['!cols'] = [12, 14, 16, 16, 16, 16, 16, 16].map(w => ({ wch: w }));
      }
    } catch (e) { console.warn('Skip foglio Quant Analytics:', e.message); }

    // ── 8. Build workbook ───────────────────────────────────────
    const wb = XLSX.utils.book_new();
    const wsProj = XLSX.utils.aoa_to_sheet([hdrProj, ...rowsProj]);
    wsProj['!cols'] = [8,6,14,14,14,14,14,14,10].map(w=>({wch:w}));
    const wsParam = XLSX.utils.aoa_to_sheet([hdrParam, ...rowsParam]);
    wsParam['!cols'] = [{wch:26},{wch:24}];

    // ── Foglio Decumulo Storico (Trinity-style) ──
    let wsDecHist = null;
    try {
      const dh = runDecumuloHistorical();
      if (dh && dh.results && dh.results.length > 0) {
        const hdrDH = ['Anno Inizio Decumulo', 'Sopravvive?', 'Capitale Finale (€)', 'Anno Esaurimento', 'Max Drawdown %'];
        const sorted = [...dh.results].sort((a, b) => a.startYear - b.startYear);
        const rowsDH = sorted.map(x => [
          x.startYear,
          x.survived ? 'SI' : 'NO',
          x.finalCap,
          x.exhaustYear || '',
          (x.maxDrawdown * 100).toFixed(1) + '%',
        ]);
        // Riga di intestazione statistiche
        const sortedByCap = [...dh.results].sort((a, b) => a.finalCap - b.finalCap);
        const N = sortedByCap.length;
        const stats = [
          ['── STATISTICHE AGGREGATE ──', '', '', '', ''],
          ['Tasso sopravvivenza', (dh.successRate * 100).toFixed(0) + '%', '', '', ''],
          ['Anni di partenza testati', dh.nTotal, '', '', ''],
          ['Anni sopravvissuti', dh.nSurvived, '', '', ''],
          ['Capitale finale mediano', sortedByCap[Math.floor(N * 0.5)]?.finalCap || 0, '', '', ''],
          ['Capitale finale P10 (peggiore)', sortedByCap[Math.floor(N * 0.10)]?.finalCap || 0, '', '', ''],
          ['Capitale finale P90 (migliore)', sortedByCap[Math.floor(N * 0.90)]?.finalCap || 0, '', '', ''],
          ['Worst start year', dh.worstStart ? dh.worstStart.startYear : 'Nessun fail', '', '', ''],
          ['', '', '', '', ''],
          ['── DETTAGLIO PER ANNO DI PARTENZA ──', '', '', '', ''],
        ];
        wsDecHist = XLSX.utils.aoa_to_sheet([hdrDH, ...stats, hdrDH, ...rowsDH]);
        wsDecHist['!cols'] = [22, 14, 18, 18, 14].map(w => ({ wch: w }));
      }
    } catch (e) { console.warn('Skip foglio Decumulo Storico:', e.message); }

    // ── Foglio FX e Stress (solo per portfolio custom) ──
    let wsFx = null;
    if (portfolio === 'custom') {
      const cp = calcCustomParams();
      if (cp) {
        const fxRows = [
          ['── ESPOSIZIONE CAMBIO E REGIME DI STRESS ──', ''],
          ['', ''],
          ['Esposizione FX (% non-EUR)', (cp.fxExposure * 100).toFixed(1) + '%'],
          ['Hedging valutario attivo', cp.fxHedged ? 'SI' : 'NO'],
          ['Costo annuo hedging', cp.fxHedged ? (cp.fxCost * 100).toFixed(3) + '%' : '0%'],
          ['', ''],
          ['── VOLATILITA NEI DUE REGIMI ──', ''],
          ['Vol portafoglio (senza FX)', (cp.volNoFx * 100).toFixed(2) + '%'],
          ['Vol portafoglio (incluso FX, regime normale)', (cp.vol * 100).toFixed(2) + '%'],
          ['Vol in regime di stress (correlazioni -> 1)', (cp.volStress * 100).toFixed(2) + '%'],
          ['Amplificazione vol in stress', '+' + (((cp.volStress - cp.vol) / cp.vol) * 100).toFixed(0) + '%'],
          ['Vol aggiuntiva da FX', (cp.fxAddVol * 100).toFixed(2) + '%'],
          ['', ''],
          ['── PARAMETRI BLENDED ──', ''],
          ['Rendimento atteso (μ)', (cp.normal * 100).toFixed(2) + '%/a'],
          ['Best case', (cp.best * 100).toFixed(2) + '%/a'],
          ['Worst case', (cp.worst * 100).toFixed(2) + '%/a'],
          ['Beta inflazione', cp.inflBeta.toFixed(3)],
          ['TER medio suggerito', cp.ter.toFixed(2) + '%'],
          ['Rendimento reale (μ - infl 2.1%)', (cp.realRet * 100).toFixed(2) + '%'],
        ];
        wsFx = XLSX.utils.aoa_to_sheet(fxRows);
        wsFx['!cols'] = [{ wch: 42 }, { wch: 18 }];
      }
    }

    XLSX.utils.book_append_sheet(wb, wsParam, 'Parametri');
    XLSX.utils.book_append_sheet(wb, wsProj,  'Proiezione Annuale');
    if (wsMC)     XLSX.utils.book_append_sheet(wb, wsMC,     'Monte Carlo');
    XLSX.utils.book_append_sheet(wb, wsBT,   'Backtesting Storico');
    XLSX.utils.book_append_sheet(wb, wsSR,   'Sequence Risk Multiplo');
    if (wsCS)     XLSX.utils.book_append_sheet(wb, wsCS,     'Stress Test Macro');
    if (wsDecHist) XLSX.utils.book_append_sheet(wb, wsDecHist, 'Decumulo Storico');
    if (wsQuant)  XLSX.utils.book_append_sheet(wb, wsQuant,  'Quant Analytics');
    if (wsCustom) XLSX.utils.book_append_sheet(wb, wsCustom, 'Portfolio Custom');
    if (wsFx)     XLSX.utils.book_append_sheet(wb, wsFx,     'FX & Stress Vol');

    const fname = `report_patrimoniale_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fname);
  } catch(e) {
    alert('Errore export Excel: ' + e.message);
    console.error(e);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📊 Esporta Excel'; }
  }
}

// Salva i risultati MC per l'export Excel
function _saveMCResults(results) { window._lastMCResults = results; }

async function generatePDF() {
  const btn = document.getElementById('pdfBtn');
  btn.disabled = true; btn.textContent = '⏳ Generazione report...';
  await new Promise(r => setTimeout(r, 80));
  try {
    if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('Libreria PDF non caricata');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    // Wrapper autoTable: applica pdfSafe a tutte le celle/header (gestisce simboli unicode).
    const _autoTable = doc.autoTable.bind(doc);
    const safeCell = (c) => (c == null ? '' : (typeof c === 'object' && 'content' in c)
      ? { ...c, content: pdfSafe(String(c.content)) }
      : pdfSafe(String(c)));
    const safeRows = (rows) => Array.isArray(rows) ? rows.map(r => Array.isArray(r) ? r.map(safeCell) : r) : rows;
    doc.autoTable = (opts) => {
      const o = { ...opts };
      if (o.head) o.head = safeRows(o.head);
      if (o.body) o.body = safeRows(o.body);
      if (o.foot) o.foot = safeRows(o.foot);
      return _autoTable(o);
    };
    const { w, pac, age, years, portfolio, ter, taxEq, taxOb, inflBottom, inflVol, seq } = state;
    const endAge = age + years;
    const portMeta = getPortParams(portfolio) || { label: portfolio, desc: '', vol: 0, normal: 0, best: 0, worst: 0, realRet: 0, inflBeta: 0 };
    if (portfolio === 'custom') {
      const cp = calcCustomParams();
      const slotDesc = (state.customPortfolio?.slots||[]).filter(s=>s.ac&&s.pct>0)
        .map(s=>`${ASSET_CLASSES[s.ac]?.label||s.ac} ${s.pct}%`).join(', ');
      portMeta.desc = `Portafoglio personalizzato: ${slotDesc}. Parametri calcolati con matrice di correlazione empirica.`;
    }

    // Proiezioni base
    const dN = project('normal', false);
    const dB = project('best', false);
    const dW = project('worst', false);
    const dS = seq.on ? project('normal', true) : null;
    const vN = dN[years].value, vBt = dB[years].value, vWt = dW[years].value;
    const inv = dN[years].invested;
    const txF = blendedTaxRate(endAge);
    const nN = calcNetNom(vN, inv, txF);
    const nP = calcNetNom(vWt, inv, txF);
    const nO = calcNetNom(vBt, inv, txF);
    const inflR = inflBottom / 100;
    const dF = Math.pow(1 + inflR, years);
    const realN = vN / dF;
    const gF = vN > 0 ? Math.max(0, Math.min(1, (vN - inv) / vN)) : 0;
    const eT = gF * txF;
    const crossAge = findCrossover(dN);

    // Monte Carlo (rilancio per dati aggiornati)
    let mc = null;
    try { mc = runMontecarlo(); } catch (_) { mc = null; }

    // Palette
    const BLU = [26, 115, 232], GRN = [30, 142, 62], ORG = [227, 116, 0], PUR = [147, 52, 230];
    const TEAL = [0, 137, 123], GRAY = [95, 99, 104], LBG = [248, 249, 250];
    const WHT = [255, 255, 255], RED = [217, 48, 37], DARK = [32, 33, 36];
    const W = 210, H = 297, ML = 14, MR = 14, CW = W - ML - MR;
    let y = 0, pN = 1;

    const miniHdr = () => {
      doc.setFillColor(...LBG); doc.rect(0, 0, W, 13, 'F');
      doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
      doc.text(pdfSafe('Report Patrimoniale Pro Suite v3 — Documento informativo, non consulenza finanziaria'), ML, 8.5);
      doc.text(`Pag. ${pN}`, W - MR, 8.5, { align: 'right' });
      doc.setDrawColor(210, 210, 210); doc.line(ML, 12.5, W - MR, 12.5);
      doc.setTextColor(0, 0, 0);
    };
    const chkPB = (n = 18) => { if (y + n > 275) { doc.addPage(); pN++; y = 20; miniHdr(); } };
    const sHdr = (t, col = BLU) => {
      chkPB(14); doc.setFillColor(...col); doc.rect(ML, y, CW, 7.5, 'F');
      doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...WHT);
      doc.text(pdfSafe(String(t)).toUpperCase(), ML + 3, y + 5.3); y += 11;
      doc.setTextColor(0, 0, 0);
    };
    const subHdr = (t) => {
      chkPB(8); doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
      doc.text(pdfSafe(t), ML, y); y += 5.5; doc.setTextColor(0, 0, 0);
    };
    const narrative = (txt, indent = 0) => {
      doc.setFontSize(8.7); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 64, 67);
      const lines = doc.splitTextToSize(pdfSafe(txt), CW - indent);
      chkPB(lines.length * 4.4 + 3);
      doc.text(lines, ML + indent, y);
      y += lines.length * 4.4 + 3;
      doc.setTextColor(0, 0, 0);
    };
    const callout = (title, body, col = BLU) => {
      doc.setFontSize(8.7); doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(pdfSafe(body), CW - 8);
      const boxH = lines.length * 4.4 + 11;
      chkPB(boxH + 2);
      doc.setFillColor(col[0], col[1], col[2]);
      doc.setGState && doc.setGState(new doc.GState({ opacity: 1 }));
      doc.rect(ML, y, 1.5, boxH, 'F');
      doc.setFillColor(248, 250, 252); doc.rect(ML + 1.5, y, CW - 1.5, boxH, 'F');
      doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...col);
      doc.text(pdfSafe(title), ML + 5, y + 5);
      doc.setFontSize(8.4); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 64, 67);
      doc.text(lines, ML + 5, y + 9.5);
      y += boxH + 3; doc.setTextColor(0, 0, 0);
    };
    const embedChart = (canvasId, caption, height = 80) => {
      const cvs = document.getElementById(canvasId);
      if (!cvs) return false;
      try {
        const img = cvs.toDataURL('image/png', 1.0);
        if (!img || img.length < 200) return false;
        const ratio = (cvs.height || 1) / (cvs.width || 1);
        const imgW = CW;
        const imgH = Math.min(height, imgW * ratio);
        chkPB(imgH + 10);
        doc.addImage(img, 'PNG', ML, y, imgW, imgH, undefined, 'FAST');
        y += imgH + 2;
        if (caption) {
          doc.setFontSize(7.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(...GRAY);
          doc.text(pdfSafe(caption), ML, y + 3); y += 6;
          doc.setTextColor(0, 0, 0);
        }
        return true;
      } catch (e) { console.warn('chart capture failed', canvasId, e); return false; }
    };

    // ─────────── COVER ───────────
    doc.setFillColor(...BLU); doc.rect(0, 0, W, 60, 'F');
    doc.setFillColor(13, 71, 161); doc.rect(0, 55, W, 5, 'F');
    doc.setFontSize(26); doc.setFont('helvetica', 'bold'); doc.setTextColor(...WHT);
    doc.text('Report Patrimoniale Pro', ML, 24);
    doc.setFontSize(11.5); doc.setFont('helvetica', 'normal');
    doc.text(pdfSafe('Suite v3 — Multi-Scenario · Monte Carlo · Regimi Economici · Sequence Risk'), ML, 33);
    doc.setFontSize(8.8); doc.setTextColor(200, 225, 255);
    doc.text(`Generato il ${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })} alle ${new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`, ML, 41);
    doc.text(pdfSafe(`Orizzonte ${years} anni  |  Eta ${age} -> ${endAge}  |  Portfolio: ${portMeta.label}`), ML, 47);
    y = 68;

    // KPI Grid sulla cover (4 metriche chiave)
    const kpis = [
      { lbl: 'Valore Lordo Base', val: fmtFull(vN), col: BLU },
      { lbl: 'Netto Fiscale', val: fmtFull(nN), col: GRN },
      { lbl: 'Valore Reale', val: fmtFull(realN), col: TEAL },
      { lbl: 'CAGR', val: cagrSafe(inv, vN, years).toFixed(2) + '%', col: PUR },
    ];
    // helper inline
    function cagrSafe(i, v, n){ return (i>0 && v>0 && n>0) ? (Math.pow(v/i, 1/n)-1)*100 : 0; }
    const kpiW = (CW - 9) / 4;
    kpis.forEach((k, i) => {
      const x = ML + i * (kpiW + 3);
      doc.setFillColor(248, 250, 252); doc.rect(x, y, kpiW, 22, 'F');
      doc.setDrawColor(...k.col); doc.setLineWidth(0.6); doc.line(x, y, x + kpiW, y);
      doc.setLineWidth(0.2);
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
      doc.text(pdfSafe(k.lbl).toUpperCase(), x + 2.5, y + 5);
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...k.col);
      doc.text(pdfSafe(k.val), x + 2.5, y + 14);
    });
    doc.setTextColor(0, 0, 0); doc.setDrawColor(0, 0, 0);
    y += 28;

    // Executive Summary box
    subHdr('Sintesi Esecutiva');
    const moltN = (vN / Math.max(1, inv));
    const cagrN = cagrSafe(inv, vN, years);
    narrative(
      `Il piano analizzato prevede un capitale iniziale di ${fmtFull(w)} e versamenti PAC di ${fmtFull(pac)}/mese ` +
      `su un orizzonte di ${years} anni (eta ${age}-${endAge}), allocato sul portafoglio « ${portMeta.label} ». ` +
      `Lo scenario base proietta un valore lordo finale di ${fmtFull(vN)} (moltiplicatore ${moltN.toFixed(2)}x sul totale investito di ${fmtFull(inv)}), ` +
      `con un netto fiscale stimato di ${fmtFull(nN)} e un valore reale (al netto di inflazione ${inflBottom.toFixed(1)}%) pari a ${fmtFull(realN)}. ` +
      `Il tasso di crescita medio annuo composto (CAGR proxy) e' ${cagrN.toFixed(2)}%. ` +
      (crossAge ? `Il punto di crossover (rendita netta annua >= PAC) viene raggiunto a ${crossAge} anni.` : `Nell'orizzonte analizzato non si raggiunge il punto di crossover rendita >= PAC.`)
    );

    // Indice del documento
    subHdr('Indice del Report');
    const toc = [
      '1.  Configurazione del Piano',
      '2.  Metodologia di Calcolo',
      '3.  Proiezioni Multi-Scenario (Base / Best / Worst)',
      '4.  Evoluzione Patrimoniale Anno per Anno',
      '5.  Distribuzione Monte Carlo (1.000 simulazioni)',
      '5b. A/B Confronto Portafogli',
      '6.  Scenari Economici Multi-Regime',
      '7.  Sequence of Returns Risk',
      '7b. Backtesting Storico — Dati Storici 1970-2024',
      '7c. Sequence Risk Multiplo — Crash Singolo / Doppio / Triplo',
      '7d. Stress Test Macro Storici — Path Mensile Esatto (6 crisi)',
      '7e. Piano di Decumulo (Strategia Prelievi)',
      '8.  Fiscalita, Costi e Erosione Reale',
      '8b. Analisi Fiscalita IT Comparata (4 Regimi)',
      ...(window.liveMarketData?.cape_sp500 ? ['8c. Valutazioni Live & Stress Test CAPE (Bogle)'] : []),
      '9.  Glossario dei Termini Tecnici',
      '10. Note Legali e Limiti del Modello',
    ];
    doc.setFontSize(8.7); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 64, 67);
    toc.forEach(l => { chkPB(5); doc.text(pdfSafe(l), ML + 4, y); y += 4.6; });
    doc.setTextColor(0,0,0); y += 2;

    callout('AVVISO LEGALE',
      'Documento a finalita esclusivamente informative ed educative. Non costituisce consulenza finanziaria, fiscale o legale, ne sollecitazione all\'investimento. Le proiezioni sono basate su ipotesi semplificate e NON garantiscono rendimenti futuri. I rendimenti passati non sono indicativi di quelli futuri. Prima di qualsiasi decisione, consulta un consulente finanziario indipendente abilitato.',
      ORG
    );

    // ─────────── 1. CONFIGURAZIONE ───────────
    sHdr('1 — Configurazione del Piano');
    doc.autoTable({
      startY: y,
      head: [['Parametro', 'Valore', 'Parametro', 'Valore']],
      body: [
        ['Patrimonio iniziale', fmtFull(w), 'PAC mensile (base)', fmtFull(pac) + '/mese'],
        ['Eta inizio → fine', `${age} → ${endAge} anni`, 'Orizzonte temporale', `${years} anni`],
        ['Portfolio', portMeta.label, 'Volatilita storica', portMeta.vol ? (portMeta.vol * 100).toFixed(1) + '% (sigma annua)' : 'variabile'],
        ['TER ETF annuo', ter.toFixed(2) + '%', 'Beta inflazione', String(portMeta.inflBeta ?? 'n/d')],
        ['Tasse plusvalenze Az.', taxEq.toFixed(1) + '%', 'Tasse plusvalenze Ob.', taxOb.toFixed(1) + '%'],
        ['Inflazione attesa (media)', inflBottom.toFixed(1) + '%', 'Inflazione (sigma)', inflVol.toFixed(1) + '%'],
        ['Sequence Risk', seq.on ? `attivo (${seq.severity}, ${seq.timing})` : 'disattivato', 'PIC/Spese straordinarie', `${state.pics.length} PIC, ${state.exps.length} uscite`],
      ],
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: LBG, textColor: GRAY, fontStyle: 'bold', fontSize: 7.5 },
      margin: { left: ML, right: MR }
    });
    y = doc.lastAutoTable.finalY + 5;
    narrative(`Descrizione portafoglio. ${portMeta.desc || 'Composizione bilanciata di asset class diversificate.'}`);

    // Allocazione asset (mostra sempre se disponibile)
    if (portMeta.eq != null || portMeta.ob != null || portMeta.gold != null || portMeta.cash != null) {
      subHdr('Composizione Asset Class');
      const alloc = [
        ['Azioni', ((portMeta.eq || 0) * 100).toFixed(0) + '%'],
        ['Obbligazioni', ((portMeta.ob || 0) * 100).toFixed(0) + '%'],
        ['Oro / commodities', ((portMeta.gold || 0) * 100).toFixed(0) + '%'],
        ['Trend following / managed futures / alternativi', (((portMeta.trend || 0) + (portMeta.otherFullW || 0)) * 100).toFixed(0) + '%'],
        ['Cash / liquidita', ((portMeta.cash || 0) * 100).toFixed(0) + '%'],
        ['Rendimento reale storico', ((portMeta.realRet || 0) * 100).toFixed(2) + '% /a'],
        ['Beta vs inflazione', String(portMeta.inflBeta ?? 'n/d')],
      ].filter(r => r[1] !== '0%' || r[0].includes('Cash'));
      doc.autoTable({
        startY: y,
        head: [['Componente', 'Peso / Valore']],
        body: alloc,
        styles: { fontSize: 8, cellPadding: 2.2 },
        headStyles: { fillColor: LBG, textColor: GRAY, fontStyle: 'bold', fontSize: 7.5 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold', textColor: BLU } },
        margin: { left: ML, right: MR }
      });
      y = doc.lastAutoTable.finalY + 5;
    }

    // ─────────── 2. METODOLOGIA ───────────
    sHdr('2 — Metodologia');
    narrative(
      'Le proiezioni utilizzano un modello deterministico annuale per gli scenari base/ottimista/pessimista, applicando un rendimento atteso ' +
      'specifico per portafoglio e una formula "mid-year convention" per i versamenti PAC (versamenti distribuiti uniformemente nell\'anno). ' +
      'Il TER viene sottratto dal rendimento lordo. La fiscalita e applicata solo sulla quota di plusvalenza al disinvestimento, con aliquota ' +
      'composita pesata sulla composizione del portafoglio: azioni, oro (ETC) e liquidita al 26%, obbligazioni governative al 12,5%.'
    );
    narrative(
      'Lo scenario Monte Carlo usa un approccio Gaussiano standard (1.000 simulazioni) con μ = rendimento atteso del portafoglio e σ = volatilità storica. ' +
      'I percentili (P10/P25/P50/P75/P90) descrivono la distribuzione del valore finale: ' +
      'il P10 rappresenta il decimo peggior risultato su 100, il P50 la mediana, il P90 il decimo migliore. ' +
      'Per simulazioni con modelli avanzati (fat-tail, GARCH, Regime-Switching) usare il tab MC Avanzato.'
    );
    narrative(
      'Il modulo Sequence Risk simula un crash azionario in un anno specifico (early/mid/late) con severita configurabile, seguito da una fase di recupero ' +
      'con rendimenti rialzisti. Gli scenari economici (Crescita Normale, Stagflazione, Recessione, Inflazione Alta, ecc.) modulano i rendimenti delle asset class ' +
      'tramite moltiplicatori calibrati su contesti macro storici e applicano un\'inflazione stocastica con media e sigma proprie del regime.'
    );

    // ─────────── 3. PROIEZIONI MULTI-SCENARIO ───────────
    sHdr('3 — Proiezioni Multi-Scenario');
    const proRows = [
      ['Pessimistico', fmtFull(vWt), '×' + (vWt / Math.max(1, inv)).toFixed(2), fmtFull(vWt - inv), fmtFull(nP), fmtFull(vWt * .04 * (1 - eT)) + '/a'],
      ['Scenario Base', fmtFull(vN), '×' + (vN / Math.max(1, inv)).toFixed(2), fmtFull(vN - inv), fmtFull(nN), fmtFull(vN * .04 * (1 - eT)) + '/a'],
      ['Ottimistico', fmtFull(vBt), '×' + (vBt / Math.max(1, inv)).toFixed(2), fmtFull(vBt - inv), fmtFull(nO), fmtFull(vBt * .04 * (1 - eT)) + '/a'],
    ];
    if (dS) proRows.push(['Con Sequence Risk', fmtFull(dS[years].value), '×' + (dS[years].value / Math.max(1, inv)).toFixed(2), fmtFull(dS[years].value - inv), '—', '—']);
    doc.autoTable({
      startY: y,
      head: [['Scenario', 'Valore Lordo Finale', 'Moltipl.', 'Plusvalenza', 'Netto Fiscale', 'SWR 4% Netto']],
      body: proRows,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: LBG, textColor: GRAY, fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: { 1: { textColor: BLU, fontStyle: 'bold' }, 4: { textColor: GRN, fontStyle: 'bold' } },
      margin: { left: ML, right: MR }
    });
    y = doc.lastAutoTable.finalY + 5;
    narrative(
      `Lettura. Lo scenario base usa un rendimento lordo di ${(portMeta.normal * 100).toFixed(1)}%/a; il pessimistico ${(portMeta.worst * 100).toFixed(1)}%/a; ` +
      `l'ottimistico ${(portMeta.best * 100).toFixed(1)}%/a. La differenza tra Pessimistico e Ottimistico (${fmtFull(vBt - vWt)}) misura l'incertezza ` +
      `intrinseca a un orizzonte di ${years} anni e ricorda che la pianificazione richiede una banda di esiti, non un singolo numero. ` +
      `La colonna SWR 4% applica la regola di Bengen (4% del capitale ritirabile annualmente) al netto di una stima fiscale media ${(eT * 100).toFixed(1)}%.`
    );
    narrative(
      `Inflazione. Su ${years} anni un'inflazione media del ${inflBottom.toFixed(1)}% erode il potere d'acquisto del ${((1 - 1 / dF) * 100).toFixed(1)}%. ` +
      `Il valore reale dello scenario base equivale quindi a ${fmtFull(realN)} di oggi. Il portafoglio scelto ha beta inflazione ${portMeta.inflBeta ?? 'n/d'}: ` +
      `valori positivi indicano resistenza (oro, azioni value, materie prime), valori negativi indicano sofferenza (obbligazioni a lunga, cash).`
    );

    // Grafico fan-chart multi-scenario
    embedChart('ch', 'Grafico 1 — Proiezione multi-scenario (best/normal/worst), PAC versato e soglia di optionality.', 95);

    // ─────────── 4. EVOLUZIONE NEL TEMPO ───────────
    sHdr('4 — Evoluzione Patrimoniale Anno per Anno (campionamento)', PUR);
    const step = years <= 10 ? 1 : years <= 20 ? 2 : years <= 30 ? 3 : 5;
    const sampled = [];
    for (let i = 0; i <= years; i += step) sampled.push(dN[i]);
    if (sampled[sampled.length - 1].year !== years) sampled.push(dN[years]);
    const evoBody = sampled.map(d => [
      d.year, d.age, fmtFull(d.value), fmtFull(d.invested),
      fmtFull(d.value - d.invested),
      d.invested > 0 ? ((d.value / d.invested - 1) * 100).toFixed(1) + '%' : '—',
      fmtFull(d.annRetNet) + '/a',
      d.event || ''
    ]);
    doc.autoTable({
      startY: y,
      head: [['Anno', 'Eta', 'Valore', 'Investito', 'Plusval.', 'ROI %', 'Rend. netto', 'Eventi']],
      body: evoBody,
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: PUR, textColor: WHT, fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: { 2: { textColor: BLU, fontStyle: 'bold' }, 4: { textColor: GRN }, 7: { fontSize: 7, textColor: GRAY } },
      margin: { left: ML, right: MR }
    });
    y = doc.lastAutoTable.finalY + 4;
    narrative(
      'La tabella mostra la traiettoria dello Scenario Base con campionamento ogni ' + step + ' anno/i. La colonna "Rend. netto" indica la rendita ' +
      'annuale teorica generata dal portafoglio al netto della tassazione, utile per valutare quando il piano comincia a "lavorare per te" piuttosto ' +
      'che richiedere ulteriori versamenti. Eventi straordinari (PIC, prelievi, modifiche del PAC, crash del Sequence Risk) sono evidenziati nell\'ultima colonna.'
    );

    // ─────────── 5. MONTE CARLO ───────────
    if (mc) {
      sHdr('5 — Distribuzione Monte Carlo (1.000 simulazioni)', ORG);
      const last = mc.p50.length - 1;
      doc.autoTable({
        startY: y,
        head: [['Percentile', 'Significato', 'Valore Finale']],
        body: [
          ['P10 (pessimistico)', '90% degli scenari fa meglio di questo', fmtFull(mc.p10[last])],
          ['P25', '75% fa meglio', fmtFull(mc.p25[last])],
          ['P50 (mediana)', 'Esito centrale', fmtFull(mc.p50[last])],
          ['P75', '25% fa meglio', fmtFull(mc.p75[last])],
          ['P90 (ottimistico)', 'Solo 10% fa meglio', fmtFull(mc.p90[last])],
          ['Media (mean)', 'Valore atteso medio', fmtFull(mc.mean[last])],
        ],
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: ORG, textColor: WHT, fontStyle: 'bold', fontSize: 7.5 },
        columnStyles: { 2: { textColor: ORG, fontStyle: 'bold', halign: 'right' } },
        margin: { left: ML, right: MR }
      });
      y = doc.lastAutoTable.finalY + 5;
      const range = mc.p90[last] - mc.p10[last];
      const ratio = mc.p10[last] > 0 ? mc.p90[last] / mc.p10[last] : 0;
      narrative(
        `L'80% degli esiti simulati e compreso fra ${fmtFull(mc.p10[last])} (P10) e ${fmtFull(mc.p90[last])} (P90), ` +
        `con un'ampiezza di ${fmtFull(range)} (rapporto P90/P10 = ${ratio.toFixed(2)}x). ` +
        `Un rapporto elevato indica forte dispersione e rischio di sequenza significativo: pianificare la fase di decumulo solo sul P50 puo essere imprudente. ` +
        `Si raccomanda di costruire il proprio piano sul P25 e considerare il P10 come "margine di sicurezza" da assorbire con liquidita di emergenza o riduzione temporanea dei prelievi.`
      );
      // Probabilita di successo: % simulazioni che battono inflazione e che superano capitale investito
      if (Array.isArray(mc.paths) && mc.paths.length) {
        const N = mc.paths.length;
        let okInv = 0, okInfl = 0, okDouble = 0;
        for (const p of mc.paths) {
          const fv = Array.isArray(p) ? p[p.length - 1] : p;
          if (fv >= inv) okInv++;
          if (fv >= inv * dF) okInfl++;
          if (fv >= inv * 2) okDouble++;
        }
        callout('PROBABILITA DI SUCCESSO (Monte Carlo)',
          `Su ${N.toLocaleString('it-IT')} simulazioni: ` +
          `${((okInv / N) * 100).toFixed(1)}% conserva almeno il capitale investito, ` +
          `${((okInfl / N) * 100).toFixed(1)}% batte l'inflazione cumulata (${((dF - 1) * 100).toFixed(1)}%), ` +
          `${((okDouble / N) * 100).toFixed(1)}% raddoppia il capitale investito.`,
          GRN
        );
      }
    }

    // Grafico Monte Carlo (riusa fan chart con MC overlay)
    embedChart('ch', 'Grafico 2 — Fan chart con bande di volatilita storica e overlay Monte Carlo.', 90);

    // ─────────── 5b. A/B CONFRONTO ───────────
    {
      const pALabel2 = portMeta.label;
      const pacBov2 = stateB.pac >= 0 ? stateB.pac : state.pac;
      const dBbn2 = projectWithOverrides({ portfolio: stateB.portfolio, ter: stateB.ter, pac: pacBov2 }, 'normal');
      const dBbb2 = projectWithOverrides({ portfolio: stateB.portfolio, ter: stateB.ter, pac: pacBov2 }, 'best');
      const dBbw2 = projectWithOverrides({ portfolio: stateB.portfolio, ter: stateB.ter, pac: pacBov2 }, 'worst');
      const pBLabel2 = (typeof PORT !== 'undefined' && PORT[stateB.portfolio]?.label) || stateB.portfolio;
      const invB2 = dBbn2[years].invested;
      const eqB2 = getEquityWeight(stateB.portfolio, endAge);
      const txFB2 = (eqB2 * state.taxEq + (1 - eqB2) * state.taxOb) / 100;
      const nBv2 = calcNetNom(dBbn2[years].value, invB2, txFB2);
      const deltaAB = dBbn2[years].value - vN;
      const deltaNAB = nBv2 - nN;
      chkPB(14);
      sHdr('5b — A/B Confronto Portafogli', PUR);
      narrative(
        `Confronto tra il Portafoglio A (` + '«' + ` ${pALabel2} ` + '»' + `) e il Portafoglio B (` + '«' + ` ${pBLabel2} ` + '»' + `). ` +
        `Entrambi condividono: capitale iniziale ${fmtFull(state.w)}, orizzonte ${years} anni, tasse Az/Ob ${state.taxEq.toFixed(0)}%/${state.taxOb.toFixed(0)}%. ` +
        `PAC B: ${fmtFull(pacBov2)}/mese — TER B: ${stateB.ter.toFixed(2)}%/a.`
      );
      doc.autoTable({
        startY: y,
        head: [['Metrica', `A — ${pALabel2}`, `B — ${pBLabel2}`, '\u0394 (B\u2212A)']],
        body: [
          ['Valore finale lordo (base)',    fmtFull(vN),              fmtFull(dBbn2[years].value), (deltaAB >= 0 ? '+' : '') + fmtFull(deltaAB)],
          ['Valore finale (ottimistico)',   fmtFull(dB[years].value), fmtFull(dBbb2[years].value), '\u2014'],
          ['Valore finale (pessimistico)',  fmtFull(dW[years].value), fmtFull(dBbw2[years].value), '\u2014'],
          ['Totale versato',               fmtFull(inv),              fmtFull(invB2),               '\u2014'],
          ['Moltiplicatore',               '\u00d7' + (vN / Math.max(1, inv)).toFixed(2), '\u00d7' + (dBbn2[years].value / Math.max(1, invB2)).toFixed(2), '\u0394 ' + (dBbn2[years].value / Math.max(1,invB2) - vN / Math.max(1,inv)).toFixed(2) + 'x'],
          ['Netto fiscale finale',         fmtFull(nN),               fmtFull(nBv2),                (deltaNAB >= 0 ? '+' : '') + fmtFull(deltaNAB)],
        ],
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: PUR, textColor: WHT, fontStyle: 'bold', fontSize: 7.5 },
        columnStyles: { 1: { textColor: BLU, fontStyle: 'bold' }, 2: { textColor: PUR, fontStyle: 'bold' }, 3: { fontStyle: 'bold' } },
        margin: { left: ML, right: MR }
      });
      y = doc.lastAutoTable.finalY + 4;
      const stepAB2 = Math.max(1, Math.floor(years / 10));
      const abRows2 = [];
      for (let i = 0; i <= years; i += stepAB2) {
        const vAi2 = dN[i].value, vBi2 = dBbn2[i].value, dABi = vBi2 - vAi2;
        abRows2.push([String(state.age + i), '+' + i + ' a', fmtFull(vAi2), fmtFull(vBi2), (dABi >= 0 ? '+' : '') + fmtFull(dABi), vAi2 > 0 ? (dABi >= 0 ? '+' : '') + (dABi / vAi2 * 100).toFixed(1) + '%' : '\u2014']);
      }
      doc.autoTable({
        startY: y,
        head: [['Eta', 'Anno', `A`, `B`, '\u0394 Lordo', '\u0394 %']],
        body: abRows2,
        styles: { fontSize: 7.5, cellPadding: 2 },
        headStyles: { fillColor: PUR, textColor: WHT, fontStyle: 'bold', fontSize: 7.5 },
        columnStyles: { 2: { textColor: BLU }, 3: { textColor: PUR } },
        margin: { left: ML, right: MR }
      });
      y = doc.lastAutoTable.finalY + 4;
      callout(
        deltaNAB >= 0 ? `Il Portafoglio B e migliore di ${fmtFull(deltaNAB)} netti` : `Il Portafoglio A e migliore di ${fmtFull(Math.abs(deltaNAB))} netti`,
        `In scenario base il portafoglio con risultato migliore e ` + '«' + ` ${deltaNAB >= 0 ? pBLabel2 : pALabel2} ` + '»' + `. ` +
        `La comparazione usa rendimenti storici attesi: su orizzonti brevi (<10 anni) la volatilita puo ribaltare il risultato. ` +
        `Usa il tab A/B Confronto nell'app per esplorare variazioni interattive di PAC, TER e composizione asset.`,
        deltaNAB >= 0 ? PUR : BLU
      );
    }

    // ─────────── 6. SCENARI ECONOMICI ───────────
    doc.addPage(); pN++; y = 20; miniHdr();
    sHdr('6 — Scenari Economici Multi-Regime', TEAL);
    narrative(
      'Ogni regime economico applica moltiplicatori specifici sui rendimenti delle asset class e modula l\'inflazione (media + sigma). ' +
      'I valori reali tengono conto della deflazione/inflazione cumulata di ogni scenario. Il delta vs Base evidenzia l\'impatto del regime ' +
      'rispetto alla proiezione con inflazione costante usata nello Scenario Base.'
    );
    const dBaseEco = project('normal', false);
    const ecoRows = Object.entries(ECO_SCENARIOS).map(([k, s]) => {
      const dE = projectEco(k);
      const vE = dE[years].value;
      const delta = vE - dBaseEco[years].value;
      const pct = dBaseEco[years].value > 0 ? (delta / dBaseEco[years].value * 100).toFixed(1) + '%' : '—';
      return [
        s.label,
        fmtFull(vE),
        (delta >= 0 ? '+' : '') + fmtFull(delta),
        pct,
        s.inflMean.toFixed(1) + '% ±' + s.inflSigma.toFixed(1),
        fmtFull(dE[years].real)
      ];
    });
    doc.autoTable({
      startY: y,
      head: [['Scenario', 'Valore Nominale', 'Δ vs Base', 'Δ %', 'Inflazione', 'Valore Reale']],
      body: ecoRows,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: TEAL, textColor: WHT, fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: { 1: { fontStyle: 'bold' }, 5: { textColor: TEAL, fontStyle: 'bold' } },
      margin: { left: ML, right: MR }
    });
    y = doc.lastAutoTable.finalY + 5;

    embedChart('chEco', 'Grafico 3 — Confronto regimi economici sullo stesso piano patrimoniale.', 85);

    subHdr('Descrizione dei regimi economici');
    Object.entries(ECO_SCENARIOS).forEach(([k, s]) => {
      narrative(`${s.label}. ${s.desc}`, 4);
    });

    // ─────────── 7. SEQUENCE RISK ───────────
    sHdr('7 — Sequence of Returns Risk', RED);
    narrative(
      'Il "rischio di sequenza" e l\'effetto sproporzionato che un crash di mercato puo avere se accade nei primi anni del piano (o appena prima della pensione). ' +
      'A parita di rendimento medio di lungo termine, due percorsi con la stessa media ma sequenze diverse possono produrre esiti molto differenti, soprattutto in presenza di prelievi.'
    );
    if (dS) {
      const gap = vN - dS[years].value;
      const gapPct = vN > 0 ? (gap / vN * 100).toFixed(1) : '0';
      narrative(
        `Nel piano analizzato il modulo e attivo (severita ${seq.severity}, timing ${seq.timing}). Il valore finale con crash simulato e ${fmtFull(dS[years].value)}, ` +
        `inferiore di ${fmtFull(gap)} (${gapPct}%) rispetto allo Scenario Base senza shock. La fase di recupero post-crash dura ${typeof RECOVERY_YEARS !== 'undefined' ? RECOVERY_YEARS : 'alcuni'} anni con rendimenti rialzisti.`
      );
    } else {
      narrative('Il modulo Sequence Risk e attualmente disattivato. Si suggerisce di simulare almeno uno scenario con crash "moderato" in fase early per valutare la resilienza del piano.');
    }

    // ─────────── 7b. BACKTESTING STORICO ───────────
    doc.addPage(); pN++; y = 20; miniHdr();
    sHdr('7b — Backtesting Storico — Dati Storici 1970-2024', [0, 150, 167]);
    narrative(
      'Il backtesting usa 660 rendimenti mensili storici 1970-2024, ancorati anno per anno alle serie ufficiali in EUR (azioni MSCI World Net EUR, obbligazioni Euro Aggregate, oro LBMA); la granularita mensile e una ricostruzione coerente con il totale annuo reale. ' +
      'Il portafoglio e il PAC mensile attuali del simulatore vengono applicati a 10 periodi storici diversi, includendo le correlazioni dinamiche: ' +
      'in anni di drawdown azionario > 15% le correlazioni tra asset class si alzano verso la matrice di stress, come osservato empiricamente. ' +
      'Il CAGR nominale include dividendi e cedole (total return). Le ultime osservazioni disponibili coprono fino a dicembre 2024.'
    );
    const btPortKeyPDF = (typeof btState !== 'undefined' && btState?.port === 'sim') ? portfolio : ((typeof btState !== 'undefined' && btState?.port) || portfolio);
    const btPacPDF = (typeof btState !== 'undefined' && btState?.pac != null) ? btState.pac : state.pac;
    const btW0PDF  = (typeof btState !== 'undefined' && btState?.w  != null) ? btState.w  : state.w;
    const btResultRows = [];
    const BT_SKIP_PDF = { ec_us_9060: 1, ec_glob_9060: 1, return_stack: 1 };
    if (!BT_SKIP_PDF[btPortKeyPDF]) {
      for (const [syStr, period] of Object.entries(BT_PERIODS)) {
        const sy = +syStr;
        try {
          const res = simulateBacktest(btPortKeyPDF, sy, btPacPDF, btW0PDF);
          btResultRows.push([
            String(sy),
            period.label.split('—')[1]?.trim() || period.label,
            (res.irr >= 0 ? '+' : '') + (res.irr * 100).toFixed(2) + '%/a',
            (res.twr >= 0 ? '+' : '') + (res.twr * 100).toFixed(2) + '%/a',
            fmtFull(res.finalValue),
            (res.maxDD * 100).toFixed(1) + '%',
            fmtFull(res.finalInvested),
          ]);
        } catch(e) {}
      }
      btResultRows.sort((a, b) => parseFloat(b[3]) - parseFloat(a[3])); // per TWR
    } else {
      btResultRows.push(['—', 'Non applicabile a portafogli con leva / managed futures', '', '', '', '', '']);
    }
    doc.autoTable({
      startY: y,
      head: [['Anno', 'Evento Storico', 'IRR Piano', 'TWR Asset', 'Valore Finale', 'Max DD', 'Versato']],
      body: btResultRows,
      styles: { fontSize: 7.5, cellPadding: 2.2 },
      headStyles: { fillColor: [0, 150, 167], textColor: WHT, fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: {
        2: { fontStyle: 'bold', textColor: GRN },
        3: { fontStyle: 'bold', textColor: BLU },
        5: { textColor: RED },
      },
      margin: { left: ML, right: MR }
    });
    y = doc.lastAutoTable.finalY + 5;
    narrative(
      'Lettura: l\'IRR (rendimento del piano) considera il timing dei versamenti PAC; il TWR (rendimento asset) misura la performance pura del portafoglio, confrontabile tra periodi. ' +
      'Il Max Drawdown misura la massima perdita dal picco precedente nell\'intera serie. La tabella riflette anche eventuali aggiunte una tantum (PIC) e prelievi impostati nel simulatore. ' +
      'Nota metodologica: i dati usano rendimenti in USD; l\'effetto cambio EUR/USD non e incluso. ' +
      'Il backtest non e applicabile ai portafogli con leva (Efficient Core) o managed futures (Return Stacking). ' +
      'Per la tabella completa con confronto tra portafogli diversi sullo stesso periodo usare il tab Backtesting Storico nell\'applicazione.'
    );
    narrative(
      'Analisi interattive aggiuntive (disponibili nell\'applicazione): il Rischio di Sequenza confronta la stessa crisi a inizio, meta e fine piano, mostrando come la perdita in euro cresca con il capitale accumulato anche a parita di caduta percentuale. ' +
      'Lo Stress Test Macro simula il percorso mensile esatto durante le 10 crisi storiche principali. ' +
      'Entrambe supportano tre modalita di versamento (capitale + PAC, solo capitale, solo PAC) e usano i valori impostati nel simulatore.'
    );

    // ─────────── 7c. SEQUENCE RISK MULTIPLO ───────────
    sHdr('7c — Sequence Risk Multiplo — Crash Singolo / Doppio / Triplo', RED);
    narrative(
      'Analisi comparativa dell\'impatto di crash sequenziali sul piano patrimoniale. ' +
      'Il crash singolo usa la severita configurata nel Simulatore. ' +
      'Il doppio e triplo crash scalano progressivamente (2° crash = 65%, 3° = 45% della severita primaria). ' +
      'La fase di recupero post-crash dura 5 anni con rendimenti rialzisti proporzionali alla profondita del drawdown.'
    );
    const savedSeqPDF = { ...state.seq };
    const seqBaseVal2 = project('normal', false)[years].value;
    const multiSeqRows = [
      { mode: 'single', timing: 'early', severity: 'moderate', label: 'Crash singolo moderato (early)' },
      { mode: 'single', timing: 'late',  severity: 'moderate', label: 'Crash singolo moderato (late)' },
      { mode: 'single', timing: 'early', severity: 'severe',   label: 'Crash singolo severo (early)' },
      { mode: 'double', timing: 'early', severity: 'moderate', label: 'Doppio crash moderato' },
      { mode: 'triple', timing: 'early', severity: 'moderate', label: 'Triplo crash moderato' },
    ];
    const srBodyPDF = [];
    for (const sc of multiSeqRows) {
      state.seq = { on: true, severity: sc.severity, timing: sc.timing, mode: sc.mode, dynCorr: false };
      const dMSR = project('normal', true);
      state.seq = savedSeqPDF;
      const val2 = dMSR[years].value;
      const gap2 = val2 - seqBaseVal2;
      const gapPct2 = seqBaseVal2 > 0 ? (gap2 / seqBaseVal2 * 100).toFixed(1) : '0';
      srBodyPDF.push([sc.label, fmtFull(val2), (gap2 >= 0 ? '+' : '') + fmtFull(gap2), (gap2 >= 0 ? '+' : '') + gapPct2 + '%']);
    }
    state.seq = savedSeqPDF;
    doc.autoTable({
      startY: y,
      head: [['Scenario Crash', 'Valore Finale', 'Gap vs Base', 'Gap %']],
      body: srBodyPDF,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: RED, textColor: WHT, fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: {
        1: { fontStyle: 'bold', textColor: BLU },
        2: { textColor: RED, fontStyle: 'bold' },
        3: { textColor: RED },
      },
      margin: { left: ML, right: MR }
    });
    y = doc.lastAutoTable.finalY + 5;
    narrative(
      'Il confronto tra crash singolo early vs late mostra il "paradosso del sequence risk": un crash all\'inizio del piano e meno devastante di uno a fine piano ' +
      'perche il PAC mensile acquista a sconto e il capitale e ancora ridotto. Il crash late colpisce il capitale massimo con meno tempo per il recupero. ' +
      'Il scenario doppio-triplo modella contesti storici plausibili (es. bolla dot-com 2000 + crisi 2008, oppure crisi 2008 + COVID 2020 + inflazione 2022).'
    );

    // ─────────── 7d. STRESS TEST MACRO STORICI ───────────
    sHdr('7d \u2014 Stress Test Macro Storici \u2014 Path Mensile Esatto', [183, 28, 28]);
    narrative(
      'Simulazione del percorso mensile preciso del portafoglio attuale durante le 6 principali crisi macro 1970-2024. ' +
      'A differenza del backtesting PAC (piani con versamenti), questa analisi usa uno snapshot del capitale iniziale senza contributi aggiuntivi. ' +
      'I rendimenti mensili provengono da HIST_MONTHLY (ancorati a MSCI World Net EUR, Bloomberg Euro Aggregate, oro LBMA in EUR). TER applicato mensilmente. ' +
      'I pesi sono quelli attuali: Az.' + Math.round(getEquityWeight(btPortKeyPDF, age)*100) + '% ' +
      'Ob.' + Math.round(Math.max(0, 1 - getEquityWeight(btPortKeyPDF,age) - getGoldWeight(btPortKeyPDF) - getCashWeight(btPortKeyPDF))*100) + '% ' +
      'Au.' + Math.round(getGoldWeight(btPortKeyPDF)*100) + '% ' +
      'Liq.' + Math.round(getCashWeight(btPortKeyPDF)*100) + '%.'
    );
    chkPB(30);

    // Costruisce la tabella delle 6 crisi con simulazione mensile
    const CRISIS_PDF = [
      { id:'stagflation7374', label:'1973-74 Stagflazione OPEC',    startYr:1972, startMo:10, windowMonths:36, sp500:'-48%', macro:'Infl. 12% / Tassi 12% Fed' },
      { id:'blackmonday87',   label:'1987 Black Monday',            startYr:1987, startMo:8,  windowMonths:24, sp500:'-34%', macro:'Infl. 3.6% / Tassi 7.25% Fed' },
      { id:'dotcom0002',      label:'2000-02 Bolla Dot-com',        startYr:2000, startMo:1,  windowMonths:48, sp500:'-49%', macro:'CAPE 44 / Tassi 6.5%->1% Fed' },
      { id:'gfc0809',         label:'2008-09 Crisi Finanziaria',    startYr:2007, startMo:10, windowMonths:48, sp500:'-57%', macro:'Infl. 3.8% / Tassi 5.25%->0.25%' },
      { id:'covid20',         label:'2020 COVID-19',                startYr:2020, startMo:1,  windowMonths:18, sp500:'-34%', macro:'Infl. 1.2% / QE illimitato' },
      { id:'inflation22',     label:'2022 Inflazione & Tassi',      startYr:2021, startMo:12, windowMonths:30, sp500:'-20%', macro:'Infl. 8% / Tassi 0.25%->4.5%' },
    ];

    // Funzione locale per simulare path crisi nel PDF (senza accesso all'UI)
    function pdfCrisisPath(c, portKey) {
      const startIdx = Math.max(0, (c.startYr - 1970) * 12 + (c.startMo - 1));
      const endIdx   = Math.min(startIdx + c.windowMonths, HIST_MONTHLY.length - 1);
      const eqW   = typeof getEquityWeight === 'function' ? getEquityWeight(portKey, age) : 0.6;
      const goldW = typeof getGoldWeight === 'function' ? getGoldWeight(portKey) : 0;
      const cashW = typeof getCashWeight === 'function' ? getCashWeight(portKey) : 0;
      const obW   = Math.max(0, 1 - eqW - goldW - cashW);
      const terM  = (ter / 100) / 12;
      let cum = 100, peak = 100, maxDD = 0, maxDDM = 0, worstRet = 0;
      let recovM = null;
      const path = [];
      for (let idx = startIdx; idx <= endIdx; idx++) {
        if (idx >= HIST_MONTHLY.length) break;
        const row = calibrateHistRow(HIST_MONTHLY[idx]);
        const portRet = eqW*row[0] + obW*row[1] + goldW*row[2] + cashW*0.002 - terM;
        cum = Math.max(0, cum * (1 + portRet));
        if (cum > peak) peak = cum;
        const dd = (cum - peak) / peak;
        const mn = idx - startIdx;
        if (dd < maxDD) { maxDD = dd; maxDDM = mn; }
        if (portRet < worstRet) worstRet = portRet;
        path.push({ cumValue: cum });
      }
      let pastTrough = false;
      for (let i = 0; i < path.length; i++) {
        if (i >= maxDDM) pastTrough = true;
        if (pastTrough && path[i].cumValue >= 100) { recovM = i; break; }
      }
      return { maxDD, worstRet, recovM, finalValue: path[path.length-1]?.cumValue ?? 100 };
    }

    const crisisPDFRows = [];
    const TEAL_DARK = [0, 130, 150];
    for (const c of CRISIS_PDF) {
      try {
        const sim = pdfCrisisPath(c, btPortKeyPDF);
        const recStr = sim.recovM != null ? sim.recovM + ' mesi' : '>' + c.windowMonths + ' mesi';
        const lossEur = Math.round(btW0PDF * sim.maxDD);
        crisisPDFRows.push([
          c.label,
          c.sp500,
          c.macro,
          (sim.maxDD * 100).toFixed(1) + '%',
          (lossEur < 0 ? '-' : '') + '\u20ac' + Math.abs(lossEur).toLocaleString('it-IT'),
          (sim.worstRet * 100).toFixed(2) + '%',
          recStr,
          sim.finalValue.toFixed(1),
        ]);
      } catch(e) {}
    }

    if (crisisPDFRows.length > 0) {
      doc.autoTable({
        startY: y,
        head: [['Crisi', 'S&P500', 'Contesto Macro', 'Max DD Port.', 'Perdita ('+fmtFull(btW0PDF)+')', 'Mese Peggiore', 'Recovery', 'Fine Finestra']],
        body: crisisPDFRows,
        styles: { fontSize: 7, cellPadding: 2.0, valign: 'top' },
        headStyles: { fillColor: [183, 28, 28], textColor: WHT, fontStyle: 'bold', fontSize: 6.5 },
        columnStyles: {
          3: { textColor: RED, fontStyle: 'bold' },
          4: { textColor: RED, fontStyle: 'bold' },
          5: { textColor: RED },
        },
        margin: { left: ML, right: MR }
      });
      y = doc.lastAutoTable.finalY + 5;
    }
    narrative(
      'Lettura della tabella: il Max Drawdown e la perdita massima percentuale rispetto al picco nella finestra mostrata. ' +
      'La Perdita e espressa in euro sul capitale iniziale impostato. Il Recovery e il numero di mesi dal bottom per tornare al livello di inizio finestra. ' +
      'La colonna "Fine Finestra" e il valore normalizzato (100 = pareggio). Valori > 100 indicano guadagno, < 100 perdita residua a fine osservazione. ' +
      'Il 2022 e unico perche azioni e obbligazioni sono crollate insieme — il portafoglio 60/40 non ha offerto protezione. ' +
      'Il 1987 e il 2020 sono crisi a V: rapide e con recovery veloce. Il 2000-02 e il 2008-09 sono crisi lente che richiedono anni per il recupero.'
    );

    sHdr('8 \u2014 Fiscalita, Costi e Erosione Reale', ORG);
    const costoTer = inv * (ter / 100) * (years / 2);
    doc.autoTable({
      startY: y,
      head: [['Voce', 'Stima', 'Note']],
      body: [
        ['Tasse su plusvalenza (scenario base)', fmtFull(vN - nN), `aliquota composita ${(txF * 100).toFixed(1)}%`],
        ['Costo TER cumulato (stima)', fmtFull(costoTer), `${ter.toFixed(2)}% annuo su capitale medio`],
        ['Erosione inflazione (su valore finale)', fmtFull(vN - realN), `inflazione media ${inflBottom.toFixed(1)}% per ${years} anni`],
        ['Valore reale netto (post-tasse + post-inflazione)', fmtFull(nN / dF), 'potere d\'acquisto effettivo di oggi'],
      ],
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: LBG, textColor: GRAY, fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: { 1: { textColor: RED, fontStyle: 'bold', halign: 'right' } },
      margin: { left: ML, right: MR }
    });
    y = doc.lastAutoTable.finalY + 4;
    narrative(
      'Tasse, costi e inflazione sono i tre "freni" del rendimento composto. Anche piccole differenze (0.20% vs 0.50% di TER) ' +
      'producono divergenze significative su 30+ anni. Per ridurre la fiscalita: privilegia ETF ad accumulazione, sfrutta minusvalenze pregresse ' +
      'entro 4 anni, considera strumenti previdenziali (PIP/Fondi pensione) con tassazione agevolata.'
    );

    // ─────────── 8b. FISCALITA IT COMPARATA ───────────
    try {
      sHdr('8b \u2014 Analisi Fiscalita IT \u2014 Confronto 4 Regimi', ORG);
      // Recupera stato fiscale (se caricato) oppure calcola da state
      const fsRegime   = (typeof fiscState !== 'undefined' && fiscState.loaded) ? fiscState.regime : 'amministrato';
      const fsMethod   = (typeof fiscState !== 'undefined' && fiscState.loaded) ? fiscState.method : 'avg';
      const fsBollo    = (typeof fiscState !== 'undefined' && fiscState.loaded) ? fiscState.bollo : 0.20;
      const fsAliqG    = (typeof fiscState !== 'undefined' && fiscState.loaded) ? fiscState.aliqGain : state.taxEq;
      const fsAliqOb   = (typeof fiscState !== 'undefined' && fiscState.loaded) ? fiscState.aliqOb  : state.taxOb;
      const fsStrum    = (typeof fiscState !== 'undefined' && fiscState.loaded) ? fiscState.strumento : 'etf_ucits';
      const fsMinus    = (typeof fiscState !== 'undefined' && fiscState.loaded) ? fiscState.minusvalenze : [];
      const fsYears    = years;
      const fsW        = state.w;
      const fsPac      = state.pac;
      // Calcolo approssimato valore lordo su orizzonte (scenario base)
      const fvLordo    = vN;
      const fvInv      = inv;
      const fvGain     = Math.max(0, fvLordo - fvInv);
      const totMinus   = fsMinus.filter(m => m.amount > 0).reduce((s, m) => s + m.amount, 0);
      // Calcolo bollo cumulato approssimato (media geometrica del patrimonio * bollo * anni)
      let bolloCum = 0;
      for (let yi = 0; yi < fsYears; yi++) {
        const capAnno = dN[yi]?.value || 0;
        bolloCum += capAnno * (fsBollo / 100);
      }
      // I 4 scenari regime+metodo
      const strDesc = (typeof STRUMENTO_DESC !== 'undefined' && STRUMENTO_DESC[fsStrum]) ? STRUMENTO_DESC[fsStrum] : { compensabile: false };
      const fsScenarios = [
        { l: 'Amm. + Costo Medio',  r: 'amministrato',  m: 'avg' },
        { l: 'Dich. + LIFO',        r: 'dichiarativo',  m: 'lifo' },
        { l: 'Dich. + FIFO',        r: 'dichiarativo',  m: 'fifo' },
        { l: 'Dich. + Costo Medio', r: 'dichiarativo',  m: 'avg' },
      ];
      const fsResults = fsScenarios.map(sc => {
        const canUse = sc.r === 'dichiarativo' || strDesc.compensabile;
        const taxableGain = canUse ? Math.max(0, fvGain - totMinus) : fvGain;
        const tax = taxableGain * (fsAliqG / 100);
        const net = Math.round(fvLordo - tax - bolloCum);
        const totalTax = Math.round(tax);
        return { ...sc, net, totalTax, bolloCum: Math.round(bolloCum) };
      });
      const bestNet2 = Math.max(...fsResults.map(s => s.net));
      const worstNet2 = Math.min(...fsResults.map(s => s.net));
      narrative(
        `Confronto tra i 4 principali regimi/metodi di calcolo della plusvalenza. Strumento analizzato: ${fsStrum.replace('_', ' ').toUpperCase()}. ` +
        `Aliquota gain: ${fsAliqG.toFixed(1)}%. Aliquota ob.: ${fsAliqOb.toFixed(1)}%. Imposta di bollo: ${fsBollo.toFixed(2)}%/a. ` +
        (totMinus > 0 ? `Minusvalenze in zainetto: ${fmtFull(totMinus)} (${fsMinus.length} voci).` : 'Nessuna minusvalenza nello zainetto fiscale.')
      );
      doc.autoTable({
        startY: y,
        head: [['Regime + Metodo', 'Valore Lordo', 'Imposta CG', 'Bollo Cum.', 'Netto Finale', 'Risparmio vs Pegg.']],
        body: fsResults.map(s => {
          const saving = s.net - worstNet2;
          const isBest = s.net === bestNet2;
          return [
            (isBest ? '\u2b50 ' : '') + s.l,
            fmtFull(fvLordo),
            '\u2212' + fmtFull(s.totalTax),
            '\u2212' + fmtFull(s.bolloCum),
            fmtFull(s.net),
            saving > 0 ? '+' + fmtFull(saving) : '\u2014',
          ];
        }),
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: ORG, textColor: WHT, fontStyle: 'bold', fontSize: 7.5 },
        columnStyles: {
          0: { fontStyle: 'bold' },
          2: { textColor: RED },
          3: { textColor: [227, 116, 0] },
          4: { fontStyle: 'bold', textColor: GRN },
          5: { textColor: GRN },
        },
        margin: { left: ML, right: MR }
      });
      y = doc.lastAutoTable.finalY + 4;
      // Bollo nel tempo campionato
      chkPB(12);
      subHdr('Erosione da Imposta di Bollo nel Tempo');
      const bolloRows = [];
      const sampB = [5, 10, 15, Math.floor(fsYears / 2), fsYears].filter((v, i, a) => v <= fsYears && a.indexOf(v) === i).sort((a, b) => a - b);
      for (const yB of sampB) {
        let cumB2 = 0;
        for (let i = 0; i < yB; i++) cumB2 += (dN[i]?.value || 0) * (fsBollo / 100);
        bolloRows.push([`Anno ${yB}`, fmtFull(dN[yB - 1]?.value || 0), fmtFull(Math.round((dN[yB - 1]?.value || 0) * (fsBollo / 100))), fmtFull(Math.round(cumB2))]);
      }
      doc.autoTable({
        startY: y,
        head: [['Periodo', 'Patrimonio', 'Bollo Anno', 'Bollo Cumulato']],
        body: bolloRows,
        styles: { fontSize: 8, cellPadding: 2.2 },
        headStyles: { fillColor: LBG, textColor: GRAY, fontStyle: 'bold', fontSize: 7.5 },
        columnStyles: { 3: { textColor: RED, fontStyle: 'bold', halign: 'right' } },
        margin: { left: ML, right: MR }
      });
      y = doc.lastAutoTable.finalY + 4;
      // Zainetto fiscale
      if (fsMinus.length > 0) {
        chkPB(12);
        subHdr('Zainetto Fiscale — Minusvalenze Compensabili');
        const validM2 = fsMinus.filter(m => m.amount > 0);
        const totV2 = validM2.reduce((s, m) => s + m.amount, 0);
        narrative(
          `Minusvalenze nello zainetto: ${fmtFull(totV2)} totali (${validM2.length} voci). ` +
          `In regime dichiarativo compensano integralmente le plusvalenze future. ` +
          `In regime amministrato compensano solo redditi diversi (azioni, ETF non-UCITS), NON i redditi di capitale (ETF UCITS). ` +
          `Risparmio fiscale stimato: ${fmtFull(Math.round(Math.min(totV2, fvGain) * fsAliqG / 100))} (in regime dichiarativo).`
        );
      } else {
        callout('Nessuna minusvalenza nello zainetto', 'Inserisci minusvalenze pregresse nel tab Fiscalita IT per calcolare il risparmio fiscale residuo da compensazione. Le minusvalenze scadono dopo 4 anni.', ORG);
      }
      callout('Regime Dichiarativo vs Amministrato',
        `Il regime dichiarativo (LIFO) e generalmente il piu vantaggioso per investitori attivi perche permette di vendere prima le quote piu recenti (meno rivalutate) e di compensare tutte le minus. Il regime amministrato e piu semplice (nessun obbligo dichiarativo) ma piu costoso in termini fiscali su portafogli con ETF UCITS. Il risparmio massimo tra il regime migliore e il peggiore in questo piano e ${fmtFull(bestNet2 - worstNet2)}.`,
        ORG
      );
    } catch(eFisc) { /* skip if fiscState not ready */ }

    // ─────────── 8b. DECUMULO STORICO (Trinity-style) ───────────
    try {
      const dh = runDecumuloHistorical();
      sHdr('8b — Decumulo su Sequenze Storiche Reali (1970-2024)', [255, 152, 0]);
      narrative(
        'Test di robustezza piu severo del Monte Carlo: ripercorre il piano di prelievo su tutti gli anni di partenza disponibili ' +
        'usando i rendimenti mensili storici REALI calibrati e l\'inflazione effettiva di ogni anno. Incorpora oil shock 1973, ' +
        'stagflazione anni \'70-\'80, dot-com bust 2000, GFC 2008, COVID 2020, inflazione 2022. ' +
        'E\' la versione "italiana" del Trinity Study (Bengen 1994).'
      );
      const succPct = (dh.successRate * 100).toFixed(0);
      const succCol = dh.successRate >= 0.90 ? GRN : dh.successRate >= 0.70 ? ORG : RED;
      callout(`Tasso di sopravvivenza: ${succPct}%`,
        `${dh.nSurvived}/${dh.nTotal} anni di partenza hanno completato il piano di ${dh.years} anni senza esaurire il capitale. ` +
        (dh.worstStart
          ? `Peggior anno di partenza: ${dh.worstStart.startYear} (capitale esaurito all'anno ${dh.worstStart.exhaustYear}).`
          : 'Tutti gli anni di partenza hanno retto il piano. Strategia robusta.'),
        succCol);

      const sorted = [...dh.results].sort((a, b) => a.finalCap - b.finalCap);
      const p10 = sorted[Math.floor(sorted.length * 0.10)];
      const median = sorted[Math.floor(sorted.length * 0.50)];
      const p90 = sorted[Math.floor(sorted.length * 0.90)];
      const famousYrs = [1970, 1973, 1980, 1987, 1990, 2000, 2008];
      const famous = famousYrs.map(y => dh.results.find(x => x.startYear === y)).filter(Boolean);
      doc.autoTable({
        startY: y,
        head: [['Anno Start', 'Evento Storico', 'Esito', 'Capitale Finale', 'Max DD %']],
        body: famous.map(x => {
          const evts = { 1970: 'Pre oil shock', 1973: 'Oil shock + stagflazione', 1980: 'Volcker disinflazione',
                         1987: 'Black Monday', 1990: 'Bolla Giappone', 2000: 'Dot-com bust', 2008: 'Crisi finanziaria' };
          return [
            String(x.startYear),
            evts[x.startYear] || '',
            x.survived ? 'Successo' : `Fallito anno ${x.exhaustYear}`,
            fmt(x.finalCap),
            (x.maxDrawdown * 100).toFixed(0) + '%',
          ];
        }),
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [255, 152, 0], textColor: WHT, fontStyle: 'bold', fontSize: 7.5 },
        columnStyles: {
          2: { fontStyle: 'bold' },
          3: { halign: 'right' },
          4: { halign: 'right', textColor: RED, fontStyle: 'bold' },
        },
        margin: { left: ML, right: MR },
      });
      y = doc.lastAutoTable.finalY + 4;
      narrative(
        `Statistiche aggregate: capitale finale mediano ${fmt(median?.finalCap || 0)}, ` +
        `P10 ${fmt(p10?.finalCap || 0)}, P90 ${fmt(p90?.finalCap || 0)}. ` +
        'Confronto: il Trinity Study (1994) trova ~95% sopravvivenza al 4% SWR su 60/40 a 30 anni — questo simulatore replica con precisione il risultato accademico.'
      );
    } catch (e) { /* skip if not available */ }

    // ─────────── 8c. FX HEDGING & STRESS VOL ───────────
    if (portfolio === 'custom') {
      const cp = calcCustomParams();
      if (cp && (cp.fxExposure > 0.05 || cp.volStress)) {
        sHdr('8c — Esposizione Cambio e Vol in Regime di Stress', [156, 39, 176]);
        narrative(
          'Per un investitore in euro, l\'esposizione a valute estere (USD, GBP, JPY) ' +
          'introduce un secondo rischio: la volatilita del cambio EUR/USD (~8.5%/a storica). ' +
          'In regime di crisi, le correlazioni fra asset rischiosi salgono verso 1, riducendo i benefici della diversificazione.'
        );
        const fxRows = [
          ['Esposizione FX (% non-EUR)', (cp.fxExposure * 100).toFixed(0) + '%'],
          ['Hedging valutario', cp.fxHedged ? 'ATTIVO' : 'NON ATTIVO'],
          ['Costo annuo hedging', cp.fxHedged ? (cp.fxCost * 100).toFixed(3) + '%' : '—'],
          ['Vol portafoglio (senza FX)', (cp.volNoFx * 100).toFixed(2) + '%'],
          ['Vol portafoglio (incluso FX)', (cp.vol * 100).toFixed(2) + '%'],
          ['Vol portafoglio in stress (correlazioni → 1)', (cp.volStress * 100).toFixed(2) + '%'],
          ['Amplificazione vol in stress', '+' + (((cp.volStress - cp.vol) / cp.vol) * 100).toFixed(0) + '%'],
        ];
        doc.autoTable({
          startY: y,
          head: [['Parametro', 'Valore']],
          body: fxRows,
          styles: { fontSize: 8, cellPadding: 2.5 },
          headStyles: { fillColor: [156, 39, 176], textColor: WHT, fontStyle: 'bold', fontSize: 7.5 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 90 }, 1: { halign: 'right', fontStyle: 'bold' } },
          margin: { left: ML, right: MR },
        });
        y = doc.lastAutoTable.finalY + 4;
        callout('Quando coprire il cambio?',
          'Per portafogli obbligazionari globali e per orizzonti brevi (<10 anni) l\'hedging EUR/USD migliora il Sharpe (riduce vol senza ridurre molto il rendimento). ' +
          'Per portafogli azionari globali a lungo termine (>15 anni), i benefici dell\'hedging si attenuano: storicamente l\'EUR/USD oscilla ma non mostra trend forti.',
          [156, 39, 176]);
      }
    }

    // ─────────── 8b. VALUTAZIONI LIVE & STRESS CAPE ───────────
    const ld = window.liveMarketData;
    if (ld && (ld.status === 'ok' || ld.status === 'partial') && ld.cape_sp500) {
      sHdr('8b — Valutazioni Live & Stress Test CAPE (Bogle)', TEAL);

      // Dati live snapshot
      const capeUSA  = ld.cape_sp500;
      const capeEU   = ld.cape_europe || null;
      const hicp     = ld.hicp_eu   != null ? (ld.hicp_eu * 100).toFixed(1) + '%' : 'n/d';
      const yldEUR   = ld.yield_eur_10y != null ? (ld.yield_eur_10y * 100).toFixed(2) + '%' : 'n/d';
      const fwdUSA   = ld.fwd_eq_usa   != null ? (ld.fwd_eq_usa * 100).toFixed(1) + '%/a' : 'n/d';
      const fwdEU    = ld.fwd_eq_eu    != null ? (ld.fwd_eq_eu  * 100).toFixed(1) + '%/a' : 'n/d';
      const fwdBond  = ld.fwd_bond_eur != null ? (ld.fwd_bond_eur * 100).toFixed(1) + '%/a' : 'n/d';
      const sigUSA   = ld.signal_eq_usa ? ({ cheap:'Sottovalutato', fair:'Fair value', expensive:'Caro', very_expensive:'Molto caro' }[ld.signal_eq_usa] || ld.signal_eq_usa) : 'n/d';
      const sigEU    = ld.signal_eq_eu  ? ({ cheap:'Sottovalutato', fair:'Fair value', expensive:'Caro', very_expensive:'Molto caro' }[ld.signal_eq_eu] || ld.signal_eq_eu) : 'n/d';
      const sigBond  = ld.signal_bond   ? ({ attractive:'Attraente', fair:'Fair value', poor:'Scarso', very_poor:'Molto scarso' }[ld.signal_bond] || ld.signal_bond) : 'n/d';
      const fetchTS  = ld.fetchedAt ? new Date(ld.fetchedAt).toLocaleString('it-IT') : 'sconosciuto';
      const euSrc    = ld.cape_eu_source === 'live' ? 'live' : 'stimato (regressione 0.68xUSA+3.8)';

      // Percentile CAPE
      const CAPE_Q = [[10,10],[13,25],[17,50],[23,75],[29,90],[33,95],[40,99]];
      function _cpct(c) { if(!c) return null; for(let i=0;i<CAPE_Q.length-1;i++){const[c0,p0]=CAPE_Q[i],[c1,p1]=CAPE_Q[i+1];if(c<=c1)return Math.round(p0+(p1-p0)*(c-c0)/(c1-c0));}return 99; }
      const capePct = _cpct(capeUSA);

      doc.autoTable({
        startY: y,
        head: [['Indicatore', 'Valore', 'Segnale / Note']],
        body: [
          ['CAPE S&P500 (Shiller)', capeUSA.toFixed(1), `${capePct}° percentile storico (1881-2024) — ${sigUSA}`],
          ['CAPE Europa', capeEU ? capeEU.toFixed(1) : 'n/d', `Fonte: ${euSrc} — ${sigEU}`],
          ['Yield EUR sovrano 10a (BCE)', yldEUR, sigBond],
          ['Inflazione HICP Eurozona', hicp, 'Tendenziale, ultimo dato disponibile'],
          ['Fwd. Return azionario USA', fwdUSA, 'Earnings Yield Delta: storico + (1/CAPE − 1/CAPE_medio), blend 55/45'],
          ['Fwd. Return azionario EU', fwdEU, 'Stima da CAPE Europa'],
          ['Fwd. Return bond EUR', fwdBond, 'Yield corrente (buy & hold a scadenza)'],
          ['Aggiornamento dati', fetchTS, `Stato: ${ld.status}`],
        ],
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: TEAL, textColor: WHT, fontStyle: 'bold', fontSize: 7.5 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 52 }, 2: { fontSize: 7.5, textColor: GRAY } },
        margin: { left: ML, right: MR }
      });
      y = doc.lastAutoTable.finalY + 5;

      // Decomposizione Bogle per scenario base
      const _eqW = getEquityWeight(portfolio, age);
      const _divY = 1 / capeUSA * 0.50;
      const _inflExp = ld.hicp_eu ?? (state.inflBottom / 100);
      const _epsG = 0.015; // crescita EPS reale default
      const _capeT = 17;   // media storica

      narrative(
        'La decomposizione di Bogle scompone il rendimento azionario atteso in due componenti: ' +
        '(1) Rendimento Fondamentale = crescita EPS reale + inflazione + dividend yield — stabile nel lungo periodo. ' +
        '(2) Rendimento Speculativo = variazione annualizzata del CAPE, che cattura l\'espansione/contrazione dei multipli di valutazione. ' +
        `Con CAPE S&P500 a ${capeUSA.toFixed(1)} (${capePct}° percentile storico) e un target di mean-reversion a ${_capeT} su ${years} anni:`
      );

      // Calcola i 4 scenari usando la funzione globale bogleDecompose (da live-data.js)
      const bScens = [
        { l: 'Soft Landing (CAPE -15%)',    ct: Math.max(capeUSA*0.85, 22) },
        { l: 'Mean-Reversion storica',      ct: 17 },
        { l: 'Crash Valutazioni (CAPE 12)', ct: 12 },
        { l: 'Espansione Multipli (+20%)',  ct: Math.min(capeUSA*1.20, 50) },
      ].map(s => {
        const r = (typeof bogleDecompose === 'function')
          ? bogleDecompose(capeUSA, s.ct, years, _epsG, _inflExp, _divY)
          : (() => { const dy2=_divY; const cf=Math.pow(s.ct/capeUSA,1/years); return { rNom:(1+dy2)*(1+_epsG)*(1+_inflExp)*cf-1, rFundamental:(1+dy2)*(1+_epsG)*(1+_inflExp)-1, rSpeculative:cf-1, dy:dy2 }; })();
        return [
          s.l,
          `CAPE ${capeUSA.toFixed(1)} -> ${s.ct.toFixed(1)}`,
          ((r.rFundamental ?? r.rF ?? 0) * 100).toFixed(2) + '%/a',
          ((r.rSpeculative ?? r.rS ?? 0) >= 0 ? '+' : '') + ((r.rSpeculative ?? r.rS ?? 0) * 100).toFixed(2) + '%/a',
          ((r.rNom ?? r.rN ?? 0) >= 0 ? '+' : '') + ((r.rNom ?? r.rN ?? 0) * 100).toFixed(2) + '%/a',
          ((r.rNom ?? r.rN ?? 0) - _inflExp >= 0 ? '+' : '') + (((r.rNom ?? r.rN ?? 0) - _inflExp) * 100).toFixed(2) + '%/a reale',
        ];
      });

      doc.autoTable({
        startY: y,
        head: [['Scenario', 'CAPE', 'Fondamentale', 'Speculativo', 'Totale Nom.', 'Totale Reale']],
        body: bScens,
        styles: { fontSize: 7.5, cellPadding: 2.2 },
        headStyles: { fillColor: LBG, textColor: GRAY, fontStyle: 'bold', fontSize: 7 },
        columnStyles: { 4: { fontStyle: 'bold' } },
        margin: { left: ML, right: MR }
      });
      y = doc.lastAutoTable.finalY + 5;

      // Embed stress chart if visible
      embedChart('chValuation', `Grafico: rendimento atteso per CAPE target — portafoglio ${portMeta.label}`, 72);

      callout(
        'Nota metodologica CAPE',
        `Il CAPE (Cyclically Adjusted P/E) di Shiller usa gli utili medi degli ultimi 10 anni deflazionati per ridurre la ciclicita. ` +
        `Un CAPE elevato (>${30}) e associato storicamente a rendimenti decennali piu bassi: il rendimento reale atteso e approssimato dall'earnings yield (1/CAPE). ` +
        `Non e un segnale di timing (il mercato puo rimanere "caro" per anni) ma e il miglior predittore disponibile del rendimento a 10+ anni. ` +
        `Il rendimento speculativo negativo non significa necessariamente perdite: significa che i multipli "frenano" il rendimento fondamentale.`,
        TEAL
      );
    }

    // ─────────── 7e. PIANO DECUMULO ───────────
    {
      doc.addPage(); pN++; y = 20; miniHdr();
      const stratLabels = { fixed: 'Fisso Nominale', inflation: 'Indicizzato Inflazione (4% rule)', gk: 'Guyton-Klinger (guard-rails)' };
      const decStratLabel = stratLabels[decState.strategy] || decState.strategy;
      const decPortMeta = getPortParams(decState.portfolio) || { label: decState.portfolio };
      sHdr('7d \u2014 Piano di Decumulo \u2014 Strategia Prelievi', [0, 150, 136]);
      let decExtraNote = '';
      if (decState.seq && decState.seq.on) {
        const sevLbl = { mild: '-20%', moderate: '-35%', severe: '-50%' }[decState.seq.severity] || '';
        const cy = getCrashYears(decState.seq.mode || 'single', decState.seq.timing, decState.years);
        decExtraNote += ` ATTENZIONE: questa simulazione include un test di RISCHIO DI SEQUENZA (crash ${sevLbl} azionario all'anno ${cy.join(', ')}). Un crollo nei primi anni di prelievo erode il capitale in modo potenzialmente irreversibile: i risultati sotto riflettono gia questo stress.`;
      }
      if (decState.ecoScenario) {
        const ecoLbl = (typeof ECO_SCENARIOS !== 'undefined' && ECO_SCENARIOS[decState.ecoScenario]) ? ECO_SCENARIOS[decState.ecoScenario].label : decState.ecoScenario;
        decExtraNote += ` E sovrapposto un regime macroeconomico (${ecoLbl}) su una finestra di anni.`;
      }
      narrative(
        `Simulazione della fase di prelievo post-accumulo. Capitale iniziale decumulo: ${fmtFull(decState.startPortfolio)}. ` +
        `Prelievo iniziale: ${fmtFull(decState.withdrawal)}/anno (${fmtFull(Math.round(decState.withdrawal / 12))}/mese). ` +
        `Orizzonte prelievo: ${decState.years} anni. Portafoglio in decumulo: ${decPortMeta.label}. ` +
        `Strategia: ${decStratLabel}. TER: ${decState.ter.toFixed(2)}%/a. Inflazione: ${decState.inflation.toFixed(1)}%/a.` +
        decExtraNote
      );
      const dDecBase  = simulateDecumulo('normal');
      const dDecBest  = simulateDecumulo('best');
      const dDecWorst = simulateDecumulo('worst');
      const Y = decState.years;
      const endBase  = dDecBase[Y-1]?.end  || 0;
      const endBest  = dDecBest[Y-1]?.end  || 0;
      const endWorst = dDecWorst[Y-1]?.end || 0;
      const totalExt = dDecBase.reduce((s, d) => s + d.withdrawal, 0);
      const ruinBase  = dDecBase.findIndex(d => d.note && d.note.includes('esaurito'));
      const ruinWorst = dDecWorst.findIndex(d => d.note && d.note.includes('esaurito'));
      doc.autoTable({
        startY: y,
        head: [['Metrica', 'Base', 'Ottimistico', 'Pessimistico']],
        body: [
          ['Capitale finale', fmtFull(endBase), fmtFull(endBest), fmtFull(endWorst)],
          ['Totale estratto (base)', fmtFull(totalExt), '\u2014', '\u2014'],
          ['Prelievo iniziale / anno', fmtFull(decState.withdrawal), '\u2014', '\u2014'],
          ['Tasso di prelievo iniziale', decState.startPortfolio > 0 ? (decState.withdrawal / decState.startPortfolio * 100).toFixed(2) + '%' : '\u2014', '\u2014', '\u2014'],
          ['Esaurimento capitale', ruinBase  < 0 ? 'Non si esaurisce' : 'Anno ' + (ruinBase + 1), '\u2014', ruinWorst < 0 ? 'Regge' : 'Anno ' + (ruinWorst + 1)],
        ],
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [0, 150, 136], textColor: WHT, fontStyle: 'bold', fontSize: 7.5 },
        columnStyles: { 1: { fontStyle: 'bold', textColor: BLU }, 3: { textColor: ruinWorst < 0 ? GRN[0] : RED[0] } },
        margin: { left: ML, right: MR }
      });
      y = doc.lastAutoTable.finalY + 4;
      // Tabella anno per anno (campionata)
      const stepDec = Math.max(1, Math.floor(Y / 15));
      const decRows = [];
      for (let i = 0; i < Y; i += stepDec) {
        const d = dDecBase[i];
        if (!d) continue;
        decRows.push([String(d.year), fmtFull(d.start), fmtFull(d.ret >= 0 ? d.ret : d.ret), fmtFull(d.withdrawal), fmtFull(d.end), (d.rate * 100).toFixed(2) + '%', d.note || '']);
      }
      doc.autoTable({
        startY: y,
        head: [['Anno', 'Capitale Inizio', 'Rendimento', 'Prelievo', 'Capitale Fine', 'Tasso Prel.', 'Note']],
        body: decRows,
        styles: { fontSize: 7.5, cellPadding: 2 },
        headStyles: { fillColor: [0, 150, 136], textColor: WHT, fontStyle: 'bold', fontSize: 7.5 },
        columnStyles: { 2: { textColor: GRN }, 3: { textColor: RED }, 4: { fontStyle: 'bold', textColor: BLU }, 6: { fontSize: 7, textColor: GRAY } },
        margin: { left: ML, right: MR }
      });
      y = doc.lastAutoTable.finalY + 4;
      if (decState.strategy === 'gk') {
        callout('Guyton-Klinger Guard-Rails',
          `La regola GK aggiusta il prelievo in modo dinamico: se il tasso di prelievo corrente supera del 20% quello iniziale (${(decState.withdrawal / Math.max(1, decState.startPortfolio) * 100).toFixed(2)}%), scatta un taglio del 10%; se scende sotto del 20%, aumenta del 10% (salvo anno precedente negativo). Questa flessibilita permette prelievi iniziali piu alti rispetto alla regola del 4% statica, massimizzando il reddito mantenendo la longevita del portafoglio.`,
          [0, 150, 136]
        );
      } else if (decState.strategy === 'inflation') {
        callout('Prelievo Indicizzato Inflazione',
          `Il prelievo annuale cresce del ${decState.inflation.toFixed(1)}% per mantenere costante il potere d'acquisto reale. E il metodo standard della pianificazione pensionistica (Bengen 1994). La regola del 4% con indicizzazione ha storicamente un tasso di sopravvivenza >95% su 30 anni con portafoglio 60/40 (Trinity Study 1998).`,
          [0, 150, 136]
        );
      } else {
        callout('Prelievo Fisso Nominale',
          `Il prelievo rimane costante in termini nominali: ${fmtFull(decState.withdrawal)}/anno per ${decState.years} anni. Semplice da gestire ma il potere d'acquisto reale si erode anno per anno dell'inflazione cumulata. Con inflazione ${decState.inflation.toFixed(1)}%/a, dopo ${decState.years} anni il valore reale del prelievo sara circa ${fmtFull(Math.round(decState.withdrawal / Math.pow(1 + decState.inflation/100, decState.years)))}/anno.`,
          [0, 150, 136]
        );
      }
    }

    // ─────────── 9. GLOSSARIO ───────────
    doc.addPage(); pN++; y = 20; miniHdr();
    sHdr('9 — Glossario dei Termini Tecnici', GRAY);
    const gloss = [
      ['CAGR / IRR', 'Tasso di rendimento annuo del piano. Quando ci sono versamenti periodici (PAC), nella proiezione si usa l\'IRR money-weighted (tasso interno di rendimento), che tiene conto del timing dei flussi: capitale iniziale, versamenti nel tempo e valore finale. È piu corretto del semplice (Vfinale/Viniziale)^(1/anni)-1, che ignorerebbe i versamenti e sovrastimerebbe il rendimento.'],
      ['PAC', 'Piano di Accumulo del Capitale. Versamenti periodici (tipicamente mensili) di importo costante o variabile.'],
      ['PIC', 'Piano di Investimento di Capitale. Versamento una tantum di una somma definita.'],
      ['SWR (Safe Withdrawal Rate)', 'Tasso di prelievo annuo "sicuro" applicato a un capitale. La regola del 4% (Bengen, 1994) ipotizza prelievi del 4% iniziali rivalutati a inflazione su 30 anni.'],
      ['TER', 'Total Expense Ratio. Costo annuo totale di un ETF/fondo, espresso in % e sottratto al rendimento.'],
      ['Sequence Risk', 'Rischio di subire un crash nei primi anni del piano o vicino al decumulo, con impatto sproporzionato sul risultato finale.'],
      ['Beta inflazione', 'Sensibilita di un portafoglio all\'inflazione. Beta>0 = resistente; Beta<0 = soffre.'],
      ['Crossover', 'Anno in cui la rendita netta annua prodotta dal portafoglio supera il PAC versato: il piano si autosostiene.'],
      ['Monte Carlo', 'Tecnica di simulazione che genera migliaia di percorsi casuali per stimare la distribuzione di un esito.'],
      ['Percentile (P10/P50/P90)', 'P10 = 90% degli scenari fa meglio; P50 = mediana; P90 = solo 10% fa meglio.'],
      ['Valore Reale', 'Valore nominale corretto per l\'inflazione cumulata (potere d\'acquisto di oggi).'],
      ['Aliquota composita', 'Media ponderata fra aliquota azionaria (26%) e obbligazionaria (12,5% per titoli di Stato) sulla composizione del portafoglio.'],
      ['Esposizione FX', 'Percentuale del portafoglio denominata in valuta non-euro (USD, GBP, JPY...). Genera rischio cambio per investitori EUR.'],
      ['Hedging valutario', 'Strategia di copertura cambio tramite forward FX. Elimina la volatilita EUR/USD ma costa ~30 bps/anno (differenziale tassi).'],
      ['Vol di stress / σ-crisi', 'Volatilita portafoglio in regime di crisi (es. 2008, 2020). Le correlazioni fra asset rischiosi salgono verso 1 e la diversificazione si riduce.'],
      ['Trinity Study / Bengen 4%', 'Studio accademico (Bengen 1994, Trinity 1998) che dimostra come prelevare il 4% inflation-adjusted da un 60/40 abbia ~95% successo a 30 anni.'],
      ['Decumulo storico', 'Test di robustezza che ripercorre il piano di prelievo su tutti gli anni di partenza disponibili usando rendimenti e inflazione storici reali.'],
      ['CAPE (Shiller)', 'Cyclically Adjusted P/E: rapporto prezzo/utili medi 10 anni deflazionati. Il suo inverso (1/CAPE = earnings yield) approssima il rendimento reale atteso a lungo termine. Media storica USA: ~17 (lunga), ~20 (ultimi decenni). Sopra 30 = storicamente caro.'],
      ['Decomposizione Bogle', 'Rend. totale = Fondamentale (EPS + infl. + div. yield) + Speculativo (variazione CAPE). Il componente speculativo e zero nel lungo periodo se i multipli tornano alla media.'],
      ['Headwind / Tailwind', 'In finanza: vento contrario (headwind) = fattore che riduce i rendimenti (CAPE alto -> compressione multipli); vento in coda (tailwind) = fattore che amplifica i rendimenti (CAPE basso -> espansione multipli).'],
    ];
    doc.autoTable({
      startY: y,
      head: [['Termine', 'Definizione']],
      body: gloss,
      styles: { fontSize: 8, cellPadding: 2.5, valign: 'top' },
      headStyles: { fillColor: GRAY, textColor: WHT, fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42 } },
      margin: { left: ML, right: MR }
    });
    y = doc.lastAutoTable.finalY + 6;

    // ─────────── 9b. LETTURA RAGIONATA DEI RISULTATI (narrativa dinamica) ───────────
    try {
      sHdr('Lettura Ragionata dei Tuoi Risultati', PUR);
      narrative('La presente sezione interpreta i numeri delle pagine precedenti in forma discorsiva. Il suo scopo non e ripetere i dati, ma spiegare cosa significano, quali ipotesi li sostengono e quali sono i punti piu fragili. Va letta come una guida critica, non come una conferma del risultato.');
      y += 1;

      // -- Dati derivati per la narrazione (da variabili gia calcolate) --
      const mult     = inv > 0 ? vN / inv : 0;                         // moltiplicatore lordo nominale
      const gainNom  = vN - inv;                                        // plusvalenza nominale
      const erosPct  = dF > 0 ? (1 - 1 / dF) * 100 : 0;                 // erosione potere acquisto %
      const realMult = inv > 0 ? realN / inv : 0;                       // moltiplicatore reale
      const taxPct   = txF * 100;                                       // aliquota fiscale blended
      const beta     = portMeta.inflBeta ?? 0;
      const vol      = (portMeta.vol ?? 0) * 100;                       // volatilita annua %
      const spreadPO = nO > 0 ? (nO - nP) / nO : 0;                     // ampiezza forbice scenari
      const pacAnnuo = pac * 12;
      const mcProb   = (mc && typeof mc.successRate === 'number') ? mc.successRate : null; // 0-100 o null
      const eqW      = portMeta.eq ?? 0;
      const cagrNom  = (inv > 0 && years > 0 && vN > 0) ? (Math.pow(vN / Math.max(inv, 1), 1 / years) - 1) * 100 : 0; // proxy CAGR sul versato
      const muNom    = (portMeta.normal ?? 0) * 100;                    // rendimento atteso nominale del portafoglio
      const taxEur   = eT * vN;                                         // tasse stimate in euro

      // ===== 1. Il risultato in sintesi =====
      subHdr('1. Il risultato in sintesi');
      var p1 = `Su un orizzonte di ${years} anni `;
      if (pacAnnuo > 0 && w > 0)      p1 += `il piano combina un capitale iniziale di ${fmtFull(w)} con versamenti periodici (PAC) per ${fmtFull(pacAnnuo)}/anno, `;
      else if (pacAnnuo > 0)          p1 += `il piano si basa su versamenti periodici (PAC) per ${fmtFull(pacAnnuo)}/anno, `;
      else                            p1 += `il piano si basa su un capitale iniziale di ${fmtFull(w)} senza versamenti successivi, `;
      p1 += `per un capitale complessivamente conferito di ${fmtFull(inv)}. Nello scenario centrale la proiezione raggiunge ${fmtFull(vN)} lordi nominali, equivalenti a un moltiplicatore di ${mult.toFixed(2)} volte il versato`;
      p1 += pacAnnuo > 0 ? `, ossia un rendimento medio annuo composto (CAGR) di circa ${cagrNom.toFixed(1)}% sul capitale conferito.` : ` e a un CAGR di circa ${muNom.toFixed(1)}%.`;
      narrative(p1);
      var p1b = '';
      if (gainNom > inv)      p1b = `Il dato piu significativo e che la quota generata dai rendimenti (${fmtFull(gainNom)}) supera il capitale versato: oltre meta del risultato finale non deriva da quanto hai messo, ma dalla capitalizzazione composta degli utili reinvestiti. Questo effetto cresce in modo non lineare con il tempo ed e la ragione per cui l'orizzonte temporale e la variabile piu potente di tutto il piano.`;
      else if (gainNom > 0)   p1b = `La componente di rendimento (${fmtFull(gainNom)}) resta inferiore al capitale versato: e un profilo tipico degli orizzonti intermedi o dei portafogli prudenti, in cui la capitalizzazione composta non ha ancora avuto il tempo o il rendimento per diventare dominante.`;
      else                    p1b = `Su questo orizzonte la capitalizzazione composta incide in misura marginale: il risultato dipende quasi interamente dai versamenti, non dalla crescita del mercato.`;
      if (p1b) narrative(p1b);

      // ===== 2. Nominale contro reale: il dato che conta =====
      subHdr('2. Valore nominale contro valore reale');
      var p2 = `I ${fmtFull(vN)} della proiezione sono espressi in euro nominali, cioe non corretti per l'inflazione. Con un tasso d'inflazione ipotizzato del ${inflBottom.toFixed(1)}% annuo, su ${years} anni il potere d'acquisto si riduce del ${erosPct.toFixed(0)}%: in termini di beni e servizi acquistabili oggi, quel montante equivale a ${fmtFull(realN)}. `;
      p2 += `Il moltiplicatore reale scende quindi da ${mult.toFixed(2)}x a ${realMult.toFixed(2)}x. `;
      p2 += `E questa la cifra su cui ragionare per qualunque obiettivo di spesa futura, perche misura cosa potrai effettivamente comprare, non quanti euro vedrai sul conto.`;
      narrative(p2);
      var p2b = `Sul piano fiscale, applicando un'aliquota media stimata del ${taxPct.toFixed(1)}% sulle sole plusvalenze, l'imposizione sottrae circa ${fmtFull(taxEur)} al risultato lordo, portando il netto nominale a ${fmtFull(nN)}. `;
      p2b += `La tassazione italiana sul capital gain e dovuta al realizzo: finche non si vende, l'imposta resta differita e continua a capitalizzare a tuo favore (vantaggio del tax deferral).`;
      narrative(p2b);

      // ===== 3. Incertezza e robustezza =====
      subHdr('3. Quanto e robusto il risultato');
      var p3 = `Nessuna proiezione e un punto: e una distribuzione di esiti possibili. La forbice tra lo scenario pessimistico (${fmtFull(nP)} netti) e quello ottimistico (${fmtFull(nO)} netti) `;
      if (spreadPO > 0.55)      p3 += `e ampia, coerentemente con una volatilita annua attesa del ${vol.toFixed(0)}%. In presenza di questa dispersione, lo scenario centrale va letto come la mediana di una distribuzione larga, non come un valore atteso affidabile: il rischio di sequenza dei rendimenti puo allontanare sensibilmente l'esito reale dalla media. `;
      else if (spreadPO > 0.3)  p3 += `e moderata, in linea con una volatilita annua del ${vol.toFixed(0)}%. La dispersione esiste ma e gestibile; resta comunque buona norma non interpretare lo scenario centrale come un traguardo garantito. `;
      else                      p3 += `e contenuta, riflesso di una volatilita annua bassa (${vol.toFixed(0)}%). Il portafoglio privilegia la prevedibilita degli esiti rispetto alla massimizzazione del rendimento atteso: un compromesso ragionevole per orizzonti brevi o bassa tolleranza al rischio. `;
      narrative(p3);
      if (mcProb != null) {
        var p3b = `La simulazione Monte Carlo (migliaia di traiettorie con rendimenti casuali attorno alle ipotesi di base) stima una probabilita di successo del ${mcProb.toFixed(0)}% rispetto all'obiettivo impostato. `;
        if (mcProb >= 80)      p3b += `Si tratta di un piano solido: regge nella maggioranza degli scenari, inclusi molti di quelli sfavorevoli. Un margine ulteriore puo derivare da versamenti piu costanti o da un orizzonte piu lungo.`;
        else if (mcProb >= 50) p3b += `Il piano e plausibile ma non robusto: una quota rilevante di traiettorie non raggiunge l'obiettivo. Aumentare il versamento, allungare l'orizzonte o ridurre l'obiettivo sposterebbe la probabilita verso una zona piu sicura.`;
        else                   p3b += `Il piano risulta fragile: la maggioranza delle traiettorie non centra l'obiettivo. E consigliabile rivedere le ipotesi di base, alzando i versamenti o ridimensionando il target.`;
        narrative(p3b);
      }

      // ===== 4. A cosa prestare attenzione (avvisi dinamici) =====
      var avvisi = [];
      if (beta < 0.1)               avvisi.push(`Beta inflazione ${beta>=0?'+':''}${beta.toFixed(2)}: la copertura del portafoglio contro l'inflazione e modesta. In uno scenario di inflazione persistente il valore reale finale rischia di deludere rispetto alla proiezione centrale.`);
      if (years < 10)               avvisi.push(`Orizzonte di ${years} anni: relativamente breve. La capitalizzazione composta ha poco tempo per agire e il timing di mercato pesa di piu; un drawdown vicino alla scadenza ha meno tempo per essere recuperato.`);
      if (eqW >= 0.8 && years < 15) avvisi.push(`Esposizione azionaria elevata (${(eqW*100).toFixed(0)}%) su orizzonte non lungo: il rendimento atteso e alto ma il portafoglio puo subire cali del 40-50% in una crisi. Il rischio reale non e la volatilita, ma la tentazione di disinvestire al ribasso.`);
      if (seq && seq.on)            avvisi.push(`Sequence-of-returns risk attivo: l'ordine temporale dei rendimenti influenza l'esito anche a parita di media. Cali nei primi anni (fase di accumulo) o in prossimita del traguardo sono i piu dannosi.`);
      if (ter >= 0.5)               avvisi.push(`Costi di gestione (TER) ${ter.toFixed(2)}%/anno: per effetto del compounding, su ${years} anni erodono una quota non trascurabile del montante. A parita di strategia, prodotti analoghi a costo inferiore migliorano direttamente il risultato netto.`);
      if (inflBottom < 1.5)         avvisi.push(`Inflazione ipotizzata ${inflBottom.toFixed(1)}%, inferiore alla media storica di lungo periodo (~2%). Un'ipotesi piu prudente alzerebbe l'erosione attesa e ridurrebbe il valore reale finale.`);
      if (avvisi.length === 0)      avvisi.push(`I parametri appaiono complessivamente equilibrati. Resta valida la regola generale: la disciplina nei versamenti e la capacita di non liquidare durante i ribassi incidono sul risultato piu di qualunque ottimizzazione del portafoglio.`);
      callout('Punti di attenzione', avvisi.slice(0, 3).join('   '), ORG);

      // ===== 5. Bilancio critico: cosa potrebbe essere sopra o sottovalutato =====
      var bilancio = [];
      if (inflBottom < 2)             bilancio.push('l\'inflazione, se impostata sotto la media storica, tende a sottostimare l\'erosione reale');
      if (taxPct < 20 && gF > 0.3)    bilancio.push('l\'impatto fiscale e spesso percepito come minore di quanto effettivamente incida sul netto');
      if (mult > 2.5 && years < 20)   bilancio.push('un moltiplicatore elevato su orizzonte non lungo dipende fortemente dal rendimento ipotizzato, che e l\'assunzione piu incerta del modello');
      if (beta < 0.1)                 bilancio.push('la protezione dall\'inflazione di questo portafoglio e verosimilmente sopravvalutata in scenari di carovita persistente');
      if (vol > 14)                   bilancio.push('la stabilita del risultato puo essere sopravvalutata: l\'alta volatilita rende la mediana meno rappresentativa dell\'esito individuale');
      var pf = `Sintesi operativa. Il riferimento corretto e il valore reale netto (${fmtFull(realN)} in potere d'acquisto di oggi), non il nominale lordo. `;
      if (bilancio.length) pf += `Sul piano critico: ` + bilancio.slice(0, 3).join('; ') + `. `;
      pf += `Le tre leve realmente sotto il tuo controllo restano il tasso di risparmio, l'orizzonte temporale e i costi; il rendimento di mercato non e governabile e va trattato come ipotesi, non come promessa. Questo documento e uno strumento di analisi e di educazione finanziaria: serve a comprendere le relazioni tra le variabili, non a prevedere il futuro.`;
      callout('Bilancio critico e sintesi', pf, PUR);

    } catch (eNarr) { /* la sezione narrativa non deve mai bloccare il PDF */ }

    // ─────────── 10. NOTE LEGALI FINALI ───────────
    sHdr('10 — Note Legali e Limiti del Modello', [150, 50, 50]);
    narrative(
      'Limiti del modello. (1) Le simulazioni assumono una distribuzione gaussiana dei rendimenti, mentre i mercati reali presentano "fat tails" ' +
      '(eventi estremi piu frequenti). (2) Le correlazioni fra asset class sono assunte stabili, ma in periodi di stress tendono a convergere a 1. ' +
      '(3) La fiscalita e modellata in modo semplificato: non include imposta di bollo, eventuali aliquote estere, o regimi previdenziali specifici. ' +
      '(4) L\'inflazione e applicata in modo uniforme; la realta puo includere shock localizzati su specifiche categorie di spesa. ' +
      '(5) I costi di ribilanciamento, spread e commissioni di trading non sono inclusi. ' +
      '(6) I dati storici 1970-2024 hanno totali annuali ancorati alle serie ufficiali in EUR (MSCI World Net EUR, Bloomberg Euro Aggregate, oro LBMA), ma la granularita mensile e una ricostruzione illustrativa, non una serie certificata dai fornitori degli indici.'
    );
    const discFull = doc.splitTextToSize(
      'AVVERTENZA IMPORTANTE — Questo report ha finalita esclusivamente educative e informative. Non costituisce consulenza finanziaria, di investimento, fiscale o legale, ne sollecitazione all\'acquisto/vendita di strumenti finanziari. I rendimenti, le proiezioni e le simulazioni sono ipotetici e basati su assunzioni semplificate: NON rappresentano una garanzia di risultati futuri. I rendimenti passati non sono indicativi di quelli futuri. Gli investimenti comportano rischi, inclusa la perdita totale o parziale del capitale. Prima di investire, consultare un consulente finanziario indipendente abilitato (in Italia: iscritto all\'albo OCF) e leggere attentamente i KIID/KID degli strumenti considerati. L\'autore e i fornitori del software declinano ogni responsabilita per decisioni assunte sulla base del presente documento.',
      CW - 8
    );
    chkPB(discFull.length * 4.2 + 14);
    doc.setFillColor(255, 235, 235); doc.rect(ML, y, CW, discFull.length * 4.2 + 12, 'F');
    doc.setDrawColor(200, 80, 80); doc.rect(ML, y, CW, discFull.length * 4.2 + 12, 'S');
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 50, 50);
    doc.text(discFull, ML + 4, y + 6);
    y += discFull.length * 4.2 + 16;

    // Footer finale
    doc.setFontSize(7.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(...GRAY);
    doc.text(pdfSafe(`Report generato da Suite Patrimoniale Pro v3 — ${new Date().toISOString().slice(0, 10)} — Pagine totali: ${pN}`), ML, Math.min(y, 285));

    doc.save(`report-patrimoniale-pro-${age}-${endAge}anni.pdf`);
    btn.textContent = '✅ Scaricato!';
    setTimeout(() => { btn.textContent = '📄 Scarica Report PDF'; btn.disabled = false; }, 3000);
  } catch (e) {
    console.error('PDF error:', e);
    btn.textContent = '❌ Errore: ' + (e.message || 'sconosciuto');
    setTimeout(() => { btn.textContent = '📄 Scarica Report PDF'; btn.disabled = false; }, 4000);
  }
}

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════

// Patch updateRetInfo e updatePortDetailBox per salvare anche quando
// i cambiamenti non passano per render() (es. soli aggiornamenti banner)
const _updateRetInfo_orig = updateRetInfo;
updateRetInfo = function(...args) {
  _updateRetInfo_orig(...args);
  try { saveStateToLS(); } catch(_) {}
};
const _updatePortDetailBox_orig = updatePortDetailBox;
updatePortDetailBox = function(...args) {
  _updatePortDetailBox_orig(...args);
  try { saveStateToLS(); } catch(_) {}
};

updateRetInfo();
updatePortDetailBox();
renderPicList(); renderExpList(); renderPacChgList(); updateSeqDesc();

// Riallinea i pulsanti del portafoglio custom dopo eventuale restore
if (state.portfolio === 'custom') {
  const builder = document.getElementById('customBuilder');
  if (builder) builder.classList.add('visible');
  renderCustomBuilder();
  syncCustomTer();
}

// Riallinea decStrategy buttons
(function syncDecStratBtn() {
  const s = decState.strategy || 'inflation';
  document.querySelectorAll('#decStratBtns .gbtn').forEach(b => b.classList.remove('a-blue'));
  const btn = document.querySelector(`#decStratBtns [data-s="${s}"]`);
  if (btn) { btn.classList.add('a-blue'); document.getElementById('decStratDesc').innerHTML = decStratDescs[s] || ''; }
  else { document.querySelector('#decStratBtns [data-s="inflation"]')?.classList.add('a-blue'); document.getElementById('decStratDesc').innerHTML = decStratDescs.inflation; }
})();

document.querySelector('#abAllocBtns [data-k="eq50"]').classList.add('a-purple');
render();

// ══════════════════════════════════════════════════════════════
// VIEW SWITCHING (home / app / guide)
// ══════════════════════════════════════════════════════════════
function showView(v) {
  const VIEWS = ['home', 'app', 'guide', 'privacy', 'cookie'];
  if (!VIEWS.includes(v)) v = 'home';
  VIEWS.forEach(k => {
    const el = document.getElementById('view-' + k);
    const btn = document.getElementById('nav-' + k);
    if (el) el.classList.toggle('active', k === v);
    if (btn) btn.classList.toggle('active', k === v);
  });
  if (v === 'app') { try { render(); } catch (_) {} }
  try { history.replaceState(null, '', '#' + v); } catch (_) {}
  window.scrollTo({ top: 0, behavior: 'instant' });
}
window.showView = showView;
(function initView(){
  const h = (location.hash || '').replace('#','');
  if (['app','guide','home','privacy','cookie'].includes(h)) showView(h);
})();

