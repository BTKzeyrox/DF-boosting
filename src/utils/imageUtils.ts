/**
 * Tactical Delta Force screenshot generator and mock image provider
 * Generates high-fidelity SVG data URLs for game extraction / score proofs
 * so the application is 100% standalone and offline-capable without external CDNs.
 */

export function generateDeltaForceScreenshot(params: {
  operatorName: string;
  score: number;
  clientTag: string;
  isVictory?: boolean;
  extractionValue?: string;
  timestamp?: string;
  mode?: string;
}): string {
  const {
    operatorName,
    score,
    clientTag,
    isVictory = true,
    extractionValue = `${(score * 0.85).toLocaleString()} TEK-COINS`,
    timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19),
    mode = 'HAZARD OPERATIONS // EXTRACTION',
  } = params;

  const scoreFormatted = Number(score).toLocaleString();
  const accentColor = isVictory ? '#10b981' : '#f59e0b';
  const badgeText = isVictory ? 'EXTRACTION SUCCESSFUL' : 'CONTRACT COMPLETED';

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0f16"/>
      <stop offset="50%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#070a0e"/>
    </linearGradient>
    <linearGradient id="panelGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e293b" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0.95"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" stroke-width="0.5" stroke-opacity="0.3"/>
    </pattern>
    <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1280" height="720" fill="url(#bgGrad)"/>
  <rect width="1280" height="720" fill="url(#grid)"/>

  <!-- Tactical Vignette & Grid Lines -->
  <circle cx="640" cy="360" r="320" fill="none" stroke="#0ea5e9" stroke-width="1" stroke-dasharray="4 8" opacity="0.2"/>
  <line x1="80" y1="360" x2="1200" y2="360" stroke="#334155" stroke-width="1" stroke-dasharray="2 10" opacity="0.3"/>
  <line x1="640" y1="60" x2="640" y2="660" stroke="#334155" stroke-width="1" stroke-dasharray="2 10" opacity="0.3"/>

  <!-- Top Tactical Header HUD -->
  <rect x="60" y="40" width="1160" height="60" rx="6" fill="#0f172a" stroke="#334155" stroke-width="1"/>
  <circle cx="85" cy="70" r="6" fill="${accentColor}"/>
  <text x="105" y="75" font-family="monospace" font-size="16" font-weight="bold" fill="#38bdf8" letter-spacing="2">DELTA FORCE // TACTICAL BOOST VERIFICATION PROOF</text>
  <text x="880" y="75" font-family="monospace" font-size="14" fill="#94a3b8">${timestamp} UTC</text>
  
  <!-- Status Banner -->
  <rect x="60" y="120" width="450" height="42" rx="4" fill="${accentColor}" fill-opacity="0.15" stroke="${accentColor}" stroke-width="1.5"/>
  <text x="85" y="147" font-family="system-ui, sans-serif" font-size="18" font-weight="900" fill="${accentColor}" letter-spacing="1.5">● ${badgeText}</text>
  <text x="330" y="147" font-family="monospace" font-size="13" fill="#cbd5e1">${mode}</text>

  <!-- Main Score Card Panel -->
  <rect x="60" y="180" width="760" height="480" rx="8" fill="url(#panelGrad)" stroke="#334155" stroke-width="1.5"/>
  
  <!-- Operator Details -->
  <text x="100" y="230" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="#64748b" letter-spacing="1">CLIENT ACCOUNT &amp; BOOSTER UID</text>
  <text x="100" y="270" font-family="system-ui, sans-serif" font-size="28" font-weight="800" fill="#f8fafc">${clientTag}</text>
  <text x="100" y="300" font-family="monospace" font-size="15" fill="#38bdf8">OPERATOR ASSIGNED: ${operatorName.toUpperCase()}</text>

  <!-- Large Game Score Readout -->
  <line x1="100" y1="330" x2="780" y2="330" stroke="#334155" stroke-width="1"/>
  <text x="100" y="375" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="#94a3b8" letter-spacing="2">VERIFIED MATCH / ACCOUNT SCORE</text>
  <text x="100" y="445" font-family="monospace" font-size="62" font-weight="900" fill="#ffffff" letter-spacing="1">${scoreFormatted}</text>
  <text x="100" y="475" font-family="monospace" font-size="16" fill="#10b981">PTS // ANTI-CHEAT SIGNATURE: SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}</text>

  <!-- Secondary Metrics Grid -->
  <rect x="100" y="510" width="300" height="110" rx="6" fill="#0b111e" stroke="#1e293b" stroke-width="1"/>
  <text x="120" y="540" font-family="monospace" font-size="12" fill="#64748b">ESTIMATED MANDELBRICKS</text>
  <text x="120" y="580" font-family="monospace" font-size="26" font-weight="bold" fill="#f59e0b">x 4 QUANTUM</text>
  <text x="120" y="605" font-family="monospace" font-size="12" fill="#10b981">Extraction Secured</text>

  <rect x="440" y="510" width="340" height="110" rx="6" fill="#0b111e" stroke="#1e293b" stroke-width="1"/>
  <text x="460" y="540" font-family="monospace" font-size="12" fill="#64748b">TOTAL EXTRACTION LOOT VALUE</text>
  <text x="460" y="580" font-family="monospace" font-size="24" font-weight="bold" fill="#38bdf8">${extractionValue}</text>
  <text x="460" y="605" font-family="monospace" font-size="12" fill="#94a3b8">Zero-death extraction confirmed</text>

  <!-- Right Side Tactical Badge & Watermark -->
  <rect x="850" y="180" width="370" height="480" rx="8" fill="url(#panelGrad)" stroke="#334155" stroke-width="1.5"/>
  <text x="880" y="230" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="#64748b" letter-spacing="1">DELTA FORCE SYSTEM PROOF</text>
  
  <!-- Operator Emblem Box -->
  <rect x="880" y="260" width="310" height="180" rx="6" fill="#070c14" stroke="#0284c7" stroke-width="1"/>
  <polygon points="1035,280 1100,345 1035,410 970,345" fill="none" stroke="#0ea5e9" stroke-width="2"/>
  <circle cx="1035" cy="345" r="45" fill="none" stroke="${accentColor}" stroke-width="2"/>
  <text x="1035" y="340" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">DELTA FORCE</text>
  <text x="1035" y="360" font-family="monospace" font-size="10" fill="#38bdf8" text-anchor="middle">OPERATIONS HQ</text>

  <text x="880" y="475" font-family="monospace" font-size="13" fill="#94a3b8">CLIENT TARGET: 25,000,000 PTS</text>
  <text x="880" y="505" font-family="monospace" font-size="13" fill="#94a3b8">REGIONAL SERVER: EU-CENTRAL (24ms)</text>
  <text x="880" y="535" font-family="monospace" font-size="13" fill="#94a3b8">HASH: 9F7A-${Math.floor(score / 1000).toString(16).toUpperCase()}</text>
  
  <rect x="880" y="565" width="310" height="65" rx="4" fill="#132e22" stroke="#10b981" stroke-width="1"/>
  <text x="900" y="595" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#10b981">AUTHENTICITY VERIFIED</text>
  <text x="900" y="615" font-family="monospace" font-size="11" fill="#cbd5e1">Timestamp watermarked for anti-tamper</text>
</svg>
`.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function generateCVDocument(name: string, role: string, rank: string): string {
  // Returns HTML or printable representation if needed
  return `CV-${name.replace(/\s+/g, '_')}.pdf`;
}

/**
 * Generates a high-impact Delta Force: Hawk Ops official promotional poster / affiche
 * with tactical squad graphics, neon HUD elements, operational directives, and rank insignias.
 */
export function generateDeltaForcePoster(options?: {
  title?: string;
  season?: string;
  subtitle?: string;
}): string {
  const title = options?.title || 'DELTA FORCE // HAWK OPS';
  const season = options?.season || 'SAISON OPÉRATIONNELLE 2026';
  const subtitle = options?.subtitle || 'BRIGADE TACTIQUE DE BOOST & EXTRACTION';

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="posterBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#080c12"/>
      <stop offset="40%" stop-color="#0d1520"/>
      <stop offset="100%" stop-color="#040608"/>
    </linearGradient>
    <linearGradient id="neonCyan" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
    <linearGradient id="neonEmerald" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#34d399"/>
    </linearGradient>
    <linearGradient id="amberGold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
    <radialGradient id="visorGlow" cx="65%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.35"/>
      <stop offset="45%" stop-color="#10b981" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <pattern id="hexGrid" width="40" height="69.282" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 20 11.547 L 0 0 L 0 23.094 L 20 34.641 L 40 23.094 Z M 0 34.641 L 20 46.188 L 0 57.735 L 0 80.829 L 20 92.376 L 40 80.829 Z M 40 34.641 L 20 46.188 L 40 57.735 Z" fill="none" stroke="#1e293b" stroke-width="0.8" opacity="0.35"/>
    </pattern>
  </defs>

  <!-- Background Layer -->
  <rect width="1200" height="630" fill="url(#posterBg)"/>
  <rect width="1200" height="630" fill="url(#hexGrid)"/>
  <rect width="1200" height="630" fill="url(#visorGlow)"/>

  <!-- Military Camo Accent Angles -->
  <polygon points="0,0 480,0 280,630 0,630" fill="#0b131e" opacity="0.75"/>
  <line x1="480" y1="0" x2="280" y2="630" stroke="#0ea5e9" stroke-width="1.5" opacity="0.4"/>
  <line x1="495" y1="0" x2="295" y2="630" stroke="#10b981" stroke-width="0.8" opacity="0.3"/>

  <!-- Tactical Radar Reticle -->
  <circle cx="850" cy="300" r="240" fill="none" stroke="#1e293b" stroke-width="1"/>
  <circle cx="850" cy="300" r="180" fill="none" stroke="#0ea5e9" stroke-width="1" stroke-dasharray="6 8" opacity="0.4"/>
  <circle cx="850" cy="300" r="100" fill="none" stroke="#10b981" stroke-width="1.2" opacity="0.5"/>
  <circle cx="850" cy="300" r="10" fill="#38bdf8"/>
  <line x1="850" y1="40" x2="850" y2="560" stroke="#1e293b" stroke-width="1" stroke-dasharray="3 6"/>
  <line x1="590" y1="300" x2="1110" y2="300" stroke="#1e293b" stroke-width="1" stroke-dasharray="3 6"/>

  <!-- Operator Silhouette & Tactical Armor Graphic -->
  <g transform="translate(680, 70)">
    <!-- Helmet & Visor -->
    <path d="M 120 70 Q 170 30 240 70 Q 280 110 270 180 L 250 260 L 90 260 L 70 180 Z" fill="#15202e" stroke="#334155" stroke-width="2"/>
    <!-- Glowing Visor Shield -->
    <path d="M 110 130 Q 170 115 230 130 L 225 175 Q 170 190 115 175 Z" fill="url(#neonCyan)" opacity="0.9"/>
    <!-- Visor Glint -->
    <path d="M 125 135 L 215 135" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
    <!-- Tactical Body Armor / Rig -->
    <path d="M 40 260 L 300 260 L 330 460 L 10 460 Z" fill="#0f1724" stroke="#1e293b" stroke-width="2"/>
    <!-- Ammo Pouches -->
    <rect x="70" y="320" width="50" height="90" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <rect x="140" y="320" width="60" height="90" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <rect x="220" y="320" width="50" height="90" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <!-- Radio Antenna -->
    <line x1="90" y1="70" x2="60" y2="0" stroke="#0ea5e9" stroke-width="2.5"/>
    <circle cx="60" cy="0" r="4" fill="#10b981"/>
    <!-- Shoulder Patch Emblem -->
    <polygon points="30,300 65,300 70,340 45,360 25,340" fill="#f59e0b" stroke="#ffffff" stroke-width="1"/>
  </g>

  <!-- Left Side: Official Typography & Operational Directives -->
  <g transform="translate(60, 60)">
    <!-- Top Security / Official Classification Badge -->
    <rect x="0" y="0" width="340" height="32" rx="4" fill="#10b981" fill-opacity="0.15" stroke="#10b981" stroke-width="1"/>
    <circle cx="16" cy="16" r="5" fill="#10b981"/>
    <text x="32" y="21" font-family="monospace" font-size="12" font-weight="bold" fill="#34d399" letter-spacing="2">AFFICHE OFFICIELLE // UNITÉ D'ÉLITE</text>

    <!-- Main Title -->
    <text x="0" y="95" font-family="'Chakra Petch', system-ui, sans-serif" font-size="52" font-weight="900" fill="#ffffff" letter-spacing="3">DELTA FORCE</text>
    <text x="0" y="145" font-family="'Chakra Petch', system-ui, sans-serif" font-size="38" font-weight="800" fill="url(#neonCyan)" letter-spacing="6">HAWK OPS</text>
    
    <text x="0" y="180" font-family="monospace" font-size="14" font-weight="bold" fill="#f59e0b" letter-spacing="3">${season}</text>
    <text x="0" y="205" font-family="system-ui, sans-serif" font-size="15" fill="#94a3b8">${subtitle}</text>

    <line x1="0" y1="225" x2="480" y2="225" stroke="#334155" stroke-width="1.5"/>

    <!-- Operational Bulletins / Directives Box -->
    <g transform="translate(0, 245)">
      <!-- Box 1: Directives & Objectifs -->
      <rect x="0" y="0" width="230" height="95" rx="8" fill="#0d1824" stroke="#0ea5e9" stroke-width="1"/>
      <text x="16" y="24" font-family="monospace" font-size="10" font-weight="bold" fill="#38bdf8" letter-spacing="1">DIRECTIVE OPÉRATIONNELLE</text>
      <text x="16" y="55" font-family="monospace" font-size="20" font-weight="900" fill="#ffffff">EXTRACTION 100%</text>
      <text x="16" y="80" font-family="system-ui, sans-serif" font-size="11" fill="#10b981">● Mandelbricks &amp; Survie</text>

      <!-- Box 2: Shift Bonus -->
      <rect x="250" y="0" width="230" height="95" rx="8" fill="#0d1824" stroke="#f59e0b" stroke-width="1"/>
      <text x="266" y="24" font-family="monospace" font-size="10" font-weight="bold" fill="#fbbf24" letter-spacing="1">BONUS DE NUIT HAWK</text>
      <text x="266" y="55" font-family="monospace" font-size="22" font-weight="900" fill="#fbbf24">+20% EXP</text>
      <text x="266" y="80" font-family="system-ui, sans-serif" font-size="11" fill="#cbd5e1">● Créneau 20h00 - 06h00</text>
    </g>

    <!-- Bottom Notice & Anti-Cheat Seal -->
    <g transform="translate(0, 360)">
      <rect x="0" y="0" width="480" height="75" rx="8" fill="#09121a" stroke="#10b981" stroke-width="1"/>
      <text x="16" y="25" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#34d399">DIRECTIVES ANTI-TRICHE // CONTRÔLE PETIT MALIN</text>
      <text x="16" y="45" font-family="system-ui, sans-serif" font-size="11" fill="#cbd5e1">Captures obligatoires au début et à la fin de chaque session.</text>
      <text x="16" y="62" font-family="monospace" font-size="10" fill="#64748b">Vérification de cohérence des scores et détection multi-postes active.</text>
    </g>
  </g>

  <!-- Bottom Brand Watermark -->
  <rect x="0" y="580" width="1200" height="50" fill="#06090e" stroke="#1e293b" stroke-width="1"/>
  <text x="60" y="612" font-family="monospace" font-size="13" font-weight="bold" fill="#64748b">DELTA FORCE OPS SYSTEM · STANDALONE &amp; SECURED · NO CLOUD LOCK-IN</text>
  <text x="1020" y="612" font-family="monospace" font-size="13" font-weight="bold" fill="#10b981">STATUT : OPÉRATIONNEL ●</text>
</svg>
`.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}


// Réduit une photo (caméra ou galerie) en petite image carrée JPEG pour le profil
export function compressImageToDataUrl(file: File, size = 480, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture impossible'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image invalide'));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas indisponible'));
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
