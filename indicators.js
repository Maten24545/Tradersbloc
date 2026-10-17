/**
 * Tradersbloc — Technical Indicators Library
 * ─────────────────────────────────────────────────────────────
 * Calculations: SMA, EMA, WMA, VWMA, HMA, DEMA, TEMA,
 *   Bollinger Bands, RSI, MACD, Stochastic, Stoch RSI,
 *   CCI, Williams %R, ATR, VWAP, OBV, MFI, Ichimoku,
 *   Supertrend, Parabolic SAR, ADX, Donchian, Keltner,
 *   Aroon, Pivot Points, ZigZag
 *
 * All functions accept arrays of { open, high, low, close, volume?, time }
 * and return arrays of { time, value } (or multi-value objects).
 *
 * Rendering attaches LWC overlay / pane series to the existing chart.
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   CALCULATION HELPERS
   ═══════════════════════════════════════════════════════════════ */
const Calc = {

  /* ── Simple Moving Average ── */
  sma(closes, period) {
    const out = [];
    for (let i = period - 1; i < closes.length; i++) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += closes[j];
      out.push({ idx: i, value: sum / period });
    }
    return out;
  },

  /* ── Exponential Moving Average ── */
  ema(closes, period) {
    const k    = 2 / (period + 1);
    const out  = [];
    let   prev = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    out.push({ idx: period - 1, value: prev });
    for (let i = period; i < closes.length; i++) {
      const val = closes[i] * k + prev * (1 - k);
      out.push({ idx: i, value: val });
      prev = val;
    }
    return out;
  },

  /* ── Weighted Moving Average ── */
  wma(closes, period) {
    const out = [];
    const denom = (period * (period + 1)) / 2;
    for (let i = period - 1; i < closes.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += closes[i - j] * (period - j);
      out.push({ idx: i, value: sum / denom });
    }
    return out;
  },

  /* ── Hull MA ── */
  hma(closes, period) {
    const half  = Math.round(period / 2);
    const sqrtP = Math.round(Math.sqrt(period));
    const wmaH  = this.wma(closes, half);
    const wmaP  = this.wma(closes, period);
    const raw   = wmaH.map((v, i) => {
      const p = wmaP[i];
      if (!p) return null;
      return { idx: v.idx, close: 2 * v.value - p.value };
    }).filter(Boolean);
    const rawCloses = raw.map(r => r.close);
    const hmaVals   = this.wma(rawCloses, sqrtP);
    return hmaVals.map(v => ({ idx: raw[v.idx]?.idx, value: v.value }));
  },

  /* ── DEMA / TEMA ── */
  dema(closes, period) {
    const e1 = this.ema(closes, period);
    const e1v = e1.map(e => e.value);
    const e2 = this.ema(e1v, period);
    return e2.map((v, i) => ({
      idx:   e1[i + (e1.length - e2.length)]?.idx,
      value: 2 * e1[i + (e1.length - e2.length)]?.value - v.value,
    })).filter(v => v.idx !== undefined);
  },

  tema(closes, period) {
    const e1 = this.ema(closes, period);
    const e1v = e1.map(e => e.value);
    const e2  = this.ema(e1v, period);
    const e2v = e2.map(e => e.value);
    const e3  = this.ema(e2v, period);
    const offset = e1.length - e3.length;
    return e3.map((v, i) => ({
      idx:   e1[i + offset]?.idx,
      value: 3 * e1[i + offset]?.value - 3 * e2[i + (e2.length - e3.length)]?.value + v.value,
    })).filter(v => v.idx !== undefined);
  },

  /* ── ATR ── */
  atr(candles, period) {
    const trs = [];
    for (let i = 1; i < candles.length; i++) {
      const c = candles[i], p = candles[i - 1];
      trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
    }
    const out = [];
    let prev = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
    out.push({ idx: period, value: prev });
    for (let i = period; i < trs.length; i++) {
      const val = (prev * (period - 1) + trs[i]) / period;
      out.push({ idx: i + 1, value: val });
      prev = val;
    }
    return out;
  },

  /* ── RSI ── */
  rsi(closes, period) {
    const out    = [];
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const d = closes[i] - closes[i - 1];
      if (d >= 0) gains  += d; else losses += -d;
    }
    let ag = gains / period, al = losses / period;
    out.push({ idx: period, value: al === 0 ? 100 : 100 - 100 / (1 + ag / al) });
    for (let i = period + 1; i < closes.length; i++) {
      const d = closes[i] - closes[i - 1];
      ag = (ag * (period - 1) + Math.max(d, 0)) / period;
      al = (al * (period - 1) + Math.max(-d, 0)) / period;
      out.push({ idx: i, value: al === 0 ? 100 : 100 - 100 / (1 + ag / al) });
    }
    return out;
  },

  /* ── MACD ── */
  macd(closes, fast = 12, slow = 26, signal = 9) {
    const emaF = this.ema(closes, fast);
    const emaS = this.ema(closes, slow);
    const minLen = Math.min(emaF.length, emaS.length);
    const macdLine = [];
    for (let i = 0; i < minLen; i++) {
      const fi = emaF.length - minLen + i;
      const si = emaS.length - minLen + i;
      macdLine.push({ idx: emaF[fi].idx, value: emaF[fi].value - emaS[si].value });
    }
    const sigVals  = macdLine.map(m => m.value);
    const sigLine  = this.ema(sigVals, signal);
    const offset   = macdLine.length - sigLine.length;
    return macdLine.slice(offset).map((m, i) => ({
      idx:       m.idx,
      macd:      m.value,
      signal:    sigLine[i].value,
      histogram: m.value - sigLine[i].value,
    }));
  },

  /* ── Bollinger Bands ── */
  bollinger(closes, period = 20, mult = 2) {
    const smas = this.sma(closes, period);
    return smas.map(({ idx, value: mid }) => {
      let sum = 0;
      for (let j = idx - period + 1; j <= idx; j++) sum += (closes[j] - mid) ** 2;
      const sd = Math.sqrt(sum / period);
      return { idx, upper: mid + mult * sd, mid, lower: mid - mult * sd };
    });
  },

  /* ── Stochastic Oscillator ── */
  stochastic(candles, kPeriod = 14, dPeriod = 3) {
    const kLine = [];
    for (let i = kPeriod - 1; i < candles.length; i++) {
      const slice = candles.slice(i - kPeriod + 1, i + 1);
      const hh = Math.max(...slice.map(c => c.high));
      const ll = Math.min(...slice.map(c => c.low));
      const k  = hh === ll ? 0 : ((candles[i].close - ll) / (hh - ll)) * 100;
      kLine.push({ idx: i, k });
    }
    const kVals  = kLine.map(v => v.k);
    const dSmas  = this.sma(kVals, dPeriod);
    const offset = kLine.length - dSmas.length;
    return dSmas.map((d, i) => ({
      idx: kLine[i + offset].idx,
      k:   kLine[i + offset].k,
      d:   d.value,
    }));
  },

  /* ── CCI ── */
  cci(candles, period = 20) {
    const out = [];
    for (let i = period - 1; i < candles.length; i++) {
      const slice = candles.slice(i - period + 1, i + 1);
      const tp    = slice.map(c => (c.high + c.low + c.close) / 3);
      const mean  = tp.reduce((a, b) => a + b, 0) / period;
      const md    = tp.reduce((a, b) => a + Math.abs(b - mean), 0) / period;
      out.push({ idx: i, value: md === 0 ? 0 : (tp[tp.length - 1] - mean) / (0.015 * md) });
    }
    return out;
  },

  /* ── Williams %R ── */
  williamsR(candles, period = 14) {
    const out = [];
    for (let i = period - 1; i < candles.length; i++) {
      const slice = candles.slice(i - period + 1, i + 1);
      const hh = Math.max(...slice.map(c => c.high));
      const ll = Math.min(...slice.map(c => c.low));
      out.push({ idx: i, value: hh === ll ? -50 : ((hh - candles[i].close) / (hh - ll)) * -100 });
    }
    return out;
  },

  /* ── VWAP ── */
  vwap(candles) {
    const out = [];
    let cumTPV = 0, cumVol = 0;
    for (let i = 0; i < candles.length; i++) {
      const c  = candles[i];
      const tp = (c.high + c.low + c.close) / 3;
      const vol = c.volume || 1;
      cumTPV += tp * vol;
      cumVol += vol;
      out.push({ idx: i, value: cumVol > 0 ? cumTPV / cumVol : tp });
    }
    return out;
  },

  /* ── OBV ── */
  obv(candles) {
    const out  = [];
    let   prev = 0;
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const p = i > 0 ? candles[i - 1] : c;
      const vol = c.volume || 0;
      if (c.close > p.close)       prev += vol;
      else if (c.close < p.close)  prev -= vol;
      out.push({ idx: i, value: prev });
    }
    return out;
  },

  /* ── MFI ── */
  mfi(candles, period = 14) {
    const out = [];
    const tp  = candles.map(c => ({ tp: (c.high + c.low + c.close) / 3, vol: c.volume || 1 }));
    for (let i = period; i < candles.length; i++) {
      let posFlow = 0, negFlow = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const mf = tp[j].tp * tp[j].vol;
        if (tp[j].tp > tp[j - 1].tp) posFlow += mf;
        else                          negFlow += mf;
      }
      out.push({ idx: i, value: negFlow === 0 ? 100 : 100 - 100 / (1 + posFlow / negFlow) });
    }
    return out;
  },

  /* ── Supertrend ── */
  supertrend(candles, period = 10, mult = 3) {
    const atrVals = this.atr(candles, period);
    const out     = [];
    let trend     = 1;
    let prevUpper = 0, prevLower = 0, prevST = 0;

    for (let i = 0; i < atrVals.length; i++) {
      const c   = candles[atrVals[i].idx];
      const mid = (c.high + c.low) / 2;
      const atr = atrVals[i].value;
      let   upper = mid + mult * atr;
      let   lower = mid - mult * atr;

      upper = (i > 0 && upper > prevUpper) ? upper : Math.min(upper, prevUpper);
      lower = (i > 0 && lower < prevLower) ? lower : Math.max(lower, prevLower);

      if (c.close > prevST) trend = 1;
      if (c.close < prevST) trend = -1;

      const st = trend === 1 ? lower : upper;
      out.push({ idx: atrVals[i].idx, value: st, trend });
      prevUpper = upper; prevLower = lower; prevST = st;
    }
    return out;
  },

  /* ── Parabolic SAR ── */
  psar(candles, step = 0.02, max = 0.2) {
    const out  = [];
    let isBull = true;
    let sar    = candles[0].low;
    let ep     = candles[0].high;
    let af     = step;

    for (let i = 1; i < candles.length; i++) {
      const c = candles[i];
      sar = sar + af * (ep - sar);

      if (isBull) {
        sar = Math.min(sar, candles[i - 1].low, i >= 2 ? candles[i - 2].low : sar);
        if (c.low < sar)    { isBull = false; sar = ep; ep = c.low;  af = step; }
        else if (c.high > ep) { ep = c.high; af = Math.min(af + step, max); }
      } else {
        sar = Math.max(sar, candles[i - 1].high, i >= 2 ? candles[i - 2].high : sar);
        if (c.high > sar)   { isBull = true;  sar = ep; ep = c.high; af = step; }
        else if (c.low < ep)  { ep = c.low;  af = Math.min(af + step, max); }
      }
      out.push({ idx: i, value: sar, bull: isBull });
    }
    return out;
  },

  /* ── Donchian Channels ── */
  donchian(candles, period = 20) {
    const out = [];
    for (let i = period - 1; i < candles.length; i++) {
      const slice = candles.slice(i - period + 1, i + 1);
      const high  = Math.max(...slice.map(c => c.high));
      const low   = Math.min(...slice.map(c => c.low));
      out.push({ idx: i, upper: high, lower: low, mid: (high + low) / 2 });
    }
    return out;
  },

  /* ── Keltner Channels ── */
  keltner(candles, period = 20, mult = 2) {
    const closes  = candles.map(c => c.close);
    const emaVals = this.ema(closes, period);
    const atrVals = this.atr(candles, period);
    const minLen  = Math.min(emaVals.length, atrVals.length);
    return Array.from({ length: minLen }, (_, i) => {
      const ei = emaVals.length - minLen + i;
      const ai = atrVals.length - minLen + i;
      const mid = emaVals[ei].value;
      const atr = atrVals[ai].value;
      return { idx: emaVals[ei].idx, upper: mid + mult * atr, mid, lower: mid - mult * atr };
    });
  },

  /* ── Aroon ── */
  aroon(candles, period = 25) {
    const out = [];
    for (let i = period; i < candles.length; i++) {
      const slice   = candles.slice(i - period, i + 1);
      const hIdx    = slice.reduce((mi, c, j) => c.high > slice[mi].high ? j : mi, 0);
      const lIdx    = slice.reduce((mi, c, j) => c.low  < slice[mi].low  ? j : mi, 0);
      const aroonUp = ((period - (period - hIdx)) / period) * 100;
      const aroonDn = ((period - (period - lIdx)) / period) * 100;
      out.push({ idx: i, up: aroonUp, down: aroonDn, osc: aroonUp - aroonDn });
    }
    return out;
  },

  /* ── Ichimoku ── */
  ichimoku(candles, tenkan = 9, kijun = 26, senkou = 52) {
    function midpoint(slice) {
      return (Math.max(...slice.map(c => c.high)) + Math.min(...slice.map(c => c.low))) / 2;
    }
    const out = [];
    for (let i = senkou - 1; i < candles.length; i++) {
      const tenkanVal = midpoint(candles.slice(i - tenkan + 1, i + 1));
      const kijunVal  = midpoint(candles.slice(i - kijun  + 1, i + 1));
      const senkouA   = (tenkanVal + kijunVal) / 2;
      const senkouB   = midpoint(candles.slice(i - senkou + 1, i + 1));
      const chikou    = candles[i].close;
      out.push({ idx: i, tenkan: tenkanVal, kijun: kijunVal, senkouA, senkouB, chikou });
    }
    return out;
  },

  /* ── ADX ── */
  adx(candles, period = 14) {
    const out  = [];
    const dms  = [];
    for (let i = 1; i < candles.length; i++) {
      const c = candles[i], p = candles[i - 1];
      const dmPlus  = c.high - p.high > p.low - c.low ? Math.max(c.high - p.high, 0) : 0;
      const dmMinus = p.low - c.low  > c.high - p.high ? Math.max(p.low - c.low, 0) : 0;
      const tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
      dms.push({ dmPlus, dmMinus, tr });
    }
    let smoothDMP = dms.slice(0, period).reduce((a, b) => a + b.dmPlus, 0);
    let smoothDMN = dms.slice(0, period).reduce((a, b) => a + b.dmMinus, 0);
    let smoothTR  = dms.slice(0, period).reduce((a, b) => a + b.tr, 0);
    const dxArr = [];
    for (let i = period; i < dms.length; i++) {
      smoothDMP = smoothDMP - smoothDMP / period + dms[i].dmPlus;
      smoothDMN = smoothDMN - smoothDMN / period + dms[i].dmMinus;
      smoothTR  = smoothTR  - smoothTR  / period + dms[i].tr;
      const diPlus  = smoothTR > 0 ? (smoothDMP / smoothTR) * 100 : 0;
      const diMinus = smoothTR > 0 ? (smoothDMN / smoothTR) * 100 : 0;
      const sum = diPlus + diMinus;
      const dx  = sum > 0 ? Math.abs(diPlus - diMinus) / sum * 100 : 0;
      dxArr.push({ idx: i + 1, diPlus, diMinus, dx });
    }
    let adxVal = dxArr.slice(0, period).reduce((a, b) => a + b.dx, 0) / period;
    out.push({ idx: dxArr[period - 1].idx, adx: adxVal, diPlus: dxArr[period-1].diPlus, diMinus: dxArr[period-1].diMinus });
    for (let i = period; i < dxArr.length; i++) {
      adxVal = (adxVal * (period - 1) + dxArr[i].dx) / period;
      out.push({ idx: dxArr[i].idx, adx: adxVal, diPlus: dxArr[i].diPlus, diMinus: dxArr[i].diMinus });
    }
    return out;
  },

  /* ── Pivot Points (Classic daily) ── */
  pivotPoints(candles) {
    if (candles.length < 2) return [];
    const prev = candles[candles.length - 2];
    const p    = (prev.high + prev.low + prev.close) / 3;
    return {
      p,
      r1: 2 * p - prev.low,
      r2: p + (prev.high - prev.low),
      r3: prev.high + 2 * (p - prev.low),
      s1: 2 * p - prev.high,
      s2: p - (prev.high - prev.low),
      s3: prev.low  - 2 * (prev.high - p),
    };
  },

  /* ── ZigZag ── */
  zigzag(candles, deviation = 5) {
    const out    = [];
    let lastPivot = null;
    let lastDir   = 0;

    for (let i = 1; i < candles.length; i++) {
      const c = candles[i];
      if (!lastPivot) {
        lastPivot = { idx: i, price: c.close };
        continue;
      }
      const pct = ((c.close - lastPivot.price) / lastPivot.price) * 100;
      if (Math.abs(pct) >= deviation) {
        if (pct > 0 && lastDir !== 1) {
          out.push({ idx: i, value: c.close });
          lastPivot = { idx: i, price: c.close };
          lastDir = 1;
        } else if (pct < 0 && lastDir !== -1) {
          out.push({ idx: i, value: c.close });
          lastPivot = { idx: i, price: c.close };
          lastDir = -1;
        }
      }
    }
    return out;
  },
};


/* ═══════════════════════════════════════════════════════════════
   INDICATOR MANAGER — attaches/detaches LWC series
   ═══════════════════════════════════════════════════════════════ */
const IndicatorManager = (() => {
  const active    = new Map();  // id → { series[], panes[], label }
  let   nextId    = 1;

  /* ── Color palette ── */
  const PALETTE = ['#f7931a','#7b5cff','#00e5a0','#ff6b35','#3b82f6','#f59e0b','#ec4899','#10b981'];
  let   colorIdx = 0;
  const nextColor = () => PALETTE[colorIdx++ % PALETTE.length];

  /* ── Build LWC series from a result set ── */
  function _addOverlay(chart, values, candles, color, lineWidth = 1, label = '') {
    const series = chart.addLineSeries({
      color,
      lineWidth,
      title:           label,
      lastValueVisible: true,
      priceLineVisible: false,
    });
    series.setData(values.map(v => ({
      time:  ChartEngine.toSeconds(candles[v.idx]?.time || Date.now()),
      value: v.value,
    })).filter(v => v.value !== undefined && !isNaN(v.value)));
    return series;
  }

  function _addPane(chart, values, candles, color, label = '') {
    const series = chart.addHistogramSeries({
      color,
      priceFormat:      { type: 'price', precision: 2 },
      priceScaleId:     label,
      scaleMargins:     { top: 0.7, bottom: 0.02 },
      title:            label,
    });
    series.setData(values.map(v => ({
      time:  ChartEngine.toSeconds(candles[v.idx]?.time || Date.now()),
      value: v.value,
      color: v.color || color,
    })).filter(v => !isNaN(v.value)));
    return series;
  }

  function _addBandOverlay(chart, upper, mid, lower, candles, colorU, colorM, colorL, label) {
    const toData = arr => arr.map(v => ({
      time:  ChartEngine.toSeconds(candles[v.idx]?.time || Date.now()),
      value: v,
    })).filter(v => !isNaN(v.value));

    const sU = chart.addLineSeries({ color: colorU, lineWidth: 1, title: label + ' Upper', priceLineVisible: false });
    const sM = chart.addLineSeries({ color: colorM, lineWidth: 1, title: label + ' Mid',   priceLineVisible: false });
    const sL = chart.addLineSeries({ color: colorL, lineWidth: 1, title: label + ' Lower', priceLineVisible: false });
    sU.setData(upper.map(v => ({ time: ChartEngine.toSeconds(candles[v.idx]?.time||Date.now()), value: v.upper })).filter(v=>!isNaN(v.value)));
    sM.setData(mid  .map(v => ({ time: ChartEngine.toSeconds(candles[v.idx]?.time||Date.now()), value: v.mid   })).filter(v=>!isNaN(v.value)));
    sL.setData(lower.map(v => ({ time: ChartEngine.toSeconds(candles[v.idx]?.time||Date.now()), value: v.lower })).filter(v=>!isNaN(v.value)));
    return [sU, sM, sL];
  }

  /* ─── add(type, candles, params) → id ─── */
  function add(type, candles, params = {}) {
    const chart = ChartEngine.getChart();
    if (!chart) return null;

    const closes = candles.map(c => c.close);
    const id     = nextId++;
    const color  = params.color || nextColor();
    const series = [];
    let   label  = type.toUpperCase();

    switch (type) {

      case 'sma': {
        const p   = params.period || 20;
        const vals = Calc.sma(closes, p);
        label = `SMA(${p})`;
        series.push(_addOverlay(chart, vals, candles, color, 1, label));
        break;
      }
      case 'ema': {
        const p   = params.period || 20;
        const vals = Calc.ema(closes, p);
        label = `EMA(${p})`;
        series.push(_addOverlay(chart, vals, candles, color, 1, label));
        break;
      }
      case 'wma': {
        const p   = params.period || 20;
        const vals = Calc.wma(closes, p);
        label = `WMA(${p})`;
        series.push(_addOverlay(chart, vals, candles, color, 1, label));
        break;
      }
      case 'hma': {
        const p   = params.period || 20;
        const vals = Calc.hma(closes, p);
        label = `HMA(${p})`;
        series.push(_addOverlay(chart, vals.filter(v=>v.idx!==undefined), candles, color, 1, label));
        break;
      }
      case 'dema': {
        const p   = params.period || 20;
        const vals = Calc.dema(closes, p);
        label = `DEMA(${p})`;
        series.push(_addOverlay(chart, vals, candles, color, 1, label));
        break;
      }
      case 'tema': {
        const p   = params.period || 20;
        const vals = Calc.tema(closes, p);
        label = `TEMA(${p})`;
        series.push(_addOverlay(chart, vals, candles, color, 1, label));
        break;
      }

      case 'bollinger': {
        const p    = params.period || 20;
        const mult = params.mult   || 2;
        const vals = Calc.bollinger(closes, p, mult);
        label = `BB(${p},${mult})`;
        const [sU, sM, sL] = _addBandOverlay(chart, vals, vals, vals, candles, color, '#ffffff44', color, label);
        series.push(sU, sM, sL);
        break;
      }

      case 'keltner': {
        const p    = params.period || 20;
        const mult = params.mult   || 2;
        const vals = Calc.keltner(candles, p, mult);
        label = `KC(${p},${mult})`;
        const [sU, sM, sL] = _addBandOverlay(chart, vals, vals, vals, candles, '#f7931a88', '#f7931a44', '#f7931a88', label);
        series.push(sU, sM, sL);
        break;
      }

      case 'donchian': {
        const p    = params.period || 20;
        const vals = Calc.donchian(candles, p);
        label = `DC(${p})`;
        const [sU, sM, sL] = _addBandOverlay(chart, vals, vals, vals, candles, '#7b5cff88', '#7b5cff44', '#7b5cff88', label);
        series.push(sU, sM, sL);
        break;
      }

      case 'rsi': {
        const p    = params.period || 14;
        const vals = Calc.rsi(closes, p);
        label = `RSI(${p})`;
        const s = chart.addLineSeries({
          color, lineWidth: 1, title: label,
          priceScaleId: label,
          scaleMargins: { top: 0.7, bottom: 0.02 },
        });
        s.setData(vals.map(v => ({ time: ChartEngine.toSeconds(candles[v.idx]?.time||Date.now()), value: v.value })));
        // Overbought/oversold lines
        const ob = chart.addLineSeries({ color:'rgba(255,77,106,0.4)', lineWidth:1, priceScaleId: label, title:'', priceLineVisible:false });
        const os = chart.addLineSeries({ color:'rgba(0,229,160,0.4)',  lineWidth:1, priceScaleId: label, title:'', priceLineVisible:false });
        const t1 = vals.length ? ChartEngine.toSeconds(candles[vals[0].idx]?.time||Date.now()) : 0;
        const t2 = vals.length ? ChartEngine.toSeconds(candles[vals[vals.length-1].idx]?.time||Date.now()) : 0;
        ob.setData([{time:t1,value:70},{time:t2,value:70}]);
        os.setData([{time:t1,value:30},{time:t2,value:30}]);
        series.push(s, ob, os);
        break;
      }

      case 'macd': {
        const f = params.fast   || 12;
        const s = params.slow   || 26;
        const g = params.signal || 9;
        const vals = Calc.macd(closes, f, s, g);
        label = `MACD(${f},${s},${g})`;
        const macdS = chart.addLineSeries({
          color: '#00e5a0', lineWidth: 1, title: 'MACD',
          priceScaleId: 'macd', scaleMargins: { top: 0.75, bottom: 0.02 },
        });
        const sigS  = chart.addLineSeries({
          color: '#f7931a', lineWidth: 1, title: 'Signal',
          priceScaleId: 'macd', scaleMargins: { top: 0.75, bottom: 0.02 },
        });
        const histS = chart.addHistogramSeries({
          priceScaleId: 'macd', scaleMargins: { top: 0.75, bottom: 0.02 }, title: 'Hist',
        });
        macdS.setData(vals.map(v => ({ time: ChartEngine.toSeconds(candles[v.idx]?.time||Date.now()), value: v.macd })));
        sigS.setData (vals.map(v => ({ time: ChartEngine.toSeconds(candles[v.idx]?.time||Date.now()), value: v.signal })));
        histS.setData(vals.map(v => ({
          time:  ChartEngine.toSeconds(candles[v.idx]?.time||Date.now()),
          value: v.histogram,
          color: v.histogram >= 0 ? 'rgba(0,229,160,0.7)' : 'rgba(255,77,106,0.7)',
        })));
        series.push(macdS, sigS, histS);
        break;
      }

      case 'vwap': {
        const vals = Calc.vwap(candles);
        label = 'VWAP';
        series.push(_addOverlay(chart, vals, candles, '#f59e0b', 1, label));
        break;
      }

      case 'obv': {
        const vals = Calc.obv(candles);
        label = 'OBV';
        const s2 = chart.addLineSeries({
          color, lineWidth: 1, title: label,
          priceScaleId: 'obv', scaleMargins: { top: 0.75, bottom: 0.02 },
        });
        s2.setData(vals.map(v => ({ time: ChartEngine.toSeconds(candles[v.idx]?.time||Date.now()), value: v.value })));
        series.push(s2);
        break;
      }

      case 'mfi': {
        const p    = params.period || 14;
        const vals = Calc.mfi(candles, p);
        label = `MFI(${p})`;
        const s2 = chart.addLineSeries({
          color, lineWidth: 1, title: label,
          priceScaleId: 'mfi', scaleMargins: { top: 0.75, bottom: 0.02 },
        });
        s2.setData(vals.map(v => ({ time: ChartEngine.toSeconds(candles[v.idx]?.time||Date.now()), value: v.value })));
        series.push(s2);
        break;
      }

      case 'stochastic': {
        const kP   = params.kPeriod || 14;
        const dP   = params.dPeriod || 3;
        const vals = Calc.stochastic(candles, kP, dP);
        label = `Stoch(${kP},${dP})`;
        const kS = chart.addLineSeries({ color: '#00e5a0', lineWidth:1, title:'%K', priceScaleId:'stoch', scaleMargins:{top:0.75,bottom:0.02} });
        const dS = chart.addLineSeries({ color: '#f7931a', lineWidth:1, title:'%D', priceScaleId:'stoch', scaleMargins:{top:0.75,bottom:0.02} });
        kS.setData(vals.map(v => ({ time: ChartEngine.toSeconds(candles[v.idx]?.time||Date.now()), value: v.k })));
        dS.setData(vals.map(v => ({ time: ChartEngine.toSeconds(candles[v.idx]?.time||Date.now()), value: v.d })));
        series.push(kS, dS);
        break;
      }

      case 'cci': {
        const p    = params.period || 20;
        const vals = Calc.cci(candles, p);
        label = `CCI(${p})`;
        const s2 = chart.addLineSeries({ color, lineWidth:1, title:label, priceScaleId:'cci', scaleMargins:{top:0.75,bottom:0.02} });
        s2.setData(vals.map(v => ({ time: ChartEngine.toSeconds(candles[v.idx]?.time||Date.now()), value: v.value })));
        series.push(s2);
        break;
      }

      case 'williamsr': {
        const p    = params.period || 14;
        const vals = Calc.williamsR(candles, p);
        label = `%R(${p})`;
        const s2 = chart.addLineSeries({ color, lineWidth:1, title:label, priceScaleId:'willr', scaleMargins:{top:0.75,bottom:0.02} });
        s2.setData(vals.map(v => ({ time: ChartEngine.toSeconds(candles[v.idx]?.time||Date.now()), value: v.value })));
        series.push(s2);
        break;
      }

      case 'atr': {
        const p    = params.period || 14;
        const vals = Calc.atr(candles, p);
        label = `ATR(${p})`;
        const s2 = chart.addLineSeries({ color, lineWidth:1, title:label, priceScaleId:'atr', scaleMargins:{top:0.75,bottom:0.02} });
        s2.setData(vals.map(v => ({ time: ChartEngine.toSeconds(candles[v.idx]?.time||Date.now()), value: v.value })));
        series.push(s2);
        break;
      }

      case 'supertrend': {
        const p    = params.period || 10;
        const mult = params.mult   || 3;
        const vals = Calc.supertrend(candles, p, mult);
        label = `ST(${p},${mult})`;
        const stUp   = chart.addLineSeries({ color:'#00e5a0', lineWidth:1, title:label+'+', priceLineVisible:false });
        const stDown = chart.addLineSeries({ color:'#ff4d6a', lineWidth:1, title:label+'-', priceLineVisible:false });
        const upData   = vals.filter(v => v.trend ===  1).map(v => ({ time: ChartEngine.toSeconds(candles[v.idx]?.time||Date.now()), value: v.value }));
        const downData = vals.filter(v => v.trend === -1).map(v => ({ time: ChartEngine.toSeconds(candles[v.idx]?.time||Date.now()), value: v.value }));
        stUp.setData(upData);
        stDown.setData(downData);
        series.push(stUp, stDown);
        break;
      }

      case 'psar': {
        const vals = Calc.psar(candles, params.step||0.02, params.max||0.2);
        label = 'PSAR';
        // Render as dots using a histogram workaround — show as line
        const s2 = chart.addLineSeries({ color, lineWidth:0, title:label, priceLineVisible:false, lastValueVisible:false });
        s2.setData(vals.map(v => ({ time: ChartEngine.toSeconds(candles[v.idx]?.time||Date.now()), value: v.value })));
        series.push(s2);
        break;
      }

      case 'ichimoku': {
        const vals = Calc.ichimoku(candles, params.tenkan||9, params.kijun||26, params.senkou||52);
        label = 'Ichimoku';
        const mkLine = (col, t, key) => {
          const s2 = chart.addLineSeries({ color: col, lineWidth:1, title:t, priceLineVisible:false });
          s2.setData(vals.map(v => ({ time: ChartEngine.toSeconds(candles[v.idx]?.time||Date.now()), value: v[key] })));
          return s2;
        };
        series.push(
          mkLine('#e11d48','Tenkan','tenkan'),
          mkLine('#2563eb','Kijun','kijun'),
          mkLine('#00e5a088','Senkou A','senkouA'),
          mkLine('#ff4d6a88','Senkou B','senkouB'),
        );
        break;
      }

      case 'adx': {
        const p    = params.period || 14;
        const vals = Calc.adx(candles, p);
        label = `ADX(${p})`;
        const adxS = chart.addLineSeries({ color:'#f7931a', lineWidth:1, title:'ADX',   priceScaleId:'adx', scaleMargins:{top:0.75,bottom:0.02} });
        const diPS = chart.addLineSeries({ color:'#00e5a0', lineWidth:1, title:'+DI',   priceScaleId:'adx', scaleMargins:{top:0.75,bottom:0.02} });
        const diNS = chart.addLineSeries({ color:'#ff4d6a', lineWidth:1, title:'-DI',   priceScaleId:'adx', scaleMargins:{top:0.75,bottom:0.02} });
        adxS.setData(vals.map(v => ({ time: ChartEngine.toSeconds(candles[v.idx]?.time||Date.now()), value: v.adx })));
        diPS.setData(vals.map(v => ({ time: ChartEngine.toSeconds(candles[v.idx]?.time||Date.now()), value: v.diPlus })));
        diNS.setData(vals.map(v => ({ time: ChartEngine.toSeconds(candles[v.idx]?.time||Date.now()), value: v.diMinus })));
        series.push(adxS, diPS, diNS);
        break;
      }

      case 'aroon': {
        const p    = params.period || 25;
        const vals = Calc.aroon(candles, p);
        label = `Aroon(${p})`;
        const aU = chart.addLineSeries({ color:'#00e5a0', lineWidth:1, title:'Aroon Up', priceScaleId:'aroon', scaleMargins:{top:0.75,bottom:0.02} });
        const aD = chart.addLineSeries({ color:'#ff4d6a', lineWidth:1, title:'Aroon Dn', priceScaleId:'aroon', scaleMargins:{top:0.75,bottom:0.02} });
        aU.setData(vals.map(v => ({ time: ChartEngine.toSeconds(candles[v.idx]?.time||Date.now()), value: v.up })));
        aD.setData(vals.map(v => ({ time: ChartEngine.toSeconds(candles[v.idx]?.time||Date.now()), value: v.down })));
        series.push(aU, aD);
        break;
      }

      default:
        console.warn('[Indicators] Unknown indicator type:', type);
        return null;
    }

    active.set(id, { series, label });
    _refreshPanel();
    return id;
  }

  /* ─── remove(id) ─── */
  function remove(id) {
    const entry = active.get(id);
    if (!entry) return;
    const chart = ChartEngine.getChart();
    if (chart) {
      entry.series.forEach(s => { try { chart.removeSeries(s); } catch(_) {} });
    }
    active.delete(id);
    _refreshPanel();
  }

  /* ─── removeAll() ─── */
  function removeAll() {
    [...active.keys()].forEach(id => remove(id));
  }

  /* ─── panel UI ─── */
  function _refreshPanel() {
    const panel = document.getElementById('activeIndicatorsPanel');
    if (!panel) return;
    panel.innerHTML = '';
    active.forEach((entry, id) => {
      const chip = document.createElement('div');
      chip.className = 'ind-chip';
      chip.innerHTML = `<span>${entry.label}</span><button onclick="IndicatorManager.remove(${id})" title="Remove">✕</button>`;
      panel.appendChild(chip);
    });
  }

  return { add, remove, removeAll };
})();
