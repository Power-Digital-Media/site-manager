/**
 * Login Page — v3.0
 * Firebase Auth login (no more demo credentials)
 */

import { signIn, resetPassword } from '../auth.js';
import { showToast } from '../components/toast.js';

export function renderLogin() {
  return `
    <div class="login">
      <div class="login__bg">
        <div class="login__grid"></div>
        <div class="login__glow login__glow--1"></div>
        <div class="login__glow login__glow--2"></div>
      </div>
      <div class="login__card">
        <div class="login__brand">
          <div class="login__logo">
            <img src="/images/power-logo.webp" alt="Power Digital Media" />
          </div>
          <h1 class="login__title">Power Digital Media</h1>
          <p class="login__subtitle">Site Manager</p>
        </div>
        <form class="login__form" id="loginForm">
          <div id="loginError" class="login__error" style="display:none;"></div>
          <div class="form-group">
            <label class="form-label" for="login-email">Email Address</label>
            <input type="email" id="login-email" class="form-input" placeholder="you@example.com" autocomplete="email" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="login-password">Password</label>
            <input type="password" id="login-password" class="form-input" placeholder="••••••••" autocomplete="current-password" required />
          </div>
          <button type="submit" class="btn btn--primary btn--full" id="loginBtn">
            <span>Sign In</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
          <button type="button" class="login__forgot-btn" id="forgotPasswordBtn">
            Forgot your password?
          </button>
        </form>
        <div class="login__footer">
          <span>Powered by</span>
          <strong>Power Digital Media</strong>
        </div>
      </div>
    </div>
  `;
}

export function initLogin(onLoginSuccess) {
  const form = document.getElementById('loginForm');
  const errorDiv = document.getElementById('loginError');
  const forgotBtn = document.getElementById('forgotPasswordBtn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const btn = document.getElementById('loginBtn');

      if (!email || !password) {
        showError('Please enter your email and password.');
        return;
      }

      // Show loading state
      btn.classList.add('btn--loading');
      btn.innerHTML = '<div class="spinner"></div><span>Signing in...</span>';
      hideError();

      try {
        await signIn(email, password);
        // Auth state listener in main.js will handle the rest
      } catch (err) {
        btn.classList.remove('btn--loading');
        btn.innerHTML = '<span>Sign In</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
        
        // Friendly error messages
        const errorMessages = {
          'auth/user-not-found': 'No account found with this email.',
          'auth/wrong-password': 'Incorrect password. Please try again.',
          'auth/invalid-credential': 'Invalid email or password.',
          'auth/invalid-email': 'Please enter a valid email address.',
          'auth/too-many-requests': 'Too many attempts. Please wait a few minutes.',
          'auth/user-disabled': 'This account has been disabled. Contact PDM support.',
          'auth/network-request-failed': 'Network error. Check your connection.',
        };
        
        const code = err.code || '';
        const message = errorMessages[code] || 'Sign in failed. Please try again.';
        showError(message);
      }
    });
  }

  if (forgotBtn) {
    forgotBtn.addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim();
      if (!email) {
        showError('Enter your email address above, then click "Forgot password".');
        return;
      }
      try {
        await resetPassword(email);
        showToast('Password reset email sent! Check your inbox.', 'success');
        hideError();
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          showError('No account found with this email.');
        } else {
          showError('Failed to send reset email. Please try again.');
        }
      }
    });
  }

  function showError(msg) {
    if (errorDiv) {
      errorDiv.textContent = msg;
      errorDiv.style.display = 'block';
    }
  }

  function hideError() {
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
  }
}
