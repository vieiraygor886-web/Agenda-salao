// =========================================================================
// AGENDA DO SALÃO — lógica do aplicativo
// =========================================================================
// Este arquivo:
//  1. Controla a navegação entre a tela inicial e a agenda.
//  2. Desenha a semana, a lista de horários e os formulários.
//  3. Salva e lê os agendamentos no Firebase (Firestore), em tempo real.
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

const NOMES = {
  felipe: "Felipe",
  roseli: "Roseli"
};

const DIAS_ABREV = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_COMPLETO = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado"
];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

// ---------------------------------------------------------------------
// ESTADO DA APLICAÇÃO
// ---------------------------------------------------------------------
const estado = {
  profissionalAtual: null,      // "felipe" ou "roseli"
  dataSelecionada: hojeLocal(), // objeto Date (meia-noite local)
  inicioSemana: null,           // objeto Date (domingo da semana visível)
  agendamentos: [],             // cache local dos docs do profissional atual
  cancelarOuvinte: null,        // função para parar o onSnapshot anterior
  termoBusca: "",
  idEmEdicao: null              // id do agendamento sendo editado (ou null = novo)
};

// ---------------------------------------------------------------------
// ELEMENTOS DA TELA
// ---------------------------------------------------------------------
const el = {
  viewHome: document.getElementById("view-home"),
  viewAgenda: document.getElementById("view-agenda"),

  agendaNome: document.getElementById("agenda-nome"),
  btnVoltar: document.getElementById("btn-voltar"),
  btnHoje: document.getElementById("btn-hoje"),

  campoBusca: document.getElementById("campo-busca"),
  btnLimparBusca: document.getElementById("btn-limpar-busca"),

  blocoSemana: document.getElementById("bloco-semana"),
  semanaRotulo: document.getElementById("semana-rotulo"),
  faixaDias: document.getElementById("faixa-dias"),
  btnSemanaAnterior: document.getElementById("btn-semana-anterior"),
  btnSemanaSeguinte: document.getElementById("btn-semana-seguinte"),

  listaTitulo: document.getElementById("lista-titulo"),
  listaAgendamentos: document.getElementById("lista-agendamentos"),
  estadoVazio: document.getElementById("estado-vazio"),

  btnNovo: document.getElementById("btn-novo"),

  modalForm: document.getElementById("modal-form"),
  formTitulo: document.getElementById("form-titulo"),
  formAgendamento: document.getElementById("form-agendamento"),
  campoId: document.getElementById("campo-id"),
  campoData: document.getElementById("campo-data"),
  campoHorario: document.getElementById("campo-horario"),
  campoCliente: document.getElementById("campo-cliente"),
  campoTelefone: document.getElementById("campo-telefone"),
  campoServico: document.getElementById("campo-servico"),
  campoObservacao: document.getElementById("campo-observacao"),
  btnFecharForm: document.getElementById("btn-fechar-form"),
  btnCancelarForm: document.getElementById("btn-cancelar-form"),
  btnExcluirDoForm: document.getElementById("btn-excluir-do-form"),

  modalConfirmar: document.getElementById("modal-confirmar"),
  confirmarTexto: document.getElementById("confirmar-texto"),
  btnCancelarExcluir: document.getElementById("btn-cancelar-excluir"),
  btnConfirmarExcluir: document.getElementById("btn-confirmar-excluir"),

  toast: document.getElementById("toast")
};

let idParaExcluir = null;

// =========================================================================
// FUNÇÕES DE DATA (sempre em horário local, sem bugs de fuso horário)
// =========================================================================
function hojeLocal() {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
}

function mesmaData(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function paraISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function deISO(isoStr) {
  const [ano, mes, dia] = isoStr.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function inicioDaSemana(data) {
  const d = new Date(data);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function adicionarDias(data, qtd) {
  const d = new Date(data);
  d.setDate(d.getDate() + qtd);
  return d;
}

// =========================================================================
// NAVEGAÇÃO ENTRE TELAS
// =========================================================================
document.querySelectorAll(".btn-pessoa").forEach((btn) => {
  btn.addEventListener("click", () => abrirAgenda(btn.dataset.prof));
});

el.btnVoltar.addEventListener("click", fecharAgenda);

function abrirAgenda(prof) {
  estado.profissionalAtual = prof;
  estado.dataSelecionada = hojeLocal();
  estado.inicioSemana = inicioDaSemana(estado.dataSelecionada);
  estado.termoBusca = "";
  el.campoBusca.value = "";
  el.btnLimparBusca.hidden = true;

  el.agendaNome.textContent = NOMES[prof];
  el.viewHome.hidden = true;
  el.viewAgenda.hidden = false;

  ouvirAgendamentos(prof);
  desenharSemana();
  atualizarListaPrincipal();
}

function fecharAgenda() {
  if (estado.cancelarOuvinte) estado.cancelarOuvinte();
  el.viewAgenda.hidden = true;
  el.viewHome.hidden = false;
}

// =========================================================================
// FIREBASE — escuta em tempo real (qualquer sócio que editar, o outro vê)
// =========================================================================
function ouvirAgendamentos(prof) {
  if (estado.cancelarOuvinte) estado.cancelarOuvinte();

  const consulta = query(
    collection(db, NOME_COLECAO),
    where("profissional", "==", prof)
  );

  estado.cancelarOuvinte = onSnapshot(
    consulta,
    (snapshot) => {
      estado.agendamentos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      atualizarListaPrincipal();
      desenharSemana(); // atualiza os pontinhos de dias com agendamento
    },
    (erro) => {
      console.error(erro);
      mostrarToast("Sem conexão com a internet. Verifique a rede.");
    }
  );
}

// =========================================================================
// DESENHAR A FAIXA DA SEMANA
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
  estado.inicioSemana = inicioDaSemana(estado.dataSelecionada);
  limparBusca();
  desenharSemana();
  atualizarListaPrincipal();
});

function desenharSemana() {
  const hoje = hojeLocal();
  const fimSemana = adicionarDias(estado.inicioSemana, 6);

  el.semanaRotulo.textContent =
    estado.inicioSemana.getMonth() === fimSemana.getMonth()
      ? `${estado.inicioSemana.getDate()} a ${fimSemana.getDate()} de ${MESES[fimSemana.getMonth()]}`
      : `${estado.inicioSemana.getDate()} de ${MESES[estado.inicioSemana.getMonth()]} a ${fimSemana.getDate()} de ${MESES[fimSemana.getMonth()]}`;

  el.faixaDias.innerHTML = "";

  for (let i = 0; i < 7; i++) {
    const data = adicionarDias(estado.inicioSemana, i);
    const temAgendamento = estado.agendamentos.some((a) => a.data === paraISO(data));

    const pill = document.createElement("button");
    pill.className = "dia-pill";
    if (mesmaData(data, hoje)) pill.classList.add("hoje");
    if (mesmaData(data, estado.dataSelecionada) && !estado.termoBusca) {
      pill.classList.add("selecionado");
    }

    pill.innerHTML = `
      <span class="dia-pill-abrev">${DIAS_ABREV[i]}</span>
      <span class="dia-pill-numero">${data.getDate()}</span>
      ${temAgendamento ? '<span class="dia-pill-ponto"></span>' : ""}
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
// BUSCA POR NOME DA CLIENTE
// =========================================================================
function normalizar(txt) {
  return (txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

el.campoBusca.addEventListener("input", () => {
  estado.termoBusca = el.campoBusca.value.trim();
  el.btnLimparBusca.hidden = estado.termoBusca.length === 0;
  desenharSemana();
  atualizarListaPrincipal();
});

el.btnLimparBusca.addEventListener("click", () => {
  limparBusca();
  desenharSemana();
  atualizarListaPrincipal();
});

function limparBusca() {
  estado.termoBusca = "";
  el.campoBusca.value = "";
  el.btnLimparBusca.hidden = true;
}

// =========================================================================
// LISTA PRINCIPAL (DIA SELECIONADO OU RESULTADOS DA BUSCA)
// =========================================================================
function atualizarListaPrincipal() {
  if (estado.termoBusca) {
    el.blocoSemana.style.display = "none";
    const termo = normalizar(estado.termoBusca);
    const resultados = estado.agendamentos
      .filter((a) => normalizar(a.cliente).includes(termo))
      .sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario));

    el.listaTitulo.textContent = `Resultados para "${estado.termoBusca}"`;
    renderizarCartoes(resultados, true);
  } else {
    el.blocoSemana.style.display = "";
    const iso = paraISO(estado.dataSelecionada);
    const doDia = estado.agendamentos
      .filter((a) => a.data === iso)
      .sort((a, b) => a.horario.localeCompare(b.horario));

    const hoje = hojeLocal();
    const prefixo = mesmaData(estado.dataSelecionada, hoje) ? "Hoje, " : "";
    el.listaTitulo.textContent =
      `${prefixo}${DIAS_COMPLETO[estado.dataSelecionada.getDay()]}, ${estado.dataSelecionada.getDate()} de ${MESES[estado.dataSelecionada.getMonth()]}`;

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

  lista.forEach((ag) => {
    const cartao = document.createElement("div");
    cartao.className = `cartao-agendamento prof-${estado.profissionalAtual}`;

    const partesDetalhe = [];
    if (ag.servico) partesDetalhe.push(ag.servico);
    if (ag.telefone) partesDetalhe.push(ag.telefone);

    const dataFormatada = mostrarData ? formatarDataCurta(deISO(ag.data)) : "";

    cartao.innerHTML = `
      <div class="cartao-horario">${ag.horario}</div>
      <div class="cartao-corpo">
        <div class="cartao-cliente">${escaparHTML(ag.cliente)}</div>
        ${partesDetalhe.length ? `<div class="cartao-detalhe">${escaparHTML(partesDetalhe.join(" · "))}</div>` : ""}
        ${ag.observacao ? `<div class="cartao-detalhe">📝 ${escaparHTML(ag.observacao)}</div>` : ""}
        ${dataFormatada ? `<span class="cartao-data-busca">${dataFormatada}</span>` : ""}
      </div>
      <div class="cartao-acoes">
        <button class="btn-editar" aria-label="Editar">✏️</button>
        <button class="btn-excluir" aria-label="Excluir">🗑️</button>
      </div>
    `;

    cartao.querySelector(".btn-editar").addEventListener("click", () => abrirFormEdicao(ag));
    cartao.querySelector(".btn-excluir").addEventListener("click", () => abrirConfirmacaoExclusao(ag));

    el.listaAgendamentos.appendChild(cartao);
  });
}

function formatarDataCurta(data) {
  return `${data.getDate()} de ${MESES[data.getMonth()]}`;
}

function escaparHTML(txt) {
  const div = document.createElement("div");
  div.textContent = txt || "";
  return div.innerHTML;
}

// =========================================================================
// FORMULÁRIO: NOVO / EDITAR AGENDAMENTO
// =========================================================================
el.btnNovo.addEventListener("click", abrirFormNovo);
el.btnFecharForm.addEventListener("click", fecharForm);
el.btnCancelarForm.addEventListener("click", fecharForm);

function abrirFormNovo() {
  estado.idEmEdicao = null;
  el.formTitulo.textContent = "Novo agendamento";
  el.formAgendamento.reset();
  el.campoId.value = "";
  el.campoData.value = paraISO(estado.dataSelecionada);
  el.btnExcluirDoForm.hidden = true;
  abrirOverlay(el.modalForm);
  setTimeout(() => el.campoCliente.focus(), 250);
}

function abrirFormEdicao(ag) {
  estado.idEmEdicao = ag.id;
  el.formTitulo.textContent = "Editar agendamento";
  el.campoId.value = ag.id;
  el.campoData.value = ag.data;
  el.campoHorario.value = ag.horario;
  el.campoCliente.value = ag.cliente || "";
  el.campoTelefone.value = ag.telefone || "";
  el.campoServico.value = ag.servico || "";
  el.campoObservacao.value = ag.observacao || "";
  el.btnExcluirDoForm.hidden = false;
  abrirOverlay(el.modalForm);
}

function fecharForm() {
  fecharOverlay(el.modalForm);
}

el.formAgendamento.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const dados = {
    profissional: estado.profissionalAtual,
    data: el.campoData.value,
    horario: el.campoHorario.value,
    cliente: el.campoCliente.value.trim(),
    telefone: el.campoTelefone.value.trim(),
    servico: el.campoServico.value.trim(),
    observacao: el.campoObservacao.value.trim()
  };

  if (!dados.cliente || !dados.data || !dados.horario) {
    mostrarToast("Preencha data, horário e nome da cliente.");
    return;
  }

  const botaoSalvar = el.formAgendamento.querySelector(".btn-primario");
  botaoSalvar.disabled = true;
  botaoSalvar.textContent = "Salvando…";

  try {
    if (estado.idEmEdicao) {
      await updateDoc(doc(db, NOME_COLECAO, estado.idEmEdicao), dados);
      mostrarToast("Agendamento atualizado ✓");
    } else {
      dados.criadoEm = serverTimestamp();
      await addDoc(collection(db, NOME_COLECAO), dados);
      mostrarToast("Agendamento salvo ✓");
    }
    fecharForm();
  } catch (erro) {
    console.error(erro);
    mostrarToast("Não foi possível salvar. Verifique a internet.");
  } finally {
    botaoSalvar.disabled = false;
    botaoSalvar.textContent = "Salvar";
  }
});

// Excluir a partir de dentro do formulário de edição
el.btnExcluirDoForm.addEventListener("click", () => {
  const ag = estado.agendamentos.find((a) => a.id === estado.idEmEdicao);
  if (ag) {
    fecharForm();
    setTimeout(() => abrirConfirmacaoExclusao(ag), 200);
  }
});

// =========================================================================
// CONFIRMAÇÃO DE EXCLUSÃO
// =========================================================================
function abrirConfirmacaoExclusao(ag) {
  idParaExcluir = ag.id;
  el.confirmarTexto.textContent =
    `Excluir o agendamento de ${ag.cliente}, às ${ag.horario}${ag.data ? " no dia " + formatarDataCurta(deISO(ag.data)) : ""}? Esta ação não pode ser desfeita.`;
  abrirOverlay(el.modalConfirmar);
}

el.btnCancelarExcluir.addEventListener("click", () => {
  idParaExcluir = null;
  fecharOverlay(el.modalConfirmar);
});

el.btnConfirmarExcluir.addEventListener("click", async () => {
  if (!idParaExcluir) return;
  const id = idParaExcluir;
  idParaExcluir = null;

  try {
    await deleteDoc(doc(db, NOME_COLECAO, id));
    mostrarToast("Agendamento excluído");
  } catch (erro) {
    console.error(erro);
    mostrarToast("Não foi possível excluir. Verifique a internet.");
  } finally {
    fecharOverlay(el.modalConfirmar);
  }
});

// =========================================================================
// OVERLAYS (ABRIR / FECHAR MODAIS)
// =========================================================================
function abrirOverlay(elemento) {
  elemento.hidden = false;
}

function fecharOverlay(elemento) {
  elemento.hidden = true;
}

[el.modalForm, el.modalConfirmar].forEach((overlay) => {
  overlay.addEventListener("click", (evento) => {
    if (evento.target === overlay) fecharOverlay(overlay);
  });
});

// =========================================================================
// TOAST (mensagens rápidas no rodapé)
// =========================================================================
let timerToast = null;
function mostrarToast(mensagem) {
  el.toast.textContent = mensagem;
  el.toast.classList.add("mostrar");
  if (timerToast) clearTimeout(timerToast);
  timerToast = setTimeout(() => el.toast.classList.remove("mostrar"), 3200);
}
