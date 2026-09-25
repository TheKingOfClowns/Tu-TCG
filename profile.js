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

  const notifEl = document.getElementById("profileNotifySales");
  if (notifEl) notifEl.checked = (profile?.preferences?.notify_sales ?? profile?.preferences?.notifications) !== false;
  const notifLowEl = document.getElementById("profileNotifyLow");
  if (notifLowEl) notifLowEl.checked = (profile?.preferences?.notify_low_stock ?? profile?.preferences?.notifications) !== false;

  const tutEl = document.getElementById("profileShowTutorial");
  if (tutEl) {
    // ponytail: legacy checkbox booleano migra a modo (false = off)
    var prefs = profile?.preferences || {};
    tutEl.value = prefs.tutorial_mode || (prefs.show_tutorial === false ? "off" : "once");
  }

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
  renderPublicProfile(profile);

  updateSidebarProfile(profile);
  renderPlanBlock(profile);
}
// ponytail: cambio de idioma instantáneo (Guardar lo persiste en Supabase)
document.getElementById("profileLanguage")?.addEventListener("change", function(e) {
  if (typeof setLang === "function") setLang(e.target.value);
  renderPublicProfile(currentProfile);
});

function publicProfileUrl(raw) {
  try {
    const url = new URL(raw);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function renderPublicProfile(profile) {
  const name = document.getElementById("profileShowcaseTitle");
  const username = document.getElementById("profileShowcaseUsername");
  const bio = document.getElementById("profileShowcaseBio");
  const location = document.getElementById("profileShowcaseLocation");
  const links = document.getElementById("profileShowcaseLinks");
  if (!name || !username || !bio || !location || !links) return;

  const handle = (profile?.username || "").trim();
  name.textContent = (profile?.display_name || handle || t("prof.fallback_user")).trim();
  username.textContent = handle ? `@${handle.replace(/^@/, "")}` : "";
  username.hidden = !handle || name.textContent === handle;

  const description = (profile?.bio || "").trim();
  bio.textContent = description || t("prof.bio_empty");
  bio.classList.toggle("is-empty", !description);

  const place = [profile?.city, profile?.country].map(value => (value || "").trim()).filter(Boolean);
  location.textContent = place.join(" · ");
  location.hidden = !place.length;

  links.replaceChildren();
  const addLink = (label, href) => {
    const anchor = document.createElement("a");
    anchor.textContent = label;
    anchor.href = href;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    links.appendChild(anchor);
  };
  const phone = (profile?.contact_phone || "").trim();
  if (phone) {
    const phoneTag = document.createElement("span");
    phoneTag.textContent = `${t("prof.phone")}: ${phone}`;
    links.appendChild(phoneTag);
  }
  const whatsapp = publicProfileUrl(profile?.contact_wsp || "");
  if (whatsapp && ["wa.me", "web.whatsapp.com", "api.whatsapp.com"].includes(new URL(whatsapp).hostname)) {
    addLink("WhatsApp ↗", whatsapp);
  }
  const platforms = { instagram: "Instagram", twitter: "X", tiktok: "TikTok", youtube: "YouTube", discord: "Discord" };
  (Array.isArray(profile?.social_links) ? profile.social_links : []).forEach(link => {
    const href = publicProfileUrl(link?.url || "");
    if (href) addLink(platforms[link.platform] || t("prof.platform_other"), href);
  });
  links.hidden = !links.childElementCount;
}

// ─── Crew ─────────────────────────────────────────────────────────────

async function renderPlanBlock(profile) {
  const box = document.getElementById("planBlock");
  if (!box) return;
  const plan = {
    level: profile?.plan_level || 0,
    crew: profile?.crew || null,
    crew_custom: profile?.preferences?.crew_custom || null,
    isAdmin: !!profile?.is_admin
  };
  const label = (typeof tierLabel === "function") ? tierLabel(plan) : t("prof.tier_nakama");
  const lim = ((typeof PLAN_LIMITS !== "undefined" && PLAN_LIMITS[plan.level]) || { spaces: 5, cards: 150 });
  const crew = (typeof crewById === "function") ? crewById(plan.crew) : null;
  let html = '<p style="font-size:var(--text-sm);margin-bottom:var(--space-2)">' + t("prof.plan_label") + ' <strong style="color:' +
    (crew ? crew.color : "var(--accent)") + '">' + label + "</strong>" +
    (plan.isAdmin ? ' <span class="binder-cover-badge sale">🛡️ ' + t("seller.mod_badge") + "</span>" : "") + "</p>";
  if (typeof getMySpaceUsage === "function") {
    const used = await getMySpaceUsage();
    html += '<p class="profile-field-hint" style="margin-bottom:var(--space-3)">' + t("prof.usage", { used: used, spaces: (plan.isAdmin ? "∞" : lim.spaces), cards: (lim.cards == null ? t("prof.cards_unlimited") : t("prof.cards_upto", { n: lim.cards })) }) + "</p>";
  }
  // ponytail: todos eligen (10 + custom tripulación/personaje); techo único 30/1000
  const crews = (typeof CREWS !== "undefined") ? CREWS : [];
  html += '<p class="profile-field-hint" style="margin-bottom:var(--space-2)">' + t("prof.crew_title") + '</p><div class="crew-grid" id="crewGrid">' +
    crews.map(function(c) {
      return '<button type="button" class="crew-btn' + (plan.crew === c.id ? " active" : "") + '" data-crew="' + c.id + '"' +
        ' style="--crew-color:' + c.color + '">' + c.name + "</button>";
    }).join("") +
    '<button type="button" class="crew-btn' + (plan.crew === "custom" ? " active" : "") + '" data-crew="custom"' +
    ' style="--crew-color:var(--accent)">✏️ ' + t("prof.crew_custom") + "</button></div>" +
    '<div style="display:flex;gap:var(--space-2);margin-top:var(--space-2)">' +
    '<input type="text" id="crewCustomInput" maxlength="24" placeholder="' + t("prof.crew_custom_ph") + '" value="' + (plan.crew === "custom" && plan.crew_custom ? plan.crew_custom : "") + '"' +
    ' style="flex:1;padding:var(--space-2);background:var(--bg-secondary);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);outline:none">' +
    '<button type="button" class="btn-ghost btn-sm" id="crewCustomSave">' + t("prof.save") + "</button></div>";
  box.innerHTML = html;
  box.querySelectorAll(".crew-btn").forEach(function(btn) {
    btn.addEventListener("click", function() { setCrew(btn.getAttribute("data-crew")); });
  });
  document.getElementById("crewCustomSave")?.addEventListener("click", function() { setCrew("custom"); });
  if (plan.isAdmin) renderModQueue(box);
}
// ponytail: cola de reportes solo-mods, dentro del perfil (sin ruta nueva)
async function renderModQueue(box) {
  const wrap = document.createElement("div");
  wrap.id = "modQueue";
  wrap.innerHTML = `<p class="profile-field-hint" style="margin:var(--space-4) 0 var(--space-2)">🛡️ ${t("mod.title")}</p><div id="modQueueList"><p class="profile-field-hint">${t("seller.loading")}</p></div>`;
  box.appendChild(wrap);
  const list = wrap.querySelector("#modQueueList");
  const esc = function(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
  try {
    const { data } = await supabaseClient.from("reports")
      .select("id, reason, created_at, reporter_id, reviews!inner(id, rating, comment, reviewed_id)")
      .eq("status", "pending").order("created_at", { ascending: false }).limit(20);
    if (!data || !data.length) { list.innerHTML = `<p class="profile-field-hint">${t("mod.empty")}</p>`; return; }
    list.innerHTML = data.map(function(r) {
      const rev = r.reviews || {};
      return `<div data-mod="${r.id}" style="padding:8px 0;border-bottom:1px solid var(--border-default)">
        <div style="font-size:13px">★ ${rev.rating} · ${esc(rev.comment || "")}</div>
        <div style="font-size:11px;color:var(--text-muted)">${t("mod.reason")}: ${esc(r.reason || "")}</div>
        <div style="display:flex;gap:6px;margin-top:6px">
          <button class="btn-ghost btn-xs" data-dismiss>${t("mod.dismiss")}</button>
          <button class="btn-danger btn-xs" data-del>${t("mod.delete_review")}</button>
        </div></div>`;
    }).join("");
    list.querySelectorAll("[data-mod]").forEach(function(el) {
      const rid = el.getAttribute("data-mod");
      el.querySelector("[data-dismiss]").addEventListener("click", async function() {
        await supabaseClient.rpc("mod_resolve_report", { p_report_id: rid, p_action: "dismiss" });
        renderModQueueRefresh();
      });
      el.querySelector("[data-del]").addEventListener("click", async function() {
        if (!confirm(t("mod.delete_confirm"))) return;
        await supabaseClient.rpc("mod_resolve_report", { p_report_id: rid, p_action: "delete" });
        renderModQueueRefresh();
      });
    });
  } catch (e) { list.innerHTML = `<p class="profile-field-hint">${t("mod.error")}</p>`; }
}
async function renderModQueueRefresh() {
  const box = document.getElementById("planBlock");
  document.getElementById("modQueue")?.remove();
  if (box) renderModQueue(box);
}

// ponytail: filtro cliente (servidor queda abierto por API directa; trigger después si hace falta)
var CREW_BLOCKLIST = ["puta","puto","mierda","carajo","pelotudo","pelotuda","boludo","boluda","forro","forra","choto","chota","verga","pija","concha","teta","teto","culo","orto","cagar","cagon","cagona","garca","mogolico","mogolica","retrasado","retrasada","negro de mierda","villero","villera","trola","trolita","gato","gata","putita","zorra","perra","cabrón","cabron","hijo de puta","la concha","fuck","shit","bitch","whore","slut","bastard","asshole","dick","pussy","cunt","faggot","nigger","nigga","retard","idiot","hitler","nazi","porno","xxx","viagra","casino"];
function isValidCrewName(name) {
  if (!name) return false;
  var n = String(name).trim().replace(/\s+/g, " ");
  if (n.length < 2 || n.length > 24) return false;
  if (!/^[a-záéíóúñü0-9 ]+$/i.test(n)) return false;
  var low = " " + n.toLowerCase() + " ";
  for (var i = 0; i < CREW_BLOCKLIST.length; i++) {
    if (low.indexOf(CREW_BLOCKLIST[i]) !== -1) return false;
  }
  return true;
}

async function setCrew(crewId) {
  if (!isAuthenticated()) return;
  var updates = { crew: crewId };
  if (crewId === "custom") {
    var raw = "";
    try { raw = document.getElementById("crewCustomInput")?.value || ""; } catch (e) {}
    var name = String(raw).trim().replace(/\s+/g, " ");
    if (!isValidCrewName(name)) {
      if (typeof showToast === "function") showToast(t("prof.crew_bad"), "error");
      try { document.getElementById("crewCustomInput").style.borderColor = "var(--danger)"; setTimeout(function() { document.getElementById("crewCustomInput").style.borderColor = ""; }, 1500); } catch (e) {}
      return;
    }
    updates.preferences = Object.assign({}, (currentProfile?.preferences || {}), { crew_custom: name });
  }
  try {
    const { error } = await supabaseClient.from("profiles").update(updates).eq("id", authUser.id);
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
      ? tierLabel({ level: profile?.plan_level || 0, crew: profile?.crew || null, crew_custom: profile?.preferences?.crew_custom || null, isAdmin: !!profile?.is_admin })
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

  const preferences = Object.assign({}, (typeof currentProfile !== "undefined" && currentProfile?.preferences) || {}, {
    language: document.getElementById("profileLanguage")?.value || "es",
    currency: document.getElementById("profileCurrency")?.value || "USD",
    notify_sales: document.getElementById("profileNotifySales")?.checked ?? true,
    notify_low_stock: document.getElementById("profileNotifyLow")?.checked ?? true,
    tutorial_mode: document.getElementById("profileShowTutorial")?.value || "once"
  });

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
    renderPublicProfile(result);
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
  if (avatarWrap) avatarWrap.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      avatarInput?.click();
    }
  });
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
