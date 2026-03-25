// Landing page interactions

// Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
});

// Phone clock
function updatePhoneClock() {
  const el = document.getElementById('phone-clock');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false });
}
updatePhoneClock();
setInterval(updatePhoneClock, 60000);

// Hero entrance animation
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('visible');
  });
}, { threshold: 0.1 });

document.querySelectorAll('.feature-card, .arch-layer, .stat-item').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});

document.addEventListener('DOMContentLoaded', () => {
  // Staggered hero entrance
  const heroElements = document.querySelectorAll('.hero-badge, .hero-title, .hero-sub, .hero-cta, .hero-stats');
  heroElements.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity 0.6s ease ${i * 0.1}s, transform 0.6s ease ${i * 0.1}s`;
    setTimeout(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 100 + i * 100);
  });
});

const visObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.feature-card, .arch-layer').forEach(el => visObserver.observe(el));

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
