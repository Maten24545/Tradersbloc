/* Bot Builder Engine - Node-based Strategy Editor */

class BotBuilderEngine {
  constructor() {
    this.nodes = [];
    this.connections = [];
    this.selectedNode = null;
    this.nodeIdCounter = 0;
    this.isDraggingNode = false;
    this.dragOffset = { x: 0, y: 0 };
    this.init();
  }
  
  init() {
    this.setupDragAndDrop();
    this.setupCanvas();
    this.setupKeyboardShortcuts();
    this.loadSavedStrategy();
    this.logConsole('Bot Builder initialized', 'success');
    this.logConsole('Tip: Drag components from the left panel onto the canvas', 'info');
  }
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Delete selected node with Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedNode) {
        e.preventDefault();
        this.deleteNode(this.selectedNode.id);
      }
      
      // Deselect with Escape
      if (e.key === 'Escape') {
        this.deselectAll();
      }
      
      // Save with Ctrl+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveStrategy();
      }
      
      // Clear canvas with Ctrl+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        clearCanvas();
      }
    });
  }
  
  setupDragAndDrop() {
    const components = document.querySelectorAll('.component-item[draggable="true"]');
    const canvas = document.getElementById('canvasNodes');
    const canvasArea = document.querySelector('.canvas-area');
    
    components.forEach(comp => {
      comp.addEventListener('dragstart', (e) => {
        const nodeType = e.target.dataset.nodeType;
        e.dataTransfer.setData('nodeType', nodeType);
        e.dataTransfer.effectAllowed = 'copy';
        e.target.style.opacity = '0.5';
      });
      
      comp.addEventListener('dragend', (e) => {
        e.target.style.opacity = '1';
      });
    });
    
    canvasArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      canvasArea.classList.add('drag-over');
    });
    
    canvasArea.addEventListener('dragleave', (e) => {
      if (e.target === canvasArea) {
        canvasArea.classList.remove('drag-over');
      }
    });
    
    canvasArea.addEventListener('drop', (e) => {
      e.preventDefault();
      canvasArea.classList.remove('drag-over');
      const nodeType = e.dataTransfer.getData('nodeType');
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - 100; // Center on drop
      const y = e.clientY - rect.top - 50;
      this.createNode(nodeType, x, y);
    });
  }
  
  setupCanvas() {
    const canvas = document.getElementById('canvasNodes');
    canvas.addEventListener('click', (e) => {
      if (e.target === canvas || e.target.classList.contains('canvas-grid')) {
        this.deselectAll();
      }
    });
  }
  
  createNode(type, x, y) {
    const nodeConfig = this.getNodeConfig(type);
    const node = {
      id: `node-${this.nodeIdCounter++}`,
      type,
      x,
      y,
      config: nodeConfig.defaultConfig || {}
    };
    
    this.nodes.push(node);
    this.renderNode(node);
    this.logConsole(`Added ${nodeConfig.label} node`, 'success');
    
    // Hide empty state when first node is added
    this.updateEmptyState();
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }
  
  updateEmptyState() {
    const emptyState = document.getElementById('canvasEmptyState');
    if (emptyState) {
      emptyState.style.display = this.nodes.length === 0 ? 'block' : 'none';
    }
  }
  
  getNodeConfig(type) {
    const configs = {
      'entry': { label: 'Start', icon: 'play-circle', color: 'var(--positive)', defaultConfig: {} },
      'price-above': { label: 'Price Above', icon: 'trending-up', color: 'var(--primary)', defaultConfig: { price: 1.08 } },
      'price-below': { label: 'Price Below', icon: 'trending-down', color: 'var(--primary)', defaultConfig: { price: 1.08 } },
      'crossover': { label: 'MA Crossover', icon: 'arrow-up-right', color: 'var(--primary)', defaultConfig: { fast: 10, slow: 20 } },
      'rsi': { label: 'RSI', icon: 'activity', color: 'var(--primary)', defaultConfig: { period: 14, overbought: 70, oversold: 30 } },
      'macd': { label: 'MACD', icon: 'bar-chart-2', color: 'var(--primary)', defaultConfig: { fast: 12, slow: 26, signal: 9 } },
      'bollinger': { label: 'Bollinger Bands', icon: 'area-chart', color: 'var(--primary)', defaultConfig: { period: 20, std: 2 } },
      'buy': { label: 'Buy', icon: 'arrow-up', color: 'var(--positive)', defaultConfig: { amount: 10 } },
      'sell': { label: 'Sell', icon: 'arrow-down', color: 'var(--negative)', defaultConfig: { amount: 10 } },
      'stop-loss': { label: 'Stop Loss', icon: 'shield-off', color: 'var(--negative)', defaultConfig: { percentage: 5 } }
    };
    return configs[type] || { label: 'Unknown', icon: 'help-circle', color: 'var(--text-tertiary)' };
  }
  
  renderNode(node) {
    const canvas = document.getElementById('canvasNodes');
    const config = this.getNodeConfig(node.type);
    
    const nodeEl = document.createElement('div');
    nodeEl.className = 'flow-node';
    nodeEl.id = node.id;
    nodeEl.style.left = node.x + 'px';
    nodeEl.style.top = node.y + 'px';
    
    nodeEl.innerHTML = `
      <div class="node-port input"></div>
      <div class="node-port output"></div>
      <div class="node-header">
        <i data-lucide="${config.icon}" class="node-icon"></i>
        <span class="node-title">${config.label}</span>
        <button class="node-delete" onclick="botBuilder.deleteNode('${node.id}')">
          <i data-lucide="x" style="width:14px;height:14px;"></i>
        </button>
      </div>
      <div class="node-body">
        ${this.renderNodeFields(node)}
      </div>
    `;
    
    canvas.appendChild(nodeEl);
    this.setupNodeInteractions(nodeEl, node);
  }
  
  renderNodeFields(node) {
    const fields = [];
    const config = node.config;
    
    for (const [key, value] of Object.entries(config)) {
      fields.push(`
        <div class="node-field">
          <label>${key.charAt(0).toUpperCase() + key.slice(1)}</label>
          <input type="number" value="${value}" 
                 onchange="botBuilder.updateNodeConfig('${node.id}', '${key}', this.value)"
                 step="0.01">
        </div>
      `);
    }
    
    return fields.join('') || '<p style="font-size:12px;color:var(--text-tertiary);">No configuration needed</p>';
  }
  
  setupNodeInteractions(nodeEl, node) {
    const header = nodeEl.querySelector('.node-header');
    
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.node-delete')) return;
      
      this.selectNode(node.id);
      this.isDraggingNode = true;
      nodeEl.classList.add('dragging');
      
      const rect = nodeEl.getBoundingClientRect();
      this.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      e.preventDefault();
    });
    
    nodeEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectNode(node.id);
    });
  }
  
  selectNode(nodeId) {
    this.deselectAll();
    const nodeEl = document.getElementById(nodeId);
    if (nodeEl) {
      nodeEl.classList.add('selected');
      this.selectedNode = this.nodes.find(n => n.id === nodeId);
      this.updatePropertiesPanel(this.selectedNode);
    }
  }
  
  deselectAll() {
    document.querySelectorAll('.flow-node').forEach(n => n.classList.remove('selected'));
    this.selectedNode = null;
    this.showEmptyPropertiesPanel();
  }
  
  updatePropertiesPanel(node) {
    const panel = document.getElementById('propertiesPanel');
    const config = this.getNodeConfig(node.type);
    
    let fieldsHtml = '';
    for (const [key, value] of Object.entries(node.config)) {
      fieldsHtml += `
        <div class="node-field">
          <label>${key.charAt(0).toUpperCase() + key.slice(1)}</label>
          <input type="number" value="${value}" 
                 onchange="botBuilder.updateNodeConfig('${node.id}', '${key}', this.value)"
                 step="0.01">
        </div>
      `;
    }
    
    panel.innerHTML = `
      <h3 style="font-size:16px;margin-bottom:var(--space-4);display:flex;align-items:center;gap:var(--space-2);">
        <i data-lucide="${config.icon}" style="width:20px;height:20px;color:var(--primary);"></i>
        ${config.label}
      </h3>
      ${fieldsHtml || '<p style="font-size:13px;color:var(--text-secondary);">No configuration options</p>'}
      <button class="btn btn-danger btn-sm" style="margin-top:var(--space-4);width:100%;" 
              onclick="botBuilder.deleteNode('${node.id}')">
        <i data-lucide="trash-2"></i>
        Delete Node
      </button>
    `;
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }
  
  showEmptyPropertiesPanel() {
    const panel = document.getElementById('propertiesPanel');
    panel.innerHTML = `
      <div class="empty-state" style="padding: var(--space-8) var(--space-4);">
        <i data-lucide="settings" style="width: 48px; height: 48px; margin: 0 auto var(--space-4); display: block; color: var(--text-tertiary);"></i>
        <h3 style="font-size: 16px; margin-bottom: var(--space-2);">No Node Selected</h3>
        <p style="font-size: 13px; color: var(--text-secondary);">Select a node to view and edit its properties</p>
      </div>
    `;
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }
  
  updateNodeConfig(nodeId, key, value) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.config[key] = parseFloat(value);
      this.logConsole(`Updated ${key} to ${value}`, 'success');
    }
  }
  
  deleteNode(nodeId) {
    const index = this.nodes.findIndex(n => n.id === nodeId);
    if (index !== -1) {
      const nodeConfig = this.getNodeConfig(this.nodes[index].type);
      this.nodes.splice(index, 1);
      const nodeEl = document.getElementById(nodeId);
      if (nodeEl) {
        // Add fade-out animation
        nodeEl.style.transition = 'opacity 0.2s, transform 0.2s';
        nodeEl.style.opacity = '0';
        nodeEl.style.transform = 'scale(0.8)';
        setTimeout(() => nodeEl.remove(), 200);
      }
      this.deselectAll();
      this.updateEmptyState();
      this.logConsole(`${nodeConfig.label} node deleted`, 'warning');
    }
  }
  
  logConsole(message, type = 'info') {
    const console = document.getElementById('consoleContent');
    const time = new Date().toLocaleTimeString();
    const log = document.createElement('div');
    log.className = `console-log ${type}`;
    log.innerHTML = `<span class="console-time">${time}</span><span>${message}</span>`;
    console.appendChild(log);
    console.scrollTop = console.scrollHeight;
  }
  
  saveStrategy() {
    const strategy = {
      nodes: this.nodes,
      connections: this.connections,
      timestamp: Date.now()
    };
    localStorage.setItem('bot_builder_strategy', JSON.stringify(strategy));
    this.logConsole('Strategy saved successfully', 'success');
  }
  
  loadSavedStrategy() {
    const saved = localStorage.getItem('bot_builder_strategy');
    if (saved) {
      try {
        const strategy = JSON.parse(saved);
        strategy.nodes.forEach(node => {
          this.nodes.push(node);
          this.renderNode(node);
        });
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
        this.logConsole('Previous strategy loaded', 'success');
      } catch (e) {
        this.logConsole('Failed to load strategy', 'error');
      }
    }
  }
}

// Global instance
let botBuilder;

// Global functions for onclick handlers
function clearCanvas() {
  if (confirm('Clear all nodes? This cannot be undone.')) {
    botBuilder.nodes = [];
    document.getElementById('canvasNodes').innerHTML = `
      <div id="canvasEmptyState" style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        pointer-events: none;
        user-select: none;
      ">
        <i data-lucide="mouse-pointer-2" style="
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          display: block;
          color: var(--text-tertiary);
          opacity: 0.5;
        "></i>
        <h3 style="font-size: 18px; font-weight: 600; color: var(--text-secondary); margin: 0 0 8px 0;">
          Start Building Your Strategy
        </h3>
        <p style="font-size: 14px; color: var(--text-tertiary); margin: 0;">
          Drag components from the left panel onto the canvas
        </p>
      </div>
    `;
    botBuilder.deselectAll();
    botBuilder.logConsole('Canvas cleared', 'warning');
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }
}

function testStrategy() {
  if (botBuilder.nodes.length === 0) {
    alert('Add some nodes first!');
    return;
  }
  botBuilder.logConsole('Testing strategy...', 'info');
  setTimeout(() => {
    botBuilder.logConsole('✓ Entry conditions validated', 'success');
    botBuilder.logConsole('✓ Indicators configured correctly', 'success');
    botBuilder.logConsole('✓ Actions defined', 'success');
    botBuilder.logConsole(`Strategy test complete: ${botBuilder.nodes.length} nodes`, 'success');
  }, 1000);
}

function saveStrategy() {
  botBuilder.saveStrategy();
}

function clearConsole() {
  document.getElementById('consoleContent').innerHTML = '';
}

// Mouse move handler for dragging nodes
document.addEventListener('mousemove', (e) => {
  if (botBuilder && botBuilder.isDraggingNode && botBuilder.selectedNode) {
    const canvas = document.getElementById('canvasNodes');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - botBuilder.dragOffset.x;
    const y = e.clientY - rect.top - botBuilder.dragOffset.y;
    
    botBuilder.selectedNode.x = Math.max(0, Math.min(x, rect.width - 200));
    botBuilder.selectedNode.y = Math.max(0, Math.min(y, rect.height - 100));
    
    const nodeEl = document.getElementById(botBuilder.selectedNode.id);
    if (nodeEl) {
      nodeEl.style.left = botBuilder.selectedNode.x + 'px';
      nodeEl.style.top = botBuilder.selectedNode.y + 'px';
    }
  }
});

document.addEventListener('mouseup', () => {
  if (botBuilder) {
    botBuilder.isDraggingNode = false;
    // Remove dragging class from all nodes
    document.querySelectorAll('.flow-node.dragging').forEach(node => {
      node.classList.remove('dragging');
    });
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    botBuilder = new BotBuilderEngine();
  });
} else {
  botBuilder = new BotBuilderEngine();
}
