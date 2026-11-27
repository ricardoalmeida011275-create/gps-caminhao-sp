// Faz o celular aceitar instalar o app e guarda a última versão para abrir sem internet.
const CACHE = "rota-caminhao-v51";
const ARQUIVOS = ["./", "./index.html", "./dados-restricoes.js", "./locais-sp.js", "./zer-sp.js", "./onibus-sp.js", "./bloqueios-sp.js", "./riscos-sp.js", "./alertas-cet.js", "./planos.js", "./extras.js", "./offline.js", "./velocidade.js", "./chegada.js", "./voltar.js", "./conta.js", "./manifest.webmanifest", "./icones/icone-192.png", "./icones/icone-512.png"];
// Bibliotecas de fora (mapa, cálculos, letras, login): guardadas para o app abrir sem internet
const CACHE_LIBS = "rota-libs-v1";
const LIBS = [
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js",
  "https://cdn.jsdelivr.net/npm/leaflet-rotate@0.2.8/dist/leaflet-rotate.js",
  "https://cdnjs.cloudflare.com/ajax/libs/Turf.js/6.5.0/turf.min.js",
  "https://unpkg.com/protomaps-leaflet@5.1.0/dist/protomaps-leaflet.js"
];
const HOSTS_LIBS = ["cdnjs.cloudflare.com", "cdn.jsdelivr.net", "unpkg.com", "fonts.googleapis.com", "fonts.gstatic.com", "www.gstatic.com"];
// O mapa de SP baixado (offline.js) fica num cache separado, que só o app apaga
const MANTER = [CACHE, CACHE_LIBS, "rota-mapa-sp"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ARQUIVOS))
      .then(() => caches.open(CACHE_LIBS)).then((c) => Promise.all(LIBS.map((u) =>
        c.match(u).then((tem) => tem || fetch(new Request(u, { mode: "no-cors" })).then((r) => c.put(u, r)).catch(() => {}))
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((nomes) => Promise.all(nomes.filter((n) => MANTER.indexOf(n) < 0).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Bibliotecas de fora: usa a cópia guardada (endereços com versão não mudam); sem cópia, busca e guarda
  if (url.origin !== self.location.origin) {
    if (HOSTS_LIBS.indexOf(url.hostname) < 0) return;
    if (url.hostname === "www.gstatic.com" && url.pathname.indexOf("/firebasejs/") !== 0) return;
    e.respondWith(
      caches.open(CACHE_LIBS).then((c) => c.match(req, { ignoreVary: true }).then((tem) => tem || fetch(req).then((resp) => {
        if (resp.ok || resp.type === "opaque") c.put(req, resp.clone());
        return resp;
      })))
    );
    return;
  }
  // Partes do mapa de SP e o teste de internet: sempre direto da internet (o app guarda o mapa do jeito dele)
  if (url.pathname.indexOf("/mapa-sp/") >= 0) return;
  // Resto do app: tenta a internet primeiro (dados sempre atualizados); sem internet, usa a cópia guardada.
  // Página principal com sinal fraco: se a internet demorar mais de 6 s, abre a cópia guardada (e atualiza por trás).
  const daRede = fetch(req).then((resp) => {
    if (resp.ok) { const copia = resp.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
    return resp;
  });
  const reserva = () => caches.match(req).then((r) => r || caches.match("./index.html"));
  if (req.mode === "navigate") {
    e.respondWith(new Promise((ok) => {
      let feito = false;
      const t = setTimeout(() => { reserva().then((r) => { if (r && !feito) { feito = true; ok(r); } }); }, 6000);
      daRede.then((r) => { if (!feito) { feito = true; clearTimeout(t); ok(r); } })
        .catch(() => { clearTimeout(t); reserva().then((r) => { if (!feito) { feito = true; ok(r || Response.error()); } }); });
    }));
    return;
  }
  e.respondWith(daRede.catch(reserva));
});

// Tocou no aviso ("Rota liberada!", "Hora de sair!"): abre o app (ou traz para a frente)
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const c of lista) if ("focus" in c) return c.focus();
      return self.clients.openWindow("./");
    })
  );
});
