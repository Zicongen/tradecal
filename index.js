// ── Constants ──
const MAKER_FEE  = 0.0002;  // 0.020%
const TAKER_FEE  = 0.0005;  // 0.050%
const MAINT_RATE = 0;   // 0% maintenance margin
 
// ── DOM ──
const entryEl    = document.getElementById('currentPrice');
const exitEl     = document.getElementById('futurePrice');
const marginEl   = document.getElementById('amount');
const leverSlider= document.getElementById('leverageSlider');
const leverDisp  = document.getElementById('leverageDisplay');
const levBtns    = document.querySelectorAll('.lev-btn');
const tradeRadios= document.querySelectorAll('input[name="trade"]');
const entryRadios= document.querySelectorAll('input[name="entryType"]');
const exitRadios = document.querySelectorAll('input[name="exitType"]');
 
const profitValue  = document.getElementById('profitValue');
const profitPct    = document.getElementById('profitPercent');
const metaType     = document.getElementById('metaType');
const metaLeverage = document.getElementById('metaLeverage');
const metaRoi      = document.getElementById('metaRoi');
const metaGross    = document.getElementById('metaGross');
const metaFee      = document.getElementById('metaFee');
const detailRows   = document.getElementById('detailRows');
const profitCard   = document.getElementById('profitCard');
const positionSize = document.getElementById('positionSize');
const entryFeeTag  = document.getElementById('entryFeeTag');
const exitFeeTag   = document.getElementById('exitFeeTag');
const tpRows       = document.getElementById('tpRows');
const slRows       = document.getElementById('slRows');
 
const liqPriceValue= document.getElementById('liqPriceValue');
const liqBody      = document.getElementById('liqBody');
const liqDistPct   = document.getElementById('liqDistPct');
const liqBadge     = document.getElementById('liqBadge');
const liqBarFill   = document.getElementById('liqBarFill');
const liqBarLabel  = document.getElementById('liqBarLabel');
 
// ── Helpers ──
function fmtN(n, d=4) {
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtUSD(n, d=2) {
  return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtSign(n, d=2) {
  const s = n >= 0 ? '+' : '−';
  return s + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function flash(el) {
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}
 
function getRadio(radios) {
  for (const r of radios) if (r.checked) return r.value;
}
 
// ── Liquidation Price ──
// Cross-margin isolated liq formula:
//   Long:  LiqPrice = Entry × (1 − 1/L + MMR + entryFeeRate)
//   Short: LiqPrice = Entry × (1 + 1/L − MMR − entryFeeRate)
//
// Derivation:
//   Account equity at liq = MaintenanceMargin
//   Equity = Margin + UnrealizedPnL - Fees
//   For Long:  UnrealizedPnL = posSize × (liq/entry − 1)
//              Equity = Margin + posSize×(liq/entry − 1) − entryFee
//              At liq: Equity = posSize × MMR  (maintenance margin)
//   Solving for liq gives the formula above.
//
//   Short: price moves opposite direction.
function calcLiqPrice(entry, leverage, type, entryFeeRate) {
  if (type === 'long') {
    return entry * (1 - 1/leverage  + entryFeeRate);
  } else {
    // Short liq is above entry; entry fee increases required equity so liq is also slightly higher
    return entry * (1 + 1/leverage  - entryFeeRate);
  }
}
 
// ── Fee rate getters ──
function entryFeeRate() { return getRadio(entryRadios) === 'limit' ? MAKER_FEE : TAKER_FEE; }
function exitFeeRate()  { return getRadio(exitRadios)  === 'limit' ? MAKER_FEE : TAKER_FEE; }
 
// ── Update fee tags ──
function updateFeeTags() {
  const eType = getRadio(entryRadios);
  const xType = getRadio(exitRadios);
  entryFeeTag.textContent = eType === 'limit' ? 'Entry: 0.020% (Maker)' : 'Entry: 0.050% (Taker)';
  exitFeeTag.textContent  = xType === 'limit' ? 'Exit: 0.020% (Maker)'  : 'Exit: 0.050% (Taker)';
}
 
// ── Leverage UI ──
function setLeverage(v) {
  v = Math.max(1, Math.min(100, parseInt(v, 10)));
  leverSlider.value = v;
  leverDisp.textContent = v + '×';
  levBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.lev) === v));
  calculate();
}
leverSlider.addEventListener('input', () => setLeverage(leverSlider.value));
levBtns.forEach(b => b.addEventListener('click', () => setLeverage(b.dataset.lev)));
 
// ── Main ──
function calculate() {
  const cp     = parseFloat(entryEl.value);
  const fp     = parseFloat(exitEl.value);
  const margin = parseFloat(marginEl.value);
  const type   = getRadio(tradeRadios);
  const lev    = parseInt(leverSlider.value, 10);
  const ef     = entryFeeRate();
  const xf     = exitFeeRate();
 
  metaType.textContent     = type === 'long' ? '⬆ Long' : '⬇ Short';
  metaLeverage.textContent = lev + '× Leverage';
 
  // ── Liq card (only needs entry price) ──
  if (cp > 0 && lev > 0) {
    const liqPrice  = calcLiqPrice(cp, lev, type, ef);
    const distPct   = Math.abs((liqPrice - cp) / cp) * 100;
 
    liqPriceValue.textContent = fmtUSD(liqPrice, 4);
    liqPriceValue.className   = 'liq-price-val';
    liqBody.style.display     = 'block';
 
    liqDistPct.textContent = fmtN(distPct, 2) + '%';
    liqBarLabel.textContent = fmtN(distPct, 2) + '% away from liquidation';
 
    const fillPct = Math.min(98, Math.max(2, 100 - distPct));
    liqBarFill.style.width = fillPct + '%';
 
    liqDistPct.className = distPct >= 20 ? 'liq-pct safe' : 'liq-pct risky';
 
    if (distPct < 5) {
      liqBadge.textContent = '🔥 EXTREME DANGER';
      liqBadge.className   = 'liq-badge danger';
    } else if (distPct < 15) {
      liqBadge.textContent = '⚠ HIGH RISK';
      liqBadge.className   = 'liq-badge danger';
    } else if (distPct < 30) {
      liqBadge.textContent = '⚠ MODERATE RISK';
      liqBadge.className   = 'liq-badge';
    } else {
      liqBadge.textContent = '🟢 LOWER RISK';
      liqBadge.className   = 'liq-badge safe';
    }
  } else {
    liqPriceValue.textContent = 'Enter trade details';
    liqPriceValue.className   = 'liq-price-val empty';
    liqBody.style.display     = 'none';
  }
 
  // ── PnL needs all three inputs ──
  if (!cp || !fp || !margin || cp <= 0 || fp <= 0 || margin <= 0) {
    profitValue.textContent   = '$—';
    profitValue.className     = '';
    profitPct.textContent     = 'Enter your trade details';
    metaRoi.textContent       = 'ROI: —';
    detailRows.style.display  = 'none';
    profitCard.classList.remove('loss');
    tpRows.innerHTML = '<div class="empty-state">Fill in your trade to see targets ↑</div>';
    slRows.innerHTML = '<div class="empty-state">Fill in your trade to see levels ↑</div>';
    return;
  }
 
  // ── Core calculations ──
  // Position (notional) size
  const posSize = margin * lev;
 
  // Fees are based on notional value
  // Entry fee: on entry notional (posSize at entry price)
  // Exit fee:  on exit notional (posSize × exitPrice/entryPrice)
  //            simplified: we use posSize for entry notional; exit notional = posSize × (fp/cp)
  const entryNotional = posSize;                         // notional at entry
  const exitNotional  = posSize * (fp / cp);             // notional at actual exit price
 
  const entryFee  = entryNotional * ef;
  const exitFee   = exitNotional  * xf;
  const totalFee  = entryFee + exitFee;
 
  // PnL direction: long profits when fp > cp, short profits when fp < cp
  const priceDelta = (fp - cp) / cp;
  const grossPnl   = posSize * priceDelta * (type === 'long' ? 1 : -1);
  const netProfit  = grossPnl - totalFee;
  const roi        = (netProfit / margin) * 100;
  const isGain     = netProfit >= 0;
 
  // ── Update UI ──
  flash(profitValue);
  profitValue.textContent = fmtSign(netProfit,4);
  profitValue.className   = isGain ? '' : 'loss';
 
  const absMove = Math.abs(priceDelta * 100);
  profitPct.textContent = (isGain ? '▲' : '▼') + ' ' + fmtN(absMove, 2) + '% price move · ' + lev + '× leverage';
 
  metaRoi.textContent  = 'ROI: ' + (roi >= 0 ? '+' : '') + fmtN(roi, 2) + '%';
  metaGross.textContent= fmtSign(grossPnl);
  metaFee.textContent  = '−' + fmtUSD(totalFee, 4);
 
  positionSize.textContent = fmtUSD(posSize, 2) + ' (' + lev + '× on ' + fmtUSD(margin, 2) + ')';
  detailRows.style.display = 'flex';
 
  if (isGain) {
    profitCard.style.background = 'linear-gradient(135deg,#0d1f18 0%,#112419 60%,#162c1f 100%)';
    profitCard.style.borderColor= 'rgba(0,229,160,.25)';
    profitCard.classList.remove('loss');
  } else {
    profitCard.style.background = 'linear-gradient(135deg,#1f0d0d 0%,#241111 60%,#2c1212 100%)';
    profitCard.style.borderColor= 'rgba(255,77,77,.25)';
    profitCard.classList.add('loss');
  }
 
  // ── Take Profit rows ──
  // Correct TP PnL:
  //   - tpGross = posSize × (tpPrice/cp − 1) × direction_multiplier
  //   - tpExitFee = (posSize × tpPrice/cp) × xf   ← exit at TP notional
  //   - tpNet = tpGross − entryFee − tpExitFee
  const tpDefs = [
    { pct: 1,  label: 'Conservative' },
    { pct: 5,  label: 'Moderate'     },
    { pct: 10, label: 'Aggressive'   },
  ];
  let tpHTML = '';
  tpDefs.forEach(({ pct, label }) => {
    const ratio    = pct / 100;
    const tpPrice  = type === 'long' ? cp * (1 + ratio) : cp * (1 - ratio);
    const tpNotional = posSize * (tpPrice / cp);
    const tpGross  = posSize * ratio;          // always positive (we pick the right direction)
    const tpFeeExit= tpNotional * xf;
    const tpNet    = tpGross - entryFee - tpFeeExit;
    const tpRoi    = (tpNet / margin) * 100;
 
    tpHTML += `
      <div class="sugg-row">
        <div class="sugg-left">
          <span class="sugg-badge">+${pct}%</span>
          <span class="sugg-name">${label}</span>
        </div>
        <div class="sugg-right">
          <span class="sugg-price">${fmtUSD(tpPrice, 4)}</span>
          <span class="sugg-gain">${fmtSign(tpNet)} · ROI ${fmtN(tpRoi, 2)}%</span>
        </div>
      </div>`;
  });
  tpRows.innerHTML = tpHTML;
 
  // ── Stop Loss rows ──
  // Correct SL PnL:
  //   - slGross = −(posSize × ratio)                ← negative: we lost this
  //   - slExitFee = (posSize × slPrice/cp) × xf     ← exit at SL notional
  //   - slNet = slGross − entryFee − slExitFee       ← both are costs
  const slDefs = [
    { pct: 1,  label: 'Tight'    },
    { pct: 5,  label: 'Standard' },
    { pct: 10, label: 'Wide'     },
  ];
  let slHTML = '';
  slDefs.forEach(({ pct, label }) => {
    const ratio    = pct / 100;
    const slPrice  = type === 'long' ? cp * (1 - ratio) : cp * (1 + ratio);
    const slNotional = posSize * (slPrice / cp);
    const slGross  = -(posSize * ratio);       // negative (loss on position)
    const slFeeExit= slNotional * xf;
    const slNet    = slGross - entryFee - slFeeExit;  // negative total
    const slRoi    = (slNet / margin) * 100;   // negative ROI
 
    slHTML += `
      <div class="sugg-row">
        <div class="sugg-left">
          <span class="sugg-badge sl">−${pct}%</span>
          <span class="sugg-name">${label}</span>
        </div>
        <div class="sugg-right">
          <span class="sugg-price" style="color:var(--red)">${fmtUSD(slPrice, 4)}</span>
          <span class="sugg-loss">${fmtSign(slNet)} · ROI ${fmtN(slRoi, 2)}%</span>
        </div>
      </div>`;
  });
  slRows.innerHTML = slHTML;
}
 
// ── Event Listeners ──
[entryEl, exitEl, marginEl].forEach(el => el.addEventListener('input', calculate));
tradeRadios.forEach(r  => r.addEventListener('change', calculate));
entryRadios.forEach(r  => r.addEventListener('change', () => { updateFeeTags(); calculate(); }));
exitRadios.forEach(r   => r.addEventListener('change', () => { updateFeeTags(); calculate(); }));
 
// ── Init ──
updateFeeTags();
calculate();
