// =====================================================================
// ÁREAS DE RISCO DE ROUBO DE CARGA (dados oficiais da SSP-SP)
//
// Gera o arquivo riscos-sp.js que o app mostra no mapa.
//  - Casos: SSP-SP, estatística mensal por delegacia (distrito policial),
//    crime "ROUBO DE CARGA", cidade de São Paulo, últimos 12 meses publicados.
//    (API pública do site ssp.sp.gov.br › Estatística › Dados Mensais, sem login)
//  - Áreas das delegacias: GeoSampa (Prefeitura de SP), camada
//    "delegacia_policia_civil".
//  - Nível de cada área: casos por km² comparados com a média da cidade.
//      amarelo = atenção, laranja = risco médio, vermelho = risco alto.
//
// Roda sozinho dentro do robô semanal (robo-semanal.mjs). Só regrava o
// arquivo quando a SSP publica um mês novo (ou com --forcar).
// Rodar na mão:  node ferramentas/riscos-ssp.mjs [--forcar]
// =====================================================================
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const ARQ = RAIZ + "riscos-sp.js";
const SSP = "https://www.ssp.sp.gov.br/v1/";
const ID_MUNICIPIO_SP = 565;
const WFS_DP = "https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs?service=WFS&version=2.0.0&request=GetFeature" +
  "&typeNames=geoportal:delegacia_policia_civil&outputFormat=application/json&srsName=EPSG:4326";
const MESES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
// Faixas (vezes a média da cidade em casos por km²). Com menos de 3 casos no ano, a área não entra.
const FAIXAS = { amarelo: 1.5, laranja: 2, vermelho: 3.5 };

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function json(url, tentativas = 3) {
  for (let i = 1; i <= tentativas; i++) {
    try {
      const r = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (rota-liberada robo)" }, signal: AbortSignal.timeout(60000) });
      if (r.ok) return await r.json();
    } catch (e) { /* tenta de novo */ }
    await esperar(3000 * i);
  }
  throw new Error("Sem resposta: " + url);
}

/* ---------- geometria simples (sem bibliotecas) ---------- */
function areaKm2(anel) {   // área aproximada (projeção local), anel em [lon, lat]
  const lat0 = anel[0][1] * Math.PI / 180, kx = 111.32 * Math.cos(lat0), ky = 110.57;
  let s = 0;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) s += (anel[j][0] * kx) * (anel[i][1] * ky) - (anel[i][0] * kx) * (anel[j][1] * ky);
  return Math.abs(s) / 2;
}
function simplificar(pts, tolM) {   // Douglas-Peucker em metros
  const arred = (p) => [+p[0].toFixed(5), +p[1].toFixed(5)];
  if (pts.length <= 4) return pts.map(arred);
  const lat0 = pts[0][1] * Math.PI / 180, kx = 111320 * Math.cos(lat0), ky = 110570;
  const xy = pts.map((p) => [p[0] * kx, p[1] * ky]);
  const manter = new Uint8Array(pts.length); manter[0] = manter[pts.length - 1] = 1;
  const pilha = [[0, pts.length - 1]];
  while (pilha.length) {
    const [a, b] = pilha.pop(); let maior = 0, idx = -1;
    const [ax, ay] = xy[a], [bx, by] = xy[b], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      let t = L2 ? ((xy[i][0] - ax) * dx + (xy[i][1] - ay) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(xy[i][0] - (ax + t * dx), xy[i][1] - (ay + t * dy));
      if (d > maior) { maior = d; idx = i; }
    }
    if (maior > tolM && idx > 0) { manter[idx] = 1; pilha.push([a, idx], [idx, b]); }
  }
  const out = pts.filter((p, i) => manter[i]).map(arred);
  return out.length >= 4 ? out : pts.map(arred);
}
function poligonos(geom) { return geom.type === "Polygon" ? [geom.coordinates] : geom.type === "MultiPolygon" ? geom.coordinates : []; }
// "001 DP - Sé" (SSP) e "99º D.P. CAMPO GRANDE" (GeoSampa) → número da delegacia
const numeroDP = (txt) => { const m = /^\s*0*(\d{1,3})\D{0,3}D\.?\s*P/i.exec(txt || ""); return m ? parseInt(m[1], 10) : null; };

/* ---------- 1) Áreas das delegacias (GeoSampa) ---------- */
// (se o GeoSampa não responder, dá erro e o arquivo antigo continua valendo; tenta de novo na semana seguinte)
async function areasDasDelegacias() {
  const g = await json(WFS_DP);
  if (!g.features || g.features.length < 80) throw new Error("O GeoSampa mandou poucas delegacias.");
  return { g, data: (g.features[0].properties.dt_atualizacao || "").slice(0, 10) };
}

/* ---------- 2) Casos de roubo de carga por delegacia (SSP) ---------- */
async function ultimoMesPublicado() {
  const anoAgora = new Date().getFullYear();
  for (const ano of [anoAgora, anoAgora - 1]) {
    const r = await json(`${SSP}OcorrenciasMensais/RecuperaDadosMensaisAgrupados?ano=${ano}&grupoDelito=6&tipoGrupo=MUNIC%C3%8DPIO&idGrupo=${ID_MUNICIPIO_SP}`);
    const l = (r.data && r.data[0] && r.data[0].listaDados) || [];
    const pub = Math.max(0, ...l.map((x) => x.publicado || 0));
    if (pub > 0) return { ano, mes: pub };
  }
  throw new Error("A SSP não informou o último mês publicado.");
}
async function casosPorDelegacia(ultimo) {
  const dist = (await json(SSP + "Distritos/RecuperaDistritos")).data.filter((d) => d.idMunicipio === ID_MUNICIPIO_SP && numeroDP(d.sigla) !== null);
  // Os 12 meses: do mês seguinte, um ano antes, até o último publicado
  const meses = [];
  for (let i = 11; i >= 0; i--) { const d = new Date(ultimo.ano, ultimo.mes - 1 - i, 1); meses.push({ ano: d.getFullYear(), mes: d.getMonth() + 1 }); }
  const anos = [...new Set(meses.map((m) => m.ano))];
  const casos = {};
  let semLinha = 0;
  for (const d of dist) {
    let soma = 0, achou = false;
    for (const ano of anos) {
      const r = await json(`${SSP}OcorrenciasMensais/RecuperaDadosMensaisAgrupados?ano=${ano}&grupoDelito=6&tipoGrupo=DISTRITO&idGrupo=${d.idDistrito}`);
      const l = (r.data && r.data[0] && r.data[0].listaDados) || [];
      const c = l.find((x) => x.delito && /^ROUBO DE CARGA/i.test(x.delito.delito));
      if (c) { achou = true; meses.filter((m) => m.ano === ano).forEach((m) => { soma += Number(c[MESES[m.mes - 1]]) || 0; }); }
      await esperar(250);   // educação com o servidor da SSP
    }
    if (!achou) semLinha++;
    const n = numeroDP(d.sigla);
    casos[n] = (casos[n] || 0) + soma;
  }
  // Segurança: se a SSP mudou o formato e não veio nada, não apaga o mapa que já existe
  if (semLinha > dist.length / 2) throw new Error("A SSP não mandou a linha de roubo de carga em " + semLinha + " de " + dist.length + " delegacias.");
  return { casos, meses, nDist: dist.length };
}

/* ---------- Principal ---------- */
export async function atualizarRiscos(forcar) {
  let antes = null;
  try { const t = fs.readFileSync(ARQ, "utf8"); antes = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)); } catch (e) {}
  const ultimo = await ultimoMesPublicado();
  const ate = String(ultimo.mes).padStart(2, "0") + "/" + ultimo.ano;
  if (antes && antes.ate === ate && !forcar) { console.log("Riscos: dados da SSP continuam até " + ate + ". Nada a fazer."); return { mudou: false, ate }; }
  const { casos, meses, nDist } = await casosPorDelegacia(ultimo);
  const { g, data: dataAreas } = await areasDasDelegacias();
  // Junta as partes de cada delegacia (algumas têm mais de um pedaço)
  const dps = {};
  g.features.forEach((f) => {
    const n = numeroDP(f.properties.nm_delegacia_policia_civil); if (n === null) return;
    const x = dps[n] || (dps[n] = { n, partes: [], km2: 0 });
    poligonos(f.geometry).forEach((p) => { x.partes.push(p); x.km2 += areaKm2(p[0]) - p.slice(1).reduce((s, b) => s + areaKm2(b), 0); });
  });
  const lista = Object.values(dps).filter((x) => casos[x.n] !== undefined && x.km2 > 0);
  const semArea = Object.keys(casos).filter((n) => !dps[n]);
  if (semArea.length) console.log("Riscos: delegacias da SSP sem área no GeoSampa:", semArea.join(", "));
  const totCasos = lista.reduce((s, x) => s + casos[x.n], 0), totKm2 = lista.reduce((s, x) => s + x.km2, 0);
  if (totCasos < 50) throw new Error("Poucos casos (" + totCasos + "): algo deu errado na leitura. Mantive o arquivo antigo.");
  const media = totCasos / totKm2;   // casos por km² na cidade
  if (process.env.RISCOS_DEBUG) lista.map((x) => [x.n, casos[x.n], +x.km2.toFixed(1), +(casos[x.n] / x.km2 / media).toFixed(2)]).sort((a, b) => b[3] - a[3]).forEach((l) => console.log(l.join("\t")));
  const features = [];
  lista.forEach((x) => {
    const c = casos[x.n], vezes = c / x.km2 / media;
    const nivel = c < 3 ? null : vezes >= FAIXAS.vermelho ? 3 : vezes >= FAIXAS.laranja ? 2 : vezes >= FAIXAS.amarelo ? 1 : null;
    if (!nivel) return;
    const coords = x.partes.map((p) => p.map((anel) => simplificar(anel, 25)).filter((a) => a.length >= 4));
    features.push({ type: "Feature", properties: { dp: x.n, nivel, casos: c, vezes: +vezes.toFixed(1) },
      geometry: coords.length === 1 ? { type: "Polygon", coordinates: coords[0] } : { type: "MultiPolygon", coordinates: coords } });
  });
  features.sort((a, b) => a.properties.nivel - b.properties.nivel);
  const saida = {
    fonte: "SSP-SP", ate, crime: "Roubo de carga",
    periodo: String(meses[0].mes).padStart(2, "0") + "/" + meses[0].ano + " a " + ate,
    atualizadoEm: new Date().toISOString().slice(0, 10),
    areasDe: "GeoSampa (Prefeitura de SP), áreas das delegacias de " + dataAreas,
    regra: "casos por km² na área da delegacia, comparados com a média da cidade: amarelo a partir de " + FAIXAS.amarelo +
      "x, laranja " + FAIXAS.laranja + "x, vermelho " + FAIXAS.vermelho + "x (mínimo 3 casos em 12 meses)",
    totalCidade: totCasos, delegacias: nDist,
    areas: { type: "FeatureCollection", features }
  };
  const cab = "// Áreas com registros de roubo de carga (gerado por ferramentas/riscos-ssp.mjs – não editar à mão)\n" +
    "// Fonte: SSP-SP, estatística mensal por delegacia, " + saida.periodo + ". Áreas: GeoSampa.\n";
  fs.writeFileSync(ARQ, cab + "window.RISCOS_SP = " + JSON.stringify(saida) + ";\n", "utf8");
  const n = (k) => features.filter((f) => f.properties.nivel === k).length;
  console.log(`Riscos: ${totCasos} roubos de carga na cidade (${saida.periodo}). Áreas: ${n(1)} amarelas, ${n(2)} laranjas, ${n(3)} vermelhas.`);
  return { mudou: true, ate, resumo: { amarelo: n(1), laranja: n(2), vermelho: n(3), total: totCasos } };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  atualizarRiscos(process.argv.includes("--forcar")).catch((e) => { console.error(e.message); process.exit(1); });
}
