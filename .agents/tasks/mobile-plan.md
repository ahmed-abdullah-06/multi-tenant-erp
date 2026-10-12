# Mobile Responsive Implementation Plan

## Project Overview
Multi-tenant ERP application with vanilla HTML/CSS/JS — no frameworks. Consists of:
- Landing page (index.html) with modern marketing design
- Authentication pages (login, forgot-password, reset-password)
- Dashboard shell (dashboard.html) with dynamic SPA-style routing
- Legacy cyberpunk-styled pages (inventory, ledger, settings)

**Target breakpoints:**
- Mobile: 320px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px+

---

## Implementation Steps

- [ ] 1. **Add CSS custom properties for mobile-first responsive design in main.css**
      
      Add new CSS variables for mobile breakpoints, touch targets, and fluid spacing.
      
      **Files:** `client/css/main.css`
      
      **Changes:**
      - Add `:root` variables: `--mobile-padding`, `--tablet-padding`, `--touch-target-min` (44px)
      - Add `--fluid-space-*` scale for responsive spacing
      
      **Verify:** Open main.css and confirm variables are present in `:root` block

---

- [ ] 2. **Implement mobile-first responsive layout for .auth-shell in main.css**
      
      The dashboard shell currently uses CSS Grid with fixed sidebar width. Make it stack on mobile with an off-canvas sidebar.
      
      **Files:** `client/css/main.css`
      
      **Changes:**
      - Existing media query at `@media (max-width: 768px)` already handles sidebar transform
      - Add `transition: transform 0.3s ease` to `.sidebar` for smooth slide
      - Add overlay element CSS: `.sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99; display: none; }` and `.auth-shell.sidebar-open .sidebar-overlay { display: block; }`
      - Reduce `.main-content` padding to `var(--space-sm)` (0.5rem) on mobile
      - Stack organization switcher in navbar: `.navbar__right { flex-direction: column; gap: 0.5rem; align-items: stretch; }` on mobile
      
      **Verify:** Run `npm run dev`, open dashboard.html on mobile viewport (375px), toggle sidebar, confirm smooth slide-in/out and overlay appears

---

- [ ] 3. **Add hamburger button and mobile menu enhancements to navbar.js**
      
      Navbar component needs to inject overlay element and handle click-outside-to-close.
      
      **Files:** `client/js/components/navbar.js`
      
      **Changes:**
      - In `renderNavbar()`, after the `<header>` closing tag, inject: `<div class="sidebar-overlay" id="sidebar-overlay"></div>`
      - In sidebar toggle button click handler, add: `document.getElementById('sidebar-overlay').style.display = authShell.classList.contains('sidebar-open') ? 'block' : 'none';`
      - Add overlay click handler: `document.getElementById('sidebar-overlay')?.addEventListener('click', () => { authShell.classList.remove('sidebar-open'); document.getElementById('sidebar-overlay').style.display = 'none'; });`
      
      **Verify:** Open dashboard.html, toggle sidebar on mobile, click overlay, confirm sidebar closes

---

- [ ] 4. **Implement sidebar auto-close on navigation link click for mobile in sidebar.js**
      
      When user taps a sidebar link on mobile, the sidebar should close automatically.
      
      **Files:** `client/js/components/sidebar.js`
      
      **Changes:**
      - After rendering sidebar HTML, add event delegation: `sidebarContainer.addEventListener('click', (e) => { const link = e.target.closest('.sidebar__link'); if (link && window.innerWidth <= 768) { const authShell = document.querySelector('.auth-shell'); authShell?.classList.remove('sidebar-open'); document.getElementById('sidebar-overlay').style.display = 'none'; } });`
      
      **Verify:** On mobile, open sidebar, click "Inventory" link, confirm sidebar closes and view switches

---

- [ ] 5. **Make landing page navbar responsive with functional mobile menu in landing.css**
      
      Landing page navbar already has hamburger button and mobile menu structure, but needs style refinements.
      
      **Files:** `client/css/landing.css`
      
      **Changes:**
      - Add to `.mobile-menu`: `position: fixed; top: 64px; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.98); backdrop-filter: blur(12px); z-index: 99; overflow-y: auto; transform: translateX(100%); transition: transform 0.3s ease;`
      - Change `.mobile-menu.open` to: `transform: translateX(0);`
      - Adjust padding: `.mobile-menu { padding: 2rem 1.5rem; }`
      - Make menu links larger for touch: `.mobile-menu a { font-size: 1.1rem; padding: 0.75rem 0; }`
      
      **Verify:** Open index.html on mobile, tap hamburger, confirm full-screen slide-in menu

---

- [ ] 6. **Make landing page hero section responsive with stacked layout**
      
      Hero grid needs to stack on mobile and adjust mockup size.
      
      **Files:** `client/css/landing.css`
      
      **Changes:**
      - Existing `@media (max-width: 900px)` already stacks hero grid
      - Add mobile-specific hero padding: `@media (max-width: 767px) { .hero { padding: 80px 1rem 60px; } }`
      - Scale down headline: `.hero-headline { font-size: clamp(2rem, 8vw, 3.6rem); }`
      - Make CTAs stack: `@media (max-width: 480px) { .hero-ctas { flex-direction: column; width: 100%; } .hero-ctas .btn { width: 100%; justify-content: center; } }`
      - Hide mockup sidebar on mobile (already exists): `@media (max-width: 600px) { .mockup-sidebar { display: none; } }`
      
      **Verify:** Open index.html on 375px viewport, confirm headline readable, CTAs stack, mockup scales

---

- [ ] 7. **Make landing page features grid responsive with single column on mobile**
      
      Features grid already has responsive breakpoints but needs mobile refinement.
      
      **Files:** `client/css/landing.css`
      
      **Changes:**
      - Existing breakpoints are sufficient: `@media (max-width: 560px) { .features-grid { grid-template-columns: 1fr; } }`
      - Add mobile padding: `@media (max-width: 767px) { .features { padding: 60px 1rem; } .feature-card { padding: 1.5rem; } }`
      
      **Verify:** Open index.html, scroll to features, confirm single column on mobile, adequate padding

---

- [ ] 8. **Make landing page pricing cards stack on mobile**
      
      Pricing grid needs single column layout on mobile.
      
      **Files:** `client/css/landing.css`
      
      **Changes:**
      - Existing `@media (max-width: 900px)` already handles this with `grid-template-columns: 1fr;`
      - Add mobile refinements: `@media (max-width: 767px) { .pricing { padding: 60px 1rem; } .plan-card { padding: 1.5rem 1.25rem; } }`
      
      **Verify:** Open index.html, scroll to pricing, confirm cards stack vertically with good spacing

---

- [ ] 9. **Make landing page footer responsive with stacked columns**
      
      Footer grid needs to collapse on mobile.
      
      **Files:** `client/css/landing.css`
      
      **Changes:**
      - Existing `@media (max-width: 560px) { .footer-inner { grid-template-columns: 1fr; } }` handles stacking
      - Add mobile-specific padding: `@media (max-width: 767px) { footer { padding: 48px 1rem 24px; } .footer-bottom { flex-direction: column; text-align: center; gap: 0.5rem; } }`
      
      **Verify:** Open index.html, scroll to footer, confirm single column layout and centered bottom text

---

- [ ] 10. **Make login/auth pages responsive with better mobile padding**
       
       Login page auth card needs mobile-optimized spacing.
       
       **Files:** `client/css/main.css`
       
       **Changes:**
       - Add media query: `@media (max-width: 767px) { .auth-container { padding: 1rem; } .auth-card { padding: 1.75rem 1.25rem; } .auth-header h1 { font-size: 1.5rem; } }`
       - Ensure form inputs have min touch target: `.form-input, .form-select { min-height: 44px; }` (add to base styles)
       - Make buttons min touch target: `.btn { min-height: 44px; }`
       
       **Verify:** Open login.html on 375px viewport, confirm card fits well, inputs/buttons easy to tap

---

- [ ] 11. **Make forgot-password and reset-password pages responsive**
       
       These pages use inline styles that need mobile adjustments.
       
       **Files:** `client/forgot-password.html`, `client/reset-password.html`
       
       **Changes:**
       - In both files, add to `<style>` block: `@media (max-width: 767px) { .auth-panel { padding: 2rem 1.5rem; max-width: 100%; margin: 1rem; } h2 { font-size: 1.5rem; } input { font-size: 16px; } }`
       - Increase input font-size to 16px to prevent iOS zoom-in
       
       **Verify:** Open both pages on mobile, confirm no horizontal scroll, inputs don't trigger zoom

---

- [ ] 12. **Make dashboard data tables responsive with horizontal scroll**
       
       Dashboard tables (inventory, sales, etc.) need scroll containers on mobile.
       
       **Files:** `client/css/main.css`
       
       **Changes:**
       - `.data-table-wrapper` already exists, ensure: `.data-table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }`
       - Add mobile table styles: `@media (max-width: 767px) { .data-table { font-size: 0.85rem; } .data-table th, .data-table td { padding: 0.65rem 0.75rem; white-space: nowrap; } }`
       - Add scroll hint: `.data-table-wrapper::after { content: '← Scroll →'; display: block; text-align: center; font-size: 0.75rem; color: #94a3b8; padding: 0.5rem; } @media (min-width: 768px) { .data-table-wrapper::after { display: none; } }`
       
       **Verify:** Run `npm run dev`, open dashboard.html#inventory on mobile, confirm table scrolls horizontally with hint

---

- [ ] 13. **Make dashboard metric cards responsive with better stacking**
       
       Dashboard metrics grid needs to adjust columns on smaller screens.
       
       **Files:** `client/css/main.css`
       
       **Changes:**
       - Update `.dashboard-metrics`: `grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));` (change from 220px to 160px)
       - Add mobile override: `@media (max-width: 480px) { .dashboard-metrics { grid-template-columns: 1fr; } .metric-card__value { font-size: 1.5rem; } }`
       
       **Verify:** Open dashboard.html on 375px, confirm metrics stack to single column

---

- [ ] 14. **Make dashboard action buttons stack on mobile**
       
       Quick action button groups need vertical stacking.
       
       **Files:** `client/js/pages/dashboard.js`
       
       **Changes:**
       - In `renderDashboardOverview()`, change button container style: `<div style="padding: 1.5rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">` → add media query class
       - Better: add to main.css: `@media (max-width: 480px) { .data-card .btn { width: 100%; } }`
       
       **Verify:** Open dashboard, view quick actions on mobile, confirm buttons stack

---

- [ ] 15. **Make inventory.html responsive (legacy cyberpunk page)**
       
       Inventory page has inline styles and fixed layout.
       
       **Files:** `client/inventory.html`
       
       **Changes:**
       - In `<style>` block, add media query: `@media (max-width: 768px) { body { flex-direction: column; overflow-y: auto; } .sidebar { width: 100%; border-right: none; border-bottom: 1px solid var(--border-color); padding: 15px; } .main-content { padding: 20px; overflow-x: hidden; } .header-flex { flex-direction: column; align-items: flex-start; gap: 1rem; } .btn-primary { width: 100%; } table { font-size: 0.85rem; } th, td { padding: 8px 6px; } }`
       - Wrap table in scroll container: change `<div class="glass-panel">` to `<div class="glass-panel"><div style="overflow-x: auto;">`
       
       **Verify:** Open inventory.html on mobile, confirm sidebar and table are usable

---

- [ ] 16. **Make ledger.html responsive (legacy cyberpunk page)**
       
       Ledger page needs mobile layout adjustments.
       
       **Files:** `client/ledger.html`
       
       **Changes:**
       - In `<style>` block, add same media query as inventory: `@media (max-width: 768px) { body { flex-direction: column; overflow-y: auto; } .sidebar { width: 100%; border-right: none; border-bottom: 1px solid var(--border-color); padding: 15px; } .main-content { padding: 20px; overflow-x: hidden; } .header-flex { flex-direction: column; align-items: flex-start; gap: 1rem; } .dashboard-grid { grid-template-columns: 1fr; } table { font-size: 0.85rem; } th, td { padding: 8px 6px; } }`
       - Wrap tables in scroll containers: `<div style="overflow-x: auto;"><table>...</table></div>`
       
       **Verify:** Open ledger.html on mobile, confirm trial balance and journal entries tables scroll horizontally

---

- [ ] 17. **Make settings.html responsive (legacy cyberpunk page)**
       
       Settings page needs mobile form adjustments.
       
       **Files:** `client/settings.html`
       
       **Changes:**
       - In `<style>` block, add media query: `@media (max-width: 768px) { body { flex-direction: column; } .sidebar { width: 100%; border-right: none; border-bottom: 1px solid var(--border-color); padding: 15px; } .main-content { padding: 20px; overflow-y: auto; } .plan-grid { grid-template-columns: 1fr; gap: 1rem; } input, select { font-size: 16px; } }`
       - Ensure touch targets: `input, select, .btn-primary, .subscribe-btn { min-height: 44px; }`
       
       **Verify:** Open settings.html on mobile, confirm forms are usable and plan cards stack

---

- [ ] 18. **Add touch-friendly enhancements to landing.js**
       
       Landing page JS needs touch event support for better mobile UX.
       
       **Files:** `client/js/landing.js`
       
       **Changes:**
       - Add passive touch listeners for better scroll performance: change `window.addEventListener("scroll", updateNavbarShadow, { passive: true });` (already exists)
       - Add swipe-to-close for mobile menu: `let touchStartX = 0; mobileMenu.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true }); mobileMenu.addEventListener('touchend', (e) => { const touchEndX = e.changedTouches[0].clientX; if (touchEndX - touchStartX > 100) { closeMobileMenu(); } });`
       
       **Verify:** Open index.html on mobile, open menu, swipe right to close

---

- [ ] 19. **Add body scroll lock when mobile sidebar/menu is open**
       
       Prevent background scrolling when overlay menus are open.
       
       **Files:** `client/js/components/navbar.js`, `client/js/landing.js`
       
       **Changes:**
       - In navbar.js sidebar toggle handler, add: `document.body.style.overflow = authShell.classList.contains('sidebar-open') ? 'hidden' : '';`
       - In landing.js menu toggle, add same: `document.body.style.overflow = isOpen ? 'hidden' : '';`
       - In overlay click handlers, add: `document.body.style.overflow = '';`
       
       **Verify:** Open dashboard or landing on mobile, open menu, attempt to scroll background (should be locked)

---

- [ ] 20. **Add viewport meta tag verification to all HTML files**
       
       Ensure all pages have proper viewport meta tag for mobile rendering.
       
       **Files:** All HTML files in `client/`
       
       **Changes:**
       - Verify all files have: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
       - Files already have it: `index.html`, `login.html`, `dashboard.html`, `inventory.html`, `settings.html`, `ledger.html`, `forgot-password.html`, `reset-password.html`
       - No changes needed
       
       **Verify:** Grep for viewport meta tag: `grep -r "viewport" client/*.html` — confirm all files have it

---

- [ ] 21. **Add CSS utility classes for responsive visibility**
       
       Add helper classes to show/hide elements at different breakpoints.
       
       **Files:** `client/css/main.css`
       
       **Changes:**
       - Add at end of file: `/* Responsive utilities */ .hide-mobile { display: none; } @media (min-width: 768px) { .hide-mobile { display: block; } } .show-mobile { display: block; } @media (min-width: 768px) { .show-mobile { display: none; } } .hide-tablet { display: none; } @media (min-width: 1024px) { .hide-tablet { display: block; } }`
       
       **Verify:** Add `.hide-mobile` class to any element, confirm it's hidden on mobile

---

- [ ] 22. **Test complete mobile responsiveness across all pages**
       
       Systematic testing of all pages at mobile, tablet, and desktop breakpoints.
       
       **Files:** N/A (testing only)
       
       **Test procedure:**
       - Open each page at 375px (iPhone SE), 768px (iPad), 1024px (desktop)
       - Test pages: index.html, login.html, dashboard.html, inventory.html, ledger.html, settings.html, forgot-password.html, reset-password.html
       - Verify: no horizontal scroll, all touch targets ≥44px, text readable, buttons functional, tables scroll, forms submit
       - Test interactions: sidebar toggle, menu toggle, form submission, table scroll, dropdown menus
       
       **Verify:** Create test checklist document at `.agents/tasks/mobile-test-checklist.md` with results for each page/breakpoint combination

---

## Verification Commands

**Start dev server:**
```bash
npm run dev
```

**Test on different viewports:**
- Chrome DevTools: Toggle device toolbar, select iPhone SE (375px), iPad (768px), responsive (1024px+)
- Firefox: Responsive Design Mode (Ctrl+Shift+M)
- Safari: Develop menu → Enter Responsive Design Mode

**Grep commands for verification:**
```bash
# Check viewport meta tags
grep -r "viewport" client/*.html

# Check media queries added
grep -r "@media" client/css/*.css

# Check responsive classes
grep -r "hide-mobile\|show-mobile" client/css/*.css
```

**Manual testing checklist:**
1. All pages render without horizontal scroll on 375px viewport
2. All interactive elements (buttons, links, inputs) are ≥44px tall
3. Forms are functional on mobile (no iOS zoom, submit works)
4. Tables scroll horizontally with visual scroll hint
5. Sidebars/menus slide in smoothly on mobile
6. Background scroll is locked when overlay menus open
7. Text is readable at all breakpoints (no tiny fonts)
8. Images/mockups scale appropriately

---

## Notes

- **No viewport tag changes needed**: All HTML files already have correct viewport meta tags
- **Legacy pages** (inventory, ledger, settings) use inline styles — media queries added to inline `<style>` blocks
- **Modern pages** (dashboard, login, landing) use external CSS — media queries added to `main.css` and `landing.css`
- **Touch targets**: All interactive elements should be minimum 44×44px per WCAG 2.1 guideline 2.5.5
- **iOS zoom prevention**: Input font-size set to 16px to prevent automatic zoom on focus
- **Table strategy**: Horizontal scroll with `-webkit-overflow-scrolling: touch` for smooth mobile scrolling
- **Sidebar strategy**: Off-canvas pattern with overlay for mobile, collapsed/expanded for desktop
- **Test on real devices**: Emulators are good but test on actual iPhone/Android for best results

---

## Dependencies

None — all changes use vanilla CSS and JavaScript already in the project.

## Estimated Effort

- Steps 1-11: Foundation and layout (40% of work)
- Steps 12-17: Component refinements (35% of work)
- Steps 18-22: Polish and testing (25% of work)

Total: Approximately 8-10 hours of focused implementation and testing.
