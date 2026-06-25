// =========================================================================
// AGENDA DO SALÃO — lógica do aplicativo (versão 2)
// Novidades: visão mensal, WhatsApp, pacotes, confirmação de presença
// =========================================================================

import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const NOME_COLECAO = "agendamentos";

const NOMES = { felipe: "Filipe", roseli: "Roseli" };

const DIAS_ABREV    = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const DIAS_COMPLETO = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
const MESES         = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

// ---------------------------------------------------------------------
// ESTADO
// ---------------------------------------------------------------------
const estado = {
  profissionalAtual: null,
  dataSelecionada:   hojeLocal(),
  inicioSemana:      null,
  mesAtual:          null,   // { ano, mes } para visão mensal
  visao:             "semana", // "semana" | "mes"
  agendamentos:      [],
  cancelarOuvinte:   null,
  termoBusca:        "",
  idEmEdicao:        null
};

// ---------------------------------------------------------------------
// ELEMENTOS
// ---------------------------------------------------------------------
const el = {
  viewHome:    document.getElementById("view-home"),
  viewAgenda:  document.getElementById("view-agenda"),
  agendaNome:  document.getElementById("agenda-nome"),
  btnVoltar:   document.getElementById("btn-voltar"),
  btnHoje:     document.getElementById("btn-hoje"),

  campoBusca:     document.getElementById("campo-busca"),
  btnLimparBusca: document.getElementById("btn-limpar-busca"),

  blocoSemana:        document.getElementById("bloco-semana"),
  semanaRotulo:       document.getElementById("semana-rotulo"),
  faixaDias:          document.getElementById("faixa-dias"),
  btnSemanaAnterior:  document.getElementById("btn-semana-anterior"),
  btnSemanaSeguinte:  document.getElementById("btn-semana-seguinte"),
  btnVisSemana:       document.getElementById("btn-vis-semana"),
  btnVisMes:          document.getElementById("btn-vis-mes"),
  gradeMes:           document.getElementById("grade-mes"),

  listaTitulo:       document.getElementById("lista-titulo"),
  listaAgendamentos: document.getElementById("lista-agendamentos"),
  estadoVazio:       document.getElementById("estado-vazio"),
  btnNovo:           document.getElementById("btn-novo"),

  modalForm:        document.getElementById("modal-form"),
  formTitulo:       document.getElementById("form-titulo"),
  formAgendamento:  document.getElementById("form-agendamento"),
  campoId:          document.getElementById("campo-id"),
  campoData:        document.getElementById("campo-data"),
  campoHorario:     document.getElementById("campo-horario"),
  campoCliente:     document.getElementById("campo-cliente"),
  campoTelefone:    document.getElementById("campo-telefone"),
  campoServico:     document.getElementById("campo-servico"),
  campoTemPacote:   document.getElementById("campo-tem-pacote"),
  secaoPacote:      document.getElementById("secao-pacote"),
  campoPacoteDesc:  document.getElementById("campo-pacote-desc"),
  campoVisitaPacote:document.getElementById("campo-visita-pacote"),
  campoObservacao:  document.getElementById("campo-observacao"),
  btnFecharForm:    document.getElementById("btn-fechar-form"),
  btnCancelarForm:  document.getElementById("btn-cancelar-form"),
  btnExcluirDoForm: document.getElementById("btn-excluir-do-form"),

  modalConfirmar:      document.getElementById("modal-confirmar"),
  confirmarTexto:      document.getElementById("confirmar-texto"),
  btnCancelarExcluir:  document.getElementById("btn-cancelar-excluir"),
  btnConfirmarExcluir: document.getElementById("btn-confirmar-excluir"),

  toast: document.getElementById("toast")
};

let idParaExcluir = null;

// =========================================================================
// FUNÇÕES DE DATA
// =========================================================================
function hojeLocal() {
  const a = new Date();
  return new Date(a.getFullYear(), a.getMonth(), a.getDate());
}

function mesmaData(a, b) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

function paraISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function deISO(s) {
  const [a,m,d] = s.split("-").map(Number);
  return new Date(a, m-1, d);
}

function inicioDaSemana(d) {
  const c = new Date(d);
  c.setDate(c.getDate() - c.getDay());
  return c;
}

function adicionarDias(d, n) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

// =========================================================================
// NAVEGAÇÃO
// =========================================================================
document.querySelectorAll(".btn-pessoa").forEach(b =>
  b.addEventListener("click", () => abrirAgenda(b.dataset.prof))
);
el.btnVoltar.addEventListener("click", fecharAgenda);

function abrirAgenda(prof) {
  estado.profissionalAtual = prof;
  estado.dataSelecionada   = hojeLocal();
  estado.inicioSemana      = inicioDaSemana(estado.dataSelecionada);
  estado.mesAtual          = { ano: estado.dataSelecionada.getFullYear(), mes: estado.dataSelecionada.getMonth() };
  estado.visao             = "semana";
  estado.termoBusca        = "";
  el.campoBusca.value      = "";
  el.btnLimparBusca.hidden = true;
  el.agendaNome.textContent = NOMES[prof];
  el.viewHome.hidden   = true;
  el.viewAgenda.hidden = false;
  ouvirAgendamentos(prof);
  aplicarVisao();
  atualizarListaPrincipal();
}

function fecharAgenda() {
  if (estado.cancelarOuvinte) estado.cancelarOuvinte();
  el.viewAgenda.hidden = true;
  el.viewHome.hidden   = false;
}

// =========================================================================
// FIREBASE
// =========================================================================
function ouvirAgendamentos(prof) {
  if (estado.cancelarOuvinte) estado.cancelarOuvinte();
  const q = query(collection(db, NOME_COLECAO), where("profissional","==",prof));
  estado.cancelarOuvinte = onSnapshot(q,
    snap => {
      estado.agendamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      aplicarVisao();
      atualizarListaPrincipal();
    },
    err => { console.error(err); mostrarToast("Sem conexão. Verifique a rede."); }
  );
}

// =========================================================================
// TOGGLE VISÃO SEMANA / MÊS
// =========================================================================
el.btnVisSemana.addEventListener("click", () => {
  estado.visao = "semana";
  aplicarVisao();
  atualizarListaPrincipal();
});

el.btnVisMes.addEventListener("click", () => {
  estado.visao = "mes";
  estado.mesAtual = { ano: estado.dataSelecionada.getFullYear(), mes: estado.dataSelecionada.getMonth() };
  aplicarVisao();
  atualizarListaPrincipal();
});

function aplicarVisao() {
  const semana = estado.visao === "semana";
  el.btnVisSemana.classList.toggle("ativo", semana);
  el.btnVisMes.classList.toggle("ativo", !semana);
  el.faixaDias.hidden = !semana;
  el.btnSemanaAnterior.hidden = !semana;
  el.btnSemanaSeguinte.hidden = !semana;
  el.gradeMes.hidden = semana;

  if (semana) {
    desenharSemana();
  } else {
    desenharMes();
  }
}

// =========================================================================
// SEMANA
// =========================================================================
el.btnSemanaAnterior.addEventListener("click", () => {
  estado.inicioSemana = adicionarDias(estado.inicioSemana, -7);
  desenharSemana();
});
el.btnSemanaSeguinte.addEventListener("click", () => {
  estado.inicioSemana = adicionarDias(estado.inicioSemana, 7);
  desenharSemana();
});
el.btnHoje.addEventListener("click", () => {
  estado.dataSelecionada = hojeLocal();
  estado.inicioSemana    = inicioDaSemana(estado.dataSelecionada);
  estado.mesAtual        = { ano: estado.dataSelecionada.getFullYear(), mes: estado.dataSelecionada.getMonth() };
  limparBusca();
  aplicarVisao();
  atualizarListaPrincipal();
});

function desenharSemana() {
  const hoje    = hojeLocal();
  const fimSem  = adicionarDias(estado.inicioSemana, 6);
  el.semanaRotulo.textContent =
    estado.inicioSemana.getMonth() === fimSem.getMonth()
      ? `${estado.inicioSemana.getDate()} a ${fimSem.getDate()} de ${MESES[fimSem.getMonth()]}`
      : `${estado.inicioSemana.getDate()} de ${MESES[estado.inicioSemana.getMonth()]} a ${fimSem.getDate()} de ${MESES[fimSem.getMonth()]}`;

  el.faixaDias.innerHTML = "";
  for (let i = 0; i < 7; i++) {
    const data = adicionarDias(estado.inicioSemana, i);
    const temAg = estado.agendamentos.some(a => a.data === paraISO(data));
    const pill  = document.createElement("button");
    pill.className = "dia-pill";
    if (mesmaData(data, hoje)) pill.classList.add("hoje");
    if (mesmaData(data, estado.dataSelecionada) && !estado.termoBusca) pill.classList.add("selecionado");
    pill.innerHTML = `
      <span class="dia-pill-abrev">${DIAS_ABREV[data.getDay()]}</span>
      <span class="dia-pill-numero">${data.getDate()}</span>
      ${temAg ? '<span class="dia-pill-ponto"></span>' : ""}
    `;
    pill.addEventListener("click", () => {
      estado.dataSelecionada = data;
      limparBusca();
      desenharSemana();
      atualizarListaPrincipal();
    });
    el.faixaDias.appendChild(pill);
  }
}

// =========================================================================
// MÊS
// =========================================================================
function desenharMes() {
  const { ano, mes } = estado.mesAtual;
  const hoje = hojeLocal();

  // Rótulo do mês no lugar do semana-rotulo
  el.semanaRotulo.textContent = `${MESES[mes].charAt(0).toUpperCase() + MESES[mes].slice(1)} ${ano}`;

  // Navegação: reutiliza os botões de semana com novo comportamento
  el.btnSemanaAnterior.onclick = () => {
    let m = mes - 1, a = ano;
    if (m < 0) { m = 11; a--; }
    estado.mesAtual = { ano: a, mes: m };
    desenharMes();
  };
  el.btnSemanaSeguinte.onclick = () => {
    let m = mes + 1, a = ano;
    if (m > 11) { m = 0; a++; }
    estado.mesAtual = { ano: a, mes: m };
    desenharMes();
  };

  // Montar grade
  el.gradeMes.innerHTML = "";

  const cabecalho = document.createElement("div");
  cabecalho.className = "mes-cabecalho";
  DIAS_ABREV.forEach(d => {
    const s = document.createElement("span");
    s.textContent = d;
    cabecalho.appendChild(s);
  });
  el.gradeMes.appendChild(cabecalho);

  const grade = document.createElement("div");
  grade.className = "mes-grade";

  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia   = new Date(ano, mes+1, 0).getDate();
  const offset      = primeiroDia.getDay(); // 0=dom

  // Dias do mês anterior
  for (let i = 0; i < offset; i++) {
    const d = new Date(ano, mes, 1 - (offset - i));
    grade.appendChild(criarCelulaMes(d, true, hoje));
  }
  // Dias do mês atual
  for (let i = 1; i <= ultimoDia; i++) {
    const d = new Date(ano, mes, i);
    grade.appendChild(criarCelulaMes(d, false, hoje));
  }
  // Completar última semana
  const total = offset + ultimoDia;
  const resto = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let i = 1; i <= resto; i++) {
    const d = new Date(ano, mes+1, i);
    grade.appendChild(criarCelulaMes(d, true, hoje));
  }

  el.gradeMes.appendChild(grade);
}

function criarCelulaMes(data, outroMes, hoje) {
  const temAg = estado.agendamentos.some(a => a.data === paraISO(data));
  const cel   = document.createElement("div");
  cel.className = "mes-dia";
  if (outroMes) cel.classList.add("outro-mes");
  if (mesmaData(data, hoje)) cel.classList.add("hoje-mes");
  if (mesmaData(data, estado.dataSelecionada) && !estado.termoBusca) cel.classList.add("selecionado-mes");
  cel.textContent = data.getDate();
  if (temAg) {
    const ponto = document.createElement("span");
    ponto.className = "mes-ponto";
    cel.appendChild(ponto);
  }
  cel.addEventListener("click", () => {
    estado.dataSelecionada = data;
    estado.mesAtual = { ano: data.getFullYear(), mes: data.getMonth() };
    limparBusca();
    desenharMes();
    atualizarListaPrincipal();
  });
  return cel;
}

// =========================================================================
// BUSCA
// =========================================================================
function normalizar(txt) {
  return (txt||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
}

el.campoBusca.addEventListener("input", () => {
  estado.termoBusca = el.campoBusca.value.trim();
  el.btnLimparBusca.hidden = estado.termoBusca.length === 0;
  aplicarVisao();
  atualizarListaPrincipal();
});
el.btnLimparBusca.addEventListener("click", () => { limparBusca(); aplicarVisao(); atualizarListaPrincipal(); });

function limparBusca() {
  estado.termoBusca = "";
  el.campoBusca.value = "";
  el.btnLimparBusca.hidden = true;
}

// =========================================================================
// LISTA PRINCIPAL
// =========================================================================
function atualizarListaPrincipal() {
  if (estado.termoBusca) {
    el.blocoSemana.style.display = "none";
    const termo = normalizar(estado.termoBusca);
    const res   = estado.agendamentos
      .filter(a => normalizar(a.cliente).includes(termo))
      .sort((a,b) => (a.data+a.horario).localeCompare(b.data+b.horario));
    el.listaTitulo.textContent = `Resultados para "${estado.termoBusca}"`;
    renderizarCartoes(res, true);
  } else {
    el.blocoSemana.style.display = "";
    const iso   = paraISO(estado.dataSelecionada);
    const doDia = estado.agendamentos
      .filter(a => a.data === iso)
      .sort((a,b) => a.horario.localeCompare(b.horario));
    const hoje   = hojeLocal();
    const prefix = mesmaData(estado.dataSelecionada, hoje) ? "Hoje, " : "";
    el.listaTitulo.textContent = `${prefix}${DIAS_COMPLETO[estado.dataSelecionada.getDay()]}, ${estado.dataSelecionada.getDate()} de ${MESES[estado.dataSelecionada.getMonth()]}`;
    renderizarCartoes(doDia, false);
  }
}

function renderizarCartoes(lista, mostrarData) {
  el.listaAgendamentos.innerHTML = "";
  if (lista.length === 0) {
    el.estadoVazio.hidden = false;
    el.estadoVazio.querySelector("p").textContent = estado.termoBusca
      ? "Nenhuma cliente encontrada com esse nome."
      : "Nenhum agendamento por aqui ainda.";
    return;
  }
  el.estadoVazio.hidden = true;

  // Contador de visitas de pacote no mês (para cada cliente com pacote)
  const contPacote = {};
  const mesISO = paraISO(estado.dataSelecionada).slice(0,7);
  estado.agendamentos.forEach(a => {
    if (a.visitaPacote && a.data && a.data.slice(0,7) === mesISO) {
      contPacote[a.cliente] = (contPacote[a.cliente]||0) + 1;
    }
  });

  lista.forEach(ag => {
    const cartao = document.createElement("div");
    cartao.className = `cartao-agendamento prof-${estado.profissionalAtual}`;

    const partes = [];
    if (ag.servico)   partes.push(ag.servico);
    if (ag.telefone)  partes.push(ag.telefone);

    const dataFmt = mostrarData ? formatarDataCurta(deISO(ag.data)) : "";

    // Badge de pacote
    let badgePacote = "";
    if (ag.temPacote && ag.pacoteDesc) {
      const usadas = contPacote[ag.cliente] || 0;
      badgePacote = `<span class="cartao-pacote-badge">📦 ${ag.pacoteDesc} · ${usadas} visita${usadas!==1?"s":""} este mês</span>`;
    } else if (ag.visitaPacote) {
      badgePacote = `<span class="cartao-pacote-badge">📦 Visita do pacote</span>`;
    }

    // Badge presença
    const presConfirmada = ag.presencaConfirmada;
    const btnPresLabel   = presConfirmada ? "✅ Presente" : "Confirmar presença";

    cartao.innerHTML = `
      <div class="cartao-horario">${ag.horario}</div>
      <div class="cartao-corpo">
        <div class="cartao-cliente">${escaparHTML(ag.cliente)}</div>
        ${partes.length ? `<div class="cartao-detalhe">${escaparHTML(partes.join(" · "))}</div>` : ""}
        ${ag.observacao ? `<div class="cartao-detalhe">📝 ${escaparHTML(ag.observacao)}</div>` : ""}
        ${dataFmt ? `<span class="cartao-data-busca">${dataFmt}</span>` : ""}
        ${badgePacote}
      </div>
      <div class="cartao-acoes">
        <button class="btn-editar" aria-label="Editar">✏️</button>
        ${ag.telefone ? `<button class="btn-whatsapp" aria-label="WhatsApp">💬</button>` : ""}
        <button class="btn-presenca${presConfirmada?" confirmado":""}" aria-label="Confirmar presença">${btnPresLabel}</button>
        <button class="btn-excluir" aria-label="Excluir">🗑️</button>
      </div>
    `;

    cartao.querySelector(".btn-editar").addEventListener("click", () => abrirFormEdicao(ag));
    cartao.querySelector(".btn-excluir").addEventListener("click", () => abrirConfirmacaoExclusao(ag));

    const btnWA = cartao.querySelector(".btn-whatsapp");
    if (btnWA) btnWA.addEventListener("click", () => abrirWhatsApp(ag));

    cartao.querySelector(".btn-presenca").addEventListener("click", async () => {
      try {
        await updateDoc(doc(db, NOME_COLECAO, ag.id), { presencaConfirmada: !presConfirmada });
        mostrarToast(presConfirmada ? "Presença desmarcada" : "Presença confirmada ✓");
      } catch(e) { mostrarToast("Erro ao atualizar presença."); }
    });

    el.listaAgendamentos.appendChild(cartao);
  });
}

function abrirWhatsApp(ag) {
  const tel = ag.telefone.replace(/\D/g,"");
  const data = deISO(ag.data);
  const dataFmt = `${data.getDate()} de ${MESES[data.getMonth()]}`;
  const msg = encodeURIComponent(
    `Olá, ${ag.cliente}! 😊 Confirmamos seu agendamento para o dia ${dataFmt} às ${ag.horario}. Até lá!`
  );
  window.open(`https://wa.me/55${tel}?text=${msg}`, "_blank");
}

function formatarDataCurta(d) {
  return `${d.getDate()} de ${MESES[d.getMonth()]}`;
}

function escaparHTML(txt) {
  const div = document.createElement("div");
  div.textContent = txt || "";
  return div.innerHTML;
}

// =========================================================================
// FORMULÁRIO
// =========================================================================
el.campoTemPacote.addEventListener("change", () => {
  el.secaoPacote.hidden = !el.campoTemPacote.checked;
});

el.btnNovo.addEventListener("click", abrirFormNovo);
el.btnFecharForm.addEventListener("click", fecharForm);
el.btnCancelarForm.addEventListener("click", fecharForm);

function abrirFormNovo() {
  estado.idEmEdicao = null;
  el.formTitulo.textContent = "Novo agendamento";
  el.formAgendamento.reset();
  el.campoId.value      = "";
  el.campoData.value    = paraISO(estado.dataSelecionada);
  el.secaoPacote.hidden = true;
  el.btnExcluirDoForm.hidden = true;
  abrirOverlay(el.modalForm);
  setTimeout(() => el.campoCliente.focus(), 250);
}

function abrirFormEdicao(ag) {
  estado.idEmEdicao = ag.id;
  el.formTitulo.textContent   = "Editar agendamento";
  el.campoId.value            = ag.id;
  el.campoData.value          = ag.data;
  el.campoHorario.value       = ag.horario;
  el.campoCliente.value       = ag.cliente || "";
  el.campoTelefone.value      = ag.telefone || "";
  el.campoServico.value       = ag.servico || "";
  el.campoTemPacote.checked   = !!ag.temPacote;
  el.campoPacoteDesc.value    = ag.pacoteDesc || "";
  el.campoVisitaPacote.checked= !!ag.visitaPacote;
  el.secaoPacote.hidden       = !ag.temPacote;
  el.campoObservacao.value    = ag.observacao || "";
  el.btnExcluirDoForm.hidden  = false;
  abrirOverlay(el.modalForm);
}

function fecharForm() { el.modalForm.hidden = true; }

el.formAgendamento.addEventListener("submit", async (e) => {
  e.preventDefault();
  const dados = {
    profissional: estado.profissionalAtual,
    data:         el.campoData.value,
    horario:      el.campoHorario.value,
    cliente:      el.campoCliente.value.trim(),
    telefone:     el.campoTelefone.value.trim(),
    servico:      el.campoServico.value.trim(),
    temPacote:    el.campoTemPacote.checked,
    pacoteDesc:   el.campoTemPacote.checked ? el.campoPacoteDesc.value.trim() : "",
    visitaPacote: el.campoTemPacote.checked ? el.campoVisitaPacote.checked : false,
    observacao:   el.campoObservacao.value.trim()
  };
  if (!dados.cliente || !dados.data || !dados.horario) {
    mostrarToast("Preencha data, horário e nome da cliente.");
    return;
  }
  const btn = el.formAgendamento.querySelector(".btn-primario");
  btn.disabled = true; btn.textContent = "Salvando…";
  try {
    if (estado.idEmEdicao) {
      await updateDoc(doc(db, NOME_COLECAO, estado.idEmEdicao), dados);
      mostrarToast("Agendamento atualizado ✓");
    } else {
      dados.criadoEm = serverTimestamp();
      dados.presencaConfirmada = false;
      await addDoc(collection(db, NOME_COLECAO), dados);
      mostrarToast("Agendamento salvo ✓");
    }
    fecharForm();
  } catch(err) {
    console.error(err);
    mostrarToast("Não foi possível salvar. Verifique a internet.");
  } finally {
    btn.disabled = false; btn.textContent = "Salvar";
  }
});

el.btnExcluirDoForm.addEventListener("click", () => {
  const ag = estado.agendamentos.find(a => a.id === estado.idEmEdicao);
  if (ag) { fecharForm(); setTimeout(() => abrirConfirmacaoExclusao(ag), 200); }
});

// =========================================================================
// EXCLUSÃO
// =========================================================================
function abrirConfirmacaoExclusao(ag) {
  idParaExcluir = ag.id;
  el.confirmarTexto.textContent = `Excluir o agendamento de ${ag.cliente}, às ${ag.horario}${ag.data ? " no dia "+formatarDataCurta(deISO(ag.data)) : ""}? Esta ação não pode ser desfeita.`;
  el.modalForm.hidden = true;
  el.modalConfirmar.showModal();
}

el.btnCancelarExcluir.addEventListener("click", function() {
  idParaExcluir = null;
  el.modalConfirmar.close();
});

el.btnConfirmarExcluir.addEventListener("click", async function() {
  if (!idParaExcluir) return;
  const id = idParaExcluir;
  idParaExcluir = null;
  el.modalConfirmar.close();
  try {
    await deleteDoc(doc(db, NOME_COLECAO, id));
    mostrarToast("Agendamento excluído");
  } catch(err) {
    console.error(err);
    mostrarToast("Não foi possível excluir. Verifique a internet.");
  }
});

// =========================================================================
// OVERLAYS
// =========================================================================
function abrirOverlay(elemento) {
  el.modalForm.hidden = true;
  el.modalConfirmar.hidden = true;
  elemento.hidden = false;
}

function fecharOverlay(elemento) {
  elemento.hidden = true;
}

el.modalForm.addEventListener("click", function(e) {
  if (e.target === el.modalForm) el.modalForm.hidden = true;
});



// =========================================================================
// TOAST
// =========================================================================
let timerToast = null;
function mostrarToast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add("mostrar");
  if (timerToast) clearTimeout(timerToast);
  timerToast = setTimeout(() => el.toast.classList.remove("mostrar"), 3200);
}
