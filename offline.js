/* =====================================================================
   TAREFA 10 – MODO SEM INTERNET (PLUS)
   - Menu ☰ › "Mapa sem internet": baixar / atualizar / apagar o mapa de São Paulo (cidade + Grande SP).
     O mapa vem do próprio site (pasta mapa-sp/, gerada por ferramentas/mapa-offline.mjs a partir do
     Protomaps/OpenStreetMap, gratuito) e fica guardado no celular (Cache Storage).
   - Junto: postos e paradas da Grande SP. As áreas restritas e os horários já ficam no celular (sw.js).
   - Ao iniciar a viagem: guarda a rota inteira e as instruções (se o app fechar, dá para continuar).
   - Sinal caiu: aviso discreto e o mapa salvo aparece no lugar do mapa da internet.
   - Saiu da rota sem internet: mostra o caminho de volta (linha tracejada até a rota salva) e avisa.
   ===================================================================== */
(function () {
  if (!window.RL || !window.RLExtras) return;
  var X = window.RLExtras, el = RL.el, nav = RL.nav, estado = RL.estado, mapa = RL.mapa, esc = RL.escapar;
  var PASTA = "mapa-sp/", CACHE_MAPA = "rota-mapa-sp", ARQ = "./mapa-sp/mapa.pmtiles";
  var CHAVE_META = "rotaCaminhaoSP.mapaOffline", CHAVE_VIAGEM = "rotaCaminhaoSP.viagemSalva", CHAVE_DICA = "rotaCaminhaoSP.dicaMapaOffline";
  var LIB = "https://unpkg.com/protomaps-leaflet@5.1.0/dist/protomaps-leaflet.js";   // desenha o mapa salvo (gratuito)
  var BBOX_SP = { s: -24.08, w: -47.22, n: -23.15, e: -46.0 };
  var DICA = "Dica: baixe o mapa de SP no Wi-Fi para não ficar sem navegação se o sinal cair.";
  var meta = X.J(CHAVE_META, null);
  function liberado() { return !window.PLANOS || window.PLANOS.liberado("mapaOffline"); }
  function salvo() { return !!(meta && meta.versao); }
  function mb(b) { return Math.round(b / 1048576) + " MB"; }
  RL.ganchos.mapaSalvo = salvo;

  var css = document.createElement("style");
  css.textContent =
    ".off-barra{height:14px;border-radius:7px;background:var(--linha);overflow:hidden;margin:8px 0 6px}" +
    ".off-barra i{display:block;height:100%;width:0;background:#1f7a3d;transition:width .3s}" +
    ".off-txt{font-size:15px;margin:0 0 8px}" +
    ".sem-rede{align-self:flex-start;margin:0;padding:4px 12px;border-radius:999px;background:rgba(20,32,46,.86);color:#fff;font-size:13px;font-weight:700;pointer-events:none}" +
    ".sem-rede[hidden]{display:none}";
  document.head.appendChild(css);

  /* ---------- Tem internet? ----------
     Sem internet = o celular diz que está desconectado OU um teste rápido no próprio site falhou.
     O teste roda quando algum pedido falha por rede ou o mapa da internet não carrega; sem rede, repete a cada 15 s. */
  var rede = { sem: navigator.onLine === false, testando: false, ultimoTeste: 0 };
  function semRede() { if (rede.simulado !== undefined) return rede.simulado; return navigator.onLine === false || rede.sem; }
  RL.ganchos.semRede = semRede;
  var fetchOrig = window.fetch.bind(window);
  function testarRede(forcar) {
    if (rede.testando || (!forcar && Date.now() - rede.ultimoTeste < 10000)) return;
    rede.testando = true; rede.ultimoTeste = Date.now();
    var ctl = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
    fetchOrig(PASTA + "info.json?rede=" + Date.now(), { cache: "no-store", signal: ctl ? ctl.signal : undefined })
      .then(function () { definirRede(false); }, function () { definirRede(true); })
      .then(function () { clearTimeout(t); rede.testando = false; });
  }
  function definirRede(sem) {
    var antes = semRede(); rede.sem = sem;
    if (antes !== semRede()) mudouRede();
  }
  window.fetch = function (rec) {
    var p = fetchOrig.apply(null, arguments);
    var url = typeof rec === "string" ? rec : (rec && rec.url) || "";
    if (url.indexOf("rede=") < 0) p.catch(function (e) { if (e && e.name === "TypeError") testarRede(); });
    return p;
  };
  window.addEventListener("offline", function () { mudouRede(); });
  window.addEventListener("online", function () { rede.sem = false; mudouRede(); testarRede(true); });
  if (RL.camadaOSM) {
    var errosMapa = 0;
    RL.camadaOSM.on("tileerror", function () { if (++errosMapa >= 3) { errosMapa = 0; testarRede(); } });
    RL.camadaOSM.on("tileload", function () { errosMapa = 0; });
  }
  setInterval(function () { if (rede.sem) testarRede(true); }, 15000);
  function mudouRede() { atualizarCamada(); atualizarAvisoRede(); }

  /* ---------- Leitor do arquivo do mapa (formato PMTiles, padrão aberto) ---------- */
  function leitorPMTiles(blob) {
    var cab = null, dirs = new Map();
    function gunzip(buf) { return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer(); }
    function bytes(o, n) { return blob.slice(o, o + n).arrayBuffer(); }
    function u64(v, o) { return v.getUint32(o, true) + v.getUint32(o + 4, true) * 4294967296; }
    function cabecalho() {
      if (cab) return Promise.resolve(cab);
      return bytes(0, 127).then(function (b) {
        var v = new DataView(b);
        cab = { root: [u64(v, 8), u64(v, 16)], leaf: u64(v, 40), data: u64(v, 56), intComp: v.getUint8(97), tileComp: v.getUint8(98), minZ: v.getUint8(100), maxZ: v.getUint8(101) };
        return cab;
      });
    }
    function diretorio(o, n) {
      var k = o + ":" + n;
      if (dirs.has(k)) return Promise.resolve(dirs.get(k));
      return bytes(o, n).then(function (buf) { return cab.intComp === 2 ? gunzip(buf) : buf; }).then(function (buf) {
        var b = new Uint8Array(buf), i = 0, q, e = [], id = 0, j, x;
        function vi() { var v = 0, m = 1, y; do { y = b[i++]; v += (y & 127) * m; m *= 128; } while (y & 128); return v; }
        q = vi();
        for (j = 0; j < q; j++) { id += vi(); e.push({ id: id, run: 0, len: 0, off: 0 }); }
        for (j = 0; j < q; j++) e[j].run = vi();
        for (j = 0; j < q; j++) e[j].len = vi();
        for (j = 0; j < q; j++) { x = vi(); e[j].off = (x === 0 && j > 0) ? e[j - 1].off + e[j - 1].len : x - 1; }
        dirs.set(k, e); return e;
      });
    }
    function idDe(z, x, y) {
      var acc = 0, t, n = Math.pow(2, z), d = 0, rx, ry, s;
      for (t = 0; t < z; t++) acc += Math.pow(4, t);
      for (s = n / 2; s >= 1; s /= 2) {
        rx = (x & s) > 0 ? 1 : 0; ry = (y & s) > 0 ? 1 : 0; d += s * s * ((3 * rx) ^ ry);
        if (ry === 0) { if (rx === 1) { x = s - 1 - x; y = s - 1 - y; } t = x; x = y; y = t; }
      }
      return acc + d;
    }
    return {
      getZxy: function (z, x, y) {
        return cabecalho().then(function (c) {
          if (z < c.minZ || z > c.maxZ) return null;
          var id = idDe(z, x, y);
          function procurar(o, n, prof) {
            if (prof > 3) return null;
            return diretorio(o, n).then(function (dir) {
              var lo = 0, hi = dir.length - 1, a = -1, m;
              while (lo <= hi) { m = (lo + hi) >> 1; if (dir[m].id <= id) { a = m; lo = m + 1; } else hi = m - 1; }
              if (a < 0) return null;
              var e = dir[a];
              if (e.run > 0) {
                if (id >= e.id + e.run) return null;
                return bytes(c.data + e.off, e.len).then(function (d) { return c.tileComp === 2 ? gunzip(d) : d; }).then(function (d) { return { data: d }; });
              }
              return procurar(c.leaf + e.off, e.len, prof + 1);
            });
          }
          return procurar(c.root[0], c.root[1], 0);
        });
      }
    };
  }

  /* ---------- Mapa salvo na tela (só quando está sem internet) ---------- */
  var camadaOff = null, ligando = null, libPromessa = null;
  function carregarLib() {
    if (window.protomapsL) return Promise.resolve();
    if (!libPromessa) libPromessa = new Promise(function (ok, erro) {
      var s = document.createElement("script"); s.src = LIB; s.async = true;
      s.onload = ok; s.onerror = function () { libPromessa = null; erro(new Error("Não consegui abrir o desenhista do mapa.")); };
      document.head.appendChild(s);
    });
    return libPromessa;
  }
  function abrirArquivo() {
    return caches.open(CACHE_MAPA).then(function (c) { return c.match(ARQ); }).then(function (r) {
      if (!r) throw new Error("O mapa salvo não foi encontrado. Baixe de novo.");
      return r.blob();
    });
  }
  function ligarCamada() {
    if (camadaOff) return Promise.resolve(true);
    if (ligando) return ligando;
    ligando = Promise.all([carregarLib(), abrirArquivo()]).then(function (r) {
      ligando = null;
      if (camadaOff || !(semRede() && salvo() && liberado())) return !!camadaOff;
      camadaOff = window.protomapsL.leafletLayer({ url: leitorPMTiles(r[1]), flavor: "light", lang: "pt", maxDataZoom: (meta && meta.zoomMax) || 14, maxZoom: 19 });
      camadaOff.addTo(mapa);
      if (camadaOff.setZIndex) camadaOff.setZIndex(0);   // por baixo: onde o mapa da internet já carregou, ele continua aparecendo
      return true;
    }, function () { ligando = null; return false; });
    return ligando;
  }
  function desligarCamada() { if (camadaOff) { mapa.removeLayer(camadaOff); camadaOff = null; } }
  function atualizarCamada() { if (semRede() && salvo() && liberado()) ligarCamada(); else desligarCamada(); }
  // Com o mapa salvo, deixa o desenhista pronto (e guardado pelo sw.js) para quando o sinal cair
  if (salvo()) setTimeout(function () { carregarLib().catch(function () {}); }, 6000);

  /* ---------- Aviso discreto na navegação ---------- */
  var avisoRede = document.createElement("p");
  avisoRede.className = "sem-rede"; avisoRede.id = "avisoSemRede"; avisoRede.hidden = true; avisoRede.setAttribute("role", "status");
  var topo = el("navTopo");
  if (topo && topo.parentNode) topo.parentNode.insertBefore(avisoRede, topo.nextSibling);
  function atualizarAvisoRede() {
    var mostrar = nav.ativo && semRede();
    avisoRede.hidden = !mostrar;
    if (mostrar) avisoRede.textContent = (salvo() && liberado()) ? "📶 Sem internet – navegando com o mapa salvo" : "📶 Sem internet – navegando com a rota salva";
  }

  /* ---------- Rota da viagem guardada no celular ---------- */
  var rotaGuardada = null;
  function guardarViagem() {
    var r = estado.rota;
    if (!r || !estado.B) return;
    try {
      var json = JSON.stringify({ em: Date.now(), A: estado.A, B: estado.B, res: r }, function (k, v) { return (k === "pts" || k === "acum") ? undefined : v; });
      localStorage.setItem(CHAVE_VIAGEM, json);
      rotaGuardada = r;
    } catch (e) { rotaGuardada = r; }   // sem espaço: a rota continua na memória enquanto o app estiver aberto
  }
  X.ganchosInicio.push(function () { guardarViagem(); atualizarAvisoRede(); });
  X.ganchosTick.push(function () {
    if (nav.ativo && estado.rota && estado.rota !== rotaGuardada) guardarViagem();
    atualizarAvisoRede();
  });
  X.ganchosFim.push(function () {
    try { localStorage.removeItem(CHAVE_VIAGEM); } catch (e) {}
    rotaGuardada = null; apagarGuia(); nav.semRedeFora = false; atualizarAvisoRede();
  });
  // Abriu o app com uma viagem pela metade (o app fechou ou o celular reiniciou): oferece continuar
  setTimeout(function () {
    var v = X.J(CHAVE_VIAGEM, null);
    if (!v || !v.res || !v.B || Date.now() - v.em > 8 * 3600000 || nav.ativo) return;
    X.quandoLivre(function () {
      if (nav.ativo) return;
      var t = X.janela("telaRetomar", "Continuar a viagem?",
        '<p class="off-txt">Você estava navegando para <b>' + esc(String(v.B.nome || "o destino").split(" – ")[0]) + '</b>. A rota ficou guardada no celular' + (semRede() ? ' e funciona sem internet.' : '.') + '</p>' +
        '<button type="button" class="x-btn verde" id="btnRetomar" style="width:100%;margin-bottom:8px">▶️ Continuar navegação</button>' +
        '<button type="button" class="x-btn" id="btnNaoRetomar" style="width:100%">Não, obrigado</button>');
      el("btnRetomar").onclick = function () {
        t.hidden = true;
        try { RL.retomarViagem(v.res, v.A, v.B); } catch (e) { RL.avisoRapido("Não deu para continuar esta viagem. Trace a rota de novo."); }
      };
      el("btnNaoRetomar").onclick = function () { t.hidden = true; try { localStorage.removeItem(CHAVE_VIAGEM); } catch (e) {} };
      t.querySelector(".x-fechar").hidden = true;
    });
  }, 2500);

  /* ---------- Saiu da rota sem internet: caminho de volta para a rota salva ---------- */
  var guia = null, faladoEm = 0, distGuia = -1;
  function apagarGuia() { if (guia) { mapa.removeLayer(guia); guia = null; } distGuia = -1; }
  function pontoDeVolta(lon, lat) {
    var r = estado.rota; if (!r || !r.pts) return null;
    var p = RL.xy(lon, lat), s0 = Math.max(0, (nav.sAtual || 0) - 100), melhor = null;
    for (var i = 0; i < r.pts.length; i++) {
      if (r.acum[i] < s0) continue;
      var d = Math.hypot(r.pts[i][0] - p[0], r.pts[i][1] - p[1]);
      if (!melhor || d < melhor.d) melhor = { d: d, c: r.coords[i] };
    }
    return melhor;
  }
  RL.ganchos.guiaVolta = function (lon, lat) {
    var alvo = pontoDeVolta(lon, lat);
    if (!alvo) return;
    var linha = [[lat, lon], [alvo.c[1], alvo.c[0]]];
    if (guia) guia.setLatLngs(linha);
    else guia = L.polyline(linha, { color: "#e65100", weight: 6, opacity: 0.95, dashArray: "10 12", interactive: false }).addTo(mapa);
    var faixa = Math.round(alvo.d / 100);
    if (faixa !== distGuia) {
      distGuia = faixa;
      RL.mostrarAlertaNav("📶 Sem internet para recalcular. Volte para a rota ou aguarde o sinal. A rota está a " + RL.km(alvo.d) + " (linha laranja).", "alerta");
    }
  };
  RL.ganchos.recalcularSemRede = function (motivo, lon, lat) {
    if (/saiu da rota|Recalculando/i.test(motivo || "")) {
      nav.semRedeFora = true;
      distGuia = -1;
      RL.ganchos.guiaVolta(lon, lat);
      if (Date.now() - faladoEm > 60000) { faladoEm = Date.now(); RL.falar("Sem internet para recalcular. Volte para a rota ou aguarde o sinal.", "manobra"); }
    } else {
      // ajustes de horário / restrição que começou: sem internet, segue a rota salva
      nav.precisaRecalc = false;
      RL.mostrarAlertaNav("📶 Sem internet: seguindo a rota salva. A rota é conferida de novo quando o sinal voltar.", "info");
    }
  };
  RL.ganchos.voltouParaRota = function () {
    apagarGuia();
    RL.mostrarAlertaNav("✅ De volta à rota salva.", "info");
  };

  /* ---------- Baixar / atualizar / apagar ---------- */
  var baixando = null;
  function tipoConexao() { var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection; return c && c.type ? c.type : ""; }
  function lerInfo() {
    return fetchOrig(PASTA + "info.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("O mapa não está disponível agora (erro " + r.status + ").");
      return r.json();
    });
  }
  function baixarParte(url, aoLer) {
    return fetchOrig(url, { cache: "no-store", signal: baixando.ctl ? baixando.ctl.signal : undefined }).then(function (r) {
      if (!r.ok) throw new Error("Falhou ao baixar (erro " + r.status + "). Tente de novo.");
      if (!r.body || !r.body.getReader) return r.blob().then(function (b) { aoLer(b.size); return b; });
      var rd = r.body.getReader(), pedacos = [];
      return (function ler() {
        return rd.read().then(function (x) {
          if (x.done) return new Blob(pedacos);
          pedacos.push(x.value); aoLer(x.value.length);
          return ler();
        });
      })();
    });
  }
  function mostrarProgresso(frac, texto) {
    var b = el("offBarra"), t = el("offProgTxt");
    if (b) b.style.width = Math.round(Math.max(0, Math.min(1, frac)) * 100) + "%";
    if (t) t.textContent = texto;
  }
  function baixar(forcar4g) {
    if (!X.exigir("mapaOffline")) return;
    if (baixando) return;
    if (nav.ativo && !X.parado()) { RL.avisoRapido("🚚 Pare o caminhão para baixar o mapa."); return; }
    if (semRede()) { telaMapa("Sem internet agora. Conecte no Wi-Fi e tente de novo."); return; }
    if (tipoConexao() === "cellular" && !forcar4g) { telaMapa(null, "4g"); return; }
    baixando = { ctl: window.AbortController ? new AbortController() : null, cancelado: false };
    telaMapa(null, "baixando");
    var info, recebido = 0;
    lerInfo().then(function (i) {
      info = i;
      if (salvo() && meta.versao === info.versao) { var mesmo = new Error("mesmo"); mesmo.mesmo = true; throw mesmo; }
      if (navigator.storage && navigator.storage.estimate) {
        return navigator.storage.estimate().then(function (e) {
          if (e && e.quota && e.usage !== undefined && e.quota - e.usage < info.tamanho * 1.3) throw new Error("Pouco espaço livre no celular. Libere uns " + mb(info.tamanho * 1.5) + " e tente de novo.");
        }, function () {});
      }
    }).then(function () {
      var partes = [];
      return info.partes.reduce(function (p, nome) {
        return p.then(function () {
          if (baixando.cancelado) throw new Error("cancelado");
          return baixarParte(PASTA + nome + "?v=" + encodeURIComponent(info.versao), function (n) {
            recebido += n;
            mostrarProgresso(recebido / info.tamanho * 0.9, "Baixando o mapa: " + mb(recebido) + " de " + mb(info.tamanho));
          }).then(function (b) { partes.push(b); });
        });
      }, Promise.resolve()).then(function () { return new Blob(partes, { type: "application/octet-stream" }); });
    }).then(function (blob) {
      if (blob.size !== info.tamanho) throw new Error("O arquivo chegou incompleto. Tente de novo.");
      return blob.slice(0, 7).text().then(function (m) {
        if (m !== "PMTiles") throw new Error("O arquivo do mapa veio com defeito. Tente de novo.");
        mostrarProgresso(0.92, "Guardando no celular…");
        return caches.open(CACHE_MAPA).then(function (c) { return c.put(ARQ, new Response(blob, { headers: { "Content-Type": "application/octet-stream" } })); });
      });
    }).then(function () {
      meta = { versao: info.versao, tamanho: info.tamanho, zoomMax: info.zoomMax || 14, em: Date.now(), postosEm: meta && meta.postosEm || 0 };
      X.G(CHAVE_META, meta);
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
      carregarLib().catch(function () {});
      baixando = null;
      atualizarMenu(); atualizarCamada();
      telaMapa("✅ Pronto! O mapa de SP está salvo no celular.");
      guardarPostos();
    }).catch(function (e) {
      var cancelou = baixando && baixando.cancelado;
      baixando = null;
      if (e && e.mesmo) { telaMapa("✅ Seu mapa já é o mais novo (" + dataTxt(meta.versao) + "). Atualizando os postos…"); guardarPostos(); return; }
      telaMapa(cancelou ? "Download cancelado." : "❌ " + (e && e.name === "TypeError" ? "A internet caiu durante o download. Tente de novo no Wi-Fi." : (e && e.message) || "Não deu para baixar agora."));
    });
  }
  // Postos e paradas da Grande SP (depois do mapa; se falhar, o mapa continua salvo)
  var postosAndando = null;
  function textoPostos() {
    if (postosAndando) return "⛽ Guardando postos e paradas de SP…" + (postosAndando.f ? " (" + postosAndando.f + " de " + postosAndando.tot + ")" : "");
    if (meta && meta.postosEm) return "⛽ " + (meta.postos || 0) + " postos e paradas de SP guardados (" + X.dataBR(meta.postosEm) + ")." +
      (meta.postosFaltou ? " Uma parte da região não veio; toque em \"Atualizar mapa\" mais tarde." : "");
    if (meta && meta.postosFalhou) return "⛽ Os postos não vieram agora. Toque em \"Atualizar mapa\" mais tarde.";
    return "";
  }
  function mostrarPostos() { var p = el("offPostos"); if (p) p.textContent = textoPostos(); }
  function guardarPostos() {
    if (postosAndando || !RL.guardarPostosRegiao) return;
    postosAndando = { f: 0, tot: 1 }; mostrarPostos();
    RL.guardarPostosRegiao(BBOX_SP.s, BBOX_SP.w, BBOX_SP.n, BBOX_SP.e, function (f, tot) { postosAndando = { f: f, tot: tot }; mostrarPostos(); })
      .then(function (r) { if (meta) { meta.postosEm = Date.now(); meta.postos = r.postos; meta.postosFalhou = false; meta.postosFaltou = r.falhas > 0; X.G(CHAVE_META, meta); } },
        function () { if (meta) { meta.postosFalhou = true; X.G(CHAVE_META, meta); } })
      .then(function () { postosAndando = null; mostrarPostos(); });
  }
  function cancelar() { if (!baixando) return; baixando.cancelado = true; if (baixando.ctl) try { baixando.ctl.abort(); } catch (e) {} }
  function apagar() {
    desligarCamada();
    return caches.delete(CACHE_MAPA).then(function () {
      meta = null; X.G(CHAVE_META, null);
      atualizarMenu(); telaMapa("Mapa apagado do celular.");
    });
  }
  function dataTxt(v) { return /^\d{8}$/.test(v || "") ? v.slice(6, 8) + "/" + v.slice(4, 6) + "/" + v.slice(0, 4) : (v || ""); }

  /* ---------- Tela "Mapa sem internet" ---------- */
  function telaMapa(msg, modo) {
    var h = "";
    if (msg) h += '<p class="x-aviso ' + (/^❌/.test(msg) ? "vermelho" : /^✅/.test(msg) ? "verde" : "amarelo") + '">' + esc(msg) + '</p>';
    if (modo === "baixando") {
      h += '<p class="off-txt"><b>Baixando o mapa de São Paulo…</b> Pode usar o app enquanto isso, mas não feche esta tela.</p>' +
        '<div class="off-barra"><i id="offBarra"></i></div><p class="off-txt" id="offProgTxt">Começando…</p>' +
        '<button type="button" class="x-btn" id="offCancelar" style="width:100%">Cancelar</button>';
    } else if (modo === "4g") {
      h += '<p class="x-aviso amarelo">📱 Você está no 4G (dados móveis). O mapa tem cerca de 45 MB e pode gastar o seu pacote de internet.</p>' +
        '<p class="off-txt">O melhor é conectar no Wi-Fi e baixar lá.</p>' +
        '<button type="button" class="x-btn verde" id="offEsperar" style="width:100%;margin-bottom:8px">Vou esperar o Wi-Fi</button>' +
        '<button type="button" class="x-btn" id="offMesmoAssim" style="width:100%">Baixar mesmo assim no 4G</button>';
    } else if (modo === "apagar") {
      h += '<p class="off-txt">Apagar o mapa salvo? Sem ele, se o sinal cair o mapa pode ficar em branco (a rota continua).</p>' +
        '<button type="button" class="x-btn vermelho" id="offApagarSim" style="width:100%;margin-bottom:8px">Sim, apagar</button>' +
        '<button type="button" class="x-btn" id="offApagarNao" style="width:100%">Não</button>';
    } else if (salvo()) {
      h += '<p class="x-aviso verde">✅ Mapa de SP salvo neste celular (' + mb(meta.tamanho) + ', mapa de ' + esc(dataTxt(meta.versao)) + ').</p>' +
        '<p class="off-txt">Se o sinal cair, o app continua navegando com o mapa salvo. As áreas restritas e os horários também ficam no celular.</p>' +
        '<p class="off-txt" id="offPostos">' + esc(textoPostos()) + '</p>' +
        '<button type="button" class="x-btn verde" id="offAtualizar" style="width:100%;margin-bottom:8px">🔄 Atualizar mapa</button>' +
        '<button type="button" class="x-btn" id="offApagar" style="width:100%">🗑️ Apagar mapa</button>';
    } else {
      h += '<p class="off-txt">💡 ' + esc(DICA) + '</p>' +
        '<p class="off-txt">Guarda no celular: o mapa da cidade de São Paulo e da Grande SP, as áreas restritas, os horários de restrição, os postos e os pontos de parada. ' +
        'Ao iniciar uma viagem com internet, a rota inteira e as instruções também ficam guardadas.</p>' +
        '<button type="button" class="x-btn verde" id="offBaixar" style="width:100%">⬇️ Baixar mapa de São Paulo (~45 MB)</button>';
    }
    if (modo !== "baixando") h += '<p class="off-txt" style="font-size:13px;color:var(--suave);margin-top:10px">Sem internet não dá para calcular rota nova: se sair da rota, o app mostra o caminho de volta. A voz sem internet usa a voz em português instalada no celular.</p>';
    var t = X.janela("telaMapaOff", "🗺️ Mapa sem internet", h);
    function b(id, fn) { var x = el(id); if (x) x.onclick = fn; }
    b("offBaixar", function () { baixar(false); });
    b("offAtualizar", function () { baixar(false); });
    b("offMesmoAssim", function () { baixar(true); });
    b("offEsperar", function () { t.hidden = true; });
    b("offApagar", function () { telaMapa(null, "apagar"); });
    b("offApagarSim", function () { apagar(); });
    b("offApagarNao", function () { telaMapa(); });
    b("offCancelar", cancelar);
    var fechar = t.querySelector(".x-fechar");
    if (fechar) fechar.hidden = modo === "baixando";
    return t;
  }

  /* ---------- Menu ☰ e dica (uma vez, na primeira viagem) ---------- */
  var item = X.itemMenu("btnMapaOff", "🗺️", "Mapa sem internet", "", "btnTempos", function () { if (X.exigir("mapaOffline")) telaMapa(); });
  function atualizarMenu() {
    var sub = item.querySelector("small");
    if (sub) sub.textContent = salvo() ? "Mapa de SP salvo ✅ – navega mesmo sem sinal" : DICA;
  }
  atualizarMenu();
  var resultadoAntes = RL.ganchos.resultado;
  RL.ganchos.resultado = function (res) {
    if (resultadoAntes) try { resultadoAntes(res); } catch (e) {}
    if (salvo() || !liberado() || X.J(CHAVE_DICA, null) || el("caixaMapaOff")) return;
    var btn = el("btnNavegar");
    if (!btn || !btn.parentNode) return;
    var c = document.createElement("div");
    c.id = "caixaMapaOff"; c.className = "x-aviso amarelo"; c.style.fontWeight = "600";
    c.innerHTML = "💡 " + esc(DICA) + '<div class="x-linha" style="margin:8px 0 0"><button type="button" class="x-btn verde" id="dicaBaixar">Baixar agora</button><button type="button" class="x-btn" id="dicaNao">Agora não</button></div>';
    btn.parentNode.insertBefore(c, btn);
    X.G(CHAVE_DICA, Date.now());   // aparece uma vez só (depois fica no menu)
    el("dicaBaixar").onclick = function () { c.remove(); telaMapa(); baixar(false); };
    el("dicaNao").onclick = function () { c.remove(); };
  };

  window.RLOffline = { semRede: semRede, salvo: salvo, testarRede: testarRede, ligarCamada: ligarCamada, camada: function () { return camadaOff; },
    leitorPMTiles: leitorPMTiles, telaMapa: telaMapa, baixar: baixar, apagar: apagar, guardarViagem: guardarViagem,
    // só para teste no computador: RLOffline._simularSemRede(true/false); undefined volta ao normal
    _simularSemRede: function (v) { if (location.hostname === "localhost") { rede.simulado = v === undefined ? undefined : !!v; mudouRede(); } } };
})();
