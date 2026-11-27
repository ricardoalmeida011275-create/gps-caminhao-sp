// =====================================================================
// ROBÔ SEMANAL DO ROTA LIBERADA
// Roda sozinho toda segunda-feira de manhã no GitHub (arquivo
// .github/workflows/robo-semanal.yml). Também dá para rodar na mão:
// GitHub → aba "Actions" → "Robô semanal" → "Run workflow".
//
// 1) LUGARES (locais-sp.js): confere no OpenStreetMap se algum lugar da
//    lista ganhou nome novo (ex.: estádio que mudou de patrocinador).
//    Se ganhou, ACRESCENTA o nome novo para a busca achar. O nome antigo
//    continua valendo. Isso entra no app sozinho.
// 2) REGRAS (CET e Prefeitura): confere se mudaram os mapas da CET, a
//    Portaria 137/18, as zonas residenciais (ZER) ou as faixas/corredores
//    de ônibus. Se mudou, NÃO mexe no app: abre um aviso (Issue) no GitHub
//    para conferir antes. Regra errada pode gerar multa para o motorista.
// 3) ÁREAS DE RISCO (riscos-sp.js): roubo de carga por delegacia, da SSP-SP.
//    Quando a SSP publica um mês novo (1 vez por mês), refaz o mapa sozinho
//    (ferramentas/riscos-ssp.mjs).
//
// O que o robô já viu fica guardado em ferramentas/robo-estado.json.
// Na primeira vez ele só anota como está tudo (não avisa nada).
// =====================================================================

import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { atualizarRiscos } from "./riscos-ssp.mjs";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const ARQ_LOCAIS = RAIZ + "locais-sp.js";
const ARQ_SW = RAIZ + "sw.js";
const ARQ_ESTADO = RAIZ + "ferramentas/robo-estado.json";
const UA = "rota-app-verificador/1.0";   // identificação pedida pelo OpenStreetMap
const SO_LUGARES = process.argv.includes("--so-lugares"), SO_REGRAS = process.argv.includes("--so-regras");

const FONTES = [
  { chave: "cet-mapa-grupo1", nome: "Mapa da CET – avenidas grupo 1 (VER) e áreas", tipo: "texto",
    url: "https://www.google.com/maps/d/kml?mid=1Ekyo9pMAb-pBYy7fspI-PipC-oI&forcekml=1",
    ver: "https://www.cetsp.com.br/consultas/caminhoes/mapa.aspx", arquivo: "dados-restricoes.js" },
  { chave: "cet-mapa-grupos2e3", nome: "Mapa da CET – avenidas grupos 2 e 3 (VER)", tipo: "texto",
    url: "https://www.google.com/maps/d/kml?mid=1NxxbL4EP3PKSH4HT6_fWkjh-Ry0&forcekml=1",
    ver: "https://www.cetsp.com.br/consultas/caminhoes/mapa.aspx", arquivo: "dados-restricoes.js" },
  { chave: "cet-mapa-grupo4", nome: "Mapa da CET – avenidas grupo 4 (VER)", tipo: "texto",
    url: "https://www.google.com/maps/d/kml?mid=1Fpkx6E5uBExiS1ghu7cCzu0ECuY&forcekml=1",
    ver: "https://www.cetsp.com.br/consultas/caminhoes/mapa.aspx", arquivo: "dados-restricoes.js" },
  { chave: "cet-pagina-mapas", nome: "Página de mapas de restrição da CET (links dos mapas)", tipo: "links",
    url: "https://www.cetsp.com.br/consultas/caminhoes/mapa.aspx",
    ver: "https://www.cetsp.com.br/consultas/caminhoes/mapa.aspx", arquivo: "dados-restricoes.js" },
  { chave: "cet-portaria-137-18", nome: "Portaria 137/18 da CET (regras de caminhão)", tipo: "bytes",
    url: "https://www.cetsp.com.br/media/722444/p-137_18.pdf",
    ver: "https://www.cetsp.com.br/media/722444/p-137_18.pdf", arquivo: "index.html (regras de horário)" },
  { chave: "geosampa-zer", nome: "Zonas residenciais ZER (GeoSampa/Prefeitura)", tipo: "geojson",
    url: "https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=geoportal:perimetro_zona_lei_18081_24&outputFormat=application/json&CQL_FILTER=" + encodeURIComponent("cd_zoneamento_perimetro LIKE 'ZER%'"),
    ver: "https://geosampa.prefeitura.sp.gov.br", arquivo: "zer-sp.js" },
  { chave: "geosampa-faixas-onibus", nome: "Faixas de ônibus (GeoSampa/SPTrans)", tipo: "geojson",
    url: "https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=geoportal:faixa_onibus&outputFormat=application/json",
    ver: "https://geosampa.prefeitura.sp.gov.br", arquivo: "onibus-sp.js" },
  { chave: "geosampa-corredores-onibus", nome: "Corredores de ônibus (GeoSampa/SPTrans)", tipo: "geojson",
    url: "https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=geoportal:corredor_onibus&outputFormat=application/json",
    ver: "https://geosampa.prefeitura.sp.gov.br", arquivo: "onibus-sp.js" }
];

/* ---------- ajudantes ---------- */
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (x) => crypto.createHash("sha256").update(x).digest("hex");
const normalizar = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
async function baixar(url, opcoes = {}, tentativas = 3) {
  for (let i = 1; i <= tentativas; i++) {
    try {
      const r = await fetch(url, { ...opcoes, headers: { "User-Agent": UA, ...(opcoes.headers || {}) }, signal: AbortSignal.timeout(180000) });
      if (r.ok) return r;
      if (r.status === 404 || r.status === 410) return r;
    } catch (e) { /* tenta de novo */ }
    await esperar(5000 * i);
  }
  return null;
}
function lerEstado() { try { return JSON.parse(fs.readFileSync(ARQ_ESTADO, "utf8")); } catch (e) { return { lugares: {}, fontes: {} }; } }
function nomesDoObjeto(tags) {
  const out = new Set();
  ["name", "name:pt", "alt_name", "official_name", "short_name", "old_name", "brand"].forEach((k) => {
    String(tags[k] || "").split(";").forEach((n) => { const v = normalizar(n); if (v.length >= 3) out.add(v); });
  });
  return [...out];
}
// 0 a 1: quanto dois nomes se parecem. Exigente de propósito: melhor deixar um lugar sem vigiar
// do que vigiar o lugar errado (ex.: "Shopping Interlagos" x "Shopping Interlar" NÃO é o mesmo).
function parecido(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const pa = a.split(" "), pb = b.split(" ");
  const [curto, longo] = pa.length <= pb.length ? [pa, pb] : [pb, pa];
  // um nome contém o outro inteiro, com no máximo 1 palavra a mais (ex.: "morumbi shopping" x "shopping morumbi" não; "parque villa lobos" x "parque villa lobos sp" sim)
  if (curto.length >= 2 && longo.length - curto.length <= 1 && (" " + longo.join(" ") + " ").includes(" " + curto.join(" ") + " ")) return 0.9;
  const bi = (s) => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const p = s.slice(i, i + 2); m.set(p, (m.get(p) || 0) + 1); } return m; };
  const ba = bi(a), bb = bi(b); let comum = 0;
  for (const [p, n] of ba) comum += Math.min(n, bb.get(p) || 0);
  const dice = (2 * comum) / Math.max(1, a.length - 1 + b.length - 1);
  return dice >= 0.93 ? dice : 0;
}
function distancia(lat1, lon1, lat2, lon2) {
  const R = 6371000, r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/* =================== 1) LUGARES =================== */
async function conferirLugares(estado, aviso) {
  const texto = fs.readFileSync(ARQ_LOCAIS, "utf8");
  const ctx = { window: {} }; vm.runInNewContext(texto, ctx);
  const lugares = ctx.window.LOCAIS_SP;
  const nomesLugar = (l) => [normalizar(l.nome.replace(/\(.*?\)/g, "")), normalizar(l.nome), ...(l.apelidos || []).map(normalizar)].filter(Boolean);

  // a) Lugares que ainda não sabemos qual é o objeto no OpenStreetMap: procura pelo nome perto da coordenada
  const semObjeto = lugares.filter((l) => !(estado.lugares[l.nome] && estado.lugares[l.nome].osm));
  if (semObjeto.length) {
    const consulta = "[out:json][timeout:170];(" + semObjeto.map((l) => `nwr(around:300,${l.lat},${l.lon})[name];`).join("") + ");out tags center;";
    let elementos = null;
    for (const servidor of ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]) {
      const r = await baixar(servidor, { method: "POST", body: "data=" + encodeURIComponent(consulta), headers: { "Content-Type": "application/x-www-form-urlencoded" } }, 2);
      if (r && r.ok) { try { elementos = (await r.json()).elements; break; } catch (e) {} }
    }
    if (!elementos) console.log("Lugares: o OpenStreetMap (Overpass) não respondeu; tento de novo na próxima semana.");
    else {
      // Todas as ligações possíveis (lugar x objeto do mapa), com nota. Ruas e caminhos não contam
      // (ex.: "Rua do Shopping Interlagos" não é o shopping).
      const pares = [];
      for (const l of semObjeto) {
        const meus = nomesLugar(l);
        for (const e of elementos) {
          const t = e.tags || {};
          if (t.highway || t.railway === "rail" || t.route) continue;
          const lat = e.lat ?? (e.center && e.center.lat), lon = e.lon ?? (e.center && e.center.lon);
          if (lat == null) continue;
          const d = distancia(l.lat, l.lon, lat, lon);
          if (d > 350) continue;
          // compara só com o nome PRINCIPAL do objeto (apelidos curtos tipo "Mercado Municipal" confundem lugares vizinhos)
          const principais = [normalizar(t.name), normalizar(t["name:pt"])].filter((n) => n.length >= 3);
          const nota = Math.max(...principais.flatMap((n) => meus.map((m) => parecido(n, m))), 0) - d / 3500;   // mais perto vale um pouco mais
          if (nota >= 0.8) pares.push({ l, nota, id: e.type + "/" + e.id, nomes: nomesDoObjeto(t), nome: t.name || "" });
        }
      }
      // Melhores primeiro; cada lugar e cada objeto do mapa só pode ser ligado uma vez
      // (assim o Mercadão não pega o Mercado Kinjo Yamato, que fica ao lado e já é outro lugar da lista)
      const jaUsados = new Set(Object.values(estado.lugares).map((x) => x.osm).filter(Boolean)), feitos = new Set();
      pares.sort((a, b) => b.nota - a.nota);
      for (const p of pares) {
        if (feitos.has(p.l.nome) || jaUsados.has(p.id)) continue;
        estado.lugares[p.l.nome] = { osm: p.id, nomes: p.nomes, nome: p.nome };
        feitos.add(p.l.nome); jaUsados.add(p.id);
      }
      console.log(`Lugares: liguei ${feitos.size} de ${semObjeto.length} lugares ao objeto do OpenStreetMap.`);
    }
  }

  // b) Lugares já ligados: busca o objeto no OpenStreetMap e vê se apareceu nome novo
  let mudouArquivo = false, textoNovo = texto, conferidos = 0;
  for (const l of lugares) {
    const reg = estado.lugares[l.nome];
    if (!reg || !reg.osm) continue;
    const r = await baixar(`https://api.openstreetmap.org/api/0.6/${reg.osm}.json`);
    await esperar(1100);   // educação com o servidor do OpenStreetMap (1 pedido por segundo)
    if (!r) continue;
    if (r.status === 410 || r.status === 404) { aviso.lugares.push(`**${l.nome}**: o objeto sumiu do OpenStreetMap (${reg.osm}). Pode ter fechado ou mudado. Conferir.`); delete estado.lugares[l.nome].osm; continue; }
    let el; try { el = (await r.json()).elements[0]; } catch (e) { continue; }
    conferidos++;
    const tags = el.tags || {}, agora = nomesDoObjeto(tags);
    const novos = agora.filter((n) => !(reg.nomes || []).includes(n));
    if (tags.name && reg.nome && tags.name !== reg.nome) aviso.lugares.push(`**${l.nome}**: no mapa, o nome mudou de "${reg.nome}" para "${tags.name}". A busca já acha pelo nome novo; se quiser, troque também o nome que aparece no app.`);
    if (novos.length) {
      const meus = new Set((l.apelidos || []).map(normalizar));
      const acrescentar = novos.filter((n) => !meus.has(n) && n !== normalizar(l.nome));
      if (acrescentar.length) {
        const apelidos = [...(l.apelidos || []), ...acrescentar];
        const linhaVelha = textoNovo.split("\n").find((ln) => ln.includes(`nome: ${JSON.stringify(l.nome)}`));
        if (linhaVelha) {
          const linhaNova = linhaVelha.replace(/apelidos:\s*\[[^\]]*\]/, "apelidos: " + JSON.stringify(apelidos));
          if (linhaNova !== linhaVelha) {
            textoNovo = textoNovo.replace(linhaVelha, linhaNova); mudouArquivo = true;
            aviso.lugaresAtualizados.push(`**${l.nome}**: a busca agora também acha por ${acrescentar.map((n) => `"${n}"`).join(", ")}.`);
          }
        }
      }
    }
    reg.nomes = agora; reg.nome = tags.name || reg.nome;
  }
  console.log(`Lugares: conferi ${conferidos} lugares no OpenStreetMap.`);
  if (mudouArquivo) {
    fs.writeFileSync(ARQ_LOCAIS, textoNovo, "utf8");
    // sobe a versão do app para os celulares baixarem a lista nova
    const sw = fs.readFileSync(ARQ_SW, "utf8");
    fs.writeFileSync(ARQ_SW, sw.replace(/rota-caminhao-v(\d+)/, (m, n) => "rota-caminhao-v" + (parseInt(n, 10) + 1)), "utf8");
  }
}

/* =================== 2) REGRAS (fontes oficiais) =================== */
async function impressaoDigital(f) {
  const r = await baixar(f.url);
  if (!r || !r.ok) return null;
  if (f.tipo === "bytes") return sha(Buffer.from(await r.arrayBuffer()));
  const txt = await r.text();
  if (f.tipo === "texto") return sha(txt);
  if (f.tipo === "links") {
    const links = [...new Set((txt.match(/https?:\/\/[^"'\s<>]*(google\.com\/maps|\.kml|\.pdf)[^"'\s<>]*/g) || []).filter((u) => !/politicadeprivacidade/i.test(u)))].sort();
    return links.length ? sha(links.join("\n")) + " (" + links.length + " links)" : null;
  }
  if (f.tipo === "geojson") {
    let gj; try { gj = JSON.parse(txt); } catch (e) { return null; }
    if (!gj.features) return null;
    const linhas = gj.features.map((ft) => JSON.stringify([ft.properties, ft.geometry])).sort();
    return sha(linhas.join("\n")) + " (" + linhas.length + " itens)";
  }
  return null;
}
async function conferirRegras(estado, aviso) {
  for (const f of FONTES) {
    const atual = await impressaoDigital(f);
    if (!atual) { aviso.semResposta.push(f.nome); continue; }
    const antes = estado.fontes[f.chave];
    if (antes && antes.impressao !== atual) {
      aviso.regras.push(`**${f.nome}** mudou desde ${antes.desde}. Conferir em ${f.ver} e, se for o caso, atualizar \`${f.arquivo}\`.` +
        ((antes.impressao.match(/\((\d+) /) || [])[1] && (atual.match(/\((\d+) /) || [])[1] ? ` (antes ${antes.impressao.match(/\((\d+) /)[1]}, agora ${atual.match(/\((\d+) /)[1]})` : ""));
    }
    if (!antes || antes.impressao !== atual) estado.fontes[f.chave] = { impressao: atual, desde: new Date().toISOString().slice(0, 10) };
    console.log(`Regras: ${f.nome}: ${antes ? (antes.impressao === atual ? "igual" : "MUDOU") : "anotado pela primeira vez"}`);
  }
}

/* =================== Aviso no GitHub (Issue) =================== */
async function abrirAviso(aviso) {
  const partes = [];
  if (aviso.regras.length) partes.push("## ⚠️ Regras: alguma fonte oficial mudou\nO app NÃO foi alterado. Confira antes de atualizar (regra errada pode gerar multa).\n\n" + aviso.regras.map((x) => "- " + x).join("\n"));
  if (aviso.lugaresAtualizados.length) partes.push("## ✅ Lugares atualizados sozinhos no app\n" + aviso.lugaresAtualizados.map((x) => "- " + x).join("\n"));
  if (aviso.lugares.length) partes.push("## 📍 Lugares para conferir\n" + aviso.lugares.map((x) => "- " + x).join("\n"));
  if (!partes.length) { console.log("Nada mudou. Sem aviso."); return; }
  if (aviso.semResposta.length) partes.push("_Não consegui conferir desta vez: " + aviso.semResposta.join(", ") + "._");
  const titulo = "Robô semanal " + new Date().toISOString().slice(0, 10) + ": " +
    [aviso.regras.length ? aviso.regras.length + " regra(s) para conferir" : "", aviso.lugaresAtualizados.length ? aviso.lugaresAtualizados.length + " lugar(es) atualizado(s)" : "", aviso.lugares.length ? aviso.lugares.length + " lugar(es) para conferir" : ""].filter(Boolean).join(", ");
  const corpo = partes.join("\n\n");
  console.log("\n" + titulo + "\n\n" + corpo);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, "# " + titulo + "\n\n" + corpo + "\n");
  if (!process.env.GITHUB_TOKEN || !process.env.REPO) return;
  const r = await fetch(`https://api.github.com/repos/${process.env.REPO}/issues`, {
    method: "POST", body: JSON.stringify({ title: titulo, body: corpo }),
    headers: { Authorization: "Bearer " + process.env.GITHUB_TOKEN, Accept: "application/vnd.github+json", "User-Agent": UA }
  });
  console.log("Aviso no GitHub:", r.status);
}

/* =================== Principal =================== */
const estado = lerEstado();
const primeiraVez = !estado.fontes || !Object.keys(estado.fontes).length;
estado.lugares = estado.lugares || {}; estado.fontes = estado.fontes || {};
const aviso = { regras: [], lugares: [], lugaresAtualizados: [], semResposta: [] };
if (!SO_REGRAS) await conferirLugares(estado, aviso);
if (!SO_LUGARES) await conferirRegras(estado, aviso);
// 3) ÁREAS DE RISCO (roubo de carga, SSP-SP): quando a SSP publica um mês novo, refaz riscos-sp.js
//    e sobe a versão do app. Se a SSP ou o GeoSampa não responderem, o arquivo antigo continua valendo.
if (!SO_LUGARES && !SO_REGRAS) {
  try {
    const r = await atualizarRiscos(false);
    estado.riscos = { ate: r.ate, conferidoEm: new Date().toISOString().slice(0, 10) };
    if (r.mudou) {
      const sw = fs.readFileSync(ARQ_SW, "utf8");
      fs.writeFileSync(ARQ_SW, sw.replace(/rota-caminhao-v(\d+)/, (m, n) => "rota-caminhao-v" + (parseInt(n, 10) + 1)), "utf8");
      if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n✅ Áreas de risco atualizadas (SSP-SP, dados até ${r.ate}): ${r.resumo.vermelho} vermelhas, ${r.resumo.laranja} laranjas, ${r.resumo.amarelo} amarelas.\n`);
    }
  } catch (e) { console.log("Riscos: não deu para atualizar agora (" + e.message + "). Fica o arquivo antigo."); aviso.semResposta.push("Áreas de risco (SSP-SP)"); }
}
estado.ultimaConferencia = new Date().toISOString();
fs.writeFileSync(ARQ_ESTADO, JSON.stringify(estado, null, 1) + "\n", "utf8");
if (primeiraVez) console.log("Primeira conferência: só anotei como está tudo hoje. Os avisos começam na próxima.");
else await abrirAviso(aviso);
