// Chart.js defaults for white theme
if (typeof Chart !== 'undefined') {
  Chart.defaults.color = '#9aaa9a';
  Chart.defaults.borderColor = '#e8ede8';
  Chart.defaults.backgroundColor = 'rgba(0,170,51,0.1)';
}
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

/* ── SUPABASE CONFIG ── */
const SUPABASE_URL = "https://uvogztpqqjbtdmkieybs.supabase.co";
const SUPABASE_KEY = "sb_publishable_bNEN9D3vbC9SBvnnOwBx4A_4m37RiRe";

/* ══════════════════════════════════════════════════════════════
   AUTH — Sesión y token de usuario
   ══════════════════════════════════════════════════════════════ */
let _authToken  = null; // JWT del usuario autenticado
let _currentUser = null; // objeto usuario

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${_authToken || SUPABASE_KEY}`
  };
}

/* Registrar nuevo usuario */
async function signUp(email, password) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
    body: JSON.stringify({ email, password })
  });
  return r.json();
}

/* Iniciar sesión */
async function signIn(email, password) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
    body: JSON.stringify({ email, password })
  });
  return r.json();
}

/* Cerrar sesión */
async function signOut() {
  await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: "POST",
    headers: authHeaders()
  });
  _authToken   = null;
  _currentUser = null;
  localStorage.removeItem("sb_session");
  mostrarPantallaAuth();
}

/* Refrescar token */
async function refreshToken(refresh_token) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
    body: JSON.stringify({ refresh_token })
  });
  return r.json();
}

/* Guardar sesión en localStorage */
function guardarSesion(data) {
  const sesion = {
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    expires_at:    Date.now() + (data.expires_in || 3600) * 1000,
    user:          data.user
  };
  localStorage.setItem("sb_session", JSON.stringify(sesion));
  _authToken   = sesion.access_token;
  _currentUser = sesion.user;
}

/* Intentar restaurar sesión guardada */
async function restaurarSesion() {
  const raw = localStorage.getItem("sb_session");
  if (!raw) return false;
  try {
    const s = JSON.parse(raw);
    // Si el token expira en menos de 5 min, refrescar
    if (Date.now() > s.expires_at - 300000) {
      const data = await refreshToken(s.refresh_token);
      if (data.access_token) { guardarSesion(data); return true; }
      localStorage.removeItem("sb_session");
      return false;
    }
    _authToken   = s.access_token;
    _currentUser = s.user;
    return true;
  } catch { return false; }
}

/* ── Pantalla de Auth (login/registro) ── */
function mostrarPantallaAuth() {
  document.getElementById("appShell").style.display   = "none";
  document.getElementById("authScreen").style.display = "flex";
  document.getElementById("authEmail").value    = "";
  document.getElementById("authPassword").value = "";
  document.getElementById("authError").textContent = "";
}

function mostrarApp() {
  document.getElementById("authScreen").style.display = "none";
  document.getElementById("appShell").style.display   = "block";

  if (_currentUser) {
    const guardado   = localStorage.getItem("sb_displayName");
    const emailLocal = (_currentUser.email || "").split("@")[0];
    const nombre     = guardado || emailLocal || "Usuario";

    let badge = document.getElementById("userBadge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "userBadge";
      badge.style.cssText = "margin-left:auto;display:flex;align-items:center;gap:6px";
      badge.innerHTML = '<span style="font-size:18px;cursor:pointer" onclick="abrirModalNombre()" title="Cambiar nombre">\u{1F464}</span>' +
        '<span id="userName" style="font-size:13px;color:#006b1a;font-weight:700;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer" onclick="abrirModalNombre()"></span>' +
        '<button onclick="abrirPagina(\'configuracion\')" title="Ajustes" style="background:rgba(0,150,50,.1);color:#006b1a;border:1px solid rgba(0,150,50,.2);padding:5px 9px;font-size:13px;border-radius:8px;font-weight:700;line-height:1">\u2699\uFE0F</button>';
      document.querySelector(".headerInner").appendChild(badge);
    }
    document.getElementById("userName").textContent = nombre;
  }
}

/* ── Lógica del formulario de auth ── */
let _modoAuth = "login"; // "login" | "registro"

function toggleModoAuth() {
  _modoAuth = _modoAuth === "login" ? "registro" : "login";
  const esRegistro = _modoAuth === "registro";
  document.getElementById("authTitle").textContent  = esRegistro ? "Crear cuenta nueva" : "Bienvenido de nuevo";
  document.getElementById("authSubmit").textContent = esRegistro ? "Registrarme" : "Entrar";
  document.getElementById("authToggleText").textContent = esRegistro
    ? "¿Ya tienes una cuenta? " : "¿Eres nuevo aquí? ";
  document.getElementById("authToggleLink").textContent = esRegistro
    ? "Inicia sesión" : "Crea tu cuenta";
  document.getElementById("authError").textContent = "";
  document.getElementById("authError").style.color = "#ff4444";
  const nameWrap = document.getElementById("authNameWrap");
  if (nameWrap) nameWrap.style.display = esRegistro ? "block" : "none";
}

async function submitAuth() {
  const email    = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  const nombre   = (_modoAuth === "registro") ? (document.getElementById("authName").value.trim() || "") : "";
  const errEl    = document.getElementById("authError");
  const btn      = document.getElementById("authSubmit");

  if (!email || !password) { errEl.style.color="#ff4444"; errEl.textContent = "Por favor completa todos los campos."; return; }
  if (password.length < 6) { errEl.style.color="#ff4444"; errEl.textContent = "La contraseña debe tener al menos 6 caracteres."; return; }

  // Animación de carga con dots
  btn.disabled = true;
  btn.innerHTML = (_modoAuth === "registro" ? "Creando cuenta" : "Verificando") +
    '<span class="authDots"><span></span><span></span><span></span></span>';
  errEl.textContent = "";

  try {
    let data;
    if (_modoAuth === "registro") {
      data = await signUp(email, password);
      if (data.error) {
        errEl.style.color="#ff4444";
        errEl.textContent = traducirError(data.error.message || data.msg);
        btn.disabled=false; btn.textContent="Registrarme"; return;
      }
      // Guardar nombre si se ingresó
      if (nombre) localStorage.setItem("sb_displayName", nombre);
      // Requiere confirmación de email
      if (data.user && !data.access_token) {
        errEl.style.color = "#00c832";
        const correo = email;
        errEl.innerHTML = "✓ Cuenta creada exitosamente.<br><span style=\"font-size:12px;color:#9aaa9a\">Hemos enviado un enlace de verificación a <strong>" + correo + "</strong>. Por favor revisa tu bandeja de entrada y sigue las instrucciones para activar tu cuenta.</span>";
        btn.disabled=false; btn.textContent="Registrarme"; return;
      }
    } else {
      data = await signIn(email, password);
      if (data.error || data.error_description) {
        errEl.style.color="#ff4444";
        errEl.textContent = traducirError(data.error_description || data.error);
        btn.disabled=false; btn.textContent="Entrar"; return;
      }
    }
    if (data.access_token) {
      guardarSesion(data);
      // Feedback breve antes de mostrar app
      btn.innerHTML = "✓ Acceso concedido";
      btn.style.background = "linear-gradient(135deg,#008828,#006b1a)";
      setTimeout(() => { mostrarApp(); cargarDatos(); }, 600);
      return;
    }
  } catch(e) {
    errEl.style.color="#ff4444";
    errEl.textContent = "Error de conexión. Verifica tu internet e intenta de nuevo.";
  }
  btn.disabled=false;
  btn.textContent = _modoAuth === "registro" ? "Registrarme" : "Entrar";
}

function traducirError(msg) {
  if (!msg) return "Error desconocido.";
  if (msg.includes("Invalid login"))    return "Email o contraseña incorrectos.";
  if (msg.includes("already registered")) return "Este email ya está registrado.";
  if (msg.includes("Email not confirmed")) return "Confirma tu email antes de entrar.";
  if (msg.includes("Password should"))   return "La contraseña debe tener al menos 6 caracteres.";
  return msg;
}

/* ── Presionar Enter en el formulario ── */
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && document.getElementById("authScreen").style.display !== "none") {
    submitAuth();
  }
});

/* ══════════════════════════════════════════════════════════════
   CLIENTE SUPABASE (usa el token del usuario autenticado)
   ══════════════════════════════════════════════════════════════ */
const sb = {
  get baseHeaders() { return authHeaders(); },
  url: (tabla, params = "") => `${SUPABASE_URL}/rest/v1/${tabla}${params}`
};

async function sbGet(tabla) {
  const r = await fetch(sb.url(tabla, "?select=*"), { headers: sb.baseHeaders });
  return r.ok ? r.json() : [];
}
async function sbInsert(tabla, data) {
  const r = await fetch(sb.url(tabla), {
    method: "POST",
    headers: { ...sb.baseHeaders, "Prefer": "return=representation" },
    body: JSON.stringify(data)
  });
  if (!r.ok) {
    const err = await r.text();
    console.error("sbInsert error:", err);
    return null;
  }
  return r.json();
}
async function sbUpdate(tabla, id, data) {
  const r = await fetch(sb.url(tabla, `?id=eq.${id}`), {
    method: "PATCH", headers: sb.baseHeaders, body: JSON.stringify(data)
  });
  return r.ok;
}
async function sbDelete(tabla, id) {
  const r = await fetch(sb.url(tabla, `?id=eq.${id}`), {
    method: "DELETE", headers: sb.baseHeaders
  });
  return r.ok;
}

/* ── ESTADO GLOBAL ── */
let movimientos = [];
let inversiones = [];
let deudas      = [];

/* ── CARGA INICIAL DESDE SUPABASE ── */
async function cargarDatos() {
  mostrarCargando(true);
  try {
    const [movDB, invDB, deuDB, pagDB, cargDB] = await Promise.all([
      sbGet("movimientos"),
      sbGet("inversiones"),
      sbGet("deudas"),
      sbGet("pagos_deuda"),
      sbGet("cargos_tarjeta")
    ]);

    // Mapear nombres de columnas DB → app
    movimientos = (movDB || []).map(m => ({
      id:          m.id,
      descripcion: m.descripcion,
      desc:        m.descripcion,
      valor:       parseFloat(m.valor),
      tipo:        m.tipo,
      fecha:       m.fecha,
      categoria:   m.categoria || "",
      subcategoria:m.subcategoria || "",
      metodoPago:  m.metodo_pago || "",
      esCredito:   m.es_credito || false,
      deudaId:     m.deuda_id || null,
      cargoId:     m.cargo_id || null,
    }));

    inversiones = (invDB || []).map(i => ({
      id:               i.id,
      tipo:             i.tipo,
      nombre:           i.nombre,
      broker:           i.broker || "",
      origen:           i.origen,
      cantidad:         parseFloat(i.cantidad || 0),
      precioCompra:     parseFloat(i.precio_compra || 0),
      precioActual:     parseFloat(i.precio_actual || 0),
      capital:          parseFloat(i.capital || 0),
      tasaEA:           parseFloat(i.tasa_ea || 0),
      fechaInicio:      i.fecha_inicio || "",
      fechaVencimiento: i.fecha_vencimiento || "",
      valorCompra:      parseFloat(i.valor_compra || 0),
      valorActual:      parseFloat(i.valor_actual || 0),
    }));

    // Armar deudas con sus pagos y cargos embebidos
    deudas = (deuDB || []).map(d => {
      const pagos = (pagDB || [])
        .filter(p => p.deuda_id === d.id)
        .map(p => ({
          id:            p.id,
          fecha:         p.fecha,
          cuota:         parseFloat(p.cuota),
          capitalPagado: parseFloat(p.capital_pagado || 0),
          interes:       parseFloat(p.interes || 0),
          tasaAplicada:  parseFloat(p.tasa_aplicada || 0),
        }));
      const _cargos = (cargDB || [])
        .filter(c => c.deuda_id === d.id)
        .map(c => ({
          id:     c.id,
          fecha:  c.fecha,
          desc:   c.descripcion,
          valor:  parseFloat(c.valor),
          pagado: c.pagado || false,
          movId:  c.movimiento_id || null,
        }));
      return {
        id:            d.id,
        nombre:        d.nombre,
        tipo:          d.tipo,
        capital:       parseFloat(d.capital),
        fecha:         d.fecha,
        tipoTasa:      d.tipo_tasa,
        tasaFija:      parseFloat(d.tasa_fija || 0),
        frecuencia:    d.frecuencia || "",
        cuotas:        d.cuotas || 0,
        _esTarjetaAuto:d.es_tarjeta_auto || false,
        pagos,
        _cargos,
      };
    });
  } catch(e) {
    console.error("Error cargando datos:", e);
  }
  mostrarCargando(false);
  actualizar();
}

function mostrarCargando(visible) {
  let el = document.getElementById("loadingOverlay");
  if (!el) {
    el = document.createElement("div");
    el.id = "loadingOverlay";
    el.style.cssText = "position:fixed;inset:0;background:rgba(255,255,255,.92);z-index:9999;display:flex;align-items:center;justify-content:center;font-size:16px;color:#006b1a;font-weight:700";
    el.innerHTML = "⏳ Cargando datos...";
    document.body.appendChild(el);
  }
  el.style.display = visible ? "flex" : "none";
}

/* ── SAVE reemplazado: ya no usa localStorage ── */
/* Las funciones de guardado ahora llaman a Supabase directamente */
const save = () => {}; // vacío — se guarda en cada operación

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

  // Mostrar/ocultar categoría y subcategoría
  const filaCS = document.getElementById("filaCategoriaSubcat");
  if (filaCS) filaCS.style.display = tipo === "pago_deuda_cuota" ? "none" : "block";

  // Llenar categorías según tipo
  const catSel = document.getElementById("categoria");
  if (catSel) {
    catSel.innerHTML = '<option value="">Categoría</option>';
    if (tipo === "ingreso") {
      catSel.innerHTML += '<option value="Entradas">Entradas</option>';
      catSel.value = "Entradas";
      cargarSubcategorias();
    } else if (tipo === "gasto") {
      ["Mercado","Restaurante","Transporte","Vivienda","Ocio","Salud","Educación","Emergencia","Servicios","Otros"]
        .forEach(c => catSel.innerHTML += `<option value="${c}">${c}</option>`);
      cargarSubcategorias();
    }
  }

  // Métodos de pago según tipo
  const metSel = document.getElementById("metodoPago");
  if (metSel) {
    const sinCredito = ["Efectivo","Débito","Nequi","Daviplata","Transferencia","ARQ"];
    const conCredito = [...sinCredito,"Banco Bogotá Crédito","Davivienda Crédito"];
    const opciones = tipo === "ingreso" ? sinCredito : conCredito;
    metSel.innerHTML = opciones.map(o=>`<option>${o}</option>`).join("");
  }
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
    cont.innerHTML = `<p style="color:#9aaa9a;text-align:center;padding:30px">Sin movimientos registrados</p>`;
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

  const colorTipo = { ingreso:"#00aa33", gasto:"#ef4444", pago_deuda_cuota:"#ffb300", traslado_inversion:"#00b8d4" };
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
        const col = colorTipo[m.tipo] || "#9aaa9a";
        const sig = signoTipo[m.tipo] || "·";
        return `<div style="background:#fff;border-radius:13px;padding:13px;margin-bottom:8px;border:1px solid #e8ede8;border-left:4px solid ${col}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <div style="flex:1;min-width:0">
              <p style="font-weight:700;font-size:14px;margin:0 0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.descripcion||m.desc||""}</p>
              <p style="font-size:11px;color:#446644;margin:0">${m.fecha}${m.categoria?" · "+m.categoria:""}${m.metodoPago?" · "+m.metodoPago:""}</p>
              ${m.tipo==="pago_deuda_cuota"?`<p style="font-size:11px;color:#e07000;margin:2px 0 0">↓ Pago de deuda</p>`:""}
              ${m.tipo==="traslado_inversion"?`<p style="font-size:11px;color:#00997a;margin:2px 0 0">→ Traslado a inversión</p>`:""}
            </div>
            <span style="font-weight:800;color:${col};font-size:15px;white-space:nowrap">${sig}${fmt(m.valor)}</span>
          </div>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button onclick="abrirModalEditar('${m.id}')" style="background:#00aa33;padding:6px 11px;font-size:12px;border-radius:9px">✏</button>
            <button onclick="eliminarMovimiento('${m.id}')" style="background:#dc2626;padding:6px 11px;font-size:12px;border-radius:9px">🗑</button>
          </div>
        </div>`;
      }).join("");

      return `<div class="semana" style="margin:5px 10px 8px">
        <div class="semanaHeader" onclick="toggleEl('${sId}','arr_${sId}')">
          <span style="font-size:12px">${semanaLabel(sK)}</span>
          <span style="font-size:11px;color:#9aaa9a;white-space:nowrap">+${fmt(sI)} / -${fmt(sG)} <b id="arr_${sId}">▼</b></span>
        </div>
        <div id="${sId}" class="movimientosSemana">${iHTML}</div>
      </div>`;
    }).join("");

    html += `<div class="mes">
      <div class="mesHeader" onclick="toggleEl('${mId}','arr_${mId}')">
        <span>${mData.label.charAt(0).toUpperCase()+mData.label.slice(1)}</span>
        <span style="font-size:11px;color:#9aaa9a;white-space:nowrap">+${fmt(tI)} / -${fmt(tG)} <b id="arr_${mId}">▼</b></span>
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


/* ════════════════════════════════
   MOVIMIENTOS — CRUD Supabase
   ════════════════════════════════ */
async function agregarMovimiento() {
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
      const d = deudas.find(d => String(d.id) === String(deudaId));
      if (d) {
        const pago = { fecha, cuota: valor, capitalPagado: valor, interes: 0, tasaAplicada: 0 };
        const res = await sbInsert("pagos_deuda", {
          user_id: _currentUser.id, deuda_id: deudaId, fecha, cuota: valor,
          capital_pagado: valor, interes: 0, tasa_aplicada: 0
        });
        if (res && res[0]) {
          pago.id = res[0].id;
          d.pagos.push(pago);
        }
      }
    }
  }

  // Gasto con tarjeta de crédito
  const metodosCred = ["Banco Bogotá Crédito", "Davivienda Crédito"];
  if (tipo === "gasto" && metodosCred.includes(meto)) {
    let deudaTarjeta = deudas.find(d => d.tipo === "tarjeta_credito" && d.nombre === meto && d._esTarjetaAuto);
    if (!deudaTarjeta) {
      const dRes = await sbInsert("deudas", {
        user_id: _currentUser.id, nombre: meto, tipo: "tarjeta_credito", capital: 0,
        fecha: hoy(), tipo_tasa: "sin_tasa", tasa_fija: 0,
        frecuencia: "mensual", cuotas: 0, es_tarjeta_auto: true
      });
      if (dRes && dRes[0]) {
        deudaTarjeta = { id: dRes[0].id, nombre: meto, tipo: "tarjeta_credito", capital: 0, fecha: hoy(), tipoTasa: "sin_tasa", tasaFija: 0, frecuencia: "mensual", cuotas: 0, pagos: [], _esTarjetaAuto: true, _cargos: [] };
        deudas.push(deudaTarjeta);
      }
    }

    // Insertar movimiento con esCredito=true
    const movRes = await sbInsert("movimientos", {
      user_id: _currentUser.id, descripcion: desc, valor, tipo: "gasto", fecha,
      categoria: cat, subcategoria: sub, metodo_pago: meto,
      es_credito: true, deuda_id: null
    });
    const movId = movRes && movRes[0] ? movRes[0].id : null;

    // Insertar cargo de tarjeta
    if (deudaTarjeta && movId) {
      const cargoRes = await sbInsert("cargos_tarjeta", {
        user_id: _currentUser.id, deuda_id: deudaTarjeta.id, movimiento_id: movId,
        fecha, descripcion: desc, valor, pagado: false
      });
      const cargoId = cargoRes && cargoRes[0] ? cargoRes[0].id : null;
      if (!deudaTarjeta._cargos) deudaTarjeta._cargos = [];
      deudaTarjeta._cargos.push({ id: cargoId, fecha, desc, valor, pagado: false, movId });
      deudaTarjeta.capital = deudaTarjeta._cargos.filter(c => !c.pagado).reduce((s,c) => s + c.valor, 0);
      await sbUpdate("deudas", deudaTarjeta.id, { capital: deudaTarjeta.capital });

      // Actualizar movimiento con cargo_id
      if (cargoId) await sbUpdate("movimientos", movId, { cargo_id: cargoId });
    }

    if (movRes && movRes[0]) {
      movimientos.push({ id: movRes[0].id, desc, descripcion: desc, valor, tipo: "gasto", fecha, categoria: cat, subcategoria: sub, metodoPago: meto, esCredito: true, deudaId: null });
    }

    document.getElementById("descripcion").value = "";
    document.getElementById("valor").value = "";
    actualizar();
    return;
  }

  // Movimiento normal
  const res = await sbInsert("movimientos", {
    user_id: _currentUser.id, descripcion: desc, valor, tipo, fecha,
    categoria: cat, subcategoria: sub,
    metodo_pago: meto, es_credito: false, deuda_id: deudaId
  });
  if (res && res[0]) {
    movimientos.push({ id: res[0].id, desc, descripcion: desc, valor, tipo, fecha, categoria: cat, subcategoria: sub, metodoPago: meto, esCredito: false, deudaId });
  }

  document.getElementById("descripcion").value = "";
  document.getElementById("valor").value = "";
  actualizar();
}

async function eliminarMovimiento(id) {
  await sbDelete("movimientos", id);
  movimientos = movimientos.filter(m => String(m.id) !== String(id));
  actualizar();
}

async function guardarEdicion() {
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

  await sbUpdate("movimientos", id, {
    descripcion: m.descripcion, valor: m.valor, tipo: m.tipo,
    categoria: m.categoria, metodo_pago: m.metodoPago, fecha: m.fecha
  });
  actualizar();
  cerrarModalEditar();
}

/* ════════════════════════════════
   INVERSIONES — CRUD Supabase
   ════════════════════════════════ */
async function agregarInversion() {
  const tipo   = document.getElementById("tipoActivo").value;
  const nombre = document.getElementById("invNombre").value.trim();
  if (!nombre) { alert("Escribe el nombre del activo."); return; }

  const g  = id => { const e=document.getElementById(id); return e?Number(e.value)||0:0; };
  const gs = id => { const e=document.getElementById(id); return e?e.value:""; };
  const origen = document.getElementById("invOrigen").value;

  const inv = {
    tipo, nombre, origen,
    broker:           gs("invBroker"),
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

  const res = await sbInsert("inversiones", {
    user_id: _currentUser.id, tipo: inv.tipo, nombre: inv.nombre, broker: inv.broker || null, origen: inv.origen,
    cantidad: inv.cantidad || null, precio_compra: inv.precioCompra || null,
    precio_actual: inv.precioActual || null, capital: inv.capital || null,
    tasa_ea: inv.tasaEA || null, fecha_inicio: inv.fechaInicio || null,
    fecha_vencimiento: inv.fechaVencimiento || null,
    valor_compra: inv.valorCompra || null, valor_actual: inv.valorActual || null
  });
  if (res && res[0]) inv.id = res[0].id;

  // Si viene de caja → registrar traslado
  if (origen === "caja") {
    const monto = capitalInvertido(inv);
    if (monto > 0) {
      const mRes = await sbInsert("movimientos", {
        user_id: _currentUser.id, descripcion: `Inversión: ${nombre}`, valor: monto,
        tipo: "traslado_inversion", fecha: inv.fechaInicio,
        categoria: "Inversión", subcategoria: tipo,
        metodo_pago: "Transferencia", es_credito: false
      });
      if (mRes && mRes[0]) {
        movimientos.push({ id: mRes[0].id, descripcion: `Inversión: ${nombre}`, desc: `Inversión: ${nombre}`, valor: monto, tipo: "traslado_inversion", fecha: inv.fechaInicio, categoria: "Inversión", subcategoria: tipo, metodoPago: "Transferencia", esCredito: false, deudaId: null });
      }
    }
  }

  inversiones.push(inv);
  actualizar();

  document.getElementById("invNombre").value = "";
  const invBrokerEl = document.getElementById("invBroker");
  if (invBrokerEl) invBrokerEl.value = "";
  ["invCantidad","invPrecioCompra","invPrecioActual","invCapital","invTasaEA",
   "invFechaVcto","invValorCompra","invValorActual"].forEach(id => {
    const e=document.getElementById(id); if(e) e.value="";
  });
}

async function editarPrecioInversion(id) {
  const inv = inversiones.find(i => String(i.id) === String(id));
  if (!inv) return;
  const tipo = inv.tipo;
  let campo, campoDb, lbl;
  if (["Acción","ETF","Criptomoneda"].includes(tipo)) { campo="precioActual"; campoDb="precio_actual"; lbl="Precio actual"; }
  else if (["CDT","Fondo"].includes(tipo))             { campo="tasaEA";      campoDb="tasa_ea";      lbl="Tasa EA %"; }
  else if (tipo==="Finca Raíz")                        { campo="valorActual"; campoDb="valor_actual"; lbl="Valor actual"; }
  else                                                 { campo="capital";     campoDb="capital";      lbl="Capital"; }
  const v = prompt(`${lbl}:`, inv[campo]);
  if (v===null) return;
  inv[campo] = Number(v);
  await sbUpdate("inversiones", id, { [campoDb]: Number(v) });
  actualizar();
}

async function eliminarInversion(id) {
  await sbDelete("inversiones", id);
  inversiones = inversiones.filter(i => String(i.id) !== String(id));
  actualizar();
}

/* ════════════════════════════════
   DEUDAS — CRUD Supabase
   ════════════════════════════════ */
async function agregarDeuda() {
  const nombre   = document.getElementById("dNombre").value.trim();
  const tipo     = document.getElementById("dTipo").value;
  const capital  = Number(document.getElementById("dCapital").value);
  const fecha    = document.getElementById("dFecha").value || hoy();
  const tipoTasa = document.getElementById("dTipoTasa").value;
  const tasaFija = Number(document.getElementById("dTasaFija").value) || 0;
  const frecuencia= document.getElementById("dFrecuencia").value;
  const cuotas   = Number(document.getElementById("dCuotas").value) || 0;

  if (!nombre || capital<=0) { alert("Nombre y capital son requeridos."); return; }

  const res = await sbInsert("deudas", {
    user_id: _currentUser.id, nombre, tipo, capital, fecha,
    tipo_tasa: tipoTasa, tasa_fija: tasaFija,
    frecuencia, cuotas, es_tarjeta_auto: false
  });
  if (res && res[0]) {
    deudas.push({ id: res[0].id, nombre, tipo, capital, fecha, tipoTasa, tasaFija, frecuencia, cuotas, pagos: [], _esTarjetaAuto: false, _cargos: [] });
  }

  cerrarModalDeuda();
  actualizar();
  ["dNombre","dCapital","dTasaFija","dCuotas"].forEach(id => { const e=document.getElementById(id); if(e) e.value=""; });
}

async function eliminarDeuda(id) {
  if (!confirm("¿Eliminar esta deuda?")) return;
  await sbDelete("deudas", id);
  deudas = deudas.filter(d => String(d.id)!==String(id));
  actualizar();
}

async function registrarPagoDeuda() {
  const id  = document.getElementById("pagoDeudaId").value;
  const d   = deudas.find(d => String(d.id)===String(id));
  if (!d) return;
  const fecha      = document.getElementById("pagoFecha").value || hoy();
  const cuota      = Number(document.getElementById("pagoCuota").value);
  const capPagado  = Number(document.getElementById("pagoCapital").value) || 0;
  const tasaVar    = Number(document.getElementById("pagoTasaVar").value) || 0;
  if (!fecha || cuota<=0) { alert("Fecha y valor del pago son requeridos."); return; }

  const interes = Math.max(0, cuota-capPagado);
  const tasaAplicada = d.tipoTasa==="variable" ? tasaVar : d.tasaFija;

  // Guardar pago en DB
  const pRes = await sbInsert("pagos_deuda", {
    user_id: _currentUser.id, deuda_id: id, fecha, cuota,
    capital_pagado: capPagado, interes, tasa_aplicada: tasaAplicada
  });
  const pago = { fecha, cuota, capitalPagado: capPagado, interes, tasaAplicada };
  if (pRes && pRes[0]) pago.id = pRes[0].id;
  d.pagos.push(pago);

  // Si es deuda de tarjeta auto, marcar cargos como pagados
  if (d._esTarjetaAuto && d._cargos) {
    let restante = capPagado > 0 ? capPagado : cuota;
    const pendientes = d._cargos.filter(c => !c.pagado).sort((a,b)=>new Date(a.fecha)-new Date(b.fecha));
    for (const c of pendientes) {
      if (restante <= 0) break;
      if (restante >= c.valor) {
        c.pagado = true;
        restante -= c.valor;
        if (c.id) await sbUpdate("cargos_tarjeta", c.id, { pagado: true });
      } else {
        c.valor -= restante;
        restante = 0;
        if (c.id) await sbUpdate("cargos_tarjeta", c.id, { valor: c.valor });
      }
    }
    d.capital = d._cargos.filter(c => !c.pagado).reduce((s,c)=>s+c.valor,0);
    await sbUpdate("deudas", id, { capital: d.capital });
  }

  // Crear movimiento de pago que sale de caja
  const mRes = await sbInsert("movimientos", {
    user_id: _currentUser.id, descripcion: `Pago deuda: ${d.nombre}`, valor: cuota,
    tipo: "pago_deuda_cuota", fecha,
    categoria: "Deudas", subcategoria: d.nombre,
    metodo_pago: "Débito", es_credito: false, deuda_id: id
  });
  if (mRes && mRes[0]) {
    movimientos.push({ id: mRes[0].id, descripcion:`Pago deuda: ${d.nombre}`, desc:`Pago deuda: ${d.nombre}`, valor: cuota, tipo:"pago_deuda_cuota", fecha, categoria:"Deudas", subcategoria:d.nombre, metodoPago:"Débito", esCredito:false, deudaId: id });
  }

  cerrarPagoDeuda();
  actualizar();
}

function actualizarInversiones() {
  const cont = document.getElementById("tablaInversiones");
  if (!cont) return;

  if (!inversiones.length) {
    cont.innerHTML = `<p style="color:#9aaa9a;text-align:center;padding:30px">Sin inversiones registradas</p>`;
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
        <td><b style="font-size:13px">${inv.nombre}</b><br><span style="font-size:11px;color:#9aaa9a">${detalle}</span>
            <br><span style="font-size:11px;color:${inv.origen==="caja"?"#00997a":"#9aaa9a"}">${inv.origen==="caja"?"Desde caja":"Capital externo"}</span>
            ${inv.broker?`<br><span style="font-size:11px;color:#00997a">🏦 ${inv.broker}</span>`:""}
        </td>
        <td>${fmt(ci)}</td>
        <td>${fmt(va)}</td>
        <td style="color:${gan>=0?"#00aa33":"#ef4444"}">${gan>=0?"+":""}${fmtN(gan)}<br><span style="font-size:11px">${pct!=="—"?pct+"%":"—"}</span></td>
        <td>
          <button onclick="editarPrecioInversion('${inv.id}')" style="background:#00aa33;color:#fff;border:none;padding:5px 9px;border-radius:8px;cursor:pointer;font-size:12px;display:block;margin-bottom:4px">✏</button>
          <button onclick="eliminarInversion('${inv.id}')" style="background:#dc2626;color:#fff;border:none;padding:5px 9px;border-radius:8px;cursor:pointer;font-size:12px">🗑</button>
        </td>
      </tr>`;
    }).join("");

    const ganTot=totAct-totInv;
    html+=`<div style="margin-bottom:22px">
      <h3 style="color:#006b1a;font-size:15px;font-weight:700;margin-bottom:8px">${tipo}
        <span style="font-size:12px;color:#446644;font-weight:400"> — ${fmt(totAct)}
          <span style="color:${ganTot>=0?"#00aa33":"#ef4444"}">(${ganTot>=0?"+":""}${fmtN(ganTot)})</span>
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
    cont.innerHTML = `<p style="color:#9aaa9a;text-align:center;padding:20px">Sin deudas registradas</p>`;
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
        ${d.tipoTasa!=="sin_tasa"?`<td style="color:#9aaa9a">${p.tasaAplicada||0}%</td>`:""}
      </tr>`).join("");

    // Cargos pendientes (tarjeta crédito auto)
    const cargosHtml = (d._esTarjetaAuto && d._cargos && d._cargos.filter(c=>!c.pagado).length)
      ? `<div style="margin-top:10px">
          <p style="font-size:12px;color:#ff8c00;font-weight:700;margin:0 0 6px">⏳ Cargos pendientes de pago:</p>
          ${d._cargos.filter(c=>!c.pagado).sort((a,b)=>new Date(a.fecha)-new Date(b.fecha)).map(c=>`
            <div style="display:flex;justify-content:space-between;background:#f5f7f5;border-radius:9px;padding:8px 11px;margin-bottom:5px;font-size:12px">
              <span style="color:#e2e8f0">${c.fecha} · ${c.desc}</span>
              <span style="color:#ff8c00;font-weight:700">-${fmt(c.valor)}</span>
            </div>`).join("")}
        </div>` : "";

    return `<div style="background:#fff;border-radius:16px;padding:16px;margin-bottom:14px;border:1px solid #e8ede8;border-left:4px solid #e07000">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
        <div>
          <p style="font-weight:700;font-size:15px;margin:0 0 2px">${d.nombre}${d._esTarjetaAuto?" 💳 Tarjeta":""}</p>
          <p style="font-size:12px;color:#9aaa9a;margin:0">${d.tipo} · ${tasaLbl} · Inicio: ${d.fecha}${d.cuotas?` · ${d.cuotas} cuotas`:""}</p>
        </div>
        <div style="text-align:right">
          <p style="font-size:18px;font-weight:800;color:#ff8c00;margin:0">${fmt(sv)}</p>
          <p style="font-size:11px;color:#9aaa9a;margin:0">Saldo pendiente</p>
        </div>
      </div>
      <div style="background:#f5f7f5;border-radius:999px;height:7px;margin:10px 0 4px">
        <div style="width:${pct}%;background:linear-gradient(90deg,#006b1a,#00aa33);height:7px;border-radius:999px"></div>
      </div>
      <p style="font-size:12px;color:#9aaa9a;margin:0 0 10px">${pct}% pagado</p>
      ${cargosHtml}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button onclick="abrirPagoDeuda('${d.id}')" style="background:#22c55e;padding:8px 14px;font-size:13px;border-radius:10px">+ Registrar Pago</button>
        <button onclick="eliminarDeuda('${d.id}')" style="background:#dc2626;padding:8px 14px;font-size:13px;border-radius:10px">🗑</button>
        ${d.pagos.length?`<button onclick="toggleTabla('ta_${d.id}')" style="background:rgba(0,150,50,0.1);padding:8px 14px;font-size:13px;border-radius:10px">📋 Historial</button>`:""}
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

const _pageOrder = ["dashboard","movimientos","inversiones","deudas","estadisticas","configuracion"];

function abrirPagina(id, direction) {
  const current = document.querySelector(".page.active");
  const currentId = current ? current.id : null;

  // Determinar dirección si no fue explícita (para clicks de nav)
  if (!direction && currentId && currentId !== id) {
    const iCurrent = _pageOrder.indexOf(currentId);
    const iNext    = _pageOrder.indexOf(id);
    direction = iNext > iCurrent ? "left" : "right";
  }

  document.querySelectorAll(".page").forEach(p => {
    p.classList.remove("active", "slide-left");
  });

  const p = document.getElementById(id);
  if (p) {
    if (direction === "right") p.classList.add("slide-left");
    p.classList.add("active");
  }

  if (id==="estadisticas") renderEstadisticas();
  if (id==="deudas")       dibujarDeudas();

  // Actualizar estado activo en navs
  document.querySelectorAll(".bottomNav button, #desktopNav button").forEach(btn => {
    btn.classList.remove("nav-active");
  });
  const mBtn = document.getElementById("mnav-" + id);
  const dBtn = document.getElementById("dnav-" + id);
  if (mBtn) mBtn.classList.add("nav-active");
  if (dBtn) dBtn.classList.add("nav-active");
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
     datasets:[{data:[ingF,gasF,deudaNeta],backgroundColor:["#00aa33","#ff4444","#ff8c00"]}]});

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
      {label:"Ingresos",data:ingMes,backgroundColor:"#00aa33",borderRadius:5,borderColor:"#000",borderWidth:1},
      {label:"Gastos",  data:gasMes,backgroundColor:"#ff4444",borderRadius:5,borderColor:"#000",borderWidth:1}
    ]
  },{scales:{x:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}}});

  /* ─ 3. Evolución deuda mensual (línea) ─ */
  dibujarChart("graficaDeuda","line",{
    labels:labMeses,
    datasets:[{label:"Deuda viva",data:deudaMes,borderColor:"#ff8c00",backgroundColor:"rgba(255,140,0,0.15)",fill:true,tension:0.3,pointBackgroundColor:"#ff8c00"}]
  },{scales:{x:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}}});

  /* ─ 4. Gastos por categoría ─ */
  const catMap={};
  movF.forEach(m=>{ if(m.tipo==="gasto") catMap[m.categoria]=(catMap[m.categoria]||0)+m.valor; });
  const colores=["#00aa33","#00c832","#ff4444","#00e5a0","#00b8d4","#ffb300","#ff6b00","#cc00ff"];
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
  },{scales:{x:{stacked:true,ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{stacked:true,ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}}});

  /* ─ 6. Métodos de pago (siempre mensual) ─ */
  const mesMetodos = mesFiltro || new Date().toISOString().substring(0,7);
  const movMetMes = movimientos.filter(m=>m.fecha.startsWith(mesMetodos));
  const metMap={};
  movMetMes.forEach(m=>{ if(m.tipo==="gasto") metMap[m.metodoPago]=(metMap[m.metodoPago]||0)+m.valor; });
  const metLbl = mesFiltro ? "" : ` (${new Date(mesMetodos+"-01").toLocaleDateString("es-CO",{month:"short",year:"2-digit"})})`;
  dibujarChart("graficaMetodos","bar",{
    labels:Object.keys(metMap),
    datasets:[{label:"Gastos"+metLbl,data:Object.values(metMap),backgroundColor:"#00c832",borderRadius:8,borderColor:"#000",borderWidth:1}]
  },{scales:{x:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}}});

  /* ─ 6b. Métodos de pago — acumulado todos los meses (barras por mes apiladas) ─ */
  const metodosTodos=[...new Set(movimientos.filter(m=>m.tipo==="gasto").map(m=>m.metodoPago))];
  dibujarChart("graficaMetodosAcum","bar",{
    labels:labMeses,
    datasets:metodosTodos.map((met,i)=>({
      label:met,
      data:mesesAll.map(mes=>movimientos.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="gasto"&&m.metodoPago===met).reduce((s,m)=>s+m.valor,0)),
      backgroundColor:colores[i%colores.length],borderRadius:4
    }))
  },{scales:{x:{stacked:true,ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{stacked:true,ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}}});

  /* ─ 7. Inversiones ─ */
  const invMap={};
  inversiones.forEach(i=>{ invMap[i.nombre]=valorActualInversion(i); });
  dibujarChart("graficaInversiones","doughnut",{
    labels:Object.keys(invMap),
    datasets:[{data:Object.values(invMap),backgroundColor:colores}]
  });

  /* ─ 7b. Concentración de riesgo por bróker ─ */
  const brokerMap={};
  inversiones.forEach(inv=>{
    const lbl = inv.broker && inv.broker!=="—" && inv.broker!=="" ? inv.broker : "Sin bróker";
    brokerMap[lbl] = (brokerMap[lbl]||0) + valorActualInversion(inv);
  });
  if(Object.keys(brokerMap).length){
    dibujarChart("graficaRiesgoBroker","bar",{
      labels:Object.keys(brokerMap),
      datasets:[{label:"Valor ($)",data:Object.values(brokerMap),backgroundColor:colores.map((c,i)=>colores[i%colores.length]),borderRadius:8}]
    },{indexAxis:"y",scales:{x:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}}});
  }

  /* ─ 8. Fuentes de ingresos (siempre mensual) ─ */
  const mesFuentes = mesFiltro || new Date().toISOString().substring(0,7);
  const movFuentesMes = movimientos.filter(m=>m.fecha.startsWith(mesFuentes));
  const fuenteMap={};
  movFuentesMes.forEach(m=>{
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
      plugins: { legend:{ labels:{ color:"#111811", font:{size:11} } } },
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
    const col=m.tipo==="ingreso"?"#00aa33":m.tipo==="pago_deuda_cuota"?"#ffb300":"#ef4444";
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
    const colores=["#00aa33","#00c832","#ff4444","#00e5a0","#00b8d4","#ffb300","#ff6b00","#cc00ff"];
    const i = Object.keys(catMap).indexOf(cat) % colores.length;
    return `<div style="margin-bottom:9px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
        <span style="color:#e2e8f0">${cat}</span>
        <span style="color:${colores[i]};font-weight:700">$${val.toLocaleString("es-CO")} (${pct}%)</span>
      </div>
      <div style="background:#f5f7f5;border-radius:999px;height:8px">
        <div style="width:${pct}%;background:${colores[i]};height:8px;border-radius:999px;transition:.3s"></div>
      </div></div>`;
  }).join("");

  // Barras métodos pago
  const totalMet = Object.values(metMap).reduce((s,v)=>s+v,0);
  const barrasMetMen = Object.entries(metMap).sort((a,b)=>b[1]-a[1]).map(([met,val],i)=>{
    const pct = totalMet>0?((val/totalMet)*100).toFixed(1):0;
    const cols=["#00aa33","#00c832","#00e5a0","#00b8d4","#ffb300"];
    return `<div style="margin-bottom:9px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
        <span style="color:#e2e8f0">${met}</span>
        <span style="color:${cols[i%cols.length]};font-weight:700">$${val.toLocaleString("es-CO")} (${pct}%)</span>
      </div>
      <div style="background:#f5f7f5;border-radius:999px;height:8px">
        <div style="width:${pct}%;background:${cols[i%cols.length]};height:8px;border-radius:999px"></div>
      </div></div>`;
  }).join("");

  // Datos broker risk
  const brokerMapM={};
  inversiones.forEach(inv=>{
    const lbl=inv.broker&&inv.broker!=="—"&&inv.broker!==""?inv.broker:"Sin bróker";
    brokerMapM[lbl]=(brokerMapM[lbl]||0)+valorActualInversion(inv);
  });
  // Métodos acumulados por mes
  const metTodosM=[...new Set(movimientos.filter(m=>m.tipo==="gasto").map(m=>m.metodoPago))];
  const metAcumDsM=metTodosM.map((met,i)=>({label:met,data:mesesAll.map(mes=>movimientos.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="gasto"&&m.metodoPago===met).reduce((s,m)=>s+m.valor,0)),backgroundColor:["#00aa33","#00c832","#ff4444","#00e5a0","#00b8d4","#ffb300","#ff6b00","#cc00ff"][i%8],borderRadius:4}));

  const html=`<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Informe ${nomMes}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f7f5;color:#111811;padding:18px}
h1{font-size:20px;font-weight:800;background:linear-gradient(90deg,#006b1a,#00aa33);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:3px}
.sub{color:#446644;font-size:12px;margin-bottom:16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:9px;margin-bottom:16px}
.kpi{background:#fff;border-radius:13px;padding:12px 10px;text-align:center;overflow:hidden;min-width:0;border:1.5px solid #e0e8e0;box-shadow:0 2px 8px rgba(0,100,30,0.07)}.kpi .l{font-size:10px;color:#9aaa9a;margin-bottom:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.kpi .v{font-size:14px;font-weight:700;word-break:break-all;overflow-wrap:break-word;line-height:1.3}
.verde{color:#006b1a}.rojo{color:#ff4444}.azul{color:#00aa33}.ambar{color:#ffb300}.purp{color:#00e5a0}
section{margin-bottom:16px;background:#fff;border:1px solid #e8ede8;padding:13px;border-radius:13px}
section h2{font-size:13px;font-weight:700;color:#006b1a;margin-bottom:11px;padding-bottom:6px;border-bottom:1px solid #e8ede8}
table{width:100%;border-collapse:collapse;font-size:11px}th{background:#f5f7f5;padding:6px 8px;text-align:left;color:#446644;font-weight:600}td{padding:6px 8px;border-bottom:1px solid #e8ede8}
.grafGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.grafGrid>div{max-height:190px;overflow:hidden;background:#fff;border:1px solid #e8ede8;border-radius:11px;padding:8px}.grafGrid canvas{max-height:155px!important}
@media(max-width:500px){.grafGrid{grid-template-columns:1fr}.grafGrid>div{max-height:170px}.grafGrid canvas{max-height:145px!important}}</style></head><body>
<h1>🧐📋 Informe Mensual</h1><p class="sub">${nomMes.charAt(0).toUpperCase()+nomMes.slice(1)}</p>
<div class="grid">
  <div class="kpi"><div class="l">💵 Ingresos</div><div class="v verde">$${ingM.toLocaleString("es-CO")}</div></div>
  <div class="kpi"><div class="l">💸 Gastos</div><div class="v rojo">$${gasM.toLocaleString("es-CO")}</div></div>
  <div class="kpi"><div class="l">🏦 Saldo</div><div class="v azul">$${(ingM-gasM-pagM).toLocaleString("es-CO")}</div></div>
  <div class="kpi"><div class="l">💳 Pagos deuda</div><div class="v ambar">$${pagM.toLocaleString("es-CO")}</div></div>
  <div class="kpi"><div class="l">📈 Tasa ahorro</div><div class="v purp">${ingM>0?((((ingM-gasM-pagM)/ingM)*100).toFixed(1)):0}%</div></div>
</div>
<section><h2>📈 Gráficas del mes</h2>
<div class="grafGrid">
  <div><p style="text-align:center;font-size:10px;color:#9aaa9a;margin-bottom:5px">Ingresos vs Gastos histórico</p><canvas id="cMen"></canvas></div>
  <div><p style="text-align:center;font-size:10px;color:#9aaa9a;margin-bottom:5px">Distribución de Gastos</p><canvas id="cCat"></canvas></div>
  <div><p style="text-align:center;font-size:10px;color:#9aaa9a;margin-bottom:5px">Métodos de Pago (este mes)</p><canvas id="cMet"></canvas></div>
  <div><p style="text-align:center;font-size:10px;color:#9aaa9a;margin-bottom:5px">Métodos de Pago — Acumulado</p><canvas id="cMetAcum"></canvas></div>
  <div><p style="text-align:center;font-size:10px;color:#9aaa9a;margin-bottom:5px">Fuentes de Ingreso</p><canvas id="cFuentes"></canvas></div>
  <div><p style="text-align:center;font-size:10px;color:#9aaa9a;margin-bottom:5px">Portafolio Inversiones</p><canvas id="cInv"></canvas></div>
  <div style="grid-column:1/-1"><p style="text-align:center;font-size:10px;color:#9aaa9a;margin-bottom:5px">Concentración Riesgo por Bróker</p><canvas id="cBroker" style="max-height:160px"></canvas></div>
</div></section>
<section><h2>📉 % Gasto por Categoría</h2>${barrasCatMen}</section>
<section><h2>💳 % por Método de Pago</h2>${barrasMetMen}</section>
<section><h2>Movimientos del mes</h2>
<table><thead><tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Método</th><th>Valor</th></tr></thead>
<tbody>${filas}</tbody></table></section>
<script>
const cl=["#00aa33","#00c832","#ff4444","#00e5a0","#00b8d4","#ffb300","#ff6b00","#cc00ff"];
const opts={responsive:true,plugins:{legend:{labels:{color:"#e2e8f0",font:{size:10}}}}};
new Chart(document.getElementById("cMen"),{type:"bar",data:{labels:${JSON.stringify(labAll)},datasets:[{label:"Ingresos",data:${JSON.stringify(ingAll)},backgroundColor:"#00aa33",borderRadius:4},{label:"Gastos",data:${JSON.stringify(gasAll)},backgroundColor:"#ff4444",borderRadius:4,borderColor:"#000",borderWidth:1}]},options:{...opts,scales:{x:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}}}});
new Chart(document.getElementById("cCat"),{type:"doughnut",data:{labels:${JSON.stringify(Object.keys(catMap))},datasets:[{data:${JSON.stringify(Object.values(catMap))},backgroundColor:cl}]},options:opts});
new Chart(document.getElementById("cMet"),{type:"bar",data:{labels:${JSON.stringify(Object.keys(metMap))},datasets:[{label:"Gastos",data:${JSON.stringify(Object.values(metMap))},backgroundColor:"#00c832",borderRadius:4,borderColor:"#000",borderWidth:1}]},options:{...opts,scales:{x:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}}}});
new Chart(document.getElementById("cMetAcum"),{type:"bar",data:{labels:${JSON.stringify(labAll)},datasets:${JSON.stringify(metAcumDsM)}},options:{...opts,scales:{x:{stacked:true,ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{stacked:true,ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}}}});
new Chart(document.getElementById("cFuentes"),{type:"doughnut",data:{labels:${JSON.stringify(Object.keys(fuentesM))},datasets:[{data:${JSON.stringify(Object.values(fuentesM))},backgroundColor:cl}]},options:opts});
${inversiones.length?`new Chart(document.getElementById("cInv"),{type:"doughnut",data:{labels:${JSON.stringify(inversiones.map(i=>i.nombre))},datasets:[{data:${JSON.stringify(inversiones.map(i=>valorActualInversion(i)))},backgroundColor:cl}]},options:opts});`:""}
${Object.keys(brokerMapM).length?`new Chart(document.getElementById("cBroker"),{type:"bar",data:{labels:${JSON.stringify(Object.keys(brokerMapM))},datasets:[{label:"Valor ($)",data:${JSON.stringify(Object.values(brokerMapM))},backgroundColor:cl,borderRadius:8}]},options:{...opts,indexAxis:"y",scales:{x:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}}}});`:""}
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
  const colores=["#00aa33","#00c832","#ff4444","#00e5a0","#00b8d4","#ffb300","#ff6b00","#cc00ff"];

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
  // Broker risk
  const brokerMapG={};
  inversiones.forEach(inv=>{const lbl=inv.broker&&inv.broker!=="—"&&inv.broker!==""?inv.broker:"Sin bróker";brokerMapG[lbl]=(brokerMapG[lbl]||0)+valorActualInversion(inv);});
  // Métodos acumulados por mes
  const metTodosG=[...new Set(movimientos.filter(m=>m.tipo==="gasto").map(m=>m.metodoPago))];
  const metAcumDsG=metTodosG.map((met,i)=>({label:met,data:mesesAll.map(mes=>movimientos.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="gasto"&&m.metodoPago===met).reduce((s,m)=>s+m.valor,0)),backgroundColor:["#00aa33","#00c832","#ff4444","#00e5a0","#00b8d4","#ffb300","#ff6b00","#cc00ff"][i%8],borderRadius:4}));

  // ── Barras horizontales categorías ──
  const gasTotal=Object.values(catMap).reduce((s,v)=>s+v,0);
  const barrasCat=Object.entries(catMap).sort((a,b)=>b[1]-a[1]).map(([cat,val],i)=>{
    const pct=gasTotal>0?((val/gasTotal)*100).toFixed(1):0;
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
        <span>${cat}</span><span style="color:${colores[i%colores.length]};font-weight:700">$${val.toLocaleString("es-CO")} (${pct}%)</span>
      </div>
      <div style="background:#f5f7f5;border-radius:999px;height:8px">
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
      <div style="background:#f5f7f5;border-radius:999px;height:8px">
        <div style="width:${pct}%;background:${colores[i%colores.length]};height:8px;border-radius:999px"></div>
      </div></div>`;
  }).join("");

  // ── Tablas inversiones ──
  const filasInv=inversiones.map(inv=>{
    const va=valorActualInversion(inv),ci=capitalInvertido(inv),gan=va-ci;
    return `<tr><td>${inv.tipo}</td><td>${inv.nombre}</td><td>$${ci.toLocaleString("es-CO")}</td><td>$${va.toLocaleString("es-CO")}</td><td style="color:${gan>=0?"#00aa33":"#ef4444"}">${gan>=0?"+":""}$${Math.abs(gan).toLocaleString("es-CO")}</td></tr>`;
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
      `<p style="font-size:12px;color:#ff8c00;margin:8px 0 4px;font-weight:700">⏳ Cargos pendientes:</p>
       ${d._cargos.filter(c=>!c.pagado).map(c=>`<div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;border-bottom:1px solid #e8ede8"><span>${c.fecha} · ${c.desc}</span><span style="color:#e07000">-$${c.valor.toLocaleString("es-CO")}</span></div>`).join("")}`:"";
    return `<div style="margin-bottom:16px;border-left:3px solid #e07000;padding-left:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div><p style="font-weight:700;font-size:13px;margin:0">${d.nombre}${d._esTarjetaAuto?" 💳":""}</p>
        <p style="font-size:11px;color:#446644;margin:0">${tasaLbl} · ${d.cuotas?d.cuotas+" cuotas":""}</p></div>
        <div style="text-align:right"><p style="font-size:15px;font-weight:800;color:#ff8c00;margin:0">$${sv.toLocaleString("es-CO")}</p>
        <p style="font-size:10px;color:#446644;margin:0">${pct}% pagado</p></div>
      </div>
      <div style="background:#f5f7f5;border-radius:999px;height:6px;margin-bottom:8px">
        <div style="width:${pct}%;background:linear-gradient(90deg,#006b1a,#00aa33);height:6px;border-radius:999px"></div>
      </div>
      ${cargosHtml}
      ${d.pagos.length?`<p style="font-size:11px;color:#9aaa9a;margin:8px 0 4px;font-weight:600">Tabla de amortización:</p>
      <table style="font-size:11px"><thead><tr><th>Fecha</th><th>Cuota</th><th>Interés</th><th>Capital</th></tr></thead><tbody>${filasAmort}</tbody></table>`:""}
    </div>`;
  }).join("");

  const html=`<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Estado General</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f5f7f5;color:#111811;padding:18px}
h1{font-size:20px;font-weight:800;background:linear-gradient(90deg,#006b1a,#00aa33);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:3px}
.sub{color:#446644;font-size:12px;margin-bottom:16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:9px;margin-bottom:16px}
.kpi{background:#fff;border-radius:13px;padding:12px 10px;text-align:center;overflow:hidden;min-width:0;border:1.5px solid #e0e8e0;box-shadow:0 2px 8px rgba(0,100,30,0.07)}.kpi .l{font-size:10px;color:#9aaa9a;margin-bottom:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.kpi .v{font-size:14px;font-weight:700;word-break:break-all;overflow-wrap:break-word;line-height:1.3}
.verde{color:#006b1a}.rojo{color:#ff4444}.azul{color:#00aa33}.purp{color:#00e5a0}.ambar{color:#ffb300}
section{margin-bottom:16px;background:#fff;border:1px solid #e8ede8;padding:13px;border-radius:13px}
section h2{font-size:13px;font-weight:700;color:#006b1a;margin-bottom:11px;padding-bottom:6px;border-bottom:1px solid #e8ede8}
table{width:100%;border-collapse:collapse;font-size:11px}th{background:#f5f7f5;padding:6px 8px;text-align:left;color:#446644;font-weight:600}td{padding:6px 8px;border-bottom:1px solid #e8ede8}
.grafGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:12px}.grafGrid>div{max-height:190px;overflow:hidden;background:#fff;border:1px solid #e8ede8;border-radius:11px;padding:8px}.grafGrid canvas{max-height:155px!important}
@media(max-width:500px){.grafGrid{grid-template-columns:1fr}.grafGrid>div{max-height:170px}.grafGrid canvas{max-height:145px!important}}
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
  <div class="kpi"><div class="l">🛡️ Tasa ahorro</div><div class="v purp">${T.ingresos>0?((T.saldoCaja/T.ingresos)*100).toFixed(1):0}%</div></div>
</div>
<section><h2>📈 Gráficas generales</h2>
<div class="grafGrid">
  <div><p style="font-size:10px;color:#9aaa9a;text-align:center;margin-bottom:5px">Ingresos vs Gastos por mes</p><canvas id="gMen"></canvas></div>
  <div><p style="font-size:10px;color:#9aaa9a;text-align:center;margin-bottom:5px">Evolución Deuda</p><canvas id="gDeu"></canvas></div>
  <div><p style="font-size:10px;color:#9aaa9a;text-align:center;margin-bottom:5px">Distribución Gastos</p><canvas id="gCat"></canvas></div>
  <div><p style="font-size:10px;color:#9aaa9a;text-align:center;margin-bottom:5px">Fuentes de Ingreso</p><canvas id="gFuentes"></canvas></div>
  <div><p style="font-size:10px;color:#9aaa9a;text-align:center;margin-bottom:5px">Portafolio Inversiones</p><canvas id="gInv"></canvas></div>
  <div><p style="font-size:10px;color:#9aaa9a;text-align:center;margin-bottom:5px">Métodos de Pago (acum.)</p><canvas id="gMet"></canvas></div>
  <div style="grid-column:1/-1"><p style="font-size:10px;color:#9aaa9a;text-align:center;margin-bottom:5px">Concentración Riesgo por Bróker</p><canvas id="gBroker" style="max-height:160px"></canvas></div>
</div></section>
<section><h2>📉 % Gasto por Categoría</h2>${barrasCat}</section>
<section><h2>💳 % por Método de Pago</h2>${barrasMet}</section>
${inversiones.length?`<section><h2>📈 Inversiones</h2><table><thead><tr><th>Tipo</th><th>Nombre</th><th>Invertido</th><th>Actual</th><th>Ganancia</th></tr></thead><tbody>${filasInv}</tbody></table></section>`:""}
${deudas.length?`<section><h2>💳 Deudas & Amortización</h2>${seccionesDeuda}</section>`:""}
<script>
const cl=${JSON.stringify(colores)};
const opts={responsive:true,plugins:{legend:{labels:{color:"#e2e8f0",font:{size:10}}}}};
new Chart(document.getElementById("gMen"),{type:"bar",data:{labels:${JSON.stringify(labAll)},datasets:[{label:"Ingresos",data:${JSON.stringify(ingAll)},backgroundColor:"#00aa33",borderRadius:4},{label:"Gastos",data:${JSON.stringify(gasAll)},backgroundColor:"#ff4444",borderRadius:4,borderColor:"#000",borderWidth:1}]},options:{...opts,scales:{x:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}}}});
new Chart(document.getElementById("gDeu"),{type:"line",data:{labels:${JSON.stringify(labAll)},datasets:[{label:"Deuda viva",data:${JSON.stringify(deudaAll)},borderColor:"#ff8c00",backgroundColor:"rgba(255,140,0,0.15)",fill:true,tension:0.3}]},options:{...opts,scales:{x:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}}}});
new Chart(document.getElementById("gCat"),{type:"doughnut",data:{labels:${JSON.stringify(Object.keys(catMap))},datasets:[{data:${JSON.stringify(Object.values(catMap))},backgroundColor:cl}]},options:opts});
new Chart(document.getElementById("gFuentes"),{type:"doughnut",data:{labels:${JSON.stringify(Object.keys(fuentesAll))},datasets:[{data:${JSON.stringify(Object.values(fuentesAll))},backgroundColor:cl}]},options:opts});
new Chart(document.getElementById("gInv"),{type:"doughnut",data:{labels:${JSON.stringify(Object.keys(invMap))},datasets:[{data:${JSON.stringify(Object.values(invMap))},backgroundColor:cl}]},options:opts});
new Chart(document.getElementById("gMet"),{type:"bar",data:{labels:${JSON.stringify(labAll)},datasets:${JSON.stringify(metAcumDsG)}},options:{...opts,scales:{x:{stacked:true,ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{stacked:true,ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}}}});
${Object.keys(brokerMapG).length?`new Chart(document.getElementById("gBroker"),{type:"bar",data:{labels:${JSON.stringify(Object.keys(brokerMapG))},datasets:[{label:"Valor ($)",data:${JSON.stringify(Object.values(brokerMapG))},backgroundColor:cl,borderRadius:8}]},options:{...opts,indexAxis:"y",scales:{x:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}},y:{ticks:{color:"#9aaa9a"},grid:{color:"#e8ede8"}}}}});`:""}
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
  const pat=T.saldoCaja+valorInv-dn;

  const libro=XLSX.utils.book_new();

  /* ── Hoja 1: Movimientos ── */
  XLSX.utils.book_append_sheet(libro,XLSX.utils.json_to_sheet(movF.map(m=>({
    Fecha:m.fecha,Descripcion:m.descripcion||m.desc,Tipo:m.tipo,
    Categoria:m.categoria||"",Subcategoria:m.subcategoria||"",
    MetodoPago:m.metodoPago||"",Valor:m.valor,
    EsCredito:m.esCredito?"Sí":"No"
  }))),"Movimientos");

  /* ── Hoja 2: Estado de Resultados (P&G) ── */
  const mesesAll=[...new Set(movimientos.map(m=>m.fecha.substring(0,7)))].sort();
  const filasResultados=[];
  filasResultados.push({Concepto:"═══ ESTADO DE RESULTADOS ═══",Valor:""});
  filasResultados.push({Concepto:"",Valor:""});
  let totI=0,totG=0,totP=0;
  mesesAll.forEach(mes=>{
    let i=0,g=0,p=0;
    movimientos.filter(m=>m.fecha.startsWith(mes)).forEach(m=>{
      if(m.tipo==="ingreso") i+=m.valor;
      else if(m.tipo==="gasto") g+=m.valor;
      else if(m.tipo==="pago_deuda_cuota") p+=m.valor;
    });
    const [a,mo]=mes.split("-");
    const nomM=new Date(Number(a),Number(mo)-1,1).toLocaleDateString("es-CO",{month:"long",year:"numeric"});
    filasResultados.push({Concepto:`── ${nomM} ──`,Valor:""});
    filasResultados.push({Concepto:"  Ingresos",Valor:i});
    filasResultados.push({Concepto:"  Gastos",Valor:-g});
    filasResultados.push({Concepto:"  Pagos deuda",Valor:-p});
    filasResultados.push({Concepto:"  Resultado neto",Valor:i-g-p});
    filasResultados.push({Concepto:"",Valor:""});
    totI+=i; totG+=g; totP+=p;
  });
  filasResultados.push({Concepto:"═══ TOTALES ═══",Valor:""});
  filasResultados.push({Concepto:"TOTAL Ingresos",Valor:totI});
  filasResultados.push({Concepto:"TOTAL Gastos",Valor:-totG});
  filasResultados.push({Concepto:"TOTAL Pagos deuda",Valor:-totP});
  filasResultados.push({Concepto:"RESULTADO NETO",Valor:totI-totG-totP});
  XLSX.utils.book_append_sheet(libro,XLSX.utils.json_to_sheet(filasResultados),"Estado de Resultados");

  /* ── Hoja 3: Balance General ── */
  const filasBalance=[];
  filasBalance.push({Seccion:"═══ BALANCE GENERAL ═══",Concepto:"",Valor:""});
  filasBalance.push({Seccion:"",Concepto:"",Valor:""});
  filasBalance.push({Seccion:"ACTIVOS",Concepto:"Saldo en Caja",Valor:T.saldoCaja});
  let totActInv=0;
  inversiones.forEach(inv=>{
    const va=valorActualInversion(inv);
    filasBalance.push({Seccion:"ACTIVOS",Concepto:`Inversión: ${inv.nombre} (${inv.tipo})`,Valor:va});
    totActInv+=va;
  });
  filasBalance.push({Seccion:"ACTIVOS",Concepto:"TOTAL ACTIVOS",Valor:T.saldoCaja+totActInv});
  filasBalance.push({Seccion:"",Concepto:"",Valor:""});
  deudas.forEach(d=>{
    filasBalance.push({Seccion:"PASIVOS",Concepto:`Deuda: ${d.nombre} (${d.tipo})`,Valor:-saldoVivo(d)});
  });
  filasBalance.push({Seccion:"PASIVOS",Concepto:"TOTAL PASIVOS",Valor:-dn});
  filasBalance.push({Seccion:"",Concepto:"",Valor:""});
  filasBalance.push({Seccion:"PATRIMONIO",Concepto:"PATRIMONIO NETO",Valor:pat});
  XLSX.utils.book_append_sheet(libro,XLSX.utils.json_to_sheet(filasBalance),"Balance General");

  /* ── Hoja 4: Flujo de Caja ── */
  const filasFlujo=[];
  filasFlujo.push({Concepto:"═══ FLUJO DE CAJA ═══",Valor:""});
  filasFlujo.push({Concepto:"",Valor:""});
  let saldoAcum=0;
  mesesAll.forEach(mes=>{
    let i=0,g=0,p=0,ti=0;
    movimientos.filter(m=>m.fecha.startsWith(mes)).forEach(m=>{
      if(m.tipo==="ingreso") i+=m.valor;
      else if(m.tipo==="gasto"&&!m.esCredito) g+=m.valor;
      else if(m.tipo==="pago_deuda_cuota") p+=m.valor;
      else if(m.tipo==="traslado_inversion") ti+=m.valor;
    });
    const [a,mo]=mes.split("-");
    const nomM=new Date(Number(a),Number(mo)-1,1).toLocaleDateString("es-CO",{month:"long",year:"numeric"});
    saldoAcum+=i-g-p-ti;
    filasFlujo.push({Concepto:`── ${nomM} ──`,Valor:""});
    filasFlujo.push({Concepto:"  (+) Ingresos",Valor:i});
    filasFlujo.push({Concepto:"  (-) Gastos caja",Valor:-g});
    filasFlujo.push({Concepto:"  (-) Pagos deuda",Valor:-p});
    filasFlujo.push({Concepto:"  (-) Traslados inversión",Valor:-ti});
    filasFlujo.push({Concepto:"  Flujo neto del mes",Valor:i-g-p-ti});
    filasFlujo.push({Concepto:"  Saldo acumulado",Valor:saldoAcum});
    filasFlujo.push({Concepto:"",Valor:""});
  });
  XLSX.utils.book_append_sheet(libro,XLSX.utils.json_to_sheet(filasFlujo),"Flujo de Caja");

  /* ── Hoja 5: Inversiones ── */
  XLSX.utils.book_append_sheet(libro,XLSX.utils.json_to_sheet(inversiones.map(inv=>{
    const va=valorActualInversion(inv),ci=capitalInvertido(inv);
    return{Tipo:inv.tipo,Nombre:inv.nombre,Broker:inv.broker||"—",Invertido:ci,ValorActual:va,
           Ganancia:va-ci,PctGanancia:ci>0?((va-ci)/ci*100).toFixed(2)+"%":"—",Origen:inv.origen};
  })),"Inversiones");

  /* ── Hoja 6: Deudas (resumen) ── */
  XLSX.utils.book_append_sheet(libro,XLSX.utils.json_to_sheet(deudas.map(d=>({
    Nombre:d.nombre,Tipo:d.tipo,CapitalOriginal:d.capital,SaldoVivo:saldoVivo(d),
    TotalPagado:d.pagos.reduce((s,p)=>s+(p.capitalPagado||0),0),
    TotalInteres:d.pagos.reduce((s,p)=>s+(p.interes||0),0),
    TipoTasa:d.tipoTasa,TasaMensual:d.tasaFija||0,Cuotas:d.cuotas||0,NumeroPagos:d.pagos.length
  }))),"Deudas");

  /* ── Hojas 7+: Amortización por deuda ── */
  deudas.forEach(d=>{
    if(d.pagos && d.pagos.length){
      const nombreHoja=`Amort. ${d.nombre}`.substring(0,31);
      const filasAmort=d.pagos.map((p,i)=>({
        "#":i+1,Fecha:p.fecha,CuotaTotal:p.cuota,
        Capital:p.capitalPagado||0,Interes:p.interes||0,
        TasaAplicada:(p.tasaAplicada||0)+"%",
        SaldoRestante:Math.max(0,d.capital-d.pagos.slice(0,i+1).reduce((s,pp)=>s+(pp.capitalPagado||0),0))
      }));
      XLSX.utils.book_append_sheet(libro,XLSX.utils.json_to_sheet(filasAmort),nombreHoja);
    }
  });

  /* ── Estado Actual (resumen rápido) ── */
  XLSX.utils.book_append_sheet(libro,XLSX.utils.json_to_sheet([
    {Concepto:"Ingresos totales",Valor:T.ingresos},
    {Concepto:"Gastos caja",Valor:T.gastos},
    {Concepto:"Pagos deuda",Valor:T.pagosDeuda},
    {Concepto:"Traslados inversión",Valor:T.trasladosInv},
    {Concepto:"Saldo caja",Valor:T.saldoCaja},
    {Concepto:"Valor inversiones",Valor:valorInv},
    {Concepto:"Deuda neta",Valor:dn},
    {Concepto:"Patrimonio",Valor:pat},
    {Concepto:"Tasa de ahorro",Valor:T.ingresos>0?((T.saldoCaja/T.ingresos)*100).toFixed(1)+"%":"0%"}
  ]),"Resumen Ejecutivo");

  XLSX.writeFile(libro,todo?"finanzas_completo.xlsx":`finanzas_${selArr.join("_")}.xlsx`);
}

/* ════════════════════════════════
   SWIPE NAVIGATION
   ════════════════════════════════ */
(function(){
  const paginas = ["dashboard","movimientos","inversiones","deudas","estadisticas","configuracion"];
  let touchStartX = 0, touchStartY = 0;

  // ── Swipe suave tipo Instagram ──
  let _swipeStartX=0, _swipeStartY=0, _swiping=false;

  document.addEventListener("touchstart", e => {
    _swipeStartX = e.changedTouches[0].clientX;
    _swipeStartY = e.changedTouches[0].clientY;
    _swiping = false;
  }, { passive: true });

  document.addEventListener("touchmove", e => {
    const dx = e.changedTouches[0].clientX - _swipeStartX;
    const dy = e.changedTouches[0].clientY - _swipeStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 15) _swiping = true;
  }, { passive: true });

  document.addEventListener("touchend", e => {
    if (!_swiping) return;
    const dx = e.changedTouches[0].clientX - _swipeStartX;
    const dy = e.changedTouches[0].clientY - _swipeStartY;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy)*1.4) return;

    const activa = document.querySelector(".page.active");
    if (!activa) return;
    const idx = paginas.indexOf(activa.id);
    if (idx === -1) return;

    if (dx < 0 && idx < paginas.length-1) {
      abrirPagina(paginas[idx+1], "left");   // desliza izquierda → página siguiente
    } else if (dx > 0 && idx > 0) {
      abrirPagina(paginas[idx-1], "right");  // desliza derecha → página anterior
    }
    _swiping = false;
  }, { passive: true });
})();



// Inicializar formulario de movimientos
if (document.getElementById("tipo")) actualizarTipoMovimiento();

/* ── INICIO: verificar sesión, luego cargar ── */
(async () => {
  const sesionActiva = await restaurarSesion();
  if (sesionActiva) {
    mostrarApp();
    cargarDatos();
  } else {
    mostrarPantallaAuth();
  }
})();

/* ─── CAMBIAR NOMBRE DE PERFIL ─── */
function abrirModalNombre() {
  const actual = localStorage.getItem("sb_displayName") || "";
  document.getElementById("inputNombreNuevo").value = actual;
  document.getElementById("modalNombre").style.display = "flex";
}
function guardarNombre() {
  const n = document.getElementById("inputNombreNuevo").value.trim();
  if (!n) return;
  localStorage.setItem("sb_displayName", n);
  const el = document.getElementById("userName");
  if (el) el.textContent = n;
  document.getElementById("modalNombre").style.display = "none";
}