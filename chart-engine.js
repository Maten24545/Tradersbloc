/**
 * Tradersbloc — Chart Engine
 * ─────────────────────────────────────────────────────────────
 * Wraps TradingView Lightweight Charts v4.
 * Provides: chart types, series management, real-time updates,
 * zoom/pan, legend, crosshair, fullscreen, theme switching.
 *
 * Designed to be a drop-in replacement for the raw canvas
 * drawChart() function. All existing platform.js hooks
 * (onNewPrice, activeTrade, chartCandles) remain compatible.
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   CHART ENGINE MODULE
   ═══════════════════════════════════════════════════════════════ */
const ChartEngine = (() => {

  /* ── State ── */
  let chart          = null;      // LWC chart instance
  let mainSeries     = null;      // active main series
  let volumeSeries   = null;      // volume histogram
  let entryLine      = null;      // price line for active trade entry
  let chartType      = 'candlestick';
  let isDark         = true;
  let isFullscreen   = false;
  let containerEl    = null;
  let legendEl       = null;
  let haData         = [];        // Heikin-Ashi computed candles

  /* ── Theme tokens matching existing CSS vars ── */
  const THEMES = {
    dark: {
      background:       '#080a10',
      text:             '#8890a8',
      gridLines:        'rgba(255,255,255,0.04)',
      borderColor:      'rgba(255,255,255,0.07)',
      crosshairColor:   'rgba(255,255,255,0.3)',
      upColor:          '#00e5a0',
      downColor:        '#ff4d6a',
      wickUpColor:      '#00e5a0',
      wickDownColor:    '#ff4d6a',
      borderUpColor:    '#00e5a0',
      borderDownColor:  '#ff4d6a',
    },
    light: {
      background:       '#f4f6fa',
      text:             '#4a5568',
      gridLines:        'rgba(0,0,0,0.05)',
      borderColor:      'rgba(0,0,0,0.1)',
      crosshairColor:   'rgba(0,0,0,0.4)',
      upColor:          '#00a870',
      downColor:        '#e53e3e',
      wickUpColor:      '#00a870',
      wickDownColor:    '#e53e3e',
      borderUpColor:    '#00a870',
      borderDownColor:  '#e53e3e',
    },
  };

  /* ── Helpers ── */
  function theme() { return isDark ? THEMES.dark : THEMES.light; }

  function toSeconds(ms) { return Math.floor(ms / 1000); }

  function lwcCandles(candles) {
    return candles.map(c => ({
      time:  toSeconds(c.time),
      open:  c.open,
      high:  c.high,
      low:   c.low,
      close: c.close,
    }));
  }

  function lwcLine(candles) {
    return candles.map(c => ({ time: toSeconds(c.time), value: c.close }));
  }

  function lwcArea(candles) {
    return candles.map(c => ({ time: toSeconds(c.time), value: c.close }));
  }

  function lwcVolume(candles) {
    return candles.map(c => ({
      time:  toSeconds(c.time),
      value: c.volume || Math.abs(c.close - c.open) * 10000,
      color: c.close >= c.open
        ? 'rgba(0,229,160,0.4)'
        : 'rgba(255,77,106,0.4)',
    }));
  }

  /* ── Heikin-Ashi transform ── */
  function toHeikinAshi(candles) {
    if (!candles.length) return [];
    const ha = [];
    for (let i = 0; i < candles.length; i++) {
      const c    = candles[i];
      const prev = ha[i - 1] || c;
      const haClose = (c.open + c.high + c.low + c.close) / 4;
      const haOpen  = (prev.open + prev.close) / 2;
      const haHigh  = Math.max(c.high, haOpen, haClose);
      const haLow   = Math.min(c.low,  haOpen, haClose);
      ha.push({ time: c.time, open: haOpen, high: haHigh, low: haLow, close: haClose });
    }
    return ha;
  }

  /* ── Baseline value (midpoint of visible range) ── */
  function baselineValue(candles) {
    if (!candles.length) return 0;
    const closes = candles.map(c => c.close);
    return (Math.min(...closes) + Math.max(...closes)) / 2;
  }

  /* ─────────────────────────────────────────────────
     init(containerId)
     Creates the LWC chart and attaches it to the DOM.
     Defers until the container has real dimensions.
  ───────────────────────────────────────────────── */
  function init(containerId) {
    containerEl = document.getElementById(containerId);
    if (!containerEl) {
      console.error('[ChartEngine] Container not found:', containerId);
      return false;
    }
    if (!window.LightweightCharts) {
      console.error('[ChartEngine] LightweightCharts not loaded');
      return false;
    }

    const t = theme();

    // Ensure container fills available space before measuring
    containerEl.style.width  = '100%';
    containerEl.style.height = '100%';

    // Measure — use parent dimensions if container reads 0
    function getSize() {
      let w = containerEl.clientWidth;
      let h = containerEl.clientHeight;
      if (w === 0 || h === 0) {
        const parent = containerEl.parentElement;
        w = parent ? parent.clientWidth  : window.innerWidth;
        h = parent ? parent.clientHeight : window.innerHeight - 120;
      }
      // Subtract fixed toolbars if still reading full parent height
      if (h > window.innerHeight - 50) h = window.innerHeight - 160;
      return { w: Math.max(w, 200), h: Math.max(h, 300) };
    }

    const { w, h } = getSize();

    chart = LightweightCharts.createChart(containerEl, {
      width:  w,
      height: h,
      layout: {
        background:  { type: 'solid', color: t.background },
        textColor:   t.text,
        fontFamily:  "'Inter', system-ui, sans-serif",
        fontSize:    11,
      },
      grid: {
        vertLines: { color: t.gridLines },
        horzLines: { color: t.gridLines },
      },
      crosshair: {
        mode:     LightweightCharts.CrosshairMode.Normal,
        vertLine: { color: t.crosshairColor, labelBackgroundColor: '#1a1e2a' },
        horzLine: { color: t.crosshairColor, labelBackgroundColor: '#1a1e2a' },
      },
      rightPriceScale: {
        borderColor:  t.borderColor,
        scaleMargins: { top: 0.08, bottom: 0.15 },
      },
      timeScale: {
        borderColor:    t.borderColor,
        timeVisible:    true,
        secondsVisible: true,
        rightOffset:    5,
        barSpacing:     8,
        minBarSpacing:  2,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true },
      handleScale:  { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
    });

    /* Legend */
    legendEl = document.getElementById('chartLegend');

    /* Crosshair → legend update */
    chart.subscribeCrosshairMove(param => {
      if (!legendEl || !mainSeries) return;
      let priceData;
      if (param.time && param.seriesData) {
        priceData = param.seriesData.get(mainSeries);
      }
      if (priceData) {
        const o = priceData.open  !== undefined ? priceData.open.toFixed(_dp())  : '—';
        const h2 = priceData.high !== undefined ? priceData.high.toFixed(_dp())  : '—';
        const l = priceData.low   !== undefined ? priceData.low.toFixed(_dp())   : '—';
        const c = priceData.close !== undefined ? priceData.close.toFixed(_dp()) :
                  priceData.value !== undefined ? priceData.value.toFixed(_dp()) : '—';
        legendEl.innerHTML =
          `<span class="leg-o">O <strong>${o}</strong></span>` +
          `<span class="leg-h up">H <strong>${h2}</strong></span>` +
          `<span class="leg-l down">L <strong>${l}</strong></span>` +
          `<span class="leg-c">C <strong>${c}</strong></span>`;
      }
    });

    /* ResizeObserver — recalculate on every layout change */
    const ro = new ResizeObserver(() => {
      if (!chart || !containerEl) return;
      const { w: rw, h: rh } = getSize();
      chart.resize(rw, rh);
    });
    ro.observe(containerEl);

    // Also watch window resize
    window.addEventListener('resize', () => {
      if (!chart || !containerEl) return;
      const { w: rw, h: rh } = getSize();
      chart.resize(rw, rh);
    });

    console.log('[ChartEngine] Initialised at', w, '×', h);
    return true;
  }

  /* ── decimal places from global dp() ── */
  function _dp() {
    try { return dp(); } catch(_) { return 2; }
  }

  /* ─────────────────────────────────────────────────
     setChartType(type, candles)
     Switches the main series type, destroys old series.
  ───────────────────────────────────────────────── */
  function setChartType(type, candles) {
    if (!chart) return;
    chartType = type;

    // Remove existing series
    if (mainSeries)   { try { chart.removeSeries(mainSeries); } catch(_){} mainSeries = null; }
    if (volumeSeries) { try { chart.removeSeries(volumeSeries); } catch(_){} volumeSeries = null; }

    const t = theme();

    switch (type) {

      case 'candlestick':
      case 'hollow': {
        mainSeries = chart.addCandlestickSeries({
          upColor:          type === 'hollow' ? 'transparent' : t.upColor,
          downColor:        type === 'hollow' ? 'transparent' : t.downColor,
          borderUpColor:    t.upColor,
          borderDownColor:  t.downColor,
          wickUpColor:      t.wickUpColor,
          wickDownColor:    t.wickDownColor,
        });
        mainSeries.setData(lwcCandles(candles));
        break;
      }

      case 'ohlc': {
        mainSeries = chart.addBarSeries({
          upColor:   t.upColor,
          downColor: t.downColor,
        });
        mainSeries.setData(lwcCandles(candles));
        break;
      }

      case 'line': {
        mainSeries = chart.addLineSeries({
          color:     t.upColor,
          lineWidth: 2,
        });
        mainSeries.setData(lwcLine(candles));
        break;
      }

      case 'area': {
        mainSeries = chart.addAreaSeries({
          lineColor:        t.upColor,
          topColor:         isDark ? 'rgba(0,229,160,0.25)' : 'rgba(0,168,89,0.2)',
          bottomColor:      isDark ? 'rgba(0,229,160,0.01)' : 'rgba(0,168,89,0.01)',
          lineWidth:        2,
        });
        mainSeries.setData(lwcArea(candles));
        break;
      }

      case 'baseline': {
        const bv = baselineValue(candles);
        mainSeries = chart.addBaselineSeries({
          baseValue:               { type: 'price', price: bv },
          topLineColor:            t.upColor,
          topFillColor1:           isDark ? 'rgba(0,229,160,0.2)' : 'rgba(0,168,89,0.15)',
          topFillColor2:           isDark ? 'rgba(0,229,160,0.01)' : 'rgba(0,168,89,0.01)',
          bottomLineColor:         t.downColor,
          bottomFillColor1:        isDark ? 'rgba(255,77,106,0.01)' : 'rgba(229,62,62,0.01)',
          bottomFillColor2:        isDark ? 'rgba(255,77,106,0.2)'  : 'rgba(229,62,62,0.15)',
          lineWidth:               2,
        });
        mainSeries.setData(lwcLine(candles));
        break;
      }

      case 'heikin': {
        haData = toHeikinAshi(candles);
        mainSeries = chart.addCandlestickSeries({
          upColor:          t.upColor,
          downColor:        t.downColor,
          borderUpColor:    t.upColor,
          borderDownColor:  t.downColor,
          wickUpColor:      t.wickUpColor,
          wickDownColor:    t.wickDownColor,
        });
        mainSeries.setData(lwcCandles(haData));
        break;
      }

      default: {
        // Fallback to candlestick
        mainSeries = chart.addCandlestickSeries({
          upColor: t.upColor, downColor: t.downColor,
          borderUpColor: t.upColor, borderDownColor: t.downColor,
          wickUpColor: t.upColor, wickDownColor: t.downColor,
        });
        mainSeries.setData(lwcCandles(candles));
      }
    }

    // Volume (shown for candlestick types)
    if (['candlestick','hollow','heikin','ohlc'].includes(type)) {
      volumeSeries = chart.addHistogramSeries({
        priceFormat:     { type: 'volume' },
        priceScaleId:    '',
        scaleMargins:    { top: 0.85, bottom: 0 },
      });
      volumeSeries.setData(lwcVolume(type === 'heikin' ? haData : candles));
    }

    // Scroll to the latest candle
    chart.timeScale().scrollToRealTime();
  }

  /* ─────────────────────────────────────────────────
     update(candle)  — called by onNewPrice / updateChartTick
     Pushes a single real-time candle update.
  ───────────────────────────────────────────────── */
  function update(candle) {
    if (!mainSeries || !candle) return;

    let c = candle;
    if (chartType === 'heikin') {
      const prev = haData.length ? haData[haData.length - 1] : candle;
      const haClose = (c.open + c.high + c.low + c.close) / 4;
      const haOpen  = (prev.open + prev.close) / 2;
      const haHigh  = Math.max(c.high, haOpen, haClose);
      const haLow   = Math.min(c.low,  haOpen, haClose);
      c = { time: candle.time, open: haOpen, high: haHigh, low: haLow, close: haClose };

      // Update or push last HA candle
      if (haData.length && haData[haData.length-1].time === candle.time) {
        haData[haData.length - 1] = c;
      } else {
        haData.push(c);
      }
    }

    const pt = toSeconds(c.time);

    if (['candlestick','hollow','heikin','ohlc'].includes(chartType)) {
      try {
        mainSeries.update({ time: pt, open: c.open, high: c.high, low: c.low, close: c.close });
      } catch(_) {}
    } else {
      try {
        mainSeries.update({ time: pt, value: c.close });
      } catch(_) {}
    }

    // Volume
    if (volumeSeries) {
      try {
        volumeSeries.update({
          time:  pt,
          value: candle.volume || Math.abs(candle.close - candle.open) * 10000,
          color: candle.close >= candle.open ? 'rgba(0,229,160,0.4)' : 'rgba(255,77,106,0.4)',
        });
      } catch(_) {}
    }
  }

  /* ─────────────────────────────────────────────────
     setEntryLine(price, direction)
     Shows a price line at the trade entry price.
  ───────────────────────────────────────────────── */
  function setEntryLine(price, direction) {
    if (!mainSeries) return;
    removeEntryLine();
    entryLine = mainSeries.createPriceLine({
      price,
      color:         direction === 'buy' ? '#00e5a0' : '#ff4d6a',
      lineWidth:     1,
      lineStyle:     LightweightCharts.LineStyle.Dashed,
      axisLabelVisible: true,
      title:         direction === 'buy' ? '▲ ENTRY' : '▼ ENTRY',
    });
  }

  function removeEntryLine() {
    if (entryLine && mainSeries) {
      try { mainSeries.removePriceLine(entryLine); } catch(_) {}
      entryLine = null;
    }
  }

  /* ─────────────────────────────────────────────────
     setMarkers(markers)
     Renders pattern detection markers on the series.
     markers: [ { time, position, color, shape, text } ]
  ───────────────────────────────────────────────── */
  function setMarkers(markers) {
    if (!mainSeries) return;
    try {
      mainSeries.setMarkers(markers.map(m => ({
        time:     toSeconds(m.time),
        position: m.position || 'aboveBar',
        color:    m.color    || '#00e5a0',
        shape:    m.shape    || 'circle',
        text:     m.text     || '',
        size:     m.size     || 1,
      })));
    } catch(_) {}
  }

  /* ─────────────────────────────────────────────────
     toggleTheme()
  ───────────────────────────────────────────────── */
  function toggleTheme() {
    isDark = !isDark;
    if (!chart) return;
    const t = theme();
    chart.applyOptions({
      layout: { background: { color: t.background }, textColor: t.text },
      grid:   { vertLines: { color: t.gridLines }, horzLines: { color: t.gridLines } },
      rightPriceScale: { borderColor: t.borderColor },
      timeScale: { borderColor: t.borderColor },
    });
    // Update series colors
    if (mainSeries && chartType === 'candlestick') {
      mainSeries.applyOptions({
        upColor: t.upColor, downColor: t.downColor,
        borderUpColor: t.upColor, borderDownColor: t.downColor,
        wickUpColor: t.wickUpColor, wickDownColor: t.wickDownColor,
      });
    }
    // Toggle body class for CSS
    document.body.classList.toggle('theme-light', !isDark);
    return isDark;
  }

  /* ─────────────────────────────────────────────────
     toggleFullscreen()
  ───────────────────────────────────────────────── */
  function toggleFullscreen() {
    const panel = document.querySelector('.chart-panel');
    if (!panel) return;
    isFullscreen = !isFullscreen;
    if (isFullscreen) {
      panel.style.cssText = 'position:fixed;inset:0;z-index:999;width:100vw;height:100vh;';
    } else {
      panel.style.cssText = '';
    }
    setTimeout(() => {
      if (chart && containerEl) {
        chart.resize(containerEl.clientWidth, containerEl.clientHeight);
      }
    }, 50);
    return isFullscreen;
  }

  /* ─────────────────────────────────────────────────
     reload(candles)
     Full data reload (asset or timeframe change).
  ───────────────────────────────────────────────── */
  function reload(candles) {
    setChartType(chartType, candles);
  }

  /* ─────────────────────────────────────────────────
     getChart()  — exposes LWC chart instance for indicators
  ───────────────────────────────────────────────── */
  function getChart() { return chart; }

  /* ─────────────────────────────────────────────────
     getCurrentType()
  ───────────────────────────────────────────────── */
  function getCurrentType() { return chartType; }

  /* ─────────────────────────────────────────────────
     scrollToNow()
  ───────────────────────────────────────────────── */
  function scrollToNow() {
    if (chart) chart.timeScale().scrollToRealTime();
  }

  return {
    init,
    setChartType,
    update,
    reload,
    setEntryLine,
    removeEntryLine,
    setMarkers,
    toggleTheme,
    toggleFullscreen,
    scrollToNow,
    getChart,
    getCurrentType,
    toSeconds,
  };
})();
