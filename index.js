
  const currentPriceEl = document.getElementById('currentPrice');
  const futurePriceEl  = document.getElementById('futurePrice');
  const amountEl       = document.getElementById('amount');
  const tradeRadios    = document.querySelectorAll('input[name="trade"]');

  const profitValue   = document.getElementById('profitValue');
  const profitPercent = document.getElementById('profitPercent');
  const metaType      = document.getElementById('metaType');
  const metaRoi       = document.getElementById('metaRoi');
  const tpRows        = document.getElementById('tpRows');
  const slRows        = document.getElementById('slRows');
  const profitCard    = document.getElementById('profitCard');

  function fmt(n, decimals = 2) {
    return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function fmtPrice(p) {
    if (p >= 1000)  return '$' + fmt(p, 2);
    if (p >= 1)     return '$' + fmt(p, 4);
    return '$' + fmt(p, 6);
  }

  function animateEl(el) {
    el.classList.remove('value-updated');
    void el.offsetWidth;
    el.classList.add('value-updated');
  }

  function getTradeType() {
    for (const r of tradeRadios) if (r.checked) return r.value;
    return 'long';
  }

  function calculate() {
    const cp   = parseFloat(currentPriceEl.value);
    const fp   = parseFloat(futurePriceEl.value);
    const amt  = parseFloat(amountEl.value);
    const type = getTradeType();

    metaType.textContent = type === 'long' ? '⚡ Long' : '⚡ Short';

    if (!cp || !fp || !amt || cp <= 0 || fp <= 0 || amt <= 0) {
      profitValue.textContent   = '$—';
      profitPercent.textContent = 'Enter your trade details';
      metaRoi.textContent       = 'ROI: —';
      tpRows.innerHTML          = '<div class="empty-state">Fill in your trade to see targets ↑</div>';
      slRows.innerHTML          = '<div class="empty-state">Fill in your trade to see levels ↑</div>';
      profitCard.style.background = 'linear-gradient(135deg, var(--g700) 0%, var(--g600) 60%, var(--g500) 100%)';
      return;
    }

    // ── Core calc ─────────────────────────────────────────
    const priceDiff = fp - cp;
    const pctChange = (priceDiff / cp) * 100;
    const multiplier = type === 'long' ? 1 : -1;
    const profit    = amt * (pctChange / 100) * multiplier;
    const roi       = (profit / amt) * 100;

    const isGain = profit >= 0;

    // ── Profit card ───────────────────────────────────────
    animateEl(profitValue);
    profitValue.textContent   = (isGain ? '+' : '-') + '$' + fmt(Math.abs(profit));
    profitPercent.textContent = (isGain ? '▲' : '▼') + ' ' + fmt(Math.abs(pctChange)) + '% price move';
    metaRoi.textContent       = 'ROI: ' + (isGain ? '+' : '') + fmt(roi) + '%';

    if (!isGain) {
      profitCard.style.background = 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 60%, #ef4444 100%)';
    } else {
      profitCard.style.background = 'linear-gradient(135deg, var(--g700) 0%, var(--g600) 60%, var(--g500) 100%)';
    }

    // ── Take Profit suggestions ────────────────────────────
    const tpPcts = [1, 5, 10];
    const tpLabels = ['Conservative', 'Moderate', 'Aggressive'];

    let tpHTML = '';
    tpPcts.forEach((pct, i) => {
      let tpPrice, tpProfit;
      if (type === 'long') {
        tpPrice  = cp * (1 + pct / 100);
        tpProfit = amt * (pct / 100);
      } else {
        tpPrice  = cp * (1 - pct / 100);
        tpProfit = amt * (pct / 100);
      }
      tpHTML += `
        <div class="sugg-row">
          <div class="sugg-row-left">
            <span class="sugg-badge">+${pct}%</span>
            <span class="sugg-label">${tpLabels[i]}</span>
          </div>
          <div class="sugg-values">
            <span class="sugg-price">${fmtPrice(tpPrice)}</span>
            <span class="sugg-gain">+$${fmt(tpProfit)}</span>
          </div>
        </div>`;
    });
    tpRows.innerHTML = tpHTML;

    // ── Stop Loss suggestions ──────────────────────────────
    const slPcts   = [1, 5, 10];
    const slLabels = ['Tight', 'Standard', 'Wide'];

    let slHTML = '';
    slPcts.forEach((pct, i) => {
      let slPrice, slLoss;
      if (type === 'long') {
        slPrice = cp * (1 - pct / 100);
        slLoss  = amt * (pct / 100);
      } else {
        slPrice = cp * (1 + pct / 100);
        slLoss  = amt * (pct / 100);
      }
      slHTML += `
        <div class="sugg-row">
          <div class="sugg-row-left">
            <span class="sugg-badge sl">-${pct}%</span>
            <span class="sugg-label">${slLabels[i]}</span>
          </div>
          <div class="sugg-values">
            <span class="sugg-price sl-price">${fmtPrice(slPrice)}</span>
            <span class="sugg-gain sl-gain">-$${fmt(slLoss)}</span>
          </div>
        </div>`;
    });
    slRows.innerHTML = slHTML;
  }

  // ── Live listeners ─────────────────────────────────────
  [currentPriceEl, futurePriceEl, amountEl].forEach(el => el.addEventListener('input', calculate));
  tradeRadios.forEach(r => r.addEventListener('change', calculate));

