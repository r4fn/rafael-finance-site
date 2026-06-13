/* ─────────────────────────────────────────────────────────────
   finance.js — funções puras (sem DOM)
   Formatação, conversão de números, datas e matemática financeira.
   Carregado ANTES de app.js (escopo global compartilhado).
   ───────────────────────────────────────────────────────────── */

// ── Formatação ──────────────────────────────────────────────
const fmtBRL = v => (isFinite(v) ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—');
const fmtPct = v => (isFinite(v) ? (100 * v).toFixed(2).replace('.', ',') + '%' : '—');

// Converte string com vírgula para número
function safeNum(n) {
  if (typeof n === 'string') n = n.replace(/\./g, '').replace(',', '.');
  const x = parseFloat(n);
  return isFinite(x) ? x : 0;
}

// ── Datas ───────────────────────────────────────────────────
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

function proxData(dia) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const dHoje = now.getDate();
  const thisDay = Math.min(dia, daysInMonth(y, m));
  if (dHoje <= dia) { return new Date(y, m, thisDay); }
  const nextMonth = m + 1;
  return new Date(y, nextMonth, Math.min(dia, daysInMonth(y, nextMonth)));
}

function diffDias(a, b) { // b - a
  const d1 = new Date(a.getFullYear(), a.getMonth(), a.getDate(), 12);
  const d2 = new Date(b.getFullYear(), b.getMonth(), b.getDate(), 12);
  const ms = d2 - d1; // 12h para evitar DST
  return Math.max(0, Math.round(ms / 86400000));
}

// ── Matemática financeira ───────────────────────────────────
function pmt(rate, nper, pv, fv = 0, type = 0) {
  if (nper <= 0) return NaN;
  if (rate === 0) return -(pv + fv) / nper;
  const r1 = Math.pow(1 + rate, nper);
  return -(rate * (pv * r1 + fv)) / ((1 + rate * type) * (r1 - 1));
}

function nperSolve(rate, pmtVal, pv, fv = 0, type = 0) {
  if (!isFinite(rate) || rate < 0 || !isFinite(pmtVal) || pmtVal === 0) return NaN;
  if (pv <= 0) return NaN;
  const typeAdj = (1 + rate * type);
  const f = (n) => pv + pmtVal * typeAdj * (1 - Math.pow(1 + rate, -n)) / rate + fv * Math.pow(1 + rate, -n);
  let lo = 1, hi = 600; while (f(hi) > 0 && hi < 2000) hi *= 2;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2; const val = f(mid);
    if (Math.abs(val) < 1e-8) return mid;
    if (val > 0) lo = mid; else hi = mid;
  }
  return Math.ceil((lo + hi) / 2);
}
