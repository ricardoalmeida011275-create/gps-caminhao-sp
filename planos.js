/* =====================================================================
   PLANOS DO ROTA LIBERADA – o ÚNICO lugar onde se decide o que é GRÁTIS e o que é PLUS.
   Para mudar uma função de plano, troque "gratis" por "plus" (ou o contrário) na lista abaixo.

   COBRANCA_LIGADA:
     false = fase de teste: TUDO liberado para todos (é como está agora).
     true  = Play Store: quem não é parceiro, nem assinante, e já passou dos dias de teste
             vê o cadeado 🔒 nas funções PLUS (botão "Assinar para liberar"). As GRÁTIS continuam.
   Parceiros, assinantes e quem está nos dias de teste têm sempre tudo liberado.
   ===================================================================== */
(function () {
  var COBRANCA_LIGADA = false;

  /* TESTE GRÁTIS – o ÚNICO lugar com o número de dias (o app e o painel do Ricardo leem daqui).
     DIAS_TESTE: dias grátis contados do cadastro.  DIAS_INDICACAO: quem entra com código ganha a mais,
     e quem indicou ganha isso depois da 1ª viagem do indicado.
     Quem já tinha o teste VENCIDO antes de TESTE_NOVO_DESDE continua com os dias antigos (DIAS_TESTE_ANTES). */
  var TESTE = { DIAS_TESTE: 14, DIAS_INDICACAO: 7, DIAS_TESTE_ANTES: 7, TESTE_NOVO_DESDE: "2026-11-27" };

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
    alertaVelocidade:  { plano: "gratis", nome: "Alerta de velocidade (meu limite e limite da rua)" },
    chegouDestino:     { plano: "gratis", nome: "\"Chegou ao destino?\" e botão \"Cheguei\" (encerra a viagem)" },
    relatos:           { plano: "gratis", nome: "Relatar problema com texto livre (destino ou entrada errada)" },
    ajustarChegada:    { plano: "gratis", nome: "Ajustar ponto de chegada (correção pelos motoristas)" },
    entradaCerta:      { plano: "gratis", nome: "Chegar pela entrada certa em postos e lugares" },
    youtube:           { plano: "gratis", nome: "Acompanhe no YouTube (item do menu)" },
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
    mapaOffline:       { plano: "plus", nome: "Modo sem internet (mapa de SP salvo no celular)" },
    // Funções que já existiam e não estavam na lista do Ricardo: ficaram PLUS (ver PROGRESSO.md)
    minhasViagens:     { plano: "plus", nome: "Minhas viagens (tempo previsto x real)" },
    faixasOnibus:      { plano: "plus", nome: "Avisos de faixa e corredor de ônibus na viagem" },
    enviarChegada:     { plano: "plus", nome: "Enviar minha chegada (WhatsApp)" }
  };

  // Situação do motorista (vem do conta.js): parceiro, assinante, teste (dentro dos dias de teste), vencido, bloqueado
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
  // Dias de teste de um cadastro (sem contar os bônus): criadoEm em milissegundos, indicado = veio com código
  function diasDoTeste(criadoEm, indicado) {
    var desde = new Date(TESTE.TESTE_NOVO_DESDE + "T00:00:00-03:00").getTime();
    var extra = indicado ? TESTE.DIAS_INDICACAO : 0;
    // o teste antigo já tinha acabado antes da mudança: continua como era
    if (criadoEm + (TESTE.DIAS_TESTE_ANTES + extra) * 86400000 < desde) return TESTE.DIAS_TESTE_ANTES + extra;
    return TESTE.DIAS_TESTE + extra;
  }
  // Use antes de abrir uma função: se estiver bloqueada, mostra o cadeado e devolve false
  function exigir(chave) { if (liberado(chave)) return true; cadeado(chave); return false; }

  window.PLANOS = {
    COBRANCA_LIGADA: COBRANCA_LIGADA, FUNCOES: FUNCOES, liberado: liberado, exigir: exigir, cadeado: cadeado, temTudo: temTudo,
    TESTE: TESTE, diasDoTeste: diasDoTeste,
    // Para o teste no computador: PLANOS._testeCobranca(true) liga a cobrança só nesta aba
    _testeCobranca: function (v) { if (location.hostname === "localhost") { COBRANCA_LIGADA = !!v; window.PLANOS.COBRANCA_LIGADA = COBRANCA_LIGADA; } }
  };
})();
