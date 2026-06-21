// Chart.js defaults
if (typeof Chart !== 'undefined') {
  Chart.defaults.color = '#9aaa9a';
  Chart.defaults.borderColor = '#e8ede8';
}

/* ═══════════════════════════════════════════════════════
   FINANZAS PERSONALES v5 — Motor Multicurrency Completo
   Cada activo vive en su moneda nativa.
   COP sólo para visualización patrimonial.
   ═══════════════════════════════════════════════════════ */
const SUPABASE_URL = "https://uvogztpqqjbtdmkieybs.supabase.co";
const SUPABASE_KEY = "sb_publishable_bNEN9D3vbC9SBvnnOwBx4A_4m37RiRe";

let _authToken = null, _currentUser = null;
function authHeaders(){return{"Content-Type":"application/json","apikey":SUPABASE_KEY,"Authorization":`Bearer ${_authToken||SUPABASE_KEY}`};}
async function signUp(e,p){const r=await fetch(`${SUPABASE_URL}/auth/v1/signup`,{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPABASE_KEY},body:JSON.stringify({email:e,password:p})});return r.json();}
async function signIn(e,p){const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPABASE_KEY},body:JSON.stringify({email:e,password:p})});return r.json();}
async function signOut(){await fetch(`${SUPABASE_URL}/auth/v1/logout`,{method:"POST",headers:authHeaders()});_authToken=null;_currentUser=null;localStorage.removeItem("sb_session");mostrarPantallaAuth();}
async function refreshToken(rt){const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPABASE_KEY},body:JSON.stringify({refresh_token:rt})});return r.json();}
function guardarSesion(d){const s={access_token:d.access_token,refresh_token:d.refresh_token,expires_at:Date.now()+(d.expires_in||3600)*1000,user:d.user};localStorage.setItem("sb_session",JSON.stringify(s));_authToken=s.access_token;_currentUser=s.user;}
async function restaurarSesion(){const raw=localStorage.getItem("sb_session");if(!raw)return false;try{const s=JSON.parse(raw);if(Date.now()>s.expires_at-300000){const d=await refreshToken(s.refresh_token);if(d.access_token){guardarSesion(d);return true;}localStorage.removeItem("sb_session");return false;}_authToken=s.access_token;_currentUser=s.user;return true;}catch{return false;}}
function mostrarPantallaAuth(){document.getElementById("appShell").style.display="none";document.getElementById("authScreen").style.display="flex";document.getElementById("authEmail").value="";document.getElementById("authPassword").value="";document.getElementById("authError").textContent="";}
function mostrarApp(){
  document.getElementById("authScreen").style.display="none";document.getElementById("appShell").style.display="block";
  if(_currentUser){
    const nombre=localStorage.getItem("sb_displayName")||(_currentUser.email||"").split("@")[0]||"Usuario";
    let badge=document.getElementById("userBadge");
    if(!badge){badge=document.createElement("div");badge.id="userBadge";badge.style.cssText="margin-left:auto;display:flex;align-items:center;gap:6px";badge.innerHTML='<span style="font-size:18px;cursor:pointer" onclick="abrirModalNombre()">\u{1F464}</span><span id="userName" style="font-size:13px;color:#006b1a;font-weight:700;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer" onclick="abrirModalNombre()"></span><button onclick="abrirPagina(\'configuracion\')" style="background:rgba(0,150,50,.1);color:#006b1a;border:1px solid rgba(0,150,50,.2);padding:5px 9px;font-size:13px;border-radius:8px;font-weight:700">\u2699\uFE0F</button>';document.querySelector(".headerInner").appendChild(badge);}
    document.getElementById("userName").textContent=nombre;
  }
}
let _modoAuth="login";
function toggleModoAuth(){_modoAuth=_modoAuth==="login"?"registro":"login";const esR=_modoAuth==="registro";document.getElementById("authTitle").textContent=esR?"Crear cuenta nueva":"Bienvenido de nuevo";document.getElementById("authSubmit").textContent=esR?"Registrarme":"Entrar";document.getElementById("authToggleText").textContent=esR?"¿Ya tienes una cuenta? ":"¿Eres nuevo aquí? ";document.getElementById("authToggleLink").textContent=esR?"Inicia sesión":"Crea tu cuenta";document.getElementById("authError").textContent="";const nw=document.getElementById("authNameWrap");if(nw)nw.style.display=esR?"block":"none";}
async function submitAuth(){
  const email=document.getElementById("authEmail").value.trim(),password=document.getElementById("authPassword").value,nombre=(_modoAuth==="registro")?(document.getElementById("authName").value.trim()||""):"",errEl=document.getElementById("authError"),btn=document.getElementById("authSubmit");
  if(!email||!password){errEl.style.color="#ff4444";errEl.textContent="Completa todos los campos.";return;}
  if(password.length<6){errEl.style.color="#ff4444";errEl.textContent="La contraseña debe tener al menos 6 caracteres.";return;}
  btn.disabled=true;btn.innerHTML=(_modoAuth==="registro"?"Creando cuenta":"Verificando")+'<span class="authDots"><span></span><span></span><span></span></span>';errEl.textContent="";
  try{
    let data;
    if(_modoAuth==="registro"){data=await signUp(email,password);if(data.error){errEl.style.color="#ff4444";errEl.textContent=traducirError(data.error.message||data.msg);btn.disabled=false;btn.textContent="Registrarme";return;}if(nombre)localStorage.setItem("sb_displayName",nombre);if(data.user&&!data.access_token){errEl.style.color="#00c832";errEl.innerHTML="✓ Cuenta creada. Revisa tu email: <strong>"+email+"</strong>";btn.disabled=false;btn.textContent="Registrarme";return;}}
    else{data=await signIn(email,password);if(data.error||data.error_description){errEl.style.color="#ff4444";errEl.textContent=traducirError(data.error_description||data.error);btn.disabled=false;btn.textContent="Entrar";return;}}
    if(data.access_token){guardarSesion(data);btn.innerHTML="✓ Acceso concedido";btn.style.background="linear-gradient(135deg,#008828,#006b1a)";setTimeout(()=>{mostrarApp();cargarDatos();},600);return;}
  }catch{errEl.style.color="#ff4444";errEl.textContent="Error de conexión.";}
  btn.disabled=false;btn.textContent=_modoAuth==="registro"?"Registrarme":"Entrar";
}
function traducirError(msg){if(!msg)return"Error desconocido.";if(msg.includes("Invalid login"))return"Email o contraseña incorrectos.";if(msg.includes("already registered"))return"Email ya registrado.";if(msg.includes("Email not confirmed"))return"Confirma tu email.";if(msg.includes("Password should"))return"Contraseña: mínimo 6 caracteres.";return msg;}
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&document.getElementById("authScreen").style.display!=="none")submitAuth();});

/* ── SUPABASE CLIENT ── */
const sb={get baseHeaders(){return authHeaders();},url:(t,p="")=>`${SUPABASE_URL}/rest/v1/${t}${p}`};
async function sbGet(t,p=""){const r=await fetch(sb.url(t,`?select=*${p}`),{headers:sb.baseHeaders});return r.ok?r.json():[];}
async function sbInsert(t,d){const r=await fetch(sb.url(t),{method:"POST",headers:{...sb.baseHeaders,"Prefer":"return=representation"},body:JSON.stringify(d)});if(!r.ok){console.error("sbInsert:",await r.text());return null;}return r.json();}
async function sbUpdate(t,id,d){const r=await fetch(sb.url(t,`?id=eq.${id}`),{method:"PATCH",headers:sb.baseHeaders,body:JSON.stringify(d)});return r.ok;}
async function sbDelete(t,id){const r=await fetch(sb.url(t,`?id=eq.${id}`),{method:"DELETE",headers:sb.baseHeaders});return r.ok;}
async function sbUpsert(t,d,oc){const r=await fetch(sb.url(t,`?on_conflict=${oc}`),{method:"POST",headers:{...sb.baseHeaders,"Prefer":"return=representation,resolution=merge-duplicates"},body:JSON.stringify(d)});if(!r.ok){console.error("sbUpsert:",await r.text());return null;}return r.json();}

/* ── ESTADO GLOBAL ── */
let movimientos=[], inversiones=[], deudas=[];
let posicionesDivisa=[];  // [{divisa,cantidad,costoProm}]
let tasasCambio={};       // {USD:4200, EUR:4600}
let historialTasas=[];
let lotesInversion=[];    // lotes de compra por inversion_id
let ventasInversion=[];   // log de ventas
let _dividendos=[];       // dividendos/intereses

/* ── CARGA INICIAL ── */
async function cargarDatos(){
  mostrarCargando(true);
  try{
    const [movDB,invDB,deuDB,pagDB,cargDB,posDB,tasDB,lotDB,venDB,divDB,opCDB]=await Promise.all([
      sbGet("movimientos"),sbGet("inversiones"),sbGet("deudas"),sbGet("pagos_deuda"),sbGet("cargos_tarjeta"),
      sbGet("posiciones_divisa"),sbGet("tasas_cambio","&order=fecha.desc"),
      sbGet("lotes_inversion"),sbGet("ventas_inversion"),sbGet("dividendos"),
      sbGet("operaciones_corporativas","&order=fecha.desc").catch(()=>[])
    ]);
    movimientos=(movDB||[]).map(m=>({id:m.id,descripcion:m.descripcion,desc:m.descripcion,valor:parseFloat(m.valor),tipo:m.tipo,fecha:m.fecha,categoria:m.categoria||"",subcategoria:m.subcategoria||"",metodoPago:m.metodo_pago||"",esCredito:m.es_credito||false,deudaId:m.deuda_id||null,cargoId:m.cargo_id||null}));
    inversiones=(invDB||[]).map(i=>({id:i.id,tipo:i.tipo,nombre:i.nombre,broker:i.broker||"",origen:i.origen,cantidad:parseFloat(i.cantidad||0),precioCompra:parseFloat(i.precio_compra||0),precioActual:parseFloat(i.precio_actual||0),precioActualDivisa:parseFloat(i.precio_actual_divisa||i.precio_actual||0),capital:parseFloat(i.capital||0),tasaEA:parseFloat(i.tasa_ea||0),fechaInicio:i.fecha_inicio||"",fechaVencimiento:i.fecha_vencimiento||"",valorCompra:parseFloat(i.valor_compra||0),valorActual:parseFloat(i.valor_actual||0),divisa:i.divisa||"COP",tcCompra:i.tc_compra?parseFloat(i.tc_compra):null,tcActual:i.tc_actual?parseFloat(i.tc_actual):null,costos:parseFloat(i.costos||0),cobrado:i.cobrado||false,valorCobrado:i.valor_cobrado?parseFloat(i.valor_cobrado):null,fechaCobro:i.fecha_cobro||null,metodoCosto:i.metodo_costo||"PROM",cantidadRestante:i.cantidad_restante!=null?parseFloat(i.cantidad_restante):parseFloat(i.cantidad||0)}));
    deudas=(deuDB||[]).map(d=>{const pagos=(pagDB||[]).filter(p=>p.deuda_id===d.id).map(p=>({id:p.id,fecha:p.fecha,cuota:parseFloat(p.cuota),capitalPagado:parseFloat(p.capital_pagado||0),interes:parseFloat(p.interes||0),tasaAplicada:parseFloat(p.tasa_aplicada||0)}));const _cargos=(cargDB||[]).filter(c=>c.deuda_id===d.id).map(c=>({id:c.id,fecha:c.fecha,desc:c.descripcion,valor:parseFloat(c.valor),pagado:c.pagado||false,movId:c.movimiento_id||null}));return{id:d.id,nombre:d.nombre,tipo:d.tipo,capital:parseFloat(d.capital),fecha:d.fecha,tipoTasa:d.tipo_tasa,tasaFija:parseFloat(d.tasa_fija||0),frecuencia:d.frecuencia||"",cuotas:d.cuotas||0,_esTarjetaAuto:d.es_tarjeta_auto||false,pagos,_cargos};});
    posicionesDivisa=(posDB||[]).map(p=>({id:p.id,divisa:p.divisa,cantidad:parseFloat(p.cantidad||0),costoProm:parseFloat(p.costo_prom_cop||0)}));
    tasasCambio={};historialTasas=(tasDB||[]).map(t=>({id:t.id,divisa:t.divisa,tasa:parseFloat(t.tasa_cop),fecha:t.fecha,nota:t.nota||""}));
    historialTasas.forEach(t=>{if(!tasasCambio[t.divisa])tasasCambio[t.divisa]=t.tasa;});
    lotesInversion=(lotDB||[]).map(l=>({id:l.id,inversionId:l.inversion_id,fecha:l.fecha,cantidad:parseFloat(l.cantidad||0),precioUnidad:parseFloat(l.precio_unidad||0),divisaActivo:l.divisa_activo||"COP",tcCompra:parseFloat(l.tc_compra_cop||0),costoCopTotal:parseFloat(l.costo_cop_total||0),cantidadRestante:parseFloat(l.cantidad_restante||l.cantidad||0),cerrado:l.cerrado||false}));
    ventasInversion=(venDB||[]).map(v=>({id:v.id,inversionId:v.inversion_id,fecha:v.fecha,cantidad:parseFloat(v.cantidad||0),precioVenta:parseFloat(v.precio_venta||0),divisaActivo:v.divisa_activo||"COP",tcVenta:parseFloat(v.tc_venta_cop||0),valorCop:parseFloat(v.valor_cop||0),divisaDestino:v.divisa_destino||"COP",comision:parseFloat(v.comision||0),impuesto:parseFloat(v.impuesto||0),metodoCosto:v.metodo_costo||"PROM",gananciaActivoCop:parseFloat(v.ganancia_activo_cop||0),gananciaFxCop:parseFloat(v.ganancia_fx_cop||0)}));
    _dividendos=(divDB||[]).map(d=>({id:d.id,inversionId:d.inversion_id,fecha:d.fecha,monto:parseFloat(d.monto||0),divisa:d.divisa||"COP",tipo:d.tipo||"dividendo",destino:d.destino||"divisa",tcCop:parseFloat(d.tc_cop||0),montoCop:parseFloat(d.monto_cop||0),impuestoRetenido:parseFloat(d.impuesto_retenido||0)}));

    operacionesCorp=(opCDB||[]).map(o=>({id:o.id,inversionId:o.inversion_id,tipo:o.tipo,fecha:o.fecha,factor:parseFloat(o.factor||1),cantidadNueva:parseFloat(o.cantidad_nueva||0),precioDrip:parseFloat(o.precio_drip||0),brokerOrigen:o.broker_origen||"",brokerDestino:o.broker_destino||"",notas:o.notas||""}));
  }catch(e){console.error("Error cargando datos:",e);}
  mostrarCargando(false);actualizar();
}
function mostrarCargando(visible){let el=document.getElementById("loadingOverlay");if(!el){el=document.createElement("div");el.id="loadingOverlay";el.style.cssText="position:fixed;inset:0;background:rgba(255,255,255,.92);z-index:9999;display:flex;align-items:center;justify-content:center;font-size:16px;color:#006b1a;font-weight:700";el.innerHTML="⏳ Cargando datos...";document.body.appendChild(el);}el.style.display=visible?"flex":"none";}
const save=()=>{};

/* ── HELPERS ── */
const fmt=n=>"$"+Math.round(n<0?0:n).toLocaleString("es-CO");
const fmtN=n=>(n<0?"-$":"$")+Math.abs(Math.round(n)).toLocaleString("es-CO");
const hoy=()=>new Date().toISOString().split("T")[0];
function tcCOP(divisa){if(!divisa||divisa==="COP")return 1;return tasasCambio[divisa]||1;}
function aCOP(monto,divisa){return(monto||0)*tcCOP(divisa);}

/* ── CATEGORÍAS ── */
const categorias={Entradas:["💼 Salario","💰 Bonificación","💸 Comisiones","💻 Freelance","🏢 Negocio","📈 Ganancias","💵 Dividendos","🏦 Intereses","🏠 Arriendos","🎁 Regalos","💲 Reembolsos","📦 Otro"],Mercado:["🛒 Supermercado","🌿 Frescos","🥩 Proteínas","🧴 Aseo","✨ Cuidado Personal","Otro"],Restaurante:["🛵 Domicilio","🍽️ Restaurante","☕ Cafetería","📦 Otro"],Transporte:["🚕 Uber","🚖 Taxi","🚌 Transporte Público","⛽ Gasolina","🛣️ Peajes","🅿️ Parqueadero","📦 Otro"],Vivienda:["🏠 Arriendo","🏢 Admin","💡 Luz","💧 Agua","🔥 Gas","🌐 Internet","🛋️ Hogar","📦 Otro"],Ocio:["🎬 Cine","✈️ Viajes","🏋️ Deportes","💻 Tecnología","📚 Libros","🍻 Bares","📺 Streaming","👕 Moda","📦 Otro"],Salud:["🏥 EPS","💊 Medicamentos","🦷 Dentista","🩺 Exámenes","🏋️ Gimnasio","📦 Otro"],Educación:["📚 Libros","📝 Útiles","🎓 Cursos","🏫 Universidad","📦 Otro"],Emergencia:["💥 Accidente","🔧 Reparación","⚠️ Imprevisto","📦 Otro"],Servicios:["📱 Celular","📶 Internet Móvil","☁️ Almacenamiento","📦 Otro"],Otros:["📦 Otro"]};
function cargarSubcategorias(){const cat=document.getElementById("categoria").value,sel=document.getElementById("subcategoria");sel.innerHTML='<option value="">Subcategoría</option>';(categorias[cat]||[]).forEach(s=>sel.innerHTML+=`<option>${s}</option>`);}

/* ════════════════════════════════
   CÁLCULOS CENTRALES
   ════════════════════════════════ */
function calcularTotales(){
  let ingresos=0,gastos=0,pagosDeuda=0,trasladosInv=0;
  movimientos.forEach(m=>{if(m.tipo==="ingreso")ingresos+=m.valor;else if(m.tipo==="gasto"&&!m.esCredito)gastos+=m.valor;else if(m.tipo==="pago_deuda_cuota")pagosDeuda+=m.valor;else if(m.tipo==="traslado_inversion")trasladosInv+=m.valor;});
  return{ingresos,gastos,pagosDeuda,trasladosInv,saldoCaja:ingresos-gastos-pagosDeuda-trasladosInv};
}
function saldoVivo(d){return Math.max(0,d.capital-(d.pagos||[]).reduce((s,p)=>s+(p.capitalPagado||0),0));}
function calcularDeudaNeta(){return deudas.reduce((s,d)=>s+saldoVivo(d),0);}

function valorActualInvCOP(inv){
  if(inv.cobrado&&(inv.cantidadRestante??inv.cantidad??0)<=0.000001)return inv.valorCobrado||0;
  const divisa=inv.divisa||"COP",tc=tcCOP(divisa);
  const cant=inv.cantidadRestante!=null?inv.cantidadRestante:(inv.cantidad||0);
  switch(inv.tipo){
    case"Acción":case"ETF":case"Criptomoneda":case"Divisa":return cant*(inv.precioActualDivisa||inv.precioActual||0)*tc;
    case"CDT":case"Fondo":{const hM=Date.now(),ini=inv.fechaInicio?new Date(inv.fechaInicio).getTime():hM,fin=inv.tipo==="CDT"&&inv.fechaVencimiento?new Date(inv.fechaVencimiento).getTime():hM,dias=Math.max(0,Math.min((hM-ini),(fin-ini))/86400000);return(inv.capital||0)*Math.pow(1+(inv.tasaEA||0)/100,dias/365)*tc;}
    case"Finca Raíz":return(inv.valorActual||inv.valorCompra||0)*tc;
    case"Efectivo":return(inv.capital||0)*tc;
    default:return 0;
  }
}
function valorActualInvDivisa(inv){
  const cant=inv.cantidadRestante!=null?inv.cantidadRestante:(inv.cantidad||0);
  switch(inv.tipo){
    case"Acción":case"ETF":case"Criptomoneda":case"Divisa":return cant*(inv.precioActualDivisa||inv.precioActual||0);
    case"CDT":case"Fondo":{const hM=Date.now(),ini=inv.fechaInicio?new Date(inv.fechaInicio).getTime():hM,fin=inv.tipo==="CDT"&&inv.fechaVencimiento?new Date(inv.fechaVencimiento).getTime():hM,dias=Math.max(0,Math.min((hM-ini),(fin-ini))/86400000);return(inv.capital||0)*Math.pow(1+(inv.tasaEA||0)/100,dias/365);}
    case"Finca Raíz":return inv.valorActual||inv.valorCompra||0;
    case"Efectivo":return inv.capital||0;
    default:return 0;
  }
}
function capitalInvertidoCOP(inv){
  const divisa=inv.divisa||"COP",tcH=inv.tcCompra||tcCOP(divisa);
  switch(inv.tipo){
    case"Acción":case"ETF":case"Criptomoneda":case"Divisa":return(inv.cantidad||0)*(inv.precioCompra||0)*tcH;
    case"Finca Raíz":return inv.valorCompra||0;
    default:return(inv.capital||0)*tcH;
  }
}
function calcularValorInversionesCOP(){return inversiones.filter(i=>!i.cobrado||(i.cantidadRestante??i.cantidad??0)>0.000001).reduce((s,i)=>s+valorActualInvCOP(i),0);}

function calcularCostoUnitarioCOP(inv,cantVender){
  const metodo=inv.metodoCosto||"PROM";
  const lotes=lotesInversion.filter(l=>String(l.inversionId)===String(inv.id)&&!l.cerrado);
  if(!lotes.length){return(inv.precioCompra||0)*(inv.tcCompra||tcCOP(inv.divisa||"COP"));}
  if(metodo==="PROM"){const tc=lotes.reduce((s,l)=>s+l.cantidadRestante*l.precioUnidad*(l.tcCompra||1),0),tc2=lotes.reduce((s,l)=>s+l.cantidadRestante,0)||1;return tc/tc2;}
  const ord=metodo==="FIFO"?[...lotes].sort((a,b)=>new Date(a.fecha)-new Date(b.fecha)):[...lotes].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
  let rest=cantVender,costo=0;for(const l of ord){if(rest<=0)break;const u=Math.min(rest,l.cantidadRestante);costo+=u*l.precioUnidad*(l.tcCompra||1);rest-=u;}
  return cantVender>0?costo/cantVender:0;
}

/* ════════════════════════════════
   DASHBOARD
   ════════════════════════════════ */
function actualizar(){
  const T=calcularTotales(),valorInv=calcularValorInversionesCOP(),dn=calcularDeudaNeta();
  const valorDiv=posicionesDivisa.reduce((s,p)=>s+p.cantidad*tcCOP(p.divisa),0);
  const patrimonio=T.saldoCaja+valorDiv+valorInv-dn;
  const setEl=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  setEl("saldo",fmtN(T.saldoCaja));setEl("ingresos",fmt(T.ingresos));setEl("gastos",fmt(T.gastos));
  setEl("ahorro",fmtN(T.saldoCaja));setEl("patrimonio",fmtN(patrimonio));setEl("valorInversiones",fmt(valorInv));
  setEl("deudaNeta",fmt(dn));setEl("pagosDeuda",fmt(T.pagosDeuda));
  setEl("tasaAhorro",(T.ingresos>0?((T.saldoCaja/T.ingresos)*100).toFixed(1):0)+"%");
  setEl("fechaActual",new Date().toLocaleDateString("es-CO",{weekday:"long",day:"numeric",month:"long",year:"numeric"}));
  actualizarSeccionDivisas();dibujarMovimientos();actualizarInversiones();dibujarDeudas();
  setTimeout(dibujarSparklines,100);
}

function actualizarSeccionDivisas(){
  const cont=document.getElementById("seccionDivisas");if(!cont)return;
  const con=posicionesDivisa.filter(p=>p.cantidad>0.000001);
  if(!con.length){cont.innerHTML='<p style="color:#9aaa9a;font-size:13px">Sin saldo en otras divisas</p>';return;}
  const EM={USD:"🇺🇸",EUR:"🇪🇺",BTC:"₿",USDT:"💵",USDC:"💵",GBP:"🇬🇧"};
  cont.innerHTML=con.map(p=>{
    const tc=tcCOP(p.divisa),valCop=p.cantidad*tc,ganFx=p.cantidad*(tc-(p.costoProm||tc));
    return`<div class="divisaCard">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:15px;font-weight:800">${EM[p.divisa]||"💱"} ${p.cantidad.toFixed(4)} ${p.divisa}</span>
        <span style="font-size:14px;font-weight:700;color:#006b1a">${fmt(valCop)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:11px;color:#9aaa9a">
        <span>TC: ${tc.toLocaleString("es-CO",{minimumFractionDigits:2,maximumFractionDigits:2})} | CPP: ${p.costoProm.toLocaleString("es-CO",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
        <span style="color:${ganFx>=0?"#00aa33":"#ef4444"}">${ganFx>=0?"+":""}${fmtN(ganFx)} FX</span>
      </div>
      <button onclick="venderDivisa('${p.divisa}')" style="margin-top:6px;background:#00b8d4;color:#fff;border:none;padding:4px 10px;border-radius:7px;cursor:pointer;font-size:11px">💱 Vender ${p.divisa}</button>
    </div>`;
  }).join("");
}

/* ════════════════════════════════
   MOVIMIENTOS
   ════════════════════════════════ */
function actualizarTipoMovimiento(){
  const tipo=document.getElementById("tipo").value;
  document.getElementById("filaDeudaVinculo").style.display=tipo==="pago_deuda_cuota"?"block":"none";
  const filaCS=document.getElementById("filaCategoriaSubcat");if(filaCS)filaCS.style.display=tipo==="pago_deuda_cuota"?"none":"block";
  const catSel=document.getElementById("categoria");
  if(catSel){catSel.innerHTML='<option value="">Categoría</option>';if(tipo==="ingreso"){catSel.innerHTML+='<option value="Entradas">Entradas</option>';catSel.value="Entradas";cargarSubcategorias();}else if(tipo==="gasto"){["Mercado","Restaurante","Transporte","Vivienda","Ocio","Salud","Educación","Emergencia","Servicios","Otros"].forEach(c=>catSel.innerHTML+=`<option value="${c}">${c}</option>`);cargarSubcategorias();}}
  const metSel=document.getElementById("metodoPago");
  if(metSel){const sinCred=["Efectivo","Débito","Nequi","Daviplata","Transferencia","ARQ"],conCred=[...sinCred,"Banco Bogotá Crédito","Davivienda Crédito"];metSel.innerHTML=(tipo==="ingreso"?sinCred:conCred).map(o=>`<option>${o}</option>`).join("");}
}
function semanaKey(f){const d=new Date(f+"T12:00:00"),p=new Date(d.getFullYear(),d.getMonth(),1).getDay(),n=Math.ceil((d.getDate()+p)/7);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-W${n}`;}
function semanaLabel(key){const[anio,mes,wp]=key.split("-"),w=parseInt(wp.replace("W",""));const p=new Date(Number(anio),Number(mes)-1,1).getDay(),dI=Math.max(1,(w-1)*7-p+1),dF=Math.min(new Date(Number(anio),Number(mes),0).getDate(),dI+6);const nl=d=>new Date(Number(anio),Number(mes)-1,d).toLocaleDateString("es-CO",{weekday:"short",day:"numeric"});return`Semana ${w} (${nl(dI)} – ${nl(dF)})`;}

function dibujarMovimientos(){
  const cont=document.getElementById("listaMovimientos");if(!cont)return;
  if(!movimientos.length){cont.innerHTML=`<p style="color:#9aaa9a;text-align:center;padding:30px">Sin movimientos registrados</p>`;return;}
  const ord=[...movimientos].sort((a,b)=>{const df=new Date(b.fecha)-new Date(a.fecha);return df!==0?df:b.id-a.id;});
  const porMes={};ord.forEach(m=>{const d=new Date(m.fecha+"T12:00:00"),mK=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,sK=semanaKey(m.fecha);if(!porMes[mK])porMes[mK]={label:d.toLocaleDateString("es-CO",{month:"long",year:"numeric"}),semanas:{}};if(!porMes[mK].semanas[sK])porMes[mK].semanas[sK]=[];porMes[mK].semanas[sK].push(m);});
  const CT={ingreso:"#00aa33",gasto:"#ef4444",pago_deuda_cuota:"#f97316",traslado_inversion:"#00b8d4"};
  const ST={ingreso:"+",gasto:"-",pago_deuda_cuota:"↓",traslado_inversion:"→"};
  let html="",mIdx=0;
  Object.entries(porMes).forEach(([,mData])=>{
    mIdx++;const mId=`mes_${mIdx}`;let tI=0,tG=0;Object.values(mData.semanas).forEach(items=>items.forEach(m=>{if(m.tipo==="ingreso")tI+=m.valor;else if(m.tipo==="gasto")tG+=m.valor;}));
    let sIdx=0;
    const semHTML=Object.entries(mData.semanas).map(([sK,items])=>{sIdx++;const sId=`sem_${mIdx}_${sIdx}`;let sI=0,sG=0;items.forEach(m=>{if(m.tipo==="ingreso")sI+=m.valor;else if(m.tipo==="gasto")sG+=m.valor;});
      const iHTML=items.map(m=>{const col=CT[m.tipo]||"#9aaa9a",sig=ST[m.tipo]||"·";return`<div style="background:#fff;border-radius:13px;padding:13px;margin-bottom:8px;border:1px solid #e8ede8;border-left:4px solid ${col}"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px"><div style="flex:1;min-width:0"><p style="font-weight:700;font-size:14px;margin:0 0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.descripcion||m.desc||""}</p><p style="font-size:11px;color:#446644;margin:0">${m.fecha}${m.categoria?" · "+m.categoria:""}${m.metodoPago?" · "+m.metodoPago:""}</p>${m.tipo==="pago_deuda_cuota"?`<p style="font-size:11px;color:#f97316;margin:2px 0 0">↓ Pago de deuda</p>`:""}${m.tipo==="traslado_inversion"?`<p style="font-size:11px;color:#00997a;margin:2px 0 0">→ Traslado a inversión</p>`:""}</div><span style="font-weight:800;color:${col};font-size:15px;white-space:nowrap">${sig}${fmt(m.valor)}</span></div><div style="display:flex;gap:8px;margin-top:8px"><button onclick="abrirModalEditar('${m.id}')" style="background:#00aa33;padding:6px 11px;font-size:12px;border-radius:9px">✏</button><button onclick="eliminarMovimiento('${m.id}')" style="background:#dc2626;padding:6px 11px;font-size:12px;border-radius:9px">🗑</button></div></div>`;}).join("");
      return`<div class="semana" style="margin:5px 10px 8px"><div class="semanaHeader" onclick="toggleEl('${sId}','arr_${sId}')"><span style="font-size:12px">${semanaLabel(sK)}</span><span style="font-size:11px;color:#9aaa9a;white-space:nowrap">+${fmt(sI)} / -${fmt(sG)} <b id="arr_${sId}">▼</b></span></div><div id="${sId}" class="movimientosSemana">${iHTML}</div></div>`;
    }).join("");
    html+=`<div class="mes"><div class="mesHeader" onclick="toggleEl('${mId}','arr_${mId}')"><span>${mData.label.charAt(0).toUpperCase()+mData.label.slice(1)}</span><span style="font-size:11px;color:#9aaa9a;white-space:nowrap">+${fmt(tI)} / -${fmt(tG)} <b id="arr_${mId}">▼</b></span></div><div id="${mId}" style="display:none">${semHTML}</div></div>`;
  });
  cont.innerHTML=html;
}
function toggleEl(id,arrId){const el=document.getElementById(id),arr=document.getElementById(arrId);if(!el)return;const esMes=!el.classList.contains("movimientosSemana");if(esMes){const vis=el.style.display!=="none";el.style.display=vis?"none":"block";if(arr)arr.textContent=vis?"▼":"▲";}else{const vis=el.classList.contains("abierto");el.classList.toggle("abierto",!vis);if(arr)arr.textContent=vis?"▼":"▲";}}
async function eliminarMovimiento(id){await sbDelete("movimientos",id);movimientos=movimientos.filter(m=>String(m.id)!==String(id));actualizar();}
function abrirModalEditar(id){const m=movimientos.find(m=>String(m.id)===String(id));if(!m)return;document.getElementById("editId").value=String(m.id);document.getElementById("editDesc").value=m.descripcion||m.desc||"";document.getElementById("editValor").value=m.valor;document.getElementById("editTipoMov").value=m.tipo;document.getElementById("editCategoria").value=m.categoria||"";document.getElementById("editMetodo").value=m.metodoPago||"";document.getElementById("editFecha").value=m.fecha;document.getElementById("modalEditar").style.display="flex";}
function cerrarModalEditar(){document.getElementById("modalEditar").style.display="none";}
async function guardarEdicion(){const id=document.getElementById("editId").value,m=movimientos.find(m=>String(m.id)===String(id));if(!m)return;m.descripcion=document.getElementById("editDesc").value.trim();m.desc=m.descripcion;m.valor=Number(document.getElementById("editValor").value);m.tipo=document.getElementById("editTipoMov").value;m.categoria=document.getElementById("editCategoria").value;m.metodoPago=document.getElementById("editMetodo").value;m.fecha=document.getElementById("editFecha").value;await sbUpdate("movimientos",id,{descripcion:m.descripcion,valor:m.valor,tipo:m.tipo,categoria:m.categoria,metodo_pago:m.metodoPago,fecha:m.fecha});actualizar();cerrarModalEditar();}

async function agregarMovimiento(){
  const desc=document.getElementById("descripcion").value.trim(),valor=Number(document.getElementById("valor").value),tipo=document.getElementById("tipo").value,fecha=document.getElementById("fecha").value||hoy(),cat=document.getElementById("categoria").value,sub=document.getElementById("subcategoria").value,meto=document.getElementById("metodoPago").value;
  if(!desc||valor<=0){alert("Completa descripción y valor.");return;}
  let deudaId=null;
  if(tipo==="pago_deuda_cuota"){
    deudaId=document.getElementById("selDeudaVinculo").value||null;
    if(deudaId){const d=deudas.find(d=>String(d.id)===String(deudaId));if(d){const pago={fecha,cuota:valor,capitalPagado:valor,interes:0,tasaAplicada:0};const res=await sbInsert("pagos_deuda",{user_id:_currentUser.id,deuda_id:deudaId,fecha,cuota:valor,capital_pagado:valor,interes:0,tasa_aplicada:0});if(res&&res[0]){pago.id=res[0].id;d.pagos.push(pago);}}}
  }
  const metodosCred=["Banco Bogotá Crédito","Davivienda Crédito"];
  if(tipo==="gasto"&&metodosCred.includes(meto)){
    let dt=deudas.find(d=>d.tipo==="tarjeta_credito"&&d.nombre===meto&&d._esTarjetaAuto);
    if(!dt){const dRes=await sbInsert("deudas",{user_id:_currentUser.id,nombre:meto,tipo:"tarjeta_credito",capital:0,fecha:hoy(),tipo_tasa:"sin_tasa",tasa_fija:0,frecuencia:"mensual",cuotas:0,es_tarjeta_auto:true});if(dRes&&dRes[0]){dt={id:dRes[0].id,nombre:meto,tipo:"tarjeta_credito",capital:0,fecha:hoy(),tipoTasa:"sin_tasa",tasaFija:0,frecuencia:"mensual",cuotas:0,pagos:[],_esTarjetaAuto:true,_cargos:[]};deudas.push(dt);}}
    const movRes=await sbInsert("movimientos",{user_id:_currentUser.id,descripcion:desc,valor,tipo:"gasto",fecha,categoria:cat,subcategoria:sub,metodo_pago:meto,es_credito:true,deuda_id:null});const movId=movRes&&movRes[0]?movRes[0].id:null;
    if(dt&&movId){const cargoRes=await sbInsert("cargos_tarjeta",{user_id:_currentUser.id,deuda_id:dt.id,movimiento_id:movId,fecha,descripcion:desc,valor,pagado:false});const cargoId=cargoRes&&cargoRes[0]?cargoRes[0].id:null;if(!dt._cargos)dt._cargos=[];dt._cargos.push({id:cargoId,fecha,desc,valor,pagado:false,movId});dt.capital=dt._cargos.filter(c=>!c.pagado).reduce((s,c)=>s+c.valor,0);await sbUpdate("deudas",dt.id,{capital:dt.capital});if(cargoId)await sbUpdate("movimientos",movId,{cargo_id:cargoId});}
    if(movRes&&movRes[0])movimientos.push({id:movRes[0].id,desc,descripcion:desc,valor,tipo:"gasto",fecha,categoria:cat,subcategoria:sub,metodoPago:meto,esCredito:true,deudaId:null});
    document.getElementById("descripcion").value="";document.getElementById("valor").value="";actualizar();return;
  }
  const res=await sbInsert("movimientos",{user_id:_currentUser.id,descripcion:desc,valor,tipo,fecha,categoria:cat,subcategoria:sub,metodo_pago:meto,es_credito:false,deuda_id:deudaId});
  if(res&&res[0])movimientos.push({id:res[0].id,desc,descripcion:desc,valor,tipo,fecha,categoria:cat,subcategoria:sub,metodoPago:meto,esCredito:false,deudaId});
  document.getElementById("descripcion").value="";document.getElementById("valor").value="";actualizar();
}

/* ════════════════════════════════
   MÓDULO DE TASAS DE CAMBIO
   ════════════════════════════════ */
function abrirModalTasas(){
  const cont=document.getElementById("listaTasas");if(!cont)return;
  const divisasComunes=["USD","EUR","USDT","USDC","GBP","JPY","BTC","ETH"];
  const todas=[...new Set([...divisasComunes,...Object.keys(tasasCambio)])];
  cont.innerHTML=todas.map(d=>`<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><span style="width:55px;font-weight:700;font-size:14px">${d}</span><input type="number" step="0.000001" value="${tasasCambio[d]||""}" placeholder="COP por 1 ${d}" id="tc_${d}" style="flex:1;padding:10px;border:1.5px solid #ccd8cc;border-radius:10px;background:#f5f7f5;font-size:14px;outline:none"><button onclick="guardarTasa('${d}')" style="background:#00aa33;color:#fff;border:none;padding:8px 12px;border-radius:9px;cursor:pointer;font-size:13px">✓</button></div>`).join("")
  +`<div style="margin-top:12px;padding-top:12px;border-top:1px solid #e8ede8"><p style="font-size:12px;color:#446644;font-weight:700;margin-bottom:8px">Agregar otra divisa:</p><div style="display:flex;gap:8px"><input id="nuevaDivisaNombre" placeholder="Ej: ARS" maxlength="6" style="width:80px;padding:10px;border:1.5px solid #ccd8cc;border-radius:10px;background:#f5f7f5;font-size:14px;outline:none"><input id="nuevaDivisaTC" type="number" step="0.000001" placeholder="Tasa COP" style="flex:1;padding:10px;border:1.5px solid #ccd8cc;border-radius:10px;background:#f5f7f5;font-size:14px;outline:none"><button onclick="guardarNuevaTasa()" style="background:#006b1a;color:#fff;border:none;padding:8px 12px;border-radius:9px;cursor:pointer;font-size:13px">+</button></div></div>`;
  document.getElementById("modalTasas").style.display="flex";
}
async function guardarTasa(divisa){
  const val=Number(document.getElementById(`tc_${divisa}`).value);if(!val||val<=0){alert("Tasa inválida.");return;}
  tasasCambio[divisa]=val;
  const res=await sbInsert("tasas_cambio",{user_id:_currentUser.id,divisa,tasa_cop:val,fecha:hoy()});
  if(res&&res[0])historialTasas.unshift({id:res[0].id,divisa,tasa:val,fecha:hoy(),nota:""});
  actualizar();alert(`✓ Tasa ${divisa}: ${val.toLocaleString("es-CO",{minimumFractionDigits:2})} COP guardada`);
}
async function guardarNuevaTasa(){
  const div=(document.getElementById("nuevaDivisaNombre").value||"").trim().toUpperCase(),val=Number(document.getElementById("nuevaDivisaTC").value);
  if(!div||!val||val<=0){alert("Completa divisa y tasa.");return;}
  document.getElementById(`tc_${div}`)? document.getElementById(`tc_${div}`).value=val : null;
  tasasCambio[div]=val;
  const res=await sbInsert("tasas_cambio",{user_id:_currentUser.id,divisa:div,tasa_cop:val,fecha:hoy()});
  if(res&&res[0])historialTasas.unshift({id:res[0].id,divisa:div,tasa:val,fecha:hoy(),nota:""});
  document.getElementById("nuevaDivisaNombre").value="";document.getElementById("nuevaDivisaTC").value="";
  actualizar();alert(`✓ ${div}: ${val.toLocaleString("es-CO",{minimumFractionDigits:2})} COP`);
}
function cerrarModalTasas(){document.getElementById("modalTasas").style.display="none";}

/* ════════════════════════════════
   MÓDULO COMPRA/VENTA DE DIVISAS
   ════════════════════════════════ */
function abrirModalComprarDivisa(){
  const divEl=document.getElementById("compDivisaNombre");const div=divEl?divEl.value:"USD";
  const tcEl=document.getElementById("compTC");if(tcEl&&!tcEl.value)tcEl.value=tasasCambio[div]||"";
  document.getElementById("compFechaDivisa").value=hoy();
  document.getElementById("modalComprarDivisa").style.display="flex";
}
function cerrarModalComprarDivisa(){document.getElementById("modalComprarDivisa").style.display="none";}
function actualizarTCSugerida(){const div=(document.getElementById("compDivisaNombre").value||"").toUpperCase();const tcEl=document.getElementById("compTC");if(tcEl)tcEl.value=tasasCambio[div]||"";}

async function confirmarComprarDivisa(){
  const divisa=(document.getElementById("compDivisaNombre").value||"").trim().toUpperCase();
  const cantidad=Number(document.getElementById("compCantidadDivisa").value)||0;
  const tc=Number(document.getElementById("compTC").value)||0;
  const fecha=document.getElementById("compFechaDivisa").value||hoy();
  if(!divisa||cantidad<=0||tc<=0){alert("Completa todos los campos.");return;}
  const montoCOP=cantidad*tc;
  // Actualizar posición con costo promedio ponderado
  const pos=posicionesDivisa.find(p=>p.divisa===divisa);
  if(pos){const nuevoTotal=pos.cantidad+cantidad,nuevoCosto=(pos.cantidad*pos.costoProm+cantidad*tc)/nuevoTotal;pos.cantidad=nuevoTotal;pos.costoProm=nuevoCosto;await sbUpsert("posiciones_divisa",{user_id:_currentUser.id,divisa,cantidad:nuevoTotal,costo_prom_cop:nuevoCosto},"user_id,divisa");}
  else{posicionesDivisa.push({divisa,cantidad,costoProm:tc});await sbUpsert("posiciones_divisa",{user_id:_currentUser.id,divisa,cantidad,costo_prom_cop:tc},"user_id,divisa");}
  tasasCambio[divisa]=tc;await sbInsert("tasas_cambio",{user_id:_currentUser.id,divisa,tasa_cop:tc,fecha,nota:`Compra ${cantidad} ${divisa}`});
  const descMov=`Compra ${cantidad.toFixed(4)} ${divisa} @ ${tc.toLocaleString("es-CO")} COP`;
  const mRes=await sbInsert("movimientos",{user_id:_currentUser.id,descripcion:descMov,valor:montoCOP,tipo:"traslado_inversion",fecha,categoria:"Inversión",subcategoria:"Compra Divisa",metodo_pago:"Transferencia",es_credito:false});
  if(mRes&&mRes[0])movimientos.push({id:mRes[0].id,descripcion:descMov,desc:descMov,valor:montoCOP,tipo:"traslado_inversion",fecha,categoria:"Inversión",subcategoria:"Compra Divisa",metodoPago:"Transferencia",esCredito:false,deudaId:null});
  cerrarModalComprarDivisa();actualizar();
  alert(`✓ Compra registrada:\n${cantidad.toFixed(4)} ${divisa}\nCosto: ${fmt(montoCOP)}\nCPP: ${tc.toLocaleString("es-CO")} COP/${divisa}`);
}

async function venderDivisa(divisa){
  const pos=posicionesDivisa.find(p=>p.divisa===divisa);if(!pos||pos.cantidad<=0){alert("Sin saldo en "+divisa);return;}
  const cantStr=prompt(`¿Cuántos ${divisa} vendes?\nDisponible: ${pos.cantidad.toFixed(4)}`,pos.cantidad.toFixed(4));if(!cantStr)return;
  const cant=parseFloat(cantStr);if(!cant||cant<=0||cant>pos.cantidad+0.000001){alert("Cantidad inválida.");return;}
  const tcStr=prompt(`Tasa de venta (COP por 1 ${divisa}):`,tasasCambio[divisa]||"");if(!tcStr)return;
  const tc=parseFloat(tcStr);if(!tc||tc<=0){alert("Tasa inválida.");return;}
  const montoCOP=cant*tc,costoCOP=cant*pos.costoProm,gananciaFx=montoCOP-costoCOP,fecha=hoy();
  pos.cantidad=Math.max(0,pos.cantidad-cant);
  await sbUpsert("posiciones_divisa",{user_id:_currentUser.id,divisa,cantidad:pos.cantidad,costo_prom_cop:pos.costoProm},"user_id,divisa");
  tasasCambio[divisa]=tc;await sbInsert("tasas_cambio",{user_id:_currentUser.id,divisa,tasa_cop:tc,fecha,nota:`Venta ${cant} ${divisa}`});
  const descMov=`Venta ${cant.toFixed(4)} ${divisa} @ ${tc.toLocaleString("es-CO")} (P&G FX: ${gananciaFx>=0?"+":""}${fmtN(gananciaFx)})`;
  const mRes=await sbInsert("movimientos",{user_id:_currentUser.id,descripcion:descMov,valor:montoCOP,tipo:"ingreso",fecha,categoria:"Inversión",subcategoria:"Venta Divisa",metodo_pago:"Transferencia",es_credito:false});
  if(mRes&&mRes[0])movimientos.push({id:mRes[0].id,descripcion:descMov,desc:descMov,valor:montoCOP,tipo:"ingreso",fecha,categoria:"Inversión",subcategoria:"Venta Divisa",metodoPago:"Transferencia",esCredito:false,deudaId:null});
  actualizar();alert(`✓ Venta registrada\n${cant.toFixed(4)} ${divisa} → ${fmt(montoCOP)}\nP&G FX: ${gananciaFx>=0?"+":""}${fmtN(gananciaFx)}`);
}

/* ════════════════════════════════
   INVERSIONES — FORMULARIO
   ════════════════════════════════ */
function actualizarFormInversion(){
  const tipo=document.getElementById("tipoActivo").value;
  ["filaCanPrecio","filaCapital","filaTasaEA","filaFechaInicio","filaFechaVcto","filaValorCompra","filaValorActual"].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display="none";});
  if(["Acción","ETF","Criptomoneda","Divisa"].includes(tipo)){const e=document.getElementById("filaCanPrecio");if(e)e.style.display="block";}
  else if(tipo==="CDT"){["filaCapital","filaTasaEA","filaFechaInicio","filaFechaVcto"].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display="block";});}
  else if(tipo==="Fondo"){["filaCapital","filaTasaEA","filaFechaInicio"].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display="block";});}
  else if(tipo==="Finca Raíz"){["filaValorCompra","filaValorActual"].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display="block";});}
  else if(tipo==="Efectivo"){const e=document.getElementById("filaCapital");if(e)e.style.display="block";}
  const filaDivisa=document.getElementById("filaDivisa");
  if(filaDivisa)filaDivisa.style.display=["Acción","ETF","Criptomoneda","Divisa","Fondo","Finca Raíz","Efectivo"].includes(tipo)?"block":"none";
  actualizarCamposTCInversion();
}
function actualizarCamposTCInversion(){
  const divisaEl=document.getElementById("invDivisa"),filaTCCompra=document.getElementById("filaTCCompra");
  if(!divisaEl||!filaTCCompra)return;
  const necesitaTC=divisaEl.value!=="COP";
  filaTCCompra.style.display=necesitaTC?"block":"none";
  if(necesitaTC){const tcEl=document.getElementById("invTCCompra");if(tcEl&&!tcEl.value)tcEl.value=tasasCambio[divisaEl.value]||"";}
  actualizarOpcionesOrigenInversion();
}
function actualizarOpcionesOrigenInversion(){
  const origenSel=document.getElementById("invOrigen");if(!origenSel)return;
  const divisaEl=document.getElementById("invDivisa"),divisa=divisaEl?divisaEl.value:"COP";
  origenSel.innerHTML=`<option value="externo">💸 Capital externo</option><option value="caja">🏦 Desde mi caja (COP)</option>`;
  if(divisa!=="COP"){const pos=posicionesDivisa.find(p=>p.divisa===divisa);if(pos&&pos.cantidad>0)origenSel.innerHTML+=`<option value="divisa_${divisa}">💱 Desde mis ${divisa} (${pos.cantidad.toFixed(4)} disp.)</option>`;}
}

/* ════════════════════════════════
   INVERSIONES — CRUD
   ════════════════════════════════ */
async function agregarInversion(){
  // Aplicar método global si el usuario no eligió uno específico
  const metSelInv=document.getElementById("invMetodoCosto");
  if(metSelInv&&!metSelInv._touched) metSelInv.value=_metodoCostoGlobal||"PROM";

  const tipo=document.getElementById("tipoActivo").value,nombre=document.getElementById("invNombre").value.trim();
  if(!nombre){alert("Escribe el nombre del activo.");return;}
  const g=id=>{const e=document.getElementById(id);return e?Number(e.value)||0:0;};
  const gs=id=>{const e=document.getElementById(id);return e?e.value:"";};
  const origenRaw=document.getElementById("invOrigen").value;
  const origen=origenRaw.startsWith("divisa_")?"divisa":origenRaw;
  const origenDivisa=origenRaw.startsWith("divisa_")?origenRaw.replace("divisa_",""):null;
  const filaDivEl=document.getElementById("filaDivisa"),divisaEl=document.getElementById("invDivisa");
  const divisaFinal=(filaDivEl&&filaDivEl.style.display!=="none")?(divisaEl?divisaEl.value:"COP"):"COP";
  const tcCompra=g("invTCCompra")||tasasCambio[divisaFinal]||1;
  const costos=g("invCostos")||0,metodoCostoInv=document.getElementById("invMetodoCosto")?document.getElementById("invMetodoCosto").value:"PROM";
  const cantidad=g("invCantidad"),precioCompra=g("invPrecioCompra"),precioActual=g("invPrecioActual")||precioCompra;
  const inv={tipo,nombre,origen,broker:gs("invBroker"),cantidad,precioCompra,precioActual,precioActualDivisa:precioActual,capital:g("invCapital"),tasaEA:g("invTasaEA"),fechaInicio:gs("invFechaInicio")||hoy(),fechaVencimiento:gs("invFechaVcto"),valorCompra:g("invValorCompra"),valorActual:g("invValorActual"),divisa:divisaFinal,tcCompra,costos,cobrado:false,cantidadRestante:cantidad,metodoCosto:metodoCostoInv};
  const res=await sbInsert("inversiones",{user_id:_currentUser.id,tipo,nombre,broker:inv.broker||null,origen,cantidad:cantidad||null,precio_compra:precioCompra||null,precio_actual:precioActual||null,precio_actual_divisa:precioActual||null,capital:inv.capital||null,tasa_ea:inv.tasaEA||null,fecha_inicio:inv.fechaInicio||null,fecha_vencimiento:inv.fechaVencimiento||null,valor_compra:inv.valorCompra||null,valor_actual:inv.valorActual||null,divisa:divisaFinal,tc_compra:tcCompra,costos:costos||null,cobrado:false,metodo_costo:metodoCostoInv,cantidad_restante:cantidad||null});
  if(res&&res[0])inv.id=res[0].id;
  // Crear lote inicial
  if(inv.id&&["Acción","ETF","Criptomoneda","Divisa"].includes(tipo)&&cantidad>0){
    const costoCopTotal=cantidad*precioCompra*tcCompra+costos;
    const lRes=await sbInsert("lotes_inversion",{user_id:_currentUser.id,inversion_id:inv.id,fecha:inv.fechaInicio,cantidad,precio_unidad:precioCompra,divisa_activo:divisaFinal,tc_compra_cop:tcCompra,costo_cop_total:costoCopTotal,comision:costos,divisa_comision:"COP",cantidad_restante:cantidad,cerrado:false});
    if(lRes&&lRes[0])lotesInversion.push({id:lRes[0].id,inversionId:inv.id,fecha:inv.fechaInicio,cantidad,precioUnidad:precioCompra,divisaActivo:divisaFinal,tcCompra,costoCopTotal,cantidadRestante:cantidad,cerrado:false});
  }
  // Descontar fondos según origen
  if(origen==="caja"){
    const montoTotal=cantidad*precioCompra*tcCompra+costos;
    if(montoTotal>0){const mRes=await sbInsert("movimientos",{user_id:_currentUser.id,descripcion:`Inversión: ${nombre}`,valor:montoTotal,tipo:"traslado_inversion",fecha:inv.fechaInicio,categoria:"Inversión",subcategoria:tipo,metodo_pago:"Transferencia",es_credito:false});if(mRes&&mRes[0])movimientos.push({id:mRes[0].id,descripcion:`Inversión: ${nombre}`,desc:`Inversión: ${nombre}`,valor:montoTotal,tipo:"traslado_inversion",fecha:inv.fechaInicio,categoria:"Inversión",subcategoria:tipo,metodoPago:"Transferencia",esCredito:false,deudaId:null});}
  }else if(origen==="divisa"&&origenDivisa){
    const montoEnDivisa=cantidad*precioCompra;
    const pos=posicionesDivisa.find(p=>p.divisa===origenDivisa);
    if(pos){pos.cantidad=Math.max(0,pos.cantidad-montoEnDivisa);await sbUpsert("posiciones_divisa",{user_id:_currentUser.id,divisa:origenDivisa,cantidad:pos.cantidad,costo_prom_cop:pos.costoProm},"user_id,divisa");}
  }
  if(divisaFinal!=="COP"&&tcCompra>0){tasasCambio[divisaFinal]=tcCompra;await sbInsert("tasas_cambio",{user_id:_currentUser.id,divisa:divisaFinal,tasa_cop:tcCompra,fecha:inv.fechaInicio,nota:`Compra ${nombre}`});}
  inversiones.push(inv);actualizar();
  document.getElementById("invNombre").value="";
  ["invCantidad","invPrecioCompra","invPrecioActual","invCapital","invTasaEA","invFechaVcto","invValorCompra","invValorActual","invTCCompra","invCostos"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
}

async function editarPrecioInversion(id){
  const inv=inversiones.find(i=>String(i.id)===String(id));if(!inv)return;
  const divisa=inv.divisa||"COP",esDiv=divisa!=="COP";
  let campo,campoDb,lbl;
  if(["Acción","ETF","Criptomoneda","Divisa"].includes(inv.tipo)){campo="precioActualDivisa";campoDb="precio_actual_divisa";lbl=`Precio actual en ${divisa}`;}
  else if(["CDT","Fondo"].includes(inv.tipo)){campo="tasaEA";campoDb="tasa_ea";lbl="Tasa EA %";}
  else if(inv.tipo==="Finca Raíz"){campo="valorActual";campoDb="valor_actual";lbl="Valor actual COP";}
  else{campo="capital";campoDb="capital";lbl="Capital";}
  const v=prompt(`${lbl}:`,inv[campo]||inv.precioActual);if(v===null)return;
  const num=Number(v);inv[campo]=num;inv.precioActual=num;
  const updateData={[campoDb]:num,precio_actual:num};
  if(esDiv){const tcStr=prompt(`Tasa de cambio actual (COP por 1 ${divisa}):`,tasasCambio[divisa]||"");if(tcStr){const tc=Number(tcStr);if(tc>0){inv.tcActual=tc;updateData.tc_actual=tc;tasasCambio[divisa]=tc;await sbInsert("tasas_cambio",{user_id:_currentUser.id,divisa,tasa_cop:tc,fecha:hoy(),nota:`Actualización ${inv.nombre}`});}}}
  await sbUpdate("inversiones",id,updateData);actualizar();
}
async function eliminarInversion(id){await sbDelete("inversiones",id);inversiones=inversiones.filter(i=>String(i.id)!==String(id));actualizar();}

/* ════════════════════════════════
   VENTA PARCIAL / CIERRE POSICIÓN
   ════════════════════════════════ */
function abrirModalVentaParcial(id){
  const inv=inversiones.find(i=>String(i.id)===String(id));if(!inv)return;
  const divisa=inv.divisa||"COP",cantDisp=inv.cantidadRestante??inv.cantidad??0;
  document.getElementById("ventaInvId").value=String(id);
  document.getElementById("titulVentaParcial").textContent=`📤 Vender: ${inv.nombre}`;
  document.getElementById("ventaCantMax").textContent=`Disponible: ${cantDisp.toFixed(4)}${divisa!=="COP"?" "+divisa:""}`;
  document.getElementById("ventaCant").value="";
  document.getElementById("ventaPrecio").value=inv.precioActualDivisa||inv.precioActual||"";
  document.getElementById("ventaFecha").value=hoy();
  document.getElementById("ventaComision").value="";
  document.getElementById("ventaImpuesto").value="";
  const filaTCVenta=document.getElementById("filaTCVenta");
  if(filaTCVenta)filaTCVenta.style.display=divisa!=="COP"?"block":"none";
  const tcVEl=document.getElementById("ventaTC");if(tcVEl)tcVEl.value=tasasCambio[divisa]||"1";
  const destSel=document.getElementById("ventaDestino");
  if(destSel){destSel.innerHTML=`<option value="caja_cop">💰 A mi caja (COP)</option>`;if(divisa!=="COP")destSel.innerHTML+=`<option value="divisa_${divisa}">💱 Mantener en ${divisa}</option>`;["USD","EUR","USDT"].filter(d=>d!==divisa).forEach(d=>destSel.innerHTML+=`<option value="divisa_${d}">💱 Convertir a ${d}</option>`);}
  const metSel=document.getElementById("ventaMetodoCosto");
  if(metSel)metSel.value=inv.metodoCosto||"PROM";
  document.getElementById("resumenVenta").innerHTML="";
  document.getElementById("modalVentaParcial").style.display="flex";
}
function cerrarModalVentaParcial(){document.getElementById("modalVentaParcial").style.display="none";}

function actualizarResumenVenta(){
  const id=document.getElementById("ventaInvId").value;
  const inv=inversiones.find(i=>String(i.id)===String(id));if(!inv)return;
  const divisa=inv.divisa||"COP";
  const cant=Number(document.getElementById("ventaCant").value)||0;
  const precio=Number(document.getElementById("ventaPrecio").value)||0;
  const tcEl=document.getElementById("ventaTC");
  const tc=tcEl&&divisa!=="COP"?Number(tcEl.value)||tcCOP(divisa):tcCOP(divisa);
  const comision=Number(document.getElementById("ventaComision").value)||0;
  const impuesto=Number(document.getElementById("ventaImpuesto").value)||0;
  if(cant<=0||precio<=0){document.getElementById("resumenVenta").innerHTML="";return;}
  const valorBrutoCOP=cant*precio*tc,valorNetoCOP=valorBrutoCOP-comision-impuesto;
  const costoPorUnidad=calcularCostoUnitarioCOP(inv,cant);
  const costoCOP=cant*costoPorUnidad,gananciaCOP=valorNetoCOP-costoCOP;
  const tcHist=inv.tcCompra||tc;
  const ganActivo=(cant*precio-cant*(inv.precioCompra||0))*tc;
  const ganFx=divisa!=="COP"?cant*(inv.precioCompra||0)*(tc-tcHist):0;
  const res=document.getElementById("resumenVenta");
  if(res)res.innerHTML=`<b>Valor bruto:</b> ${cant*precio} ${divisa} (${fmt(valorBrutoCOP)})<br><b>Comisión + Imp:</b> ${fmt(comision+impuesto)}<br><b>Neto a recibir:</b> <span style="color:#00aa33;font-weight:700">${fmt(valorNetoCOP)}</span><br><b>Costo compra (${inv.metodoCosto||"PROM"}):</b> ${fmt(costoCOP)}<br><b>P&G Activo:</b> <span style="color:${ganActivo>=0?"#00aa33":"#ef4444"}">${fmtN(ganActivo)}</span><br>${divisa!=="COP"?`<b>P&G FX:</b> <span style="color:${ganFx>=0?"#00aa33":"#ef4444"}">${fmtN(ganFx)}</span><br>`:""}<b>P&G Total:</b> <span style="color:${gananciaCOP>=0?"#00aa33":"#ef4444"};font-weight:800">${fmtN(gananciaCOP)}</span>`;
}

async function confirmarVentaParcial(){
  // Manejar método ESP con lotes específicos seleccionados
  const metEl=document.getElementById("ventaMetodoCosto");
  if(metEl?.value==="ESP"&&window._lotesEspSeleccionados?.length){
    await confirmarVentaEsp();
    window._lotesEspSeleccionados=null;
    return;
  }
  window._lotesEspSeleccionados=null;
  const id=document.getElementById("ventaInvId").value;
  const inv=inversiones.find(i=>String(i.id)===String(id));if(!inv)return;
  const divisa=inv.divisa||"COP";
  const cant=Number(document.getElementById("ventaCant").value)||0;
  const precio=Number(document.getElementById("ventaPrecio").value)||0;
  const tcEl=document.getElementById("ventaTC");
  const tc=tcEl&&divisa!=="COP"?Number(tcEl.value)||tcCOP(divisa):tcCOP(divisa);
  const comision=Number(document.getElementById("ventaComision").value)||0;
  const impuesto=Number(document.getElementById("ventaImpuesto").value)||0;
  const fecha=document.getElementById("ventaFecha").value||hoy();
  const destino=(document.getElementById("ventaDestino")||{}).value||"caja_cop";
  const cantDisp=inv.cantidadRestante??inv.cantidad??0;
  if(cant<=0||cant>cantDisp+0.000001){alert(`Cantidad inválida. Disponible: ${cantDisp.toFixed(4)}`);return;}
  if(precio<=0){alert("Ingresa el precio de venta.");return;}

  const valorBrutoCOP=cant*precio*tc,valorNetoCOP=valorBrutoCOP-comision-impuesto;
  const costoPorUnidad=calcularCostoUnitarioCOP(inv,cant);
  const costoCOP=cant*costoPorUnidad;
  const tcHist=inv.tcCompra||tc;
  const ganActivo=(cant*precio-cant*(inv.precioCompra||0))*tc;
  const ganFx=divisa!=="COP"?cant*(inv.precioCompra||0)*(tc-tcHist):0;
  const metodoCostoVenta=document.getElementById("ventaMetodoCosto")?document.getElementById("ventaMetodoCosto").value:(inv.metodoCosto||"PROM");

  // Actualizar cantidadRestante
  const nuevaCant=Math.max(0,cantDisp-cant);
  inv.cantidadRestante=nuevaCant;
  const esCerrado=nuevaCant<=0.000001;
  if(esCerrado){inv.cobrado=true;inv.valorCobrado=valorNetoCOP;inv.fechaCobro=fecha;}
  await sbUpdate("inversiones",id,{cantidad_restante:nuevaCant,cobrado:esCerrado,valor_cobrado:esCerrado?valorNetoCOP:undefined,fecha_cobro:esCerrado?fecha:undefined});

  // Actualizar lotes
  await actualizarLotesVenta(inv,cant,metodoCostoVenta);

  // Registrar venta en log
  const divisaDest=destino.startsWith("divisa_")?destino.replace("divisa_",""):"COP";
  const vRes=await sbInsert("ventas_inversion",{user_id:_currentUser.id,inversion_id:id,fecha,cantidad:cant,precio_venta:precio,divisa_activo:divisa,tc_venta_cop:tc,valor_cop:valorNetoCOP,divisa_destino:divisaDest,comision,divisa_comision:"COP",impuesto,divisa_impuesto:"COP",metodo_costo:metodoCostoVenta,ganancia_activo_cop:ganActivo,ganancia_fx_cop:ganFx});
  if(vRes&&vRes[0])ventasInversion.push({id:vRes[0].id,inversionId:id,fecha,cantidad:cant,precioVenta:precio,divisaActivo:divisa,tcVenta:tc,valorCop:valorNetoCOP,divisaDestino:divisaDest,comision,impuesto,metodoCosto:metodoCostoVenta,gananciaActivoCop:ganActivo,gananciaFxCop:ganFx});

  // Destino de los fondos
  if(destino==="caja_cop"){
    const desc=`Venta ${cant.toFixed(4)} ${inv.nombre} → COP | P&G: ${fmtN(ganActivo+ganFx)}`;
    const mRes=await sbInsert("movimientos",{user_id:_currentUser.id,descripcion:desc,valor:Math.max(0,valorNetoCOP),tipo:"ingreso",fecha,categoria:"Inversión",subcategoria:`Venta ${inv.tipo}`,metodo_pago:"Transferencia",es_credito:false});
    if(mRes&&mRes[0])movimientos.push({id:mRes[0].id,descripcion:desc,desc,valor:Math.max(0,valorNetoCOP),tipo:"ingreso",fecha,categoria:"Inversión",subcategoria:`Venta ${inv.tipo}`,metodoPago:"Transferencia",esCredito:false,deudaId:null});
  }else{
    // Va a posición en divisa
    const cantDiv=divisaDest===divisa?cant*precio:valorNetoCOP/tcCOP(divisaDest);
    const posD=posicionesDivisa.find(p=>p.divisa===divisaDest);
    if(posD){const nt=posD.cantidad+cantDiv;posD.costoProm=(posD.cantidad*posD.costoProm+cantDiv*tcCOP(divisaDest))/nt;posD.cantidad=nt;}
    else posicionesDivisa.push({divisa:divisaDest,cantidad:cantDiv,costoProm:tcCOP(divisaDest)});
    await sbUpsert("posiciones_divisa",{user_id:_currentUser.id,divisa:divisaDest,cantidad:(posicionesDivisa.find(p=>p.divisa===divisaDest)||{}).cantidad,costo_prom_cop:tcCOP(divisaDest)},"user_id,divisa");
  }

  // Actualizar tasa vigente
  if(divisa!=="COP"&&tc>0){tasasCambio[divisa]=tc;await sbInsert("tasas_cambio",{user_id:_currentUser.id,divisa,tasa_cop:tc,fecha,nota:`Venta ${inv.nombre}`});}

  cerrarModalVentaParcial();actualizar();
  alert(`✓ Venta registrada\n${cant.toFixed(4)} u. de ${inv.nombre}\nP&G Activo: ${fmtN(ganActivo)}\nP&G FX: ${fmtN(ganFx)}\nNeto: ${fmt(Math.max(0,valorNetoCOP))}`);
}

async function actualizarLotesVenta(inv,cantVender,metodo){
  const lotes=lotesInversion.filter(l=>String(l.inversionId)===String(inv.id)&&!l.cerrado);
  if(!lotes.length)return;
  if(metodo==="PROM"){
    const total=lotes.reduce((s,l)=>s+l.cantidadRestante,0)||1;
    for(const l of lotes){const red=(l.cantidadRestante/total)*cantVender;l.cantidadRestante=Math.max(0,l.cantidadRestante-red);if(l.cantidadRestante<0.000001)l.cerrado=true;if(l.id)await sbUpdate("lotes_inversion",l.id,{cantidad_restante:l.cantidadRestante,cerrado:l.cerrado});}
  }else{
    const ord=metodo==="FIFO"?[...lotes].sort((a,b)=>new Date(a.fecha)-new Date(b.fecha)):[...lotes].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
    let rest=cantVender;
    for(const l of ord){if(rest<=0)break;const u=Math.min(rest,l.cantidadRestante);l.cantidadRestante=Math.max(0,l.cantidadRestante-u);if(l.cantidadRestante<0.000001)l.cerrado=true;rest-=u;if(l.id)await sbUpdate("lotes_inversion",l.id,{cantidad_restante:l.cantidadRestante,cerrado:l.cerrado});}
  }
}

// Alias para compatibilidad con el botón 💰 del modal anterior
function abrirModalCobrarInv(id){abrirModalVentaParcial(id);}
function cerrarModalCobrarInv(){cerrarModalVentaParcial();}

/* ════════════════════════════════
   DIVIDENDOS
   ════════════════════════════════ */
function abrirModalDividendo(invId){
  const inv=inversiones.find(i=>String(i.id)===String(invId));if(!inv)return;
  document.getElementById("divInvId").value=String(invId);
  document.getElementById("divTitulo").textContent=`💵 Dividendo: ${inv.nombre}`;
  document.getElementById("divFecha").value=hoy();
  document.getElementById("divMonto").value="";
  const divDisEl=document.getElementById("divDivisa");if(divDisEl)divDisEl.value=inv.divisa||"USD";
  const tcEl=document.getElementById("divTC");if(tcEl)tcEl.value=tasasCambio[inv.divisa||"USD"]||"";
  const impEl=document.getElementById("divImpuesto");if(impEl)impEl.value="";
  document.getElementById("modalDividendo").style.display="flex";
}
function cerrarModalDividendo(){document.getElementById("modalDividendo").style.display="none";}

async function confirmarDividendo(){
  const invId=document.getElementById("divInvId").value;
  const inv=inversiones.find(i=>String(i.id)===String(invId));if(!inv)return;
  const fecha=document.getElementById("divFecha").value||hoy();
  const monto=Number(document.getElementById("divMonto").value)||0;
  const divisa=(document.getElementById("divDivisa")||{}).value||"USD";
  const tc=Number((document.getElementById("divTC")||{}).value)||tcCOP(divisa);
  const impuesto=Number((document.getElementById("divImpuesto")||{}).value)||0;
  const destino=(document.getElementById("divDestino")||{}).value||"caja_cop";
  const tipo=(document.getElementById("divTipo")||{}).value||"dividendo";
  if(monto<=0){alert("Ingresa el monto.");return;}
  const montoNeto=monto-impuesto,montoCOP=montoNeto*tc;
  const dRes=await sbInsert("dividendos",{user_id:_currentUser.id,inversion_id:invId,fecha,monto:montoNeto,divisa,tipo,destino,tc_cop:tc,monto_cop:montoCOP,impuesto_retenido:impuesto,divisa_impuesto:divisa});
  if(dRes&&dRes[0])_dividendos.push({id:dRes[0].id,inversionId:invId,fecha,monto:montoNeto,divisa,tipo,destino,tcCop:tc,montoCop:montoCOP,impuestoRetenido:impuesto});
  if(destino==="caja_cop"){
    const desc=`${tipo==="dividendo"?"Dividendo":"Interés"}: ${inv.nombre} (${montoNeto.toFixed(4)} ${divisa})`;
    const mRes=await sbInsert("movimientos",{user_id:_currentUser.id,descripcion:desc,valor:montoCOP,tipo:"ingreso",fecha,categoria:"Inversión",subcategoria:tipo==="dividendo"?"💵 Dividendos":"🏦 Intereses",metodo_pago:"Transferencia",es_credito:false});
    if(mRes&&mRes[0])movimientos.push({id:mRes[0].id,descripcion:desc,desc,valor:montoCOP,tipo:"ingreso",fecha,categoria:"Inversión",subcategoria:tipo==="dividendo"?"💵 Dividendos":"🏦 Intereses",metodoPago:"Transferencia",esCredito:false,deudaId:null});
  }else{
    const pos=posicionesDivisa.find(p=>p.divisa===divisa);
    if(pos){const nt=pos.cantidad+montoNeto;pos.costoProm=(pos.cantidad*pos.costoProm+montoNeto*tc)/nt;pos.cantidad=nt;}
    else posicionesDivisa.push({divisa,cantidad:montoNeto,costoProm:tc});
    await sbUpsert("posiciones_divisa",{user_id:_currentUser.id,divisa,cantidad:(posicionesDivisa.find(p=>p.divisa===divisa)||{}).cantidad,costo_prom_cop:tc},"user_id,divisa");
  }
  cerrarModalDividendo();actualizar();
  alert(`✓ ${tipo} registrado\n${montoNeto.toFixed(4)} ${divisa} = ${fmt(montoCOP)}`);
}

/* ════════════════════════════════
   LISTA DE INVERSIONES
   ════════════════════════════════ */
const PALETA_TIPO={"Acción":"#00b8d4","ETF":"#6c5ce7","Criptomoneda":"#fd9644","Divisa":"#00aa33","CDT":"#a29bfe","Fondo":"#fdcb6e","Finca Raíz":"#e17055","Efectivo":"#55efc4"};

function actualizarInversiones(){
  const cont=document.getElementById("tablaInversiones");if(!cont)return;
  if(!inversiones.length){cont.innerHTML=`<p style="color:#9aaa9a;text-align:center;padding:30px">Sin inversiones registradas</p>`;return;}
  const activas=inversiones.filter(i=>!i.cobrado||(i.cantidadRestante??i.cantidad??0)>0.000001);
  const cobradas=inversiones.filter(i=>i.cobrado&&(i.cantidadRestante??i.cantidad??0)<=0.000001);
  const grupos={};activas.forEach(inv=>{if(!grupos[inv.tipo])grupos[inv.tipo]=[];grupos[inv.tipo].push(inv);});
  let html="";
  Object.entries(grupos).forEach(([tipo,items])=>{
    let totActCOP=0,totInvCOP=0;
    const filas=items.map(inv=>{
      const divisa=inv.divisa||"COP",tc=tcCOP(divisa);
      const vaCOP=valorActualInvCOP(inv),vaDivisa=valorActualInvDivisa(inv);
      const ciCOP=capitalInvertidoCOP(inv),ganCOP=vaCOP-ciCOP;
      const pct=ciCOP>0?(ganCOP/ciCOP*100).toFixed(2):"—";
      const cantRestante=inv.cantidadRestante!=null?inv.cantidadRestante:(inv.cantidad||0);
      totActCOP+=vaCOP;totInvCOP+=ciCOP;
      let detalle="";
      if(["Acción","ETF","Criptomoneda","Divisa"].includes(tipo))detalle=`${cantRestante.toFixed(4)} u. @ ${(inv.precioActualDivisa||inv.precioActual||0).toLocaleString("es-CO",{minimumFractionDigits:2,maximumFractionDigits:4})} ${divisa}`;
      else if(tipo==="CDT")detalle=`${inv.tasaEA}% EA · Vcto: ${inv.fechaVencimiento||"—"}`;
      else if(tipo==="Fondo")detalle=`${inv.tasaEA}% EA`;
      else if(tipo==="Finca Raíz")detalle=`Compra: ${fmt(inv.valorCompra)}`;
      else if(tipo==="Efectivo")detalle="Liquidez";
      const divisaTag=divisa!=="COP"?`<br><span style="font-size:11px;color:#00b8d4">💱 ${vaDivisa.toFixed(4)} ${divisa} · TC: ${tc.toLocaleString("es-CO",{minimumFractionDigits:0,maximumFractionDigits:2})}</span>`:"";
      const costoTag=inv.costos>0?`<br><span style="font-size:11px;color:#9aaa9a">Costos: ${fmt(inv.costos)}</span>`:"";
      const metTag=inv.metodoCosto&&inv.metodoCosto!=="PROM"?`<br><span style="font-size:11px;color:#a29bfe">📊 ${inv.metodoCosto}</span>`:"";
      // P&G desglosado
      const tcHist=inv.tcCompra||tc;
      const ganActivo=["Acción","ETF","Criptomoneda","Divisa"].includes(tipo)?(cantRestante*(inv.precioActualDivisa||inv.precioActual||0)-cantRestante*(inv.precioCompra||0))*tc:ganCOP;
      const ganFx=divisa!=="COP"?cantRestante*(inv.precioCompra||0)*(tc-tcHist):0;
      return`<tr>
        <td><b style="font-size:13px">${inv.nombre}</b><br><span style="font-size:11px;color:#9aaa9a">${detalle}</span>
          <br><span style="font-size:11px;color:${inv.origen==="caja"?"#00997a":inv.origen==="divisa"?"#00b8d4":"#9aaa9a"}">${inv.origen==="caja"?"🏦 Desde caja":inv.origen==="divisa"?"💱 Desde divisa":"🌐 Capital ext."}</span>
          ${inv.broker?`<br><span style="font-size:11px;color:#00997a">🏦 ${inv.broker}</span>`:""}
          ${divisaTag}${costoTag}${metTag}
        </td>
        <td style="font-size:12px">${fmt(ciCOP)}</td>
        <td style="font-size:12px">${fmt(vaCOP)}</td>
        <td style="font-size:11px">
          <span style="color:${ganCOP>=0?"#00aa33":"#ef4444"};font-weight:700">${ganCOP>=0?"+":""}${fmtN(ganCOP)}</span>
          ${divisa!=="COP"?`<br><span style="font-size:10px;color:#9aaa9a">Act: ${fmtN(ganActivo)}</span><br><span style="font-size:10px;color:#9aaa9a">FX: ${fmtN(ganFx)}</span>`:""}
          <br><span style="font-size:10px;color:#9aaa9a">${pct!=="—"?pct+"%":"—"}</span>
        </td>
        <td class="invAcciones" data-inv-id="${inv.id}">
          <button onclick="editarPrecioInversion('${inv.id}')" style="background:#00aa33;color:#fff;border:none;padding:5px 9px;border-radius:8px;cursor:pointer;font-size:12px;display:block;margin-bottom:3px;width:100%" title="Actualizar precio">✏️</button>
          <button onclick="abrirModalVentaParcial('${inv.id}')" style="background:#00b8d4;color:#fff;border:none;padding:5px 9px;border-radius:8px;cursor:pointer;font-size:12px;display:block;margin-bottom:3px;width:100%" title="Vender">📤</button>
          <button onclick="abrirModalDividendo('${inv.id}')" style="background:#fdcb6e;color:#111;border:none;padding:5px 9px;border-radius:8px;cursor:pointer;font-size:12px;display:block;margin-bottom:3px;width:100%" title="Dividendo/Interés">💵</button>
          <button onclick="eliminarInversion('${inv.id}')" style="background:#dc2626;color:#fff;border:none;padding:5px 9px;border-radius:8px;cursor:pointer;font-size:12px;display:block;width:100%" title="Eliminar">🗑</button>
        </td>
      </tr>`;
    }).join("");
    const ganTot=totActCOP-totInvCOP,colTipo=PALETA_TIPO[tipo]||"#006b1a";
    html+=`<div style="margin-bottom:22px">
      <h3 style="color:${colTipo};font-size:15px;font-weight:700;margin-bottom:8px;padding-left:8px;border-left:4px solid ${colTipo}">${tipo}
        <span style="font-size:12px;color:#446644;font-weight:400"> — ${fmt(totActCOP)} <span style="color:${ganTot>=0?"#00aa33":"#ef4444"}">(${ganTot>=0?"+":""}${fmtN(ganTot)})</span></span>
      </h3>
      <div style="overflow-x:auto"><table><thead><tr><th>Activo</th><th>Invertido</th><th>Valor Actual</th><th>Ganancia</th><th></th></tr></thead><tbody>${filas}</tbody></table></div>
    </div>`;
  });
  // Ventas recientes
  if(ventasInversion.length){
    const rec=ventasInversion.slice().sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)).slice(0,6);
    html+=`<div style="margin-bottom:22px"><h3 style="color:#9aaa9a;font-size:14px;font-weight:700;margin-bottom:8px">📋 Ventas realizadas</h3>
      <div style="overflow-x:auto"><table><thead><tr><th>Fecha</th><th>Activo</th><th>Cant.</th><th>P&G Activo</th><th>P&G FX</th><th>Total</th></tr></thead><tbody>
      ${rec.map(v=>{const inv2=inversiones.find(i=>String(i.id)===String(v.inversionId));return`<tr><td style="font-size:11px">${v.fecha}</td><td style="font-size:11px">${inv2?inv2.nombre:"—"}</td><td style="font-size:11px">${v.cantidad.toFixed(4)}</td><td style="color:${v.gananciaActivoCop>=0?"#00aa33":"#ef4444"};font-size:11px">${fmtN(v.gananciaActivoCop)}</td><td style="color:${v.gananciaFxCop>=0?"#00aa33":"#ef4444"};font-size:11px">${fmtN(v.gananciaFxCop)}</td><td style="color:${(v.gananciaActivoCop+v.gananciaFxCop)>=0?"#00aa33":"#ef4444"};font-size:11px;font-weight:700">${fmtN(v.gananciaActivoCop+v.gananciaFxCop)}</td></tr>`;}).join("")}
      </tbody></table></div></div>`;
  }
  // Cobradas/cerradas
  if(cobradas.length){
    const filasCob=cobradas.map(inv=>{const ciCOP=capitalInvertidoCOP(inv),vc=inv.valorCobrado||0,gan=vc-ciCOP;return`<tr><td><b style="font-size:13px">${inv.nombre}</b><br><span style="font-size:11px;color:#9aaa9a">${inv.tipo} · Cerrado: ${inv.fechaCobro||""}${inv.broker?" · 🏦 "+inv.broker:""}</span></td><td>${fmt(ciCOP)}</td><td style="color:#00aa33">${fmt(vc)}</td><td style="color:${gan>=0?"#00aa33":"#ef4444"}">${gan>=0?"+":""}${fmtN(gan)}</td><td><button onclick="eliminarInversion('${inv.id}')" style="background:#dc2626;color:#fff;border:none;padding:5px 9px;border-radius:8px;cursor:pointer;font-size:12px">🗑</button></td></tr>`;}).join("");
    html+=`<div style="margin-bottom:22px"><h3 style="color:#9aaa9a;font-size:15px;font-weight:700;margin-bottom:8px">✅ Cerradas / Cobradas</h3>
      <div style="overflow-x:auto"><table><thead><tr><th>Activo</th><th>Invertido</th><th>Cobrado</th><th>Ganancia</th><th></th></tr></thead><tbody>${filasCob}</tbody></table></div></div>`;
  }
  cont.innerHTML=html||`<p style="color:#9aaa9a;text-align:center;padding:30px">Sin inversiones</p>`;

  // P&G widget + botones Grupo E
  if(typeof renderPnGWidget==="function") renderPnGWidget();
  // Inyectar botones extra (split/drip/transfer/esp) en columnas invAcciones
  document.querySelectorAll(".invAcciones[data-inv-id]").forEach(td=>{
    const invId=td.dataset.invId;
    td.innerHTML+=`<button onclick="abrirModalSplit('${invId}')" style="background:#a29bfe;color:#fff;border:none;padding:5px 9px;border-radius:8px;cursor:pointer;font-size:12px;display:block;margin-bottom:3px;width:100%" title="Split/Reverse Split">✂️</button>
<button onclick="abrirModalDrip('${invId}')" style="background:#fdcb6e;color:#111;border:none;padding:5px 9px;border-radius:8px;cursor:pointer;font-size:12px;display:block;margin-bottom:3px;width:100%" title="DRIP">🔄</button>
<button onclick="abrirModalTransferBroker('${invId}')" style="background:#55efc4;color:#111;border:none;padding:5px 9px;border-radius:8px;cursor:pointer;font-size:12px;display:block;margin-bottom:3px;width:100%" title="Transferir bróker">🔀</button>
<button onclick="abrirSelectorLoteEsp('${invId}')" style="background:#fd9644;color:#fff;border:none;padding:5px 9px;border-radius:8px;cursor:pointer;font-size:12px;display:block;width:100%" title="Lotes ESP">📦</button>`;
  });
}

/* ════════════════════════════════
   DEUDAS — CRUD
   ════════════════════════════════ */
function abrirModalDeuda(){document.getElementById("modalDeuda").style.display="flex";actualizarVisibilidadTasa();}
function cerrarModalDeuda(){document.getElementById("modalDeuda").style.display="none";}
function actualizarVisibilidadTasa(){
  const tipo=document.getElementById("dTipoTasa").value;
  document.getElementById("filaTasaFija").style.display=tipo==="fija"?"block":"none";
  document.getElementById("filaFrecuencia").style.display=tipo!=="sin_tasa"?"block":"none";
  document.getElementById("filaCuotas").style.display=tipo!=="sin_tasa"?"block":"none";
}
async function agregarDeuda(){
  const nombre=document.getElementById("dNombre").value.trim(),tipo=document.getElementById("dTipo").value,capital=Number(document.getElementById("dCapital").value),fecha=document.getElementById("dFecha").value||hoy(),tipoTasa=document.getElementById("dTipoTasa").value,tasaFija=Number(document.getElementById("dTasaFija").value)||0,frecuencia=document.getElementById("dFrecuencia").value,cuotas=Number(document.getElementById("dCuotas").value)||0;
  if(!nombre||capital<=0){alert("Nombre y capital son requeridos.");return;}
  const res=await sbInsert("deudas",{user_id:_currentUser.id,nombre,tipo,capital,fecha,tipo_tasa:tipoTasa,tasa_fija:tasaFija,frecuencia,cuotas,es_tarjeta_auto:false});
  if(res&&res[0])deudas.push({id:res[0].id,nombre,tipo,capital,fecha,tipoTasa,tasaFija,frecuencia,cuotas,pagos:[],_esTarjetaAuto:false,_cargos:[]});
  cerrarModalDeuda();actualizar();
  ["dNombre","dCapital","dTasaFija","dCuotas"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
}
async function eliminarDeuda(id){if(!confirm("¿Eliminar esta deuda?"))return;await sbDelete("deudas",id);deudas=deudas.filter(d=>String(d.id)!==String(id));actualizar();}

function abrirPagoDeuda(id){
  const d=deudas.find(d=>String(d.id)===String(id));if(!d)return;
  document.getElementById("pagoDeudaId").value=String(id);
  document.getElementById("pagoTitulo").textContent=`Pago: ${d.nombre}`;
  document.getElementById("pagoFecha").value=hoy();
  document.getElementById("pagoCuota").value="";
  document.getElementById("pagoCapital").value="";
  const filaTasaVar=document.getElementById("filaTasaVar");if(filaTasaVar)filaTasaVar.style.display=d.tipoTasa==="variable"?"block":"none";
  document.getElementById("modalPagoDeuda").style.display="flex";
}
function cerrarPagoDeuda(){document.getElementById("modalPagoDeuda").style.display="none";}

async function registrarPagoDeuda(){
  const id=document.getElementById("pagoDeudaId").value;
  const d=deudas.find(d=>String(d.id)===String(id));if(!d)return;
  const fecha=document.getElementById("pagoFecha").value||hoy();
  const cuota=Number(document.getElementById("pagoCuota").value);
  const capPagado=Number(document.getElementById("pagoCapital").value)||0;
  const tasaVar=Number((document.getElementById("pagoTasaVar")||{}).value)||0;
  if(!fecha||cuota<=0){alert("Fecha y valor del pago son requeridos.");return;}
  const interes=Math.max(0,cuota-capPagado),tasaAplicada=d.tipoTasa==="variable"?tasaVar:d.tasaFija;
  const pRes=await sbInsert("pagos_deuda",{user_id:_currentUser.id,deuda_id:id,fecha,cuota,capital_pagado:capPagado,interes,tasa_aplicada:tasaAplicada});
  const pago={fecha,cuota,capitalPagado:capPagado,interes,tasaAplicada};if(pRes&&pRes[0])pago.id=pRes[0].id;d.pagos.push(pago);
  if(d._esTarjetaAuto&&d._cargos){
    let rest=capPagado>0?capPagado:cuota;
    for(const c of d._cargos.filter(c=>!c.pagado).sort((a,b)=>new Date(a.fecha)-new Date(b.fecha))){if(rest<=0)break;if(rest>=c.valor){c.pagado=true;rest-=c.valor;if(c.id)await sbUpdate("cargos_tarjeta",c.id,{pagado:true});}else{c.valor-=rest;rest=0;if(c.id)await sbUpdate("cargos_tarjeta",c.id,{valor:c.valor});}}
    d.capital=d._cargos.filter(c=>!c.pagado).reduce((s,c)=>s+c.valor,0);await sbUpdate("deudas",id,{capital:d.capital});
  }
  const mRes=await sbInsert("movimientos",{user_id:_currentUser.id,descripcion:`Pago deuda: ${d.nombre}`,valor:cuota,tipo:"pago_deuda_cuota",fecha,categoria:"Deudas",subcategoria:d.nombre,metodo_pago:"Débito",es_credito:false,deuda_id:id});
  if(mRes&&mRes[0])movimientos.push({id:mRes[0].id,descripcion:`Pago deuda: ${d.nombre}`,desc:`Pago deuda: ${d.nombre}`,valor:cuota,tipo:"pago_deuda_cuota",fecha,categoria:"Deudas",subcategoria:d.nombre,metodoPago:"Débito",esCredito:false,deudaId:id});
  cerrarPagoDeuda();actualizar();
}

function dibujarDeudas(){
  const cont=document.getElementById("listaDeudas");
  const sel=document.getElementById("selDeudaVinculo");
  if(sel){sel.innerHTML='<option value="">— Selecciona deuda (opcional) —</option>';deudas.forEach(d=>sel.innerHTML+=`<option value="${d.id}">${d.nombre} (${fmt(saldoVivo(d))})</option>`);}
  if(!cont)return;
  if(!deudas.length){cont.innerHTML=`<p style="color:#9aaa9a;text-align:center;padding:20px">Sin deudas registradas</p>`;return;}
  cont.innerHTML=deudas.map(d=>{
    const sv=saldoVivo(d),pagado=d.pagos.reduce((s,p)=>s+(p.capitalPagado||0),0),pct=d.capital>0?Math.min(100,(pagado/d.capital)*100).toFixed(1):0;
    const tasaLbl=d.tipoTasa==="sin_tasa"?"Sin interés":d.tipoTasa==="variable"?"Variable":d.tasaFija+"% mensual";
    const filasAmort=d.pagos.slice().reverse().map(p=>`<tr><td>${p.fecha}</td><td>${fmt(p.cuota)}</td><td style="color:#ef4444">${fmt(p.interes)}</td><td style="color:#22c55e">${fmt(p.capitalPagado)}</td>${d.tipoTasa!=="sin_tasa"?`<td style="color:#9aaa9a">${p.tasaAplicada||0}%</td>`:""}</tr>`).join("");
    const cargosHtml=(d._esTarjetaAuto&&d._cargos&&d._cargos.filter(c=>!c.pagado).length)?`<div style="margin-top:10px"><p style="font-size:12px;color:#f97316;font-weight:700;margin:0 0 6px">⏳ Cargos pendientes:</p>${d._cargos.filter(c=>!c.pagado).sort((a,b)=>new Date(a.fecha)-new Date(b.fecha)).map(c=>`<div style="display:flex;justify-content:space-between;background:#f5f7f5;border-radius:9px;padding:8px 11px;margin-bottom:5px;font-size:12px"><span>${c.fecha} · ${c.desc}</span><span style="color:#f97316;font-weight:700">-${fmt(c.valor)}</span></div>`).join("")}</div>`:"";
    return`<div style="background:#fff;border-radius:16px;padding:16px;margin-bottom:14px;border:1px solid #e8ede8;border-left:4px solid #f97316">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
        <div><p style="font-weight:700;font-size:15px;margin:0 0 2px">${d.nombre}${d._esTarjetaAuto?" 💳":""}</p><p style="font-size:12px;color:#9aaa9a;margin:0">${d.tipo} · ${tasaLbl} · ${d.fecha}${d.cuotas?" · "+d.cuotas+" cuotas":""}</p></div>
        <div style="text-align:right"><p style="font-size:18px;font-weight:800;color:#f97316;margin:0">${fmt(sv)}</p><p style="font-size:11px;color:#9aaa9a;margin:0">Saldo pendiente</p></div>
      </div>
      <div style="background:#f5f7f5;border-radius:999px;height:7px;margin:10px 0 4px"><div style="width:${pct}%;background:linear-gradient(90deg,#006b1a,#00aa33);height:7px;border-radius:999px"></div></div>
      <p style="font-size:12px;color:#9aaa9a;margin:0 0 10px">${pct}% pagado</p>
      ${cargosHtml}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button onclick="abrirPagoDeuda('${d.id}')" style="background:#22c55e;padding:8px 14px;font-size:13px;border-radius:10px">+ Registrar Pago</button>
        <button onclick="eliminarDeuda('${d.id}')" style="background:#dc2626;padding:8px 14px;font-size:13px;border-radius:10px">🗑</button>
        ${d.pagos.length?`<button onclick="toggleTabla('ta_${d.id}')" style="background:rgba(0,150,50,0.1);padding:8px 14px;font-size:13px;border-radius:10px">📋 Historial</button>`:""}
      </div>
      ${d.pagos.length?`<div id="ta_${d.id}" style="display:none;margin-top:10px;overflow-x:auto"><table style="font-size:12px"><thead><tr><th>Fecha</th><th>Cuota</th><th>Interés</th><th>Capital</th>${d.tipoTasa!=="sin_tasa"?"<th>Tasa</th>":""}</tr></thead><tbody>${filasAmort}</tbody></table></div>`:""}
    </div>`;
  }).join("");
}
function toggleTabla(id){const el=document.getElementById(id);if(el)el.style.display=el.style.display==="none"?"block":"none";}

/* ════════════════════════════════
   ESTADÍSTICAS — PALETA MEJORADA
   ════════════════════════════════ */
let mesFiltro=null;
const charts={};
const _pageOrder=["dashboard","movimientos","inversiones","deudas","estadisticas","configuracion"];
const PALETAS={
  gastos:["#ef4444","#f97316","#eab308","#22c55e","#00b8d4","#818cf8","#c084fc","#fb7185","#fdba74","#86efac"],
  inversiones:["#00b8d4","#6c5ce7","#fd9644","#00aa33","#a29bfe","#fdcb6e","#e17055","#55efc4","#fd79a8","#00cec9"],
  metodos:["#00aa33","#00b8d4","#f97316","#a29bfe","#fdcb6e","#fb7185","#6c5ce7","#22c55e","#e17055","#fd79a8"],
  fuentes:["#00aa33","#00b8d4","#f97316","#a29bfe","#fdcb6e","#fb7185","#6c5ce7","#22c55e"],
  divisas:["#00aa33","#00b8d4","#f97316","#a29bfe","#fdcb6e","#fb7185","#6c5ce7","#22c55e"],
};

function abrirPagina(id,direction){
  const current=document.querySelector(".page.active"),currentId=current?current.id:null;
  if(!direction&&currentId&&currentId!==id){const iC=_pageOrder.indexOf(currentId),iN=_pageOrder.indexOf(id);direction=iN>iC?"left":"right";}
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active","slide-left"));
  const p=document.getElementById(id);if(p){if(direction==="right")p.classList.add("slide-left");p.classList.add("active");}
  if(id==="estadisticas"){renderEstadisticas();setTimeout(inicializarZoomGraficas,600);}
  if(id==="deudas")dibujarDeudas();
  if(id==="configuracion")cargarConfiguracion();
  document.querySelectorAll(".bottomNav button, #desktopNav button").forEach(btn=>btn.classList.remove("nav-active"));
  const mBtn=document.getElementById("mnav-"+id),dBtn=document.getElementById("dnav-"+id);
  if(mBtn)mBtn.classList.add("nav-active");if(dBtn)dBtn.classList.add("nav-active");
}

function renderSelectorMeses(){
  const cont=document.getElementById("selectorMeses");if(!cont)return;
  const meses=[...new Set(movimientos.map(m=>m.fecha.substring(0,7)))].sort();
  let html=`<button onclick="filtrarMes(null)" class="btnMes ${mesFiltro===null?"activo":""}">Todo</button>`;
  meses.forEach(m=>{const[a,mo]=m.split("-"),lbl=new Date(Number(a),Number(mo)-1,1).toLocaleDateString("es-CO",{month:"short",year:"2-digit"});html+=`<button onclick="filtrarMes('${m}')" class="btnMes ${mesFiltro===m?"activo":""}">${lbl}</button>`;});
  cont.innerHTML=html;
}
function filtrarMes(mes){mesFiltro=mes;renderEstadisticas();}

function renderEstadisticas(){
  renderSelectorMeses();
  const movF=mesFiltro?movimientos.filter(m=>m.fecha.startsWith(mesFiltro)):movimientos;
  let ingF=0,gasF=0,pagF=0;
  movF.forEach(m=>{if(m.tipo==="ingreso")ingF+=m.valor;else if(m.tipo==="gasto")gasF+=m.valor;else if(m.tipo==="pago_deuda_cuota")pagF+=m.valor;});
  const capitalActivoCaja=inversiones.filter(i=>!i.cobrado&&i.origen==="caja").reduce((s,i)=>s+capitalInvertidoCOP(i)+(i.costos||0),0);
  const setKpi=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  setKpi("statIngresos",fmt(ingF));setKpi("statGastos",fmt(gasF));setKpi("statPagos",fmt(pagF));
  setKpi("statBalance",fmtN(ingF-gasF-pagF-capitalActivoCaja));

  /* ── Series temporales base ── */
  const mesesAll=[...new Set(movimientos.map(m=>m.fecha.substring(0,7)))].sort();
  const ingM=[],gasM=[],pagM=[],deuM=[],patM=[],saldoAcumM=[],ahorroM=[];
  let deuAcum=deudas.reduce((s,d)=>s+d.capital,0),saldoAcum=0;
  mesesAll.forEach(mes=>{
    let i=0,g=0,p=0,tr=0;
    movimientos.filter(m=>m.fecha.startsWith(mes)).forEach(m=>{
      if(m.tipo==="ingreso")i+=m.valor;else if(m.tipo==="gasto"&&!m.esCredito)g+=m.valor;
      else if(m.tipo==="pago_deuda_cuota")p+=m.valor;else if(m.tipo==="traslado_inversion")tr+=m.valor;
    });
    const cp=deudas.reduce((s,d)=>s+d.pagos.filter(pp=>pp.fecha&&pp.fecha.startsWith(mes)).reduce((ss,pp)=>ss+(pp.capitalPagado||0),0),0);
    deuAcum=Math.max(0,deuAcum-cp);
    saldoAcum+=i-g-p-tr;
    const tasaMes=i>0?((i-g-p)/i)*100:0;
    ingM.push(i);gasM.push(g);pagM.push(p);deuM.push(deuAcum);
    saldoAcumM.push(Math.round(saldoAcum));
    ahorroM.push(Math.max(0,tasaMes));
    patM.push(Math.round(saldoAcum+calcularValorInversionesCOP()-deuAcum));
  });
  const labM=mesesAll.map(m=>{const[a,mo]=m.split("-");return new Date(Number(a),Number(mo)-1,1).toLocaleDateString("es-CO",{month:"short",year:"2-digit"});});
  const SC={x:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}};

  /* 1. WATERFALL — Flujo mensual (Ingresos – Gastos – Pagos = Balance) */
  const balanceM=ingM.map((v,i)=>v-gasM[i]-pagM[i]);
  dibujarChart("graficaPrincipal","bar",{
    labels:labM,
    datasets:[
      {label:"Ingresos",data:ingM,backgroundColor:"rgba(0,170,51,0.85)",borderRadius:5,borderSkipped:false,order:2},
      {label:"Gastos",  data:gasM.map(v=>-v),backgroundColor:"rgba(239,68,68,0.85)",borderRadius:5,borderSkipped:false,order:2},
      {label:"Pago Deuda",data:pagM.map(v=>-v),backgroundColor:"rgba(249,115,22,0.85)",borderRadius:5,borderSkipped:false,order:2},
      {label:"Balance", data:balanceM,type:"line",borderColor:"#00b8d4",backgroundColor:"transparent",borderWidth:2.5,tension:0.4,pointBackgroundColor:"#00b8d4",pointRadius:3,order:1}
    ]
  },{scales:SC});

  /* 2. LÍNEA SUAVIZADA — Evolución ingresos vs gastos */
  const mkGrad=(ctx,c1,c2)=>{const g=ctx.createLinearGradient(0,0,0,220);g.addColorStop(0,c1);g.addColorStop(1,c2);return g;};
  dibujarChart("graficaMensual","line",{
    labels:labM,
    datasets:[
      {label:"Ingresos",data:ingM,borderColor:"#00aa33",backgroundColor:(ctx)=>{const c=document.getElementById("graficaMensual").getContext("2d");return mkGrad(c,"rgba(0,170,51,0.3)","rgba(0,170,51,0.02)");},fill:true,tension:0.45,pointRadius:3,pointBackgroundColor:"#00aa33",borderWidth:2.5},
      {label:"Gastos",  data:gasM,borderColor:"#ef4444",backgroundColor:(ctx)=>{const c=document.getElementById("graficaMensual").getContext("2d");return mkGrad(c,"rgba(239,68,68,0.25)","rgba(239,68,68,0.02)");},fill:true,tension:0.45,pointRadius:3,pointBackgroundColor:"#ef4444",borderWidth:2.5},
      {label:"Pago Deuda",data:pagM,borderColor:"#f97316",backgroundColor:"transparent",tension:0.45,pointRadius:2,borderWidth:1.5,borderDash:[4,3]}
    ]
  },{scales:SC});

  /* 3. LÍNEA ÁREA — Evolución deuda + ahorro acumulado */
  dibujarChart("graficaDeuda","line",{
    labels:labM,
    datasets:[
      {label:"Deuda viva",data:deuM,borderColor:"#ef4444",backgroundColor:"rgba(239,68,68,0.12)",fill:true,tension:0.4,pointRadius:3,pointBackgroundColor:"#ef4444",borderWidth:2},
      {label:"Caja acumulada",data:saldoAcumM,borderColor:"#00aa33",backgroundColor:"rgba(0,170,51,0.08)",fill:true,tension:0.4,pointRadius:3,pointBackgroundColor:"#00aa33",borderWidth:2}
    ]
  },{scales:SC});

  /* 4. TREEMAP — Gastos por categoría (SVG nativo, sin lib extra) */
  const catMap={};movF.forEach(m=>{if(m.tipo==="gasto"&&m.categoria)catMap[m.categoria]=(catMap[m.categoria]||0)+m.valor;});
  dibujarTreemap("graficaCategorias",catMap,PALETAS.gastos);

  /* 5. BARRAS APILADAS ÁREA — Categorías por mes */
  const catsUsadas=[...new Set(movimientos.filter(m=>m.tipo==="gasto").map(m=>m.categoria))];
  dibujarChart("graficaCategoriasMensual","bar",{
    labels:labM,
    datasets:catsUsadas.map((cat,i)=>({
      label:cat,
      data:mesesAll.map(mes=>movimientos.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="gasto"&&m.categoria===cat).reduce((s,m)=>s+m.valor,0)),
      backgroundColor:PALETAS.gastos[i%PALETAS.gastos.length],borderRadius:3,stack:"cats"
    }))
  },{scales:{x:{stacked:true,...SC.x},y:{stacked:true,...SC.y}}});

  /* 6. RADAR — Perfil de gastos por categoría */
  const radarCats=Object.keys(catMap).slice(0,8);
  const radarData=radarCats.map(c=>catMap[c]||0);
  if(radarCats.length>=3){
    dibujarChart("graficaRadarGastos","radar",{
      labels:radarCats,
      datasets:[{label:"Gastos",data:radarData,borderColor:"#ef4444",backgroundColor:"rgba(239,68,68,0.18)",pointBackgroundColor:"#ef4444",borderWidth:2}]
    },{scales:{r:{ticks:{color:"#9aaa9a",backdropColor:"transparent"},grid:{color:"#e8ede8"},pointLabels:{color:"#446644",font:{size:11}}}}});
  }

  /* 7. HEATMAP — Gasto diario por día de la semana vs semana del mes */
  dibujarHeatmap("graficaHeatmap");

  /* 8. BARRAS HORIZONTALES — Métodos de pago acumulado */
  const metAcum={};movimientos.filter(m=>m.tipo==="gasto").forEach(m=>{metAcum[m.metodoPago]=(metAcum[m.metodoPago]||0)+m.valor;});
  const metOrdenado=Object.entries(metAcum).sort((a,b)=>b[1]-a[1]);
  if(metOrdenado.length)dibujarChart("graficaMetodos","bar",{
    labels:metOrdenado.map(e=>e[0]),
    datasets:[{label:"Gasto total",data:metOrdenado.map(e=>e[1]),backgroundColor:PALETAS.metodos,borderRadius:8,borderSkipped:false}]
  },{indexAxis:"y",scales:{x:{...SC.x},y:{...SC.y}}});

  /* 9. LÍNEA ÁREA — Tasa de ahorro mensual */
  dibujarChart("graficaMetodosAcum","line",{
    labels:labM,
    datasets:[{label:"Tasa de ahorro %",data:ahorroM,borderColor:"#22c55e",backgroundColor:"rgba(34,197,94,0.15)",fill:true,tension:0.45,pointRadius:3,pointBackgroundColor:"#22c55e",borderWidth:2.5}]
  },{scales:{...SC,y:{...SC.y,ticks:{...SC.y.ticks,callback:v=>v.toFixed(1)+"%"}}}});

  /* 10. BARRAS HORIZONTALES — Portafolio por tipo de activo */
  const tipoMap={};
  inversiones.filter(i=>!i.cobrado||(i.cantidadRestante??i.cantidad??0)>0.000001).forEach(i=>{tipoMap[i.tipo]=(tipoMap[i.tipo]||0)+valorActualInvCOP(i);});
  const tipoOrdenado=Object.entries(tipoMap).sort((a,b)=>b[1]-a[1]);
  if(tipoOrdenado.length)dibujarChart("graficaInversiones","bar",{
    labels:tipoOrdenado.map(e=>e[0]),
    datasets:[{label:"Valor (COP)",data:tipoOrdenado.map(e=>e[1]),backgroundColor:tipoOrdenado.map(e=>PALETA_TIPO[e[0]]||"#9aaa9a"),borderRadius:8,borderSkipped:false}]
  },{indexAxis:"y",scales:{x:{...SC.x,ticks:{...SC.x.ticks,callback:v=>"$"+Math.round(v/1e6)+"M"}},y:{...SC.y}}});

  /* 11. BARRAS HORIZONTALES — Broker */
  const brokerMap={};
  inversiones.filter(i=>!i.cobrado||(i.cantidadRestante??i.cantidad??0)>0.000001).forEach(inv=>{
    const lbl=inv.broker&&inv.broker!=="—"&&inv.broker!==""?inv.broker:"Sin bróker";
    brokerMap[lbl]=(brokerMap[lbl]||0)+valorActualInvCOP(inv);
  });
  const brokerOrd=Object.entries(brokerMap).sort((a,b)=>b[1]-a[1]);
  if(brokerOrd.length)dibujarChart("graficaRiesgoBroker","bar",{
    labels:brokerOrd.map(e=>e[0]),
    datasets:[{label:"Valor (COP)",data:brokerOrd.map(e=>e[1]),backgroundColor:PALETAS.inversiones,borderRadius:8,borderSkipped:false}]
  },{indexAxis:"y",scales:{x:{...SC.x,ticks:{...SC.x.ticks,callback:v=>"$"+Math.round(v/1e6)+"M"}},y:{...SC.y}}});

  /* 12. LÍNEA ÁREA — Fuentes de ingreso por mes */
  const fuentesTop=Object.entries(
    movimientos.reduce((acc,m)=>{if(m.tipo==="ingreso"){const lbl=m.subcategoria&&m.subcategoria!=="Subcategoría"?m.subcategoria:(m.descripcion||m.desc||"Otro");acc[lbl]=(acc[lbl]||0)+m.valor;}return acc;},{})
  ).sort((a,b)=>b[1]-a[1]).slice(0,5).map(e=>e[0]);
  if(fuentesTop.length){
    dibujarChart("graficaFuentesIngresos","line",{
      labels:labM,
      datasets:fuentesTop.map((f,i)=>({
        label:f,
        data:mesesAll.map(mes=>movimientos.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="ingreso"&&(m.subcategoria===f||m.descripcion===f||m.desc===f)).reduce((s,m)=>s+m.valor,0)),
        borderColor:PALETAS.fuentes[i],backgroundColor:PALETAS.fuentes[i]+"22",fill:true,tension:0.45,pointRadius:2,borderWidth:2
      }))
    },{scales:SC});
  }

  /* 13. LÍNEA ÁREA — Patrimonio histórico */
  dibujarChart("graficaDivisas","line",{
    labels:labM,
    datasets:[{
      label:"Patrimonio",data:patM,borderColor:"#6c5ce7",
      backgroundColor:"rgba(108,92,231,0.12)",fill:true,tension:0.4,
      pointRadius:3,pointBackgroundColor:"#6c5ce7",borderWidth:2.5
    }]
  },{scales:SC});

  // Actualizar KPIs analítica y zoom
  if(typeof actualizarKpisAnalitica==="function") actualizarKpisAnalitica();
  setTimeout(inicializarZoomGraficas,600);
}

/* ── TREEMAP SVG nativo ── */
function dibujarTreemap(canvasId,dataMap,colores){
  const canvas=document.getElementById(canvasId);if(!canvas)return;
  const parent=canvas.parentElement;
  // Reemplazar canvas por div SVG
  let svgDiv=parent.querySelector(".treemapSvg");
  if(!svgDiv){svgDiv=document.createElement("div");svgDiv.className="treemapSvg";canvas.style.display="none";parent.appendChild(svgDiv);}
  const W=parent.clientWidth||320,H=220;
  const entries=Object.entries(dataMap).filter(e=>e[1]>0).sort((a,b)=>b[1]-a[1]);
  if(!entries.length){svgDiv.innerHTML="";return;}
  const total=entries.reduce((s,e)=>s+e[1],0);
  // Squarified treemap simple
  const rects=squarify(entries.map(e=>({label:e[0],value:e[1]})),0,0,W,H,total);
  svgDiv.innerHTML=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;border-radius:12px;overflow:hidden">
    ${rects.map((r,i)=>{
      const pct=((r.value/total)*100).toFixed(1);
      const col=colores[i%colores.length];
      const fs=Math.min(13,Math.max(8,r.w/8));
      return`<g>
        <rect x="${r.x+1}" y="${r.y+1}" width="${r.w-2}" height="${r.h-2}" fill="${col}" rx="6" opacity="0.88"/>
        ${r.w>50&&r.h>28?`<text x="${r.x+r.w/2}" y="${r.y+r.h/2-6}" text-anchor="middle" fill="#fff" font-size="${fs}" font-weight="700" font-family="sans-serif">${r.label}</text><text x="${r.x+r.w/2}" y="${r.y+r.h/2+10}" text-anchor="middle" fill="rgba(255,255,255,.8)" font-size="${Math.max(8,fs-2)}" font-family="sans-serif">${pct}%</text>`:""}
      </g>`;
    }).join("")}
  </svg>`;
}
function squarify(items,x,y,w,h,total){
  if(!items.length)return[];
  const rects=[];
  const sorted=[...items].sort((a,b)=>b.value-a.value);
  let remaining=[...sorted],rx=x,ry=y,rw=w,rh=h;
  while(remaining.length){
    const area=(remaining[0].value/total)*w*h;
    const side=rw<rh?rw:rh;
    const rowItems=[];let rowSum=0;
    for(const it of remaining){
      const candidate=[...rowItems,it];
      const cSum=rowSum+it.value;
      const cArea=(cSum/total)*w*h;
      const cLen=cArea/side;
      const worst=candidate.reduce((mx,c)=>{const a=(c.value/total)*w*h;const r=cLen/a*a/cLen;return Math.max(mx,Math.max(r,1/r));},0);
      const prevWorst=rowItems.length?rowItems.reduce((mx,c)=>{const a=(c.value/total)*w*h;const pLen=(rowSum/total)*w*h/side;const r=pLen/a*a/pLen;return Math.max(mx,Math.max(r,1/r));},0):Infinity;
      if(rowItems.length&&worst>prevWorst)break;
      rowItems.push(it);rowSum+=it.value;
    }
    const rowArea=(rowSum/total)*w*h;
    const rowLen=rowArea/side;
    let pos=rw<rh?ry:rx;
    for(const it of rowItems){
      const itArea=(it.value/total)*w*h;
      const itLen=itArea/rowLen;
      if(rw<rh){rects.push({label:it.label,value:it.value,x:rx,y:pos,w:rowLen,h:itLen});pos+=itLen;}
      else{rects.push({label:it.label,value:it.value,x:pos,y:ry,w:itLen,h:rowLen});pos+=itLen;}
    }
    remaining=remaining.slice(rowItems.length);
    if(rw<rh){rx+=rowLen;rw-=rowLen;}else{ry+=rowLen;rh-=rowLen;}
    if(remaining.length&&(rw<2||rh<2))break;
  }
  return rects;
}

/* ── HEATMAP — Gasto por día semana × semana mes ── */
function dibujarHeatmap(canvasId){
  const canvas=document.getElementById(canvasId);if(!canvas)return;
  const parent=canvas.parentElement;
  let svgDiv=parent.querySelector(".heatmapSvg");
  if(!svgDiv){svgDiv=document.createElement("div");svgDiv.className="heatmapSvg";canvas.style.display="none";parent.appendChild(svgDiv);}
  const dias=["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  const semanas=["Sem 1","Sem 2","Sem 3","Sem 4","Sem 5+"];
  const grid=Array.from({length:5},()=>Array(7).fill(0));
  movimientos.filter(m=>m.tipo==="gasto").forEach(m=>{
    const d=new Date(m.fecha+"T12:00:00");
    const diaSem=d.getDay();
    const primer=new Date(d.getFullYear(),d.getMonth(),1).getDay();
    const semIdx=Math.min(4,Math.floor((d.getDate()+primer-1)/7));
    grid[semIdx][diaSem]+=m.valor;
  });
  const maxVal=grid.flat().reduce((mx,v)=>v>mx?v:mx,0)||1;
  const CW=36,CH=28,padL=48,padT=28,W=padL+7*CW+10,H=padT+5*CH+20;
}

function dibujarChart(canvasId,tipo,data,extraOpts={}){
  const canvas=document.getElementById(canvasId);if(!canvas)return;
  if(charts[canvasId])charts[canvasId].destroy();
  charts[canvasId]=new Chart(canvas,{type:tipo,data,options:{responsive:true,plugins:{legend:{labels:{color:"#111811",font:{size:11}}}}, ...extraOpts}});
}

/* ════════════════════════════════
   INFORMES
   ════════════════════════════════ */
function generarInformeMensual(){
  const mesesDisp=[...new Set(movimientos.map(m=>m.fecha.substring(0,7)))].sort();
  if(!mesesDisp.length){alert("Sin movimientos.");return;}
  const mesEl=prompt("Mes (ej: 2026-01):\n"+mesesDisp.join(", "),mesesDisp[mesesDisp.length-1]);
  if(!mesEl)return;
  const movMes=movimientos.filter(m=>m.fecha.startsWith(mesEl)).sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
  if(!movMes.length){alert("Sin movimientos en ese mes.");return;}
  let ingM=0,gasM=0,pagM=0;const catMap={},metMap={};
  movMes.forEach(m=>{if(m.tipo==="ingreso")ingM+=m.valor;else if(m.tipo==="gasto"){gasM+=m.valor;catMap[m.categoria]=(catMap[m.categoria]||0)+m.valor;metMap[m.metodoPago]=(metMap[m.metodoPago]||0)+m.valor;}else if(m.tipo==="pago_deuda_cuota")pagM+=m.valor;});
  const[a,mo]=mesEl.split("-");
  const nomMes=new Date(Number(a),Number(mo)-1,1).toLocaleDateString("es-CO",{month:"long",year:"numeric"});
  const divSaldo=posicionesDivisa.filter(p=>p.cantidad>0).map(p=>{const ganFx=p.cantidad*(tcCOP(p.divisa)-p.costoProm);return`<li>${p.cantidad.toFixed(4)} ${p.divisa} ≈ ${fmt(p.cantidad*tcCOP(p.divisa))} <span style="color:${ganFx>=0?"#00aa33":"#ef4444"}">(P&G FX: ${ganFx>=0?"+":""}${fmtN(ganFx)})</span></li>`;}).join("");
  const ventasMes=ventasInversion.filter(v=>v.fecha.startsWith(mesEl));
  const ganActTot=ventasMes.reduce((s,v)=>s+v.gananciaActivoCop,0);
  const ganFxTot=ventasMes.reduce((s,v)=>s+v.gananciaFxCop,0);
  const divMesCop=_dividendos.filter(d=>d.fecha.startsWith(mesEl)).reduce((s,d)=>s+(d.montoCop||0),0);
  const mesesAll=[...new Set(movimientos.map(m=>m.fecha.substring(0,7)))].sort();
  const ingAll=[],gasAll=[],pagAll=[];
  mesesAll.forEach(mes=>{let i=0,g=0,p=0;movimientos.filter(m=>m.fecha.startsWith(mes)).forEach(m=>{if(m.tipo==="ingreso")i+=m.valor;else if(m.tipo==="gasto")g+=m.valor;else if(m.tipo==="pago_deuda_cuota")p+=m.valor;});ingAll.push(i);gasAll.push(g);pagAll.push(p);});
  const labAll=mesesAll.map(m=>{const[a2,mo2]=m.split("-");return new Date(Number(a2),Number(mo2)-1,1).toLocaleDateString("es-CO",{month:"short",year:"2-digit"});});
  const fuentesAcum={};movimientos.forEach(m=>{if(m.tipo==="ingreso"){const lbl=m.subcategoria&&m.subcategoria!=="Subcategoría"?m.subcategoria:(m.categoria&&m.categoria!=="Entradas"?m.categoria:(m.descripcion||m.desc||"Otro"));fuentesAcum[lbl]=(fuentesAcum[lbl]||0)+m.valor;}});
  const metTodosM=[...new Set(movimientos.filter(m=>m.tipo==="gasto").map(m=>m.metodoPago))];
  const metDsM=metTodosM.map((met,i)=>({label:met,data:mesesAll.map(mes=>movimientos.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="gasto"&&m.metodoPago===met).reduce((s,m)=>s+m.valor,0)),backgroundColor:["#00aa33","#00b8d4","#f97316","#a29bfe","#fdcb6e","#fb7185","#6c5ce7","#22c55e"][i%8],borderRadius:4}));
  const metAcumTot={};movimientos.filter(m=>m.tipo==="gasto").forEach(m=>{metAcumTot[m.metodoPago]=(metAcumTot[m.metodoPago]||0)+m.valor;});
  const brokerMapI={};inversiones.filter(i=>!i.cobrado||(i.cantidadRestante??i.cantidad??0)>0.000001).forEach(inv=>{const lbl=inv.broker&&inv.broker!==""?inv.broker:"Sin bróker";brokerMapI[lbl]=(brokerMapI[lbl]||0)+valorActualInvCOP(inv);});
  const cl=["#00aa33","#00b8d4","#f97316","#a29bfe","#fdcb6e","#fb7185","#6c5ce7","#22c55e"];
  const filas=movMes.map(m=>{const col=m.tipo==="ingreso"?"#00aa33":m.tipo==="pago_deuda_cuota"?"#f97316":"#ef4444",sig=m.tipo==="ingreso"?"+":m.tipo==="pago_deuda_cuota"?"↓":"-";return`<tr><td>${m.fecha}</td><td>${m.descripcion||m.desc}</td><td>${m.categoria||"—"}</td><td>${m.metodoPago||""}</td><td style="color:${col};font-weight:700">${sig}${fmt(m.valor)}</td></tr>`;}).join("");
  const invActivasI=inversiones.filter(i=>!i.cobrado||(i.cantidadRestante??i.cantidad??0)>0.000001);

  const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Informe ${nomMes}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f7f5;color:#111811;padding:18px}h1{font-size:20px;font-weight:800;background:linear-gradient(90deg,#006b1a,#00aa33);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:3px}.sub{color:#446644;font-size:12px;margin-bottom:16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:9px;margin-bottom:16px}.kpi{background:#fff;border-radius:13px;padding:12px 10px;text-align:center;border:1.5px solid #e0e8e0}.kpi .l{font-size:10px;color:#9aaa9a;margin-bottom:5px}.kpi .v{font-size:14px;font-weight:700;word-break:break-all}.verde{color:#006b1a}.rojo{color:#ef4444}.naranja{color:#f97316}.azul{color:#00aa33}.purp{color:#a29bfe}section{margin-bottom:16px;background:#fff;border:1px solid #e8ede8;padding:13px;border-radius:13px}section h2{font-size:13px;font-weight:700;color:#006b1a;margin-bottom:11px;padding-bottom:6px;border-bottom:1px solid #e8ede8}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#f5f7f5;padding:6px 8px;text-align:left;color:#446644;font-weight:600}td{padding:6px 8px;border-bottom:1px solid #e8ede8}.grafGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.grafGrid>div{max-height:190px;overflow:hidden;background:#fff;border:1px solid #e8ede8;border-radius:11px;padding:8px}.grafGrid canvas{max-height:155px!important}@media(max-width:500px){.grafGrid{grid-template-columns:1fr}}</style></head><body>
<h1>📋 Informe Mensual</h1><p class="sub">${nomMes.charAt(0).toUpperCase()+nomMes.slice(1)}</p>
<div class="grid">
  <div class="kpi"><div class="l">💵 Ingresos</div><div class="v verde">${fmt(ingM)}</div></div>
  <div class="kpi"><div class="l">💸 Gastos</div><div class="v rojo">${fmt(gasM)}</div></div>
  <div class="kpi"><div class="l">🏦 Saldo mes</div><div class="v azul">${fmtN(ingM-gasM-pagM)}</div></div>
  <div class="kpi"><div class="l">💳 Pagos deuda</div><div class="v naranja">${fmt(pagM)}</div></div>
  <div class="kpi"><div class="l">📈 P&G Activos</div><div class="v ${ganActTot>=0?"verde":"rojo"}">${ganActTot>=0?"+":""}${fmtN(Math.abs(ganActTot))}</div></div>
  <div class="kpi"><div class="l">💱 P&G FX</div><div class="v ${ganFxTot>=0?"verde":"rojo"}">${ganFxTot>=0?"+":""}${fmtN(Math.abs(ganFxTot))}</div></div>
  <div class="kpi"><div class="l">💵 Dividendos</div><div class="v purp">${fmt(divMesCop)}</div></div>
</div>
${divSaldo?`<section><h2>💱 Posición en Divisas</h2><ul style="font-size:13px;color:#446644;padding-left:16px">${divSaldo}</ul></section>`:""}
<section><h2>📈 Gráficas históricas</h2><div class="grafGrid">
  <div><p style="text-align:center;font-size:10px;color:#9aaa9a;margin-bottom:5px">Ingresos vs Gastos vs Pago Deuda</p><canvas id="cMen"></canvas></div>
  <div><p style="text-align:center;font-size:10px;color:#9aaa9a;margin-bottom:5px">Gastos del mes</p><canvas id="cCat"></canvas></div>
  <div><p style="text-align:center;font-size:10px;color:#9aaa9a;margin-bottom:5px">Métodos — Mensual Apilado</p><canvas id="cMet"></canvas></div>
  <div><p style="text-align:center;font-size:10px;color:#9aaa9a;margin-bottom:5px">Métodos — Acumulado Total</p><canvas id="cMetAcum"></canvas></div>
  <div><p style="text-align:center;font-size:10px;color:#9aaa9a;margin-bottom:5px">Fuentes de Ingreso (Acum.)</p><canvas id="cFuentes"></canvas></div>
  <div><p style="text-align:center;font-size:10px;color:#9aaa9a;margin-bottom:5px">Portafolio Activo (Activas)</p><canvas id="cInv"></canvas></div>
  <div style="grid-column:1/-1"><p style="text-align:center;font-size:10px;color:#9aaa9a;margin-bottom:5px">Riesgo por Bróker (sólo activas)</p><canvas id="cBroker" style="max-height:150px"></canvas></div>
</div></section>
<section><h2>Movimientos del mes</h2><table><thead><tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Método</th><th>Valor</th></tr></thead><tbody>${filas}</tbody></table></section>
<script>
const cl=${JSON.stringify(cl)};const opts={responsive:true,plugins:{legend:{labels:{color:"#446644",font:{size:10}}}}};
new Chart(document.getElementById("cMen"),{type:"bar",data:{labels:${JSON.stringify(labAll)},datasets:[{label:"Ingresos",data:${JSON.stringify(ingAll)},backgroundColor:"#00aa33",borderRadius:4},{label:"Gastos",data:${JSON.stringify(gasAll)},backgroundColor:"#ef4444",borderRadius:4},{label:"Pago Deuda",data:${JSON.stringify(pagAll)},backgroundColor:"#f97316",borderRadius:4}]},options:{...opts,scales:{x:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}}}});
new Chart(document.getElementById("cCat"),{type:"doughnut",data:{labels:${JSON.stringify(Object.keys(catMap))},datasets:[{data:${JSON.stringify(Object.values(catMap))},backgroundColor:cl,borderWidth:2,borderColor:"#fff"}]},options:opts});
new Chart(document.getElementById("cMet"),{type:"bar",data:{labels:${JSON.stringify(labAll)},datasets:${JSON.stringify(metDsM)}},options:{...opts,scales:{x:{stacked:true,ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{stacked:true,ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}}}});
new Chart(document.getElementById("cMetAcum"),{type:"bar",data:{labels:${JSON.stringify(Object.keys(metAcumTot))},datasets:[{label:"Total",data:${JSON.stringify(Object.values(metAcumTot))},backgroundColor:cl,borderRadius:8}]},options:{...opts,scales:{x:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}}}});
${Object.keys(fuentesAcum).length?`new Chart(document.getElementById("cFuentes"),{type:"doughnut",data:{labels:${JSON.stringify(Object.keys(fuentesAcum).map(k=>k+" ("+((Object.values(fuentesAcum).reduce((s,v)=>s+v,0)>0?(fuentesAcum[k]/Object.values(fuentesAcum).reduce((s,v)=>s+v,0))*100:0).toFixed(1))+"%)" ))},datasets:[{data:${JSON.stringify(Object.values(fuentesAcum))},backgroundColor:cl,borderWidth:2,borderColor:"#fff"}]},options:opts});`:""}
${invActivasI.length?`new Chart(document.getElementById("cInv"),{type:"doughnut",data:{labels:${JSON.stringify(invActivasI.map(i=>i.nombre))},datasets:[{data:${JSON.stringify(invActivasI.map(i=>Math.max(0,valorActualInvCOP(i))))},backgroundColor:cl,borderWidth:2,borderColor:"#fff"}]},options:opts});`:""}
${Object.keys(brokerMapI).length?`new Chart(document.getElementById("cBroker"),{type:"bar",data:{labels:${JSON.stringify(Object.keys(brokerMapI))},datasets:[{label:"Valor",data:${JSON.stringify(Object.values(brokerMapI))},backgroundColor:cl,borderRadius:8}]},options:{...opts,indexAxis:"y",scales:{x:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}}}});`:""}
<\/script></body></html>`;
  const w=window.open("","_blank");w.document.write(html);w.document.close();
}

function generarEstadoGeneral(){
  const T=calcularTotales(),valorInv=calcularValorInversionesCOP(),dn=calcularDeudaNeta();
  const valorDiv=posicionesDivisa.reduce((s,p)=>s+p.cantidad*tcCOP(p.divisa),0);
  const pat=T.saldoCaja+valorDiv+valorInv-dn;
  const ganReal=ventasInversion.reduce((s,v)=>s+(v.gananciaActivoCop||0)+(v.gananciaFxCop||0),0);
  const ganFxDiv=posicionesDivisa.reduce((s,p)=>s+p.cantidad*(tcCOP(p.divisa)-(p.costoProm||tcCOP(p.divisa))),0);
  const divIngresos=_dividendos.filter(d=>d.destino==="caja_cop").reduce((s,d)=>s+(d.montoCop||0),0);
  const mesesAll=[...new Set(movimientos.map(m=>m.fecha.substring(0,7)))].sort();
  const ingAll=[],gasAll=[],pagAll=[],deuAll=[];let saldoA=deudas.reduce((s,d)=>s+d.capital,0);
  mesesAll.forEach(mes=>{let i=0,g=0,p=0;movimientos.filter(m=>m.fecha.startsWith(mes)).forEach(m=>{if(m.tipo==="ingreso")i+=m.valor;else if(m.tipo==="gasto"&&!m.esCredito)g+=m.valor;else if(m.tipo==="pago_deuda_cuota")p+=m.valor;});const cp=deudas.reduce((s,d)=>s+d.pagos.filter(pp=>pp.fecha&&pp.fecha.startsWith(mes)).reduce((ss,pp)=>ss+(pp.capitalPagado||0),0),0);saldoA=Math.max(0,saldoA-cp);ingAll.push(i);gasAll.push(g);pagAll.push(p);deuAll.push(saldoA);});
  const labAll=mesesAll.map(m=>{const[a,mo]=m.split("-");return new Date(Number(a),Number(mo)-1,1).toLocaleDateString("es-CO",{month:"short",year:"2-digit"});});
  const catMap={},fuentesAll={};movimientos.forEach(m=>{if(m.tipo==="gasto")catMap[m.categoria]=(catMap[m.categoria]||0)+m.valor;if(m.tipo==="ingreso"){const lbl=m.subcategoria&&m.subcategoria!=="Subcategoría"?m.subcategoria:(m.categoria&&m.categoria!=="Entradas"?m.categoria:(m.descripcion||m.desc||"Otro"));fuentesAll[lbl]=(fuentesAll[lbl]||0)+m.valor;}});
  const invActivasG=inversiones.filter(i=>!i.cobrado||(i.cantidadRestante??i.cantidad??0)>0.000001);
  const brokerMapG={};invActivasG.forEach(inv=>{const lbl=inv.broker&&inv.broker!==""?inv.broker:"Sin bróker";brokerMapG[lbl]=(brokerMapG[lbl]||0)+valorActualInvCOP(inv);});
  const metTodosG=[...new Set(movimientos.filter(m=>m.tipo==="gasto").map(m=>m.metodoPago))];
  const metDsG=metTodosG.map((met,i)=>({label:met,data:mesesAll.map(mes=>movimientos.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="gasto"&&m.metodoPago===met).reduce((s,m)=>s+m.valor,0)),backgroundColor:["#00aa33","#00b8d4","#f97316","#a29bfe","#fdcb6e","#fb7185","#6c5ce7","#22c55e"][i%8],borderRadius:4}));
  const gasTotal=Object.values(catMap).reduce((s,v)=>s+v,0);
  const cl=["#00aa33","#00b8d4","#f97316","#a29bfe","#fdcb6e","#fb7185","#6c5ce7","#22c55e"];
  const barrasCat=Object.entries(catMap).sort((a,b)=>b[1]-a[1]).map(([cat,val],i)=>{const pct=gasTotal>0?((val/gasTotal)*100).toFixed(1):0;return`<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span>${cat}</span><span style="color:${cl[i%cl.length]};font-weight:700">${fmt(val)} (${pct}%)</span></div><div style="background:#f5f7f5;border-radius:999px;height:8px"><div style="width:${pct}%;background:${cl[i%cl.length]};height:8px;border-radius:999px"></div></div></div>`;}).join("");
  const filasInv=invActivasG.map(i=>{const va=valorActualInvCOP(i),ci=capitalInvertidoCOP(i);return`<tr><td>${i.tipo}</td><td>${i.nombre}</td><td style="font-size:11px">${i.divisa||"COP"}</td><td>${fmt(ci)}</td><td>${fmt(va)}</td><td style="color:${va-ci>=0?"#00aa33":"#ef4444"}">${va-ci>=0?"+":""}${fmtN(Math.abs(va-ci))}</td></tr>`;}).join("");
  const secDeuda=deudas.map(d=>`<p style="font-weight:700;font-size:13px;margin:10px 0 4px">${d.nombre} — Saldo: ${fmt(saldoVivo(d))}</p><table><thead><tr><th>Fecha</th><th>Cuota</th><th>Interés</th><th>Capital</th></tr></thead><tbody>${d.pagos.map(p=>`<tr><td>${p.fecha}</td><td>${fmt(p.cuota)}</td><td style="color:#ef4444">${fmt(p.interes)}</td><td style="color:#22c55e">${fmt(p.capitalPagado)}</td></tr>`).join("")}</tbody></table>`).join("");
  const divSaldoHtml=posicionesDivisa.filter(p=>p.cantidad>0).map(p=>{const gfx=p.cantidad*(tcCOP(p.divisa)-p.costoProm);return`<tr><td>${p.divisa}</td><td>${p.cantidad.toFixed(4)}</td><td>${p.costoProm.toLocaleString("es-CO",{minimumFractionDigits:2,maximumFractionDigits:2})}</td><td>${tcCOP(p.divisa).toLocaleString("es-CO",{minimumFractionDigits:2,maximumFractionDigits:2})}</td><td>${fmt(p.cantidad*tcCOP(p.divisa))}</td><td style="color:${gfx>=0?"#00aa33":"#ef4444"}">${gfx>=0?"+":""}${fmtN(gfx)}</td></tr>`;}).join("");
  const fecha=new Date().toLocaleDateString("es-CO",{weekday:"long",day:"numeric",month:"long",year:"numeric"});

  const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Estado General</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f7f5;color:#111811;padding:18px}h1{font-size:22px;font-weight:800;background:linear-gradient(90deg,#006b1a,#00aa33);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:3px}.sub{color:#446644;font-size:12px;margin-bottom:16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:9px;margin-bottom:16px}.kpi{background:#fff;border-radius:13px;padding:12px 10px;text-align:center;border:1.5px solid #e0e8e0}.kpi .l{font-size:10px;color:#9aaa9a;margin-bottom:5px}.kpi .v{font-size:14px;font-weight:700;word-break:break-all}.verde{color:#006b1a}.rojo{color:#ef4444}.naranja{color:#f97316}.azul{color:#00aa33}.purp{color:#a29bfe}section{margin-bottom:16px;background:#fff;border:1px solid #e8ede8;padding:13px;border-radius:13px}section h2{font-size:13px;font-weight:700;color:#006b1a;margin-bottom:11px;padding-bottom:6px;border-bottom:1px solid #e8ede8}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#f5f7f5;padding:6px 8px;text-align:left;color:#446644;font-weight:600}td{padding:6px 8px;border-bottom:1px solid #e8ede8}.grafGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.grafGrid>div{max-height:190px;overflow:hidden;background:#fff;border:1px solid #e8ede8;border-radius:11px;padding:8px}.grafGrid canvas{max-height:155px!important}@media(max-width:500px){.grafGrid{grid-template-columns:1fr}}</style></head><body>
<h1>🧾 Estado General del Patrimonio</h1><p class="sub">${fecha}</p>
<div class="grid">
  <div class="kpi"><div class="l">💵 Ingresos</div><div class="v verde">${fmt(T.ingresos)}</div></div>
  <div class="kpi"><div class="l">💸 Gastos</div><div class="v rojo">${fmt(T.gastos)}</div></div>
  <div class="kpi"><div class="l">🏦 Caja</div><div class="v azul">${fmtN(T.saldoCaja)}</div></div>
  <div class="kpi"><div class="l">💱 Divisas</div><div class="v purp">${fmt(valorDiv)}</div></div>
  <div class="kpi"><div class="l">📈 Inversiones</div><div class="v azul">${fmt(valorInv)}</div></div>
  <div class="kpi"><div class="l">💳 Deuda neta</div><div class="v rojo">${fmt(dn)}</div></div>
  <div class="kpi"><div class="l">🏛 Patrimonio</div><div class="v ${pat>=0?"verde":"rojo"}">${fmtN(pat)}</div></div>
  <div class="kpi"><div class="l">📈 P&G Realizado</div><div class="v ${ganReal>=0?"verde":"rojo"}">${ganReal>=0?"+":""}${fmtN(Math.abs(ganReal))}</div></div>
  <div class="kpi"><div class="l">💱 P&G FX No Real.</div><div class="v ${ganFxDiv>=0?"verde":"rojo"}">${ganFxDiv>=0?"+":""}${fmtN(Math.abs(ganFxDiv))}</div></div>
  <div class="kpi"><div class="l">💵 Dividendos</div><div class="v purp">${fmt(divIngresos)}</div></div>
</div>
${divSaldoHtml?`<section><h2>💱 Posición en Divisas</h2><table><thead><tr><th>Divisa</th><th>Cantidad</th><th>CPP (COP)</th><th>TC Actual</th><th>Valor COP</th><th>P&G FX</th></tr></thead><tbody>${divSaldoHtml}</tbody></table></section>`:""}
<section><h2>📈 Gráficas</h2><div class="grafGrid">
  <div><p style="font-size:10px;color:#9aaa9a;text-align:center;margin-bottom:5px">Ingresos vs Gastos vs Deuda</p><canvas id="gMen"></canvas></div>
  <div><p style="font-size:10px;color:#9aaa9a;text-align:center;margin-bottom:5px">Evolución Deuda</p><canvas id="gDeu"></canvas></div>
  <div><p style="font-size:10px;color:#9aaa9a;text-align:center;margin-bottom:5px">Gastos por Categoría</p><canvas id="gCat"></canvas></div>
  <div><p style="font-size:10px;color:#9aaa9a;text-align:center;margin-bottom:5px">Fuentes de Ingreso</p><canvas id="gFuentes"></canvas></div>
  <div><p style="font-size:10px;color:#9aaa9a;text-align:center;margin-bottom:5px">Portafolio (Activas)</p><canvas id="gInv"></canvas></div>
  <div><p style="font-size:10px;color:#9aaa9a;text-align:center;margin-bottom:5px">Métodos de Pago</p><canvas id="gMet"></canvas></div>
  <div style="grid-column:1/-1"><p style="font-size:10px;color:#9aaa9a;text-align:center;margin-bottom:5px">Riesgo por Bróker (sólo activas)</p><canvas id="gBroker" style="max-height:150px"></canvas></div>
</div></section>
<section><h2>📉 Gastos por Categoría</h2>${barrasCat}</section>
${invActivasG.length?`<section><h2>📈 Inversiones Activas</h2><table><thead><tr><th>Tipo</th><th>Nombre</th><th>Divisa</th><th>Invertido</th><th>Actual</th><th>Ganancia</th></tr></thead><tbody>${filasInv}</tbody></table></section>`:""}
${deudas.length?`<section><h2>💳 Deudas</h2>${secDeuda}</section>`:""}
<script>
const cl=${JSON.stringify(cl)};const opts={responsive:true,plugins:{legend:{labels:{color:"#446644",font:{size:10}}}}};
new Chart(document.getElementById("gMen"),{type:"bar",data:{labels:${JSON.stringify(labAll)},datasets:[{label:"Ingresos",data:${JSON.stringify(ingAll)},backgroundColor:"#00aa33",borderRadius:4},{label:"Gastos",data:${JSON.stringify(gasAll)},backgroundColor:"#ef4444",borderRadius:4},{label:"Pago Deuda",data:${JSON.stringify(pagAll)},backgroundColor:"#f97316",borderRadius:4}]},options:{...opts,scales:{x:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}}}});
new Chart(document.getElementById("gDeu"),{type:"line",data:{labels:${JSON.stringify(labAll)},datasets:[{label:"Deuda viva",data:${JSON.stringify(deuAll)},borderColor:"#f97316",backgroundColor:"rgba(249,115,22,0.12)",fill:true,tension:0.3}]},options:{...opts,scales:{x:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}}}});
${Object.keys(catMap).length?`new Chart(document.getElementById("gCat"),{type:"doughnut",data:{labels:${JSON.stringify(Object.keys(catMap))},datasets:[{data:${JSON.stringify(Object.values(catMap))},backgroundColor:cl,borderWidth:2,borderColor:"#fff"}]},options:opts});`:""}
${Object.keys(fuentesAll).length?`new Chart(document.getElementById("gFuentes"),{type:"doughnut",data:{labels:${JSON.stringify(Object.keys(fuentesAll))},datasets:[{data:${JSON.stringify(Object.values(fuentesAll))},backgroundColor:cl,borderWidth:2,borderColor:"#fff"}]},options:opts});`:""}
${invActivasG.length?`new Chart(document.getElementById("gInv"),{type:"doughnut",data:{labels:${JSON.stringify(invActivasG.map(i=>i.nombre))},datasets:[{data:${JSON.stringify(invActivasG.map(i=>Math.max(0,valorActualInvCOP(i))))},backgroundColor:cl,borderWidth:2,borderColor:"#fff"}]},options:opts});`:""}
new Chart(document.getElementById("gMet"),{type:"bar",data:{labels:${JSON.stringify(labAll)},datasets:${JSON.stringify(metDsG)}},options:{...opts,scales:{x:{stacked:true,ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{stacked:true,ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}}}});
${Object.keys(brokerMapG).length?`new Chart(document.getElementById("gBroker"),{type:"bar",data:{labels:${JSON.stringify(Object.keys(brokerMapG))},datasets:[{label:"Valor",data:${JSON.stringify(Object.values(brokerMapG))},backgroundColor:cl,borderRadius:8}]},options:{...opts,indexAxis:"y",scales:{x:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}}}});`:""}
<\/script></body></html>`;
  const w=window.open("","_blank");w.document.write(html);w.document.close();
}

/* ════════════════════════════════
   EXPORTAR EXCEL COMPLETO
   ════════════════════════════════ */
async function exportarExcel(){
  if(typeof XLSX==="undefined"){alert("Librería XLSX no disponible.");return;}
  const T=calcularTotales(),valorInv=calcularValorInversionesCOP(),dn=calcularDeudaNeta();
  const valorDiv=posicionesDivisa.reduce((s,p)=>s+p.cantidad*tcCOP(p.divisa),0);
  const libro=XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(libro,XLSX.utils.json_to_sheet(movimientos.map(m=>({Fecha:m.fecha,Descripcion:m.descripcion||m.desc,Tipo:m.tipo,Valor:m.valor,Categoria:m.categoria,Subcategoria:m.subcategoria,Metodo:m.metodoPago,EsCredito:m.esCredito?"Sí":"No"}))),"Movimientos");
  XLSX.utils.book_append_sheet(libro,XLSX.utils.json_to_sheet(inversiones.map(inv=>{const va=valorActualInvCOP(inv),ci=capitalInvertidoCOP(inv),cant=inv.cantidadRestante??inv.cantidad??0;return{Tipo:inv.tipo,Nombre:inv.nombre,Divisa:inv.divisa||"COP",Broker:inv.broker||"—",CantidadRestante:cant,PrecioCompraDivisa:inv.precioCompra,PrecioActualDivisa:inv.precioActualDivisa||inv.precioActual,TCCompra:inv.tcCompra||"—",TCActual:tcCOP(inv.divisa||"COP"),InvertidoCOP:Math.round(ci),ValorActualCOP:Math.round(va),GananciaCOP:Math.round(va-ci),PctGanancia:ci>0?((va-ci)/ci*100).toFixed(2)+"%":"—",Estado:inv.cobrado&&cant<=0?"Cerrada":"Activa",MetodoCosto:inv.metodoCosto||"PROM"};})),"Inversiones");
  XLSX.utils.book_append_sheet(libro,XLSX.utils.json_to_sheet(deudas.map(d=>({Nombre:d.nombre,Tipo:d.tipo,CapitalOriginal:d.capital,SaldoVivo:Math.round(saldoVivo(d)),TotalCapitalPagado:d.pagos.reduce((s,p)=>s+(p.capitalPagado||0),0),TotalInteres:d.pagos.reduce((s,p)=>s+(p.interes||0),0),TipoTasa:d.tipoTasa,Tasa:d.tasaFija||0}))),"Deudas");
  XLSX.utils.book_append_sheet(libro,XLSX.utils.json_to_sheet(posicionesDivisa.map(p=>({Divisa:p.divisa,Cantidad:p.cantidad,CostoPromCOP:p.costoProm,TCActual:tcCOP(p.divisa),ValorCOP:p.cantidad*tcCOP(p.divisa),GananciaFX_NoRealiz:p.cantidad*(tcCOP(p.divisa)-p.costoProm)}))),"Divisas");
  XLSX.utils.book_append_sheet(libro,XLSX.utils.json_to_sheet(ventasInversion.map(v=>{const inv=inversiones.find(i=>String(i.id)===String(v.inversionId));return{Fecha:v.fecha,Activo:inv?inv.nombre:"—",Tipo:inv?inv.tipo:"—",Cantidad:v.cantidad,PrecioVenta:v.precioVenta,Divisa:v.divisaActivo,TCVenta:v.tcVenta,ValorNeto_COP:Math.round(v.valorCop),GananciaActivo_COP:Math.round(v.gananciaActivoCop),GananciaFX_COP:Math.round(v.gananciaFxCop),GananciaTotal:Math.round(v.gananciaActivoCop+v.gananciaFxCop),MetodoCosto:v.metodoCosto};})),"PG_Ventas");
  XLSX.utils.book_append_sheet(libro,XLSX.utils.json_to_sheet(_dividendos.map(d=>{const inv=inversiones.find(i=>String(i.id)===String(d.inversionId));return{Fecha:d.fecha,Activo:inv?inv.nombre:"—",Tipo:d.tipo,Monto:d.monto,Divisa:d.divisa,TC:d.tcCop,MontoCOP:Math.round(d.montoCop),Destino:d.destino,ImpuestoRetenido:d.impuestoRetenido};})),"Dividendos");
  XLSX.utils.book_append_sheet(libro,XLSX.utils.json_to_sheet(historialTasas.slice(0,200).map(t=>({Fecha:t.fecha,Divisa:t.divisa,TasaCOP:t.tasa,Nota:t.nota}))),"Historial_Tasas");
  const ganReal=ventasInversion.reduce((s,v)=>s+(v.gananciaActivoCop||0)+(v.gananciaFxCop||0),0);
  const ganFxNoReal=posicionesDivisa.reduce((s,p)=>s+p.cantidad*(tcCOP(p.divisa)-p.costoProm),0);
  const divCopTot=_dividendos.filter(d=>d.destino==="caja_cop").reduce((s,d)=>s+(d.montoCop||0),0);
  XLSX.utils.book_append_sheet(libro,XLSX.utils.json_to_sheet([
    {Concepto:"Ingresos totales",Valor:Math.round(T.ingresos)},{Concepto:"Gastos caja",Valor:Math.round(T.gastos)},{Concepto:"Pagos deuda",Valor:Math.round(T.pagosDeuda)},{Concepto:"Saldo caja",Valor:Math.round(T.saldoCaja)},{Concepto:"Valor divisas (COP eq.)",Valor:Math.round(valorDiv)},{Concepto:"Valor inversiones (COP)",Valor:Math.round(valorInv)},{Concepto:"Deuda neta",Valor:Math.round(dn)},{Concepto:"Patrimonio total",Valor:Math.round(T.saldoCaja+valorDiv+valorInv-dn)},{Concepto:"P&G Realizado Total",Valor:Math.round(ganReal)},{Concepto:"P&G FX No Realizado (divisas)",Valor:Math.round(ganFxNoReal)},{Concepto:"Dividendos recibidos (COP)",Valor:Math.round(divCopTot)},
  ]),"Resumen_Ejecutivo");
  deudas.forEach(d=>{if(d.pagos&&d.pagos.length){let acum=d.capital;XLSX.utils.book_append_sheet(libro,XLSX.utils.json_to_sheet(d.pagos.map((p,i)=>{const sv=Math.max(0,acum-(p.capitalPagado||0));acum=sv;return{N:i+1,Fecha:p.fecha,CuotaTotal:p.cuota,Capital:p.capitalPagado||0,Interes:p.interes||0,Tasa:(p.tasaAplicada||0)+"%",SaldoRestante:Math.round(sv)};})),(d.nombre).substring(0,30));}});
  XLSX.writeFile(libro,"finanzas_multicurrency.xlsx");
}

/* ════════════════════════════════
   NAVEGACIÓN Y SWIPE
   ════════════════════════════════ */
(function(){
  const paginas=["dashboard","movimientos","inversiones","deudas","estadisticas","configuracion"];
  let _sX=0,_sY=0,_sw=false;
  document.addEventListener("touchstart",e=>{_sX=e.changedTouches[0].clientX;_sY=e.changedTouches[0].clientY;_sw=false;},{passive:true});
  document.addEventListener("touchmove",e=>{const dx=e.changedTouches[0].clientX-_sX,dy=e.changedTouches[0].clientY-_sY;if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>15)_sw=true;},{passive:true});
  document.addEventListener("touchend",e=>{
    if(!_sw)return;const dx=e.changedTouches[0].clientX-_sX,dy=e.changedTouches[0].clientY-_sY;
    if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.4)return;
    const activa=document.querySelector(".page.active");if(!activa)return;
    const idx=paginas.indexOf(activa.id);if(idx===-1)return;
    if(dx<0&&idx<paginas.length-1)abrirPagina(paginas[idx+1],"left");
    else if(dx>0&&idx>0)abrirPagina(paginas[idx-1],"right");_sw=false;
  },{passive:true});
})();

/* ════════════════════════════════
   PERFIL / NOMBRE
   ════════════════════════════════ */
function abrirModalNombre(){const actual=localStorage.getItem("sb_displayName")||"";const el=document.getElementById("inputNombreNuevo");if(el)el.value=actual;const m=document.getElementById("modalNombre");if(m)m.style.display="flex";}
function guardarNombre(){const n=(document.getElementById("inputNombreNuevo").value||"").trim();if(!n)return;localStorage.setItem("sb_displayName",n);const el=document.getElementById("userName");if(el)el.textContent=n;const m=document.getElementById("modalNombre");if(m)m.style.display="none";}

/* ── INIT ── */
if(document.getElementById("tipo"))actualizarTipoMovimiento();
(async()=>{const sesion=await restaurarSesion();if(sesion){mostrarApp();cargarDatos();}else mostrarPantallaAuth();})();
/* ════════════════════════════════════════════════════════
   GRUPO A — SPARKLINES + CRIPTO/DIVISAS + MÉTODO GLOBAL
   ════════════════════════════════════════════════════════ */

/* ── Preferencias globales ── */
let _metodoCostoGlobal = localStorage.getItem("metodoCostoGlobal")||"PROM";
let _sparklinePeriodo  = localStorage.getItem("sparklinePeriodo")||"6m";

function guardarPreferencia(key,val){
  if(key==="metodoCosto"){_metodoCostoGlobal=val;localStorage.setItem("metodoCostoGlobal",val);}
  if(key==="sparkline"){_sparklinePeriodo=val;localStorage.setItem("sparklinePeriodo",val);dibujarSparklines();}
}

/* ── Construir series mensuales para sparklines ── */
function seriesMensuales(limite){
  const mesesAll=[...new Set(movimientos.map(m=>m.fecha.substring(0,7)))].sort();
  const slice=limite==="todo"?mesesAll:mesesAll.slice(-parseInt(limite));
  return slice.map(mes=>{
    let ing=0,gas=0,pag=0,inv=0;
    movimientos.filter(m=>m.fecha.startsWith(mes)).forEach(m=>{
      if(m.tipo==="ingreso")ing+=m.valor;
      else if(m.tipo==="gasto"&&!m.esCredito)gas+=m.valor;
      else if(m.tipo==="pago_deuda_cuota")pag+=m.valor;
      else if(m.tipo==="traslado_inversion")inv+=m.valor;
    });
    const saldo=ing-gas-pag-inv;
    const tasaAhorro=ing>0?(saldo/ing)*100:0;
    return{mes,ing,gas,pag,saldo,tasaAhorro};
  });
}

const _sparkCharts={};
function dibujarSparkline(canvasId,datos,color){
  const canvas=document.getElementById(canvasId);if(!canvas)return;
  if(_sparkCharts[canvasId])_sparkCharts[canvasId].destroy();
  const grad=canvas.getContext("2d");
  if(!grad)return;
  const g=grad.createLinearGradient(0,0,0,40);
  g.addColorStop(0,color+"55");g.addColorStop(1,color+"00");
  _sparkCharts[canvasId]=new Chart(canvas,{
    type:"line",
    data:{labels:datos.map((_,i)=>i),datasets:[{data:datos,borderColor:color,borderWidth:1.5,fill:true,backgroundColor:g,tension:0.4,pointRadius:0,pointHoverRadius:3}]},
    options:{responsive:false,animation:false,plugins:{legend:{display:false},tooltip:{enabled:false}},
      scales:{x:{display:false},y:{display:false}},
      elements:{line:{borderCapStyle:"round"}}}
  });
}

function dibujarSparklines(){
  const n=_sparklinePeriodo==="todo"?999:parseInt(_sparklinePeriodo);
  const mesesAll=[...new Set(movimientos.map(m=>m.fecha.substring(0,7)))].sort();
  const slice=_sparklinePeriodo==="todo"?mesesAll:mesesAll.slice(-n);
  if(!slice.length)return;

  // Acumular valores por mes para cada KPI
  const series={ing:[],gas:[],pag:[],saldo:[],tasa:[],inv:[],dn:[],pat:[]};
  let saldoAcum=0,invAcum=0;

  slice.forEach(mes=>{
    let ing=0,gas=0,pag=0,trasInv=0;
    movimientos.filter(m=>m.fecha.startsWith(mes)).forEach(m=>{
      if(m.tipo==="ingreso")ing+=m.valor;
      else if(m.tipo==="gasto"&&!m.esCredito)gas+=m.valor;
      else if(m.tipo==="pago_deuda_cuota")pag+=m.valor;
      else if(m.tipo==="traslado_inversion")trasInv+=m.valor;
    });
    saldoAcum+=ing-gas-pag-trasInv;
    const tasa=ing>0?((ing-gas-pag)/ing)*100:0;
    const valorInvActual=calcularValorInversionesCOP();
    const dnActual=calcularDeudaNeta();
    const valorDiv=posicionesDivisa.reduce((s,p)=>s+p.cantidad*tcCOP(p.divisa),0);
    series.ing.push(ing);
    series.gas.push(gas);
    series.pag.push(pag);
    series.saldo.push(Math.max(0,ing-gas-pag-trasInv));
    series.tasa.push(Math.max(0,tasa));
    series.inv.push(valorInvActual);
    series.dn.push(dnActual);
    series.pat.push(saldoAcum+valorDiv+valorInvActual-dnActual);
  });

  dibujarSparkline("spk-ingresos",    series.ing,  "#00aa33");
  dibujarSparkline("spk-gastos",      series.gas,  "#ef4444");
  dibujarSparkline("spk-pagosDeuda",  series.pag,  "#f97316");
  dibujarSparkline("spk-saldo",       series.saldo,"#00b8d4");
  dibujarSparkline("spk-inversiones", series.inv,  "#6c5ce7");
  dibujarSparkline("spk-deudaNeta",   series.dn,   "#f97316");
  dibujarSparkline("spk-patrimonio",  series.pat,  "#00aa33");
  dibujarSparkline("spk-tasaAhorro",  series.tasa, "#22c55e");
}

/* ── Sección Cripto + Divisas unificada (reemplaza actualizarSeccionDivisas) ── */
function actualizarSeccionDivisas(){
  const cont=document.getElementById("seccionDivisas");if(!cont)return;
  const con=posicionesDivisa.filter(p=>p.cantidad>0.000001);
  if(!con.length&&!inversiones.filter(i=>!i.cobrado&&i.tipo==="Criptomoneda").length){
    cont.innerHTML='<p style="color:#9aaa9a;font-size:13px;text-align:center">Sin posiciones en divisas o cripto</p>';return;
  }

  const CRIPTO_TIPOS=["Criptomoneda"];
  const CRIPTO_SIMBOLOS={BTC:"₿",ETH:"Ξ",SOL:"◎",USDT:"💵",USDC:"💵",ADA:"₳",DOT:"●",AVAX:"▲"};
  const FIAT_FLAGS={USD:"🇺🇸",EUR:"🇪🇺",GBP:"🇬🇧",JPY:"🇯🇵",CHF:"🇨🇭",CAD:"🇨🇦",ARS:"🇦🇷"};

  // Separar cripto (inversiones tipo Criptomoneda) de divisas fiat
  const criptos=inversiones.filter(i=>!i.cobrado&&CRIPTO_TIPOS.includes(i.tipo));
  const fiats=con.filter(p=>!["BTC","ETH","SOL","ADA","DOT","AVAX","XRP","MATIC","BNB"].includes(p.divisa));
  const criptoPosiciones=con.filter(p=>["BTC","ETH","SOL","ADA","DOT","AVAX","XRP","MATIC","BNB"].includes(p.divisa));

  let html="";

  // FIAT
  if(fiats.length){
    html+=`<div style="margin-bottom:14px"><p style="font-size:11px;font-weight:700;color:#9aaa9a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">💱 Divisas</p>`;
    html+=fiats.map(p=>{
      const tc=tcCOP(p.divisa),valCop=p.cantidad*tc,ganFx=p.cantidad*(tc-(p.costoProm||tc));
      const flag=FIAT_FLAGS[p.divisa]||"💱";
      return`<div class="divisaCard" style="cursor:pointer" onclick="venderDivisa('${p.divisa}')">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:14px;font-weight:800">${flag} ${p.cantidad.toFixed(4)} ${p.divisa}</span>
          <span style="font-size:13px;font-weight:700;color:#006b1a">${fmt(valCop)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:3px;font-size:10px;color:#9aaa9a">
          <span>TC ${tc.toLocaleString("es-CO",{minimumFractionDigits:0,maximumFractionDigits:2})} · CPP ${p.costoProm.toLocaleString("es-CO",{minimumFractionDigits:0,maximumFractionDigits:2})}</span>
          <span style="color:${ganFx>=0?"#00aa33":"#ef4444"};font-weight:700">${ganFx>=0?"+":""}${fmtN(ganFx)} FX</span>
        </div>
      </div>`;
    }).join("");
    html+=`</div>`;
  }

  // CRIPTO (desde inversiones)
  const todasCripto=[...criptos,...criptoPosiciones.map(p=>({
    _esPosicion:true,divisa:p.divisa,cantidad:p.cantidad,costoProm:p.costoProm,
    nombre:p.divisa,precioActualDivisa:1,cantidadRestante:p.cantidad,
    precioCompra:p.costoProm,tcCompra:1,broker:""
  }))];

  if(todasCripto.length){
    html+=`<div><p style="font-size:11px;font-weight:700;color:#9aaa9a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">🪙 Criptomonedas</p>`;
    html+=todasCripto.map(inv=>{
      if(inv._esPosicion){
        const simbolo=CRIPTO_SIMBOLOS[inv.divisa]||"🪙";
        const tc=tcCOP(inv.divisa),valCop=inv.cantidad*tc,ganFx=inv.cantidad*(tc-(inv.costoProm||tc));
        return`<div class="divisaCard cripto">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:14px;font-weight:800">${simbolo} ${inv.cantidad.toFixed(6)} ${inv.divisa}</span>
            <span style="font-size:13px;font-weight:700;color:#6c5ce7">${fmt(valCop)}</span>
          </div>
          <div style="font-size:10px;color:#9aaa9a;margin-top:3px">P&G: <span style="color:${ganFx>=0?"#00aa33":"#ef4444"}">${ganFx>=0?"+":""}${fmtN(ganFx)}</span></div>
        </div>`;
      }
      const vaCOP=valorActualInvCOP(inv),ciCOP=capitalInvertidoCOP(inv),gan=vaCOP-ciCOP;
      const divisa=inv.divisa||"COP",cant=inv.cantidadRestante??inv.cantidad??0;
      const precDiv=inv.precioActualDivisa||inv.precioActual||0;
      const simbolo=CRIPTO_SIMBOLOS[inv.nombre]||CRIPTO_SIMBOLOS[inv.divisa]||"🪙";
      return`<div class="divisaCard cripto">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:14px;font-weight:800">${simbolo} ${inv.nombre}</span>
          <span style="font-size:13px;font-weight:700;color:#6c5ce7">${fmt(vaCOP)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:3px;font-size:10px;color:#9aaa9a">
          <span>${cant.toFixed(6)} u. @ ${precDiv.toLocaleString("es-CO",{maximumFractionDigits:4})} ${divisa}</span>
          <span style="color:${gan>=0?"#00aa33":"#ef4444"};font-weight:700">${gan>=0?"+":""}${fmtN(gan)}</span>
        </div>
        ${inv.broker?`<div style="font-size:10px;color:#9aaa9a;margin-top:2px">🏦 ${inv.broker}</div>`:""}
      </div>`;
    }).join("");
    html+=`</div>`;
  }

  cont.innerHTML=html||'<p style="color:#9aaa9a;font-size:13px;text-align:center">Sin posiciones</p>';
}

/* ── Patch actualizar() para llamar sparklines ── */
/* NOTA: no se usa override recursivo — sparklines se llaman desde actualizar() directamente */

/* ── Configuración: guardar método global ── */
function aplicarConfiguracion(){
  const mc=document.getElementById("cfgMetodoCosto");
  if(mc)guardarPreferencia("metodoCosto",mc.value);
  const sp=document.getElementById("cfgSparkline");
  if(sp)guardarPreferencia("sparkline",sp.value);
  const nombre=document.getElementById("cfgNombre");
  if(nombre&&nombre.value.trim()){
    localStorage.setItem("sb_displayName",nombre.value.trim());
    const el=document.getElementById("userName");if(el)el.textContent=nombre.value.trim();
  }
  alert("✓ Preferencias guardadas");
}

function cargarConfiguracion(){
  const mc=document.getElementById("cfgMetodoCosto");if(mc)mc.value=_metodoCostoGlobal;
  const sp=document.getElementById("cfgSparkline");if(sp)sp.value=_sparklinePeriodo;
  const nombre=document.getElementById("cfgNombre");
  if(nombre)nombre.value=localStorage.getItem("sb_displayName")||"";
  const email=document.getElementById("cfgEmail");
  if(email&&_currentUser)email.textContent=_currentUser.email||"";
}

/* ── Sincronizar botones período sparkline ── */
function sincronizarBotonesSparkline(){
  ["6","12","todo"].forEach(v=>{
    const btn=document.getElementById(`spkBtn${v==="todo"?"Todo":v}`);
    if(btn) btn.classList.toggle("activo",_sparklinePeriodo===v);
  });
}
/* sincronizarBotonesSparkline ya se llama dentro de guardarPreferencia (definida arriba) */

/* ── Aplicar método global a nuevas inversiones ── */
/* NOTA: no se hace patch recursivo. El selector se inicializa en DOMContentLoaded */
document.addEventListener("DOMContentLoaded",()=>{
  const metSel=document.getElementById("invMetodoCosto");
  if(metSel){
    metSel.value=_metodoCostoGlobal;
    metSel.addEventListener("change",()=>{ metSel._touched=true; });
  }
  sincronizarBotonesSparkline();
});

/* ════════════════════════════════════════════════════════
   GRUPO B — ZOOM MODAL + ANÁLISIS DETERMINÍSTICO
   ════════════════════════════════════════════════════════ */

let _zoomChart=null;

/* Inicializar listeners de click en graficaCards */
function inicializarZoomGraficas(){
  document.querySelectorAll(".graficaCard[data-id]").forEach(card=>{
    card.style.cursor="pointer";
    card.addEventListener("click",()=>{
      const id=card.dataset.id;
      const titulo=card.querySelector("h3").textContent;
      abrirZoomGrafica(id,titulo);
    });
  });
}

function abrirZoomGrafica(chartId,titulo){
  const modal=document.getElementById("modalZoomGrafica");
  if(!modal)return;
  document.getElementById("zoomTitulo").textContent=titulo;

  // Subtítulo con período
  const sub=document.getElementById("zoomSubtitulo");
  if(sub){
    const mesesAll=[...new Set(movimientos.map(m=>m.fecha.substring(0,7)))].sort();
    if(mesesAll.length>=2){
      const fmtM=m=>{const[a,mo]=m.split("-");return new Date(Number(a),Number(mo)-1,1).toLocaleDateString("es-CO",{month:"short",year:"numeric"});};
      sub.textContent=`${fmtM(mesesAll[0])} – ${fmtM(mesesAll[mesesAll.length-1])} · ${mesesAll.length} meses`;
    } else sub.textContent=mesFiltro||"Histórico completo";
  }

  // Limpiar estado anterior
  const zCanvas=document.getElementById("zoomCanvas");
  const zTree=document.getElementById("zoomTreemap");
  const zHeat=document.getElementById("zoomHeatmap");
  const btnReset=document.getElementById("btnZoomReset");
  zCanvas.style.display="none";zTree.style.display="none";zHeat.style.display="none";
  zTree.innerHTML="";zHeat.innerHTML="";
  if(btnReset)btnReset.style.display="none";
  if(_zoomChart){_zoomChart.destroy();_zoomChart=null;}

  // Hint touch vs mouse
  const hint=document.getElementById("zoomHint");
  if(hint){
    const isTouch="ontouchstart"in window;
    hint.textContent=isTouch
      ?"👆 Pellizca para hacer zoom · Arrastra para mover · 2 dedos = restablecer"
      :"🖱 Scroll para hacer zoom · Arrastra para mover · Doble clic para restablecer";
  }

  // Estadísticas rápidas del chart
  renderZoomStats(chartId);

  const origChart=charts[chartId];

  if(chartId==="graficaCategorias"){
    zTree.style.display="block";
    const catMap={};
    const movF=mesFiltro?movimientos.filter(m=>m.fecha.startsWith(mesFiltro)):movimientos;
    movF.forEach(m=>{if(m.tipo==="gasto"&&m.categoria)catMap[m.categoria]=(catMap[m.categoria]||0)+m.valor;});
    const W=Math.min(780,window.innerWidth-60),H=340;
    const total=Object.values(catMap).reduce((s,v)=>s+v,0)||1;
    const entries=Object.entries(catMap).filter(e=>e[1]>0).sort((a,b)=>b[1]-a[1]);
    const rects=squarify(entries.map(e=>({label:e[0],value:e[1]})),0,0,W,H,total);
    zTree.innerHTML=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;border-radius:12px">
      ${rects.map((r,i)=>{
        const pct=((r.value/total)*100).toFixed(1);
        const col=PALETAS.gastos[i%PALETAS.gastos.length];
        const fs=Math.min(14,Math.max(9,r.w/7));
        return`<g style="cursor:default">
          <rect x="${r.x+1}" y="${r.y+1}" width="${r.w-2}" height="${r.h-2}" fill="${col}" rx="7" opacity="0.92"/>
          ${r.w>55&&r.h>32?`
            <text x="${r.x+r.w/2}" y="${r.y+r.h/2-8}" text-anchor="middle" fill="#fff" font-size="${fs}" font-weight="700" font-family="sans-serif">${r.label}</text>
            <text x="${r.x+r.w/2}" y="${r.y+r.h/2+8}" text-anchor="middle" fill="rgba(255,255,255,.9)" font-size="${Math.max(9,fs-2)}" font-family="sans-serif">$${Math.round(r.value/1000)}k</text>
            <text x="${r.x+r.w/2}" y="${r.y+r.h/2+22}" text-anchor="middle" fill="rgba(255,255,255,.7)" font-size="${Math.max(8,fs-3)}" font-family="sans-serif">${pct}%</text>
          `:""}
        </g>`;
      }).join("")}
    </svg>`;
  } else if(chartId==="graficaHeatmap"){
    zHeat.style.display="block";
    dibujarHeatmapZoom(zHeat);
  } else if(origChart){
    zCanvas.style.display="block";
    const SC={x:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}};

    // Tooltips enriquecidos
    const richTooltip={
      enabled:true,
      backgroundColor:"rgba(0,27,0,0.92)",
      titleColor:"#00ff41",
      bodyColor:"#cdecd0",
      borderColor:"#00aa33",
      borderWidth:1,
      padding:12,
      titleFont:{size:12,weight:"bold"},
      bodyFont:{size:12},
      callbacks:{
        title:items=>{
          const label=items[0]?.label||"";
          return label;
        },
        label:ctx=>{
          const v=ctx.parsed.y??ctx.parsed??0;
          const abs=Math.round(Math.abs(v));
          const sign=v<0?"–":"";
          return` ${ctx.dataset.label||""}: ${sign}$${abs.toLocaleString("es-CO")}`;
        },
        afterBody:items=>{
          // Comparación con el punto anterior del mismo dataset
          const ctx=items[0];if(!ctx)return[];
          const idx=ctx.dataIndex;if(idx===0)return[];
          const ds=ctx.chart.data.datasets[ctx.datasetIndex];
          const curr=ds.data[idx],prev=ds.data[idx-1];
          if(curr==null||prev==null||prev===0)return[];
          const diff=curr-prev;const pct=((diff/Math.abs(prev))*100).toFixed(1);
          const arrow=diff>=0?"▲":"▼";
          return[`${arrow} vs anterior: ${diff>=0?"+":""}$${Math.round(Math.abs(diff)).toLocaleString("es-CO")} (${pct}%)`];
        }
      }
    };

    // Detectar si el plugin de zoom está disponible
    const hasZoomPlugin=typeof window.ChartZoom!=="undefined"||
      (typeof Chart!=="undefined"&&Chart.registry&&Chart.registry.plugins.get("zoom"));

    const zoomPlugin=hasZoomPlugin?{
      zoom:{
        wheel:{enabled:true},
        pinch:{enabled:true},
        mode:"xy",
        onZoom:()=>{if(btnReset)btnReset.style.display="block";}
      },
      pan:{
        enabled:true,
        mode:"xy",
        onPan:()=>{if(btnReset)btnReset.style.display="block";}
      }
    }:{};

    _zoomChart=new Chart(zCanvas,{
      type:origChart.config.type,
      data:JSON.parse(JSON.stringify(origChart.config.data)),
      options:{
        responsive:true,
        maintainAspectRatio:false,
        animation:{duration:350},
        interaction:{mode:"index",intersect:false},
        plugins:{
          legend:{
            display:true,
            labels:{color:"#224422",font:{size:12},padding:16,usePointStyle:true}
          },
          tooltip:richTooltip,
          ...(hasZoomPlugin?{zoom:zoomPlugin}:{})
        },
        scales:origChart.config.type==="radar"?undefined:
          origChart.config.options?.scales?.r?undefined:
          {
            x:{...(origChart.config.options?.scales?.x||{}),ticks:{color:"#9aaa9a",font:{size:11}},grid:{color:"#e8ede8"}},
            y:{...(origChart.config.options?.scales?.y||{}),ticks:{color:"#9aaa9a",font:{size:11},callback:v=>"$"+Math.round(Math.abs(v)/1000)+"k"},grid:{color:"#e8ede8"}}
          }
      }
    });

    // Doble clic para reset
    zCanvas.ondblclick=()=>resetZoomGrafica();
  }

  document.getElementById("zoomAnalisis").innerHTML=generarAnalisis(chartId);
  modal.style.display="flex";
  document.body.style.overflow="hidden";
}

/* ── Estadísticas rápidas en la barra del zoom ── */
function renderZoomStats(chartId){
  const cont=document.getElementById("zoomStats");
  if(!cont)return;
  const movF=mesFiltro?movimientos.filter(m=>m.fecha.startsWith(mesFiltro)):movimientos;
  let stats=[];

  const fmtK=v=>{const abs=Math.abs(v);return(v<0?"-$":"$")+(abs>=1e6?(abs/1e6).toFixed(1)+"M":abs>=1000?(abs/1000).toFixed(0)+"k":Math.round(abs).toLocaleString("es-CO"));};

  switch(chartId){
    case"graficaPrincipal":case"graficaMensual":{
      let ing=0,gas=0,pag=0;movF.forEach(m=>{if(m.tipo==="ingreso")ing+=m.valor;else if(m.tipo==="gasto")gas+=m.valor;else if(m.tipo==="pago_deuda_cuota")pag+=m.valor;});
      stats=[{l:"Ingresos",v:fmtK(ing),c:"#00aa33"},{l:"Gastos",v:fmtK(gas),c:"#ef4444"},{l:"Balance",v:fmtK(ing-gas-pag),c:ing-gas-pag>=0?"#006b1a":"#ef4444"},{l:"Meses",v:[...new Set(movimientos.map(m=>m.fecha.substring(0,7)))].length+"",c:"#9aaa9a"}];
      break;}
    case"graficaDeuda":{
      const dn=calcularDeudaNeta();const T=calcularTotales();
      stats=[{l:"Deuda actual",v:fmtK(dn),c:"#ef4444"},{l:"Caja acum.",v:fmtK(T.saldoCaja),c:"#00aa33"},{l:"Diferencia",v:fmtK(T.saldoCaja-dn),c:T.saldoCaja>dn?"#006b1a":"#ef4444"}];break;}
    case"graficaCategorias":case"graficaCategoriasMensual":case"graficaRadarGastos":case"graficaHeatmap":{
      const cat={};movF.forEach(m=>{if(m.tipo==="gasto"&&m.categoria)cat[m.categoria]=(cat[m.categoria]||0)+m.valor;});
      const total=Object.values(cat).reduce((s,v)=>s+v,0);
      const top=Object.entries(cat).sort((a,b)=>b[1]-a[1])[0];
      stats=[{l:"Total gastos",v:fmtK(total),c:"#ef4444"},{l:"Categorías",v:Object.keys(cat).length+"",c:"#9aaa9a"},{l:"Mayor",v:top?top[0]:"—",c:"#f97316"},{l:"Valor mayor",v:top?fmtK(top[1]):"—",c:"#f97316"}];break;}
    case"graficaInversiones":case"graficaRiesgoBroker":{
      const inv=inversiones.filter(i=>!i.cobrado||(i.cantidadRestante??i.cantidad??0)>0.000001);
      const totalV=inv.reduce((s,i)=>s+valorActualInvCOP(i),0);
      const totalC=inv.reduce((s,i)=>s+capitalInvertidoCOP(i),0);
      stats=[{l:"Portafolio",v:fmtK(totalV),c:"#6c5ce7"},{l:"Invertido",v:fmtK(totalC),c:"#9aaa9a"},{l:"P&G",v:fmtK(totalV-totalC),c:totalV>=totalC?"#00aa33":"#ef4444"},{l:"Posiciones",v:inv.length+"",c:"#9aaa9a"}];break;}
    case"graficaMetodos":{
      const met={};movimientos.filter(m=>m.tipo==="gasto").forEach(m=>{met[m.metodoPago]=(met[m.metodoPago]||0)+m.valor;});
      const tot=Object.values(met).reduce((s,v)=>s+v,0);const top2=Object.entries(met).sort((a,b)=>b[1]-a[1])[0];
      stats=[{l:"Total",v:fmtK(tot),c:"#ef4444"},{l:"Métodos",v:Object.keys(met).length+"",c:"#9aaa9a"},{l:"+ usado",v:top2?top2[0]:"—",c:"#00b8d4"}];break;}
    case"graficaMetodosAcum":{
      const meses=[...new Set(movimientos.map(m=>m.fecha.substring(0,7)))];
      const tasas=meses.map(mes=>{let i=0,g=0,p=0;movimientos.filter(m=>m.fecha.startsWith(mes)).forEach(m=>{if(m.tipo==="ingreso")i+=m.valor;else if(m.tipo==="gasto")g+=m.valor;else if(m.tipo==="pago_deuda_cuota")p+=m.valor;});return i>0?((i-g-p)/i)*100:0;});
      const prom=tasas.reduce((s,v)=>s+v,0)/(tasas.length||1);
      stats=[{l:"Tasa prom.",v:prom.toFixed(1)+"%",c:"#22c55e"},{l:"Mejor mes",v:tasas.reduce((mx,v)=>v>mx?v:mx,-Infinity).toFixed(1)+"%",c:"#00aa33"},{l:"Peor mes",v:tasas.reduce((mn,v)=>v<mn?v:mn,Infinity).toFixed(1)+"%",c:"#ef4444"}];break;}
    case"graficaDivisas":{
      const T2=calcularTotales();const valorInv=calcularValorInversionesCOP();const dn2=calcularDeudaNeta();const vDiv=posicionesDivisa.reduce((s,p)=>s+p.cantidad*tcCOP(p.divisa),0);
      stats=[{l:"Patrimonio",v:fmtK(T2.saldoCaja+vDiv+valorInv-dn2),c:"#6c5ce7"},{l:"Inversiones",v:fmtK(valorInv),c:"#00b8d4"},{l:"Divisas",v:fmtK(vDiv),c:"#00aa33"}];break;}
    case"graficaFuentesIngresos":{
      let ingT=0;movimientos.filter(m=>m.tipo==="ingreso").forEach(m=>ingT+=m.valor);
      const src=new Set(movimientos.filter(m=>m.tipo==="ingreso").map(m=>m.subcategoria||m.descripcion||"Otro")).size;
      stats=[{l:"Total ing.",v:fmtK(ingT),c:"#00aa33"},{l:"Fuentes",v:src+"",c:"#9aaa9a"}];break;}
    default: stats=[];
  }

  if(!stats.length){cont.style.display="none";return;}
  cont.style.display="flex";
  cont.innerHTML=stats.map((s,i)=>`
    <div style="flex:1;min-width:80px;padding:10px 14px;${i<stats.length-1?"border-right:1px solid #f0f5f0;":""}text-align:center">
      <p style="font-size:10px;color:#9aaa9a;margin:0 0 3px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.l}</p>
      <p style="font-size:14px;font-weight:800;color:${s.c};margin:0;white-space:nowrap">${s.v}</p>
    </div>`).join("");
}

function resetZoomGrafica(){
  if(_zoomChart&&_zoomChart.resetZoom) _zoomChart.resetZoom();
  const btnReset=document.getElementById("btnZoomReset");
  if(btnReset)btnReset.style.display="none";
}

function cerrarZoomGrafica(){
  const modal=document.getElementById("modalZoomGrafica");
  if(modal)modal.style.display="none";
  document.body.style.overflow="";
  if(_zoomChart){_zoomChart.destroy();_zoomChart=null;}
  const cont=document.getElementById("zoomStats");
  if(cont){cont.innerHTML="";cont.style.display="none";}
  const btnReset=document.getElementById("btnZoomReset");
  if(btnReset)btnReset.style.display="none";
}

/* Cerrar con Escape */
document.addEventListener("keydown",e=>{if(e.key==="Escape")cerrarZoomGrafica();});

/* ── Heatmap para zoom (mayor resolución) ── */
function dibujarHeatmapZoom(container){
  const dias=["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  const semanas=["Semana 1","Semana 2","Semana 3","Semana 4","Semana 5+"];
  const grid=Array.from({length:5},()=>Array(7).fill(0));
  movimientos.filter(m=>m.tipo==="gasto").forEach(m=>{
    const d=new Date(m.fecha+"T12:00:00");
    const primer=new Date(d.getFullYear(),d.getMonth(),1).getDay();
    const semIdx=Math.min(4,Math.floor((d.getDate()+primer-1)/7));
    grid[semIdx][d.getDay()]+=m.valor;
  });
  const maxVal=grid.flat().reduce((mx,v)=>v>mx?v:mx,0)||1;
  const CW=72,CH=46,padL=72,padT=32,W=padL+7*CW+10,H=padT+5*CH+28;
  container.innerHTML=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">
    ${dias.map((d,i)=>`<text x="${padL+i*CW+CW/2}" y="${padT-10}" text-anchor="middle" fill="#446644" font-size="12" font-weight="600" font-family="sans-serif">${d}</text>`).join("")}
    ${semanas.map((s,r)=>`<text x="${padL-6}" y="${padT+r*CH+CH/2+5}" text-anchor="end" fill="#446644" font-size="11" font-family="sans-serif">${s}</text>`+
      dias.map((_,c)=>{const v=grid[r][c];const intensity=v/maxVal;const alpha=(0.06+intensity*0.9).toFixed(2);const showText=v>0;return`<rect x="${padL+c*CW+2}" y="${padT+r*CH+2}" width="${CW-4}" height="${CH-4}" rx="7" fill="#ef4444" opacity="${alpha}"/>${showText?`<text x="${padL+c*CW+CW/2}" y="${padT+r*CH+CH/2+5}" text-anchor="middle" fill="${intensity>0.5?"#fff":"#333"}" font-size="11" font-family="sans-serif">$${Math.round(v/1000)}k</text>`:""}`;}).join("")
    ).join("")}
  </svg>`;
}

/* ── Análisis determinístico ── */
function generarAnalisis(chartId){
  const mesesAll=[...new Set(movimientos.map(m=>m.fecha.substring(0,7)))].sort();
  if(!mesesAll.length) return "<i>Sin datos suficientes para analizar.</i>";
  const ultimo=mesesAll[mesesAll.length-1];
  const penultimo=mesesAll.length>1?mesesAll[mesesAll.length-2]:null;
  const eventos=[];

  /* Calcular totales por mes */
  const porMes=mesesAll.map(mes=>{
    let ing=0,gas=0,pag=0;
    movimientos.filter(m=>m.fecha.startsWith(mes)).forEach(m=>{
      if(m.tipo==="ingreso")ing+=m.valor;
      else if(m.tipo==="gasto")gas+=m.valor;
      else if(m.tipo==="pago_deuda_cuota")pag+=m.valor;
    });
    return{mes,ing,gas,pag,balance:ing-gas-pag};
  });

  const fmtMes=m=>{const[a,mo]=m.split("-");return new Date(Number(a),Number(mo)-1,1).toLocaleDateString("es-CO",{month:"long",year:"numeric"});};
  const fmtCOP=v=>"$"+Math.round(v).toLocaleString("es-CO");

  switch(chartId){

    case"graficaPrincipal":{
      const mesMax=porMes.reduce((mx,m)=>m.balance>mx.balance?m:mx,porMes[0]);
      const mesMin=porMes.reduce((mn,m)=>m.balance<mn.balance?m:mn,porMes[0]);
      const promBal=porMes.reduce((s,m)=>s+m.balance,0)/porMes.length;
      eventos.push(`📅 El mejor mes fue <b>${fmtMes(mesMax.mes)}</b> con un balance de <b>${fmtCOP(mesMax.balance)}</b>.`);
      if(mesMin.balance<0) eventos.push(`⚠️ El mes con mayor presión financiera fue <b>${fmtMes(mesMin.mes)}</b>, con balance negativo de <b>${fmtCOP(mesMin.balance)}</b>.`);
      eventos.push(`📊 Balance promedio mensual: <b>${fmtCOP(promBal)}</b>.`);
      if(penultimo){
        const u=porMes.find(m=>m.mes===ultimo),p2=porMes.find(m=>m.mes===penultimo);
        if(u&&p2){const diff=u.balance-p2.balance;eventos.push(`${diff>=0?"📈 Mejora":"📉 Caída"} de ${fmtCOP(Math.abs(diff))} en el balance entre <b>${fmtMes(penultimo)}</b> y <b>${fmtMes(ultimo)}</b>.`);}
      }
      break;
    }

    case"graficaMensual":{
      const mesMaxIng=porMes.reduce((mx,m)=>m.ing>mx.ing?m:mx,porMes[0]);
      const mesMaxGas=porMes.reduce((mx,m)=>m.gas>mx.gas?m:mx,porMes[0]);
      eventos.push(`💵 Mayor ingreso registrado: <b>${fmtCOP(mesMaxIng.ing)}</b> en <b>${fmtMes(mesMaxIng.mes)}</b>.`);
      eventos.push(`💸 Mayor gasto registrado: <b>${fmtCOP(mesMaxGas.gas)}</b> en <b>${fmtMes(mesMaxGas.mes)}</b>.`);
      // Detectar meses con ingreso < gasto
      const negativos=porMes.filter(m=>m.gas>m.ing);
      if(negativos.length) eventos.push(`⚠️ En ${negativos.length} ${negativos.length===1?"mes":"meses"} los gastos superaron los ingresos: ${negativos.map(m=>fmtMes(m.mes)).join(", ")}.`);
      else eventos.push("✅ Los ingresos superaron los gastos en todos los meses registrados.");
      if(penultimo){
        const u=porMes.find(m=>m.mes===ultimo),p2=porMes.find(m=>m.mes===penultimo);
        if(u&&p2){
          const diffIng=((u.ing-p2.ing)/Math.max(p2.ing,1)*100).toFixed(1);
          const diffGas=((u.gas-p2.gas)/Math.max(p2.gas,1)*100).toFixed(1);
          eventos.push(`📊 Vs. mes anterior — Ingresos: <b>${diffIng>0?"+":""}${diffIng}%</b> · Gastos: <b>${diffGas>0?"+":""}${diffGas}%</b>.`);
        }
      }
      break;
    }

    case"graficaDeuda":{
      const deudaTotal=calcularDeudaNeta();
      const totalPagado=deudas.reduce((s,d)=>s+d.pagos.reduce((ss,p)=>ss+(p.capitalPagado||0),0),0);
      const totalInteres=deudas.reduce((s,d)=>s+d.pagos.reduce((ss,p)=>ss+(p.interes||0),0),0);
      eventos.push(`💳 Deuda neta actual: <b>${fmtCOP(deudaTotal)}</b>.`);
      eventos.push(`✅ Capital pagado hasta hoy: <b>${fmtCOP(totalPagado)}</b>.`);
      if(totalInteres>0) eventos.push(`💸 Intereses pagados en total: <b>${fmtCOP(totalInteres)}</b>.`);
      const T=calcularTotales();
      if(T.saldoCaja>0) eventos.push(`🏦 La caja acumulada supera en <b>${fmtCOP(T.saldoCaja-deudaTotal)}</b> a la deuda viva.`);
      break;
    }

    case"graficaCategorias":{
      const movF=mesFiltro?movimientos.filter(m=>m.fecha.startsWith(mesFiltro)):movimientos;
      const catMap={};movF.forEach(m=>{if(m.tipo==="gasto"&&m.categoria)catMap[m.categoria]=(catMap[m.categoria]||0)+m.valor;});
      const sorted=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
      const total=sorted.reduce((s,e)=>s+e[1],0)||1;
      if(sorted[0]) eventos.push(`🥇 La mayor categoría de gasto es <b>${sorted[0][0]}</b> con <b>${fmtCOP(sorted[0][1])}</b> (${((sorted[0][1]/total)*100).toFixed(1)}% del total).`);
      if(sorted[1]) eventos.push(`🥈 Segunda categoría: <b>${sorted[1][0]}</b> con <b>${fmtCOP(sorted[1][1])}</b>.`);
      const top3pct=sorted.slice(0,3).reduce((s,e)=>s+e[1],0)/total*100;
      if(sorted.length>=3) eventos.push(`📊 Las 3 categorías principales concentran el <b>${top3pct.toFixed(1)}%</b> del gasto total.`);
      break;
    }

    case"graficaCategoriasMensual":{
      const catVariacion={};
      if(penultimo&&ultimo){
        const cats=[...new Set(movimientos.filter(m=>m.tipo==="gasto").map(m=>m.categoria))];
        cats.forEach(cat=>{
          const ant=movimientos.filter(m=>m.fecha.startsWith(penultimo)&&m.tipo==="gasto"&&m.categoria===cat).reduce((s,m)=>s+m.valor,0);
          const act=movimientos.filter(m=>m.fecha.startsWith(ultimo)&&m.tipo==="gasto"&&m.categoria===cat).reduce((s,m)=>s+m.valor,0);
          if(ant>0) catVariacion[cat]={ant,act,diff:((act-ant)/ant)*100};
        });
        const maySubida=Object.entries(catVariacion).filter(e=>e[1].diff>0).sort((a,b)=>b[1].diff-a[1].diff)[0];
        const mayBajada=Object.entries(catVariacion).filter(e=>e[1].diff<0).sort((a,b)=>a[1].diff-b[1].diff)[0];
        if(maySubida) eventos.push(`📈 Mayor subida de gasto: <b>${maySubida[0]}</b> subió <b>+${maySubida[1].diff.toFixed(1)}%</b> entre ${fmtMes(penultimo)} y ${fmtMes(ultimo)}.`);
        if(mayBajada) eventos.push(`📉 Mayor reducción: <b>${mayBajada[0]}</b> bajó <b>${mayBajada[1].diff.toFixed(1)}%</b>.`);
      }
      eventos.push(`📊 Se registran gastos en <b>${[...new Set(movimientos.filter(m=>m.tipo==="gasto").map(m=>m.categoria))].length}</b> categorías distintas.`);
      break;
    }

    case"graficaInversiones":{
      const invActivas=inversiones.filter(i=>!i.cobrado||(i.cantidadRestante??i.cantidad??0)>0.000001);
      const totalInv=invActivas.reduce((s,i)=>s+valorActualInvCOP(i),0);
      const totalInvertido=invActivas.reduce((s,i)=>s+capitalInvertidoCOP(i),0);
      const ganTotal=totalInv-totalInvertido;
      eventos.push(`💼 Portafolio total: <b>${fmtCOP(totalInv)}</b> en ${invActivas.length} posiciones activas.`);
      eventos.push(`📊 Capital invertido: <b>${fmtCOP(totalInvertido)}</b> · Ganancia no realizada: <b style="color:${ganTotal>=0?"#00aa33":"#ef4444"}">${ganTotal>=0?"+":""}${fmtCOP(ganTotal)}</b>.`);
      const mejorInv=invActivas.sort((a,b)=>(valorActualInvCOP(b)-capitalInvertidoCOP(b))-(valorActualInvCOP(a)-capitalInvertidoCOP(a)))[0];
      if(mejorInv){const g=valorActualInvCOP(mejorInv)-capitalInvertidoCOP(mejorInv);eventos.push(`🏆 Mejor rendimiento: <b>${mejorInv.nombre}</b> con ${g>=0?"+":""}${fmtCOP(g)}.`);}
      const ventas=ventasInversion;
      if(ventas.length){const ganReal=ventas.reduce((s,v)=>s+(v.gananciaActivoCop||0)+(v.gananciaFxCop||0),0);eventos.push(`✅ Ganancia realizada total por ventas: <b>${fmtCOP(ganReal)}</b> en ${ventas.length} operaciones.`);}
      break;
    }

    case"graficaRiesgoBroker":{
      const bMap={};inversiones.filter(i=>!i.cobrado||(i.cantidadRestante??i.cantidad??0)>0.000001).forEach(inv=>{const lbl=inv.broker||"Sin bróker";bMap[lbl]=(bMap[lbl]||0)+valorActualInvCOP(inv);});
      const total=Object.values(bMap).reduce((s,v)=>s+v,0)||1;
      const max=Object.entries(bMap).sort((a,b)=>b[1]-a[1])[0];
      if(max){const pct=((max[1]/total)*100).toFixed(1);eventos.push(`⚠️ El <b>${pct}%</b> del portafolio está concentrado en <b>${max[0]}</b>.`);if(parseFloat(pct)>60)eventos.push("📋 Recomendación basada en datos: la concentración supera el 60%. Podrías considerar diversificar a más plataformas.");}
      eventos.push(`🏦 Total en ${Object.keys(bMap).length} bróker(s) distintos.`);
      break;
    }

    case"graficaMetodos":{
      const metMap={};movimientos.filter(m=>m.tipo==="gasto").forEach(m=>{metMap[m.metodoPago]=(metMap[m.metodoPago]||0)+m.valor;});
      const sorted2=Object.entries(metMap).sort((a,b)=>b[1]-a[1]);
      const total=sorted2.reduce((s,e)=>s+e[1],0)||1;
      if(sorted2[0]) eventos.push(`💳 Método de pago más usado: <b>${sorted2[0][0]}</b> con <b>${fmtCOP(sorted2[0][1])}</b> (${((sorted2[0][1]/total)*100).toFixed(1)}% del gasto).`);
      const credito=sorted2.filter(e=>e[0].toLowerCase().includes("crédito")).reduce((s,e)=>s+e[1],0);
      if(credito>0) eventos.push(`💳 Gasto en tarjetas de crédito: <b>${fmtCOP(credito)}</b> (${((credito/total)*100).toFixed(1)}%).`);
      break;
    }

    case"graficaMetodosAcum":{
      const tasas=mesesAll.map(mes=>{let i=0,g=0,p=0;movimientos.filter(m=>m.fecha.startsWith(mes)).forEach(m=>{if(m.tipo==="ingreso")i+=m.valor;else if(m.tipo==="gasto")g+=m.valor;else if(m.tipo==="pago_deuda_cuota")p+=m.valor;});return i>0?((i-g-p)/i)*100:0;});
      const promTasa=tasas.reduce((s,v)=>s+v,0)/(tasas.length||1);
      const maxTasa=tasas.reduce((mx,v)=>v>mx?v:mx,-Infinity),minTasa=tasas.reduce((mn,v)=>v<mn?v:mn,Infinity);
      const mesMejorTasa=mesesAll[tasas.indexOf(maxTasa)];
      eventos.push(`📈 Tasa de ahorro promedio: <b>${promTasa.toFixed(1)}%</b>.`);
      eventos.push(`🏆 Mejor mes: <b>${fmtMes(mesMejorTasa)}</b> con <b>${maxTasa.toFixed(1)}%</b> de tasa de ahorro.`);
      if(minTasa<0) eventos.push(`⚠️ En ${mesesAll[tasas.indexOf(minTasa)]} la tasa fue negativa (<b>${minTasa.toFixed(1)}%</b>), indicando gasto mayor al ingreso.`);
      break;
    }

    case"graficaFuentesIngresos":{
      const fMap={};movimientos.filter(m=>m.tipo==="ingreso").forEach(m=>{const lbl=m.subcategoria&&m.subcategoria!=="Subcategoría"?m.subcategoria:(m.descripcion||m.desc||"Otro");fMap[lbl]=(fMap[lbl]||0)+m.valor;});
      const sorted3=Object.entries(fMap).sort((a,b)=>b[1]-a[1]);
      const total=sorted3.reduce((s,e)=>s+e[1],0)||1;
      if(sorted3[0]) eventos.push(`💵 Principal fuente de ingreso: <b>${sorted3[0][0]}</b> con <b>${fmtCOP(sorted3[0][1])}</b> (${((sorted3[0][1]/total)*100).toFixed(1)}%).`);
      eventos.push(`📊 Se identificaron <b>${sorted3.length}</b> fuentes de ingreso distintas.`);
      break;
    }

    case"graficaDivisas":{
      const T=calcularTotales();
      const valorInv=calcularValorInversionesCOP(),dn=calcularDeudaNeta();
      const valorDiv=posicionesDivisa.reduce((s,p)=>s+p.cantidad*tcCOP(p.divisa),0);
      const pat=T.saldoCaja+valorDiv+valorInv-dn;
      const ganReal=ventasInversion.reduce((s,v)=>s+(v.gananciaActivoCop||0)+(v.gananciaFxCop||0),0);
      eventos.push(`💎 Patrimonio neto estimado: <b>${fmtCOP(pat)}</b>.`);
      eventos.push(`🏦 Compuesto por: Caja <b>${fmtCOP(T.saldoCaja)}</b> + Divisas <b>${fmtCOP(valorDiv)}</b> + Inversiones <b>${fmtCOP(valorInv)}</b> – Deuda <b>${fmtCOP(dn)}</b>.`);
      if(ganReal>0) eventos.push(`📈 Ganancia realizada acumulada: <b>${fmtCOP(ganReal)}</b>.`);
      if(mesesAll.length>=2){
        const primerBal=porMes[0].balance,ultimoBal=porMes[porMes.length-1].balance;
        const variacion=((ultimoBal-primerBal)/Math.abs(primerBal||1)*100).toFixed(1);
        eventos.push(`📊 El balance mensual ${variacion>=0?"creció":"cayó"} <b>${Math.abs(variacion)}%</b> desde <b>${fmtMes(mesesAll[0])}</b> hasta hoy.`);
      }
      break;
    }

    case"graficaHeatmap":{
      const diasNombre=["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
      const gastosDia=Array(7).fill(0);
      movimientos.filter(m=>m.tipo==="gasto").forEach(m=>{gastosDia[new Date(m.fecha+"T12:00:00").getDay()]+=m.valor;});
      const gastosDiaPos=gastosDia.filter(v=>v>0);
      const maxDia=gastosDia.indexOf(gastosDia.reduce((mx,v)=>v>mx?v:mx,0));
      const minDiaVal=gastosDiaPos.length?gastosDiaPos.reduce((mn,v)=>v<mn?v:mn,Infinity):0;
      const minDia=minDiaVal>0?gastosDia.indexOf(minDiaVal):-1;
      eventos.push(`📅 El día de mayor gasto es <b>${diasNombre[maxDia]}</b> con <b>${fmtCOP(gastosDia[maxDia])}</b> acumulado histórico.`);
      if(minDia>=0) eventos.push(`✅ El día de menor gasto es <b>${diasNombre[minDia]}</b>.`);
      const finSemana=gastosDia[0]+gastosDia[6];const semana=gastosDia.slice(1,6).reduce((s,v)=>s+v,0);
      eventos.push(`📊 Fin de semana vs entre semana: <b>${fmtCOP(finSemana)}</b> vs <b>${fmtCOP(semana)}</b>.`);
      break;
    }

    default:
      eventos.push("📊 Haz clic sobre los elementos de la gráfica para ver valores detallados.");
  }

  if(!eventos.length) return "<i>Sin datos suficientes para generar análisis.</i>";
  return`<p style="font-weight:700;color:#006b1a;margin:0 0 10px">📋 Análisis de la gráfica:</p>${eventos.map(e=>`<p style="margin:0 0 7px">• ${e}</p>`).join("")}`;
}

/* Inicializar al cargar */
document.addEventListener("DOMContentLoaded",()=>{
  setTimeout(inicializarZoomGraficas,800);
});
/* ── Re-inicializar zoom cuando se abra estadísticas ── */
/* NOTA: abrirPagina ya llama inicializarZoomGraficas via el bloque if(id==="estadisticas") */
/* No se necesita patch — se integró directamente en abrirPagina original */

/* ════════════════════════════════════════════════════════
   GRUPO D — MÓDULO ANALÍTICA COMPLETO
   ════════════════════════════════════════════════════════ */

/* ── Scroll suave hasta gráfica ── */
function scrollAGrafica(chartId){
  const ancla=document.getElementById(`ancla-${chartId}`);
  if(!ancla)return;
  // Asegurarse que estamos en estadísticas
  if(!document.getElementById("estadisticas").classList.contains("active")){
    abrirPagina("estadisticas");
    setTimeout(()=>ancla.scrollIntoView({behavior:"smooth",block:"center"}),350);
  }else{
    ancla.scrollIntoView({behavior:"smooth",block:"center"});
    // Highlight temporal
    ancla.style.outline="2.5px solid #00aa33";
    ancla.style.outlineOffset="4px";
    setTimeout(()=>{ancla.style.outline="";ancla.style.outlineOffset="";},1400);
  }
}

/* ── Calcular todos los KPIs extendidos ── */
function calcularKpisAnalitica(movF,mesesAll){
  let ing=0,gas=0,pag=0,tr=0;
  movF.forEach(m=>{
    if(m.tipo==="ingreso")ing+=m.valor;
    else if(m.tipo==="gasto"&&!m.esCredito)gas+=m.valor;
    else if(m.tipo==="pago_deuda_cuota")pag+=m.valor;
    else if(m.tipo==="traslado_inversion")tr+=m.valor;
  });
  const balance=ing-gas-pag;
  const tasaAhorro=ing>0?(balance/ing)*100:0;
  const valorInv=calcularValorInversionesCOP();
  const dn=calcularDeudaNeta();
  const valorDiv=posicionesDivisa.reduce((s,p)=>s+p.cantidad*tcCOP(p.divisa),0);
  const patrimonio=balance+valorDiv+valorInv-dn; // simplificado para período
  const ganReal=ventasInversion.reduce((s,v)=>s+(v.gananciaActivoCop||0)+(v.gananciaFxCop||0),0);
  const ganNoReal=inversiones.filter(i=>!i.cobrado||(i.cantidadRestante??i.cantidad??0)>0.000001).reduce((s,i)=>s+(valorActualInvCOP(i)-capitalInvertidoCOP(i)),0);
  const pnGTotal=ganReal+ganNoReal;
  const liquidez=balance+valorDiv; // caja + divisas disponibles
  const flujoCaja=ing-gas-pag-tr;

  // Rendimiento mensual del último mes vs penúltimo
  let rendMes=0;
  if(mesesAll.length>=2){
    const ul=mesesAll[mesesAll.length-1],pe=mesesAll[mesesAll.length-2];
    let ui=0,ug=0,up=0,pi=0,pg=0,pp=0;
    movimientos.filter(m=>m.fecha.startsWith(ul)).forEach(m=>{if(m.tipo==="ingreso")ui+=m.valor;else if(m.tipo==="gasto")ug+=m.valor;else if(m.tipo==="pago_deuda_cuota")up+=m.valor;});
    movimientos.filter(m=>m.fecha.startsWith(pe)).forEach(m=>{if(m.tipo==="ingreso")pi+=m.valor;else if(m.tipo==="gasto")pg+=m.valor;else if(m.tipo==="pago_deuda_cuota")pp+=m.valor;});
    const balU=ui-ug-up,balP=pi-pg-pp;
    rendMes=balP!==0?((balU-balP)/Math.abs(balP))*100:0;
  }

  return{ing,gas,pag,balance,tasaAhorro,valorInv,dn,patrimonio,pnGTotal,liquidez,flujoCaja,rendMes};
}

/* ── Calcular delta vs mes anterior ── */
function calcularDelta(campo,movF){
  const mesesAll=[...new Set(movimientos.map(m=>m.fecha.substring(0,7)))].sort();
  if(mesesAll.length<2)return null;
  const ul=mesesAll[mesesAll.length-1],pe=mesesAll[mesesAll.length-2];
  const calc=mes=>{let ing=0,gas=0,pag=0;movimientos.filter(m=>m.fecha.startsWith(mes)).forEach(m=>{if(m.tipo==="ingreso")ing+=m.valor;else if(m.tipo==="gasto")gas+=m.valor;else if(m.tipo==="pago_deuda_cuota")pag+=m.valor;});return{ing,gas,pag,balance:ing-gas-pag};};
  const vU=calc(ul),vP=calc(pe);
  const curr=vU[campo]??0,prev=vP[campo]??0;
  if(prev===0)return null;
  return((curr-prev)/Math.abs(prev))*100;
}

/* ── Render delta badge ── */
function renderDelta(val){
  if(val===null||isNaN(val))return"";
  const abs=Math.abs(val).toFixed(1);
  const arrow=val>=0?"▲":"▼";
  const col=val>=0?"#00aa33":"#ef4444";
  return`<span style="color:${col};font-size:10px;font-weight:700">${arrow} ${abs}% vs mes ant.</span>`;
}

/* ── Actualizar todos los KPIs de analítica ── */
function actualizarKpisAnalitica(){
  const movF=mesFiltro?movimientos.filter(m=>m.fecha.startsWith(mesFiltro)):movimientos;
  const mesesAll=[...new Set(movimientos.map(m=>m.fecha.substring(0,7)))].sort();
  const K=calcularKpisAnalitica(movF,mesesAll);

  const set=(id,v,deltaId,delta)=>{
    const e=document.getElementById(id);if(e)e.textContent=v;
    const d=document.getElementById(deltaId);if(d)d.innerHTML=delta||"";
  };
  const fK=v=>{const a=Math.abs(v);return(v<0?"-$":"$")+(a>=1e9?(a/1e9).toFixed(1)+"B":a>=1e6?(a/1e6).toFixed(1)+"M":a>=1000?(a/1000).toFixed(0)+"k":Math.round(a).toLocaleString("es-CO"));};

  // Color dinámico balance
  const balEl=document.getElementById("statBalance");
  if(balEl)balEl.style.color=K.balance>=0?"#006b1a":"#ef4444";

  set("statIngresos",  fK(K.ing),     "statIngDelta",  renderDelta(calcularDelta("ing",movF)));
  set("statGastos",    fK(K.gas),     "statGasDelta",  renderDelta(calcularDelta("gas",movF)));
  set("statPagos",     fK(K.pag),     "statPagDelta",  renderDelta(calcularDelta("pag",movF)));
  set("statBalance",   fK(K.balance), "statBalDelta",  renderDelta(calcularDelta("balance",movF)));
  set("statPatrimonio",fK(K.patrimonio),"statPatDelta", "");
  set("statInversiones",fK(K.valorInv),"statInvDelta",  "");
  set("statDeudaNeta", fK(K.dn),      "statDeuDelta",  "");
  set("statTasaAhorro2",K.tasaAhorro.toFixed(1)+"%","statTasaDelta","");
  set("statFlujoCaja", fK(K.flujoCaja),"statFlujoDelta","");
  set("statPnG",       (K.pnGTotal>=0?"+":"")+fK(K.pnGTotal),"statPnGDelta","");
  set("statLiquidez",  fK(K.liquidez),"statLiqDelta",  "");
  set("statRendMes",   (K.rendMes>=0?"+":"")+K.rendMes.toFixed(1)+"%","statRendDelta","");

  // Color P&G
  const pngEl=document.getElementById("statPnG");
  if(pngEl)pngEl.style.color=K.pnGTotal>=0?"#006b1a":"#ef4444";
  const rendEl=document.getElementById("statRendMes");
  if(rendEl)rendEl.style.color=K.rendMes>=0?"#006b1a":"#ef4444";
  const liqEl=document.getElementById("statLiquidez");
  if(liqEl)liqEl.style.color=K.liquidez>=0?"#00b8d4":"#ef4444";
}

/* ── KPIs analítica se actualizan desde renderEstadisticas directamente ── */
/* NOTA: renderEstadisticas ya llama actualizarKpisAnalitica() al final de su definición */

/* ════════════════════════════════════════════════════════
   GRUPO E — SPLIT/REVERSE SPLIT, DRIP, TRANSFERENCIAS,
             P&G REALIZADO vs NO REALIZADO, COMISIONES
             MULTIDIVISA, LOTE ESPECÍFICO (ESP)
   ════════════════════════════════════════════════════════ */

/* ── SQL extra necesario (agregar en Supabase):
   ALTER TABLE inversiones ADD COLUMN IF NOT EXISTS lote_esp_id BIGINT;
   ALTER TABLE inversiones ADD COLUMN IF NOT EXISTS broker_destino TEXT;
   CREATE TABLE IF NOT EXISTS operaciones_corporativas (
     id BIGSERIAL PRIMARY KEY, user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     inversion_id BIGINT REFERENCES inversiones(id) ON DELETE CASCADE,
     tipo TEXT NOT NULL,  -- 'split','reverse_split','drip','transferencia_broker'
     fecha DATE NOT NULL,
     factor NUMERIC(20,8),          -- para split/reverse split
     cantidad_nueva NUMERIC(20,8),  -- unidades generadas por DRIP
     precio_drip NUMERIC(20,8),     -- precio por unidad al reinvertir
     broker_origen TEXT, broker_destino TEXT,
     notas TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ALTER TABLE operaciones_corporativas ENABLE ROW LEVEL SECURITY;
   DROP POLICY IF EXISTS opc_policy ON operaciones_corporativas;
   CREATE POLICY opc_policy ON operaciones_corporativas USING (auth.uid()=user_id);
── */

let operacionesCorp = [];   // historial de splits, drip, transferencias

/* ── Carga de operaciones corporativas integrada directamente en cargarDatos ── */
/* NOTA: la carga de operaciones_corporativas se agregó al array de Promise.all en cargarDatos */
/* No se necesita patch recursivo */

/* ════════════════════════════════
   1. SPLIT / REVERSE SPLIT
   ════════════════════════════════ */
function abrirModalSplit(invId){
  const inv = inversiones.find(i=>String(i.id)===String(invId));
  if(!inv) return;
  document.getElementById("splitInvId").value = String(invId);
  document.getElementById("splitTitulo").textContent = `✂️ Split: ${inv.nombre}`;
  document.getElementById("splitTipo").value = "split";
  document.getElementById("splitFactor").value = "";
  document.getElementById("splitFecha").value = hoy();
  document.getElementById("splitPreview").innerHTML = "";
  document.getElementById("modalSplit").style.display = "flex";
}
function cerrarModalSplit(){ document.getElementById("modalSplit").style.display = "none"; }

function actualizarPreviewSplit(){
  const id = document.getElementById("splitInvId").value;
  const inv = inversiones.find(i=>String(i.id)===String(id));
  if(!inv) return;
  const factor = Number(document.getElementById("splitFactor").value)||0;
  const tipo = document.getElementById("splitTipo").value;
  if(factor<=0){ document.getElementById("splitPreview").innerHTML=""; return; }
  const cantActual = inv.cantidadRestante??inv.cantidad??0;
  const precioActual = inv.precioActualDivisa||inv.precioActual||0;
  let cantNueva, precioNuevo;
  if(tipo==="split"){
    cantNueva = cantActual * factor;
    precioNuevo = precioActual / factor;
  } else {
    cantNueva = cantActual / factor;
    precioNuevo = precioActual * factor;
  }
  document.getElementById("splitPreview").innerHTML =
    `<div style="background:#f0faf0;border-radius:10px;padding:10px;font-size:12px;color:#224422;line-height:1.8">
      <b>${tipo==="split"?"Split":"Reverse Split"} ${factor}:1</b><br>
      Unidades: <b>${cantActual.toFixed(4)}</b> → <b>${cantNueva.toFixed(4)}</b><br>
      Precio/u: <b>${precioActual.toFixed(4)}</b> → <b>${precioNuevo.toFixed(6)}</b> ${inv.divisa||"COP"}<br>
      <span style="color:#9aaa9a;font-size:11px">El valor total del portafolio no cambia</span>
    </div>`;
}

async function confirmarSplit(){
  const id = document.getElementById("splitInvId").value;
  const inv = inversiones.find(i=>String(i.id)===String(id));
  if(!inv) return;
  const factor = Number(document.getElementById("splitFactor").value)||0;
  const tipo = document.getElementById("splitTipo").value;
  const fecha = document.getElementById("splitFecha").value||hoy();
  if(factor<=0||factor===1){ alert("Factor inválido."); return; }

  const cantActual = inv.cantidadRestante??inv.cantidad??0;
  const precioActual = inv.precioActualDivisa||inv.precioActual||0;
  let cantNueva, precioNuevo;
  if(tipo==="split"){
    cantNueva = cantActual * factor;
    precioNuevo = precioActual / factor;
  } else {
    cantNueva = cantActual / factor;
    precioNuevo = precioActual * factor;
  }

  // Actualizar inversión
  inv.cantidadRestante = cantNueva;
  inv.cantidad = cantNueva;
  inv.precioActualDivisa = precioNuevo;
  inv.precioActual = precioNuevo;
  await sbUpdate("inversiones", id, {
    cantidad_restante: cantNueva, cantidad: cantNueva,
    precio_actual_divisa: precioNuevo, precio_actual: precioNuevo
  });

  // Ajustar lotes proporcionalmente
  const lotesInv = lotesInversion.filter(l=>String(l.inversionId)===String(id)&&!l.cerrado);
  for(const l of lotesInv){
    if(tipo==="split"){
      l.cantidadRestante *= factor; l.cantidad *= factor;
      l.precioUnidad /= factor;
    } else {
      l.cantidadRestante /= factor; l.cantidad /= factor;
      l.precioUnidad *= factor;
    }
    if(l.id) await sbUpdate("lotes_inversion", l.id, {
      cantidad_restante: l.cantidadRestante, cantidad: l.cantidad,
      precio_unidad: l.precioUnidad
    });
  }

  // Registrar operación corporativa
  const opRes = await sbInsert("operaciones_corporativas",{
    user_id:_currentUser.id, inversion_id:id, tipo, fecha,
    factor, notas:`${tipo==="split"?"Split":"Reverse Split"} ${factor}:1 — ${cantActual.toFixed(4)} u. → ${cantNueva.toFixed(4)} u.`
  });
  if(opRes&&opRes[0]) operacionesCorp.unshift({id:opRes[0].id,inversionId:id,tipo,fecha,factor,cantidadNueva:cantNueva,notas:opRes[0].notas});

  cerrarModalSplit();
  actualizar();
  alert(`✓ ${tipo==="split"?"Split":"Reverse Split"} aplicado\n${cantActual.toFixed(4)} → ${cantNueva.toFixed(4)} unidades\nPrecio: ${precioActual.toFixed(4)} → ${precioNuevo.toFixed(6)} ${inv.divisa||""}`);
}

/* ════════════════════════════════
   2. DRIP — REINVERSIÓN AUTOMÁTICA
   ════════════════════════════════ */
function abrirModalDrip(invId){
  const inv = inversiones.find(i=>String(i.id)===String(invId));
  if(!inv) return;
  document.getElementById("dripInvId").value = String(invId);
  document.getElementById("dripTitulo").textContent = `🔄 DRIP: ${inv.nombre}`;
  document.getElementById("dripFecha").value = hoy();
  document.getElementById("dripMonto").value = "";
  document.getElementById("dripDivisa").value = inv.divisa||"USD";
  document.getElementById("dripPrecio").value = inv.precioActualDivisa||inv.precioActual||"";
  document.getElementById("dripImpuesto").value = "";
  document.getElementById("dripPreview").innerHTML = "";
  document.getElementById("modalDrip").style.display = "flex";
}
function cerrarModalDrip(){ document.getElementById("modalDrip").style.display = "none"; }

function actualizarPreviewDrip(){
  const monto = Number(document.getElementById("dripMonto").value)||0;
  const precio = Number(document.getElementById("dripPrecio").value)||0;
  const impuesto = Number(document.getElementById("dripImpuesto").value)||0;
  if(monto<=0||precio<=0){ document.getElementById("dripPreview").innerHTML=""; return; }
  const montoNeto = monto - impuesto;
  const unidadesNuevas = montoNeto / precio;
  document.getElementById("dripPreview").innerHTML =
    `<div style="background:#f0faf0;border-radius:10px;padding:10px;font-size:12px;color:#224422;line-height:1.8">
      Dividendo bruto: <b>${monto.toFixed(4)}</b><br>
      Impuesto retenido: <b>${impuesto.toFixed(4)}</b><br>
      Monto neto: <b>${montoNeto.toFixed(4)}</b><br>
      Precio por unidad: <b>${precio.toFixed(6)}</b><br>
      <b>Unidades nuevas: ${unidadesNuevas.toFixed(6)}</b>
    </div>`;
}

async function confirmarDrip(){
  const id = document.getElementById("dripInvId").value;
  const inv = inversiones.find(i=>String(i.id)===String(id));
  if(!inv) return;
  const fecha = document.getElementById("dripFecha").value||hoy();
  const monto = Number(document.getElementById("dripMonto").value)||0;
  const divisa = document.getElementById("dripDivisa").value||"USD";
  const precio = Number(document.getElementById("dripPrecio").value)||0;
  const impuesto = Number(document.getElementById("dripImpuesto").value)||0;
  if(monto<=0||precio<=0){ alert("Completa monto y precio."); return; }

  const montoNeto = monto - impuesto;
  const unidadesNuevas = montoNeto / precio;
  const tc = tcCOP(divisa);

  // Agregar unidades a la inversión
  const cantAnterior = inv.cantidadRestante??inv.cantidad??0;
  inv.cantidadRestante = cantAnterior + unidadesNuevas;
  inv.cantidad = (inv.cantidad||0) + unidadesNuevas;
  await sbUpdate("inversiones", id, {
    cantidad_restante: inv.cantidadRestante,
    cantidad: inv.cantidad
  });

  // Crear nuevo lote para las unidades DRIP (costo = precio de reinversión)
  const costoCopTotal = unidadesNuevas * precio * tc;
  const lRes = await sbInsert("lotes_inversion",{
    user_id:_currentUser.id, inversion_id:id, fecha,
    cantidad: unidadesNuevas, precio_unidad: precio,
    divisa_activo: divisa, tc_compra_cop: tc,
    costo_cop_total: costoCopTotal,
    comision: 0, divisa_comision:"COP",
    cantidad_restante: unidadesNuevas, cerrado: false
  });
  if(lRes&&lRes[0]) lotesInversion.push({id:lRes[0].id, inversionId:id, fecha, cantidad:unidadesNuevas, precioUnidad:precio, divisaActivo:divisa, tcCompra:tc, costoCopTotal, cantidadRestante:unidadesNuevas, cerrado:false});

  // Registrar dividendo
  const dRes = await sbInsert("dividendos",{
    user_id:_currentUser.id, inversion_id:id, fecha, monto:montoNeto,
    divisa, tipo:"drip", destino:"reinvertir",
    tc_cop:tc, monto_cop:costoCopTotal,
    impuesto_retenido:impuesto, divisa_impuesto:divisa
  });
  if(dRes&&dRes[0]) _dividendos.push({id:dRes[0].id, inversionId:id, fecha, monto:montoNeto, divisa, tipo:"drip", destino:"reinvertir", tcCop:tc, montoCop:costoCopTotal, impuestoRetenido:impuesto});

  // Operación corporativa
  await sbInsert("operaciones_corporativas",{
    user_id:_currentUser.id, inversion_id:id, tipo:"drip", fecha,
    cantidad_nueva:unidadesNuevas, precio_drip:precio,
    notas:`DRIP: ${unidadesNuevas.toFixed(6)} u. @ ${precio} ${divisa} (div bruto: ${monto})`
  });

  cerrarModalDrip();
  actualizar();
  alert(`✓ DRIP registrado\n+${unidadesNuevas.toFixed(6)} unidades de ${inv.nombre}\nDividendo reinvertido: ${montoNeto.toFixed(4)} ${divisa}`);
}

/* ════════════════════════════════
   3. TRANSFERENCIA ENTRE BRÓKERS
   ════════════════════════════════ */
function abrirModalTransferBroker(invId){
  const inv = inversiones.find(i=>String(i.id)===String(invId));
  if(!inv) return;
  document.getElementById("transferInvId").value = String(invId);
  document.getElementById("transferTitulo").textContent = `🔀 Transferir: ${inv.nombre}`;
  document.getElementById("transferBrokerOrig").value = inv.broker||"";
  document.getElementById("transferBrokerDest").value = "";
  document.getElementById("transferFecha").value = hoy();
  document.getElementById("transferCant").value = (inv.cantidadRestante??inv.cantidad??0).toFixed(4);
  document.getElementById("transferNota").value = "";
  document.getElementById("modalTransferBroker").style.display = "flex";
}
function cerrarModalTransferBroker(){ document.getElementById("modalTransferBroker").style.display = "none"; }

async function confirmarTransferBroker(){
  const id = document.getElementById("transferInvId").value;
  const inv = inversiones.find(i=>String(i.id)===String(id));
  if(!inv) return;
  const brokerOrig = document.getElementById("transferBrokerOrig").value.trim();
  const brokerDest = document.getElementById("transferBrokerDest").value.trim();
  const fecha = document.getElementById("transferFecha").value||hoy();
  const cant = Number(document.getElementById("transferCant").value)||0;
  const nota = document.getElementById("transferNota").value.trim();
  if(!brokerDest){ alert("Indica el bróker destino."); return; }
  if(cant<=0){ alert("Indica la cantidad a transferir."); return; }

  // Solo cambia el bróker — NO se registra como venta
  inv.broker = brokerDest;
  await sbUpdate("inversiones", id, { broker: brokerDest });

  // Registrar como operación corporativa (trazabilidad)
  const opRes = await sbInsert("operaciones_corporativas",{
    user_id:_currentUser.id, inversion_id:id, tipo:"transferencia_broker", fecha,
    factor:1, broker_origen:brokerOrig, broker_destino:brokerDest,
    notas:nota||`Transferencia ${cant} u. de ${brokerOrig||"origen"} → ${brokerDest}`
  });
  if(opRes&&opRes[0]) operacionesCorp.unshift({id:opRes[0].id,inversionId:id,tipo:"transferencia_broker",fecha,factor:1,brokerOrigen:brokerOrig,brokerDestino:brokerDest,notas:opRes[0].notas});

  cerrarModalTransferBroker();
  actualizar();
  alert(`✓ Transferencia registrada\n${inv.nombre} → ${brokerDest}\nNo se registró como venta. Costo histórico intacto.`);
}

/* ════════════════════════════════
   4. P&G REALIZADO vs NO REALIZADO
      Vista dedicada en la tabla
   ════════════════════════════════ */
function calcularPnGCompleto(){
  // No realizado (posiciones activas)
  const activas = inversiones.filter(i=>!i.cobrado||(i.cantidadRestante??i.cantidad??0)>0.000001);
  const noRealizado = activas.reduce((s,inv)=>{
    const va=valorActualInvCOP(inv), ci=capitalInvertidoCOP(inv);
    return s+(va-ci);
  },0);

  // Realizado (ventas + inversiones cerradas)
  const ganVentas = ventasInversion.reduce((s,v)=>s+(v.gananciaActivoCop||0)+(v.gananciaFxCop||0),0);
  const ganCerradas = inversiones.filter(i=>i.cobrado&&(i.cantidadRestante??i.cantidad??0)<=0.000001)
    .reduce((s,inv)=>s+(inv.valorCobrado||0)-capitalInvertidoCOP(inv),0);
  const realizado = ganVentas + ganCerradas;

  // Dividendos totales recibidos
  const dividendosTot = _dividendos.filter(d=>d.destino==="caja_cop").reduce((s,d)=>s+(d.montoCop||0),0);

  // P&G FX no realizado (posiciones en divisa)
  const ganFxDiv = posicionesDivisa.reduce((s,p)=>s+p.cantidad*(tcCOP(p.divisa)-(p.costoProm||tcCOP(p.divisa))),0);

  return{ noRealizado, realizado, dividendosTot, ganFxDiv, total:noRealizado+realizado+dividendosTot+ganFxDiv };
}

function renderPnGWidget(){
  const cont = document.getElementById("pnGWidget"); if(!cont) return;
  const P = calcularPnGCompleto();
  const fmtPG = v=>`<span style="color:${v>=0?"#00aa33":"#ef4444"};font-weight:700">${v>=0?"+":""}${fmtN(v)}</span>`;
  cont.innerHTML = `
    <div style="background:#fff;border-radius:16px;border:1px solid #e8ede8;padding:16px;margin-bottom:16px">
      <h3 style="font-size:14px;font-weight:700;color:#006b1a;margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid #f0f5f0">📊 P&G Realizado vs No Realizado</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="background:#f5f7f5;border-radius:12px;padding:12px;text-align:center">
          <p style="font-size:10px;color:#9aaa9a;margin:0 0 4px;font-weight:600">NO REALIZADO</p>
          <p style="font-size:16px;margin:0">${fmtPG(P.noRealizado)}</p>
          <p style="font-size:10px;color:#9aaa9a;margin:4px 0 0">Posiciones abiertas</p>
        </div>
        <div style="background:#f5f7f5;border-radius:12px;padding:12px;text-align:center">
          <p style="font-size:10px;color:#9aaa9a;margin:0 0 4px;font-weight:600">REALIZADO</p>
          <p style="font-size:16px;margin:0">${fmtPG(P.realizado)}</p>
          <p style="font-size:10px;color:#9aaa9a;margin:4px 0 0">Ventas cerradas</p>
        </div>
        <div style="background:#f5f7f5;border-radius:12px;padding:12px;text-align:center">
          <p style="font-size:10px;color:#9aaa9a;margin:0 0 4px;font-weight:600">DIVIDENDOS</p>
          <p style="font-size:16px;margin:0;color:#fdcb6e;font-weight:800">+${fmtN(P.dividendosTot)}</p>
          <p style="font-size:10px;color:#9aaa9a;margin:4px 0 0">En COP a caja</p>
        </div>
        <div style="background:#f5f7f5;border-radius:12px;padding:12px;text-align:center">
          <p style="font-size:10px;color:#9aaa9a;margin:0 0 4px;font-weight:600">P&G FX</p>
          <p style="font-size:16px;margin:0">${fmtPG(P.ganFxDiv)}</p>
          <p style="font-size:10px;color:#9aaa9a;margin:4px 0 0">Divisas no realizadas</p>
        </div>
      </div>
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid #f0f5f0;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:12px;color:#446644;font-weight:700">Total P&G (todo)</span>
        <span style="font-size:18px">${fmtPG(P.total)}</span>
      </div>
    </div>`;
}

/* ════════════════════════════════
   5. IDENTIFICACIÓN ESPECÍFICA DE
      LOTES (método ESP)
   ════════════════════════════════ */
function abrirSelectorLoteEsp(invId){
  const inv = inversiones.find(i=>String(i.id)===String(invId));
  if(!inv) return;
  const lotes = lotesInversion.filter(l=>String(l.inversionId)===String(invId)&&!l.cerrado);
  if(!lotes.length){ alert("Sin lotes disponibles para este activo."); return; }

  const cont = document.getElementById("lotesEspContainer");
  if(!cont) return;
  document.getElementById("lotesEspInvId").value = String(invId);
  document.getElementById("lotesEspTitulo").textContent = `📦 Seleccionar Lotes: ${inv.nombre}`;
  cont.innerHTML = lotes.map(l=>`
    <div style="background:#f5f7f5;border-radius:11px;padding:11px;margin-bottom:7px;display:flex;align-items:center;gap:10px">
      <input type="checkbox" id="lote_${l.id}" value="${l.id}" style="width:16px;height:16px;cursor:pointer">
      <label for="lote_${l.id}" style="cursor:pointer;flex:1;font-size:12px">
        <b>${l.fecha}</b> · ${l.cantidadRestante.toFixed(4)} u. @ ${l.precioUnidad.toFixed(6)} ${l.divisaActivo||"COP"}
        <br><span style="color:#9aaa9a">TC compra: ${l.tcCompra.toFixed(2)} · Costo COP: ${fmt(l.costoCopTotal||0)}</span>
      </label>
      <input type="number" id="cant_${l.id}" placeholder="Cant." step="0.00000001"
        max="${l.cantidadRestante}" style="width:80px;padding:6px;border:1px solid #ccd8cc;border-radius:8px;font-size:12px">
    </div>`).join("");
  document.getElementById("modalLotesEsp").style.display = "flex";
}
function cerrarModalLotesEsp(){ document.getElementById("modalLotesEsp").style.display = "none"; }

function confirmarLotesEsp(){
  // Marca los lotes seleccionados y abre modal de venta con método ESP
  const invId = document.getElementById("lotesEspInvId").value;
  const inv = inversiones.find(i=>String(i.id)===String(invId));
  if(!inv) return;
  const lotes = lotesInversion.filter(l=>String(l.inversionId)===String(invId)&&!l.cerrado);
  const seleccionados = lotes.filter(l=>document.getElementById(`lote_${l.id}`)?.checked);
  if(!seleccionados.length){ alert("Selecciona al menos un lote."); return; }
  // Guardar selección en variable temporal
  window._lotesEspSeleccionados = seleccionados.map(l=>({
    id:l.id, cantSel:Number(document.getElementById(`cant_${l.id}`)?.value)||l.cantidadRestante,
    precioUnidad:l.precioUnidad, tcCompra:l.tcCompra
  }));
  const cantTotal = window._lotesEspSeleccionados.reduce((s,l)=>s+l.cantSel,0);
  cerrarModalLotesEsp();
  // Abrir modal de venta prerellenado
  abrirModalVentaParcial(invId);
  setTimeout(()=>{
    const cantEl = document.getElementById("ventaCant");
    if(cantEl) cantEl.value = cantTotal.toFixed(6);
    const metEl = document.getElementById("ventaMetodoCosto");
    if(metEl) metEl.value = "ESP";
    actualizarResumenVenta();
  },100);
}

/* ── confirmarVentaParcial maneja ESP via window._lotesEspSeleccionados ── */
/* La función original ya tiene la lógica condicional ESP integrada arriba ── */

async function confirmarVentaEsp(){
  const id = document.getElementById("ventaInvId").value;
  const inv = inversiones.find(i=>String(i.id)===String(id));
  if(!inv) return;
  const precio = Number(document.getElementById("ventaPrecio").value)||0;
  const tcEl = document.getElementById("ventaTC");
  const tc = tcEl?Number(tcEl.value)||tcCOP(inv.divisa||"COP"):tcCOP(inv.divisa||"COP");
  const comision = Number(document.getElementById("ventaComision").value)||0;
  const impuesto = Number(document.getElementById("ventaImpuesto").value)||0;
  const fecha = document.getElementById("ventaFecha").value||hoy();
  const destino = document.getElementById("ventaDestino")?.value||"caja_cop";
  const divisa = inv.divisa||"COP";
  const lotes = window._lotesEspSeleccionados||[];
  if(!lotes.length||precio<=0){ alert("Faltan datos."); return; }

  let cantTotal=0, costoTotal=0;
  for(const ls of lotes){
    cantTotal += ls.cantSel;
    costoTotal += ls.cantSel * ls.precioUnidad * ls.tcCompra;
  }
  const valorBrutoCOP = cantTotal*precio*tc;
  const valorNetoCOP = valorBrutoCOP - comision - impuesto;
  const ganActivo = (cantTotal*precio - cantTotal*(inv.precioCompra||0))*tc;
  const ganFx = divisa!=="COP"?cantTotal*(inv.precioCompra||0)*(tc-(inv.tcCompra||tc)):0;

  // Actualizar lotes individualmente
  for(const ls of lotes){
    const lote = lotesInversion.find(l=>String(l.id)===String(ls.id));
    if(!lote) continue;
    lote.cantidadRestante = Math.max(0, lote.cantidadRestante - ls.cantSel);
    if(lote.cantidadRestante < 0.000001) lote.cerrado = true;
    if(lote.id) await sbUpdate("lotes_inversion", lote.id, {cantidad_restante:lote.cantidadRestante, cerrado:lote.cerrado});
  }

  const nuevaCant = Math.max(0,(inv.cantidadRestante??inv.cantidad??0)-cantTotal);
  inv.cantidadRestante = nuevaCant;
  const esCerrado = nuevaCant<=0.000001;
  if(esCerrado){inv.cobrado=true;inv.valorCobrado=valorNetoCOP;inv.fechaCobro=fecha;}
  await sbUpdate("inversiones",id,{cantidad_restante:nuevaCant,cobrado:esCerrado,valor_cobrado:esCerrado?valorNetoCOP:undefined,fecha_cobro:esCerrado?fecha:undefined});

  const divisaDest = destino.startsWith("divisa_")?destino.replace("divisa_",""):"COP";
  const vRes = await sbInsert("ventas_inversion",{user_id:_currentUser.id,inversion_id:id,fecha,cantidad:cantTotal,precio_venta:precio,divisa_activo:divisa,tc_venta_cop:tc,valor_cop:valorNetoCOP,divisa_destino:divisaDest,comision,divisa_comision:"COP",impuesto,divisa_impuesto:"COP",metodo_costo:"ESP",ganancia_activo_cop:ganActivo,ganancia_fx_cop:ganFx});
  if(vRes&&vRes[0]) ventasInversion.push({id:vRes[0].id,inversionId:id,fecha,cantidad:cantTotal,precioVenta:precio,divisaActivo:divisa,tcVenta:tc,valorCop:valorNetoCOP,divisaDestino:divisaDest,comision,impuesto,metodoCosto:"ESP",gananciaActivoCop:ganActivo,gananciaFxCop:ganFx});

  if(destino==="caja_cop"){
    const desc=`Venta ESP ${cantTotal.toFixed(4)} ${inv.nombre} | P&G: ${fmtN(ganActivo+ganFx)}`;
    const mRes=await sbInsert("movimientos",{user_id:_currentUser.id,descripcion:desc,valor:Math.max(0,valorNetoCOP),tipo:"ingreso",fecha,categoria:"Inversión",subcategoria:`Venta ${inv.tipo}`,metodo_pago:"Transferencia",es_credito:false});
    if(mRes&&mRes[0]) movimientos.push({id:mRes[0].id,descripcion:desc,desc,valor:Math.max(0,valorNetoCOP),tipo:"ingreso",fecha,categoria:"Inversión",subcategoria:`Venta ${inv.tipo}`,metodoPago:"Transferencia",esCredito:false,deudaId:null});
  }

  cerrarModalVentaParcial();
  actualizar();
  alert(`✓ Venta ESP completada\n${cantTotal.toFixed(4)} u. de ${inv.nombre}\nGanancia: ${fmtN(ganActivo+ganFx)}\nNeto: ${fmt(Math.max(0,valorNetoCOP))}`);
}

/* ── Los botones de grupo E (split/drip/transfer/esp) se inyectan
      directamente en actualizarInversiones via invAcciones class ── */
/* NOTA: no se necesita patch recursivo */

/* Historial de operaciones corporativas por inversión */
function htmlOpsCorp(invId){
  const ops = operacionesCorp.filter(o=>String(o.inversionId)===String(invId));
  if(!ops.length) return "";
  const TIPOS={split:"✂️ Split",reverse_split:"↩️ Reverse Split",drip:"🔄 DRIP",transferencia_broker:"🔀 Transferencia"};
  return`<div style="margin-top:8px;padding-top:8px;border-top:1px solid #f0f5f0">
    <p style="font-size:11px;color:#9aaa9a;font-weight:700;margin:0 0 5px">Historial corporativo:</p>
    ${ops.slice(0,4).map(o=>`<div style="font-size:11px;color:#446644;margin-bottom:3px">${TIPOS[o.tipo]||o.tipo} · ${o.fecha}${o.notas?` — ${o.notas}`:""}</div>`).join("")}
  </div>`;
}

/* ════════════════════════════════════════════════════════
   GRUPO F — INFORME DE INVERSIONES + INFORME DE DEUDAS
   ════════════════════════════════════════════════════════ */

const _CSS_INFORME = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',sans-serif;background:#f5f7f5;color:#111811;padding:18px;max-width:900px;margin:auto}
h1{font-size:22px;font-weight:800;background:linear-gradient(90deg,#006b1a,#00aa33);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:3px}
.sub{color:#446644;font-size:12px;margin-bottom:18px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:9px;margin-bottom:16px}
.kpi{background:#fff;border-radius:13px;padding:13px 10px;text-align:center;border:1.5px solid #e0e8e0;box-shadow:0 2px 8px rgba(0,100,30,.06)}
.kpi .l{font-size:10px;color:#9aaa9a;margin-bottom:5px;font-weight:600;text-transform:uppercase}
.kpi .v{font-size:15px;font-weight:800;word-break:break-all}
.verde{color:#006b1a}.rojo{color:#ef4444}.naranja{color:#f97316}
.azul{color:#00aa33}.purp{color:#6c5ce7}.cyan{color:#00b8d4}.gold{color:#fdcb6e}
section{margin-bottom:18px;background:#fff;border:1px solid #e8ede8;padding:14px 16px;border-radius:16px;box-shadow:0 2px 8px rgba(0,100,30,.05)}
section h2{font-size:13px;font-weight:700;color:#006b1a;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #f0f5f0}
table{width:100%;border-collapse:collapse;font-size:11px}
th{background:#f5f7f5;padding:7px 8px;text-align:left;color:#446644;font-weight:700;border-bottom:2px solid #e8ede8}
td{padding:7px 8px;border-bottom:1px solid #f0f5f0}
tr:hover td{background:#fafcfa}
.grafGrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:4px}
.grafCard{background:#fff;border:1px solid #e8ede8;border-radius:13px;padding:10px;overflow:hidden}
.grafCard p{text-align:center;font-size:10px;color:#9aaa9a;margin-bottom:6px;font-weight:600}
.grafCard canvas{max-height:170px!important}
.badge{display:inline-block;padding:3px 8px;border-radius:999px;font-size:10px;font-weight:700}
.badge-verde{background:#e8faf0;color:#006b1a}
.badge-rojo{background:#fef2f2;color:#ef4444}
.badge-naranja{background:#fff7ed;color:#f97316}
@media(max-width:540px){.grafGrid{grid-template-columns:1fr}}
@print{body{padding:8px}.grafGrid{grid-template-columns:1fr 1fr}}
`;

/* ════════════════════════════════
   F.1 — INFORME DE INVERSIONES
   ════════════════════════════════ */
function generarInformeInversiones(){
  const invActivas = inversiones.filter(i=>!i.cobrado||(i.cantidadRestante??i.cantidad??0)>0.000001);
  const invCerradas = inversiones.filter(i=>i.cobrado&&(i.cantidadRestante??i.cantidad??0)<=0.000001);
  if(!invActivas.length&&!invCerradas.length){ alert("Sin inversiones registradas."); return; }

  const totalVal   = invActivas.reduce((s,i)=>s+valorActualInvCOP(i),0);
  const totalInv   = invActivas.reduce((s,i)=>s+capitalInvertidoCOP(i),0);
  const ganNoReal  = totalVal-totalInv;
  const ganReal    = ventasInversion.reduce((s,v)=>s+(v.gananciaActivoCop||0)+(v.gananciaFxCop||0),0);
  const divTot     = _dividendos.reduce((s,d)=>s+(d.montoCop||0),0);
  const divCaja    = _dividendos.filter(d=>d.destino==="caja_cop").reduce((s,d)=>s+(d.montoCop||0),0);
  const ganFxDiv   = posicionesDivisa.reduce((s,p)=>s+p.cantidad*(tcCOP(p.divisa)-(p.costoProm||tcCOP(p.divisa))),0);
  const pctRend    = totalInv>0?((ganNoReal/totalInv)*100).toFixed(2):0;
  const cl         = ["#00aa33","#00b8d4","#f97316","#a29bfe","#fdcb6e","#fb7185","#6c5ce7","#22c55e","#fd9644","#e17055"];

  // Series mensuales de valor del portafolio (basadas en movimientos de inversión)
  const mesesAll = [...new Set(movimientos.map(m=>m.fecha.substring(0,7)))].sort();
  const labM = mesesAll.map(m=>{const[a,mo]=m.split("-");return new Date(Number(a),Number(mo)-1,1).toLocaleDateString("es-CO",{month:"short",year:"2-digit"});});

  // Tabla de posiciones activas
  const filasActivas = invActivas.map((inv,i)=>{
    const va=valorActualInvCOP(inv),ci=capitalInvertidoCOP(inv),gan=va-ci;
    const pct=ci>0?((gan/ci)*100).toFixed(1):0;
    const cant=inv.cantidadRestante??inv.cantidad??0;
    const divisa=inv.divisa||"COP";
    const precDiv=inv.precioActualDivisa||inv.precioActual||0;
    return`<tr>
      <td><b>${inv.nombre}</b><br><span style="color:#9aaa9a;font-size:10px">${inv.tipo}${inv.broker?" · "+inv.broker:""}</span></td>
      <td><span class="badge badge-${cl[i%cl.length]==="a"?"verde":"verde"}" style="background:${cl[i%cl.length]}22;color:${cl[i%cl.length]}">${divisa}</span></td>
      <td>${cant.toFixed(4)}</td>
      <td>${precDiv.toFixed(4)}</td>
      <td>${fmt(va)}</td>
      <td>${fmt(ci)}</td>
      <td style="color:${gan>=0?"#006b1a":"#ef4444"};font-weight:700">${gan>=0?"+":""}${fmtN(gan)}<br><span style="font-size:10px">${pct}%</span></td>
      <td>${inv.metodoCosto||"PROM"}</td>
    </tr>`;
  }).join("");

  // Tabla ventas realizadas
  const filasVentas = ventasInversion.slice().sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)).map(v=>{
    const inv2=inversiones.find(i=>String(i.id)===String(v.inversionId));
    const totGan=v.gananciaActivoCop+v.gananciaFxCop;
    return`<tr>
      <td>${v.fecha}</td>
      <td><b>${inv2?inv2.nombre:"—"}</b></td>
      <td>${v.cantidad.toFixed(4)}</td>
      <td>${v.divisaActivo}</td>
      <td>${fmt(v.valorCop)}</td>
      <td style="color:${v.gananciaActivoCop>=0?"#006b1a":"#ef4444"}">${fmtN(v.gananciaActivoCop)}</td>
      <td style="color:${v.gananciaFxCop>=0?"#006b1a":"#ef4444"}">${fmtN(v.gananciaFxCop)}</td>
      <td style="color:${totGan>=0?"#006b1a":"#ef4444"};font-weight:700">${fmtN(totGan)}</td>
      <td>${v.metodoCosto}</td>
    </tr>`;
  }).join("");

  // Tabla dividendos
  const filasDivs = _dividendos.slice().sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)).map(d=>{
    const inv2=inversiones.find(i=>String(i.id)===String(d.inversionId));
    return`<tr>
      <td>${d.fecha}</td>
      <td>${inv2?inv2.nombre:"—"}</td>
      <td><span class="badge badge-naranja">${d.tipo}</span></td>
      <td>${d.monto.toFixed(4)} ${d.divisa}</td>
      <td>${fmt(d.montoCop)}</td>
      <td>${d.destino==="caja_cop"?"💰 Caja":d.destino==="reinvertir"?"🔄 DRIP":"💱 Divisa"}</td>
      <td style="color:#ef4444">${d.impuestoRetenido>0?d.impuestoRetenido.toFixed(4)+" "+d.divisa:"—"}</td>
    </tr>`;
  }).join("");

  // Tabla operaciones corporativas
  const filasOps = operacionesCorp.slice().sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)).map(o=>{
    const inv2=inversiones.find(i=>String(i.id)===String(o.inversionId));
    const TIPOS={split:"✂️ Split",reverse_split:"↩️ Reverse Split",drip:"🔄 DRIP",transferencia_broker:"🔀 Transfer"};
    return`<tr>
      <td>${o.fecha}</td>
      <td>${inv2?inv2.nombre:"—"}</td>
      <td>${TIPOS[o.tipo]||o.tipo}</td>
      <td>${o.factor!==1?`Factor ${o.factor}`:o.cantidadNueva?`+${o.cantidadNueva.toFixed(4)} u.`:"—"}</td>
      <td style="color:#9aaa9a;font-size:10px">${o.notas}</td>
    </tr>`;
  }).join("");

  // Concentración por tipo
  const tipoMap={};invActivas.forEach(i=>{tipoMap[i.tipo]=(tipoMap[i.tipo]||0)+valorActualInvCOP(i);});
  const brokerMap={};invActivas.forEach(i=>{const b=i.broker||"Sin bróker";brokerMap[b]=(brokerMap[b]||0)+valorActualInvCOP(i);});
  const divisaMap={};invActivas.forEach(i=>{const d=i.divisa||"COP";divisaMap[d]=(divisaMap[d]||0)+valorActualInvCOP(i);});

  // Rentabilidad mensual de ventas
  const renMes={};ventasInversion.forEach(v=>{const m=v.fecha.substring(0,7);renMes[m]=(renMes[m]||0)+v.gananciaActivoCop+v.gananciaFxCop;});
  const renMesData=mesesAll.map(m=>renMes[m]||0);

  const fecha=new Date().toLocaleDateString("es-CO",{weekday:"long",day:"numeric",month:"long",year:"numeric"});

  const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Informe de Inversiones</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
<style>${_CSS_INFORME}
.kpi{border-top:4px solid transparent}
.kpi.k-inv{border-top-color:#6c5ce7}.kpi.k-real{border-top-color:#00aa33}.kpi.k-rojo{border-top-color:#ef4444}
.kpi.k-div{border-top-color:#fdcb6e}.kpi.k-fx{border-top-color:#00b8d4}
</style></head><body>
<h1>📈 Informe de Inversiones</h1>
<p class="sub">${fecha} · ${invActivas.length} posiciones activas · ${invCerradas.length} cerradas</p>

<div class="grid">
  <div class="kpi k-inv"><div class="l">Valor Portafolio</div><div class="v purp">${fmt(totalVal)}</div></div>
  <div class="kpi k-inv"><div class="l">Capital Invertido</div><div class="v azul">${fmt(totalInv)}</div></div>
  <div class="kpi k-${ganNoReal>=0?"real":"rojo"}"><div class="l">P&G No Realizado</div><div class="v ${ganNoReal>=0?"verde":"rojo"}">${ganNoReal>=0?"+":""}${fmtN(ganNoReal)}</div></div>
  <div class="kpi k-${ganNoReal>=0?"real":"rojo"}"><div class="l">Rentabilidad</div><div class="v ${ganNoReal>=0?"verde":"rojo"}">${pctRend}%</div></div>
  <div class="kpi k-real"><div class="l">P&G Realizado</div><div class="v ${ganReal>=0?"verde":"rojo"}">${ganReal>=0?"+":""}${fmtN(ganReal)}</div></div>
  <div class="kpi k-div"><div class="l">Dividendos Brutos</div><div class="v gold">${fmt(divTot)}</div></div>
  <div class="kpi k-div"><div class="l">Dividendos a Caja</div><div class="v gold">${fmt(divCaja)}</div></div>
  <div class="kpi k-fx"><div class="l">P&G FX Divisas</div><div class="v ${ganFxDiv>=0?"verde":"rojo"}">${ganFxDiv>=0?"+":""}${fmtN(ganFxDiv)}</div></div>
  <div class="kpi k-real"><div class="l">Total P&G</div><div class="v ${(ganNoReal+ganReal+divCaja+ganFxDiv)>=0?"verde":"rojo"}">${fmtN(ganNoReal+ganReal+divCaja+ganFxDiv)}</div></div>
</div>

<section><h2>📊 Composición del Portafolio</h2>
<div class="grafGrid">
  <div class="grafCard"><p>Por Tipo de Activo</p><canvas id="cTipo"></canvas></div>
  <div class="grafCard"><p>Por Bróker</p><canvas id="cBroker"></canvas></div>
  <div class="grafCard"><p>Por Divisa</p><canvas id="cDivisa"></canvas></div>
  <div class="grafCard"><p>P&G Realizado por Mes</p><canvas id="cRendMes"></canvas></div>
</div></section>

${filasActivas?`<section><h2>🏦 Posiciones Activas</h2>
<div style="overflow-x:auto"><table>
<thead><tr><th>Activo</th><th>Divisa</th><th>Cant.</th><th>Precio</th><th>Valor COP</th><th>Invertido</th><th>P&G</th><th>Método</th></tr></thead>
<tbody>${filasActivas}</tbody>
<tfoot><tr style="font-weight:700;background:#f0faf0"><td colspan="4">TOTAL</td><td>${fmt(totalVal)}</td><td>${fmt(totalInv)}</td><td style="color:${ganNoReal>=0?"#006b1a":"#ef4444"}">${ganNoReal>=0?"+":""}${fmtN(ganNoReal)}</td><td></td></tr></tfoot>
</table></div></section>`:""}

${filasVentas?`<section><h2>📤 Historial de Ventas</h2>
<div style="overflow-x:auto"><table>
<thead><tr><th>Fecha</th><th>Activo</th><th>Cant.</th><th>Divisa</th><th>Neto COP</th><th>P&G Activo</th><th>P&G FX</th><th>Total P&G</th><th>Método</th></tr></thead>
<tbody>${filasVentas}</tbody></table></div></section>`:""}

${filasDivs?`<section><h2>💵 Dividendos e Intereses</h2>
<div style="overflow-x:auto"><table>
<thead><tr><th>Fecha</th><th>Activo</th><th>Tipo</th><th>Monto</th><th>COP equiv.</th><th>Destino</th><th>Impuesto</th></tr></thead>
<tbody>${filasDivs}</tbody>
<tfoot><tr style="font-weight:700;background:#f0faf0"><td colspan="4">TOTAL</td><td>${fmt(divTot)}</td><td></td><td></td></tr></tfoot>
</table></div></section>`:""}

${filasOps?`<section><h2>⚙️ Operaciones Corporativas</h2>
<div style="overflow-x:auto"><table>
<thead><tr><th>Fecha</th><th>Activo</th><th>Tipo</th><th>Detalle</th><th>Notas</th></tr></thead>
<tbody>${filasOps}</tbody></table></div></section>`:""}

<script>
const cl=${JSON.stringify(cl)};
const opts={responsive:true,plugins:{legend:{labels:{color:"#224422",font:{size:11}}}}};
new Chart(document.getElementById("cTipo"),{type:"doughnut",data:{labels:${JSON.stringify(Object.keys(tipoMap))},datasets:[{data:${JSON.stringify(Object.values(tipoMap))},backgroundColor:cl,borderWidth:2,borderColor:"#fff"}]},options:opts});
new Chart(document.getElementById("cBroker"),{type:"bar",data:{labels:${JSON.stringify(Object.keys(brokerMap))},datasets:[{label:"Valor",data:${JSON.stringify(Object.values(brokerMap))},backgroundColor:cl,borderRadius:8}]},options:{...opts,indexAxis:"y",scales:{x:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}}}});
new Chart(document.getElementById("cDivisa"),{type:"doughnut",data:{labels:${JSON.stringify(Object.keys(divisaMap))},datasets:[{data:${JSON.stringify(Object.values(divisaMap))},backgroundColor:cl,borderWidth:2,borderColor:"#fff"}]},options:opts});
new Chart(document.getElementById("cRendMes"),{type:"bar",data:{labels:${JSON.stringify(labM)},datasets:[{label:"P&G realizado",data:${JSON.stringify(renMesData)},backgroundColor:renMesData.map(v=>v>=0?"rgba(0,170,51,0.85)":"rgba(239,68,68,0.85)"),borderRadius:5}]},options:{...opts,scales:{x:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}}}});
<\/script></body></html>`;

  const w=window.open("","_blank");w.document.write(html);w.document.close();
}

/* ════════════════════════════════
   F.2 — INFORME DE DEUDAS
   ════════════════════════════════ */
function generarInformeDeudas(){
  if(!deudas.length){ alert("Sin deudas registradas."); return; }

  const totalOriginal = deudas.reduce((s,d)=>s+d.capital,0);
  const totalVivo     = deudas.reduce((s,d)=>s+saldoVivo(d),0);
  const totalPagado   = deudas.reduce((s,d)=>s+d.pagos.reduce((ss,p)=>ss+(p.capitalPagado||0),0),0);
  const totalInteres  = deudas.reduce((s,d)=>s+d.pagos.reduce((ss,p)=>ss+(p.interes||0),0),0);
  const totalCuotas   = deudas.reduce((s,d)=>s+d.pagos.reduce((ss,p)=>ss+p.cuota,0),0);
  const pctPagado     = totalOriginal>0?((totalPagado/totalOriginal)*100).toFixed(1):0;
  const cl            = ["#f97316","#ef4444","#a29bfe","#00b8d4","#fdcb6e","#22c55e","#6c5ce7","#fd9644"];

  // Series históricas de deuda total
  const mesesAll = [...new Set([...movimientos.map(m=>m.fecha.substring(0,7)),...deudas.flatMap(d=>d.pagos.map(p=>p.fecha?p.fecha.substring(0,7):""))].filter(Boolean))].sort();
  const labM = mesesAll.map(m=>{const[a,mo]=m.split("-");return new Date(Number(a),Number(mo)-1,1).toLocaleDateString("es-CO",{month:"short",year:"2-digit"});});

  // Deuda viva por mes
  let deuAcum = totalOriginal;
  const deuMes = mesesAll.map(mes=>{
    const cp=deudas.reduce((s,d)=>s+d.pagos.filter(p=>p.fecha&&p.fecha.startsWith(mes)).reduce((ss,p)=>ss+(p.capitalPagado||0),0),0);
    deuAcum=Math.max(0,deuAcum-cp); return deuAcum;
  });

  // Cuotas pagadas por mes
  const cuotasMes = mesesAll.map(mes=>deudas.reduce((s,d)=>s+d.pagos.filter(p=>p.fecha&&p.fecha.startsWith(mes)).reduce((ss,p)=>ss+p.cuota,0),0));
  const intMes    = mesesAll.map(mes=>deudas.reduce((s,d)=>s+d.pagos.filter(p=>p.fecha&&p.fecha.startsWith(mes)).reduce((ss,p)=>ss+(p.interes||0),0),0));
  const capMes    = mesesAll.map(mes=>deudas.reduce((s,d)=>s+d.pagos.filter(p=>p.fecha&&p.fecha.startsWith(mes)).reduce((ss,p)=>ss+(p.capitalPagado||0),0),0));

  // Sección por deuda individual
  const seccionesDeuda = deudas.map((d,di)=>{
    const sv=saldoVivo(d);
    const pagCap=d.pagos.reduce((s,p)=>s+(p.capitalPagado||0),0);
    const pagInt=d.pagos.reduce((s,p)=>s+(p.interes||0),0);
    const pct=d.capital>0?Math.min(100,(pagCap/d.capital)*100).toFixed(1):0;
    const tasaLbl=d.tipoTasa==="sin_tasa"?"Sin interés":d.tipoTasa==="variable"?"Variable":d.tasaFija+"% mensual";

    // Series de saldo vivo para esta deuda
    let saldoD=d.capital;
    const saldoMesD=mesesAll.map(mes=>{const cp=d.pagos.filter(p=>p.fecha&&p.fecha.startsWith(mes)).reduce((s,p)=>s+(p.capitalPagado||0),0);saldoD=Math.max(0,saldoD-cp);return saldoD;});

    const filasPagos=d.pagos.slice().sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)).map(p=>`<tr>
      <td>${p.fecha}</td>
      <td>${fmt(p.cuota)}</td>
      <td style="color:#22c55e">${fmt(p.capitalPagado||0)}</td>
      <td style="color:#ef4444">${fmt(p.interes||0)}</td>
      ${d.tipoTasa!=="sin_tasa"?`<td>${p.tasaAplicada||0}%</td>`:""}
      <td>${fmt(Math.max(0,d.capital-d.pagos.slice(0,d.pagos.indexOf(p)+1).reduce((s,pp)=>s+(pp.capitalPagado||0),0)))}</td>
    </tr>`).join("");

    return`<section style="border-left:4px solid ${cl[di%cl.length]}">
      <h2 style="color:${cl[di%cl.length]}">${d.nombre} <span style="font-size:11px;color:#9aaa9a;font-weight:400">${d.tipo} · ${tasaLbl}</span></h2>
      <div class="grid" style="margin-bottom:12px">
        <div class="kpi"><div class="l">Capital original</div><div class="v naranja">${fmt(d.capital)}</div></div>
        <div class="kpi"><div class="l">Saldo vivo</div><div class="v rojo">${fmt(sv)}</div></div>
        <div class="kpi"><div class="l">Capital pagado</div><div class="v verde">${fmt(pagCap)}</div></div>
        <div class="kpi"><div class="l">Interés pagado</div><div class="v rojo">${fmt(pagInt)}</div></div>
        <div class="kpi"><div class="l">% Pagado</div><div class="v ${parseFloat(pct)>=50?"verde":"naranja"}">${pct}%</div></div>
        ${d.cuotas?`<div class="kpi"><div class="l">Cuotas</div><div class="v azul">${d.pagos.length}/${d.cuotas}</div></div>`:""}
      </div>
      <div style="background:#f5f7f5;border-radius:999px;height:9px;margin:0 0 14px">
        <div style="width:${pct}%;background:linear-gradient(90deg,${cl[di%cl.length]},${cl[di%cl.length]}aa);height:9px;border-radius:999px;transition:width .4s"></div>
      </div>
      <div class="grafGrid" style="margin-bottom:14px">
        <div class="grafCard"><p>Evolución saldo vivo</p><canvas id="cDeuda_${d.id}"></canvas></div>
        <div class="grafCard"><p>Capital vs Interés pagado</p><canvas id="cDeudaPie_${d.id}"></canvas></div>
      </div>
      ${d.pagos.length?`<div style="overflow-x:auto"><table>
        <thead><tr><th>Fecha</th><th>Cuota</th><th>Capital</th><th>Interés</th>${d.tipoTasa!=="sin_tasa"?"<th>Tasa</th>":""}<th>Saldo restante</th></tr></thead>
        <tbody>${filasPagos}</tbody>
        <tfoot><tr style="font-weight:700;background:#f0faf0">
          <td>TOTAL</td><td>${fmt(d.pagos.reduce((s,p)=>s+p.cuota,0))}</td>
          <td style="color:#22c55e">${fmt(pagCap)}</td><td style="color:#ef4444">${fmt(pagInt)}</td>
          ${d.tipoTasa!=="sin_tasa"?"<td></td>":""}
          <td style="color:#ef4444;font-weight:700">${fmt(sv)}</td>
        </tr></tfoot>
      </table></div>`:`<p style="color:#9aaa9a;font-size:12px;text-align:center;padding:14px">Sin pagos registrados</p>`}
    </section>
    <script>
    (function(){
      const labD=${JSON.stringify(labM)},saldoD=${JSON.stringify(saldoMesD)};
      const canvLine=document.getElementById("cDeuda_${d.id}");
      if(canvLine) new Chart(canvLine,{type:"line",data:{labels:labD,datasets:[{label:"Saldo vivo",data:saldoD,borderColor:"${cl[di%cl.length]}",backgroundColor:"${cl[di%cl.length]}22",fill:true,tension:0.4,pointRadius:2,borderWidth:2}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#9aaa9a",font:{size:9}},grid:{color:"#e8ede8"}},y:{ticks:{color:"#9aaa9a",font:{size:9}},grid:{color:"#e8ede8"}}}}});
      const canvPie=document.getElementById("cDeudaPie_${d.id}");
      if(canvPie) new Chart(canvPie,{type:"doughnut",data:{labels:["Capital pagado","Interés pagado","Saldo vivo"],datasets:[{data:[${pagCap},${pagInt},${sv}],backgroundColor:["#22c55e","#ef4444","${cl[di%cl.length]}"],borderWidth:2,borderColor:"#fff"}]},options:{responsive:true,plugins:{legend:{labels:{color:"#224422",font:{size:10}}}}}});
    })();
    <\/script>`;
  }).join("");

  const fecha=new Date().toLocaleDateString("es-CO",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Informe de Deudas</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
<style>${_CSS_INFORME}
.kpi{border-top:4px solid transparent}.kpi.k-deu{border-top-color:#f97316}
</style></head><body>
<h1>💳 Informe de Deudas</h1>
<p class="sub">${fecha} · ${deudas.length} crédito(s) registrado(s)</p>

<div class="grid">
  <div class="kpi k-deu"><div class="l">Capital total</div><div class="v naranja">${fmt(totalOriginal)}</div></div>
  <div class="kpi k-deu"><div class="l">Saldo vivo</div><div class="v rojo">${fmt(totalVivo)}</div></div>
  <div class="kpi"><div class="l">Capital pagado</div><div class="v verde">${fmt(totalPagado)}</div></div>
  <div class="kpi"><div class="l">Interés pagado</div><div class="v rojo">${fmt(totalInteres)}</div></div>
  <div class="kpi"><div class="l">Total pagado</div><div class="v azul">${fmt(totalCuotas)}</div></div>
  <div class="kpi"><div class="l">% Pagado</div><div class="v ${parseFloat(pctPagado)>=50?"verde":"naranja"}">${pctPagado}%</div></div>
</div>

<section><h2>📈 Evolución General de Deudas</h2>
<div class="grafGrid">
  <div class="grafCard"><p>Saldo total vivo por mes</p><canvas id="cDeuTotal"></canvas></div>
  <div class="grafCard"><p>Pagos mensuales (capital vs interés)</p><canvas id="cDeuPagos"></canvas></div>
</div></section>

${seccionesDeuda}

<script>
new Chart(document.getElementById("cDeuTotal"),{type:"line",data:{labels:${JSON.stringify(labM)},datasets:[{label:"Deuda viva",data:${JSON.stringify(deuMes)},borderColor:"#f97316",backgroundColor:"rgba(249,115,22,0.12)",fill:true,tension:0.4,pointRadius:2,borderWidth:2}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#9aaa9a",font:{size:9}},grid:{color:"#e8ede8"}},y:{ticks:{color:"#9aaa9a",font:{size:9}},grid:{color:"#e8ede8"}}}}});
new Chart(document.getElementById("cDeuPagos"),{type:"bar",data:{labels:${JSON.stringify(labM)},datasets:[{label:"Capital",data:${JSON.stringify(capMes)},backgroundColor:"rgba(34,197,94,0.85)",borderRadius:4},{label:"Interés",data:${JSON.stringify(intMes)},backgroundColor:"rgba(239,68,68,0.85)",borderRadius:4}]},options:{responsive:true,plugins:{legend:{labels:{color:"#224422",font:{size:11}}}},scales:{x:{stacked:true,ticks:{color:"#9aaa9a",font:{size:9}},grid:{color:"#e8ede8"}},y:{stacked:true,ticks:{color:"#9aaa9a",font:{size:9}},grid:{color:"#e8ede8"}}}}});
<\/script></body></html>`;

  const w=window.open("","_blank");w.document.write(html);w.document.close();
}