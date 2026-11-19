#!/usr/bin/env node
// Generates the animated SVG cards in assets/ and the "Featured builds" table
// in README.md from live GitHub data. No dependencies — Node 20+ only.
//
//   node scripts/generate.mjs            (uses GITHUB_TOKEN if set)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ICONS = JSON.parse(readFileSync(join(ROOT, "scripts/icons.json"), "utf8"));

// ───────────────────────────── profile config ─────────────────────────────
const PROFILE = {
  user: process.env.GH_USER || "suryakantarora",
  name: "Suryakant",
  role: "Technical Lead",
  shell: "suryakant@prod:~$ whoami --profile",
  typing: [
    "Technical Lead · Java · Spring Boot",
    "Microservices · Distributed Systems",
    "Banking & Payments platforms",
  ],
  positioning: ["JAVA", "SPRING BOOT", "MICROSERVICES", "BANKING & PAYMENTS", "DISTRIBUTED SYSTEMS"],
  tagline: ["Building resilient systems, scalable services", "and digital products that matter."],
  yearsExperience: "8+",
  portfolio: "suryakantarora.com",
  topics: "Java · Payments · Distributed Systems",
  focus: [
    ["Distributed systems", "Resilience · Observability"],
    ["Cloud-native delivery", "Containers · CI/CD"],
    ["Product engineering", "Secure APIs · Fintech"],
  ],
  // Where the depth is — shown on the stats card.
  depth: [
    ["Banking & payments", "Settlement · Reconciliation · APIs"],
    ["Microservices", "Java · Spring Boot · Quarkus"],
    ["Event streaming", "Kafka · RabbitMQ"],
    ["Data", "PostgreSQL · Redis · MongoDB"],
    ["Platform", "Docker · Kubernetes · CI/CD"],
  ],
  // Core stack: large tiles (keep to 7). Supporting: small pills (rows of 5).
  coreTools: [
    ["openjdk", "Java", "#F89820"],
    ["springboot", "Spring Boot", "#6DB33F"],
    ["quarkus", "Quarkus", "#4695EB"],
    ["apachekafka", "Kafka", "#E5E7EB"],
    ["kubernetes", "Kubernetes", "#5B8DEF"],
    ["postgresql", "PostgreSQL", "#699ECA"],
    ["redis", "Redis", "#FF4438"],
  ],
  moreTools: [
    ["hibernate", "Hibernate", "#BCAE79"],
    ["rabbitmq", "RabbitMQ", "#FF6600"],
    ["mongodb", "MongoDB", "#47A248"],
    ["docker", "Docker", "#2496ED"],
    ["githubactions", "GH Actions", "#2088FF"],
    ["openapiinitiative", "OpenAPI", "#6BA539"],
    ["git", "Git", "#F05032"],
    ["angular", "Angular", "#F43F5E"],
    ["typescript", "TypeScript", "#4F9AE6"],
    ["flutter", "Flutter", "#54C5F8"],
  ],
  // Repos left out of the generated "Also on GitHub" table.
  hiddenRepos: ["library-assignment"],
};

// ───────────────────────────── palette / helpers ─────────────────────────────
const C = {
  cyan: "#22D3EE", violet: "#8B5CF6", lilac: "#A78BFA", pink: "#EC4899", green: "#34D399",
  white: "#F8FAFC", text: "#CBD5E1", dim: "#94A3B8", faint: "#64748B", line: "#334155",
  panel: "#0F172A",
};
const SANS = `-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;
const MONO = `ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const W = 880;

/** Shared card shell: dark gradient, faint grid, soft corner glow. */
function card(h, title, desc, body, defs = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title>
<desc id="d">${esc(desc)}</desc>
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#080D1B"/><stop offset=".55" stop-color="#111A35"/><stop offset="1" stop-color="#17102F"/></linearGradient>
  <linearGradient id="acc" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${C.cyan}"/><stop offset=".55" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.pink}"/></linearGradient>
  <radialGradient id="glow"><stop stop-color="${C.violet}" stop-opacity=".30"/><stop offset="1" stop-color="${C.violet}" stop-opacity="0"/></radialGradient>
  <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="${C.dim}" stroke-opacity=".07"/></pattern>
  <clipPath id="cardclip"><rect x=".5" y=".5" width="${W - 1}" height="${h - 1}" rx="18"/></clipPath>
  ${defs}
</defs>
<rect x=".5" y=".5" width="${W - 1}" height="${h - 1}" rx="18" fill="url(#bg)" stroke="${C.line}"/>
<g clip-path="url(#cardclip)"><rect width="${W}" height="${h}" fill="url(#grid)"/></g>
${body}
</svg>
`;
}

const label = (x, y, s, color = C.pink, anchor = "start") =>
  `<text x="${x}" y="${y}" fill="${color}" font-family="${MONO}" font-size="11" font-weight="700" letter-spacing="2" text-anchor="${anchor}">${esc(s)}</text>`;
const heading = (x, y, s, size = 22) =>
  `<text x="${x}" y="${y}" fill="${C.white}" font-family="${SANS}" font-size="${size}" font-weight="800">${esc(s)}</text>`;
const icon = (slug, x, y, size, fill) =>
  `<path transform="translate(${x} ${y}) scale(${(size / 24).toFixed(4)})" fill="${fill}" d="${ICONS[slug]}"/>`;

// Layout of assets/wave.jpg: square frames in a grid, read left to right, top to bottom. Holds are in seconds.
const WAVE = { cols: 8, rows: 6, frames: 48, fps: 12, restHold: 1.2, endHold: 0.8 };

// ───────────────────────────── cards ─────────────────────────────
function intro(d) {
  const P = { x: 24, y: 24, s: 272 };
  const at = (ix, iy) => [+(P.x + (ix / 1254) * P.s).toFixed(1), +(P.y + (iy / 1254) * P.s).toFixed(1)]; // source-pixel → card coords
  const [nx, ny] = at(820, 62), [hx, hy] = at(893, 385), [mx, my] = at(262, 578), [l1x, l1y] = at(585, 388), [l2x, l2y] = at(712, 384);
  // The wave is a sprite sheet (assets/wave.jpg) stepped one frame at a time: hold, play, hold, play back, so the loop has no jump cut.
  let picture = `<image x="${P.x}" y="${P.y}" width="${P.s}" height="${P.s}" preserveAspectRatio="xMidYMid slice" xlink:href="${d.photo}" href="${d.photo}"/>`;
  if (d.wave) {
    const { cols, rows, frames, fps, restHold, endHold } = WAVE;
    const seq = [[0, restHold], ...Array.from({ length: frames - 2 }, (_, i) => [i + 1, 1 / fps]), [frames - 1, endHold], ...Array.from({ length: frames - 2 }, (_, i) => [frames - 2 - i, 1 / fps])];
    const total = seq.reduce((a, f) => a + f[1], 0);
    let t = 0;
    const keyTimes = seq.map((f) => { const k = (t / total).toFixed(4); t += f[1]; return k; }).join(";");
    const values = seq.map(([f]) => `${-(f % cols) * P.s} ${-Math.floor(f / cols) * P.s}`).join(";");
    picture = `<image x="${P.x}" y="${P.y}" width="${cols * P.s}" height="${rows * P.s}" preserveAspectRatio="none" href="${d.wave}"><animateTransform attributeName="transform" type="translate" calcMode="discrete" values="${values}" keyTimes="${keyTimes}" dur="${total.toFixed(2)}s" repeatCount="indefinite"/></image>`;
  }
  // These overlays are positioned for the still photo, so they are dropped when the wave plays.
  const stillOverlays = d.wave ? "" : `<rect x="${mx}" y="${my}" width="5" height="2" fill="${C.cyan}"><animate attributeName="opacity" values="1;1;0;0" keyTimes="0;.5;.5;1" dur="1s" repeatCount="indefinite"/></rect>
<circle cx="${hx}" cy="${hy}" r="7.5" fill="none" stroke="${C.cyan}" stroke-width="1.6"><animate attributeName="opacity" values=".1;.9;.1" dur="2.4s" repeatCount="indefinite"/></circle>
${[[l1x, l1y, 0], [l2x, l2y, 0.12]].map(([x, y, b]) => `<ellipse cx="${x}" cy="${y}" rx="2.2" ry="7" fill="#fff" opacity="0" transform="rotate(35 ${x} ${y})"><animate attributeName="opacity" values="0;0;.75;0;0" keyTimes="0;.86;.9;.95;1" dur="6s" begin="${b}s" repeatCount="indefinite"/><animate attributeName="cx" values="${x - 7};${x - 7};${x + 7};${x + 7}" keyTimes="0;.86;.95;1" dur="6s" begin="${b}s" repeatCount="indefinite"/></ellipse>`).join("")}`;
  const rows = [
    ["ROLE", PROFILE.role],
    ["COMPANY", d.company],
    ["BASED IN", d.location],
    ["EXPERIENCE", `${PROFILE.yearsExperience} years in software engineering`],
    ["DOMAIN", "Banking & Payments · Distributed Systems"],
    ["STACK", PROFILE.coreTools.slice(0, 4).map((t) => t[1]).join(" · ")],
    ["PLATFORM", PROFILE.coreTools.slice(4).map((t) => t[1]).join(" · ")],
  ].filter((r) => r[1]).map(([k, v], i) => {
    const y = 122 + i * 26, col = [C.cyan, C.lilac, C.pink][i % 3];
    return `<rect x="332" y="${y - 10}" width="3" height="12" rx="1.5" fill="${col}"/>
<text x="344" y="${y}" fill="${C.dim}" font-family="${MONO}" font-size="10" font-weight="700" letter-spacing="1.5">${k}</text>
<text x="452" y="${y}" fill="${C.white}" font-family="${SANS}" font-size="13.5" font-weight="600">${esc(v)}</text>`;
  }).join("\n");
  const body = `
<g clip-path="url(#cardclip)"><circle cx="160" cy="160" r="230" fill="url(#glow)"/></g>
<path d="M${P.x - 8} ${P.y + 26}V${P.y - 8}H${P.x + 26}M${P.x + P.s - 26} ${P.y + P.s + 8}H${P.x + P.s + 8}V${P.y + P.s - 26}" fill="none" stroke="${C.cyan}" stroke-opacity=".6" stroke-width="1.5"/>
<g>
<animateTransform attributeName="transform" type="translate" values="0 0;0 -4;0 0" dur="6s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1" keyTimes="0;.5;1"/>
<g clip-path="url(#pc)">
${picture}
<rect x="${P.x}" y="${P.y}" width="${P.s}" height="${P.s}" fill="url(#tint)"/>
${d.wave ? "" : `<circle cx="${nx}" cy="${ny}" r="34" fill="url(#neon)"><animate attributeName="opacity" values=".15;.95;.7;1;.2;.9;.15" keyTimes="0;.3;.34;.38;.42;.6;1" dur="4.2s" repeatCount="indefinite"/></circle>`}
<rect x="${P.x}" width="${P.s}" height="46" fill="url(#scan)" y="${P.y - 46}"><animate attributeName="y" values="${P.y - 46};${P.y + P.s}" dur="5.5s" repeatCount="indefinite"/></rect>
${stillOverlays}
</g>
<rect x="${P.x}" y="${P.y}" width="${P.s}" height="${P.s}" rx="16" fill="none" stroke="url(#acc)" stroke-width="1.5" stroke-opacity=".8"/>
</g>
${label(332, 52, "// WHO'S AT THE KEYBOARD")}
${heading(332, 84, "The engineer behind the systems")}
<rect x="722" y="36" width="134" height="24" rx="12" fill="${C.green}" fill-opacity=".12" stroke="${C.green}" stroke-opacity=".7"/>
<circle cx="738" cy="48" r="4" fill="${C.green}"><animate attributeName="opacity" values="1;.2;1" dur="1.6s" repeatCount="indefinite"/></circle>
<text x="749" y="51.5" fill="#A7F3D0" font-family="${MONO}" font-size="9.5" font-weight="700" letter-spacing="1">OPEN TO COLLAB</text>
<path d="M332 98H856" stroke="${C.line}"/>
${rows}
${[["{ }", 800, 5.5, 0], ["</>", 836, 7, 2.2], ["@Bean", 770, 8, 1.1]].map(([t, x, dur, b]) => `<text x="${x}" fill="${C.cyan}" font-family="${MONO}" font-size="11" font-weight="700" opacity="0" y="290">${esc(t)}<animate attributeName="y" values="296;120" dur="${dur}s" begin="${b}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.45;.45;0" keyTimes="0;.2;.7;1" dur="${dur}s" begin="${b}s" repeatCount="indefinite"/></text>`).join("")}`;
  return card(320, `${PROFILE.name} — ${PROFILE.role}`,
    `${d.wave ? `Short loop of ${PROFILE.name} at a laptop, waving hello` : `Photo of ${PROFILE.name} coding at a laptop`}, with profile details: ${PROFILE.role}${d.company ? ` at ${d.company}` : ""}${d.location ? `, based in ${d.location}` : ""}. ${PROFILE.yearsExperience} years of experience in banking and payments. Core stack: ${PROFILE.coreTools.map((t) => t[1]).join(", ")}.`,
    body,
    `<clipPath id="pc"><rect x="${P.x}" y="${P.y}" width="${P.s}" height="${P.s}" rx="16"/></clipPath>
  <linearGradient id="tint" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${C.violet}" stop-opacity=".10"/><stop offset=".7" stop-color="#080D1B" stop-opacity="0"/><stop offset="1" stop-color="#080D1B" stop-opacity=".45"/></linearGradient>
  <radialGradient id="neon"><stop stop-color="#C4B5FD" stop-opacity=".75"/><stop offset="1" stop-color="${C.violet}" stop-opacity="0"/></radialGradient>
  <linearGradient id="scan" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${C.cyan}" stop-opacity="0"/><stop offset=".85" stop-color="${C.cyan}" stop-opacity=".16"/><stop offset="1" stop-color="${C.cyan}" stop-opacity=".5"/></linearGradient>`);
}

function hero(d) {
  const CH = 9.03; // mono advance at 15px
  const slot = 3.2;
  const cycle = slot * PROFILE.typing.length;
  const typing = PROFILE.typing.map((p, i) => {
    const full = Math.ceil(p.length * CH) + 2;
    const begin = (i * slot).toFixed(1);
    const kt = "0;0.12;0.28;0.3333;1";
    return `<clipPath id="ty${i}"><rect x="58" y="160" height="24" width="${i === 0 ? full : 0}"><animate attributeName="width" values="0;${full};${full};0;0" keyTimes="${kt}" dur="${cycle}s" begin="${begin}s" repeatCount="indefinite"/></rect></clipPath>
<text x="58" y="177" clip-path="url(#ty${i})" fill="${C.text}" font-family="${MONO}" font-size="15" font-weight="600">${esc(p)}</text>
<rect y="164" width="8" height="16" fill="${C.cyan}" x="58" opacity="0"><animate attributeName="x" values="58;${58 + full};${58 + full};58;58" keyTimes="${kt}" dur="${cycle}s" begin="${begin}s" repeatCount="indefinite"/><animate attributeName="opacity" calcMode="discrete" values="1;0" keyTimes="0;0.3333" dur="${cycle}s" begin="${begin}s" repeatCount="indefinite"/></rect>`;
  }).join("\n");

  let px = 156, py = 258;
  const pills = PROFILE.positioning.map((s, i) => {
    const w = Math.round(s.length * 6.75 + 22), col = [C.cyan, C.cyan, C.lilac, C.pink, C.lilac][i % 5];
    if (px + w > 500) { px = 156; py += 30; }
    const out = `<rect x="${px}" y="${py}" width="${w}" height="24" rx="12" fill="${col}" fill-opacity=".10" stroke="${col}" stroke-opacity=".65"/>
<text x="${px + w / 2}" y="${py + 15.5}" text-anchor="middle" fill="${C.white}" font-family="${MONO}" font-size="9.5" font-weight="700" letter-spacing="1">${esc(s)}</text>`;
    px += w + 8;
    return out;
  }).join("\n");
  const tiles = `<rect x="40" y="256" width="104" height="56" rx="10" fill="${C.panel}" fill-opacity=".8" stroke="${C.line}"/>
<text x="52" y="282" fill="${C.cyan}" font-family="${SANS}" font-size="21" font-weight="800">${esc(PROFILE.yearsExperience)}</text>
<text x="52" y="300" fill="${C.dim}" font-family="${MONO}" font-size="8.5" letter-spacing="1">YEARS EXP</text>
${pills}`;

  // isometric service stack
  const cx = 715, hw = 105, hh = 50, t = 14;
  const slab = (cy, col, name, i) => `<g>
<animateTransform attributeName="transform" type="translate" values="0 0;0 -5;0 0" dur="4.5s" begin="${i * 0.5}s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1" keyTimes="0;.5;1"/>
<path d="M${cx - hw} ${cy}L${cx} ${cy + hh}V${cy + hh + t}L${cx - hw} ${cy + t}Z" fill="${col}" fill-opacity=".30" stroke="${col}" stroke-opacity=".7"/>
<path d="M${cx + hw} ${cy}L${cx} ${cy + hh}V${cy + hh + t}L${cx + hw} ${cy + t}Z" fill="${col}" fill-opacity=".16" stroke="${col}" stroke-opacity=".7"/>
<path d="M${cx - hw} ${cy}L${cx} ${cy - hh}L${cx + hw} ${cy}L${cx} ${cy + hh}Z" fill="#0B1228" fill-opacity=".92" stroke="${col}" stroke-width="1.5"/>
<path d="M${cx - hw / 2} ${cy - hh / 2}L${cx + hw / 2} ${cy + hh / 2}M${cx + hw / 2} ${cy - hh / 2}L${cx - hw / 2} ${cy + hh / 2}M${cx - hw} ${cy}H${cx + hw}M${cx} ${cy - hh}V${cy + hh}" stroke="${col}" stroke-opacity=".22"/>
${[[-42, 0], [0, -20], [42, 0], [0, 20], [0, 0]].map(([dx, dy], k) => `<circle cx="${cx + dx}" cy="${cy + dy}" r="${k === 4 ? 4 : 2.6}" fill="${col}"><animate attributeName="opacity" values="1;.25;1" dur="2.4s" begin="${(k * 0.35 + i * 0.2).toFixed(2)}s" repeatCount="indefinite"/></circle>`).join("")}
<text x="${cx - hw - 10}" y="${cy + 4}" text-anchor="end" fill="${col}" font-family="${MONO}" font-size="9.5" font-weight="700" letter-spacing="1.2">${name}</text>
</g>`;
  const packet = (x, dur, begin, col) => `<path d="M${x} 118V254" stroke="${col}" stroke-opacity=".35" stroke-dasharray="2 5"/>
<circle cx="${x}" cy="118" r="3.2" fill="${col}" opacity="0"><animate attributeName="cy" values="118;254" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.1;.9;1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></circle>`;

  const art = `<path d="M592 84V66H610M830 66H848V84M848 300V318H830M610 318H592V300" fill="none" stroke="${C.cyan}" stroke-opacity=".6" stroke-width="1.5"/>
${slab(254, C.pink, "DATA · EVENTS", 2)}
${slab(186, C.violet, "SERVICES", 1)}
${slab(118, C.cyan, "EDGE · API", 0)}
${packet(cx - 42, 2.6, 0, C.cyan)}${packet(cx, 3.2, 0.8, C.lilac)}${packet(cx + 42, 2.2, 1.4, C.pink)}
${[[560, 96], [856, 150], [572, 232], [842, 250]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="1.8" fill="${C.text}"><animate attributeName="opacity" values=".15;.9;.15" dur="${3 + i * 0.7}s" repeatCount="indefinite"/></circle>`).join("")}`;

  const body = `
<g clip-path="url(#cardclip)"><circle cx="715" cy="180" r="230" fill="url(#glow)"/></g>
<circle cx="30" cy="28" r="5" fill="#F87171"/><circle cx="46" cy="28" r="5" fill="#FBBF24"/><circle cx="62" cy="28" r="5" fill="${C.green}"/>
<text x="84" y="32" fill="${C.cyan}" font-family="${MONO}" font-size="12">${esc(PROFILE.shell)}</text>
<path d="M1 48H${W - 1}" stroke="${C.line}"/>
<text x="40" y="92" fill="${C.text}" font-family="${SANS}" font-size="18" font-weight="500">Hi, I'm</text>
<text x="38" y="142" fill="url(#name)" font-family="${SANS}" font-size="50" font-weight="800" letter-spacing="-.5">${esc(PROFILE.name)}</text>
<text x="40" y="177" fill="${C.pink}" font-family="${MONO}" font-size="15" font-weight="700">&gt;</text>
${typing}
<text x="40" y="210" fill="${C.dim}" font-family="${SANS}" font-size="14.5">${esc(PROFILE.tagline[0])}</text>
<text x="40" y="231" fill="${C.dim}" font-family="${SANS}" font-size="14.5">${esc(PROFILE.tagline[1])}</text>
${tiles}
${d.photo ? "" : `<rect x="722" y="13" width="134" height="24" rx="12" fill="${C.green}" fill-opacity=".12" stroke="${C.green}" stroke-opacity=".7"/>
<circle cx="738" cy="25" r="4" fill="${C.green}"><animate attributeName="opacity" values="1;.2;1" dur="1.6s" repeatCount="indefinite"/></circle>
<text x="749" y="28.5" fill="#A7F3D0" font-family="${MONO}" font-size="9.5" font-weight="700" letter-spacing="1">OPEN TO COLLAB</text>`}
${art}`;
  return card(340, `${PROFILE.name} — ${PROFILE.typing[0]}`,
    `Terminal-style profile banner. ${PROFILE.positioning.join(", ")}. ${PROFILE.tagline.join(" ")} ${PROFILE.yearsExperience} years of experience.`,
    body,
    `<linearGradient id="name" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${C.cyan}"/><stop offset=".6" stop-color="${C.lilac}"/><stop offset="1" stop-color="#F472B6"/></linearGradient>`);
}

function pipeline() {
  const stages = ["COMMIT", "BUILD", "TEST", "SCAN", "DEPLOY", "OBSERVE"];
  const x0 = 90, step = 140, y = 44, dur = 7;
  const cols = [C.cyan, C.cyan, C.lilac, C.lilac, C.pink, C.pink];
  const nodes = stages.map((s, i) => {
    const x = x0 + i * step, b = ((i * dur) / (stages.length - 1)).toFixed(2);
    return `<circle cx="${x}" cy="${y}" r="13" fill="#0B1228" stroke="${cols[i]}" stroke-width="1.5"/>
<circle cx="${x}" cy="${y}" r="13" fill="${cols[i]}" opacity="0"><animate attributeName="opacity" values="0;.85;0;0" keyTimes="0;.04;.2;1" dur="${dur}s" begin="${b}s" repeatCount="indefinite"/></circle>
<circle cx="${x}" cy="${y}" r="4" fill="${cols[i]}"/>
<text x="${x}" y="${y + 34}" text-anchor="middle" fill="${C.text}" font-family="${MONO}" font-size="10" font-weight="700" letter-spacing="1.5">${s}</text>`;
  }).join("\n");
  const path = `M${x0} ${y}H${x0 + step * (stages.length - 1)}`;
  const body = `
<path d="${path}" stroke="${C.line}" stroke-width="2"/>
<path d="${path}" stroke="url(#acc)" stroke-width="2" stroke-dasharray="6 10" stroke-opacity=".8"><animate attributeName="stroke-dashoffset" values="32;0" dur="1.2s" repeatCount="indefinite"/></path>
${nodes}
<circle r="5" fill="${C.white}"><animateMotion path="${path}" dur="${dur}s" repeatCount="indefinite"/></circle>
<circle r="9" fill="${C.cyan}" opacity=".25"><animateMotion path="${path}" dur="${dur}s" repeatCount="indefinite"/></circle>`;
  return card(100, "Delivery pipeline", "Animated delivery pipeline: commit, build, test, scan, deploy, observe.", body);
}

function about() {
  const box = (x, y, w, h, s, col) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="#0B1228" stroke="${col}" stroke-opacity=".8"/>
<text x="${x + w / 2}" y="${y + h / 2 + 3.5}" text-anchor="middle" fill="${col}" font-family="${MONO}" font-size="9.5" font-weight="700" letter-spacing="1">${s}</text>`;
  const flow = (dpath, col, dur = 1) => `<path d="${dpath}" fill="none" stroke="${col}" stroke-width="1.5" stroke-dasharray="3 6" stroke-linecap="round"><animate attributeName="stroke-dashoffset" values="18;0" dur="${dur}s" repeatCount="indefinite"/></path>`;
  const bullets = [
    [C.cyan, "Systems that hold under load", "Microservices, event-driven flows, caching and resilience patterns."],
    [C.lilac, "Money-grade correctness", "Card settlement, reconciliation and secure payment APIs."],
    [C.pink, "Delivery, end to end", "From API design to containers, CI/CD and production readiness."],
  ].map(([col, t, s], i) => {
    const y = 132 + i * 44;
    return `<rect x="340" y="${y}" width="28" height="28" rx="8" fill="${col}" fill-opacity=".14" stroke="${col}" stroke-opacity=".7"/>
<path d="M348 ${y + 14.5}l4.5 4.5 8-9" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<text x="380" y="${y + 11}" fill="${C.white}" font-family="${SANS}" font-size="14" font-weight="700">${esc(t)}</text>
<text x="380" y="${y + 27}" fill="${C.dim}" font-family="${SANS}" font-size="12">${esc(s)}</text>`;
  }).join("\n");
  const body = `
<g clip-path="url(#cardclip)"><circle cx="164" cy="160" r="190" fill="url(#glow)"/></g>
<rect x="24" y="24" width="280" height="262" rx="14" fill="${C.panel}" fill-opacity=".55" stroke="${C.line}"/>
${flow("M164 78V96H78V114", C.cyan)}${flow("M164 78V114", C.cyan, 0.8)}${flow("M164 78V96H250V114", C.cyan)}
${flow("M78 144V182", C.lilac, 0.9)}${flow("M164 144V182", C.lilac, 0.7)}${flow("M250 144V182", C.lilac, 1.1)}
${flow("M108 208V238", C.pink, 0.9)}${flow("M220 208V238", C.pink, 1.1)}
${box(84, 48, 160, 30, "API GATEWAY", C.cyan)}
${box(40, 114, 76, 30, "AUTH", C.lilac)}${box(126, 114, 76, 30, "PAYMENTS", C.lilac)}${box(212, 114, 76, 30, "LEDGER", C.lilac)}
${box(40, 182, 248, 26, "EVENT BUS", C.pink)}
${box(60, 238, 96, 28, "POSTGRES", C.cyan)}${box(172, 238, 96, 28, "REDIS", C.cyan)}
${label(340, 52, "// MY ENGINEERING WAY")}
${heading(340, 84, "Design for failure. Ship with confidence.")}
<text x="340" y="108" fill="${C.dim}" font-family="${SANS}" font-size="13">${esc(PROFILE.yearsExperience)} years building Java platforms for banking and payments.</text>
${bullets}
<rect x="340" y="262" width="510" height="26" rx="6" fill="${C.pink}" fill-opacity=".08"/>
<rect x="340" y="262" width="3" height="26" fill="${C.pink}"/>
<text x="354" y="279" fill="#FBCFE8" font-family="${MONO}" font-size="11.5" font-style="italic">"Make it work, make it right, make it observable."</text>`;
  return card(310, "My engineering way", "Design for failure, ship with confidence. Systems that hold under load, money-grade correctness, and end-to-end delivery. Illustrated with a small animated architecture diagram: API gateway, services, event bus and data stores.", body);
}

function arsenal() {
  const x0 = 188, span = 666, cy = 150;
  const cw = 89, cgap = (span - 7 * cw) / 6;
  const core = PROFILE.coreTools.map(([slug, name, col], i) => {
    const x = +(x0 + i * (cw + cgap)).toFixed(1), y = 104;
    return `<rect x="${x}" y="${y}" width="${cw}" height="58" rx="11" fill="${C.panel}" stroke="${col}" stroke-opacity=".5"><animate attributeName="stroke-opacity" values=".5;1;.5;.5" keyTimes="0;.12;.3;1" dur="4.9s" begin="${(i * 0.7).toFixed(1)}s" repeatCount="indefinite"/></rect>
<rect x="${x}" y="${y}" width="${cw}" height="58" rx="11" fill="${col}" fill-opacity=".07"/>
${icon(slug, x + cw / 2 - 11, y + 9, 22, col)}
<text x="${x + cw / 2}" y="${y + 47}" text-anchor="middle" fill="${C.white}" font-family="${SANS}" font-size="11.5" font-weight="700">${esc(name)}</text>`;
  }).join("\n");
  const pw = 127, pgap = (span - 5 * pw) / 4;
  const more = PROFILE.moreTools.map(([slug, name, col], i) => {
    const x = +(x0 + (i % 5) * (pw + pgap)).toFixed(1), y = 194 + Math.floor(i / 5) * 32;
    return `<rect x="${x}" y="${y}" width="${pw}" height="26" rx="8" fill="${C.panel}" fill-opacity=".7" stroke="${C.line}"/>
${icon(slug, x + 10, y + 6.5, 13, col)}
<text x="${x + 30}" y="${y + 17}" fill="${C.text}" font-family="${SANS}" font-size="10.5" font-weight="500">${esc(name)}</text>`;
  }).join("\n");
  const pts = [0, 1, 2, 3, 4, 5].map((k) => { const a = (Math.PI / 3) * k - Math.PI / 2; return `${(98 + 40 * Math.cos(a)).toFixed(1)} ${(cy + 40 * Math.sin(a)).toFixed(1)}`; });
  const sub = (x, y, s) => `<text x="${x}" y="${y}" fill="${C.dim}" font-family="${MONO}" font-size="8.5" letter-spacing="1.5">${s}</text>`;
  const body = `
<g clip-path="url(#cardclip)"><circle cx="98" cy="${cy}" r="150" fill="url(#glow)"/></g>
<path d="M128 ${cy}L${x0} 104V162Z" fill="url(#beam)"><animate attributeName="opacity" values=".55;1;.55" dur="3.2s" repeatCount="indefinite"/></path>
<g fill="none" stroke="url(#acc)" stroke-width="1.6" opacity=".8">
<ellipse cx="98" cy="${cy}" rx="66" ry="24"><animateTransform attributeName="transform" type="rotate" from="0 98 ${cy}" to="360 98 ${cy}" dur="14s" repeatCount="indefinite"/></ellipse>
<ellipse cx="98" cy="${cy}" rx="66" ry="24" transform="rotate(60 98 ${cy})"><animateTransform attributeName="transform" type="rotate" from="60 98 ${cy}" to="420 98 ${cy}" dur="18s" repeatCount="indefinite"/></ellipse>
</g>
<path d="M${pts.join("L")}Z" fill="#0B1228" stroke="${C.cyan}" stroke-width="1.8"/>
<path d="M${pts[0]}L98 ${cy}L${pts[2]}M98 ${cy}L${pts[4]}" fill="none" stroke="${C.violet}" stroke-width="1.6"/>
<circle cx="98" cy="${cy}" r="6" fill="${C.cyan}"><animate attributeName="r" values="5;8;5" dur="2s" repeatCount="indefinite"/></circle>
${label(x0, 44, "// TECH ARSENAL")}
${heading(x0, 72, "Tools I build with")}
${sub(x0, 95, "CORE STACK")}
${core}
${sub(x0, 184, "ALSO IN THE TOOLBOX")}
${more}`;
  return card(274, "Tools I build with", `Core stack: ${PROFILE.coreTools.map((t) => t[1]).join(", ")}. Also: ${PROFILE.moreTools.map((t) => t[1]).join(", ")}.`, body,
    `<linearGradient id="beam" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${C.cyan}" stop-opacity=".45"/><stop offset="1" stop-color="${C.violet}" stop-opacity="0"/></linearGradient>`);
}

function stats(d) {
  const fields = [["BASE", d.location], ["ORG", d.company], ["STACK", "Java"], ["SINCE", d.since]].filter((f) => f[1]);
  const fieldSvg = fields.map(([k, v], i) => {
    const x = 52 + (i % 2) * 84, y = 244 + Math.floor(i / 2) * 26;
    return `<text x="${x}" y="${y}" fill="${C.faint}" font-family="${MONO}" font-size="7.5" letter-spacing="1">${k}</text>
<text x="${x}" y="${y + 12}" fill="${C.text}" font-family="${SANS}" font-size="10.5" font-weight="700">${esc(v)}</text>`;
  }).join("\n");
  // deterministic barcode from the username
  let bx = 52, seed = [...PROFILE.user].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7), bars = "";
  while (bx < 202) { seed = (seed * 1103515245 + 12345) >>> 0; const w = 1 + ((seed >>> 16) % 3); bars += `<rect x="${bx}" y="294" width="${w}" height="12"/>`; bx += w + 1 + ((seed >>> 20) % 2); }

  const tiles = [
    [PROFILE.yearsExperience, "YEARS EXPERIENCE", C.cyan], [d.yearsOnGithub, "YEARS ON GITHUB", C.lilac],
    [d.repos, "PUBLIC REPOS", C.pink], [d.stars, "STARS EARNED", C.green],
  ].map(([n, l, col], i) => {
    const x = 250 + i * 153;
    return `<rect x="${x}" y="92" width="141" height="58" rx="10" fill="${C.panel}" fill-opacity=".85" stroke="${C.line}"/>
<rect x="${x + 14}" y="103" width="18" height="3" rx="1.5" fill="${col}"/>
<text x="${x + 14}" y="130" fill="${C.white}" font-family="${SANS}" font-size="22" font-weight="800">${esc(n)}</text>
<text x="${x + 14}" y="143" fill="${C.dim}" font-family="${MONO}" font-size="8" letter-spacing="1">${l}</text>`;
  }).join("\n");

  const depth = PROFILE.depth.map(([t, s], i) => {
    const y = 208 + i * 22, col = [C.cyan, C.lilac, C.pink, C.cyan, C.lilac][i % 5];
    return `<rect x="264" y="${y - 9}" width="3" height="11" rx="1.5" fill="${col}"/>
<text x="275" y="${y}" fill="${C.white}" font-family="${SANS}" font-size="11.5" font-weight="700">${esc(t)}</text>
<text x="412" y="${y}" fill="${C.dim}" font-family="${SANS}" font-size="10.5">${esc(s)}</text>`;
  }).join("\n");

  const focus = PROFILE.focus.map(([t, s], i) => {
    const y = 204 + i * 37, col = [C.cyan, C.lilac, C.pink][i % 3];
    return `<circle cx="630" cy="${y - 4}" r="3.5" fill="${col}"><animate attributeName="opacity" values="1;.3;1" dur="2.2s" begin="${i * 0.5}s" repeatCount="indefinite"/></circle>
<text x="642" y="${y}" fill="${C.white}" font-family="${SANS}" font-size="12.5" font-weight="700">${esc(t)}</text>
<text x="642" y="${y + 15}" fill="${C.dim}" font-family="${SANS}" font-size="10.5">${esc(s)}</text>`;
  }).join("\n");

  const body = `
<g clip-path="url(#cardclip)"><circle cx="128" cy="190" r="170" fill="url(#glow)"/></g>
<g>
<animateTransform attributeName="transform" type="rotate" values="-1.6 128 0;1.6 128 0;-1.6 128 0" dur="6s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1" keyTimes="0;.5;1"/>
<rect x="120" y="0" width="16" height="58" fill="url(#strap)"/>
<rect x="114" y="54" width="28" height="16" rx="4" fill="#1E293B" stroke="${C.dim}"/>
<rect x="38" y="66" width="180" height="252" rx="12" fill="url(#badge)" stroke="${C.pink}" stroke-opacity=".7"/>
<rect x="116" y="72" width="24" height="6" rx="3" fill="#080D1B"/>
<text x="52" y="92" fill="${C.pink}" font-family="${MONO}" font-size="7.5" font-weight="700" letter-spacing="1.5">ENGINEER · REGISTRATION</text>
${d.avatar ? `<image x="86" y="102" width="84" height="84" clip-path="url(#av)" preserveAspectRatio="xMidYMid slice" xlink:href="${d.avatar}" href="${d.avatar}"/>` : `<rect x="86" y="102" width="84" height="84" rx="16" fill="#1E293B"/><text x="128" y="156" text-anchor="middle" fill="${C.white}" font-family="${SANS}" font-size="34" font-weight="800">${esc(PROFILE.name[0])}</text>`}
<rect x="86" y="102" width="84" height="84" rx="16" fill="none" stroke="url(#acc)" stroke-width="2"/>
<text x="128" y="208" text-anchor="middle" fill="${C.white}" font-family="${SANS}" font-size="15" font-weight="800">${esc(PROFILE.name)}</text>
<text x="128" y="222" text-anchor="middle" fill="${C.pink}" font-family="${MONO}" font-size="8.5" font-weight="700" letter-spacing="1.5">${esc(PROFILE.role.toUpperCase())}</text>
<path d="M52 231H204" stroke="${C.line}"/>
${fieldSvg}
<g fill="${C.text}" opacity=".75">${bars}</g>
</g>
${label(250, 44, "// FIELD DASHBOARD")}
${heading(250, 72, "Stats from the field")}
<rect x="786" y="30" width="64" height="22" rx="11" fill="${C.green}" fill-opacity=".12" stroke="${C.green}" stroke-opacity=".7"/>
<circle cx="800" cy="41" r="3.5" fill="${C.green}"><animate attributeName="opacity" values="1;.2;1" dur="1.4s" repeatCount="indefinite"/></circle>
<text x="809" y="44.5" fill="#A7F3D0" font-family="${MONO}" font-size="9.5" font-weight="700" letter-spacing="1.5">LIVE</text>
${tiles}
<rect x="250" y="162" width="350" height="156" rx="10" fill="${C.panel}" fill-opacity=".85" stroke="${C.line}"/>
<text x="264" y="183" fill="${C.dim}" font-family="${MONO}" font-size="8.5" letter-spacing="1.5">WHERE THE DEPTH IS</text>
${depth}
<rect x="612" y="162" width="238" height="156" rx="10" fill="${C.panel}" fill-opacity=".85" stroke="${C.line}"/>
<text x="626" y="183" fill="${C.dim}" font-family="${MONO}" font-size="8.5" letter-spacing="1.5">ACTIVE FOCUS</text>
${focus}`;
  return card(340, "Stats from the field",
    `${PROFILE.yearsExperience} years of experience, ${d.yearsOnGithub} years on GitHub, ${d.repos} public repositories, ${d.stars} stars. Depth: ${PROFILE.depth.map(([t, x]) => `${t} (${x})`).join("; ")}.`,
    body,
    `<linearGradient id="strap" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#BE185D"/><stop offset=".5" stop-color="${C.pink}"/><stop offset="1" stop-color="#BE185D"/></linearGradient>
  <linearGradient id="badge" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#16213F"/><stop offset="1" stop-color="#26143F"/></linearGradient>
  <clipPath id="av"><rect x="86" y="102" width="84" height="84" rx="16"/></clipPath>`);
}

function connect(d) {
  const glyph = {
    globe: (x, y, c) => `<g fill="none" stroke="${c}" stroke-width="1.5"><circle cx="${x + 8}" cy="${y + 8}" r="7.2"/><ellipse cx="${x + 8}" cy="${y + 8}" rx="3.2" ry="7.2"/><path d="M${x + 0.8} ${y + 8}H${x + 15.2}"/></g>`,
    pin: (x, y, c) => `<path d="M${x + 8} ${y + 15.5}c-3.6-4.2-5.4-6.9-5.4-9.3a5.4 5.4 0 0 1 10.8 0c0 2.4-1.8 5.1-5.4 9.3z" fill="none" stroke="${c}" stroke-width="1.5"/><circle cx="${x + 8}" cy="${y + 6.2}" r="1.8" fill="${c}"/>`,
    chat: (x, y, c) => `<path d="M${x + 1.5} ${y + 2.5}h13v8.5h-7.5l-3.5 3.2v-3.2h-2z" fill="none" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/>`,
  };
  const items = [
    [C.white, (x, y) => icon("github", x, y, 16, C.white), "GitHub", `github.com/${PROFILE.user}`],
    [C.cyan, (x, y) => glyph.globe(x, y, C.cyan), "Portfolio", PROFILE.portfolio],
    d.location && [C.pink, (x, y) => glyph.pin(x, y, C.pink), "Based in", d.location],
    [C.lilac, (x, y) => glyph.chat(x, y, C.lilac), "Talk to me about", PROFILE.topics],
  ].filter(Boolean).map(([col, ic, t, v], i) => {
    const x = 240 + (i % 2) * 308, y = 98 + Math.floor(i / 2) * 50;
    return `<rect x="${x}" y="${y}" width="296" height="40" rx="10" fill="${C.panel}" fill-opacity=".85" stroke="${C.line}"/>
<rect x="${x + 8}" y="${y + 6}" width="28" height="28" rx="8" fill="${col}" fill-opacity=".12"/>
${ic(x + 14, y + 12)}
<text x="${x + 46}" y="${y + 17}" fill="${C.white}" font-family="${SANS}" font-size="12" font-weight="700">${esc(t)}</text>
<text x="${x + 46}" y="${y + 31}" fill="${C.dim}" font-family="${MONO}" font-size="10">${esc(v)}</text>`;
  }).join("\n");
  const body = `
<g clip-path="url(#cardclip)"><circle cx="120" cy="107" r="160" fill="url(#glow)"/></g>
<g fill="none" stroke="${C.cyan}" stroke-opacity=".25"><circle cx="120" cy="107" r="24"/><circle cx="120" cy="107" r="48"/><circle cx="120" cy="107" r="72"/><path d="M40 107H200M120 27V187"/></g>
${[0, 1.5].map((b) => `<circle cx="120" cy="107" fill="none" stroke="${C.cyan}" stroke-width="1.5" r="6"><animate attributeName="r" values="6;72" dur="3s" begin="${b}s" repeatCount="indefinite"/><animate attributeName="opacity" values=".9;0" dur="3s" begin="${b}s" repeatCount="indefinite"/></circle>`).join("")}
<g><animateTransform attributeName="transform" type="rotate" from="0 120 107" to="360 120 107" dur="5s" repeatCount="indefinite"/>
<path d="M120 107L120 35A72 72 0 0 1 182.4 71Z" fill="url(#sweep)"/><path d="M120 107V35" stroke="${C.cyan}" stroke-width="1.5"/></g>
<circle cx="120" cy="107" r="5" fill="${C.cyan}"/>
<circle cx="152" cy="78" r="3" fill="${C.pink}"><animate attributeName="opacity" values="0;1;0;0" keyTimes="0;.1;.5;1" dur="5s" begin="0.4s" repeatCount="indefinite"/></circle>
<circle cx="84" cy="140" r="3" fill="${C.lilac}"><animate attributeName="opacity" values="0;1;0;0" keyTimes="0;.1;.5;1" dur="5s" begin="3s" repeatCount="indefinite"/></circle>
${label(240, 46, "// OPEN CHANNEL")}
${heading(240, 76, "Let's build something reliable")}
${items}`;
  return card(214, "Let's build something reliable", `Contact: github.com/${PROFILE.user}, ${PROFILE.portfolio}. Open to conversations about ${PROFILE.topics}.`, body,
    `<linearGradient id="sweep" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${C.cyan}" stop-opacity=".35"/><stop offset="1" stop-color="${C.cyan}" stop-opacity="0"/></linearGradient>`);
}

// ───────────────────────────── data ─────────────────────────────
async function gh(path) {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "profile-card-generator" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const r = await fetch(`https://api.github.com${path}`, { headers });
  if (!r.ok) throw new Error(`GitHub API ${path} → ${r.status} ${r.statusText}`);
  return r.json();
}

async function load() {
  const user = await gh(`/users/${PROFILE.user}`);
  const all = await gh(`/users/${PROFILE.user}/repos?per_page=100&type=owner`);
  const own = all.filter((r) => !r.fork && !r.archived);
  for (const r of own) {
    if (r.name === PROFILE.user) continue; // the profile repo itself is just this README
    r.langs = await gh(`/repos/${r.full_name}/languages`);
  }

  let avatar = null;
  try {
    const r = await fetch(`${user.avatar_url}&s=168`);
    if (r.ok) avatar = `data:${r.headers.get("content-type") || "image/jpeg"};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
  } catch { /* badge falls back to an initial */ }

  const photoPath = join(ROOT, "assets/coder.jpg");
  const photo = existsSync(photoPath) ? `data:image/jpeg;base64,${readFileSync(photoPath).toString("base64")}` : null;
  const wavePath = join(ROOT, "assets/wave.jpg");
  const wave = existsSync(wavePath) ? `data:image/jpeg;base64,${readFileSync(wavePath).toString("base64")}` : null;

  const created = new Date(user.created_at);
  return {
    repos: user.public_repos,
    stars: own.reduce((a, r) => a + r.stargazers_count, 0),
    followers: user.followers,
    since: String(created.getUTCFullYear()),
    yearsOnGithub: Math.floor((Date.now() - created) / (365.25 * 864e5)),
    location: user.location?.trim() || "",
    company: user.company?.trim().replace(/^@/, "") || "",
    avatar, photo, wave,
    featured: own.filter((r) => r.name !== PROFILE.user && !PROFILE.hiddenRepos.includes(r.name))
      .sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.pushed_at) - new Date(a.pushed_at))
      .slice(0, 6),
  };
}

function featuredTable(d) {
  const cell = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
  const rows = d.featured.map((r) => {
    const stack = Object.keys(r.langs || {}).slice(0, 3).map((l) => `\`${l}\``).join(" ") || "—";
    return `| [**${r.name}**](${r.html_url}) | ${cell(r.description) || "—"} | ${stack} | ${r.stargazers_count} |`;
  });
  return ["| Project | What it is | Stack | ★ |", "|:--|:--|:--|:-:|", ...rows].join("\n");
}

// ───────────────────────────── main ─────────────────────────────
const data = await load();
mkdirSync(join(ROOT, "assets"), { recursive: true });
const out = { ...(data.photo || data.wave ? { "intro-animated": intro(data) } : {}), hero: hero(data), pipeline: pipeline(), about: about(), arsenal: arsenal(), stats: stats(data), connect: connect(data) };
for (const [name, svg] of Object.entries(out)) writeFileSync(join(ROOT, `assets/${name}.svg`), svg);

const readmePath = join(ROOT, "README.md");
const readme = readFileSync(readmePath, "utf8");
const marker = /(<!-- FEATURED:START -->)[\s\S]*?(<!-- FEATURED:END -->)/;
if (marker.test(readme)) writeFileSync(readmePath, readme.replace(marker, `$1\n${featuredTable(data)}\n$2`));

console.log(`Generated ${Object.keys(out).length} cards · ${data.repos} repos · ${data.stars} stars · ${data.featured.length} repos in table`);
