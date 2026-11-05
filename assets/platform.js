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
  const localKeys = slug => slug === 'les-sims-4' ?
    ['simspin.categories.v3','simspin.history.v4'] :
    [`devwebgames.${slug}.categories.v1`, `devwebgames.${slug}.history.v1`];
  const slugs = ['les-sims-4','minecraft','fortnite','elden-ring','mario-kart','risk-of-rain-2','football-manager','pubg','apex'];
  const currentSlug = () => location.pathname.match(/\/jeux\/([^/]+)\//)?.[1] || null;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sg-account-btn';
  button.textContent = '👤 Connexion / Inscription';
  const header = document.querySelector('.header, .g-header, .devweb-return');
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
    <p class="sg-footnote">Sans compte, les roues continuent de fonctionner et tes modifications restent sur cet appareil.</p>
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
      logout.addEventListener('click', () => client?.auth.signOut());
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
  async function saveProgress(slug) {
    if (!client || !user || !slugs.includes(slug)) return;
    const [categoriesKey, historyKey] = localKeys(slug);
    let categories = null, history = null;
    try {
      categories = JSON.parse(localStorage.getItem(categoriesKey) || 'null');
      history = JSON.parse(localStorage.getItem(historyKey) || 'null');
    } catch (_) { return; }
    if (categories === null && history === null) return;
    const payload = { user_id: user.id, game_slug: slug, categories, history: Array.isArray(history) ? history.slice(0, 10) : [] };
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
    const { data, error } = await client.from('player_progress').select('game_slug,categories,history').eq('user_id', user.id);
    if (error) return console.warn('Lecture progression :', error.message);
    for (const row of (data || [])) {
      if (!slugs.includes(row.game_slug)) continue;
      const [catKey, histKey] = localKeys(row.game_slug);
      const oldCategories = localStorage.getItem(catKey);
      const oldHistory = localStorage.getItem(histKey);
      const newCategories = row.categories === null ? null : JSON.stringify(row.categories);
      const newHistory = row.history === null ? null : JSON.stringify(row.history);
      const needsCategories = newCategories !== null && oldCategories !== newCategories;
      const needsHistory = newHistory !== null && oldHistory !== newHistory;
      if (!needsCategories && !needsHistory) continue;
      if (oldCategories && needsCategories) {
        if (row.game_slug !== currentSlug()) continue;
        if (!confirm('Une sauvegarde en ligne existe pour ce jeu. La charger sur cet appareil ?')) continue;
      }
      if (newCategories !== null) localStorage.setItem(catKey, newCategories);
      if (newHistory !== null) localStorage.setItem(histKey, newHistory);
      if (row.game_slug === currentSlug()) {
        location.reload();
        return;
      }
    }
  }
  const api = {
    get user() { return user; },
    queueSave,
    async recordSpin(slug) {
      if (!client || !slugs.includes(slug)) return;
      const { error } = await client.rpc('site_register_spin', { p_visitor_id: visitorId, p_game_slug: slug });
      if (!error) refreshStats();
      else console.warn('Statistique du lancer :', error.message);
    }
  };
  window.SpinGames = api;
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
        if (user && before !== user.id) setTimeout(() => restoreProgress(), 200);
      });
      const { data } = await client.auth.getUser();
      user = data?.user || null;
      present();
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
