// Faz o celular aceitar instalar o app e guarda a última versão para abrir sem internet.
const CACHE = "rota-caminhao-v36";
const ARQUIVOS = ["./", "./index.html", "./dados-restricoes.js", "./locais-sp.js", "./zer-sp.js", "./onibus-sp.js", "./bloqueios-sp.js", "./manifest.webmanifest", "./icones/icone-192.png", "./icones/icone-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Sempre tenta a internet primeiro (dados sempre atualizados); sem internet, usa a cópia guardada.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((resp) => {
        const copia = resp.clone();
        caches.open(CACHE).then((c) => c.put(req, copia));
        return resp;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
  );
});
