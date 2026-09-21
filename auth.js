// ─── Auth Module ──────────────────────────────────────────────────────────

let authUser = null;
let authSession = null;
let authReady = false;
const authListeners = [];

// ─── Session ─────────────────────────────────────────────────────────────

async function initAuth() {
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  if (error) { console.error("Auth init error:", error); }
  authSession = session;
  authUser = session?.user ?? null;
  authReady = true;
  authListeners.forEach(fn => fn(authUser));
}

supabaseClient.auth.onAuthStateChange((event, session) => {
  authSession = session;
  authUser = session?.user ?? null;
  authReady = true;
  authListeners.forEach(fn => fn(authUser));
  if (event === "SIGNED_IN") onSignIn();
  if (event === "SIGNED_OUT") onSignOut();
});

function onAuthChange(fn) {
  authListeners.push(fn);
  if (authReady) fn(authUser);
}

function isAuthenticated() { return !!authUser; }

// ─── Auth Actions ────────────────────────────────────────────────────────

async function signUp(email, password, username, firstName, lastName) {
  // ponytail: sin escritura a profiles — trigger handle_new_user() crea fila (SECURITY DEFINER, sin RLS race)
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { username, display_name: username, first_name: firstName, last_name: lastName }
    }
  });
  if (error) throw error;

  return data;
}

async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
}

async function resetPassword(email) {
  const { error } = await supabaseClient.auth.sendPasswordResetEmail(email, {
    redirectTo: window.location.origin + window.location.pathname + "?reset=true"
  });
  if (error) throw error;
}

async function updatePassword(newPassword) {
  const { data, error } = await supabaseClient.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data;
}

// ─── Profile ─────────────────────────────────────────────────────────────

async function getProfile() {
  if (!authUser) return null;
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .single();
  if (error && error.code !== "PGRST116") console.error("Profile fetch error:", error);
  return data;
}

// ─── Callbacks ───────────────────────────────────────────────────────────

function onSignIn() {
  hideAuthModal();
  updateAuthUI();
  if (typeof invalidatePlanCache === "function") invalidatePlanCache();
  if (typeof refreshTierLabel === "function") refreshTierLabel();
  if (typeof migrateLocalToSupabase === "function") {
    migrateLocalToSupabase().catch(console.error);
  }
  if (typeof navigateToView === "function" && window._pendingView) {
    const pending = window._pendingView;
    window._pendingView = null;
    if (pending === "profile" && typeof openProfile === "function") {
      openProfile();
    } else {
      navigateToView(pending, {}, {});
    }
  }
}

function onSignOut() {
  updateAuthUI();
  try { sessionStorage.removeItem("tutcg_ui_state"); } catch (e) {}
  if (typeof window !== "undefined") { window._lastRoute = "home"; window._lastRouteId = null; }
  if (typeof invalidatePlanCache === "function") invalidatePlanCache();
  if (typeof rebuildLocalFallback === "function") rebuildLocalFallback();
  if (typeof router !== "undefined" && router.navigateToRoute) {
    router.navigateToRoute('home', {}, {});
  } else if (typeof mostrarVista === "function") {
    mostrarVista("tcgHome");
  }
}

// ─── Auth UI ─────────────────────────────────────────────────────────────

function updateAuthUI() {
  const userBtn = document.getElementById("userBtn");
  const authBtn = document.getElementById("authBtn");
  const sidebarUserName = document.getElementById("sidebarUserName");
  const sidebarUserPlan = document.getElementById("sidebarUserPlan");
  const sidebarUserAvatar = document.getElementById("sidebarUserAvatar");
  const landingRegisterBtn2 = document.getElementById("landingRegisterBtn2");
  const landingLoginLink = document.querySelector(".hero-login-link");
  const ctaSection = document.getElementById("ctaSection");

  if (isAuthenticated()) {
    if (authBtn) authBtn.style.display = "none";
    if (userBtn) {
      userBtn.style.display = "inline-flex";
      const email = authUser.email || "";
      const span = userBtn.querySelector("span");
      if (span) span.textContent = email.split("@")[0];
      userBtn.title = email;
    }
    if (sidebarUserName) sidebarUserName.textContent = (authUser.user_metadata?.username) || (authUser.email ? authUser.email.split("@")[0] : t("authm.fallback_user"));
    if (sidebarUserPlan) sidebarUserPlan.textContent = t("authm.plan_nakama");
    if (sidebarUserAvatar) sidebarUserAvatar.classList.add("logged-in");
    if (landingRegisterBtn2) landingRegisterBtn2.style.display = "none";
    if (landingLoginLink) landingLoginLink.style.display = "none";
    if (ctaSection) ctaSection.style.display = "none";
  } else {
    if (authBtn) authBtn.style.display = "inline-flex";
    if (userBtn) userBtn.style.display = "none";
    if (sidebarUserName) sidebarUserName.textContent = t("authm.guest");
    if (sidebarUserPlan) sidebarUserPlan.textContent = t("authm.plan_free");
    if (sidebarUserAvatar) sidebarUserAvatar.classList.remove("logged-in");
    if (landingRegisterBtn2) landingRegisterBtn2.style.display = "";
    if (landingLoginLink) landingLoginLink.style.display = "";
    if (ctaSection) ctaSection.style.display = "";
  }
}

function showAuthModal(mode) {
  mode = mode || "login";
  const overlay = document.getElementById("authModalOverlay");
  const form = document.getElementById("authForm");
  const title = document.getElementById("authModalTitle");
  const fields = document.getElementById("authFields");
  const submitBtn = document.getElementById("authSubmitBtn");
  const toggleLink = document.getElementById("authToggleLink");
  const errorEl = document.getElementById("authError");
  const successEl = document.getElementById("authSuccess");

  errorEl.textContent = "";
  successEl.textContent = "";
  errorEl.style.display = "none";
  successEl.style.display = "none";
  overlay.style.display = "flex";

  if (mode === "login") {
    title.textContent = t("authm.login_title");
    fields.innerHTML = `
      <input type="email" id="authEmail" placeholder="${t("authm.ph_email")}" required autocomplete="email">
      <input type="password" id="authPassword" placeholder="${t("authm.ph_password")}" required autocomplete="current-password">
    `;
    submitBtn.textContent = t("authm.login_btn");
    toggleLink.innerHTML = t("authm.no_account") + ' <a href="#" id="authToggle">' + t("authm.register_link") + '</a>';
  } else if (mode === "register") {
    title.textContent = t("authm.register_title");
    fields.innerHTML = `
      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
        <input type="text" id="authFirstName" placeholder="${t("authm.ph_first")}" required autocomplete="given-name">
        <input type="text" id="authLastName" placeholder="${t("authm.ph_last")}" required autocomplete="family-name">
      </div>
      <input type="text" id="authUsername" placeholder="${t("authm.ph_user")}" required autocomplete="username">
      <input type="email" id="authEmail" placeholder="${t("authm.ph_email")}" required autocomplete="email">
      <input type="password" id="authPassword" placeholder="${t("authm.ph_password")}" required autocomplete="new-password" minlength="6">
    `;
    submitBtn.textContent = t("authm.register_btn");
    toggleLink.innerHTML = t("authm.have_account") + ' <a href="#" id="authToggle">' + t("authm.login_link") + '</a>';
  } else if (mode === "forgot") {
    title.textContent = t("authm.forgot_title");
    fields.innerHTML = `
      <input type="email" id="authEmail" placeholder="${t("authm.ph_email")}" required autocomplete="email">
    `;
    submitBtn.textContent = t("authm.forgot_btn");
    toggleLink.innerHTML = '<a href="#" id="authToggle">' + t("authm.back_login") + '</a>';
  }

  overlay._mode = mode;
}

function hideAuthModal() {
  const overlay = document.getElementById("authModalOverlay");
  overlay.style.display = "none";
  document.getElementById("authError").style.display = "none";
  document.getElementById("authSuccess").style.display = "none";
  window._pendingView = null;
}

// ponytail: solo mapea strings conocidos de Supabase; si Auth tiene anti-enumeración, email duplicado devuelve éxito falso y no hay error que mapear (pasar a RPC/trigger).
function friendlyAuthError(err) {
  const code = String(err?.code || err?.status || "");
  const msg = (err?.message || "").toLowerCase();
  if (msg.includes("row-level security") || code === "42501")
    return t("authm.err_auth");
  if (code === "23505" || (msg.includes("duplicate") && msg.includes("username")) || (msg.includes("already exists") && msg.includes("username")))
    return t("authm.err_user_taken");
  if (code === "user_already_exists" || code === "email_exists" || msg.includes("already registered") || msg.includes("already exists") || msg.includes("already been registered"))
    return t("authm.err_email_taken");
  if (msg.includes("invalid login credentials"))
    return t("authm.err_bad_login");
  if (msg.includes("password should be at least") || msg.includes("password must be"))
    return t("authm.err_short_pass");
  return err?.message || t("authm.err_auth");
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const overlay = document.getElementById("authModalOverlay");
  const mode = overlay._mode || "login";
  const errorEl = document.getElementById("authError");
  const successEl = document.getElementById("authSuccess");
  const email = document.getElementById("authEmail")?.value?.trim();
  const password = document.getElementById("authPassword")?.value;
  const username = document.getElementById("authUsername")?.value?.trim();
  const firstName = document.getElementById("authFirstName")?.value?.trim();
  const lastName = document.getElementById("authLastName")?.value?.trim();

  errorEl.style.display = "none";
  successEl.style.display = "none";

  try {
    if (mode === "login") {
      if (!email || !password) throw new Error(t("authm.err_fill"));
      await signIn(email, password);
    } else if (mode === "register") {
      if (!email || !password || !username || !firstName || !lastName) throw new Error(t("authm.err_fill"));
      if (password.length < 6) throw new Error(t("authm.err_short_pass"));
      await signUp(email, password, username, firstName, lastName);
      successEl.textContent = t("authm.register_ok");
      successEl.style.display = "block";
      return;
    } else if (mode === "forgot") {
      if (!email) throw new Error(t("authm.err_enter_email"));
      await resetPassword(email);
      successEl.textContent = t("authm.reset_ok");
      successEl.style.display = "block";
      return;
    }
  } catch (err) {
    errorEl.textContent = friendlyAuthError(err);
    errorEl.style.display = "block";
  }
}

// ─── Protected Routes ────────────────────────────────────────────────────

function protectRoute(view) {
  if (isAuthenticated()) return true;
  window._pendingView = view;
  showAuthModal("login");
  return false;
}

function checkResetPassword() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("reset") === "true" || params.get("type") === "recovery") {
    showResetPasswordForm();
  }
}

function showResetPasswordForm() {
  const overlay = document.getElementById("authModalOverlay");
  const form = document.getElementById("authForm");
  const title = document.getElementById("authModalTitle");
  const fields = document.getElementById("authFields");
  const submitBtn = document.getElementById("authSubmitBtn");
  const toggleLink = document.getElementById("authToggleLink");
  const errorEl = document.getElementById("authError");
  const successEl = document.getElementById("authSuccess");

  errorEl.textContent = "";
  successEl.textContent = "";
  errorEl.style.display = "none";
  successEl.style.display = "none";
  overlay.style.display = "flex";

  title.textContent = t("authm.newpass_title");
  fields.innerHTML = `
    <input type="password" id="authPassword" placeholder="${t("authm.ph_newpass")}" required minlength="6">
  `;
  submitBtn.textContent = t("authm.newpass_btn");
  toggleLink.innerHTML = "";
  overlay._mode = "reset";
}

// Extend handleAuthSubmit for reset mode
const originalHandleAuthSubmit = handleAuthSubmit;
handleAuthSubmit = async function(e) {
  const overlay = document.getElementById("authModalOverlay");
  if (overlay._mode === "reset") {
    e.preventDefault();
    const errorEl = document.getElementById("authError");
    const successEl = document.getElementById("authSuccess");
    const password = document.getElementById("authPassword")?.value;
    errorEl.style.display = "none";
    successEl.style.display = "none";
    try {
      if (!password || password.length < 6) throw new Error(t("authm.err_short_pass"));
      await updatePassword(password);
      successEl.textContent = t("authm.pass_updated");
      successEl.style.display = "block";
      setTimeout(hideAuthModal, 2000);
    } catch (err) {
      errorEl.textContent = err.message || t("authm.err_update_pass");
      errorEl.style.display = "block";
    }
    return;
  }
  return originalHandleAuthSubmit(e);
};

// ─── Init ────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  updateAuthUI();
  checkResetPassword();
});

// ─── Auth UI event listeners (bound here: showAuthModal/hideAuthModal/signOut live here) ──
document.querySelectorAll("[id^='landingLoginBtn']").forEach(btn => {
  btn.addEventListener("click", () => showAuthModal("login"));
});
document.querySelectorAll("[id^='landingRegisterBtn'], #landingCtaBtn").forEach(btn => {
  btn.addEventListener("click", () => showAuthModal("register"));
});
document.getElementById("authBtn")?.addEventListener("click", () => {
  showAuthModal("login");
});
document.getElementById("userBtn")?.addEventListener("click", (e) => {
  e.stopPropagation();
  const dd = document.getElementById("userDropdown");
  if (dd) dd.style.display = dd.style.display === "none" ? "block" : "none";
});
document.getElementById("dropdownLogout")?.addEventListener("click", async () => {
  document.getElementById("userDropdown").style.display = "none";
  if (typeof requestStagedExit === "function" && !requestStagedExit("logout", function() { signOut(); })) return;
  await signOut();
});
document.getElementById("dropdownProfile")?.addEventListener("click", () => {
  document.getElementById("userDropdown").style.display = "none";
  if (typeof openProfile === "function") { openProfile(); }
});
document.addEventListener("click", () => {
  const dd = document.getElementById("userDropdown");
  if (dd) dd.style.display = "none";
});
document.getElementById("authModalOverlay")?.addEventListener("click", (e) => {
  if (e.target === e.currentTarget) hideAuthModal();
});
document.querySelector("#authToggleLink")?.addEventListener("click", (e) => {
  if (e.target.id === "authToggle") {
    e.preventDefault();
    const overlay = document.getElementById("authModalOverlay");
    const mode = overlay._mode === "login" ? "register" : overlay._mode === "register" ? "forgot" : "login";
    showAuthModal(mode);
  }
});
