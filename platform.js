/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Tradersbloc Platform â€” platform.js
   Real-time market prices Â· Genuine win/loss
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* â”€â”€â”€ SESSION â”€â”€â”€ */
function getSession()      { return JSON.parse(localStorage.getItem('tc_session') || 'null'); }
function saveSession(u)    { localStorage.setItem('tc_session', JSON.stringify(u)); }
function getUsers()        { return JSON.parse(localStorage.getItem('tc_users') || '[]'); }
function saveUsers(u)      { localStorage.setItem('tc_users', JSON.stringify(u)); }

function persistUser(user) {
  saveSession(user);
  const users = getUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx >= 0) { users[idx] = user; saveUsers(users); }
}

let currentUser = getSession();
if (!currentUser) window.location.href = 'login.html';
currentUser.trades       = currentUser.trades       || [];
currentUser.transactions = currentUser.transactions || [];

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ASSETS
   symbol  â€” used for price feed lookup
   wsKey   â€” Twelve Data WebSocket subscribe key
   restSym â€” Finnhub REST symbol (fallback)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const ASSETS = [
  { flag:'ðŸ‡ªðŸ‡ºðŸ‡ºðŸ‡¸', name:'EUR/USD', cat:'Forex',     ret:82, symbol:'EUR/USD', tdSym:'EUR/USD', fhSym:'OANDA:EUR_USD', base:1.08542,  dp:5, vol:0.00020 },
  { flag:'ðŸ‡¬ðŸ‡§ðŸ‡ºðŸ‡¸', name:'GBP/USD', cat:'Forex',     ret:82, symbol:'GBP/USD', tdSym:'GBP/USD', fhSym:'OANDA:GBP_USD', base:1.27310,  dp:5, vol:0.00022 },
  { flag:'ðŸ‡ºðŸ‡¸ðŸ‡¯ðŸ‡µ', name:'USD/JPY', cat:'Forex',     ret:80, symbol:'USD/JPY', tdSym:'USD/JPY', fhSym:'OANDA:USD_JPY', base:153.420,  dp:3, vol:0.04000 },
  { flag:'â‚¿',      name:'BTC/USD', cat:'Crypto',    ret:85, symbol:'BTC/USD', tdSym:'BTC/USD', fhSym:'BINANCE:BTCUSDT', base:63450,  dp:2, vol:120.000 },
  { flag:'Îž',      name:'ETH/USD', cat:'Crypto',    ret:85, symbol:'ETH/USD', tdSym:'ETH/USD', fhSym:'BINANCE:ETHUSDT', base:3480,   dp:2, vol:8.0000  },
  { flag:'ðŸ¥‡',     name:'GOLD',    cat:'Commodity', ret:80, symbol:'XAU/USD', tdSym:'XAU/USD', fhSym:'OANDA:XAU_USD',  base:2348.5, dp:2, vol:1.2000  },
  { flag:'ðŸ›¢ï¸',   name:'OIL/WTI', cat:'Commodity', ret:75, symbol:'WTI/USD', tdSym:'WTI/USD', fhSym:'OANDA:WTICO_USD',base:82.45,  dp:2, vol:0.1500  },
  { flag:'ðŸ“ˆ',     name:'US500',   cat:'Index',     ret:78, symbol:'SPX',     tdSym:'SPX',     fhSym:'OANDA:SPX500_USD',base:5280,  dp:2, vol:4.0000  },
  { flag:'ðŸ’»',     name:'US100',   cat:'Index',     ret:78, symbol:'NDX',     tdSym:'NDX',     fhSym:'OANDA:NAS100_USD',base:18420, dp:2, vol:18.000  },
  { flag:'ðŸŽ',     name:'APPLE',   cat:'Stock',     ret:76, symbol:'AAPL',    tdSym:'AAPL',    fhSym:'AAPL',            base:189.30, dp:2, vol:0.3500  },
];

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STATE
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
let currentAssetIdx  = 0;
let currentPrice     = ASSETS[0].base;
let priceHistory     = [];
let chartCandles     = [];
let activeTradeTimer = null;
let activeTrade      = null;
let currentExpiry    = 30;
let currentAmount    = 10;
let chartTimeframe   = 60;

// Price-feed state
let priceWs          = null;    // active WebSocket
let lastFetchTime    = 0;       // last REST poll timestamp
let priceTickInterval = null;   // chart tick interval

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   DOM REFS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const topBalEl      = document.getElementById('topBalance');
const sideBalEl     = document.getElementById('sideBalance');
const walletBalEl   = document.getElementById('walletBalance');
const livePriceEl   = document.getElementById('livePrice');
const priceChangeEl = document.getElementById('priceChange');
const buyBtn        = document.getElementById('buyBtn');
const sellBtn       = document.getElementById('sellBtn');
const tradeOverlay  = document.getElementById('tradeOverlay');
const resultModal   = document.getElementById('resultModal');

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   BALANCE HELPERS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function updateBalanceDisplay() {
  const d = "$" + currentUser.balance.toFixed(2);
  topBalEl.textContent    = d;
  sideBalEl.textContent   = d;
  walletBalEl.textContent = d;
  
  // Show badge colour for $0 real accounts
  const isReal  = (currentUser.accountType || "real") === "real";
  const isEmpty = currentUser.balance <= 0;
  
  topBalEl.style.color  = (isReal && isEmpty) ? "var(--red)" : "var(--primary)";
  sideBalEl.style.color = (isReal && isEmpty) ? "var(--red)" : "var(--primary)";
  
  // Show/hide low balance warning
  const warningEl = document.getElementById('lowBalanceWarning');
  if (warningEl) {
    if (isReal && isEmpty) {
      warningEl.style.display = 'block';
    } else {
      warningEl.style.display = 'none';
    }
  }
  
  // Disable trade buttons if balance is 0
  if (isReal && isEmpty) {
    buyBtn.disabled = true;
    sellBtn.disabled = true;
    buyBtn.title = 'Deposit funds to start trading';
    sellBtn.title = 'Deposit funds to start trading';
  } else {
    buyBtn.disabled = false;
    sellBtn.disabled = false;
    buyBtn.title = '';
    sellBtn.title = '';
  }
}

// Account type badge
function updateAccountBadge() {
  const badge = document.getElementById("accountTypeBadge");
  if (!badge) return;
  const type = currentUser.accountType || "real";
  badge.textContent        = type === "demo" ? "Demo" : "Real";
  badge.className          = "acct-badge " + (type === "demo" ? "demo" : "real");
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   DECIMAL PLACES
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const asset = () => ASSETS[currentAssetIdx];
const dp    = () => asset().dp;

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   REAL-TIME PRICE FEED
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Strategy (in order of preference):
   1. Twelve Data WebSocket (free, no key for common FX/crypto)
   2. Twelve Data REST /price endpoint (free tier, 8 req/min)
   3. CoinGecko REST for crypto (no key)
   4. Realistic simulation seeded from last known price
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

// â”€â”€ Price update entry-point called by every source â”€â”€
function onNewPrice(newPrice) {
  if (!newPrice || isNaN(newPrice) || newPrice <= 0) return;
  lastFetchTime = Date.now();   // mark liveness for simulation guard

  const prev    = currentPrice;
  currentPrice  = newPrice;

  const diff   = currentPrice - prev;
  const diffPc = prev > 0 ? (diff / prev * 100) : 0;
  const isUp   = diff >= 0;

  livePriceEl.textContent = currentPrice.toFixed(dp());
  livePriceEl.style.color = isUp ? 'var(--green)' : 'var(--red)';
  priceChangeEl.textContent =
    (isUp ? 'â–² +' : 'â–¼ ') + Math.abs(diff).toFixed(dp()) +
    '  (' + (isUp ? '+' : '') + diffPc.toFixed(2) + '%)';
  priceChangeEl.className = 'price-change ' + (isUp ? 'up' : 'down');

  updateChartTick(newPrice);
  updateStats();
}

/* â”€â”€ Twelve Data WebSocket â”€â”€ */
// Free tier supports FX & crypto without an API key via the public quote endpoint
const TD_WS_URL = 'wss://ws.twelvedata.com/v1/quotes/price?apikey=demo';

function connectTwelveDataWS() {
  try {
    if (priceWs) { try { priceWs.close(); } catch(_) {} }

    priceWs = new WebSocket(TD_WS_URL);

    priceWs.onopen = () => {
      console.log('[Feed] Twelve Data WS connected');
      const a = asset();
      priceWs.send(JSON.stringify({
        action: 'subscribe',
        params: { symbols: a.tdSym }
      }));
    };

    priceWs.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.event === 'price' && msg.price) {
          onNewPrice(parseFloat(msg.price));
        }
      } catch(_) {}
    };

    priceWs.onerror = () => {
      console.warn('[Feed] WS error â€” falling back to REST polling');
      fallbackToRest();
    };

    priceWs.onclose = () => {
      // Reconnect after 5s unless we're deliberately closed
      setTimeout(() => {
        if (priceWs && priceWs.readyState >= 2) connectTwelveDataWS();
      }, 5000);
    };

  } catch (err) {
    console.warn('[Feed] WS init failed:', err.message);
    fallbackToRest();
  }
}

/* â”€â”€ Twelve Data REST (FX, stocks, indices) â”€â”€ */
async function fetchTwelveDataREST() {
  const a = asset();
  try {
    const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(a.tdSym)}&apikey=demo`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.price) {
      onNewPrice(parseFloat(data.price));
      return true;
    }
  } catch (err) {
    console.warn('[Feed] Twelve Data REST failed:', err.message);
  }
  return false;
}

/* â”€â”€ CoinGecko REST (crypto only, no key) â”€â”€ */
const COINGECKO_IDS = {
  'BTC/USD': 'bitcoin',
  'ETH/USD': 'ethereum',
};
async function fetchCoinGecko() {
  const a  = asset();
  const id = COINGECKO_IDS[a.name];
  if (!id) return false;
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const price = data[id]?.usd;
    if (price) { onNewPrice(parseFloat(price)); return true; }
  } catch (err) {
    console.warn('[Feed] CoinGecko failed:', err.message);
  }
  return false;
}

/* â”€â”€ Fallback: realistic simulation seeded from current price â”€â”€ */
function simulatedTick() {
  const a    = asset();
  const vol  = a.vol;
  // Slight mean-reversion + random walk
  const drift = (Math.random() - 0.499) * vol * 2;
  const newPrice = Math.max(0.0001, currentPrice + drift);
  onNewPrice(newPrice);
}

/* â”€â”€ REST poll loop (runs when WS unavailable) â”€â”€ */
let restPollTimer = null;
function fallbackToRest() {
  if (restPollTimer) return;   // already running
  console.log('[Feed] Starting REST poll loop');

  async function poll() {
    const a = asset();
    let fetched = false;

    // Try CoinGecko first for crypto (more reliable, no key)
    if (['BTC/USD','ETH/USD'].includes(a.name)) {
      fetched = await fetchCoinGecko();
    }
    if (!fetched) {
      fetched = await fetchTwelveDataREST();
    }
    // If both fail, simulate
    if (!fetched) simulatedTick();
  }

  poll();
  restPollTimer = setInterval(poll, 5000);  // every 5s
}

/* â”€â”€ Simulation tick (runs at 800ms for chart smoothness regardless of data source) â”€â”€ */
function startChartTicks() {
  if (priceTickInterval) clearInterval(priceTickInterval);
  priceTickInterval = setInterval(() => {
    // Only simulate if the last real price is stale (>8s)
    if (Date.now() - lastFetchTime > 8000) {
      simulatedTick();
    }
    // Always redraw the chart
    drawChart();
    updateStats();
  }, 800);
}

/* â”€â”€ Start feed for current asset â”€â”€ */
function startPriceFeed() {
  // Clear any existing REST poll
  if (restPollTimer) { clearInterval(restPollTimer); restPollTimer = null; }

  // Try WebSocket first â€” it auto-falls-back to REST on error
  connectTwelveDataWS();

  // Also do an immediate REST fetch so we don't wait for WS connection
  setTimeout(async () => {
    const a = asset();
    let ok = false;
    if (['BTC/USD','ETH/USD'].includes(a.name)) ok = await fetchCoinGecko();
    if (!ok) ok = await fetchTwelveDataREST();
    if (!ok) simulatedTick();
  }, 500);
}

/* â”€â”€ Switch feed when asset changes â”€â”€ */
function switchFeed() {
  // Unsubscribe old symbol, subscribe new one
  if (priceWs && priceWs.readyState === WebSocket.OPEN) {
    // Re-subscribe â€” close and reconnect (simplest & cleanest)
    try { priceWs.close(); } catch(_) {}
    priceWs = null;
  }
  if (restPollTimer) { clearInterval(restPollTimer); restPollTimer = null; }

  startPriceFeed();
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CHART ENGINE
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function generateCandle(prevClose) {
  const v   = asset().vol;
  const open  = prevClose;
  const move  = (Math.random() - 0.5) * v * 3;
  const close = Math.max(0.0001, open + move);
  const high  = Math.max(open, close) + Math.random() * v * 0.5;
  const low   = Math.min(open, close) - Math.random() * v * 0.5;
  return { open, high, low, close };
}

function initPriceHistory() {
  priceHistory = [];
  chartCandles = [];
  // Seed from current live price (or base if not yet received)
  let price = currentPrice || asset().base;
  const now = Date.now();
  for (let i = 200; i >= 0; i--) {
    const c = generateCandle(price);
    price = c.close;
    chartCandles.push({ ...c, time: now - i * chartTimeframe * 1000 });
    priceHistory.push(price);
  }
  // Anchor the last candle to the current real price
  if (chartCandles.length) {
    chartCandles[chartCandles.length - 1].close = currentPrice || asset().base;
  }
}

function updateChartTick(newPrice) {
  const last = chartCandles[chartCandles.length - 1];
  if (!last) return;
  const now = Date.now();

  if (now - last.time >= chartTimeframe * 1000) {
    // Open new candle
    chartCandles.push({ open: newPrice, high: newPrice, low: newPrice, close: newPrice, time: now });
    if (chartCandles.length > 300) chartCandles.shift();
  } else {
    // Update current candle
    last.close = newPrice;
    last.high  = Math.max(last.high, newPrice);
    last.low   = Math.min(last.low, newPrice);
  }

  priceHistory.push(newPrice);
  if (priceHistory.length > 500) priceHistory.shift();

  drawChart();
}

/* -- Canvas -- (no-op: LWC replaces canvas, stubs prevent crashes) */
const canvas = { width: 1, height: 1, parentElement: document.getElementById("chartContainer") || document.body };
const ctx = { clearRect(){}, beginPath(){}, moveTo(){}, lineTo(){}, stroke(){}, fill(){},
              arc(){}, fillText(){}, quadraticCurveTo(){}, createLinearGradient(){ return { addColorStop(){} }; },
              closePath(){}, setLineDash(){}, strokeStyle:"", fillStyle:"", lineWidth:1, font:"", textAlign:"" };

function resizeCanvas() { /* handled by ChartEngine */ }
function drawChart() {
  // Update chart with current candles
  if (typeof ChartEngine !== 'undefined' && chartCandles.length) {
    ChartEngine.update(chartCandles);
  }
}


function updateStats() {
  const last = chartCandles[chartCandles.length - 1];
  if (!last) return;
  document.getElementById('statOpen').textContent  = last.open.toFixed(dp());
  document.getElementById('statHigh').textContent  = last.high.toFixed(dp());
  document.getElementById('statLow').textContent   = last.low.toFixed(dp());
  document.getElementById('statClose').textContent = last.close.toFixed(dp());
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ASSET SELECTOR
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function buildAssetDropdown() {
  const dd = document.getElementById('assetDropdown');
  dd.innerHTML = '';
  ASSETS.forEach((a, i) => {
    const item = document.createElement('div');
    item.className = 'asset-drop-item' + (i === currentAssetIdx ? ' active' : '');
    item.innerHTML = `
      <span class="adi-flag">${a.flag}</span>
      <div class="adi-info">
        <div class="adi-name">${a.name}</div>
        <div class="adi-cat">${a.cat}</div>
      </div>
      <span class="adi-ret">+${a.ret}%</span>`;
    item.addEventListener('click', () => selectAsset(i));
    dd.appendChild(item);
  });
}

function selectAsset(idx) {
  currentAssetIdx = idx;
  const a = asset();
  document.getElementById('currentAssetFlag').textContent = a.flag;
  document.getElementById('currentAssetName').textContent = a.name;
  document.getElementById('currentAssetRet').textContent  = '+' + a.ret + '%';
  document.getElementById('assetDropdown').classList.remove('open');

  // Seed chart from base until real price arrives
  currentPrice = a.base;
  initPriceHistory();
  updatePayoutPreview();
  buildAssetDropdown();
  switchFeed();   // reconnect feed to new symbol
}

document.getElementById('assetSelectorBtn').addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('assetDropdown').classList.toggle('open');
});
document.addEventListener('click', () => {
  document.getElementById('assetDropdown').classList.remove('open');
  document.getElementById('userDropdown').classList.remove('open');
});

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TICKER (static â€” animates via CSS)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function updateTicker() {}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TRADE PANEL TABS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
document.querySelectorAll('.tp-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tp-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tp-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

document.getElementById('walletMenuLink').addEventListener('click', e => { e.preventDefault(); switchToTab('wallet'); });
document.getElementById('historyMenuLink').addEventListener('click', e => { e.preventDefault(); switchToTab('history'); });
function switchToTab(name) {
  document.querySelectorAll('.tp-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tp-content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + name));
  document.getElementById('userDropdown').classList.remove('open');
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CHART TIMEFRAME
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
document.querySelectorAll('.tf-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    chartTimeframe = parseInt(btn.dataset.tf);
    initPriceHistory();
  });
});

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   AMOUNT & EXPIRY PRESETS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
document.querySelectorAll('.amount-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.amount-preset').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('tradeAmount').value = btn.dataset.amount;
    currentAmount = parseFloat(btn.dataset.amount);
    updatePayoutPreview();
  });
});
document.getElementById('tradeAmount').addEventListener('input', function() {
  currentAmount = parseFloat(this.value) || 0;
  document.querySelectorAll('.amount-preset').forEach(b => b.classList.remove('selected'));
  updatePayoutPreview();
});
document.querySelectorAll('.expiry-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.expiry-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentExpiry = parseInt(btn.dataset.expiry);
  });
});

function updatePayoutPreview() {
  const rate = asset().ret / 100;
  const amt  = currentAmount || 0;
  document.getElementById('ppAmount').textContent = '$' + amt.toFixed(2);
  document.getElementById('ppRate').textContent   = asset().ret + '%';
  document.getElementById('ppWin').textContent    = '+$' + (amt * rate).toFixed(2);
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PLACE TRADE â€” REAL MARKET OUTCOME
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function placeTrade(direction) {
  if (activeTrade) return;

  const amount = parseFloat(document.getElementById('tradeAmount').value) || 0;
  
  // Strict validation
  if (amount <= 0) {
    return showTradeMsg('⚠️ Enter a valid trade amount.', 'info');
  }
  
  // Real account balance enforcement
  const isRealAccount = (currentUser.accountType || 'real') === 'real';
  if (currentUser.balance <= 0 && isRealAccount) {
    return showTradeMsg('⚠️ Your balance is $0.00. Please deposit funds to start trading.', 'error');
  }
  
  if (amount > currentUser.balance) {
    return showTradeMsg(`⚠️ Insufficient balance. Available: $${currentUser.balance.toFixed(2)}`, 'error');
  }
  
  // Minimum trade amount
  if (amount < 1) {
    return showTradeMsg('⚠️ Minimum trade amount is $1.00', 'info');
  }

  // Deduct stake immediately
  currentUser.balance -= amount;
  updateBalanceDisplay();
  persistUser(currentUser);

  const entryPrice = currentPrice;
  const expiry     = currentExpiry;
  const rate       = asset().ret / 100;
  const payout     = parseFloat((amount * rate).toFixed(2));
  const assetName  = asset().name;
  const decPlaces  = dp();

  activeTrade = { direction, entryPrice, amount, expiry, payout, assetName };

  buyBtn.disabled  = true;
  sellBtn.disabled = true;
  document.getElementById('tradeStatusMsg').style.display = 'none';

  // Overlay
  const countdownEl = document.getElementById('tradeCountdown');
  const fillEl      = document.getElementById('tradeProgressFill');
  const labelEl     = document.getElementById('tradeOverlayLabel');
  const dirEl       = document.getElementById('tradeOverlayDir');

  countdownEl.textContent    = expiry;
  fillEl.style.width         = '0%';
  labelEl.textContent        = 'Trade in progress…';
  dirEl.textContent          = direction === 'buy' ? 'BUY ▲' : 'SELL ▼';
  dirEl.className            = 'trade-overlay-dir' + (direction === 'sell' ? ' sell' : '');
  tradeOverlay.style.display = 'flex';

  let remaining = expiry;
  let settled   = false;

  activeTradeTimer = setInterval(() => {
    remaining -= 1;

    if (remaining <= 0) {
      clearInterval(activeTradeTimer);
      activeTradeTimer = null;
      countdownEl.textContent = '0';
      fillEl.style.width      = '100%';
      labelEl.textContent     = 'Closing trade…';
      if (!settled) {
        settled = true;
        setTimeout(() => settleTrade(direction, amount, payout, entryPrice, assetName, decPlaces, expiry), 600);
      }
      return;
    }
    countdownEl.textContent = remaining;
    fillEl.style.width      = ((expiry - remaining) / expiry * 100) + '%';
  }, 1000);
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SETTLE TRADE â€” REAL OUTCOME
   The exit price IS the live market price at expiry.
   Win   = price moved in predicted direction
   Loss  = price moved against prediction
   Tie   = price didn't move (return stake, no profit)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function settleTrade(direction, amount, payout, entryPrice, assetName, decPlaces, expiry) {
  const exitPrice = currentPrice;
  const moved     = exitPrice - entryPrice;

  // Determine result
  let result;
  if (Math.abs(moved) < Number.EPSILON) {
    result = 'tie';          // price didn't move â€” return stake only
  } else if (direction === 'buy') {
    result = moved > 0 ? 'win' : 'loss';
  } else {
    result = moved < 0 ? 'win' : 'loss';
  }

  // Credit winnings
  if (result === 'win') {
    currentUser.balance += amount + payout;   // stake back + profit
  } else if (result === 'tie') {
    currentUser.balance += amount;            // stake back only
  }
  // loss â†’ stake already deducted, nothing to add

  currentUser.trades.unshift({
    id:         Date.now(),
    asset:      assetName,
    direction,
    amount,
    payout:     result === 'win' ? payout : 0,
    result,
    entryPrice: entryPrice.toFixed(decPlaces),
    exitPrice:  exitPrice.toFixed(decPlaces),
    moved:      moved.toFixed(decPlaces),
    expiry,
    time:       new Date().toISOString(),
  });
  if (currentUser.trades.length > 100) currentUser.trades.pop();

  updateBalanceDisplay();
  persistUser(currentUser);

  // Hide overlay
  tradeOverlay.style.display = 'none';
  activeTrade      = null;
  buyBtn.disabled  = false;
  sellBtn.disabled = false;

  // Show result modal
  showResultModal(result, assetName, direction, payout, amount, entryPrice, exitPrice, decPlaces);
  renderHistory();
  drawChart();
}

buyBtn.addEventListener('click',  () => placeTrade('buy'));
sellBtn.addEventListener('click', () => placeTrade('sell'));

function showTradeMsg(text, type) {
  const el = document.getElementById('tradeStatusMsg');
  el.style.display = 'block';
  el.className     = 'trade-status-msg ' + type;
  el.textContent   = text;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   RESULT MODAL  (win / loss / tie)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function showResultModal(result, assetName, direction, payout, amount, entryPrice, exitPrice, decPlaces) {
  const modal = document.getElementById('resultModal');
  modal.style.display = 'flex';

  const moved    = exitPrice - entryPrice;
  const movedStr = (moved >= 0 ? '+' : '') + moved.toFixed(decPlaces);
  const dirLabel = direction === 'buy' ? 'BUY â–²' : 'SELL â–¼';

  if (result === 'win') {
    document.getElementById('resultIcon').textContent    = 'ðŸ†';
    document.getElementById('resultTitle').textContent   = 'You Won!';
    document.getElementById('resultAmount').textContent  = '+$' + payout.toFixed(2);
    document.getElementById('resultAmount').className    = 'result-amount';
    document.getElementById('resultDetail').textContent  =
      `${assetName} Â· ${dirLabel} Â· Entry ${entryPrice.toFixed(decPlaces)} â†’ Exit ${exitPrice.toFixed(decPlaces)} (${movedStr})`;
    launchConfetti();

  } else if (result === 'loss') {
    document.getElementById('resultIcon').textContent    = 'ðŸ“‰';
    document.getElementById('resultTitle').textContent   = 'Trade Lost';
    document.getElementById('resultAmount').textContent  = '-$' + amount.toFixed(2);
    document.getElementById('resultAmount').className    = 'result-amount loss';
    document.getElementById('resultDetail').textContent  =
      `${assetName} Â· ${dirLabel} Â· Entry ${entryPrice.toFixed(decPlaces)} â†’ Exit ${exitPrice.toFixed(decPlaces)} (${movedStr})`;

  } else {
    document.getElementById('resultIcon').textContent    = 'ðŸ¤';
    document.getElementById('resultTitle').textContent   = 'No Movement';
    document.getElementById('resultAmount').textContent  = '$0.00';
    document.getElementById('resultAmount').className    = 'result-amount';
    document.getElementById('resultDetail').textContent  =
      `${assetName} Â· Price unchanged. Stake returned.`;
  }

  document.getElementById('resultNewBal').textContent = '$' + currentUser.balance.toFixed(2);
}

document.getElementById('resultCloseBtn').addEventListener('click', () => {
  document.getElementById('resultModal').style.display = 'none';
});

/* â”€â”€ Confetti (wins only) â”€â”€ */
function launchConfetti() {
  const container = document.getElementById('confettiContainer');
  container.innerHTML = '';
  const colors = ['#00e5a0','#7b5cff','#ffcc00','#ff6b35','#00c987','#f0f2f8'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left:${Math.random()*100}%;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      animation-delay:${Math.random()*.5}s;
      animation-duration:${1+Math.random()}s;
      transform:rotate(${Math.random()*360}deg);
      border-radius:${Math.random()>.5?'50%':'2px'};`;
    container.appendChild(piece);
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   HISTORY
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function renderHistory() {
  const list   = document.getElementById('historyList');
  const stats  = document.getElementById('historyStats');
  const trades = currentUser.trades;

  const wins   = trades.filter(t => t.result === 'win').length;
  const losses = trades.filter(t => t.result === 'loss').length;
  stats.textContent = trades.length + ' trades Â· ' + wins + 'W / ' + losses + 'L';

  if (!trades.length) {
    list.innerHTML = '<div class="history-empty">No trades yet. Place your first trade!</div>';
    return;
  }

  list.innerHTML = '';
  trades.forEach(t => {
    const isWin  = t.result === 'win';
    const isLoss = t.result === 'loss';
    const item   = document.createElement('div');
    item.className = 'history-item ' + (isWin ? 'win' : isLoss ? 'loss' : '');
    const timeStr = new Date(t.time).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    
    // Calculate P&L properly - check if payout exists and is a number
    let pnl;
    if (isWin && t.payout && !isNaN(t.payout)) {
      pnl = '+$' + parseFloat(t.payout).toFixed(2);
    } else if (isLoss && t.amount && !isNaN(t.amount)) {
      pnl = '-$' + parseFloat(t.amount).toFixed(2);
    } else {
      pnl = '$0.00';
    }
    
    item.innerHTML = `
      <div class="hi-icon">${t.direction === 'buy' ? '▲' : '▼'}</div>
      <div class="hi-info">
        <div class="hi-asset">${t.asset}</div>
        <div class="hi-meta">${t.direction.toUpperCase()} Â· $${parseFloat(t.amount).toFixed(2)} Â· ${t.expiry}s
          ${t.entryPrice ? `Â· <span style="font-size:.7rem;color:var(--text3)">${t.entryPrice}â†’${t.exitPrice}</span>` : ''}
        </div>
      </div>
      <div class="hi-result">
        <div class="hi-pnl ${isWin ? 'up' : isLoss ? 'down' : ''}">${pnl}</div>
        <div class="hi-time">${timeStr}</div>
      </div>`;
    list.appendChild(item);
  });
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   WALLET â€” DEPOSIT
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function handleDeposit(amountInput, methodInput) {
  const amount = parseFloat(amountInput.value);
  if (isNaN(amount) || amount < 5) {
    showWalletMsg('Minimum deposit is $5.00.', 'error'); return false;
  }
  currentUser.balance += amount;
  currentUser.transactions.unshift({
    type:'deposit', amount,
    method: methodInput ? methodInput.options[methodInput.selectedIndex].text : 'Card',
    date: new Date().toISOString(), status:'completed',
  });
  updateBalanceDisplay();
  persistUser(currentUser);
  renderTransactions();
  showWalletMsg('âœ… $' + amount.toFixed(2) + ' deposited successfully!', 'success');
  amountInput.value = '';
  return true;
}

document.getElementById('depositBtn').addEventListener('click', () => {
  const method = document.getElementById('depositMethod').value;
  if (method === 'mpesa') {
    const amount = parseFloat(document.getElementById('depositAmount').value);
    const phone  = document.getElementById('mpesaPhone').value.replace(/\s/g,'');
    if (isNaN(amount) || amount < 5) { showWalletMsg('Minimum deposit is $5.00.','error'); return; }
    if (!phone || phone.length < 9)  { showWalletMsg('Enter a valid M-Pesa number.','error'); return; }
    const fullPhone = '+254 ' + phone.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
    launchMpesaModal(amount, fullPhone, 'wallet');
  } else {
    handleDeposit(document.getElementById('depositAmount'), document.getElementById('depositMethod'));
  }
});

document.querySelectorAll('#tab-wallet .dep-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('depositAmount').value = btn.dataset.amt;
    document.querySelectorAll('#tab-wallet .dep-preset').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });
});

/* â”€â”€ Card formatters â”€â”€ */
const cn = document.getElementById('cardNumber');
if (cn) cn.addEventListener('input', () => { let v=cn.value.replace(/\D/g,'').slice(0,16); cn.value=v.match(/.{1,4}/g)?.join(' ')||v; });
const ce = document.getElementById('cardExpiry');
if (ce) ce.addEventListener('input', () => { let v=ce.value.replace(/\D/g,'').slice(0,4); if(v.length>=2) v=v.slice(0,2)+'/'+v.slice(2); ce.value=v; });
const qc = document.getElementById('quickCard');
if (qc) qc.addEventListener('input', () => { let v=qc.value.replace(/\D/g,'').slice(0,16); qc.value=v.match(/.{1,4}/g)?.join(' ')||v; });
const qe = document.getElementById('quickExpiry');
if (qe) qe.addEventListener('input', () => { let v=qe.value.replace(/\D/g,'').slice(0,4); if(v.length>=2) v=v.slice(0,2)+'/'+v.slice(2); qe.value=v; });

function setupMpesaPhoneInput(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => { el.value = el.value.replace(/\D/g,'').slice(0,9); });
}
setupMpesaPhoneInput('mpesaPhone');
setupMpesaPhoneInput('quickMpesaPhone');

document.getElementById('depositMethod').addEventListener('change', function() {
  const isCard  = this.value === 'card';
  const isMpesa = this.value === 'mpesa';
  document.getElementById('cardFields').style.display  = isCard  ? 'flex' : 'none';
  document.getElementById('mpesaFields').style.display = isMpesa ? 'flex' : 'none';
  document.getElementById('depositBtn').textContent = isMpesa ? 'ðŸ“± Send M-Pesa STK Push' : 'Deposit Funds';
});

let walletMsgEl = null;
function showWalletMsg(text, type) {
  if (!walletMsgEl) {
    walletMsgEl = document.createElement('div');
    walletMsgEl.style.marginTop = '8px';
    document.getElementById('depositBtn').insertAdjacentElement('afterend', walletMsgEl);
  }
  walletMsgEl.style.display = 'block';
  walletMsgEl.className = 'auth-msg ' + type;
  walletMsgEl.textContent = text;
  setTimeout(() => { if (walletMsgEl) walletMsgEl.style.display = 'none'; }, 3500);
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   WALLET â€” WITHDRAW
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
/* ══════════════════════════════════════════════════════════
   WALLET – WITHDRAW
   ══════════════════════════════════════════════════════════ */
document.getElementById('withdrawBtn').addEventListener('click', () => {
  // Prevent demo accounts from withdrawing
  if ((currentUser.accountType || 'real') === 'demo') {
    showWithdrawMsg('⚠️ Demo accounts cannot withdraw funds. Switch to a real account to enable withdrawals.', 'error');
    return;
  }
  
  const amount  = parseFloat(document.getElementById('withdrawAmount').value);
  const address = document.getElementById('withdrawAddress').value.trim();
  const method  = document.getElementById('withdrawMethod');
  if (isNaN(amount) || amount < 10) { showWithdrawMsg('Minimum withdrawal is $10.00.','error'); return; }
  if (amount > currentUser.balance) { showWithdrawMsg('Insufficient balance.','error'); return; }
  if (!address)                     { showWithdrawMsg('Enter your account / address.','error'); return; }
  currentUser.balance -= amount;
  currentUser.transactions.unshift({
    type:'withdrawal', amount,
    method: method.options[method.selectedIndex].text,
    date: new Date().toISOString(), status:'pending',
  });
  updateBalanceDisplay();
  persistUser(currentUser);
  renderTransactions();
  document.getElementById('withdrawAmount').value  = '';
  document.getElementById('withdrawAddress').value = '';
  showWithdrawMsg('✅ Withdrawal of $' + amount.toFixed(2) + ' submitted. Processing within 24h.','success');
});

let wdMsgEl = null;
function showWithdrawMsg(text, type) {
  if (!wdMsgEl) {
    wdMsgEl = document.createElement('div');
    wdMsgEl.style.marginTop = '8px';
    document.getElementById('withdrawBtn').insertAdjacentElement('afterend', wdMsgEl);
  }
  wdMsgEl.style.display = 'block';
  wdMsgEl.className = 'auth-msg ' + type;
  wdMsgEl.textContent = text;
  setTimeout(() => { if (wdMsgEl) wdMsgEl.style.display = 'none'; }, 4000);
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TRANSACTIONS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function renderTransactions() {
  const list = document.getElementById('txList');
  const txs  = currentUser.transactions;
  if (!txs.length) { list.innerHTML = '<div class="history-empty">No transactions yet.</div>'; return; }
  list.innerHTML = '';
  txs.forEach(tx => {
    const item      = document.createElement('div');
    item.className  = 'tx-item';
    const isDeposit = tx.type === 'deposit';
    const isMpesa   = tx.method && tx.method.includes('M-Pesa');
    const d         = new Date(tx.date);
    const dateStr   = d.toLocaleDateString([],{month:'short',day:'numeric'}) + ' ' + d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    const icon      = isMpesa ? 'ðŸ“±' : isDeposit ? 'ðŸ’³' : 'ðŸ¦';
    const label     = isMpesa && tx.mpesaTxId
      ? `${tx.method} Â· <span style="font-size:.68rem;color:var(--text3)">Ref:${tx.mpesaTxId}</span>`
      : tx.method;
    item.innerHTML = `
      <div class="tx-icon">${icon}</div>
      <div class="tx-info">
        <div class="tx-label">${isDeposit?'Deposit':'Withdrawal'} Â· ${label}</div>
        <div class="tx-date">${dateStr} Â· <span style="color:${tx.status==='completed'?'var(--green)':'#ffcc00'}">${tx.status}</span></div>
      </div>
      <div class="tx-amount ${isDeposit?'up':'down'}">${isDeposit?'+':'-'}$${parseFloat(tx.amount).toFixed(2)}</div>`;
    list.appendChild(item);
  });
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   QUICK DEPOSIT MODAL
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
document.getElementById('depositTopBtn').addEventListener('click', () => {
  document.getElementById('depositModal').style.display = 'flex';
  setQuickMethod('card');
});
document.getElementById('depositModalClose').addEventListener('click', () => {
  document.getElementById('depositModal').style.display = 'none';
});
document.getElementById('depositModal').addEventListener('click', e => {
  if (e.target === document.getElementById('depositModal'))
    document.getElementById('depositModal').style.display = 'none';
});

let currentQuickMethod = 'card';
function setQuickMethod(method) {
  currentQuickMethod = method;
  document.querySelectorAll('.qmt-btn').forEach(b => b.classList.toggle('active', b.dataset.method === method));
  document.getElementById('quickCardSection').style.display   = method === 'card'   ? 'block' : 'none';
  document.getElementById('quickMpesaSection').style.display  = method === 'mpesa'  ? 'block' : 'none';
  document.getElementById('quickCryptoSection').style.display = method === 'crypto' ? 'block' : 'none';
  document.getElementById('quickDepositBtn').textContent = method === 'mpesa' ? 'ðŸ“± Send STK Push' : 'Deposit Now';
}
document.querySelectorAll('.qmt-btn').forEach(btn => btn.addEventListener('click', () => setQuickMethod(btn.dataset.method)));
document.querySelectorAll('#depositModal .dep-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('quickDepositAmt').value = btn.dataset.amt;
    document.querySelectorAll('#depositModal .dep-preset').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });
});

document.getElementById('quickDepositBtn').addEventListener('click', () => {
  const amount = parseFloat(document.getElementById('quickDepositAmt').value);
  const msg    = document.getElementById('quickDepMsg');
  if (isNaN(amount) || amount < 5) {
    msg.style.display='block'; msg.className='auth-msg error'; msg.textContent='Minimum deposit is $5.00.'; return;
  }
  if (currentQuickMethod === 'mpesa') {
    const phone = document.getElementById('quickMpesaPhone').value.replace(/\s/g,'');
    if (!phone || phone.length < 9) {
      msg.style.display='block'; msg.className='auth-msg error'; msg.textContent='Enter a valid M-Pesa number.'; return;
    }
    const fullPhone = '+254 ' + phone.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
    document.getElementById('depositModal').style.display = 'none';
    launchMpesaModal(amount, fullPhone, 'quick');
    return;
  }
  currentUser.balance += amount;
  currentUser.transactions.unshift({
    type:'deposit', amount,
    method: currentQuickMethod === 'crypto' ? 'Cryptocurrency' : 'Card',
    date: new Date().toISOString(), status:'completed',
  });
  updateBalanceDisplay(); persistUser(currentUser); renderTransactions();
  msg.style.display='block'; msg.className='auth-msg success';
  msg.textContent = 'âœ… $' + amount.toFixed(2) + ' added to your account!';
  setTimeout(() => { document.getElementById('depositModal').style.display='none'; msg.style.display='none'; }, 1800);
});

function copyAddr() {
  const addr = document.getElementById('cryptoAddr').textContent;
  navigator.clipboard?.writeText(addr).catch(()=>{});
  const btn = document.querySelector('.copy-addr-btn');
  btn.textContent = 'âœ… Copied!';
  setTimeout(() => btn.textContent = 'ðŸ“‹ Copy', 2000);
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   M-PESA FLOW  (unchanged)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const KES_RATE = 130;

async function launchMpesaModal(usdAmount, fullPhone, source) {
  const kesAmount    = (usdAmount * KES_RATE).toFixed(2);
  const kesFormatted = parseFloat(kesAmount).toLocaleString('en-KE', { minimumFractionDigits: 2 });
  showMpesaStep(1);
  document.getElementById('mpesaPhoneDisplay').textContent = fullPhone;
  document.getElementById('mpesaAmtDisplay').textContent   = 'KES ' + kesFormatted;
  document.getElementById('mpesaNotifMsg').textContent     = `Pay KES ${kesFormatted} to Tradersbloc. Enter PIN:`;
  document.getElementById('mpesaModal').style.display = 'flex';

  let serverUp = false;
  try { serverUp = await MPESA_API.isServerReachable(); } catch(_) {}

  if (!serverUp) { runMpesaSimulation(usdAmount, kesAmount, fullPhone); return; }

  let checkoutRequestId;
  try {
    const rawPhone   = fullPhone.replace(/\s/g,'').replace(/^\+/,'');
    const pushResult = await MPESA_API.initiateSTKPush(rawPhone, usdAmount);
    checkoutRequestId = pushResult.checkoutRequestId;
    showMpesaStep(2);
    ['pd1','pd2','pd3','pd4'].forEach(id => document.getElementById(id).classList.remove('filled'));
    document.getElementById('pinStatus').textContent = 'Waiting for PINâ€¦';
    setTimeout(() => {
      document.getElementById('pd1').classList.add('filled');
      document.getElementById('pd2').classList.add('filled');
      document.getElementById('pinStatus').textContent = 'Prompt received â€” enter PIN on your phoneâ€¦';
    }, 1500);
  } catch (err) {
    document.getElementById('mpesaModal').style.display = 'none';
    showMpesaError(err.message); return;
  }

  try {
    const result = await MPESA_API.pollStatus(checkoutRequestId, 90_000);
    document.getElementById('pd3').classList.add('filled');
    document.getElementById('pd4').classList.add('filled');
    document.getElementById('pinStatus').textContent = 'Processingâ€¦';
    await new Promise(r => setTimeout(r, 600));
    const txDate = result.transactionDate ? formatMpesaDate(String(result.transactionDate)) : new Date().toLocaleString('en-KE');
    finishMpesaSuccess(usdAmount, result.amountKes||parseFloat(kesAmount), fullPhone, result.mpesaReceiptNumber||generateMpesaTxId(), txDate);
  } catch (err) {
    document.getElementById('mpesaModal').style.display = 'none';
    showMpesaError(err.message);
  }
}

function showMpesaStep(n) {
  [1,2,3].forEach(i => {
    const el = document.getElementById('mpesaStep' + i);
    if (!el) return;
    el.style.display = i === n ? (i===1?'flex':'block') : 'none';
    if (i===1&&n===1) { el.style.flexDirection='column'; el.style.alignItems='center'; el.style.gap='14px'; }
  });
}
function runMpesaSimulation(usdAmount, kesAmount, fullPhone) {
  setTimeout(() => { showMpesaStep(2); simulatePinEntry(usdAmount, kesAmount, fullPhone); }, 2500);
}
function simulatePinEntry(usdAmount, kesAmount, fullPhone) {
  const dots=['pd1','pd2','pd3','pd4']; const st=document.getElementById('pinStatus');
  dots.forEach(id=>document.getElementById(id).classList.remove('filled')); st.textContent='Waiting for PINâ€¦';
  let di=0;
  const iv=setInterval(()=>{ if(di<4){document.getElementById(dots[di]).classList.add('filled');di++;if(di===4)st.textContent='Processingâ€¦';}else{clearInterval(iv);setTimeout(()=>finishMpesaSuccess(usdAmount,parseFloat(kesAmount),fullPhone,generateMpesaTxId(),new Date().toLocaleString('en-KE')),1000);} },500);
}
function finishMpesaSuccess(usdAmount, amountKes, fullPhone, receiptNo, txDate) {
  showMpesaStep(3);
  document.getElementById('mpesaTxId').textContent         = receiptNo;
  document.getElementById('mpesaReceiptAmt').textContent   = 'KES ' + parseFloat(amountKes).toLocaleString('en-KE',{minimumFractionDigits:2});
  document.getElementById('mpesaReceiptPhone').textContent = fullPhone;
  document.getElementById('mpesaReceiptDate').textContent  = txDate;
  currentUser.balance += usdAmount;
  currentUser.transactions.unshift({ type:'deposit', amount:usdAmount, method:'M-Pesa ('+fullPhone+')', mpesaTxId:receiptNo, date:new Date().toISOString(), status:'completed' });
  updateBalanceDisplay(); persistUser(currentUser); renderTransactions();
}
function showMpesaError(message) {
  const t=document.getElementById('mpesaErrorToast');
  if(t){t.textContent='âŒ '+message;t.style.display='block';setTimeout(()=>t.style.display='none',6000);return;}
  showTradeMsg('âŒ M-Pesa: '+message,'loss');
}
function formatMpesaDate(raw) {
  if(!raw||raw.length<14)return raw;
  return `${raw.slice(6,8)}/${raw.slice(4,6)}/${raw.slice(0,4)}, ${raw.slice(8,10)}:${raw.slice(10,12)}:${raw.slice(12,14)}`;
}
function generateMpesaTxId() {
  return Array.from({length:10},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'[Math.floor(Math.random()*35)]).join('');
}
document.getElementById('mpesaDoneBtn').addEventListener('click', () => {
  document.getElementById('mpesaModal').style.display = 'none';
});

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   USER MENU
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
document.getElementById('userMenuBtn').addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('userDropdown').classList.toggle('open');
});
document.getElementById('logoutBtn').addEventListener('click', e => {
  e.preventDefault();
  localStorage.removeItem('tc_session');
  window.location.href = 'login.html';
});
function initUserUI() {
  document.getElementById('userAvatar').textContent    = (currentUser.firstName||'T')[0].toUpperCase();
  document.getElementById('dropUserName').textContent  = (currentUser.firstName||'Trader')+' '+(currentUser.lastName||'');
  document.getElementById('dropUserEmail').textContent = currentUser.email||'';
  updateAccountBadge();
  // Prompt real-account users to deposit if balance is zero
  if ((currentUser.accountType || 'real') === 'real' && currentUser.balance <= 0) {
    setTimeout(() => {
      showTradeMsg('Welcome! Your real account balance is $0.00 — please make a deposit to start trading.', 'info');
    }, 1000);
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   RESIZE OBSERVER
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
// ResizeObserver is handled by ChartEngine (chart-bridge.js)
// (no-op — canvas.parentElement is a stub object)

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   INIT
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
// Wait for DOM and LightweightCharts library to be ready
function initializeChart() {
  if (typeof ChartEngine === 'undefined') {
    console.error('[Init] ChartEngine not loaded!');
    return false;
  }
  
  if (typeof LightweightCharts === 'undefined') {
    console.error('[Init] LightweightCharts library not loaded!');
    // Try again after a short delay
    setTimeout(initializeChart, 500);
    return false;
  }
  
  console.log('[Init] Initializing ChartEngine...');
  const success = ChartEngine.init('chartContainer');
  
  if (success) {
    console.log('[Init] ✅ Chart initialized successfully');
    return true;
  } else {
    console.error('[Init] ❌ Chart initialization failed');
    return false;
  }
}

// Initialize ChartEngine with retry logic
const chartInitSuccess = initializeChart();

initUserUI();
buildAssetDropdown();
currentPrice = asset().base;    // seed from base before first real price
initPriceHistory();
updatePayoutPreview();
updateBalanceDisplay();
renderHistory();
renderTransactions();

// Hide withdraw section for demo accounts
const isDemo = (currentUser.accountType || 'real') === 'demo';
const withdrawSection = document.querySelector('.wallet-section:has(#withdrawBtn)');
if (withdrawSection && isDemo) {
  withdrawSection.style.display = 'none';
}

// Update feed status to "Live" immediately for demo accounts (simulated prices)
const feedStatusEl = document.getElementById('feedStatus');
if (feedStatusEl && isDemo) {
  feedStatusEl.textContent = '● Live (Simulated)';
  feedStatusEl.className = 'feed-status live';
}

// Draw chart after initialization
if (chartInitSuccess) {
  drawChart();
} else {
  console.warn('[Init] Retrying chart draw after delay...');
  setTimeout(() => {
    if (initializeChart()) {
      drawChart();
    }
  }, 1000);
}

// Start real-time feed + chart refresh
startPriceFeed();
startChartTicks();
