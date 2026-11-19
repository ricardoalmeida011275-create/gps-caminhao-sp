// LISTA DE BLOQUEIOS: erros do mapa gratuito (OpenStreetMap) que a rota sempre respeita.
//
// Como funciona: o app pede a rota normalmente. Se a rota fizer uma das manobras abaixo,
// o app coloca uma barreira bem pequena no lugar e pede a rota de novo.
// Quem segue reto pela avenida não é afetado.
//
// Para aumentar a lista: copie um bloco { ... }, cole antes do "];" final e troque os dados.
//   tipo:     "conversao" (conversão proibida), "retorno" (retorno proibido) ou "ligacao" (ligação que não existe)
//   nome:     texto que aparece para o motorista
//   antes:    [longitude, latitude] de um ponto na pista de onde o veículo vem (pode apagar a linha: aí vale vindo de qualquer lado)
//   depois:   [longitude, latitude] de um ponto no caminho proibido
//   barreira: [longitude, latitude] onde o app coloca a barreira quando a rota tenta a manobra
//   raio:     tamanho da barreira em metros (pequeno, de 2 a 4, para não fechar a avenida)
// Dica: no Google Maps, aperte e segure no ponto; aparecem "latitude, longitude". Aqui vai ao contrário: [longitude, latitude].

var BLOQUEIOS_SP = [
  {
    tipo: "conversao",
    nome: "Av. José Pinheiro Borges: proibido virar à esquerda para a Rua Bento Munhoz (Itaquera)",
    antes: [-46.432370, -23.526355],     // pista sentido Radial Leste/centro, antes do canteiro
    depois: [-46.432610, -23.526390],    // Rua Bento Munhoz, lado da Rua Damásio Pinto
    barreira: [-46.432455, -23.526320],  // abertura do canteiro central
    raio: 2
  },
  {
    tipo: "retorno",
    nome: "Radial Leste (Av. Alcântara Machado) na Rua Silva Jardim: proibido cruzar ou fazer retorno pela pista central. Use a pista lateral",
    antes: [-46.592510, -23.544270],     // pista central, sentido centro, chegando na Rua Silva Jardim
    depois: [-46.592590, -23.544360],    // travessia do canteiro
    barreira: [-46.592510, -23.544270],  // pista central logo antes da travessia (obriga a usar a lateral)
    raio: 3
  },
  {
    tipo: "ligacao",
    nome: "Av. Conde de Frontin: não existe a saída para a Rua Joaquim Marra (Vila Matilde). Siga reto",
    depois: [-46.523460, -23.531900],    // a "saída" que só existe no mapa
    barreira: [-46.523460, -23.531900],
    raio: 3
  }
];
