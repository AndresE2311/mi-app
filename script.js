/* ════════════════════════════════════════════════════════════
   FINANZAS PERSONALES v4 — Modelo Unificado y Coherente
   ════════════════════════════════════════════════════════════

   MODELO DE DATOS:
   ─────────────────
   movimientos[]  → flujos de CAJA reales (lo que entra/sale del bolsillo)
     .tipo: "ingreso" | "gasto" | "traslado_inversion" | "pago_deuda_cuota"
     .valor: siempre positivo
     .afectaCaja: true/false  (calculado, no guardado)

   deudas[]  → pasivos. Cada deuda tiene su propio saldo vivo.
     .pagos[] → historial de cuotas pagadas (capital + interés)
     Al registrar un pago de deuda → se crea movimiento tipo "pago_deuda_cuota"
     que SÍ afecta la caja (sale dinero).

   inversiones[]  → activos.
     .origen: "caja" | "externo"
     Si origen=caja → al crear la inversión se crea movimiento "traslado_inversion"
     que SÍ afecta la caja (sale dinero hacia el activo).

   FÓRMULAS DASHBOARD:
   ─────────────────────
   Ingresos       = Σ movimientos tipo "ingreso"
   Gastos caja    = Σ movimientos tipo "gasto"
   Pagos deuda    = Σ movimientos tipo "pago_deuda_cuota"
   Traslados inv  = Σ movimientos tipo "traslado_inversion"
   Saldo caja     = Ingresos - Gastos - Pagos deuda - Traslados inv
   Valor inv      = Σ valorActual(inversiones)
   Deuda neta     = Σ saldoVivo(deudas)
   Patrimonio     = Saldo caja + Valor inv - Deuda neta

   ════════════════════════════════════════════════════════════ */

/* ── ESTADO GLOBAL ── */
let movimientos = JSON.parse(localStorage.getItem("movimientos")) || [];
let inversiones = JSON.parse(localStorage.getItem("inversiones")) || [];
let deudas      = JSON.parse(localStorage.getItem("deudas"))      || [];

// Migración: asignar IDs a registros sin ID
[movimientos, inversiones, deudas].forEach(arr =>
  arr.forEach((x, i) => { if (!x.id) x.id = Date.now() + i + Math.random(); })
);


const save = () => {
  localStorage.setItem("movimientos", JSON.stringify(movimientos));
  localStorage.setItem("inversiones", JSON.stringify(inversiones));
  localStorage.setItem("deudas",      JSON.stringify(deudas));
};

/* ── HELPERS ── */
const fmt  = n => "$" + Math.round(n < 0 ? 0 : n).toLocaleString("es-CO");
const fmtN = n => (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("es-CO");
const uid  = ()  => Date.now() + Math.random();
const hoy  = ()  => new Date().toISOString().split("T")[0];

/* ── CATEGORÍAS ── */
const categorias = {
  Entradas:    ["💼 Salario","💰 Bonificación","🕒 Horas Extra","💸 Comisiones","💻 Freelance","🏢 Negocio","📈 Ganancias","💵 Dividendos","🏦 Intereses","🏠 Arriendos","🎁 Regalos","💲 Reembolsos","💳 Devoluciones","🪙 Criptomonedas","🏆 Premios","📦 Otro"],
  Mercado:     ["🛒 Supermercado","🌿Productos Frescos","🥩Proteínas","🍬Snacks","🧴Aseo", "✨ Cuidado Personal", "Otro"],
  Restaurante: ["🛵 Domicilio","🍽️ Restaurante","☕ Cafetería","📦 Otro"],
  Transporte:  ["🚕 Uber","🚖 Taxi","🚌 Transporte Público","⛽ Gasolina","🛣️ Peajes","🅿️ Parqueadero","📦 Otro"],
  Vivienda:    ["🏠 Arriendo","🏢 Admin","💡 Luz","💧 Agua","🔥 Gas","🌐 Internet","🛋️ Hogar","📦 Otro"],
  Ocio:        ["🎬 Cine","✈️ Viajes","🥾 Senderismo","🏕️ Camping","🪂 Paracaidismo","🏍️ Motociclismo","🚶 Caminatas","🏋️ Deportes","💻 Tecnología","📚 Libros","🎸 Música","🍻 Bares","🍽️ Amigos","📺 Streaming","👕 Moda","📦 Otro"],
  Salud:       ["🏥 EPS","💊 Medicamentos","🦷 Dentista","🩺 Exámenes","🏋️ Gimnasio","🧘 Yoga","🏊 Natación","📦 Otro"],
  Educación:   ["📚 Libros","📝 Útiles","🎓 Cursos","🏫 Universidad","📦 Otro"],
  Emergencia:  ["💥 Accidente","🔧 Reparación","⚠️ Imprevisto","📦 Otro"],
  Servicios:   ["📱 Celular","📶 Internet Móvil","💳 Plan Pospago","🔄 Recargas","☁️ Almacenamiento","📦 Otro"],
  Otros:       ["📦Otro"]
};

function cargarSubcategorias() {
  const cat = document.getElementById("categoria").value;
  const sel = document.getElementById("subcategoria");
  sel.innerHTML = '<option value="">Subcategoría</option>';
  (categorias[cat] || []).forEach(s => sel.innerHTML += `<option>${s}</option>`);
}

/* ════════════════════════════════
   CÁLCULOS CENTRALES (una sola fuente de verdad)
   ════════════════════════════════ */
function calcularTotales() {
  let ingresos = 0, gastos = 0, pagosDeuda = 0, trasladosInv = 0;
  movimientos.forEach(m => {
    if      (m.tipo === "ingreso")            ingresos     += m.valor;
    else if (m.tipo === "gasto" && !m.esCredito) gastos   += m.valor; // crédito no resta caja
    else if (m.tipo === "gasto" &&  m.esCredito) {}                    // lo absorbe la deuda
    else if (m.tipo === "pago_deuda_cuota")   pagosDeuda  += m.valor;
    else if (m.tipo === "traslado_inversion") trasladosInv += m.valor;
  });
  const saldoCaja = ingresos - gastos - pagosDeuda - trasladosInv;
  return { ingresos, gastos, pagosDeuda, trasladosInv, saldoCaja };
}

/* Suma de TODOS los gastos (caja + crédito) para informes */
function calcularGastosTotales() {
  return movimientos.reduce((s, m) => m.tipo === "gasto" ? s + m.valor : s, 0);
}

function saldoVivo(d) {
  const pagado = (d.pagos || []).reduce((s, p) => s + (p.capitalPagado || 0), 0);
  return Math.max(0, d.capital - pagado);
}

function calcularDeudaNeta() {
  return deudas.reduce((s, d) => s + saldoVivo(d), 0);
}

function valorActualInversion(inv) {
  switch (inv.tipo) {
    case "Acción": case "ETF": case "Criptomoneda":
      return (inv.cantidad || 0) * (inv.precioActual || 0);
    case "CDT": case "Fondo": {
      const hoyMs  = Date.now();
      const inicio = inv.fechaInicio ? new Date(inv.fechaInicio).getTime() : hoyMs;
      const fin    = inv.tipo === "CDT" && inv.fechaVencimiento
                     ? new Date(inv.fechaVencimiento).getTime() : hoyMs;
      const diasTranscurridos = Math.max(0, Math.min((hoyMs - inicio), (fin - inicio)) / 86400000);
      return (inv.capital || 0) * Math.pow(1 + (inv.tasaEA || 0) / 100, diasTranscurridos / 365);
    }
    case "Finca Raíz": return inv.valorActual || inv.valorCompra || 0;
    case "Efectivo":   return inv.capital || 0;
    default:           return 0;
  }
}

function capitalInvertido(inv) {
  switch (inv.tipo) {
    case "Acción": case "ETF": case "Criptomoneda":
      return (inv.cantidad || 0) * (inv.precioCompra || 0);
    case "Finca Raíz": return inv.valorCompra || 0;
    default:           return inv.capital || 0;
  }
}

function calcularValorInversiones() {
  return inversiones.reduce((s, inv) => s + valorActualInversion(inv), 0);
}

/* ════════════════════════════════
   ACTUALIZAR DASHBOARD
   ════════════════════════════════ */
function actualizar() {
  const T         = calcularTotales();
  const valorInv  = calcularValorInversiones();
  const deudaNeta = calcularDeudaNeta();
  const patrimonio = T.saldoCaja + valorInv - deudaNeta;
  const tasaAhorro = T.ingresos > 0 ? ((T.saldoCaja / T.ingresos) * 100).toFixed(1) : 0;

  document.getElementById("saldo").textContent          = fmtN(T.saldoCaja);
  document.getElementById("ingresos").textContent       = fmt(T.ingresos);
  document.getElementById("gastos").textContent         = fmt(T.gastos);
  document.getElementById("ahorro").textContent         = fmtN(T.saldoCaja);
  document.getElementById("patrimonio").textContent     = fmtN(patrimonio);
  document.getElementById("valorInversiones").textContent = fmt(valorInv);
  document.getElementById("deudaNeta").textContent      = fmt(deudaNeta);
  document.getElementById("tasaAhorro").textContent     = tasaAhorro + "%";
  document.getElementById("fechaActual").textContent    =
    new Date().toLocaleDateString("es-CO", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  dibujarMovimientos();
  actualizarInversiones();
  dibujarDeudas();
}

/* ════════════════════════════════
   MOVIMIENTOS
   ════════════════════════════════ */
function actualizarTipoMovimiento() {
  const tipo = document.getElementById("tipo").value;
  document.getElementById("filaDeudaVinculo").style.display =
    tipo === "pago_deuda_cuota" ? "block" : "none";
}

function agregarMovimiento() {
  const desc  = document.getElementById("descripcion").value.trim();
  const valor = Number(document.getElementById("valor").value);
  const tipo  = document.getElementById("tipo").value;
  const fecha = document.getElementById("fecha").value || hoy();
  const cat   = document.getElementById("categoria").value;
  const sub   = document.getElementById("subcategoria").value;
  const meto  = document.getElementById("metodoPago").value;

  if (!desc || valor <= 0) { alert("Completa descripción y valor."); return; }

  // Si es pago de deuda manual, vincular la deuda
  let deudaId = null;
  if (tipo === "pago_deuda_cuota") {
    deudaId = document.getElementById("selDeudaVinculo").value || null;
    if (deudaId) {
      // Registrar el pago en la deuda vinculada (sin interés detallado en este flujo rápido)
      const d = deudas.find(d => String(d.id) === String(deudaId));
      if (d) {
        d.pagos.push({ fecha, cuota: valor, capitalPagado: valor, interes: 0, tasaAplicada: 0 });
      }
    }
  }

  // Si es un gasto pagado con tarjeta de crédito → crear deuda pendiente automática
  const metodosCred = ["Banco Bogotá Crédito", "Davivienda Crédito"];
  if (tipo === "gasto" && metodosCred.includes(meto)) {
    // Buscar si ya existe una deuda-tarjeta para este método; si no, crearla
    let deudaTarjeta = deudas.find(d =>
      d.tipo === "tarjeta_credito" && d.nombre === meto && d._esTarjetaAuto
    );
    if (!deudaTarjeta) {
      deudaTarjeta = {
        id: uid(), nombre: meto, tipo: "tarjeta_credito",
        capital: 0, fecha: hoy(), tipoTasa: "sin_tasa",
        tasaFija: 0, frecuencia: "mensual", cuotas: 0,
        pagos: [], _esTarjetaAuto: true,
        _cargos: []   // historial de cargos pendientes
      };
      deudas.push(deudaTarjeta);
    }
    // Agregar cargo pendiente
    const cargoId = uid();
    if (!deudaTarjeta._cargos) deudaTarjeta._cargos = [];
    deudaTarjeta._cargos.push({ id: cargoId, fecha, desc, valor, pagado: false, movId: null });
    // Recalcular capital de la deuda como suma de cargos pendientes
    deudaTarjeta.capital = deudaTarjeta._cargos.filter(c => !c.pagado).reduce((s, c) => s + c.valor, 0);
    // El gasto en tarjeta NO sale de caja → se marca como esCredito
    movimientos.push({ id: uid(), desc, descripcion: desc, valor, tipo: "gasto", fecha,
      categoria: cat, subcategoria: sub, metodoPago: meto, deudaId: null,
      esCredito: true, cargoId });
    save(); actualizar();
    document.getElementById("descripcion").value = "";
    document.getElementById("valor").value = "";
    return; // salir antes del push normal
  }

  movimientos.push({ id: uid(), desc, descripcion: desc, valor, tipo, fecha, categoria: cat, subcategoria: sub, metodoPago: meto, deudaId });
  save();
  actualizar();

  document.getElementById("descripcion").value = "";
  document.getElementById("valor").value = "";
}

/* ── Semana → key y label ── */
function semanaKey(fechaStr) {
  const d = new Date(fechaStr + "T12:00:00");
  const primer = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const num = Math.ceil((d.getDate() + primer) / 7);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-W${num}`;
}

function semanaLabel(key) {
  const [anio, mes, wp] = key.split("-");
  const w = parseInt(wp.replace("W",""));
  const primer = new Date(Number(anio), Number(mes)-1, 1).getDay();
  const dI = Math.max(1, (w-1)*7 - primer + 1);
  const dF = Math.min(new Date(Number(anio), Number(mes), 0).getDate(), dI + 6);
  const nl = d => new Date(Number(anio), Number(mes)-1, d).toLocaleDateString("es-CO",{ weekday:"short", day:"numeric" });
  return `Semana ${w}  (${nl(dI)} – ${nl(dF)})`;
}

function dibujarMovimientos() {
  const cont = document.getElementById("listaMovimientos");
  if (!cont) return;
  if (!movimientos.length) {
    cont.innerHTML = `<p style="color:#64748b;text-align:center;padding:30px">Sin movimientos registrados</p>`;
    return;
  }

  const ord = [...movimientos].sort((a,b) => {
    const df = new Date(b.fecha) - new Date(a.fecha);
    return df !== 0 ? df : b.id - a.id;
  });

  // agrupar mes → semana
  const porMes = {};
  ord.forEach(m => {
    const d   = new Date(m.fecha + "T12:00:00");
    const mK  = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const sK  = semanaKey(m.fecha);
    if (!porMes[mK]) porMes[mK] = { label: d.toLocaleDateString("es-CO",{month:"long",year:"numeric"}), semanas:{} };
    if (!porMes[mK].semanas[sK]) porMes[mK].semanas[sK] = [];
    porMes[mK].semanas[sK].push(m);
  });

  const colorTipo = { ingreso:"#22c55e", gasto:"#ef4444", pago_deuda_cuota:"#f59e0b", traslado_inversion:"#06b6d4" };
  const signoTipo = { ingreso:"+", gasto:"-", pago_deuda_cuota:"↓", traslado_inversion:"→" };

  let html = "";
  let mIdx = 0;
  Object.entries(porMes).forEach(([mK, mData]) => {
    mIdx++;
    const mId = `mes_${mIdx}`;
    let tI=0, tG=0;
    Object.values(mData.semanas).forEach(items => items.forEach(m => {
      if (m.tipo==="ingreso") tI+=m.valor;
      else if (m.tipo==="gasto") tG+=m.valor;
    }));

    let sIdx=0;
    let semHTML = Object.entries(mData.semanas).map(([sK, items]) => {
      sIdx++;
      const sId = `sem_${mIdx}_${sIdx}`;
      let sI=0, sG=0;
      items.forEach(m => { if(m.tipo==="ingreso") sI+=m.valor; else if(m.tipo==="gasto") sG+=m.valor; });

      const iHTML = items.map(m => {
        const col = colorTipo[m.tipo] || "#94a3b8";
        const sig = signoTipo[m.tipo] || "·";
        return `<div style="background:#1e293b;border-radius:13px;padding:13px;margin-bottom:8px;border-left:4px solid ${col}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <div style="flex:1;min-width:0">
              <p style="font-weight:700;font-size:14px;margin:0 0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.descripcion||m.desc||""}</p>
              <p style="font-size:11px;color:#94a3b8;margin:0">${m.fecha}${m.categoria?" · "+m.categoria:""}${m.metodoPago?" · "+m.metodoPago:""}</p>
              ${m.tipo==="pago_deuda_cuota"?`<p style="font-size:11px;color:#f59e0b;margin:2px 0 0">↓ Pago de deuda</p>`:""}
              ${m.tipo==="traslado_inversion"?`<p style="font-size:11px;color:#06b6d4;margin:2px 0 0">→ Traslado a inversión</p>`:""}
            </div>
            <span style="font-weight:800;color:${col};font-size:15px;white-space:nowrap">${sig}${fmt(m.valor)}</span>
          </div>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button onclick="abrirModalEditar('${m.id}')" style="background:#f59e0b;padding:6px 11px;font-size:12px;border-radius:9px">✏</button>
            <button onclick="eliminarMovimiento('${m.id}')" style="background:#dc2626;padding:6px 11px;font-size:12px;border-radius:9px">🗑</button>
          </div>
        </div>`;
      }).join("");

      return `<div class="semana" style="margin:5px 10px 8px">
        <div class="semanaHeader" onclick="toggleEl('${sId}','arr_${sId}')">
          <span style="font-size:12px">${semanaLabel(sK)}</span>
          <span style="font-size:11px;color:#94a3b8;white-space:nowrap">+${fmt(sI)} / -${fmt(sG)} <b id="arr_${sId}">▼</b></span>
        </div>
        <div id="${sId}" class="movimientosSemana">${iHTML}</div>
      </div>`;
    }).join("");

    html += `<div class="mes">
      <div class="mesHeader" onclick="toggleEl('${mId}','arr_${mId}')">
        <span>${mData.label.charAt(0).toUpperCase()+mData.label.slice(1)}</span>
        <span style="font-size:11px;color:#94a3b8;white-space:nowrap">+${fmt(tI)} / -${fmt(tG)} <b id="arr_${mId}">▼</b></span>
      </div>
      <div id="${mId}" style="display:none">${semHTML}</div>
    </div>`;
  });

  cont.innerHTML = html;
}

function toggleEl(id, arrId) {
  const el  = document.getElementById(id);
  const arr = document.getElementById(arrId);
  if (!el) return;
  const esMes = el.style.display !== undefined && !el.classList.contains("movimientosSemana");
  if (esMes) {
    const vis = el.style.display !== "none";
    el.style.display = vis ? "none" : "block";
    if (arr) arr.textContent = vis ? "▼" : "▲";
  } else {
    const vis = el.classList.contains("abierto");
    el.classList.toggle("abierto", !vis);
    if (arr) arr.textContent = vis ? "▼" : "▲";
  }
}

function eliminarMovimiento(id) {
  movimientos = movimientos.filter(m => String(m.id) !== String(id));
  save(); actualizar();
}

/* ── Modal Editar Movimiento ── */
function abrirModalEditar(id) {
  const m = movimientos.find(m => String(m.id) === String(id));
  if (!m) return;
  document.getElementById("editId").value          = String(m.id);
  document.getElementById("editDesc").value        = m.descripcion || m.desc || "";
  document.getElementById("editValor").value       = m.valor;
  document.getElementById("editTipoMov").value     = m.tipo;
  document.getElementById("editCategoria").value   = m.categoria || "";
  document.getElementById("editMetodo").value      = m.metodoPago || "";
  document.getElementById("editFecha").value       = m.fecha;
  document.getElementById("modalEditar").style.display = "flex";
}
function cerrarModalEditar() { document.getElementById("modalEditar").style.display = "none"; }
function guardarEdicion() {
  const id = document.getElementById("editId").value;
  const m  = movimientos.find(m => String(m.id) === String(id));
  if (!m) return;
  m.descripcion = document.getElementById("editDesc").value.trim();
  m.desc        = m.descripcion;
  m.valor       = Number(document.getElementById("editValor").value);
  m.tipo        = document.getElementById("editTipoMov").value;
  m.categoria   = document.getElementById("editCategoria").value;
  m.metodoPago  = document.getElementById("editMetodo").value;
  m.fecha       = document.getElementById("editFecha").value;
  save(); actualizar(); cerrarModalEditar();
}

/* ════════════════════════════════
   INVERSIONES
   ════════════════════════════════ */
function actualizarFormInversion() {
  const tipo = document.getElementById("tipoActivo").value;
  const todos = ["filaCanPrecio","filaCapital","filaTasaEA","filaFechaInicio",
                 "filaFechaVcto","filaValorCompra","filaValorActual"];
  todos.forEach(id => { const e=document.getElementById(id); if(e) e.style.display="none"; });

  if (["Acción","ETF","Criptomoneda"].includes(tipo)) {
    ["filaCanPrecio"].forEach(id => { const e=document.getElementById(id); if(e) e.style.display="block"; });
  } else if (tipo === "CDT") {
    ["filaCapital","filaTasaEA","filaFechaInicio","filaFechaVcto"].forEach(id => { const e=document.getElementById(id); if(e) e.style.display="block"; });
  } else if (tipo === "Fondo") {
    ["filaCapital","filaTasaEA","filaFechaInicio"].forEach(id => { const e=document.getElementById(id); if(e) e.style.display="block"; });
  } else if (tipo === "Finca Raíz") {
    ["filaValorCompra","filaValorActual"].forEach(id => { const e=document.getElementById(id); if(e) e.style.display="block"; });
  } else if (tipo === "Efectivo") {
    ["filaCapital"].forEach(id => { const e=document.getElementById(id); if(e) e.style.display="block"; });
  }
}

function agregarInversion() {
  const tipo   = document.getElementById("tipoActivo").value;
  const nombre = document.getElementById("invNombre").value.trim();
  if (!nombre) { alert("Escribe el nombre del activo."); return; }

  const g = id => { const e=document.getElementById(id); return e?Number(e.value)||0:0; };
  const gs= id => { const e=document.getElementById(id); return e?e.value:""; };
  const origen = document.getElementById("invOrigen").value;

  const inv = {
    id: uid(), tipo, nombre, origen,
    cantidad:         g("invCantidad"),
    precioCompra:     g("invPrecioCompra"),
    precioActual:     g("invPrecioActual"),
    capital:          g("invCapital"),
    tasaEA:           g("invTasaEA"),
    fechaInicio:      gs("invFechaInicio") || hoy(),
    fechaVencimiento: gs("invFechaVcto"),
    valorCompra:      g("invValorCompra"),
    valorActual:      g("invValorActual"),
  };

  // Si viene de caja → registrar traslado
  if (origen === "caja") {
    const monto = capitalInvertido(inv);
    if (monto > 0) {
      movimientos.push({
        id: uid(), descripcion: `Inversión: ${nombre}`, desc: `Inversión: ${nombre}`,
        valor: monto, tipo: "traslado_inversion",
        fecha: inv.fechaInicio, categoria: "Inversión", subcategoria: tipo,
        metodoPago: "Transferencia", deudaId: null
      });
    }
  }

  inversiones.push(inv);
  save(); actualizar();

  // Limpiar
  document.getElementById("invNombre").value = "";
  ["invCantidad","invPrecioCompra","invPrecioActual","invCapital","invTasaEA",
   "invFechaVcto","invValorCompra","invValorActual"].forEach(id => {
    const e=document.getElementById(id); if(e) e.value="";
  });
}

function editarPrecioInversion(id) {
  const inv = inversiones.find(i => String(i.id) === String(id));
  if (!inv) return;
  const tipo = inv.tipo;
  let campo, lbl;
  if (["Acción","ETF","Criptomoneda"].includes(tipo)) { campo="precioActual"; lbl="Precio actual"; }
  else if (["CDT","Fondo"].includes(tipo))             { campo="tasaEA";      lbl="Tasa EA %"; }
  else if (tipo==="Finca Raíz")                        { campo="valorActual"; lbl="Valor actual"; }
  else                                                 { campo="capital";     lbl="Capital"; }
  const v = prompt(`${lbl}:`, inv[campo]);
  if (v===null) return;
  inv[campo] = Number(v);
  save(); actualizar();
}

function eliminarInversion(id) {
  inversiones = inversiones.filter(i => String(i.id) !== String(id));
  save(); actualizar();
}

function actualizarInversiones() {
  const cont = document.getElementById("tablaInversiones");
  if (!cont) return;

  if (!inversiones.length) {
    cont.innerHTML = `<p style="color:#64748b;text-align:center;padding:30px">Sin inversiones registradas</p>`;
    return;
  }

  const grupos = {};
  inversiones.forEach(inv => {
    if (!grupos[inv.tipo]) grupos[inv.tipo] = [];
    grupos[inv.tipo].push(inv);
  });

  let html = "";
  Object.entries(grupos).forEach(([tipo, items]) => {
    let totAct=0, totInv=0;
    const filas = items.map(inv => {
      const va = valorActualInversion(inv);
      const ci = capitalInvertido(inv);
      const gan= va-ci;
      const pct= ci>0?(gan/ci*100).toFixed(2):"—";
      totAct+=va; totInv+=ci;

      let detalle="";
      if(["Acción","ETF","Criptomoneda"].includes(tipo))
        detalle=`${inv.cantidad} u. @ ${fmt(inv.precioActual)}`;
      else if(tipo==="CDT")
        detalle=`${inv.tasaEA}% EA · Vcto: ${inv.fechaVencimiento||"—"}`;
      else if(tipo==="Fondo") detalle=`${inv.tasaEA}% EA`;
      else if(tipo==="Finca Raíz") detalle=`Compra: ${fmt(inv.valorCompra)}`;
      else if(tipo==="Efectivo") detalle="Liquidez";

      return `<tr>
        <td><b style="font-size:13px">${inv.nombre}</b><br><span style="font-size:11px;color:#94a3b8">${detalle}</span>
            <br><span style="font-size:11px;color:${inv.origen==="caja"?"#06b6d4":"#94a3b8"}">${inv.origen==="caja"?"Desde caja":"Capital externo"}</span></td>
        <td>${fmt(ci)}</td>
        <td>${fmt(va)}</td>
        <td style="color:${gan>=0?"#22c55e":"#ef4444"}">${gan>=0?"+":""}${fmtN(gan)}<br><span style="font-size:11px">${pct!=="—"?pct+"%":"—"}</span></td>
        <td>
          <button onclick="editarPrecioInversion('${inv.id}')" style="background:#f59e0b;color:#fff;border:none;padding:5px 9px;border-radius:8px;cursor:pointer;font-size:12px;display:block;margin-bottom:4px">✏</button>
          <button onclick="eliminarInversion('${inv.id}')" style="background:#dc2626;color:#fff;border:none;padding:5px 9px;border-radius:8px;cursor:pointer;font-size:12px">🗑</button>
        </td>
      </tr>`;
    }).join("");

    const ganTot=totAct-totInv;
    html+=`<div style="margin-bottom:22px">
      <h3 style="color:#60a5fa;font-size:15px;font-weight:700;margin-bottom:8px">${tipo}
        <span style="font-size:12px;color:#94a3b8;font-weight:400"> — ${fmt(totAct)}
          <span style="color:${ganTot>=0?"#22c55e":"#ef4444"}">(${ganTot>=0?"+":""}${fmtN(ganTot)})</span>
        </span>
      </h3>
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Activo</th><th>Invertido</th><th>Valor Actual</th><th>Ganancia</th><th></th></tr></thead>
        <tbody>${filas}</tbody>
      </table></div>
    </div>`;
  });
  cont.innerHTML = html;
}

/* ════════════════════════════════
   DEUDAS — Sistema completo
   ════════════════════════════════ */
function abrirModalDeuda() {
  document.getElementById("modalDeuda").style.display = "flex";
  actualizarVisibilidadTasa();
}
function cerrarModalDeuda() { document.getElementById("modalDeuda").style.display = "none"; }

function actualizarVisibilidadTasa() {
  const tipo = document.getElementById("dTipoTasa").value;
  document.getElementById("filaTasaFija").style.display  = tipo==="fija"     ? "block":"none";
  document.getElementById("filaFrecuencia").style.display= tipo!=="sin_tasa" ? "block":"none";
  document.getElementById("filaCuotas").style.display    = tipo!=="sin_tasa" ? "block":"none";
}

function agregarDeuda() {
  const nombre   = document.getElementById("dNombre").value.trim();
  const tipo     = document.getElementById("dTipo").value;
  const capital  = Number(document.getElementById("dCapital").value);
  const fecha    = document.getElementById("dFecha").value || hoy();
  const tipoTasa = document.getElementById("dTipoTasa").value;
  const tasaFija = Number(document.getElementById("dTasaFija").value) || 0;
  const frecuencia= document.getElementById("dFrecuencia").value;
  const cuotas   = Number(document.getElementById("dCuotas").value) || 0;

  if (!nombre || capital<=0) { alert("Nombre y capital son requeridos."); return; }

  deudas.push({ id:uid(), nombre, tipo, capital, fecha, tipoTasa, tasaFija, frecuencia, cuotas, pagos:[] });
  save(); cerrarModalDeuda(); actualizar();

  // Limpiar
  ["dNombre","dCapital","dTasaFija","dCuotas"].forEach(id => { const e=document.getElementById(id); if(e) e.value=""; });
}

function eliminarDeuda(id) {
  if (!confirm("¿Eliminar esta deuda?")) return;
  deudas = deudas.filter(d => String(d.id)!==String(id));
  save(); actualizar();
}

function abrirPagoDeuda(id) {
  const d = deudas.find(d => String(d.id)===String(id));
  if (!d) return;
  document.getElementById("pagoDeudaId").value = String(id);
  document.getElementById("tituloPago").textContent = `Registrar pago — ${d.nombre}`;

  // Si tasa fija + cuotas, precalcular cuota sugerida
  const sv = saldoVivo(d);
  const cuotasRest = d.cuotas - d.pagos.length;
  if (d.tipoTasa==="fija" && d.tasaFija>0 && cuotasRest>0) {
    const tm = d.tasaFija/100;
    const cuotaCalc = sv*tm*Math.pow(1+tm,cuotasRest)/(Math.pow(1+tm,cuotasRest)-1);
    const interesCalc = sv*tm;
    document.getElementById("pagoCuota").value    = Math.round(cuotaCalc);
    document.getElementById("pagoCapital").value  = Math.round(cuotaCalc-interesCalc);
  } else {
    document.getElementById("pagoCuota").value   = "";
    document.getElementById("pagoCapital").value = "";
  }
  document.getElementById("pagoFecha").value = hoy();
  document.getElementById("pagoTasaVar").value = "";
  document.getElementById("filaPagoTasaVar").style.display = d.tipoTasa==="variable"?"block":"none";
  document.getElementById("modalPagoDeuda").style.display = "flex";
}
function cerrarPagoDeuda() { document.getElementById("modalPagoDeuda").style.display = "none"; }

function registrarPagoDeuda() {
  const id  = document.getElementById("pagoDeudaId").value;
  const d   = deudas.find(d => String(d.id)===String(id));
  if (!d) return;
  const fecha      = document.getElementById("pagoFecha").value || hoy();
  const cuota      = Number(document.getElementById("pagoCuota").value);
  const capPagado  = Number(document.getElementById("pagoCapital").value) || 0;
  const tasaVar    = Number(document.getElementById("pagoTasaVar").value) || 0;
  if (!fecha || cuota<=0) { alert("Fecha y valor del pago son requeridos."); return; }

  const interes = Math.max(0, cuota-capPagado);
  d.pagos.push({ fecha, cuota, capitalPagado: capPagado, interes, tasaAplicada: d.tipoTasa==="variable"?tasaVar:d.tasaFija });

  // Si es deuda de tarjeta auto, marcar cargos como pagados (de más antiguo a más nuevo)
  if (d._esTarjetaAuto && d._cargos) {
    let restante = capPagado > 0 ? capPagado : cuota;
    d._cargos.filter(c => !c.pagado).sort((a,b)=>new Date(a.fecha)-new Date(b.fecha)).forEach(c => {
      if (restante <= 0) return;
      if (restante >= c.valor) { c.pagado = true; restante -= c.valor; }
      else { c.valor -= restante; restante = 0; }
    });
    // Recalcular capital pendiente
    d.capital = d._cargos.filter(c => !c.pagado).reduce((s,c)=>s+c.valor,0);
  }

  // → El pago SÍ sale de caja
  movimientos.push({
    id: uid(), descripcion:`Pago deuda: ${d.nombre}`, desc:`Pago deuda: ${d.nombre}`,
    valor: cuota, tipo:"pago_deuda_cuota",
    fecha, categoria:"Deudas", subcategoria:d.nombre,
    metodoPago:"Débito", deudaId: d.id
  });

  save(); cerrarPagoDeuda(); actualizar();
}

function dibujarDeudas() {
  const cont = document.getElementById("listaDeudas");
  if (!cont) return;

  // Actualizar selector de deudas en movimientos
  const sel = document.getElementById("selDeudaVinculo");
  if (sel) {
    sel.innerHTML = '<option value="">— Selecciona deuda (opcional) —</option>';
    deudas.forEach(d => sel.innerHTML += `<option value="${d.id}">${d.nombre} (${fmt(saldoVivo(d))})</option>`);
  }

  if (!deudas.length) {
    cont.innerHTML = `<p style="color:#64748b;text-align:center;padding:20px">Sin deudas registradas</p>`;
    return;
  }

  cont.innerHTML = deudas.map(d => {
    const sv     = saldoVivo(d);
    const pagado = d.pagos.reduce((s,p)=>s+(p.capitalPagado||0),0);
    const pct    = d.capital>0?Math.min(100,(pagado/d.capital)*100).toFixed(1):0;
    const tasaLbl= d.tipoTasa==="sin_tasa"?"Sin interés":d.tipoTasa==="variable"?"Variable":d.tasaFija+"% mensual";

    // Tabla de amortización (pagos registrados)
    const filasAmort = d.pagos.slice().reverse().map(p=>`
      <tr>
        <td>${p.fecha}</td>
        <td>${fmt(p.cuota)}</td>
        <td style="color:#ef4444">${fmt(p.interes)}</td>
        <td style="color:#22c55e">${fmt(p.capitalPagado)}</td>
        ${d.tipoTasa!=="sin_tasa"?`<td style="color:#94a3b8">${p.tasaAplicada||0}%</td>`:""}
      </tr>`).join("");

    // Cargos pendientes (tarjeta crédito auto)
    const cargosHtml = (d._esTarjetaAuto && d._cargos && d._cargos.filter(c=>!c.pagado).length)
      ? `<div style="margin-top:10px">
          <p style="font-size:12px;color:#f97316;font-weight:700;margin:0 0 6px">⏳ Cargos pendientes de pago:</p>
          ${d._cargos.filter(c=>!c.pagado).sort((a,b)=>new Date(a.fecha)-new Date(b.fecha)).map(c=>`
            <div style="display:flex;justify-content:space-between;background:#0f172a;border-radius:9px;padding:8px 11px;margin-bottom:5px;font-size:12px">
              <span style="color:#e2e8f0">${c.fecha} · ${c.desc}</span>
              <span style="color:#f97316;font-weight:700">-${fmt(c.valor)}</span>
            </div>`).join("")}
        </div>` : "";

    return `<div style="background:#1e293b;border-radius:16px;padding:16px;margin-bottom:14px;border-left:4px solid #f97316">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
        <div>
          <p style="font-weight:700;font-size:15px;margin:0 0 2px">${d.nombre}${d._esTarjetaAuto?" 💳 Tarjeta":""}</p>
          <p style="font-size:12px;color:#94a3b8;margin:0">${d.tipo} · ${tasaLbl} · Inicio: ${d.fecha}${d.cuotas?` · ${d.cuotas} cuotas`:""}</p>
        </div>
        <div style="text-align:right">
          <p style="font-size:18px;font-weight:800;color:#f97316;margin:0">${fmt(sv)}</p>
          <p style="font-size:11px;color:#94a3b8;margin:0">Saldo pendiente</p>
        </div>
      </div>
      <div style="background:#0f172a;border-radius:999px;height:7px;margin:10px 0 4px">
        <div style="width:${pct}%;background:linear-gradient(90deg,#22c55e,#3b82f6);height:7px;border-radius:999px"></div>
      </div>
      <p style="font-size:12px;color:#94a3b8;margin:0 0 10px">${pct}% pagado</p>
      ${cargosHtml}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button onclick="abrirPagoDeuda('${d.id}')" style="background:#22c55e;padding:8px 14px;font-size:13px;border-radius:10px">+ Registrar Pago</button>
        <button onclick="eliminarDeuda('${d.id}')" style="background:#dc2626;padding:8px 14px;font-size:13px;border-radius:10px">🗑</button>
        ${d.pagos.length?`<button onclick="toggleTabla('ta_${d.id}')" style="background:#1e3a5f;padding:8px 14px;font-size:13px;border-radius:10px">📋 Historial</button>`:""}
      </div>
      ${d.pagos.length?`<div id="ta_${d.id}" style="display:none;margin-top:10px;overflow-x:auto">
        <table style="font-size:12px"><thead><tr><th>Fecha</th><th>Cuota</th><th>Interés</th><th>Capital</th>${d.tipoTasa!=="sin_tasa"?"<th>Tasa</th>":""}</tr></thead>
        <tbody>${filasAmort}</tbody></table></div>`:""}
    </div>`;
  }).join("");
}

function toggleTabla(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = el.style.display==="none"?"block":"none";
}

/* ════════════════════════════════
   ESTADÍSTICAS con selector de mes
   ════════════════════════════════ */
let mesFiltro = null; // null = todos
const charts = {};   // instancias Chart.js

function abrirPagina(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const p = document.getElementById(id);
  if (p) p.classList.add("active");
  if (id==="estadisticas") renderEstadisticas();
  if (id==="deudas")       dibujarDeudas();
}

function renderSelectorMeses() {
  const cont = document.getElementById("selectorMeses");
  if (!cont) return;
  const meses = [...new Set(movimientos.map(m=>m.fecha.substring(0,7)))].sort();
  let html = `<button onclick="filtrarMes(null)" class="btnMes ${mesFiltro===null?"activo":""}">Todo</button>`;
  meses.forEach(m => {
    const [a,mo] = m.split("-");
    const lbl = new Date(Number(a),Number(mo)-1,1).toLocaleDateString("es-CO",{month:"short",year:"2-digit"});
    html += `<button onclick="filtrarMes('${m}')" class="btnMes ${mesFiltro===m?"activo":""}">${lbl}</button>`;
  });
  cont.innerHTML = html;
}

function filtrarMes(mes) {
  mesFiltro = mes;
  renderEstadisticas();
}

function renderEstadisticas() {
  renderSelectorMeses();
  const movF = mesFiltro
    ? movimientos.filter(m=>m.fecha.startsWith(mesFiltro))
    : movimientos;

  /* ─ Totales del filtro ─ */
  let ingF=0, gasF=0, pagF=0;
  movF.forEach(m=>{
    if(m.tipo==="ingreso") ingF+=m.valor;
    else if(m.tipo==="gasto") gasF+=m.valor;
    else if(m.tipo==="pago_deuda_cuota") pagF+=m.valor;
  });

  // Actualizar KPIs estadísticas
  const setKpi = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
  setKpi("statIngresos", fmt(ingF));
  setKpi("statGastos",   fmt(gasF));
  setKpi("statPagos",    fmt(pagF));
  setKpi("statBalance",  fmtN(ingF-gasF-pagF));

  /* ─ 1. Ingresos vs Gastos acumulado (doughnut) ─ */
  const deudaNeta = calcularDeudaNeta();
  dibujarChart("graficaPrincipal","doughnut",
    {labels:["Ingresos","Gastos","Deuda Neta"],
     datasets:[{data:[ingF,gasF,deudaNeta],backgroundColor:["#22c55e","#ef4444","#f97316"]}]});

  /* ─ 2. Ingresos vs Gastos mensual (barras) ─ */
  const mesesAll = [...new Set(movimientos.map(m=>m.fecha.substring(0,7)))].sort();
  const ingMes=[],gasMes=[],deudaMes=[];
  let saldoVivAcum = deudas.reduce((s,d)=>s+d.capital,0); // aproximación inicial

  mesesAll.forEach(mes=>{
    let i=0,g=0;
    movimientos.filter(m=>m.fecha.startsWith(mes)).forEach(m=>{
      if(m.tipo==="ingreso") i+=m.valor;
      else if(m.tipo==="gasto") g+=m.valor;
    });
    // Deuda viva al final de cada mes (sumamos pagos de capital de ese mes)
    const capPagMes = deudas.reduce((s,d)=>{
      return s + d.pagos.filter(p=>p.fecha&&p.fecha.startsWith(mes)).reduce((ss,p)=>ss+(p.capitalPagado||0),0);
    },0);
    saldoVivAcum = Math.max(0, saldoVivAcum - capPagMes);
    ingMes.push(i); gasMes.push(g); deudaMes.push(saldoVivAcum);
  });

  const labMeses = mesesAll.map(m=>{
    const [a,mo]=m.split("-");
    return new Date(Number(a),Number(mo)-1,1).toLocaleDateString("es-CO",{month:"short",year:"2-digit"});
  });

  dibujarChart("graficaMensual","bar",{
    labels:labMeses,
    datasets:[
      {label:"Ingresos",data:ingMes,backgroundColor:"#22c55e",borderRadius:5},
      {label:"Gastos",  data:gasMes,backgroundColor:"#ef4444",borderRadius:5}
    ]
  },{scales:{x:{ticks:{color:"#94a3b8"},grid:{color:"#1e3a5f"}},y:{ticks:{color:"#94a3b8"},grid:{color:"#1e3a5f"}}}});

  /* ─ 3. Evolución deuda mensual (línea) ─ */
  dibujarChart("graficaDeuda","line",{
    labels:labMeses,
    datasets:[{label:"Deuda viva",data:deudaMes,borderColor:"#f97316",backgroundColor:"rgba(249,115,22,0.15)",fill:true,tension:0.3,pointBackgroundColor:"#f97316"}]
  },{scales:{x:{ticks:{color:"#94a3b8"},grid:{color:"#1e3a5f"}},y:{ticks:{color:"#94a3b8"},grid:{color:"#1e3a5f"}}}});

  /* ─ 4. Gastos por categoría ─ */
  const catMap={};
  movF.forEach(m=>{ if(m.tipo==="gasto") catMap[m.categoria]=(catMap[m.categoria]||0)+m.valor; });
  const colores=["#3b82f6","#22c55e","#ef4444","#f59e0b","#8b5cf6","#06b6d4","#f97316","#ec4899"];
  dibujarChart("graficaCategorias","pie",{
    labels:Object.keys(catMap),
    datasets:[{data:Object.values(catMap),backgroundColor:colores}]
  });

  /* ─ 5. Gastos categoría mensual (barras apiladas) ─ */
  const catsUsadas=[...new Set(movimientos.filter(m=>m.tipo==="gasto").map(m=>m.categoria))];
  dibujarChart("graficaCategoriasMensual","bar",{
    labels:labMeses,
    datasets:catsUsadas.map((cat,i)=>({
      label:cat,
      data:mesesAll.map(mes=>movimientos.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="gasto"&&m.categoria===cat).reduce((s,m)=>s+m.valor,0)),
      backgroundColor:colores[i%colores.length],borderRadius:4
    }))
  },{scales:{x:{stacked:true,ticks:{color:"#94a3b8"},grid:{color:"#1e3a5f"}},y:{stacked:true,ticks:{color:"#94a3b8"},grid:{color:"#1e3a5f"}}}});

  /* ─ 6. Métodos de pago ─ */
  const metMap={};
  movF.forEach(m=>{ if(m.tipo==="gasto") metMap[m.metodoPago]=(metMap[m.metodoPago]||0)+m.valor; });
  dibujarChart("graficaMetodos","bar",{
    labels:Object.keys(metMap),
    datasets:[{label:"Gastos",data:Object.values(metMap),backgroundColor:"#3b82f6",borderRadius:8}]
  },{scales:{x:{ticks:{color:"#94a3b8"},grid:{color:"#1e3a5f"}},y:{ticks:{color:"#94a3b8"},grid:{color:"#1e3a5f"}}}});

  /* ─ 7. Inversiones ─ */
  const invMap={};
  inversiones.forEach(i=>{ invMap[i.nombre]=valorActualInversion(i); });
  dibujarChart("graficaInversiones","doughnut",{
    labels:Object.keys(invMap),
    datasets:[{data:Object.values(invMap),backgroundColor:colores}]
  });

  /* ─ 8. Fuentes de ingresos (subcategoría/descripción) ─ */
  const fuenteMap={};
  movF.forEach(m=>{
    if(m.tipo==="ingreso"){
      const lbl = m.subcategoria && m.subcategoria !== "Subcategoría" ? m.subcategoria
                  : (m.categoria && m.categoria !== "Entradas" && m.categoria ? m.categoria : (m.descripcion||m.desc||"Otro"));
      fuenteMap[lbl] = (fuenteMap[lbl]||0) + m.valor;
    }
  });
  if(Object.keys(fuenteMap).length){
    const totalIng = Object.values(fuenteMap).reduce((s,v)=>s+v,0);
    dibujarChart("graficaFuentesIngresos","doughnut",{
      labels: Object.keys(fuenteMap).map(k=>`${k} (${totalIng>0?((fuenteMap[k]/totalIng)*100).toFixed(1):0}%)`),
      datasets:[{data:Object.values(fuenteMap),backgroundColor:colores}]
    });
  }
}

function dibujarChart(canvasId, tipo, data, extraOpts={}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (charts[canvasId]) { charts[canvasId].destroy(); }
  charts[canvasId] = new Chart(canvas, {
    type: tipo,
    data,
    options: {
      responsive: true,
      plugins: { legend:{ labels:{ color:"#e2e8f0", font:{size:11} } } },
      ...extraOpts
    }
  });
}

/* ════════════════════════════════
   INFORME MENSUAL con gráficas
   ════════════════════════════════ */
function generarInformeMensual() {
  const mesesDisp = [...new Set(movimientos.map(m=>m.fecha.substring(0,7)))].sort();
  if (!mesesDisp.length) { alert("Sin movimientos."); return; }
  const mesEl = prompt("Mes (ej: 2026-01):\n\n"+mesesDisp.join(", "), mesesDisp[mesesDisp.length-1]);
  if (!mesEl) return;
  const movMes = movimientos.filter(m=>m.fecha.startsWith(mesEl)).sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
  if (!movMes.length) { alert("Sin movimientos en ese mes."); return; }

  let ingM=0,gasM=0,pagM=0;
  const catMap={},metMap={},fuentesM={};
  movMes.forEach(m=>{
    if(m.tipo==="ingreso"){
      ingM+=m.valor;
      const lbl=m.subcategoria&&m.subcategoria!=="Subcategoría"?m.subcategoria:(m.categoria&&m.categoria!=="Entradas"?m.categoria:(m.descripcion||m.desc||"Otro"));
      fuentesM[lbl]=(fuentesM[lbl]||0)+m.valor;
    }
    else if(m.tipo==="gasto"){ gasM+=m.valor; catMap[m.categoria]=(catMap[m.categoria]||0)+m.valor; metMap[m.metodoPago]=(metMap[m.metodoPago]||0)+m.valor; }
    else if(m.tipo==="pago_deuda_cuota") pagM+=m.valor;
  });

  const [a,mo]=mesEl.split("-");
  const nomMes=new Date(Number(a),Number(mo)-1,1).toLocaleDateString("es-CO",{month:"long",year:"numeric"});

  const filas=movMes.map(m=>{
    const col=m.tipo==="ingreso"?"#22c55e":m.tipo==="pago_deuda_cuota"?"#f59e0b":"#ef4444";
    const sig=m.tipo==="ingreso"?"+":m.tipo==="pago_deuda_cuota"?"↓":"-";
    return `<tr><td>${m.fecha}</td><td>${m.descripcion||m.desc}</td><td>${m.categoria||"—"}</td><td>${m.metodoPago||""}</td><td style="color:${col};font-weight:700">${sig}$${m.valor.toLocaleString("es-CO")}</td></tr>`;
  }).join("");

  // Datos para gráficas embebidas
  const mesesAll=[...new Set(movimientos.map(m=>m.fecha.substring(0,7)))].sort();
  const ingAll=[],gasAll=[];
  mesesAll.forEach(mes=>{let i=0,g=0;movimientos.filter(m=>m.fecha.startsWith(mes)).forEach(m=>{if(m.tipo==="ingreso")i+=m.valor;else if(m.tipo==="gasto")g+=m.valor;});ingAll.push(i);gasAll.push(g);});
  const labAll=mesesAll.map(m=>{const[a2,mo2]=m.split("-");return new Date(Number(a2),Number(mo2)-1,1).toLocaleDateString("es-CO",{month:"short",year:"2-digit"});});

  // Barras horizontales de porcentaje para categorías
  const barrasCatMen = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).map(([cat,val])=>{
    const pct = gasM>0?((val/gasM)*100).toFixed(1):0;
    const colores=["#3b82f6","#22c55e","#ef4444","#f59e0b","#8b5cf6","#06b6d4","#f97316","#ec4899"];
    const i = Object.keys(catMap).indexOf(cat) % colores.length;
    return `<div style="margin-bottom:9px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
        <span style="color:#e2e8f0">${cat}</span>
        <span style="color:${colores[i]};font-weight:700">$${val.toLocaleString("es-CO")} (${pct}%)</span>
      </div>
      <div style="background:#0f172a;border-radius:999px;height:8px">
        <div style="width:${pct}%;background:${colores[i]};height:8px;border-radius:999px;transition:.3s"></div>
      </div></div>`;
  }).join("");

  // Barras métodos pago
  const totalMet = Object.values(metMap).reduce((s,v)=>s+v,0);
  const barrasMetMen = Object.entries(metMap).sort((a,b)=>b[1]-a[1]).map(([met,val],i)=>{
    const pct = totalMet>0?((val/totalMet)*100).toFixed(1):0;
    const cols=["#3b82f6","#a78bfa","#06b6d4","#f59e0b","#ec4899"];
    return `<div style="margin-bottom:9px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
        <span style="color:#e2e8f0">${met}</span>
        <span style="color:${cols[i%cols.length]};font-weight:700">$${val.toLocaleString("es-CO")} (${pct}%)</span>
      </div>
      <div style="background:#0f172a;border-radius:999px;height:8px">
        <div style="width:${pct}%;background:${cols[i%cols.length]};height:8px;border-radius:999px"></div>
      </div></div>`;
  }).join("");

  const html=`<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Informe ${nomMes}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#0f172a;color:#e2e8f0;padding:18px}
h1{font-size:20px;font-weight:800;background:linear-gradient(90deg,#60a5fa,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:3px}
.sub{color:#94a3b8;font-size:12px;margin-bottom:16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:9px;margin-bottom:16px}
.kpi{background:#1e293b;border-radius:11px;padding:13px;text-align:center}.kpi .l{font-size:10px;color:#94a3b8;margin-bottom:3px}.kpi .v{font-size:17px;font-weight:700}
.verde{color:#22c55e}.rojo{color:#ef4444}.azul{color:#60a5fa}.ambar{color:#f59e0b}.purp{color:#a78bfa}
section{margin-bottom:16px;background:#1e293b;padding:13px;border-radius:13px}
section h2{font-size:13px;font-weight:700;color:#60a5fa;margin-bottom:11px;padding-bottom:6px;border-bottom:1px solid #0f172a}
table{width:100%;border-collapse:collapse;font-size:11px}th{background:#0f172a;padding:6px 8px;text-align:left;color:#94a3b8;font-weight:600}td{padding:6px 8px;border-bottom:1px solid #0f172a}
.grafGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.grafGrid canvas{max-height:200px}
@media(max-width:500px){.grafGrid{grid-template-columns:1fr}}</style></head><body>
<h1>📊 Informe Mensual</h1><p class="sub">${nomMes.charAt(0).toUpperCase()+nomMes.slice(1)}</p>
<div class="grid">
  <div class="kpi"><div class="l">💵 Ingresos</div><div class="v verde">$${ingM.toLocaleString("es-CO")}</div></div>
  <div class="kpi"><div class="l">💸 Gastos</div><div class="v rojo">$${gasM.toLocaleString("es-CO")}</div></div>
  <div class="kpi"><div class="l">🏦 Saldo</div><div class="v azul">$${(ingM-gasM-pagM).toLocaleString("es-CO")}</div></div>
  <div class="kpi"><div class="l">💳 Pagos deuda</div><div class="v ambar">$${pagM.toLocaleString("es-CO")}</div></div>
  <div class="kpi"><div class="l">📈 Tasa ahorro</div><div class="v purp">${ingM>0?((((ingM-gasM-pagM)/ingM)*100).toFixed(1)):0}%</div></div>
</div>
<section><h2>📊 Gráficas del mes</h2>
<div class="grafGrid">
  <div><p style="text-align:center;font-size:10px;color:#94a3b8;margin-bottom:5px">Ingresos vs Gastos histórico</p><canvas id="cMen"></canvas></div>
  <div><p style="text-align:center;font-size:10px;color:#94a3b8;margin-bottom:5px">Distribución de Gastos</p><canvas id="cCat"></canvas></div>
  <div><p style="text-align:center;font-size:10px;color:#94a3b8;margin-bottom:5px">Métodos de Pago</p><canvas id="cMet"></canvas></div>
  <div><p style="text-align:center;font-size:10px;color:#94a3b8;margin-bottom:5px">Fuentes de Ingreso</p><canvas id="cFuentes"></canvas></div>
</div></section>
<section><h2>📊 % Gasto por Categoría</h2>${barrasCatMen}</section>
<section><h2>💳 % por Método de Pago</h2>${barrasMetMen}</section>
<section><h2>Movimientos del mes</h2>
<table><thead><tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Método</th><th>Valor</th></tr></thead>
<tbody>${filas}</tbody></table></section>
<script>
const cl=["#3b82f6","#22c55e","#ef4444","#f59e0b","#8b5cf6","#06b6d4","#f97316","#ec4899"];
const opts={responsive:true,plugins:{legend:{labels:{color:"#e2e8f0",font:{size:10}}}}};
new Chart(document.getElementById("cMen"),{type:"bar",data:{labels:${JSON.stringify(labAll)},datasets:[{label:"Ingresos",data:${JSON.stringify(ingAll)},backgroundColor:"#22c55e",borderRadius:4},{label:"Gastos",data:${JSON.stringify(gasAll)},backgroundColor:"#ef4444",borderRadius:4}]},options:{...opts,scales:{x:{ticks:{color:"#94a3b8"},grid:{color:"#1e3a5f"}},y:{ticks:{color:"#94a3b8"},grid:{color:"#1e3a5f"}}}}});
new Chart(document.getElementById("cCat"),{type:"doughnut",data:{labels:${JSON.stringify(Object.keys(catMap))},datasets:[{data:${JSON.stringify(Object.values(catMap))},backgroundColor:cl}]},options:opts});
new Chart(document.getElementById("cMet"),{type:"bar",data:{labels:${JSON.stringify(Object.keys(metMap))},datasets:[{label:"Gastos",data:${JSON.stringify(Object.values(metMap))},backgroundColor:"#3b82f6",borderRadius:4}]},options:{...opts,scales:{x:{ticks:{color:"#94a3b8"},grid:{color:"#1e3a5f"}},y:{ticks:{color:"#94a3b8"},grid:{color:"#1e3a5f"}}}}});
new Chart(document.getElementById("cFuentes"),{type:"doughnut",data:{labels:${JSON.stringify(Object.keys(fuentesM))},datasets:[{data:${JSON.stringify(Object.values(fuentesM))},backgroundColor:cl}]},options:opts});
<\/script></body></html>`;

  const w=window.open("","_blank"); w.document.write(html); w.document.close();
}

/* ════════════════════════════════
   ESTADO GENERAL
   ════════════════════════════════ */
function generarEstadoGeneral() {
  const T=calcularTotales(), valorInv=calcularValorInversiones(), dn=calcularDeudaNeta();
  const pat=T.saldoCaja+valorInv-dn;
  const fecha=new Date().toLocaleDateString("es-CO",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const colores=["#3b82f6","#22c55e","#ef4444","#f59e0b","#8b5cf6","#06b6d4","#f97316","#ec4899"];

  // ── Gráficas data ──
  const mesesAll=[...new Set(movimientos.map(m=>m.fecha.substring(0,7)))].sort();
  const ingAll=[],gasAll=[],deudaAll=[];
  let saldoAcum=deudas.reduce((s,d)=>s+d.capital,0);
  mesesAll.forEach(mes=>{
    let i=0,g=0;
    movimientos.filter(m=>m.fecha.startsWith(mes)).forEach(m=>{
      if(m.tipo==="ingreso") i+=m.valor;
      else if(m.tipo==="gasto"&&!m.esCredito) g+=m.valor;
    });
    const capPag=deudas.reduce((s,d)=>s+d.pagos.filter(p=>p.fecha&&p.fecha.startsWith(mes)).reduce((ss,p)=>ss+(p.capitalPagado||0),0),0);
    saldoAcum=Math.max(0,saldoAcum-capPag);
    ingAll.push(i);gasAll.push(g);deudaAll.push(saldoAcum);
  });
  const labAll=mesesAll.map(m=>{const[a,mo]=m.split("-");return new Date(Number(a),Number(mo)-1,1).toLocaleDateString("es-CO",{month:"short",year:"2-digit"});});

  const catMap={},metMap={},fuentesAll={};
  movimientos.forEach(m=>{
    if(m.tipo==="gasto"){catMap[m.categoria]=(catMap[m.categoria]||0)+m.valor;metMap[m.metodoPago]=(metMap[m.metodoPago]||0)+m.valor;}
    if(m.tipo==="ingreso"){const lbl=m.subcategoria&&m.subcategoria!=="Subcategoría"?m.subcategoria:(m.categoria&&m.categoria!=="Entradas"?m.categoria:(m.descripcion||m.desc||"Otro"));fuentesAll[lbl]=(fuentesAll[lbl]||0)+m.valor;}
  });
  const invMap={};inversiones.forEach(i=>{invMap[i.nombre]=valorActualInversion(i);});

  // ── Barras horizontales categorías ──
  const gasTotal=Object.values(catMap).reduce((s,v)=>s+v,0);
  const barrasCat=Object.entries(catMap).sort((a,b)=>b[1]-a[1]).map(([cat,val],i)=>{
    const pct=gasTotal>0?((val/gasTotal)*100).toFixed(1):0;
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
        <span>${cat}</span><span style="color:${colores[i%colores.length]};font-weight:700">$${val.toLocaleString("es-CO")} (${pct}%)</span>
      </div>
      <div style="background:#0f172a;border-radius:999px;height:8px">
        <div style="width:${pct}%;background:${colores[i%colores.length]};height:8px;border-radius:999px"></div>
      </div></div>`;
  }).join("");

  // ── Barras métodos pago ──
  const metTotal=Object.values(metMap).reduce((s,v)=>s+v,0);
  const barrasMet=Object.entries(metMap).sort((a,b)=>b[1]-a[1]).map(([met,val],i)=>{
    const pct=metTotal>0?((val/metTotal)*100).toFixed(1):0;
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
        <span>${met}</span><span style="color:${colores[i%colores.length]};font-weight:700">$${val.toLocaleString("es-CO")} (${pct}%)</span>
      </div>
      <div style="background:#0f172a;border-radius:999px;height:8px">
        <div style="width:${pct}%;background:${colores[i%colores.length]};height:8px;border-radius:999px"></div>
      </div></div>`;
  }).join("");

  // ── Tablas inversiones ──
  const filasInv=inversiones.map(inv=>{
    const va=valorActualInversion(inv),ci=capitalInvertido(inv),gan=va-ci;
    return `<tr><td>${inv.tipo}</td><td>${inv.nombre}</td><td>$${ci.toLocaleString("es-CO")}</td><td>$${va.toLocaleString("es-CO")}</td><td style="color:${gan>=0?"#22c55e":"#ef4444"}">${gan>=0?"+":""}$${Math.abs(gan).toLocaleString("es-CO")}</td></tr>`;
  }).join("");

  // ── Tablas deudas + amortización ──
  const seccionesDeuda=deudas.map(d=>{
    const sv=saldoVivo(d);
    const pagado=d.pagos.reduce((s,p)=>s+(p.capitalPagado||0),0);
    const pct=d.capital>0?Math.min(100,(pagado/d.capital)*100).toFixed(1):0;
    const tasaLbl=d.tipoTasa==="sin_tasa"?"Sin interés":d.tipoTasa==="variable"?"Variable":d.tasaFija+"% mensual";
    const filasAmort=d.pagos.slice().reverse().map(p=>`<tr><td>${p.fecha}</td><td>$${p.cuota.toLocaleString("es-CO")}</td><td style="color:#ef4444">$${p.interes.toLocaleString("es-CO")}</td><td style="color:#22c55e">$${(p.capitalPagado||0).toLocaleString("es-CO")}</td></tr>`).join("");
    // Cargos pendientes tarjeta
    const cargosHtml=(d._esTarjetaAuto&&d._cargos&&d._cargos.filter(c=>!c.pagado).length)?
      `<p style="font-size:12px;color:#f97316;margin:8px 0 4px;font-weight:700">⏳ Cargos pendientes:</p>
       ${d._cargos.filter(c=>!c.pagado).map(c=>`<div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;border-bottom:1px solid #0f172a"><span>${c.fecha} · ${c.desc}</span><span style="color:#f97316">-$${c.valor.toLocaleString("es-CO")}</span></div>`).join("")}`:"";
    return `<div style="margin-bottom:16px;border-left:3px solid #f97316;padding-left:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div><p style="font-weight:700;font-size:13px;margin:0">${d.nombre}${d._esTarjetaAuto?" 💳":""}</p>
        <p style="font-size:11px;color:#94a3b8;margin:0">${tasaLbl} · ${d.cuotas?d.cuotas+" cuotas":""}</p></div>
        <div style="text-align:right"><p style="font-size:15px;font-weight:800;color:#f97316;margin:0">$${sv.toLocaleString("es-CO")}</p>
        <p style="font-size:10px;color:#94a3b8;margin:0">${pct}% pagado</p></div>
      </div>
      <div style="background:#0f172a;border-radius:999px;height:6px;margin-bottom:8px">
        <div style="width:${pct}%;background:linear-gradient(90deg,#22c55e,#3b82f6);height:6px;border-radius:999px"></div>
      </div>
      ${cargosHtml}
      ${d.pagos.length?`<p style="font-size:11px;color:#94a3b8;margin:8px 0 4px;font-weight:600">Tabla de amortización:</p>
      <table style="font-size:11px"><thead><tr><th>Fecha</th><th>Cuota</th><th>Interés</th><th>Capital</th></tr></thead><tbody>${filasAmort}</tbody></table>`:""}
    </div>`;
  }).join("");

  const html=`<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Estado General</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#0f172a;color:#e2e8f0;padding:18px}
h1{font-size:20px;font-weight:800;background:linear-gradient(90deg,#60a5fa,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:3px}
.sub{color:#94a3b8;font-size:12px;margin-bottom:16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:9px;margin-bottom:16px}
.kpi{background:#1e293b;border-radius:11px;padding:13px;text-align:center}.kpi .l{font-size:10px;color:#94a3b8;margin-bottom:3px}.kpi .v{font-size:17px;font-weight:700}
.verde{color:#22c55e}.rojo{color:#ef4444}.azul{color:#60a5fa}.purp{color:#a78bfa}.ambar{color:#f59e0b}
section{margin-bottom:16px;background:#1e293b;padding:13px;border-radius:13px}
section h2{font-size:13px;font-weight:700;color:#60a5fa;margin-bottom:11px;padding-bottom:6px;border-bottom:1px solid #0f172a}
table{width:100%;border-collapse:collapse;font-size:11px}th{background:#0f172a;padding:6px 8px;text-align:left;color:#94a3b8;font-weight:600}td{padding:6px 8px;border-bottom:1px solid #0f172a}
.grafGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}.grafGrid canvas{max-height:200px}
@media(max-width:500px){.grafGrid{grid-template-columns:1fr}}</style></head><body>
<h1>💎 Estado General</h1><p class="sub">${fecha}</p>
<div class="grid">
  <div class="kpi"><div class="l">💵 Ingresos totales</div><div class="v verde">$${T.ingresos.toLocaleString("es-CO")}</div></div>
  <div class="kpi"><div class="l">💸 Gastos caja</div><div class="v rojo">$${T.gastos.toLocaleString("es-CO")}</div></div>
  <div class="kpi"><div class="l">🏦 Saldo caja</div><div class="v azul">$${T.saldoCaja.toLocaleString("es-CO")}</div></div>
  <div class="kpi"><div class="l">📈 Inversiones</div><div class="v purp">$${valorInv.toLocaleString("es-CO")}</div></div>
  <div class="kpi"><div class="l">💳 Deuda neta</div><div class="v ambar">$${dn.toLocaleString("es-CO")}</div></div>
  <div class="kpi"><div class="l">💎 Patrimonio</div><div class="v verde">$${pat.toLocaleString("es-CO")}</div></div>
  <div class="kpi"><div class="l">💰 Pagos deuda</div><div class="v ambar">$${T.pagosDeuda.toLocaleString("es-CO")}</div></div>
  <div class="kpi"><div class="l">📊 Tasa ahorro</div><div class="v purp">${T.ingresos>0?((T.saldoCaja/T.ingresos)*100).toFixed(1):0}%</div></div>
</div>
<section><h2>📊 Gráficas generales</h2>
<div class="grafGrid">
  <div><p style="font-size:10px;color:#94a3b8;text-align:center;margin-bottom:5px">Ingresos vs Gastos por mes</p><canvas id="gMen"></canvas></div>
  <div><p style="font-size:10px;color:#94a3b8;text-align:center;margin-bottom:5px">Evolución Deuda</p><canvas id="gDeu"></canvas></div>
  <div><p style="font-size:10px;color:#94a3b8;text-align:center;margin-bottom:5px">Distribución Gastos</p><canvas id="gCat"></canvas></div>
  <div><p style="font-size:10px;color:#94a3b8;text-align:center;margin-bottom:5px">Fuentes de Ingreso</p><canvas id="gFuentes"></canvas></div>
  <div><p style="font-size:10px;color:#94a3b8;text-align:center;margin-bottom:5px">Portafolio Inversiones</p><canvas id="gInv"></canvas></div>
  <div><p style="font-size:10px;color:#94a3b8;text-align:center;margin-bottom:5px">Métodos de Pago</p><canvas id="gMet"></canvas></div>
</div></section>
<section><h2>📊 % Gasto por Categoría</h2>${barrasCat}</section>
<section><h2>💳 % por Método de Pago</h2>${barrasMet}</section>
${inversiones.length?`<section><h2>📈 Inversiones</h2><table><thead><tr><th>Tipo</th><th>Nombre</th><th>Invertido</th><th>Actual</th><th>Ganancia</th></tr></thead><tbody>${filasInv}</tbody></table></section>`:""}
${deudas.length?`<section><h2>💳 Deudas & Amortización</h2>${seccionesDeuda}</section>`:""}
<script>
const cl=${JSON.stringify(colores)};
const opts={responsive:true,plugins:{legend:{labels:{color:"#e2e8f0",font:{size:10}}}}};
new Chart(document.getElementById("gMen"),{type:"bar",data:{labels:${JSON.stringify(labAll)},datasets:[{label:"Ingresos",data:${JSON.stringify(ingAll)},backgroundColor:"#22c55e",borderRadius:4},{label:"Gastos",data:${JSON.stringify(gasAll)},backgroundColor:"#ef4444",borderRadius:4}]},options:{...opts,scales:{x:{ticks:{color:"#94a3b8"},grid:{color:"#1e3a5f"}},y:{ticks:{color:"#94a3b8"},grid:{color:"#1e3a5f"}}}}});
new Chart(document.getElementById("gDeu"),{type:"line",data:{labels:${JSON.stringify(labAll)},datasets:[{label:"Deuda viva",data:${JSON.stringify(deudaAll)},borderColor:"#f97316",backgroundColor:"rgba(249,115,22,0.15)",fill:true,tension:0.3}]},options:{...opts,scales:{x:{ticks:{color:"#94a3b8"},grid:{color:"#1e3a5f"}},y:{ticks:{color:"#94a3b8"},grid:{color:"#1e3a5f"}}}}});
new Chart(document.getElementById("gCat"),{type:"doughnut",data:{labels:${JSON.stringify(Object.keys(catMap))},datasets:[{data:${JSON.stringify(Object.values(catMap))},backgroundColor:cl}]},options:opts});
new Chart(document.getElementById("gFuentes"),{type:"doughnut",data:{labels:${JSON.stringify(Object.keys(fuentesAll))},datasets:[{data:${JSON.stringify(Object.values(fuentesAll))},backgroundColor:cl}]},options:opts});
new Chart(document.getElementById("gInv"),{type:"doughnut",data:{labels:${JSON.stringify(Object.keys(invMap))},datasets:[{data:${JSON.stringify(Object.values(invMap))},backgroundColor:cl}]},options:opts});
new Chart(document.getElementById("gMet"),{type:"bar",data:{labels:${JSON.stringify(Object.keys(metMap))},datasets:[{label:"Gastos",data:${JSON.stringify(Object.values(metMap))},backgroundColor:"#3b82f6",borderRadius:4}]},options:{...opts,scales:{x:{ticks:{color:"#94a3b8"},grid:{color:"#1e3a5f"}},y:{ticks:{color:"#94a3b8"},grid:{color:"#1e3a5f"}}}}});
<\/script></body></html>`;

  const w=window.open("","_blank"); w.document.write(html); w.document.close();
}

/* ════════════════════════════════
   EXCEL
   ════════════════════════════════ */
function exportarExcel() {
  const meses=[...new Set(movimientos.map(m=>m.fecha.substring(0,7)))].sort();
  if(!meses.length){alert("Sin movimientos.");return;}
  const sel=prompt("Meses (ej: 2026-01,2026-02) o TODO:\n\n"+meses.join(", "),"TODO");
  if(!sel)return;
  const todo=sel.trim().toUpperCase()==="TODO";
  const selArr=sel.split(",").map(s=>s.trim());
  const movF=(todo?[...movimientos]:movimientos.filter(m=>selArr.includes(m.fecha.substring(0,7)))).sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));

  const T=calcularTotales(), valorInv=calcularValorInversiones(), dn=calcularDeudaNeta();

  const libro=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro,XLSX.utils.json_to_sheet(movF.map(m=>({
    Fecha:m.fecha,Descripcion:m.descripcion||m.desc,Tipo:m.tipo,
    Categoria:m.categoria||"",MetodoPago:m.metodoPago||"",Valor:m.valor
  }))),"Movimientos");
  XLSX.utils.book_append_sheet(libro,XLSX.utils.json_to_sheet(inversiones.map(inv=>{
    const va=valorActualInversion(inv),ci=capitalInvertido(inv);
    return{Tipo:inv.tipo,Nombre:inv.nombre,Invertido:ci,ValorActual:va,Ganancia:va-ci,Origen:inv.origen};
  })),"Inversiones");
  XLSX.utils.book_append_sheet(libro,XLSX.utils.json_to_sheet(deudas.map(d=>({
    Nombre:d.nombre,Tipo:d.tipo,Capital:d.capital,SaldoVivo:saldoVivo(d),TipoTasa:d.tipoTasa,Tasa:d.tasaFija,Pagos:d.pagos.length
  }))),"Deudas");
  XLSX.utils.book_append_sheet(libro,XLSX.utils.json_to_sheet([
    {Concepto:"Ingresos",Valor:T.ingresos},{Concepto:"Gastos",Valor:T.gastos},
    {Concepto:"Pagos deuda",Valor:T.pagosDeuda},{Concepto:"Traslados inv",Valor:T.trasladosInv},
    {Concepto:"Saldo caja",Valor:T.saldoCaja},{Concepto:"Inversiones",Valor:valorInv},
    {Concepto:"Deuda neta",Valor:dn},{Concepto:"Patrimonio",Valor:T.saldoCaja+valorInv-dn}
  ]),"Estado Actual");
  XLSX.writeFile(libro,todo?"finanzas_completo.xlsx":`finanzas_${selArr.join("_")}.xlsx`);
}

/* ── INIT ── */
actualizar();
if (document.getElementById("tablaInversiones")) actualizarInversiones();
if (document.getElementById("listaDeudas"))      dibujarDeudas();