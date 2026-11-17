/* Estado de la demo y lógica de reservas (versión en el navegador de web/models.py y
   web/disponibilidad.py del proyecto Django).

   Todo vive en memoria: no hay base de datos ni se guarda nada en el navegador.
   Al recargar la página la demo vuelve a su estado inicial. */
window.DEMO = (function () {
  "use strict";
  var I = window.DATOS_INICIALES;
  var copia = function (x) { return JSON.parse(JSON.stringify(x)); };

  var siguienteId = 1;
  function nuevoId() { return siguienteId++; }

  /* ---------------- Fechas (cadenas "AAAA-MM-DD" y "HH:MM") ---------------- */
  function pad(n) { return String(n).padStart(2, "0"); }
  function aISO(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function deISO(iso) { var p = iso.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function hoyISO() { return aISO(new Date()); }
  function sumarDias(iso, n) { var d = deISO(iso); d.setDate(d.getDate() + n); return aISO(d); }
  function diaSemana(iso) { return (deISO(iso).getDay() + 6) % 7; } // 0 = lunes, como en Python
  function esFechaValida(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return false;
    return aISO(deISO(iso)) === iso;
  }
  function esHoraValida(h) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(h || ""); }
  function aMin(h) { var p = h.split(":"); return +p[0] * 60 + +p[1]; }
  function deMin(m) { return pad(Math.floor(m / 60)) + ":" + pad(m % 60); }

  var DIAS_ES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
  var DIAS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  var MESES = {
    es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
    en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  };
  function nombreDia(n, lang) { return lang === "en" ? DIAS_EN[n] : DIAS_ES[n]; }
  function fechaLarga(iso, lang) {
    var d = deISO(iso), dia = nombreDia(diaSemana(iso), lang), mes = MESES[lang][d.getMonth()];
    return lang === "en" ? dia + ", " + mes + " " + d.getDate() + ", " + d.getFullYear()
                         : dia + " " + d.getDate() + " de " + mes + " de " + d.getFullYear();
  }
  function fechaCorta(iso) { // "mar 18/11" para el panel
    var d = deISO(iso);
    return DIAS_ES[diaSemana(iso)].slice(0, 3) + " " + d.getDate() + "/" + pad(d.getMonth() + 1);
  }

  /* ---------------- Datos iniciales ---------------- */
  var cfg = Object.assign({
    telefono_2: "", tiktok: "", tripadvisor: "", reservas_activas: true,
    titular: "", cif: "", direccion_fiscal: "", email_privacidad: "",
    color_fondo: "#e2e2e2", color_superficie: "#d6d6d6", color_tinta: "#7d0c14",
    color_tinta_suave: "#6b3a3f", color_acento: "#7d0c14", color_sobre_acento: "#ececec",
    foto_portada: "", foto_cocina: "", foto_historia: "", foto_carta: "", logo: ""
  }, copia(I.config));

  var turnos = I.turnos.map(function (t) { return Object.assign({ id: nuevoId(), activo: true }, t); });

  var alergenos = I.alergenos.map(function (a, i) { return Object.assign({ id: nuevoId(), orden: i + 1 }, a); });
  function alergenoPorNombre(n) { return alergenos.filter(function (a) { return a.nombre_es === n; })[0]; }

  var categorias = [], platos = [];
  I.carta.forEach(function (c, i) {
    var cat = { id: nuevoId(), nombre_es: c.nombre_es, nombre_en: c.nombre_en, nota_es: c.nota_es, nota_en: c.nota_en,
                foto: "", orden: i + 1, visible: true };
    categorias.push(cat);
    c.platos.forEach(function (p, j) {
      platos.push({
        id: nuevoId(), categoria: cat.id, nombre_es: p.nombre_es, nombre_en: p.nombre_en,
        descripcion_es: p.descripcion_es, descripcion_en: p.descripcion_en, precio: p.precio,
        precio_nota_es: p.precio_nota_es, precio_nota_en: p.precio_nota_en, foto: "",
        alergenos: p.alergenos.map(function (n) { return alergenoPorNombre(n).id; }),
        destacado: p.destacado, visible: true, orden: j + 1
      });
    });
  });

  var promociones = I.promociones.map(function (p, i) {
    return Object.assign({ id: nuevoId(), activa: true, desde: "", hasta: "", orden: i + 1 }, p,
                         { foto: p.foto ? "img/obras/" + p.foto : "" });
  });

  var textos = copia(I.textos);
  var legales = I.legal.map(function (l, i) { return Object.assign({ id: nuevoId(), orden: i + 1 }, l); });

  var hoy = hoyISO();
  var navidad = new Date().getFullYear() + "-12-25";
  if (navidad < hoy) navidad = (new Date().getFullYear() + 1) + "-12-25";
  var cerrados = [
    { id: nuevoId(), fecha: navidad, motivo: "Navidad" },
    { id: nuevoId(), fecha: sumarDias(hoy, 12), motivo: "Evento privado (boda de los Martín)" }
  ].sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });

  /* ---------------- Reservas y mensajes de ejemplo ---------------- */
  var reservas = [];
  var mensajes = [];
  function token() {
    var c = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "";
    for (var i = 0; i < 20; i++) s += c[Math.floor(Math.random() * c.length)];
    return s;
  }
  function crearReserva(datos) {
    var r = Object.assign({
      id: nuevoId(), token: token(), estado: "confirmada", idioma: "es", notas: "", comentarios: "",
      creada: new Date().toISOString()
    }, datos);
    reservas.push(r);
    return r;
  }

  (function ejemplos() {
    var nombres = [
      ["Lucía Fernández", "612 345 118"], ["Javier Ortega", "655 201 774"], ["Marta Gil", "699 410 052"],
      ["Carlos Ruiz", "634 881 209"], ["Ana Belén Soto", "620 117 431"], ["Pablo Herrero", "687 550 316"],
      ["Elena Navarro", "611 902 487"], ["Sergio Molina", "644 073 925"], ["Irene Castro", "675 338 140"],
      ["David Romero", "629 664 803"], ["Nuria Prieto", "618 245 977"], ["Tom Becker", "+44 7700 900123"],
      ["Rocío Méndez", "652 790 264"], ["Andrés Vidal", "690 135 572"], ["Sophie Laurent", "+33 6 12 34 56 78"],
      ["Raúl Iglesias", "637 418 690"]
    ];
    var comentarios = ["", "", "", "Una persona celíaca", "Venimos con carrito de bebé", "Es un cumpleaños",
                       "", "Mesa en la terraza si es posible", "", "Alergia al marisco", ""];
    var semilla = 7;
    function azar(n) { semilla = (semilla * 9301 + 49297) % 233280; return Math.floor(semilla / 233280 * n); }
    var cfgLocal = cfg;
    for (var d = -4; d <= 13; d++) {
      var dia = sumarDias(hoy, d);
      var horas = [];
      turnos.filter(function (t) { return t.activo && t.dia === diaSemana(dia); }).forEach(function (t) {
        horas = horas.concat(horasTurno(t, cfgLocal.intervalo_minutos));
      });
      if (!horas.length || cerrados.some(function (c) { return c.fecha === dia; })) continue;
      var cuantas = d < 0 ? 4 + azar(3) : d <= 2 ? 6 + azar(5) : d <= 7 ? 3 + azar(4) : azar(3);
      for (var i = 0; i < cuantas; i++) {
        var persona = nombres[azar(nombres.length)];
        var ingles = /^\+4[34]|^\+33/.test(persona[1]);
        var email = persona[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
          .split(" ").slice(0, 2).join(".") + "@ejemplo.com";
        crearReserva({
          nombre: persona[0], telefono: persona[1], email: email, fecha: dia,
          hora: horas[azar(horas.length)], personas: 2 + azar(5),
          comentarios: comentarios[azar(comentarios.length)], idioma: ingles ? "en" : "es",
          estado: azar(9) === 0 ? "cancelada" : "confirmada",
          creada: new Date(deISO(sumarDias(dia, -1 - azar(6))).getTime() + 36e6).toISOString()
        });
      }
    }
    // Un grupo grande mañana a las 21:30 para que esa hora salga casi llena
    var manana = sumarDias(hoy, 1);
    if (turnos.some(function (t) { return t.activo && t.dia === diaSemana(manana) && t.nombre_es === "Cena"; })) {
      crearReserva({ nombre: "Empresa Lumen (comida de equipo)", telefono: "910 555 210", email: "eventos@lumen.example",
                     fecha: manana, hora: "21:30", personas: 34, comentarios: "Cena de empresa, menú de grupo",
                     notas: "Pagan 200 € de señal por transferencia" });
    }

    var ahoraMs = Date.now();
    mensajes.push(
      { id: nuevoId(), nombre: "Carmen Lozano", email: "carmen.lozano@ejemplo.com", telefono: "622 418 903",
        mensaje: "Hola, queríamos celebrar la comunión de mi hijo el sábado 9 de mayo, seríamos unas 25 personas. ¿Tenéis menú para grupos y un reservado?",
        leido: false, creado: new Date(ahoraMs - 2 * 36e5).toISOString() },
      { id: nuevoId(), nombre: "Mark Wilson", email: "mark.wilson@example.com", telefono: "",
        mensaje: "Hi! Do you have vegetarian options on the set lunch menu? We'll be in Madrid next week.",
        leido: false, creado: new Date(ahoraMs - 26 * 36e5).toISOString() },
      { id: nuevoId(), nombre: "Proveedor Hortalizas del Jarama", email: "pedidos@jarama.example", telefono: "918 000 111",
        mensaje: "Buenos días, os paso la nueva lista de precios de temporada. Si os interesa os llevo muestras el jueves.",
        leido: true, creado: new Date(ahoraMs - 4 * 864e5).toISOString() }
    );
  })();

  /* ---------------- Lógica (igual que disponibilidad.py) ---------------- */
  function horasTurno(t, intervalo) {
    var out = [], m = aMin(t.apertura), fin = aMin(t.ultima_reserva);
    intervalo = Math.max(5, +intervalo || 30);
    while (m <= fin) { out.push(deMin(m)); m += intervalo; }
    return out;
  }
  function turnosDelDia(iso) {
    var wd = diaSemana(iso);
    return turnos.filter(function (t) { return t.activo && t.dia === wd; })
                 .sort(function (a, b) { return a.apertura < b.apertura ? -1 : 1; });
  }
  function horasDelDia(iso) {
    var set = {};
    turnosDelDia(iso).forEach(function (t) { horasTurno(t, cfg.intervalo_minutos).forEach(function (h) { set[h] = 1; }); });
    return Object.keys(set).sort();
  }
  function diaCerrado(iso) { return cerrados.some(function (c) { return c.fecha === iso; }); }
  function motivoCerrado(iso) {
    if (!horasDelDia(iso).length) return "err_cerrado";
    if (diaCerrado(iso)) return "err_dia_bloqueado";
    return null;
  }
  function ocupacion(iso) {
    var occ = {};
    reservas.forEach(function (r) {
      if (r.fecha === iso && r.estado === "confirmada") occ[r.hora] = (occ[r.hora] || 0) + r.personas;
    });
    return occ;
  }
  function demasiadoPronto(iso, hora) {
    var p = iso.split("-"), h = hora.split(":");
    var inicio = new Date(+p[0], +p[1] - 1, +p[2], +h[0], +h[1]);
    return inicio.getTime() < Date.now() + cfg.min_horas_antelacion * 36e5;
  }
  function horasLibres(iso, personas) {
    if (motivoCerrado(iso)) return [];
    var occ = ocupacion(iso);
    return horasDelDia(iso).filter(function (h) {
      return !demasiadoPronto(iso, h) && cfg.capacidad_por_hora - (occ[h] || 0) >= personas;
    });
  }
  function plazasLibres(iso, hora) { return cfg.capacidad_por_hora - (ocupacion(iso)[hora] || 0); }
  function limites() { var h = hoyISO(); return [h, sumarDias(h, cfg.max_dias_antelacion)]; }

  function estadoHoy(lang) {
    var h = hoyISO(), ts = turnosDelDia(h);
    var cerrado = !ts.length || diaCerrado(h);
    var info = { dia: nombreDia(diaSemana(h), lang), abierto: !cerrado, turnos: [], plazas: 0 };
    if (cerrado) {
      for (var i = 1; i < 15; i++) {
        var d = sumarDias(h, i);
        if (turnosDelDia(d).length && !diaCerrado(d)) { info.proximo = nombreDia(diaSemana(d), lang); break; }
      }
      return info;
    }
    var occ = ocupacion(h);
    ts.forEach(function (t) { info.turnos.push({ nombre: tr(t, "nombre", lang), desde: t.apertura, hasta: t.cierre }); });
    var libres = horasDelDia(h).filter(function (x) { return !demasiadoPronto(h, x); });
    info.plazas = libres.reduce(function (m, x) { return Math.max(m, cfg.capacidad_por_hora - (occ[x] || 0)); }, 0);
    info.quedan_horas = libres.length > 0;
    return info;
  }

  function textoPorDia() {
    var por = {};
    turnos.filter(function (t) { return t.activo; })
      .sort(function (a, b) { return a.dia - b.dia || (a.apertura < b.apertura ? -1 : 1); })
      .forEach(function (t) { (por[t.dia] = por[t.dia] || []).push(t.apertura + "–" + t.cierre); });
    return por;
  }
  function horarioAgrupado(lang) {
    var por = textoPorDia(), filas = [];
    for (var d = 0; d < 7; d++) {
      var texto = (por[d] || []).join(" · ");
      if (filas.length && filas[filas.length - 1].texto === texto) filas[filas.length - 1].hasta = d;
      else filas.push({ desde: d, hasta: d, texto: texto });
    }
    var cerrado = lang === "en" ? "Closed" : "Cerrado", union = lang === "en" ? " to " : " a ";
    return filas.map(function (f) {
      var dias = nombreDia(f.desde, lang);
      if (f.hasta !== f.desde) {
        var sep = f.hasta - f.desde > 1 ? union : (lang === "en" ? " & " : " y ");
        dias += sep + nombreDia(f.hasta, lang);
      }
      return [dias.charAt(0).toUpperCase() + dias.slice(1), f.texto || cerrado];
    });
  }
  function horarioPorDia(lang) {
    var por = textoPorDia(), out = [];
    for (var d = 0; d < 7; d++) {
      var n = nombreDia(d, lang);
      out.push([n.charAt(0).toUpperCase() + n.slice(1), (por[d] || []).join(" · ") || (lang === "en" ? "Closed" : "Cerrado")]);
    }
    return out;
  }

  function promosVigentes() {
    var h = hoyISO();
    return promociones.filter(function (p) {
      return p.activa && (!p.desde || p.desde <= h) && (!p.hasta || p.hasta >= h);
    }).sort(porOrden);
  }
  function porOrden(a, b) { return (a.orden - b.orden) || (a.id - b.id); }

  /* ---------------- Textos ---------------- */
  function tr(obj, campo, lang) {
    if (!obj) return "";
    return (obj[campo + "_" + lang] || "") || obj[campo + "_es"] || "";
  }
  function textos_(lang) {
    var out = {};
    textos.forEach(function (t) { out[t.clave] = (lang === "en" && t.en) ? t.en : t.es; });
    return out;
  }
  function datosLegales() {
    return {
      titular: cfg.titular || "[TITULAR]", cif: cfg.cif || "[CIF/NIF]",
      direccion: cfg.direccion_fiscal || "[DIRECCIÓN FISCAL]",
      email: cfg.email_privacidad || cfg.email || "[EMAIL]", nombre: cfg.nombre
    };
  }

  return {
    cfg: cfg, turnos: turnos, alergenos: alergenos, categorias: categorias, platos: platos,
    promociones: promociones, textos: textos, legales: legales, cerrados: cerrados,
    reservas: reservas, mensajes: mensajes,
    nuevoId: nuevoId, crearReserva: crearReserva, porOrden: porOrden,
    f: { hoyISO: hoyISO, sumarDias: sumarDias, diaSemana: diaSemana, fechaLarga: fechaLarga, fechaCorta: fechaCorta,
         esFechaValida: esFechaValida, esHoraValida: esHoraValida, nombreDia: nombreDia, DIAS_ES: DIAS_ES, deISO: deISO },
    horasDelDia: horasDelDia, motivoCerrado: motivoCerrado, horasLibres: horasLibres, plazasLibres: plazasLibres,
    demasiadoPronto: demasiadoPronto, limites: limites, estadoHoy: estadoHoy, ocupacion: ocupacion,
    horarioAgrupado: horarioAgrupado, horarioPorDia: horarioPorDia, promosVigentes: promosVigentes,
    tr: tr, textos_: textos_, datosLegales: datosLegales,
    sesion: { dentro: false }
  };
})();
