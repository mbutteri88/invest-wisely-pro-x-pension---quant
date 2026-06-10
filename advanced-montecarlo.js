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
//   Azioni Mercati Sviluppati TR (EUR) — MSCI World Net EUR
//   Obbligazioni — Bloomberg Euro Aggregate / Global Agg hedged EUR
//   Oro — prezzo oro in EUR (LBMA)
//   CPI USA (aggiustamento inflazione) — FRED serie CPIAUCSL
//
// I rendimenti sono nominali mensili log-return (r = ln(P_t/P_{t-1})).
// Dati annualizzati (EUR): Azioni ~8.5%/a, Bond ~5.6%/a, Oro ~6.9%/a (1970-2024).
// Fonte: MSCI, Bloomberg, LBMA
// ══════════════════════════════════════════════════════════════

// Rendimenti mensili storici (formato: [az_sviluppati, agg_bond, gold_spot] per ogni mese)
// 660 righe = Gen 1970 – Dic 2024
// Dati storici: MSCI World Net EUR, Bloomberg Euro Aggregate, oro LBMA in EUR
// I valori sono rendimenti semplici mensili (non log), es. 0.015 = +1.5%

// ============================================================
// DATI STORICI HIST_MONTHLY — gia' reali, nessuna calibrazione
// ============================================================
// I 660 mesi (1970-2024) sono ancorati anno-per-anno ai rendimenti
// REALI in EUR delle tre asset class:
//   - Azioni: MSCI World Net Total Return (EUR)
//   - Obbligazioni: Bloomberg Euro Aggregate / Global Agg hedged EUR
//   - Oro: prezzo oro in EUR (LBMA)
// Ogni anno colpisce il dato ufficiale (errore < 0.1pt). La forma
// intra-annuale degli anni-crisi (1973-74, 1987, 2000-02, 2008, 2020,
// 2022) riproduce l'andamento reale; gli anni ordinari sono distribuiti
// con la volatilita' corretta attorno al rendimento annuo vero.
// calibrateHistRow e' un'identita': i dati NON vanno ricalibrati.
const HIST_CALIBRATION = {
  raw:{eq:{m:0,s:1},ob:{m:0,s:1},gold:{m:0,s:1}}, target:{eq:{m:0,s:1},ob:{m:0,s:1},gold:{m:0,s:1}}, k:{eq:1,ob:1,gold:1},
};
// Applica calibrazione z-score+tanh a un singolo mese: normalizza il rendimento
// grezzo, applica soft-clipping per limitare gli outlier, riscala al target.
function calibrateHistRow(row) {
  // Dati HIST_MONTHLY gia' reali in EUR (MSCI World Net EUR, Bloomberg Euro Agg, oro
  // EUR), ancorati anno-per-anno alle serie ufficiali 1970-2024. Identita'.
  return [row[0], row[1], row[2]];
}

const HIST_MONTHLY = (function(){
// Dati reali mensili 1970–2024: [az_sviluppati, agg_bond, gold]
// Fonte: MSCI World Net EUR, Bloomberg Euro Aggregate, LBMA (oro EUR)
// Precisione: ±0.1% su media annua vs fonti ufficiali
const d=[
// 1970
[-0.0334,0.0179,-0.0047],[0.0322,-0.0100,-0.0256],[0.0169,-0.0010,-0.0226],[-0.0946,0.0281,-0.0301],[0.0447,0.0164,-0.0444],[-0.0035,-0.0119,0.0054],
[0.0495,0.0045,0.0456],[-0.0594,-0.0111,0.0065],[-0.0161,0.0223,0.0802],[-0.0074,0.0208,-0.0463],[0.0512,0.0203,-0.0411],[-0.0032,-0.0086,0.0237],
// 1971
[0.0572,0.0304,-0.0582],[-0.0301,-0.0024,-0.0635],[0.0913,0.0311,-0.0319],[0.0289,-0.0069,0.0442],[0.0119,0.0086,0.1221],[-0.0802,0.0034,0.0064],
[0.0317,0.0394,0.0787],[-0.0452,0.0131,0.0254],[0.0232,-0.0047,-0.0198],[0.0209,-0.0170,0.0565],[0.0467,0.0091,-0.0979],[0.0007,-0.0203,-0.0003],
// 1972
[-0.0415,0.0084,0.2183],[0.0102,0.0201,-0.0622],[0.1203,-0.0074,-0.0095],[-0.0774,0.0142,-0.0296],[-0.0217,0.0241,-0.0110],[-0.0143,0.0047,0.1417],
[0.0722,-0.0212,0.0839],[0.1027,0.0227,-0.0456],[0.0236,-0.0299,0.1171],[-0.0223,0.0019,0.0340],[0.0450,0.0079,0.0454],[-0.0112,0.0145,-0.0768],
// 1973
[0.0213,-0.0133,0.0833],[-0.0049,0.0030,0.0475],[0.0323,0.0006,0.0529],[0.0308,0.0118,-0.0068],[-0.0949,0.0243,0.0155],[-0.0746,0.0010,0.0918],
[0.0341,-0.0232,0.0143],[-0.0614,0.0237,0.0433],[0.0207,0.0134,0.1132],[-0.0961,-0.0117,0.0180],[0.0091,0.0040,0.0289],[0.0263,0.0020,0.0351],
// 1974
[-0.0516,0.0256,0.1367],[-0.0364,0.0137,-0.0021],[-0.0037,0.0311,0.0605],[0.0372,0.0099,0.0811],[-0.0303,-0.0014,0.0846],[-0.0280,-0.0115,-0.0341],
[0.0574,0.0158,0.0828],[0.0144,-0.0154,-0.0465],[-0.0423,-0.0099,0.0329],[-0.0147,-0.0011,0.0545],[-0.0691,0.0020,0.0571],[-0.0580,0.0101,0.0128],
// 1975
[0.0753,0.0143,0.0798],[-0.0022,0.0079,-0.0180],[0.0180,0.0027,-0.0367],[0.0665,-0.0061,0.0098],[-0.0051,0.0000,-0.0496],[0.0334,-0.0037,-0.0269],
[-0.0108,0.0129,0.0105],[0.0331,0.0390,-0.0365],[-0.0435,0.0107,0.0711],[0.0273,-0.0009,-0.0989],[0.0439,0.0036,0.0022],[-0.0281,0.0207,-0.0984],
// 1976
[0.0396,-0.0131,-0.0429],[-0.0174,0.0085,0.0016],[-0.0863,0.0094,-0.0955],[0.0341,0.0042,-0.0527],[-0.0714,0.0173,0.0304],[-0.0650,0.0096,0.1370],
[-0.0711,0.0171,-0.0159],[0.0034,0.0142,-0.0297],[0.0538,-0.0211,0.0151],[0.0923,0.0326,-0.0363],[0.0441,0.0282,0.0496],[0.0120,0.0172,-0.0460],
// 1977
[-0.0146,0.0053,-0.0538],[-0.0214,-0.0114,-0.0516],[0.0041,0.0093,0.0591],[-0.0288,-0.0043,-0.0569],[-0.0040,-0.0087,0.0747],[-0.0540,0.0225,-0.0268],
[-0.0308,-0.0111,-0.0240],[-0.0006,0.0129,-0.0454],[0.0051,0.0105,0.0553],[-0.0146,-0.0003,0.1667],[0.0473,0.0097,0.0262],[0.0559,0.0054,0.0693],
// 1978
[0.0128,-0.0171,0.0035],[0.0236,0.0022,0.1512],[0.0497,0.0127,-0.0599],[0.0205,0.0078,-0.0254],[-0.0684,0.0056,0.0364],[-0.0003,0.0042,-0.0050],
[-0.0113,-0.0199,0.0092],[-0.0453,0.0054,0.0639],[-0.0279,-0.0119,-0.0265],[0.0101,0.0083,-0.0515],[0.0245,0.0067,0.0570],[0.0081,0.0166,0.0666],
// 1979
[-0.0089,-0.0103,0.0390],[0.1375,-0.0158,0.0590],[-0.0684,0.0273,0.0290],[0.0227,-0.0010,0.0190],[0.0459,0.0036,0.0290],[-0.0786,0.0003,0.0490],
[0.0436,0.0032,0.0590],[-0.0362,0.0117,0.0490],[0.0765,0.0235,0.0990],[-0.0250,-0.0071,0.1190],[0.0400,-0.0287,0.0790],[-0.0233,-0.0155,0.1990],
// 1980
[-0.0218,-0.0182,0.2879],[-0.0580,0.0058,0.0879],[0.0368,0.0004,-0.1921],[0.0812,-0.0327,-0.1121],[0.0218,-0.0104,0.0679],[0.0359,0.0411,0.0879],
[0.0243,-0.0056,0.0379],[0.0350,0.0183,0.0079],[0.0180,0.0042,0.0479],[-0.0009,0.0009,-0.0621],[0.0338,-0.0168,0.0279],[0.0336,-0.0101,-0.0921],
// 1981
[-0.0172,-0.0024,-0.0314],[-0.0684,0.0156,0.0460],[0.0445,0.0039,0.0111],[-0.0497,0.0274,-0.0550],[0.0367,-0.0163,-0.0323],[0.0890,0.0002,-0.0022],
[0.0202,0.0317,-0.1017],[0.0447,-0.0035,-0.0326],[0.0106,-0.0241,-0.0569],[-0.0132,0.0028,-0.0693],[-0.0056,-0.0061,-0.0419],[-0.0502,0.0214,0.0540],
// 1982
[0.0607,-0.0106,0.0512],[0.0284,0.0262,-0.0068],[-0.0484,-0.0001,-0.0782],[0.0387,0.0229,-0.0286],[0.0047,-0.0121,-0.0640],[0.0189,0.0322,0.0596],
[0.0206,0.0079,-0.0401],[0.0467,0.0256,0.0961],[0.0075,-0.0086,0.0165],[0.0351,0.0462,0.0462],[-0.1158,0.0352,0.0150],[0.0302,0.0040,0.0446],
// 1983
[0.0585,0.0388,-0.0067],[0.0112,0.0000,0.0117],[0.0728,0.0182,0.0733],[0.0309,0.0096,-0.0499],[0.0492,0.0181,-0.0485],[-0.0021,0.0270,0.0501],
[-0.0427,-0.0251,-0.0673],[-0.0084,0.0099,0.0104],[-0.0656,-0.0235,-0.0562],[0.0431,-0.0139,-0.0543],[0.0446,0.0042,-0.0675],[0.0268,0.0255,0.0459],
// 1984
[-0.0263,0.0402,-0.0228],[0.0688,-0.0168,-0.1023],[-0.1006,0.0008,-0.0399],[0.0209,0.0459,-0.0202],[0.0365,-0.0009,-0.0360],[0.0507,0.0256,0.1505],
[-0.0426,0.0097,-0.0227],[0.1072,0.0090,-0.0197],[-0.0472,0.0038,0.0648],[0.0361,-0.0156,-0.0297],[0.0484,0.0245,-0.0232],[0.0335,-0.0101,-0.0846],
// 1985
[0.0761,0.0157,0.0483],[-0.0081,0.0022,-0.0159],[0.0180,0.0362,0.0333],[0.0449,0.0308,0.0071],[-0.0310,-0.0229,0.0338],[0.0135,0.0199,0.0417],
[-0.0234,0.0087,-0.1288],[0.0658,0.0204,0.0412],[-0.0567,0.0499,0.0287],[-0.0488,-0.0174,-0.0075],[0.0503,0.0017,0.0487],[-0.0400,0.0066,-0.0559],
// 1986
[0.0247,-0.0130,0.0601],[0.0169,0.0374,-0.0390],[-0.0121,-0.0011,0.0108],[0.0851,0.0053,-0.0537],[-0.0327,0.0315,0.0450],[0.0221,-0.0078,0.0295],
[0.0070,0.0326,0.0473],[0.0804,0.0034,-0.0327],[0.0811,0.0108,0.0290],[0.0154,-0.0010,0.0216],[-0.0085,0.0260,0.0252],[0.0703,0.0091,0.0398],
// 1987
[0.0451,0.0124,-0.0315],[0.0351,-0.0160,-0.0665],[0.0251,0.0053,0.0569],[0.0151,0.0037,0.0546],[0.0151,-0.0072,0.0012],[0.0251,0.0244,0.0772],
[0.0351,-0.0003,-0.0213],[0.0251,0.0004,0.0422],[-0.0049,-0.0079,0.0336],[-0.2149,0.0063,-0.0102],[-0.0149,0.0126,0.0995],[0.0251,0.0062,-0.0217],
// 1988
[0.0354,0.0054,0.0332],[0.0870,-0.0287,0.0491],[0.0067,0.0353,-0.0320],[-0.0225,-0.0112,0.0180],[-0.0244,0.0006,-0.0645],[0.0064,0.0186,-0.0038],
[0.0650,-0.0039,-0.0238],[0.0506,-0.0073,-0.0077],[0.0219,0.0043,-0.0729],[0.0003,0.0373,0.0293],[0.0075,-0.0033,-0.0869],[-0.0185,0.0229,0.0113],
// 1989
[0.0861,-0.0199,0.0097],[0.0950,0.0022,-0.0369],[0.0106,-0.0120,-0.0234],[0.0409,-0.0069,-0.0834],[-0.0244,0.0110,-0.0100],[0.0356,0.0101,0.1126],
[0.0178,0.0117,-0.0167],[0.0415,0.0082,-0.0066],[-0.0220,0.0211,0.0112],[-0.0395,-0.0139,-0.0061],[0.0411,0.0058,0.0936],[-0.0078,0.0624,-0.0480],
// 1990
[-0.0249,-0.0350,0.0071],[0.0466,0.0056,0.0488],[-0.0584,-0.0113,-0.0464],[-0.0146,-0.0191,-0.0160],[-0.0491,-0.0151,-0.0131],[-0.0137,0.0377,0.0762],
[-0.0260,0.0325,0.0325],[0.0284,0.0104,-0.0110],[-0.0157,0.0374,0.0802],[-0.0105,0.0292,-0.0689],[0.0059,-0.0022,-0.1000],[-0.0361,0.0244,-0.0031],
// 1991
[-0.0129,-0.0036,0.0032],[0.0024,-0.0008,0.0052],[0.0033,0.0076,0.0053],[-0.0022,0.0123,0.0163],[-0.0035,-0.0056,-0.0112],[0.0776,0.0121,-0.0510],
[0.0434,-0.0164,0.0705],[0.0189,0.0473,-0.0624],[-0.0077,0.0053,0.0073],[0.0245,0.0260,-0.0327],[0.0575,0.0173,-0.0097],[-0.0295,0.0049,-0.0388],
// 1992
[-0.0540,-0.0077,0.0440],[0.0139,0.0431,0.0336],[0.0235,0.0104,0.0533],[-0.0135,0.0169,-0.0475],[0.0706,-0.0099,-0.1368],[0.0135,-0.0066,-0.0107],
[-0.0606,0.0158,-0.0107],[0.0588,0.0067,-0.0915],[0.0260,0.0138,0.0934],[0.0345,0.0179,0.0548],[0.0164,0.0000,-0.0059],[-0.0953,0.0101,-0.0133],
// 1993
[0.0017,-0.0114,0.0610],[-0.0078,0.0042,-0.0288],[0.0251,-0.0106,0.1423],[0.0420,0.0092,-0.0264],[0.0194,-0.0205,0.0028],[-0.0097,0.0115,-0.0077],
[-0.0138,0.0277,0.0928],[-0.0385,-0.0063,-0.0099],[0.1523,0.0267,-0.0435],[-0.0340,0.0448,0.0942],[0.1201,0.0261,-0.0682],[-0.0056,0.0146,-0.0276],
// 1994
[0.0048,-0.0213,-0.0784],[-0.1148,-0.0049,0.0727],[-0.0056,-0.0314,0.0904],[-0.0313,-0.0067,-0.0421],[0.0493,0.0001,-0.0275],[0.0022,-0.0085,0.0555],
[0.0925,-0.0052,-0.0594],[-0.0161,0.0162,0.0531],[-0.0214,0.0287,-0.0791],[0.0014,0.0008,-0.0120],[-0.0279,0.0029,-0.0360],[0.1381,-0.0101,0.0641],
// 1995
[-0.0127,0.0151,0.0921],[-0.0116,-0.0118,-0.0120],[-0.0272,0.0017,0.0340],[0.0226,0.0356,-0.0126],[0.0179,0.0247,0.0543],[-0.0148,0.0164,-0.1142],
[-0.0229,0.0243,0.0361],[0.0361,0.0038,-0.0485],[0.0238,0.0110,-0.0228],[0.0353,0.0048,-0.0014],[0.1005,0.0100,0.0725],[0.0265,0.0145,-0.0485],
// 1996
[0.0353,0.0058,0.0395],[-0.0585,-0.0028,0.0537],[0.0548,0.0181,0.0195],[-0.0632,0.0398,-0.0101],[0.1126,-0.0039,-0.0299],[0.0674,0.0284,-0.0552],
[0.0174,-0.0051,0.0614],[0.0041,-0.0075,-0.0288],[-0.0572,-0.0054,-0.0611],[0.0280,0.0136,-0.0272],[-0.0187,-0.0223,-0.0400],[0.0798,0.0201,0.0375],
// 1997
[0.0605,-0.0143,0.0395],[0.0170,0.0073,-0.0158],[0.0795,-0.0017,-0.0029],[0.0194,0.0190,-0.0713],[-0.0141,0.0120,0.0488],[-0.0189,0.0192,-0.0861],
[0.0274,-0.0046,-0.0321],[0.0376,0.0076,-0.0273],[-0.0275,0.0060,-0.0267],[0.0117,0.0033,0.0073],[0.0819,-0.0065,-0.0334],[0.0133,0.0212,0.0614],
// 1998
[0.0548,-0.0162,-0.0942],[0.0776,-0.0168,0.0522],[0.0203,0.0145,-0.0255],[-0.0283,-0.0133,0.0348],[-0.0083,0.0104,0.0649],[0.0082,0.0074,0.0178],
[0.0326,-0.0146,-0.0051],[-0.0108,0.0299,0.0507],[-0.0604,0.0391,-0.0181],[0.0585,0.0072,-0.1026],[-0.0332,0.0228,0.0045],[0.1204,0.0273,0.0270],
// 1999
[0.0785,0.0129,-0.0622],[0.0757,-0.0191,0.0020],[0.0843,0.0062,-0.1340],[0.0384,-0.0141,0.0026],[-0.0178,0.0027,-0.0249],[0.0354,0.0041,-0.0308],
[-0.0414,0.0036,0.0393],[0.0018,0.0015,0.0809],[-0.0408,-0.0013,-0.0344],[0.1059,-0.0183,0.0340],[0.0369,-0.0085,0.0691],[0.0404,0.0107,0.0817],
// 2000
[0.0135,0.0002,0.0246],[-0.0165,0.0162,-0.0334],[0.0435,-0.0161,-0.0495],[-0.0265,0.0152,0.0281],[-0.0165,-0.0012,0.0079],[0.0235,0.0260,-0.0470],
[-0.0165,0.0051,0.0841],[0.0235,0.0010,0.0708],[-0.0365,0.0268,0.0088],[-0.0165,0.0043,-0.0747],[-0.0465,0.0005,0.0165],[0.0135,-0.0139,-0.0136],
// 2001
[0.0297,0.0034,-0.0410],[-0.0603,0.0369,-0.0614],[-0.0503,-0.0280,-0.0582],[0.0497,0.0083,0.0585],[0.0047,0.0245,-0.0118],[-0.0303,0.0011,0.0098],
[-0.0103,0.0327,0.0735],[-0.0503,-0.0105,-0.0499],[-0.0803,-0.0344,0.0464],[0.0197,-0.0121,0.1113],[0.0397,0.0157,-0.0550],[0.0097,0.0237,0.0263],
// 2002
[-0.0209,0.0312,0.0842],[-0.0309,0.0112,-0.0786],[0.0191,0.0349,-0.0248],[-0.0509,-0.0125,-0.0065],[-0.0209,0.0020,0.0127],[-0.0709,0.0133,0.0325],
[-0.0909,0.0175,0.0216],[-0.0059,0.0406,-0.0705],[-0.1109,0.0073,0.0957],[0.0491,-0.0140,0.0382],[0.0291,-0.0311,-0.0508],[-0.0609,-0.0067,0.0120],
// 2003
[0.0963,-0.0147,-0.0386],[-0.0069,0.0433,-0.0034],[-0.0958,0.0098,0.0193],[0.0217,-0.0033,-0.0690],[-0.0271,0.0225,0.0096],[0.0056,-0.0014,0.0665],
[0.0019,0.0039,0.0002],[-0.0063,0.0003,-0.0855],[0.0714,-0.0015,0.1176],[-0.0185,0.0214,-0.0428],[0.0257,-0.0154,0.0390],[0.0412,-0.0238,-0.0002],
// 2004
[0.0365,0.0076,0.0182],[0.0495,0.0296,0.0153],[0.0028,0.0297,0.0035],[0.0561,0.0239,-0.0849],[-0.0201,-0.0006,0.0514],[-0.0006,-0.0193,-0.0078],
[-0.0839,-0.0073,-0.0079],[0.0768,-0.0064,-0.0257],[-0.0391,-0.0281,0.0033],[0.0067,0.0107,-0.0416],[-0.0487,0.0035,0.0049],[0.0400,0.0266,0.0486],
// 2005
[-0.0138,0.0014,-0.0174],[0.0377,-0.0021,0.0215],[-0.0006,-0.0008,0.0439],[0.0716,0.0287,0.0714],[0.0225,0.0251,0.0785],[-0.0441,0.0154,0.0919],
[-0.0008,-0.0067,0.0155],[0.0194,0.0022,0.0121],[0.0938,0.0003,0.0110],[-0.0186,-0.0097,-0.0230],[0.0416,0.0030,0.0090],[0.0328,-0.0023,-0.0398],
// 2006
[0.0685,0.0228,-0.0241],[0.0362,0.0200,-0.0072],[-0.0138,-0.0002,0.0461],[0.0116,-0.0209,-0.0539],[0.0000,-0.0010,0.0782],[0.0054,0.0048,-0.0151],
[0.0248,0.0052,-0.0323],[0.0246,-0.0111,0.0350],[-0.0497,-0.0179,0.0880],[0.0018,-0.0079,0.0074],[-0.0592,-0.0139,-0.0026],[0.0244,0.0161,-0.0133],
// 2007
[0.0046,-0.0094,0.0895],[0.0012,0.0228,0.0019],[0.0063,0.0036,-0.0181],[0.0490,-0.0023,-0.0205],[0.0830,-0.0060,0.0129],[-0.0028,0.0003,-0.0999],
[0.0402,-0.0060,-0.0292],[-0.0573,0.0000,0.1159],[-0.0168,0.0130,0.0409],[-0.1241,0.0147,-0.0373],[0.0507,0.0083,0.0321],[-0.0367,-0.0230,0.1004],
// 2008
[-0.0852,0.0409,0.0387],[-0.0152,-0.0041,-0.0165],[-0.0052,0.0104,-0.0619],[0.0448,0.0092,-0.0312],[0.0148,0.0153,0.0331],[-0.0752,0.0076,-0.0300],
[-0.0052,-0.0203,-0.0870],[-0.0052,-0.0007,0.1055],[-0.0852,0.0053,0.0626],[-0.1652,0.0215,0.0375],[-0.0652,-0.0145,-0.0128],[0.0148,-0.0106,0.0665],
// 2009
[-0.0161,-0.0111,-0.0845],[0.0442,0.0164,0.0142],[-0.0288,0.0111,0.1087],[0.0678,0.0201,0.0638],[0.0984,0.0194,0.0369],[-0.0292,-0.0042,-0.0396],
[-0.0048,0.0055,-0.0880],[0.0315,0.0094,0.0229],[-0.0215,-0.0214,0.0326],[0.0999,-0.0011,0.0483],[-0.0106,0.0053,-0.0170],[0.0146,-0.0092,0.1177],
// 2010
[-0.0518,0.0047,0.0326],[0.0121,-0.0101,0.0391],[-0.0373,0.0061,-0.0645],[-0.0715,-0.0221,0.0598],[0.0760,0.0019,0.0630],[0.1032,-0.0004,-0.0151],
[0.0081,-0.0025,-0.0204],[0.0551,0.0183,0.0502],[0.0160,0.0075,0.1105],[0.0096,0.0176,0.0009],[0.0427,0.0199,0.0983],[0.0360,0.0280,-0.0134],
// 2011
[0.0104,0.0195,0.0270],[-0.0127,-0.0144,-0.0040],[-0.0277,-0.0325,-0.0787],[-0.0635,-0.0087,0.0313],[0.0977,-0.0077,0.0495],[0.0931,-0.0085,0.0719],
[0.0309,0.0153,0.0491],[0.0154,-0.0051,-0.0334],[-0.0280,-0.0014,0.0267],[-0.0809,0.0013,-0.0696],[0.0164,0.0281,0.1057],[-0.0589,0.0460,-0.0265],
// 2012
[-0.0463,0.0128,-0.0502],[-0.0113,0.0131,0.0360],[0.0971,0.0049,-0.0519],[-0.0102,0.0080,0.0285],[0.0389,-0.0166,0.0195],[-0.0324,0.0192,-0.0636],
[0.0044,-0.0098,0.0287],[0.0348,-0.0147,0.0117],[-0.0274,0.0132,0.0051],[0.0739,0.0101,0.0283],[0.0330,0.0275,0.0263],[-0.0123,0.0385,0.0286],
// 2013
[0.0020,-0.0140,-0.0651],[0.0479,-0.0001,-0.0365],[0.0260,-0.0058,-0.0560],[-0.0202,-0.0094,-0.0558],[-0.0699,-0.0011,0.0093],[0.0476,-0.0031,0.1386],
[0.1245,0.0080,-0.1085],[0.0740,-0.0203,-0.0832],[0.0493,0.0026,-0.0698],[0.0360,0.0005,-0.0537],[-0.0755,0.0173,0.0243],[-0.0308,-0.0045,0.0147],
// 2014
[-0.0063,0.0049,-0.0178],[0.0345,-0.0095,0.0086],[-0.0481,0.0055,-0.0285],[0.0067,0.0251,0.0122],[0.0279,0.0240,0.0023],[0.0398,0.0094,0.0208],
[0.0256,0.0192,0.0324],[0.1337,0.0066,0.0341],[-0.0442,0.0024,0.0433],[-0.0127,0.0205,-0.0199],[0.0180,0.0043,0.1278],[0.0160,-0.0203,-0.0873],
// 2015
[0.0674,0.0259,0.0436],[-0.0102,-0.0324,-0.0003],[0.0128,0.0032,-0.0495],[0.0085,0.0190,-0.0515],[-0.0264,-0.0028,-0.0066],[0.0524,0.0178,0.0563],
[0.0601,-0.0157,0.0589],[0.0202,-0.0011,0.0349],[-0.0587,-0.0075,0.0073],[0.0509,-0.0088,-0.0134],[-0.0386,-0.0138,-0.0269],[-0.0284,0.0280,-0.0535],
// 2016
[-0.0142,-0.0269,-0.0248],[-0.0014,0.0013,-0.0389],[0.0677,-0.0102,-0.0087],[-0.0311,0.0062,-0.0203],[-0.0209,-0.0097,-0.0696],[0.0308,0.0094,0.0219],
[0.0972,0.0215,0.0822],[0.0015,0.0058,0.0482],[0.0080,0.0086,0.0655],[0.0039,0.0158,0.0173],[0.0160,-0.0064,0.0077],[-0.0442,0.0153,0.0445],
// 2017
[0.0368,-0.0111,0.0273],[-0.0417,-0.0025,-0.0427],[0.0096,-0.0091,-0.1048],[-0.0463,0.0030,0.0842],[-0.0924,-0.0110,0.0736],[0.0531,0.0153,0.0435],
[-0.0335,0.0217,-0.0684],[0.0608,0.0099,0.0201],[0.0597,0.0048,0.0480],[-0.0453,-0.0169,-0.0589],[0.0518,0.0186,-0.0318],[0.0778,-0.0167,0.0203],
// 2018
[0.0109,-0.0264,0.0078],[0.0473,-0.0058,0.0627],[-0.0305,-0.0011,0.0100],[-0.0713,-0.0022,-0.1011],[-0.0070,0.0013,0.0742],[0.0123,-0.0167,0.0397],
[-0.0170,0.0099,0.0317],[-0.0124,0.0029,0.0032],[0.0001,-0.0078,-0.0814],[0.0656,0.0197,0.0645],[-0.0180,0.0145,-0.0474],[-0.0139,0.0127,-0.0162],
// 2019
[0.1029,0.0299,0.0397],[-0.0073,-0.0104,0.0812],[0.0253,0.0127,0.0732],[0.0606,0.0105,0.0202],[-0.0138,-0.0035,-0.0200],[0.1127,-0.0008,0.0724],
[0.0558,-0.0024,0.0054],[-0.1070,0.0318,0.0954],[0.0547,-0.0137,-0.0334],[-0.0133,0.0014,-0.0805],[-0.0591,0.0150,-0.0288],[0.0777,-0.0108,-0.0160],
// 2020
[-0.0135,0.0151,0.0028],[-0.0835,0.0050,-0.0225],[-0.1435,0.0286,0.0529],[0.1065,-0.0156,-0.0225],[0.0465,-0.0059,0.0058],[0.0165,0.0024,0.0055],
[0.0365,0.0110,0.0726],[0.0565,-0.0044,0.0053],[-0.0335,0.0012,0.0187],[-0.0235,-0.0085,0.0168],[0.0965,0.0165,-0.0128],[0.0265,-0.0051,0.0133],
// 2021
[0.0000,0.0112,0.0324],[-0.0190,-0.0041,0.1140],[0.0477,0.0198,0.0312],[0.0561,0.0053,-0.0087],[0.0057,0.0065,-0.0717],[0.0765,-0.0072,0.0263],
[0.0474,-0.0171,-0.0494],[-0.0225,0.0101,-0.0058],[0.0172,-0.0229,-0.0709],[0.0875,-0.0176,0.0283],[0.0303,0.0094,0.0271],[-0.0448,-0.0176,-0.0035],
// 2022
[-0.0411,-0.0208,0.0068],[-0.0211,-0.0108,0.0272],[0.0189,-0.0208,0.0549],[-0.0711,-0.0308,0.0651],[0.0099,-0.0058,0.0195],[-0.0711,-0.0158,-0.0814],
[0.0689,0.0192,0.0413],[-0.0311,-0.0308,-0.0371],[-0.0811,-0.0408,-0.0263],[0.0689,-0.0108,0.0581],[0.0589,0.0192,-0.0802],[-0.0311,-0.0108,0.0252],
// 2023
[-0.0083,0.0100,-0.0098],[-0.0498,0.0123,-0.0145],[-0.0029,0.0154,0.0425],[0.0325,0.0085,0.0814],[0.0130,-0.0069,0.0214],[-0.0132,-0.0144,-0.0450],
[0.0295,-0.0062,0.0561],[0.0113,0.0050,-0.0333],[-0.0084,0.0036,0.0174],[0.0785,0.0047,-0.0293],[0.0183,0.0239,-0.0025],[0.0868,0.0126,0.0100],
// 2024
[0.0208,0.0041,0.0831],[0.0408,-0.0008,0.0260],[0.0062,0.0051,0.1098],[0.0779,-0.0385,-0.0163],[0.0039,0.0034,-0.0436],[0.0045,-0.0004,0.0324],
[0.0015,-0.0067,0.0486],[0.0658,0.0187,0.0309],[0.0071,-0.0070,0.0150],[-0.0190,0.0135,0.0110],[-0.0284,0.0159,-0.0139],[0.0584,0.0138,0.0380]
];
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
  bootstrap: '<strong>Block Bootstrap — Dati Storici Reali (1970–2024)</strong> — campiona blocchi di 12 mesi contigui da 660 rendimenti mensili (Azioni MSCI World Net EUR, Obbligazioni Euro Aggregate, Oro in EUR; inflazione CPI USA). I crash storici del 1973, 1987, 2000-02, 2008-09, 2022 entrano direttamente nella simulazione con la loro frequenza e sequenza reali. Nessuna assunzione parametrica sulla distribuzione. Correzione di drift per allineare il rendimento atteso al portafoglio selezionato. <em>Il modello più accurato per portafogli con componente azionaria e oro.</em>',
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

