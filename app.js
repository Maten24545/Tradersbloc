/* ─── NAVBAR ─── */
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 20));
}

/* ─── HAMBURGER ─── */
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
if (hamburger) {
  hamburger.addEventListener('click', () => mobileMenu.classList.toggle('open'));
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));
}

/* ─── If logged in, redirect platform link ─── */
const session = JSON.parse(localStorage.getItem('tc_session') || 'null');
if (session) {
  document.querySelectorAll('a[href="register.html"], a[href="login.html"]').forEach(a => {
    if (a.textContent.includes('Log In')) a.href = 'platform.html';
  });
}
