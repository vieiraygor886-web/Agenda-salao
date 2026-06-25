import { db } from "./firebase-config.js";
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const COLECAO = "agendamentos";
const NOMES   = { filipe: "Filipe", roseli: "Roseli" };
const DIAS_A  = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const DIAS_C  = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
const MESES   = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

const estado = {
  prof: null, dataSel: hojeLocal(), inicioSem: null,
  mesAtual: null, visao: "semana",
  ags: [], cancelar: null, busca: "", idEdit: null
};

function g(id) { return document.getElementById(id); }

const el = {
  home: g("view-home"), agenda: g("view-agenda"),
  nome: g("agenda-nome"), btnVoltar: g("btn-voltar"), btnHoje: g("btn-hoje"),
  busca: g("campo-busca"), limparBusca: g("btn-limpar-busca"),
  blocoSemana: g("bloco-semana"), rotulo: g("semana-rotulo"),
  faixaDias: g("faixa-dias"), btnAnt: g("btn-anterior"), btnSeg: g("btn-seguinte"),
  btnSemana: g("btn-vis-semana"), btnMes: g("btn-vis-mes"), gradeMes: g("grade-mes"),
  titulo: g("lista-titulo"), lista: g("lista-agendamentos"), vazio: g("estado-vazio"),
  btnNovo: g("btn-novo"),
  painelForm: g("painel-form"), fundoForm: g("fundo-form"),
  formTitulo: g("form-titulo"), form: g("form-agendamento"),
  data: g("campo-data"), horario: g("campo-horario"),
  cliente: g("campo-cliente"), telefone: g("campo-telefone"), servico: g("campo-servico"),
  temPacote: g("campo-tem-pacote"), secaoPacote: g("secao-pacote"),
  pacoteDesc: g("campo-pacote-desc"), visitaPacote: g("campo-visita-pacote"),
  obs: g("campo-observacao"),
  btnFecharForm: g("btn-fechar-form"), btnCancelarForm: g("btn-cancelar-form"),
  btnExcluir: g("btn-excluir-do-form"),
  painelConfirmar: g("painel-confirmar"), fundoConfirmar: g("fundo-confirmar"),
  confirmarTexto: g("confirmar-texto"),
  btnCancelarEx: g("btn-cancelar-excluir"), btnConfirmarEx: g("btn-confirmar-excluir"),
  toast: g("toast")
};

let idExcluir = null;

// ---- DATAS ----
function hojeLocal() {
  const a = new Date();
  return new Date(a.getFullYear(), a.getMonth(), a.getDate());
}
function mesmaData(a, b) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function toISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function fromISO(s) { const [a,m,d]=s.split("-").map(Number); return new Date(a,m-1,d); }
function pad(n) { return String(n).padStart(2,"0"); }
function addDias(d,n) { const c=new Date(d); c.setDate(c.getDate()+n); return c; }
function inicioSem(d) { const c=new Date(d); c.setDate(c.getDate()-c.getDay()); return c; }

// ---- PAINÉIS ----
function abrirForm() {
  el.painelConfirmar.hidden = true;
  el.painelForm.hidden = false;
}
function fecharForm() {
  el.painelForm.hidden = true;
}
function abrirConfirmar() {
  el.painelForm.hidden = true;
  el.painelConfirmar.hidden = false;
}
function fecharConfirmar() {
  el.painelConfirmar.hidden = true;
}

el.fundoForm.addEventListener("click", fecharForm);
el.fundoConfirmar.addEventListener("click", fecharConfirmar);
el.btnFecharForm.addEventListener("click", fecharForm);
el.btnCancelarForm.addEventListener("click", fecharForm);
el.btnCancelarEx.addEventListener("click", function() { idExcluir=null; fecharConfirmar(); });

// ---- NAVEGAÇÃO ----
document.querySelectorAll(".btn-pessoa").forEach(b =>
  b.addEventListener("click", function() { abrirAgenda(b.dataset.prof); })
);
el.btnVoltar.addEventListener("click", fecharAgenda);

function abrirAgenda(prof) {
  estado.prof = prof;
  estado.dataSel = hojeLocal();
  estado.inicioSem = inicioSem(estado.dataSel);
  estado.mesAtual = { a: estado.dataSel.getFullYear(), m: estado.dataSel.getMonth() };
  estado.visao = "semana";
  estado.busca = "";
  el.busca.value = "";
  el.limparBusca.hidden = true;
  el.nome.textContent = NOMES[prof];
  el.home.hidden = true;
  el.agenda.hidden = false;
  ouvirAgs(prof);
  desenhar();
  renderLista();
}

function fecharAgenda() {
  if (estado.cancelar) estado.cancelar();
  el.agenda.hidden = true;
  el.home.hidden = false;
}

// ---- FIREBASE ----
function ouvirAgs(prof) {
  if (estado.cancelar) estado.cancelar();
  const q = query(collection(db, COLECAO), where("profissional","==",prof));
  estado.cancelar = onSnapshot(q,
    snap => { estado.ags = snap.docs.map(d=>({id:d.id,...d.data()})); desenhar(); renderLista(); },
    err => { console.error(err); toast("Sem conexão. Verifique a rede."); }
  );
}

// ---- TOGGLE VISÃO ----
el.btnSemana.addEventListener("click", function() { estado.visao="semana"; desenhar(); renderLista(); });
el.btnMes.addEventListener("click", function() {
  estado.visao="mes";
  estado.mesAtual={a:estado.dataSel.getFullYear(),m:estado.dataSel.getMonth()};
  desenhar(); renderLista();
});
el.btnHoje.addEventListener("click", function() {
  estado.dataSel=hojeLocal();
  estado.inicioSem=inicioSem(estado.dataSel);
  estado.mesAtual={a:estado.dataSel.getFullYear(),m:estado.dataSel.getMonth()};
  limparBusca(); desenhar(); renderLista();
});

function desenhar() {
  const sem = estado.visao==="semana";
  el.btnSemana.classList.toggle("ativo",sem);
  el.btnMes.classList.toggle("ativo",!sem);
  el.faixaDias.hidden = !sem;
  el.btnAnt.hidden = false;
  el.btnSeg.hidden = false;
  el.gradeMes.hidden = sem;
  if (sem) desenharSemana(); else desenharMes();
}

// ---- SEMANA ----
el.btnAnt.addEventListener("click", function() {
  if (estado.visao==="semana") {
    estado.inicioSem = addDias(estado.inicioSem,-7);
    desenharSemana();
  } else {
    let {a,m} = estado.mesAtual;
    m--; if(m<0){m=11;a--;} estado.mesAtual={a,m}; desenharMes();
  }
});
el.btnSeg.addEventListener("click", function() {
  if (estado.visao==="semana") {
    estado.inicioSem = addDias(estado.inicioSem,7);
    desenharSemana();
  } else {
    let {a,m} = estado.mesAtual;
    m++; if(m>11){m=0;a++;} estado.mesAtual={a,m}; desenharMes();
  }
});

function desenharSemana() {
  const hoje = hojeLocal();
  const fim  = addDias(estado.inicioSem,6);
  el.rotulo.textContent =
    estado.inicioSem.getMonth()===fim.getMonth()
      ? `${estado.inicioSem.getDate()} a ${fim.getDate()} de ${MESES[fim.getMonth()]}`
      : `${estado.inicioSem.getDate()} de ${MESES[estado.inicioSem.getMonth()]} a ${fim.getDate()} de ${MESES[fim.getMonth()]}`;

  el.faixaDias.innerHTML = "";
  for (let i=0;i<7;i++) {
    const d    = addDias(estado.inicioSem,i);
    const temAg= estado.ags.some(a=>a.data===toISO(d));
    const pill = document.createElement("button");
    pill.type  = "button";
    pill.className = "dia-pill";
    if (mesmaData(d,hoje)) pill.classList.add("hoje");
    if (mesmaData(d,estado.dataSel)&&!estado.busca) pill.classList.add("selecionado");
    pill.innerHTML = `<span class="dia-pill-abrev">${DIAS_A[d.getDay()]}</span><span class="dia-pill-numero">${d.getDate()}</span>${temAg?'<span class="dia-pill-ponto"></span>':""}`;
    pill.addEventListener("click", function() {
      estado.dataSel=d; limparBusca(); desenharSemana(); renderLista();
    });
    el.faixaDias.appendChild(pill);
  }
}

// ---- MÊS ----
function desenharMes() {
  const {a,m} = estado.mesAtual;
  const hoje  = hojeLocal();
  el.rotulo.textContent = `${MESES[m].charAt(0).toUpperCase()+MESES[m].slice(1)} ${a}`;
  el.gradeMes.innerHTML = "";

  const cab = document.createElement("div"); cab.className="mes-cabecalho";
  DIAS_A.forEach(d=>{const s=document.createElement("span");s.textContent=d;cab.appendChild(s);});
  el.gradeMes.appendChild(cab);

  const grade = document.createElement("div"); grade.className="mes-grade";
  const prim  = new Date(a,m,1);
  const ult   = new Date(a,m+1,0).getDate();
  const off   = prim.getDay();

  for(let i=0;i<off;i++) grade.appendChild(celMes(new Date(a,m,1-(off-i)),true,hoje));
  for(let i=1;i<=ult;i++) grade.appendChild(celMes(new Date(a,m,i),false,hoje));
  const resto=(off+ult)%7===0?0:7-(off+ult)%7;
  for(let i=1;i<=resto;i++) grade.appendChild(celMes(new Date(a,m+1,i),true,hoje));

  el.gradeMes.appendChild(grade);
}

function celMes(d,outro,hoje) {
  const temAg=estado.ags.some(a=>a.data===toISO(d));
  const c=document.createElement("div"); c.className="mes-dia";
  if(outro) c.classList.add("outro-mes");
  if(mesmaData(d,hoje)) c.classList.add("hoje-mes");
  if(mesmaData(d,estado.dataSel)&&!estado.busca) c.classList.add("selecionado-mes");
  c.textContent=d.getDate();
  if(temAg){const p=document.createElement("span");p.className="mes-ponto";c.appendChild(p);}
  c.addEventListener("click",function(){
    estado.dataSel=d; estado.mesAtual={a:d.getFullYear(),m:d.getMonth()};
    limparBusca(); desenharMes(); renderLista();
  });
  return c;
}

// ---- BUSCA ----
el.busca.addEventListener("input",function(){
  estado.busca=el.busca.value.trim();
  el.limparBusca.hidden=estado.busca.length===0;
  desenhar(); renderLista();
});
el.limparBusca.addEventListener("click",function(){ limparBusca(); desenhar(); renderLista(); });
function limparBusca(){ estado.busca=""; el.busca.value=""; el.limparBusca.hidden=true; }
function norm(t){ return (t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""); }

// ---- LISTA ----
function renderLista() {
  if (estado.busca) {
    el.blocoSemana.style.display="none";
    const t=norm(estado.busca);
    const r=estado.ags.filter(a=>norm(a.cliente).includes(t)).sort((a,b)=>(a.data+a.horario).localeCompare(b.data+b.horario));
    el.titulo.textContent=`Resultados para "${estado.busca}"`;
    renderCartoes(r,true);
  } else {
    el.blocoSemana.style.display="";
    const iso=toISO(estado.dataSel);
    const dia=estado.ags.filter(a=>a.data===iso).sort((a,b)=>a.horario.localeCompare(b.horario));
    const hoje=hojeLocal();
    const pre=mesmaData(estado.dataSel,hoje)?"Hoje, ":"";
    el.titulo.textContent=`${pre}${DIAS_C[estado.dataSel.getDay()]}, ${estado.dataSel.getDate()} de ${MESES[estado.dataSel.getMonth()]}`;
    renderCartoes(dia,false);
  }
}

function renderCartoes(lista,mostrarData) {
  el.lista.innerHTML="";
  if(!lista.length){
    el.vazio.hidden=false;
    el.vazio.querySelector("p").textContent=estado.busca?"Nenhuma cliente encontrada.":"Nenhum agendamento por aqui ainda.";
    return;
  }
  el.vazio.hidden=true;

  const mesISO=toISO(estado.dataSel).slice(0,7);
  const cont={};
  estado.ags.forEach(a=>{ if(a.visitaPacote&&a.data&&a.data.slice(0,7)===mesISO) cont[a.cliente]=(cont[a.cliente]||0)+1; });

  lista.forEach(function(ag) {
    const c=document.createElement("div");
    c.className=`cartao-agendamento prof-${estado.prof}`;

    const partes=[];
    if(ag.servico) partes.push(ag.servico);
    if(ag.telefone) partes.push(ag.telefone);

    const dataFmt=mostrarData?`${fromISO(ag.data).getDate()} de ${MESES[fromISO(ag.data).getMonth()]}` :"";

    let badge="";
    if(ag.temPacote&&ag.pacoteDesc){
      const u=cont[ag.cliente]||0;
      badge=`<span class="cartao-pacote-badge">📦 ${esc(ag.pacoteDesc)} · ${u} visita${u!==1?"s":""} este mês</span>`;
    } else if(ag.visitaPacote){
      badge=`<span class="cartao-pacote-badge">📦 Visita do pacote</span>`;
    }

    const pres=ag.presencaConfirmada;

    c.innerHTML=`
      <div class="cartao-horario">${ag.horario}</div>
      <div class="cartao-corpo">
        <div class="cartao-cliente">${esc(ag.cliente)}</div>
        ${partes.length?`<div class="cartao-detalhe">${esc(partes.join(" · "))}</div>`:""}
        ${ag.observacao?`<div class="cartao-detalhe">📝 ${esc(ag.observacao)}</div>`:""}
        ${dataFmt?`<span class="cartao-data-busca">${dataFmt}</span>`:""}
        ${badge}
      </div>
      <div class="cartao-acoes">
        <button class="btn-editar" type="button">✏️</button>
        ${ag.telefone?`<button class="btn-whatsapp" type="button">💬</button>`:""}
        <button class="btn-presenca${pres?" confirmado":""}" type="button">${pres?"✅ Presente":"Confirmar presença"}</button>
        <button class="btn-excluir" type="button">🗑️</button>
      </div>`;

    c.querySelector(".btn-editar").addEventListener("click",function(){ editarAg(ag); });
    c.querySelector(".btn-excluir").addEventListener("click",function(){ confirmarExcluir(ag); });
    if(ag.telefone) c.querySelector(".btn-whatsapp").addEventListener("click",function(){ abrirWA(ag); });
    c.querySelector(".btn-presenca").addEventListener("click",async function(){
      try { await updateDoc(doc(db,COLECAO,ag.id),{presencaConfirmada:!pres}); toast(pres?"Presença desmarcada":"Presença confirmada ✓"); }
      catch(e){ toast("Erro ao atualizar."); }
    });

    el.lista.appendChild(c);
  });
}

function esc(t){ const d=document.createElement("div"); d.textContent=t||""; return d.innerHTML; }

function abrirWA(ag) {
  const tel=ag.telefone.replace(/\D/g,"");
  const d=fromISO(ag.data);
  const msg=encodeURIComponent(`Olá, ${ag.cliente}! 😊 Confirmamos seu agendamento para o dia ${d.getDate()} de ${MESES[d.getMonth()]} às ${ag.horario}. Até lá!`);
  window.open(`https://wa.me/55${tel}?text=${msg}`,"_blank");
}

// ---- FORMULÁRIO ----
el.temPacote.addEventListener("change",function(){ el.secaoPacote.hidden=!el.temPacote.checked; });

el.btnNovo.addEventListener("click",function(){
  estado.idEdit=null;
  el.formTitulo.textContent="Novo agendamento";
  el.form.reset();
  el.data.value=toISO(estado.dataSel);
  el.secaoPacote.hidden=true;
  el.btnExcluir.hidden=true;
  abrirForm();
  setTimeout(function(){ el.cliente.focus(); },250);
});

function editarAg(ag) {
  estado.idEdit=ag.id;
  el.formTitulo.textContent="Editar agendamento";
  el.data.value=ag.data;
  el.horario.value=ag.horario;
  el.cliente.value=ag.cliente||"";
  el.telefone.value=ag.telefone||"";
  el.servico.value=ag.servico||"";
  el.temPacote.checked=!!ag.temPacote;
  el.pacoteDesc.value=ag.pacoteDesc||"";
  el.visitaPacote.checked=!!ag.visitaPacote;
  el.secaoPacote.hidden=!ag.temPacote;
  el.obs.value=ag.observacao||"";
  el.btnExcluir.hidden=false;
  abrirForm();
}

el.form.addEventListener("submit",async function(e){
  e.preventDefault();
  const dados={
    profissional:estado.prof,
    data:el.data.value, horario:el.horario.value,
    cliente:el.cliente.value.trim(), telefone:el.telefone.value.trim(),
    servico:el.servico.value.trim(),
    temPacote:el.temPacote.checked,
    pacoteDesc:el.temPacote.checked?el.pacoteDesc.value.trim():"",
    visitaPacote:el.temPacote.checked?el.visitaPacote.checked:false,
    observacao:el.obs.value.trim()
  };
  if(!dados.cliente||!dados.data||!dados.horario){ toast("Preencha data, horário e nome."); return; }
  const btn=el.form.querySelector(".btn-primario");
  btn.disabled=true; btn.textContent="Salvando…";
  try {
    if(estado.idEdit){ await updateDoc(doc(db,COLECAO,estado.idEdit),dados); toast("Atualizado ✓"); }
    else { dados.criadoEm=serverTimestamp(); dados.presencaConfirmada=false; await addDoc(collection(db,COLECAO),dados); toast("Salvo ✓"); }
    fecharForm();
  } catch(err){ console.error(err); toast("Erro ao salvar. Verifique a internet."); }
  finally { btn.disabled=false; btn.textContent="Salvar"; }
});

el.btnExcluir.addEventListener("click",function(){
  const ag=estado.ags.find(a=>a.id===estado.idEdit);
  if(ag){ fecharForm(); setTimeout(function(){ confirmarExcluir(ag); },200); }
});

// ---- EXCLUSÃO ----
function confirmarExcluir(ag) {
  idExcluir=ag.id;
  el.confirmarTexto.textContent=`Excluir o agendamento de ${ag.cliente}, às ${ag.horario}? Esta ação não pode ser desfeita.`;
  abrirConfirmar();
}

el.btnConfirmarEx.addEventListener("click",async function(){
  if(!idExcluir) return;
  const id=idExcluir; idExcluir=null;
  fecharConfirmar();
  try { await deleteDoc(doc(db,COLECAO,id)); toast("Excluído"); }
  catch(err){ console.error(err); toast("Erro ao excluir."); }
});

// ---- TOAST ----
let timerToast=null;
function toast(msg){
  el.toast.textContent=msg; el.toast.classList.add("mostrar");
  if(timerToast) clearTimeout(timerToast);
  timerToast=setTimeout(function(){ el.toast.classList.remove("mostrar"); },3200);
}
