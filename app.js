/* =====================================================
   MOGS CARD — app.js
   Monad Mogs public API + unavatar.io
   CC0 assets — credit monadmogs.xyz

   API: https://api.monadmogs.xyz/api/v0

   GET /mogs/{id}  → single unified endpoint:
   {
     tokenId, name,
     attributes: [{ trait_type, value }],
     traits: { Background, Body, ... },
     rarity: {
       rank, tier, score, percentile,
       attributes: [{ trait_type, value, frequency, percentage, score }]
     }
   }

   GET /mogs/{id}/render  → SVG pixel art
   ===================================================== */

'use strict';

// =====================================================
// CONSTANTS
// =====================================================

// Localhost → proxy.js  |  Vercel production → /api/proxy (serverless function)
const IS_LOCAL = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE = IS_LOCAL ? '/proxy/v0'  : '/api/proxy/v0';
const PFP_BASE = IS_LOCAL ? '/pfp'       : '/api/pfp';

const MOGS_SITE  = 'https://monadmogs.xyz/';
const MOGS_TOTAL = 5000;

// =====================================================
// RARITY CONFIG
// =====================================================

const RARITY = {
  legendary: {
    label: '👑 LEGENDARY',
    badgeClass: 'rb-legendary',
    color: '#F5C518',
    glow: 'rgba(245,197,24,0.4)',
    hpTint: '#F5C518',
    specialMove: true,
    memeTitle: (id) => `THE CHOSEN ONE #${id} 👑`,
    catchphrase: 'Only 1% of players have witnessed this power.',
  },
  epic: {
    label: '🔥 EPIC',
    badgeClass: 'rb-epic',
    color: '#C084FC',
    glow: 'rgba(192,132,252,0.35)',
    hpTint: '#C084FC',
    specialMove: true,
    memeTitle: (id) => `CERTIFIED DEGEN #${id} 🔥`,
    catchphrase: 'Born in a bear market. Raised by Discord.',
  },
  rare: {
    label: '💎 RARE',
    badgeClass: 'rb-rare',
    color: '#60A5FA',
    glow: 'rgba(96,165,250,0.3)',
    hpTint: '#60A5FA',
    specialMove: true,
    memeTitle: (id) => `PROBABLY NOTHING #${id} 💎`,
    catchphrase: 'Ser, your mog is rarer than your social skills.',
  },
  uncommon: {
    label: '🌿 UNCOMMON',
    badgeClass: 'rb-uncommon',
    color: '#4ADE80',
    glow: 'rgba(74,222,128,0.25)',
    hpTint: '#4ADE80',
    specialMove: false,
    memeTitle: (id) => `HOPIUM ENJOYER #${id} 🌿`,
    catchphrase: 'NGMI... but at least they\'re cute.',
  },
  common: {
    label: '⚪ COMMON',
    badgeClass: 'rb-common',
    color: '#9BA3AF',
    glow: 'rgba(155,163,175,0.2)',
    hpTint: '#9BA3AF',
    specialMove: false,
    memeTitle: (id) => `SER THIS IS A HAMSTER #${id} 🐹`,
    catchphrase: 'Every legend started as a common. Probably.',
  },
};

// =====================================================
// TRAIT EMOJIS (category → emoji)
// =====================================================

const TRAIT_EMOJI_MAP = [
  [['background', 'bg'],                '🌐'],
  [['body', 'fur', 'skin', 'color'],    '🐹'],
  [['eye', 'eyes'],                     '👁️'],
  [['head', 'hat', 'cap', 'crown'],     '🎩'],
  [['mouth', 'expression', 'face'],     '💬'],
  [['outfit', 'clothes', 'shirt'],      '👕'],
  [['accessory', 'item', 'held'],       '💍'],
  [['special', 'power', 'ability'],     '⚡'],
  [['glasses', 'eyewear'],             '🕶️'],
  [['tail'],                            '🐾'],
  [['aura'],                            '✨'],
  [['glitch'],                          '👾'],
  [['hands', 'hand'],                   '🤲'],
  [['meme', 'tag'],                     '🐸'],
  [['whiskers', 'beard'],               '〰️'],
];

function getTraitEmoji(category = '') {
  const lc = category.toLowerCase();
  for (const [keys, emoji] of TRAIT_EMOJI_MAP) {
    if (keys.some(k => lc.includes(k))) return emoji;
  }
  return '✨';
}

// =====================================================
// MEME TRAIT DESCRIPTIONS
// Makes boring trait names actually funny
// =====================================================

const MEME_CAT = {
  background:  (v) => `vibes: ${v}`,
  body:        (v) => `body check: ${v}`,
  fur:         (v) => `fur coat: ${v} (drip +99)`,
  eyes:        (v) => `market view: ${v}`,
  eye:         (v) => `market view: ${v}`,
  head:        (v) => `skull fashion: ${v}`,
  hat:         (v) => `drip piece: ${v}`,
  mouth:       (v) => `irl he says "${v}"`,
  expression:  (v) => `when chart goes ${v}`,
  outfit:      (v) => `fit check: ${v}`,
  accessory:   (v) => `the ${v} adds +50 clout`,
  special:     (v) => `secret power: ${v}`,
  glasses:     (v) => `prescription: ${v}`,
  tail:        (v) => `tail game: ${v}`,
  aura:        (v) => `aura level: ${v} 🧿`,
  glitch:      (v) => v === 'None' ? `no glitches (boring but safe)` : `GLITCHED: ${v} ⚠️`,
  hands:       (v) => `hand game: ${v}`,
  meme:        (v) => `energy: "${v}"`,
  tag:         (v) => `energy: "${v}"`,
  default:     (v) => v,
};

function getMemeCat(category = '', value = '') {
  const lc = category.toLowerCase();
  for (const [key, fn] of Object.entries(MEME_CAT)) {
    if (key !== 'default' && lc.includes(key)) return fn(value);
  }
  return MEME_CAT.default(value);
}

// =====================================================
// SPECIAL MOVES
// =====================================================

const SPECIAL_MOVES = {
  legendary: {
    name: 'MONAD MAXXING 👑',
    desc: 'Goes so hard validators start crying. Doubles opponent\'s gas fees. Cannot be countered.',
  },
  epic: {
    name: 'DEGEN SPIRAL 🌀',
    desc: 'Market crashes but this Mog buys more. ATK doubled on all leverage plays.',
  },
  rare: {
    name: 'DIAMOND PAWS 💎',
    desc: 'Refuses to sell at any price. Full immunity to FUD for 3 rounds. Ser is built different.',
  },
};

// =====================================================
// TYPE SYSTEM
// Derived from traits + rarity, Pokémon-style element
// =====================================================

const TYPE_PRIORITY = [
  { test: (tv)       => tv.glitch && tv.glitch !== 'none' && tv.glitch !== 'n/a', type: '👾 GLITCH',  color: '#C084FC', bg: 'rgba(192,132,252,0.15)', cssClass: 'type-glitch' },
  { test: (tv)       => tv.aura?.includes('legendary'),  type: '👑 DIVINE',   color: '#F5C518', bg: 'rgba(245,197,24,0.12)'  },
  { test: (tv)       => tv.aura?.includes('finalized'),  type: '✅ CHAIN',    color: '#4ADE80', bg: 'rgba(74,222,128,0.10)'  },
  { test: (tv)       => tv.eyes?.includes('laser'),      type: '⚡ LASER',    color: '#60A5FA', bg: 'rgba(96,165,250,0.10)'  },
  { test: (tv)       => tv.eyes?.includes('terminal'),   type: '💻 CYBER',    color: '#4ADE80', bg: 'rgba(74,222,128,0.10)'  },
  { test: (tv)       => tv.eyes?.includes('money'),      type: '💰 DEGEN',    color: '#F5C518', bg: 'rgba(245,197,24,0.12)'  },
  { test: (tv)       => tv.eyes?.includes('heart'),      type: '💖 LOVER',    color: '#F472B6', bg: 'rgba(244,114,182,0.10)' },
  { test: (tv)       => tv.eyes?.includes('star'),       type: '⭐ GALAXY',   color: '#A594FF', bg: 'rgba(165,148,255,0.10)' },
  { test: (tv)       => tv.body?.includes('golden'),     type: '🥇 GOLDEN',   color: '#F5C518', bg: 'rgba(245,197,24,0.12)'  },
  { test: (tv)       => tv.body?.includes('rainbow'),    type: '🌈 PRISM',    color: '#A594FF', bg: 'rgba(165,148,255,0.10)' },
  { test: (tv)       => tv.body?.includes('ghost'),      type: '👻 PHANTOM',  color: '#CBD5E1', bg: 'rgba(203,213,225,0.08)' },
  { test: (tv)       => tv.body?.includes('zombie'),     type: '🧟 UNDEAD',   color: '#4ADE80', bg: 'rgba(74,222,128,0.10)'  },
  { test: (tv, tier) => tier === 'legendary',            type: '⚡ VOID',     color: '#F5C518', bg: 'rgba(245,197,24,0.12)'  },
  { test: (tv, tier) => tier === 'epic',                 type: '🔥 INFERNO',  color: '#C084FC', bg: 'rgba(192,132,252,0.12)' },
  { test: (tv, tier) => tier === 'rare',                 type: '💎 CRYSTAL',  color: '#60A5FA', bg: 'rgba(96,165,250,0.10)'  },
  { test: (tv, tier) => tier === 'uncommon',             type: '🌿 NATURE',   color: '#4ADE80', bg: 'rgba(74,222,128,0.10)'  },
  { test: ()         => true,                            type: '⚪ ORIGIN',   color: '#9BA3AF', bg: 'rgba(155,163,175,0.08)' },
];

function getTraitValues(traits) {
  const get = (...keys) => {
    const t = traits.find(tr => keys.some(k => (tr.trait_type || '').toLowerCase().includes(k)));
    return (t?.value || '').toLowerCase();
  };
  return {
    eyes:   get('eye', 'eyes'),
    body:   get('body', 'fur', 'skin'),
    aura:   get('aura'),
    glitch: get('glitch'),
    head:   get('head', 'hat', 'cap', 'crown'),
    mouth:  get('mouth', 'expression'),
    hands:  get('hand'),
    tag:    get('meme', 'tag'),
    bg:     get('background'),
  };
}

function getCardType(traits, tier) {
  const tv = getTraitValues(traits);
  return TYPE_PRIORITY.find(r => r.test(tv, tier)) || TYPE_PRIORITY[TYPE_PRIORITY.length - 1];
}

// =====================================================
// STATS — ATK / DEF / SPD
// Derived from rarity score, rank, and trait frequencies
// =====================================================

function calcStats(rarity, traits) {
  const rank = parseInt(rarity.rank) || 2500;

  // ATK: raw power from rank (rank 1 → 250, rank 5000 → 30)
  const atk = Math.min(250, Math.max(30, Math.round(30 + ((5000 - rank) / 4999) * 220)));

  // DEF: resilience from rank, more compressed range (rank 1 → 200, rank 5000 → 50)
  const def = Math.min(200, Math.max(50, Math.round(50 + ((5000 - rank) / 4999) * 150)));

  // SPD: trait frequency — rarer traits = faster/harder to predict
  const pcts   = traits.map(t => parseFloat(t.percentage) || 50).filter(p => !isNaN(p));
  const avgPct = pcts.length ? pcts.reduce((s, p) => s + p, 0) / pcts.length : 50;
  const spd    = Math.min(250, Math.max(30, Math.round(250 - avgPct * 1.5)));

  return { atk, def, spd };
}

// =====================================================
// RARITY PERCENTAGE CLASS
// =====================================================

function getPctClass(pct) {
  const n = parseFloat(pct) || 100;
  if (n < 1.5)  return 'pct-legendary';
  if (n < 4)    return 'pct-epic';
  if (n < 12)   return 'pct-rare';
  if (n < 25)   return 'pct-uncommon';
  return 'pct-common';
}

// =====================================================
// HP CALCULATION
// Rank 1 = 999 HP, Rank 5000 = 100 HP (linear)
// =====================================================

function calcHP(rank) {
  const r = parseInt(rank) || 2500;
  // Map rank 1→999, rank 5000→100
  const hp = Math.round(999 - ((r - 1) / (MOGS_TOTAL - 1)) * 899);
  return Math.min(999, Math.max(100, hp));
}

// =====================================================
// MEME NAME GENERATOR
// =====================================================

function generateMemeName(tier, traits, mogId) {
  const cfg  = RARITY[tier] || RARITY.common;
  const list = Array.isArray(traits) ? traits : [];

  // Helper to get trait value by category keyword
  const getVal = (...keys) => {
    const t = list.find(tr =>
      keys.some(k => (tr.trait_type || '').toLowerCase().includes(k))
    );
    return (t?.value || '').toLowerCase();
  };

  const ev = getVal('eye', 'eyes');
  const hv = getVal('head', 'hat', 'cap', 'crown');
  const bv = getVal('body', 'fur', 'skin');
  const av = getVal('aura');
  const mv = getVal('mouth');
  const gv = getVal('glitch');
  const tv = getVal('meme', 'tag');

  // Monad Mogs specific trait combos
  if (ev.includes('terminal'))     return `TERMINAL ENJOYER #${mogId} 💻`;
  if (ev.includes('laser'))        return `THE LASER DEGEN #${mogId} ⚡`;
  if (ev.includes('heart'))        return `LOVE IS THE PLAY #${mogId} 💖`;
  if (ev.includes('money'))        return `MONEY ON THE MIND #${mogId} 💰`;
  if (ev.includes('star'))         return `GALAXY BRAIN #${mogId} ⭐`;
  if (hv.includes('validator'))    return `THE VALIDATOR MAXI #${mogId} ✅`;
  if (hv.includes('crown'))        return `SER WITH THE CROWN #${mogId} 👑`;
  if (hv.includes('wizard'))       return `THE WIZARD DEGEN #${mogId} 🧙`;
  if (hv.includes('cowboy'))       return `HOWDY PARTNER #${mogId} 🤠`;
  if (hv.includes('party'))        return `LFG PARTY MOG #${mogId} 🎉`;
  if (hv.includes('chef'))         return `THE CHEF IS IN #${mogId} 👨‍🍳`;
  if (bv.includes('golden'))       return `GOLDEN DEGEN #${mogId} 🥇`;
  if (bv.includes('rainbow'))      return `RAINBOW MAXI #${mogId} 🌈`;
  if (bv.includes('ghost'))        return `GM FROM THE OTHER SIDE #${mogId} 👻`;
  if (bv.includes('zombie'))       return `UNDEAD AND ONCHAIN #${mogId} 🧟`;
  if (av.includes('finalized'))    return `BLOCK FINALIZED SER #${mogId} ✅`;
  if (av.includes('legendary'))    return `AURA SO GOOD IT\'S ILLEGAL #${mogId} ⚡`;
  if (gv && gv !== 'none')         return `GLITCHED BUT BULLISH #${mogId} 👾`;
  if (mv.includes('gmonad'))       return `GM FROM MONAD CHAIN #${mogId} 🐹`;
  if (tv.includes('monanimal'))    return `MONANIMAL ENERGY #${mogId} 🦁`;

  return cfg.memeTitle(mogId);
}

// =====================================================
// NORMALIZE API RESPONSES
// Real format: /rarity returns { rank, tier, score, attributes[] }
// attributes[]: { trait_type, value, frequency, percentage, score }
// =====================================================

function normalizeTraits(data) {
  // /rarity endpoint — attributes array with percentage
  if (Array.isArray(data?.attributes)) return data.attributes;
  // /traits endpoint fallback
  if (Array.isArray(data?.attributes)) return data.attributes;
  if (Array.isArray(data))             return data;
  if (Array.isArray(data?.traits))     return data.traits;
  return [];
}

function normalizeRarity(data) {
  return {
    rank:       data?.rank        ?? '?',
    tier:       (data?.tier       ?? 'common').toLowerCase(),
    score:      data?.score       ?? 500,
    percentile: data?.percentile  ?? null,
    // Rich attributes (with percentage) come from the same rarity response
    attributes: Array.isArray(data?.attributes) ? data.attributes : [],
  };
}

function getTraitPct(trait) {
  // Real field from /rarity: percentage (e.g. 11.58)
  return trait?.percentage
      ?? trait?.frequency_percent
      ?? trait?.percent
      ?? null;
}

// =====================================================
// API CALLS
// =====================================================

async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${txt || url}`);
  }
  return res.json();
}

async function fetchMogData(mogId) {
  // Single unified request — /mogs/{id} returns name + traits + rarity all at once
  const data   = await apiFetch(`${API_BASE}/mogs/${mogId}`);

  // Rarity data lives in data.rarity
  const rarity = normalizeRarity(data.rarity);

  // Use rarity.attributes (has percentage/score) if available, else fall back to data.attributes
  const traits = rarity.attributes.length
    ? rarity.attributes
    : normalizeTraits(data);

  // Fetch raw SVG and inject inline for perfect dom-to-image rendering
  let svgText = '<div class="render-placeholder">🐹</div>';
  try {
    const svgRes = await fetch(`${API_BASE}/mogs/${mogId}/render`);
    if (svgRes.ok) {
      let rawSvg = await svgRes.text();
      if (rawSvg.includes('<svg ')) {
        rawSvg = rawSvg.replace('<svg ', '<svg width="100%" height="100%" ');
      }
      svgText = rawSvg;
    }
  } catch (err) {
    console.error('Failed to fetch SVG render', err);
  }

  return { traits, rarity, svgText, name: data.name };
}

// =====================================================
// CARD BUILDER
// Assembles the DOM card from fetched data
// =====================================================

function buildCard(mogId, xHandle, traits, rarity, pfpUrl, svgText) {
  const card = document.getElementById('mog-card');

  const tier    = RARITY[rarity.tier] ? rarity.tier : 'common';
  const cfg     = RARITY[tier];
  const rank    = rarity.rank;
  const score   = Math.round(parseFloat(rarity.score) || 0);
  const hp      = calcHP(rank);
  const hpPct   = Math.min(100, (hp / 999) * 100);

  const memeName = generateMemeName(tier, traits, mogId);
  const cardType = getCardType(traits, tier);
  const stats    = calcStats(rarity, traits);

  // Percentile badge ("TOP 0.02%")
  let percentileHTML = '';
  const pctRaw = rarity.percentile;
  const pctNum = parseFloat(pctRaw);
  if (!isNaN(pctNum) && pctNum > 0) {
    const pctDisplay = pctNum < 0.1 ? pctNum.toFixed(2) : pctNum < 1 ? pctNum.toFixed(1) : pctNum.toFixed(0);
    percentileHTML = `<span class="percentile-badge">TOP ${pctDisplay}%</span>`;
  } else if (rank && rank !== '?') {
    const fallback = (parseInt(rank) / 5000 * 100).toFixed(1);
    percentileHTML = `<span class="percentile-badge">TOP ${fallback}%</span>`;
  }

  // Apply rarity CSS vars + bg class
  card.style.setProperty('--rarity-color', cfg.color);
  card.style.setProperty('--rarity-glow',  cfg.glow);
  card.className = `mog-card card-bg-${tier}`;
  card.classList.remove('is-flipped');

  const traitSlice = traits
    .filter(t => { const v = (t.value ?? '').toLowerCase(); return v !== 'none' && v !== '' && v !== 'n/a'; })
    .slice(0, 5);

  const traitRowsHTML = traitSlice.map(trait => {
    const category = trait.trait_type ?? trait.category ?? trait.key ?? 'Trait';
    const value    = trait.value      ?? trait.trait_value ?? trait.val ?? '???';
    const pct      = getTraitPct(trait);
    const pn       = pct !== null ? parseFloat(pct) : null;
    const pctLabel = pn !== null ? `${pn.toFixed(1)}%` : '?%';
    const pctClass = pn !== null ? getPctClass(pn) : 'pct-common';
    const emoji    = getTraitEmoji(category);
    const memeDesc = getMemeCat(category, value);
    return `
      <div class="trait-row">
        <span class="trait-emoji" aria-hidden="true">${emoji}</span>
        <div class="trait-info">
          <span class="trait-cat">${escHtml(category)}</span>
          <span class="trait-val" title="${escHtml(memeDesc)}">${escHtml(memeDesc)}</span>
        </div>
        <span class="trait-pct ${pctClass}">${pctLabel}</span>
      </div>`;
  }).join('');

  const specialHTML = cfg.specialMove && SPECIAL_MOVES[tier] ? `
    <div class="card-special">
      <div class="special-header"><span class="special-label">⚡ SPECIAL MOVE</span></div>
      <div class="special-move-name">${escHtml(SPECIAL_MOVES[tier].name)}</div>
      <div class="special-move-desc">${escHtml(SPECIAL_MOVES[tier].desc)}</div>
    </div>` : '';

  card.innerHTML = `
  <div class="card-flip-inner" id="card-flip-inner">

    <!-- ═══ FRONT FACE ═══ -->
    <div class="card-front-face" id="card-front-face">
      <div class="card-watermark-text" aria-hidden="true">
        <span class="watermark-inner">🐹 MONAD MOGS 🐹 MONAD MOGS 🐹 MONAD MOGS</span>
      </div>
      <div class="card-shine-dot" aria-hidden="true"></div>
      <div class="card-click-hint" aria-hidden="true">↺ FLIP</div>

      <!-- HEADER -->
      <div class="card-header">
        <div class="ch-left">
          <span class="ch-collection">⚡ MONAD MOGS · CC0</span>
          <span class="ch-id">MOG #${mogId}</span>
        </div>
        <div class="ch-right">
          <span class="type-badge ${cardType.cssClass || ''}" style="color:${cardType.color};background:${cardType.bg}">${escHtml(cardType.type)}</span>
          <span class="rarity-badge ${cfg.badgeClass}" aria-label="Rarity: ${tier}">${cfg.label}</span>
        </div>
      </div>

      <!-- MEDIA ROW -->
      <div class="card-media-row">
        <div class="pfp-col">
          <div class="pfp-ring-wrap">
            <div class="pfp-ring-bg" aria-hidden="true"></div>
            <div class="pfp-ring-inner" aria-hidden="true"></div>
            <img class="card-pfp-img" src="${escHtml(pfpUrl)}"
              alt="@${escHtml(xHandle)} profile picture" loading="eager" crossorigin="anonymous"
              onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2282%22 height=%2282%22%3E%3Ccircle cx=%2241%22 cy=%2241%22 r=%2241%22 fill=%22%231C1735%22/%3E%3Ctext x=%2241%22 y=%2255%22 text-anchor=%22middle%22 font-size=%2234%22%3E🐹%3C/text%3E%3C/svg%3E';this.onerror=null;">
          </div>
          <span class="pfp-handle-tag" aria-label="X handle">@${escHtml(xHandle)}</span>
        </div>
        <div class="render-col">${svgText}</div>
      </div>

      <!-- NAME, PERCENTILE, HP, STATS -->
      <div class="card-name-section">
        <div class="name-percentile-row">
          <div class="card-meme-name">${escHtml(memeName)}</div>
          ${percentileHTML}
        </div>
        <div class="hp-row" role="meter" aria-label="HP: ${hp}" aria-valuenow="${hp}" aria-valuemin="100" aria-valuemax="999">
          <span class="hp-label" aria-hidden="true">HP</span>
          <div class="hp-track" aria-hidden="true">
            <div class="hp-fill" id="hp-fill-bar"
              style="width:0%;background:linear-gradient(90deg,var(--monad-purple-dark),${escHtml(cfg.hpTint)});"
              data-target="${hpPct.toFixed(1)}"></div>
          </div>
          <span class="hp-value" aria-hidden="true">${hp}</span>
        </div>
        <div class="card-stats" aria-label="Base stats">
          <div class="stat-item"><span class="stat-label">ATK</span><span class="stat-value stat-atk">${stats.atk}</span></div>
          <span class="stat-divider" aria-hidden="true">·</span>
          <div class="stat-item"><span class="stat-label">DEF</span><span class="stat-value stat-def">${stats.def}</span></div>
          <span class="stat-divider" aria-hidden="true">·</span>
          <div class="stat-item"><span class="stat-label">SPD</span><span class="stat-value stat-spd">${stats.spd}</span></div>
        </div>
      </div>

      <div class="card-divider" aria-hidden="true"></div>

      <!-- TRAITS -->
      <div class="card-traits">
        <div class="traits-header" aria-hidden="true">— BATTLE TRAITS —</div>
        ${traitRowsHTML || '<div class="trait-row"><span class="trait-emoji">🤷</span><div class="trait-info"><span class="trait-cat">TRAITS</span><span class="trait-val">No traits found, ser</span></div></div>'}
      </div>

      ${specialHTML}

      <!-- FOOTER -->
      <div class="card-footer">
        <div class="cf-rank">RANK <span class="cf-rank-num">#${rank}</span><br>OF ${MOGS_TOTAL.toLocaleString()} MOGS</div>
        <div class="cf-score">SCORE<br><span class="cf-score-num">${score.toLocaleString()}</span></div>
        <div class="cf-credit">🐹 CC0 ASSET<br><a href="${MOGS_SITE}" target="_blank" rel="noopener noreferrer">monadmogs.xyz</a></div>
      </div>

    </div><!-- /card-front-face -->

    <!-- ═══ BACK FACE ═══ -->
    <div class="card-back-face" id="card-back-face">
      ${buildCardBack(mogId, xHandle, tier, cfg, cardType, stats)}
    </div>

  </div><!-- /card-flip-inner -->
  `;

  requestAnimationFrame(() => {
    setTimeout(() => {
      const fill = document.getElementById('hp-fill-bar');
      if (fill) fill.style.width = fill.dataset.target + '%';
    }, 200);
  });
}

// =====================================================
// CARD BACK BUILDER
// =====================================================

function buildCardBack(mogId, xHandle, tier, cfg, cardType, stats) {
  const GAMES = [
    { icon: '🪨', name: 'ROCK-PAPER-SCISSORS', format: 'BEST OF 5' },
    { icon: '🪙', name: 'COIN FLIP',            format: 'BEST OF 3' },
    { icon: '🎲', name: 'DICE DUEL',            format: 'BEST OF 3' },
    { icon: '📈', name: 'HIGHER-LOWER',          format: 'BEST OF 3' },
  ];

  const gamesHTML = GAMES.map(g => `
    <div class="back-game-row">
      <span class="back-game-icon">${g.icon}</span>
      <span class="back-game-name">${escHtml(g.name)}</span>
      <span class="back-game-format">${escHtml(g.format)}</span>
    </div>`).join('');

  const atkPct = ((stats.atk - 50) / 200 * 100).toFixed(0);
  const defPct = ((stats.def - 50) / 200 * 100).toFixed(0);
  const spdPct = ((stats.spd - 50) / 200 * 100).toFixed(0);

  const specialNote = cfg.specialMove
    ? `Free special move in Dice Duel &amp; Higher-Lower`
    : `Burn 1,000 $MOGS to unlock special move`;

  return `
    <div class="back-header-section">
      <div class="back-logo-text">🐹 MONAD MOGS</div>
      <div class="back-type-pill" style="color:${cardType.color};background:${cardType.bg}">${escHtml(cardType.type)}</div>
      <div class="back-mog-id">MOG #${mogId} · @${escHtml(xHandle)}</div>
    </div>

    <div class="back-stats-section">
      <div class="back-section-label">— BASE STATS —</div>
      <div class="back-stat-row">
        <span class="back-stat-name">ATK</span>
        <div class="back-stat-track"><div class="back-stat-fill back-stat-fill-atk" style="width:${atkPct}%"></div></div>
        <span class="back-stat-num">${stats.atk}</span>
      </div>
      <div class="back-stat-row">
        <span class="back-stat-name">DEF</span>
        <div class="back-stat-track"><div class="back-stat-fill back-stat-fill-def" style="width:${defPct}%"></div></div>
        <span class="back-stat-num">${stats.def}</span>
      </div>
      <div class="back-stat-row">
        <span class="back-stat-name">SPD</span>
        <div class="back-stat-track"><div class="back-stat-fill back-stat-fill-spd" style="width:${spdPct}%"></div></div>
        <span class="back-stat-num">${stats.spd}</span>
      </div>
    </div>

    <div class="back-games-section">
      <div class="back-section-label">— ARENA GAMES —</div>
      ${gamesHTML}
      <div class="back-special-note">${specialNote}</div>
    </div>

    <div class="back-footer-section">
      <div class="back-contract">CONTRACT · 0x1414...5137</div>
      <div class="back-chain">MONAD MAINNET · CHAIN ID 143</div>
    </div>

    <div class="back-flip-hint">↺ FLIP BACK</div>
  `;
}

// =====================================================
// MOUSE PARALLAX + SHIMMER
// =====================================================

function initCardInteraction(card) {
  const flipInner = card.querySelector('.card-flip-inner');
  const frontFace = card.querySelector('.card-front-face');
  const shineDot  = card.querySelector('.card-shine-dot');

  card.addEventListener('mousemove', (e) => {
    if (card.classList.contains('is-flipped')) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top)  / rect.height;
    const tiltX = (y - 0.5) * -18;
    const tiltY = (x - 0.5) *  18;
    if (flipInner) flipInner.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.05,1.05,1.05)`;
    if (frontFace) {
      frontFace.style.setProperty('--mouse-x', `${(x * 100).toFixed(1)}%`);
      frontFace.style.setProperty('--mouse-y', `${(y * 100).toFixed(1)}%`);
    }
    if (shineDot) {
      shineDot.style.left = `${e.clientX - rect.left}px`;
      shineDot.style.top  = `${e.clientY - rect.top}px`;
    }
  });

  card.addEventListener('mouseleave', () => {
    if (card.classList.contains('is-flipped')) return;
    if (flipInner) flipInner.style.transform = '';
    if (frontFace) {
      frontFace.style.removeProperty('--mouse-x');
      frontFace.style.removeProperty('--mouse-y');
    }
  });

  card.addEventListener('touchmove', (e) => {
    if (card.classList.contains('is-flipped')) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect  = card.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / rect.width;
    const y = (touch.clientY - rect.top)  / rect.height;
    if (flipInner) flipInner.style.transform = `rotateX(${(y-0.5)*-10}deg) rotateY(${(x-0.5)*10}deg)`;
  }, { passive: false });

  card.addEventListener('touchend', () => {
    if (card.classList.contains('is-flipped')) return;
    if (flipInner) flipInner.style.transform = '';
  });

  // Click anywhere on card to flip
  card.addEventListener('click', () => {
    if (flipInner) flipInner.style.transform = ''; // clear tilt before flip
    card.classList.toggle('is-flipped');
  });
}


// =====================================================
// TWEET CARD
// =====================================================

function tweetCard(mogId, xHandle, tier, memeName) {
  const cfg = RARITY[tier] || RARITY.common;
  const text = [
    `just pulled my mogs card 🐹`,
    ``,
    `${cfg.label} · MOG #${mogId}`,
    `"${memeName}"`,
    ``,
    `generate yours 👇`,
    `https://www.monadmogs.xyz/#studio`,
  ].join('\n');
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
}

// =====================================================
// FONT EMBEDDING UTILITY
// dom-to-image can't follow <link> stylesheets for Google Fonts —
// we fetch & inline them as base64 once, then inject before capture.
// =====================================================

let _cachedFontCSS = null;

function _bufToB64(buf) {
  const bytes = new Uint8Array(buf);
  const CHUNK = 8192;
  let str = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    str += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(str);
}

async function embedGoogleFonts() {
  if (_cachedFontCSS !== null) return _cachedFontCSS;

  const GFONTS = 'https://fonts.googleapis.com/css2?family=Bangers&family=Press+Start+2P&family=Rajdhani:wght@400;600;700&display=swap';

  try {
    const cssText = await fetch(GFONTS).then(r => r.text());

    // Collect all font file URLs (fonts.gstatic.com)
    const urls = [...cssText.matchAll(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g)]
      .map(m => m[1]);

    let inlined = cssText;
    const fetches = await Promise.allSettled(
      urls.map(async url => {
        const buf  = await fetch(url).then(r => r.arrayBuffer());
        const mime = url.includes('.woff2') ? 'font/woff2' : 'font/woff';
        return { url, data: `data:${mime};base64,${_bufToB64(buf)}` };
      })
    );

    fetches.forEach(r => {
      if (r.status === 'fulfilled') {
        inlined = inlined.replaceAll(r.value.url, r.value.data);
      }
    });

    _cachedFontCSS = inlined;
  } catch (e) {
    console.warn('[fonts] Google Fonts embedding failed — fallback fonts in PNG:', e);
    _cachedFontCSS = '';
  }

  return _cachedFontCSS;
}

// =====================================================
// DOWNLOAD (dom-to-image-more)
// =====================================================

async function downloadCard() {
  const captureEl  = document.getElementById('card-front-face');
  const card       = document.getElementById('mog-card');
  const flipInner  = document.getElementById('card-flip-inner');
  const btn        = document.getElementById('download-btn');

  if (!window.domtoimage || !captureEl) {
    alert('Download library not loaded yet. Please wait a moment and try again.');
    return;
  }

  btn.textContent = '⏳ Rendering...';
  btn.disabled    = true;

  // Pre-embed Google Fonts
  const fontCSS     = await embedGoogleFonts();
  let   fontStyleEl = null;
  if (fontCSS) {
    fontStyleEl = document.createElement('style');
    fontStyleEl.id          = '__dl_fonts__';
    fontStyleEl.textContent = fontCSS;
    document.head.appendChild(fontStyleEl);
  }

  // Freeze flip-inner so the front face is always what we capture
  const savedFlipTransform = flipInner ? flipInner.style.transform : '';
  const savedFlipTransition = flipInner ? flipInner.style.transition : '';
  if (flipInner) { flipInner.style.transform = ''; flipInner.style.transition = 'none'; }

  // Unflip the card temporarily if needed
  const wasFlipped = card.classList.contains('is-flipped');
  if (wasFlipped) card.classList.remove('is-flipped');

  // Freeze animations on the capture element
  const savedTransform  = captureEl.style.transform;
  const savedTransition = captureEl.style.transition;
  captureEl.style.transform  = 'none';
  captureEl.style.transition = 'none';

  const animated = captureEl.querySelectorAll('*');
  animated.forEach(el => {
    el.style.animationPlayState = 'paused';
    el.style.transition         = 'none';
  });

  // Let the browser apply the frozen styles before we snapshot
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    // Use domtoimage's native `scale` option — avoids the broken
    // "width * scale + transform:scale(N)" double-scale bug that clips content
    const dataUrl = await domtoimage.toPng(captureEl, {
      scale:   3,
      bgcolor: '#1c1735',
      filter: (node) => {
        if (!node.classList) return true;
        // Drop mouse-follow overlay layers that don't make sense in a static PNG
        return !node.classList.contains('card-shine-dot')    &&
               !node.classList.contains('card-watermark-text') &&
               !node.classList.contains('js-tilt-glare')     &&
               !node.classList.contains('js-tilt-glare-inner');
      },
    });

    const link    = document.createElement('a');
    link.download = `mogs-card-${Date.now()}.png`;
    link.href     = dataUrl;
    link.click();
  } catch (err) {
    console.error('Download failed:', err);
    alert('Render failed. Try right-clicking the card to save it manually.');
  } finally {
    if (fontStyleEl) fontStyleEl.remove();

    // Restore capture element
    captureEl.style.transform  = savedTransform;
    captureEl.style.transition = savedTransition;
    animated.forEach(el => {
      el.style.animationPlayState = '';
      el.style.transition         = '';
    });

    // Restore flip state
    if (wasFlipped) card.classList.add('is-flipped');
    if (flipInner) { flipInner.style.transform = savedFlipTransform; flipInner.style.transition = savedFlipTransition; }

    btn.textContent = '📥 DOWNLOAD CARD';
    btn.disabled    = false;
  }
}



// =====================================================
// HTML ESCAPE (prevent XSS from API data)
// =====================================================

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// =====================================================
// LOADING TEXT ROTATOR
// =====================================================

const LOADING_MSGS = [
  'Summoning your Mog from the blockchain...',
  'Checking rarity... please hold ser.',
  'Wen card? NOW card.',
  'Adding maximum degen energy...',
  'Diamond paws only. Almost there.',
  'Not financial advice. Just vibes.',
  'gm from the Monad chain 🐹',
];

let loadingTimer = null;

function startLoadingCycle() {
  let i = 0;
  const el = document.getElementById('loading-text');
  if (!el) return;
  el.textContent = LOADING_MSGS[0];
  loadingTimer = setInterval(() => {
    i = (i + 1) % LOADING_MSGS.length;
    el.textContent = LOADING_MSGS[i];
  }, 1400);
}

function stopLoadingCycle() {
  if (loadingTimer) { clearInterval(loadingTimer); loadingTimer = null; }
}

// =====================================================
// UI STATE HELPERS
// =====================================================

function setLoading(on) {
  document.getElementById('loading-state').classList.toggle('hidden', !on);
  document.getElementById('generate-btn').disabled = on;
}

function showError(msg) {
  const el = document.getElementById('error-state');
  el.textContent = '❌ ' + msg;
  el.classList.remove('hidden');
}

function hideError() {
  document.getElementById('error-state').classList.add('hidden');
}

function showCardOutput() {
  const out  = document.getElementById('card-output');
  const card = document.getElementById('mog-card');
  out.classList.remove('hidden');
  card.classList.remove('revealed');
  void card.offsetWidth; // reflow
  card.classList.add('revealed');

  // Remove 'revealed' after animation ends so animation fill-mode
  // doesn't block the flip transition on card-flip-inner
  const flipInner = card.querySelector('.card-flip-inner');
  if (flipInner) {
    flipInner.addEventListener('animationend', () => {
      card.classList.remove('revealed');
    }, { once: true });
  }
}

function hideCardOutput() {
  document.getElementById('card-output').classList.add('hidden');
}

// =====================================================
// FORM SUBMISSION
// =====================================================

let currentMogId  = null;
let currentHandle = null;

async function handleSubmit(e) {
  e.preventDefault();

  const rawHandle = document.getElementById('x-username').value.trim().replace(/^@/, '');
  const rawId     = parseInt(document.getElementById('mog-id').value, 10);

  // Validation
  if (!rawHandle) return showError('X username is required! (e.g. monadmogs)');
  if (!/^[a-zA-Z0-9_]{1,50}$/.test(rawHandle)) return showError('Invalid X username. Only letters, numbers, and underscores.');
  if (!rawId || rawId < 1 || rawId > 5000) return showError('Mog ID must be between 1 and 5000.');

  hideError();
  hideCardOutput();
  setLoading(true);
  startLoadingCycle();

  const pfpUrl = `${PFP_BASE}/${encodeURIComponent(rawHandle)}`;

  try {
    const { traits, rarity, svgText } = await fetchMogData(rawId);

    buildCard(rawId, rawHandle, traits, rarity, pfpUrl, svgText);

    currentMogId  = rawId;
    currentHandle = rawHandle;

    stopLoadingCycle();
    setLoading(false);
    showCardOutput();

    // Wire up interactions
    const card = document.getElementById('mog-card');
    initCardInteraction(card);

    // Scroll to card smoothly
    setTimeout(() => {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

  } catch (err) {
    stopLoadingCycle();
    setLoading(false);

    let userMsg = err.message || 'Something went wrong. Please try again!';
    if (userMsg.includes('404') || userMsg.includes('not found')) {
      userMsg = `Mog #${rawId} not found. IDs run from 1 to 5,000 — all tokens exist.`;
    } else if (userMsg.includes('Failed to fetch') || userMsg.includes('NetworkError') || userMsg.includes('CORS') || userMsg.includes('fetch')) {
      userMsg = `Network error. Check your internet connection and try again.`;
    } else if (userMsg.includes('502') || userMsg.includes('503')) {
      userMsg = `The Monad Mogs API is temporarily unavailable. Try again in a moment.`;
    }
    showError(userMsg);
  }
}

// =====================================================
// URL PARAMS — deep link support
// =====================================================

function loadFromParams() {
  const p   = new URLSearchParams(window.location.search);
  const mog = p.get('mog');
  const x   = p.get('x');
  if (mog && x) {
    document.getElementById('mog-id').value      = mog;
    document.getElementById('x-username').value  = x;
    document.getElementById('card-form').requestSubmit?.() ||
      document.getElementById('card-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }
}

// =====================================================
// INIT
// =====================================================

document.addEventListener('DOMContentLoaded', () => {

  // Form submit
  document.getElementById('card-form').addEventListener('submit', handleSubmit);

  // Download
  document.getElementById('download-btn').addEventListener('click', downloadCard);

  // Tweet
  document.getElementById('tweet-btn').addEventListener('click', () => {
    if (currentMogId) {
      const memeName = document.querySelector('.card-meme-name')?.textContent || `MOG #${currentMogId}`;
      const tier = document.getElementById('mog-card')?.className.match(/card-bg-(\w+)/)?.[1] || 'common';
      tweetCard(currentMogId, currentHandle, tier, memeName);
    }
  });

  // New card
  document.getElementById('new-card-btn').addEventListener('click', () => {
    hideCardOutput();
    hideError();
    document.getElementById('card-form').reset();
    currentMogId = currentHandle = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Check URL params for deep links
  loadFromParams();

});
