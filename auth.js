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

function getUser() { return authUser; }
function getSession() { return authSession; }
function isAuthenticated() { return !!authUser; }

// ─── Auth Actions ────────────────────────────────────────────────────────

async function signUp(email, password, username) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { username, display_name: username }
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

async function updateProfile(updates) {
  if (!authUser) throw new Error("Not authenticated");
  const { data, error } = await supabaseClient
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", authUser.id);
  if (error) throw error;
  return data;
}

// ─── Callbacks ───────────────────────────────────────────────────────────

function onSignIn() {
  hideAuthModal();
  updateAuthUI();
  if (typeof mostrarVista === "function" && window._pendingView) {
    mostrarVista(window._pendingView);
    window._pendingView = null;
  }
}

function onSignOut() {
  updateAuthUI();
  if (typeof mostrarVista === "function") {
    mostrarVista("tcgHome");
  }
}

// ─── Auth UI ─────────────────────────────────────────────────────────────

function updateAuthUI() {
  const userBtn = document.getElementById("userBtn");
  const authBtn = document.getElementById("authBtn");
  if (!userBtn || !authBtn) return;
  if (isAuthenticated()) {
    authBtn.style.display = "none";
    userBtn.style.display = "inline-flex";
    const email = authUser.email || "";
    userBtn.textContent = email.split("@")[0];
    userBtn.title = email;
  } else {
    authBtn.style.display = "inline-flex";
    userBtn.style.display = "none";
  }
}

function showAuthModal(mode) {
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

  errorEl.style.display = "none";
  successEl.style.display = "none";

  try {
    if (mode === "login") {
      if (!email || !password) throw new Error("Completá todos los campos");
      await signIn(email, password);
    } else if (mode === "register") {
      if (!email || !password || !username) throw new Error("Completá todos los campos");
      if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres");
      await signUp(email, password, username);
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
    errorEl.textContent = err.message || "Error de autenticación";
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
    showAuthModal("reset");
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
