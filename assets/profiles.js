/* SpinGames — profils communautaires publics, distincts des sauvegardes privées. */
(() => {
  'use strict';
  if (window.SpinGamesProfiles) return;
  const TABLE = 'sg_public_profiles';
  const BUCKET = 'sg-profile-media';
  const $ = id => document.getElementById(id);
  const client = () => window.SpinGames?.client || null;
  const user = () => window.SpinGames?.user || null;
  let mine = null, mineUid = null, loading = null, waiting = null, saving = false;

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = new URL('profiles.css?v=20261106-1', document.currentScript.src).href;
  document.head.append(css);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sg-profile-button';
  button.textContent = '🎮 Mon profil';
  button.hidden = true;
  const account = document.querySelector('.sg-account-btn');
  if (account && account.parentElement) account.before(button);
  else document.body.append(button);

  const modal = document.createElement('div');
  modal.className = 'sg-profile-modal';
  modal.id = 'sg-profile-modal';
  modal.hidden = true;
  modal.innerHTML =
    '<section class="sg-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="sg-profile-title">' +
      '<div class="sg-profile-top"><h2 id="sg-profile-title">🎮 Mon profil SpinGames</h2>' +
      '<button type="button" class="sg-profile-close" aria-label="Fermer">×</button></div>' +
      '<div class="sg-profile-cover" id="sg-profile-cover"><span>Ma bannière</span></div>' +
      '<div class="sg-profile-preview"><div class="sg-profile-avatar-preview" id="sg-profile-avatar-preview">👤</div>' +
      '<div><strong id="sg-profile-display">Ton profil</strong><small id="sg-profile-role"></small></div></div>' +
      '<form id="sg-profile-form">' +
      '<label for="sg-profile-username">Pseudo public unique *</label>' +
      '<input id="sg-profile-username" maxlength="20" minlength="3" pattern="[A-Za-z0-9_]{3,20}" required placeholder="Ex : SuperJoueur" autocomplete="off">' +
      '<small class="sg-profile-help">3 à 20 caractères : lettres, chiffres et _ . Pas de nom d\'utilisateur automatique tiré de ton e-mail.</small>' +
      '<label for="sg-profile-bio">Présentation (facultatif)</label>' +
      '<textarea id="sg-profile-bio" maxlength="160" rows="3" placeholder="Quelques mots sur toi…"></textarea>' +
      '<label for="sg-profile-avatar">Photo de profil (facultative)</label>' +
      '<input id="sg-profile-avatar" type="file" accept="image/png,image/jpeg,image/webp">' +
      '<label for="sg-profile-banner">Bannière (facultative)</label>' +
      '<input id="sg-profile-banner" type="file" accept="image/png,image/jpeg,image/webp">' +
      '<small class="sg-profile-help">Images PNG, JPG ou WebP, jusqu\'à 6 Mo ; redimensionnées en WebP avant envoi. Les images seront publiques.</small>' +
      '<p id="sg-profile-status" class="sg-profile-status" role="status"></p>' +
      '<button id="sg-profile-save" class="sg-profile-save" type="submit">Enregistrer mon profil</button>' +
      '</form></section>';
  document.body.append(modal);

  const setStatus = (message, bad = false) => {
    const node = $('sg-profile-status');
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('sg-profile-error', !!bad);
  };
  function imgUrl(path) {
    if (!path || !client()) return null;
    const result = client().storage.from(BUCKET).getPublicUrl(path);
    return result?.data?.publicUrl || null;
  }
  function preview(profile) {
    const avatar = $('sg-profile-avatar-preview');
    avatar.replaceChildren();
    if (profile?.avatar_path && imgUrl(profile.avatar_path)) {
      const image = document.createElement('img');
      image.src = imgUrl(profile.avatar_path);
      image.alt = 'Avatar du profil';
      avatar.append(image);
    } else avatar.textContent = '👤';
    const cover = $('sg-profile-cover');
    cover.style.backgroundImage = profile?.banner_path && imgUrl(profile.banner_path)
      ? 'linear-gradient(90deg,#0c102260,#0c102260),url("' + imgUrl(profile.banner_path) + '")' : '';
    $('sg-profile-display').textContent = profile?.username || 'Ton profil';
    $('sg-profile-role').textContent = profile?.is_admin ? 'ADMIN · SpinGames' : 'Membre SpinGames';
    if (user()) button.textContent = (profile?.is_admin ? '⭐ ' : '🎮 ') + (profile?.username || 'Mon profil');
  }
  async function getMine(force = false) {
    const current = user();
    if (!current || !client()) return null;
    if (mineUid !== current.id) { mineUid = current.id; mine = null; loading = null; }
    if (!force && mine) return mine;
    if (!force && loading) return loading;
    loading = (async () => {
      const { data, error } = await client().from(TABLE)
        .select('user_id,username,bio,avatar_path,banner_path,is_admin')
        .eq('user_id', current.id).maybeSingle();
      if (error) throw error;
      if (user()?.id !== current.id) return null;
      mine = data || null;
      preview(mine);
      return mine;
    })();
    try { return await loading; } finally { loading = null; }
  }
  function populate(profile) {
    $('sg-profile-username').value = profile?.username || '';
    $('sg-profile-bio').value = profile?.bio || '';
    $('sg-profile-avatar').value = '';
    $('sg-profile-banner').value = '';
    preview(profile);
  }
  async function open() {
    if (!user()) { document.querySelector('.sg-account-btn')?.click(); return null; }
    modal.hidden = false;
    setStatus('Chargement du profil…');
    try {
      const profile = await getMine();
      populate(profile);
      setStatus(profile ? 'Tu peux modifier ton profil.' : 'Choisis un pseudo pour participer au chat.');
    } catch (_) { setStatus('Impossible de charger ton profil. Réessaie.', true); }
    $('sg-profile-username').focus();
    return mine;
  }
  function close(value = null) {
    modal.hidden = true;
    if (waiting) { waiting(value); waiting = null; }
  }
  async function ensureName() {
    if (!user()) return null;
    try {
      const profile = await getMine();
      if (profile?.username) return profile;
    } catch (_) { return null; }
    await open();
    if (mine?.username) return mine;
    return new Promise(resolve => { waiting = resolve; });
  }
  async function resizeImage(file, kind) {
    if (!/image\/(png|jpeg|webp)/.test(file.type) || file.size > 6 * 1024 * 1024)
      throw new Error('Choisis un PNG, JPG ou WebP de 6 Mo maximum.');
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (image.width < 10 || image.height < 10 || image.width > 10000 || image.height > 10000)
        throw new Error('Dimensions de l’image non prises en charge.');
      const w = kind === 'avatar' ? 360 : 1400;
      const h = kind === 'avatar' ? 360 : 460;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const scale = Math.max(w / image.width, h / image.height);
      const dw = image.width * scale, dh = image.height * scale;
      const context = canvas.getContext('2d', { alpha:false });
      if (!context) throw new Error('Le navigateur ne peut pas traiter cette image.');
      context.drawImage(image, (w - dw) / 2, (h - dh) / 2, dw, dh);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .82));
      if (!blob || blob.type !== 'image/webp' || blob.size > 2 * 1024 * 1024)
        throw new Error('Image trop volumineuse après traitement.');
      return blob;
    } finally { URL.revokeObjectURL(url); }
  }
  async function upload(file, kind, owner) {
    const blob = await resizeImage(file, kind);
    const path = owner + '/' + kind + '-' + crypto.randomUUID() + '.webp';
    const { error } = await client().storage.from(BUCKET).upload(path, blob, {
      contentType:'image/webp', cacheControl:'3600', upsert:false
    });
    if (error) throw error;
    return path;
  }
  $('sg-profile-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (saving || !client() || !user()) return;
    const current = user(), owner = current.id;
    const username = $('sg-profile-username').value.trim();
    const bio = $('sg-profile-bio').value.trim();
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) { setStatus('Pseudo : 3 à 20 lettres, chiffres ou _ .', true); return; }
    if (bio.length > 160) { setStatus('Présentation trop longue.', true); return; }
    saving = true; $('sg-profile-save').disabled = true;
    setStatus('Enregistrement en cours…');
    const files = { avatar: $('sg-profile-avatar').files[0], banner: $('sg-profile-banner').files[0] };
    const created = [];
    try {
      // Exact, case-insensitive uniqueness is enforced atomically by PostgreSQL.
      // Do not use ilike here: underscores are SQL wildcards, not literal characters.
      const previous = await getMine();
      const payload = { username, bio };
      if (files.avatar) { payload.avatar_path = await upload(files.avatar, 'avatar', owner); created.push(payload.avatar_path); }
      if (files.banner) { payload.banner_path = await upload(files.banner, 'banner', owner); created.push(payload.banner_path); }
      if (user()?.id !== owner) throw new Error('Compte changé : recommence.');
      const query = previous
        ? client().from(TABLE).update(payload).eq('user_id', owner)
        : client().from(TABLE).insert({ user_id:owner, ...payload });
      const { data, error } = await query.select('user_id,username,bio,avatar_path,banner_path,is_admin').single();
      if (error) throw error;
      mine = data; mineUid = owner;
      populate(data);
      setStatus('Profil enregistré !');
      document.dispatchEvent(new CustomEvent('spingames:profile-updated', { detail:{ user_id:owner } }));
      if (previous) {
        const old = [files.avatar && previous.avatar_path, files.banner && previous.banner_path].filter(Boolean);
        if (old.length) void client().storage.from(BUCKET).remove(old);
      }
      if (waiting) { waiting(data); waiting = null; }
      setTimeout(() => { if (modal && !modal.hidden && !saving) close(data); }, 650);
    } catch (error) {
      if (created.length && client()) void client().storage.from(BUCKET).remove(created);
      const message = error.code === '23505' ? 'Ce pseudo est déjà pris.' : (error.message || 'Enregistrement impossible.');
      setStatus(message, true);
    } finally { saving = false; $('sg-profile-save').disabled = false; }
  });
  button.addEventListener('click', () => void open());
  modal.querySelector('.sg-profile-close').addEventListener('click', () => close(null));
  modal.addEventListener('click', event => { if (event.target === modal) close(null); });
  document.addEventListener('keydown', event => { if (!modal.hidden && event.key === 'Escape') close(null); });
  document.addEventListener('spingames:auth', () => {
    const current = user();
    button.hidden = !current;
    if (mineUid !== current?.id) { mine = null; mineUid = null; loading = null; close(null); }
    if (current) void getMine().catch(() => {});
  });
  async function lookup(ids) {
    if (!client() || !ids?.length) return new Map();
    const { data, error } = await client().from(TABLE)
      .select('user_id,username,avatar_path,banner_path,bio,is_admin').in('user_id', [...new Set(ids)].slice(0,60));
    if (error) return new Map();
    return new Map((data || []).map(row => [row.user_id, row]));
  }
  window.SpinGamesProfiles = { getMine, ensureName, open, lookup, imgUrl };
  if (user()) { button.hidden = false; void getMine().catch(() => {}); }
})();