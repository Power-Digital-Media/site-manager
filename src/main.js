/* ═══════════════════════════════════════════════════════════════
   CHURCH 244 — Main JavaScript
   Scroll animations, navigation, particles, counters
   ═══════════════════════════════════════════════════════════════ */

import './style.css';

// ── DOM Ready ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initScrollReveal();
  initParticles();
  initCountUp();
  initSmoothScroll();
});

// ═══════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════
function initNavigation() {
  const nav = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  
  // Scroll effect
  const handleScroll = () => {
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  };
  
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
  
  // Hamburger toggle
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
    document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
  });
  
  // Close mobile nav on link click
  navLinks.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// SCROLL REVEAL
// ═══════════════════════════════════════════════════════════════
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          // Stagger the reveal animations
          const delay = entry.target.dataset.delay || 0;
          setTimeout(() => {
            entry.target.classList.add('revealed');
          }, delay);
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    }
  );
  
  // Add stagger delays to grouped elements
  const groups = document.querySelectorAll('.about__grid, .services__grid, .community__grid');
  groups.forEach(group => {
    const items = group.querySelectorAll('.reveal');
    items.forEach((item, i) => {
      item.dataset.delay = i * 100;
    });
  });
  
  reveals.forEach(el => observer.observe(el));
}

// ═══════════════════════════════════════════════════════════════
// PARTICLES
// ═══════════════════════════════════════════════════════════════
function initParticles() {
  const container = document.getElementById('heroParticles');
  if (!container) return;
  
  const particleCount = 30;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'hero__particle';
    
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDuration = `${6 + Math.random() * 8}s`;
    particle.style.animationDelay = `${Math.random() * 8}s`;
    particle.style.width = `${1 + Math.random() * 3}px`;
    particle.style.height = particle.style.width;
    particle.style.opacity = 0;
    
    // Vary colors between gold and white
    const colors = ['#d4a853', '#e8c97a', '#ffffff', '#d4a853'];
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    
    container.appendChild(particle);
  }
}

// ═══════════════════════════════════════════════════════════════
// COUNT UP ANIMATION
// ═══════════════════════════════════════════════════════════════
function initCountUp() {
  const counters = document.querySelectorAll('[data-count]');
  
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.count);
          const duration = 2000;
          const start = performance.now();
          
          const animate = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(eased * target);
            
            el.textContent = current.toLocaleString();
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              el.textContent = target.toLocaleString();
            }
          };
          
          requestAnimationFrame(animate);
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.5 }
  );
  
  counters.forEach(el => observer.observe(el));
}

// ═══════════════════════════════════════════════════════════════
// SMOOTH SCROLL
// ═══════════════════════════════════════════════════════════════
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        
        window.scrollTo({
          top,
          behavior: 'smooth',
        });
      }
    });
  });
}
