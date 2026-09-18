/* =====================================================================
   nav.js  -  guards every signed-in page and draws the sidebar.
   Include it on any page that requires a session; it exposes the
   session as window.SESSION.
   ===================================================================== */

const NAV_ITEMS = [
  { href: "dashboard.html",  label: "Dashboard",  icon: "M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5" },
  { href: "courses.html",    label: "My Courses", icon: "M4 5h11a3 3 0 0 1 3 3v11H7a3 3 0 0 1-3-3zM18 8h2v11H7" },
  { href: "study-plan.html", label: "Study Plan", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "add-course.html", label: "Add Course", icon: "M12 5v14M5 12h14" },
  { href: "profile.html",    label: "Profile",    icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" },
];

const SESSION = window.Auth.requireSession();
window.SESSION = SESSION;

function initials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2)
    .map(w => w[0]).join("").toUpperCase();
}

function buildNav() {
  if (!SESSION) return;

  const here = location.pathname.split("/").pop() || "dashboard.html";

  const links = NAV_ITEMS.map(item => `
    <a class="nav-link${item.href === here ? " active" : ""}" href="${item.href}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${item.icon}"/></svg>
      <span>${item.label}</span>
    </a>`).join("");

  const shell = document.createElement("div");
  shell.className = "shell";
  shell.innerHTML = `
    <aside class="sidebar" id="sidebar">
      <a class="brand" href="dashboard.html">
        <span class="brand-mark">AR</span>
        <span class="brand-text">Academic&nbsp;Recovery</span>
      </a>
      <nav class="nav">${links}</nav>
      <div class="sidebar-foot">
        <div class="avatar">${UI.esc(initials(SESSION.full_name))}</div>
        <div class="who">
          <p class="who-name">${UI.esc(SESSION.full_name || "Student")}</p>
          <p class="who-sub">${UI.esc(SESSION.email || "")}</p>
        </div>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <button class="icon-btn" id="menuBtn" aria-label="Menu">
          <svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
        <span class="topbar-title" id="topbarTitle"></span>
        <button class="btn btn-quiet" id="signOutBtn">Sign out</button>
      </header>
      <div class="page" id="page"></div>
    </div>`;

  // move whatever the page already had into the content area
  const existing = document.getElementById("page-content");
  document.body.prepend(shell);
  if (existing) document.getElementById("page").appendChild(existing);

  const match = NAV_ITEMS.find(i => i.href === here);
  document.getElementById("topbarTitle").textContent =
    match ? match.label : document.title.split("·")[0].trim();

  document.getElementById("signOutBtn").addEventListener("click", () => {
    window.Auth.signOut();
    UI.Store.clear();
    window.location.replace("signin.html");
  });

  const sidebar = document.getElementById("sidebar");
  document.getElementById("menuBtn").addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });
  document.addEventListener("click", e => {
    if (sidebar.classList.contains("open") &&
        !sidebar.contains(e.target) &&
        e.target.closest("#menuBtn") === null) {
      sidebar.classList.remove("open");
    }
  });
}

if (SESSION) buildNav();
