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
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { username, display_name: username }
    }
  });
  if (error) throw error;

  if (data?.user) {
    const { error: profileError } = await supabaseClient.from("profiles").upsert({
      id: data.user.id,
      username,
      display_name: username,
      first_name: firstName,
      last_name: lastName
    });
    if (profileError) throw profileError;
  }

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
    if (sidebarUserName) sidebarUserName.textContent = (authUser.user_metadata?.username) || (authUser.email ? authUser.email.split("@")[0] : "Usuario");
    if (sidebarUserPlan) sidebarUserPlan.textContent = "Nakama";
    if (sidebarUserAvatar) sidebarUserAvatar.classList.add("logged-in");
    if (landingRegisterBtn2) landingRegisterBtn2.style.display = "none";
    if (landingLoginLink) landingLoginLink.style.display = "none";
    if (ctaSection) ctaSection.style.display = "none";
  } else {
    if (authBtn) authBtn.style.display = "inline-flex";
    if (userBtn) userBtn.style.display = "none";
    if (sidebarUserName) sidebarUserName.textContent = "Invitado";
    if (sidebarUserPlan) sidebarUserPlan.textContent = "Gratuito";
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
    title.textContent = "Iniciar sesión";
    fields.innerHTML = `
      <input type="email" id="authEmail" placeholder="Email" required autocomplete="email">
      <input type="password" id="authPassword" placeholder="Contraseña" required autocomplete="current-password">
    `;
    submitBtn.textContent = "Ingresar";
    toggleLink.innerHTML = '¿No tenés cuenta? <a href="#" id="authToggle">Registrate</a>';
  } else if (mode === "register") {
    title.textContent = "Crear cuenta";
    fields.innerHTML = `
      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
        <input type="text" id="authFirstName" placeholder="Nombre" required autocomplete="given-name">
        <input type="text" id="authLastName" placeholder="Apellido" required autocomplete="family-name">
      </div>
      <input type="text" id="authUsername" placeholder="Nombre de usuario" required autocomplete="username">
      <input type="email" id="authEmail" placeholder="Email" required autocomplete="email">
      <input type="password" id="authPassword" placeholder="Contraseña" required autocomplete="new-password" minlength="6">
    `;
    submitBtn.textContent = "Registrarse";
    toggleLink.innerHTML = '¿Ya tenés cuenta? <a href="#" id="authToggle">Iniciá sesión</a>';
  } else if (mode === "forgot") {
    title.textContent = "Recuperar contraseña";
    fields.innerHTML = `
      <input type="email" id="authEmail" placeholder="Email" required autocomplete="email">
    `;
    submitBtn.textContent = "Enviar enlace";
    toggleLink.innerHTML = '<a href="#" id="authToggle">Volver al inicio de sesión</a>';
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
  const code = err?.code || err?.status || "";
  const msg = (err?.message || "").toLowerCase();
  if (code === "23505" || (msg.includes("duplicate") && msg.includes("username")) || (msg.includes("already exists") && msg.includes("username")))
    return "Ese nombre de usuario ya está en uso. Elegí otro.";
  if (code === "user_already_exists" || code === "email_exists" || msg.includes("already registered") || msg.includes("already exists") || msg.includes("already been registered"))
    return "Ese email ya está registrado. Iniciá sesión o recuperá tu contraseña.";
  if (msg.includes("invalid login credentials"))
    return "Email o contraseña incorrectos.";
  if (msg.includes("password should be at least") || msg.includes("password must be"))
    return "La contraseña debe tener al menos 6 caracteres.";
  return err?.message || "Error de autenticación";
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
      if (!email || !password) throw new Error("Completá todos los campos");
      await signIn(email, password);
    } else if (mode === "register") {
      if (!email || !password || !username || !firstName || !lastName) throw new Error("Completá todos los campos");
      if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres");
      await signUp(email, password, username, firstName, lastName);
      successEl.textContent = "Cuenta creada. Revisá tu email para verificarla.";
      successEl.style.display = "block";
      return;
    } else if (mode === "forgot") {
      if (!email) throw new Error("Ingresá tu email");
      await resetPassword(email);
      successEl.textContent = "Si el email existe, recibirás un enlace para restablecer tu contraseña.";
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

  title.textContent = "Nueva contraseña";
  fields.innerHTML = `
    <input type="password" id="authPassword" placeholder="Nueva contraseña" required minlength="6">
  `;
  submitBtn.textContent = "Actualizar contraseña";
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
      if (!password || password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres");
      await updatePassword(password);
      successEl.textContent = "Contraseña actualizada correctamente.";
      successEl.style.display = "block";
      setTimeout(hideAuthModal, 2000);
    } catch (err) {
      errorEl.textContent = err.message || "Error al actualizar contraseña";
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
