/**
 * Chart Fix Script - Ensures chart loads properly
 * Add this after all other scripts in platform.html
 */

(function() {
  'use strict';
  
  let initAttempts = 0;
  const MAX_ATTEMPTS = 10;
  
  function forceChartInit() {
    initAttempts++;
    
    console.log(`[ChartFix] Attempt ${initAttempts}/${MAX_ATTEMPTS}`);
    
    // Check if chart container exists
    const container = document.getElementById('chartContainer');
    if (!container) {
      console.error('[ChartFix] Chart container not found');
      if (initAttempts < MAX_ATTEMPTS) {
        setTimeout(forceChartInit, 500);
      }
      return;
    }
    
    // Check if LightweightCharts is loaded
    if (typeof LightweightCharts === 'undefined') {
      console.warn('[ChartFix] LightweightCharts not loaded yet');
      if (initAttempts < MAX_ATTEMPTS) {
        setTimeout(forceChartInit, 500);
      }
      return;
    }
    
    // Check if ChartEngine is loaded
    if (typeof ChartEngine === 'undefined') {
      console.warn('[ChartFix] ChartEngine not loaded yet');
      if (initAttempts < MAX_ATTEMPTS) {
        setTimeout(forceChartInit, 500);
      }
      return;
    }
    
    // Check if chart is already initialized
    if (window.chartInitialized) {
      console.log('[ChartFix] Chart already initialized');
      return;
    }
    
    console.log('[ChartFix] All dependencies loaded, initializing chart...');
    
    try {
      // Initialize chart
      const success = ChartEngine.init('chartContainer');
      
      if (success) {
        console.log('[ChartFix] ✅ Chart initialized successfully');
        window.chartInitialized = true;
        
        // Generate some sample data if chartCandles is empty
        if (typeof chartCandles !== 'undefined' && chartCandles.length === 0) {
          console.log('[ChartFix] Generating sample candle data...');
          generateSampleCandles();
        }
        
        // Update chart with current data
        if (typeof chartCandles !== 'undefined' && chartCandles.length > 0) {
          ChartEngine.update(chartCandles);
          console.log('[ChartFix] Chart updated with', chartCandles.length, 'candles');
        }
      } else {
        console.error('[ChartFix] Chart initialization returned false');
        if (initAttempts < MAX_ATTEMPTS) {
          setTimeout(forceChartInit, 1000);
        }
      }
    } catch (error) {
      console.error('[ChartFix] Chart initialization error:', error);
      if (initAttempts < MAX_ATTEMPTS) {
        setTimeout(forceChartInit, 1000);
      }
    }
  }
  
  function generateSampleCandles() {
    if (typeof chartCandles === 'undefined') {
      window.chartCandles = [];
    }
    
    // Clear existing candles
    chartCandles.length = 0;
    
    const now = Date.now();
    const basePrice = typeof currentPrice !== 'undefined' ? currentPrice : 1.08542;
    
    // Generate 100 candles with realistic movement
    let price = basePrice;
    
    for (let i = 100; i >= 0; i--) {
      const time = now - (i * 60 * 1000); // 1 minute intervals
      
      // Random walk with mean reversion
      const change = (Math.random() - 0.5) * 0.0005;
      const meanReversion = (basePrice - price) * 0.1;
      price += change + meanReversion;
      
      const open = price;
      const closeChange = (Math.random() - 0.5) * 0.0003;
      const close = open + closeChange;
      const high = Math.max(open, close) + Math.random() * 0.0002;
      const low = Math.min(open, close) - Math.random() * 0.0002;
      
      chartCandles.push({
        time: Math.floor(time / 1000),
        open: parseFloat(open.toFixed(5)),
        high: parseFloat(high.toFixed(5)),
        low: parseFloat(low.toFixed(5)),
        close: parseFloat(close.toFixed(5))
      });
    }
    
    console.log('[ChartFix] Generated', chartCandles.length, 'sample candles');
    console.log('[ChartFix] Price range:', Math.min(...chartCandles.map(c => c.low)).toFixed(5), '-', Math.max(...chartCandles.map(c => c.high)).toFixed(5));
  }
  
  // Start initialization attempts
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(forceChartInit, 500);
    });
  } else {
    setTimeout(forceChartInit, 500);
  }
  
  // Also try on window load
  window.addEventListener('load', () => {
    if (!window.chartInitialized) {
      setTimeout(forceChartInit, 1000);
    }
  });
  
  console.log('[ChartFix] Chart fix script loaded');
})();
