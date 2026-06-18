// components/navbar.js

(() => {
  const navbar = document.querySelector(".reaf-navbar");
  const menuBtn = document.querySelector(".reaf-menu-btn");
  const navItems = document.querySelectorAll(".reaf-nav-item");

  const currentPage =
    window.location.pathname.split("/").pop() || "index.html";

  navItems.forEach((item) => {
    const href = item.getAttribute("href");
    if (!href) return;

    const hrefPage = href.split("#")[0] || "index.html";

    if (hrefPage === currentPage) {
      item.classList.add("active");
    }
  });

  if (menuBtn && navbar) {
    menuBtn.addEventListener("click", () => {
      navbar.classList.toggle("open");
    });
  }

  const navbarToken =
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt");

  document.body.classList.toggle("is-login", !!navbarToken);

  const logoutBtn = document.getElementById("navbarLogoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      [
        "token",
        "access_token",
        "accessToken",
        "jwt",
        "username",
        "name",
        "email",
        "loginTime",
        "autoLogin"
      ].forEach((key) => localStorage.removeItem(key));

      document.body.classList.remove("is-login");
      location.href = "index.html";
    });
  }
})();