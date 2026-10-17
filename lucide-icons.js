/* ═══════════════════════════════════════════════════════════════
   LUCIDE ICONS INTEGRATION
   Professional icon system for TradersBloc
   Using Lucide icons via CDN with fallback support
   ═══════════════════════════════════════════════════════════════ */

const LucideIcons = {
  // CDN loaded flag
  loaded: false,
  
  // Initialize Lucide icons
  init() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
      this.loaded = true;
      console.log('✓ Lucide icons initialized');
    } else {
      console.warn('⚠ Lucide library not loaded, retrying...');
      setTimeout(() => this.init(), 100);
    }
  },
  
  // Refresh icons (call after dynamically adding new icon elements)
  refresh() {
    if (this.loaded && typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  },
  
  // Create icon element programmatically
  create(iconName, options = {}) {
    const {
      size = 20,
      color = 'currentColor',
      strokeWidth = 2,
      className = ''
    } = options;
    
    const i = document.createElement('i');
    i.setAttribute('data-lucide', iconName);
    i.setAttribute('stroke-width', strokeWidth);
    if (className) i.className = className;
    if (size) i.style.width = size + 'px';
    if (size) i.style.height = size + 'px';
    if (color && color !== 'currentColor') i.style.color = color;
    
    // Initialize this specific icon
    if (this.loaded && typeof lucide !== 'undefined') {
      lucide.createIcons({ icons: { [iconName]: lucide.icons[iconName] } });
    }
    
    return i;
  },
  
  // Icon name mapping for easy reference
  icons: {
    // Navigation & UI
    menu: 'menu',
    x: 'x',
    chevronDown: 'chevron-down',
    chevronUp: 'chevron-up',
    chevronLeft: 'chevron-left',
    chevronRight: 'chevron-right',
    arrowLeft: 'arrow-left',
    arrowRight: 'arrow-right',
    arrowUp: 'arrow-up',
    arrowDown: 'arrow-down',
    
    // Trading
    trendingUp: 'trending-up',
    trendingDown: 'trending-down',
    activity: 'activity',
    barChart: 'bar-chart-2',
    lineChart: 'line-chart',
    candlestick: 'candlestick-chart',
    pieChart: 'pie-chart',
    
    // Financial
    dollarSign: 'dollar-sign',
    creditCard: 'credit-card',
    wallet: 'wallet',
    banknote: 'banknote',
    coins: 'coins',
    
    // Actions
    play: 'play',
    pause: 'pause',
    stop: 'square',
    refresh: 'refresh-cw',
    download: 'download',
    upload: 'upload',
    save: 'save',
    
    // Status
    check: 'check',
    checkCircle: 'check-circle',
    alertCircle: 'alert-circle',
    alertTriangle: 'alert-triangle',
    info: 'info',
    xCircle: 'x-circle',
    
    // User
    user: 'user',
    users: 'users',
    userPlus: 'user-plus',
    userCheck: 'user-check',
    
    // Communication
    bell: 'bell',
    mail: 'mail',
    messageSquare: 'message-square',
    
    // Settings
    settings: 'settings',
    sliders: 'sliders',
    filter: 'filter',
    
    // Time
    clock: 'clock',
    calendar: 'calendar',
    timer: 'timer',
    
    // Chart tools
    trendingFlat: 'minus',
    crosshair: 'crosshair',
    maximize: 'maximize',
    minimize: 'minimize',
    
    // Bots & AI
    bot: 'bot',
    cpu: 'cpu',
    zap: 'zap',
    sparkles: 'sparkles',
    brain: 'brain',
    
    // Analysis
    search: 'search',
    eye: 'eye',
    target: 'target',
    layers: 'layers',
    
    // File operations
    fileText: 'file-text',
    folder: 'folder',
    copy: 'copy',
    clipboard: 'clipboard',
    
    // Lock & Security
    lock: 'lock',
    unlock: 'unlock',
    shield: 'shield',
    key: 'key',
    
    // Misc
    star: 'star',
    heart: 'heart',
    bookmark: 'bookmark',
    flag: 'flag',
    tag: 'tag',
    sun: 'sun',
    moon: 'moon',
    
    // Directions
    cornerDownRight: 'corner-down-right',
    cornerUpRight: 'corner-up-right',
    
    // More trading specific
    percent: 'percent',
    plus: 'plus',
    minus: 'minus',
    equals: 'equal',
    
    // Layout
    grid: 'grid',
    layout: 'layout',
    sidebar: 'sidebar',
    maximize2: 'maximize-2',
    
    // Data
    database: 'database',
    server: 'server',
    
    // Social
    share: 'share-2',
    link: 'link',
    
    // Media
    image: 'image',
    video: 'video',
    
    // Logout
    logOut: 'log-out',
    logIn: 'log-in',
    
    // External
    externalLink: 'external-link',
    
    // List
    list: 'list',
    
    // Home
    home: 'home',
    
    // Help
    helpCircle: 'help-circle',
    
    // More
    moreVertical: 'more-vertical',
    moreHorizontal: 'more-horizontal'
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => LucideIcons.init(), 100);
  });
} else {
  setTimeout(() => LucideIcons.init(), 100);
}

// Expose globally
window.LucideIcons = LucideIcons;
