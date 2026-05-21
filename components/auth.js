/*
  Re:af 인증 공통 스크립트
  기능:
  1. 자동로그인: localStorage에 저장된 JWT가 유효하면 페이지 진입 시 로그인 상태 유지
  2. 30분 자동로그아웃: 저장 시점/서버 expires_in 기준으로 자동 만료
  3. 네비게이션바 즉시 갱신: 로그인/로그아웃 직후 새로고침 없이 상단 메뉴 변경

  사용법:
  - 모든 HTML의 </body> 바로 위에 아래 한 줄 추가
    <script src="js/auth.js"></script>
  - login 성공 후 window.ReafAuth.saveLogin(data) 호출
  - OAuth 로그인은 index.html?token=... 형태로 돌아오면 자동 처리됨
*/

(function () {
  'use strict';

  const API_BASE_URL = window.API_BASE_URL || 'https://plant-fastapi.onrender.com';
  const TOKEN_KEY = 'reaf_access_token';
  const USER_KEY = 'reaf_user';
  const EXPIRES_AT_KEY = 'reaf_expires_at';
  const LOGIN_AT_KEY = 'reaf_login_at';
  const DEFAULT_EXPIRES_SECONDS = 30 * 60;

  let logoutTimerId = null;

  function now() {
    return Date.now();
  }

  function safeJsonParse(value, fallback = null) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function decodeJwtPayload(token) {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) return null;

      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      return JSON.parse(jsonPayload);
    } catch (_) {
      return null;
    }
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    return safeJsonParse(localStorage.getItem(USER_KEY), {});
  }

  function getExpiresAt() {
    const savedExpiresAt = Number(localStorage.getItem(EXPIRES_AT_KEY));
    if (savedExpiresAt) return savedExpiresAt;

    const token = getToken();
    const payload = token ? decodeJwtPayload(token) : null;
    if (payload && payload.exp) return payload.exp * 1000;

    return 0;
  }

  function isLoggedIn() {
    const token = getToken();
    const expiresAt = getExpiresAt();

    if (!token || !expiresAt) return false;

    if (now() >= expiresAt) {
      clearAuthStorage();
      return false;
    }

    return true;
  }

  function clearAuthStorage() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
    localStorage.removeItem(LOGIN_AT_KEY);

    if (logoutTimerId) {
      clearTimeout(logoutTimerId);
      logoutTimerId = null;
    }
  }

  function saveLogin(loginData) {
    const token = loginData.access_token || loginData.token;
    if (!token) {
      alert('로그인 토큰을 받지 못했습니다. 다시 로그인해주세요.');
      return false;
    }

    const payload = decodeJwtPayload(token);
    const expiresInSeconds = Number(loginData.expires_in_seconds || loginData.expires_in || DEFAULT_EXPIRES_SECONDS);
    const expiresAt = payload && payload.exp
      ? payload.exp * 1000
      : now() + expiresInSeconds * 1000;

    const user = {
      email: loginData.email || (payload && payload.sub) || '',
      name: loginData.name || loginData.nickname || '',
      username: loginData.username || (payload && payload.sub) || '',
      is_admin: loginData.is_admin || 0
    };

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(LOGIN_AT_KEY, String(now()));
    localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));

    scheduleAutoLogout();
    renderNavbar();
    window.dispatchEvent(new CustomEvent('reaf-auth-changed', { detail: { loggedIn: true, user } }));

    return true;
  }

  function logout(options = {}) {
    clearAuthStorage();
    renderNavbar();
    window.dispatchEvent(new CustomEvent('reaf-auth-changed', { detail: { loggedIn: false } }));

    if (options.reason === 'expired') {
      alert('로그인 후 30분이 지나 자동 로그아웃되었습니다. 다시 로그인해주세요.');
    }

    if (options.redirect !== false) {
      location.href = options.redirectUrl || 'login.html';
    }
  }

  function scheduleAutoLogout() {
    if (logoutTimerId) clearTimeout(logoutTimerId);

    if (!isLoggedIn()) return;

    const remainMs = getExpiresAt() - now();

    if (remainMs <= 0) {
      logout({ reason: 'expired' });
      return;
    }

    logoutTimerId = setTimeout(() => {
      logout({ reason: 'expired' });
    }, remainMs);
  }

  function authFetch(url, options = {}) {
    const token = getToken();

    const headers = new Headers(options.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);

    return fetch(url, {
      ...options,
      headers
    }).then((response) => {
      if (response.status === 401) {
        logout({ reason: 'expired' });
        throw new Error('로그인이 만료되었습니다.');
      }
      return response;
    });
  }

  function handleOAuthTokenFromUrl() {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');

    if (!token) return false;

    const name = url.searchParams.get('name') || '';
    const expiresIn = url.searchParams.get('expires_in') || DEFAULT_EXPIRES_SECONDS;

    saveLogin({
      access_token: token,
      name,
      expires_in: expiresIn
    });

    url.searchParams.delete('token');
    url.searchParams.delete('name');
    url.searchParams.delete('expires_in');
    window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);

    return true;
  }

  function createNavLink(text, href, className = '') {
    const a = document.createElement('a');
    a.textContent = text;
    a.href = href;
    if (className) a.className = className;
    return a;
  }

  function renderNavbar() {
    const loggedIn = isLoggedIn();
    const user = getUser();

    // 1순위: 전용 영역이 있으면 가장 안전하게 교체
    const authArea = document.querySelector('[data-auth-area], #authArea, #auth-nav, .auth-nav');
    if (authArea) {
      authArea.innerHTML = '';

      if (loggedIn) {
        const label = document.createElement('span');
        label.className = 'nav-user-name';
        label.textContent = `${user.name || user.email || user.username || '회원'}님`;

        const myPage = createNavLink('마이페이지', 'mypage.html');
        const logoutButton = document.createElement('button');
        logoutButton.type = 'button';
        logoutButton.className = 'logout-btn';
        logoutButton.textContent = '로그아웃';
        logoutButton.addEventListener('click', () => logout());

        authArea.append(label, myPage, logoutButton);
      } else {
        authArea.append(
          createNavLink('로그인', 'login.html'),
          createNavLink('회원가입', 'register.html')
        );
      }

      return;
    }

    // 2순위: 기존 상단 nav 안의 로그인/회원가입/마이페이지/로그아웃 링크를 자동 정리
    const nav = document.querySelector('nav, header');
    if (!nav) return;

    const links = Array.from(nav.querySelectorAll('a, button'));
    links.forEach((el) => {
      const text = (el.textContent || '').trim();
      const href = (el.getAttribute('href') || '').toLowerCase();
      const isAuthItem =
        text.includes('로그인') ||
        text.includes('회원가입') ||
        text.includes('로그아웃') ||
        text.includes('마이페이지') ||
        href.includes('login') ||
        href.includes('register') ||
        href.includes('mypage');

      if (isAuthItem) el.remove();
    });

    if (loggedIn) {
      const myPage = createNavLink('마이페이지', 'mypage.html');
      const logoutButton = document.createElement('button');
      logoutButton.type = 'button';
      logoutButton.textContent = '로그아웃';
      logoutButton.className = 'logout-btn';
      logoutButton.addEventListener('click', () => logout());
      nav.append(myPage, logoutButton);
    } else {
      nav.append(
        createNavLink('로그인', 'login.html'),
        createNavLink('회원가입', 'register.html')
      );
    }
  }

  async function refreshMe() {
    if (!isLoggedIn()) return null;

    try {
      const response = await authFetch(`${API_BASE_URL}/me`);
      const data = await response.json();

      const oldUser = getUser();
      const nextUser = {
        ...oldUser,
        username: data.username || oldUser.username || '',
        email: data.username || oldUser.email || '',
        is_admin: data.is_admin || 0
      };

      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      renderNavbar();
      return data;
    } catch (_) {
      return null;
    }
  }

  window.ReafAuth = {
    API_BASE_URL,
    saveLogin,
    logout,
    isLoggedIn,
    getToken,
    getUser,
    authFetch,
    renderNavbar,
    refreshMe
  };

  document.addEventListener('DOMContentLoaded', () => {
    handleOAuthTokenFromUrl();
    scheduleAutoLogout();
    renderNavbar();
    refreshMe();
  });

  window.addEventListener('storage', (event) => {
    if ([TOKEN_KEY, USER_KEY, EXPIRES_AT_KEY].includes(event.key)) {
      scheduleAutoLogout();
      renderNavbar();
    }
  });
})();
