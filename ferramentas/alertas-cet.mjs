// Robô dos alertas da CET (Tarefa 5). Roda todo dia no GitHub Actions (alertas-cet.yml) e também à mão:
//   node ferramentas/alertas-cet.mjs
// Lê as notícias públicas da CET (RSS, sem login): interdições, obras, eventos, jogos, manifestações e operações especiais.
// Para cada notícia: o que é, onde, início/fim e o link da fonte. O lugar é achado no mapa aberto (OpenStreetMap/Overpass):
//  - "Rua X, entre a Rua Y e a Rua Z": só o trecho entre as duas (a rota do app desvia dele);
//  - túnel, viaduto, ponte, praça ou via curta: a via toda (a rota desvia);
//  - via longa sem trecho: só um ponto de aviso (a rota não muda).
// Alertas vencidos saem sozinhos. Se a CET ou o mapa não responderem, fica o arquivo anterior.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), "..") + path.sep;
const ARQ = RAIZ + "alertas-cet.js";
const RSS = "https://www.cetsp.com.br/noticias/rss.aspx";
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const UA = "RotaLiberada-robo/1.0 (alertas de transito, uso nao comercial)";
const DIAS_NOTICIA = 21;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function baixar(url, opcoes = {}, tentativas = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { ...opcoes, headers: { "User-Agent": UA, ...(opcoes.headers || {}) }, signal: AbortSignal.timeout(opcoes.limite || 60000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r;
    } catch (e) { if (i >= tentativas) throw e; await espera(4000 * i); }
  }
}
function textoDe(html) {
  return html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/[ \t ]+/g, " ").replace(/\n\s*/g, "\n").trim();
}
// ---------- Tipo ----------
function tipoDe(t) {
  const s = t.toLowerCase();
  if (/manifesta|protesto|\bato\b|passeata/.test(s)) return { id: "manifestacao", nome: "Manifestação", icone: "📢" };
  if (/\bjogo\b|partida|est[aá]dio|allianz|morumbi|neo qu[ií]mica|pacaembu|campeonato|copa /.test(s)) return { id: "jogo", nome: "Jogo", icone: "⚽" };
  if (/interdi|bloqueio total|ser[aá] fechad|fechamento/.test(s)) return { id: "interdicao", nome: "Interdição", icone: "🚧" };
  if (/\bobra|servi[cç]os? de|pavimenta|recapea|manuten[cç][aã]o/.test(s)) return { id: "obra", nome: "Obra", icone: "🏗️" };
  if (/opera[cç][aã]o (especial|feriado|natal|ver[aã]o|carnaval)|opera[cç][aã]o/.test(s)) return { id: "operacao", nome: "Operação especial", icone: "👮" };
  if (/evento|show|festival|corrida|marcha|parada|feira|desfile|f[oó]rmula|autódromo|aut[oó]dromo|maratona|passeio|virada|r[eé]veillon|carnaval/.test(s)) return { id: "evento", nome: "Evento", icone: "🎉" };
  return null;
}
// ---------- Datas ("sexta-feira (27)", "sábado (28)", "dia 29", "28/11", "das 22h00 … às 05h30") ----------
const MESES = { janeiro: 1, fevereiro: 2, "março": 3, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 };
function datas(texto, pub) {
  const dias = [];
  const ano = pub.getFullYear(), mes = pub.getMonth() + 1, diaPub = pub.getDate();
  const add = (d, m) => { if (d < 1 || d > 31) return; let a = ano; if (!m) { m = d < diaPub - 3 ? mes + 1 : mes; } if (m > 12) { m -= 12; a++; } if (m < mes - 6) a++; dias.push(new Date(a, m - 1, d)); };
  let r;
  const reSemana = /(domingo|segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado)(?:-feira)?\s*\((\d{1,2})[º°]?\)/gi;
  while ((r = reSemana.exec(texto))) add(+r[2]);
  const reBarra = /\b(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?\b/g;
  if (!dias.length) while ((r = reBarra.exec(texto))) if (+r[2] >= 1 && +r[2] <= 12) add(+r[1], +r[2]);
  const reExtenso = /\b(\d{1,2})[º°]? de (janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/gi;
  if (!dias.length) while ((r = reExtenso.exec(texto))) add(+r[1], MESES[r[2].toLowerCase().replace("ç", "ç")] || MESES[r[2].toLowerCase()]);
  const horas = [];
  const reHora = /\b(\d{1,2})h(\d{2})?\b/g;
  while ((r = reHora.exec(texto))) if (+r[1] <= 24) horas.push(+r[1] * 60 + (+r[2] || 0));
  if (!dias.length) return null;
  dias.sort((a, b) => a - b);
  const ini = new Date(dias[0]), fim = new Date(dias[dias.length - 1]);
  if (horas.length) ini.setMinutes(horas[0]); else ini.setHours(0, 0);
  if (horas.length >= 2) fim.setMinutes(horas[horas.length - 1]); else fim.setHours(23, 59);
  if (fim <= ini) fim.setTime(ini.getTime() + (dias.length > 1 ? 24 : 12) * 3600000);
  return { inicio: ini.getTime(), fim: fim.getTime() };
}
// ---------- Lugares ----------
const TIPO_VIA = "(?:Túnel|Tunel|Viaduto|Ponte|Complexo Viário|Elevado|Avenida|Av\\.|Rua|R\\.|Alameda|Al\\.|Praça|Largo|Estrada|Marginal|Rodovia|Travessa)";
const NOME = "[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9][\\wÀ-ÿ.'º°\\-]*(?:\\s+(?:d[aeo]s?|e|de|del|von)?\\s*[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9][\\wÀ-ÿ.'º°\\-]*)*";
const reVia = new RegExp("\\b" + TIPO_VIA + "\\s+" + NOME, "g");
const CURTOS = /^(túnel|tunel|viaduto|ponte|complexo|elevado|praça|largo)/i;
function limparNome(n) { return n.replace(/\s+(e|de|da|do)$/i, "").replace(/[.,;]+$/, "").trim(); }
function trechos(texto, titulo) {
  // linhas de bloqueio/interdição; senão o título e o 1º parágrafo
  const linhas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  const out = [];
  let emBloqueio = false;
  for (const l of linhas) {
    if (/bloqueio|interdi|fechad/i.test(l) && l.length < 60) { emBloqueio = true; continue; }
    if (/^(alternativas|recomenda|vias monitoradas|desvio)/i.test(l)) emBloqueio = false;
    if (emBloqueio && /^[●•\-–]/.test(l)) out.push(l.replace(/^[●•\-–]\s*/, ""));
  }
  if (!out.length) {
    const p1 = linhas.find((l) => /interdi|bloque|fechad|obra|ocupa/i.test(l)) || "";
    out.push(titulo, p1);
  }
  const lugares = [];
  for (const l of out) {
    const vias = (l.match(reVia) || []).map(limparNome);
    if (!vias.length) continue;
    const entre = /\bentre\b/i.test(l) && vias.length >= 3 ? { via: vias[0], a: vias[1], b: vias[2] } :
                  /\bentre (?:as|os) (?:ruas|avenidas|alamedas)\s+(.+?)\s+e\s+(.+?)[;.,]?$/i.exec(l) && vias.length >= 1 ? (() => { const m = /\bentre (?:as|os) (ruas|avenidas|alamedas)\s+(.+?)\s+e\s+(.+?)[;.,]?$/i.exec(l); const t = m[1].toLowerCase() === "ruas" ? "Rua " : m[1].toLowerCase() === "alamedas" ? "Alameda " : "Avenida "; return { via: vias[0], a: t + limparNome(m[2].replace(/^(d[aeo]s?)\s+/i, "")), b: t + limparNome(m[3].replace(/^(d[aeo]s?)\s+/i, "")) }; })() : null;
    const novo = entre ? { ...entre, texto: l } : { via: vias[0], texto: l };
    const ja = lugares.findIndex((x) => x.via === novo.via);
    if (ja >= 0) { if (novo.a && !lugares[ja].a) lugares[ja] = novo; continue; }
    lugares.push(novo);
    if (lugares.length >= 3) break;
  }
  return lugares;
}
// Nome da via -> expressão para o OpenStreetMap (sem acento, abreviações e o tipo da via)
const ABREV = { "av.": "avenida", "r.": "rua", "al.": "alameda", "eng.": "engenheiro", "dr.": "doutor", "prof.": "professor", "pres.": "presidente", "gov.": "governador", "sen.": "senador", "dep.": "deputado", "cel.": "coronel", "gen.": "general", "brig.": "brigadeiro", "mal.": "marechal", "pe.": "padre", "sta.": "santa", "sto.": "santo", "cap.": "capitão" };
function chaveVia(n) {
  const palavras = n.toLowerCase().split(/\s+/).map((p) => ABREV[p] || p);
  const tipo = palavras.shift();
  const sig = palavras.filter((p) => p.length >= 3 && !/^(das|dos|del)$/.test(p) && !/\.$/.test(p));
  const sem = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, ".");
  return { tipo: sem(tipo), re: sig.slice(-2).map(sem).join(".*") };
}
let ultimoOverpass = 0;
async function overpass(q) {
  const agora = Date.now(); if (agora - ultimoOverpass < 2500) await espera(2500 - (agora - ultimoOverpass));
  ultimoOverpass = Date.now();
  let erro;
  for (const u of OVERPASS) {
    try { const r = await baixar(u, { method: "POST", limite: 150000, body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" } }, 1); return await r.json(); }
    catch (e) { erro = e; }
  }
  throw erro;
}
let ultimoNomi = 0;
async function ondeFica(nome) {
  const agora = Date.now(); if (agora - ultimoNomi < 1200) await espera(1200 - (agora - ultimoNomi));
  ultimoNomi = Date.now();
  const u = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&bounded=1&viewbox=-46.83,-23.36,-46.36,-24.01&q=" + encodeURIComponent(nome + ", São Paulo");
  const j = await (await baixar(u, {}, 2)).json();
  return j && j[0] ? { lat: +j[0].lat, lon: +j[0].lon } : null;
}
async function waysDe(nomes) {
  const c = await ondeFica(nomes[0]);
  if (!c) return [];
  // todas as ruas com nome num quadrado de ~3 km em volta (sem expressão no servidor: bem mais rápido); o filtro é feito aqui
  const g = 0.015, bb = "(" + (c.lat - g).toFixed(4) + "," + (c.lon - g).toFixed(4) + "," + (c.lat + g).toFixed(4) + "," + (c.lon + g).toFixed(4) + ")";
  const j = await overpass(`[out:json][timeout:90];way["highway"]["name"]${bb};out geom;`);
  return (j.elements || []).filter((e) => e.type === "way" && e.geometry);
}
function filtrar(ways, nome) {
  const k = chaveVia(nome), re = new RegExp(k.re, "i");
  const sem = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const tipoOk = (w) => { const n = sem(w.tags.name || ""); return !k.tipo || k.tipo.length < 3 || n.startsWith(k.tipo.slice(0, 3)) || /^(tunel|viaduto|ponte|complexo|elevado)/.test(k.tipo); };
  return ways.filter((w) => re.test(sem(w.tags.name || "")) && tipoOk(w));
}
function metros(a, b) { const R = 6371000, r = Math.PI / 180; const x = (b.lon - a.lon) * r * Math.cos((a.lat + b.lat) / 2 * r), y = (b.lat - a.lat) * r; return Math.hypot(x, y) * R; }
function comprimento(ws) { let s = 0; ws.forEach((w) => { for (let i = 1; i < w.geometry.length; i++) s += metros(w.geometry[i - 1], w.geometry[i]); }); return s; }
// Trecho da via entre os cruzamentos com A e B (caminho mais curto pelos nós da própria via)
function trechoEntre(vias, wa, wb) {
  const nosA = new Set(wa.flatMap((w) => w.nodes)), nosB = new Set(wb.flatMap((w) => w.nodes));
  const viz = new Map(), pos = new Map();
  vias.forEach((w) => w.nodes.forEach((n, i) => {
    pos.set(n, w.geometry[i]);
    if (!viz.has(n)) viz.set(n, []);
    if (i > 0) { viz.get(n).push(w.nodes[i - 1]); viz.get(w.nodes[i - 1]).push(n); }
  }));
  const ini = [...viz.keys()].filter((n) => nosA.has(n)), alvo = new Set([...viz.keys()].filter((n) => nosB.has(n)));
  if (!ini.length || !alvo.size) return null;
  const prev = new Map(ini.map((n) => [n, null])), fila = [...ini];
  while (fila.length) {
    const n = fila.shift();
    if (alvo.has(n)) { const cam = []; for (let x = n; x !== null; x = prev.get(x)) cam.push(pos.get(x)); return cam.length >= 2 ? cam : null; }
    for (const v of viz.get(n)) if (!prev.has(v)) { prev.set(v, n); fila.push(v); }
  }
  return null;
}
const arred = (v) => Math.round(v * 1e5) / 1e5;
async function localizar(l) {
  const nomes = [l.via, l.a, l.b].filter(Boolean);
  const ws = await waysDe(nomes);
  const wv = filtrar(ws, l.via);
  if (!wv.length) return null;
  if (l.a && l.b) {
    const cam = trechoEntre(wv, filtrar(ws, l.a), filtrar(ws, l.b));
    if (cam && comprimento([{ geometry: cam }]) < 6000) return { linhas: [cam.map((p) => [arred(p.lon), arred(p.lat)])], desviar: true };
  }
  if (CURTOS.test(l.via)) {
    // túnel/viaduto/ponte: só os pedaços que são mesmo túnel/ponte (no mapa a via costuma ter o nome da avenida)
    const t = /^(túnel|tunel)/i.test(l.via) ? (w) => w.tags.tunnel && w.tags.tunnel !== "no" : /^(viaduto|ponte|elevado)/i.test(l.via) ? (w) => w.tags.bridge && w.tags.bridge !== "no" : () => true;
    const so = wv.filter(t);
    if (so.length && comprimento(so) < 4000) return { linhas: so.slice(0, 20).map((w) => w.geometry.map((p) => [arred(p.lon), arred(p.lat)])), desviar: true };
  }
  const tam = comprimento(wv);
  if (tam < 1500) return { linhas: wv.slice(0, 20).map((w) => w.geometry.map((p) => [arred(p.lon), arred(p.lat)])), desviar: tam < 4000 };
  // via longa: um ponto no meio do pedaço mais comprido, só para avisar
  const w = wv.slice().sort((a, b) => comprimento([b]) - comprimento([a]))[0], m = w.geometry[Math.floor(w.geometry.length / 2)];
  return { ponto: [arred(m.lon), arred(m.lat)], desviar: false };
}

export async function atualizarAlertasCet() {
  const xml = await (await baixar(RSS)).text();
  const itens = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const x = m[1], tag = (t) => ((new RegExp("<" + t + "[^>]*>([\\s\\S]*?)</" + t + ">")).exec(x) || [])[1] || "";
    return { titulo: textoDe(tag("title")), link: textoDe(tag("link")).replace(/^http:\/\/wwn\./, "https://www."), pub: new Date(tag("pubDate")), html: tag("content:encoded").replace(/^<!\[CDATA\[|\]\]>$/g, "") };
  });
  if (!itens.length) throw new Error("RSS da CET sem notícias");
  const agora = Date.now(), alertas = [], prazo = agora + 15 * 60000;   // no máximo 15 min de mapa
  for (const it of itens) {
    if (isNaN(it.pub) || agora - it.pub.getTime() > DIAS_NOTICIA * 86400000) continue;
    const texto = textoDe(it.html), tipo = tipoDe(it.titulo + " " + texto.slice(0, 600));
    if (!tipo) continue;
    const quando = datas(texto.slice(0, 1500), it.pub) || { inicio: it.pub.getTime(), fim: it.pub.getTime() + 2 * 86400000 };
    if (quando.fim < agora) continue;
    let lugares = [];
    try { lugares = trechos(texto, it.titulo); } catch (e) { lugares = []; }
    if (process.env.CET_DEBUG) console.log("   lugares:", JSON.stringify(lugares), "| quando:", new Date(quando.inicio).toLocaleString("pt-BR"), "→", new Date(quando.fim).toLocaleString("pt-BR"));
    let n = 0;
    for (const l of lugares) {
      if (Date.now() > prazo) break;
      let g = null;
      try { g = await localizar(l); } catch (e) { console.log("  mapa não respondeu para", l.via, "-", e.message); }
      if (process.env.CET_DEBUG) console.log("   ", l.via, "->", g ? (g.linhas ? g.linhas.length + " linha(s), desviar=" + g.desviar : "ponto") : "não achei");
      if (!g) continue;
      const id = (it.link.split("/").pop() || "x").replace(/\.aspx$/, "").slice(0, 60) + "-" + (n++);
      alertas.push({ id, tipo: tipo.id, tipoNome: tipo.nome, icone: tipo.icone, titulo: it.titulo.slice(0, 140),
        onde: (l.a ? l.via + ", entre " + l.a + " e " + l.b : l.via).slice(0, 140), detalhe: l.texto.slice(0, 220),
        inicio: quando.inicio, fim: quando.fim, fonte: "CET", link: it.link, desviar: g.desviar && (tipo.id === "interdicao" || tipo.id === "obra" || /bloqueio|interdi/i.test(l.texto)),
        ...(g.linhas ? { linhas: g.linhas } : { ponto: g.ponto }) });
    }
    console.log((n ? "✅" : "–"), tipo.nome, "|", it.titulo, "|", n, "lugar(es)");
  }
  const dados = { fonte: "CET-SP (notícias públicas)", atualizadoEm: new Date().toISOString(), alertas };
  const novo = "// Gerado pelo robô ferramentas/alertas-cet.mjs – não editar à mão.\nwindow.ALERTAS_CET = " + JSON.stringify(dados) + ";\n";
  let antigo = ""; try { antigo = fs.readFileSync(ARQ, "utf8"); } catch (e) {}
  const semData = (s) => s.replace(/"atualizadoEm":"[^"]*"/, "");
  const mudou = semData(antigo) !== semData(novo);
  if (mudou) fs.writeFileSync(ARQ, novo, "utf8");
  return { mudou, total: alertas.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  atualizarAlertasCet().then((r) => console.log(`\nAlertas: ${r.total} (${r.mudou ? "arquivo atualizado" : "sem mudança"})`))
    .catch((e) => { console.log("CET: não deu para atualizar agora (" + e.message + "). Fica o arquivo antigo."); process.exitCode = 0; });
}
