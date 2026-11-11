// Fremec · Conteo — modo DEMO para GitHub Pages (sin servidor).
// Reproduce la API de server.js dentro del navegador; los datos quedan en localStorage de cada navegador.
'use strict';
window.DEMO = true;
(function () {
  const KEY = 'fremec-conteo-db-v1', SID = 'fremec-conteo-sid';
  const PRODUCTOS = window.PRODUCTOS_FREMEC || [];
  const CLIENTES = [
    'Repuestos Avellaneda SRL', 'Distribuidora del Litoral', 'Frenos Rosario', 'Autopartes Cuyo SA',
    'Casa Bertolini Repuestos', 'El Mundo del Cable', 'Lubricentro Ruta 9', 'Mayorista Norte Autopartes',
    'Repuestos San Justo', 'Comercial Pampa Sur', 'Autopartes Córdoba Centro', 'Todo Freno Mar del Plata',
  ];
  const DIA = 86400000;
  const rid = () => Math.random().toString(16).slice(2, 14).padEnd(12, '0');
  const alea = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const elegir = arr => arr[Math.floor(Math.random() * arr.length)];
  const redondo = n => Math.max(5, Math.round(n / 5) * 5);
  const hoyISO = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  // ---------- datos de prueba (igual que seed.js) ----------
  function nuevaNV(db, { prueba = false, cliente, fecha = new Date() } = {}) {
    const n = prueba ? 1 : alea(2, 6), usados = new Set(), items = [];
    while (items.length < n) {
      const p = elegir(PRODUCTOS); if (usados.has(p)) continue; usados.add(p);
      items.push({ producto: p, cantidad: prueba ? alea(1, 3) : redondo(alea(15, 160)), remitido: 0 });
    }
    return { id: rid(), numero: db.config.nextNv++, cliente: cliente || elegir(CLIENTES), fecha: new Date(fecha).toISOString(),
      estado: 'pendiente', origen: prueba ? 'Presea · nota para imprimir etiquetas' : 'Presea', items, aprobadaEn: null, cerradaEn: null };
  }
  function finDeJornada(diasAtras, min = 0) { const d = new Date(Date.now() - diasAtras * DIA); d.setHours(16, 40 + min, 0, 0); return d; }
  const esHabil = d => d.getDay() !== 0 && d.getDay() !== 6;
  function crear() {
    const db = {
      config: { modo: 'completo', aprobacionObligatoria: true, diasRetencion: 3, nextNv: 24571, nextRemito: 8812 },
      usuarios: [
        { id: rid(), nombre: 'Julieta', apellido: 'Nuñez', usuario: 'julieta', clave: 'fremec', rol: 'admin', sector: 'Administración', activo: true },
        { id: rid(), nombre: 'Gastón', apellido: 'Molina', usuario: 'gmolina', clave: '1234', rol: 'operario', sector: 'Cables de freno', activo: true },
        { id: rid(), nombre: 'Santiago', apellido: 'Ríos', usuario: 'srios', clave: '1234', rol: 'operario', sector: 'Flexibles', activo: true },
        { id: rid(), nombre: 'Lucía', apellido: 'Pérez', usuario: 'lperez', clave: '1234', rol: 'operario', sector: 'Envasado', activo: true },
        { id: rid(), nombre: 'Matías', apellido: 'Gómez', usuario: 'mgomez', clave: '1234', rol: 'operario', sector: 'Envasado', activo: true },
      ],
      nvs: [], cargas: [], alertas: [], remitos: [],
    };
    const ops = db.usuarios.filter(u => u.rol === 'operario');
    for (let d = 14; d >= 1; d--) {
      const dia = new Date(Date.now() - d * DIA);
      if (!esHabil(dia)) continue;
      const nvsDia = [];
      for (let k = 0; k < alea(1, 3); k++) {
        const nv = nuevaNV(db, { fecha: new Date(dia.setHours(9 + k, 15)) });
        nv.estado = 'aprobada'; nv.aprobadaEn = nv.fecha; db.nvs.push(nv); nvsDia.push(nv);
      }
      for (const nv of nvsDia) {
        const total = nv.items.reduce((a, i) => a + i.cantidad, 0);
        let resto = total;
        const quienes = [...ops].sort(() => Math.random() - 0.5).slice(0, alea(1, 3));
        quienes.forEach((op, i) => {
          const u = i === quienes.length - 1 ? resto : Math.round(resto * (0.35 + Math.random() * 0.3));
          resto -= u;
          if (u > 0) db.cargas.push({ id: rid(), usuarioId: op.id, fecha: finDeJornada(d, i * 4).toISOString(), nvId: nv.id, cliente: nv.cliente, unidades: u });
        });
        nv.items.forEach(i => { i.remitido = i.cantidad; });
        db.remitos.push({ id: rid(), numero: 'R-' + String(db.config.nextRemito++).padStart(6, '0'), nvId: nv.id, nvNumero: nv.numero, cliente: nv.cliente,
          fecha: new Date(Date.now() - (d - 1) * DIA).toISOString(), items: nv.items.map(i => ({ producto: i.producto, cantidad: i.cantidad })), total });
        nv.estado = 'cerrada'; nv.cerradaEn = new Date(Date.now() - (d - 1) * DIA - 3 * 3600e3).toISOString();
      }
    }
    const abiertas = ['Repuestos Avellaneda SRL', 'Frenos Rosario', 'Autopartes Cuyo SA', 'El Mundo del Cable', 'Mayorista Norte Autopartes', 'Distribuidora del Litoral']
      .map((c, i) => { const nv = nuevaNV(db, { cliente: c, fecha: Date.now() - (6 - i) * 3600e3 }); nv.estado = 'aprobada'; nv.aprobadaEn = nv.fecha; db.nvs.push(nv); return nv; });
    const parcial = abiertas[1];
    parcial.items.forEach((i, k) => { if (k === 0) i.remitido = Math.round(i.cantidad * 0.6); });
    db.remitos.push({ id: rid(), numero: 'R-' + String(db.config.nextRemito++).padStart(6, '0'), nvId: parcial.id, nvNumero: parcial.numero, cliente: parcial.cliente,
      fecha: new Date(Date.now() - 2 * 3600e3).toISOString(), items: [{ producto: parcial.items[0].producto, cantidad: parcial.items[0].remitido }], total: parcial.items[0].remitido });
    const facturada = nuevaNV(db, { cliente: 'Repuestos San Justo', fecha: Date.now() - 5 * 3600e3 });
    facturada.estado = 'cerrada'; facturada.aprobadaEn = facturada.fecha; facturada.cerradaEn = new Date(Date.now() - 1 * 3600e3).toISOString();
    facturada.items.forEach(i => { i.remitido = i.cantidad; });
    db.nvs.push(facturada);
    db.nvs.push(nuevaNV(db, { cliente: 'Comercial Pampa Sur', fecha: Date.now() - 40 * 60e3 }));
    db.nvs.push(nuevaNV(db, { prueba: true, cliente: 'Casa Bertolini Repuestos', fecha: Date.now() - 25 * 60e3 }));
    if (esHabil(new Date())) {
      const t = new Date(Math.min(Date.now() - 5 * 60e3, new Date().setHours(12, 30, 0, 0)));
      db.cargas.push({ id: rid(), usuarioId: ops[0].id, fecha: t.toISOString(), nvId: abiertas[0].id, cliente: abiertas[0].cliente, unidades: 60 });
      db.cargas.push({ id: rid(), usuarioId: ops[2].id, fecha: t.toISOString(), nvId: abiertas[2].id, cliente: abiertas[2].cliente, unidades: 45 });
    }
    return db;
  }

  // ---------- almacenamiento ----------
  let mem = null;
  function leer() {
    try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch {}
    return mem;
  }
  let db = leer();
  if (!db) { db = crear(); guardar(); }
  function guardar() { mem = db; try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} }
  function recargar() { const d = leer(); if (d) db = d; } // otra pestaña pudo cambiar los datos
  const sid = { get: () => { try { return localStorage.getItem(SID); } catch { return sid._m; } },
    set: v => { sid._m = v; try { v ? localStorage.setItem(SID, v) : localStorage.removeItem(SID); } catch {} } };

  // ---------- cálculos (igual que server.js) ----------
  function nvTotales(nv) {
    const total = nv.items.reduce((a, i) => a + i.cantidad, 0);
    const remitido = nv.items.reduce((a, i) => a + i.remitido, 0);
    const envasado = db.cargas.filter(c => c.nvId === nv.id).reduce((a, c) => a + c.unidades, 0);
    return { total, remitido, pendiente: total - remitido, envasado, itemsPendientes: nv.items.filter(i => i.cantidad - i.remitido > 0).length };
  }
  function visibleHasta(nv) {
    if (nv.estado !== 'cerrada' || !nv.cerradaEn) return null;
    return new Date(new Date(nv.cerradaEn).getTime() + db.config.diasRetencion * DIA).toISOString();
  }
  const nvPublica = nv => ({ ...nv, ...nvTotales(nv), visibleHasta: visibleHasta(nv) });
  function nvsSeleccionables() {
    const ahora = Date.now();
    return db.nvs.filter(nv => nv.estado === 'aprobada' || (nv.estado === 'cerrada' && new Date(visibleHasta(nv)).getTime() > ahora));
  }
  function nombreDe(uid) { const u = db.usuarios.find(x => x.id === uid); return u ? `${u.nombre} ${u.apellido}` : '—'; }
  function revisarExceso(nv) {
    const t = nvTotales(nv);
    if (t.envasado <= t.total) return null;
    const abierta = db.alertas.find(a => a.nvId === nv.id && !a.resuelta);
    const quienes = [...new Set(db.cargas.filter(c => c.nvId === nv.id).map(c => nombreDe(c.usuarioId)))];
    const msg = `Se cargaron ${t.envasado} u. para la NV ${nv.numero} (${nv.cliente}) y la nota es de ${t.total} u.`;
    if (abierta) { Object.assign(abierta, { mensaje: msg, envasado: t.envasado, fecha: new Date().toISOString(), operarios: quienes }); return abierta; }
    const a = { id: rid(), fecha: new Date().toISOString(), tipo: 'excede', nvId: nv.id, numero: nv.numero, cliente: nv.cliente,
      total: t.total, envasado: t.envasado, operarios: quienes, mensaje: msg, resuelta: false };
    db.alertas.unshift(a);
    return a;
  }
  function seriePorDia(dias) {
    const out = [];
    for (let i = dias - 1; i >= 0; i--) {
      const f = hoyISO(new Date(Date.now() - i * DIA));
      out.push({ fecha: f, unidades: db.cargas.filter(c => hoyISO(new Date(c.fecha)) === f).reduce((a, c) => a + c.unidades, 0) });
    }
    return out;
  }
  const usuarioPublico = u => ({ id: u.id, nombre: u.nombre, apellido: u.apellido, usuario: u.usuario, rol: u.rol, sector: u.sector, activo: u.activo });
  const diaDe = c => hoyISO(new Date(c.fecha));

  class Err extends Error { constructor(code, msg) { super(msg); this.code = code; } }
  const E = (code, msg) => { throw new Err(code, msg); };

  // ---------- rutas ----------
  const rutas = [];
  const ruta = (metodo, patron, rol, fn) => rutas.push({ metodo, re: new RegExp('^' + patron.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), rol, fn });

  ruta('POST', '/api/login', null, (b) => {
    const u = db.usuarios.find(x => x.usuario.toLowerCase() === String(b.usuario || '').trim().toLowerCase() && x.activo);
    if (!u || String(b.clave || '') !== u.clave) E(401, 'Usuario o clave incorrectos.');
    sid.set(u.id);
    return { usuario: usuarioPublico(u) };
  });
  ruta('POST', '/api/logout', null, () => { sid.set(null); return { ok: true }; });
  ruta('GET', '/api/yo', 'any', (b, u) => ({ usuario: usuarioPublico(u), modo: db.config.modo }));

  ruta('GET', '/api/operario/opciones', 'any', () => {
    const opciones = nvsSeleccionables().map(nv => {
      const t = nvTotales(nv);
      return { nvId: nv.id, numero: nv.numero, cliente: nv.cliente, total: t.total, envasado: t.envasado, cerrada: nv.estado === 'cerrada' };
    }).sort((a, b) => a.cliente.localeCompare(b.cliente, 'es'));
    const clientesUsados = [...new Set(db.cargas.map(c => c.cliente))].sort((a, b) => a.localeCompare(b, 'es'));
    return { modo: db.config.modo, opciones, clientesUsados };
  });
  ruta('GET', '/api/operario/hoy', 'any', (b, u) => {
    const f = hoyISO();
    return { cargas: db.cargas.filter(c => c.usuarioId === u.id && diaDe(c) === f)
      .map(c => ({ ...c, numero: c.nvId ? (db.nvs.find(n => n.id === c.nvId) || {}).numero : null })) };
  });
  ruta('POST', '/api/operario/cargas', 'any', (b, u) => {
    const filas = b.filas;
    if (!Array.isArray(filas) || !filas.length) E(400, 'Agregá al menos un cliente con sus unidades.');
    const nuevas = [];
    for (const f of filas) {
      const unidades = Math.round(Number(f.unidades));
      if (!Number.isFinite(unidades) || unidades <= 0) E(400, 'Las unidades tienen que ser un número mayor a cero.');
      if (unidades > 20000) E(400, `${unidades} unidades parece un error de tipeo. Revisá el número.`);
      if (db.config.modo === 'completo') {
        const nv = nvsSeleccionables().find(n => n.id === f.nvId);
        if (!nv) E(400, 'Una de las notas de venta ya no está disponible. Volvé a elegir el cliente.');
        nuevas.push({ id: rid(), usuarioId: u.id, fecha: new Date().toISOString(), nvId: nv.id, cliente: nv.cliente, unidades });
      } else {
        const cliente = String(f.cliente || '').trim().replace(/\s+/g, ' ');
        if (!cliente) E(400, 'Escribí el nombre del cliente.');
        nuevas.push({ id: rid(), usuarioId: u.id, fecha: new Date().toISOString(), nvId: null, cliente, unidades });
      }
    }
    db.cargas.push(...nuevas);
    let alertas = 0;
    for (const nvId of new Set(nuevas.map(n => n.nvId).filter(Boolean))) if (revisarExceso(db.nvs.find(n => n.id === nvId))) alertas++;
    guardar();
    return { ok: true, cargas: nuevas, alertas };
  });
  ruta('DELETE', '/api/operario/cargas/:cid', 'any', (b, u, p) => {
    const i = db.cargas.findIndex(c => c.id === p.cid && (c.usuarioId === u.id || u.rol === 'admin'));
    if (i < 0) E(404, 'No se encontró la carga.');
    if (u.rol !== 'admin' && diaDe(db.cargas[i]) !== hoyISO()) E(403, 'Solo podés borrar cargas de hoy.');
    const [c] = db.cargas.splice(i, 1);
    if (c.nvId) { const nv = db.nvs.find(n => n.id === c.nvId); if (nv && nvTotales(nv).envasado <= nvTotales(nv).total) db.alertas.filter(a => a.nvId === nv.id && !a.resuelta).forEach(a => { a.resuelta = true; a.nota = 'Se corrigió la carga.'; }); }
    guardar();
    return { ok: true };
  });

  ruta('GET', '/api/admin/estado', 'admin', () => ({
    config: db.config,
    nvs: db.nvs.filter(n => n.estado !== 'descartada' || Date.now() - new Date(n.fecha).getTime() < 2 * DIA).map(nvPublica).sort((a, b) => b.numero - a.numero),
    operarios: db.usuarios.map(usuarioPublico),
    alertas: db.alertas.slice(0, 100),
    remitos: db.remitos.slice(-50).reverse(),
  }));
  function cargasRango(q) {
    const desde = q.get('desde') || hoyISO(), hasta = q.get('hasta') || hoyISO();
    const lista = db.cargas.filter(c => { const f = diaDe(c); return f >= desde && f <= hasta; })
      .map(c => ({ ...c, operario: nombreDe(c.usuarioId), numero: c.nvId ? (db.nvs.find(n => n.id === c.nvId) || {}).numero : null }))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    return { desde, hasta, cargas: lista };
  }
  ruta('GET', '/api/admin/cargas', 'admin', (b, u, p, q) => cargasRango(q));
  ruta('POST', '/api/admin/presea/simular', 'admin', (b) => {
    const nv = nuevaNV(db, { prueba: !!b.prueba });
    nv.estado = db.config.aprobacionObligatoria ? 'pendiente' : 'aprobada';
    if (nv.estado === 'aprobada') nv.aprobadaEn = new Date().toISOString();
    db.nvs.push(nv); guardar();
    return { nv: nvPublica(nv) };
  });
  const nvDe = p => db.nvs.find(n => n.id === p.nid) || E(404, 'No existe esa nota de venta.');
  ruta('POST', '/api/admin/nv/:nid/aprobar', 'admin', (b, u, p) => { const nv = nvDe(p); nv.estado = 'aprobada'; nv.aprobadaEn = new Date().toISOString(); guardar(); return { nv: nvPublica(nv) }; });
  ruta('POST', '/api/admin/nv/:nid/descartar', 'admin', (b, u, p) => { const nv = nvDe(p); nv.estado = 'descartada'; guardar(); return { nv: nvPublica(nv) }; });
  ruta('POST', '/api/admin/nv/:nid/remitir', 'admin', (b, u, p) => {
    const nv = nvDe(p);
    let total = 0; const det = [];
    for (const it of b.items || []) {
      const linea = nv.items[it.indice]; const c = Math.round(Number(it.cantidad));
      if (!linea || !Number.isFinite(c) || c < 0) E(400, 'Cantidad inválida en el remito.');
      if (c > linea.cantidad - linea.remitido) E(400, `No podés remitir más de lo pendiente en "${linea.producto.split(' — ')[0]}".`);
      if (c > 0) { total += c; det.push({ linea, producto: linea.producto, cantidad: c }); }
    }
    if (!total) E(400, 'El remito no tiene unidades.');
    for (const d of det) { d.linea.remitido += d.cantidad; delete d.linea; }
    const numero = 'R-' + String(db.config.nextRemito++).padStart(6, '0');
    db.remitos.push({ id: rid(), numero, nvId: nv.id, nvNumero: nv.numero, cliente: nv.cliente, fecha: new Date().toISOString(), items: det, total });
    if (nvTotales(nv).pendiente === 0) { nv.estado = 'cerrada'; nv.cerradaEn = new Date().toISOString(); }
    guardar();
    return { nv: nvPublica(nv), remito: numero };
  });
  ruta('POST', '/api/admin/nv/:nid/cerrar', 'admin', (b, u, p) => { const nv = nvDe(p); nv.estado = 'cerrada'; nv.cerradaEn = new Date().toISOString(); guardar(); return { nv: nvPublica(nv) }; });
  ruta('POST', '/api/admin/nv/:nid/quitar', 'admin', (b, u, p) => { const nv = nvDe(p); nv.cerradaEn = new Date(Date.now() - db.config.diasRetencion * DIA - 1000).toISOString(); guardar(); return { ok: true }; });
  ruta('POST', '/api/admin/alertas/:aid/resolver', 'admin', (b, u, p) => {
    const a = db.alertas.find(x => x.id === p.aid) || E(404, 'No existe la alerta.');
    a.resuelta = true; a.nota = 'Revisada por administración.'; guardar(); return { ok: true };
  });
  ruta('POST', '/api/admin/operarios', 'admin', (b) => {
    const usuario = String(b.usuario || '').trim().toLowerCase();
    if (!b.nombre || !usuario || !b.clave) E(400, 'Completá nombre, usuario y clave.');
    if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) E(400, 'El usuario solo puede tener letras, números, punto o guion (mínimo 3).');
    if (db.usuarios.some(x => x.usuario === usuario)) E(400, `Ya existe el usuario "${usuario}".`);
    const u = { id: rid(), nombre: String(b.nombre).trim(), apellido: String(b.apellido || '').trim(), usuario, clave: String(b.clave), rol: b.rol === 'admin' ? 'admin' : 'operario', sector: String(b.sector || '').trim(), activo: true };
    db.usuarios.push(u); guardar(); return { usuario: usuarioPublico(u) };
  });
  ruta('PUT', '/api/admin/operarios/:uid', 'admin', (b, yo, p) => {
    const u = db.usuarios.find(x => x.id === p.uid) || E(404, 'No existe el usuario.');
    if ('activo' in b) { if (u.id === yo.id && !b.activo) E(400, 'No podés desactivar tu propio usuario.'); u.activo = !!b.activo; }
    if (b.clave) u.clave = String(b.clave);
    for (const k of ['nombre', 'apellido', 'sector']) if (k in b) u[k] = String(b[k]).trim();
    guardar(); return { usuario: usuarioPublico(u) };
  });
  ruta('PUT', '/api/admin/config', 'admin', (b) => {
    const dias = 'diasRetencion' in b ? Math.round(Number(b.diasRetencion)) : db.config.diasRetencion;
    if (!(dias >= 0 && dias <= 30)) E(400, 'Los días tienen que ir de 0 a 30.');
    if (b.modo === 'completo' || b.modo === 'basico') db.config.modo = b.modo;
    if ('aprobacionObligatoria' in b) db.config.aprobacionObligatoria = !!b.aprobacionObligatoria;
    db.config.diasRetencion = dias;
    guardar(); return { config: db.config };
  });
  ruta('POST', '/api/admin/reiniciar', 'admin', () => { db = crear(); guardar(); sid.set(null); return { ok: true }; });

  ruta('GET', '/api/planta', null, () => {
    const abiertas = db.nvs.filter(n => n.estado === 'aprobada').map(nvPublica);
    const f = hoyISO();
    const hoy = db.cargas.filter(c => diaDe(c) === f);
    const porCliente = {};
    for (const c of hoy) porCliente[c.cliente] = (porCliente[c.cliente] || 0) + c.unidades;
    return {
      modo: db.config.modo, ahora: new Date().toISOString(),
      nvPendientes: abiertas.length,
      unidadesPendientes: abiertas.reduce((a, n) => a + n.pendiente, 0),
      itemsPendientes: abiertas.reduce((a, n) => a + n.itemsPendientes, 0),
      envasadasHoy: hoy.reduce((a, c) => a + c.unidades, 0),
      serie: seriePorDia(10),
      pedidos: abiertas.sort((a, b) => a.numero - b.numero).map(n => ({ numero: n.numero, cliente: n.cliente, total: n.total, remitido: n.remitido, pendiente: n.pendiente, envasado: n.envasado, items: n.items.length, itemsPendientes: n.itemsPendientes, fecha: n.fecha })),
      porCliente: Object.entries(porCliente).map(([cliente, unidades]) => ({ cliente, unidades })).sort((a, b) => b.unidades - a.unidades),
    };
  });

  // Devuelve { status, data } como si fuera la respuesta del servidor.
  window.demoApi = function (url, method = 'GET', body = {}) {
    recargar();
    const u = new URL(url, 'http://x');
    for (const r of rutas) {
      const m = r.re.exec(u.pathname);
      if (!m || r.metodo !== method) continue;
      try {
        let yo = null;
        if (r.rol) {
          yo = db.usuarios.find(x => x.id === sid.get() && x.activo);
          if (!yo) E(401, 'Tu sesión terminó. Volvé a entrar.');
          if (r.rol === 'admin' && yo.rol !== 'admin') E(403, 'Esta sección es solo para administración.');
        }
        return { status: 200, data: JSON.parse(JSON.stringify(r.fn(body || {}, yo, m.groups || {}, u.searchParams))) };
      } catch (e) {
        if (e instanceof Err) return { status: e.code, data: { error: e.message } };
        console.error(e);
        return { status: 500, data: { error: 'Error interno.' } };
      }
    }
    return { status: 404, data: { error: 'Ruta inexistente' } };
  };

  // CSV de cargas para descargar sin servidor.
  window.demoCsvUrl = function (qs) {
    recargar();
    const { cargas } = cargasRango(new URLSearchParams(qs));
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = '﻿Fecha;Hora;Operario;Cliente;Nota de venta;Unidades\n' + cargas.map(c => {
      const d = new Date(c.fecha);
      return [hoyISO(d), d.toTimeString().slice(0, 5), c.operario, c.cliente, c.numero || '', c.unidades].map(esc).join(';');
    }).join('\n');
    return URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  };
})();
