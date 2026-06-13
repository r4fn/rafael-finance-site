/* ─────────────────────────────────────────────────────────────
   app.js — interface e orquestração
   Máscaras de input, toggles, cálculo principal (calc), persistência
   e inicialização. Depende de finance.js (carregado antes).
   ───────────────────────────────────────────────────────────── */

const el = id => document.getElementById(id);

// ── Máscaras de input ───────────────────────────────────────
// Máscara monetária: formata como "1.234,56"
function maskMoney(input) {
  let v = input.value.replace(/\D/g, '');
  if (!v) { input.value = ''; return; }
  let num = parseInt(v, 10) / 100;
  input.value = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Máscara percentual: permite até 2 decimais com vírgula
function maskPct(input) {
  let v = input.value.replace(/[^\d,]/g, '');
  // permite só uma vírgula
  let parts = v.split(',');
  if (parts.length > 2) v = parts[0] + ',' + parts.slice(1).join('');
  if (parts[1] && parts[1].length > 2) v = parts[0] + ',' + parts[1].substring(0, 2);
  input.value = v;
}

// Aplica máscaras nos campos corretos
const moneyFields = ['valor', 'pmtDesejado', 'descPixBrl', 'descPixFinal', 'descAvistaBrl', 'descAvistaFinal', 'cashbackBrl'];
const pctFields = ['descPix', 'descAvista', 'cashback', 'cdi', 'pctCdiBanco', 'ir'];

moneyFields.forEach(id => {
  const node = el(id);
  if (node) node.addEventListener('input', () => { maskMoney(node); calc(); });
});
pctFields.forEach(id => {
  const node = el(id);
  if (node) node.addEventListener('input', () => { maskPct(node); calc(); });
});

const otherInputs = ['parcelas', 'fechamento', 'vencimento', 'nAuto'];
otherInputs.forEach(i => { const node = el(i); if (node) node.addEventListener('input', calc); });

// ── Toggle: Desconto à vista no cartão ──────────────────────
let descAvistaModo = 'pct';
el('toggleDescAvista').addEventListener('click', e => {
  const btn = e.target.closest('.tri-btn');
  if (!btn) return;
  descAvistaModo = btn.dataset.mode;
  el('toggleDescAvista').querySelectorAll('.tri-btn').forEach(b => b.classList.toggle('active', b === btn));
  el('wrapDescAvistaPct').style.display   = descAvistaModo === 'pct'   ? 'flex' : 'none';
  el('wrapDescAvistaBrl').style.display   = descAvistaModo === 'brl'   ? 'flex' : 'none';
  el('wrapDescAvistaFinal').style.display = descAvistaModo === 'final' ? 'flex' : 'none';
  el('pctDescAvista').style.display = descAvistaModo !== 'pct' ? 'block' : 'none';
  el('descAvista').value = '';
  el('descAvistaBrl').value = '';
  el('descAvistaFinal').value = '';
  el('pctDescAvista').textContent = '';
  calc();
});

// ── Toggle: Desconto PIX ────────────────────────────────────
let descPixModo = 'pct'; // 'pct', 'brl' ou 'final'
el('toggleDescPix').addEventListener('click', e => {
  const btn = e.target.closest('.tri-btn');
  if (!btn) return;
  descPixModo = btn.dataset.mode;
  el('toggleDescPix').querySelectorAll('.tri-btn').forEach(b => b.classList.toggle('active', b === btn));
  el('wrapDescPixPct').style.display   = descPixModo === 'pct'   ? 'flex' : 'none';
  el('wrapDescPixBrl').style.display   = descPixModo === 'brl'   ? 'flex' : 'none';
  el('wrapDescPixFinal').style.display = descPixModo === 'final' ? 'flex' : 'none';
  el('pctDescPix').style.display = descPixModo !== 'pct' ? 'block' : 'none';
  el('descPix').value = '';
  el('descPixBrl').value = '';
  el('descPixFinal').value = '';
  el('pctDescPix').textContent = '';
  calc();
});

// ── Toggle: tipo de compra (cartão ou PIX only) ─────────────
let tipoCompra = 'cartao';
const camposCartao = ['wrapDescPix', 'wrapDescPixPct', 'wrapDescPixBrl', 'wrapDescPixFinal',
  'pctDescPix', 'toggleDescPix'];
const camposCartaoOnly = ['toggleDescAvista', 'wrapDescAvistaPct', 'wrapDescAvistaBrl',
  'wrapDescAvistaFinal', 'pctDescAvista', 'parcelas', 'fechamento', 'vencimento'];

function setTipoCompra(modo) {
  tipoCompra = modo;
  el('toggleTipoCompra').querySelectorAll('.tri-btn')
    .forEach(b => b.classList.toggle('active', b.dataset.mode === modo));

  const isPix = modo === 'pix';

  // campos que se desabilitam no PIX only
  const todosDesabilitados = [
    'descPix', 'descPixBrl', 'descPixFinal',
    'descAvista', 'descAvistaBrl', 'descAvistaFinal',
    'parcelas', 'fechamento', 'vencimento', 'cashback', 'cashbackBrl'
  ];
  todosDesabilitados.forEach(id => {
    const node = el(id);
    if (node) node.disabled = isPix;
  });

  // visual: wrap rows completos
  const rowsDesabilitadas = [
    'rowDescPix', 'rowDescAvista', 'rowParcelas',
    'rowCashback', 'rowFechamento', 'rowVencimento'
  ];
  rowsDesabilitadas.forEach(id => {
    const node = el(id);
    if (node) node.classList.toggle('field-disabled', isPix);
  });

  calc();
}

el('toggleTipoCompra').addEventListener('click', e => {
  const btn = e.target.closest('.tri-btn');
  if (!btn) return;
  setTipoCompra(btn.dataset.mode);
});

// ── Cálculo principal ───────────────────────────────────────
function calc() {
  const valor = safeNum(el('valor').value);

  // Desconto PIX: modo %, R$ desconto ou R$ valor final
  let descPix = 0;
  if (descPixModo === 'pct') {
    descPix = safeNum(el('descPix').value) / 100;
  } else if (descPixModo === 'brl') {
    const descPixValor = safeNum(el('descPixBrl').value);
    descPix = (valor > 0 && descPixValor > 0) ? descPixValor / valor : 0;
    el('pctDescPix').textContent = (valor > 0 && descPixValor > 0) ? '≈ ' + (descPix * 100).toFixed(2).replace('.', ',') + '%' : '';
  } else {
    const finalPix = safeNum(el('descPixFinal').value);
    descPix = (valor > 0 && finalPix > 0 && finalPix < valor) ? (valor - finalPix) / valor : 0;
    el('pctDescPix').textContent = (valor > 0 && finalPix > 0 && finalPix < valor) ? '≈ ' + (descPix * 100).toFixed(2).replace('.', ',') + '% de desconto' : '';
  }
  // Desconto à vista no cartão: modo %, R$ desconto ou R$ valor final
  let descAvista = 0;
  if (descAvistaModo === 'pct') {
    descAvista = safeNum(el('descAvista').value) / 100;
  } else if (descAvistaModo === 'brl') {
    const descAvistaValor = safeNum(el('descAvistaBrl').value);
    descAvista = (valor > 0 && descAvistaValor > 0) ? descAvistaValor / valor : 0;
    el('pctDescAvista').textContent = (valor > 0 && descAvistaValor > 0) ? '≈ ' + (descAvista * 100).toFixed(2).replace('.', ',') + '%' : '';
  } else {
    const finalAvista = safeNum(el('descAvistaFinal').value);
    descAvista = (valor > 0 && finalAvista > 0 && finalAvista < valor) ? (valor - finalAvista) / valor : 0;
    el('pctDescAvista').textContent = (valor > 0 && finalAvista > 0 && finalAvista < valor) ? '≈ ' + (descAvista * 100).toFixed(2).replace('.', ',') + '% de desconto' : '';
  }
  // Cashback: modo % ou R$
  let cashback = 0;
  if (cashbackModo === 'pct') {
    cashback = safeNum(el('cashback').value) / 100;
    el('pctCashback').textContent = (valor > 0 && cashback > 0) ? '≈ ' + fmtBRL(valor * cashback) : '';
  } else {
    const cashbackValor = safeNum(el('cashbackBrl').value);
    cashback = (valor > 0 && cashbackValor > 0) ? cashbackValor / valor : 0;
    el('pctCashback').textContent = (valor > 0 && cashbackValor > 0) ? '≈ ' + (cashback * 100).toFixed(2).replace('.', ',') + '%' : '';
  }
  const nParcelas = Math.max(1, Math.floor(safeNum(el('parcelas').value)) || 0);
  const diaFech = Math.min(31, Math.max(1, Math.floor(safeNum(el('fechamento').value) || 20)));
  const diaVenc = Math.min(31, Math.max(1, Math.floor(safeNum(el('vencimento').value) || 27)));

  // Parâmetros anuais
  const cdiAnnual = safeNum(el('cdi').value) / 100; // ao ano
  const pctCdiBanco = safeNum(el('pctCdiBanco').value) / 100; // 100% etc
  const ir = safeNum(el('ir').value) / 100;
  const cdiConservador = 0.001; // 0,10% a.a.

  // Taxas equivalentes
  const effAnnual = Math.max(0, (cdiAnnual - cdiConservador) * pctCdiBanco * (1 - ir));
  const taxaMensal = Math.pow(1 + effAnnual, 1 / 12) - 1;
  const taxaDiaria = Math.pow(1 + taxaMensal, 1 / 30) - 1;

  const hoje = new Date();
  const fecha = proxData(diaFech);
  const vence = proxData(diaVenc);
  const diasAtePagar = diffDias(hoje, vence);

  // PIX (imediato)
  const pixReal = valor * (1 - descPix);

  // Cartão à vista (traz a PV e aplica cashback/descAvista)
  const avistaPV = valor * (1 - descAvista) * (1 - cashback) / Math.pow(1 + taxaDiaria, diasAtePagar);

  // Cartão parcelado: PV das parcelas menos PV do cashback na fatura
  const parcela = valor / nParcelas;
  let pvParcelas = 0;
  for (let k = 0; k < nParcelas; k++) {
    const dias = diasAtePagar + 30 * k;
    pvParcelas += parcela / Math.pow(1 + taxaDiaria, dias);
  }
  const pvCashback = (cashback > 0) ? (valor * cashback) / Math.pow(1 + taxaDiaria, diasAtePagar) : 0;
  let parceladoPV = pvParcelas - pvCashback;

  // Força igualdade numérica quando é 1 parcela e sem desc. à vista
  if (nParcelas === 1 && descAvista === 0) { parceladoPV = avistaPV; }

  // Decisão
  const melhorVal = Math.min(pixReal, avistaPV, parceladoPV);
  const melhor = (melhorVal === pixReal) ? 'PAGUE NO PIX' : (melhorVal === avistaPV ? 'CARTÃO À VISTA' : 'PARCELADO');

  // Descontos necessários (equivalentes aos seus E5/E6)
  const descNecPix = valor > 0 ? 1 - (Math.min(avistaPV, parceladoPV) / valor) : NaN;
  const descNecAvista = valor > 0 ? 1 - (Math.min(pixReal, parceladoPV) / valor) : NaN;

  // Auto‑financiamento
  const nAuto = Math.max(0, Math.floor(safeNum(el('nAuto').value) || 0));
  const custoRef = tipoCompra === 'pix' ? pixReal : melhorVal; // usa o menor custo como PV
  const pmtMes = (nAuto > 0 && custoRef > 0) ? pmt(taxaMensal, nAuto, -custoRef) : NaN;
  // Valor máximo por mês → encontra nper e recalcula parcela exata
  const pmtDesejado = safeNum(el('pmtDesejado').value);
  const nperCalc = (pmtDesejado > 0 && custoRef > 0) ? Math.ceil(nperSolve(taxaMensal, -pmtDesejado, custoRef)) : NaN;
  // Parcela exata para o nperCalc encontrado (≤ pmtDesejado)
  const pmtExato = (isFinite(nperCalc) && nperCalc > 1 && custoRef > 0) ? pmt(taxaMensal, nperCalc, -custoRef) : NaN;

  // Render
  el('hoje').textContent = hoje.toLocaleDateString('pt-BR');
  el('fecha').textContent = fecha.toLocaleDateString('pt-BR');
  el('vence').textContent = vence.toLocaleDateString('pt-BR');
  el('diasAte').textContent = diasAtePagar + ' d';
  el('taxaMensal').textContent = fmtPct(taxaMensal);
  el('taxaDiaria').textContent = fmtPct(taxaDiaria);

  el('pixReal').textContent = fmtBRL(pixReal);
  if (tipoCompra === 'pix') {
    el('avistaReal').textContent = '—';
    el('parceladoReal').textContent = '—';
    el('melhor').textContent = 'PAGUE NO PIX';
  } else {
    el('avistaReal').textContent = fmtBRL(avistaPV);
    el('parceladoReal').textContent = (nParcelas > 1) ? fmtBRL(parceladoPV) : '—';
    el('melhor').textContent = melhor;
  }

  // Negociação: arredonda % sempre para cima (2 casas) e calcula valor com desconto
  function fmtDescNec(desc, valorBase) {
    if (!isFinite(desc)) return { pct: '—', val: '—' };
    const sinal = desc < 0 ? '-' : '';
    const pctBruto = 100 * Math.abs(desc);
    // arredonda para cima na 2ª casa decimal
    const pctCeil = Math.ceil(pctBruto * 100) / 100;
    const pctStr = sinal + pctCeil.toFixed(2).replace('.', ',') + '%';
    const valorDesc = (valorBase > 0 && isFinite(pctCeil))
      ? fmtBRL(valorBase * (1 - (desc < 0 ? -1 : 1) * pctCeil / 100))
      : '—';
    return { pct: pctStr, val: valorDesc };
  }

  const necPix = fmtDescNec(descNecPix, valor);
  const necAvista = fmtDescNec(descNecAvista, valor);
  if (tipoCompra === 'pix') {
    el('descNecPix').textContent = '—';
    el('descNecPixValor').textContent = '—';
    el('descNecAvista').textContent = '—';
    el('descNecAvistaValor').textContent = '—';
  } else {
    el('descNecPix').textContent = necPix.pct;
    el('descNecPixValor').textContent = necPix.val;
    el('descNecAvista').textContent = necAvista.pct;
    el('descNecAvistaValor').textContent = necAvista.val;
  }

  const pmtTotalVal = (isFinite(pmtMes) && nAuto > 1) ? pmtMes * nAuto : NaN;
  const pmtTaxaVal = (isFinite(pmtTotalVal) && melhorVal > 0) ? (pmtTotalVal / melhorVal - 1) : NaN;

  el('pmtAuto').textContent = (isFinite(pmtMes) && nAuto > 1) ? fmtBRL(pmtMes) : '—';
  el('pmtTotal').textContent = isFinite(pmtTotalVal) ? fmtBRL(pmtTotalVal) : '—';
  el('pmtTaxa').textContent = isFinite(pmtTaxaVal) ? ((pmtTaxaVal * 100).toFixed(2).replace('.', ',') + '%') : '—';
  el('nperAuto').textContent = (isFinite(nperCalc) && nperCalc > 1) ? nperCalc + ' meses' : '—';
  el('nperParcela').textContent = (isFinite(pmtExato) && nperCalc > 1) ? fmtBRL(pmtExato) : '—';

  const nperTotalVal = (isFinite(pmtExato) && nperCalc > 1) ? pmtExato * nperCalc : NaN;
  const nperTaxaVal = (isFinite(nperTotalVal) && melhorVal > 0) ? (nperTotalVal / melhorVal - 1) : NaN;
  el('nperTotal').textContent = isFinite(nperTotalVal) ? fmtBRL(nperTotalVal) : '—';
  el('nperTaxa').textContent = isFinite(nperTaxaVal) ? ((nperTaxaVal * 100).toFixed(2).replace('.', ',') + '%') : '—';
}

// ── Toggle Cashback do cartão ───────────────────────────────
let cashbackModo = 'pct';
el('swTrackCashback').addEventListener('click', () => {
  cashbackModo = cashbackModo === 'pct' ? 'brl' : 'pct';
  const isBrl = cashbackModo === 'brl';
  el('swTrackCashback').classList.toggle('on', isBrl);
  el('toggleCashback').classList.toggle('is-brl', isBrl);
  el('wrapCashbackPct').style.display = isBrl ? 'none' : 'flex';
  el('wrapCashbackBrl').style.display = isBrl ? 'flex' : 'none';
  el('pctCashback').style.display = 'block';
  el('cashback').value = isBrl ? '' : '1,25';
  el('cashbackBrl').value = '';
  el('pctCashback').textContent = '';
  calc();
});

// ── Toggle modo Auto-Financiamento: nº parcelas / valor máximo ──
let autoFinModo = 'nper'; // 'nper' ou 'valor'
el('swModoAuto').addEventListener('click', () => {
  autoFinModo = autoFinModo === 'nper' ? 'valor' : 'nper';
  const isValor = autoFinModo === 'valor';
  el('swModoAuto').classList.toggle('on', isValor);
  el('lblModoNper').style.color = isValor ? 'var(--text3)' : 'var(--acc)';
  el('lblModoValor').style.color = isValor ? 'var(--acc)' : 'var(--text3)';
  el('modoNper').style.display = isValor ? 'none' : '';
  el('modoValor').style.display = isValor ? '' : 'none';
  calc();
});

// ── Recolher/expandir Auto-Financiamento (padrão: recolhido) ──
let autoFinAberto = false;
el('toggleAutoFin').addEventListener('click', () => {
  autoFinAberto = !autoFinAberto;
  el('bodyAutoFin').style.display = autoFinAberto ? '' : 'none';
  el('iconAutoFin').textContent = autoFinAberto ? '−' : '+';
});

// ── Recolher/expandir Parâmetros financeiros (padrão: recolhido) ──
let paramsAberto = false;
el('toggleParams').addEventListener('click', () => {
  paramsAberto = !paramsAberto;
  el('bodyParams').style.display = paramsAberto ? '' : 'none';
  el('iconParams').textContent = paramsAberto ? '−' : '+';
});

// ── Persistência: carrega valores salvos ────────────────────
const savedFech = localStorage.getItem('ec_fechamento');
const savedVenc = localStorage.getItem('ec_vencimento');
if (savedFech) el('fechamento').value = savedFech;
if (savedVenc) el('vencimento').value = savedVenc;

const savedPctCdi = localStorage.getItem('ec_pctCdiBanco');
const savedIr = localStorage.getItem('ec_ir');
if (savedPctCdi) el('pctCdiBanco').value = savedPctCdi;
if (savedIr) el('ir').value = savedIr;

// Salva automaticamente ao alterar
el('fechamento').addEventListener('change', () => localStorage.setItem('ec_fechamento', el('fechamento').value));
el('vencimento').addEventListener('change', () => localStorage.setItem('ec_vencimento', el('vencimento').value));
const savedCashback = localStorage.getItem('ec_cashback');
if (savedCashback) el('cashback').value = savedCashback;

el('cashback').addEventListener('change', () => localStorage.setItem('ec_cashback', el('cashback').value));
el('pctCdiBanco').addEventListener('change', () => localStorage.setItem('ec_pctCdiBanco', el('pctCdiBanco').value));
el('ir').addEventListener('change', () => localStorage.setItem('ec_ir', el('ir').value));

// ── Inicializa ──────────────────────────────────────────────
calc();

// ── CDI atual via Banco Central (SGS série 4389 — CDI anualizado, base 252) ──
// Preenche o campo "CDI (ao ano)" com o último valor publicado pelo BC.
// Funciona offline: usa o último valor em cache e, com internet, atualiza.
async function carregarCdiAtual() {
  const cacheVal = localStorage.getItem('ec_cdi');
  const cacheData = localStorage.getItem('ec_cdi_data');
  // 1) Mostra imediatamente o último valor conhecido (se houver)
  if (cacheVal) {
    el('cdi').value = cacheVal;
    el('cdiFonte').textContent = 'CDI de ' + cacheData + ' · Banco Central';
    calc();
  }
  // 2) Tenta atualizar pela rede
  try {
    const url = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const item = Array.isArray(data) ? data[0] : null;
    if (!item || !item.valor) throw new Error('resposta inesperada');
    const valorBR = String(item.valor).replace('.', ',');
    el('cdi').value = valorBR;
    el('cdiFonte').textContent = 'CDI de ' + item.data + ' · Banco Central';
    localStorage.setItem('ec_cdi', valorBR);
    localStorage.setItem('ec_cdi_data', item.data);
    calc();
  } catch (err) {
    console.warn('[CDI] não foi possível atualizar:', err);
    if (!cacheVal) el('cdiFonte').textContent = 'CDI atual indisponível — usando valor padrão';
  }
}
carregarCdiAtual();
