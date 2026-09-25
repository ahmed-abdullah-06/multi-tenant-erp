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
  const eyeOpen = document.getElementById("eye-open");
  const eyeClosed = document.getElementById("eye-closed");
  
  if (togglePasswordBtn && passwordInput && eyeOpen && eyeClosed) {
    togglePasswordBtn.addEventListener("click", () => {
      if (passwordInput.type === "password") {
        passwordInput.type = "text";
        eyeOpen.style.display = "none";
        eyeClosed.style.display = "block";
        togglePasswordBtn.setAttribute("aria-label", "Hide password");
      } else {
        passwordInput.type = "password";
        eyeOpen.style.display = "block";
        eyeClosed.style.display = "none";
        togglePasswordBtn.setAttribute("aria-label", "Show password");
      }
    });
  }

  // Password strength indicator
  const strengthBar = document.getElementById("password-strength-bar");
  const strengthText = document.getElementById("password-strength-text");

  function checkPasswordStrength(password) {
    if (!password) {
      return { strength: 0, text: "", color: "#94a3b8" };
    }

    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    
    // Contains lowercase
    if (/[a-z]/.test(password)) strength += 1;
    
    // Contains uppercase
    if (/[A-Z]/.test(password)) strength += 1;
    
    // Contains numbers
    if (/\d/.test(password)) strength += 1;
    
    // Contains special characters
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;

    // Determine strength level
    if (strength <= 2) {
      return { strength: 33, text: "Weak", color: "#ef4444" };
    } else if (strength <= 4) {
      return { strength: 66, text: "Medium", color: "#f59e0b" };
    } else {
      return { strength: 100, text: "Strong", color: "#10b981" };
    }
  }

  if (passwordInput && strengthBar && strengthText) {
    passwordInput.addEventListener("input", () => {
      const result = checkPasswordStrength(passwordInput.value);
      strengthBar.style.width = result.strength + "%";
      strengthBar.style.background = result.color;
      strengthText.textContent = result.text;
      strengthText.style.color = result.color;
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
