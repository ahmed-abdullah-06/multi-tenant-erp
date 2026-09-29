const menuButton = document.getElementById("hamburgerBtn");
const mobileMenu = document.getElementById("mobileMenu");
const menuIcon = document.getElementById("iconMenu");
const closeIcon = document.getElementById("iconClose");
const navbar = document.getElementById("top");

function closeMobileMenu() {
  mobileMenu.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  menuIcon.style.display = "block";
  closeIcon.style.display = "none";
}

menuButton.addEventListener("click", () => {
  const isOpen = mobileMenu.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuIcon.style.display = isOpen ? "none" : "block";
  closeIcon.style.display = isOpen ? "block" : "none";
});

mobileMenu.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeMobileMenu);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMobileMenu();
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 767) {
    closeMobileMenu();
  }
});

const chart = document.getElementById("chartBars");
const chartValues = [62, 45, 78, 55, 90, 70, 83];
const chartLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

chartValues.forEach((height, index) => {
  const column = document.createElement("div");
  column.className = "chart-col";

  const bar = document.createElement("div");
  bar.className = `chart-bar${index === 4 ? " active" : ""}`;
  bar.style.height = `${height}%`;

  const label = document.createElement("span");
  label.className = "chart-tick";
  label.textContent = chartLabels[index];

  column.append(bar, label);
  chart.appendChild(column);
});

function updateNavbarShadow() {
  navbar.style.boxShadow = window.scrollY > 8
    ? "0 1px 12px rgba(15,23,42,.08)"
    : "none";
}

window.addEventListener("scroll", updateNavbarShadow, { passive: true });
updateNavbarShadow();

try {
  const session = JSON.parse(localStorage.getItem("erp_session"));
  if (session && session.token) {
    window.location.replace("/dashboard.html");
  }
} catch {
  // An invalid session should not prevent visitors from viewing the landing page.
}
