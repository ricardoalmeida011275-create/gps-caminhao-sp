// =====================================================================
// LUGARES CONHECIDOS DE SÃO PAULO
// Aparecem primeiro na busca do app (com uma estrela ⭐).
//
// De onde vieram as coordenadas: todas foram conferidas no geocodificador
// do OpenRouteService/HeiGIT (dados do OpenStreetMap) em 17/11/2026.
// Só entrou o que o geocodificador achou com o nome certo e no lugar certo.
// Nenhuma coordenada foi digitada "de cabeça".
//
// COMO ACRESCENTAR UM LUGAR:
// 1. No Google Maps (no computador), clique com o botão direito em cima do
//    lugar exato (de preferência a entrada de caminhões). Os primeiros números
//    que aparecem no menu são a coordenada, por exemplo: -23.53712, -46.73554
//    (o primeiro é a "lat", o segundo é a "lon").
// 2. Copie uma linha parecida aqui embaixo, cole no fim da lista e troque:
//    nome     = como o lugar aparece na busca
//    apelidos = outros jeitos que o motorista pode digitar, sem acento e em
//               minúsculas (ex.: "ceasa", "ceasa jaguare")
//    categoria, bairro, cidade = só para mostrar na lista
//    lat, lon = os números do passo 1
// 3. Atenção às vírgulas: cada linha termina com "}," menos a última da lista.
// 4. Mande o arquivo para o GitHub junto com o sw.js com a versão do cache
//    aumentada (ex.: rota-caminhao-v7), para os celulares pegarem a versão nova.
// =====================================================================
window.LOCAIS_SP = [

  // ===== Abastecimento =====
  { nome: "Ceagesp", apelidos: ["ceasa","ceasa jaguare","ceagesp","entreposto","ceasa sp"], categoria: "Abastecimento", bairro: "Jaguare", cidade: "São Paulo", lat: -23.537131, lon: -46.735543 },
  { nome: "Ceasa Campinas", apelidos: ["ceasa campinas"], categoria: "Abastecimento", bairro: "Barão Geraldo", cidade: "Campinas, SP", lat: -22.846209, lon: -47.095301 },

  // ===== Eventos =====
  { nome: "Autódromo de Interlagos", apelidos: ["interlagos","autodromo","autodromo de interlagos","jose carlos pace"], categoria: "Eventos", bairro: "Socorro", cidade: "São Paulo", lat: -23.700522, lon: -46.69717 },
  { nome: "Centro de Convenções Frei Caneca", apelidos: ["frei caneca convencoes","convencoes frei caneca"], categoria: "Eventos", bairro: "Vila Bela Vista", cidade: "São Paulo", lat: -23.553793, lon: -46.652757 },
  { nome: "Distrito Anhembi", apelidos: ["anhembi","anhembi parque","sambodromo","sambodromo do anhembi","distrito anhembi"], categoria: "Eventos", bairro: "Bom Retiro", cidade: "São Paulo", lat: -23.515952, lon: -46.642538 },
  { nome: "Espaço das Américas", apelidos: ["espaco das americas"], categoria: "Eventos", bairro: "Barra Funda", cidade: "São Paulo", lat: -23.527728, lon: -46.667903 },
  { nome: "Expo Center Norte", apelidos: ["expo center norte","center norte expo"], categoria: "Eventos", bairro: "Vila Guilherme", cidade: "São Paulo", lat: -23.510606, lon: -46.612175 },
  { nome: "Ginásio do Ibirapuera", apelidos: ["ginasio do ibirapuera","ginasio ibirapuera"], categoria: "Eventos", bairro: "Jardim Paulista", cidade: "São Paulo", lat: -23.57794, lon: -46.656134 },
  { nome: "Jockey Club de São Paulo", apelidos: ["jockey","jockey club","joquei","joquei clube","hipodromo cidade jardim"], categoria: "Eventos", bairro: "Pinheiros", cidade: "São Paulo", lat: -23.580593, lon: -46.697721 },
  { nome: "Memorial da América Latina", apelidos: ["memorial","memorial da america latina"], categoria: "Eventos", bairro: "Barra Funda", cidade: "São Paulo", lat: -23.526188, lon: -46.665974 },
  { nome: "Pavilhão da Bienal", apelidos: ["bienal","pavilhao da bienal","bienal ibirapuera"], categoria: "Eventos", bairro: "Moema", cidade: "São Paulo", lat: -23.58868, lon: -46.654616 },
  { nome: "Pro Magno Centro de Eventos", apelidos: ["pro magno"], categoria: "Eventos", bairro: "Limao", cidade: "São Paulo", lat: -23.508973, lon: -46.668703 },
  { nome: "São Paulo Expo", apelidos: ["sao paulo expo","expo imigrantes","sp expo","centro de exposicoes imigrantes"], categoria: "Eventos", bairro: "Vila Água Funda", cidade: "São Paulo", lat: -23.647966, lon: -46.629134 },
  { nome: "Transamerica Expo Center", apelidos: ["transamerica expo","transamerica"], categoria: "Eventos", bairro: "Santo Amaro", cidade: "São Paulo", lat: -23.649454, lon: -46.718846 },
  { nome: "Vibra São Paulo", apelidos: ["vibra","credicard hall","vibra sao paulo"], categoria: "Eventos", bairro: "Jardim Sao Luis", cidade: "São Paulo", lat: -23.648108, lon: -46.723932 },
  { nome: "WTC Events Center", apelidos: ["wtc","world trade center"], categoria: "Eventos", bairro: "Itaim Bibi", cidade: "São Paulo", lat: -23.609156, lon: -46.696257 },

  // ===== Estádios =====
  { nome: "Allianz Parque", apelidos: ["allianz","allianz parque","palmeiras","arena palmeiras"], categoria: "Estádios", bairro: "Barra Funda", cidade: "São Paulo", lat: -23.527391, lon: -46.678538 },
  { nome: "Estádio do Canindé", apelidos: ["caninde","portuguesa","osvaldo teixeira duarte"], categoria: "Estádios", bairro: "Pari", cidade: "São Paulo", lat: -23.520546, lon: -46.618808 },
  { nome: "Estádio do Morumbi (Morumbis)", apelidos: ["morumbis","estadio do morumbi","morumbi estadio","sao paulo fc","cicero pompeu de toledo"], categoria: "Estádios", bairro: "Morumbi", cidade: "São Paulo", lat: -23.600083, lon: -46.72011 },
  { nome: "Estádio do Pacaembu", apelidos: ["pacaembu","estadio do pacaembu","paulo machado de carvalho"], categoria: "Estádios", bairro: "Consolacao", cidade: "São Paulo", lat: -23.548011, lon: -46.66534 },
  { nome: "Neo Química Arena", apelidos: ["neo quimica arena","arena corinthians","itaquerao","corinthians"], categoria: "Estádios", bairro: "Artur Alvim", cidade: "São Paulo", lat: -23.545263, lon: -46.474768 },

  // ===== Aeroportos e cargas =====
  { nome: "Aeroporto Campo de Marte", apelidos: ["campo de marte"], categoria: "Aeroportos e cargas", bairro: "Bom Retiro", cidade: "São Paulo", lat: -23.509079, lon: -46.637192 },
  { nome: "Aeroporto de Congonhas", apelidos: ["congonhas","cgh","aeroporto congonhas"], categoria: "Aeroportos e cargas", bairro: "Campo Belo", cidade: "São Paulo", lat: -23.625687, lon: -46.66123 },
  { nome: "Aeroporto de Guarulhos", apelidos: ["guarulhos","gru","cumbica","aeroporto de guarulhos"], categoria: "Aeroportos e cargas", bairro: "", cidade: "Guarulhos, SP", lat: -23.430322, lon: -46.489847 },
  { nome: "Aeroporto de Viracopos", apelidos: ["viracopos","vcp","aeroporto de campinas"], categoria: "Aeroportos e cargas", bairro: "", cidade: "Campinas, SP", lat: -23.007636, lon: -47.140662 },
  { nome: "Terminal de Cargas de Viracopos", apelidos: ["viracopos cargas","teca viracopos","cargas viracopos"], categoria: "Aeroportos e cargas", bairro: "", cidade: "Campinas, SP", lat: -23.006951, lon: -47.14454 },
  { nome: "Terminal de Cargas do Aeroporto de Guarulhos (TECA)", apelidos: ["teca gru","gru cargo","terminal de cargas guarulhos","cargas guarulhos","teca"], categoria: "Aeroportos e cargas", bairro: "", cidade: "Guarulhos, SP", lat: -23.424346, lon: -46.486047 },
  { nome: "Terminal de Cargas Fernão Dias", apelidos: ["tcfd","fernao dias cargas","terminal fernao dias"], categoria: "Aeroportos e cargas", bairro: "Vila Maria", cidade: "São Paulo", lat: -23.490868, lon: -46.562826 },

  // ===== Centros de distribuição =====
  { nome: "Correios – Centro de Tratamento de Encomendas (Cajamar)", apelidos: ["correios cajamar","cte cajamar","correios centro de tratamento"], categoria: "Centros de distribuição", bairro: "", cidade: "Cajamar, SP", lat: -23.346907, lon: -46.861664 },

  // ===== Rodoviárias =====
  { nome: "Terminal Rodoviário Barra Funda", apelidos: ["rodoviaria barra funda","terminal barra funda"], categoria: "Rodoviárias", bairro: "Barra Funda", cidade: "São Paulo", lat: -23.524896, lon: -46.667413 },
  { nome: "Terminal Rodoviário Jabaquara", apelidos: ["rodoviaria jabaquara","terminal jabaquara"], categoria: "Rodoviárias", bairro: "Jabaquara", cidade: "São Paulo", lat: -23.646051, lon: -46.64194 },
  { nome: "Terminal Rodoviário Tietê", apelidos: ["rodoviaria tiete","terminal tiete","rodoviaria","carvalho pinto"], categoria: "Rodoviárias", bairro: "Santana", cidade: "São Paulo", lat: -23.516881, lon: -46.624253 },

  // ===== Comércio =====
  { nome: "Brás (Rua Oriente)", apelidos: ["bras","rua oriente","bras compras"], categoria: "Comércio", bairro: "Brás", cidade: "São Paulo", lat: -23.53794, lon: -46.618942 },
  { nome: "Feira da Madrugada", apelidos: ["feira da madrugada","feirinha da madrugada"], categoria: "Comércio", bairro: "Brás", cidade: "São Paulo", lat: -23.538059, lon: -46.622271 },
  { nome: "Mercado Kinjo Yamato", apelidos: ["kinjo yamato","kinjo"], categoria: "Comércio", bairro: "Brás", cidade: "São Paulo", lat: -23.540828, lon: -46.629798 },
  { nome: "Mercado Municipal (Mercadão)", apelidos: ["mercadao","mercado municipal","mercado municipal paulistano"], categoria: "Comércio", bairro: "Brás", cidade: "São Paulo", lat: -23.541091, lon: -46.629172 },
  { nome: "Mercado Municipal da Lapa", apelidos: ["mercado da lapa"], categoria: "Comércio", bairro: "Lapa", cidade: "São Paulo", lat: -23.519394, lon: -46.701671 },
  { nome: "Mercado Municipal de Pinheiros", apelidos: ["mercado de pinheiros"], categoria: "Comércio", bairro: "Pinheiros", cidade: "São Paulo", lat: -23.565713, lon: -46.692404 },
  { nome: "Rua 25 de Março", apelidos: ["25 de marco","vinte e cinco de marco","rua 25"], categoria: "Comércio", bairro: "Se", cidade: "São Paulo", lat: -23.543905, lon: -46.632558 },
  { nome: "Rua José Paulino (Bom Retiro)", apelidos: ["jose paulino","bom retiro"], categoria: "Comércio", bairro: "Bom Retiro", cidade: "São Paulo", lat: -23.527891, lon: -46.640754 },
  { nome: "Rua Santa Ifigênia", apelidos: ["santa ifigenia","santa efigenia"], categoria: "Comércio", bairro: "Santa Cecilia", cidade: "São Paulo", lat: -23.538713, lon: -46.63899 },

  // ===== Pontos =====
  { nome: "Centro Empresarial de São Paulo (CENESP)", apelidos: ["cenesp"], categoria: "Pontos", bairro: "Jardim Sao Luis", cidade: "São Paulo", lat: -23.64889, lon: -46.729443 },
  { nome: "Cidade Universitária (USP)", apelidos: ["usp","cidade universitaria"], categoria: "Pontos", bairro: "Butanta", cidade: "São Paulo", lat: -23.565162, lon: -46.71248 },
  { nome: "Estação Barra Funda", apelidos: ["estacao barra funda","metro barra funda"], categoria: "Pontos", bairro: "Barra Funda", cidade: "São Paulo", lat: -23.525462, lon: -46.667513 },
  { nome: "Estação da Luz", apelidos: ["estacao da luz","luz","estacao luz"], categoria: "Pontos", bairro: "Bom Retiro", cidade: "São Paulo", lat: -23.535127, lon: -46.635361 },
  { nome: "Estação Lapa", apelidos: ["estacao lapa","estacao da lapa"], categoria: "Pontos", bairro: "Lapa", cidade: "São Paulo", lat: -23.51667, lon: -46.7 },
  { nome: "Hospital das Clínicas", apelidos: ["hc","hospital das clinicas"], categoria: "Pontos", bairro: "Jardim Paulista", cidade: "São Paulo", lat: -23.558217, lon: -46.668916 },
  { nome: "Hospital Israelita Albert Einstein", apelidos: ["einstein","albert einstein"], categoria: "Pontos", bairro: "Barra Funda", cidade: "São Paulo", lat: -23.532938, lon: -46.675475 },
  { nome: "Hospital Sírio-Libanês", apelidos: ["sirio libanes","sirio"], categoria: "Pontos", bairro: "Consolacao", cidade: "São Paulo", lat: -23.557277, lon: -46.653818 },
  { nome: "MASP", apelidos: ["masp","museu de arte de sao paulo"], categoria: "Pontos", bairro: "Jardim Paulista", cidade: "São Paulo", lat: -23.561501, lon: -46.656044 },
  { nome: "Parque da Juventude", apelidos: ["parque da juventude"], categoria: "Pontos", bairro: "Vila Guilherme", cidade: "São Paulo", lat: -23.507789, lon: -46.620102 },
  { nome: "Parque Ibirapuera", apelidos: ["ibirapuera","parque ibirapuera","parque do ibirapuera"], categoria: "Pontos", bairro: "Moema", cidade: "São Paulo", lat: -23.588306, lon: -46.658794 },
  { nome: "Parque Villa-Lobos", apelidos: ["villa lobos","vila lobos","parque villa lobos"], categoria: "Pontos", bairro: "Jaguare", cidade: "São Paulo", lat: -23.543477, lon: -46.726014 },
  { nome: "Ponte das Bandeiras", apelidos: ["ponte das bandeiras"], categoria: "Pontos", bairro: "Bom Retiro", cidade: "São Paulo", lat: -23.520191, lon: -46.629998 },
  { nome: "Ponte do Limão", apelidos: ["ponte do limao"], categoria: "Pontos", bairro: "Limao", cidade: "São Paulo", lat: -23.515054, lon: -46.666747 },
  { nome: "Praça da Sé (Marco Zero)", apelidos: ["praca da se","marco zero","catedral da se"], categoria: "Pontos", bairro: "Se", cidade: "São Paulo", lat: -23.54916, lon: -46.633069 },
  { nome: "PUC-SP (campus Ipiranga)", apelidos: ["puc ipiranga","puc sp ipiranga"], categoria: "Pontos", bairro: "Ipiranga", cidade: "São Paulo", lat: -23.593001, lon: -46.609513 },
  { nome: "Santa Casa de São Paulo", apelidos: ["santa casa"], categoria: "Pontos", bairro: "Santa Cecilia", cidade: "São Paulo", lat: -23.543164, lon: -46.650089 },
  { nome: "Sesc Pompeia", apelidos: ["sesc pompeia"], categoria: "Pontos", bairro: "Barra Funda", cidade: "São Paulo", lat: -23.526098, lon: -46.683372 },
  { nome: "Teatro Municipal", apelidos: ["teatro municipal","theatro municipal"], categoria: "Pontos", bairro: "Republica", cidade: "São Paulo", lat: -23.545361, lon: -46.638711 },
  { nome: "Universidade Presbiteriana Mackenzie", apelidos: ["mackenzie"], categoria: "Pontos", bairro: "Republica", cidade: "São Paulo", lat: -23.548078, lon: -46.650058 },
  { nome: "Zoológico de São Paulo", apelidos: ["zoologico","zoo","zoologico de sao paulo"], categoria: "Pontos", bairro: "", cidade: "São Paulo", lat: -23.653164, lon: -46.617503 },

  // ===== Shoppings =====
  { nome: "Bourbon Shopping Pompeia", apelidos: ["bourbon","bourbon pompeia"], categoria: "Shoppings", bairro: "Barra Funda", cidade: "São Paulo", lat: -23.526347, lon: -46.681114 },
  { nome: "Golden Square Shopping", apelidos: ["golden square"], categoria: "Shoppings", bairro: "", cidade: "São Bernardo do Campo, SP", lat: -23.683943, lon: -46.558044 },
  { nome: "Grand Plaza Shopping", apelidos: ["grand plaza","santo andre shopping"], categoria: "Shoppings", bairro: "Utinga", cidade: "Santo André, SP", lat: -23.648597, lon: -46.532733 },
  { nome: "Iguatemi Alphaville", apelidos: ["iguatemi alphaville","alphaville shopping"], categoria: "Shoppings", bairro: "", cidade: "Barueri, SP", lat: -23.504073, lon: -46.848586 },
  { nome: "Internacional Shopping Guarulhos", apelidos: ["internacional shopping","shopping guarulhos"], categoria: "Shoppings", bairro: "", cidade: "Guarulhos, SP", lat: -23.48853, lon: -46.5494 },
  { nome: "Lar Center", apelidos: ["lar center","shopping lar center"], categoria: "Shoppings", bairro: "Pari", cidade: "São Paulo", lat: -23.515429, lon: -46.6147 },
  { nome: "Mooca Plaza Shopping", apelidos: ["mooca plaza"], categoria: "Shoppings", bairro: "Ipiranga", cidade: "São Paulo", lat: -23.580022, lon: -46.594329 },
  { nome: "Morumbi Shopping", apelidos: ["morumbi shopping","shopping morumbi"], categoria: "Shoppings", bairro: "Itaim Bibi", cidade: "São Paulo", lat: -23.623383, lon: -46.698609 },
  { nome: "Osasco Plaza Shopping", apelidos: ["osasco plaza"], categoria: "Shoppings", bairro: "", cidade: "Osasco, SP", lat: -23.529507, lon: -46.777994 },
  { nome: "Raposo Shopping", apelidos: ["raposo shopping"], categoria: "Shoppings", bairro: "Rio Pequeno", cidade: "São Paulo", lat: -23.588455, lon: -46.751049 },
  { nome: "Shopping ABC", apelidos: ["shopping abc"], categoria: "Shoppings", bairro: "", cidade: "Santo André, SP", lat: -23.668297, lon: -46.534662 },
  { nome: "Shopping Anália Franco", apelidos: ["analia franco"], categoria: "Shoppings", bairro: "Vila Formosa", cidade: "São Paulo", lat: -23.561279, lon: -46.559927 },
  { nome: "Shopping Bonsucesso", apelidos: ["bonsucesso"], categoria: "Shoppings", bairro: "Jardim Presidente Dutra", cidade: "Guarulhos, SP", lat: -23.433976, lon: -46.403676 },
  { nome: "Shopping Butantã", apelidos: ["shopping butanta"], categoria: "Shoppings", bairro: "Butanta", cidade: "São Paulo", lat: -23.584784, lon: -46.72486 },
  { nome: "Shopping Campo Limpo", apelidos: ["campo limpo shopping"], categoria: "Shoppings", bairro: "Campo Limpo", cidade: "São Paulo", lat: -23.649896, lon: -46.757321 },
  { nome: "Shopping Center 3", apelidos: ["center 3"], categoria: "Shoppings", bairro: "Consolacao", cidade: "São Paulo", lat: -23.558211, lon: -46.658686 },
  { nome: "Shopping Center Norte", apelidos: ["center norte"], categoria: "Shoppings", bairro: "Pari", cidade: "São Paulo", lat: -23.515711, lon: -46.619882 },
  { nome: "Shopping Cidade Jardim", apelidos: ["cidade jardim shopping"], categoria: "Shoppings", bairro: "Itaim Bibi", cidade: "São Paulo", lat: -23.599033, lon: -46.69757 },
  { nome: "Shopping Cidade São Paulo", apelidos: ["shopping cidade sao paulo"], categoria: "Shoppings", bairro: "Vila Bela Vista", cidade: "São Paulo", lat: -23.563962, lon: -46.652905 },
  { nome: "Shopping D", apelidos: ["shopping d"], categoria: "Shoppings", bairro: "Pari", cidade: "São Paulo", lat: -23.520883, lon: -46.622918 },
  { nome: "Shopping Eldorado", apelidos: ["eldorado"], categoria: "Shoppings", bairro: "Pinheiros", cidade: "São Paulo", lat: -23.571683, lon: -46.696377 },
  { nome: "Shopping Frei Caneca", apelidos: ["shopping frei caneca"], categoria: "Shoppings", bairro: "Vila Bela Vista", cidade: "São Paulo", lat: -23.554091, lon: -46.652456 },
  { nome: "Shopping Granja Viana", apelidos: ["granja viana","granja vianna"], categoria: "Shoppings", bairro: "Raposo Tavares", cidade: "Cotia, SP", lat: -23.592591, lon: -46.833472 },
  { nome: "Shopping Ibirapuera", apelidos: ["shopping ibirapuera"], categoria: "Shoppings", bairro: "Moema", cidade: "São Paulo", lat: -23.610459, lon: -46.666725 },
  { nome: "Shopping Iguatemi São Paulo", apelidos: ["iguatemi","iguatemi faria lima"], categoria: "Shoppings", bairro: "Pinheiros", cidade: "São Paulo", lat: -23.576729, lon: -46.687486 },
  { nome: "Shopping Interlagos", apelidos: ["shopping interlagos","interlagos shopping"], categoria: "Shoppings", bairro: "Campo Grande", cidade: "São Paulo", lat: -23.676205, lon: -46.676655 },
  { nome: "Shopping Interlar Aricanduva", apelidos: ["interlar aricanduva","interlar"], categoria: "Shoppings", bairro: "Aricanduva", cidade: "São Paulo", lat: -23.562051, lon: -46.502655 },
  { nome: "Shopping Jardim Sul", apelidos: ["jardim sul"], categoria: "Shoppings", bairro: "Vila Andrade", cidade: "São Paulo", lat: -23.631143, lon: -46.735938 },
  { nome: "Shopping JK Iguatemi", apelidos: ["jk iguatemi","jk"], categoria: "Shoppings", bairro: "Itaim Bibi", cidade: "São Paulo", lat: -23.592247, lon: -46.689543 },
  { nome: "Shopping Leste Aricanduva", apelidos: ["aricanduva","shopping aricanduva","leste aricanduva"], categoria: "Shoppings", bairro: "Aricanduva", cidade: "São Paulo", lat: -23.566069, lon: -46.50383 },
  { nome: "Shopping Light", apelidos: ["shopping light"], categoria: "Shoppings", bairro: "Republica", cidade: "São Paulo", lat: -23.546653, lon: -46.638765 },
  { nome: "Shopping Maia", apelidos: ["shopping maia","parque shopping maia"], categoria: "Shoppings", bairro: "", cidade: "Guarulhos, SP", lat: -23.44339, lon: -46.540004 },
  { nome: "Shopping Market Place", apelidos: ["market place"], categoria: "Shoppings", bairro: "", cidade: "São Paulo", lat: -23.621536, lon: -46.699751 },
  { nome: "Shopping Metrô Boulevard Tatuapé", apelidos: ["boulevard tatuape","boulevard tatuape metro"], categoria: "Shoppings", bairro: "Tatuape", cidade: "São Paulo", lat: -23.53889, lon: -46.575606 },
  { nome: "Shopping Metrô Itaquera", apelidos: ["shopping itaquera","metro itaquera"], categoria: "Shoppings", bairro: "Artur Alvim", cidade: "São Paulo", lat: -23.540731, lon: -46.470661 },
  { nome: "Shopping Metrô Santa Cruz", apelidos: ["metro santa cruz","shopping santa cruz"], categoria: "Shoppings", bairro: "Moema", cidade: "São Paulo", lat: -23.598907, lon: -46.636841 },
  { nome: "Shopping Metrô Tatuapé", apelidos: ["metro tatuape","shopping tatuape"], categoria: "Shoppings", bairro: "Belenzinho", cidade: "São Paulo", lat: -23.541769, lon: -46.576663 },
  { nome: "Shopping Metrô Tucuruvi", apelidos: ["shopping tucuruvi","metro tucuruvi"], categoria: "Shoppings", bairro: "Tucuruvi", cidade: "São Paulo", lat: -23.480712, lon: -46.603015 },
  { nome: "Shopping Metrópole", apelidos: ["shopping metropole","sao bernardo shopping"], categoria: "Shoppings", bairro: "", cidade: "São Bernardo do Campo, SP", lat: -23.693822, lon: -46.550463 },
  { nome: "Shopping Morumbi Town", apelidos: ["morumbi town"], categoria: "Shoppings", bairro: "Vila Andrade", cidade: "São Paulo", lat: -23.631414, lon: -46.737521 },
  { nome: "Shopping Nações Unidas", apelidos: ["nacoes unidas shopping"], categoria: "Shoppings", bairro: "Itaim Bibi", cidade: "São Paulo", lat: -23.610409, lon: -46.696967 },
  { nome: "Shopping Pátio Higienópolis", apelidos: ["patio higienopolis","higienopolis"], categoria: "Shoppings", bairro: "Consolacao", cidade: "São Paulo", lat: -23.541508, lon: -46.657256 },
  { nome: "Shopping Pátio Paulista", apelidos: ["patio paulista","shopping paulista"], categoria: "Shoppings", bairro: "Liberdade", cidade: "São Paulo", lat: -23.570603, lon: -46.643229 },
  { nome: "Shopping Penha", apelidos: ["shopping penha"], categoria: "Shoppings", bairro: "Tatuape", cidade: "São Paulo", lat: -23.525297, lon: -46.547123 },
  { nome: "Shopping Plaza Sul", apelidos: ["plaza sul"], categoria: "Shoppings", bairro: "Vila da Saúde", cidade: "São Paulo", lat: -23.61978, lon: -46.62677 },
  { nome: "Shopping SP Market", apelidos: ["sp market"], categoria: "Shoppings", bairro: "Socorro", cidade: "São Paulo", lat: -23.679091, lon: -46.699633 },
  { nome: "Shopping Taboão", apelidos: ["shopping taboao"], categoria: "Shoppings", bairro: "", cidade: "Taboão da Serra, SP", lat: -23.614849, lon: -46.775503 },
  { nome: "Shopping Tamboré", apelidos: ["tambore"], categoria: "Shoppings", bairro: "", cidade: "Barueri, SP", lat: -23.504965, lon: -46.833916 },
  { nome: "Shopping União de Osasco", apelidos: ["uniao osasco","shopping uniao"], categoria: "Shoppings", bairro: "", cidade: "Osasco, SP", lat: -23.538097, lon: -46.765196 },
  { nome: "Shopping Vila Olímpia", apelidos: ["vila olimpia shopping"], categoria: "Shoppings", bairro: "Itaim Bibi", cidade: "São Paulo", lat: -23.595451, lon: -46.686641 },
  { nome: "Shopping Villa-Lobos", apelidos: ["shopping villa lobos"], categoria: "Shoppings", bairro: "Alto de Pinheiros", cidade: "São Paulo", lat: -23.550968, lon: -46.721963 },
  { nome: "Shopping West Plaza", apelidos: ["west plaza"], categoria: "Shoppings", bairro: "Barra Funda", cidade: "São Paulo", lat: -23.526849, lon: -46.674572 },
  { nome: "Tietê Plaza Shopping", apelidos: ["tiete plaza"], categoria: "Shoppings", bairro: "Vila Anastácio", cidade: "São Paulo", lat: -23.506407, lon: -46.718124 }
];
