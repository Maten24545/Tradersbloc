/**
 * Tradersbloc — M-Pesa API Client
 * ───────────────────────────────────
 * Connects the frontend to the Node.js Daraja backend.
 * Change API_BASE to match where your server is running.
 */

const MPESA_API = {

  // ── Change this to your server URL ────────────────────────
  // Local dev:   'http://localhost:3000'
  // Production:  'https://api.yourdomain.com'
  BASE: 'http://localhost:3000',

  // KES per 1 USD (approximate — update as needed)
  KES_RATE: 130,

  /* ══════════════════════════════════════════════════════════
     initiateSTKPush
     Calls the backend which calls Daraja.
     Returns { success, checkoutRequestId, customerMessage }
     ══════════════════════════════════════════════════════════ */
  async initiateSTKPush(phone, usdAmount) {
    const amountKes = Math.round(usdAmount * this.KES_RATE);

    const res = await fetch(`${this.BASE}/api/mpesa/stkpush`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        phone,
        amount:       amountKes,
        accountRef:   'Tradersbloc',
        description:  'TC Deposit',
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'STK Push request failed');
    }

    return data;   // { checkoutRequestId, customerMessage, … }
  },

  /* ══════════════════════════════════════════════════════════
     pollStatus
     Polls /api/mpesa/status/:id every 3s for up to maxWaitMs.
     Resolves with the final tx object or rejects on timeout.
     ══════════════════════════════════════════════════════════ */
  pollStatus(checkoutRequestId, maxWaitMs = 90_000) {
    return new Promise((resolve, reject) => {
      const interval   = 3_000;
      const deadline   = Date.now() + maxWaitMs;
      let   attempts   = 0;

      const poll = async () => {
        attempts++;
        try {
          const res  = await fetch(`${this.BASE}/api/mpesa/status/${checkoutRequestId}`);
          const data = await res.json();

          if (data.status === 'success') return resolve(data);
          if (data.status === 'failed')  return reject(new Error(data.resultDesc || 'Payment failed or cancelled'));

          // Still pending — check deadline
          if (Date.now() >= deadline) {
            return reject(new Error('Payment timed out. Please check your M-Pesa messages and try again.'));
          }

          setTimeout(poll, interval);
        } catch (err) {
          // Network error during polling — retry a few times before giving up
          if (attempts < 3) return setTimeout(poll, interval);
          reject(err);
        }
      };

      poll();
    });
  },

  /* ══════════════════════════════════════════════════════════
     queryDirect
     Asks Safaricom directly for the status (fallback).
     ══════════════════════════════════════════════════════════ */
  async queryDirect(checkoutRequestId) {
    const res  = await fetch(`${this.BASE}/api/mpesa/query/${checkoutRequestId}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Query failed');
    return data;
  },

  /* ══════════════════════════════════════════════════════════
     isServerReachable
     Quick health check — returns true/false.
     ══════════════════════════════════════════════════════════ */
  async isServerReachable() {
    try {
      const res = await fetch(`${this.BASE}/api/health`, { signal: AbortSignal.timeout(5_000) });
      return res.ok;
    } catch {
      return false;
    }
  },
};
