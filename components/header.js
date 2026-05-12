document.addEventListener("DOMContentLoaded", renderHeader);

function renderHeader() {
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");
  const headerArea = document.getElementById("commonHeader");

  if (!headerArea) return;

  const isLoggedIn = !!token;

  headerArea.innerHTML = `
    <header class="rf-topbar">
      <a class="rf-brand" href="index.html">
        <span class="rf-brand-icon" aria-hidden="true"></span>
        <span>Re:af</span>
      </a>

      <nav class="rf-nav">
        <a href="index.html">홈</a>
        <a href="index.html#services">서비스소개</a>
        <a href="index.html#analysis">AI분석</a>
        <a href="index.html#crops">작물정보</a>
        <a href="history.html">진단기록</a>
        <a href="mypage.html">마이페이지</a>
        <a href="admin_login.html">회원관리</a>

        ${
          isLoggedIn
            ? `<a href="#" id="logoutLink">로그아웃</a>`
            : `
              <a href="login.html">로그인</a>
              <a class="rf-signup-link" href="register.html">회원가입</a>
            `
        }
      </nav>
    </header>
  `;

  const logoutLink = document.getElementById("logoutLink");

  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      location.href = "index.html";
    });
  }
}