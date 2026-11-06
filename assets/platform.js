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

  const dispatch = () => {
    // Avant d'afficher les roues du compte, intégrer les nouveautés officielles
    // directement dans ses données locales, sans attendre un appel réseau.
    if (user) {
      const slug = currentSlug();
      if (slug && slug !== 'les-sims-4') syncLocalOfficial(slug, officialCategories(slug));
    }
    document.dispatchEvent(new CustomEvent('spingames:auth', { detail: { user } }));
  };
  const saveTimers = new Map();
  const restored = new Set();
  // Base officielle historique du premier catalogue Valorant. Utilisée une seule fois
  // pour identifier les listes des comptes créés avant l'arrivée des 100 défis.
  // Les listes inconnues/personnalisées ne sont jamais assimilées aux défauts.
  const legacyOfficial = {"valorant":[{"name":"Facile","items":["Annonce une information utile après chaque duel","Pose ton viseur à hauteur de tête avant chaque angle","Achète un équipement cohérent avec ton équipe","Utilise ton utilitaire avant de prendre une zone","Propose une stratégie simple au début de la manche","Assure une position de soutien sur un site","Joue une manche en restant proche d'un allié","Fais au moins un échange de duel (trade) avec un allié"]},{"name":"Moyen","items":["Gagne un duel en jouant patiemment un angle","Réussis une entrée coordonnée avec ton équipe","Fais une élimination après une flash alliée","Protège un poseur ou un désamorceur jusqu'au bout","Ne change pas d'arme pendant trois manches","Utilise tes compétences pour retarder une attaque","Réalise une bonne reprise de site à deux","Gagne une manche en utilisant une fausse rotation"]},{"name":"Difficile","items":["Remporte un duel sans te faire toucher","Réalise deux éliminations dans une même manche","Gagne une manche en ne prenant que les duels avec un allié prêt au trade","Désamorce le spike après avoir sécurisé toutes les positions proches","Réussis une élimination avec une arme secondaire","Gagne un round d'éco sans forcer l'achat","Prends un site sans subir de perte de ton équipe","Remporte un clutch en infériorité numérique"]},{"name":"Extrême","items":["Termine une manche avec trois éliminations ou plus","Remporte un clutch 1 contre 3","Gagne une manche sans utiliser d'armure (en partie personnalisée)","Réalise un tir décisif au dernier moment","Gagne un duel contre un adversaire mieux équipé","Remporte deux manches d'affilée en utilisant seulement un pistolet (partie privée)","Réussis un ace en partie personnalisée ou publique","Remporte un round avec uniquement des achats coordonnés"]},{"name":"Défi Trool","items":["Joue un round avec une voix d'espion (entre amis)","Donne un nom improbable à chaque stratégie sans gêner l'équipe","Échange les rôles habituels de ton groupe pendant une partie privée","Utilise uniquement les noms de lieux en français pendant une manche","Fais choisir ton agent par ton groupe en partie non classée","Nomme chaque duel remporté comme un épisode de série","Fais un briefing tactique en dix mots maximum entre amis","Célèbre un clutch avec un slogan inventé"]},{"name":"Défi Spéciaux","items":["Gagne trois manches avec trois stratégies d'entrée différentes","Joue une partie en changeant de rôle par rapport à ton habitude","Réalise un désamorçage sous couverture de fumée","Protège un allié jusqu'à la fin d'une manche","Gagne un round en économisant tes crédits au début","Réussis une reprise de site après une rotation adverse","Remporte une manche sans perdre le spike","Fais une partie en ne donnant que des communications utiles"]}],"league-of-legends":[{"name":"Facile","items":["Place une balise de vision à chaque retour possible","Priorise les derniers coups sur les sbires pendant cinq minutes","Annonce chaque disparition d'un adversaire de ligne","Achète un objet de contrôle de vision lorsque c'est pertinent","Participe à un objectif neutre avec ton équipe","Protège ton carry lors d'un combat d'équipe","Prépare une vague de sbires avant de rentrer à la base","Donne une information utile à tes alliés avant une rotation"]},{"name":"Moyen","items":["Réussis une élimination après une rotation sur une autre ligne","Assure deux objectifs neutres avec ton équipe","Termine la phase de lane avec un bon total de sbires","Survis à trois ganks sans mourir","Fais une action décisive grâce à une balise de vision","Gagne un combat d'équipe après avoir protégé un allié","Obtiens un avantage de tourelle sans forcer un combat","Réussis un engage ou un désengagement déterminant"]},{"name":"Difficile","items":["Gagne ta ligne sans donner de kill à l'adversaire","Participe à trois éliminations sans mourir","Vol un objectif neutre de manière légitime","Réussis une téléportation ou rotation déterminante","Termine une partie avec moins de trois morts","Prends deux objectifs majeurs consécutifs avec ton équipe","Remporte un combat d'équipe en infériorité numérique","Gagne une partie en jouant un champion peu utilisé par toi"]},{"name":"Extrême","items":["Gagne une partie sans mourir","Réalise un pentakill en partie personnalisée ou publique","Gagne avec une composition inhabituelle entre amis","Termine une partie sans donner de prime de shutdown","Réussis un comeback après la perte de plusieurs tourelles","Gagne un combat décisif sans ton sort ultime","Termine une partie avec une participation à plus de 80 % des éliminations","Gagne une partie en jouant un rôle que tu maîtrises peu"]},{"name":"Défi Trool","items":["Choisis un champion au hasard parmi ceux que tu possèdes (mode adapté)","Change ton surnom vocal en « Baron des sbires » entre amis","Laisse ton équipe choisir ton skin avant de lancer la partie","Invente un cri de guerre avant chaque objectif majeur","Joue un duo de champions à thème en partie personnalisée","Nomme chaque objectif neutre avec un surnom ridicule","Fais une partie en félicitant chaque bonne action alliée","Tente une composition d'équipe colorée assortie entre amis"]},{"name":"Défi Spéciaux","items":["Participe à la destruction de la première tourelle","Gagne après avoir sécurisé le Baron Nashor en équipe","Joue trois champions de trois classes différentes sur trois parties","Remporte une partie avec une stratégie de vision coordonnée","Aide un allié à obtenir une série d'éliminations","Gagne une partie sans abandonner après un début difficile","Réussis une embuscade après avoir nettoyé les balises adverses","Fais la différence sur un combat autour du Dragon"]}]};
  const baselineKey = (slug, owner) => 'spingames.account.'+owner+'.devwebgames.'+slug+'.official-baseline.v1';
  const dirtyKey = (slug, owner) => 'spingames.account.'+owner+'.devwebgames.'+slug+'.dirty.v1';
  const readLocal = key => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  const writeLocal = (key, value) => { try { localStorage.setItem(key, value); return true; } catch (_) { return false; } };
  const removeLocal = key => { try { localStorage.removeItem(key); } catch (_) {} };
  function asCategories(value) {
    const list = Array.isArray(value) ? value : value?.categories;
    return Array.isArray(list) ? list : null;
  }
  function parseArray(raw) {
    if (!raw) return null;
    try { return asCategories(JSON.parse(raw)); }
    catch (_) { return null; }
  }
  function knownLegacy(slug, categories) {
    const old = legacyOfficial[slug];
    if (!Array.isArray(categories) || !old) return null;
    // Un défi identique prouve que la liste contient encore du contenu d'origine.
    // En l'absence de preuve, on conserve les modifications telles quelles.
    const match = categories.some(cat => {
      const origin = old.find(previous => previous.name === cat?.name);
      return origin && Array.isArray(cat.items) &&
        cat.items.some(item => origin.items.includes(item));
    });
    return match ? old : null;
  }
  function mergeOfficial(saved, previousBase, currentBase) {
    if (!Array.isArray(saved) || !Array.isArray(currentBase)) return saved;
    const previous = new Map((Array.isArray(previousBase) ? previousBase : [])
      .filter(c => c && typeof c.name === 'string').map(c => [c.name, c]));
    const combined = saved.map(c => ({
      ...c, items: Array.isArray(c?.items) ? [...c.items] : []
    }));
    for (const official of currentBase) {
      if (!official || typeof official.name !== 'string') continue;
      const old = previous.get(official.name);
      const own = combined.find(c => c?.name === official.name);
      if (!old) {
        // Nouvelle catégorie : la rendre disponible sans changer les roues cochées.
        if (!own) combined.push({ ...official,
          items: Array.isArray(official.items) ? [...official.items] : [],
          active: false
        });
        continue;
      }
      // Catégorie supprimée/renommée personnellement : ne pas la recréer.
      if (!own || !Array.isArray(official.items) || !Array.isArray(old.items)) continue;
      const oldItems = old.items;
      if (own.items.length === oldItems.length &&
          own.items.every((item, index) => item === oldItems[index])) {
        // Liste intacte : remplacer l'ancien contenu officiel (sans toucher aux
        // options personnelles : activation, nombre de tirages, style, etc.).
        own.items = [...official.items];
      } else {
        // Liste personnalisée : conserver modifications et suppressions de l'ancien
        // contenu ; n'ajouter que les défis réellement nouveaux depuis la base.
        const previousItems = new Set(oldItems);
        const personalItems = new Set(own.items);
        for (const item of official.items) {
          if (!previousItems.has(item) && !personalItems.has(item)) {
            own.items.push(item);
            personalItems.add(item);
          }
        }
      }
    }
    return combined;
  }
  // Fusion immédiate et locale, même si Supabase ne répond pas ou n'a pas encore
  // de sauvegarde pour ce jeu. Cette étape ne touche jamais à l'historique.
  function countShared(saved, baseline) {
    if (!Array.isArray(saved) || !Array.isArray(baseline)) return 0;
    return saved.reduce((sum, cat) => {
      const official = baseline.find(b => b?.name === cat?.name);
      if (!official || !Array.isArray(cat?.items) || !Array.isArray(official.items))
        return sum;
      const matches = new Set(official.items);
      return sum + cat.items.filter(item => matches.has(item)).length;
    }, 0);
  }
  function priorOfficial(slug, saved, baseline) {
    const legacy = knownLegacy(slug, saved);
    const base = asCategories(baseline);
    if (legacy && countShared(saved, legacy) > countShared(saved, base)) return legacy;
    return base || legacy;
  }
  function syncLocalOfficial(slug, current) {
    if (!user || slug !== currentSlug() || !slugs.includes(slug)) return false;
    const official = asCategories(current) || officialCategories(slug);
    if (!official) return false;
    const owner = user.id;
    const [localKey] = localKeys(slug, owner);
    const raw = readLocal(localKey);
    const saved = parseArray(raw);
    if (!saved) return false; // Aucune copie locale : laisser Supabase restaurer.
    const baseKey = baselineKey(slug, owner);
    const historical = priorOfficial(slug, saved, parseArray(readLocal(baseKey)));
    if (!historical) return false; // Ancienne base inconnue : ne rien inventer.
    const merged = mergeOfficial(saved, historical, official);
    const next = JSON.stringify(merged);
    if (next === JSON.stringify(saved)) {
      writeLocal(baseKey, JSON.stringify(official));
      return false;
    }
    const backup = 'spingames.backup.'+owner+'.'+slug+'.before-local-official-sync.v1';
    // Conserver la première copie d'origine pour pouvoir revenir en arrière.
    if (!readLocal(backup) && !writeLocal(backup, raw)) {
      console.warn('Copie de sécurité indisponible : fusion officielle annulée.');
      return false;
    }
    if (!writeLocal(localKey, next)) {
      console.warn('Stockage indisponible : fusion officielle annulée.');
      return false;
    }
    writeLocal(baseKey, JSON.stringify(official));
    writeLocal(dirtyKey(slug, owner), String(Date.now()));
    document.dispatchEvent(new CustomEvent('spingames:progress-ready', {
      detail: {slug, synced:true, local:true}
    }));
    if (restored.has(owner)) queueSave(slug, true);
    return true;
  }
  const registeredOfficial = new Map();
  function officialCategories(slug) {
    if (slug !== currentSlug()) return null;
    if (registeredOfficial.has(slug)) return registeredOfficial.get(slug);
    try {
      const node = document.getElementById('game-data');
      const data = node ? JSON.parse(node.textContent) : null;
      return Array.isArray(data?.categories) ? data.categories : null;
    } catch (_) { return null; }
  }
  const restoreJobs = new Map();
  async function saveProgress(slug, owner) {
    if (!client || !owner || owner !== user?.id || !slugs.includes(slug) ||
        !restored.has(owner)) return;
    const [categoriesKey, historyKey] = localKeys(slug, owner);
    let categories = null, history = null;
    try {
      categories = JSON.parse(readLocal(categoriesKey) || 'null');
      history = JSON.parse(readLocal(historyKey) || 'null');
    } catch (_) { return; }
    if (categories === null && history === null) return;
    const marker = readLocal(dirtyKey(slug, owner));
    const payload = {
      user_id: owner, game_slug: slug, categories,
      history: Array.isArray(history) ? history.slice(0, 10) : []
    };
    const official = officialCategories(slug) ||
      parseArray(readLocal(baselineKey(slug, owner)));
    if (official) payload.official_baseline = official;
    if (owner !== user?.id) return;
    const { error } = await client.from('player_progress')
      .upsert(payload, { onConflict: 'user_id,game_slug' });
    if (error) {
      console.warn('Sauvegarde en ligne indisponible :', error.message);
    } else if (owner === user?.id && marker &&
               marker === readLocal(dirtyKey(slug, owner))) {
      removeLocal(dirtyKey(slug, owner));
    }
  }
  function queueSave(slug, officialUpdate = false) {
    if (!slugs.includes(slug) || !user) return;
    const owner = user.id;
    // Un changement personnel non envoyé doit gagner sur une ancienne sauvegarde
    // distante. Une fusion officielle n'est pas une modification utilisateur.
    if (!officialUpdate) writeLocal(dirtyKey(slug, owner), String(Date.now()));
    clearTimeout(saveTimers.get(slug));
    saveTimers.set(slug, setTimeout(() => saveProgress(slug, owner), 1200));
  }
  async function restoreProgress() {
    if (!client || !user) return;
    const owner = user.id;
    if (restoreJobs.has(owner)) return restoreJobs.get(owner);
    const task = (async () => {
      const here = currentSlug();
      const atStart = here ? readLocal(localKeys(here, owner)[0]) : null;
      const { data, error } = await client.from('player_progress')
        .select('game_slug,categories,history,official_baseline')
        .eq('user_id', owner);
      if (owner !== user?.id) return;
      if (error) {
        // Une panne réseau ne doit jamais écraser les données d'un compte.
        console.warn('Lecture progression :', error.message);
        return;
      }
      const rows = new Map((data || [])
        .filter(row => slugs.includes(row.game_slug))
        .map(row => [row.game_slug, row]));
      const toCheck = new Set([...rows.keys(), ...(here && slugs.includes(here) ? [here] : [])]);
      const uploads = [];
      for (const slug of toCheck) {
        const row = rows.get(slug);
        const [catKey, histKey] = localKeys(slug, owner);
        const localRaw = readLocal(catKey);
        const localCategories = parseArray(localRaw);
        const hasLocalEdit = Boolean(readLocal(dirtyKey(slug, owner))) ||
          (slug === here && localRaw !== atStart);
        const localWins = hasLocalEdit && Array.isArray(localCategories);
        const categories = localWins
          ? localCategories
          : (asCategories(row?.categories) || localCategories);
        const baseline = localWins
          ? (parseArray(readLocal(baselineKey(slug, owner))) ||
             (asCategories(row?.official_baseline)))
          : (asCategories(row?.official_baseline)
             || parseArray(readLocal(baselineKey(slug, owner))));
        const official = officialCategories(slug);
        const legacy = knownLegacy(slug, categories);
        // Une base locale plus récente ne doit pas masquer un ancien contenu
        // officiel encore présent dans une sauvegarde distante.
        const baselineFits = Array.isArray(baseline) && Array.isArray(categories) &&
          categories.some(cat => {
            const before = baseline.find(b => b?.name === cat?.name);
            return before && Array.isArray(cat.items) && Array.isArray(before.items) &&
              cat.items.some(item => before.items.includes(item));
          });
        const historical = baselineFits ? baseline : (legacy || baseline);
        const merged = official && Array.isArray(categories)
          ? mergeOfficial(categories, historical, official) : categories;
        const mergedRaw = Array.isArray(merged) ? JSON.stringify(merged) : null;
        if (mergedRaw && mergedRaw !== localRaw) {
          const before = Array.isArray(categories) ? JSON.stringify(categories) : null;
          // Sauvegarde locale non destructive de l'état avant la première migration.
          if (before && before !== mergedRaw) {
            const backup = 'spingames.backup.'+owner+'.'+slug+'.before-official-sync.v1';
            if (!readLocal(backup)) writeLocal(backup, before);
          }
          if (localRaw && !localWins && Array.isArray(asCategories(row?.categories)) &&
              JSON.stringify(asCategories(row.categories)) !== localRaw) {
            const previousLocal = 'spingames.backup.'+owner+'.'+slug+'.before-cloud-restore.v1';
            if (!readLocal(previousLocal)) writeLocal(previousLocal, localRaw);
          }
          writeLocal(catKey, mergedRaw);
        }
        if (!localWins && Array.isArray(row?.history)) {
          writeLocal(histKey, JSON.stringify(row.history));
        }
        if (official) {
          // Base précédente enregistrée localement pour les mises à jour futures,
          // même lorsqu'aucun enregistrement Supabase n'existe encore.
          writeLocal(baselineKey(slug, owner), JSON.stringify(official));
        }
        if (Array.isArray(merged)) {
          if (!row || !asCategories(row.categories) || localWins ||
              (official && (!asCategories(row.official_baseline) ||
                JSON.stringify(row.official_baseline) !== JSON.stringify(official))) ||
              (asCategories(row.categories) &&
                JSON.stringify(asCategories(row.categories)) !== mergedRaw)) {
            uploads.push(slug);
          }
        }
        if (slug === here) {
          document.dispatchEvent(new CustomEvent('spingames:progress-ready', {
            detail: { slug, synced: Boolean(official) }
          }));
        }
      }
      restored.add(owner);
      for (const slug of uploads) queueSave(slug, true);
    })();
    restoreJobs.set(owner, task);
    try { await task; }
    finally { if (restoreJobs.get(owner) === task) restoreJobs.delete(owner); }
  }
  const api = {
    get user() { return user; },
    get client() { return client; },
    queueSave,
    syncLocalOfficial,
    registerOfficialCategories(slug, categories) {
      if (slug !== currentSlug() || !slugs.includes(slug) ||
          !Array.isArray(categories)) return;
      const old = registeredOfficial.get(slug);
      if (old && JSON.stringify(old) === JSON.stringify(categories)) return;
      registeredOfficial.set(slug, categories);
      if (!user) return;
      syncLocalOfficial(slug, categories);
      const owner = user.id, pending = restoreJobs.get(owner);
      const resume = () => { if (user?.id === owner) void restoreProgress(); };
      // Laisser se terminer une restauration lancée avant le chargement des
      // catégories officielles (cas de l'iframe SimSpin).
      if (pending) void pending.then(() => setTimeout(resume, 0),
                                      () => setTimeout(resume, 0));
      else void restoreProgress();
    },
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
