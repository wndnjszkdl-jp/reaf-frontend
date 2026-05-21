document.addEventListener("DOMContentLoaded", renderHeader);

function renderHeader() {
  const token = localStorage.getItem("token");
  const headerArea = document.getElementById("commonHeader");

  if (!headerArea) return;

  const isLoggedIn = !!token;

  headerArea.innerHTML = `
    <header class="rf-topbar">
      <a class="rf-brand" href="index.html" aria-label="Re:af 홈으로 이동">
        <img
          src="images/reaf-logo.png"
          class="rf-brand-logo"
          alt="Re:af 로고"
        />
      </a>

      <nav class="rf-nav">
        <a href="index.html">홈</a>
        <a href="index.html#services">서비스소개</a>
        <a href="index.html#analysis">AI분석</a>
        <a href="index.html#crops">작물정보</a>
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
      localStorage.removeItem("email");
      localStorage.removeItem("loginTime");
      localStorage.removeItem("autoLogin");

      location.href = "index.html";
    });
  }

  if (typeof updateNavbar === "function") {
    updateNavbar();
  }
}
