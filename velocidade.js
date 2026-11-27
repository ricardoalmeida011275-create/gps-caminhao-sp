/* =====================================================================
   TAREFA 11 – ALERTA DE VELOCIDADE (GRÁTIS)
   - Menu ☰ › "Alerta de velocidade": liga/desliga, "Meu limite" (padrão 80 km/h) e margem (padrão 3 km/h).
   - Limite da rua: OpenStreetMap (maxspeed; para caminhão, maxspeed:hgv quando existir), buscado uma vez
     para o caminho da rota (serviço gratuito Overpass). Vale o MENOR entre o meu limite e o da rua.
   - Na navegação: velocidade sempre na tela e a placa do limite da rua quando souber.
   - Passou do limite + margem: som uma vez, borda da tela vermelha e o número piscando.
     O som só repete se continuar acima por mais de 10 s. Para quando voltar abaixo.
   ===================================================================== */
(function () {
  if (!window.RL || !window.RLExtras) return;
  var X = window.RLExtras, el = RL.el, nav = RL.nav, estado = RL.estado, esc = RL.escapar;
  var CHAVE = "rotaCaminhaoSP.velocidade", PADRAO = { ligado: true, limite: 80, margem: 3 };
  var OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"];
  var cfg = Object.assign({}, PADRAO, X.J(CHAVE, {}) || {});
  function guardar() { X.G(CHAVE, cfg); atualizarMenu(); }

  var css = document.createElement("style");
  css.textContent =
    ".placa-vel{position:absolute;z-index:1000;left:calc(max(12px,env(safe-area-inset-left,0px)) + 80px);bottom:calc(116px + env(safe-area-inset-bottom,0px));" +
    "width:56px;height:56px;border-radius:50%;background:#fff;border:6px solid #d32f2f;box-sizing:border-box;display:flex;align-items:center;justify-content:center;" +
    "font:800 22px/1 var(--f-titulo,system-ui),system-ui,sans-serif;color:#111;box-shadow:0 3px 10px rgba(0,0,0,.3);pointer-events:none}" +
    ".placa-vel[hidden]{display:none}" +
    "body.vel-alerta::after{content:'';position:fixed;inset:0;border:10px solid #e53935;pointer-events:none;z-index:99990}" +
    "body.vel-alerta #velocimetro{background:#e53935;border-color:#b71c1c;color:#fff}body.vel-alerta #velocimetro span{color:#fff}" +
    "body.vel-alerta #velNum{animation:velPisca 1s steps(2,start) infinite}" +
    "@keyframes velPisca{to{visibility:hidden}}" +
    ".vel-grade{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:6px 0 10px}";
  document.head.appendChild(css);

  var placa = document.createElement("div");
  placa.className = "placa-vel"; placa.id = "placaVel"; placa.hidden = true; placa.setAttribute("aria-label", "Limite de velocidade da rua");
  var velo = el("velocimetro");
  if (velo && velo.parentNode) velo.parentNode.insertBefore(placa, velo.nextSibling);

  /* ---------- Som (gerado no próprio celular) ---------- */
  var ctx = null;
  function audio() { try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); } catch (e) {} return ctx; }
  document.addEventListener("pointerdown", function () { audio(); }, { capture: true, passive: true });
  function tocarAlerta() {
    var c = audio(); if (!c) return;
    try {
      [0, 0.28, 0.56].forEach(function (d, i) {
        var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + d;
        o.type = "square"; o.frequency.value = i === 2 ? 1320 : 990;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.24);
      });
    } catch (e) {}
    RL.vibrar([200, 100, 200]);
  }

  /* ---------- Limite da rua (OpenStreetMap) ---------- */
  var ruas = { rota: null, grade: {}, carregando: false, ultima: null, ultimaT: 0 };
  var CEL = 150;   // metros
  function lerLimite(tags) {
    function n(v) {
      if (!v) return 0;
      var m = /^\s*(\d{2,3})\s*(mph)?\s*$/.exec(String(v).split(";")[0]);
      if (!m) return 0;
      var k = parseInt(m[1], 10); if (m[2]) k = Math.round(k * 1.609);
      return k >= 10 && k <= 130 ? k : 0;
    }
    return n(tags["maxspeed:hgv"]) || n(tags.maxspeed);
  }
  function chaveCel(x, y) { return Math.floor(x / CEL) + "_" + Math.floor(y / CEL); }
  function guardarSegmento(s) {
    var x0 = Math.min(s.a[0], s.b[0]) - 30, x1 = Math.max(s.a[0], s.b[0]) + 30, y0 = Math.min(s.a[1], s.b[1]) - 30, y1 = Math.max(s.a[1], s.b[1]) + 30;
    for (var x = Math.floor(x0 / CEL); x <= Math.floor(x1 / CEL); x++) for (var y = Math.floor(y0 / CEL); y <= Math.floor(y1 / CEL); y++) {
      var k = x + "_" + y; (ruas.grade[k] || (ruas.grade[k] = [])).push(s);
    }
  }
  function pedir(q, i) {
    if (RL.pedirOverpass) return RL.pedirOverpass(q);   // o mesmo do app: pergunta a vários servidores e fica com o primeiro
    i = i || 0;
    var ctl = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 40000);
    return fetch(OVERPASS[i], { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: ctl ? ctl.signal : undefined })
      .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error("Overpass " + r.status); return r.json(); })
      .catch(function (e) { clearTimeout(t); if (i + 1 < OVERPASS.length) return pedir(q, i + 1); throw e; });
  }
  // Busca os limites das ruas do caminho da rota (uma vez por rota; pedaços de ~60 km)
  function carregarRuasDaRota(r) {
    ruas.rota = r; ruas.grade = {}; ruas.ultima = null;
    if (!r || !r.coords || !r.coords.length) return;
    var pts = [], ult = null, i;
    for (i = 0; i < r.coords.length; i++) {
      var c = r.coords[i], p = RL.xy(c[0], c[1]);
      if (!ult || Math.hypot(p[0] - ult[0], p[1] - ult[1]) > 120 || i === r.coords.length - 1) { pts.push(c); ult = p; }
    }
    var lotes = []; for (i = 0; i < pts.length; i += 500) lotes.push(pts.slice(i, i + 501));
    ruas.carregando = true;
    lotes.reduce(function (p, lote) {
      return p.then(function () {
        if (ruas.rota !== r) return;
        var lista = lote.map(function (c) { return c[1].toFixed(5) + "," + c[0].toFixed(5); }).join(",");
        var q = '[out:json][timeout:40];way["highway"]["maxspeed"](around:25,' + lista + ');out tags geom;' +
          'way["highway"]["maxspeed:hgv"](around:25,' + lista + ');out tags geom;';
        return pedir(q).then(function (j) {
          if (ruas.rota !== r) return;
          var vistos = {};
          (j.elements || []).forEach(function (w) {
            if (vistos[w.id] || !w.geometry) return; vistos[w.id] = 1;
            var lim = lerLimite(w.tags || {}); if (!lim) return;
            for (var k = 0; k < w.geometry.length - 1; k++) {
              var a = RL.xy(w.geometry[k].lon, w.geometry[k].lat), b = RL.xy(w.geometry[k + 1].lon, w.geometry[k + 1].lat);
              guardarSegmento({ a: a, b: b, lim: lim });
            }
          });
        }, function () {});
      });
    }, Promise.resolve()).then(function () { ruas.carregando = false; });
  }
  function distSeg(p, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy, t = 0;
    if (L2 > 0) t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2));
    return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]);
  }
  function rumoGraus(a, b) { return (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI + 360) % 360; }
  function paralelo(g1, g2) { var d = Math.abs(((g1 - g2) % 180 + 180) % 180); return d < 35 || d > 145; }
  function limiteDaRua(lon, lat, dir) {
    var p = RL.xy(lon, lat), lista = ruas.grade[chaveCel(p[0], p[1])] || [], melhor = null;
    var temDir = dir !== null && dir !== undefined && !isNaN(dir);
    lista.forEach(function (s) {
      var d = distSeg(p, s.a, s.b);
      if (d > 20) return;
      if (temDir && !paralelo(dir, rumoGraus(s.a, s.b))) { if (d > 8) return; d += 10; }
      if (!melhor || d < melhor.d) melhor = { d: d, lim: s.lim };
    });
    var agora = Date.now();
    if (melhor) { ruas.ultima = melhor.lim; ruas.ultimaT = agora; return melhor.lim; }
    // sem rua na hora (cruzamento, GPS pulou): mantém a última por até 8 s
    if (ruas.ultima && agora - ruas.ultimaT < 8000) return ruas.ultima;
    ruas.ultima = null;
    return 0;
  }

  /* ---------- A cada posição do GPS ---------- */
  var alerta = { ativo: false, somEm: 0 };
  function pararAlerta() { alerta.ativo = false; document.body.classList.remove("vel-alerta"); }
  RL.ganchos.velocidade = function (kmh, lon, lat, dir) {
    if (!nav.ativo) return;
    if (estado.rota && estado.rota !== ruas.rota) carregarRuasDaRota(estado.rota);
    var rua = limiteDaRua(lon, lat, dir);
    placa.hidden = !rua;
    if (rua) placa.textContent = String(rua);
    if (!cfg.ligado) { pararAlerta(); return; }
    var limite = rua ? Math.min(cfg.limite, rua) : cfg.limite, margem = cfg.margem;
    var agora = Date.now();
    if (kmh >= limite + margem) {
      if (!alerta.ativo) { alerta.ativo = true; alerta.somEm = agora; document.body.classList.add("vel-alerta"); tocarAlerta(); }
      else if (agora - alerta.somEm > 10000) { alerta.somEm = agora; tocarAlerta(); }   // continua acima: repete a cada 10 s
    } else if (alerta.ativo && kmh < limite + margem - 1) pararAlerta();
  };
  X.ganchosFim.push(function () { pararAlerta(); placa.hidden = true; ruas.rota = null; ruas.grade = {}; });

  /* ---------- Menu ☰ › Alerta de velocidade ---------- */
  var item = X.itemMenu("btnVelocidade", "🚦", "Alerta de velocidade", "", "btnTempos", function () { if (X.exigir("alertaVelocidade")) tela(); });
  function atualizarMenu() {
    var s = item.querySelector("small");
    if (s) s.textContent = cfg.ligado ? "Ligado · meu limite " + cfg.limite + " km/h (avisa a partir de +" + cfg.margem + ")" : "Desligado";
  }
  atualizarMenu();
  function tela() {
    if (nav.ativo && !X.parado()) { RL.avisoRapido("🚚 Pare o caminhão para mudar o alerta de velocidade."); return; }
    var lims = [40, 50, 60, 70, 80, 90, 100, 110], margens = [0, 3, 5, 7, 10];
    var h = '<div class="x-grade"><button type="button" class="x-btn" data-lig="1" aria-pressed="' + cfg.ligado + '">🔔 Ligado</button>' +
      '<button type="button" class="x-btn" data-lig="0" aria-pressed="' + !cfg.ligado + '">🔕 Desligado</button></div>' +
      '<span class="x-rot">Meu limite (km/h)</span><div class="vel-grade">' +
      lims.map(function (v) { return '<button type="button" class="x-btn" data-lim="' + v + '" aria-pressed="' + (cfg.limite === v) + '">' + v + '</button>'; }).join("") + '</div>' +
      '<span class="x-rot">Avisar a partir de quantos km/h acima</span><div class="x-grade3" style="grid-template-columns:repeat(5,1fr)">' +
      margens.map(function (v) { return '<button type="button" class="x-btn" data-mar="' + v + '" aria-pressed="' + (cfg.margem === v) + '">+' + v + '</button>'; }).join("") + '</div>' +
      '<p class="off-txt" style="font-size:14px">Na viagem, quando o mapa souber o limite da rua, a placa aparece ao lado da velocidade e vale o <b>menor</b> entre o seu limite e o da rua. ' +
      'Passou do limite: som, borda vermelha e o número piscando. Limites da rua do OpenStreetMap: podem faltar ou estar desatualizados. Siga sempre as placas.</p>';
    var t = X.janela("telaVelocidade", "🚦 Alerta de velocidade", h);
    [].forEach.call(t.querySelectorAll("[data-lig]"), function (b) { b.onclick = function () { cfg.ligado = b.getAttribute("data-lig") === "1"; guardar(); if (!cfg.ligado) pararAlerta(); tela(); }; });
    [].forEach.call(t.querySelectorAll("[data-lim]"), function (b) { b.onclick = function () { cfg.limite = +b.getAttribute("data-lim"); guardar(); tela(); }; });
    [].forEach.call(t.querySelectorAll("[data-mar]"), function (b) { b.onclick = function () { cfg.margem = +b.getAttribute("data-mar"); guardar(); tela(); }; });
  }

  window.RLVelocidade = { cfg: function () { return cfg; }, ruas: function () { return ruas; }, limiteDaRua: limiteDaRua, lerLimite: lerLimite, carregarRuasDaRota: carregarRuasDaRota, tela: tela };
})();
