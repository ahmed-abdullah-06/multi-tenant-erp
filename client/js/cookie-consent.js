// Cookie Consent Manager
// Manages cookie consent for GDPR compliance

const COOKIE_CONSENT_KEY = 'nexus_erp_cookie_consent';
const COOKIE_CONSENT_VERSION = '1.0';

class CookieConsent {
  constructor() {
    this.consent = this.getConsent();
    this.init();
  }

  getConsent() {
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
      
      return parsed;
    } catch {
      return null;
    }
  }

  setConsent(accepted, analytics = false) {
    const consent = {
      version: COOKIE_CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      necessary: true, // Always true
      analytics: analytics,
      marketing: false, // Not used currently
      accepted: accepted
    };
    
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
    this.consent = consent;
    
    // Dispatch event for other scripts to listen
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: consent }));
    
    return consent;
  }

  hasConsent(type = 'necessary') {
    if (!this.consent) return false;
    if (type === 'necessary') return true;
    return this.consent[type] || false;
  }

  init() {
    if (!this.consent) {
      this.showBanner();
    }
  }

  showBanner() {
    // Don't show if already dismissed
    if (document.getElementById('cookie-consent-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'cookie-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML = `
      <div class="cookie-consent-content">
        <div class="cookie-consent-text">
          <h3>We value your privacy</h3>
          <p>We use cookies to enhance your experience and analyze site traffic. By clicking "Accept All", you consent to our use of cookies. 
          <a href="/privacy.html" target="_blank">Privacy Policy</a></p>
        </div>
        <div class="cookie-consent-actions">
          <button type="button" class="btn btn-outline" id="cookie-consent-customize">Customize</button>
          <button type="button" class="btn btn-outline" id="cookie-consent-reject">Reject All</button>
          <button type="button" class="btn btn-primary" id="cookie-consent-accept">Accept All</button>
        </div>
      </div>
      <div class="cookie-consent-customize-panel" id="cookie-customize-panel" style="display: none;">
        <h4>Cookie Preferences</h4>
        <div class="cookie-option">
          <label class="cookie-option-label">
            <input type="checkbox" checked disabled>
            <span>Necessary Cookies</span>
          </label>
          <p class="cookie-option-desc">Required for the website to function. Cannot be disabled.</p>
        </div>
        <div class="cookie-option">
          <label class="cookie-option-label">
            <input type="checkbox" id="cookie-analytics">
            <span>Analytics Cookies</span>
          </label>
          <p class="cookie-option-desc">Help us understand how visitors interact with the website.</p>
        </div>
        <div class="cookie-consent-actions">
          <button type="button" class="btn btn-primary" id="cookie-consent-save">Save Preferences</button>
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      #cookie-consent-banner {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: #0f172a;
        color: #e2e8f0;
        padding: 1.5rem;
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        border-top: 1px solid #334155;
      }
      .cookie-consent-content {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 2rem;
      }
      .cookie-consent-text h3 {
        margin: 0 0 0.5rem;
        font-size: 1.1rem;
        color: #f8fafc;
      }
      .cookie-consent-text p {
        margin: 0;
        font-size: 0.9rem;
        color: #94a3b8;
        line-height: 1.5;
      }
      .cookie-consent-text a {
        color: #38bdf8;
        text-decoration: none;
      }
      .cookie-consent-text a:hover {
        text-decoration: underline;
      }
      .cookie-consent-actions {
        display: flex;
        gap: 0.75rem;
        flex-shrink: 0;
      }
      .cookie-consent-customize-panel {
        max-width: 1200px;
        margin: 1.5rem auto 0;
        padding-top: 1.5rem;
        border-top: 1px solid #334155;
      }
      .cookie-consent-customize-panel h4 {
        margin: 0 0 1rem;
        color: #f8fafc;
      }
      .cookie-option {
        margin-bottom: 1rem;
      }
      .cookie-option-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        font-weight: 500;
      }
      .cookie-option-desc {
        margin: 0.25rem 0 0 1.5rem;
        font-size: 0.85rem;
        color: #64748b;
      }
      @media (max-width: 768px) {
        .cookie-consent-content {
          flex-direction: column;
          text-align: center;
        }
        .cookie-consent-actions {
          flex-wrap: wrap;
          justify-content: center;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(banner);

    // Event listeners
    document.getElementById('cookie-consent-accept').addEventListener('click', () => {
      this.setConsent(true, true);
      this.hideBanner();
    });

    document.getElementById('cookie-consent-reject').addEventListener('click', () => {
      this.setConsent(false, false);
      this.hideBanner();
    });

    document.getElementById('cookie-consent-customize').addEventListener('click', () => {
      const panel = document.getElementById('cookie-customize-panel');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('cookie-consent-save').addEventListener('click', () => {
      const analytics = document.getElementById('cookie-analytics').checked;
      this.setConsent(true, analytics);
      this.hideBanner();
    });
  }

  hideBanner() {
    const banner = document.getElementById('cookie-consent-banner');
    if (banner) {
      banner.style.animation = 'slideUp 0.3s ease-out forwards';
      setTimeout(() => banner.remove(), 300);
    }
  }

  // Check if analytics cookies are allowed
  canUseAnalytics() {
    return this.hasConsent('analytics');
  }
}

// Create singleton instance
const cookieConsent = new CookieConsent();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = cookieConsent;
} else {
  window.cookieConsent = cookieConsent;
}
