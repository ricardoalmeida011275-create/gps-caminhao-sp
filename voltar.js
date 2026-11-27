/* =====================================================================
   Botão "voltar" do celular e setinha ← (28/11/2026)
   - Voltar fecha só a tela de cima (igual Waze/Google Maps). O app só fecha na tela inicial (mapa com "Para onde?").
   - Usa o histórico do navegador: enquanto houver alguma tela aberta, existe UMA entrada a mais no histórico
     (a "guarda"). O voltar do celular gasta essa entrada; aqui fechamos a tela de cima e, se ainda não for
     a tela inicial, colocamos a guarda de novo. Assim nunca acumulam entradas (nada de empilhar duas vezes
     quando uma tela abre sozinha, por exemplo ao recalcular a rota).
   - Na navegação, voltar NÃO encerra a viagem: aparece "Sair da navegação?" (Continuar viagem / Sair).
   ===================================================================== */
(function () {
  "use strict";
  var B = document.body, $ = function (id) { return document.getElementById(id); };

  /* Telas que cobrem o mapa (todas as janelas do app usam uma destas classes) */
  var SELETOR = ".nav-opcoes, .chegada-aviso, .menu-fundo, .tela-busca, .fim-fundo, .aj-tela, .rl-tela";
  /* Botão que fecha cada tela (o mesmo que o motorista tocaria). Sem botão na lista: procura "Fechar/Voltar" dentro dela. */
  var FECHAR = {
    menuFundo: "btnFecharMenu", telaBusca: "btnVoltarBusca", telaRoteiro: "btnVoltarRoteiro", fimViagem: "btnFimInicio",
    chegadaAviso: "btnAindaNao", chegouPergunta: "btnChegouNao", telaAjustar: "ajCancelar", telaCadastro: "btnCadPular",
    telaEspera: "btnEsFechar", telaEntrega: "btnEnDepois", telaAviso: "btnAvOk", navOpcoes: "btnFecharOpcoes",
    revisao: "btnRevFechar", telaNovidade: "btnNovOk", telaTempos: "btnFecharTempos", telaPostosEspera: "btnPeFechar",
    confirmaProibido: "btnCpVoltar", resumoRestrito: "btnRrFechar"
  };
  /* Telas que já têm a própria setinha ← no canto de cima (não precisa da setinha flutuante) */
  var TEM_SETA = { telaBusca: 1, telaRoteiro: 1, menuFundo: 1 };

  function visivel(e) { return !!e && !e.hidden && e.isConnected && getComputedStyle(e).display !== "none"; }
  // Tela de entrada/bloqueio da conta (login, cadastro, teste acabou): não é "uma tela a mais", é o começo do app
  function ehPortao(e) { return e.classList.contains("rl-tela") && !e.querySelector("#rlVoltar"); }
  function camadas() {
    var l = [].filter.call(document.querySelectorAll(SELETOR), function (e) { return visivel(e) && !ehPortao(e); });
    // a de cima é a de maior z-index (empate: a que vem depois na página)
    return l.map(function (e, i) { return { e: e, z: parseInt(getComputedStyle(e).zIndex, 10) || 0, i: i }; })
      .sort(function (a, b) { return a.z - b.z || a.i - b.i; }).map(function (x) { return x.e; });
  }
  function portaoAberto() { return [].some.call(document.querySelectorAll(".rl-tela"), function (e) { return visivel(e) && ehPortao(e); }); }
  function navegando() { return B.classList.contains("navegando"); }
  function escolhendoRota() { return B.classList.contains("modo-rota") && !navegando(); }
  function naTelaInicial() { return !camadas().length && !navegando() && !escolhendoRota() && !perguntaAberta(); }

  /* ---------- Histórico: uma "guarda" enquanto não está na tela inicial ---------- */
  var guarda = !!(history.state && history.state.rlGuarda), ignorar = 0, agendado = false;
  function sincronizar() {
    agendado = false;
    var precisa = !naTelaInicial() && !portaoAberto();
    if (!ignorar) {
      if (precisa && !guarda) { try { history.pushState({ rlGuarda: 1 }, ""); guarda = true; } catch (e) {} }
      else if (!precisa && guarda) { guarda = false; ignorar++; history.back(); }   // fechou pelo botão da tela: tira a guarda
    }
    lembrarMenu();
    atualizarSeta();
  }
  function agendar() { if (!agendado) { agendado = true; setTimeout(sincronizar, 0); } }
  window.addEventListener("popstate", function () {
    if (ignorar) { ignorar--; agendar(); return; }
    guarda = false;            // o voltar do celular gastou a guarda
    voltarUmPasso();
    agendar();                 // se ainda não for a tela inicial, a guarda volta
  });

  /* ---------- Fechar a tela de cima ---------- */
  function botaoVisivel(b) { return b && !b.hidden && b.offsetParent !== null; }
  function fecharCamada(c) {
    // Menu com um grupo aberto (Meu caminhão, Aparência…): primeiro fecha o grupo, depois o menu
    if (c.id === "menuFundo") {
      var g = c.querySelector("details.menu-grupo[open]");
      if (g) { g.open = false; return; }
    }
    var b = FECHAR[c.id] && $(FECHAR[c.id]);
    if (!botaoVisivel(b)) {
      var l = [].filter.call(c.querySelectorAll("#rlVoltar, .x-fechar, .op-fechar, .btn-voltar"), botaoVisivel);
      b = l[l.length - 1];
    }
    var voltaMenu = c.getAttribute("data-rl-do-menu") === "1";
    c.removeAttribute("data-rl-do-menu");
    if (b) b.click(); else c.hidden = true;   // sem botão visível (ex.: baixando o mapa): só esconde a janela
    // Tela aberta pelo menu ☰: voltar leva de novo ao menu
    if (voltaMenu && !navegando() && !visivel($("menuFundo"))) setTimeout(function () { $("btnMenu").click(); }, 0);
  }
  function voltarUmPasso() {
    if (perguntaAberta()) { fecharPergunta(); return; }           // voltar de novo = continuar a viagem
    var l = camadas();
    if (l.length) { fecharCamada(l[l.length - 1]); return; }
    if (navegando()) { perguntarSair(); return; }
    if (B.classList.contains("editando-rota") && $("btnAlterarRota")) { $("btnAlterarRota").click(); return; }
    if (escolhendoRota()) { $("btnInicio").click(); return; }
  }

  /* Telas que abriram no mesmo instante em que o menu fechou = vieram do menu */
  var antes = [];
  function lembrarMenu() {
    var agora = camadas(), menu = $("menuFundo");
    if (antes.indexOf(menu) >= 0 && agora.indexOf(menu) < 0) {
      agora.forEach(function (c) { if (antes.indexOf(c) < 0) c.setAttribute("data-rl-do-menu", "1"); });
    }
    antes = agora;
  }

  /* ---------- "Sair da navegação?" (aviso pequeno, sem alert do navegador) ---------- */
  /* Ícone de voltar (desenho, não letra: fica no centro exato em qualquer celular) */
  var SETA = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>';
  var BOTOES = "#rlSeta,.rl-seta-menu,.btn-voltar,#btnInicio.rl-seta-ini";
  var css = document.createElement("style");
  css.textContent =
    "#rlSeta{position:fixed;z-index:100001;top:calc(env(safe-area-inset-top,0px) + 10px);left:calc(env(safe-area-inset-left,0px) + 10px)}" +
    /* todas as setinhas iguais: círculo de 52px, ícone de 26px no centro */
    BOTOES + "{flex:none;box-sizing:border-box;width:52px;height:52px;border-radius:50%;border:1px solid var(--linha);background:var(--papel);color:var(--asfalto);" +
    "box-shadow:var(--sombra);display:grid;place-items:center;padding:0;line-height:0;font-size:0;cursor:pointer;transition:transform .12s ease}" +
    BOTOES.split(",").map(function (s) { return s + " svg"; }).join(",") + "{display:block;width:26px;height:26px}" +
    BOTOES.split(",").map(function (s) { return s + ":active"; }).join(",") + "{transform:scale(.94)}" +
    "#rlSeta[hidden]{display:none}" +
    ".busca-topo .btn-voltar{margin-top:2px}" +   // alinha com o campo de 56px ao lado
    "body.rl-com-seta .aj-topo{padding-left:76px}" +
    "body.rl-com-seta .rl-tela{padding-top:78px}" +
    "#rlSairNav{position:fixed;z-index:100002;left:12px;right:12px;max-width:440px;margin:0 auto;bottom:calc(env(safe-area-inset-bottom,0px) + 120px);" +
    "background:var(--papel,#fff);color:var(--asfalto,#1b2430);border:2px solid var(--linha,#c9d1dc);border-radius:16px;padding:14px;box-shadow:0 8px 28px rgba(0,0,0,.45);" +
    "font-family:var(--f-texto,system-ui,sans-serif)}" +
    "#rlSairNav[hidden]{display:none}" +
    "#rlSairNav p{margin:0 0 12px;font:700 21px/1.2 var(--f-titulo,system-ui,sans-serif);text-align:center}" +
    "#rlSairNav div{display:flex;gap:10px}" +
    "#rlSairNav button{flex:1;min-height:56px;border:0;border-radius:12px;font:700 18px var(--f-titulo,system-ui,sans-serif);cursor:pointer}" +
    "#rlSairContinuar{background:#1565c0;color:#fff}#rlSairSim{background:#c62828;color:#fff}";
  document.head.appendChild(css);

  var pergunta = document.createElement("div");
  pergunta.id = "rlSairNav"; pergunta.setAttribute("role", "alertdialog"); pergunta.setAttribute("aria-labelledby", "rlSairTit"); pergunta.hidden = true;
  pergunta.innerHTML = '<p id="rlSairTit">Sair da navegação?</p><div><button type="button" id="rlSairContinuar">Continuar viagem</button><button type="button" id="rlSairSim">Sair</button></div>';
  B.appendChild(pergunta);
  var tempoPergunta = null;
  function perguntaAberta() { return !pergunta.hidden; }
  function fecharPergunta() { pergunta.hidden = true; clearTimeout(tempoPergunta); agendar(); }
  function perguntarSair() {
    pergunta.hidden = false;
    clearTimeout(tempoPergunta);
    tempoPergunta = setTimeout(fecharPergunta, 10000);   // sem resposta: a navegação continua
  }
  $("rlSairContinuar").addEventListener("click", fecharPergunta);
  $("rlSairSim").addEventListener("click", function () {
    fecharPergunta();
    if (navegando() && $("btnEncerrar")) $("btnEncerrar").click();
  });

  /* ---------- Setinha ← nas telas que não são a inicial ---------- */
  var seta = document.createElement("button");
  seta.type = "button"; seta.id = "rlSeta"; seta.hidden = true; seta.innerHTML = SETA; seta.setAttribute("aria-label", "Voltar");
  B.appendChild(seta);
  function voltar() { if (guarda) history.back(); else { voltarUmPasso(); agendar(); } }
  seta.addEventListener("click", voltar);
  // Menu ☰: setinha no topo, à esquerda do título
  var mt = document.querySelector(".menu-topo");
  if (mt) {
    var sm = document.createElement("button");
    sm.type = "button"; sm.className = "rl-seta-menu"; sm.innerHTML = SETA; sm.setAttribute("aria-label", "Voltar");
    sm.addEventListener("click", voltar);
    mt.insertBefore(sm, mt.firstChild);
  }
  // Escolha da rota: o ✕ do painel vira ← (faz a mesma coisa: volta para a tela inicial)
  var bi = $("btnInicio");
  if (bi) { bi.innerHTML = SETA; bi.classList.add("rl-seta-ini"); }

  function atualizarSeta() {
    var l = camadas(), topo = l[l.length - 1];
    // Navegação sem janela por cima: sem setinha (o topo mostra a próxima curva); o voltar do celular pergunta antes de sair
    var mostrar = !!topo && !TEM_SETA[topo.id] && !perguntaAberta();
    seta.hidden = !mostrar;
    B.classList.toggle("rl-com-seta", mostrar);
  }

  /* Observa qualquer tela abrindo ou fechando (sem olhar o mapa, que muda o tempo todo) */
  new MutationObserver(agendar).observe(B, { childList: true, attributes: true, attributeFilter: ["class"] });   // janelas novas e modo da tela
  new MutationObserver(agendar).observe(B, { subtree: true, attributes: true, attributeFilter: ["hidden", "open"] });
  agendar();
})();
