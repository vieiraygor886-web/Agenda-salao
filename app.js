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
  infoCliente: g("info-cliente"),
  clienteInicial: g("cliente-inicial-letra"),
  clienteCardNome: g("cliente-card-nome"),
  clienteCardSub: g("cliente-card-sub"),
  data: g("campo-data"), horario: g("campo-horario"),
  telefone: g("campo-telefone"), cliente: g("campo-cliente"),
  servico: g("campo-servico"),
  temPacote: g("campo-tem-pacote"), secaoPacote: g("secao-pacote"),
  pacoteDesc: g("campo-pacote-desc"), visitaPacote: g("campo-visita-pacote"),
  obs: g("campo-observacao"),
  btnFecharForm: g("btn-fechar-form"), btnCancelarForm: g("btn-cancelar-form"),
  btnExcluir: g("btn-excluir-do-form"),

  painelConfirmar: g("painel-confirmar"), fundoConfirmar: g("fundo-confirmar"),
  confirmarTexto: g("confirmar-texto"),
  btnCancelarEx: g("btn-cancelar-excluir"), btnConfirmarEx: g("btn-confirmar-excluir"),

  painelHistorico: g("painel-historico"), fundoHistorico: g("fundo-historico"),
  historicoTitulo: g("historico-titulo"), historicoConteudo: g("historico-conteudo"),
  btnFecharHistorico: g("btn-fechar-historico"),

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
  return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
}
function fromISO(s) { const p=s.split("-").map(Number); return new Date(p[0],p[1]-1,p[2]); }
function pad(n) { return String(n).padStart(2,"0"); }
function addDias(d,n) { const c=new Date(d); c.setDate(c.getDate()+n); return c; }
function inicioSem(d) { const c=new Date(d); c.setDate(c.getDate()-c.getDay()); return c; }
function dataFmt(d) { return d.getDate()+" de "+MESES[d.getMonth()]; }

// ---- PAINÉIS ----
function fecharTodos() {
  el.painelForm.hidden = true;
  el.painelConfirmar.hidden = true;
  el.painelHistorico.hidden = true;
}

function abrirForm() { fecharTodos(); el.painelForm.hidden = false; }
function fecharForm() { el.painelForm.hidden = true; }
function abrirConfirmar() { fecharTodos(); el.painelConfirmar.hidden = false; }
function fecharConfirmar() { el.painelConfirmar.hidden = true; }
function abrirHistorico() { fecharTodos(); el.painelHistorico.hidden = false; }
function fecharHistorico() { el.painelHistorico.hidden = true; }

el.fundoForm.addEventListener("click", fecharForm);
el.fundoConfirmar.addEventListener("click", fecharConfirmar);
el.fundoHistorico.addEventListener("click", fecharHistorico);
el.btnFecharForm.addEventListener("click", fecharForm);
el.btnCancelarForm.addEventListener("click", fecharForm);
el.btnFecharHistorico.addEventListener("click", fecharHistorico);
el.btnCancelarEx.addEventListener("click", function() { idExcluir=null; fecharConfirmar(); });

// ---- NAVEGAÇÃO ----
document.querySelectorAll(".card-prof").forEach(function(b) {
  b.addEventListener("click", function() { abrirAgenda(b.dataset.prof); });
});
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
  fecharTodos();
  if (estado.cancelar) estado.cancelar();
  el.agenda.hidden = true;
  el.home.hidden = false;
}

// ---- FIREBASE ----
function ouvirAgs(prof) {
  if (estado.cancelar) estado.cancelar();
  const q = query(collection(db, COLECAO), where("profissional","==",prof));
  estado.cancelar = onSnapshot(q,
    function(snap) { estado.ags = snap.docs.map(function(d){return {id:d.id,...d.data()};}); desenhar(); renderLista(); },
    function(err) { console.error(err); toast("Sem conexão. Verifique a rede."); }
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
  var sem = estado.visao==="semana";
  el.btnSemana.classList.toggle("ativo",sem);
  el.btnMes.classList.toggle("ativo",!sem);
  el.faixaDias.hidden = !sem;
  el.gradeMes.hidden = sem;
  if (sem) desenharSemana(); else desenharMes();
}

// ---- SEMANA ----
el.btnAnt.addEventListener("click", function() {
  if (estado.visao==="semana") { estado.inicioSem=addDias(estado.inicioSem,-7); desenharSemana(); }
  else { var v=estado.mesAtual; var m=v.m-1,a=v.a; if(m<0){m=11;a--;} estado.mesAtual={a:a,m:m}; desenharMes(); }
});
el.btnSeg.addEventListener("click", function() {
  if (estado.visao==="semana") { estado.inicioSem=addDias(estado.inicioSem,7); desenharSemana(); }
  else { var v=estado.mesAtual; var m=v.m+1,a=v.a; if(m>11){m=0;a++;} estado.mesAtual={a:a,m:m}; desenharMes(); }
});

function desenharSemana() {
  var hoje = hojeLocal();
  var fim  = addDias(estado.inicioSem,6);
  el.rotulo.textContent =
    estado.inicioSem.getMonth()===fim.getMonth()
      ? estado.inicioSem.getDate()+" a "+fim.getDate()+" de "+MESES[fim.getMonth()]
      : estado.inicioSem.getDate()+" de "+MESES[estado.inicioSem.getMonth()]+" a "+fim.getDate()+" de "+MESES[fim.getMonth()];

  el.faixaDias.innerHTML = "";
  for (var i=0;i<7;i++) {
    (function(idx){
      var d    = addDias(estado.inicioSem,idx);
      var temAg= estado.ags.some(function(a){return a.data===toISO(d);});
      var pill = document.createElement("button");
      pill.type="button";
      pill.className = "dia-pill";
      if (mesmaData(d,hoje)) pill.classList.add("hoje");
      if (mesmaData(d,estado.dataSel)&&!estado.busca) pill.classList.add("selecionado");
      pill.innerHTML = '<span class="dia-pill-abrev">'+DIAS_A[d.getDay()]+'</span><span class="dia-pill-numero">'+d.getDate()+'</span>'+(temAg?'<span class="dia-pill-ponto"></span>':"");
      pill.addEventListener("click", function() {
        estado.dataSel=d; limparBusca(); desenharSemana(); renderLista();
      });
      el.faixaDias.appendChild(pill);
    })(i);
  }
}

// ---- MÊS ----
function desenharMes() {
  var a=estado.mesAtual.a, m=estado.mesAtual.m;
  var hoje=hojeLocal();
  el.rotulo.textContent = MESES[m].charAt(0).toUpperCase()+MESES[m].slice(1)+" "+a;
  el.gradeMes.innerHTML = "";

  var cab=document.createElement("div"); cab.className="mes-cabecalho";
  DIAS_A.forEach(function(d){var s=document.createElement("span");s.textContent=d;cab.appendChild(s);});
  el.gradeMes.appendChild(cab);

  var grade=document.createElement("div"); grade.className="mes-grade";
  var prim=new Date(a,m,1), ult=new Date(a,m+1,0).getDate(), off=prim.getDay();

  for(var i=0;i<off;i++) grade.appendChild(celMes(new Date(a,m,1-(off-i)),true,hoje));
  for(var i=1;i<=ult;i++) grade.appendChild(celMes(new Date(a,m,i),false,hoje));
  var resto=(off+ult)%7===0?0:7-(off+ult)%7;
  for(var i=1;i<=resto;i++) grade.appendChild(celMes(new Date(a,m+1,i),true,hoje));

  el.gradeMes.appendChild(grade);
}

function celMes(d,outro,hoje) {
  var temAg=estado.ags.some(function(a){return a.data===toISO(d);});
  var c=document.createElement("div"); c.className="mes-dia";
  if(outro) c.classList.add("outro-mes");
  if(mesmaData(d,hoje)) c.classList.add("hoje-mes");
  if(mesmaData(d,estado.dataSel)&&!estado.busca) c.classList.add("selecionado-mes");
  c.textContent=d.getDate();
  if(temAg){var p=document.createElement("span");p.className="mes-ponto";c.appendChild(p);}
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
  var lista, mostrarData=false;
  if (estado.busca) {
    el.blocoSemana.style.display="none";
    var t=norm(estado.busca);
    lista=estado.ags.filter(function(a){return norm(a.cliente).includes(t);}).sort(function(a,b){return (a.data+a.horario).localeCompare(b.data+b.horario);});
    el.titulo.textContent='Resultados para "'+estado.busca+'"';
    mostrarData=true;
  } else {
    el.blocoSemana.style.display="";
    var iso=toISO(estado.dataSel);
    lista=estado.ags.filter(function(a){return a.data===iso;}).sort(function(a,b){return a.horario.localeCompare(b.horario);});
    var hoje=hojeLocal();
    var pre=mesmaData(estado.dataSel,hoje)?"Hoje, ":"";
    el.titulo.textContent=pre+DIAS_C[estado.dataSel.getDay()]+", "+estado.dataSel.getDate()+" de "+MESES[estado.dataSel.getMonth()];
  }
  renderCartoes(lista, mostrarData);
}

function visitsDoMes(cliente, mesAno) {
  // mesAno = "YYYY-MM"
  return estado.ags.filter(function(a){
    return a.cliente===cliente && a.visitaPacote && a.data && a.data.slice(0,7)===mesAno;
  }).sort(function(a,b){return a.data.localeCompare(b.data);});
}

function renderCartoes(lista, mostrarData) {
  el.lista.innerHTML="";
  if(!lista.length){
    el.vazio.hidden=false;
    el.vazio.querySelector("p").textContent=estado.busca?"Nenhuma cliente encontrada.":"Nenhum agendamento por aqui ainda.";
    return;
  }
  el.vazio.hidden=true;

  lista.forEach(function(ag) {
    var c=document.createElement("div");
    c.className="cartao-ag prof-"+estado.prof;

    var sub=[];
    if(ag.servico) sub.push(ag.servico);
    if(ag.telefone) sub.push(ag.telefone);

    var badges="";
    if(ag.temPacote) {
      var mesISO=ag.data?ag.data.slice(0,7):toISO(estado.dataSel).slice(0,7);
      var visits=visitsDoMes(ag.cliente, mesISO);
      var n=visits.length;
      var dias=visits.map(function(v){return fromISO(v.data).getDate();}).join(", ");
      badges+='<span class="badge badge-pacote">Pacote · '+n+'x este mês'+(n>0?' (dias '+dias+')':'')+'</span>';
    }
    if(mostrarData && ag.data) badges+='<span class="badge badge-data">'+dataFmt(fromISO(ag.data))+'</span>';
    if(ag.presencaConfirmada) badges+='<span class="badge badge-presente">Presente</span>';

    c.innerHTML=
      '<div class="cartao-barra"></div>'+
      '<div class="cartao-inner">'+
        '<div class="cartao-horario-box"><span class="cartao-hora">'+ag.horario+'</span></div>'+
        '<div class="cartao-corpo">'+
          '<div class="cartao-nome">'+esc(ag.cliente)+'</div>'+
          (sub.length?'<div class="cartao-sub">'+esc(sub.join(' · '))+'</div>':'')+
          (ag.observacao?'<div class="cartao-sub">'+esc(ag.observacao)+'</div>':'')+
          (badges?'<div class="cartao-badges">'+badges+'</div>':'')+
        '</div>'+
        '<div class="cartao-acoes">'+
          '<button class="btn-ac editar" type="button" title="Editar">✏️</button>'+
          (ag.telefone?'<button class="btn-ac wa" type="button" title="WhatsApp">WA</button>':'')+
          '<button class="btn-ac ok'+(ag.presencaConfirmada?' ativo':'')+'" type="button">'+(ag.presencaConfirmada?'✓ ok':'ok')+'</button>'+
          '<button class="btn-ac excluir" type="button" title="Excluir">🗑</button>'+
        '</div>'+
      '</div>';

    c.querySelector(".editar").addEventListener("click", function(e){ e.stopPropagation(); editarAg(ag); });
    c.querySelector(".excluir").addEventListener("click", function(e){ e.stopPropagation(); confirmarExcluir(ag); });
    if(ag.telefone) c.querySelector(".wa").addEventListener("click", function(e){ e.stopPropagation(); abrirWA(ag); });
    c.querySelector(".ok").addEventListener("click", function(e){
      e.stopPropagation();
      updateDoc(doc(db,COLECAO,ag.id),{presencaConfirmada:!ag.presencaConfirmada})
        .then(function(){ toast(ag.presencaConfirmada?"Presença desmarcada":"Presença confirmada ✓"); })
        .catch(function(){ toast("Erro ao atualizar."); });
    });
    c.addEventListener("click", function(){ verHistorico(ag.cliente); });

    el.lista.appendChild(c);
  });
}

function esc(t){ var d=document.createElement("div"); d.textContent=t||""; return d.innerHTML; }

// ---- WHATSAPP ----
function abrirWA(ag) {
  var tel = (ag.telefone||"").replace(/\D/g,"");
  if (!tel) { toast("Número de telefone inválido."); return; }
  // Garante código de país 55 (Brasil)
  if (tel.length <= 11) tel = "55" + tel;
  var d = fromISO(ag.data);
  var msg = "Olá, "+ag.cliente+"! Confirmamos seu agendamento para "+dataFmt(d)+" às "+ag.horario+". Até lá!";
  var url = "https://api.whatsapp.com/send?phone="+tel+"&text="+encodeURIComponent(msg);
  window.location.href = url;
}

// ---- HISTÓRICO ----
function verHistorico(nomeCliente) {
  el.historicoTitulo.textContent = nomeCliente;

  var todos = estado.ags.filter(function(a){return a.cliente===nomeCliente;})
    .sort(function(a,b){return b.data.localeCompare(a.data);});

  if (!todos.length) { toast("Nenhum histórico encontrado."); return; }

  // Agrupar por mês
  var meses = {};
  todos.forEach(function(a){
    var k = a.data.slice(0,7);
    if(!meses[k]) meses[k]=[];
    meses[k].push(a);
  });

  var html = "";
  Object.keys(meses).sort(function(a,b){return b.localeCompare(a);}).forEach(function(k){
    var partes = k.split("-");
    var titulo = MESES[parseInt(partes[1])-1]+" de "+partes[0];
    html += '<div class="hist-mes"><div class="hist-mes-titulo">'+titulo+'</div>';
    meses[k].forEach(function(a){
      var d = fromISO(a.data);
      html += '<div class="hist-item">'+
        '<span class="hist-data">'+pad(d.getDate())+"/"+pad(d.getMonth()+1)+" "+a.horario+'</span>'+
        '<span class="hist-serv">'+(a.servico||"—")+'</span>'+
        (a.visitaPacote?'<span class="hist-pacote-badge">Pacote</span>':'')+
        '</div>';
    });
    html += '</div>';
  });

  el.historicoConteudo.innerHTML = html;
  abrirHistorico();
}

// ---- IDENTIFICAR CLIENTE PELO TELEFONE ----
var timerTel = null;
el.telefone.addEventListener("input", function() {
  clearTimeout(timerTel);
  timerTel = setTimeout(function() {
    var tel = el.telefone.value.replace(/\D/g,"");
    if (tel.length < 8) { el.infoCliente.hidden=true; return; }
    // Busca cliente com mesmo telefone
    var match = estado.ags.find(function(a){
      return a.telefone && a.telefone.replace(/\D/g,"") === tel;
    });
    if (match) {
      el.cliente.value = match.cliente;
      if (match.temPacote) {
        el.temPacote.checked = true;
        el.secaoPacote.hidden = false;
        el.pacoteDesc.value = match.pacoteDesc || "";
      }
      // Info visual
      var mesISO = toISO(estado.dataSel).slice(0,7);
      var visits = visitsDoMes(match.cliente, mesISO);
      var n = visits.length;
      var sub = n > 0
        ? "Pacote: "+n+"x este mês (dias "+visits.map(function(v){return fromISO(v.data).getDate();}).join(", ")+")"
        : (match.temPacote ? "Tem pacote · nenhuma visita este mês ainda" : "");
      el.clienteInicial.textContent = match.cliente.charAt(0).toUpperCase();
      el.clienteCardNome.textContent = match.cliente;
      el.clienteCardSub.textContent = sub || "Cliente encontrada";
      el.infoCliente.hidden = false;
    } else {
      el.infoCliente.hidden = true;
    }
  }, 500);
});

// ---- FORMULÁRIO ----
el.temPacote.addEventListener("change", function(){ el.secaoPacote.hidden=!el.temPacote.checked; });

el.btnNovo.addEventListener("click", function(){
  estado.idEdit=null;
  el.formTitulo.textContent="Novo agendamento";
  el.form.reset();
  el.data.value=toISO(estado.dataSel);
  el.secaoPacote.hidden=true;
  el.infoCliente.hidden=true;
  el.btnExcluir.hidden=true;
  abrirForm();
  setTimeout(function(){ el.telefone.focus(); },250);
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
  el.infoCliente.hidden=true;
  abrirForm();
}

el.form.addEventListener("submit", function(e){
  e.preventDefault();
  var dados={
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
  var btn=el.form.querySelector(".btn-primario");
  btn.disabled=true; btn.textContent="Salvando…";
  var p;
  if(estado.idEdit){ p=updateDoc(doc(db,COLECAO,estado.idEdit),dados); }
  else { dados.criadoEm=serverTimestamp(); dados.presencaConfirmada=false; p=addDoc(collection(db,COLECAO),dados); }
  p.then(function(){ toast(estado.idEdit?"Atualizado ✓":"Salvo ✓"); fecharForm(); })
   .catch(function(err){ console.error(err); toast("Erro ao salvar."); })
   .finally(function(){ btn.disabled=false; btn.textContent="Salvar"; });
});

el.btnExcluir.addEventListener("click", function(){
  var ag=estado.ags.find(function(a){return a.id===estado.idEdit;});
  if(ag){ fecharForm(); setTimeout(function(){ confirmarExcluir(ag); },200); }
});

// ---- EXCLUSÃO ----
function confirmarExcluir(ag) {
  idExcluir=ag.id;
  el.confirmarTexto.textContent="Excluir o agendamento de "+ag.cliente+" às "+ag.horario+"? Esta ação não pode ser desfeita.";
  abrirConfirmar();
}

el.btnConfirmarEx.addEventListener("click", function(){
  if(!idExcluir) return;
  var id=idExcluir; idExcluir=null;
  fecharConfirmar();
  deleteDoc(doc(db,COLECAO,id))
    .then(function(){ toast("Excluído"); })
    .catch(function(err){ console.error(err); toast("Erro ao excluir."); });
});

// ---- TOAST ----
var timerToast=null;
function toast(msg){
  el.toast.textContent=msg; el.toast.classList.add("mostrar");
  clearTimeout(timerToast);
  timerToast=setTimeout(function(){ el.toast.classList.remove("mostrar"); },3200);
}
