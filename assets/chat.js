/* SpinGames — salon public Général. Consultation libre, écriture par compte connecté. */
(() => {
  'use strict';
  if (document.getElementById('sg-chat-launcher')) return;
  const host = document.createElement('div');
  host.className = 'sg-chat-widget';
  host.innerHTML = `
    <button class="sg-chat-launcher" id="sg-chat-launcher" type="button" aria-expanded="false" aria-controls="sg-chat-panel">
      <span class="sg-chat-launcher-icon" aria-hidden="true">💬</span>
      <span class="sg-chat-launcher-copy"><strong>Chat</strong><small><span class="sg-chat-dot"></span> Salon Général</small></span>
      <span class="sg-chat-launcher-chevron" aria-hidden="true">⌃</span>
    </button>
    <section class="sg-chat-panel" id="sg-chat-panel" aria-label="Chat public — Général" hidden>
      <header class="sg-chat-head">
        <div class="sg-chat-heading"><span aria-hidden="true">💬</span><div><strong>Chat <span class="sg-chat-live-dot">●</span></strong><small>Général · Discussions entre joueurs</small></div></div>
        <button type="button" class="sg-chat-close" id="sg-chat-close" aria-label="Refermer le chat">×</button>
      </header>
      <p class="sg-chat-notice">Bienvenue ! Échange dans le respect des autres. Les messages sont publics.</p>
      <div class="sg-chat-messages" id="sg-chat-messages" role="log" aria-live="polite" aria-relevant="additions text">
        <p class="sg-chat-empty">Ouvre le salon pour découvrir les messages.</p>
      </div>
      <div class="sg-chat-footer">
        <p class="sg-chat-status" id="sg-chat-status" role="status"></p>
        <form id="sg-chat-form" class="sg-chat-form" hidden>
          <label for="sg-chat-text" class="sg-chat-sr-only">Message dans le salon Général</label>
          <textarea id="sg-chat-text" rows="2" maxlength="350" placeholder="Écrire dans Général…" required></textarea>
          <div class="sg-chat-compose-actions"><span id="sg-chat-count">0/350</span><button type="submit" id="sg-chat-send">Envoyer ➤</button></div>
        </form>
        <div class="sg-chat-guest" id="sg-chat-guest">
          <span>Connecte-toi pour participer au chat.</span>
          <button type="button" id="sg-chat-login">👤 Se connecter</button>
        </div>
      </div>
    </section>`;
  document.body.append(host);

  const $ = id => document.getElementById(id);
  const launcher = $('sg-chat-launcher'), panel = $('sg-chat-panel'), messages = $('sg-chat-messages');
  const input = $('sg-chat-text'), form = $('sg-chat-form'), send = $('sg-chat-send');
  const count = $('sg-chat-count'), status = $('sg-chat-status');
  const getClient = () => window.SpinGames?.client || null;
  const getUser = () => window.SpinGames?.user || null;
  const table = 'chat_general_messages';
  let open = false, polling = null, channel = null, latest = null, busy = false, sending = false, lastSend = 0;
  const messageSet = new Set();

  function state(text, bad = false) {
    status.textContent = text;
    status.classList.toggle('sg-chat-error', !!bad);
  }
  function updateComposer() {
    const signedIn = !!getUser();
    form.hidden = !signedIn;
    $('sg-chat-guest').hidden = signedIn;
    if (signedIn) state('Connecté · les messages sont visibles par tous.');
    else state('Lecture libre · écriture réservée aux membres.');
  }
  function shortName() {
    const u = getUser();
    const m = u?.user_metadata || {};
    const name = m.global_name || m.username || m.user_name || m.name || m.full_name || 'Joueur';
    return String(name).replace(/\s+/g, ' ').trim().slice(0, 28) || 'Joueur';
  }
  function newMessage(entry) {
    const item = document.createElement('article');
    item.className = 'sg-chat-message' + (entry.user_id === getUser()?.id ? ' sg-chat-mine' : '');
    const avatar = document.createElement('span');
    avatar.className = 'sg-chat-avatar';
    avatar.textContent = String(entry.display_name || '?').slice(0, 1).toUpperCase();
    const content = document.createElement('div');
    content.className = 'sg-chat-message-content';
    const meta = document.createElement('div');
    meta.className = 'sg-chat-meta';
    const author = document.createElement('strong');
    author.textContent = (entry.display_name || 'Joueur') + ' #' + String(entry.user_id || '').slice(0, 4);
    const time = document.createElement('time');
    const date = new Date(entry.created_at);
    time.textContent = Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
    time.dateTime = entry.created_at;
    meta.append(author, time);
    const body = document.createElement('p');
    body.textContent = entry.body || '';
    content.append(meta, body); item.append(avatar, content);
    return item;
  }
  function paint(rows, first = false) {
    const nearBottom = first || messages.scrollHeight - messages.scrollTop - messages.clientHeight < 85;
    const identity = rows.map(x => x.id).join('|');
    if (identity === latest && !first) return;
    latest = identity;
    const frag = document.createDocumentFragment();
    messageSet.clear();
    for (const row of rows) {
      messageSet.add(row.id);
      frag.append(newMessage(row));
    }
    if (!rows.length) {
      const empty = document.createElement('p');
      empty.className = 'sg-chat-empty';
      empty.textContent = 'Aucun message pour le moment. Lance la conversation !';
      frag.append(empty);
    }
    messages.replaceChildren(frag);
    if (nearBottom) messages.scrollTop = messages.scrollHeight;
  }
  async function refresh(first = false) {
    if (!open || busy) return;
    const client = getClient();
    if (!client) {
      state('Chargement du chat…');
      return;
    }
    busy = true;
    try {
      const { data, error } = await client.from(table)
        .select('id,user_id,display_name,body,created_at')
        .order('created_at', { ascending:false }).limit(60);
      if (error) throw error;
      if (!open) return;
      paint((data || []).slice().reverse(), first);
      if (!getUser()) state('Lecture libre · connecte-toi pour écrire.');
      else state('Salon Général · messages publics');
    } catch (err) {
      state('Impossible de charger les messages pour le moment.', true);
      console.warn('SpinGames chat :', err.message);
    } finally { busy = false; }
  }
  function subscribe() {
    const client = getClient();
    if (!open || channel || !client) return;
    channel = client.channel('sg-chat-general-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event:'INSERT', schema:'public', table }, () => void refresh())
      .subscribe();
  }
  function stop() {
    clearInterval(polling); polling = null;
    if (channel) {
      const client = getClient();
      try { void client?.removeChannel(channel); } catch (_) {}
      channel = null;
    }
  }
  function setOpen(next) {
    open = !!next;
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    launcher.classList.toggle('sg-chat-is-open', open);
    if (open) {
      updateComposer();
      state('Chargement des messages…');
      void refresh(true);
      subscribe();
      polling = setInterval(() => {
        if (!document.hidden) {
          subscribe();
          void refresh();
        }
      }, 11000);
    } else stop();
  }
  launcher.addEventListener('click', () => setOpen(!open));
  $('sg-chat-close').addEventListener('click', () => setOpen(false));
  $('sg-chat-login').addEventListener('click', () => document.querySelector('.sg-account-btn')?.click());
  document.addEventListener('keydown', event => {
    if (open && event.key === 'Escape' && !document.querySelector('.sg-modal:not([hidden])')) {
      setOpen(false);
      launcher.focus();
    }
  });
  input.addEventListener('input', () => {
    count.textContent = input.value.length + '/350';
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    const client = getClient(), user = getUser();
    if (!client || !user) { updateComposer(); state('Connecte-toi avant d’écrire.', true); return; }
    const body = input.value.trim();
    if (!body || body.length > 350) return;
    if (Date.now() - lastSend < 4200) { state('Attends quelques secondes entre deux messages.', true); return; }
    sending = true; send.disabled = true; state('Envoi…');
    try {
      const { error } = await client.from(table).insert({
        user_id: user.id,
        display_name: shortName(),
        body
      });
      if (error) throw error;
      lastSend = Date.now();
      input.value = ''; count.textContent = '0/350';
      await refresh();
      state('Message envoyé !');
    } catch (err) {
      state(/seconds|secondes|minutes|limite|attends/i.test(err.message || '')
        ? 'Tu écris trop vite. Réessaie dans quelques instants.'
        : 'Envoi impossible. Vérifie ta connexion et réessaie.', true);
      console.warn('SpinGames chat post :', err.message);
    } finally { sending = false; send.disabled = false; }
  });
  document.addEventListener('spingames:auth', () => {
    if (!open) return;
    updateComposer(); subscribe(); void refresh();
  });
  document.addEventListener('visibilitychange', () => {
    if (open && !document.hidden) void refresh();
  });
  window.addEventListener('pagehide', stop);
})();
