/* SpinGames – comptes, sauvegardes et statistiques réelles (Supabase).
   La configuration publique se trouve dans assets/site-config.js.
   Ne jamais placer de clé secrète ou service_role dans le navigateur. */
(() => {
  'use strict';
  const config = window.SPINGAMES_SUPABASE || {};
  const ready = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(config.url || '') &&
    /^(sb_publishable_|eyJ)/.test(config.publishableKey || '');
  const fmt = n => typeof n === 'number' && Number.isFinite(n) ? new Intl.NumberFormat('fr-FR').format(n) : '—';
  const set = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = value; };
  const key = 'spingames.visitor.v1';
  let visitorId;
  try {
    visitorId = localStorage.getItem(key);
    if (!/^[a-f\d-]{36}$/i.test(visitorId || '')) {
      visitorId = crypto.randomUUID();
      localStorage.setItem(key, visitorId);
    }
  } catch (_) { visitorId = crypto.randomUUID(); }
  let client = null, user = null, nextRefresh = 0;
  const localKeys = (slug, owner = user?.id) => {
    const raw = slug === 'les-sims-4'
      ? ['simspin.categories.v3','simspin.history.v4']
      : [`devwebgames.${slug}.categories.v1`, `devwebgames.${slug}.history.v1`];
    return owner ? raw.map(key => 'spingames.account.'+owner+'.'+key) : raw;
  };
  const slugs = ['les-sims-4','minecraft','fortnite','elden-ring','mario-kart','risk-of-rain-2','football-manager','pubg','apex','valorant','league-of-legends','overwatch','counter-strike','warzone','dota-2','deadlock','dofus'];
  const currentSlug = () => location.pathname.match(/\/jeux\/([^/]+)\//)?.[1] || null;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sg-account-btn';
  button.textContent = '👤 Connexion / Inscription';
  const header = document.querySelector('.header, .g-header, .devweb-return, .sg-cloud-header');
  if (header) header.append(button);
  else { button.style.cssText = 'position:fixed;top:12px;right:12px;z-index:1000'; document.body.append(button); }

  const modal = document.createElement('div');
  modal.className = 'sg-modal';
  modal.hidden = true;
  modal.innerHTML = `<section class="sg-modal-panel" role="dialog" aria-modal="true" aria-labelledby="sg-auth-title">
    <div class="sg-modal-header"><h2 id="sg-auth-title">🎮 Mon compte SpinGames</h2><button class="sg-close" type="button" aria-label="Fermer">×</button></div>
    <p class="sg-intro">Sauvegarde tes roues, catégories et derniers tirages pour les retrouver sur un autre appareil.</p>
    <div class="sg-account-content">
      <button class="sg-action sg-google" type="button" id="sg-google">Continuer avec Google</button>
      <button class="sg-action sg-discord" type="button" id="sg-discord">🎮 Continuer avec Discord</button>
      <form id="sg-email-form">
        <label for="sg-email">Adresse e-mail</label><input id="sg-email" type="email" autocomplete="email" required placeholder="ton@email.fr">
        <label for="sg-pass">Mot de passe (6 caractères minimum)</label><input id="sg-pass" type="password" autocomplete="current-password" minlength="6" required>
        <button class="sg-action" type="submit" data-mode="login">Se connecter</button>
        <button class="sg-action sg-ghost" type="button" id="sg-signup">Créer mon compte</button>
      </form>
    </div>
    <p class="sg-note" id="sg-auth-status" role="status"></p>
    <p class="sg-footnote">Sans compte, les modifications ne sont pas sauvegardées après la fermeture de l'onglet. Connecte-toi pour les conserver.</p>
  </section>`;
  document.body.append(modal);
  const $ = id => document.getElementById(id);
  const note = message => { $('sg-auth-status').textContent = message; };
  const present = () => {
    if (user) {
      const displayName = user.email || 'Joueur';
      button.textContent = '👤 Mon compte';
      document.querySelector('.sg-account-content').innerHTML = '';
      const p = document.createElement('p'); p.textContent = `Connecté : ${displayName}`;
      const logout = document.createElement('button');
      logout.className = 'sg-action sg-ghost'; logout.type = 'button'; logout.textContent = 'Déconnexion';
      logout.addEventListener('click', async () => {
        logout.disabled = true;
        note('Sauvegarde de tes données en cours…');
        try { await window.SpinGamesCloud?.flushAll(); } catch (_) {}
        await client?.auth.signOut();
      });
      document.querySelector('.sg-account-content').append(p, logout);
    } else {
      button.textContent = '👤 Connexion / Inscription';
      if (!$('sg-email-form')) {
        document.querySelector('.sg-account-content').innerHTML = `<button class="sg-action sg-google" type="button" id="sg-google">Continuer avec Google</button>
      <button class="sg-action sg-discord" type="button" id="sg-discord">🎮 Continuer avec Discord</button>
        <form id="sg-email-form"><label for="sg-email">Adresse e-mail</label><input id="sg-email" type="email" autocomplete="email" required>
        <label for="sg-pass">Mot de passe</label><input id="sg-pass" type="password" autocomplete="current-password" minlength="6" required>
        <button class="sg-action" type="submit">Se connecter</button>
        <button class="sg-action sg-ghost" id="sg-signup" type="button">Créer mon compte</button></form>`;
      }
    }
    if (!ready) {
      note('Comptes et statistiques en attente de la connexion Supabase.');
      document.querySelectorAll('.sg-account-content input,.sg-account-content button').forEach(el => { el.disabled = true; el.title = 'Disponible après activation de Supabase'; });
    }
  };
  button.addEventListener('click', () => { modal.hidden = false; present(); });
  modal.querySelector('.sg-close').addEventListener('click', () => { modal.hidden = true; });
  modal.addEventListener('click', e => { if (e.target === modal) modal.hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') modal.hidden = true; });
  modal.addEventListener('click', async e => {
    if (!client) return;
    if (e.target.closest('#sg-google')) {
      note('Redirection vers Google…');
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google', options: { redirectTo: location.origin + location.pathname }
      });
      if (error) note(error.message);
    }
    if (e.target.closest('#sg-discord')) {
      note('Redirection vers Discord…');
      const { error } = await client.auth.signInWithOAuth({
        provider: 'discord', options: { redirectTo: location.origin + location.pathname }
      });
      if (error) note('Connexion Discord impossible : ' + error.message);
    }
    if (e.target.closest('#sg-signup')) {
      const form = $('sg-email-form');
      if (!form.reportValidity()) return;
      const { error } = await client.auth.signUp({
        email: $('sg-email').value.trim(), password: $('sg-pass').value
      });
      note(error ? error.message : 'Inscription demandée ! Vérifie ton e-mail si une confirmation est requise.');
    }
  });
  modal.addEventListener('submit', async e => {
    if (e.target.id !== 'sg-email-form') return;
    e.preventDefault();
    if (!client) return;
    note('Connexion en cours…');
    const { error } = await client.auth.signInWithPassword({
      email: $('sg-email').value.trim(), password: $('sg-pass').value
    });
    note(error ? error.message : 'Connecté !');
  });
  present();

  const dispatch = () => document.dispatchEvent(new CustomEvent('spingames:auth', { detail: { user } }));
  const saveTimers = new Map();
  const restored = new Set();
  function mergeOfficial(saved, previousBase, currentBase) {
    if (!Array.isArray(saved) || !Array.isArray(previousBase) || !Array.isArray(currentBase)) return saved;
    const previous = new Map(previousBase.filter(c => c && typeof c.name === 'string').map(c => [c.name, c]));
    const combined = saved.map(c => ({ ...c, items: Array.isArray(c.items) ? [...c.items] : [] }));
    for (const official of currentBase) {
      if (!official || typeof official.name !== 'string') continue;
      const old = previous.get(official.name);
      if (!old) {
        if (!combined.some(c => c.name === official.name)) combined.push(official);
        continue;
      }
      const own = combined.find(c => c.name === official.name);
      if (!own || !Array.isArray(official.items)) continue;
      const oldItems = new Set(Array.isArray(old.items) ? old.items : []);
      const personalItems = new Set(own.items);
      for (const item of official.items) {
        if (!oldItems.has(item) && !personalItems.has(item)) { own.items.push(item); personalItems.add(item); }
      }
    }
    return combined;
  }
  function officialCategories(slug) {
    if (slug !== currentSlug()) return null;
    try {
      const node = document.getElementById('game-data');
      const data = node ? JSON.parse(node.textContent) : null;
      return Array.isArray(data?.categories) ? data.categories : null;
    } catch (_) { return null; }
  }
  async function saveProgress(slug) {
    if (!client || !user || !slugs.includes(slug) || !restored.has(user.id)) return;
    const owner = user.id;
    const [categoriesKey, historyKey] = localKeys(slug, owner);
    let categories = null, history = null;
    try {
      categories = JSON.parse(localStorage.getItem(categoriesKey) || 'null');
      history = JSON.parse(localStorage.getItem(historyKey) || 'null');
    } catch (_) { return; }
    if (categories === null && history === null) return;
    const payload = { user_id: owner, game_slug: slug, categories, history: Array.isArray(history) ? history.slice(0, 10) : [] };
    const baseline = officialCategories(slug);
    if (baseline) payload.official_baseline = baseline;
    if (owner !== user?.id) return;
    const { error } = await client.from('player_progress').upsert(payload, { onConflict: 'user_id,game_slug' });
    if (error) console.warn('Sauvegarde en ligne indisponible :', error.message);
  }
  function queueSave(slug) {
    if (!slugs.includes(slug) || !user) return;
    clearTimeout(saveTimers.get(slug));
    saveTimers.set(slug, setTimeout(() => saveProgress(slug), 1200));
  }
  async function restoreProgress() {
    if (!client || !user) return;
    const owner = user.id;
    const { data, error } = await client.from('player_progress')
      .select('game_slug,categories,history,official_baseline').eq('user_id', owner);
    if (owner !== user?.id) return;
    if (error) {
      console.warn('Lecture progression :', error.message);
      return;
    }
    for (const row of (data || [])) {
      if (!slugs.includes(row.game_slug)) continue;
      const [catKey, histKey] = localKeys(row.game_slug, owner);
      let categories = row.categories;
      const official = officialCategories(row.game_slug);
      if (official && Array.isArray(categories)) {
        categories = mergeOfficial(categories, row.official_baseline, official);
      }
      if (categories !== null) localStorage.setItem(catKey, JSON.stringify(categories));
      if (row.history !== null) localStorage.setItem(histKey, JSON.stringify(row.history));
      if (row.game_slug === currentSlug()) {
        document.dispatchEvent(new CustomEvent('spingames:progress-ready', { detail: { slug: row.game_slug } }));
      }
    }
    restored.add(owner);
    const active = (data || []).find(row => row.game_slug === currentSlug());
    if (active && Array.isArray(active.official_baseline) && officialCategories(currentSlug()) &&
        JSON.stringify(active.official_baseline) !== JSON.stringify(officialCategories(currentSlug()))) {
      queueSave(currentSlug());
    }
  }
  const api = {
    get user() { return user; },
    get client() { return client; },
    queueSave,
    async recordSpin(slug) {
      if (!client || !slugs.includes(slug)) return;
      const { error } = await client.rpc('site_register_spin', { p_visitor_id: visitorId, p_game_slug: slug });
      if (!error) refreshStats();
      else console.warn('Statistique du lancer :', error.message);
    }
  };
  window.SpinGames = api;
  // Un widget unique sur toutes les pages qui chargent SpinGames.
  // Les clés Supabase restent publiques côté navigateur, aucun secret ici.
  const platformSource = document.currentScript?.src;
  if (platformSource && !document.getElementById('sg-profile-script')) {
    const profileScript = document.createElement('script');
    profileScript.id = 'sg-profile-script';
    profileScript.src = new URL('profiles.js?v=20261106-1', platformSource).href;
    profileScript.async = true;
    document.head.append(profileScript);
  }
  if (platformSource && !document.getElementById('sg-chat-script')) {
    const chatStyle = document.createElement('link');
    chatStyle.rel = 'stylesheet';
    chatStyle.id = 'sg-chat-style';
    chatStyle.href = new URL('chat.css?v=20261106-1', platformSource).href;
    document.head.append(chatStyle);
    const chatScript = document.createElement('script');
    chatScript.id = 'sg-chat-script';
    chatScript.src = new URL('chat.js?v=20261106-1', platformSource).href;
    chatScript.async = true;
    document.head.append(chatScript);
  }
  async function refreshStats() {
    if (!client) return;
    const { data, error } = await client.rpc('site_get_stats');
    if (error) {
      set('sg-stats-status', 'Statistiques temporairement indisponibles');
      console.warn('Statistiques :', error.message);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    set('sg-spins', fmt(Number(row?.total_spins)));
    set('sg-online', fmt(Number(row?.online_visitors)));
    set('sg-visitors', fmt(Number(row?.total_visitors)));
    set('sg-stats-status', 'Statistiques du site · actualisation automatique');
  }
  async function heartbeat() {
    if (!client || document.visibilityState === 'hidden') return;
    try { await client.rpc('site_register_visit', { p_visitor_id: visitorId }); } catch (_) {}
    if (Date.now() - nextRefresh >= 12000) {
      nextRefresh = Date.now();
      refreshStats();
    }
  }
  if (!ready) {
    set('sg-stats-status', 'Statistiques bientôt disponibles · connexion du serveur en cours');
    return;
  }
  (async () => {
    try {
      const lib = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.10/+esm');
      client = lib.createClient(config.url, config.publishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      client.auth.onAuthStateChange((_event, session) => {
        const before = user?.id;
        user = session?.user || null;
        present();
        dispatch();
        void window.SpinGamesCloud?.setSession(client, user);
        if (user && before !== user.id) setTimeout(() => restoreProgress(), 200);
      });
      const { data } = await client.auth.getUser();
      user = data?.user || null;
      present();
      dispatch();
      void window.SpinGamesCloud?.setSession(client, user);
      if (user && !restored.has(user.id)) void restoreProgress();
      heartbeat();
      setInterval(heartbeat, 20000);
      window.addEventListener('focus', heartbeat);
      document.addEventListener('spingames:save', event => queueSave(event.detail?.slug));
      window.addEventListener('beforeunload', () => { const slug = currentSlug(); if (slug) queueSave(slug); });
    } catch (error) {
      console.warn('Impossible de charger Supabase :', error);
      note('Service de connexion temporairement indisponible.');
      set('sg-stats-status', 'Statistiques temporairement indisponibles');
    }
  })();
})();
