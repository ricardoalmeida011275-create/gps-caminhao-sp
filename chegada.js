/* =====================================================================
   CHEGADA, RELATOS E CORREÇÕES DE ENDEREÇO (pedido de 28/11/2026)
   B – "Destino ou entrada no lugar errado": tela com texto livre; vai junto, sem digitar, o endereço buscado,
       onde o app achava que era o destino, onde o caminhão parou, data e hora. Vai para o painel ADM
       (aba "Relatos") e abre o WhatsApp com a mensagem pronta.
   C – "Ajustar ponto de chegada": mapa com o alfinete; o motorista arrasta até a entrada certa.
       Vale na hora para ele mesmo; para os outros, depois que o Ricardo aprovar no painel.
       Também nos favoritos.
   D – Chegar pela entrada certa (postos, empresas, lugares e endereços), nesta ordem:
       1) correção aprovada (ou a do próprio motorista); 2) entrada marcada no OpenStreetMap (entrance=*);
       3) a rua do endereço do lugar (addr:street) para escolher o lado da chegada; 4) a rua mais próxima
       (aí, ao chegar: "Confira a entrada ao chegar").
   (A parte A – "Chegou ao destino?" e o botão "Cheguei" – fica no index.html, junto da chegada automática.)
   ===================================================================== */
(function () {
  if (!window.RL || !window.RLExtras) return;
  var X = window.RLExtras, el = RL.el, nav = RL.nav, estado = RL.estado, esc = RL.escapar;
  var CHAVE_MINHAS = "rotaCaminhaoSP.minhasCorrecoes", CHAVE_APROVADAS = "rotaCaminhaoSP.correcoesAprovadas";
  var DIST_MESMO = { endereco: 1500, lugar: 300 };   // até quanto o ponto do endereço pode variar e ainda ser "o mesmo lugar"

  var css = document.createElement("style");
  css.textContent =
    ".aj-tela{position:fixed;inset:0;z-index:3600;background:var(--papel);display:flex;flex-direction:column}" +
    ".aj-tela[hidden]{display:none}" +
    ".aj-topo{padding:12px 14px 8px;box-shadow:0 2px 8px rgba(0,0,0,.15);z-index:2}" +
    ".aj-topo b{display:block;font-family:var(--f-titulo);font-size:21px}" +
    ".aj-topo small{display:block;font-size:15px;color:var(--suave);margin-top:2px}" +
    ".aj-mapa{flex:1;min-height:200px}" +
    ".aj-base{padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:8px;box-shadow:0 -2px 8px rgba(0,0,0,.15);z-index:2}" +
    ".aj-leg{font-size:14px;margin:0}.aj-leg i{display:inline-block;width:12px;height:12px;border-radius:50%;vertical-align:middle;margin-right:4px}" +
    ".aj-pino{width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#1f7a3d;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)}" +
    ".rel-dados{font-size:14px;margin:0 0 10px;padding-left:18px}.rel-dados li{margin:2px 0}" +
    ".ch-info{font-size:15px;font-weight:700;margin:8px 0 4px}";
  document.head.appendChild(css);

  function metros(a, b) { return X.distM({ lat: a.lat, lon: a.lon }, { lat: b.lat, lon: b.lon }); }
  function linkMapa(p) { return "https://maps.google.com/?q=" + p.lat.toFixed(6) + "," + p.lon.toFixed(6); }
  function agoraTxt(ms) { return X.dataBR(ms) + " " + X.horaBR(ms); }
  function nomeCurto(n) { return String(n || "").split(" – ")[0].replace(/\s*\(número aproximado\)\s*/i, "").trim(); }
  // Chave do endereço/lugar: o nome sem acento, sem pontuação e sem o bairro (ex.: "estrada pimentas 1000")
  function chaveEndereco(nome) {
    var n = RL.semAcento(nomeCurto(nome)).replace(/^perto de\s+/, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    if (!n || n === "ponto marcado no mapa" || n === "minha localizacao" || /^-?\d+ \d+ -?\d+ \d+$/.test(n)) return "";
    return n.slice(0, 160);
  }
  function ehLugar(t) { return t === "posto" || t === "lugar"; }

  /* ---------- 1) Correções: as minhas (na hora) e as aprovadas (painel) ---------- */
  function minhas() { return X.J(CHAVE_MINHAS, []) || []; }
  function aprovadas() { return X.J(CHAVE_APROVADAS, []) || []; }
  function acharCorrecao(B) {
    var orig = B.orig || B, k = chaveEndereco(B.nome), lim = ehLugar(B.tipo) ? DIST_MESMO.lugar : DIST_MESMO.endereco;
    function serve(c) {
      if (typeof c.lat !== "number") return false;
      var temAntigo = typeof c.antigoLat === "number" && typeof c.antigoLon === "number";
      var d = temAntigo ? metros(orig, { lat: c.antigoLat, lon: c.antigoLon }) : Infinity;
      if (k && c.chave === k) return d < lim || (!temAntigo && metros(orig, c) < lim);
      return d < 25 && (!k || !c.chave || c.chave.indexOf("ponto ") === 0);   // mesmo ponto, sem nome para comparar
    }
    var m = minhas().slice().reverse().filter(serve)[0];
    if (m) return { lat: m.lat, lon: m.lon, fonte: "minha" };
    var a = aprovadas().filter(serve)[0];
    return a ? { lat: a.lat, lon: a.lon, fonte: "correcao" } : null;
  }

  /* ---------- 2–4) Entrada do mapa, rua do endereço, rua mais próxima (OpenStreetMap, gratuito) ---------- */
  var RUAS = "motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|road|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link|service";
  // Pergunta aos 3 servidores Overpass ao mesmo tempo (consulta pequena) e fica com a primeira resposta
  var SERVIDORES = ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
  var LIMITE_MS = 15000, CHAVE_GUARDADAS = "rotaCaminhaoSP.entradasGuardadas", GUARDAR_DIAS = 30;
  function overpassJunto(q) {
    return new Promise(function (ok, erro) {
      var ctls = [], falhas = 0, acabou = false;
      SERVIDORES.forEach(function (u) {
        var ctl = window.AbortController ? new AbortController() : null; ctls.push(ctl);
        fetch(u, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: ctl ? ctl.signal : undefined })
          .then(function (r) { if (!r.ok) throw new Error("Overpass " + r.status); return r.json(); })
          .then(function (j) { if (acabou) return; acabou = true; ctls.forEach(function (c) { if (c) try { c.abort(); } catch (e) {} }); ok(j); },
                function (e) { if (++falhas === SERVIDORES.length && !acabou) { acabou = true; erro(e); } });
      });
      setTimeout(function () { if (!acabou) { acabou = true; ctls.forEach(function (c) { if (c) try { c.abort(); } catch (e) {} }); erro(new Error("demorou")); } }, LIMITE_MS);
    });
  }
  // Guarda no celular só o necessário (para o mesmo destino ficar instantâneo, até sem internet)
  var TAGS = ["name", "amenity", "shop", "office", "building", "addr:street", "entrance", "access", "highway", "railway", "route", "public_transport"];
  function compactar(j) {
    return { elements: ((j && j.elements) || []).map(function (e) {
      var t = {}; TAGS.forEach(function (k) { if (e.tags && e.tags[k]) t[k] = e.tags[k]; });
      var o = { type: e.type, tags: t };
      if (e.lat !== undefined) { o.lat = +e.lat.toFixed(6); o.lon = +e.lon.toFixed(6); }
      if (e.center) o.center = { lat: +e.center.lat.toFixed(6), lon: +e.center.lon.toFixed(6) };
      if (e.geometry) o.geometry = e.geometry.map(function (g) { return { lat: +g.lat.toFixed(6), lon: +g.lon.toFixed(6) }; });
      return o;
    }).filter(function (o) { return Object.keys(o.tags).length; }) };
  }
  var memoria = {};
  function consultaOSM(lat, lon) {
    var c = lat.toFixed(5) + "," + lon.toFixed(5);
    if (memoria[c]) return memoria[c];
    var guard = X.J(CHAVE_GUARDADAS, {}) || {};
    if (guard[c] && Date.now() - guard[c].em < GUARDAR_DIAS * 86400000) return (memoria[c] = Promise.resolve(guard[c].j));
    var q = "[out:json][timeout:12];(" +
      ["amenity", "shop", "office", "industrial", "craft", "addr:street"].map(function (k) { return "nwr(around:45," + c + ")[\"" + k + "\"];"; }).join("") +
      "nwr(around:45," + c + ")[\"building\"][\"name\"];)->.l;" +
      "way.l->.a;(node(w.a)[\"entrance\"];node(around:20," + c + ")[\"entrance\"];)->.e;" +
      "way(around:150," + c + ")[\"highway\"~\"^(" + RUAS + ")$\"]->.r;" +
      ".l out center;.e out;.r out geom;";
    memoria[c] = overpassJunto(q).then(function (j) {
      var cj = compactar(j), g = X.J(CHAVE_GUARDADAS, {}) || {};
      g[c] = { em: Date.now(), j: cj };
      var ks = Object.keys(g).sort(function (a, b) { return g[b].em - g[a].em; });
      ks.slice(30).forEach(function (k) { delete g[k]; });   // no máximo 30 lugares guardados
      X.G(CHAVE_GUARDADAS, g);
      return cj;
    });
    memoria[c].catch(function () { delete memoria[c]; });
    return memoria[c];
  }
  // Já começa a procurar a entrada quando o destino é escolhido (enquanto o GPS acha a saída)
  RL.ganchos.destinoEscolhido = function (B) {
    if (!B || ["posto", "lugar", "exato", "faixa", "aprox"].indexOf(B.tipo) < 0 || acharCorrecao(B)) return;
    if (RL.ganchos.semRede && RL.ganchos.semRede()) return;
    consultaOSM(B.lat, B.lon).catch(function () {});
  };
  // ponto mais perto de p numa linha (lista de {lat, lon}), em metros locais
  function pontoNaLinha(p, geom) {
    var kx = Math.cos(p.lat * Math.PI / 180) * 111320, ky = 110540, melhor = null;
    for (var i = 0; i < geom.length - 1; i++) {
      var ax = (geom[i].lon - p.lon) * kx, ay = (geom[i].lat - p.lat) * ky, bx = (geom[i + 1].lon - p.lon) * kx, by = (geom[i + 1].lat - p.lat) * ky;
      var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
      var x = ax + t * dx, y = ay + t * dy, d = Math.hypot(x, y);
      if (!melhor || d < melhor.d) melhor = { d: d, lat: p.lat + y / ky, lon: p.lon + x / kx };
    }
    return melhor;
  }
  function maisPerto(p, ruas) {
    var m = null;
    ruas.forEach(function (r) { var q = pontoNaLinha(p, r.geometry); if (q && (!m || q.d < m.d)) { m = q; m.nome = (r.tags && r.tags.name) || ""; m.servico = r.tags.highway === "service"; } });
    return m;
  }
  // Mesma rua, aceitando grafias diferentes do mapa (ex.: "Itaquera-Guaianases" x "Itaquera Guaianazes")
  function grafia(s) { return RL.semAcento(s).replace(/^(rua|r\.|avenida|av\.?|alameda|al\.|travessa|tv\.|estrada|estr\.|praca|pca\.?|largo|viela|rodovia|rod\.)\s+/, "").replace(/[^a-z0-9]/g, "").replace(/z/g, "s").replace(/y/g, "i").replace(/ph/g, "f").replace(/(.)\1+/g, "$1"); }
  function ruaIgual(a, b) {
    if (!a || !b) return false;
    if (RL.mesmaRua(a, b, true)) return true;
    var x = grafia(a), y = grafia(b);
    return x.length >= 4 && y.length >= 4 && (x === y || x.indexOf(y) >= 0 || y.indexOf(x) >= 0);
  }
  var PRIORIDADE_ENTRADA ={ main: 0, service: 1, yes: 2, entrance: 2, staircase: 5, home: 3 };
  function escolherChegada(B, j) {
    var P = B.orig || B, lista = (j && j.elements) || [];
    var entradas = [], ruas = [], lugares = [];
    lista.forEach(function (e) {
      var t = e.tags || {};
      if (t.highway) { if (e.type === "way" && e.geometry) ruas.push(e); }
      else if (e.type === "node" && t.entrance) entradas.push(e);
      else if (e.type !== "relation" && !t.railway && !t.route && !t.public_transport) lugares.push(e);
    });
    var ruasBoas = ruas.filter(function (r) { return r.tags.highway !== "service"; });
    // o próprio lugar: o mais perto com nome/amenity (posto: amenity=fuel primeiro)
    function pos(e) { return e.center ? { lat: e.center.lat, lon: e.center.lon } : { lat: e.lat, lon: e.lon }; }
    lugares = lugares.filter(function (e) { return pos(e).lat !== undefined; }).map(function (e) { return { e: e, d: metros(P, pos(e)) }; })
      .sort(function (a, b) {
        var fa = B.tipo === "posto" && a.e.tags.amenity === "fuel" ? 0 : 1, fb = B.tipo === "posto" && b.e.tags.amenity === "fuel" ? 0 : 1;
        return fa - fb || a.d - b.d;
      });
    var lugar = lugares.filter(function (x) { return x.e.tags.name || x.e.tags.amenity || x.e.tags.shop; })[0];
    var comRua = lugares.filter(function (x) { return x.e.tags["addr:street"]; })[0];
    var ruaEnd = (lugar && lugar.e.tags["addr:street"]) || (comRua && comRua.e.tags["addr:street"]) || B.rua || "";
    // 2) entrada marcada no mapa (não usa saída de emergência nem entrada particular)
    var boas = entradas.filter(function (e) {
      var t = e.tags; return ["emergency", "exit", "no"].indexOf(t.entrance) < 0 && ["private", "no"].indexOf(t.access) < 0 && metros(P, e) < 120;
    }).sort(function (a, b) {
      var pa = PRIORIDADE_ENTRADA[a.tags.entrance] !== undefined ? PRIORIDADE_ENTRADA[a.tags.entrance] : 2, pb = PRIORIDADE_ENTRADA[b.tags.entrance] !== undefined ? PRIORIDADE_ENTRADA[b.tags.entrance] : 2;
      // entrada que dá para a rua do endereço vem primeiro
      if (ruaEnd) {
        var ra = maisPerto(a, ruasBoas), rb = maisPerto(b, ruasBoas);
        var ma = ra && ra.d < 40 && ruaIgual(ra.nome, ruaEnd) ? 0 : 1, mb = rb && rb.d < 40 && ruaIgual(rb.nome, ruaEnd) ? 0 : 1;
        if (ma !== mb) return ma - mb;
      }
      return pa - pb || metros(P, a) - metros(P, b);
    });
    if (boas.length) {
      var ent = { lat: boas[0].lat, lon: boas[0].lon };
      // põe o ponto em cima da rua em frente à entrada (o serviço de rotas "gruda" o destino na rua mais próxima)
      var r = maisPerto(ent, ruasBoas);
      if (!r || r.d > 40) r = maisPerto(ent, ruas);
      var alvo = r && r.d <= 60 ? r : ent;
      return { lat: alvo.lat, lon: alvo.lon, fonte: "entrada", rua: (r && r.d <= 60 && r.nome) || ruaEnd };
    }
    // 3) a rua do endereço: chega pelo lado dessa rua
    if (ruaEnd) {
      var daRua = ruasBoas.filter(function (r) { return r.tags.name && ruaIgual(r.tags.name, ruaEnd); });
      var q = maisPerto(P, daRua);
      if (q && q.d <= 150) return { lat: q.lat, lon: q.lon, fonte: "rua", rua: q.nome };
    }
    // 4) só a rua mais próxima: o serviço de rotas decide; ao chegar, "Confira a entrada"
    return null;
  }

  RL.ganchos.ajustarChegada = function (B) {
    if (!B) return Promise.resolve();
    if (!B.orig) B.orig = { lat: B.lat, lon: B.lon };
    function usar(p, fonte, rua, conferir) {
      if (estado.B !== B) return;
      B.lat = p.lat; B.lon = p.lon;
      B.chegada = { fonte: fonte, rua: rua || "", conferir: !!conferir };
      RL.atualizarMarcadores();
    }
    if (B.tipo === "mapa") { B.chegada = { fonte: "mapa" }; return Promise.resolve(); }
    var c = acharCorrecao(B);
    if (c) { usar(c, c.fonte); return Promise.resolve(); }
    var consulta = ["posto", "lugar", "exato", "faixa", "aprox"].indexOf(B.tipo) >= 0;
    if (!consulta) { B.chegada = { fonte: "nenhuma", conferir: ehLugar(B.tipo) }; return Promise.resolve(); }
    var P = B.orig;
    return consultaOSM(P.lat, P.lon).then(function (j) {
      var r = escolherChegada(B, j);
      if (r) usar(r, r.fonte, r.rua);
      else usar(P, "proxima", "", ehLugar(B.tipo));
    }, function () {
      B.chegada = { fonte: "nenhuma", conferir: ehLugar(B.tipo) };
    });
  };

  /* ---------- Na tela da rota: de onde chega + "Ajustar ponto de chegada" ---------- */
  function textoChegada(ch) {
    if (!ch) return "";
    if (ch.fonte === "correcao") return "✅ Ponto de chegada corrigido por motoristas.";
    if (ch.fonte === "minha") return "✅ Chegada no ponto que você ajustou (aguardando aprovação para os outros).";
    if (ch.fonte === "entrada") return "🚪 Chega pela entrada marcada no mapa" + (ch.rua ? " (" + ch.rua + ")." : ".");
    if (ch.fonte === "rua") return "🛣️ Chega pela " + ch.rua + " (rua do endereço).";
    if (ch.conferir) return "⚠️ Entrada não conferida no mapa: confira a entrada ao chegar.";
    return "";
  }
  var resultadoAntes = RL.ganchos.resultado;
  RL.ganchos.resultado = function (res) {
    if (resultadoAntes) try { resultadoAntes(res); } catch (e) {}
    var velho = el("caixaChegada"); if (velho) velho.remove();
    var btn = el("btnNavegar");
    if (!btn || !btn.parentNode || !estado.B) return;
    var c = document.createElement("div");
    c.id = "caixaChegada";
    var t = textoChegada(estado.B.chegada);
    c.innerHTML = (t ? '<p class="ch-info"></p>' : "") + '<button type="button" class="x-btn" id="btnAjustarRes" style="width:100%;margin:4px 0 8px">📍 Ajustar ponto de chegada</button>';
    if (t) c.querySelector(".ch-info").textContent = t;
    btn.parentNode.insertBefore(c, btn);
    el("btnAjustarRes").onclick = function () { ajustarPonto({ origem: "resultado" }); };
  };

  /* ---------- Dados que vão junto nos relatos (sem o motorista digitar) ---------- */
  var ultimo = null;   // o destino da última viagem (fica guardado depois que ela termina)
  function retrato() {
    var B = estado.B; if (!B) return ultimo;
    var o = B.orig || B;
    return { nome: B.nome, endereco: nomeCurto(B.nome), tipo: B.tipo || "", orig: { lat: o.lat, lon: o.lon }, cheg: { lat: B.lat, lon: B.lon },
      parada: nav.paradaReal ? { lat: nav.paradaReal.lat, lon: nav.paradaReal.lon } : (nav.ativo && nav.ultimaPos ? { lat: nav.ultimaPos.lat, lon: nav.ultimaPos.lon } : null) };
  }
  X.ganchosFim.push(function () { ultimo = retrato(); });
  function dadosDestino() {
    var r = retrato(); if (!r) return null;
    var agora = Date.now(), linhas = ["Endereço buscado: " + (r.nome || "–"), "Onde o app achava que era o destino: " + linkMapa(r.orig)];
    if (metros(r.orig, r.cheg) > 15) linhas.push("Ponto de chegada usado na rota: " + linkMapa(r.cheg));
    if (r.parada) linhas.push("Onde o caminhão parou: " + linkMapa(r.parada) + " (a " + Math.round(metros(r.orig, r.parada)) + " m do ponto do app)");
    linhas.push("Data e hora: " + agoraTxt(agora));
    return { endereco: r.nome || "", destLat: r.orig.lat, destLon: r.orig.lon, chegLat: r.cheg.lat, chegLon: r.cheg.lon,
      paradaLat: r.parada ? r.parada.lat : null, paradaLon: r.parada ? r.parada.lon : null, texto: linhas.join("\n"), r: r };
  }
  RL.ganchos.dadosDestino = dadosDestino;
  RL.ganchos.enviarRelato = function (rel) {
    if (rel.comDestino) { var d = dadosDestino(); if (d) ["endereco", "destLat", "destLon", "chegLat", "chegLon", "paradaLat", "paradaLon"].forEach(function (k) { rel[k] = d[k]; }); }
    delete rel.comDestino;
    var C = X.conta();
    if (!C || !C.enviarRelato) return Promise.resolve(false);
    try { return Promise.resolve(C.enviarRelato(rel)).catch(function () { return false; }); } catch (e) { return Promise.resolve(false); }
  };

  /* ---------- B) "Destino ou entrada no lugar errado" ---------- */
  function relatarDestino(ctx) {
    ctx = ctx || {};
    if (nav.ativo && !X.parado()) { RL.mostrarAlertaNav("🚚 Pare o caminhão para relatar.", "info"); return; }
    var d = dadosDestino();
    if (!d) { RL.avisoRapido("Escolha um destino primeiro."); return; }
    var r = d.r;
    var html = '<p class="cad-dica" style="margin:0 0 6px">Vai junto, sem você digitar:</p><ul class="rel-dados">' +
      '<li><b>Endereço buscado:</b> ' + esc(r.nome || "–") + '</li>' +
      '<li><b>Onde o app achava que era:</b> <a href="' + linkMapa(r.orig) + '" target="_blank" rel="noopener">ver no mapa</a></li>' +
      (r.parada ? '<li><b>Onde você parou:</b> <a href="' + linkMapa(r.parada) + '" target="_blank" rel="noopener">ver no mapa</a> (a ' + Math.round(metros(r.orig, r.parada)) + ' m do ponto do app)</li>' : "") +
      '<li><b>Data e hora:</b> ' + esc(agoraTxt(Date.now())) + '</li></ul>' +
      '<label class="x-rot" for="relTexto">Conte o que aconteceu (opcional)</label>' +
      '<textarea class="x-campo" id="relTexto" maxlength="400" rows="3" placeholder="Ex.: a entrada do posto é pela Estrada Itaquera-Guaianazes, não pela rua de cima"></textarea>' +
      '<p class="x-aviso verde" id="relOk" hidden>✅ Relato enviado. Obrigado!</p>' +
      '<button type="button" class="x-btn verde" id="relEnviar" style="width:100%;margin-top:10px">📲 Enviar (abre o WhatsApp)</button>' +
      '<button type="button" class="x-btn" id="relAjustar" style="width:100%;margin-top:8px">📍 Ajustar ponto de chegada</button>';
    var t = X.janela("telaRelato", "📍 Destino ou entrada no lugar errado", html);
    el("relTexto").value = ctx.texto || "";
    el("relEnviar").onclick = function () {
      var texto = el("relTexto").value.replace(/\s+/g, " ").trim().slice(0, 400), dd = dadosDestino() || d;
      RL.ganchos.enviarRelato({ tipo: "destino", resposta: "Destino ou entrada no lugar errado", texto: texto, instrucao: "",
        endereco: dd.endereco, destLat: dd.destLat, destLon: dd.destLon, chegLat: dd.chegLat, chegLon: dd.chegLon, paradaLat: dd.paradaLat, paradaLon: dd.paradaLon,
        lat: typeof ctx.lat === "number" ? ctx.lat : dd.paradaLat, lon: typeof ctx.lon === "number" ? ctx.lon : dd.paradaLon, em: Date.now() });
      var msg = "Rota Liberada – relato do motorista: destino ou entrada no lugar errado\n" + dd.texto + (texto ? "\nO motorista contou: " + texto : "");
      X.zap(msg, RL.WHATSAPP_ERROS);
      el("relOk").hidden = false; el("relEnviar").textContent = "📲 Enviar de novo";
    };
    el("relAjustar").onclick = function () { t.hidden = true; ajustarPonto({ origem: ctx.origem || "fim" }); };
  }
  RL.ganchos.relatarDestino = relatarDestino;

  /* ---------- C) "Ajustar ponto de chegada" (mapa com alfinete) ---------- */
  var tela = null, mapaAj = null, pino = null;
  function montarTela() {
    if (tela) return;
    tela = document.createElement("div"); tela.id = "telaAjustar"; tela.className = "aj-tela"; tela.hidden = true;
    tela.setAttribute("role", "dialog"); tela.setAttribute("aria-modal", "true"); tela.setAttribute("aria-labelledby", "ajTitulo");
    tela.innerHTML = '<div class="aj-topo"><b id="ajTitulo">📍 Ajustar ponto de chegada</b><small id="ajSub">Arraste o alfinete verde até a entrada certa (portão, doca, entrada do posto). Também dá para tocar no mapa.</small></div>' +
      '<div class="aj-mapa" id="ajMapa"></div>' +
      '<div class="aj-base"><p class="aj-leg"><i style="background:#c62828"></i>onde o app achava &nbsp; <i style="background:#1565c0"></i>onde você parou &nbsp; <i style="background:#1f7a3d"></i>ponto novo</p>' +
      '<button type="button" class="x-btn verde" id="ajConfirmar">✅ Confirmar este ponto</button>' +
      '<button type="button" class="x-btn" id="ajCancelar">Cancelar</button></div>';
    document.body.appendChild(tela);
    el("ajCancelar").onclick = fecharAjuste;
  }
  function fecharAjuste() {
    if (tela) tela.hidden = true;
    if (mapaAj) { try { mapaAj.remove(); } catch (e) {} mapaAj = null; pino = null; }
  }
  function ajustarPonto(ctx) {
    ctx = ctx || {};
    if (nav.ativo && !X.parado()) { RL.mostrarAlertaNav("🚚 Pare o caminhão para ajustar o ponto.", "info"); return; }
    var fav = ctx.favorito || null, r = fav ? null : retrato();
    if (!fav && !r) { RL.avisoRapido("Escolha um destino primeiro."); return; }
    var antigo = fav ? { lat: fav.lat, lon: fav.lon } : r.orig;
    var inicio = fav ? antigo : (r.parada && metros(r.parada, r.cheg) < 2000 ? r.parada : r.cheg);
    montarTela();
    el("ajSub").textContent = (fav ? "Favorito \"" + fav.nome + "\". " : "") + "Arraste o alfinete verde até a entrada certa (portão, doca, entrada do posto). Também dá para tocar no mapa.";
    tela.hidden = false;
    if (mapaAj) { try { mapaAj.remove(); } catch (e) {} }
    mapaAj = L.map("ajMapa", { rotate: false, zoomControl: true, attributionControl: true }).setView([inicio.lat, inicio.lon], 18);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(mapaAj);
    L.circleMarker([antigo.lat, antigo.lon], { radius: 9, color: "#fff", weight: 3, fillColor: "#c62828", fillOpacity: 1 }).addTo(mapaAj).bindTooltip("Onde o app achava");
    if (r && r.parada) L.circleMarker([r.parada.lat, r.parada.lon], { radius: 8, color: "#fff", weight: 3, fillColor: "#1565c0", fillOpacity: 1 }).addTo(mapaAj).bindTooltip("Onde você parou");
    pino = L.marker([inicio.lat, inicio.lon], { draggable: true, autoPan: true, icon: L.divIcon({ className: "", html: '<div class="aj-pino"></div>', iconSize: [34, 34], iconAnchor: [17, 34] }) }).addTo(mapaAj);
    mapaAj.on("click", function (ev) { pino.setLatLng(ev.latlng); });
    setTimeout(function () { if (mapaAj) mapaAj.invalidateSize(); }, 60);
    el("ajConfirmar").onclick = function () {
      var ll = pino.getLatLng(), novo = { lat: +ll.lat.toFixed(6), lon: +ll.lng.toFixed(6) };
      if (metros(novo, antigo) < 3) { RL.avisoRapido("Arraste o alfinete até a entrada certa."); return; }
      var endereco = fav ? (fav.end || fav.nome) : r.nome, chave = chaveEndereco(endereco) || ("ponto " + antigo.lat.toFixed(4) + "," + antigo.lon.toFixed(4));
      var c = { chave: chave, endereco: nomeCurto(endereco).slice(0, 200), antigoLat: +antigo.lat.toFixed(6), antigoLon: +antigo.lon.toFixed(6), lat: novo.lat, lon: novo.lon, em: Date.now(), texto: "" };
      // vale para ele mesmo na hora
      var l = minhas().filter(function (x) { return !(x.chave === c.chave && metros({ lat: x.antigoLat, lon: x.antigoLon }, antigo) < 30); });
      l.push(c); X.G(CHAVE_MINHAS, l.slice(-100));
      // vai para o painel (pendente)
      var C = X.conta(), envio = Promise.resolve(false);
      if (C && C.sugerirCorrecao) { try { envio = Promise.resolve(C.sugerirCorrecao(c)).catch(function () { return false; }); } catch (e) {} }
      if (fav) {
        var lista = RL.lerFavoritos();
        lista.forEach(function (x) { if (x.id === fav.id) { x.lat = novo.lat; x.lon = novo.lon; x.ajustado = true; } });
        RL.gravarFavoritos(lista);
      } else if (estado.B) {
        if (!estado.B.orig) estado.B.orig = { lat: antigo.lat, lon: antigo.lon };
        estado.B.lat = novo.lat; estado.B.lon = novo.lon; estado.B.chegada = { fonte: "minha" };
        RL.atualizarMarcadores();
      }
      fecharAjuste();
      envio.then(function (ok) {
        RL.avisoRapido(ok ? "✅ Ponto ajustado. Vale para você agora; para os outros motoristas, depois de aprovado." : "✅ Ponto ajustado para você. A correção vai para aprovação quando tiver internet e conta.");
      });
      // na tela da rota (antes de viajar): traça de novo até o ponto novo
      if (ctx.origem === "resultado" && !nav.ativo && estado.A && estado.B) el("btnRota").click();
    };
  }
  RL.ganchos.ajustarPonto = ajustarPonto;

  // Favoritos: botão "📍 Ajustar ponto" em cada um
  var listaFav = el("listaFavoritos");
  function botoesFav() {
    if (!listaFav) return;
    var favs = RL.lerFavoritos();
    [].forEach.call(listaFav.querySelectorAll("li"), function (li, i) {
      var acoes = li.querySelector(".fav-acoes"), f = favs[i];
      if (!acoes || !f || acoes.querySelector("[data-acao=ajustar]")) return;
      var b = document.createElement("button"); b.type = "button"; b.className = "btn-pequeno"; b.setAttribute("data-acao", "ajustar"); b.textContent = "📍 Ajustar ponto";
      b.onclick = function () { ajustarPonto({ origem: "favorito", favorito: f }); };
      acoes.insertBefore(b, acoes.firstChild);
    });
  }
  if (listaFav) { new MutationObserver(botoesFav).observe(listaFav, { childList: true }); botoesFav(); }

  // (as correções aprovadas chegam do servidor pelo conta.js, depois do login, e ficam guardadas no celular)
  window.RLChegada = { chaveEndereco: chaveEndereco, acharCorrecao: acharCorrecao, escolherChegada: escolherChegada, consultaOSM: consultaOSM, dadosDestino: dadosDestino, ajustarPonto: ajustarPonto, relatarDestino: relatarDestino };
})();
