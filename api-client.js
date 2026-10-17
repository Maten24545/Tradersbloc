/**
 * Tradersbloc — Frontend API Client
 * ─────────────────────────────────────────────────────────────
 * All HTTP calls to the backend go through this module.
 * Handles JWT storage, auto-refresh on 401, and error toasts.
 *
 * For demo accounts (accountType === 'demo'), all calls
 * short-circuit to localStorage so no real money moves.
 * ─────────────────────────────────────────────────────────────
 */

const API = (() => {

  /* ── Config ── */
  // Empty string = same origin (when served by the Node server)
  // For local file:// dev, set to 'http://localhost:3000'
  const BASE = window.location.protocol === 'file:'
    ? 'http://localhost:3000'
    : '';

  /* ── Token storage (memory + sessionStorage; NOT localStorage for security) ── */
  let _accessToken  = sessionStorage.getItem('tc_access')  || null;
  let _refreshToken = sessionStorage.getItem('tc_refresh') || null;

  function setTokens(access, refresh) {
    _accessToken  = access;
    _refreshToken = refresh;
    sessionStorage.setItem('tc_access',  access  || '');
    sessionStorage.setItem('tc_refresh', refresh || '');
  }

  function clearTokens() {
    _accessToken = _refreshToken = null;
    sessionStorage.removeItem('tc_access');
    sessionStorage.removeItem('tc_refresh');
  }

  /* ── Determine if current session is demo ── */
  function isDemo() {
    try {
      const s = JSON.parse(localStorage.getItem('tc_session') || 'null');
      return s?.accountType === 'demo';
    } catch { return false; }
  }

  /* ── Core fetch wrapper ── */
  async function request(method, endpoint, body = null, retry = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    let res;
    try {
      res = await fetch(BASE + endpoint, opts);
    } catch (networkErr) {
      console.error(`[API] Network error on ${method} ${endpoint}:`, networkErr);
      return { success: false, message: 'Could not connect to the server. Please check your connection and try again.' };
    }

    // Auto-refresh on 401 TOKEN_EXPIRED
    if (res.status === 401 && retry && _refreshToken) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${_accessToken}`;
        try {
          res = await fetch(BASE + endpoint, { ...opts, headers });
        } catch (retryErr) {
          console.error(`[API] Network error on retry ${method} ${endpoint}:`, retryErr);
          return { success: false, message: 'Could not connect to the server. Please check your connection and try again.' };
        }
      } else {
        clearTokens();
        window.location.href = '/login.html';
        return;
      }
    }

    const data = await res.json().catch(() => ({ success: false, message: res.statusText }));
    if (!res.ok && !data.success) {
      const msg = data.message || `HTTP ${res.status}`;
      console.error(`[API] ${method} ${endpoint} →`, msg);
    }
    return data;
  }

  async function tryRefresh() {
    try {
      const res  = await fetch(BASE + '/api/auth/refresh', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refreshToken: _refreshToken }),
      });
      const data = await res.json();
      if (data.success && data.accessToken) {
        setTokens(data.accessToken, data.refreshToken);
        return true;
      }
    } catch {}
    return false;
  }

  /* ── Convenience methods ── */
  const get    = (url)          => request('GET',    url);
  const post   = (url, body)    => request('POST',   url, body);
  const patch  = (url, body)    => request('PATCH',  url, body);
  const del    = (url)          => request('DELETE', url);

  /* ════════════════════════════════════════════════════════
     AUTH
     ════════════════════════════════════════════════════════ */
  const auth = {
    async register(firstName, lastName, email, password) {
      const data = await post('/api/auth/register', { firstName, lastName, email, password });
      if (data?.success && !data?.requiresOTP) {
        setTokens(data.accessToken, data.refreshToken);
        _cacheUser(data.user);
      }
      return data;
    },

    async verifyRegisterOTP(email, otpCode) {
      const data = await post('/api/auth/register/verify-otp', { email, otpCode });
      if (data?.success) {
        setTokens(data.accessToken, data.refreshToken);
        _cacheUser(data.user);
      }
      return data;
    },

    async login(email, password, totpCode) {
      const data = await post('/api/auth/login', { email, password, totpCode });
      if (data?.success && !data?.requiresOTP && !data?.requires2FA) {
        setTokens(data.accessToken, data.refreshToken);
        _cacheUser(data.user);
      }
      return data;
    },

    async verifyLoginOTP(email, otpCode) {
      const data = await post('/api/auth/login/verify-otp', { email, otpCode });
      if (data?.success) {
        setTokens(data.accessToken, data.refreshToken);
        _cacheUser(data.user);
      }
      return data;
    },

    async resendOTP(email, action) {
      return post('/api/auth/resend-otp', { email, action });
    },

    async logout() {
      await post('/api/auth/logout', { refreshToken: _refreshToken });
      clearTokens();
      localStorage.removeItem('tc_session');
      window.location.href = '/login.html';
    },

    async me() {
      const data = await get('/api/auth/me');
      if (data?.success) _cacheUser(data.user);
      return data;
    },

    async verifyEmail(token)          { return post('/api/auth/verify-email', { token }); },
    async requestReset(email)         { return post('/api/auth/request-reset', { email }); },
    async resetPassword(token, password) { return post('/api/auth/reset-password', { token, password }); },
    async setup2FA()                  { return post('/api/auth/2fa/setup', {}); },
    async verify2FA(code)             { return post('/api/auth/2fa/verify', { code }); },
    async disable2FA(code)            { return post('/api/auth/2fa/disable', { code }); },

    async googleLogin(credential) {
      const data = await post('/api/auth/google', { credential });
      if (data?.success) {
        setTokens(data.accessToken, data.refreshToken);
        _cacheUser(data.user);
      }
      return data;
    },

    isLoggedIn:    () => !!(_accessToken),
    getAccessToken: () => _accessToken,
  };

  /* ════════════════════════════════════════════════════════
     WALLET
     ════════════════════════════════════════════════════════ */
  const wallet = {
    async getBalance() {
      if (isDemo()) {
        const s = JSON.parse(localStorage.getItem('tc_session') || '{}');
        return { success: true, balance: s.balance || 0, accountType: 'demo' };
      }
      return get('/api/wallet/balance');
    },

    async getTransactions(page = 1) {
      if (isDemo()) {
        const s = JSON.parse(localStorage.getItem('tc_session') || '{}');
        return { success: true, transactions: s.transactions || [], total: 0 };
      }
      return get(`/api/wallet/transactions?page=${page}`);
    },

    async depositMpesa(phone, amountUSD) {
      if (isDemo()) return _demoDeposit(amountUSD, 'M-Pesa');
      return post('/api/wallet/deposit/mpesa', { phone, amountUSD });
    },

    async pollMpesaStatus(txId) {
      if (isDemo()) return { success: true, status: 'completed' };
      return get(`/api/wallet/mpesa/status/${txId}`);
    },

    async depositCard(amountUSD, txRef) {
      if (isDemo()) return _demoDeposit(amountUSD, 'Card');
      return post('/api/wallet/deposit/card', { amountUSD, txRef });
    },

    async withdraw(amountUSD, method, account) {
      if (isDemo()) return { success: false, message: 'Demo accounts cannot withdraw real funds.' };
      return post('/api/wallet/withdraw', { amountUSD, method, account });
    },
  };

  /* ════════════════════════════════════════════════════════
     TRADES
     ════════════════════════════════════════════════════════ */
  const trades = {
    async place(asset, direction, amountUSD, expirySecs, entryPrice) {
      if (isDemo()) return _demoTradePlaced(asset, direction, amountUSD, expirySecs, entryPrice);
      return post('/api/trades/place', { tradeType: 'binary', asset, direction, amountUSD, expirySecs, entryPrice });
    },

    async placeForex(asset, direction, amountUSD, entryPrice, leverage, stopLoss, takeProfit) {
      if (isDemo()) return _demoForexPlaced(asset, direction, amountUSD, entryPrice, leverage, stopLoss, takeProfit);
      return post('/api/trades/place', { tradeType: 'forex', asset, direction, amountUSD, entryPrice, leverage, stopLoss, takeProfit });
    },

    async settle(tradeId, exitPrice) {
      if (isDemo()) return _demoTradeSettled(tradeId, exitPrice);
      return post(`/api/trades/${tradeId}/settle`, { exitPrice });
    },

    async closeForex(tradeId, exitPrice) {
      if (isDemo()) return _demoForexClosed(tradeId, exitPrice);
      return post(`/api/trades/${tradeId}/settle`, { exitPrice });
    },

    async history(page = 1, result = null) {
      if (isDemo()) {
        const s = JSON.parse(localStorage.getItem('tc_session') || '{}');
        return { success: true, trades: s.trades || [], total: 0 };
      }
      const q = result ? `&result=${result}` : '';
      return get(`/api/trades?page=${page}${q}`);
    },

    async getOpenForex() {
      if (isDemo()) {
        const s = JSON.parse(localStorage.getItem('tc_session') || '{}');
        const openPositions = (s.forexPositions || []).filter(p => p.status === 'open');
        return { success: true, positions: openPositions, count: openPositions.length };
      }
      return get('/api/trades/forex/open');
    },
  };

  /* ════════════════════════════════════════════════════════
     KYC
     ════════════════════════════════════════════════════════ */
  const kyc = {
    async getStatus() { return get('/api/kyc/status'); },

    async upload(file, docType) {
      const form = new FormData();
      form.append('document', file);
      form.append('docType', docType);
      const headers = {};
      if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;
      const res  = await fetch(BASE + '/api/kyc/upload', { method: 'POST', headers, body: form });
      return res.json();
    },
  };

  /* ════════════════════════════════════════════════════════
     DEMO MODE — localStorage shims
     ════════════════════════════════════════════════════════ */
  function _getSession() { return JSON.parse(localStorage.getItem('tc_session') || '{}'); }
  function _saveSession(s) { localStorage.setItem('tc_session', JSON.stringify(s)); }

  function _cacheUser(user) {
    // For real accounts, cache a minimal user profile for UI
    const existing = JSON.parse(localStorage.getItem('tc_session') || '{}');
    _saveSession({ ...existing, ...user });
  }

  function _demoDeposit(amountUSD, method) {
    const s = _getSession();
    s.balance = (s.balance || 0) + amountUSD;
    if (!s.transactions) s.transactions = [];
    s.transactions.unshift({ type: 'deposit', amount: amountUSD, method, date: new Date().toISOString(), status: 'completed' });
    _saveSession(s);
    return { success: true, amountUSD, newBalance: s.balance };
  }

  function _demoTradePlaced(asset, direction, amountUSD, expirySecs, entryPrice) {
    const s = _getSession();
    s.balance = (s.balance || 0) - amountUSD;
    const tradeId = 'demo_' + Date.now();
    _saveSession(s);
    return {
      success: true, tradeId,
      payoutRate: 0.82, potentialPayout: amountUSD * 0.82,
      newBalance: s.balance,
    };
  }

  function _demoForexPlaced(asset, direction, amountUSD, entryPrice, leverage, stopLoss, takeProfit) {
    const s = _getSession();
    s.balance = (s.balance || 0) - amountUSD;
    if (!s.forexPositions) s.forexPositions = [];
    const positionId = 'demo_fx_' + Date.now();
    s.forexPositions.push({
      id: positionId, asset, direction, amountUSD, entryPrice,
      leverage: leverage || 1, stopLoss, takeProfit,
      status: 'open', openedAt: new Date().toISOString()
    });
    _saveSession(s);
    return {
      success: true, tradeType: 'forex', tradeId: positionId,
      leverage: leverage || 1, stopLoss, takeProfit,
      newBalance: s.balance,
    };
  }

  function _demoTradeSettled(tradeId, exitPrice) {
    // Caller handles demo settlement logic
    return { success: true, result: 'win', payout: 0 };
  }

  function _demoForexClosed(tradeId, exitPrice) {
    const s = _getSession();
    if (!s.forexPositions) s.forexPositions = [];
    const idx = s.forexPositions.findIndex(p => p.id === tradeId);
    if (idx === -1) return { success: false, message: 'Position not found' };
    
    const pos = s.forexPositions[idx];
    const priceDiff = pos.direction === 'buy' 
      ? exitPrice - pos.entryPrice 
      : pos.entryPrice - exitPrice;
    const profitLoss = (priceDiff / pos.entryPrice) * pos.amountUSD * (pos.leverage || 1);
    const pips = priceDiff * (pos.asset.includes('JPY') ? 100 : 10000);
    
    s.balance += pos.amountUSD + profitLoss;
    pos.status = 'closed';
    pos.exitPrice = exitPrice;
    pos.profitLoss = profitLoss;
    pos.pips = pips;
    pos.closedAt = new Date().toISOString();
    
    _saveSession(s);
    return {
      success: true, tradeType: 'forex',
      result: profitLoss > 0 ? 'win' : 'loss',
      profitLoss, pips, newBalance: s.balance
    };
  }

  /* ── Init: try to restore session from API on page load ── */
  async function init() {
    if (!_accessToken) return false;
    try {
      const data = await auth.me();
      return data?.success || false;
    } catch {
      return false;
    }
  }

  return { auth, wallet, trades, kyc, isDemo, init, BASE };
})();
