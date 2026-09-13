import apiClient from "../api/apiClient.js";
import { getOrganizationId, setOrganizationId, clearState } from "../state/store.js";

export async function renderNavbar(user) {
  const navbarContainer = document.getElementById("navbar-container");
  if (!navbarContainer) return;

  navbarContainer.innerHTML = `
    <header class="navbar">
      <div class="navbar__left">
        <button id="sidebar-toggle-btn" class="sidebar-toggle" title="Toggle Navigation">☰</button>
        <div class="organization-switcher">
          <button id="org-switcher-btn" class="organization-switcher__button">
            <span id="current-org-name">Loading organization...</span>
            <span>▼</span>
          </button>
          <div id="org-switcher-menu" class="organization-switcher__menu" hidden>
            <div id="org-list"></div>
            <div style="border-top: 1px solid #e2e8f0; margin-top: 0.5rem; padding-top: 0.5rem;">
              <button id="create-new-org-btn" class="organization-switcher__option" style="color: #2563eb; font-weight: 500;">
                + New Organization
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="navbar__right">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="font-size: 0.875rem; font-weight: 500; color: #1e293b;" id="user-greeting">
            ${user?.name || "User"}
          </span>
          <button id="logout-btn" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">
            Sign Out
          </button>
        </div>
      </div>
    </header>
  `;

  // Organization switcher logic
  const switcherBtn = document.getElementById("org-switcher-btn");
  const switcherMenu = document.getElementById("org-switcher-menu");
  const orgListEl = document.getElementById("org-list");
  const currentOrgNameEl = document.getElementById("current-org-name");
  const logoutBtn = document.getElementById("logout-btn");
  const createNewOrgBtn = document.getElementById("create-new-org-btn");

  switcherBtn.addEventListener("click", () => {
    switcherMenu.hidden = !switcherMenu.hidden;
  });

  document.addEventListener("click", (e) => {
    if (!switcherBtn.contains(e.target) && !switcherMenu.contains(e.target)) {
      switcherMenu.hidden = true;
    }
  });

  logoutBtn.addEventListener("click", () => {
    clearState();
    window.location.href = "/login.html";
  });

  createNewOrgBtn.addEventListener("click", async () => {
    const orgName = prompt("Enter new organization name:");
    if (orgName && orgName.trim()) {
      try {
        const res = await apiClient("/organizations", {
          method: "POST",
          body: JSON.stringify({ name: orgName.trim() })
        });
        if (res.data && res.data.organization) {
          setOrganizationId(res.data.organization.id);
          window.location.reload();
        }
      } catch (err) {
        alert(err.message || "Failed to create organization");
      }
    }
  });

  try {
    const orgsRes = await apiClient("/organizations/my");
    const orgs = orgsRes.data || [];
    const currentOrgId = getOrganizationId();

    let activeOrg = orgs.find(o => o.id === currentOrgId);
    if (!activeOrg && orgs.length > 0) {
      activeOrg = orgs[0];
      setOrganizationId(activeOrg.id);
    }

    if (activeOrg) {
      currentOrgNameEl.textContent = activeOrg.name;
    } else {
      currentOrgNameEl.textContent = "Select Organization";
    }

    orgListEl.innerHTML = orgs.map(org => `
      <button class="organization-switcher__option ${org.id === currentOrgId ? 'organization-switcher__option--active' : ''}" data-org-id="${org.id}">
        ${org.name} <span style="font-size: 0.75rem; color: #64748b;">(${org.role})</span>
      </button>
    `).join("");

    orgListEl.querySelectorAll(".organization-switcher__option").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const orgId = e.currentTarget.dataset.orgId;
        if (orgId !== currentOrgId) {
          setOrganizationId(orgId);
          window.location.reload();
        }
      });
    });
  } catch (err) {
    currentOrgNameEl.textContent = "Organization Error";
    console.error("Failed to load organizations:", err);
  }
}
