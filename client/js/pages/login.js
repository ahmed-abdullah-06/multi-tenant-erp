import apiClient from "../api/apiClient.js";
import { setToken, setOrganizationId, getToken } from "../state/store.js";

document.addEventListener("DOMContentLoaded", () => {
  // If already logged in, redirect to dashboard
  if (getToken()) {
    window.location.href = "/dashboard.html";
    return;
  }

  let isRegisterMode = false;

  const authTitle = document.getElementById("auth-title");
  const authSubtitle = document.getElementById("auth-subtitle");
  const nameGroup = document.getElementById("name-group");
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const submitBtn = document.getElementById("submit-btn");
  const toggleBtn = document.getElementById("toggle-mode-btn");
  const toggleText = document.getElementById("toggle-text");
  const alertBox = document.getElementById("alert-message");
  const authForm = document.getElementById("auth-form");

  function showAlert(message, isError = true) {
    alertBox.textContent = message;
    alertBox.className = isError ? "alert-box alert-error" : "alert-box alert-success";
    alertBox.style.display = "block";
  }

  function hideAlert() {
    alertBox.style.display = "none";
  }

  // Password visibility toggle
  const togglePasswordBtn = document.getElementById("toggle-password");
  
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener("click", () => {
      if (passwordInput.type === "password") {
        passwordInput.type = "text";
        togglePasswordBtn.textContent = "Hide";
        togglePasswordBtn.setAttribute("aria-label", "Hide password");
      } else {
        passwordInput.type = "password";
        togglePasswordBtn.textContent = "Show";
        togglePasswordBtn.setAttribute("aria-label", "Show password");
      }
    });
  }

  toggleBtn.addEventListener("click", (e) => {
    e.preventDefault(); // Prevent any default button behavior
    isRegisterMode = !isRegisterMode;
    hideAlert();
    
    if (isRegisterMode) {
      authTitle.textContent = "Create Organization";
      authSubtitle.textContent = "Set up your tenant workspace and admin account";
      nameGroup.style.display = "block";
      nameInput.required = true;
      submitBtn.textContent = "Create Account & Org";
      toggleText.textContent = "Already have an account?";
      toggleBtn.textContent = "Sign in";
    } else {
      authTitle.textContent = "Welcome Back";
      authSubtitle.textContent = "Sign in to your organization account";
      nameGroup.style.display = "none";
      nameInput.required = false;
      submitBtn.textContent = "Sign In";
      toggleText.textContent = "Don't have an account?";
      toggleBtn.textContent = "Create organization";
    }
  });

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();
    submitBtn.disabled = true;
    submitBtn.textContent = "Processing...";

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Client-side validation
    if (password.length < 8) {
      showAlert("Password must be at least 8 characters long");
      submitBtn.disabled = false;
      submitBtn.textContent = isRegisterMode ? "Create Account & Org" : "Sign In";
      return;
    }

    try {
      if (isRegisterMode) {
        const name = nameInput.value.trim();
        const res = await apiClient("/auth/register", {
          method: "POST",
          body: JSON.stringify({ name, email, password })
        });

        if (res.data && res.data.accessToken) {
          setToken(res.data.accessToken);
          if (res.data.organization) {
            setOrganizationId(res.data.organization.id);
          }
          showAlert("Registration successful! Redirecting...", false);
          setTimeout(() => {
            window.location.href = "/dashboard.html";
          }, 800);
        } else {
          throw new Error("Invalid response from server");
        }
      } else {
        const res = await apiClient("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password })
        });

        if (res.data && res.data.accessToken) {
          setToken(res.data.accessToken);
          if (res.data.defaultOrganizationId) {
            setOrganizationId(res.data.defaultOrganizationId);
          }
          showAlert("Login successful! Redirecting...", false);
          setTimeout(() => {
            window.location.href = "/dashboard.html";
          }, 600);
        } else {
          throw new Error("Invalid response from server");
        }
      }
    } catch (err) {
      showAlert(err.message || "Authentication failed. Please try again.");
      submitBtn.disabled = false;
      submitBtn.textContent = isRegisterMode ? "Create Account & Org" : "Sign In";
    }
  });
});
