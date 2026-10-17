/* ═══════════════════════════════════════════════════════════════
   SIDEBAR NAVIGATION
   Shared navigation for all 11 trading pages
   ═══════════════════════════════════════════════════════════════ */

const TRADING_ROUTES = {
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
    { id: 'apex-trader', label: 'Apex Trader', icon: 'flame', path: 'apex-trader.html' },
    { id: 'copy-trader', label: 'Copy Trader', icon: 'copy', path: 'copy-trader.html' },
    { id: 'bulk-trader', label: 'Bulk Trader', icon: 'layers', path: 'bulk-trader.html' },
  ],
};

class TradingSidebar {
  constructor() {
    this.currentPage = this.getCurrentPageId();
    this.init();
  }
  
  getCurrentPageId() {
    const path = window.location.pathname;
    const filename = path.substring(path.lastIndexOf('/') + 1);
    return filename.replace('.html', '');
  }
  
  init() {
    // Only initialize if sidebar exists
    const sidebarNav = document.querySelector('.sidebar-nav');
    if (!sidebarNav) return;
    
    // Render navigation
    this.renderNav();
    
    // Setup mobile toggle
    this.setupMobileToggle();
    
    // Setup logo link
    const logo = document.querySelector('.sidebar-header');
    if (logo) {
      logo.style.cursor = 'pointer';
      logo.addEventListener('click', () => {
        window.location.href = 'platform.html';
      });
    }
  }
  
  renderNav() {
    const sidebarNav = document.querySelector('.sidebar-nav');
    if (!sidebarNav) return;
    
    const sections = [
      { id: 'build', label: 'Build', items: TRADING_ROUTES.build },
      { id: 'ai', label: 'AI Intelligence', items: TRADING_ROUTES.aiIntelligence },
      { id: 'automation', label: 'Automation', items: TRADING_ROUTES.automation },
      { id: 'marketplace', label: 'Bot Marketplace', items: TRADING_ROUTES.marketplace },
      { id: 'terminal', label: 'Trading Terminal', items: TRADING_ROUTES.terminal },
    ];
    
    let html = '';
    
    sections.forEach(section => {
      html += `
        <div class="nav-section">
          <div class="nav-section-label">${section.label}</div>
          ${section.items.map(item => this.renderNavItem(item)).join('')}
        </div>
      `;
    });
    
    sidebarNav.innerHTML = html;
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }
  
  renderNavItem(item) {
    const isActive = this.currentPage === item.id || 
                     window.location.pathname.includes(item.id);
    
    return `
      <a href="${item.path}" class="nav-item ${isActive ? 'active' : ''}" data-page="${item.id}">
        <i data-lucide="${item.icon}"></i>
        <span>${item.label}</span>
        ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
      </a>
    `;
  }
  
  setupMobileToggle() {
    // Create mobile menu button if it doesn't exist
    const pageHeader = document.querySelector('.page-header');
    if (!pageHeader) return;
    
    // Check if mobile button already exists
    if (document.querySelector('.mobile-menu-btn')) return;
    
    const mobileBtn = document.createElement('button');
    mobileBtn.className = 'btn btn-ghost mobile-menu-btn';
    mobileBtn.innerHTML = '<i data-lucide="menu"></i>';
    mobileBtn.style.display = 'none';
    
    // Show on mobile
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleMediaChange = (e) => {
      mobileBtn.style.display = e.matches ? 'flex' : 'none';
    };
    mediaQuery.addListener(handleMediaChange);
    handleMediaChange(mediaQuery);
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
    
    // Toggle sidebar
    mobileBtn.addEventListener('click', () => {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        const isOpen = sidebar.classList.toggle('open');
        overlay.classList.toggle('active', isOpen);
        
        // Update icon
        const icon = mobileBtn.querySelector('i');
        if (icon) {
          icon.setAttribute('data-lucide', isOpen ? 'x' : 'menu');
          if (typeof lucide !== 'undefined') {
            lucide.createIcons();
          }
        }
      }
    });
    
    // Close sidebar when clicking overlay
    overlay.addEventListener('click', () => {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        
        // Update icon
        const icon = mobileBtn.querySelector('i');
        if (icon) {
          icon.setAttribute('data-lucide', 'menu');
          if (typeof lucide !== 'undefined') {
            lucide.createIcons();
          }
        }
      }
    });
    
    // Insert before page title
    const titleGroup = pageHeader.querySelector('.page-title-group');
    if (titleGroup) {
      pageHeader.insertBefore(mobileBtn, titleGroup);
    } else {
      pageHeader.prepend(mobileBtn);
    }
    
    // Initialize icon
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
    
    // Close sidebar when clicking a navigation link (mobile)
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          const sidebar = document.querySelector('.sidebar');
          if (sidebar) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            
            // Update icon
            const icon = mobileBtn.querySelector('i');
            if (icon) {
              icon.setAttribute('data-lucide', 'menu');
              if (typeof lucide !== 'undefined') {
                lucide.createIcons();
              }
            }
          }
        }
      });
    });
  }
}

// Initialize sidebar when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TradingSidebar();
  });
} else {
  new TradingSidebar();
}

// Export for use in other modules
window.TradingSidebar = TradingSidebar;
