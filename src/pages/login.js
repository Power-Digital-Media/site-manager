/**
 * Login Page
 */

export function renderLogin(onLogin) {
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
          <div class="form-group">
            <label class="form-label" for="login-email">Email Address</label>
            <input type="email" id="login-email" class="form-input" value="pastor@church244.org" placeholder="you@example.com" autocomplete="email" />
          </div>
          <div class="form-group">
            <label class="form-label" for="login-password">Password</label>
            <input type="password" id="login-password" class="form-input" value="demo1234" placeholder="••••••••" autocomplete="current-password" />
          </div>
          <button type="submit" class="btn btn--primary btn--full" id="loginBtn">
            <span>Sign In</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
          <p class="login__demo-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            Demo credentials are pre-filled. Just click Sign In.
          </p>
        </form>
        <div class="login__footer">
          <span>Powered by</span>
          <strong>Power Digital Media</strong>
        </div>
      </div>
    </div>
  `;
}
