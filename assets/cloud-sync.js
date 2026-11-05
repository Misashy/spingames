/* SpinGames: synchronisation privée des favoris et de la roue gaming.
   Les données locales historiques sont conservées comme sauvegarde. */
(() => {
  'use strict';
  const kinds = ['favorites', 'custom_wheels'];
  const legacy = { favorites: 'spingames.favorites.v1', custom_wheels: 'la-roue-gaming.v1' };
  let client = null, uid = null, generation = 0, loading = false;
  const cache = new Map(), ready = new Set(), pending = new Map(), writing = new Map();
  const readJSON = key => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : null; } catch (_) { return null; } };
  const copy = value => value == null ? null : JSON.parse(JSON.stringify(value));
  const userKey = (id, kind) => 'spingames.profile.' + id + '.' + kind + '.v1';
  const claimedKey = kind => 'spingames.legacy-claimed.' + kind + '.v1';
  const valid = (kind, data) => kind === 'favorites'
    ? !!data && Array.isArray(data.values)
    : !!data && !!data.library && Array.isArray(data.library.wheels);
  function readLegacy(kind) {
    const raw = readJSON(legacy[kind]);
    if (kind === 'favorites') return Array.isArray(raw) ? { values: raw.filter(x => typeof x === 'string') } : null;
    return raw && Array.isArray(raw.wheels) ? {
      library: raw, timer: readJSON('la-roue-gaming.timer.v1')
    } : null;
  }
  function announce(kind, data, error) {
    document.dispatchEvent(new CustomEvent('spingames:profile-ready', {
      detail: { kind, uid, data: copy(data), error: error || null }
    }));
  }
  function stateMessage(kind, message) {
    document.dispatchEvent(new CustomEvent('spingames:profile-status', {
      detail: { kind, uid, message }
    }));
  }
  function store(id, kind, data, when = Date.now()) {
    try { localStorage.setItem(userKey(id, kind), JSON.stringify({ data, savedAt: when })); }
    catch (_) { stateMessage(kind, 'Stockage local indisponible. Exporte une sauvegarde.'); }
  }
  function backup(id, kind, data) {
    if (!data) return;
    try { localStorage.setItem('spingames.backup.' + id + '.' + kind + '.' + Date.now(), JSON.stringify(data)); }
    catch (_) {}
  }
  function schedule(kind) {
    if (!uid || !ready.has(kind)) return;
    clearTimeout(pending.get(kind));
    const owner = uid;
    pending.set(kind, setTimeout(() => void flush(kind, owner), 900));
    stateMessage(kind, '☁ Synchronisation en cours…');
  }
  async function flush(kind, owner = uid) {
    clearTimeout(pending.get(kind));
    pending.delete(kind);
    if (!client || !owner || owner !== uid || !ready.has(kind)) return;
    if (writing.has(kind)) { schedule(kind); return writing.get(kind); }
    const data = copy(cache.get(kind));
    if (!valid(kind, data)) return;
    const request = client.from('player_profile_data')
      .upsert({ user_id: owner, kind, data }, { onConflict: 'user_id,kind' });
    const task = (async () => {
      try {
        const { error } = await request;
        if (error) throw error;
        if (owner === uid) {
          stateMessage(kind, '☁ Sauvegarde en ligne à jour');
          if (JSON.stringify(cache.get(kind)) !== JSON.stringify(data)) schedule(kind);
        }
      } catch (error) {
        if (owner === uid) {
          stateMessage(kind, '⚠ Sauvegarde en ligne indisponible : copie locale conservée');
          console.warn('SpinGames cloud (' + kind + ') :', error.message);
        }
      } finally { writing.delete(kind); }
    })();
    writing.set(kind, task);
    return task;
  }
  async function load(kind, owner, epoch) {
    let local = readJSON(userKey(owner, kind));
    let remote = null, error = null;
    try {
      const result = await client.from('player_profile_data')
        .select('data,updated_at').eq('user_id', owner).eq('kind', kind).maybeSingle();
      if (result.error) throw result.error;
      remote = result.data;
    } catch (err) { error = err; }
    if (owner !== uid || epoch !== generation) return;
    // Relecture après le réseau : ne pas perdre les changements faits pendant la connexion.
    const latestLocal = readJSON(userKey(owner, kind));
    if (latestLocal && Number(latestLocal.savedAt) > Number(local?.savedAt || 0)) {
      local = latestLocal;
    }
    let data = null, needsUpload = false;
    const localValid = local && valid(kind, local.data);
    if (remote && valid(kind, remote.data)) {
      const newerLocal = localValid && Number(local.savedAt) > Date.parse(remote.updated_at || '');
      if (newerLocal) { data = local.data; needsUpload = true; }
      else {
        data = remote.data;
        if (localValid && JSON.stringify(local.data) !== JSON.stringify(remote.data)) backup(owner, kind, local.data);
      }
    } else if (localValid) { data = local.data; needsUpload = !error; }
    else if (!remote && !error && !localStorage.getItem(claimedKey(kind))) {
      const old = readLegacy(kind);
      if (valid(kind, old)) {
        data = old; needsUpload = true;
        try { localStorage.setItem(claimedKey(kind), owner); } catch (_) {}
      }
    }
    if (valid(kind, data)) store(owner, kind, data, needsUpload && localValid ? Number(local.savedAt) : (remote?.updated_at ? Date.parse(remote.updated_at) : Date.now()));
    cache.set(kind, copy(data));
    ready.add(kind);
    announce(kind, data, error && error.message);
    if (error) stateMessage(kind, '⚠ Hors ligne : sauvegarde locale préservée');
    else if (needsUpload) schedule(kind);
    else stateMessage(kind, '☁ Sauvegarde en ligne chargée');
  }
  async function setSession(supabase, account) {
    const next = account?.id || null;
    client = supabase || client;
    if (next === uid && (next === null || loading || ready.size === kinds.length)) return;
    if (next !== uid) {
      document.dispatchEvent(new CustomEvent('spingames:profile-switching', { detail: { from: uid, to: next } }));
      generation += 1;
      loading = false;
      for (const handle of pending.values()) clearTimeout(handle);
      pending.clear(); cache.clear(); ready.clear();
      uid = next;
    }
    if (!next) {
      for (const kind of kinds) {
        ready.add(kind);
        const data = readLegacy(kind);
        cache.set(kind, copy(data));
        announce(kind, data);
      }
      return;
    }
    const epoch = generation;
    loading = true;
    try { await Promise.all(kinds.map(kind => load(kind, next, epoch))); }
    finally { if (epoch === generation) loading = false; }
  }
  function put(kind, data) {
    if (!kinds.includes(kind) || !valid(kind, data)) return;
    if (!uid) return; // le composant conserve lui-même ses données anonymes
    const snap = copy(data);
    cache.set(kind, snap);
    store(uid, kind, snap);
    if (ready.has(kind)) schedule(kind);
  }
  async function flushAll() {
    const owner = uid;
    if (!owner) return;
    await Promise.all(kinds.map(kind => flush(kind, owner)));
  }
  window.SpinGamesCloud = {
    setSession, put, flushAll,
    get(kind) { return copy(cache.get(kind)); },
    isReady(kind) { return ready.has(kind); },
    userId() { return uid; }
  };
})();
