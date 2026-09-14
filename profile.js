// ─── Profile Module ────────────────────────────────────────────────────────

let currentProfile = null;

// ─── Fetch Profile ────────────────────────────────────────────────────────

async function loadProfile() {
  if (!isAuthenticated()) return null;
  try {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .single();
    if (error && error.code !== "PGRST116") { console.error("Profile fetch:", error); return null; }
    currentProfile = data;
    return data;
  } catch (e) {
    console.error("Profile load error:", e);
    return null;
  }
}

// ─── Populate Form ────────────────────────────────────────────────────────

function populateProfileForm(profile) {
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ""; };

  setVal("profileFirstName", profile?.first_name || "");
  setVal("profileLastName", profile?.last_name || "");
  setVal("profileUsername", profile?.username || "");
  setVal("profileEmail", authUser?.email || "");
  setVal("profileBio", profile?.bio || "");
  setVal("profileCity", profile?.city || "");
  setVal("profileCountry", profile?.country || "");
  setVal("profileContactPhone", profile?.contact_phone || "");
  setVal("profileContactWsp", profile?.contact_wsp || "");
  setVal("profileLanguage", profile?.preferences?.language || "es");
  setVal("profileCurrency", profile?.preferences?.currency || "USD");
  // ponytail: el select refleja el idioma efectivo y lo aplica al abrir el perfil
  try {
    const stored = localStorage.getItem("tutcg_lang");
    const eff = stored || profile?.preferences?.language || "es";
    if (stored) setVal("profileLanguage", stored);
    if (typeof setLang === "function") setLang(eff);
  } catch (e) {}

  const notifEl = document.getElementById("profileNotifications");
  if (notifEl) notifEl.checked = profile?.preferences?.notifications !== false;

  // Avatar
  const avatarImg = document.getElementById("profileAvatarImg");
  const avatarPlaceholder = document.getElementById("profileAvatarPlaceholder");
  if (profile?.avatar_url) {
    avatarImg.src = profile.avatar_url;
    avatarImg.style.display = "block";
    if (avatarPlaceholder) avatarPlaceholder.style.display = "none";
  } else {
    avatarImg.style.display = "none";
    if (avatarPlaceholder) avatarPlaceholder.style.display = "";
  }

  // Social links
  renderSocialLinks(profile?.social_links || []);

  updateSidebarProfile(profile);
  renderPlanBlock(profile);
}
// ponytail: cambio de idioma instantáneo (Guardar lo persiste en Supabase)
document.getElementById("profileLanguage")?.addEventListener("change", function(e) { if (typeof setLang === "function") setLang(e.target.value); });

// ─── Subscription / crew ──────────────────────────────────────────────────

async function renderPlanBlock(profile) {
  const box = document.getElementById("planBlock");
  if (!box) return;
  const plan = {
    level: profile?.plan_level || 0,
    crew: profile?.crew || null,
    isAdmin: !!profile?.is_admin
  };
  const label = (typeof tierLabel === "function") ? tierLabel(plan) : t("prof.tier_nakama");
  const lim = ((typeof PLAN_LIMITS !== "undefined" && PLAN_LIMITS[plan.level]) || { spaces: 5, cards: 150 });
  const crew = (typeof crewById === "function") ? crewById(plan.crew) : null;
  let html = '<p style="font-size:var(--text-sm);margin-bottom:var(--space-2)">' + t("prof.plan_label") + ' <strong style="color:' +
    (crew ? crew.color : "var(--accent)") + '">' + label + "</strong></p>";
  if (typeof getMySpaceUsage === "function") {
    const used = await getMySpaceUsage();
    html += '<p class="profile-field-hint" style="margin-bottom:var(--space-3)">' + t("prof.usage", { used: used, spaces: (plan.isAdmin ? "∞" : lim.spaces), cards: (lim.cards == null ? t("prof.cards_unlimited") : t("prof.cards_upto", { n: lim.cards })) }) + "</p>";
  }
  if (plan.isAdmin || plan.level >= 1) {
    const crews = (typeof CREWS !== "undefined") ? CREWS : [];
    html += '<p class="profile-field-hint" style="margin-bottom:var(--space-2)">' + t("prof.crew_title") + '</p><div class="crew-grid">' +
      crews.map(function(c) {
        return '<button type="button" class="crew-btn' + (plan.crew === c.id ? " active" : "") + '" data-crew="' + c.id + '"' +
          ' style="--crew-color:' + c.color + '">' + c.name + "</button>";
      }).join("") + "</div>";
  } else {
    html += '<p class="profile-field-hint">' + t("prof.crew_locked") + '</p>';
  }
  box.innerHTML = html;
  box.querySelectorAll(".crew-btn").forEach(function(btn) {
    btn.addEventListener("click", function() { setCrew(btn.getAttribute("data-crew")); });
  });
}

async function setCrew(crewId) {
  if (!isAuthenticated()) return;
  try {
    const { error } = await supabaseClient.from("profiles").update({ crew: crewId }).eq("id", authUser.id);
    if (error) throw error;
    if (typeof invalidatePlanCache === "function") invalidatePlanCache();
    if (typeof refreshTierLabel === "function") refreshTierLabel();
    const p = await loadProfile();
    if (p) { renderPlanBlock(p); updateSidebarProfile(p); }
    if (typeof showToast === "function") showToast(t("prof.crew_ok"), "success");
  } catch (e) {
    if (typeof showToast === "function") showToast(t("prof.crew_error"), "error");
  }
}

function renderSocialLinks(links) {
  const container = document.getElementById("socialLinksContainer");
  if (!container) return;
  container.innerHTML = "";

  const platforms = ["instagram", "twitter", "tiktok", "youtube", "discord", "other"];
  const platformLabels = {
    instagram: "Instagram",
    twitter: "X (Twitter)",
    tiktok: "TikTok",
    youtube: "YouTube",
    discord: "Discord",
    other: t("prof.platform_other")
  };

  links.forEach((link, idx) => {
    addSocialLinkRow(link.platform || "other", link.url || "", idx);
  });

  if (links.length === 0) {
    addSocialLinkRow("other", "", 0);
  }
}

function addSocialLinkRow(selectedPlatform = "other", urlValue = "", index) {
  const container = document.getElementById("socialLinksContainer");
  if (!container) return;

  const platforms = ["instagram", "twitter", "tiktok", "youtube", "discord", "other"];
  const platformLabels = {
    instagram: "Instagram",
    twitter: "X (Twitter)",
    tiktok: "TikTok",
    youtube: "YouTube",
    discord: "Discord",
    other: t("prof.platform_other")
  };

  const div = document.createElement("div");
  div.className = "social-link-row";
  div.dataset.index = index;

  let optionsHtml = platforms.map(p =>
    `<option value="${p}" ${p === selectedPlatform ? "selected" : ""}>${platformLabels[p]}</option>`
  ).join("");

  div.innerHTML = `
    <select class="social-platform-select" style="width:120px">${optionsHtml}</select>
    <input type="url" class="social-url-input" placeholder="https://..." value="${urlValue}" style="flex:1">
    <button type="button" class="btn-ghost btn-sm social-remove-btn">&times;</button>
  `;

  div.querySelector(".social-remove-btn").addEventListener("click", () => {
    div.remove();
  });

  container.appendChild(div);
}

function addSocialLink() {
  const container = document.getElementById("socialLinksContainer");
  if (!container) return;
  const idx = container.children.length;
  addSocialLinkRow("other", "", idx);
}

function getSocialLinksFromForm() {
  const container = document.getElementById("socialLinksContainer");
  if (!container) return [];

  const links = [];
  container.querySelectorAll(".social-link-row").forEach(row => {
    const platform = row.querySelector(".social-platform-select")?.value || "other";
    let url = row.querySelector(".social-url-input")?.value?.trim() || "";

    if (url) {
      if (!url.match(/^https?:\/\//i)) {
        url = "https://" + url;
      }
      if (url.match(/^https?:\/\//i)) {
        links.push({ platform, url });
      }
    }
  });
  return links;
}

function isValidWspLink(url) {
  if (!url) return true;
  try {
    const domains = ['wa.me', 'web.whatsapp.com', 'api.whatsapp.com'];
    const parsed = new URL(url);
    return domains.some(d => parsed.hostname.includes(d));
  } catch { return false; }
}

function isValidPhone(phone) {
  if (!phone) return true;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return false;
  return /^[\d\s\+\-\(\)]{8,}$/.test(phone);
}

function updateSidebarProfile(profile) {
  const sidebarUserName = document.getElementById("sidebarUserName");
  const sidebarUserPlan = document.getElementById("sidebarUserPlan");
  const sidebarUserAvatar = document.getElementById("sidebarUserAvatar");
  if (sidebarUserName) sidebarUserName.textContent = profile?.display_name || profile?.username || (authUser?.email ? authUser.email.split("@")[0] : t("prof.fallback_user"));
  if (sidebarUserPlan) {
    sidebarUserPlan.textContent = (typeof tierLabel === "function")
      ? tierLabel({ level: profile?.plan_level || 0, crew: profile?.crew || null, isAdmin: !!profile?.is_admin })
      : t("prof.tier_nakama");
  }
  if (sidebarUserAvatar) sidebarUserAvatar.classList.add("logged-in");
  if (sidebarUserAvatar && profile?.avatar_url) {
    sidebarUserAvatar.style.backgroundImage = `url(${profile.avatar_url})`;
    sidebarUserAvatar.style.backgroundSize = "cover";
    sidebarUserAvatar.style.backgroundPosition = "center";
  }
}

// ─── Save Profile ─────────────────────────────────────────────────────────

async function handleProfileSave(e) {
  e.preventDefault();
  const msg = document.getElementById("profileMessage");
  const saveBtn = document.getElementById("profileSaveBtn");

  if (!isAuthenticated()) {
    showMsg(t("prof.login_required"), "error");
    return false;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = t("prof.saving");
  hideMsg();

  const contactPhone = document.getElementById("profileContactPhone")?.value?.trim() || "";
  const contactWsp = document.getElementById("profileContactWsp")?.value?.trim() || "";

  if (contactPhone && !isValidPhone(contactPhone)) {
    showMsg(t("prof.bad_phone"), "error");
    saveBtn.disabled = false;
    saveBtn.textContent = t("prof.save");
    return false;
  }

  if (contactWsp && !isValidWspLink(contactWsp)) {
    showMsg(t("prof.bad_wsp"), "error");
    saveBtn.disabled = false;
    saveBtn.textContent = t("prof.save");
    return false;
  }

  const preferences = {
    language: document.getElementById("profileLanguage")?.value || "es",
    currency: document.getElementById("profileCurrency")?.value || "USD",
    notifications: document.getElementById("profileNotifications")?.checked
  };

  const updates = {
    first_name: document.getElementById("profileFirstName")?.value || null,
    last_name: document.getElementById("profileLastName")?.value || null,
    username: document.getElementById("profileUsername")?.value || null,
    display_name: document.getElementById("profileUsername")?.value || null,
    bio: document.getElementById("profileBio")?.value || null,
    city: document.getElementById("profileCity")?.value || null,
    country: document.getElementById("profileCountry")?.value || null,
    contact_phone: contactPhone || null,
    contact_wsp: contactWsp || null,
    social_links: getSocialLinksFromForm(),
    preferences: preferences,
    updated_at: new Date().toISOString()
  };

  try {
    let result;
    if (currentProfile) {
      const { data, error } = await supabaseClient
        .from("profiles")
        .update(updates)
        .eq("id", authUser.id)
        .select();
      if (error) throw error;
      result = data?.[0];
    } else {
      const { data, error } = await supabaseClient
        .from("profiles")
        .insert({ id: authUser.id, ...updates })
        .select();
      if (error) throw error;
      result = data?.[0];
    }

    currentProfile = result;
    updateSidebarProfile(result);
    updateAuthUI();
    if (typeof setLang === "function") setLang(preferences.language);
    showMsg(t("prof.updated"), "success");
  } catch (err) {
    console.error("Profile save error:", err);
    if (err.message?.includes("profiles_username_key") || err.message?.includes("duplicate key")) {
      showMsg(t("prof.user_taken"), "error");
    } else {
      showMsg(err.message || t("prof.save_error"), "error");
    }
  }

  saveBtn.disabled = false;
  saveBtn.textContent = t("prof.save");
  return false;
}

// ─── Avatar Upload ────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const avatarWrap = document.getElementById("profileAvatarWrap");
  const avatarInput = document.getElementById("avatarInput");
  const avatarUploadBtn = document.getElementById("avatarUploadBtn");

  if (avatarWrap) avatarWrap.addEventListener("click", () => avatarInput?.click());
  if (avatarUploadBtn) avatarUploadBtn.addEventListener("click", (e) => { e.stopPropagation(); avatarInput?.click(); });

  if (avatarInput) {
    avatarInput.addEventListener("change", async () => {
      const file = avatarInput.files?.[0];
      if (!file || !isAuthenticated()) return;

      if (file.size > 5 * 1024 * 1024) {
        showMsg(t("prof.img_too_big"), "error");
        return;
      }

      const ext = file.name.split(".").pop();
      const filePath = `${authUser.id}/${Date.now()}.${ext}`;

      showMsg(t("prof.uploading"), "success");

      try {
        const { error: uploadError } = await supabaseClient.storage
          .from("avatars")
          .upload(filePath, file, { upsert: true, contentType: file.type });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabaseClient.storage
          .from("avatars")
          .getPublicUrl(filePath);

        const avatarUrl = urlData?.publicUrl;
        if (!avatarUrl) throw new Error(t("prof.no_public_url"));

        const { error: updateError } = await supabaseClient
          .from("profiles")
          .upsert({ id: authUser.id, avatar_url: avatarUrl, updated_at: new Date().toISOString() });
        if (updateError) throw updateError;

        const avatarImg = document.getElementById("profileAvatarImg");
        const avatarPlaceholder = document.getElementById("profileAvatarPlaceholder");
        avatarImg.src = avatarUrl;
        avatarImg.style.display = "block";
        if (avatarPlaceholder) avatarPlaceholder.style.display = "none";

        if (currentProfile) currentProfile.avatar_url = avatarUrl;
        updateSidebarProfile(currentProfile);
        showMsg(t("prof.avatar_ok"), "success");
      } catch (err) {
        console.error("Avatar upload error:", err);
        showMsg(err.message || t("prof.upload_error"), "error");
      }
    });
  }
});

// ─── Messages ─────────────────────────────────────────────────────────────

function showMsg(text, type) {
  const msg = document.getElementById("profileMessage");
  if (!msg) return;
  msg.textContent = text;
  msg.className = "profile-message " + type;
  msg.style.display = "block";
  if (type === "success") setTimeout(hideMsg, 4000);
}

function hideMsg() {
  const msg = document.getElementById("profileMessage");
  if (msg) msg.style.display = "none";
}

// ─── Cancel ───────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const cancelBtn = document.getElementById("profileCancelBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      hideMsg();
      if (currentProfile) populateProfileForm(currentProfile);
    });
  }
});

// ─── Auth Ready Helper ────────────────────────────────────────────────────

function ensureAuthReady() {
  return new Promise(resolve => {
    if (typeof authReady !== "undefined" && authReady) { resolve(); return; }
    const interval = setInterval(() => {
      if (typeof authReady !== "undefined" && authReady) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
    setTimeout(() => { clearInterval(interval); resolve(); }, 5000);
  });
}

// ─── Open Profile View ────────────────────────────────────────────────────

async function openProfile() {
  await ensureAuthReady();

  if (!isAuthenticated()) {
    protectRoute("profile");
    return;
  }
  const profile = await loadProfile();
  populateProfileForm(profile || {});
  hideMsg();
  if (typeof navigateToView === "function") {
    navigateToView("profile", {}, {});
  } else {
    mostrarVista("profile");
  }
}

// ─── Tamaño de cartas/deck (sliders 0-100 en Preferencias, solo localStorage) ───

function sizePx(v) { return Math.round(120 + v * 1.6); } // 0→120px, 50→200px, 100→280px

function applySize(v, save, cfg) {
  var val = parseInt(v, 10);
  if (isNaN(val)) val = 50;
  val = Math.max(0, Math.min(100, val));
  var px = sizePx(val);
  document.documentElement.style.setProperty(cfg.varName, px + "px");
  var slider = document.getElementById(cfg.sliderId);
  if (slider) slider.value = val;
  var hint = document.getElementById(cfg.hintId);
  if (hint) hint.textContent = t("prof.size_hint", { v: val, n: Math.max(2, Math.floor(1100 / px)) });
  if (save) { try { localStorage.setItem(cfg.storageKey, String(val)); } catch (e) {} }
  return val;
}

var CARD_SIZE_CFG = { varName: "--card-min-width", sliderId: "profileCardSize", hintId: "profileCardSizeVal", storageKey: "tutcg_card_min" };
var DECK_SIZE_CFG = { varName: "--deck-min-width", sliderId: "profileDeckSize", hintId: "profileDeckSizeVal", storageKey: "tutcg_deck_min" };

function applyCardSize(v, save) { return applySize(v, save, CARD_SIZE_CFG); }
function applyDeckSize(v, save) { return applySize(v, save, DECK_SIZE_CFG); }

// ─── Profile link handlers ────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const sidebarUser = document.getElementById("sidebarUser");
  if (sidebarUser) {
    sidebarUser.addEventListener("click", () => { openProfile(); });
  }

  const sidebarUserGear = document.getElementById("sidebarUserGear");
  if (sidebarUserGear) {
    sidebarUserGear.addEventListener("click", (e) => {
      e.stopPropagation();
      openProfile();
    });
  }

  onAuthChange((user) => {
    if (user) loadProfile().then(p => {
      if (p) updateSidebarProfile(p);
    });
  });
});
