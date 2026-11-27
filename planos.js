/* =====================================================================
   PLANOS DO ROTA LIBERADA – o ÚNICO lugar onde se decide o que é GRÁTIS e o que é PLUS.
   Para mudar uma função de plano, troque "gratis" por "plus" (ou o contrário) na lista abaixo.

   COBRANCA_LIGADA:
     false = fase de teste: TUDO liberado para todos (é como está agora).
     true  = Play Store: quem não é parceiro, nem assinante, e já passou dos 7 dias de teste
             vê o cadeado 🔒 nas funções PLUS (botão "Assinar para liberar"). As GRÁTIS continuam.
   Parceiros, assinantes e quem está nos dias de teste têm sempre tudo liberado.
   ===================================================================== */
(function () {
  var COBRANCA_LIGADA = false;

  var FUNCOES = {
    // ---------- GRÁTIS ----------
    navegacaoSimples:  { plano: "gratis", nome: "Navegação simples (rota comum, sem desviar das restrições de caminhão)" },
    mapaRestricoes:    { plano: "gratis", nome: "Mapa com as áreas restritas (só para ver)" },
    buscaEndereco:     { plano: "gratis", nome: "Busca de endereço, favoritos e recentes" },
    postosDiesel:      { plano: "gratis", nome: "Postos de diesel" },
    emergencia:        { plano: "gratis", nome: "Botão de emergência 🆘 e contatos de emergência" },
    marcarProblema:    { plano: "gratis", nome: "Marcar problema" },
    indique:           { plano: "gratis", nome: "Indique um amigo" },
    basico:            { plano: "gratis", nome: "Login, menu e configurações básicas" },
    // ---------- PLUS ----------
    rotaCaminhao:      { plano: "plus", nome: "Rota de caminhão que desvia das restrições (ZMRC, horários, vias proibidas, tipo de caminhão)" },
    avisosRestricao:   { plano: "plus", nome: "Avisos de área restrita durante a viagem" },
    entregas:          { plano: "plus", nome: "Roteirização / otimizador de várias entregas (entregue, motivo e foto)" },
    esperarLiberar:    { plano: "plus", nome: "Esperar liberar" },
    horarioIdeal:      { plano: "plus", nome: "Horário ideal de saída (\"Quero chegar às…\")" },
    rodizio:           { plano: "plus", nome: "Lembrete e rota com o rodízio" },
    pedagioBalsa:      { plano: "plus", nome: "Evitar pedágio e balsa" },
    areasRisco:        { plano: "plus", nome: "Áreas de risco (mapa, avisos e evitar áreas de alto risco)" },
    compartilhar:      { plano: "plus", nome: "Compartilhar viagem ao vivo" },
    jornada:           { plano: "plus", nome: "Controle de jornada" },
    gastos:            { plano: "plus", nome: "Controle de gastos e viagens" },
    documentos:        { plano: "plus", nome: "Documentos e manutenção" },
    alertasCet:        { plano: "plus", nome: "Alertas da CET (desvio de interdições)" },
    paradas:           { plano: "plus", nome: "Pontos de parada com avaliações" },
    frete:             { plano: "plus", nome: "Calculadora de frete" },
    entregarAqui:      { plano: "plus", nome: "\"Como é entregar aqui\"" },
    // Funções que já existiam e não estavam na lista do Ricardo: ficaram PLUS (ver PROGRESSO.md)
    minhasViagens:     { plano: "plus", nome: "Minhas viagens (tempo previsto x real)" },
    faixasOnibus:      { plano: "plus", nome: "Avisos de faixa e corredor de ônibus na viagem" },
    enviarChegada:     { plano: "plus", nome: "Enviar minha chegada (WhatsApp)" }
  };

  // Situação do motorista (vem do conta.js): parceiro, assinante, teste (dentro dos 7 dias), vencido, bloqueado
  function situacao() { try { return (window.RotaConta && window.RotaConta.situacao && window.RotaConta.situacao()) || null; } catch (e) { return null; } }
  function temTudo() {
    var c = situacao();
    if (!c) return true;   // ainda carregando a conta: não trava
    if (c.estado === "parceiro" || c.estado === "assinante") return true;
    return c.estado === "teste" && c.fim > Date.now();
  }
  function liberado(chave) {
    if (!COBRANCA_LIGADA) return true;
    var f = FUNCOES[chave];
    if (!f || f.plano === "gratis") return true;
    return temTudo();
  }
  // Tela do cadeado
  function cadeado(chave) {
    var f = FUNCOES[chave] || { nome: "Esta função" };
    var t = document.getElementById("telaCadeado");
    if (!t) {
      t = document.createElement("div"); t.id = "telaCadeado"; t.className = "nav-opcoes"; t.setAttribute("role", "dialog"); t.setAttribute("aria-modal", "true");
      document.body.appendChild(t);
      t.addEventListener("click", function (ev) { if (ev.target === t) t.hidden = true; });
    }
    t.innerHTML = '<div class="nav-opcoes-caixa"><p class="nav-opcoes-titulo">🔒 Função PLUS</p><p class="cp-bloco"></p>' +
      '<p class="cad-dica">Seu teste grátis acabou. As funções grátis continuam funcionando. Assine para liberar todas.</p>' +
      '<a class="btn-rota" style="display:block;text-align:center;text-decoration:none" target="_blank" rel="noopener" href="https://wa.me/5511961950268?text=' +
      encodeURIComponent("Oi Ricardo, quero assinar o Rota Liberada Plus.") + '">Assinar para liberar</a>' +
      '<button type="button" class="btn-pequeno op-fechar">Agora não</button></div>';
    t.querySelector(".cp-bloco").textContent = f.nome;
    t.querySelector(".op-fechar").onclick = function () { t.hidden = true; };
    t.hidden = false;
  }
  // Use antes de abrir uma função: se estiver bloqueada, mostra o cadeado e devolve false
  function exigir(chave) { if (liberado(chave)) return true; cadeado(chave); return false; }

  window.PLANOS = {
    COBRANCA_LIGADA: COBRANCA_LIGADA, FUNCOES: FUNCOES, liberado: liberado, exigir: exigir, cadeado: cadeado, temTudo: temTudo,
    // Para o teste no computador: PLANOS._testeCobranca(true) liga a cobrança só nesta aba
    _testeCobranca: function (v) { if (location.hostname === "localhost") { COBRANCA_LIGADA = !!v; window.PLANOS.COBRANCA_LIGADA = COBRANCA_LIGADA; } }
  };
})();
