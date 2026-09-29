// ─── Social MVP: friendships + direct messages ────────────────────────────
// Postgres is the source of truth. Realtime only invalidates the active chat;
// every event is followed by a scoped refetch so reconnects cannot lose data.
var Social = {
  tab: "chats",
  loaded: false,
  loading: false,
  error: null,
  friendships: [],
  blocks: [],
  conversations: [],
  reads: [],
  profiles: new Map(),
  searchQuery: "",
  searchResults: [],
  searchTimer: null,
  activeId: null,
  messages: [],
  channel: null,
  refreshTimer: null,
  renderToken: 0
};

function socialEsc(value) {
  if (typeof escapeHtml === "function") return escapeHtml(value);
  return String(value == null ? "" : value).replace(/[&<>"']/g, function(ch) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
}

function socialSafeUrl(value) {
  if (!String(value || "").trim()) return "";
  try {
    var url = new URL(String(value || ""), window.location.origin);
    return (url.protocol === "https:" || url.protocol === "http:") ? url.href : "";
  } catch (e) { return ""; }
}

function socialName(profile) {
  return String((profile && (profile.display_name || profile.username)) || t("core.fallback_user")).trim() || t("core.fallback_user");
}

function socialAvatar(profile, className) {
  var name = socialName(profile);
  var src = socialSafeUrl(profile && profile.avatar_url);
  return '<span class="' + (className || "social-avatar") + '">' +
    (src ? '<img src="' + socialEsc(src) + '" alt="">' : '<span aria-hidden="true">' + socialEsc(name.charAt(0).toUpperCase() || "?") + '</span>') +
    '</span>';
}

function socialPair(otherId) {
  var mine = authUser && authUser.id;
  if (!mine || !otherId) return null;
  return mine < otherId ? { user_a: mine, user_b: otherId } : { user_a: otherId, user_b: mine };
}

function socialOtherId(row) {
  return !row || !authUser ? null : (row.user_a === authUser.id ? row.user_b : row.user_a);
}

function socialProfile(id) {
  return Social.profiles.get(id) || { id: id, username: "", display_name: t("core.fallback_user"), avatar_url: "" };
}

function socialLocale() { return typeof getLang === "function" && getLang() === "en" ? "en-US" : "es-AR"; }

function socialShortDate(value) {
  if (!value) return "";
  var date = new Date(value);
  if (isNaN(date.getTime())) return "";
  var now = new Date();
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString(socialLocale(), { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString(socialLocale(), { day: "2-digit", month: "short" });
}

function socialLongDate(value) {
  if (!value) return "";
  var date = new Date(value);
  return isNaN(date.getTime()) ? "" : date.toLocaleDateString(socialLocale(), { day: "numeric", month: "short", year: "numeric" });
}

function socialShowError(error, fallbackKey) {
  if (error) console.error("Social error:", error);
  if (typeof showToast === "function") showToast(t(fallbackKey || "social.action_error"), "error");
}

function socialMissingSchema(error) {
  var code = String(error && error.code || "");
  var msg = String(error && error.message || "").toLowerCase();
  return code === "PGRST205" || code === "42P01" || msg.indexOf("social_friendships") !== -1 || msg.indexOf("social_conversations") !== -1;
}

async function socialFetchProfiles(ids) {
  var unique = Array.from(new Set((ids || []).filter(Boolean)));
  if (!unique.length) return;
  var result = await supabaseClient.from("profiles")
    .select("id,username,display_name,avatar_url")
    .in("id", unique);
  if (result.error) throw result.error;
  (result.data || []).forEach(function(profile) { Social.profiles.set(profile.id, profile); });
}

async function socialLoadState(force) {
  if (!authUser || typeof supabaseClient === "undefined") return;
  if (Social.loading && !force) return;
  Social.loading = true;
  Social.error = null;
  var uid = authUser.id;
  try {
    var results = await Promise.all([
      supabaseClient.from("social_friendships").select("id,user_a,user_b,requested_by,status,created_at,updated_at").or("user_a.eq." + uid + ",user_b.eq." + uid).order("updated_at", { ascending: false }),
      supabaseClient.from("social_blocks").select("blocker_id,blocked_id,created_at").or("blocker_id.eq." + uid + ",blocked_id.eq." + uid),
      supabaseClient.from("social_conversations").select("id,user_a,user_b,last_message_at,last_message_preview,last_message_sender_id,created_at").or("user_a.eq." + uid + ",user_b.eq." + uid).order("last_message_at", { ascending: false, nullsFirst: false }),
      supabaseClient.from("social_conversation_reads").select("conversation_id,last_read_at").eq("user_id", uid)
    ]);
    var failed = results.find(function(result) { return result.error; });
    if (failed) throw failed.error;
    Social.friendships = results[0].data || [];
    Social.blocks = results[1].data || [];
    Social.conversations = results[2].data || [];
    Social.reads = results[3].data || [];
    var profileIds = [];
    Social.friendships.forEach(function(row) { profileIds.push(socialOtherId(row)); });
    Social.conversations.forEach(function(row) { profileIds.push(socialOtherId(row)); });
    Social.blocks.forEach(function(row) { profileIds.push(row.blocker_id === uid ? row.blocked_id : row.blocker_id); });
    await socialFetchProfiles(profileIds);
    Social.loaded = true;
  } catch (error) {
    Social.error = error;
    Social.loaded = false;
  } finally {
    Social.loading = false;
    socialUpdateBadges();
  }
}

function socialIncomingRequests() {
  if (!authUser) return [];
  return Social.friendships.filter(function(row) { return row.status === "pending" && row.requested_by !== authUser.id; });
}

function socialReadMap() {
  var map = new Map();
  Social.reads.forEach(function(row) { map.set(row.conversation_id, row.last_read_at); });
  return map;
}

function socialIsUnread(conversation, reads) {
  if (!conversation.last_message_at || conversation.last_message_sender_id === (authUser && authUser.id)) return false;
  var readAt = reads.get(conversation.id);
  return !readAt || new Date(conversation.last_message_at) > new Date(readAt);
}

function socialUpdateBadges() {
  var reads = socialReadMap();
  var unread = Social.conversations.filter(function(row) { return socialIsUnread(row, reads); }).length;
  var incoming = socialIncomingRequests().length;
  var total = unread + incoming;
  [document.getElementById("socialTopBadge"), document.getElementById("sidebarSocialBadge")].forEach(function(badge) {
    if (!badge) return;
    badge.style.display = total ? "" : "none";
    badge.textContent = total > 99 ? "99+" : String(total);
  });
  var requestBadge = document.getElementById("socialRequestBadge");
  if (requestBadge) {
    requestBadge.style.display = incoming ? "" : "none";
    requestBadge.textContent = String(incoming);
  }
}

function socialEmpty(titleKey, bodyKey, actionHtml) {
  return '<div class="social-empty"><h2>' + socialEsc(t(titleKey)) + '</h2><p>' + socialEsc(t(bodyKey)) + '</p>' + (actionHtml || "") + '</div>';
}

function socialAuthPrompt() {
  return socialEmpty("social.auth_required", "social.subtitle", '<button class="btn-primary" type="button" data-social-action="signin">' + socialEsc(t("social.signin")) + '</button>');
}

function socialRenderError() {
  var missing = socialMissingSchema(Social.error);
  return '<div class="social-empty social-error-state"><h2>' + socialEsc(t(missing ? "social.unavailable" : "social.load_error")) + '</h2><p>' + socialEsc(t(missing ? "social.unavailable_body" : "social.load_error")) + '</p><button class="btn-ghost" type="button" data-social-action="retry">' + socialEsc(t("social.retry")) + '</button></div>';
}

function socialRenderChats() {
  var reads = socialReadMap();
  if (!Social.conversations.length) return socialEmpty("social.no_chats", "social.no_chats_body");
  return '<div class="social-list">' + Social.conversations.map(function(row) {
    var other = socialProfile(socialOtherId(row));
    var unread = socialIsUnread(row, reads);
    var preview = row.last_message_preview || t("social.start_chat");
    return '<button type="button" class="social-list-row social-conversation-row' + (Social.activeId === row.id ? ' active' : '') + (unread ? ' unread' : '') + '" data-social-conversation="' + socialEsc(row.id) + '">' +
      socialAvatar(other) + '<span class="social-row-copy"><span class="social-row-head"><strong>' + socialEsc(socialName(other)) + '</strong><time>' + socialEsc(socialShortDate(row.last_message_at || row.created_at)) + '</time></span>' +
      '<span class="social-row-preview">' + (row.last_message_sender_id === (authUser && authUser.id) ? socialEsc(t("social.you") + ": ") : "") + socialEsc(preview) + '</span></span>' +
      (unread ? '<span class="social-unread-dot" aria-label="' + socialEsc(t("social.new_messages")) + '"></span>' : '') + '</button>';
  }).join("") + '</div>';
}

function socialRelationFor(userId) {
  return Social.friendships.find(function(row) { return socialOtherId(row) === userId; }) || null;
}

function socialBlockedByMe(userId) {
  return Social.blocks.some(function(row) { return row.blocker_id === (authUser && authUser.id) && row.blocked_id === userId; });
}

function socialBlockedEitherWay(userId) {
  return Social.blocks.some(function(row) {
    return (row.blocker_id === (authUser && authUser.id) && row.blocked_id === userId) ||
      (row.blocked_id === (authUser && authUser.id) && row.blocker_id === userId);
  });
}

function socialUserActions(userId, compact) {
  var relation = socialRelationFor(userId);
  var blocked = socialBlockedByMe(userId);
  var cls = compact ? "btn-xs" : "btn-sm";
  if (blocked) return '<button type="button" class="btn-ghost ' + cls + '" data-social-action="unblock" data-user="' + socialEsc(userId) + '">' + socialEsc(t("social.unblock")) + '</button>';
  if (socialBlockedEitherWay(userId)) return '<span class="social-status">' + socialEsc(t("social.blocked_by_you")) + '</span>';
  if (!relation) return '<button type="button" class="btn-primary ' + cls + '" data-social-action="request" data-user="' + socialEsc(userId) + '">' + socialEsc(t("social.request")) + '</button>';
  if (relation.status === "accepted") {
    return '<button type="button" class="btn-primary ' + cls + '" data-social-action="message" data-user="' + socialEsc(userId) + '">' + socialEsc(t("social.message")) + '</button>' +
      '<button type="button" class="btn-ghost ' + cls + '" data-social-action="remove" data-user="' + socialEsc(userId) + '" data-relation="' + socialEsc(relation.id) + '">' + socialEsc(t("social.remove_friend")) + '</button>';
  }
  if (relation.requested_by === (authUser && authUser.id)) {
    return '<button type="button" class="btn-ghost ' + cls + '" data-social-action="cancel" data-user="' + socialEsc(userId) + '" data-relation="' + socialEsc(relation.id) + '">' + socialEsc(t("social.cancel_request")) + '</button>';
  }
  return '<button type="button" class="btn-primary ' + cls + '" data-social-action="accept" data-user="' + socialEsc(userId) + '" data-relation="' + socialEsc(relation.id) + '">' + socialEsc(t("social.accept")) + '</button>' +
    '<button type="button" class="btn-ghost ' + cls + '" data-social-action="reject" data-user="' + socialEsc(userId) + '" data-relation="' + socialEsc(relation.id) + '">' + socialEsc(t("social.reject")) + '</button>';
}

function socialProfileRow(profile, note, actions) {
  return '<div class="social-list-row social-person-row">' + socialAvatar(profile) + '<span class="social-row-copy"><strong>' + socialEsc(socialName(profile)) + '</strong>' +
    (profile.username ? '<span class="social-handle">@' + socialEsc(String(profile.username).replace(/^@/, "")) + '</span>' : '') +
    (note ? '<span class="social-row-preview">' + socialEsc(note) + '</span>' : '') + '</span><span class="social-row-actions">' + actions + '</span></div>';
}

function socialRenderFriends() {
  var accepted = Social.friendships.filter(function(row) { return row.status === "accepted"; });
  var results = Social.searchResults;
  var html = '<div class="social-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><input id="socialUserSearch" type="search" autocomplete="off" maxlength="40" value="' + socialEsc(Social.searchQuery) + '" placeholder="' + socialEsc(t("social.search_ph")) + '"></div>';
  if (Social.searchQuery.length < 2) {
    html += '<p class="social-search-hint">' + socialEsc(t("social.search_hint")) + '</p>';
  } else {
    html += '<h2 class="social-list-title">' + socialEsc(t("social.search_results")) + '</h2>';
    html += results.length ? '<div class="social-list social-search-results">' + results.map(function(profile) {
      return socialProfileRow(profile, "", socialUserActions(profile.id, true));
    }).join("") + '</div>' : '<p class="social-search-hint">' + socialEsc(t("social.search_empty")) + '</p>';
  }
  html += '<h2 class="social-list-title">' + socialEsc(t("social.friends")) + '</h2>';
  if (!accepted.length) return html + socialEmpty("social.no_friends", "social.no_friends_body");
  return html + '<div class="social-list">' + accepted.map(function(row) {
    var profile = socialProfile(socialOtherId(row));
    return socialProfileRow(profile, t("social.friend_since", { date: socialLongDate(row.updated_at || row.created_at) }), socialUserActions(profile.id, true));
  }).join("") + '</div>';
}

function socialRenderRequests() {
  var pending = Social.friendships.filter(function(row) { return row.status === "pending"; });
  if (!pending.length) return socialEmpty("social.no_requests", "social.no_requests");
  return '<div class="social-list">' + pending.map(function(row) {
    var profile = socialProfile(socialOtherId(row));
    var incoming = row.requested_by !== (authUser && authUser.id);
    return socialProfileRow(profile, t(incoming ? "social.incoming" : "social.outgoing"), socialUserActions(profile.id, true));
  }).join("") + '</div>';
}

function socialRenderRail() {
  var body = document.getElementById("socialRailBody");
  if (!body) return;
  document.querySelectorAll("[data-social-tab]").forEach(function(btn) {
    var active = btn.getAttribute("data-social-tab") === Social.tab;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", String(active));
  });
  socialUpdateBadges();
  if (Social.loading && !Social.loaded) { body.innerHTML = '<div class="social-loading">' + socialEsc(t("social.loading")) + '</div>'; return; }
  if (Social.error) { body.innerHTML = socialRenderError(); return; }
  if (Social.tab === "friends") body.innerHTML = socialRenderFriends();
  else if (Social.tab === "requests") body.innerHTML = socialRenderRequests();
  else body.innerHTML = socialRenderChats();
}

function socialRenderStageEmpty() {
  var stage = document.getElementById("socialStage");
  if (stage) stage.innerHTML = '<div class="social-stage-empty"><div><h2>' + socialEsc(t("social.pick_chat")) + '</h2><p>' + socialEsc(t("social.pick_chat_body")) + '</p></div></div>';
}

function socialMessageDay(value) {
  var date = new Date(value);
  var today = new Date();
  var yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return t("social.today");
  if (date.toDateString() === yesterday.toDateString()) return t("social.yesterday");
  return date.toLocaleDateString(socialLocale(), { day: "numeric", month: "long", year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
}

function socialRenderMessages(conversation) {
  var stage = document.getElementById("socialStage");
  if (!stage) return;
  var otherId = socialOtherId(conversation);
  var other = socialProfile(otherId);
  var lastDay = "";
  var rows = Social.messages.map(function(message) {
    var day = socialMessageDay(message.created_at);
    var separator = day !== lastDay ? '<div class="social-day-separator"><span>' + socialEsc(day) + '</span></div>' : "";
    lastDay = day;
    var own = message.sender_id === (authUser && authUser.id);
    return separator + '<div class="social-message-row ' + (own ? 'own' : 'other') + '"><div class="social-message-bubble"><p>' + socialEsc(message.body).replace(/\n/g, "<br>") + '</p><time datetime="' + socialEsc(message.created_at) + '">' + socialEsc(new Date(message.created_at).toLocaleTimeString(socialLocale(), { hour: "2-digit", minute: "2-digit" })) + '</time></div></div>';
  }).join("");
  stage.innerHTML = '<section class="social-chat" aria-labelledby="socialChatTitle">' +
    '<header class="social-chat-header"><button type="button" class="social-chat-back" data-social-action="back" aria-label="' + socialEsc(t("social.back")) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>' +
    socialAvatar(other, "social-avatar social-chat-avatar") + '<button type="button" class="social-chat-person" data-social-action="profile" data-user="' + socialEsc(otherId) + '"><strong id="socialChatTitle">' + socialEsc(socialName(other)) + '</strong><span>' + socialEsc(t("social.online_note")) + '</span></button>' +
    '<button type="button" class="social-more-btn" data-social-action="block" data-user="' + socialEsc(otherId) + '" aria-label="' + socialEsc(t("social.block")) + '" title="' + socialEsc(t("social.block")) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg></button></header>' +
    '<div class="social-messages" id="socialMessages" role="log" aria-live="polite">' + rows + '</div>' +
    '<form class="social-composer" id="socialComposer"><label class="sr-only" for="socialMessageInput">' + socialEsc(t("social.message_ph")) + '</label><textarea id="socialMessageInput" rows="1" maxlength="1000" placeholder="' + socialEsc(t("social.message_ph")) + '" required></textarea><button type="submit" class="social-send-btn" aria-label="' + socialEsc(t("social.send")) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button></form>' +
    '</section>';
  requestAnimationFrame(function() {
    var list = document.getElementById("socialMessages");
    if (list) list.scrollTop = list.scrollHeight;
    var input = document.getElementById("socialMessageInput");
    if (input && window.innerWidth >= 768) input.focus();
  });
}

async function socialMarkRead(conversationId) {
  if (!authUser) return;
  var existing = Social.reads.find(function(row) { return row.conversation_id === conversationId; });
  var now = new Date().toISOString();
  var result;
  if (existing) {
    result = await supabaseClient.from("social_conversation_reads").update({ last_read_at: now }).eq("conversation_id", conversationId).eq("user_id", authUser.id);
    if (!result.error) existing.last_read_at = now;
  } else {
    result = await supabaseClient.from("social_conversation_reads").insert({ conversation_id: conversationId, user_id: authUser.id, last_read_at: now });
    if (!result.error) Social.reads.push({ conversation_id: conversationId, last_read_at: now });
  }
  socialUpdateBadges();
}

async function socialLoadMessages(conversationId) {
  var conversation = Social.conversations.find(function(row) { return row.id === conversationId; });
  if (!conversation) { Social.activeId = null; socialRenderStageEmpty(); return; }
  var result = await supabaseClient.from("social_messages")
    .select("id,conversation_id,sender_id,body,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(80);
  if (result.error) {
    socialShowError(result.error, "social.load_error");
    var stage = document.getElementById("socialStage");
    if (stage) stage.innerHTML = '<div class="social-empty social-error-state"><h2>' + socialEsc(t("social.load_error")) + '</h2><p>' + socialEsc(t("social.action_error")) + '</p><button class="btn-ghost" type="button" data-social-action="retry-chat">' + socialEsc(t("social.retry")) + '</button></div>';
    return;
  }
  Social.messages = (result.data || []).reverse();
  socialRenderMessages(conversation);
  await socialMarkRead(conversationId);
}

async function socialSubscribe(conversationId) {
  if (Social.channel) {
    await supabaseClient.removeChannel(Social.channel);
    Social.channel = null;
  }
  if (!conversationId || !authSession) return;
  try { await supabaseClient.realtime.setAuth(authSession.access_token); } catch (e) {}
  Social.channel = supabaseClient.channel("conversation:" + conversationId, { config: { private: true } })
    .on("broadcast", { event: "INSERT" }, async function() {
      if (Social.activeId !== conversationId) return;
      await socialLoadMessages(conversationId);
      await socialLoadState(true);
      socialRenderRail();
    })
    .subscribe(function(status, error) {
      if (error) console.error("Social Realtime error:", error);
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setTimeout(function() {
        if (Social.activeId === conversationId) socialLoadMessages(conversationId);
      }, 1500);
    });
}

async function socialOpenConversation(conversationId, updateRoute) {
  if (!conversationId) return;
  Social.activeId = conversationId;
  window._socialConversationId = conversationId;
  document.getElementById("socialShell")?.classList.add("is-chat-open");
  socialRenderRail();
  var stage = document.getElementById("socialStage");
  if (stage) stage.innerHTML = '<div class="social-loading">' + socialEsc(t("social.loading")) + '</div>';
  if (updateRoute !== false && typeof navigateToView === "function") {
    navigateToView("messages", { id: conversationId }, {});
    return;
  }
  await socialLoadMessages(conversationId);
  await socialSubscribe(conversationId);
}

async function socialOpenUser(userId) {
  if (!authUser) { if (typeof showAuthModal === "function") showAuthModal("login"); return; }
  if (!userId || userId === authUser.id) return;
  if (!Social.loaded) await socialLoadState(true);
  var conversation = Social.conversations.find(function(row) { return socialOtherId(row) === userId; });
  if (!conversation) {
    var pair = socialPair(userId);
    var inserted = await supabaseClient.from("social_conversations").insert(pair).select("id,user_a,user_b,last_message_at,last_message_preview,last_message_sender_id,created_at").single();
    if (inserted.error && inserted.error.code === "23505") {
      var existing = await supabaseClient.from("social_conversations").select("id,user_a,user_b,last_message_at,last_message_preview,last_message_sender_id,created_at").eq("user_a", pair.user_a).eq("user_b", pair.user_b).single();
      if (existing.error) { socialShowError(existing.error); return; }
      conversation = existing.data;
    } else if (inserted.error) { socialShowError(inserted.error); return; }
    else conversation = inserted.data;
    Social.conversations.unshift(conversation);
    await socialFetchProfiles([userId]);
  }
  Social.tab = "chats";
  if (typeof navigateToView === "function") navigateToView("messages", { id: conversation.id }, {});
}

async function socialSearchUsers(query) {
  Social.searchQuery = String(query || "").trim();
  if (Social.searchQuery.length < 2 || !authUser) { Social.searchResults = []; socialRenderRail(); return; }
  var pattern = "%" + Social.searchQuery + "%";
  var results = await Promise.all([
    supabaseClient.from("profiles").select("id,username,display_name,avatar_url").ilike("username", pattern).limit(10),
    supabaseClient.from("profiles").select("id,username,display_name,avatar_url").ilike("display_name", pattern).limit(10)
  ]);
  var failed = results.find(function(result) { return result.error; });
  if (failed) { socialShowError(failed.error, "social.load_error"); return; }
  var merged = new Map();
  results.forEach(function(result) { (result.data || []).forEach(function(profile) { if (profile.id !== authUser.id) merged.set(profile.id, profile); }); });
  Social.searchResults = Array.from(merged.values()).slice(0, 12);
  Social.searchResults.forEach(function(profile) { Social.profiles.set(profile.id, profile); });
  socialRenderRail();
  var input = document.getElementById("socialUserSearch");
  if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
}

async function socialRefreshView() {
  await socialLoadState(true);
  socialRenderRail();
  if (Social.activeId) await socialLoadMessages(Social.activeId);
  else socialRenderStageEmpty();
}

async function socialRenderView(requestedId) {
  var token = ++Social.renderToken;
  var rail = document.getElementById("socialRailBody");
  var stage = document.getElementById("socialStage");
  if (!rail || !stage) return;
  if (!authReady) {
    rail.innerHTML = '<div class="social-loading">' + socialEsc(t("social.loading")) + '</div>';
    stage.innerHTML = '<div class="social-stage-empty"></div>';
    return;
  }
  if (!authUser) {
    rail.innerHTML = socialAuthPrompt();
    stage.innerHTML = '<div class="social-stage-empty"></div>';
    return;
  }
  if (!Social.loaded) {
    rail.innerHTML = '<div class="social-loading">' + socialEsc(t("social.loading")) + '</div>';
    await socialLoadState(true);
  }
  if (token !== Social.renderToken) return;
  socialRenderRail();
  var targetId = requestedId || window._socialConversationId || Social.activeId;
  if (targetId && Social.conversations.some(function(row) { return row.id === targetId; })) await socialOpenConversation(targetId, false);
  else {
    Social.activeId = null;
    window._socialConversationId = null;
    document.getElementById("socialShell")?.classList.remove("is-chat-open");
    socialRenderStageEmpty();
  }
}

async function socialMutate(action, userId, relationId) {
  if (!authUser) { if (typeof showAuthModal === "function") showAuthModal("login"); return; }
  var result = null;
  if (action === "request") {
    var pair = socialPair(userId);
    result = await supabaseClient.from("social_friendships").insert({ user_a: pair.user_a, user_b: pair.user_b, requested_by: authUser.id, status: "pending" });
  } else if (action === "accept") {
    result = await supabaseClient.from("social_friendships").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", relationId);
  } else if (action === "reject" || action === "cancel" || action === "remove") {
    result = await supabaseClient.from("social_friendships").delete().eq("id", relationId);
  } else if (action === "block") {
    result = await supabaseClient.from("social_blocks").insert({ blocker_id: authUser.id, blocked_id: userId });
  } else if (action === "unblock") {
    result = await supabaseClient.from("social_blocks").delete().eq("blocker_id", authUser.id).eq("blocked_id", userId);
  }
  if (!result || result.error) { socialShowError(result && result.error); return; }
  if (typeof showToast === "function") {
    var key = action === "request" ? "social.request_ok" : action === "accept" ? "social.accepted" : action === "block" ? "social.blocked" : "social.updated";
    showToast(t(key), "success");
  }
  if (action === "block" && Social.activeId) {
    Social.activeId = null;
    window._socialConversationId = null;
    if (Social.channel) { await supabaseClient.removeChannel(Social.channel); Social.channel = null; }
    if (window.location.pathname.indexOf("/messages/") === 0 && typeof navigateToView === "function") navigateToView("messages", {}, {});
  }
  await socialLoadState(true);
  socialRenderRail();
  if (Social.activeId) await socialLoadMessages(Social.activeId); else socialRenderStageEmpty();
  if (window._sellerId === userId) socialRenderSellerActions(userId);
}

function socialConfirmMutation(action, userId, relationId) {
  var profile = socialProfile(userId);
  var key = action === "block" ? "social.block_confirm" : "social.remove_confirm";
  if (typeof showConfirmModal === "function") {
    showConfirmModal(t(key, { name: socialName(profile) }), function() { socialMutate(action, userId, relationId); });
  } else socialMutate(action, userId, relationId);
}

async function socialHandleAction(button) {
  var action = button.getAttribute("data-social-action");
  var userId = button.getAttribute("data-user");
  var relationId = button.getAttribute("data-relation");
  if (action === "signin") { if (typeof showAuthModal === "function") showAuthModal("login"); return; }
  if (action === "retry") { Social.loaded = false; await socialRenderView(Social.activeId); return; }
  if (action === "retry-chat") {
    var stage = document.getElementById("socialStage");
    if (stage) stage.innerHTML = '<div class="social-loading">' + socialEsc(t("social.loading")) + '</div>';
    await socialLoadMessages(Social.activeId);
    return;
  }
  if (action === "back") {
    Social.activeId = null;
    window._socialConversationId = null;
    document.getElementById("socialShell")?.classList.remove("is-chat-open");
    if (Social.channel) { await supabaseClient.removeChannel(Social.channel); Social.channel = null; }
    socialRenderStageEmpty(); socialRenderRail();
    if (typeof navigateToView === "function") navigateToView("messages", {}, {});
    return;
  }
  if (action === "profile") {
    window._sellerId = userId;
    if (typeof navigateToView === "function") navigateToView("seller", { id: userId }, {});
    return;
  }
  if (action === "message") { await socialOpenUser(userId); return; }
  if (action === "block" || action === "remove") { socialConfirmMutation(action, userId, relationId); return; }
  button.disabled = true;
  try { await socialMutate(action, userId, relationId); } finally { button.disabled = false; }
}

async function socialSendMessage(form) {
  var input = form.querySelector("#socialMessageInput");
  var button = form.querySelector("button[type=submit]");
  var body = String(input && input.value || "").trim();
  if (!body || !Social.activeId || !authUser) return;
  button.disabled = true;
  var result = await supabaseClient.from("social_messages").insert({ conversation_id: Social.activeId, sender_id: authUser.id, body: body });
  if (result.error) { socialShowError(result.error, "social.message_error"); button.disabled = false; return; }
  input.value = "";
  await socialLoadMessages(Social.activeId);
  await socialLoadState(true);
  socialRenderRail();
  button.disabled = false;
  input.focus();
}

async function socialRenderSellerActions(userId) {
  var host = document.getElementById("sellerSocialActions");
  if (!host || !userId || !authUser || userId === authUser.id) { if (host) host.innerHTML = ""; return; }
  if (!Social.loaded) await socialLoadState(true);
  if (Social.error) { host.innerHTML = ""; return; }
  await socialFetchProfiles([userId]);
  host.innerHTML = socialUserActions(userId, false) +
    (socialBlockedByMe(userId) ? "" : '<button type="button" class="btn-ghost btn-sm seller-social-block" data-social-action="block" data-user="' + socialEsc(userId) + '">' + socialEsc(t("social.block")) + '</button>');
}

function socialAuthChanged(user) {
  var top = document.getElementById("socialTopBtn");
  var side = document.getElementById("sidebarMessages");
  if (top) top.style.display = user ? "" : "none";
  if (side) side.style.display = user ? "" : "none";
  if (!user) {
    Social.loaded = false; Social.friendships = []; Social.blocks = []; Social.conversations = []; Social.reads = []; Social.profiles.clear(); Social.activeId = null;
    if (Social.channel) { supabaseClient.removeChannel(Social.channel); Social.channel = null; }
    socialUpdateBadges();
    return;
  }
  socialLoadState(true).then(function() {
    if (window.location.pathname.indexOf("/messages") === 0) socialRenderView(window._socialConversationId || null);
  });
}

function socialInit() {
  document.getElementById("socialTopBtn")?.addEventListener("click", function() { if (typeof navigateToView === "function") navigateToView("messages", {}, {}); });
  document.getElementById("socialRefreshBtn")?.addEventListener("click", socialRefreshView);
  document.addEventListener("click", function(event) {
    var tab = event.target.closest("[data-social-tab]");
    if (tab) { Social.tab = tab.getAttribute("data-social-tab"); socialRenderRail(); return; }
    var conversation = event.target.closest("[data-social-conversation]");
    if (conversation) { socialOpenConversation(conversation.getAttribute("data-social-conversation"), true); return; }
    var action = event.target.closest("[data-social-action]");
    if (action) socialHandleAction(action);
  });
  document.addEventListener("input", function(event) {
    if (event.target.id !== "socialUserSearch") return;
    var value = event.target.value;
    Social.searchQuery = value;
    clearTimeout(Social.searchTimer);
    Social.searchTimer = setTimeout(function() { socialSearchUsers(value); }, 280);
  });
  document.addEventListener("keydown", function(event) {
    if (event.target.id !== "socialMessageInput" || event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    event.target.form?.requestSubmit();
  });
  document.addEventListener("submit", function(event) {
    if (event.target.id !== "socialComposer") return;
    event.preventDefault();
    socialSendMessage(event.target);
  });
  if (typeof onAuthChange === "function") onAuthChange(socialAuthChanged);
  Social.refreshTimer = setInterval(function() {
    if (authUser) socialLoadState(true).then(function() { if (window.location.pathname.indexOf("/messages") === 0) socialRenderRail(); });
  }, 60000);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", socialInit);
else socialInit();
