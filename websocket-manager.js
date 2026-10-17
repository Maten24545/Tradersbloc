/* ═══════════════════════════════════════════════════════════════
   WEBSOCKET CONNECTION MANAGER
   Seamless real-time data connections for all trading pages
   ═══════════════════════════════════════════════════════════════ */

class WebSocketManager {
  constructor() {
    this.connections = new Map();
    this.reconnectAttempts = new Map();
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.heartbeatInterval = 30000; // 30 seconds
    this.subscribers = new Map();
    this.isOnline = navigator.onLine;
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Page visibility for connection management
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
  }

  /**
   * Connect to WebSocket endpoint
   * @param {string} name - Connection name (e.g., 'prices', 'trades', 'signals')
   * @param {string} url - WebSocket URL
   * @param {Object} options - Connection options
   */
  connect(name, url, options = {}) {
    if (this.connections.has(name)) {
      console.log(`[WebSocket] Already connected to ${name}`);
      return this.connections.get(name);
    }

    const wsUrl = this.buildWebSocketUrl(url);
    console.log(`[WebSocket] Connecting to ${name}: ${wsUrl}`);

    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => this.handleOpen(name, ws, options);
      ws.onmessage = (event) => this.handleMessage(name, event);
      ws.onerror = (error) => this.handleError(name, error);
      ws.onclose = (event) => this.handleClose(name, event, url, options);

      this.connections.set(name, ws);
      this.reconnectAttempts.set(name, 0);

      return ws;
    } catch (error) {
      console.error(`[WebSocket] Failed to connect to ${name}:`, error);
      this.scheduleReconnect(name, url, options);
      return null;
    }
  }

  /**
   * Build WebSocket URL from configuration
   */
  buildWebSocketUrl(url) {
    // If full URL provided, use it
    if (url.startsWith('ws://') || url.startsWith('wss://')) {
      return url;
    }

    // Build from current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const path = url.startsWith('/') ? url : `/${url}`;
    
    return `${protocol}//${host}${path}`;
  }

  /**
   * Handle connection open
   */
  handleOpen(name, ws, options) {
    console.log(`[WebSocket] ✓ Connected to ${name}`);
    this.reconnectAttempts.set(name, 0);

    // Send initial subscription if provided
    if (options.subscribe) {
      this.send(name, options.subscribe);
    }

    // Start heartbeat
    this.startHeartbeat(name);

    // Notify subscribers
    this.notify(name, 'connected', { name, status: 'connected' });

    // Call onOpen callback if provided
    if (options.onOpen) {
      options.onOpen(ws);
    }
  }

  /**
   * Handle incoming message
   */
  handleMessage(name, event) {
    try {
      const data = JSON.parse(event.data);
      
      // Handle heartbeat/pong
      if (data.type === 'pong' || data.type === 'heartbeat') {
        return;
      }

      // Notify subscribers
      this.notify(name, 'message', data);

    } catch (error) {
      console.error(`[WebSocket] Failed to parse message from ${name}:`, error);
      // Still notify with raw data
      this.notify(name, 'message', event.data);
    }
  }

  /**
   * Handle connection error
   */
  handleError(name, error) {
    console.error(`[WebSocket] ✗ Error on ${name}:`, error);
    this.notify(name, 'error', { name, error });
  }

  /**
   * Handle connection close
   */
  handleClose(name, event, url, options) {
    const wasClean = event.wasClean;
    const code = event.code;
    const reason = event.reason || 'Unknown reason';

    console.log(`[WebSocket] Disconnected from ${name} (${code}): ${reason}`);

    // Stop heartbeat
    this.stopHeartbeat(name);

    // Remove from active connections
    this.connections.delete(name);

    // Notify subscribers
    this.notify(name, 'disconnected', { name, code, reason, wasClean });

    // Attempt reconnection if not a clean close
    if (!wasClean && this.isOnline && !document.hidden) {
      this.scheduleReconnect(name, url, options);
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect(name, url, options) {
    const attempts = this.reconnectAttempts.get(name) || 0;

    if (attempts >= this.maxReconnectAttempts) {
      console.error(`[WebSocket] Max reconnect attempts reached for ${name}`);
      this.notify(name, 'reconnect_failed', { name, attempts });
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = this.reconnectDelay * Math.pow(2, attempts);
    
    console.log(`[WebSocket] Reconnecting to ${name} in ${delay}ms (attempt ${attempts + 1}/${this.maxReconnectAttempts})`);

    this.reconnectAttempts.set(name, attempts + 1);

    setTimeout(() => {
      if (this.isOnline && !document.hidden) {
        this.connect(name, url, options);
      }
    }, delay);
  }

  /**
   * Send message to WebSocket
   */
  send(name, data) {
    const ws = this.connections.get(name);
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn(`[WebSocket] Cannot send to ${name}: Not connected`);
      return false;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      ws.send(message);
      return true;
    } catch (error) {
      console.error(`[WebSocket] Failed to send to ${name}:`, error);
      return false;
    }
  }

  /**
   * Subscribe to WebSocket events
   */
  subscribe(name, event, callback) {
    const key = `${name}:${event}`;
    
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    
    this.subscribers.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(key);
      if (subs) {
        subs.delete(callback);
      }
    };
  }

  /**
   * Notify subscribers of event
   */
  notify(name, event, data) {
    const key = `${name}:${event}`;
    const subscribers = this.subscribers.get(key);

    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[WebSocket] Subscriber error on ${key}:`, error);
        }
      });
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(name) {
    const ws = this.connections.get(name);
    
    if (ws) {
      this.stopHeartbeat(name);
      ws.close(1000, 'Client disconnect');
      this.connections.delete(name);
      console.log(`[WebSocket] Disconnected from ${name}`);
    }
  }

  /**
   * Disconnect all WebSockets
   */
  disconnectAll() {
    console.log('[WebSocket] Disconnecting all connections');
    this.connections.forEach((ws, name) => {
      this.disconnect(name);
    });
  }

  /**
   * Start heartbeat for connection
   */
  startHeartbeat(name) {
    this.stopHeartbeat(name); // Clear any existing heartbeat

    const intervalId = setInterval(() => {
      const ws = this.connections.get(name);
      
      if (ws && ws.readyState === WebSocket.OPEN) {
        this.send(name, { type: 'ping', timestamp: Date.now() });
      } else {
        this.stopHeartbeat(name);
      }
    }, this.heartbeatInterval);

    // Store interval ID for cleanup
    if (!this.heartbeatIntervals) {
      this.heartbeatIntervals = new Map();
    }
    this.heartbeatIntervals.set(name, intervalId);
  }

  /**
   * Stop heartbeat for connection
   */
  stopHeartbeat(name) {
    if (this.heartbeatIntervals && this.heartbeatIntervals.has(name)) {
      clearInterval(this.heartbeatIntervals.get(name));
      this.heartbeatIntervals.delete(name);
    }
  }

  /**
   * Handle online event
   */
  handleOnline() {
    console.log('[WebSocket] Network connection restored');
    this.isOnline = true;
    
    // Reconnect all disconnected sockets
    this.reconnectAttempts.forEach((attempts, name) => {
      if (!this.connections.has(name)) {
        console.log(`[WebSocket] Auto-reconnecting ${name}`);
        // Trigger reconnection logic
      }
    });
  }

  /**
   * Handle offline event
   */
  handleOffline() {
    console.log('[WebSocket] Network connection lost');
    this.isOnline = false;
    
    // Notify all subscribers of offline status
    this.connections.forEach((ws, name) => {
      this.notify(name, 'offline', { name });
    });
  }

  /**
   * Handle page visibility change
   */
  handleVisibilityChange() {
    if (document.hidden) {
      console.log('[WebSocket] Page hidden - pausing connections');
      // Optionally pause heartbeats or close connections
    } else {
      console.log('[WebSocket] Page visible - resuming connections');
      // Check and reconnect if needed
      this.connections.forEach((ws, name) => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.log(`[WebSocket] Reconnecting ${name} after visibility change`);
          // Trigger reconnection
        }
      });
    }
  }

  /**
   * Get connection status
   */
  getStatus(name) {
    const ws = this.connections.get(name);
    
    if (!ws) {
      return 'disconnected';
    }

    switch (ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }

  /**
   * Get all connection statuses
   */
  getAllStatuses() {
    const statuses = {};
    this.connections.forEach((ws, name) => {
      statuses[name] = this.getStatus(name);
    });
    return statuses;
  }

  /**
   * Check if connected
   */
  isConnected(name) {
    return this.getStatus(name) === 'connected';
  }
}

// Create global instance
const wsManager = new WebSocketManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WebSocketManager, wsManager };
}

// Make available globally
window.wsManager = wsManager;
window.WebSocketManager = WebSocketManager;

console.log('[WebSocket] Manager initialized');
