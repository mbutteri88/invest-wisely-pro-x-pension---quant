// ══════════════════════════════════════════════════════════════
// GUIDE PDF DOWNLOAD
// ══════════════════════════════════════════════════════════════
async function downloadGuidePDF() {
  const btn = document.getElementById('guideDlBtn');
  const orig = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '⏳ Generazione...';
  await new Promise(r => setTimeout(r, 60));
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, H = 297, ML = 16, MR = 16, CW = W - ML - MR;
    let y = 0, pN = 1;
    const BLU = [26,115,232], PUR = [147,52,230], GRAY = [95,99,104], DARK = [32,33,36], LBG = [248,249,250], AMBER = [251,188,4];

    const hdrBar = () => {
      doc.setFillColor(...LBG); doc.rect(0,0,W,12,'F');
      doc.setFontSize(7.5); doc.setFont('helvetica','normal'); doc.setTextColor(...GRAY);
    doc.text(pdfSafe('Guida all\'utilizzo — Suite Patrimoniale Pro v3'), ML, 8);
      doc.text(`Pag. ${pN}`, W-MR, 8, {align:'right'});
      doc.setDrawColor(220,220,220); doc.line(ML, 11.2, W-MR, 11.2);
    };
    const chk = (n=12) => { if (y+n>278){ doc.addPage(); pN++; y=18; hdrBar(); } };
    const h1 = (t) => { chk(16); doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.setTextColor(...BLU); doc.text(pdfSafe(t), ML, y); y+=7; doc.setDrawColor(...BLU); doc.setLineWidth(.6); doc.line(ML,y-2,ML+30,y-2); doc.setLineWidth(.2); doc.setTextColor(0,0,0); };
    const h2 = (t) => { chk(10); doc.setFontSize(10.5); doc.setFont('helvetica','bold'); doc.setTextColor(...DARK); doc.text(pdfSafe(t), ML, y); y+=5; doc.setTextColor(0,0,0); };
    const p  = (t, ind=0) => {
      doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(50,55,60);
      const lines = doc.splitTextToSize(pdfSafe(t), CW-ind);
      chk(lines.length*4.4+2);
      doc.text(lines, ML+ind, y); y += lines.length*4.4 + 2.5;
      doc.setTextColor(0,0,0);
    };
    const li = (t) => {
      doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(50,55,60);
      const lines = doc.splitTextToSize('- ' + pdfSafe(t), CW-6);
      chk(lines.length*4.4+1);
      doc.text(lines, ML+4, y); y += lines.length*4.4 + 1;
      doc.setTextColor(0,0,0);
    };
    const callout = (t, col=AMBER, title='Suggerimento') => {
      doc.setFontSize(8.7); doc.setFont('helvetica','normal');
      const lines = doc.splitTextToSize(pdfSafe(t), CW-8);
      const boxH = lines.length*4.4 + 10;
      chk(boxH+3);
      doc.setFillColor(255, 248, 225); doc.rect(ML, y, CW, boxH, 'F');
      doc.setFillColor(...col); doc.rect(ML, y, 1.5, boxH, 'F');
      doc.setFontSize(8.4); doc.setFont('helvetica','bold'); doc.setTextColor(...col);
      doc.text(pdfSafe(title), ML+5, y+5);
      doc.setFontSize(8.5); doc.setFont('helvetica','normal'); doc.setTextColor(60,55,30);
      doc.text(lines, ML+5, y+10);
      y += boxH + 3; doc.setTextColor(0,0,0);
    };

    // COVER
    doc.setFillColor(...PUR); doc.rect(0,0,W,55,'F');
    doc.setFontSize(24); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
    doc.text('Guida all\'utilizzo', ML, 24);
    doc.setFontSize(13); doc.setFont('helvetica','normal');
    doc.text(pdfSafe('Suite Patrimoniale Pro v3 — Manuale operativo completo'), ML, 33);
    doc.setFontSize(9); doc.setTextColor(230,215,255);
    doc.text(`Documento generato il ${new Date().toLocaleDateString('it-IT',{day:'2-digit',month:'long',year:'numeric'})}`, ML, 42);
    y = 65;

    h1('1 — Concetti chiave');
    p('Prima di iniziare e utile chiarire alcuni termini ricorrenti utilizzati nella suite e nel report PDF.');
    li('PAC — versamento periodico mensile costante.');
    li('PIC — versamento una tantum di una somma definita in un anno specifico.');
    li('TER — costo annuo dell\'ETF/fondo (sottratto al rendimento lordo ogni anno).');
    li('IRR (rendimento del piano) — rendimento annuo money-weighted che considera importo e timing di ogni versamento. E il rendimento reale percepito dall\'investitore in un PAC.');
    li('TWR (rendimento asset) — rendimento annuo time-weighted del portafoglio, indipendente dai versamenti. Misura la performance pura dell\'allocazione, confrontabile tra strategie diverse.');
    li('SWR (Safe Withdrawal Rate) — quota di capitale prelevabile annualmente in fase di decumulo (regola del 4% di Bengen).');
    li('Volatilita (sigma) — ampiezza tipica delle oscillazioni annuali del portafoglio.');
    li('Crossover — anno in cui la rendita netta del portafoglio supera il PAC: il piano si autosostiene.');
    li('Optionality — soglia patrimoniale che ti da "opzioni di vita reali" (part-time, sabbatico, cambio carriera) prima del FIRE totale.');
    li('Regime amministrato — l\'intermediario calcola e versa le imposte automaticamente ad ogni operazione.');
    li('Regime dichiarativo — l\'investitore compensa plusvalenze e minusvalenze in dichiarazione dei redditi, con maggiore flessibilita.');
    li('Zainetto fiscale — minusvalenze degli ultimi 4 anni compensabili con future plusvalenze.');
    li('GARCH — modello stocastico con volatilita variabile nel tempo (volatility clustering).');
    li('Regime-Switching (Hamilton) — modello che alterna stati Bull/Bear con probabilita di transizione markoviana.');
    callout('Tutte le proiezioni sono ipotetiche. Servono a confrontare scenari e sensibilizzare ai rischi, non a predire il futuro.', AMBER, 'Ricorda');

    h1('2 — Scheda Simulatore (input principali)');
    p('E il cuore della suite. Qui imposti i parametri base; tutti gli altri tab ne ereditano i valori automaticamente (capitale, PAC, orizzonte, portafoglio).');
    h2('Patrimonio iniziale');
    p('Capitale gia investito al giorno 0. Piu alto e, piu la componente degli interessi composti domina rispetto ai versamenti PAC.');
    callout('Raddoppiare il capitale iniziale raddoppia il valore finale solo se l\'orizzonte e breve. Su 30+ anni l\'effetto del PAC tende a prevalere, specie con rendimenti elevati.', BLU, 'Impatto');
    h2('PAC mensile');
    p('Versamento ricorrente mensile. E la leva piu potente nei primi anni; perde peso relativo man mano che il capitale accumulato cresce. Ha anche un effetto di dollar-cost averaging: compra piu quote quando i prezzi scendono.');
    callout('+100 EUR/mese su 30 anni con rendimento 6% reale ~+100.000 EUR sul valore finale.', BLU, 'Impatto');
    h2('Eta iniziale e Orizzonte');
    p('Determinano la lunghezza del piano. L\'orizzonte e il fattore piu potente: il tempo e il vero amplificatore dell\'interesse composto. I 10 anni aggiuntivi non si sommano — si moltiplicano.');
    callout('Passare da 20 a 30 anni a parita di PAC puo piu che raddoppiare il capitale finale.', BLU, 'Impatto');
    h2('Portafoglio');
    p('Seleziona la composizione asset (azionario, bilanciato, obbligazionario, oro, Permanent Portfolio, Golden Butterfly, ecc.). Cambia automaticamente rendimento atteso, volatilita e beta-inflazione di tutti gli scenari.');
    p('Sono inclusi anche tre portafogli capital-efficient realizzabili con ETF UCITS: Efficient Core 90/60 USA e Globale — 90% azioni + 60% futures obbligazionari per un\'esposizione del 150% (leva 1,5x su un 60/40, con costo di finanziamento gia dedotto dal rendimento atteso) — e Return Stacking (efficient core globale + managed futures), che aggiunge una gamba trend-following decorrelata. Per questi, il backtest storico e disabilitato (leva e managed futures non hanno serie storica coerente): usali con Simulatore, Monte Carlo e Frontiera Efficiente.');
    callout('Un portafoglio 100% azioni ha rendimento atteso piu alto ma volatilita e perdite massime molto maggiori. Il 60/40 offre il miglior compromesso rischio/rendimento sulla maggioranza degli orizzonti storici. Gli Efficient Core 90/60 hanno lo stesso Sharpe del 60/40 sottostante (la leva alza rendimento e rischio in proporzione): il loro vantaggio e la capital efficiency, non un rapporto rischio/rendimento superiore.', BLU, 'Impatto');
    h2('TER, Tasse, Inflazione');
    p('Sono i tre "freni silenziosi" del rendimento composto. Piccole variazioni hanno effetti enormi su orizzonti lunghi.');
    li('TER 0,20% vs 0,50% -> su 30 anni la differenza puo valere il 7-9% del capitale finale.');
    li('Inflazione +1% -> erode il valore reale di circa il 22% in piu su 25 anni.');
    li('Aliquote fiscali -> applicate solo alla plusvalenza al disinvestimento. Vedi scheda Fiscalita IT per dettagli sui regimi.');
    h2('Toggle CAPE-adjusted returns');
    p('Il pulsante CAPE nell\'intestazione del Simulatore attiva la ricalibrazione dei rendimenti azionari sulla base del CAPE Shiller corrente (dati live aggiornati mensilmente).');
    li('Metodo Earnings Yield Delta: il rendimento reale atteso di un mercato e approssimato dal suo earnings yield (1/CAPE). La ricalibrazione applica lo SCOSTAMENTO dell\'earnings yield corrente rispetto alla media storica (CAPE di riferimento ~20) al rendimento storico: R_fwd = R_storico + (1/CAPE_oggi - 1/CAPE_medio).');
    li('Metodo trasparente e verificabile (coefficiente 1.0 sull\'earnings yield), preferito a una regressione opaca: il rendimento atteso di lungo periodo di un\'azione coincide col suo earnings yield.');
    li('Blend 55/45: forward live (55%) + baseline (45%) per ridurre la sensibilita al dato puntuale (shrinkage bayesiano).');
    li('Approccio a delta: lo scostamento di valutazione e applicato al baseline calibrato (non lo sostituisce), cosi il confronto storico-vs-CAPE isola il solo effetto delle valutazioni correnti.');
    li('Badge colorato: mostra il delta vs rendimento storico (es. -0.9%/a in rosso se CAPE elevato).');
    li('CAPE USA: dataset GitHub aggiornato mensilmente. CAPE Europa: stimato da P/E MSCI Europe con correzione ciclica (CAPE_EU = 0.68 x CAPE_USA + 3.8).');
    callout('Con CAPE USA ~34 (dato 2024-25), i rendimenti azionari attesi scendono di circa 0.9-1.2%/a vs baseline. Su 30 anni abbassa il valore atteso in modo apprezzabile in scenario base. Utile per pianificazione conservativa con valutazioni elevate.', BLU, 'Impatto CAPE elevato');
    h2('Soglia di Optionality');
    p('Linea tratteggiata orizzontale sul grafico. Imposta il valore patrimoniale a cui inizi ad avere "scelta" (es. 300k EUR = part-time; 600k EUR = 2 anni sabbatici). E distinta dal FIRE (liberta finanziaria totale).');

    h1('3 — Scheda Scenari Economici');
    p('Eredita capitale, PAC, orizzonte e portafoglio dal Simulatore. Mostra come regimi macro storici e plausibili impattano lo stesso piano con moltiplicatori calibrati sui dati storici reali per asset class.');
    h2('3.1 — Analisi scenario singolo');
    p('Seleziona uno dei 6 regimi macro per vedere la proiezione deterministica del tuo piano in quel contesto, con grafico, tabella anno per anno e confronto finale tra tutti gli scenari.');
    li('Crescita Normale — baseline storica, rendimenti medi di lungo periodo.');
    li('Stagflazione — crescita bassa + inflazione alta (anni \'70). Penalizza bond e azioni growth.');
    li('Recessione — drawdown azionario marcato, fuga verso bond governativi.');
    li('Deflazione — rendimenti azionari piatti, bond reggono, inflazione vicina a zero.');
    li('Bull Market — equity growth sovra-performa, oro e bond sotto-performano.');
    li('Rialzo Tassi — obbligazioni colpite, azioni value piu resistenti, cash rivalutato.');
    callout('Puoi scegliere in quale fase temporale (inizio, meta, fine) far cadere lo scenario. Un regime stagflazionario a inizio piano e molto meno devastante dello stesso regime a fine accumulazione.', BLU, 'Timing dello scenario');
    p('Cambia il portafoglio nel Simulatore e torna qui: vedrai immediatamente quanto la composizione protegge o espone il piano. Il Permanent Portfolio e il Golden Butterfly sono i piu resilienti in scenari estremi.');
    h2('3.2 — Simulazione Multi-Regime Stocastica');
    p('In un piano di 20-35 anni non vivi un solo regime economico, ma una sequenza di regimi consecutivi. Questa sezione simula 1.000 percorsi in cui i regimi si alternano lungo il piano, mostrando la distribuzione reale dei possibili esiti.');
    p('Risultati: bande P10/P25/P50/P75/P90 su grafico, heatmap del regime dominante anno per anno, probabilita di successo (percorsi che superano la soglia optionality), tabella percentili completa.');
    li('Modalita automatica — usa una matrice di transizione calibrata sui cicli economici USA/EU post-1945 (NBER, Reinhart & Rogoff). Scegli il regime di partenza: la simulazione determina stocasticamente se ogni anno il regime continua o cambia, con probabilita diverse per ogni coppia di regimi.');
    li('Modalita manuale avanzata — costruisci tu la sequenza di fasi (es. 10 anni crescita + 3 anni recessione + 17 anni crescita). Ogni fase ha durata modificabile. I rendimenti e l\'inflazione restano stocastici dentro ogni fase: ottieni 1.000 percorsi con la tua sequenza di macro-fasi.');
    callout('La differenza rispetto all\'analisi scenario singolo e cruciale: qui ogni percorso attraversa piu regimi consecutivi, esattamente come accade nella realta. Il P10 multi-regime e il worst-case piu realistico disponibile nella suite.', BLU, 'Perche usare il multi-regime');

    h1('4 — Scheda A/B Confronto');
    p('Confronta due piani fianco a fianco. Utile per quantificare il costo/beneficio di qualsiasi decisione di portafoglio.');
    li('Portafoglio A: piano corrente dal Simulatore (capitale, PAC, orizzonte, eta, tasse).');
    li('Portafoglio B: composizione asset, TER e PAC configurabili indipendentemente.');
    li('Il grafico sovrappone le traiettorie (best/normal/worst) di entrambi con delta anno per anno.');
    li('La sezione Analisi Fiscale Comparata mostra l\'impatto netto delle tasse su entrambe le strategie.');
    callout('"Conviene investire 5.000 EUR ora in PIC o spalmarli su 24 mesi di PAC aggiuntivo?" — oppure "Quanto mi costa il fondo attivo (TER 1,5%) vs un ETF (TER 0,20%) su 25 anni?"', BLU, 'Esempi d\'uso');

        h1('5 — Scheda Probabilita di Successo (Monte Carlo parametrico)');
    p('Esegue 1.000 simulazioni Monte Carlo con rendimento atteso e volatilita del portafoglio selezionato (coerenti con gli scenari Base / Ottimistico / Pessimistico). Per analisi non-gaussiana con code grasse o regime-switching usa la scheda Monte Carlo Avanzato.');
    li('P10 = 90% degli scenari fa meglio (peggior 10%). Usalo come soglia di sicurezza.');
    li('P25 = scenario conservativo consigliato per la pianificazione.');
    li('P50 = mediana. Non usarlo come unico riferimento: preferisci il P25.');
    li('P75/P90 = esiti ottimistici, rispettivamente il 25% e il 10% fa meglio.');
    li('Probabilita di successo = % di simulazioni in cui il portafoglio non si azzera durante il prelievo. Target: >90%.');
    callout('Per simulazioni con code piu pesanti (crash piu frequenti e prolungati) usa il tab Monte Carlo Avanzato — Regime-Switching e t-Student modellano distribuzioni fat-tail senza dipendere da dati storici non verificabili.', BLU, 'Modelli avanzati disponibili');
    callout('Pianifica sul P25, usa il P10 come margine di sicurezza e non innamorarti del P50. I piani robusti tengono anche negli scenari avversi.', AMBER, 'Consiglio');

    h1('6 — Scheda Decumulo');
    p('Simula la fase di prelievo post-accumulo: come il capitale verra eroso o conservato nel tempo. Tre strategie:');
    li('Fisso Nominale — prelievo costante in cifra assoluta. Semplice ma non protegge dall\'inflazione.');
    li('Indicizzato Inflazione (4% rule) — prelievo rivalutato ogni anno all\'inflazione. Il metodo classico di Bengen (1994).');
    li('Guyton-Klinger (Guard-rails) — prelievo dinamico: aumenta se il mercato va bene, si riduce in drawdown. Massimizza il prelievo medio mantenendo il capitale piu a lungo.');
    h2('Rischio di sequenza in decumulo');
    p('Il toggle "Rischio di Sequenza" inietta un crollo di mercato durante la fase di prelievo. È il rischio piu pericoloso in pensione, e diverso dall\'accumulo: un crash nei PRIMI anni di prelievo costringe a vendere quote in perdita proprio mentre il capitale dovrebbe durare, e puo esaurirlo in modo irreversibile anche se i rendimenti medi di lungo periodo restano buoni. Stesso crash, esito opposto a seconda del timing.');
    li('Severità (lieve −20% / moderato −35% / severo −50%) e timing (inizio / metà / fine): un crash a inizio decumulo è molto piu dannoso di uno alla fine.');
    li('Modalità 1/2/3 crash: i crash successivi al primo hanno severità ridotta (i mercati gia depressi rimbalzano prima).');
    li('Il comportamento per categoria di asset segue il modello di crash beta del Simulatore: commodities e carry partecipano al crollo, il trend following attenua (crisis alpha), bond/oro/liquidita fanno da rifugio.');
    li('Dialogo con le strategie: il prelievo Fisso e l\'Indicizzato subiscono passivamente (l\'Indicizzato è il piu vulnerabile, perche aumenta i prelievi proprio nel momento peggiore); Guyton-Klinger reagisce tagliando i prelievi e protegge il capitale — è il suo scopo.');
    li('Sovrapponibile allo scenario economico: puoi combinare un crash di sequenza con un regime macro (es. stagflazione). Un avviso segnala che si tratta di uno stress combinato volutamente severo. Negli anni del crash, il crollo prevale; negli altri resta attivo il regime.');
    callout('Abbassare il tasso di prelievo dal 4% al 3,5% puo ridurre drasticamente la probabilita di esaurire il capitale su 30 anni. Usa il pulsante "Importa dal Simulatore" per collegare le due fasi. Attiva il Rischio di Sequenza per verificare se il piano regge a un crollo nei primi anni di pensione.', BLU, 'Come modifiche incidono');

    h1('7 — Scheda Backtest Storico (1970-2024)');
    p('Il tab Backtest Storico applica il piano configurato nel Simulatore (portafoglio, PAC, orizzonte, TER) ai dati mensili reali 1970-2024, partendo da 10 periodi storici chiave. Risponde alla domanda: come si sarebbe comportato questo esatto piano nel passato reale?');
    h2('10 periodi storici preconfigurati');
    li('1973 — Stagflazione OPEC: embargo petrolifero, inflazione 12%, azioni -48% in 2 anni. Il peggior inizio storico per un PAC.');
    li('1980 — Volcker shock: tassi al 20%, azioni -28%, obbligazioni devastate. Poi il piu lungo bull market della storia (1982-2000).');
    li('1987 — Black Monday: -22% in UN giorno. Recovery completa entro 2 anni — crash violento ma brevissimo.');
    li('1995 — Lancio dot-com: boom straordinario 1995-1999, poi crollo 2000-2002. Analisi dell\'euforia e del suo aftermath.');
    li('2000 — Burst dot-com: azioni -49% in 3 anni, NASDAQ -78%. Chi ha iniziato qui ha visto il capitale dimezzarsi.');
    li('2004 — Pre-crisi: bull market 2004-2007 poi il peggior crash dal 1929 nel 2008.');
    li('2008 — Crisi finanziaria globale: S&P500 -57%, MSCI World -54%. Le correlazioni tra asset implosero.');
    li('2012 — Crisi euro sovrana: spread BTP-Bund a 500bp, poi \"whatever it takes\" di Draghi segna il bottom.');
    li('2019 — Pre-COVID: crash COVID -34% in 33 giorni, recovery completata in 6 mesi — il piu veloce crash e rimbalzo della storia.');
    li('2022 — Inflazione & rialzo tassi: azioni -20% E obbligazioni -15% insieme. Il 60/40 perde -17%: peggior anno per portafogli bilanciati dal 1937.');
    h2('Metodologia e dati');
    li('Dati mensili: HIST_MONTHLY con rendimenti per asset class equity, bond, gold ancorati anno per anno alle serie ufficiali in EUR (MSCI World Net EUR, Bloomberg Euro Aggregate, oro LBMA in EUR).');
    li('CAPE-adjusted equity: i rendimenti azionari sono aggiustati per il CAPE Shiller dell\'anno di partenza tramite Earnings Yield Delta (1/CAPE). CAPE alto = rendimenti attesi piu bassi, e viceversa.');
    li('Correlazioni dinamiche: in anni con drawdown equity > 15%, le correlazioni si avvicinano alla matrice STRESS (correlazioni osservate empiricamente in crisi). Cattura il \"correlation breakdown\" dei crash.');
    li('Inflazione storica: CPI annuale reale per ogni periodo, usato per deflatare e mostrare rendimento reale.');
    h2('Output del tab');
    p('Per ogni periodo selezionato: grafico di traiettoria del portafoglio anno per anno (nominale e reale), rendimento annuo del piano (IRR money-weighted, considera il timing dei versamenti PAC) e rendimento annuo asset (TWR time-weighted, indipendente dai versamenti), CAPE iniziale con percentile storico, multiplo sul capitale investito, drawdown massimo.');
    p('Tabella comparativa su tutti e 10 i periodi: permette di vedere a colpo d\'occhio quale portafoglio avrebbe retto meglio in ogni regime storico. Cambia portafoglio nel Simulatore e ri-esegui per confrontare allocazioni.');
    callout('Il backtest non prevede il futuro — i periodi storici non si ripetono identici. Il suo valore e mostrare la distribuzione degli esiti reali e aiutare a capire la propria tolleranza alle perdite temporanee. Un piano che non avrebbe retto nel 1973 merita una revisione.', AMBER, 'Come interpretare i risultati');
    callout('Golden Butterfly e Permanent Portfolio sono i portafogli piu robusti nei periodi di stagflazione (1973) e crisi bancarie (2008). Il 100% Azioni massimizza il rendimento su orizzonti lunghi ma richiede di restare investiti durante drawdown del 40-60%. Il backtest storico non e disponibile per Efficient Core (leva) e Return Stacking (managed futures): usa Simulatore, Monte Carlo o Frontiera Efficiente.', BLU, 'Insight storico');

    h1('7a — Rischio di Sequenza (Sequence of Returns Risk)');
    p('Sezione del tab Backtesting che risponde a una domanda diversa dal backtest classico: non "cosa sarebbe successo partendo in un certo anno", ma "la stessa crisi quanto fa male a seconda di QUANDO mi colpisce nel piano?". È uno dei rischi piu sottovalutati: due investitori con lo stesso portafoglio e lo stesso rendimento medio possono avere esiti molto diversi solo per l\'ordine in cui arrivano i rendimenti.');
    h2('Le tre fasi del piano');
    li('Crisi a INIZIO piano — poco capitale accumulato: la crisi colpisce un patrimonio ancora piccolo. La perdita in euro è contenuta e restano molti anni per recuperare comprando a sconto.');
    li('Crisi a META piano — capitale intermedio gia formato. La stessa caduta percentuale pesa di piu in valore assoluto.');
    li('Crisi a FINE piano — grande capitale accumulato e pochi anni per recuperare: è lo scenario piu pericoloso. La stessa identica crisi puo produrre una perdita in euro molte volte superiore a quella di inizio piano.');
    h2('Le tre modalita di versamento');
    li('Capitale + PAC — capitale iniziale piu versamenti periodici (lo scenario tipico di un piano di accumulo).');
    li('Solo capitale (lump sum) — un unico investimento iniziale, senza versamenti successivi.');
    li('Solo PAC — nessun capitale iniziale, solo versamenti periodici (chi parte da zero).');
    p('Tutti i valori (capitale, PAC) sono quelli impostati nel Simulatore o nella sezione Portafoglio del Backtesting. Le 10 crisi storiche disponibili sono le stesse del backtest. Il capitale esposto al crollo cresce con la fase del piano perche tiene conto sia dei versamenti accumulati sia della crescita composta del capitale gia investito.');
    callout('Il punto chiave: per la stessa crisi, la caduta percentuale (Max Drawdown) è simile in tutte le fasi — è sempre lo stesso evento storico. Ciò che cambia drasticamente è la PERDITA IN EURO, perché il capitale esposto è molto diverso. Una crisi a fine piano può cancellare anni di capitale accumulato.', AMBER, 'Come leggere le tre card');
    callout('Questo è il motivo per cui i piani previdenziali riducono gradualmente la quota azionaria avvicinandosi all\'obiettivo (glide path): non per inseguire un rendimento maggiore, ma per ridurre il capitale esposto proprio quando una crisi farebbe piu danni e resterebbe meno tempo per recuperare.', BLU, 'Implicazione pratica');
    h2('Come reagiscono le diverse asset class nel crash');
    p('Il crollo non colpisce tutti gli asset allo stesso modo. Il modello applica a ciascuna categoria un "beta di crash" calibrato sull\'evidenza storica, cosi la simulazione riflette il comportamento reale in crisi e non tratta erroneamente ogni asset non-azionario come un rifugio:');
    li('Azioni: subiscono il crollo pieno (beta 1.0), con recupero parziale nei 5 anni successivi.');
    li('Obbligazioni governative, oro, liquidita: fungono da rifugio (flight to quality), con un lieve rally difensivo durante il crash azionario.');
    li('Trend following / Managed futures: "crisis alpha" — tendono a guadagnare nelle crisi prolungate (2008, 2022) seguendo i trend ribassisti (beta -0.20). Sono veri diversificatori.');
    li('Commodities: NON sono un rifugio. Nei crash di liquidita (2008, marzo 2020) calano insieme alle azioni per de-leveraging e calo della domanda, anche se meno in profondita (beta 0.35).');
    li('Carry (FX e obbligazionario): soffrono nelle crisi ("raccogliere monetine davanti a uno schiacciasassi") — downside reale, inferiore all\'azionario puro ma significativo (beta 0.45).');
    callout('Questa modellazione differenziata e importante per valutare correttamente portafogli che includono managed futures, commodities o carry: il loro contributo alla resilienza in crisi e molto diverso. I beta sono stime prudenti basate sull\'evidenza storica, non garanzie.', BLU, 'Beta di crash per categoria');

    h1('7b — Stress Test Macro Storici — Path Mensile Esatto');
    p('Sezione aggiuntiva del tab Backtesting: simulazione del percorso mensile preciso del portafoglio durante le 10 principali crisi macro della storia moderna (1970-2024), con i rendimenti mensili reali (ogni mese è il dato storico effettivo). Come nel Rischio di Sequenza, puoi scegliere la modalita di versamento (capitale + PAC, solo capitale, solo PAC) e la fase del piano in cui arriva la crisi (inizio, meta, fine): cosi il capitale esposto al crollo riflette quello realmente accumulato a quel punto del piano.');
    h2('Le 10 crisi simulate con dati mensili reali');
    li('1973-74 Stagflazione OPEC — Embargo petrolifero OPEC ottobre 1973. Inflazione USA al 12%, azioni mondiali -48% in 23 mesi. Il peggior drawdown del dopoguerra per i portafogli bilanciati. Finestra 36 mesi. L\'oro sale +162% — unico asset con rendimento reale positivo.');
    li('1980-82 Volcker Shock — Paul Volcker porta i tassi Fed al 20% per spezzare l\'inflazione a doppia cifra. Doppia recessione, azioni -27%, obbligazioni a lunga scadenza devastate. Premessa del piu lungo bull market della storia.');
    li('1990 Recessione del Golfo — L\'invasione del Kuwait (agosto 1990) raddoppia il prezzo del petrolio. Recessione USA, azioni -20%. Crisi breve: recupero entro il 1991.');
    li('1998 Crisi LTCM / Russia — Default russo e collasso dell\'hedge fund LTCM. Azioni -19% in poche settimane, recupero rapido dopo l\'intervento della Fed.');
    li('2011-12 Crisi Euro Sovrana — Spread BTP-Bund oltre 500bp, timori sulla tenuta dell\'euro. Azioni europee -24%. Svolta col "whatever it takes" di Draghi. Rilevante per investitori italiani.');
    li('1987 Black Monday — 19 ottobre 1987: azioni -22.6% in un singolo giorno. Crash istantaneo da portfolio insurance (feedback loop di vendite automatizzate). Recovery completa in 22 mesi. Le obbligazioni tengono grazie al flight to quality immediato.');
    li('2000-02 Bolla Dot-com — CAPE S&P500 a 44 nel gennaio 2000. Azioni mondiali -49% in 33 mesi, NASDAQ -78%. Crisi lenta e prolungata: recovery azionaria oltre 5 anni. Le obbligazioni performano positivamente per tutto il periodo (flight to quality + tassi Fed in discesa da 6.5% a 1%).');
    li('2008-09 Crisi Finanziaria Globale — Lehman Brothers (settembre 2008). S&P500 -57%, MSCI World -54%. Unica crisi in cui le correlazioni tra asset esplodono verso 1: azioni, corporate bond e immobiliare crollano insieme. Solo Treasury USA e oro tengono. Recovery in 54 mesi.');
    li('2020 COVID-19 — Crash piu veloce della storia: -34% in 33 giorni (febbraio-marzo 2020). Recovery altrettanto rapida: meno di 6 mesi. Fed interviene con QE illimitato. Obbligazioni governative e oro positivi per tutto il 2020.');
    li('2022 Inflazione & Tassi — Crisi unica: azioni -20% E obbligazioni -15% simultaneamente. Il 60/40 perde -17%, peggior anno dal 1937. Fed alza i tassi da 0.25% a 4.5% in 12 mesi. Solo cash e obbligazioni a brevissima duration tengono. L\'oro risulta quasi flat (-2%).');
    h2('Dati e metodologia');
    li('Fonte dati: HIST_MONTHLY — rendimenti mensili di azioni sviluppate, obbligazioni e oro dal 1970 al 2024, ancorati alle serie ufficiali in EUR (MSCI World Net EUR, Bloomberg Euro Aggregate, oro LBMA). 660 osservazioni mensili; totali annuali fedeli alle fonti, granularita mensile ricostruita.');
    li('Pesi portafoglio: quelli attuali del simulatore, aggiornati in tempo reale al cambio selezione. TER applicato mensilmente. Capitale, PAC e fase del piano sono quelli impostati: la fase scala il capitale esposto, coerente con la sezione Rischio di Sequenza.');
    li('Finestra: include alcuni mesi pre-crisi per contesto. Il drawdown e calcolato rispetto al picco della finestra mostrata.');
    li('Recovery: numero di mesi dal bottom per tornare al livello di inizio finestra (non al picco assoluto pre-crisi).');
    h2('Output per ogni crisi');
    li('Grafico path mensile normalizzato (base 100 = inizio finestra): mostra il percorso esatto del portafoglio, con evidenza del bottom.');
    li('Grafico drawdown mensile dal picco: barre rosse per drawdown >25%, arancioni per >10%.');
    li('10 mesi peggiori con rendimento portafoglio, breakdown per asset class (azioni/obbligazioni/oro) e drawdown cumulato.');
    li('KPI: Max Drawdown, perdita massima in euro, mese peggiore, recovery stimato, inflazione e tassi del periodo, rendimento S&P500 storico.');
    h2('Confronto tutte le crisi');
    p('Il pulsante "Confronta tutte le crisi" esegue la simulazione per tutte e 10 le crisi contemporaneamente e produce: tabella comparativa (max drawdown, perdita in euro, mese peggiore, recovery) e grafico a linee sovrapposte con tutte le traiettorie sulla stessa scala temporale relativa (M+0, M+1...). Permette di vedere a colpo d\'occhio quali crisi sarebbero state piu devastanti per questo specifico portafoglio.');
    callout('Nota importante: il confronto usa la stessa finestra temporale relativa (mese 0 = inizio crisi) per tutte le 10 crisi. Le finestre hanno lunghezze diverse (18-48 mesi) in base alla durata storica di ogni evento. La linea tratteggiata a 100 e il riferimento di pareggio.', AMBER, 'Come leggere il confronto');
    callout('Il portafoglio Permanent (25/25/25/25) e il Golden Butterfly hanno storicamente il drawdown piu contenuto in tutte e 10 le crisi. Il 100% Azioni ha il drawdown piu elevato ma anche la recovery piu rapida nelle crisi a V (1987, 2020). Il 2022 e l\'unica crisi in cui le obbligazioni non proteggono — solo il cash e le obbligazioni a brevissima duration reggono.', BLU, 'Insight per allocazione');

    h1('8 — Scheda Monte Carlo Avanzato');
    p('Tre modelli stocastici avanzati rispetto alla gaussiana standard. Permettono di simulare distribuzioni di rendimento piu realistiche con crash piu frequenti e volatilita variabile nel tempo.');
    li('Gaussiano (standard) — shock i.i.d. normali. Semplice ma sottostima i crash estremi.');
    li('t di Student (nu=4, fat tail) — code grasse: crash del -20/-40% accadono 3-5x piu spesso. Raccomandato per pianificazione conservativa.');
    li('GARCH(1,1) — volatilita che si autoalimenta: periodi turbolenti tendono a persistere. Parametri calibrati su equity globale.');
    li('Regime-Switching (Hamilton 1989) — alternanza Bull/Bear con matrice di transizione markoviana. I crash prolungati emergono naturalmente.');
    callout('Confronta il P10 Gaussiano con quello del modello t-Student: la differenza quantifica la sensibilita del piano agli eventi-coda. Nu piu basso = code piu pesanti. Nu=4 calibrato su equity globale; nu=2-3 per pianificazione ultra-conservativa.', BLU, 'Come leggere i risultati');

    h1('9 — Scheda Fiscalita IT');
    p('Analisi completa della fiscalita italiana sugli investimenti finanziari. Calcola l\'impatto reale delle tasse e confronta i diversi regimi e metodi di calcolo delle plusvalenze.');
    h2('Confronto regimi fiscali');
    li('Amministrato + Costo Medio — il piu diffuso; tasse automatiche ma limitata compensazione minusvalenze.');
    li('Dichiarativo + LIFO — vende prima le quote piu recenti; puo ridurre le tasse a breve.');
    li('Dichiarativo + FIFO — vende prima le quote piu vecchie; piu semplice da gestire.');
    li('Dichiarativo + Costo Medio — media ponderata del prezzo di carico; bilanciato.');
    h2('Imposta di bollo');
    p('Pari allo 0,20% annuo sul valore del dossier titoli. A 30 anni puo erodere il 4-6% del capitale complessivo.');
    h2('Tassazione differenziata per tipo di asset');
    p('In tutti i portafogli (preset e Custom) l\'aliquota sul capital gain dipende dalla natura dello strumento: le obbligazioni governative (e titoli di Stato di paesi white list) scontano il 12,5%, mentre azioni, ETF, oro (ETC), liquidita, trend following / managed futures, carry, commodities e fattori scontano il 26% (redditi diversi). L\'aliquota complessiva del portafoglio e la media pesata sui pesi degli asset.');
    callout('Un portafoglio con managed futures, commodities o carry ha un\'aliquota effettiva piu alta di un classico azioni-obbligazioni governative, perche questi strumenti sono tassati al 26% e non al 12,5%. Il simulatore ne tiene conto nel calcolo del rendimento netto.', BLU, 'Aliquota effettiva');
    h2('Zainetto fiscale');
    p('Inserisci le minusvalenze pregresse (scadono dopo 4 anni) per stimare il risparmio fiscale residuo. In regime dichiarativo si compensano tutte le plusvalenze; in amministrato solo i redditi diversi (non ETF armonizzati).');
    callout('La fiscalita sugli strumenti finanziari italiani e complessa. Le simulazioni hanno scopo illustrativo. Per decisioni fiscali concrete consulta un commercialista o consulente fiscale abilitato.', AMBER, 'Nota legale');

    h1('9a — Scheda Pensione (previdenza)');
    p('Stima la pensione pubblica INPS e il ruolo della previdenza complementare (fondo pensione), per capire il "gap previdenziale" tra la pensione attesa e il tenore di vita desiderato, e quanto la previdenza integrativa puo colmarlo.');
    h2('Input principali');
    li('Eta attuale, eta di pensionamento, speranza di vita: definiscono gli anni di contribuzione residui e la durata della fase di pensione.');
    li('RAL (retribuzione annua lorda) e sua crescita reale attesa: base per i contributi e per il calcolo del montante.');
    li('Anni di contributi gia versati e montante contributivo gia accumulato: il punto di partenza.');
    li('Aliquota contributiva IVS (33% per dipendenti privati): la quota di RAL che alimenta il montante INPS.');
    li('Spesa mensile desiderata in pensione (in euro di oggi): l\'obiettivo rispetto a cui misurare il gap.');
    li('Fondo pensione: versamento mensile, rendimento atteso, eventuale conferimento del TFR, e — se negoziale — contributo datoriale e quota contrattuale del lavoratore.');
    h2('Come calcola la pensione pubblica (metodo contributivo)');
    p('Nel sistema contributivo la pensione lorda annua = montante contributivo accumulato x coefficiente di trasformazione (legato all\'eta di pensionamento). Il montante cresce ogni anno per i nuovi contributi (aliquota IVS x RAL) e per la rivalutazione (media quinquennale del PIL nominale). Il modello usa i coefficienti di trasformazione ufficiali (range eta 57-71) e applica un declino annuo configurabile per tener conto delle revisioni biennali ISTAT (la speranza di vita che cresce abbassa progressivamente i coefficienti).');
    li('Contributivo puro: per chi ha iniziato a lavorare dopo il 1995. Tutto a montante x coefficiente.');
    li('Misto: per chi aveva gia anni di contributi nel 1995. Somma una quota retributiva (ante-1996) e una contributiva (post-1996).');
    li('Retributivo: caso residuale per anzianita elevate ante-1996.');
    h2('Tasso di sostituzione e gap previdenziale');
    p('Il tasso di sostituzione e il rapporto tra la prima pensione e l\'ultima retribuzione: indica quanto del reddito da lavoro viene "sostituito" dalla pensione pubblica. In Italia, per i piu giovani nel sistema contributivo, tende a scendere sotto il 60-70%, lasciando un gap rispetto al tenore di vita pre-pensione. La scheda evidenzia questo gap e quanto il fondo pensione puo colmarlo.');
    h2('Previdenza complementare e vantaggio fiscale');
    p('I versamenti al fondo pensione sono deducibili dal reddito IRPEF fino a 5.164,57 euro l\'anno: la deduzione genera un risparmio fiscale pari all\'aliquota marginale IRPEF dell\'aderente. La scheda calcola questo risparmio e permette di scegliere come destinarlo: spenderlo, reinvestirlo nel fondo pensione stesso, o reinvestirlo nel portafoglio ETF del Simulatore. Reinvestire il risparmio fiscale e una delle leve piu potenti della previdenza integrativa.');
    li('TFR al fondo: conferire il TFR (circa RAL/13,5 l\'anno) al fondo pensione invece di lasciarlo in azienda. La scheda confronta le due opzioni.');
    li('Fondo negoziale: se previsto dal contratto, il datore di lavoro aggiunge un contributo (es. 1,5% della RAL) a condizione che il lavoratore versi la sua quota. E denaro aggiuntivo: la scheda lo include nel montante del fondo.');
    li('Tassazione agevolata della rendita: i rendimenti del fondo pensione scontano un\'imposta sostitutiva ridotta e la prestazione finale ha aliquote agevolate (dal 15% che scende fino al 9% con l\'anzianita di partecipazione), contro il 26% degli investimenti ordinari.');
    h2('Importa dal Simulatore');
    p('Il pulsante di importazione recupera dal Simulatore il capitale ETF stimato al pensionamento e il rendimento netto del portafoglio scelto, cosi la proiezione previdenziale e coerente con il piano di accumulo impostato nelle altre schede.');
    callout('I calcoli previdenziali sono stime basate sulla normativa vigente e su ipotesi (crescita RAL, rivalutazione montante, rendimenti, evoluzione dei coefficienti). La normativa previdenziale cambia nel tempo e i coefficienti vengono rivisti periodicamente. Le stime hanno scopo illustrativo e non sostituiscono una consulenza previdenziale qualificata (patronato, consulente previdenziale) ne le proiezioni ufficiali INPS ("La mia pensione futura").', AMBER, 'Nota importante');

    h1('10 — Sequence Risk, PIC e spese straordinarie');
    h2('Sequence Risk');
    p('Attivalo per sovrapporre un crash di mercato in un anno specifico (early/mid/late) con severita configurabile (lieve -20%, moderato -35%, severo -50%).');
    callout('Un crash early (-40%) puo ridurre il valore finale del 15-25% anche se i rendimenti medi di lungo periodo sono identici. Un crash early e meno devastante grazie al PAC che compra a sconto; un crash late e il piu pericoloso perche il capitale e al massimo e manca tempo per il recupero.', BLU, 'Impatto per timing');
    h2('PIC straordinari');
    p('Aggiungi versamenti una tantum (eredita, bonus, liquidazione, vendita immobile) in anni specifici. Vengono integrati nel calcolo compound degli anni successivi.');
    h2('Uscite straordinarie');
    p('Modella spese future gia previste (acquisto casa, universita figli, auto, ristrutturazione). Riducono il capitale in quell\'anno e tutto il successivo effetto compound — l\'impatto e sempre maggiore di quanto sembri.');
    h2('Variazioni del PAC');
    p('Modella aumenti progressivi (avanzamenti di carriera), riduzioni temporanee (anno sabbatico) o sospensioni complete. Il riepilogo cronologico mostra il PAC effettivo anno per anno.');

    h1('11 — Come leggere il Report PDF');
    p('Il pulsante "Scarica Report PDF" nella scheda Simulatore genera un documento di 10-14 pagine con:');
    li('Copertina e sintesi esecutiva — numeri chiave, CAGR, multiplo sul capitale investito.');
    li('Configurazione completa — tutti i parametri, variazioni PAC, PIC e uscite.');
    li('Grafico fan chart — traiettoria multi-scenario con banda di volatilita e soglia di optionality.');
    li('Tabella anno per anno — evoluzione patrimoniale campionata con tutti gli eventi.');
    li('Distribuzione Monte Carlo — percentili P10-P90 e interpretazione statistica.');
    li('Scenari economici — confronto regimi macro e tabella comparativa.');
    li('Modulo inflazione — erosione del potere d\'acquisto e SWR reale nei vari scenari inflattivi.');
    li('Sequence Risk, fiscalita, glossario, note legali finali.');

    h1('12 — Errori comuni e consigli pratici');
    li('Usare solo lo scenario base: guarda sempre la fan chart e il P10/P25. Il P50 e spesso troppo ottimista.');
    li('Sottostimare l\'inflazione: in Italia la media storica e ~2-3%, ma fasi al 5-7% non sono rare. Testa il piano anche con inflazione al 4%.');
    li('Ignorare il TER: un fondo attivo all\'1,5% vs ETF allo 0,20% puo costare 50.000-100.000 EUR su 30 anni a parita di rendimento lordo.');
    li('Pianificare senza Sequence Risk: testa sempre almeno uno scenario con crash early severo. Se il piano regge, e robusto.');
    li('Fissare l\'orizzonte troppo corto: l\'azionario ha senso solo su 10+ anni. Sotto i 5 anni considera portafogli prevalentemente obbligazionari.');
    li('Ignorare le tasse nel confronto: usa la scheda Fiscalita IT per capire il netto reale. La differenza tra regime amministrato e dichiarativo puo valere migliaia di euro.');
    li('Non aggiornare il piano: rivisita i parametri ogni anno o dopo eventi importanti (cambio lavoro, acquisto casa, variazione del mercato).');
    callout('Nessun simulatore puo sostituire una consulenza personalizzata. Per decisioni patrimoniali importanti rivolgiti a un consulente finanziario indipendente abilitato (in Italia: iscritto all\'albo OCF — organismoconsulenti.org).', [217,48,37], 'Avvertenza finale');

    // ─────────── 13. SCENARI SALVATI ───────────
    chk(16); h1('13 — Scenari Salvati');
    p('Il pannello Scenari Salvati in cima al tab Simulatore permette di conservare configurazioni complete con nome personalizzato. Tutto viene salvato nel browser (localStorage) — nessun dato viene inviato a server esterni.');
    h2('Funzioni disponibili');
    li('Salva corrente: inserisci un nome e salva l\'intero stato della suite (portafoglio, PAC, variazioni, entrate/uscite straordinarie, sequence risk, A/B Confronto, parametri decumulo).');
    li('Carica: ripristina tutti i parametri e ricalcola immediatamente.');
    li('Aggiorna: sovrascrive lo scenario esistente con lo stato corrente, mantenendo il nome.');
    li('Elimina: cancella lo scenario dopo conferma esplicita.');
    li('Esporta JSON: scarica tutti gli scenari come file di backup condivisibile.');
    li('Importa JSON: ripristina scenari da file esportato in precedenza. Limite: 20 scenari.');
    callout('Consiglio: crea almeno 3 scenari standard — conservativo, base e ottimistico. Confrontali rapidamente senza dover reimpostare ogni volta tutti i parametri.', BLU, 'Best practice');

    // ─────────── 14. OBIETTIVO INVERSO ───────────
    chk(16); h1('14 — Obiettivo Inverso');
    p('Il tab Obiettivo Inverso risponde alla domanda inversa rispetto al Simulatore: dato il risultato desiderato, calcola i parametri necessari per raggiungerlo.');
    h2('Tre modalita di calcolo');
    li('PAC necessario: dato obiettivo patrimoniale + anni → versamento mensile richiesto nei 3 scenari.');
    li('Anni necessari: dato obiettivo + PAC mensile → tempo necessario per raggiungere il target nei 3 scenari.');
    li('Capitale raggiungibile: dato PAC + anni → montante accumulabile nei 3 scenari.');
    h2('Come usare i risultati');
    p('Se il PAC necessario nello scenario pessimistico supera quello disponibile, le leve sono: (1) aumentare il PAC, (2) estendere l\'orizzonte, (3) ridurre l\'obiettivo. Il pulsante "Importa dal Simulatore" copia automaticamente portafoglio, TER, capitale iniziale e PAC dai parametri gia impostati nel Simulatore.');
    callout('I calcoli usano rendimenti storici costanti senza inflazione, variazioni di rendimento nel tempo o imposte intermedie. Per un\'analisi completa usa sempre il tab Simulatore con Monte Carlo e sequence risk.', AMBER, 'Nota metodologica');

    // ─────────── 15. AVVISI CONTESTUALI ───────────
    chk(16); h1('15 — Avvisi Contestuali');
    p('La suite mostra automaticamente avvisi colorati sopra le metriche del Simulatore quando rileva configurazioni potenzialmente problematiche. Si aggiornano in tempo reale.');
    h2('Tipi di avviso');
    li('ROSSO — Portafoglio aggressivo su orizzonte breve: azionario >= 80% con orizzonte <= 5 anni.');
    li('ARANCIO — SWR insufficiente: il montante atteso con SWR 4% genera meno del PAC annuo corrente.');
    li('ARANCIO — TER elevato: costo >= 1,0%/a con nota sull\'erosione composta sull\'orizzonte selezionato.');
    li('ARANCIO — Rendimento reale negativo: rendimento netto inferiore all\'inflazione attesa nello scenario base.');
    li('ARANCIO — Eta avanzata con allocazione aggressiva: eta >= 55 con azionario >= 80%.');
    li('BLU — Nessun versamento: PAC e patrimonio iniziale entrambi molto bassi su orizzonte lungo.');
    li('BLU — PAC dominante: versamenti annui > 50% del patrimonio iniziale su orizzonte <= 3 anni.');
    callout('Gli avvisi sono indicazioni quantitative, non divieti. Una configurazione "avvisata" puo essere appropriata nel contesto specifico dell\'utente. Usali come spunto di riflessione critica.', BLU, 'Interpretazione');

    // ─────────── 16. QUANT ANALYTICS ───────────
    chk(20); h1('16 — Quant Analytics');
    p('Il tab Quant Analytics raccoglie quattro strumenti di analisi quantitativa professionale. Tutti si sincronizzano con il portafoglio del Simulatore tramite "Importa dal Simulatore".');

    h2('Frontiera Efficiente di Markowitz');
    p('Seleziona 2-8 asset class. Il sistema calcola la frontiera efficiente: la curva dei portafogli ottimali che massimizzano il rendimento per ogni livello di rischio. Il grafico mostra:');
    li('Curva blu: frontiera efficiente, colorata per Sharpe ratio (blu scuro = Sharpe alto).');
    li('Stella arancio: portafoglio Max Sharpe — massimo rendimento per unita di rischio (RF=2.5%).');
    li('Triangolo verde: portafoglio Minima Varianza — volatilita piu bassa possibile.');
    li('Triangolo rosso: il tuo portafoglio. Se e sotto la curva, esiste un\'allocazione piu efficiente.');
    p('Matrice di correlazione calibrata su dati storici 1970-2024 (30x30 asset class, con correlazioni base categoria-categoria che coprono tutte le coppie). Rendimenti attesi selezionabili tra forward-looking (CAPE-adjusted, conservativi) e storici (CAGR 1970-2024). Usare come guida qualitativa — non come prescrizione assoluta (instabilita di Markowitz).');

    h2('VaR / CVaR — Misure di Rischio Professionali');
    p('Calcola VaR e CVaR su 4 orizzonti (1, 3, 5, 10 anni) con tre metodi in parallelo:');
    li('Parametrico Gaussiano: formula analitica log-normale. Sottostima le code grasse — ottimistico in scenari estremi.');
    li('t-Student (fat tails): code piu spesse della normale. Gradi di liberta calibrati sulla volatilita del portafoglio.');
    li('Monte Carlo (10.000 simulazioni): metodo non parametrico. Cattura asimmetria e code senza assumere una distribuzione.');
    p('Tabella con VaR 95%/99%/99.9% e CVaR 95%/99%/99.9% in euro e percentuale per tutti e tre i metodi. Il CVaR (Expected Shortfall) e la misura preferita da Basilea III e Solvency II perche e coerente (Artzner et al., 1999).');

    h2('Factor Decomposition — Fama-French 5 fattori + Momentum');
    p('Scompone il rendimento atteso del portafoglio in contributi fattoriali secondo il modello a 6 fattori:');
    li('MKT (Market beta): esposizione al mercato azionario. Premio stimato ~5.0%/a forward-looking.');
    li('SMB (Size — Small Minus Big): tilt small cap. Premio ~1.8%/a (compresso dal 4.2% storico).');
    li('HML (Value — High Minus Low): tilt value. Premio ~2.2%/a — recupero forte dal 2021.');
    li('RMW (Profitability — Robust Minus Weak): tilt alta redditivita. Premio ~2.3%/a, comportamento difensivo.');
    li('CMA (Investment — Conservative Minus Aggressive): tilt basso investimento. Premio ~1.6%/a.');
    li('WML (Momentum — Winners Minus Losers): tilt momentum. Premio ~2.8%/a ma crash risk severo.');
    p('Output: barra decomposizione visuale, tabella loadings con contributo in %/a, dettaglio per asset class, grafico radar factor loadings. Alpha = rendimento non spiegato dai fattori.');
    callout('Un portafoglio con MKT elevato e SMB/HML bassi e un portafoglio "growth large cap". Aggiungere small cap (SMB) e value (HML) aumenta l\'esposizione ai premi documentati da Fama & French (2015), a costo di maggiore volatilita.', BLU, 'Come usare i risultati');

    h2('Portfolio Optimizer');
    p('Ottimizza automaticamente l\'allocazione tra le asset class selezionate secondo 4 obiettivi:');
    li('Max Sharpe Ratio: massimizza (mu-RF)/sigma — miglior rendimento per unita di rischio totale.');
    li('Minima Varianza: minimizza la volatilita — allocazione piu difensiva possibile.');
    li('Max Sortino Ratio: massimizza (mu-RF)/sigma_down — penalizza solo la volatilita negativa.');
    li('Risk Parity: ogni asset contribuisce ugualmente al rischio totale (equal risk contribution).');
    p('Vincoli personalizzabili: peso minimo e massimo per ogni asset, cap aggregato sull\'azionario. Output: pesi ottimali con grafico a torta, Risk Contribution Chart, metriche (rendimento/volatilita/Sharpe/Sortino). Il pulsante "Applica al Simulatore" trasferisce i pesi ottimali nel portafoglio Custom.');
    callout('Risk Parity e preferito dai gestori professionali perche non dipende dalle stime di rendimento atteso (molto incerte) — usa solo le covarianze storiche. Max Sharpe e ottimale in teoria ma molto sensibile agli input. Per un investitore retail, Risk Parity e generalmente piu robusto.', AMBER, 'Risk Parity vs Max Sharpe');

    // Apply header to first page too

    const total = doc.getNumberOfPages();
    for (let i=1; i<=total; i++){ doc.setPage(i); /* header already drawn via hdrBar on new pages; first page has cover instead */ }
    doc.save('guida-utilizzo-suite-patrimoniale.pdf');
    btn.innerHTML = '✅ Scaricato!';
    setTimeout(()=>{ btn.innerHTML = orig; btn.disabled = false; }, 2500);
  } catch (e) {
    console.error('Guide PDF error:', e);
    btn.innerHTML = '❌ Errore generazione';
    setTimeout(()=>{ btn.innerHTML = orig; btn.disabled = false; }, 3000);
  }
}
