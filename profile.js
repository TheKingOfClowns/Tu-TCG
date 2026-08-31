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
    other: "Otro"
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
    other: "Otro"
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

function sanitizeReviewComment(comment) {
  if (!comment) return "";
  return comment.replace(/https?:\/\/\S+/gi, "[link eliminado]").substring(0, 100);
}

function updateSidebarProfile(profile) {
  const sidebarUserName = document.getElementById("sidebarUserName");
  const sidebarUserPlan = document.getElementById("sidebarUserPlan");
  const sidebarUserAvatar = document.getElementById("sidebarUserAvatar");
  if (sidebarUserName) sidebarUserName.textContent = profile?.display_name || profile?.username || (authUser?.email ? authUser.email.split("@")[0] : "Usuario");
  if (sidebarUserPlan) sidebarUserPlan.textContent = "Premium";
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
    showMsg("Debes iniciar sesión para guardar", "error");
    return false;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Guardando…";
  hideMsg();

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
    contact_phone: document.getElementById("profileContactPhone")?.value || null,
    contact_wsp: document.getElementById("profileContactWsp")?.value || null,
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
    showMsg("Perfil actualizado correctamente", "success");
  } catch (err) {
    console.error("Profile save error:", err);
    if (err.message?.includes("profiles_username_key") || err.message?.includes("duplicate key")) {
      showMsg("Ese nombre de usuario ya está en uso. Elegí otro.", "error");
    } else {
      showMsg(err.message || "Error al guardar el perfil", "error");
    }
  }

  saveBtn.disabled = false;
  saveBtn.textContent = "Guardar cambios";
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
        showMsg("La imagen no debe superar 5 MB", "error");
        return;
      }

      const ext = file.name.split(".").pop();
      const filePath = `${authUser.id}/${Date.now()}.${ext}`;

      showMsg("Subiendo imagen…", "success");

      try {
        const { error: uploadError } = await supabaseClient.storage
          .from("avatars")
          .upload(filePath, file, { upsert: true, contentType: file.type });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabaseClient.storage
          .from("avatars")
          .getPublicUrl(filePath);

        const avatarUrl = urlData?.publicUrl;
        if (!avatarUrl) throw new Error("No se pudo obtener la URL pública");

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
        showMsg("Foto de perfil actualizada", "success");
      } catch (err) {
        console.error("Avatar upload error:", err);
        showMsg(err.message || "Error al subir la imagen", "error");
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
