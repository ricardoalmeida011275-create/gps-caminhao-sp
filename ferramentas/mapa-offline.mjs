/* =====================================================================
   Gera o MAPA SEM INTERNET de São Paulo (cidade + Grande SP) – arquivos mapa-sp/parte-NN.bin

   - Fonte: build diário GRATUITO do Protomaps (dados OpenStreetMap, licença ODbL),
     lido aos pedaços (HTTP Range) – não baixa o planeta inteiro.
   - Saída: um arquivo PMTiles (padrão aberto) só com os quadradinhos da Grande SP,
     cortado em partes de até 9 MB (limite do envio pelo navegador ao GitHub),
     mais mapa-sp/info.json (tamanho, partes, data).
   - O celular baixa as partes, junta e guarda (Cache Storage). O mapa salvo é desenhado
     pelo protomaps-leaflet (gratuito).

   Uso:  node ferramentas/mapa-offline.mjs            (gera)
         node ferramentas/mapa-offline.mjs --medir    (só mostra o tamanho por zoom)
   ===================================================================== */
import { gunzipSync, gzipSync } from "node:zlib";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SAIDA = join(RAIZ, "mapa-sp");
// Grande São Paulo (39 municípios) com folga
const BBOX = { oeste: -47.22, sul: -24.08, leste: -46.0, norte: -23.15 };
const ZOOM_MAX = Number(process.env.MAPA_ZMAX || 14);   // acima disso o app amplia o zoom 14 (fica nítido: é vetor)
const PARTE = 9 * 1024 * 1024;
const MEDIR = process.argv.includes("--medir");

/* ---------- PMTiles: leitura ---------- */
async function ultimaBuild() {
  const r = await fetch("https://build-metadata.protomaps.dev/builds.json");
  const lista = await r.json();
  const b = lista[lista.length - 1];
  return { url: "https://build.protomaps.com/" + b.key, chave: b.key, versao: b.version };
}
let URL_FONTE = "";
async function faixa(ini, tam) {
  for (let t = 1; ; t++) {
    try {
      const r = await fetch(URL_FONTE, { headers: { Range: "bytes=" + ini + "-" + (ini + tam - 1) } });
      if (r.status !== 206) throw new Error("HTTP " + r.status);
      const b = Buffer.from(await r.arrayBuffer());
      if (b.length !== tam) throw new Error("tamanho " + b.length + " != " + tam);
      return b;
    } catch (e) { if (t >= 5) throw e; await new Promise((ok) => setTimeout(ok, 1500 * t)); }
  }
}
const u64 = (b, o) => Number(b.readBigUInt64LE(o));
function lerCabecalho(b) {
  if (b.toString("ascii", 0, 7) !== "PMTiles" || b[7] !== 3) throw new Error("não é PMTiles v3");
  return {
    rootOff: u64(b, 8), rootLen: u64(b, 16), metaOff: u64(b, 24), metaLen: u64(b, 32),
    leafOff: u64(b, 40), leafLen: u64(b, 48), dataOff: u64(b, 56), dataLen: u64(b, 64),
    clustered: b[96], intComp: b[97], tileComp: b[98], tileType: b[99], minZ: b[100], maxZ: b[101]
  };
}
function lerVarint(b, p) {
  let v = 0, mult = 1, x;
  do { x = b[p.i++]; v += (x & 0x7f) * mult; mult *= 128; } while (x & 0x80);
  return v;
}
function lerDiretorio(bufComp, comp) {
  const b = comp === 2 ? gunzipSync(bufComp) : bufComp;
  const p = { i: 0 }, n = lerVarint(b, p), e = [];
  let id = 0;
  for (let k = 0; k < n; k++) { id += lerVarint(b, p); e.push({ id, run: 0, len: 0, off: 0 }); }
  for (let k = 0; k < n; k++) e[k].run = lerVarint(b, p);
  for (let k = 0; k < n; k++) e[k].len = lerVarint(b, p);
  for (let k = 0; k < n; k++) { const v = lerVarint(b, p); e[k].off = (v === 0 && k > 0) ? e[k - 1].off + e[k - 1].len : v - 1; }
  return e;
}
// Hilbert: z/x/y → número do quadradinho
function zxyParaId(z, x, y) {
  let acc = 0;
  for (let t = 0; t < z; t++) acc += Math.pow(4, t);
  const n = Math.pow(2, z);
  let rx, ry, d = 0, xx = x, yy = y;
  for (let s = n / 2; s >= 1; s /= 2) {
    rx = (xx & s) > 0 ? 1 : 0; ry = (yy & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) { if (rx === 1) { xx = s - 1 - xx; yy = s - 1 - yy; } const t = xx; xx = yy; yy = t; }
  }
  return acc + d;
}
const lon2x = (lon, z) => Math.floor((lon + 180) / 360 * Math.pow(2, z));
const lat2y = (lat, z) => { const r = lat * Math.PI / 180; return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z)); };

/* ---------- PMTiles: escrita ---------- */
function varint(arr, v) { while (v >= 128) { arr.push((v % 128) | 0x80); v = Math.floor(v / 128); } arr.push(v); }
function escreverDiretorio(e) {
  const a = []; varint(a, e.length);
  let ult = 0; for (const x of e) { varint(a, x.id - ult); ult = x.id; }
  for (const x of e) varint(a, x.run);
  for (const x of e) varint(a, x.len);
  for (let k = 0; k < e.length; k++) {
    if (k > 0 && e[k].off === e[k - 1].off + e[k - 1].len) varint(a, 0); else varint(a, e[k].off + 1);
  }
  return gzipSync(Buffer.from(a));
}
function montarDiretorios(entradas) {
  let raiz = escreverDiretorio(entradas);
  if (raiz.length <= 16384 - 127) return { raiz, folhas: Buffer.alloc(0) };
  for (let tam = 4096; ; tam *= 2) {
    const folhasBuf = [], raizE = []; let off = 0;
    for (let i = 0; i < entradas.length; i += tam) {
      const f = escreverDiretorio(entradas.slice(i, i + tam));
      raizE.push({ id: entradas[i].id, run: 0, len: f.length, off }); folhasBuf.push(f); off += f.length;
    }
    raiz = escreverDiretorio(raizE);
    if (raiz.length <= 16384 - 127) return { raiz, folhas: Buffer.concat(folhasBuf) };
  }
}

async function main() {
  const b = await ultimaBuild();
  URL_FONTE = b.url;
  console.log("Fonte:", b.chave, "versão", b.versao);
  const cab = lerCabecalho(await faixa(0, 127));
  const raiz = lerDiretorio(await faixa(cab.rootOff, cab.rootLen), cab.intComp);
  const folhasCache = new Map();
  async function acharEntrada(id) {
    let dir = raiz;
    for (let prof = 0; prof < 4; prof++) {
      // última entrada com id <= procurado
      let lo = 0, hi = dir.length - 1, achou = -1;
      while (lo <= hi) { const m = (lo + hi) >> 1; if (dir[m].id <= id) { achou = m; lo = m + 1; } else hi = m - 1; }
      if (achou < 0) return null;
      const e = dir[achou];
      if (e.run > 0) return (id < e.id + e.run) ? e : null;
      const chave = e.off;
      if (!folhasCache.has(chave)) folhasCache.set(chave, lerDiretorio(await faixa(cab.leafOff + e.off, e.len), cab.intComp));
      dir = folhasCache.get(chave);
    }
    return null;
  }

  // Quadradinhos da Grande SP, zoom 0..ZOOM_MAX
  const ids = [];
  const porZoom = {};
  for (let z = 0; z <= ZOOM_MAX; z++) {
    const x0 = lon2x(BBOX.oeste, z), x1 = lon2x(BBOX.leste, z), y0 = lat2y(BBOX.norte, z), y1 = lat2y(BBOX.sul, z);
    porZoom[z] = { n: 0, bytes: 0 };
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) ids.push({ id: zxyParaId(z, x, y), z });
  }
  ids.sort((a, b) => a.id - b.id);
  const achados = [];
  for (const t of ids) {
    const e = await acharEntrada(t.id);
    if (!e) continue;
    achados.push({ id: t.id, z: t.z, off: e.off, len: e.len });
  }
  const unicos = new Map();
  for (const a of achados) { porZoom[a.z].n++; if (!unicos.has(a.off)) { unicos.set(a.off, a.len); porZoom[a.z].bytes += a.len; } }
  let total = 0; for (const v of unicos.values()) total += v;
  for (const z in porZoom) console.log("zoom " + z + ": " + porZoom[z].n + " quadradinhos, " + (porZoom[z].bytes / 1048576).toFixed(1) + " MB");
  console.log("TOTAL: " + achados.length + " quadradinhos, " + unicos.size + " diferentes, " + (total / 1048576).toFixed(1) + " MB");
  if (MEDIR) return;

  // Baixa os dados agrupando pedaços vizinhos (poucas requisições grandes)
  const ofs = [...unicos.keys()].sort((a, b) => a - b);
  const dados = new Map();
  let i = 0, baixado = 0;
  while (i < ofs.length) {
    let ini = ofs[i], fim = ofs[i] + unicos.get(ofs[i]), j = i + 1;
    while (j < ofs.length && ofs[j] - fim < 65536 && ofs[j] + unicos.get(ofs[j]) - ini < 32 * 1048576) { fim = Math.max(fim, ofs[j] + unicos.get(ofs[j])); j++; }
    const buf = await faixa(cab.dataOff + ini, fim - ini);
    for (let k = i; k < j; k++) dados.set(ofs[k], buf.subarray(ofs[k] - ini, ofs[k] - ini + unicos.get(ofs[k])));
    baixado += fim - ini; i = j;
    process.stdout.write("\rbaixado " + (baixado / 1048576).toFixed(1) + " MB");
  }
  console.log();

  // Monta o arquivo novo: dados na ordem dos ids, repetidos (mar, mato) guardados uma vez só
  const novoOff = new Map(), pedacos = []; let pos = 0;
  const entradas = [];
  for (const a of achados) {
    if (!novoOff.has(a.off)) { novoOff.set(a.off, pos); pedacos.push(dados.get(a.off)); pos += a.len; }
    const o = novoOff.get(a.off), ult = entradas[entradas.length - 1];
    if (ult && ult.off === o && ult.id + ult.run === a.id) ult.run++;
    else entradas.push({ id: a.id, run: 1, len: a.len, off: o });
  }
  const dadosBuf = Buffer.concat(pedacos);
  const { raiz: raizBuf, folhas } = montarDiretorios(entradas);
  let meta = await faixa(cab.metaOff, cab.metaLen);
  if (cab.intComp === 2) meta = gunzipSync(meta);
  const metaObj = JSON.parse(meta.toString("utf8"));
  metaObj.description = "Rota Liberada – Grande São Paulo (extrato de " + b.chave + ")";
  const metaBuf = gzipSync(Buffer.from(JSON.stringify(metaObj)));

  const h = Buffer.alloc(127);
  h.write("PMTiles", 0, "ascii"); h[7] = 3;
  let o = 127;
  const campos = [[o, raizBuf.length]]; o += raizBuf.length;
  campos.push([o, metaBuf.length]); o += metaBuf.length;
  campos.push([o, folhas.length]); o += folhas.length;
  campos.push([o, dadosBuf.length]);
  campos.forEach(([off, len], k) => { h.writeBigUInt64LE(BigInt(off), 8 + k * 16); h.writeBigUInt64LE(BigInt(len), 16 + k * 16); });
  h.writeBigUInt64LE(BigInt(achados.length), 72);
  h.writeBigUInt64LE(BigInt(entradas.length), 80);
  h.writeBigUInt64LE(BigInt(novoOff.size), 88);
  h[96] = 1; h[97] = 2; h[98] = cab.tileComp; h[99] = cab.tileType; h[100] = 0; h[101] = ZOOM_MAX;
  h.writeInt32LE(Math.round(BBOX.oeste * 1e7), 102); h.writeInt32LE(Math.round(BBOX.sul * 1e7), 106);
  h.writeInt32LE(Math.round(BBOX.leste * 1e7), 110); h.writeInt32LE(Math.round(BBOX.norte * 1e7), 114);
  h[118] = 11; h.writeInt32LE(Math.round(-46.633 * 1e7), 119); h.writeInt32LE(Math.round(-23.55 * 1e7), 123);
  const arquivo = Buffer.concat([h, raizBuf, metaBuf, folhas, dadosBuf]);

  if (existsSync(SAIDA)) rmSync(SAIDA, { recursive: true });
  mkdirSync(SAIDA, { recursive: true });
  const partes = [];
  for (let p = 0, n = 1; p < arquivo.length; p += PARTE, n++) {
    const nome = "parte-" + String(n).padStart(2, "0") + ".bin";
    writeFileSync(join(SAIDA, nome), arquivo.subarray(p, p + PARTE));
    partes.push(nome);
  }
  const info = { versao: b.chave.replace(".pmtiles", ""), tamanho: arquivo.length, partes, zoomMax: ZOOM_MAX, bbox: BBOX, fonte: "Protomaps " + b.versao + " (OpenStreetMap, ODbL)" };
  writeFileSync(join(SAIDA, "info.json"), JSON.stringify(info, null, 1));
  console.log("Gerado:", (arquivo.length / 1048576).toFixed(1) + " MB em " + partes.length + " partes →", SAIDA);
}
main().catch((e) => { console.error(e); process.exit(1); });
