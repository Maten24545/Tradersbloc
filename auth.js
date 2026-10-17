/**
 * Tradersbloc — Frontend Auth (login, register, demo)
 * Uses API.auth for real accounts; localStorage for demo only.
 */

/* ─── Password visibility toggle ─── */
function togglePw(id, btn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.type = el.type === 'text' ? 'password' : 'text';
  btn.textContent = el.type === 'password' ? '👁' : '🙈';
}

function showMsg(id, text, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'block';
  el.className     = 'auth-msg ' + type;
  el.textContent   = text;
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.dataset.orig = btn.textContent;
    btn.textContent  = 'Please wait…';
  } else {
    btn.textContent = btn.dataset.orig || btn.textContent;
  }
}

/* ─── Card formatter ─── */
function formatCard() {
  const cn = document.getElementById('cardNumber');
  if (cn) cn.addEventListener('input', () => {
    let v = cn.value.replace(/\D/g,'').slice(0,16);
    cn.value = v.match(/.{1,4}/g)?.join(' ') || v;
  });
  const exp = document.getElementById('cardExpiry');
  if (exp) exp.addEventListener('input', () => {
    let v = exp.value.replace(/\D/g,'').slice(0,4);
    if (v.length >= 2) v = v.slice(0,2) + '/' + v.slice(2);
    exp.value = v;
  });
}
formatCard();

/* ══════════════════════════════════════════════════════════
   REGISTER
   ══════════════════════════════════════════════════════════ */
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  let pendingEmail = null;

  registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    const firstName = document.getElementById('firstName').value.trim();
    const lastName  = document.getElementById('lastName').value.trim();
    const email     = document.getElementById('regEmail').value.trim().toLowerCase();
    const pass      = document.getElementById('regPassword').value;
    const pass2     = document.getElementById('regPassword2').value;
    const terms     = document.getElementById('terms').checked;

    if (!firstName || !lastName) return showMsg('authMsg', 'Please enter your full name.');
    if (!/\S+@\S+\.\S+/.test(email)) return showMsg('authMsg', 'Enter a valid email address.');
    if (pass.length < 8)   return showMsg('authMsg', 'Password must be at least 8 characters.');
    if (pass !== pass2)    return showMsg('authMsg', 'Passwords do not match.');
    if (!terms)            return showMsg('authMsg', 'You must accept the Terms of Service.');

    setLoading('registerSubmitBtn', true);

    let data;
    try {
      data = await API.auth.register(firstName, lastName, email, pass);
    } catch (err) {
      console.error('[Register] Unexpected error:', err);
      data = { success: false, message: 'Could not connect to the server. Please check your connection and try again.' };
    }

    setLoading('registerSubmitBtn', false);

    if (data?.success) {
      // Direct registration - account created immediately
      localStorage.setItem('tc_session', JSON.stringify({
        id: data.user.id,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        email: data.user.email,
        accountType: 'real',
        balance: 0,
        kycLevel: 0,
        kycStatus: 'none',
        isVerified: true,
        trades: [],
        transactions: [],
      }));
      showMsg('authMsg', '🎉 Account created! Redirecting…', 'success');
      setTimeout(() => window.location.href = 'platform.html', 1200);
    } else {
      const fieldError = data?.errors?.[0]?.message;
      showMsg('authMsg', fieldError || data?.message || 'Registration failed. Please try again.');
    }
  });

  // OTP Verification
  window.verifyRegisterOTP = async function() {
    const otpCode = document.getElementById('otpCode').value.trim();
    if (otpCode.length !== 6) {
      showMsg('otpMsg', 'Please enter the 6-digit code.');
      return;
    }

    setLoading('otpVerifyBtn', true);

    try {
      const data = await API.auth.verifyRegisterOTP(pendingEmail, otpCode);
      setLoading('otpVerifyBtn', false);

      if (data?.success) {
        localStorage.setItem('tc_session', JSON.stringify({
          id: data.user.id, firstName: data.user.firstName, lastName: data.user.lastName,
          email: data.user.email, accountType: 'real', balance: 0,  // Always $0 for new accounts
          kycLevel: data.user.kycLevel || 0, isVerified: true, trades: [], transactions: [],
        }));
        showMsg('otpMsg', '✅ Verified! Redirecting…', 'success');
        setTimeout(() => window.location.href = 'platform.html', 1200);
      } else {
        showMsg('otpMsg', data?.message || 'Invalid code. Please try again.');
      }
    } catch (err) {
      setLoading('otpVerifyBtn', false);
      showMsg('otpMsg', 'Verification failed. Please try again.');
    }
  };

  window.resendRegisterOTP = async function() {
    setLoading('otpResendBtn', true);
    try {
      const data = await API.auth.resendOTP(pendingEmail, 'register');
      setLoading('otpResendBtn', false);
      if (data?.success) {
        showMsg('otpMsg', '📧 New code sent! Check your email.', 'success');
      } else {
        showMsg('otpMsg', data?.message || 'Failed to resend code.');
      }
    } catch (err) {
      setLoading('otpResendBtn', false);
      showMsg('otpMsg', 'Failed to resend code.');
    }
  };
}

/* ══════════════════════════════════════════════════════════
   LOGIN
   ══════════════════════════════════════════════════════════ */
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  let pendingLoginEmail = null;

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email    = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    const totp     = document.getElementById('totpCode')?.value || '';

    setLoading('loginSubmitBtn', true);

    let data;
    try {
      data = await API.auth.login(email, password, totp || undefined);
    } catch (err) {
      console.error('[Login] Unexpected error:', err);
      data = { success: false, message: 'Could not connect to the server. Please check your connection and try again.' };
    }

    setLoading('loginSubmitBtn', false);

    if (!data) {
      return showMsg('authMsg', 'Could not connect to server. Make sure the server is running.');
    }

    if (data?.success) {
      localStorage.setItem('tc_session', JSON.stringify({
        id:          data.user.id,
        firstName:   data.user.firstName,
        lastName:    data.user.lastName,
        email:       data.user.email,
        accountType: data.user.accountType,
        balance:     data.user.balance,
        kycLevel:    data.user.kycLevel,
        kycStatus:   data.user.kycStatus,
        isVerified:  data.user.isVerified,
        trades:      [],
        transactions: [],
        linkedBrokers: [],
      }));
      showMsg('authMsg', '✅ Logged in! Redirecting…', 'success');
      setTimeout(() => window.location.href = 'platform.html', 900);
    } else {
      showMsg('authMsg', data?.message || 'Invalid email or password.');
    }
  });

  // OTP Verification for Login
  window.verifyLoginOTP = async function() {
    const otpCode = document.getElementById('loginOtpCode').value.trim();
    if (otpCode.length !== 6) {
      showMsg('loginOtpMsg', 'Please enter the 6-digit code.');
      return;
    }

    setLoading('loginOtpVerifyBtn', true);

    try {
      const data = await API.auth.verifyLoginOTP(pendingLoginEmail, otpCode);
      setLoading('loginOtpVerifyBtn', false);

      if (data?.success) {
        localStorage.setItem('tc_session', JSON.stringify({
          id:          data.user.id,
          firstName:   data.user.firstName,
          lastName:    data.user.lastName,
          email:       data.user.email,
          accountType: data.user.accountType,
          balance:     data.user.balance,
          kycLevel:    data.user.kycLevel,
          kycStatus:   data.user.kycStatus,
          isVerified:  data.user.isVerified,
          trades:      [],
          transactions: [],
          linkedBrokers: [],
        }));
        showMsg('loginOtpMsg', '✅ Verified! Redirecting…', 'success');
        setTimeout(() => window.location.href = 'platform.html', 900);
      } else {
        showMsg('loginOtpMsg', data?.message || 'Invalid code. Please try again.');
      }
    } catch (err) {
      setLoading('loginOtpVerifyBtn', false);
      showMsg('loginOtpMsg', 'Verification failed. Please try again.');
    }
  };

  window.resendLoginOTP = async function() {
    setLoading('loginOtpResendBtn', true);
    try {
      const data = await API.auth.resendOTP(pendingLoginEmail, 'login');
      setLoading('loginOtpResendBtn', false);
      if (data?.success) {
        showMsg('loginOtpMsg', '📧 New code sent! Check your email.', 'success');
      } else {
        showMsg('loginOtpMsg', data?.message || 'Failed to resend code.');
      }
    } catch (err) {
      setLoading('loginOtpResendBtn', false);
      showMsg('loginOtpMsg', 'Failed to resend code.');
    }
  };
}

/* ══════════════════════════════════════════════════════════
   DEMO LOGIN — modal with balance picker
   ══════════════════════════════════════════════════════════ */
const demoBtn = document.getElementById('demoBtn');
if (demoBtn) {
  demoBtn.addEventListener('click', () => {
    const modal = document.getElementById('demoAmountModal');
    if (modal) modal.style.display = 'flex';
    else startDemoWithAmount(1000);
  });
}

document.querySelectorAll('.demo-preset-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.demo-preset-btn').forEach(b => {
      b.style.background  = 'rgba(255,255,255,.04)';
      b.style.borderColor = 'rgba(255,255,255,.08)';
      b.style.color       = '#8890a8';
    });
    this.style.background  = 'rgba(0,229,160,.1)';
    this.style.borderColor = 'rgba(0,229,160,.35)';
    this.style.color       = '#00e5a0';
    const cw = document.getElementById('demoCustomWrap');
    if (cw) cw.style.display = this.id === 'customAmountToggle' ? 'block' : 'none';
  });
});

const demoStartBtn = document.getElementById('demoStartBtn');
if (demoStartBtn) {
  demoStartBtn.addEventListener('click', () => {
    const selected = document.querySelector('.demo-preset-btn.selected') ||
                     document.querySelector('.demo-preset-btn[style*="#00e5a0"]');
    let amount = selected ? parseInt(selected.dataset.amount || '0') : 0;

    const custom = document.getElementById('demoCustomAmount');
    if (custom?.value) {
      const v = parseInt(custom.value);
      if (!isNaN(v) && v >= 1000 && v <= 5000) amount = v;
    }

    if (!amount || amount < 1000 || amount > 5000) {
      const msgEl = document.getElementById('demoAmountMsg');
      if (msgEl) { msgEl.style.display='block'; msgEl.textContent='Choose between $1,000 and $5,000.'; }
      return;
    }
    startDemoWithAmount(amount);
  });
}

function startDemoWithAmount(amount) {
  const demo = {
    id:            'demo_' + Date.now(),
    firstName:     'Demo',
    lastName:      'Trader',
    email:         'demo@Tradersbloc.com',
    accountType:   'demo',
    balance:       amount,
    kycLevel:      2,           // demo gets full access
    kycStatus:     'approved',
    isVerified:    true,
    trades:        [],
    transactions:  [{ type:'deposit', amount, method:'Demo Balance', date:new Date().toISOString(), status:'completed' }],
    linkedBrokers: [],
  };
  localStorage.setItem('tc_session', JSON.stringify(demo));
  window.location.href = 'platform.html';
}

/* ══════════════════════════════════════════════════════════
   GOOGLE SIGN-IN INTEGRATION
   ══════════════════════════════════════════════════════════ */

// Initialize Google Sign-In when the library loads
window.onGoogleLibraryLoad = function() {
  // Check if we're on login or register page
  const isLoginPage = window.location.pathname.endsWith('login.html');
  const isRegisterPage = window.location.pathname.endsWith('register.html');
  
  if (!isLoginPage && !isRegisterPage) return;

  // Get GOOGLE_CLIENT_ID from server config (you'll need to expose this)
  // For now, we'll use a placeholder - replace with actual client ID
  const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

  try {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleSignIn,
      auto_select: false,
      cancel_on_tap_outside: true
    });

    // Render the Google Sign-In button
    google.accounts.id.renderButton(
      document.getElementById('googleButtonContainer'),
      {
        theme: 'filled_black',
        size: 'large',
        width: '100%',
        text: isLoginPage ? 'signin_with' : 'signup_with',
        shape: 'rectangular',
        logo_alignment: 'left'
      }
    );

    // Show the custom button as fallback
    const customBtn = document.getElementById('customGoogleBtn');
    if (customBtn) {
      customBtn.style.display = 'none'; // Hide custom button when official one renders
    }
  } catch (err) {
    console.error('[Google Sign-In] Initialization failed:', err);
    // Show custom button as fallback
    const customBtn = document.getElementById('customGoogleBtn');
    if (customBtn) {
      customBtn.style.display = 'block';
      customBtn.onclick = () => {
        showMsg('authMsg', 'Google Sign-In is not configured. Please contact support.');
      };
    }
  }
};

// Handle Google Sign-In response
async function handleGoogleSignIn(response) {
  const credential = response.credential;
  
  if (!credential) {
    showMsg('authMsg', 'Google sign-in failed. Please try again.');
    return;
  }

  // Show loading state
  const googleBtn = document.getElementById('googleButtonContainer');
  if (googleBtn) {
    googleBtn.style.opacity = '0.5';
    googleBtn.style.pointerEvents = 'none';
  }

  try {
    // Call backend API to verify and create/login user
    const data = await API.auth.googleLogin(credential);

    if (data?.success) {
      // Store session
      localStorage.setItem('tc_session', JSON.stringify({
        id: data.user.id,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        email: data.user.email,
        accountType: data.user.accountType || 'real',
        balance: data.user.balance || 0,
        kycLevel: data.user.kycLevel || 0,
        kycStatus: data.user.kycStatus || 'none',
        isVerified: true,
        trades: [],
        transactions: [],
        linkedBrokers: [],
        profilePicture: data.user.profilePicture
      }));

      showMsg('authMsg', '✅ Signed in with Google! Redirecting…', 'success');
      setTimeout(() => window.location.href = 'platform.html', 900);
    } else {
      showMsg('authMsg', data?.message || 'Google sign-in failed. Please try again.');
      if (googleBtn) {
        googleBtn.style.opacity = '1';
        googleBtn.style.pointerEvents = 'auto';
      }
    }
  } catch (err) {
    console.error('[Google Sign-In] Error:', err);
    showMsg('authMsg', 'Could not connect to server. Please try again.');
    if (googleBtn) {
      googleBtn.style.opacity = '1';
      googleBtn.style.pointerEvents = 'auto';
    }
  }
}

// Load Google Sign-In library if on auth pages
if (window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('register.html')) {
  // The library will call window.onGoogleLibraryLoad when ready
  if (typeof google !== 'undefined' && google.accounts) {
    onGoogleLibraryLoad();
  } else {
    // Wait for the library to load
    window.addEventListener('load', () => {
      setTimeout(() => {
        if (typeof google !== 'undefined' && google.accounts) {
          onGoogleLibraryLoad();
        }
      }, 500);
    });
  }
}

/* ── Redirect if already logged in ── */
(async () => {
  const session = JSON.parse(localStorage.getItem('tc_session') || 'null');
  const onLoginPage = window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('register.html');
  if (session && onLoginPage) {
    if (session.accountType === 'demo') {
      window.location.href = 'platform.html';
    } else if (API.auth.isLoggedIn()) {
      window.location.href = 'platform.html';
    }
  }
})();
