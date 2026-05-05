// ── DOM refs ──
const currentPriceEl  = document.getElementById('currentPrice');
const futurePriceEl   = document.getElementById('futurePrice');
const amountEl        = document.getElementById('amount');

const tradeRadios     = document.querySelectorAll('input[name="trade"]');
const entryTypeRadios = document.querySelectorAll('input[name="entryType"]');
const exitTypeRadios  = document.querySelectorAll('input[name="exitType"]');

const leverageSlider  = document.getElementById('leverageSlider');
const leverageDisplay = document.getElementById('leverageDisplay');
const levBtns         = document.querySelectorAll('.lev-btn');

const profitValue     = document.getElementById('profitValue');
const profitPercent   = document.getElementById('profitPercent');

const metaType        = document.getElementById('metaType');
const metaLeverage    = document.getElementById('metaLeverage');
const metaRoi         = document.getElementById('metaRoi');
const metaFee         = document.getElementById('metaFee');
const metaGross       = document.getElementById('metaGross');

const feeRow          = document.getElementById('feeRow');
const grossRow        = document.getElementById('grossRow');
const feeTypePill     = document.getElementById('feeTypePill');

const tpRows          = document.getElementById('tpRows');
const slRows          = document.getElementById('slRows');

const profitCard      = document.getElementById('profitCard');

const positionInfo    = document.getElementById('positionInfo');
const positionSize    = document.getElementById('positionSize');

const entryFeeTag     = document.getElementById('entryFeeTag');
const exitFeeTag      = document.getElementById('exitFeeTag');

// Liq refs
const liqPriceValue   = document.getElementById('liqPriceValue');
const liqDistBlock    = document.getElementById('liqDistBlock');
const liqDistPill     = document.getElementById('liqDistPill');
const liqDistPct      = document.getElementById('liqDistPct');
const liqDistLabel    = document.getElementById('liqDistLabel');
const liqProgressWrap = document.getElementById('liqProgressWrap');
const liqProgressFill = document.getElementById('liqProgressFill');
const liqProgressLabel= document.getElementById('liqProgressLabel');
const liqWarningBadge = document.getElementById('liqWarningBadge');

// ── Constants ──
const MAKER_FEE  = 0.00020; // 0.020%
const TAKER_FEE  = 0.00050; // 0.050%
const MAINT_RATE = 0.005;    // 0.50%

// ── Helpers ──
const fmt = n => Number(n || 0).toLocaleString('en-US', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4
});

const fmtPrice = p => '$' + fmt(p);

function animateEl(el) {
  el.classList.remove('value-updated');
  void el.offsetWidth;
  el.classList.add('value-updated');
}

function getTradeType() {
  for (const r of tradeRadios) if (r.checked) return r.value;
  return 'long';
}

function getLeverage() {
  return Math.max(1, Math.min(100, parseInt(leverageSlider.value || 1)));
}

function getEntryOrderType() {
  for (const r of entryTypeRadios) if (r.checked) return r.value;
  return 'market';
}

function getExitOrderType() {
  for (const r of exitTypeRadios) if (r.checked) return r.value;
  return 'market';
}

function feeRate(type) {
  return type === 'limit' ? MAKER_FEE : TAKER_FEE;
}

// ── Leverage UI ──
function setLeverage(val) {
  val = Math.max(1, Math.min(100, parseInt(val)));
  leverageSlider.value = val;
  leverageDisplay.textContent = val + '×';
  levBtns.forEach(b =>
    b.classList.toggle('active', parseInt(b.dataset.lev) === val)
  );
  calculate();
}

leverageSlider.addEventListener('input', e => setLeverage(e.target.value));
levBtns.forEach(b => b.addEventListener('click', () => setLeverage(b.dataset.lev)));

entryTypeRadios.forEach(r => r.addEventListener('change', calculate));
exitTypeRadios.forEach(r => r.addEventListener('change', calculate));
tradeRadios.forEach(r => r.addEventListener('change', calculate));

// ── Liquidation ──
function calcLiq(entry, lev, type, entryFeeRate) {
  if (type === 'long') {
    return entry * (1 - (1 / lev) + MAINT_RATE + entryFeeRate);
  }
  return entry * (1 + (1 / lev) - MAINT_RATE + entryFeeRate);
}

function updateLiq(cp, lev, type, entryFeeRate) {
  if (!cp || !lev) return;

  const liq = calcLiq(cp, lev, type, entryFeeRate);
  const dist = Math.abs((liq - cp) / cp) * 100;

  liqPriceValue.textContent = fmtPrice(liq);

  liqDistBlock.style.display = 'flex';
  liqDistPct.textContent = fmt(dist) + '%';

  liqProgressWrap.style.display = 'block';
  liqProgressFill.style.width = Math.min(99, Math.max(2, 100 - dist)) + '%';

  if (dist < 5) liqWarningBadge.textContent = '🔥 EXTREME DANGER';
  else if (dist < 15) liqWarningBadge.textContent = '⚠ HIGH RISK';
  else liqWarningBadge.textContent = '✅ OK';
}

// ── MAIN CALC ──
function calculate() {
  const cp = parseFloat(currentPriceEl.value);
  const fp = parseFloat(futurePriceEl.value);
  const margin = parseFloat(amountEl.value);

  const type = getTradeType();
  const lev = getLeverage();

  const entryType = getEntryOrderType();
  const exitType = getExitOrderType();

  const entryFeeRate = feeRate(entryType);
  const exitFeeRate  = feeRate(exitType);

  metaType.textContent = type.toUpperCase();
  metaLeverage.textContent = lev + '×';

  updateLiq(cp, lev, type, entryFeeRate);

  if (!cp || !fp || !margin || cp <= 0 || fp <= 0 || margin <= 0) return;

  const posSize = margin * lev;

  const entryFee = posSize * entryFeeRate;
  const exitFee  = posSize * exitFeeRate;
  const totalFee = entryFee + exitFee;

  const change = (fp - cp) / cp;
  const dir = type === 'long' ? 1 : -1;

  const gross = posSize * change * dir;
  const net = gross - totalFee;

  const roi = (net / margin) * 100;

  profitValue.textContent = (net >= 0 ? '+' : '-') + '$' + fmt(Math.abs(net));
  metaRoi.textContent = 'ROI ' + fmt(roi) + '%';
  metaFee.textContent = '-$' + fmt(totalFee);
  metaGross.textContent = (gross >= 0 ? '+' : '') + '$' + fmt(gross);

  positionInfo.style.display = 'flex';
  positionSize.textContent = '$' + fmt(posSize);

  feeTypePill.textContent =
    `Entry:${entryType} · Exit:${exitType}`;

  // ── TP ──
  const tps = [1, 5, 10];
  tpRows.innerHTML = '';

  tps.forEach(p => {
    const r = p / 100;
    const tpGross = posSize * r;
    const tpNet = tpGross - totalFee;

    tpRows.innerHTML += `
      <div class="sugg-row">
        <span>+${p}%</span>
        <span>${fmtPrice(type === 'long' ? cp * (1 + r) : cp * (1 - r))}</span>
        <span>${tpNet >= 0 ? '+' : ''}$${fmt(tpNet)}</span>
      </div>`;
  });

  // ── SL ──
  const sls = [1, 5, 10];
  slRows.innerHTML = '';

  sls.forEach(p => {
    const r = p / 100;
    const slGross = posSize * r;
    const slNet = -(slGross + totalFee);

    slRows.innerHTML += `
      <div class="sugg-row">
        <span>-${p}%</span>
        <span>${fmtPrice(type === 'long' ? cp * (1 - r) : cp * (1 + r))}</span>
        <span>${fmt(slNet)}</span>
      </div>`;
  });
}

// ── INIT ──
calculate();
