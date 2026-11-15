// Avatar SVG theo vai trò: khách = quả bóng, chủ sân = gấu đội mũ, quản trị viên = cú trọng tài.
// Màu và nét mặt chọn theo mã băm của id nên mỗi tài khoản cố định một kiểu.

function hash(text = '') {
  let h = 2166136261;
  for (const ch of String(text)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const pick = (list, n) => list[n % list.length];

const EYES_DOT = (lx, rx, y, r = 2.6) => `
  <circle cx="${lx}" cy="${y}" r="${r}" fill="#1f2937"/><circle cx="${rx}" cy="${y}" r="${r}" fill="#1f2937"/>
  <circle cx="${lx + 0.9}" cy="${y - 0.9}" r="${r * 0.35}" fill="#fff"/><circle cx="${rx + 0.9}" cy="${y - 0.9}" r="${r * 0.35}" fill="#fff"/>`;
const EYES_HAPPY = (lx, rx, y) => `
  <path d="M${lx - 3} ${y + 1} Q${lx} ${y - 3} ${lx + 3} ${y + 1}" fill="none" stroke="#1f2937" stroke-width="2" stroke-linecap="round"/>
  <path d="M${rx - 3} ${y + 1} Q${rx} ${y - 3} ${rx + 3} ${y + 1}" fill="none" stroke="#1f2937" stroke-width="2" stroke-linecap="round"/>`;

function ballSvg(n) {
  const bg = pick(['#bfe3c6', '#bfdcf5', '#ffd6a8', '#f6c6d8', '#d9ccf5', '#fbe7a1'], n);
  const happy = (n >> 3) % 3 === 0;
  const tongue = (n >> 5) % 3 === 1;
  return `
  <rect width="64" height="64" fill="${bg}"/>
  <circle cx="32" cy="35" r="21" fill="#ffffff" stroke="#1f2937" stroke-width="1.6"/>
  <path d="M32 14.5 l5.2 3.8 -2 6.1 h-6.4 l-2-6.1z" fill="#1f2937"/>
  <path d="M12.6 30 l4.8 -1.2 2.6 4.6 -2.8 4.6 -4.6 -0.6 a21 21 0 0 1 0 -7.4z" fill="#1f2937"/>
  <path d="M51.4 30 l-4.8 -1.2 -2.6 4.6 2.8 4.6 4.6 -0.6 a21 21 0 0 0 0 -7.4z" fill="#1f2937"/>
  ${happy ? EYES_HAPPY(25.5, 38.5, 36) : EYES_DOT(25.5, 38.5, 36)}
  <ellipse cx="20.5" cy="42" rx="3.2" ry="2" fill="#f59fb4" opacity=".8"/>
  <ellipse cx="43.5" cy="42" rx="3.2" ry="2" fill="#f59fb4" opacity=".8"/>
  <path d="M27.5 42.5 Q32 47 36.5 42.5" fill="${tongue ? '#e8687f' : 'none'}" stroke="#1f2937" stroke-width="1.8" stroke-linecap="round"/>`;
}

function bearSvg(n) {
  const bg = pick(['#cfeedd', '#d6e9f8', '#f8e3c8', '#e6dcf7'], n);
  const fur = pick(['#b98353', '#8d6346', '#d9a66b', '#a8a29e'], n >> 2);
  const cap = pick(['#2f7d4a', '#1f6f5c', '#3a8f3f'], n >> 4);
  const happy = (n >> 6) % 3 === 0;
  return `
  <rect width="64" height="64" fill="${bg}"/>
  <circle cx="13.5" cy="32" r="6" fill="${fur}"/><circle cx="13.5" cy="32" r="3" fill="#f3c9a5"/>
  <circle cx="50.5" cy="32" r="6" fill="${fur}"/><circle cx="50.5" cy="32" r="3" fill="#f3c9a5"/>
  <circle cx="32" cy="38" r="19" fill="${fur}"/>
  <path d="M13 31 Q13 11 32 11 Q51 11 51 31 Z" fill="${cap}"/>
  <path d="M32 11 V31" stroke="rgba(255,255,255,.25)" stroke-width="1.2"/>
  <circle cx="32" cy="11.6" r="1.8" fill="${cap}" stroke="rgba(0,0,0,.2)" stroke-width=".6"/>
  <path d="M11 30 Q32 34.5 53 30 L53 32.6 Q32 37 11 32.6 Z" fill="#1f5133"/>
  <circle cx="32" cy="21" r="4" fill="#ffffff"/><circle cx="32" cy="21" r="1.4" fill="${cap}"/>
  ${happy ? EYES_HAPPY(25, 39, 41.5) : EYES_DOT(25, 39, 41.5, 2.3)}
  <ellipse cx="32" cy="49" rx="7.5" ry="5.4" fill="#f3d5b5"/>
  <ellipse cx="32" cy="46.8" rx="2.8" ry="2" fill="#3b2a20"/>
  <path d="M29.2 50.4 Q32 52.6 34.8 50.4" fill="none" stroke="#3b2a20" stroke-width="1.4" stroke-linecap="round"/>
  <ellipse cx="21" cy="48" rx="2.6" ry="1.6" fill="#f59fb4" opacity=".7"/>
  <ellipse cx="43" cy="48" rx="2.6" ry="1.6" fill="#f59fb4" opacity=".7"/>`;
}

function owlSvg(n) {
  const bg = pick(['#fbe7a1', '#e6dcf7', '#d6e9f8'], n);
  const feather = pick(['#8b6b4a', '#6b7280', '#7c5c3e'], n >> 2);
  return `
  <rect width="64" height="64" fill="${bg}"/>
  <path d="M15 22 L19 10 L25 18 Z" fill="${feather}"/><path d="M49 22 L45 10 L39 18 Z" fill="${feather}"/>
  <ellipse cx="32" cy="38" rx="20" ry="22" fill="${feather}"/>
  <path d="M18 50 Q32 66 46 50 L46 64 L18 64 Z" fill="#111827"/>
  <path d="M22 54 V64 M28 56 V64 M34 56 V64 M40 54 V64" stroke="#ffffff" stroke-width="2.4"/>
  <ellipse cx="32" cy="44" rx="11" ry="9" fill="#f5e6c8"/>
  <circle cx="24" cy="31" r="7.5" fill="#ffffff"/><circle cx="40" cy="31" r="7.5" fill="#ffffff"/>
  <circle cx="24.6" cy="31.6" r="3.6" fill="#1f2937"/><circle cx="39.4" cy="31.6" r="3.6" fill="#1f2937"/>
  <circle cx="25.8" cy="30.2" r="1.2" fill="#fff"/><circle cx="40.6" cy="30.2" r="1.2" fill="#fff"/>
  <path d="M29.5 37 L34.5 37 L32 41.5 Z" fill="#f59e0b"/>
  <ellipse cx="17.5" cy="38.5" rx="2.6" ry="1.6" fill="#f59fb4" opacity=".7"/>
  <ellipse cx="46.5" cy="38.5" rx="2.6" ry="1.6" fill="#f59fb4" opacity=".7"/>
  <path d="M24 45 Q32 51 40 45" fill="none" stroke="#dc2626" stroke-width="1.2"/>
  <rect x="38" y="47" width="8" height="4.4" rx="2.2" fill="#cbd5e1" stroke="#64748b" stroke-width=".8"/>
  <circle cx="44" cy="49.2" r="1" fill="#64748b"/>`;
}

export const AVATAR_ROLE_LABEL = { customer: 'quả bóng', manager: 'gấu chủ sân', admin: 'cú trọng tài' };

/** Chuỗi SVG avatar cho vai trò và hạt giống (id hoặc email). */
export function avatarSvg(role, seed = '') {
  const n = hash(seed);
  const body = role === 'admin' ? owlSvg(n) : role === 'manager' ? bearSvg(n) : ballSvg(n);
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>`;
}
