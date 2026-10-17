/* Volt AI Engine - Market Analysis Workspace */

class VoltAIEngine {
  constructor() {
    this.chart = null;
    this.candleSeries = null;
    this.ma20Series = null;
    this.ma50Series = null;
    this.currentSymbol = 'BTCUSDT';
    this.currentTimeframe = '15';
    this.priceData = [];
    this.init();
  }
  
  init() {
    this.initChart();
    this.setupEventListeners();
    this.generateInitialData();
    this.startPriceUpdates();
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }
  
  initChart() {
    const container = document.getElementById('voltChart');
    if (!container || typeof LightweightCharts === 'undefined') return;
    
    this.chart = LightweightCharts.createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { color: '#10141C' },
        textColor: '#94A3B8',
      },
      grid: {
        vertLines: { color: '#1E2634' },
        horzLines: { color: '#1E2634' },
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#303A4A',
      },
      timeScale: {
        borderColor: '#303A4A',
        timeVisible: true,
        secondsVisible: false,
      },
    });
    
    // Add candlestick series
    this.candleSeries = this.chart.addCandlestickSeries({
      upColor: '#22C55E',
      downColor: '#F04452',
      borderUpColor: '#22C55E',
      borderDownColor: '#F04452',
      wickUpColor: '#22C55E',
      wickDownColor: '#F04452',
    });
    
    // Add MA series
    this.ma20Series = this.chart.addLineSeries({
      color: '#237BFF',
      lineWidth: 2,
      title: 'MA(20)',
    });
    
    this.ma50Series = this.chart.addLineSeries({
      color: '#F59E0B',
      lineWidth: 2,
      title: 'MA(50)',
    });
    
    // Handle resize
    window.addEventListener('resize', () => {
      if (this.chart && container) {
        this.chart.applyOptions({
          width: container.clientWidth,
          height: container.clientHeight,
        });
      }
    });
  }
  
  setupEventListeners() {
    // Instrument buttons
    document.querySelectorAll('.instrument-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.instrument-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentSymbol = btn.dataset.symbol;
        this.switchInstrument(this.currentSymbol);
      });
    });
    
    // Timeframe buttons
    document.querySelectorAll('.tf-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTimeframe = btn.dataset.tf;
        this.switchTimeframe(this.currentTimeframe);
      });
    });
    
    // Indicator chips
    document.querySelectorAll('.indicator-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('active');
        this.updateIndicators();
      });
    });
  }
  
  generateInitialData() {
    const basePrice = 63450;
    const now = Math.floor(Date.now() / 1000);
    const bars = 100;
    
    for (let i = bars; i >= 0; i--) {
      const time = now - (i * 900); // 15min bars
      const volatility = 150;
      const trend = (bars - i) * 2;
      
      const open = basePrice + trend + (Math.random() - 0.5) * volatility;
      const close = open + (Math.random() - 0.5) * volatility;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;
      
      this.priceData.push({
        time,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
      });
    }
    
    this.updateChart();
  }
  
  updateChart() {
    if (!this.candleSeries) return;
    
    this.candleSeries.setData(this.priceData);
    
    // Calculate MA20
    const ma20Data = this.calculateMA(this.priceData, 20);
    this.ma20Series.setData(ma20Data);
    
    // Calculate MA50
    const ma50Data = this.calculateMA(this.priceData, 50);
    this.ma50Series.setData(ma50Data);
    
    // Fit content
    this.chart.timeScale().fitContent();
  }
  
  calculateMA(data, period) {
    const result = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, bar) => acc + bar.close, 0);
      const avg = sum / period;
      result.push({
        time: data[i].time,
        value: parseFloat(avg.toFixed(2)),
      });
    }
    return result;
  }
  
  startPriceUpdates() {
    setInterval(() => {
      if (this.priceData.length === 0) return;
      
      const lastBar = this.priceData[this.priceData.length - 1];
      const newTime = lastBar.time + 900;
      const volatility = 100;
      
      const open = lastBar.close;
      const close = open + (Math.random() - 0.48) * volatility;
      const high = Math.max(open, close) + Math.random() * volatility * 0.3;
      const low = Math.min(open, close) - Math.random() * volatility * 0.3;
      
      const newBar = {
        time: newTime,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
      };
      
      this.priceData.push(newBar);
      if (this.priceData.length > 150) {
        this.priceData.shift();
      }
      
      this.candleSeries.update(newBar);
      
      // Update MAs
      const ma20Data = this.calculateMA(this.priceData, 20);
      if (ma20Data.length > 0) {
        this.ma20Series.update(ma20Data[ma20Data.length - 1]);
      }
      
      const ma50Data = this.calculateMA(this.priceData, 50);
      if (ma50Data.length > 0) {
        this.ma50Series.update(ma50Data[ma50Data.length - 1]);
      }
      
      // Update price display
      this.updatePriceDisplay(close);
    }, 3000);
  }
  
  updatePriceDisplay(price) {
    const priceEl = document.querySelector('.instrument-btn.active .stat-value');
    if (priceEl) {
      priceEl.textContent = '$' + price.toFixed(2);
    }
  }
  
  switchInstrument(symbol) {
    console.log('Switching to instrument:', symbol);
    // In a real implementation, this would fetch new data
    this.generateInitialData();
  }
  
  switchTimeframe(tf) {
    console.log('Switching to timeframe:', tf);
    // In a real implementation, this would fetch data for new timeframe
  }
  
  updateIndicators() {
    const activeIndicators = Array.from(document.querySelectorAll('.indicator-chip.active'))
      .map(chip => chip.textContent.trim());
    console.log('Active indicators:', activeIndicators);
  }
}

// Initialize
let voltAI;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    voltAI = new VoltAIEngine();
  });
} else {
  voltAI = new VoltAIEngine();
}
