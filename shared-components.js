/**
 * TradersBloc - Shared JavaScript Components
 * Professional reusable functions for the redesigned platform
 */

// ─── APPLICATION SHELL FUNCTIONS ───

/**
 * Initialize Lucide icons globally
 */
function initializeIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

/**
 * Toggle user menu dropdown
 */
function toggleUserMenu(event) {
  event?.stopPropagation();
  const menu = document.getElementById('userMenu');
  if (menu) {
    menu.classList.toggle('open');
  }
}

/**
 * Close all dropdowns when clicking outside
 */
function initializeDropdownClose() {
  document.addEventListener('click', function(event) {
    // Close user menu
    const userMenu = document.querySelector('.user-menu');
    const menu = document.getElementById('userMenu');
    if (userMenu && menu && !userMenu.contains(event.target)) {
      menu.classList.remove('open');
    }
    
    // Close other dropdowns
    const dropdowns = document.querySelectorAll('.dropdown.open');
    dropdowns.forEach(dropdown => {
      if (!dropdown.contains(event.target)) {
        dropdown.classList.remove('open');
      }
    });
  });
}

/**
 * Initialize mobile sidebar toggle
 */
function initializeMobileSidebar() {
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.querySelector('.sidebar');
  
  if (hamburger && sidebar) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('open');
    });
  }
}

// ─── TAB SYSTEM ───

/**
 * Switch between tabs
 * @param {Event} event - Click event
 * @param {string} tabId - ID of tab content to show
 */
function switchTab(event, tabId) {
  const button = event.target.closest('.tab, .panel-tab');
  if (!button) return;
  
  const container = button.closest('.tabs, .panel-tabs').parentElement;
  const tabs = container.querySelectorAll('.tab, .panel-tab');
  const contents = container.querySelectorAll('.tab-content, .panel-content');
  
  // Remove active from all
  tabs.forEach(tab => tab.classList.remove('active'));
  contents.forEach(content => content.classList.remove('active'));
  
  // Add active to selected
  button.classList.add('active');
  const content = document.getElementById(tabId);
  if (content) {
    content.classList.add('active');
  }
}

// ─── NOTIFICATION SYSTEM ───

/**
 * Show toast notification
 * @param {string} message - Notification message
 * @param {string} type - Type: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in ms (default: 3000)
 */
function showNotification(message, type = 'info', duration = 3000) {
  // Create notification container if it doesn't exist
  let container = document.getElementById('notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    container.style.cssText = `
      position: fixed;
      top: calc(var(--topbar-height) + 16px);
      right: 16px;
      z-index: var(--z-tooltip);
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 400px;
    `;
    document.body.appendChild(container);
  }
  
  // Create notification
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
    background: var(--surface-overlay);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-3) var(--space-4);
    box-shadow: var(--shadow-lg);
    display: flex;
    align-items: center;
    gap: var(--space-3);
    animation: slideInRight 0.3s ease;
  `;
  
  // Icon based on type
  const icons = {
    success: 'check-circle',
    error: 'alert-circle',
    warning: 'alert-triangle',
    info: 'info'
  };
  
  const colors = {
    success: 'var(--state-positive)',
    error: 'var(--state-negative)',
    warning: 'var(--state-warning)',
    info: 'var(--accent-blue)'
  };
  
  notification.innerHTML = `
    <i data-lucide="${icons[type]}" style="width:18px;height:18px;color:${colors[type]};flex-shrink:0"></i>
    <span style="flex:1;font-size:var(--text-sm);color:var(--text-primary)">${message}</span>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--text-tertiary);cursor:pointer;padding:4px">
      <i data-lucide="x" style="width:14px;height:14px"></i>
    </button>
  `;
  
  container.appendChild(notification);
  initializeIcons();
  
  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }
}

// ─── MODAL SYSTEM ───

/**
 * Show modal dialog
 * @param {string} title - Modal title
 * @param {string} content - Modal content (HTML)
 * @param {Object} options - Options {onConfirm, onCancel, confirmText, cancelText}
 */
function showModal(title, content, options = {}) {
  const {
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    showCancel = true,
    showConfirm = true,
    size = 'md' // sm, md, lg
  } = options;
  
  // Create backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: var(--z-modal-backdrop);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    animation: fadeIn 0.2s ease;
  `;
  
  // Create modal
  const widths = { sm: '400px', md: '600px', lg: '800px' };
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.cssText = `
    background: var(--surface-overlay);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    width: 100%;
    max-width: ${widths[size]};
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    animation: scaleIn 0.2s ease;
  `;
  
  modal.innerHTML = `
    <div style="padding:var(--space-5) var(--space-6);border-bottom:1px solid var(--border-subtle)">
      <h3 style="font-size:var(--text-xl);font-weight:600;color:var(--text-primary)">${title}</h3>
    </div>
    <div style="padding:var(--space-6);overflow-y:auto;flex:1">
      ${content}
    </div>
    <div style="padding:var(--space-4) var(--space-6);border-top:1px solid var(--border-subtle);display:flex;justify-content:flex-end;gap:var(--space-2)">
      ${showCancel ? `<button class="btn btn-secondary" onclick="closeModal()">${cancelText}</button>` : ''}
      ${showConfirm ? `<button class="btn btn-primary" onclick="confirmModal()">${confirmText}</button>` : ''}
    </div>
  `;
  
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  
  // Click backdrop to close
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      closeModal();
      if (onCancel) onCancel();
    }
  });
  
  // Store callbacks
  window._modalCallbacks = { onConfirm, onCancel };
  
  // Add CSS animations if not present
  if (!document.getElementById('modal-animations')) {
    const style = document.createElement('style');
    style.id = 'modal-animations';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes scaleIn {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Close active modal
 */
function closeModal() {
  const backdrop = document.querySelector('.modal-backdrop');
  if (backdrop) {
    backdrop.style.animation = 'fadeOut 0.2s ease';
    setTimeout(() => backdrop.remove(), 200);
  }
}

/**
 * Confirm action in modal
 */
function confirmModal() {
  if (window._modalCallbacks?.onConfirm) {
    window._modalCallbacks.onConfirm();
  }
  closeModal();
}

// ─── DATA FORMATTING ───

/**
 * Format currency value
 * @param {number} value - Number to format
 * @param {string} currency - Currency code (default: USD)
 * @param {number} decimals - Decimal places (default: 2)
 */
function formatCurrency(value, currency = 'USD', decimals = 2) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  
  return formatted;
}

/**
 * Format percentage
 * @param {number} value - Number to format
 * @param {number} decimals - Decimal places (default: 2)
 */
function formatPercentage(value, decimals = 2) {
  return (value >= 0 ? '+' : '') + value.toFixed(decimals) + '%';
}

/**
 * Format number with separators
 * @param {number} value - Number to format
 * @param {number} decimals - Decimal places
 */
function formatNumber(value, decimals = 0) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format timestamp to readable time
 * @param {number|Date} timestamp - Unix timestamp or Date object
 * @param {string} format - 'time', 'date', 'datetime' (default: 'time')
 */
function formatTime(timestamp, format = 'time') {
  const date = typeof timestamp === 'number' 
    ? new Date(timestamp * 1000) 
    : timestamp;
  
  const options = {
    time: { hour: '2-digit', minute: '2-digit' },
    date: { month: 'short', day: 'numeric' },
    datetime: { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  };
  
  return date.toLocaleString('en-US', options[format]);
}

// ─── CHART HELPERS ───

/**
 * Generate sample candlestick data for demos
 * @param {number} count - Number of candles
 * @param {number} basePrice - Starting price
 */
function generateSampleData(count = 100, basePrice = 1.08500) {
  const now = Math.floor(Date.now() / 1000);
  const data = [];
  let price = basePrice;
  
  for (let i = count; i >= 0; i--) {
    const change = (Math.random() - 0.5) * 0.001;
    const open = price;
    price += change;
    const close = price;
    const high = Math.max(open, close) + Math.random() * 0.0005;
    const low = Math.min(open, close) - Math.random() * 0.0005;
    
    data.push({
      time: now - i * 60,
      open: parseFloat(open.toFixed(5)),
      high: parseFloat(high.toFixed(5)),
      low: parseFloat(low.toFixed(5)),
      close: parseFloat(close.toFixed(5)),
    });
  }
  
  return data;
}

/**
 * Initialize Lightweight Charts with standard theme
 * @param {HTMLElement} container - Chart container
 * @param {Object} options - Additional chart options
 */
function createStandardChart(container, options = {}) {
  if (typeof LightweightCharts === 'undefined') {
    console.error('LightweightCharts library not loaded');
    return null;
  }
  
  const chart = LightweightCharts.createChart(container, {
    layout: {
      background: { color: '#0B1120' },
      textColor: '#9CA3AF',
    },
    grid: {
      vertLines: { color: '#1F2937' },
      horzLines: { color: '#1F2937' },
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
    },
    timeScale: {
      borderColor: '#374151',
      timeVisible: true,
      secondsVisible: false,
    },
    rightPriceScale: {
      borderColor: '#374151',
    },
    ...options
  });
  
  // Handle resize
  const resizeObserver = new ResizeObserver(() => {
    chart.applyOptions({
      width: container.clientWidth,
      height: container.clientHeight
    });
  });
  resizeObserver.observe(container);
  
  return chart;
}

// ─── INITIALIZATION ───

/**
 * Initialize all shared components on page load
 */
function initializeApp() {
  initializeIcons();
  initializeDropdownClose();
  initializeMobileSidebar();
  
  // Re-initialize icons when new content is added
  const observer = new MutationObserver(() => {
    initializeIcons();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    toggleUserMenu,
    switchTab,
    showNotification,
    showModal,
    closeModal,
    formatCurrency,
    formatPercentage,
    formatNumber,
    formatTime,
    generateSampleData,
    createStandardChart
  };
}

// ─── SIDEBAR NAVIGATION ───

const SIDEBAR_ROUTES = {
  build: [
    { id: 'bot-builder-new', label: 'Bot Builder', icon: 'bot', path: 'bot-builder-new.html' },
  ],
  aiIntelligence: [
    { id: 'volt-ai', label: 'Volt AI', icon: 'zap', path: 'volt-ai.html', badge: 'AI' },
    { id: 'auto-ai', label: 'Auto AI', icon: 'brain', path: 'auto-ai.html', badge: 'AI' },
    { id: 'signal-ai', label: 'Signal AI', icon: 'activity', path: 'signal-ai.html', badge: 'AI' },
    { id: 'premium-ai', label: 'Premium AI', icon: 'sparkles', path: 'premium-ai.html', badge: 'PRO' },
  ],
  automation: [
    { id: 'quick-bot', label: 'Quick Bot', icon: 'clock', path: 'quick-bot.html' },
    { id: 'speed-bot', label: 'Speed Bot', icon: 'gauge', path: 'speed-bot.html' },
  ],
  marketplace: [
    { id: 'free-bots', label: 'Free Bots', icon: 'cpu', path: 'free-bots.html' },
  ],
  terminal: [
    { id: 'platform', label: 'Trading Terminal', icon: 'line-chart', path: 'platform.html' },
    { id: 'apex-trader', label: 'Apex Trader', icon: 'flame', path: 'apex-trader.html' },
    { id: 'copy-trader', label: 'Copy Trader', icon: 'copy', path: 'copy-trader.html' },
    { id: 'bulk-trader', label: 'Bulk Trader', icon: 'layers', path: 'bulk-trader.html' },
  ],
};

function buildSidebarNav() {
  const nav = document.getElementById('sidebarNav') || document.querySelector('.sidebar-nav');
  if (!nav) return;

  const currentPage = window.location.pathname.split('/').pop().replace('.html', '');

  const sections = [
    { id: 'build', label: 'Build', items: SIDEBAR_ROUTES.build },
    { id: 'ai', label: 'AI Intelligence', items: SIDEBAR_ROUTES.aiIntelligence },
    { id: 'automation', label: 'Automation', items: SIDEBAR_ROUTES.automation },
    { id: 'marketplace', label: 'Marketplace', items: SIDEBAR_ROUTES.marketplace },
    { id: 'terminal', label: 'Trading', items: SIDEBAR_ROUTES.terminal },
  ];

  let html = '';
  sections.forEach(section => {
    html += '<div class="sidebar-section">';
    html += '<div class="sidebar-section-title">' + section.label + '</div>';
    section.items.forEach(item => {
      const isActive = currentPage === item.id;
      html += '<a href="' + item.path + '" class="nav-item' + (isActive ? ' active' : '') + '">';
      html += '<i data-lucide="' + item.icon + '" class="nav-icon"></i>';
      html += '<span class="nav-label">' + item.label + '</span>';
      if (item.badge) html += '<span class="nav-badge">' + item.badge + '</span>';
      html += '</a>';
    });
    html += '</div>';
  });

  nav.innerHTML = html;
  lucide.createIcons();
}

// Override initializeApp to also build sidebar
const _originalInitApp = initializeApp;
function initializeApp() {
  _originalInitApp();
  buildSidebarNav();
}

// Re-run initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
