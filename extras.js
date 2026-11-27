/* =====================================================================
   Rota Liberada – funções novas (pedido de 27/11/2026)
   1) Compartilhar viagem ao vivo + botão de emergência 🆘
   2) Controle de jornada (Lei 13.103/2015)
   3) Controle de gastos e viagens
   4) Documentos e manutenção
   6) Pontos de parada com avaliações
   7) Calculadora de frete
   8) "Como é entregar aqui"
   Usa a "ponte" window.RL (index.html) e a conta (window.RotaConta, conta.js).
   Dados pessoais (jornada, gastos, documentos, contatos) ficam SÓ no celular do motorista.
   ===================================================================== */
(function () {
  var RL = window.RL; if (!RL) return;
  var el = RL.el, esc = RL.escapar, nav = RL.nav, estado = RL.estado;
  function J(k, padrao) { var v = RL.lerJsonLocal(k, padrao); return v === null || v === undefined ? padrao : v; }
  function G(k, v) { return RL.gravar(k, JSON.stringify(v)); }
  function exigir(k) { return !window.PLANOS || window.PLANOS.exigir(k); }
  function conta() { return window.RotaConta || null; }
  var LINK_APP = location.origin + location.pathname.replace(/[^\/]*$/, "");
  var DIA = 86400000;
  function dinheiro(v) { return "R$ " + (Math.round((+v || 0) * 100) / 100).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function numero(txt) { var s = String(txt || "").replace(/[^\d,.\-]/g, ""); if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", "."); else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ""); var n = parseFloat(s); return isNaN(n) ? 0 : n; }
  function inteiro(txt) { var n = parseInt(String(txt || "").replace(/\D/g, ""), 10); return isNaN(n) ? 0 : n; }
  function dataBR(ms) { var d = new Date(ms); return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear(); }
  function horaBR(ms) { var d = new Date(ms); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
  function hm(msDur) { var m = Math.round(msDur / 60000), h = Math.floor(m / 60); return h + "h" + String(m % 60).padStart(2, "0"); }
  function diaChave(ms) { var d = new Date(ms); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function zap(texto, numeroTel) { window.open("https://wa.me/" + (numeroTel || "") + "?text=" + encodeURIComponent(texto), "_blank"); }
  function telefone(t) { var n = String(t || "").replace(/\D/g, ""); if (n.length === 10 || n.length === 11) n = "55" + n; return /^55\d{10,11}$/.test(n) ? n : ""; }
  function parado() { return !nav.ativo || RL.giro.velocidade < 1; }

  /* ---------- Estilo das telas novas ---------- */
  var css = document.createElement("style");
  css.textContent =
    ".x-caixa{max-height:88vh;overflow:auto}" +
    ".x-linha{display:flex;gap:8px;align-items:center;margin:0 0 8px}.x-linha>*{flex:1}" +
    ".x-campo{width:100%;box-sizing:border-box;font:inherit;font-size:17px;padding:12px;border:1px solid var(--linha);border-radius:12px;background:var(--papel);color:var(--asfalto)}" +
    ".x-rot{display:block;font-weight:700;margin:10px 0 4px;font-size:15px}" +
    ".x-grade{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:6px 0 10px}" +
    ".x-grade3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:6px 0 10px}" +
    ".x-btn{font:inherit;font-weight:700;font-size:16px;min-height:52px;padding:10px;border-radius:12px;border:2px solid var(--linha);background:var(--papel);color:var(--asfalto);cursor:pointer}" +
    ".x-btn[aria-pressed=true]{background:var(--asfalto);color:var(--fundo);border-color:var(--asfalto)}" +
    ".x-btn.verde{background:#1f7a3d;color:#fff;border-color:#1f7a3d}.x-btn.vermelho{background:#c62828;color:#fff;border-color:#c62828}" +
    ".x-lista{list-style:none;margin:0 0 10px;padding:0}.x-lista li{padding:10px 4px;border-bottom:1px solid var(--linha);font-size:15px;line-height:1.4}" +
    ".x-num{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin:0 0 10px}" +
    ".x-num div{background:var(--papel);border:1px solid var(--linha);border-radius:12px;padding:8px}.x-num strong{display:block;font-size:20px}.x-num span{font-size:13px;color:var(--suave)}" +
    ".x-selo{display:inline-block;font-size:13px;font-weight:800;padding:2px 9px;border-radius:999px;color:#fff}" +
    ".x-selo.verde{background:#1f7a3d}.x-selo.amarelo{background:#e0a800;color:#1d2226}.x-selo.vermelho{background:#c62828}" +
    ".x-aviso{padding:10px 12px;border-radius:10px;font-weight:700;margin:0 0 10px}" +
    ".x-aviso.verde{background:#e8f5e9;color:#1b5e20}.x-aviso.amarelo{background:#fff8e1;color:#7a5600}.x-aviso.vermelho{background:#fdecea;color:#b71c1c}" +
    ".btn-sos{position:absolute;z-index:1001;left:max(12px,env(safe-area-inset-left,0px));bottom:calc(194px + env(safe-area-inset-bottom,0px));width:72px;height:72px;border-radius:50%;" +
    "border:3px solid #fff;background:#c62828;color:#fff;font-weight:900;font-size:18px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35);display:none;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}" +
    "body.navegando .btn-sos{display:block}.btn-sos small{display:block;font-size:10px;font-weight:700}" +
    ".btn-sos .enche{position:absolute;left:0;right:0;bottom:0;height:0;background:rgba(255,255,255,.45);transition:none}" +
    ".btn-sos.segurando .enche{height:100%;transition:height 2s linear}" +
    ".sos-grande{display:block;width:100%;box-sizing:border-box;text-align:center;text-decoration:none;margin:0 0 10px;padding:16px;border-radius:14px;font-weight:800;font-size:19px;border:0;cursor:pointer}" +
    ".sos-zap{background:#1f7a3d;color:#fff}.sos-190{background:#0d47a1;color:#fff}.sos-193{background:#c62828;color:#fff}";
  document.head.appendChild(css);

  /* ---------- Janela (mesmo visual das outras do app) ---------- */
  function janela(id, titulo, html) {
    var t = el(id);
    if (!t) {
      t = document.createElement("div"); t.id = id; t.className = "nav-opcoes"; t.setAttribute("role", "dialog"); t.setAttribute("aria-modal", "true");
      document.body.appendChild(t);
      t.addEventListener("click", function (ev) { if (ev.target === t) t.hidden = true; });
    }
    t.innerHTML = '<div class="nav-opcoes-caixa x-caixa"><p class="nav-opcoes-titulo"></p><div class="x-corpo">' + html + '</div>' +
      '<button type="button" class="btn-pequeno op-fechar x-fechar">Fechar</button></div>';
    t.querySelector(".nav-opcoes-titulo").textContent = titulo;
    t.querySelector(".x-fechar").onclick = function () { t.hidden = true; };
    t.hidden = false;
    return t;
  }
  /* ---------- Itens do menu ☰ ---------- */
  function itemMenu(id, icone, titulo, sub, antesDe, fn) {
    var b = document.createElement("button"); b.type = "button"; b.className = "menu-item"; b.id = id;
    b.innerHTML = '<span class="mi-icone" aria-hidden="true">' + icone + '</span><span class="mi-texto">' + esc(titulo) + '<small>' + esc(sub) + '</small></span>';
    var corpo = el("menuCorpo"), ref = antesDe && el(antesDe);
    if (ref && ref.parentNode === corpo) corpo.insertBefore(b, ref); else corpo.appendChild(b);
    b.addEventListener("click", function () { RL.fecharMenu(); fn(); });
    return b;
  }
  // Fim da navegação (como o resto do app: olha a classe "navegando" do body)
  var ganchosFim = [], ganchosInicio = [], estavaNavegando = false;
  new MutationObserver(function () {
    var agora = document.body.classList.contains("navegando");
    if (estavaNavegando && !agora) ganchosFim.forEach(function (f) { try { f(); } catch (e) {} });
    if (!estavaNavegando && agora) ganchosInicio.forEach(function (f) { try { f(); } catch (e) {} });
    estavaNavegando = agora;
  }).observe(document.body, { attributes: true, attributeFilter: ["class"] });

  /* =================================================================
     TAREFA 1a – COMPARTILHAR VIAGEM AO VIVO
     ================================================================= */
  var CHAVE_AOVIVO = "rotaCaminhaoSP.aoVivo", INTERVALO_AOVIVO = 30000, DURACAO_AOVIVO = 12 * 3600000;
  var aoVivo = J(CHAVE_AOVIVO, null);
  if (aoVivo && Date.now() - aoVivo.desde > DURACAO_AOVIVO) { aoVivo = null; G(CHAVE_AOVIVO, null); }
  function novoCodigo() {
    var L = "abcdefghjkmnpqrstuvwxyz23456789", a = new Uint8Array(20), s = "";
    try { crypto.getRandomValues(a); } catch (e) { for (var i = 0; i < 20; i++) a[i] = Math.floor(Math.random() * 256); }
    for (var j = 0; j < 20; j++) s += L[a[j] % L.length];
    return s;
  }
  function linkAoVivo(c) { return LINK_APP + "acompanhar.html?v=" + c; }
  function dadosAgora(emerg) {
    var p = RL.posicao() || {}, B = estado.B || {};
    return { lat: p.lat, lon: p.lon, destino: B.nome ? String(B.nome).split(" – ")[0] : "", destLat: B.lat, destLon: B.lon,
             chegada: nav.ativo ? (el("navChegada").textContent || "").replace(/^[–-]$/, "") : "", emergencia: !!emerg };
  }
  // Começa a compartilhar (o link é criado na hora; a gravação no servidor vem logo depois)
  function comecarAoVivo(emerg) {
    if (aoVivo) { if (emerg && !aoVivo.emergencia) { aoVivo.emergencia = true; G(CHAVE_AOVIVO, aoVivo); enviarAoVivo(true); } return linkAoVivo(aoVivo.codigo); }
    var p = RL.posicao();
    aoVivo = { codigo: novoCodigo(), desde: Date.now(), ultimo: 0, emergencia: !!emerg };
    G(CHAVE_AOVIVO, aoVivo);
    var d = dadosAgora(emerg);
    if (!p || !conta()) { aoVivo.pendente = true; }
    else conta().aoVivoIniciar(aoVivo.codigo, d).then(function () { if (aoVivo) { aoVivo.ultimo = Date.now(); aoVivo.criado = true; G(CHAVE_AOVIVO, aoVivo); } })
      .catch(function () { if (aoVivo) aoVivo.pendente = true; });
    atualizarBotaoAoVivo();
    return linkAoVivo(aoVivo.codigo);
  }
  function enviarAoVivo(forcar) {
    if (!aoVivo || !conta()) return;
    var p = RL.posicao(); if (!p) return;
    if (!forcar && Date.now() - aoVivo.ultimo < INTERVALO_AOVIVO) return;
    var d = dadosAgora(aoVivo.emergencia);
    aoVivo.ultimo = Date.now();
    var pr = aoVivo.criado ? conta().aoVivoAtualizar(aoVivo.codigo, d) : conta().aoVivoIniciar(aoVivo.codigo, d).then(function () { if (aoVivo) aoVivo.criado = true; });
    pr.then(function () { if (aoVivo) { aoVivo.pendente = false; G(CHAVE_AOVIVO, aoVivo); } }, function () { if (aoVivo) aoVivo.pendente = true; });
  }
  function pararAoVivo(motivo) {
    if (!aoVivo) return;
    var c = aoVivo.codigo, criado = aoVivo.criado;
    aoVivo = null; G(CHAVE_AOVIVO, null);
    if (criado && conta()) conta().aoVivoParar(c).catch(function () {});
    atualizarBotaoAoVivo();
    if (motivo && nav.ativo) RL.mostrarAlertaNav(motivo, "info");
  }
  setInterval(function () {
    if (!aoVivo) return;
    if (Date.now() - aoVivo.desde > DURACAO_AOVIVO) { pararAoVivo("Compartilhamento encerrado (12 horas)."); return; }
    if (nav.chegou) { pararAoVivo(); return; }
    if (nav.ativo) enviarAoVivo(false);
  }, 5000);
  ganchosFim.push(function () { pararAoVivo(); });
  // Botão na janela de opções da navegação (⚙️), ao lado do "Enviar minha chegada"
  var btnAoVivo = document.createElement("button");
  btnAoVivo.type = "button"; btnAoVivo.className = "btn-rota btn-chegada"; btnAoVivo.id = "btnAoVivo";
  var chegadaBtn = el("btnEnviarChegada");
  if (chegadaBtn) chegadaBtn.parentNode.insertBefore(btnAoVivo, chegadaBtn);
  function atualizarBotaoAoVivo() { btnAoVivo.textContent = aoVivo ? "⏹ Parar de compartilhar a viagem" : "📍 Compartilhar viagem ao vivo"; }
  atualizarBotaoAoVivo();
  btnAoVivo.addEventListener("click", function () {
    if (aoVivo) { pararAoVivo("Você parou de compartilhar a viagem."); return; }
    if (!exigir("compartilhar")) return;
    var link = comecarAoVivo(false);
    zap("Acompanhe minha viagem pelo Rota Liberada: " + link);
    RL.mostrarAlertaNav("📍 Compartilhando a viagem. Para parar: ⚙️ > Parar de compartilhar.", "info");
  });

  /* =================================================================
     TAREFA 1b – CONTATOS E BOTÃO DE EMERGÊNCIA 🆘 (sempre grátis)
     ================================================================= */
  var CHAVE_CONTATOS = "rotaCaminhaoSP.contatosEmergencia";
  function contatos() { return (J(CHAVE_CONTATOS, []) || []).filter(function (c) { return c && c.tel; }); }
  function telaContatos() {
    var l = J(CHAVE_CONTATOS, []) || [];
    var html = '<p class="cad-dica">Até 3 pessoas. O 1º é o contato principal do botão 🆘. Fica só neste celular.</p>';
    for (var i = 0; i < 3; i++) {
      var c = l[i] || {};
      html += '<p class="x-rot">' + (i === 0 ? "Contato principal" : "Contato " + (i + 1)) + '</p><div class="x-linha">' +
        '<input class="x-campo" id="ceNome' + i + '" placeholder="Nome" maxlength="40" value="' + esc(c.nome || "") + '">' +
        '<input class="x-campo" id="ceTel' + i + '" type="tel" inputmode="tel" placeholder="DDD + celular" value="' + esc(c.telMostra || "") + '"></div>';
    }
    html += '<p class="rl-erro" id="ceErro" style="color:#b71c1c;font-weight:700"></p><button type="button" class="btn-rota" id="ceSalvar">Salvar contatos</button>';
    janela("telaContatos", "🆘 Contatos de emergência", html);
    el("ceSalvar").onclick = function () {
      var novos = [], erro = "";
      for (var i = 0; i < 3; i++) {
        var nome = el("ceNome" + i).value.trim(), t = el("ceTel" + i).value.trim();
        if (!nome && !t) continue;
        var n = telefone(t);
        if (!n) { erro = "Confira o celular do contato " + (i + 1) + " (DDD + número)."; break; }
        novos.push({ nome: nome || "Contato " + (i + 1), tel: n, telMostra: t });
      }
      if (erro) { el("ceErro").textContent = erro; return; }
      G(CHAVE_CONTATOS, novos); el("telaContatos").hidden = true;
      RL.avisoRapido("✅ " + novos.length + (novos.length === 1 ? " contato salvo." : " contatos salvos."));
    };
  }
  // Botão 🆘 na navegação: precisa ficar apertado 2 segundos
  var sos = document.createElement("button");
  sos.type = "button"; sos.className = "btn-sos"; sos.id = "btnSOS"; sos.setAttribute("aria-label", "Emergência: segure 2 segundos");
  sos.innerHTML = '<span class="enche"></span><span style="position:relative">🆘<small>segure 2s</small></span>';
  var caixaMapa = document.querySelector(".mapa-caixa"); if (caixaMapa) caixaMapa.appendChild(sos);
  var sosTimer = null;
  function sosSolta() { clearTimeout(sosTimer); sosTimer = null; sos.classList.remove("segurando"); }
  sos.addEventListener("pointerdown", function (ev) {
    ev.preventDefault(); sos.classList.add("segurando");
    sosTimer = setTimeout(function () { sosSolta(); dispararEmergencia(); }, 2000);
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach(function (e) { sos.addEventListener(e, sosSolta); });
  sos.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
  sos.addEventListener("click", function () { if (!sosTimer) RL.mostrarAlertaNav("🆘 Para pedir ajuda, segure o botão por 2 segundos.", "info"); });
  function dispararEmergencia() {
    RL.vibrar([300, 100, 300]);
    var p = RL.posicao(), link = comecarAoVivo(true);
    var mapaLink = p ? "https://maps.google.com/?q=" + p.lat.toFixed(5) + "," + p.lon.toFixed(5) : "(sem sinal de GPS)";
    var msg = "🆘 EMERGÊNCIA – preciso de ajuda. Minha localização: " + mapaLink + "\nAcompanhe ao vivo: " + link;
    var cs = contatos();
    var html = '<p class="cp-bloco">Nada é enviado sozinho: toque no que quiser fazer.</p>' +
      (cs.length ? cs.map(function (c, i) { return '<button type="button" class="sos-grande sos-zap" data-i="' + i + '">📲 Pedir ajuda a ' + esc(c.nome) + ' (WhatsApp)</button>'; }).join("")
                 : '<button type="button" class="sos-grande sos-zap" data-i="-1">📲 Pedir ajuda pelo WhatsApp</button><p class="cad-dica">Cadastre contatos no ☰ > Contatos de emergência.</p>') +
      '<a class="sos-grande sos-190" href="tel:190">📞 Ligar 190 (Polícia)</a>' +
      '<a class="sos-grande sos-193" href="tel:193">🚒 Ligar 193 (Bombeiros)</a>' +
      '<p class="cad-dica">📍 Sua viagem está sendo compartilhada ao vivo (o link vai na mensagem). Para parar: ⚙️ > Parar de compartilhar.</p>';
    var t = janela("telaSOS", "🆘 Emergência", html);
    [].forEach.call(t.querySelectorAll("[data-i]"), function (b) {
      b.onclick = function () { var i = +b.getAttribute("data-i"); zap(msg, i >= 0 ? cs[i].tel : ""); };
    });
  }

  /* ---------- Menu ☰ ---------- */
  itemMenu("btnContatosEmerg", "🆘", "Contatos de emergência", "Quem recebe o pedido de ajuda", "btnTempos", telaContatos);

  /* =================================================================
     RELÓGIO COMUM (a cada 15 s durante a navegação): jornada e km rodados
     ================================================================= */
  var TICK = 15000, ganchosTick = [];
  function distM(a, b) {
    var R = 6371000, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  setInterval(function () { var agora = Date.now(); ganchosTick.forEach(function (f) { try { f(agora); } catch (e) { if (location.hostname === "localhost") console.error(e); } }); }, TICK);

  /* =================================================================
     TAREFA 2 – CONTROLE DE JORNADA (Lei 13.103/2015)
     Regras usadas (CTB art. 67-C e CLT art. 235-C). Números que podem mudar ficam aqui:
     ================================================================= */
  var REGRAS_JORNADA = {
    direcaoContinuaMin: 330,  // 5h30: máximo de direção sem a pausa (CTB 67-C)
    pausaMin: 30,             // 30 min de descanso a cada 6 h de direção (pode ser dividido)
    pausaContaMin: 5,         // paradas a partir de 5 min somam para a pausa (o app soma as frações até dar 30 min)
    avisoAntesMin: 15,        // aviso 15 min antes do limite
    descansoDiarioH: 11,      // 11 h de descanso a cada 24 h (pode ser 8 h seguidas + o resto no dia)
    direcaoDiaAvisoH: 10,     // aviso quando passa de 10 h de direção no dia (8 h de jornada + 2 h extras)
    velocidadeParadoKmh: 5    // abaixo disso conta como parado
  };
  var CHAVE_JORNADA = "rotaCaminhaoSP.jornada";
  var jor = J(CHAVE_JORNADA, null) || {};
  jor.dias = jor.dias || {}; jor.ultimo = jor.ultimo || 0; jor.continuoMs = jor.continuoMs || 0; jor.pausaAcumMs = jor.pausaAcumMs || 0;
  function diaJ(ms) { var k = diaChave(ms); return jor.dias[k] || (jor.dias[k] = { dir: 0, par: 0, pausas: [] }); }
  function limparDiasVelhos() { var lim = diaChave(Date.now() - 60 * DIA); Object.keys(jor.dias).forEach(function (k) { if (k < lim) delete jor.dias[k]; }); }
  function pausaAgoraMs(agora) { var p = jor.paradoDesde ? agora - jor.paradoDesde : 0; return p >= REGRAS_JORNADA.pausaContaMin * 60000 ? p : 0; }
  function pausaFeita(agora) { return jor.pausaAcumMs + pausaAgoraMs(agora) >= REGRAS_JORNADA.pausaMin * 60000; }
  function zerarContinuo() { jor.continuoMs = 0; jor.pausaAcumMs = 0; jor.avisou15 = false; jor.avisouLimite = false; }
  function fecharParada(agora) {
    if (!jor.paradoDesde) return;
    var p = agora - jor.paradoDesde;
    if (p >= REGRAS_JORNADA.pausaContaMin * 60000) { jor.pausaAcumMs += p; diaJ(jor.paradoDesde).pausas.push([jor.paradoDesde, agora]); }
    jor.paradoDesde = null;
    if (jor.pausaAcumMs >= REGRAS_JORNADA.pausaMin * 60000) zerarContinuo();
  }
  ganchosTick.push(function (agora) {
    if (!nav.ativo || !RL.posicao()) return;
    var dt = jor.ultimo ? agora - jor.ultimo : 0;
    if (dt < 0) { jor.ultimo = agora; jor.paradoDesde = null; return; }   // relógio do celular voltou: ignora
    if (!jor.ultimo || dt > 5 * 60000) {
      // o app ficou sem navegar (fechado ou parado fora da navegação): conta como pausa
      if (jor.ultimo && dt >= REGRAS_JORNADA.descansoDiarioH * 3600000) zerarContinuo();
      else if (jor.ultimo && dt >= REGRAS_JORNADA.pausaContaMin * 60000) {
        jor.pausaAcumMs += dt; diaJ(jor.ultimo).pausas.push([jor.ultimo, agora, 1]);
        if (jor.pausaAcumMs >= REGRAS_JORNADA.pausaMin * 60000) zerarContinuo();
      }
      jor.paradoDesde = null; jor.ultimo = agora; G(CHAVE_JORNADA, jor); return;
    }
    var d = diaJ(agora), andando = RL.giro.velocidade * 3.6 >= REGRAS_JORNADA.velocidadeParadoKmh;
    if (!d.ini) d.ini = agora; d.fim = agora;
    if (andando) {
      fecharParada(agora);
      d.dir += dt; jor.continuoMs += dt;
    } else {
      d.par += dt;
      if (!jor.paradoDesde) jor.paradoDesde = agora - dt;
    }
    jor.ultimo = agora;
    if (window.PLANOS && !window.PLANOS.liberado("jornada")) { G(CHAVE_JORNADA, jor); return; }
    var minC = jor.continuoMs / 60000, lim = REGRAS_JORNADA.direcaoContinuaMin;
    if (andando && minC >= lim - REGRAS_JORNADA.avisoAntesMin && !jor.avisou15 && minC < lim) { jor.avisou15 = true; avisarPausa15(); }
    if (andando && minC >= lim && !jor.avisouLimite) {
      jor.avisouLimite = true;
      var t = "Você chegou a 5 horas e meia de direção. Pare em local seguro para a pausa obrigatória de 30 minutos.";
      RL.mostrarAlertaNav("⏱️ " + t, "aviso"); RL.falar(t, "aviso"); RL.vibrar([200, 100, 200]);
    }
    if (andando && d.dir >= REGRAS_JORNADA.direcaoDiaAvisoH * 3600000 && !d.avisouDia) {
      d.avisouDia = true;
      var t2 = "Você já dirigiu " + REGRAS_JORNADA.direcaoDiaAvisoH + " horas hoje. Lembre do descanso de " + REGRAS_JORNADA.descansoDiarioH + " horas.";
      RL.mostrarAlertaNav("⏱️ " + t2, "aviso"); RL.falar(t2, "aviso");
    }
    limparDiasVelhos(); G(CHAVE_JORNADA, jor);
  });
  // Postos e pontos de parada perto (usa a mesma busca do botão "Posto" e os pontos aprovados da Tarefa 6)
  var fontesParada = [];
  function paradasPerto(lat, lon, raioKm) {
    var p1 = RL.postosNasCelulas(RL.celulasEmVolta(lat, lon, raioKm)).catch(function () { return []; });
    return Promise.all([p1].concat(fontesParada.map(function (f) { try { return Promise.resolve(f(lat, lon, raioKm)).catch(function () { return []; }); } catch (e) { return Promise.resolve([]); } })))
      .then(function (ls) {
        var o = { lat: lat, lon: lon }, todos = [].concat.apply([], ls);
        todos.forEach(function (p) { p.dist = distM(o, p); });
        return todos.filter(function (p) { return p.dist <= raioKm * 1000; })
          .sort(function (a, b) { return (a.dist + (a.t === "f" ? 1500 : 0)) - (b.dist + (b.t === "f" ? 1500 : 0)); });
      });
  }
  function avisarPausa15() {
    var p = RL.posicao(), base = "Pausa obrigatória em 15 minutos.";
    function fala(nomes) {
      var t = base + (nomes.length ? " Postos e pontos de parada perto: " + nomes.join(", ") + "." : " Procure um posto ou ponto de parada.");
      RL.mostrarAlertaNav("⏱️ " + t + (nomes.length ? " Toque em ⛽ Posto para ir." : ""), "aviso"); RL.falar(t, "aviso"); RL.vibrar([200, 100, 200]);
    }
    if (!p) return fala([]);
    var feito = false, seguro = setTimeout(function () { if (!feito) { feito = true; fala([]); } }, 12000);
    paradasPerto(p.lat, p.lon, 10).then(function (l) {
      if (feito) return; feito = true; clearTimeout(seguro);
      fala(l.slice(0, 3).map(function (x) { return x.nome + " (" + RL.km(x.dist) + ")"; }));
    }, function () { if (!feito) { feito = true; clearTimeout(seguro); fala([]); } });
  }
  function resumoJornada(agora) {
    var d = jor.dias[diaChave(agora)] || { dir: 0, par: 0, pausas: [] };
    var falta = Math.max(0, REGRAS_JORNADA.direcaoContinuaMin * 60000 - (pausaFeita(agora) ? 0 : jor.continuoMs));
    return { d: d, falta: falta, pausaFeita: pausaFeita(agora) };
  }
  function telaJornada() {
    if (!exigir("jornada")) return;
    var agora = Date.now(), r = resumoJornada(agora), d = r.d;
    var cont = r.pausaFeita ? 0 : jor.continuoMs, semPausa = cont >= REGRAS_JORNADA.direcaoContinuaMin * 60000;
    var html = '<div class="x-num"><div><strong>' + hm(d.dir) + '</strong><span>dirigindo hoje</span></div><div><strong>' + hm(d.par) + '</strong><span>parado hoje (no app)</span></div>' +
      '<div><strong>' + hm(cont) + '</strong><span>direção desde a última pausa</span></div></div>' +
      '<p class="x-aviso ' + (semPausa ? "vermelho" : r.falta <= REGRAS_JORNADA.avisoAntesMin * 60000 ? "amarelo" : "verde") + '">' +
      (semPausa ? "⛔ Passou de 5h30 de direção: faça a pausa de 30 min." : "Pausa obrigatória em " + hm(r.falta) + " de direção.") + '</p>' +
      '<p class="x-rot">Pausas de hoje</p><ul class="x-lista">' +
      (d.pausas.length ? d.pausas.map(function (p) { return '<li>' + horaBR(p[0]) + ' às ' + horaBR(p[1]) + ' · ' + hm(p[1] - p[0]) + (p[2] ? ' (app fechado)' : '') + '</li>'; }).join("") : '<li>Nenhuma pausa de 5 min ou mais.</li>') + '</ul>' +
      '<p class="x-rot">Últimos 30 dias</p><ul class="x-lista">';
    var dias = Object.keys(jor.dias).sort().reverse().filter(function (k) { return k >= diaChave(agora - 30 * DIA); });
    html += dias.length ? dias.map(function (k) { var x = jor.dias[k], p = k.split("-"); return '<li><b>' + p[2] + '/' + p[1] + '</b> · dirigindo ' + hm(x.dir) + ' · parado ' + hm(x.par) + ' · ' + x.pausas.length + ' pausa(s)</li>'; }).join("") : '<li>Ainda sem registros. A jornada é contada durante a navegação.</li>';
    html += '</ul><button type="button" class="btn-rota" id="jorZap">📲 Enviar pelo WhatsApp</button>' +
      '<p class="cad-dica">Regras usadas (Lei 13.103/2015): até 5h30 de direção seguida; 30 min de pausa a cada 6 h (pode dividir, contamos paradas de 5 min ou mais); ' +
      '11 h de descanso por dia. O app conta só enquanto está navegando. É uma ajuda: o registro oficial continua sendo o seu (tacógrafo/diário de bordo). Fica só neste celular.</p>';
    janela("telaJornada", "⏱️ Minha jornada", html);
    el("jorZap").onclick = function () {
      var linhas = ["⏱️ Minha jornada – Rota Liberada", "Hoje (" + dataBR(agora) + "): dirigindo " + hm(d.dir) + ", parado " + hm(d.par) + ", " + d.pausas.length + " pausa(s)."];
      d.pausas.forEach(function (p) { linhas.push("  Pausa " + horaBR(p[0]) + "–" + horaBR(p[1]) + " (" + hm(p[1] - p[0]) + ")"); });
      linhas.push("", "Últimos 30 dias:");
      dias.forEach(function (k) { var x = jor.dias[k], p = k.split("-"); linhas.push(p[2] + "/" + p[1] + ": dirigindo " + hm(x.dir) + ", parado " + hm(x.par)); });
      zap(linhas.join("\n"));
    };
  }
  itemMenu("btnJornada", "⏱️", "Minha jornada", "Direção, pausas e descanso (Lei 13.103)", "btnTempos", telaJornada);

  /* =================================================================
     KM RODADOS (GPS) – usado nas viagens (Tarefa 3) e na manutenção (Tarefa 4)
     ================================================================= */
  var CHAVE_ODO = "rotaCaminhaoSP.odometro";
  var odo = J(CHAVE_ODO, null) || { km: 0 };
  var odoUlt = null;
  ganchosTick.push(function () {
    if (!nav.ativo) { odoUlt = null; return; }
    var p = RL.posicao(); if (!p) return;
    if (odoUlt) {
      var m = distM(odoUlt, p);
      // ignora saltos do GPS (mais de 1,5 km em 15 s = 360 km/h) e o "tremido" parado
      if (m > 1500) { odoUlt = p; return; }
      if (m < 8) return;
      odo.km += m / 1000; if (viagemAtual) viagemAtual.km += m / 1000;
      G(CHAVE_ODO, odo); if (viagemAtual) G(CHAVE_VIAGEM_ATUAL, viagemAtual);
    }
    odoUlt = { lat: p.lat, lon: p.lon };
  });

  /* =================================================================
     TAREFA 3 – CONTROLE DE GASTOS E VIAGENS (fica só no celular)
     ================================================================= */
  var CHAVE_VIAGENS = "rotaCaminhaoSP.minhasViagensGastos", CHAVE_VIAGEM_ATUAL = "rotaCaminhaoSP.viagemAtual", CHAVE_LANC = "rotaCaminhaoSP.lancamentos";
  var CATS = [
    { id: "diesel", nome: "Diesel", ic: "⛽" }, { id: "pedagio", nome: "Pedágio", ic: "🛣️" }, { id: "comida", nome: "Comida", ic: "🍽️" },
    { id: "estacionamento", nome: "Estacionamento", ic: "🅿️" }, { id: "manutencao", nome: "Manutenção", ic: "🔧" }, { id: "outros", nome: "Outros", ic: "📦" }
  ];
  function nomeCat(id) { if (id === "recebi") return "Recebi"; var c = CATS.filter(function (x) { return x.id === id; })[0]; return c ? c.nome : "Outros"; }
  function icCat(id) { if (id === "recebi") return "💰"; var c = CATS.filter(function (x) { return x.id === id; })[0]; return c ? c.ic : "📦"; }
  var viagemAtual = J(CHAVE_VIAGEM_ATUAL, null);
  function viagens() { return J(CHAVE_VIAGENS, []) || []; }
  function lancamentos() { return J(CHAVE_LANC, []) || []; }
  function nomeCurto(n) { return String(n || "").split(" – ")[0].split(",").slice(0, 2).join(",").slice(0, 60); }
  ganchosInicio.push(function () {
    var A = estado.A, B = estado.B || {}, p = RL.posicao();
    viagemAtual = { id: "v" + Date.now(), ini: Date.now(), origem: A && A.nome ? nomeCurto(A.nome) : "Minha localização",
      destino: nomeCurto(B.nome) || "Destino", destLat: B.lat, destLon: B.lon, oLat: p ? p.lat : null, oLon: p ? p.lon : null, km: 0 };
    G(CHAVE_VIAGEM_ATUAL, viagemAtual);
  });
  ganchosFim.push(function () {
    var v = viagemAtual; viagemAtual = null; G(CHAVE_VIAGEM_ATUAL, null);
    if (!v) return;
    v.fim = Date.now(); v.chegou = !!nav.chegou; v.km = Math.round(v.km * 10) / 10;
    if (v.km < 0.3 && v.fim - v.ini < 3 * 60000) return;   // abriu e fechou sem viajar
    var l = viagens(); l.unshift(v); G(CHAVE_VIAGENS, l.slice(0, 500));
    if (!window.PLANOS || window.PLANOS.liberado("gastos")) quandoLivre(function () { telaFimViagem(v); });
  });
  // Espera as outras telas do fim da viagem fecharem (revisão de pontos, resumo da área restrita…)
  function quandoLivre(fn) {
    var t0 = Date.now();
    (function ver() {
      var aberta = [].some.call(document.querySelectorAll(".nav-opcoes, .tela-busca, .rl-tela"), function (x) { return !x.hidden && x.offsetParent !== null; });
      if (document.body.classList.contains("navegando") || Date.now() - t0 > 180000) return;
      if (aberta) setTimeout(ver, 1500); else setTimeout(fn, 600);
    })();
  }
  var ganchosFimViagem = [];   // a Tarefa 8 põe o botão "Como foi entregar aqui?"
  function telaFimViagem(v) {
    var html = '<p class="cp-bloco">' + esc(v.origem) + ' → ' + esc(v.destino) + '<br>' + String(v.km).replace(".", ",") + ' km · ' + hm(v.fim - v.ini) + '</p>' +
      '<p class="x-rot">Teve gasto nesta viagem?</p><div class="x-grade3">' +
      CATS.map(function (c) { return '<button type="button" class="x-btn" data-cat="' + c.id + '">' + c.ic + '<br>' + c.nome + '</button>'; }).join("") + '</div>' +
      '<button type="button" class="btn-rota" data-cat="recebi">💰 Quanto recebi por esta viagem</button><div id="fimExtras"></div>';
    var t = janela("telaFimViagem", "✅ Viagem salva", html);
    [].forEach.call(t.querySelectorAll("[data-cat]"), function (b) { b.onclick = function () { telaLancar(b.getAttribute("data-cat"), v.id, function () { telaFimViagem(v); }); }; });
    ganchosFimViagem.forEach(function (f) { try { f(v, el("fimExtras")); } catch (e) {} });
  }
  // Lançar gasto ou "quanto recebi" (valor + foto opcional)
  function telaLancar(cat, viagemId, depois, padrao) {
    padrao = padrao || {};
    var html = '<p class="x-rot">' + (cat === "recebi" ? "Quanto recebi (R$)" : "Valor (R$)") + '</p>' +
      '<input class="x-campo" id="lcValor" inputmode="decimal" placeholder="0,00" value="' + esc(padrao.valor ? String(padrao.valor).replace(".", ",") : "") + '">' +
      '<p class="x-rot">Observação (opcional)</p><input class="x-campo" id="lcObs" maxlength="80" value="' + esc(padrao.obs || "") + '">' +
      (cat === "recebi" ? "" : '<label class="x-btn" style="display:block;text-align:center;margin-top:10px">📷 Foto do comprovante (opcional)<input type="file" accept="image/*" capture="environment" id="lcFoto" hidden></label><p class="cad-dica" id="lcFotoOk"></p>') +
      '<p id="lcErro" style="color:#b71c1c;font-weight:700"></p><button type="button" class="btn-rota" id="lcSalvar">Salvar</button>';
    var t = janela("telaLancar", icCat(cat) + " " + nomeCat(cat), html), foto = null;
    if (el("lcFoto")) el("lcFoto").onchange = function () {
      var f = this.files && this.files[0]; if (!f) return;
      el("lcFotoOk").textContent = "Preparando a foto…";
      RL.reduzirFoto(f).then(function (b) { foto = b; el("lcFotoOk").textContent = "✅ Foto pronta."; }, function () { el("lcFotoOk").textContent = "Não consegui usar essa foto."; });
    };
    setTimeout(function () { el("lcValor").focus(); }, 50);
    el("lcSalvar").onclick = function () {
      var valor = numero(el("lcValor").value);
      if (!(valor > 0)) { el("lcErro").textContent = "Digite o valor."; return; }
      var item = { id: "l" + Date.now() + Math.floor(Math.random() * 1000), data: Date.now(), cat: cat, valor: Math.round(valor * 100) / 100, obs: el("lcObs").value.trim().slice(0, 80), viagem: viagemId || null };
      var salvar = function () { var l = lancamentos(); l.unshift(item); G(CHAVE_LANC, l.slice(0, 3000)); t.hidden = true; RL.avisoRapido("✅ " + nomeCat(cat) + ": " + dinheiro(item.valor) + " salvo."); if (depois) depois(); };
      if (foto) { item.foto = "gasto-" + item.id; RL.guardarFoto(item.foto, foto).then(salvar, function () { delete item.foto; salvar(); }); } else salvar();
    };
  }
  function addLancamento(cat, valor, obs) {
    var item = { id: "l" + Date.now() + Math.floor(Math.random() * 1000), data: Date.now(), cat: cat, valor: Math.round(valor * 100) / 100, obs: String(obs || "").slice(0, 80), viagem: null };
    var l = lancamentos(); l.unshift(item); G(CHAVE_LANC, l.slice(0, 3000)); return item;
  }
  // Relatório do mês
  var mesVisto = null;
  function chaveMes(ms) { var d = new Date(ms); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }
  var MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  function nomeMes(k) { var p = k.split("-"); return MESES[+p[1] - 1] + " de " + p[0]; }
  function dadosMes(k) {
    var ls = lancamentos().filter(function (x) { return chaveMes(x.data) === k; });
    var vs = viagens().filter(function (x) { return chaveMes(x.ini) === k; });
    var porCat = {}, gastos = 0, recebi = 0, km = 0;
    ls.forEach(function (x) { if (x.cat === "recebi") recebi += x.valor; else { gastos += x.valor; porCat[x.cat] = (porCat[x.cat] || 0) + x.valor; } });
    vs.forEach(function (v) { km += v.km || 0; });
    return { ls: ls, vs: vs, porCat: porCat, gastos: gastos, recebi: recebi, km: km, saldo: recebi - gastos };
  }
  function telaGastos() {
    if (!exigir("gastos")) return;
    if (!mesVisto) mesVisto = chaveMes(Date.now());
    var m = dadosMes(mesVisto);
    var html = '<div class="x-linha"><button type="button" class="x-btn" id="gMesAnt">◀</button><b style="text-align:center;flex:3">' + nomeMes(mesVisto) + '</b><button type="button" class="x-btn" id="gMesProx">▶</button></div>' +
      '<p class="x-rot">Lançar agora</p><div class="x-grade3">' +
      CATS.map(function (c) { return '<button type="button" class="x-btn" data-cat="' + c.id + '">' + c.ic + '<br>' + c.nome + '</button>'; }).join("") + '</div>' +
      '<button type="button" class="btn-rota" data-cat="recebi">💰 Quanto recebi</button>' +
      '<div class="x-num" style="margin-top:12px"><div><strong>' + dinheiro(m.recebi) + '</strong><span>recebi</span></div><div><strong>' + dinheiro(m.gastos) + '</strong><span>gastos</span></div>' +
      '<div><strong style="color:' + (m.saldo >= 0 ? "#2f9e55" : "#e53935") + '">' + dinheiro(m.saldo) + '</strong><span>sobrou</span></div>' +
      '<div><strong>' + Math.round(m.km) + ' km</strong><span>' + m.vs.length + ' viagem(ns)' + (m.km >= 1 ? ' · ' + dinheiro(m.gastos / m.km) + '/km' : '') + '</span></div></div>' +
      (Object.keys(m.porCat).length ? '<ul class="x-lista">' + CATS.filter(function (c) { return m.porCat[c.id]; }).map(function (c) { return '<li>' + c.ic + ' ' + c.nome + ': <b>' + dinheiro(m.porCat[c.id]) + '</b></li>'; }).join("") + '</ul>' : '') +
      '<div class="x-grade"><button type="button" class="x-btn" id="gCsv">⬇️ Baixar planilha</button><button type="button" class="x-btn verde" id="gZap">📲 Enviar pelo WhatsApp</button></div>' +
      '<p class="x-rot">Lançamentos do mês</p><ul class="x-lista">' +
      (m.ls.length ? m.ls.map(function (x) {
        return '<li>' + dataBR(x.data).slice(0, 5) + ' ' + icCat(x.cat) + ' ' + nomeCat(x.cat) + ': <b>' + dinheiro(x.valor) + '</b>' + (x.obs ? ' · ' + esc(x.obs) : '') +
          (x.foto ? ' <button type="button" class="btn-pequeno" data-foto="' + esc(x.foto) + '">📷 ver</button>' : '') +
          ' <button type="button" class="btn-pequeno" data-apaga="' + esc(x.id) + '" aria-label="Apagar">🗑️</button></li>';
      }).join("") : '<li>Nenhum lançamento neste mês.</li>') + '</ul>' +
      '<p class="x-rot">Viagens do mês</p><ul class="x-lista">' +
      (m.vs.length ? m.vs.map(function (v) { return '<li>' + dataBR(v.ini).slice(0, 5) + ' ' + horaBR(v.ini) + ' · ' + esc(v.origem) + ' → ' + esc(v.destino) + ' · ' + String(v.km).replace(".", ",") + ' km · ' + hm((v.fim || v.ini) - v.ini) + '</li>'; }).join("") : '<li>Nenhuma viagem neste mês. As viagens são salvas sozinhas ao navegar.</li>') +
      '</ul><p class="cad-dica">Tudo fica só neste celular.</p>';
    var t = janela("telaGastos", "💵 Meus gastos e viagens", html);
    function mudaMes(d) { var p = mesVisto.split("-"), dt = new Date(+p[0], +p[1] - 1 + d, 1); mesVisto = chaveMes(dt.getTime()); telaGastos(); }
    el("gMesAnt").onclick = function () { mudaMes(-1); }; el("gMesProx").onclick = function () { mudaMes(1); };
    [].forEach.call(t.querySelectorAll("[data-cat]"), function (b) { b.onclick = function () { telaLancar(b.getAttribute("data-cat"), null, telaGastos); }; });
    [].forEach.call(t.querySelectorAll("[data-apaga]"), function (b) {
      b.onclick = function () {
        if (!confirm("Apagar este lançamento?")) return;
        var id = b.getAttribute("data-apaga"), l = lancamentos(), x = l.filter(function (y) { return y.id === id; })[0];
        if (x && x.foto) RL.apagarFoto(x.foto);
        G(CHAVE_LANC, l.filter(function (y) { return y.id !== id; })); telaGastos();
      };
    });
    [].forEach.call(t.querySelectorAll("[data-foto]"), function (b) {
      b.onclick = function () { RL.lerFoto(b.getAttribute("data-foto")).then(function (blob) { if (blob) window.open(URL.createObjectURL(blob), "_blank"); else RL.avisoRapido("Foto não encontrada."); }); };
    });
    el("gCsv").onclick = function () { baixarPlanilha(mesVisto); };
    el("gZap").onclick = function () { zap(textoMes(mesVisto)); };
  }
  function textoMes(k) {
    var m = dadosMes(k), l = ["💵 Meus gastos – " + nomeMes(k) + " (Rota Liberada)", "Recebi: " + dinheiro(m.recebi), "Gastos: " + dinheiro(m.gastos)];
    CATS.forEach(function (c) { if (m.porCat[c.id]) l.push("  " + c.ic + " " + c.nome + ": " + dinheiro(m.porCat[c.id])); });
    l.push("Sobrou: " + dinheiro(m.saldo), "Viagens: " + m.vs.length + " · " + Math.round(m.km) + " km" + (m.km >= 1 ? " · custo " + dinheiro(m.gastos / m.km) + "/km" : ""));
    return l.join("\n");
  }
  function baixarPlanilha(k) {
    var m = dadosMes(k), q = function (s) { return '"' + String(s == null ? "" : s).replace(/"/g, '""') + '"'; }, n = function (v) { return (Math.round(v * 100) / 100).toFixed(2).replace(".", ","); };
    var linhas = [["Data", "Hora", "Tipo", "Valor (R$)", "Observação", "Viagem"].map(q).join(";")];
    var vmap = {}; m.vs.concat(viagens()).forEach(function (v) { vmap[v.id] = v; });
    m.ls.slice().reverse().forEach(function (x) {
      var v = x.viagem && vmap[x.viagem];
      linhas.push([dataBR(x.data), horaBR(x.data), nomeCat(x.cat), (x.cat === "recebi" ? "" : "-") + n(x.valor), x.obs, v ? v.origem + " -> " + v.destino : ""].map(q).join(";"));
    });
    linhas.push("", [q("Total recebido"), "", "", n(m.recebi)].join(";"), [q("Total de gastos"), "", "", n(m.gastos)].join(";"), [q("Sobrou"), "", "", n(m.saldo)].join(";"), "");
    linhas.push(["Data", "Saída", "Origem", "Destino", "Km", "Tempo"].map(q).join(";"));
    m.vs.slice().reverse().forEach(function (v) { linhas.push([dataBR(v.ini), horaBR(v.ini), v.origem, v.destino, String(v.km).replace(".", ","), hm((v.fim || v.ini) - v.ini)].map(q).join(";")); });
    var blob = new Blob(["﻿" + linhas.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "gastos-" + k + ".csv"; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  itemMenu("btnGastos", "💵", "Meus gastos e viagens", "Diesel, pedágio, quanto recebi, relatório do mês", "btnTempos", telaGastos);

  /* =================================================================
     TAREFA 4 – DOCUMENTOS E MANUTENÇÃO (fica só no celular)
     ================================================================= */
  var CHAVE_DOC = "rotaCaminhaoSP.documentos";
  var AVISO_DIAS = [30, 7, 1];
  var docs = J(CHAVE_DOC, null);
  if (!docs) {
    docs = { kmAjuste: 0, avisados: {}, docs: [
      { id: "cnh", nome: "CNH" }, { id: "toxico", nome: "Exame toxicológico" }, { id: "crlv", nome: "CRLV (licenciamento)" },
      { id: "rntrc", nome: "RNTRC / ANTT" }, { id: "taco", nome: "Tacógrafo (aferição)" }, { id: "seguro", nome: "Seguro" }],
      manut: [{ id: "oleo", nome: "Troca de óleo" }, { id: "filtros", nome: "Filtros" }, { id: "pneus", nome: "Pneus" }, { id: "revisao", nome: "Revisão" }] };
  }
  function gravarDocs() { G(CHAVE_DOC, docs); }
  function kmCaminhao() { return Math.round(odo.km + (docs.kmAjuste || 0)); }
  function diasAte(iso) { if (!iso) return null; var p = iso.split("-"), alvo = new Date(+p[0], +p[1] - 1, +p[2]).getTime(), hoje = new Date(); hoje.setHours(0, 0, 0, 0); return Math.round((alvo - hoje.getTime()) / DIA); }
  function dataIso(ms) { return diaChave(ms); }
  function isoBR(iso) { var p = (iso || "").split("-"); return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : ""; }
  function situacaoDoc(d) {
    var n = diasAte(d.venc);
    if (n === null) return { cor: "", txt: "Toque para pôr o vencimento", n: null };
    if (n < 0) return { cor: "vermelho", txt: "VENCIDO há " + (-n) + (n === -1 ? " dia" : " dias"), n: n };
    if (n === 0) return { cor: "vermelho", txt: "Vence HOJE", n: n };
    return { cor: n <= 7 ? "vermelho" : n <= 30 ? "amarelo" : "verde", txt: "Vence em " + n + (n === 1 ? " dia" : " dias") + " (" + isoBR(d.venc) + ")", n: n };
  }
  function situacaoManut(m) {
    var partes = [], cor = "verde", km = kmCaminhao(), temRegra = false;
    if (m.cadaKm && m.ultKm != null) {
      temRegra = true;
      var falta = m.ultKm + m.cadaKm - km, alerta = Math.max(500, m.cadaKm * 0.1);
      partes.push(falta <= 0 ? "passou " + Math.abs(falta).toLocaleString("pt-BR") + " km" : "em " + falta.toLocaleString("pt-BR") + " km");
      if (falta <= 0) cor = "vermelho"; else if (falta <= alerta && cor !== "vermelho") cor = "amarelo";
    }
    if (m.cadaMeses && m.ultData) {
      temRegra = true;
      var p = m.ultData.split("-"), alvo = new Date(+p[0], +p[1] - 1 + m.cadaMeses, +p[2]), n = diasAte(dataIso(alvo.getTime()));
      partes.push(n < 0 ? "venceu há " + (-n) + " dias" : "em " + n + " dias");
      if (n < 0) cor = "vermelho"; else if (n <= 15 && cor !== "vermelho") cor = "amarelo";
    }
    if (!temRegra) return { cor: "", txt: "Toque para configurar" };
    return { cor: cor, txt: m.nome + " " + partes.join(" ou ") };
  }
  function selo(cor) { return cor ? '<span class="x-selo ' + cor + '">' + (cor === "verde" ? "OK" : cor === "amarelo" ? "ATENÇÃO" : "URGENTE") + '</span> ' : ""; }
  function telaDocs() {
    if (!exigir("documentos")) return;
    var html = '<p class="x-rot">📄 Documentos</p><ul class="x-lista">' +
      docs.docs.map(function (d, i) { var s = situacaoDoc(d); return '<li><button type="button" class="x-btn" style="width:100%;text-align:left" data-doc="' + i + '"><b>' + esc(d.nome) + '</b><br>' + selo(s.cor) + '<small>' + s.txt + '</small></button></li>'; }).join("") +
      '</ul><button type="button" class="x-btn" id="dcNovoDoc" style="width:100%">➕ Outro documento</button>' +
      '<p class="x-rot" style="margin-top:16px">🔧 Manutenção</p><p class="cad-dica">Km do caminhão agora: <b>' + kmCaminhao().toLocaleString("pt-BR") + ' km</b> (somado pelo GPS) · ' +
      '<button type="button" class="btn-pequeno" id="dcAcertaKm">Acertar com o painel</button></p><ul class="x-lista">' +
      docs.manut.map(function (m, i) { var s = situacaoManut(m); return '<li><button type="button" class="x-btn" style="width:100%;text-align:left" data-man="' + i + '"><b>' + esc(m.nome) + '</b><br>' + selo(s.cor) + '<small>' + esc(s.txt) + '</small></button></li>'; }).join("") +
      '</ul><button type="button" class="x-btn" id="dcNovaMan" style="width:100%">➕ Outro item de manutenção</button>' +
      ('Notification' in window && Notification.permission === "default" ? '<button type="button" class="btn-rota" id="dcNotif" style="margin-top:12px">🔔 Avisar também por notificação</button>' : '') +
      '<p class="cad-dica">Avisos 30, 7 e 1 dia antes (ao abrir o app). Tudo fica só neste celular.</p>';
    var t = janela("telaDocs", "📋 Documentos e manutenção", html);
    [].forEach.call(t.querySelectorAll("[data-doc]"), function (b) { b.onclick = function () { editarDoc(+b.getAttribute("data-doc")); }; });
    [].forEach.call(t.querySelectorAll("[data-man]"), function (b) { b.onclick = function () { editarManut(+b.getAttribute("data-man")); }; });
    el("dcNovoDoc").onclick = function () { docs.docs.push({ id: "d" + Date.now(), nome: "", proprio: true }); editarDoc(docs.docs.length - 1, true); };
    el("dcNovaMan").onclick = function () { docs.manut.push({ id: "m" + Date.now(), nome: "", proprio: true }); editarManut(docs.manut.length - 1, true); };
    el("dcAcertaKm").onclick = acertarKm;
    if (el("dcNotif")) el("dcNotif").onclick = function () { Notification.requestPermission().then(function () { telaDocs(); }); };
  }
  function acertarKm() {
    janela("telaKm", "🔧 Km do caminhão", '<p class="cad-dica">Digite o km que aparece no painel do caminhão. Daqui para frente o app soma pelo GPS.</p>' +
      '<input class="x-campo" id="kmPainel" inputmode="numeric" value="' + kmCaminhao() + '"><button type="button" class="btn-rota" id="kmSalvar" style="margin-top:10px">Salvar</button>');
    el("kmSalvar").onclick = function () {
      var v = inteiro(el("kmPainel").value); if (!(v >= 0)) return;
      docs.kmAjuste = v - odo.km; gravarDocs(); el("telaKm").hidden = true; telaDocs();
    };
  }
  function editarDoc(i, novo) {
    var d = docs.docs[i];
    var html = (d.proprio ? '<p class="x-rot">Nome</p><input class="x-campo" id="edNome" maxlength="40" value="' + esc(d.nome) + '">' : '') +
      '<p class="x-rot">Vencimento</p><input class="x-campo" type="date" id="edVenc" value="' + esc(d.venc || "") + '">' +
      '<p id="edErro" style="color:#b71c1c;font-weight:700"></p><button type="button" class="btn-rota" id="edSalvar">Salvar</button>' +
      (d.proprio && !novo ? '<button type="button" class="btn-pequeno" id="edApagar">🗑️ Apagar este documento</button>' : '');
    var t = janela("telaEditaDoc", d.nome || "Novo documento", html);
    t.querySelector(".x-fechar").onclick = function () { if (novo) docs.docs.splice(i, 1); t.hidden = true; telaDocs(); };
    el("edSalvar").onclick = function () {
      if (d.proprio) { var n = el("edNome").value.trim(); if (!n) { el("edErro").textContent = "Dê um nome."; return; } d.nome = n.slice(0, 40); }
      d.venc = el("edVenc").value || ""; delete docs.avisados["doc:" + d.id]; gravarDocs(); t.hidden = true; telaDocs();
    };
    if (el("edApagar")) el("edApagar").onclick = function () { if (confirm("Apagar " + d.nome + "?")) { docs.docs.splice(i, 1); gravarDocs(); t.hidden = true; telaDocs(); } };
  }
  function editarManut(i, novo) {
    var m = docs.manut[i], km = kmCaminhao();
    var html = (m.proprio ? '<p class="x-rot">Nome</p><input class="x-campo" id="emNome" maxlength="40" value="' + esc(m.nome) + '">' : '') +
      '<div class="x-grade"><div><p class="x-rot">A cada (km)</p><input class="x-campo" id="emKm" inputmode="numeric" placeholder="ex.: 20000" value="' + (m.cadaKm || "") + '"></div>' +
      '<div><p class="x-rot">ou a cada (meses)</p><input class="x-campo" id="emMeses" inputmode="numeric" placeholder="ex.: 6" value="' + (m.cadaMeses || "") + '"></div></div>' +
      '<div class="x-grade"><div><p class="x-rot">Última vez (km)</p><input class="x-campo" id="emUltKm" inputmode="numeric" value="' + (m.ultKm != null ? m.ultKm : km) + '"></div>' +
      '<div><p class="x-rot">Última vez (data)</p><input class="x-campo" type="date" id="emUltData" value="' + esc(m.ultData || dataIso(Date.now())) + '"></div></div>' +
      '<p id="emErro" style="color:#b71c1c;font-weight:700"></p><button type="button" class="btn-rota" id="emSalvar">Salvar</button>' +
      (novo ? '' : '<button type="button" class="x-btn verde" id="emFeito" style="width:100%;margin-top:8px">✅ Fiz hoje (' + km.toLocaleString("pt-BR") + ' km)</button>') +
      (m.proprio && !novo ? '<button type="button" class="btn-pequeno" id="emApagar">🗑️ Apagar este item</button>' : '');
    var t = janela("telaEditaMan", m.nome || "Novo item", html);
    t.querySelector(".x-fechar").onclick = function () { if (novo) docs.manut.splice(i, 1); t.hidden = true; telaDocs(); };
    el("emSalvar").onclick = function () {
      if (m.proprio) { var n = el("emNome").value.trim(); if (!n) { el("emErro").textContent = "Dê um nome."; return; } m.nome = n.slice(0, 40); }
      m.cadaKm = inteiro(el("emKm").value) || 0; m.cadaMeses = inteiro(el("emMeses").value) || 0;
      if (!m.cadaKm && !m.cadaMeses) { el("emErro").textContent = "Preencha a cada quantos km ou meses."; return; }
      m.ultKm = inteiro(el("emUltKm").value); m.ultData = el("emUltData").value || dataIso(Date.now());
      delete docs.avisados["man:" + m.id]; gravarDocs(); t.hidden = true; telaDocs();
    };
    if (el("emFeito")) el("emFeito").onclick = function () { m.ultKm = kmCaminhao(); m.ultData = dataIso(Date.now()); delete docs.avisados["man:" + m.id]; gravarDocs(); t.hidden = true; telaDocs(); };
    if (el("emApagar")) el("emApagar").onclick = function () { if (confirm("Apagar " + m.nome + "?")) { docs.manut.splice(i, 1); gravarDocs(); t.hidden = true; telaDocs(); } };
  }
  // Avisos ao abrir o app (e por notificação, se o motorista deixou)
  function conferirVencimentos() {
    if (window.PLANOS && !window.PLANOS.liberado("documentos")) return;
    var msgs = [];
    docs.docs.forEach(function (d) {
      var s = situacaoDoc(d); if (s.n === null) return;
      // marco = 30, 7 ou 1 dia antes; 0 = vence hoje ou já venceu (este avisa 1 vez por dia)
      var marco = s.n <= 0 ? 0 : AVISO_DIAS.filter(function (x) { return s.n <= x; }).pop();
      if (marco === undefined) return;
      var ch = "doc:" + d.id, ja = docs.avisados[ch], hoje = diaChave(Date.now());
      var avisar = ja === undefined || marco < ja.m || (marco === 0 && ja.dia !== hoje);
      if (!avisar) return;
      docs.avisados[ch] = { m: marco, dia: hoje }; msgs.push("📄 " + d.nome + ": " + s.txt.toLowerCase());
    });
    docs.manut.forEach(function (m) {
      var s = situacaoManut(m); if (s.cor !== "amarelo" && s.cor !== "vermelho") return;
      var ch = "man:" + m.id, nivel = s.cor === "vermelho" ? 2 : 1;
      if ((docs.avisados[ch] || 0) >= nivel) return;
      docs.avisados[ch] = nivel; msgs.push("🔧 " + s.txt);
    });
    gravarDocs();
    if (!msgs.length) return;
    quandoLivreInicio(function () {
      var t = janela("telaVencimentos", "📋 Atenção aos vencimentos", '<ul class="x-lista">' + msgs.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + '</ul><button type="button" class="btn-rota" id="vcAbrir">Ver documentos e manutenção</button>');
      el("vcAbrir").onclick = function () { t.hidden = true; telaDocs(); };
    });
    if ("Notification" in window && Notification.permission === "granted" && navigator.serviceWorker) {
      navigator.serviceWorker.ready.then(function (r) { r.showNotification("Rota Liberada – vencimentos", { body: msgs.join("\n"), icon: "icones/icone-192.png", tag: "vencimentos" }); }).catch(function () {});
    }
  }
  // Na abertura: espera a tela de login/conta sair e não aparece durante a navegação
  function quandoLivreInicio(fn) {
    var t0 = Date.now();
    (function ver() {
      var ocupado = document.body.classList.contains("navegando") || [].some.call(document.querySelectorAll(".rl-tela, .nav-opcoes, .tela-busca"), function (x) { return !x.hidden && x.offsetParent !== null; });
      if (Date.now() - t0 > 600000) return;
      if (ocupado) setTimeout(ver, 3000); else fn();
    })();
  }
  setTimeout(conferirVencimentos, 4000);
  itemMenu("btnDocs", "📋", "Documentos e manutenção", "CNH, toxicológico, CRLV, óleo, pneus…", "btnTempos", telaDocs);

  /* =================================================================
     TAREFA 5 – ALERTAS DA CET (robô diário: alertas-cet.js) + alertas manuais do painel (alertasCet)
     ================================================================= */
  var alertasManuais = J("rotaCaminhaoSP.alertasManuais", []) || [];
  function todosAlertas(t) {
    t = t || Date.now();
    var rob = (window.ALERTAS_CET && window.ALERTAS_CET.alertas) || [];
    var removidos = (window.ALERTAS_CET_REMOVIDOS || []);
    return rob.filter(function (a) { return removidos.indexOf(a.id) < 0; }).concat(alertasManuais)
      .filter(function (a) { return a.fim > t && a.inicio - 30 * 60000 <= t; });
  }
  function carregarManuais() {
    var c = conta(); if (!c || !c.alertasManuais) return;
    c.alertasManuais().then(function (l) {
      // o painel também guarda aqui os alertas do robô que o Ricardo mandou remover
      window.ALERTAS_CET_REMOVIDOS = l.filter(function (x) { return x.remover; }).map(function (x) { return x.remover; });
      alertasManuais = l.filter(function (x) { return !x.remover && typeof x.lat === "number"; }).map(function (x) {
        return { id: "m-" + x.id, tipo: x.tipo || "interdicao", tipoNome: x.tipoNome || "Interdição", icone: x.icone || "🚧", titulo: x.titulo || "", onde: x.onde || "",
          inicio: x.inicio || 0, fim: x.fim, fonte: x.fonte || "CET", link: x.link || "", ponto: [x.lon, x.lat], raio: x.raio || 150, desviar: !!x.desviar, manual: true };
      });
      G("rotaCaminhaoSP.alertasManuais", alertasManuais); desenharAlertas();
    }).catch(function () {});
  }
  setTimeout(carregarManuais, 5000); setInterval(carregarManuais, 30 * 60000);
  function quandoTxt(a) {
    var i = new Date(a.inicio), f = new Date(a.fim), mesmoDia = diaChave(a.inicio) === diaChave(a.fim);
    return dataBR(a.inicio).slice(0, 5) + " " + horaBR(a.inicio) + " até " + (mesmoDia ? "" : dataBR(a.fim).slice(0, 5) + " ") + horaBR(a.fim);
  }
  function htmlAlerta(a) {
    return '<div class="popup-posto"><strong>' + esc(a.icone + " " + a.tipoNome) + '</strong><small style="display:block">' + esc(a.onde) + '</small>' +
      '<small style="display:block">' + esc(a.titulo) + '</small><small style="display:block">🕘 ' + quandoTxt(a) + '</small>' +
      '<small style="display:block">Fonte: ' + esc(a.fonte) + (a.link ? ' · <a href="' + esc(a.link) + '" target="_blank" rel="noopener">ver notícia</a>' : '') + '</small></div>';
  }
  var camadaAlertas = L.layerGroup().addTo(RL.mapa);
  function desenharAlertas() {
    camadaAlertas.clearLayers();
    if (window.PLANOS && !window.PLANOS.liberado("alertasCet")) return;
    todosAlertas(Date.now() + 12 * 3600000).forEach(function (a) {
      var pop = htmlAlerta(a);
      (a.linhas || []).forEach(function (l) {
        L.polyline(l.map(function (p) { return [p[1], p[0]]; }), { color: "#ef6c00", weight: 7, opacity: 0.85, dashArray: "8 6" }).bindPopup(pop).addTo(camadaAlertas);
      });
      var c = a.ponto || (a.linhas && a.linhas[0] && a.linhas[0][Math.floor(a.linhas[0].length / 2)]);
      if (c) L.marker([c[1], c[0]], { icon: L.divIcon({ className: "", html: '<div style="font-size:22px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))">' + a.icone + '</div>', iconSize: [26, 26], iconAnchor: [13, 13] }), keyboard: false, zIndexOffset: 250 })
        .bindPopup(pop).addTo(camadaAlertas);
    });
  }
  desenharAlertas(); setInterval(desenharAlertas, 10 * 60000);
  // distância (m) de um ponto [lon,lat] até a geometria do alerta
  function distAlerta(a, lon, lat) {
    var p = RL.xy(lon, lat), best = Infinity;
    function seg(q1, q2) {
      var a1 = RL.xy(q1[0], q1[1]), a2 = RL.xy(q2[0], q2[1]), dx = a2[0] - a1[0], dy = a2[1] - a1[1], L2 = dx * dx + dy * dy;
      var t = L2 ? Math.max(0, Math.min(1, ((p[0] - a1[0]) * dx + (p[1] - a1[1]) * dy) / L2)) : 0;
      return Math.hypot(p[0] - a1[0] - t * dx, p[1] - a1[1] - t * dy);
    }
    (a.linhas || []).forEach(function (l) { for (var i = 1; i < l.length; i++) best = Math.min(best, seg(l[i - 1], l[i])); if (l.length === 1) best = Math.min(best, seg(l[0], l[0])); });
    if (a.ponto) best = Math.min(best, Math.max(0, seg(a.ponto, a.ponto) - (a.raio || 0)));
    return best;
  }
  function poliAlerta(a) {
    try {
      if (a.linhas) return turf.buffer(turf.multiLineString(a.linhas), 0.03, { units: "kilometers" }).geometry;
      if (a.ponto && a.desviar) return turf.circle(a.ponto, Math.max(0.05, (a.raio || 150) / 1000), { steps: 16, units: "kilometers" }).geometry;
    } catch (e) {}
    return null;
  }
  function tempoDoMomento(m) {
    if (!m || estado.modo === "agora") return Date.now();
    var d = new Date(), alvo = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, m.minutos || 0);
    var dif = ((m.dia - d.getDay()) + 7) % 7; alvo.setDate(alvo.getDate() + dif);
    if (alvo.getTime() < Date.now() - 3600000) alvo.setDate(alvo.getDate() + 7);
    return alvo.getTime();
  }
  RL.ganchos.alertasNaRota = function (coords, m) {
    if (window.PLANOS && !window.PLANOS.liberado("alertasCet")) return [];
    var t = tempoDoMomento(m), lista = todosAlertas(t).filter(function (a) { return a.inicio - 30 * 60000 <= t; });
    if (!lista.length || !coords || coords.length < 2) return [];
    var pts = RL.amostrar(coords), out = [];
    lista.forEach(function (a) {
      var lim = a.linhas ? 25 : 150, cs = (a.linhas ? [].concat.apply([], a.linhas) : []).concat(a.ponto ? [a.ponto] : []), f = 0.004 + (a.raio || 0) / 100000;
      var bx = [Math.min.apply(null, cs.map(function (c) { return c[0]; })) - f, Math.max.apply(null, cs.map(function (c) { return c[0]; })) + f,
                Math.min.apply(null, cs.map(function (c) { return c[1]; })) - f, Math.max.apply(null, cs.map(function (c) { return c[1]; })) + f];
      var hit = pts.some(function (p) { return p.lon >= bx[0] && p.lon <= bx[1] && p.lat >= bx[2] && p.lat <= bx[3] && distAlerta(a, p.lon, p.lat) <= lim; });
      if (hit) out.push({ id: a.id, nome: a.tipoNome + " – " + a.onde, poli: a.desviar ? poliAlerta(a) : null, alerta: a });
    });
    return out;
  };
  // Na navegação: avisa ao chegar a 600 m de um alerta (1 vez por alerta) e fala o desvio na saída
  var alertasFalados = {};
  ganchosInicio.push(function () {
    alertasFalados = {};
    var r = estado.rota, a = r && r.alertasCet;
    if (a && a.desviou && a.desviou.length) {
      var t = "Desviando de interdição: " + a.desviou[0].replace(/^[^–]*– /, "") + ". Fonte: CET.";
      setTimeout(function () { RL.mostrarAlertaNav("🚧 " + t, "info"); RL.falar(t, "aviso"); }, 4000);
    }
  });
  ganchosTick.push(function () {
    if (!nav.ativo || (window.PLANOS && !window.PLANOS.liberado("alertasCet"))) return;
    var p = RL.posicao(); if (!p) return;
    todosAlertas().forEach(function (a) {
      if (alertasFalados[a.id] || distAlerta(a, p.lon, p.lat) > 600) return;
      alertasFalados[a.id] = true;
      var t = "Atenção: " + a.tipoNome.toLowerCase() + " perto, na " + a.onde.split(",")[0] + ". Fonte: CET.";
      RL.mostrarAlertaNav("🚧 " + t, "aviso"); RL.falar(t, "aviso");
    });
  });

  /* =================================================================
     TAREFA 6 – PONTOS DE PARADA: avaliações, sugestão de ponto novo, pontos aprovados
     (estacionamento de caminhão, parada/truck stop e área de descanso vêm do mapa aberto OSM, na busca de postos)
     ================================================================= */
  var paradasOk = J("rotaCaminhaoSP.paradasAprovadas", []) || [];
  function carregarParadas() {
    var c = conta(); if (!c || !c.paradasAprovadas) return;
    c.paradasAprovadas().then(function (l) {
      paradasOk = l.filter(function (x) { return typeof x.lat === "number"; }).map(function (x) { return { lat: x.lat, lon: x.lon, t: "s", nome: String(x.nome || "Ponto de parada").slice(0, 50), aprovado: true, pid: "a" + x.id }; });
      G("rotaCaminhaoSP.paradasAprovadas", paradasOk);
    }).catch(function () {});
  }
  setTimeout(carregarParadas, 6000);
  RL.ganchos.paradasAprovadas = function () { return (window.PLANOS && !window.PLANOS.liberado("paradas")) ? [] : paradasOk; };
  function pidDe(p) { return p.pid || ("p" + Math.round(p.lat * 1e4) + "_" + Math.round(p.lon * 1e4)); }
  var cacheAval = {};
  function resumoAval(l) {
    if (!l.length) return null;
    var soma = 0, cont = { banho: 0, comida: 0, seguranca: 0, pernoite: 0, banheiro: 0 }, gratis = 0, pago = 0;
    l.forEach(function (a) { soma += a.nota; Object.keys(cont).forEach(function (k) { if (a[k]) cont[k]++; }); if (a.preco === "gratis") gratis++; if (a.preco === "pago") pago++; });
    var tem = Object.keys(cont).filter(function (k) { return cont[k] * 2 >= l.length; });
    var nomes = { banho: "🚿 banho", comida: "🍽️ comida", seguranca: "🛡️ seguro", pernoite: "🛏️ pernoite", banheiro: "🚻 banheiro" };
    return { media: soma / l.length, n: l.length, itens: tem.map(function (k) { return nomes[k]; }).concat(gratis || pago ? [gratis >= pago ? "grátis" : "pago"] : []),
      comentarios: l.filter(function (a) { return a.comentario; }).sort(function (a, b) { return b.criadoEm - a.criadoEm; }).slice(0, 3).map(function (a) { return a.comentario; }) };
  }
  RL.ganchos.popupPosto = function (p, div) {
    if (window.PLANOS && !window.PLANOS.liberado("paradas")) return;
    if (p.t === "f" || p.t === "d") { if (!/graal|parada|rodo|caminh|truck|ponto de apoio/i.test(p.nome)) return; }   // posto comum: só o "Ir para cá"
    var pid = pidDe(p), caixa = document.createElement("div");
    caixa.className = "x-aval"; caixa.style.cssText = "margin-top:6px;font-size:14px;line-height:1.35";
    caixa.innerHTML = '<span style="color:var(--suave)">Carregando avaliações…</span>';
    var bt = document.createElement("button"); bt.type = "button"; bt.className = "btn-pequeno"; bt.textContent = "⭐ Avaliar este ponto";
    bt.onclick = function () { RL.mapa.closePopup(); telaAvaliar(p); };
    div.appendChild(caixa); div.appendChild(bt);
    var c = conta();
    var pr = cacheAval[pid] && Date.now() - cacheAval[pid].t < 600000 ? Promise.resolve(cacheAval[pid].l) : (c && c.avaliacoesParada ? c.avaliacoesParada(pid) : Promise.reject());
    pr.then(function (l) {
      cacheAval[pid] = { t: Date.now(), l: l };
      var r = resumoAval(l);
      caixa.innerHTML = r ? '<b>' + "⭐".repeat(Math.round(r.media)) + " " + r.media.toFixed(1).replace(".", ",") + '</b> (' + r.n + (r.n === 1 ? " avaliação" : " avaliações") + ')' +
        (r.itens.length ? "<br>" + esc(r.itens.join(" · ")) : "") + r.comentarios.map(function (x) { return '<br><i>"' + esc(x) + '"</i>'; }).join("")
        : '<span style="color:var(--suave)">Ainda sem avaliações. Seja o primeiro!</span>';
    }, function () { caixa.innerHTML = '<span style="color:var(--suave)">Avaliações: entre na conta e tenha internet.</span>'; });
  };
  function telaAvaliar(p) {
    if (!exigir("paradas")) return;
    if (!parado()) { RL.mostrarAlertaNav("🚚 Pare o caminhão em local seguro para avaliar.", "info"); return; }
    var nota = 0, marcados = {}, preco = "";
    var html = '<p class="cp-bloco">' + esc(p.nome) + '</p><p class="x-rot">Nota</p><div class="x-grade3" style="grid-template-columns:repeat(5,1fr)">' +
      [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" class="x-btn" data-nota="' + n + '">' + n + '⭐</button>'; }).join("") + '</div>' +
      '<p class="x-rot">Tem? (toque no que tem)</p><div class="x-grade">' +
      [["banho", "🚿 Banho"], ["comida", "🍽️ Comida"], ["seguranca", "🛡️ Segurança"], ["pernoite", "🛏️ Pernoite"], ["banheiro", "🚻 Banheiro"]].map(function (x) { return '<button type="button" class="x-btn" aria-pressed="false" data-tem="' + x[0] + '">' + x[1] + '</button>'; }).join("") + '</div>' +
      '<p class="x-rot">Preço</p><div class="x-grade"><button type="button" class="x-btn" aria-pressed="false" data-preco="gratis">Grátis</button><button type="button" class="x-btn" aria-pressed="false" data-preco="pago">Pago</button></div>' +
      '<p class="x-rot">Comentário (opcional)</p><input class="x-campo" id="avCom" maxlength="200" placeholder="Ex.: pátio grande, banho limpo">' +
      '<p id="avErro" style="color:#b71c1c;font-weight:700"></p><button type="button" class="btn-rota" id="avSalvar">Enviar avaliação</button>';
    var t = janela("telaAvaliar", "⭐ Avaliar ponto de parada", html);
    [].forEach.call(t.querySelectorAll("[data-nota]"), function (b) { b.onclick = function () { nota = +b.getAttribute("data-nota"); [].forEach.call(t.querySelectorAll("[data-nota]"), function (x) { x.setAttribute("aria-pressed", String(+x.getAttribute("data-nota") <= nota)); }); }; });
    [].forEach.call(t.querySelectorAll("[data-tem]"), function (b) { b.onclick = function () { var k = b.getAttribute("data-tem"); marcados[k] = !marcados[k]; b.setAttribute("aria-pressed", String(marcados[k])); }; });
    [].forEach.call(t.querySelectorAll("[data-preco]"), function (b) { b.onclick = function () { preco = preco === b.getAttribute("data-preco") ? "" : b.getAttribute("data-preco"); [].forEach.call(t.querySelectorAll("[data-preco]"), function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-preco") === preco)); }); }; });
    el("avSalvar").onclick = function () {
      if (!nota) { el("avErro").textContent = "Escolha a nota (1 a 5 estrelas)."; return; }
      var c = conta(); if (!c) return;
      el("avSalvar").disabled = true;
      c.avaliarParada(pidDe(p), Object.assign({ nota: nota, preco: preco, comentario: el("avCom").value.trim() }, marcados)).then(function () {
        delete cacheAval[pidDe(p)]; t.hidden = true; RL.avisoRapido("✅ Obrigado! Avaliação enviada.");
      }, function (e) { el("avSalvar").disabled = false; el("avErro").textContent = (e && e.message) || "Não deu para enviar agora (internet?)."; });
    };
  }
  function telaSugerirParada() {
    if (!exigir("paradas")) return;
    var p = RL.posicao();
    if (nav.ativo && !parado()) { RL.mostrarAlertaNav("🚚 Pare o caminhão em local seguro para sugerir.", "info"); return; }
    var html = '<p class="cad-dica">Sugira um lugar bom para caminhoneiro parar. Ele aparece para todos depois que o Ricardo aprovar.</p>' +
      '<p class="x-rot">Onde</p><p class="cp-bloco">' + (p ? "📍 Onde você está agora" : "Sem localização: abra o mapa e ative o GPS.") + '</p>' +
      '<p class="x-rot">Nome do lugar</p><input class="x-campo" id="sgNome" maxlength="60" placeholder="Ex.: Pátio do Zé">' +
      '<p class="x-rot">Tipo</p><div class="x-grade">' + [["estacionamento", "🅿️ Estacionamento"], ["parada", "🚚 Parada/posto de apoio"], ["posto", "⛽ Posto"], ["descanso", "🛏️ Área de descanso"]].map(function (x, i) { return '<button type="button" class="x-btn" aria-pressed="' + (i === 0) + '" data-tipo="' + x[0] + '">' + x[1] + '</button>'; }).join("") + '</div>' +
      '<p class="x-rot">O que tem (opcional)</p><input class="x-campo" id="sgObs" maxlength="200" placeholder="Ex.: segurança 24h, banho, R$ 30 a noite">' +
      '<p id="sgErro" style="color:#b71c1c;font-weight:700"></p><button type="button" class="btn-rota" id="sgEnviar"' + (p ? "" : " disabled") + '>Enviar sugestão</button>';
    var t = janela("telaSugerir", "➕ Sugerir ponto de parada", html), tipo = "estacionamento";
    [].forEach.call(t.querySelectorAll("[data-tipo]"), function (b) { b.onclick = function () { tipo = b.getAttribute("data-tipo"); [].forEach.call(t.querySelectorAll("[data-tipo]"), function (x) { x.setAttribute("aria-pressed", String(x === b)); }); }; });
    el("sgEnviar").onclick = function () {
      var nome = el("sgNome").value.trim(); if (nome.length < 2) { el("sgErro").textContent = "Escreva o nome do lugar."; return; }
      var c = conta(); if (!c) return; el("sgEnviar").disabled = true;
      c.sugerirParada({ nome: nome, lat: p.lat, lon: p.lon, tipo: tipo, obs: el("sgObs").value.trim() }).then(function () {
        t.hidden = true; RL.avisoRapido("✅ Sugestão enviada. Obrigado!");
      }, function (e) { el("sgEnviar").disabled = false; el("sgErro").textContent = (e && e.message) || "Não deu para enviar agora."; });
    };
  }
  itemMenu("btnSugerirParada", "🅿️", "Sugerir ponto de parada", "Indique um lugar bom para parar", "btnTempos", telaSugerirParada);

  /* =================================================================
     TAREFA 7 – CALCULADORA DE FRETE
     Piso mínimo da ANTT: a tabela oficial muda com o diesel e depende do tipo de carga e dos eixos; em vez de copiar
     a tabela (e ficar errada), o app abre a calculadora pública da ANTT (sem cadastro).
     ================================================================= */
  var CHAVE_FRETE = "rotaCaminhaoSP.frete";
  function telaFrete() {
    if (!exigir("frete")) return;
    var cfg = J(CHAVE_FRETE, {}) || {}, r = estado.rota, temRota = r && r.distancia > 0 && estado.B;
    var html = (temRota ? '<button type="button" class="x-btn" id="frUsarRota" style="width:100%">📍 Usar a rota do mapa: ' + esc(String(estado.B.nome || "destino").split(" – ")[0].slice(0, 40)) + ' (' + RL.km(r.distancia) + ')</button>'
                        : '<p class="cad-dica">Dica: trace a rota no mapa ("Para onde?") e abra a calculadora de novo: a distância de caminhão entra sozinha.</p>') +
      '<div class="x-grade"><div><p class="x-rot">Distância (km)</p><input class="x-campo" id="frKm" inputmode="decimal" value="' + (temRota ? Math.round(r.distancia / 100) / 10 : "") + '"></div>' +
      '<div><p class="x-rot">Ida e volta?</p><div class="x-grade" style="margin:0"><button type="button" class="x-btn" id="frIda" aria-pressed="' + (cfg.volta ? "false" : "true") + '">Só ida</button><button type="button" class="x-btn" id="frVolta" aria-pressed="' + (cfg.volta ? "true" : "false") + '">Ida e volta</button></div></div></div>' +
      '<div class="x-grade"><div><p class="x-rot">Consumo (km por litro)</p><input class="x-campo" id="frKml" inputmode="decimal" value="' + esc(cfg.kml ? String(cfg.kml).replace(".", ",") : "") + '" placeholder="ex.: 2,5"></div>' +
      '<div><p class="x-rot">Preço do diesel (R$/l)</p><input class="x-campo" id="frDiesel" inputmode="decimal" value="' + esc(cfg.diesel ? String(cfg.diesel).replace(".", ",") : "") + '" placeholder="ex.: 6,29"></div></div>' +
      '<div class="x-grade"><div><p class="x-rot">Pedágios (R$)</p><input class="x-campo" id="frPed" inputmode="decimal" placeholder="0,00"></div>' +
      '<div><p class="x-rot">Outros custos (R$)</p><input class="x-campo" id="frOutros" inputmode="decimal" placeholder="comida, chapa…"></div></div>' +
      '<p class="x-rot">Valor oferecido pelo frete (R$)</p><input class="x-campo" id="frValor" inputmode="decimal" placeholder="0,00">' +
      '<div id="frRes" style="margin-top:12px"></div>' +
      '<button type="button" class="x-btn verde" id="frSalvar" style="width:100%;margin-top:8px" hidden>💵 Salvar no meu controle de gastos</button>' +
      '<a class="x-btn" style="display:block;text-align:center;text-decoration:none;margin-top:8px;line-height:32px" href="https://calculadorafrete.antt.gov.br/" target="_blank" rel="noopener">📋 Ver o piso mínimo na calculadora da ANTT</a>' +
      '<p class="cad-dica">O consumo e o preço do diesel ficam guardados para a próxima vez. A conta não inclui desgaste de pneu, manutenção e impostos.</p>';
    var t = janela("telaFrete", "🧮 Calcular frete", html), volta = !!cfg.volta, calc = null;
    function marcaVolta() { el("frIda").setAttribute("aria-pressed", String(!volta)); el("frVolta").setAttribute("aria-pressed", String(volta)); conta_(); }
    el("frIda").onclick = function () { volta = false; marcaVolta(); }; el("frVolta").onclick = function () { volta = true; marcaVolta(); };
    if (el("frUsarRota")) el("frUsarRota").onclick = function () { el("frKm").value = String(Math.round(r.distancia / 100) / 10).replace(".", ","); conta_(); };
    function conta_() {
      var kmT = numero(el("frKm").value) * (volta ? 2 : 1), kml = numero(el("frKml").value), diesel = numero(el("frDiesel").value);
      var ped = numero(el("frPed").value), outros = numero(el("frOutros").value), valor = numero(el("frValor").value);
      G(CHAVE_FRETE, { kml: kml || cfg.kml, diesel: diesel || cfg.diesel, volta: volta });
      if (!(kmT > 0) || !(kml > 0) || !(diesel > 0)) { el("frRes").innerHTML = '<p class="cad-dica">Preencha distância, consumo e preço do diesel.</p>'; el("frSalvar").hidden = true; calc = null; return; }
      var litros = kmT / kml, custoDiesel = litros * diesel, total = custoDiesel + ped + outros, sobra = valor - total;
      var cor = !(valor > 0) ? "" : sobra >= total * 0.3 ? "verde" : sobra >= 0 ? "amarelo" : "vermelho";
      var veredito = { verde: "✅ COMPENSA", amarelo: "⚠️ APERTADO", vermelho: "⛔ NÃO COMPENSA" }[cor] || "";
      calc = { total: total, custoDiesel: custoDiesel, ped: ped, outros: outros, valor: valor };
      el("frRes").innerHTML = (veredito ? '<p class="x-aviso ' + cor + '" style="font-size:20px;text-align:center">' + veredito + '</p>' : "") +
        '<div class="x-num"><div><strong>' + dinheiro(total) + '</strong><span>custo total</span></div><div><strong>' + dinheiro(total / kmT) + '</strong><span>custo por km</span></div>' +
        '<div><strong>' + Math.round(litros) + ' l</strong><span>diesel (' + dinheiro(custoDiesel) + ')</span></div>' +
        (valor > 0 ? '<div><strong style="color:' + (sobra >= 0 ? "#2f9e55" : "#e53935") + '">' + dinheiro(sobra) + '</strong><span>sobra (' + dinheiro(sobra / kmT) + '/km)</span></div>' : "") + '</div>' +
        '<p class="cad-dica">' + String(Math.round(kmT * 10) / 10).replace(".", ",") + ' km rodados' + (volta ? " (ida e volta)" : "") + '. Compensa = sobra 30% ou mais do custo; apertado = sobra menos que isso.</p>';
      el("frSalvar").hidden = false;
    }
    ["frKm", "frKml", "frDiesel", "frPed", "frOutros", "frValor"].forEach(function (id) { el(id).addEventListener("input", conta_); });
    conta_();
    el("frSalvar").onclick = function () {
      if (!calc) return;
      var dest = temRota ? String(estado.B.nome || "").split(" – ")[0].slice(0, 40) : "";
      if (calc.custoDiesel > 0) addLancamento("diesel", calc.custoDiesel, "Frete" + (dest ? " " + dest : "") + " (previsto)");
      if (calc.ped > 0) addLancamento("pedagio", calc.ped, "Frete" + (dest ? " " + dest : "") + " (previsto)");
      if (calc.outros > 0) addLancamento("outros", calc.outros, "Frete" + (dest ? " " + dest : "") + " (previsto)");
      if (calc.valor > 0) addLancamento("recebi", calc.valor, "Frete" + (dest ? " " + dest : ""));
      t.hidden = true; RL.avisoRapido("✅ Salvo em Meus gastos (pode corrigir os valores lá).");
    };
  }
  itemMenu("btnFrete", "🧮", "Calcular frete", "Custo, sobra e se compensa", "btnTempos", telaFrete);

  /* =================================================================
     TAREFA 8 – "COMO É ENTREGAR AQUI" (dicas dos motoristas, agrupadas num raio de ~250 m)
     ================================================================= */
  var cacheDicas = {}, RAIO_DICA = 250;
  function liberadoDicas() { return !window.PLANOS || window.PLANOS.liberado("entregarAqui"); }
  function dicasAqui(lat, lon) {
    var k = lat.toFixed(3) + "_" + lon.toFixed(3);
    if (cacheDicas[k] && Date.now() - cacheDicas[k].t < 600000) return Promise.resolve(cacheDicas[k].l);
    var c = conta(); if (!c || !c.dicasPerto) return Promise.resolve([]);
    return c.dicasPerto(lat, lon).then(function (l) {
      l = l.filter(function (d) { return distM({ lat: lat, lon: lon }, d) <= RAIO_DICA; }).sort(function (a, b) { return b.criadoEm - a.criadoEm; });
      cacheDicas[k] = { t: Date.now(), l: l }; return l;
    }).catch(function () { return []; });
  }
  function resumoDicas(l) {
    if (!l.length) return null;
    var n = l.length, cont = function (f) { return l.filter(f).length; }, maioria = function (x) { return x * 2 >= n; };
    var esp = { rapido: 0, medio: 0, demorado: 0 }; l.forEach(function (d) { if (esp[d.espera] !== undefined) esp[d.espera]++; });
    var espTop = Object.keys(esp).sort(function (a, b) { return esp[b] - esp[a]; })[0];
    var itens = [];
    var est = l.filter(function (d) { return d.estacionar; })[0]; if (est) itens.push("🅿️ " + est.estacionar);
    var hor = l.filter(function (d) { return d.horario; })[0]; if (hor) itens.push("🕘 Portão: " + hor.horario);
    if (esp[espTop]) itens.push("⏳ Espera " + { rapido: "rápida", medio: "média", demorado: "demorada" }[espTop]);
    if (maioria(cont(function (d) { return d.doca; }))) itens.push("🚛 Tem doca");
    if (cont(function (d) { return d.portaoBaixo; })) itens.push("⚠️ Portão baixo (" + cont(function (d) { return d.portaoBaixo; }) + " de " + n + ")");
    if (cont(function (d) { return d.ruaApertada; })) itens.push("↔️ Rua apertada (" + cont(function (d) { return d.ruaApertada; }) + " de " + n + ")");
    return { n: n, itens: itens, comentarios: l.filter(function (d) { return d.comentario; }).slice(0, 3).map(function (d) { return d.comentario; }) };
  }
  function htmlDicas(r) {
    return '<details class="risco-caixa" style="background:#eef4fb;color:#123"><summary><b>📦 Como é entregar aqui</b> (' + r.n + (r.n === 1 ? " dica" : " dicas") + ' de motoristas)</summary>' +
      r.itens.map(function (x) { return "<div>" + esc(x) + "</div>"; }).join("") + r.comentarios.map(function (x) { return '<div><i>"' + esc(x) + '"</i></div>'; }).join("") + '</details>';
  }
  // Ao ver a rota para um endereço (antes de sair)
  RL.ganchos.resultado = function () {
    if (!liberadoDicas() || !estado.B) return;
    var B = estado.B;
    dicasAqui(B.lat, B.lon).then(function (l) {
      var r = resumoDicas(l), antes = el("btnNavegar");
      var agoraB = estado.B;
      if (!r || !antes || !agoraB || Math.abs(agoraB.lat - B.lat) > 1e-4 || Math.abs(agoraB.lon - B.lon) > 1e-4 || el("caixaDicas")) return;
      antes.insertAdjacentHTML("beforebegin", '<div id="caixaDicas">' + htmlDicas(r) + '</div>');
    });
  };
  // Ao chegar: mostra o resumo uma vez
  var dicaChegada = null;
  ganchosTick.push(function () {
    if (!nav.ativo || !nav.chegou || !estado.B || !liberadoDicas()) return;
    var k = estado.B.lat.toFixed(4) + estado.B.lon.toFixed(4); if (dicaChegada === k) return; dicaChegada = k;
    dicasAqui(estado.B.lat, estado.B.lon).then(function (l) {
      var r = resumoDicas(l); if (!r) return;
      RL.mostrarAlertaNav("📦 Dicas de motoristas aqui: " + r.itens.slice(0, 3).join(" · ") + (r.comentarios[0] ? ' · "' + r.comentarios[0] + '"' : ""), "info");
    });
  });
  // Pergunta "Como foi entregar aqui?" (só parado)
  function telaDica(local) {
    if (!exigir("entregarAqui")) return;
    if (!parado()) { RL.avisoRapido("🚚 Pare o caminhão para deixar a dica."); return; }
    var d = { estacionar: "", espera: "", doca: false, portaoBaixo: false, ruaApertada: false };
    var html = '<p class="cp-bloco">' + esc(String(local.nome || "Este endereço").split(" – ")[0].slice(0, 60)) + '</p>' +
      '<p class="x-rot">Onde estaciona / entra?</p><div class="x-grade">' +
      ["Na rua, em frente", "Dentro do pátio", "Entrada pelos fundos", "Precisa agendar"].map(function (x) { return '<button type="button" class="x-btn" aria-pressed="false" data-est="' + x + '">' + x + '</button>'; }).join("") + '</div>' +
      '<p class="x-rot">Espera para descarregar</p><div class="x-grade3">' + [["rapido", "⚡ Rápida"], ["medio", "⏳ Média"], ["demorado", "🐢 Demorada"]].map(function (x) { return '<button type="button" class="x-btn" aria-pressed="false" data-esp="' + x[0] + '">' + x[1] + '</button>'; }).join("") + '</div>' +
      '<p class="x-rot">Marque o que tem</p><div class="x-grade3">' + [["doca", "🚛 Doca"], ["portaoBaixo", "⚠️ Portão baixo"], ["ruaApertada", "↔️ Rua apertada"]].map(function (x) { return '<button type="button" class="x-btn" aria-pressed="false" data-tg="' + x[0] + '">' + x[1] + '</button>'; }).join("") + '</div>' +
      '<p class="x-rot">Horário do portão (opcional)</p><input class="x-campo" id="dcHor" maxlength="60" placeholder="ex.: 7h às 17h">' +
      '<p class="x-rot">Comentário curto (opcional)</p><input class="x-campo" id="dcCom" maxlength="200" placeholder="Sem nome de pessoa nem telefone">' +
      '<p id="dcErro" style="color:#b71c1c;font-weight:700"></p><button type="button" class="btn-rota" id="dcEnviar">Enviar dica</button>';
    var t = janela("telaDica", "📦 Como foi entregar aqui?", html);
    t.querySelector(".x-fechar").textContent = "Pular";
    [].forEach.call(t.querySelectorAll("[data-est]"), function (b) { b.onclick = function () { d.estacionar = d.estacionar === b.getAttribute("data-est") ? "" : b.getAttribute("data-est"); [].forEach.call(t.querySelectorAll("[data-est]"), function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-est") === d.estacionar)); }); }; });
    [].forEach.call(t.querySelectorAll("[data-esp]"), function (b) { b.onclick = function () { d.espera = d.espera === b.getAttribute("data-esp") ? "" : b.getAttribute("data-esp"); [].forEach.call(t.querySelectorAll("[data-esp]"), function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-esp") === d.espera)); }); }; });
    [].forEach.call(t.querySelectorAll("[data-tg]"), function (b) { b.onclick = function () { var k = b.getAttribute("data-tg"); d[k] = !d[k]; b.setAttribute("aria-pressed", String(d[k])); }; });
    el("dcEnviar").onclick = function () {
      d.horario = el("dcHor").value.trim(); d.comentario = el("dcCom").value.trim();
      // dado pessoal não: telefone, e-mail ou placa no texto são recusados
      if (/\d{4,5}[-\s]?\d{4}|@|\b[A-Z]{3}-?\d[A-Z0-9]\d{2}\b/i.test(d.comentario + " " + d.horario)) { el("dcErro").textContent = "Não coloque telefone, e-mail ou placa na dica."; return; }
      if (!d.estacionar && !d.espera && !d.doca && !d.portaoBaixo && !d.ruaApertada && !d.horario && !d.comentario) { el("dcErro").textContent = "Toque em pelo menos uma opção."; return; }
      var c = conta(); if (!c) return; el("dcEnviar").disabled = true;
      c.salvarDica(Object.assign({ lat: local.lat, lon: local.lon }, d)).then(function () {
        cacheDicas = {}; t.hidden = true; RL.avisoRapido("✅ Obrigado! Sua dica ajuda outros motoristas.");
      }, function (e) { el("dcEnviar").disabled = false; el("dcErro").textContent = (e && e.message) || "Não deu para enviar agora."; });
    };
  }
  ganchosFimViagem.push(function (v, caixa) {
    if (!v.chegou || typeof v.destLat !== "number" || !liberadoDicas() || !caixa) return;
    var b = document.createElement("button"); b.type = "button"; b.className = "btn-rota"; b.style.marginTop = "8px"; b.textContent = "📦 Como foi entregar aqui?";
    b.onclick = function () { el("telaFimViagem").hidden = true; telaDica({ lat: v.destLat, lon: v.destLon, nome: v.destino }); };
    caixa.appendChild(b);
  });
  RL.ganchos.entregaMarcada = function (pe) { if (liberadoDicas() && parado()) telaDica(pe); };

  /* =================================================================
     TAREFA 9 – CADEADO NAS FUNÇÕES PLUS QUE JÁ EXISTIAM (só age com COBRANCA_LIGADA = true no planos.js)
     ================================================================= */
  var PORTAS = [
    ["#btnAbrirRoteiro", "entregas"], [".espera-botoes [data-a='posto']", "esperarLiberar"], ["#btnEsperarAqui", "esperarLiberar"],
    ["#btnChegarCalc", "horarioIdeal"], ["#selPlaca", "rodizio"], ["#btnTempos", "minhasViagens"], ["#btnEnviarChegada", "enviarChegada"],
    ["#opPedagio", "pedagioBalsa"], ["#opBalsa", "pedagioBalsa"], ["#opRisco", "areasRisco"], ["#liga-risco", "areasRisco"]
  ];
  function portaDe(alvo) {
    for (var i = 0; i < PORTAS.length; i++) { var x = alvo.closest && alvo.closest(PORTAS[i][0]); if (x) return PORTAS[i][1]; }
    return null;
  }
  ["click", "mousedown", "touchstart"].forEach(function (tipo) {
    document.addEventListener(tipo, function (ev) {
      if (!window.PLANOS || !window.PLANOS.COBRANCA_LIGADA) return;
      var k = portaDe(ev.target); if (!k || window.PLANOS.liberado(k)) return;
      if (ev.target.type === "checkbox") {
        // no clique a marca já mudou: desligar continua permitido; ligar pede o plano
        if (tipo !== "click" || !ev.target.checked) return;
      }
      ev.preventDefault(); ev.stopImmediatePropagation();
      if (tipo === "click") window.PLANOS.cadeado(k);
    }, true);
  });
  function aplicarPlanos() {
    if (!window.PLANOS || !window.PLANOS.COBRANCA_LIGADA) return;
    // áreas de risco fora do plano: tira a camada do mapa
    var lr = el("liga-risco");
    if (lr && lr.checked && !window.PLANOS.liberado("areasRisco")) { lr.checked = false; lr.dispatchEvent(new Event("change", { bubbles: true })); }
    desenharAlertas();
  }
  setTimeout(aplicarPlanos, 3000); setInterval(aplicarPlanos, 60000);
  // Rota simples (sem desvio das restrições) para quem está no plano grátis
  var resultadoAntes = RL.ganchos.resultado;
  RL.ganchos.resultado = function (res) {
    if (resultadoAntes) resultadoAntes(res);
    if (!window.PLANOS || window.PLANOS.liberado("rotaCaminhao") || el("caixaSimples")) return;
    var antes = el("btnNavegar"); if (!antes) return;
    antes.insertAdjacentHTML("beforebegin", '<p class="risco-caixa" id="caixaSimples">🔒 <b>Rota simples:</b> não desvia das restrições de caminhão (ZMRC, horários, vias proibidas). ' +
      '<button type="button" class="btn-pequeno" id="btnAssinarRota">Assinar para liberar</button></p>');
    el("btnAssinarRota").onclick = function () { window.PLANOS.cadeado("rotaCaminhao"); };
  };

  window.RLExtras = { todosAlertas: todosAlertas, desenharAlertas: desenharAlertas, distAlerta: distAlerta, tick: function (t) { ganchosTick.forEach(function (f) { f(t); }); }, jornada: function () { return jor; }, REGRAS_JORNADA: REGRAS_JORNADA,
    paradasPerto: paradasPerto, fontesParada: fontesParada, addLancamento: addLancamento, telaLancar: telaLancar, ganchosFimViagem: ganchosFimViagem,
    viagens: viagens, lancamentos: lancamentos, docs: function () { return docs; }, conferirVencimentos: conferirVencimentos, telaDocs: telaDocs, kmCaminhao: kmCaminhao, odometro: function () { return odo; }, telaFimViagem: telaFimViagem, quandoLivre: quandoLivre, ganchosTick: ganchosTick, distM: distM, aoVivo: function () { return aoVivo; }, comecarAoVivo: comecarAoVivo, pararAoVivo: pararAoVivo, dispararEmergencia: dispararEmergencia,
    janela: janela, itemMenu: itemMenu, ganchosFim: ganchosFim, ganchosInicio: ganchosInicio, J: J, G: G, dinheiro: dinheiro, numero: numero,
    dataBR: dataBR, horaBR: horaBR, hm: hm, diaChave: diaChave, zap: zap, parado: parado, exigir: exigir, conta: conta };
})();
