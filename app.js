/* =====================================================
   MOGS CARD — app.js
   Monad Mogs public API + unavatar.io
   CC0 assets — credit monadmogs.xyz

   Real API response format (from /api/v0/mogs/{id}/rarity):
   {
     tokenId, name, rank, tier, percentile, score,
     attributes: [{ trait_type, value, frequency, percentage, score }],
     snapshot: { tiers: { legendary:"1-50", epic:"51-250", ... } }
   }
   ===================================================== */

'use strict';

// =====================================================
// CONSTANTS
// =====================================================

const API_BASE    = 'https://api.monadmogs.xyz/api/v0';
const RENDER_BASE = 'https://api.monadmogs.xyz/api/v0'; // img src — no CORS needed
const MOGS_SITE   = 'https://monadmogs.xyz/';
const MOGS_TOTAL  = 5000;

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
  // Fetch rarity stats
  const rarityRaw = await apiFetch(`${API_BASE}/mogs/${mogId}/rarity`);
  const rarity    = normalizeRarity(rarityRaw);
  const traits    = rarity.attributes.length
    ? rarity.attributes
    : normalizeTraits(rarityRaw);

  // Fetch raw SVG and inject it inline for perfect html2canvas rendering
  let svgText = '<div class="render-placeholder">🐹</div>'; // fallback
  try {
    const svgRes = await fetch(`${API_BASE}/mogs/${mogId}/render`);
    if (svgRes.ok) {
      let rawSvg = await svgRes.text();
      // Inject 100% width/height so it scales perfectly in our container
      if (rawSvg.includes('<svg ')) {
        rawSvg = rawSvg.replace('<svg ', '<svg width="100%" height="100%" ');
      }
      svgText = rawSvg;
    }
  } catch (err) {
    console.error('Failed to fetch SVG render', err);
  }

  return { traits, rarity, svgText };
}

// =====================================================
// CARD BUILDER
// Assembles the DOM card from fetched data
// =====================================================

function buildCard(mogId, xHandle, traits, rarity, pfpUrl, svgText) {
  const card = document.getElementById('mog-card');

  const tier   = RARITY[rarity.tier] ? rarity.tier : 'common';
  const cfg    = RARITY[tier];
  const rank   = rarity.rank;
  // HP based on rank (rank 1 = 999 HP, rank 5000 = 100 HP)
  const hp     = calcHP(rank);
  const hpPct  = Math.min(100, (hp / 999) * 100);

  const memeName  = generateMemeName(tier, traits, mogId);
  // Filter out boring None traits, limit to 5 most interesting
  const traitSlice = traits
    .filter(t => {
      const v = (t.value ?? '').toLowerCase();
      return v !== 'none' && v !== '' && v !== 'n/a';
    })
    .slice(0, 5);

  // Apply rarity CSS vars
  card.style.setProperty('--rarity-color', cfg.color);
  card.style.setProperty('--rarity-glow',  cfg.glow);

  // Build trait rows HTML
  const traitRowsHTML = traitSlice.map(trait => {
    const category = trait.trait_type ?? trait.category ?? trait.key ?? 'Trait';
    const value    = trait.value      ?? trait.trait_value ?? trait.val ?? '???';
    const pct      = getTraitPct(trait);
    const pctNum   = pct !== null ? parseFloat(pct) : null;
    const pctLabel = pctNum !== null ? `${pctNum.toFixed(1)}%` : '?%';
    const pctClass = pctNum !== null ? getPctClass(pctNum) : 'pct-common';
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

  // Special move HTML (Rare+)
  const specialHTML = cfg.specialMove && SPECIAL_MOVES[tier] ? `
    <div class="card-special">
      <div class="special-header">
        <span class="special-label">⚡ SPECIAL MOVE</span>
      </div>
      <div class="special-move-name">${escHtml(SPECIAL_MOVES[tier].name)}</div>
      <div class="special-move-desc">${escHtml(SPECIAL_MOVES[tier].desc)}</div>
    </div>` : '';

  // Full card HTML
  card.innerHTML = `

    <!-- Holographic effects injected here -->
    <div class="card-watermark-text" aria-hidden="true">
      <span class="watermark-inner">🐹 MONAD MOGS 🐹 MONAD MOGS 🐹 MONAD MOGS</span>
    </div>
    <div class="card-shine-dot" aria-hidden="true"></div>

    <!-- HEADER -->
    <div class="card-header">
      <div class="ch-left">
        <span class="ch-collection">⚡ MONAD MOGS · CC0</span>
        <span class="ch-id">MOG #${mogId}</span>
      </div>
      <span class="rarity-badge ${cfg.badgeClass}" aria-label="Rarity: ${tier}">
        ${cfg.label}
      </span>
    </div>

    <!-- MEDIA ROW: PFP left | Mog render right -->
    <div class="card-media-row">
      <div class="pfp-col">
        <div class="pfp-ring-wrap">
          <div class="pfp-ring-bg" aria-hidden="true"></div>
          <div class="pfp-ring-inner" aria-hidden="true"></div>
          <img
            class="card-pfp-img"
            src="${escHtml(pfpUrl)}"
            alt="@${escHtml(xHandle)} profile picture"
            loading="eager"
            crossorigin="anonymous"
            onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2282%22 height=%2282%22%3E%3Ccircle cx=%2241%22 cy=%2241%22 r=%2241%22 fill=%22%231C1735%22/%3E%3Ctext x=%2241%22 y=%2255%22 text-anchor=%22middle%22 font-size=%2234%22%3E🐹%3C/text%3E%3C/svg%3E'; this.onerror=null;"
          >
        </div>
        <span class="pfp-handle-tag" aria-label="X handle">@${escHtml(xHandle)}</span>
      </div>
      <div class="render-col">
        ${svgText}
      </div>
    </div>

    <!-- NAME & HP -->
    <div class="card-name-section">
      <div class="card-meme-name">${escHtml(memeName)}</div>
      <div class="hp-row" role="meter" aria-label="HP: ${hp}" aria-valuenow="${hp}" aria-valuemin="100" aria-valuemax="999">
        <span class="hp-label" aria-hidden="true">HP</span>
        <div class="hp-track" aria-hidden="true">
          <div class="hp-fill" id="hp-fill-bar" style="width:0%; background: linear-gradient(90deg, var(--monad-purple-dark), ${escHtml(cfg.hpTint)});" data-target="${hpPct.toFixed(1)}"></div>
        </div>
        <span class="hp-value" aria-hidden="true">${hp}</span>
      </div>
    </div>

    <div class="card-divider" aria-hidden="true"></div>

    <!-- TRAITS -->
    <div class="card-traits">
      <div class="traits-header" aria-hidden="true">— BATTLE TRAITS —</div>
      ${traitRowsHTML || '<div class="trait-row"><span class="trait-emoji">🤷</span><div class="trait-info"><span class="trait-cat">TRAITS</span><span class="trait-val">No traits found, ser</span></div></div>'}
    </div>

    <!-- SPECIAL MOVE -->
    ${specialHTML}

    <!-- FOOTER -->
    <div class="card-footer">
      <div class="cf-rank">
        RANK <span class="cf-rank-num">#${rank}</span><br>
        OF ${MOGS_TOTAL.toLocaleString()} MOGS
      </div>
      <div class="cf-credit">
        🐹 CC0 ASSET<br>
        <a href="${MOGS_SITE}" target="_blank" rel="noopener noreferrer">monadmogs.xyz</a>
      </div>
    </div>
  `;

  // Animate HP bar after paint
  requestAnimationFrame(() => {
    setTimeout(() => {
      const fill = document.getElementById('hp-fill-bar');
      if (fill) fill.style.width = fill.dataset.target + '%';
    }, 200);
  });
}

// =====================================================
// MOUSE PARALLAX + SHIMMER
// =====================================================

function initCardInteraction(card) {
  const shineDot = card.querySelector('.card-shine-dot');

  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // 3D tilt
    const tiltX = (y - 0.5) * -18;
    const tiltY = (x - 0.5) *  18;
    card.style.transform = `
      perspective(1100px)
      rotateX(${tiltX}deg)
      rotateY(${tiltY}deg)
      scale3d(1.05, 1.05, 1.05)
    `;

    // Shimmer position
    card.style.setProperty('--mouse-x', `${(x * 100).toFixed(1)}%`);
    card.style.setProperty('--mouse-y', `${(y * 100).toFixed(1)}%`);

    // Shine dot
    if (shineDot) {
      shineDot.style.left = `${e.clientX - rect.left}px`;
      shineDot.style.top  = `${e.clientY - rect.top}px`;
    }
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(1100px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
    card.style.removeProperty('--mouse-x');
    card.style.removeProperty('--mouse-y');
  });

  // Touch tilt (mobile)
  card.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect  = card.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / rect.width;
    const y = (touch.clientY - rect.top)  / rect.height;
    const tiltX = (y - 0.5) * -10;
    const tiltY = (x - 0.5) *  10;
    card.style.transform = `perspective(1100px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
  }, { passive: false });

  card.addEventListener('touchend', () => {
    card.style.transform = 'perspective(1100px) rotateX(0deg) rotateY(0deg)';
  });
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
  const card = document.getElementById('mog-card');
  const btn  = document.getElementById('download-btn');

  if (!window.domtoimage) {
    alert('Download library not loaded yet. Please wait a moment and try again.');
    return;
  }

  btn.textContent = '⏳ Rendering...';
  btn.disabled    = true;

  // Pre-embed Google Fonts so dom-to-image's clone has them available.
  // Without this, the clone falls back to system fonts → wrong metrics → layout shifts.
  const fontCSS     = await embedGoogleFonts();
  let   fontStyleEl = null;
  if (fontCSS) {
    fontStyleEl = document.createElement('style');
    fontStyleEl.id          = '__dl_fonts__';
    fontStyleEl.textContent = fontCSS;
    document.head.appendChild(fontStyleEl);
  }

  // Freeze all animations and transitions on the card for a clean capture
  const savedTransform   = card.style.transform;
  const savedTransition  = card.style.transition;
  card.style.transform   = 'none';
  card.style.transition  = 'none';

  // Pause animated children (ring, badge pulse) so they don't flicker mid-capture
  const animated = card.querySelectorAll('*');
  animated.forEach(el => {
    el.style.animationPlayState = 'paused';
    el.style.transition         = 'none';
  });

  // Let the browser apply the frozen styles before we snapshot
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    // Use domtoimage's native `scale` option — avoids the broken
    // "width * scale + transform:scale(N)" double-scale bug that clips content
    const dataUrl = await domtoimage.toPng(card, {
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
    // Remove injected font style (was only needed for the dom-to-image clone)
    if (fontStyleEl) fontStyleEl.remove();

    // Restore live styles
    card.style.transform  = savedTransform;
    card.style.transition = savedTransition;
    animated.forEach(el => {
      el.style.animationPlayState = '';
      el.style.transition         = '';
    });
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
  // Trigger reveal animation
  card.classList.remove('revealed');
  void card.offsetWidth; // reflow
  card.classList.add('revealed');
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

  const pfpUrl = `https://unavatar.io/x/${encodeURIComponent(rawHandle)}`;

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
      userMsg = `Mog #${rawId} not found. IDs run from 1 to 5000 — this collection is sold out, all tokens exist.`;
    } else if (userMsg.includes('Failed to fetch') || userMsg.includes('NetworkError') || userMsg.includes('CORS') || userMsg.includes('fetch')) {
      userMsg = `Network error. Make sure you are running the dev server: node proxy.js`;
    } else if (userMsg.includes('502') || userMsg.includes('Proxy')) {
      userMsg = `Proxy error reaching the Monad Mogs API. Please try again.`;
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
