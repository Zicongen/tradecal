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
 
  const profitValue   = document.getElementById('profitValue');
  const profitPercent = document.getElementById('profitPercent');
  const metaType      = document.getElementById('metaType');
  const metaLeverage  = document.getElementById('metaLeverage');
  const metaRoi       = document.getElementById('metaRoi');
  const metaFee       = document.getElementById('metaFee');
  const metaGross     = document.getElementById('metaGross');
  const feeRow        = document.getElementById('feeRow');
  const grossRow      = document.getElementById('grossRow');
  const feeTypePill   = document.getElementById('feeTypePill');
  const tpRows        = document.getElementById('tpRows');
  const slRows        = document.getElementById('slRows');
  const profitCard    = document.getElementById('profitCard');
  const positionInfo  = document.getElementById('positionInfo');
  const positionSize  = document.getElementById('positionSize');
  const entryFeeTag   = document.getElementById('entryFeeTag');
  const exitFeeTag    = document.getElementById('exitFeeTag');
 
  const MAKER_FEE = 0.00020; // 0.020%
  const TAKER_FEE = 0.00050; // 0.050%
 
  // ── Helpers ──
  function fmt(n) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
 
  function fmtPrice(p) {
    return '$' + p.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
 
  function animateEl(el) {
    el.classList.remove('value-updated');
    void el.offsetWidth;
    el.classList.add('value-updated');
  }
 
  function getTradeType() { for (const r of tradeRadios) if (r.checked) return r.value; return 'long'; }
  function getLeverage()  { return parseInt(leverageSlider.value, 10); }
 
  function getEntryOrderType() {
    for (const r of entryTypeRadios) if (r.checked) return r.value;
    return 'market';
  }
 
  function getExitOrderType() {
    for (const r of exitTypeRadios) if (r.checked) return r.value;
    return 'market';
  }
 
  // Update fee tag hints under each price field
  function updateFeeTags() {
    const entryType = getEntryOrderType();
    const exitType  = getExitOrderType();
    entryFeeTag.textContent = entryType === 'limit'
      ? 'Entry fee: 0.020% (Maker)'
      : 'Entry fee: 0.050% (Taker)';
    exitFeeTag.textContent = exitType === 'limit'
      ? 'Exit fee: 0.020% (Maker)'
      : 'Exit fee: 0.050% (Taker)';
  }
 
  // ── Leverage UI sync ──
  function setLeverage(val) {
    val = Math.max(1, Math.min(100, parseInt(val)));
    leverageSlider.value = val;
    leverageDisplay.textContent = val + '×';
    levBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.lev) === val));
    calculate();
  }
 
  leverageSlider.addEventListener('input', () => setLeverage(leverageSlider.value));
  levBtns.forEach(b => b.addEventListener('click', () => setLeverage(b.dataset.lev)));
 
  // ── Order type listeners ──
  entryTypeRadios.forEach(r => r.addEventListener('change', () => { updateFeeTags(); calculate(); }));
  exitTypeRadios.forEach(r  => r.addEventListener('change', () => { updateFeeTags(); calculate(); }));
 
  // ── Main calc ──
  function calculate() {
    const cp       = parseFloat(currentPriceEl.value);
    const fp       = parseFloat(futurePriceEl.value);
    const margin   = parseFloat(amountEl.value);
    const type     = getTradeType();
    const leverage = getLeverage();
    const entryOrderType = getEntryOrderType();
    const exitOrderType  = getExitOrderType();
 
    metaType.textContent     = type === 'long' ? '⚡ Long' : '⚡ Short';
    metaLeverage.textContent = leverage + '× Leverage';
 
    if (!cp || !fp || !margin || cp <= 0 || fp <= 0 || margin <= 0) {
      profitValue.textContent    = '$—';
      profitPercent.textContent  = 'Enter your trade details';
      metaRoi.textContent        = 'ROI: —';
      feeRow.style.display       = 'none';
      grossRow.style.display     = 'none';
      positionInfo.style.display = 'none';
      tpRows.innerHTML           = '<div class="empty-state">Fill in your trade to see targets ↑</div>';
      slRows.innerHTML           = '<div class="empty-state">Fill in your trade to see levels ↑</div>';
      profitCard.style.background = 'linear-gradient(135deg, var(--g700) 0%, var(--g600) 60%, var(--g500) 100%)';
      return;
    }
 
    // Position size = margin × leverage
    const posSize = margin * leverage;
 
    // Entry and exit values (both use same position size)
    const entryValue = posSize;
    const exitValue  = posSize;
 
    // Fee rates based on order type
    const entryFeeRate = entryOrderType === 'limit' ? MAKER_FEE : TAKER_FEE;
    const exitFeeRate  = exitOrderType  === 'limit' ? MAKER_FEE : TAKER_FEE;
 
    // Fees
    const entryFee = entryValue * entryFeeRate;
    const exitFee  = exitValue  * exitFeeRate;
    const totalFee = entryFee + exitFee;
 
    // Price change ratio
    const pricePctChange = (fp - cp) / cp;
 
    // Long profits on up, short profits on down
    const multiplier = type === 'long' ? 1 : -1;
 
    // Gross PnL (leveraged, before fees)
    const grossPnl = posSize * pricePctChange * multiplier;
 
    // Net profit
    const netProfit = grossPnl - totalFee;
    const roi       = (netProfit / margin) * 100;
    const absMovePct = Math.abs(pricePctChange * 100);
    const isGain = netProfit >= 0;
 
    // Fee pill label
    const entryLabel = entryOrderType === 'limit' ? 'Maker' : 'Taker';
    const exitLabel  = exitOrderType  === 'limit' ? 'Maker' : 'Taker';
    feeTypePill.textContent = `Entry:${entryLabel} · Exit:${exitLabel}`;
    feeTypePill.className   = 'fee-pill';
 
    // ── Profit card ──
    animateEl(profitValue);
    profitValue.textContent   = (isGain ? '+' : '-') + '$' + fmt(Math.abs(netProfit));
    profitPercent.textContent = (isGain ? '▲' : '▼') + ' ' + fmt(absMovePct) + '% price move · ' + leverage + '× leverage';
    metaRoi.textContent       = 'ROI: ' + (isGain ? '+' : '') + fmt(roi) + '%';
    metaFee.textContent       = '-$' + fmt(totalFee);
    metaGross.textContent     = (grossPnl >= 0 ? '+' : '') + '$' + fmt(grossPnl);
 
    feeRow.style.display       = 'flex';
    grossRow.style.display     = 'flex';
    positionInfo.style.display = 'flex';
    positionSize.textContent   = '$' + fmt(posSize) + ' (' + leverage + '× margin)';
 
    profitCard.style.background = isGain
      ? 'linear-gradient(135deg, var(--g700) 0%, var(--g600) 60%, var(--g500) 100%)'
      : 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 60%, #ef4444 100%)';
 
    // ── Take Profit targets ──
    // For TP suggestions, assume exit uses same exit order type chosen by user
    const tpExitFeeRate = exitFeeRate;
    const tpPcts   = [1, 5, 10];
    const tpLabels = ['Conservative', 'Moderate', 'Aggressive'];
 
    let tpHTML = '';
    tpPcts.forEach((pct, i) => {
      const ratio = pct / 100;
      const tpPrice = type === 'long' ? cp * (1 + ratio) : cp * (1 - ratio);
      const tpGross = posSize * ratio;
      const tpTotalFee = entryFee + (exitValue * tpExitFeeRate);
      const tpNet   = tpGross - tpTotalFee;
      const tpRoi   = (tpNet / margin) * 100;
 
      tpHTML += `
        <div class="sugg-row">
          <div class="sugg-row-left">
            <span class="sugg-badge">+${pct}%</span>
            <span class="sugg-label">${tpLabels[i]}</span>
          </div>
          <div class="sugg-values">
            <span class="sugg-price">${fmtPrice(tpPrice)}</span>
            <span class="sugg-gain">${tpNet >= 0 ? '+' : ''}$${fmt(tpNet)} &nbsp;·&nbsp; ROI ${fmt(tpRoi)}%</span>
          </div>
        </div>`;
    });
    tpRows.innerHTML = tpHTML;
 
    // ── Stop Loss levels ──
    const slPcts   = [1, 5, 10];
    const slLabels = ['Tight', 'Standard', 'Wide'];
 
    let slHTML = '';
    slPcts.forEach((pct, i) => {
      const ratio = pct / 100;
      const slPrice = type === 'long' ? cp * (1 - ratio) : cp * (1 + ratio);
      const slGross = posSize * ratio;
      const slTotalFee = entryFee + (exitValue * tpExitFeeRate);
      const slNet   = slGross + slTotalFee;
      const slRoi   = -(slNet / margin) * 100;
 
      slHTML += `
        <div class="sugg-row">
          <div class="sugg-row-left">
            <span class="sugg-badge sl">-${pct}%</span>
            <span class="sugg-label">${slLabels[i]}</span>
          </div>
          <div class="sugg-values">
            <span class="sugg-price sl-price">${fmtPrice(slPrice)}</span>
            <span class="sugg-gain sl-gain">-$${fmt(slNet)} &nbsp;·&nbsp; ROI ${fmt(slRoi)}%</span>
          </div>
        </div>`;
    });
    slRows.innerHTML = slHTML;
  }
 
  // ── Listeners ──
  [currentPriceEl, futurePriceEl, amountEl].forEach(el => el.addEventListener('input', calculate));
  tradeRadios.forEach(r => r.addEventListener('change', calculate));
 
  // init
  updateFeeTags();
  calculate();
