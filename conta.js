/* =====================================================================
   Rota Liberada – conta do motorista (login, cadastro, acesso, indicação)

   - Entra com a conta Google UMA vez; o celular lembra.
   - Cadastro: nome, telefone (WhatsApp), tipo de caminhão e código de indicação (opcional).
   - Acesso: PARCEIRO (sempre liberado), TESTE (14 dias; 21 se veio indicado – números em planos.js, TESTE),
     ASSINANTE (campo pronto para a Play Store), mais os dias ganhos/dados pelo Ricardo.
   - Indique e ganhe: quem indicou ganha +7 dias quando o indicado faz a 1ª viagem.
   - Banco de dados: Firebase (plano gratuito). As regras de segurança do Firestore
     impedem o motorista de mudar o próprio acesso.
   - Sem internet: usa a última situação guardada no celular.
   ===================================================================== */
const FB = "https://www.gstatic.com/firebasejs/10.14.1/";
const CONFIG = {
  apiKey: "AIzaSyBIFG5jHC9N0KK4wAdynRnySgAY6QpBxH0",
  authDomain: "rota-liberada.firebaseapp.com",
  projectId: "rota-liberada",
  storageBucket: "rota-liberada.firebasestorage.app",
  messagingSenderId: "639607872277",
  appId: "1:639607872277:web:a9a0dad6237fc5dd0d671c"
};
const WHATS_RICARDO = "5511961950268";
const LINK_APP = "https://ricardoalmeida011275-create.github.io/gps-caminhao-sp/";
const CHAVE = "rotaCaminhaoSP.conta";          // situação guardada no celular
const CHAVE_IND = "rotaCaminhaoSP.codigoIndicacao";
const CHAVE_VIAGEM = "rotaCaminhaoSP.viagemPendente";
const DIA = 86400000;
const CAMINHOES = ["VUC", "3/4", "Toco", "Truck", "Bitruck", "Carreta", "Bitrem / Rodotrem", "Outro"];

const ler = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
const gravar = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dataCurta = (ms) => { const d = new Date(ms); return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0"); };
const ms = (t) => (t && typeof t.toMillis === "function") ? t.toMillis() : (typeof t === "number" ? t : (t ? +new Date(t) : 0));

// Código de indicação que veio no link (…/?ind=ABC234): guarda para o cadastro
(function () {
  try {
    const c = (new URLSearchParams(location.search).get("ind") || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (c.length === 6) gravar(CHAVE_IND, c);
  } catch (e) {}
})();

/* ---------- Dias do teste: configuração única em planos.js (PLANOS.TESTE) ---------- */
const testeCfg = () => (window.PLANOS && window.PLANOS.TESTE) || { DIAS_TESTE: 14, DIAS_INDICACAO: 7 };
const diasN = () => testeCfg().DIAS_TESTE;          // dias grátis de quem entra sem código
const diasI = () => testeCfg().DIAS_INDICACAO;      // a mais para o indicado; e o bônus de quem indicou
function diasDoTeste(criado, indicado) {
  if (window.PLANOS && window.PLANOS.diasDoTeste) return window.PLANOS.diasDoTeste(criado, indicado);
  return diasN() + (indicado ? diasI() : 0);
}

/* ---------- Cálculo do acesso (o painel do Ricardo usa a mesma conta) ----------
   Fim = cadastro + dias do teste (14; 21 se veio indicado); depois, em ordem de data, cada bônus
   (dado pelo Ricardo ou ganho por indicação) soma os dias a partir do maior entre o fim e a data do bônus. */
export function fimDoAcesso(m, viagensIndicados) {
  let fim = ms(m.criadoEm) + diasDoTeste(ms(m.criadoEm), !!m.indicadoPor) * DIA;
  const ev = (m.bonus || []).map((b) => ({ t: ms(b.em), dias: Number(b.dias) || 0 }))
    .concat((viagensIndicados || []).map((t) => ({ t: ms(t), dias: diasI() })))
    .sort((a, b) => a.t - b.t);
  ev.forEach((e) => { fim = Math.max(fim, e.t) + e.dias * DIA; });
  return fim;
}
function situacao(m, viagensIndicados) {
  const fim = fimDoAcesso(m, viagensIndicados);
  if (m.bloqueado) return { estado: "bloqueado", fim };
  if (m.tipo === "parceiro") return { estado: "parceiro", fim };
  if (m.tipo === "assinante" && ms(m.assinaturaAte) > Date.now()) return { estado: "assinante", fim: ms(m.assinaturaAte) };
  return { estado: fim > Date.now() ? "teste" : "vencido", fim };
}

/* ---------- Telas (por cima do app) ---------- */
const css = `
.rl-tela{position:fixed;inset:0;z-index:100000;background:#0b1a33;color:#fff;display:flex;align-items:center;justify-content:center;padding:18px;overflow:auto;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.rl-caixa{background:#fff;color:#14202e;border-radius:18px;max-width:420px;width:100%;padding:22px 18px;box-shadow:0 10px 40px rgba(0,0,0,.35)}
.rl-caixa h2{margin:0 0 8px;font-size:22px}
.rl-caixa p{margin:6px 0 12px;font-size:16px;line-height:1.4;color:#33475b}
.rl-caixa label{display:block;font-weight:700;margin:12px 0 6px;font-size:15px}
.rl-caixa input,.rl-caixa select{width:100%;box-sizing:border-box;font:inherit;font-size:17px;padding:12px;border:1px solid #c5d0dd;border-radius:12px;background:#fff;color:#14202e}
.rl-caixa .rl-chk{display:flex;gap:10px;align-items:flex-start;font-weight:500;font-size:14px}
.rl-caixa .rl-chk input{width:22px;height:22px;flex:none;margin-top:1px}
.rl-btn{display:block;width:100%;box-sizing:border-box;margin-top:14px;font:inherit;font-weight:800;font-size:18px;padding:15px;border:0;border-radius:14px;background:#ffd400;color:#0b1a33;cursor:pointer;text-align:center;text-decoration:none}
.rl-btn.rl-sec{background:#e8eef6;color:#0b3d7a;font-size:16px;padding:12px}
.rl-btn.rl-zap{background:#1f7a3d;color:#fff}
.rl-btn.rl-google{background:#fff;color:#14202e;border:2px solid #c5d0dd;display:flex;gap:10px;align-items:center;justify-content:center}
.rl-btn:disabled{opacity:.6}
.rl-erro{color:#b71c1c;font-weight:700;min-height:1.2em;margin-top:10px}
.rl-logo{font-size:44px;text-align:center}
.rl-mini{font-size:13px!important;color:#5d6f82!important}
.rl-codigo{font-size:30px;font-weight:900;letter-spacing:4px;text-align:center;background:#fff7cc;border:2px dashed #e0b800;border-radius:12px;padding:10px;margin:8px 0;color:#0b1a33}
.rl-menu-info{padding:6px 4px 2px;font-size:15px;line-height:1.4}
.rl-menu-info b{font-size:16px}
`;
let telaEl = null;
function tela(html) {
  if (!document.getElementById("rlCss")) { const s = document.createElement("style"); s.id = "rlCss"; s.textContent = css; document.head.appendChild(s); }
  if (!telaEl) { telaEl = document.createElement("div"); telaEl.className = "rl-tela"; telaEl.setAttribute("role", "dialog"); telaEl.setAttribute("aria-modal", "true"); document.body.appendChild(telaEl); }
  telaEl.innerHTML = '<div class="rl-caixa">' + html + "</div>";
  telaEl.hidden = false;
  return telaEl;
}
function fecharTela() { if (telaEl) { telaEl.remove(); telaEl = null; } }
const $ = (id) => document.getElementById(id);
const linkZap = (texto) => "https://wa.me/" + WHATS_RICARDO + "?text=" + encodeURIComponent(texto);

function telaCarregando(texto) {
  tela('<div class="rl-logo">🚚</div><h2 style="text-align:center">Rota Liberada</h2><p style="text-align:center">' + esc(texto || "Abrindo…") + "</p>");
}
function telaSemInternet(tentar) {
  tela('<div class="rl-logo">📶</div><h2>Sem internet</h2><p>Para entrar pela primeira vez, o celular precisa estar conectado. Depois o app abre mesmo sem internet.</p>' +
    '<button class="rl-btn" id="rlTentar">Tentar de novo</button>');
  $("rlTentar").onclick = tentar;
}

/* ---------- Firebase (carrega só quando precisa) ---------- */
let fb = null;
async function carregarFirebase() {
  if (fb) return fb;
  const [a, au, fs] = await Promise.all([import(FB + "firebase-app.js"), import(FB + "firebase-auth.js"), import(FB + "firebase-firestore.js")]);
  const app = a.initializeApp(CONFIG);
  fb = { au, fs, auth: au.getAuth(app), db: fs.getFirestore(app) };
  return fb;
}
function usuarioAtual() {
  return new Promise((ok) => { const pare = fb.au.onAuthStateChanged(fb.auth, (u) => { pare(); ok(u); }); });
}

/* ---------- Abertura do app ---------- */
let conta = ler(CHAVE);   // { uid, nome, codigo, tipo, bloqueado, fim, estado, indicadoPor, primeiraViagem, ts }
async function iniciar() {
  // Já tem conta guardada e liberada: o app abre na hora e confere em segundo plano
  const liberadoNoCelular = conta && conta.uid && podeUsar(conta);
  if (!liberadoNoCelular) telaCarregando();
  try {
    await carregarFirebase();
    const u = await usuarioAtual();
    if (!u) { gravar(CHAVE, null); conta = null; telaLogin(); return; }
    await atualizarConta(u);
  } catch (e) {
    // Sem internet (ou Firebase fora do ar): vale o que está guardado
    if (liberadoNoCelular) { montarMenu(); return; }
    if (conta && conta.uid) { mostrarSituacao(); return; }
    telaSemInternet(() => iniciar());
  }
}
function podeUsar(c) {
  if (c.bloqueado) return false;
  if (c.estado === "parceiro") return true;
  return c.fim > Date.now();
}
async function atualizarConta(u) {
  const { fs, db } = fb;
  const snap = await fs.getDoc(fs.doc(db, "motoristas", u.uid));
  if (!snap.exists()) { telaCadastro(u); return; }
  const m = snap.data();
  // Indicações deste motorista que já viajaram (cada uma vale +7 dias – PLANOS.TESTE.DIAS_INDICACAO)
  let viagens = [], indicados = 0;
  try {
    const q = await fs.getDocs(fs.query(fs.collection(db, "indicacoes"), fs.where("de", "==", u.uid)));
    q.forEach((d) => { indicados++; if (d.data().viagemEm) viagens.push(d.data().viagemEm); });
  } catch (e) {}
  const s = situacao(m, viagens);
  conta = { uid: u.uid, nome: m.nome, codigo: m.codigo, tipo: m.tipo, bloqueado: !!m.bloqueado, estado: s.estado, fim: s.fim,
            indicadoPor: m.indicadoPor || "", primeiraViagem: !!m.primeiraViagemEm, indicados, indicadosViajaram: viagens.length, ts: Date.now() };
  gravar(CHAVE, conta);
  if (!conta.primeiraViagem && ler(CHAVE_VIAGEM)) marcarViagem();   // viagem feita sem internet
  depoisDoLogin();   // envia marcações de local perigoso guardadas e baixa os pontos aprovados
  mostrarSituacao();
}
function mostrarSituacao() {
  montarMenu();
  if (podeUsar(conta)) { fecharTela(); return; }
  if (conta.bloqueado) { telaBloqueado(); return; }
  // Cobrança ligada (planos.js): o teste acabou, mas o app NÃO trava. As funções GRÁTIS continuam e as PLUS mostram o cadeado 🔒.
  if (window.PLANOS && window.PLANOS.COBRANCA_LIGADA) { fecharTela(); avisoPlanoGratis(); return; }
  telaVencido();
}
function avisoPlanoGratis() {
  if (sessionStorage.getItem("rlAvisoGratis")) return;
  sessionStorage.setItem("rlAvisoGratis", "1");
  const t = document.createElement("div");
  t.className = "rl-faixa-gratis";
  t.style.cssText = "position:fixed;left:10px;right:10px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:99990;background:#0b1a33;color:#fff;border-radius:14px;padding:12px 14px;font:600 15px/1.35 system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.35)";
  t.innerHTML = "🔒 Seu teste grátis acabou. As funções grátis continuam; as PLUS mostram o cadeado. " +
    '<a style="color:#8fd3ff" target="_blank" rel="noopener" href="' + linkZap("Oi Ricardo, quero assinar o Rota Liberada Plus.") + '">Assinar para liberar</a> ' +
    '<button type="button" style="margin-left:6px;background:#ffffff22;color:#fff;border:0;border-radius:8px;padding:4px 10px;font:inherit">OK</button>';
  t.querySelector("button").onclick = () => t.remove();
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 15000);
}

/* ---------- Login ---------- */
function telaLogin(erro) {
  tela('<div class="rl-logo">🚚</div><h2>Bem-vindo ao Rota Liberada</h2>' +
    "<p>GPS de caminhão que respeita as restrições de São Paulo. Entre com a sua conta Google para começar. É só uma vez: depois o app lembra.</p>" +
    '<p><b>Novos motoristas ganham ' + diasN() + ' dias grátis</b> (' + (diasN() + diasI()) + ' dias se vierem indicados por um amigo).</p>' +
    '<button class="rl-btn rl-google" id="rlGoogle"><svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg> Entrar com Google</button>' +
    '<div class="rl-erro" id="rlErro">' + esc(erro || "") + "</div>" +
    '<p class="rl-mini">Usamos seu nome, telefone e tipo de caminhão só para liberar o acesso e falar com você. Veja a <a href="privacidade.html">política de privacidade</a>.</p>');
  $("rlGoogle").onclick = async function () {
    this.disabled = true; $("rlErro").textContent = "";
    try {
      await carregarFirebase();
      const r = await fb.au.signInWithPopup(fb.auth, new fb.au.GoogleAuthProvider());
      telaCarregando("Entrando…");
      await atualizarConta(r.user);
    } catch (e) {
      const c = (e && e.code) || "";
      telaLogin(c.includes("popup-closed") || c.includes("cancelled") ? "Login cancelado. Toque de novo para entrar."
        : c.includes("network") ? "Sem internet. Conecte e tente de novo." : "Não deu para entrar agora. Tente de novo.");
    }
  };
}

/* ---------- Cadastro (primeira vez) ---------- */
function telaCadastro(u, erro, dados) {
  const d = dados || { nome: u.displayName || "", tel: "", caminhao: "", codigo: ler(CHAVE_IND) || "", aceite: true };
  tela("<h2>🚚 Seu cadastro</h2><p>Falta pouco. Preencha uma vez só.</p>" +
    '<label for="rlNome">Seu nome</label><input id="rlNome" autocomplete="name" maxlength="60" value="' + esc(d.nome) + '">' +
    '<label for="rlTel">Telefone (WhatsApp) com DDD</label><input id="rlTel" type="tel" inputmode="tel" autocomplete="tel" placeholder="11 98765-4321" value="' + esc(d.tel) + '">' +
    '<label for="rlCam">Tipo de caminhão</label><select id="rlCam"><option value="">Escolha…</option>' +
      CAMINHOES.map((c) => '<option' + (c === d.caminhao ? " selected" : "") + ">" + esc(c) + "</option>").join("") + "</select>" +
    '<label for="rlCod">Código de quem indicou (se tiver)</label><input id="rlCod" maxlength="6" autocapitalize="characters" placeholder="Ex.: K7M2QX" value="' + esc(d.codigo) + '">' +
    '<p class="rl-mini">Veio indicado? Ganha ' + diasI() + ' dias a mais (' + (diasN() + diasI()) + ' no total).</p>' +
    '<label class="rl-chk"><input type="checkbox" id="rlAceite"' + (d.aceite ? " checked" : "") + "> Aceito receber novidades do app pelo WhatsApp (pode cancelar quando quiser).</label>" +
    '<div class="rl-erro" id="rlErro">' + esc(erro || "") + "</div>" +
    '<button class="rl-btn" id="rlSalvar">Começar</button>' +
    '<button class="rl-btn rl-sec" id="rlSair">Usar outra conta Google</button>');
  $("rlSair").onclick = sair;
  $("rlSalvar").onclick = async function () {
    const nome = $("rlNome").value.replace(/\s+/g, " ").trim();
    let tel = $("rlTel").value.replace(/\D/g, "");
    if (tel.length === 10 || tel.length === 11) tel = "55" + tel;
    const caminhao = $("rlCam").value;
    const codigo = $("rlCod").value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const aceite = $("rlAceite").checked;
    const dd = { nome, tel: $("rlTel").value, caminhao, codigo, aceite };
    if (nome.length < 2) return void ($("rlErro").textContent = "Escreva o seu nome.");
    if (!/^55\d{10,11}$/.test(tel)) return void ($("rlErro").textContent = "Confira o telefone: DDD + número, ex.: 11 98765-4321.");
    if (!caminhao) return void ($("rlErro").textContent = "Escolha o tipo de caminhão.");
    if (codigo && codigo.length !== 6) return void ($("rlErro").textContent = "O código de indicação tem 6 letras/números. Confira ou deixe em branco.");
    this.disabled = true; this.textContent = "Salvando…";
    try {
      await criarCadastro(u, { nome, tel, caminhao, codigo, aceite });
      gravar(CHAVE_IND, null);
      if (aceite) avisarCentral(nome, tel);
      await atualizarConta(u);
    } catch (e) {
      telaCadastro(u, (e && e.mensagem) || "Não deu para salvar agora. Confira a internet e tente de novo.", dd);
    }
  };
}
function erro(msg) { const e = new Error(msg); e.mensagem = msg; return e; }
function novoCodigo() {
  const L = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", a = new Uint8Array(6);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => L[b % L.length]).join("");
}
async function criarCadastro(u, c) {
  const { fs, db } = fb;
  if ((await fs.getDoc(fs.doc(db, "telefones", c.tel))).exists())
    throw erro("Este telefone já tem cadastro. Entre com a mesma conta Google de antes, ou fale com o Ricardo.");
  let indicadoPor = "";
  if (c.codigo) {
    const ci = await fs.getDoc(fs.doc(db, "codigos", c.codigo));
    if (!ci.exists()) throw erro("Código de indicação não encontrado. Confira as letras ou deixe em branco.");
    indicadoPor = ci.data().uid;
    if (indicadoPor === u.uid) indicadoPor = "";
  }
  const parceiro = (await fs.getDoc(fs.doc(db, "parceirosPre", c.tel))).exists();
  let codigo = novoCodigo();
  for (let i = 0; i < 4 && (await fs.getDoc(fs.doc(db, "codigos", codigo))).exists(); i++) codigo = novoCodigo();
  const b = fs.writeBatch(db);
  b.set(fs.doc(db, "motoristas", u.uid), {
    nome: c.nome, telefone: c.tel, caminhao: c.caminhao, tipo: parceiro ? "parceiro" : "teste", bloqueado: false,
    criadoEm: fs.serverTimestamp(), codigo, indicadoPor, primeiraViagemEm: null, bonus: [], assinaturaAte: null,
    email: u.email || "", aceiteWhats: !!c.aceite
  });
  b.set(fs.doc(db, "telefones", c.tel), { uid: u.uid });
  b.set(fs.doc(db, "codigos", codigo), { uid: u.uid });
  if (indicadoPor) b.set(fs.doc(db, "indicacoes", u.uid), { de: indicadoPor, criadoEm: fs.serverTimestamp(), viagemEm: null });
  await b.commit();
}
// Também deixa o nome e o WhatsApp na central antiga (lista de contatos do painel), como o cadastro de antes
function avisarCentral(nome, tel) {
  try {
    const id = localStorage.getItem("rotaCaminhaoSP.aparelho");
    if (!id) return;
    localStorage.setItem("rotaCaminhaoSP.cadastro", JSON.stringify({ nome, whats: tel, enviado: false }));
    fetch("https://gps.topvtrine.com/app.php", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "cadastro", id, nome, whats: tel, aceite: true }) })
      .then((r) => { if (r.ok) localStorage.setItem("rotaCaminhaoSP.cadastro", JSON.stringify({ nome, whats: tel, enviado: true })); })
      .catch(() => {});
  } catch (e) {}
}
async function sair() {
  try { await carregarFirebase(); await fb.au.signOut(fb.auth); } catch (e) {}
  gravar(CHAVE, null); conta = null;
  const m = $("secConta"); if (m) m.remove();
  const i = $("secIndique"); if (i) i.remove();
  telaLogin();
}

/* ---------- Teste acabou / bloqueado ---------- */
function telaVencido() {
  tela('<div class="rl-logo">⏳</div><h2>Seu teste acabou</h2>' +
    "<p>Obrigado por testar o Rota Liberada! Para continuar usando, assine o app.</p>" +
    '<button class="rl-btn" id="rlAssinar">Assinar</button>' +
    '<div id="rlBreve" hidden><p style="margin-top:14px"><b>Em breve</b> a assinatura estará disponível. Fale com o Ricardo pelo WhatsApp:</p>' +
    '<a class="rl-btn rl-zap" target="_blank" rel="noopener" href="' + linkZap("Oi Ricardo, meu teste do Rota Liberada acabou e quero continuar usando.") + '">WhatsApp do Ricardo</a></div>' +
    '<button class="rl-btn rl-sec" id="rlIndicar">🎁 Indique e ganhe ' + diasI() + ' dias</button>' +
    '<button class="rl-btn rl-sec" id="rlAtualizar">Já falei com o Ricardo – conferir de novo</button>' +
    '<button class="rl-btn rl-sec" id="rlSair">Sair desta conta</button>');
  $("rlAssinar").onclick = () => { $("rlBreve").hidden = false; $("rlAssinar").hidden = true; };
  $("rlIndicar").onclick = () => telaIndicar(true);
  $("rlAtualizar").onclick = conferirDeNovo;
  $("rlSair").onclick = sair;
}
function telaBloqueado() {
  tela('<div class="rl-logo">🚫</div><h2>Acesso bloqueado</h2><p>Seu acesso ao Rota Liberada está bloqueado. Fale com o Ricardo pelo WhatsApp.</p>' +
    '<a class="rl-btn rl-zap" target="_blank" rel="noopener" href="' + linkZap("Oi Ricardo, meu acesso ao Rota Liberada está bloqueado.") + '">WhatsApp do Ricardo</a>' +
    '<button class="rl-btn rl-sec" id="rlAtualizar">Conferir de novo</button>' +
    '<button class="rl-btn rl-sec" id="rlSair">Sair desta conta</button>');
  $("rlAtualizar").onclick = conferirDeNovo;
  $("rlSair").onclick = sair;
}
async function conferirDeNovo() {
  telaCarregando("Conferindo…");
  try { await carregarFirebase(); const u = await usuarioAtual(); if (!u) return telaLogin(); await atualizarConta(u); }
  catch (e) { mostrarSituacao(); }
}

/* ---------- Indique e ganhe ---------- */
function textoIndicacao() {
  return "Fala! Estou usando o Rota Liberada, GPS de caminhão que respeita as restrições de São Paulo (ZMRC, rodízio e horários da CET).\n\n" +
    "Baixe pelo link: " + LINK_APP + "?ind=" + conta.codigo + "\n\n" +
    "No cadastro, use meu código " + conta.codigo + " e ganhe " + (diasN() + diasI()) + " dias grátis em vez de " + diasN() + ".";
}
function telaIndicar(voltarVencido) {
  tela("<h2>🎁 Indique e ganhe " + diasI() + " dias</h2>" +
    "<p>Mande o app para um amigo caminhoneiro. Ele ganha <b>" + (diasN() + diasI()) + " dias grátis</b> (" + diasI() + " a mais) e você ganha <b>+" + diasI() + " dias</b> quando ele fizer a primeira viagem.</p>" +
    '<p class="rl-mini" style="margin-bottom:0">Seu código:</p><div class="rl-codigo">' + esc(conta.codigo) + "</div>" +
    '<p class="rl-mini">Indicados: ' + (conta.indicados || 0) + " · já viajaram: " + (conta.indicadosViajaram || 0) + (conta.estado === "parceiro" ? " · Você é parceiro: seu acesso já é liberado, mas a indicação conta no painel." : "") + "</p>" +
    '<a class="rl-btn rl-zap" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(textoIndicacao()) + '">Enviar pelo WhatsApp</a>' +
    '<button class="rl-btn rl-sec" id="rlVoltar">Voltar</button>');
  $("rlVoltar").onclick = () => voltarVencido ? telaVencido() : fecharTela();
}

/* ---------- Menu ☰: "Seu acesso" e "Indique e ganhe" ---------- */
function textoAcesso(c) {
  if (c.bloqueado) return "Seu acesso: bloqueado";
  if (c.estado === "parceiro") return "Seu acesso: Parceiro";
  if (c.estado === "assinante") return "Seu acesso: Assinante até " + dataCurta(c.fim);
  return c.fim > Date.now() ? "Seu acesso vai até " + dataCurta(c.fim) : "Seu teste acabou";
}
function montarMenu() {
  const corpo = $("menuCorpo");
  if (!corpo || !conta) return;
  if (!document.getElementById("rlCss")) { const s = document.createElement("style"); s.id = "rlCss"; s.textContent = css; document.head.appendChild(s); }
  let a = $("secConta");
  if (!a) {
    a = document.createElement("details"); a.className = "menu-grupo sem-rotulo"; a.id = "secConta";
    a.innerHTML = '<summary class="menu-item"><span class="mi-icone" aria-hidden="true">🔑</span><span class="mi-texto" id="rlAcessoTxt"></span></summary>' +
      '<div class="menu-conteudo"><div class="rl-menu-info" id="rlContaInfo"></div><button type="button" class="btn-pequeno" id="rlSairMenu">Sair desta conta</button></div>';
    corpo.insertBefore(a, corpo.firstChild);
    $("rlSairMenu").onclick = () => { if (confirm("Sair da sua conta neste celular? Para voltar, é só entrar de novo com o Google.")) sair(); };
    const i = document.createElement("button"); i.type = "button"; i.className = "menu-item"; i.id = "secIndique";
    i.innerHTML = '<span class="mi-icone" aria-hidden="true">🎁</span><span class="mi-texto">Indique e ganhe ' + diasI() + ' dias<small>Seu código e envio pelo WhatsApp</small></span>';
    i.onclick = () => { const f = $("menuFundo"); if (f) f.hidden = true; telaIndicar(false); };
    corpo.insertBefore(i, a.nextSibling);
  }
  $("rlAcessoTxt").innerHTML = esc(textoAcesso(conta)) + "<small>" + esc(conta.nome || "") + "</small>";
  $("rlContaInfo").innerHTML = "<b>" + esc(conta.nome || "") + "</b><br>" + esc(textoAcesso(conta)) +
    "<br>Seu código de indicação: <b>" + esc(conta.codigo || "–") + "</b>";
}

/* ---------- 1ª viagem: libera o bônus de quem indicou ---------- */
async function marcarViagem() {
  if (!conta || conta.primeiraViagem) return;
  gravar(CHAVE_VIAGEM, true);
  try {
    await carregarFirebase();
    const u = await usuarioAtual(); if (!u) return;
    const { fs, db } = fb;
    const b = fs.writeBatch(db);
    b.update(fs.doc(db, "motoristas", u.uid), { primeiraViagemEm: fs.serverTimestamp() });
    if (conta.indicadoPor) b.update(fs.doc(db, "indicacoes", u.uid), { viagemEm: fs.serverTimestamp() });
    await b.commit();
    conta.primeiraViagem = true; gravar(CHAVE, conta); gravar(CHAVE_VIAGEM, null);
  } catch (e) { /* tenta de novo na próxima abertura */ }
}

/* ---------- Áreas de risco: "Tentativa de roubo / local perigoso" ----------
   A marcação vai para riscoMarcas (só o Ricardo lê e aprova no painel). Sem internet, fica na fila do celular.
   Os pontos aprovados (riscoPontos, valem 90 dias) aparecem no mapa de todos. */
const CHAVE_RISCO_FILA = "rotaCaminhaoSP.riscoFila", CHAVE_PONTOS = "rotaCaminhaoSP.pontosRisco";
async function enviarRiscos() {
  const fila = ler(CHAVE_RISCO_FILA) || [];
  if (!fila.length) return true;
  await carregarFirebase();
  const u = await usuarioAtual(); if (!u) return false;
  const { fs, db } = fb;
  while (fila.length) {
    const r = fila[0];
    await fs.addDoc(fs.collection(db, "riscoMarcas"), {
      uid: u.uid, nome: String((conta && conta.nome) || u.displayName || "").slice(0, 60),
      lat: r.lat, lon: r.lon, marcadoEm: r.em, criadoEm: fs.serverTimestamp(), situacao: "pendente"
    });
    fila.shift(); gravar(CHAVE_RISCO_FILA, fila);
  }
  return true;
}
async function marcarRisco(lat, lon) {
  const fila = ler(CHAVE_RISCO_FILA) || [];
  fila.push({ lat: +(+lat).toFixed(6), lon: +(+lon).toFixed(6), em: Date.now() });
  gravar(CHAVE_RISCO_FILA, fila.slice(-20));
  try { return await enviarRiscos(); } catch (e) { return false; }
}
async function buscarPontosRisco() {
  try {
    await carregarFirebase();
    const u = await usuarioAtual(); if (!u) return;
    const { fs, db } = fb;
    const q = await fs.getDocs(fs.query(fs.collection(db, "riscoPontos"), fs.where("ate", ">", fs.Timestamp.now())));
    const lista = [];
    q.forEach((d) => { const x = d.data(); if (typeof x.lat === "number" && typeof x.lon === "number") lista.push({ lat: x.lat, lon: x.lon, ate: ms(x.ate) }); });
    gravar(CHAVE_PONTOS, lista);
    window.dispatchEvent(new CustomEvent("rota-pontos-risco", { detail: lista }));
  } catch (e) { /* fica a lista guardada */ }
}
function depoisDoLogin() { enviarRiscos().catch(() => {}); buscarPontosRisco(); }

/* ---------- Compartilhar viagem ao vivo (aoVivo/{código}) ----------
   O link tem um código sorteado e difícil de adivinhar. Quem tem o link vê só: posição, destino e chegada.
   Para de funcionar ao chegar, ao encerrar, ao parar de compartilhar ou depois de 12 horas (regras do Firestore). */
async function dbUsuario() { await carregarFirebase(); const u = await usuarioAtual(); if (!u) throw erro("Entre na sua conta para usar esta função."); return { u, fs: fb.fs, db: fb.db }; }
async function aoVivoIniciar(codigo, d) {
  const { u, fs, db } = await dbUsuario();
  await fs.setDoc(fs.doc(db, "aoVivo", codigo), {
    uid: u.uid, nome: String((conta && conta.nome) || "").split(" ")[0].slice(0, 30), lat: d.lat, lon: d.lon,
    destino: String(d.destino || "").slice(0, 120), destLat: d.destLat == null ? null : d.destLat, destLon: d.destLon == null ? null : d.destLon,
    chegada: d.chegada || null, emergencia: !!d.emergencia, ativo: true,
    atualizadoEm: fs.serverTimestamp(), expira: fs.Timestamp.fromMillis(Date.now() + 12 * 3600000)
  });
}
async function aoVivoAtualizar(codigo, d) {
  const { fs, db } = await dbUsuario();
  const m = { lat: d.lat, lon: d.lon, chegada: d.chegada || null, atualizadoEm: fs.serverTimestamp() };
  if (d.emergencia) m.emergencia = true;
  await fs.updateDoc(fs.doc(db, "aoVivo", codigo), m);
}
async function aoVivoParar(codigo) {
  const { fs, db } = await dbUsuario();
  await fs.updateDoc(fs.doc(db, "aoVivo", codigo), { ativo: false, atualizadoEm: fs.serverTimestamp() });
}

/* ---------- "Como é entregar aqui" (dicasEntrega) ----------
   Cada dica fica numa "célula" de ~200 m; o app busca a célula do endereço e as vizinhas. */
const celulaDica = (lat, lon) => Math.round(lat / 0.002) + "_" + Math.round(lon / 0.002);
function celulasVizinhas(lat, lon) {
  const a = Math.round(lat / 0.002), b = Math.round(lon / 0.002), l = [];
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) l.push((a + i) + "_" + (b + j));
  return l;
}
async function salvarDica(d) {
  const { u, fs, db } = await dbUsuario();
  await fs.addDoc(fs.collection(db, "dicasEntrega"), {
    uid: u.uid, lat: +(+d.lat).toFixed(5), lon: +(+d.lon).toFixed(5), celula: celulaDica(d.lat, d.lon),
    estacionar: String(d.estacionar || "").slice(0, 120), horario: String(d.horario || "").slice(0, 60),
    espera: ["rapido", "medio", "demorado", ""].includes(d.espera) ? d.espera : "",
    doca: !!d.doca, portaoBaixo: !!d.portaoBaixo, ruaApertada: !!d.ruaApertada,
    comentario: String(d.comentario || "").slice(0, 200), criadoEm: fs.serverTimestamp()
  });
}
async function dicasPerto(lat, lon) {
  const { fs, db } = await dbUsuario();
  const q = await fs.getDocs(fs.query(fs.collection(db, "dicasEntrega"), fs.where("celula", "in", celulasVizinhas(lat, lon))));
  const l = []; q.forEach((d) => l.push({ id: d.id, ...d.data(), criadoEm: ms(d.data().criadoEm) }));
  return l;
}

/* ---------- Pontos de parada: avaliações e sugestões ---------- */
async function avaliarParada(pid, d) {
  const { u, fs, db } = await dbUsuario();
  // uma avaliação por motorista por ponto (documento com o id dos dois): avaliar de novo substitui
  await fs.setDoc(fs.doc(db, "avaliacoesParada", pid + "__" + u.uid), {
    uid: u.uid, pid, nota: Math.max(1, Math.min(5, Math.round(+d.nota || 0))),
    banho: !!d.banho, comida: !!d.comida, seguranca: !!d.seguranca, pernoite: !!d.pernoite, banheiro: !!d.banheiro,
    preco: d.preco === "gratis" || d.preco === "pago" ? d.preco : "", comentario: String(d.comentario || "").slice(0, 200),
    criadoEm: fs.serverTimestamp()
  });
}
async function avaliacoesParada(pid) {
  const { fs, db } = await dbUsuario();
  const q = await fs.getDocs(fs.query(fs.collection(db, "avaliacoesParada"), fs.where("pid", "==", pid)));
  const l = []; q.forEach((d) => l.push({ ...d.data(), criadoEm: ms(d.data().criadoEm) }));
  return l;
}
async function sugerirParada(d) {
  const { u, fs, db } = await dbUsuario();
  await fs.addDoc(fs.collection(db, "paradasSugeridas"), {
    uid: u.uid, nome: String(d.nome || "").slice(0, 60), lat: +(+d.lat).toFixed(5), lon: +(+d.lon).toFixed(5),
    tipo: ["posto", "estacionamento", "parada", "descanso"].includes(d.tipo) ? d.tipo : "parada",
    obs: String(d.obs || "").slice(0, 200), situacao: "pendente", criadoEm: fs.serverTimestamp()
  });
}
async function paradasAprovadas() {
  const { fs, db } = await dbUsuario();
  const q = await fs.getDocs(fs.collection(db, "paradas"));
  const l = []; q.forEach((d) => l.push({ id: d.id, ...d.data() }));
  return l;
}
/* ---------- Alertas da CET colocados pelo Ricardo no painel (alertasCet) ---------- */
async function alertasManuais() {
  const { fs, db } = await dbUsuario();
  const q = await fs.getDocs(fs.query(fs.collection(db, "alertasCet"), fs.where("fim", ">", fs.Timestamp.now())));
  const l = []; q.forEach((d) => { const x = d.data(); l.push({ id: d.id, ...x, inicio: ms(x.inicio), fim: ms(x.fim) }); });
  return l;
}

window.RotaConta = {
  marcarRisco,
  aoVivoIniciar, aoVivoAtualizar, aoVivoParar,
  salvarDica, dicasPerto, avaliarParada, avaliacoesParada, sugerirParada, paradasAprovadas, alertasManuais,
  viagem: () => { marcarViagem(); },
  temConta: () => !!(conta && conta.uid),
  situacao: () => conta
};
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
