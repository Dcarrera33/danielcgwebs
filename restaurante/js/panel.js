/* Panel del restaurante de la demo (equivale a /admin del proyecto Django, con Unfold).
   Cambia los datos en memoria: lo que hagas aquí se ve al momento en la web,
   y al recargar la página todo vuelve a su estado inicial. */
window.PANEL = (function () {
  "use strict";
  var D = window.DEMO, cfg = D.cfg, F = D.f;
  var app = document.getElementById("app");
  var flash = null;
  var USUARIO = "demo", CLAVE = "demo1234";

  /* ---------------- Utilidades ---------------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function ico(n) { return '<span class="ms" aria-hidden="true">' + n + "</span>"; }
  function ir(hash) { window.WEB.ir(hash); }
  // html = true solo para avisos escritos aquí con un enlace (nunca con datos del usuario)
  function aviso(texto, tipo, html) { flash = { texto: texto, tipo: tipo || "ok", html: !!html }; }
  function fechaES(iso) { var p = (iso || "").split("-"); return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : ""; }
  function diaLargo(iso) { return F.DIAS_ES[F.diaSemana(iso)] + " " + F.deISO(iso).getDate(); }
  function precio(p) {
    if (p.precio === null || p.precio === "" || p.precio === undefined) return "—";
    return (+p.precio).toFixed(2).replace(".", ",") + " €" + (p.precio_nota_es ? " " + p.precio_nota_es : "");
  }
  function corto(t, n) { t = String(t || ""); return t.length > n ? t.slice(0, n) + "…" : t; }
  function porId(lista, id) { id = +id; return lista.filter(function (x) { return x.id === id; })[0]; }
  function quitar(lista, obj) { var i = lista.indexOf(obj); if (i !== -1) lista.splice(i, 1); }
  function sumaPersonas(rs) { return rs.reduce(function (s, r) { return s + r.personas; }, 0); }
  function confirmadas() { return D.reservas.filter(function (r) { return r.estado === "confirmada"; }); }
  function sinLeer() { return D.mensajes.filter(function (m) { return !m.leido; }).length; }
  function hora(iso) { return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }

  function leerForm(form) {
    var d = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.type === "file") return;
      if (el.type === "checkbox") {
        if (el.dataset.multi) { (d[el.name] = d[el.name] || []); if (el.checked) d[el.name].push(+el.value); }
        else d[el.name] = el.checked;
      } else if (el.type === "radio") { if (el.checked) d[el.name] = el.value; }
      else d[el.name] = el.value;
    });
    return d;
  }

  /* Trozos de formulario */
  function campo(etiqueta, control, ayuda, ancho) {
    return '<div class="pn-campo' + (ancho ? " pn-campo--" + ancho : "") + '"><label>' + '<span class="pn-etq">' + esc(etiqueta) + "</span>" + control +
      (ayuda ? '<small class="pn-ayuda">' + esc(ayuda) + "</small>" : "") + "</label></div>";
  }
  function inp(name, valor, tipo, extra) {
    return '<input class="pn-input" name="' + name + '" type="' + (tipo || "text") + '" value="' + esc(valor == null ? "" : valor) + '"' + (extra || "") + ">";
  }
  function area(name, valor, filas) { return '<textarea class="pn-input" name="' + name + '" rows="' + (filas || 3) + '">' + esc(valor || "") + "</textarea>"; }
  function chk(name, marcado, texto) {
    return '<label class="pn-check"><input type="checkbox" name="' + name + '"' + (marcado ? " checked" : "") + "> " + esc(texto) + "</label>";
  }
  function sel(name, opciones, valor) {
    return '<select class="pn-input" name="' + name + '">' + opciones.map(function (o) {
      return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(valor) ? " selected" : "") + ">" + esc(o[1]) + "</option>";
    }).join("") + "</select>";
  }
  function fila() { return '<div class="pn-fila">' + Array.prototype.join.call(arguments, "") + "</div>"; }
  function tarjeta(titulo, cuerpo, extra) {
    return '<section class="pn-tarjeta' + (extra || "") + '">' + (titulo ? '<h2 class="pn-tarjeta__titulo">' + titulo + "</h2>" : "") + cuerpo + "</section>";
  }
  function interruptor(clave, valor, etiqueta) {
    return '<label class="pn-switch" title="' + esc(etiqueta) + '"><input type="checkbox" data-cambia="' + clave + '"' + (valor ? " checked" : "") +
      ' aria-label="' + esc(etiqueta) + '"><span></span></label>';
  }
  function si(v) { return v ? '<span class="pn-si">' + ico("check") + '<span class="sr">Sí</span></span>' : '<span class="pn-no">—</span>'; }
  function badge(texto, tipo) { return '<span class="pn-badge pn-badge--' + tipo + '">' + esc(texto) + "</span>"; }
  function tabla(cabeceras, filas, vacio) {
    if (!filas.length) return '<p class="pn-vacio">' + esc(vacio || "No hay nada que mostrar.") + "</p>";
    return '<div class="pn-tabla-caja"><table class="pn-tabla"><thead><tr>' + cabeceras.map(function (c) { return "<th>" + c + "</th>"; }).join("") +
      "</tr></thead><tbody>" + filas.map(function (f) { return "<tr>" + f.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }).join("") +
      "</tbody></table></div>";
  }
  function botones(volver, borrar) {
    return '<div class="pn-botonera"><button class="pn-boton" type="submit">' + ico("check") + "Guardar</button>" +
      (volver ? '<a class="pn-boton pn-boton--suave" href="' + volver + '">Volver</a>' : "") +
      (borrar ? '<button class="pn-boton pn-boton--peligro" type="button" data-borrar>' + ico("delete") + "Eliminar</button>" : "") + "</div>";
  }
  function pestanas(nombres) {
    return '<div class="pn-pestanas" role="tablist">' + nombres.map(function (n, i) {
      return '<button type="button" role="tab" data-pestana="' + i + '" aria-selected="' + (i === 0) + '">' + esc(n) + "</button>";
    }).join("") + "</div>";
  }
  function panelPestana(i, html) { return '<div class="pn-pestana" data-panel="' + i + '"' + (i ? " hidden" : "") + ">" + html + "</div>"; }
  function activarPestanas(raiz) {
    raiz.querySelectorAll(".pn-pestanas").forEach(function (barra) {
      var zona = barra.parentElement;
      barra.querySelectorAll("[data-pestana]").forEach(function (b) {
        b.addEventListener("click", function () {
          barra.querySelectorAll("[data-pestana]").forEach(function (x) { x.setAttribute("aria-selected", x === b ? "true" : "false"); });
          zona.querySelectorAll(":scope > .pn-pestana, :scope > form > .pn-pestana").forEach(function (p) { p.hidden = p.dataset.panel !== b.dataset.pestana; });
        });
      });
    });
  }
  function abrirPestana(raiz, i) { var b = raiz.querySelector('[data-pestana="' + i + '"]'); if (b) b.click(); }

  // Subida de fotos: se quedan en memoria (URL temporal del navegador), no se suben a ningún sitio
  function campoFoto(name, url, ejemplo) {
    return '<div class="pn-foto" data-foto="' + name + '">' +
      '<img src="' + esc(url || ejemplo || "") + '" alt=""' + (url || ejemplo ? "" : " hidden") + ">" +
      '<div class="pn-foto__acciones"><label class="pn-boton pn-boton--suave">Elegir foto<input type="file" accept="image/*" hidden></label>' +
      '<button type="button" class="pn-enlace" data-quitar-foto' + (url ? "" : " hidden") + ">Quitar</button>" +
      '<input type="hidden" name="' + name + '" value="' + esc(url || "") + '">' +
      (ejemplo ? '<small class="pn-ayuda">' + (url ? "Foto propia." : "Ahora se usa la foto de ejemplo.") + "</small>" : "") + "</div></div>";
  }
  function activarFotos(raiz) {
    raiz.querySelectorAll("[data-foto]").forEach(function (caja) {
      var img = caja.querySelector("img"), oculto = caja.querySelector("input[type=hidden]");
      var archivo = caja.querySelector("input[type=file]"), quitarB = caja.querySelector("[data-quitar-foto]");
      var ejemplo = img.getAttribute("src") && !oculto.value ? img.getAttribute("src") : "";
      archivo.addEventListener("change", function () {
        var f = archivo.files[0];
        if (!f || !/^image\//.test(f.type)) return;
        var url = URL.createObjectURL(f);
        oculto.value = url; img.src = url; img.hidden = false; quitarB.hidden = false;
      });
      quitarB.addEventListener("click", function () {
        oculto.value = ""; quitarB.hidden = true;
        if (ejemplo) img.src = ejemplo; else img.hidden = true;
      });
    });
  }

  /* Interruptores de las listas (visible, destacado, activa, leído...) */
  var COLECCIONES = { platos: D.platos, categorias: D.categorias, promociones: D.promociones, mensajes: D.mensajes, turnos: D.turnos };
  function activarInterruptores(raiz) {
    raiz.querySelectorAll("[data-cambia]").forEach(function (el) {
      el.addEventListener("change", function () {
        var p = el.dataset.cambia.split(":"), obj = porId(COLECCIONES[p[0]], p[1]);
        if (!obj) return;
        obj[p[2]] = el.type === "checkbox" ? el.checked : (el.type === "number" ? +el.value : el.value);
        mostrarToast("Guardado. Ya se ve en la web.");
        actualizarContadores();
      });
    });
  }
  function mostrarToast(texto) {
    var t = document.getElementById("pn-toast");
    if (!t) return;
    t.textContent = texto;
    t.classList.add("es-visible");
    clearTimeout(mostrarToast.t);
    mostrarToast.t = setTimeout(function () { t.classList.remove("es-visible"); }, 2200);
  }
  function actualizarContadores() {
    var b = app.querySelector("[data-badge-mensajes]");
    if (b) { var n = sinLeer(); b.textContent = n; b.hidden = !n; }
  }

  // Selección múltiple + acción (como las acciones del admin de Django)
  function columnaSel(id) { return '<input type="checkbox" class="pn-sel" value="' + id + '" aria-label="Seleccionar">'; }
  function barraAcciones(opciones) {
    return '<div class="pn-acciones-lista"><select class="pn-input" data-accion><option value="">Acción…</option>' +
      opciones.map(function (o) { return '<option value="' + o[0] + '">' + esc(o[1]) + "</option>"; }).join("") +
      '</select><button type="button" class="pn-boton pn-boton--suave" data-ejecutar>Aplicar a los marcados</button></div>';
  }
  function activarAcciones(raiz, fn) {
    var todos = raiz.querySelector("[data-sel-todos]");
    if (todos) todos.addEventListener("change", function () {
      raiz.querySelectorAll(".pn-sel").forEach(function (c) { c.checked = todos.checked; });
    });
    var b = raiz.querySelector("[data-ejecutar]");
    if (b) b.addEventListener("click", function () {
      var accion = raiz.querySelector("[data-accion]").value;
      var ids = Array.prototype.map.call(raiz.querySelectorAll(".pn-sel:checked"), function (c) { return +c.value; });
      if (!accion) { mostrarToast("Elige una acción."); return; }
      if (!ids.length) { mostrarToast("Marca al menos una fila."); return; }
      fn(accion, ids);
    });
  }
  var selTodos = '<input type="checkbox" data-sel-todos aria-label="Marcar todas">';

  // Barra de filtros que se guarda en la dirección (#/admin/x?filtro=...)
  function filtros(base, q, controles) {
    return '<form class="pn-filtros" data-filtros="' + base + '">' + controles +
      '<label class="pn-buscar">' + ico("search") + '<input class="pn-input" name="q" type="search" placeholder="Buscar…" value="' + esc(q.q || "") + '"></label>' +
      '<button class="pn-boton pn-boton--suave" type="submit">Filtrar</button></form>';
  }
  function activarFiltros(raiz) {
    var f = raiz.querySelector("[data-filtros]");
    if (!f) return;
    function enviar() {
      var d = leerForm(f), partes = [];
      Object.keys(d).forEach(function (k) { if (d[k]) partes.push(encodeURIComponent(k) + "=" + encodeURIComponent(d[k])); });
      ir(f.dataset.filtros + (partes.length ? "?" + partes.join("&") : ""));
    }
    f.addEventListener("submit", function (e) { e.preventDefault(); enviar(); });
    f.querySelectorAll("select").forEach(function (s) { s.addEventListener("change", enviar); });
  }
  function chips(base, nombre, valor, opciones, q) {
    return '<div class="pn-chips">' + opciones.map(function (o) {
      var nq = Object.assign({}, q); nq[nombre] = o[0];
      var qs = Object.keys(nq).filter(function (k) { return nq[k]; }).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(nq[k]); }).join("&");
      return '<a class="pn-chip' + (valor === o[0] ? " es-activo" : "") + '" href="' + base + (qs ? "?" + qs : "") + '">' + esc(o[1]) + "</a>";
    }).join("") + "</div>";
  }
  function coincide(q, textos) {
    if (!q) return true;
    var n = q.toLowerCase();
    return textos.some(function (t) { return String(t || "").toLowerCase().indexOf(n) !== -1; });
  }

  /* ---------------- Vistas ---------------- */
  var VISTAS = {};

  /* Inicio (dashboard) */
  VISTAS.inicio = function () {
    var hoy = F.hoyISO(), fin = F.sumarDias(hoy, 7);
    var deHoy = confirmadas().filter(function (r) { return r.fecha === hoy; }).sort(function (a, b) { return a.hora < b.hora ? -1 : 1; });
    var semana = confirmadas().filter(function (r) { return r.fecha >= hoy && r.fecha < fin; });
    var porDia = {};
    semana.forEach(function (r) { var x = porDia[r.fecha] = porDia[r.fecha] || { n: 0, p: 0 }; x.n++; x.p += r.personas; });
    var cerrados = D.cerrados.filter(function (c) { return c.fecha >= hoy; }).slice(0, 5);
    var visibles = D.platos.filter(function (p) { return p.visible; }).length;

    var h = '<div class="pn-cifras">' +
      tarjeta("Hoy", '<p class="pn-numero">' + deHoy.length + '</p><p class="pn-sutil">reservas · ' + sumaPersonas(deHoy) + " personas</p>") +
      tarjeta("Próximos 7 días", '<p class="pn-numero">' + semana.length + '</p><p class="pn-sutil">reservas · ' + sumaPersonas(semana) + " personas</p>") +
      '<a class="pn-tarjeta-enlace" href="#/admin/mensajes">' + tarjeta("Mensajes sin leer", '<p class="pn-numero">' + sinLeer() + '</p><p class="pn-sutil">del formulario de contacto</p>') + "</a>" +
      '<a class="pn-tarjeta-enlace" href="#/admin/promociones">' + tarjeta("En la web ahora", '<p class="pn-numero">' + visibles + '</p><p class="pn-sutil">platos en la carta · ' + D.promosVigentes().length + " promociones</p>") + "</a>" +
      "</div>";

    h += '<div class="pn-dos"><div class="pn-columna">' +
      tarjeta("Reservas de hoy",
        tabla(["Hora", "Nombre", "Pers.", "Teléfono", "Comentarios"], deHoy.map(function (r) {
          return ["<strong>" + esc(r.hora) + "</strong>", '<a href="#/admin/reservas/' + r.id + '">' + esc(r.nombre) + "</a>", r.personas,
                  '<a href="tel:' + esc(r.telefono) + '">' + esc(r.telefono) + "</a>", esc(corto(r.comentarios, 60))];
        }), "No hay reservas para hoy.") +
        '<p class="pn-pie"><a href="#/admin/reservas?cuando=proximas">Ver todas las próximas reservas →</a></p>') +
      tarjeta("Prueba la demo", '<ul class="pn-pasos">' +
        '<li><a href="#/reservas">Haz una reserva en la web</a> y vuelve: aparece aquí y en <a href="#/admin/reservas">Reservas</a>.</li>' +
        '<li>En <a href="#/admin/datos?tab=2">Datos, colores y fotos → Colores</a> cambia el color de marca y mira la web.</li>' +
        '<li>Oculta un plato en <a href="#/admin/platos">Platos</a> o cierra un día en <a href="#/admin/cerrados">Días cerrados</a>: la web lo respeta al momento.</li>' +
        '<li>Cambia cualquier frase de la web en <a href="#/admin/textos">Textos de la web</a>, en español o en inglés.</li>' +
        "</ul>", " pn-tarjeta--nota") +
      '</div><div class="pn-columna">' +
      tarjeta("Próximos días", Object.keys(porDia).length ? '<table class="pn-tabla"><tbody>' + Object.keys(porDia).sort().map(function (f) {
        return '<tr><td><a href="#/admin/reservas?cuando=todas&fecha=' + f + '">' + esc(diaLargo(f)) + "</a></td><td>" + porDia[f].n + " reservas</td><td>" + porDia[f].p + " pers.</td></tr>";
      }).join("") + "</tbody></table>" : '<p class="pn-sutil">Sin reservas esta semana.</p>') +
      tarjeta("Atajos", '<ul class="pn-atajos">' +
        '<li><a href="#/admin/reservas/nueva">+ Apuntar una reserva por teléfono</a></li>' +
        '<li><a href="#/admin/platos/nuevo">+ Añadir un plato</a></li>' +
        '<li><a href="#/admin/promociones/nueva">+ Crear una promoción</a></li>' +
        '<li><a href="#/admin/cerrados">+ Cerrar un día (vacaciones, evento…)</a></li>' +
        '<li><a href="#/admin/datos">Cambiar colores, fotos o datos</a></li>' +
        '<li><a href="#/admin/textos">Cambiar los textos de la web</a></li>' +
        '<li><a href="#/">Ver la web →</a></li></ul>') +
      (cerrados.length ? tarjeta("Próximos días cerrados", '<ul class="pn-atajos">' + cerrados.map(function (c) {
        return "<li>" + esc(F.fechaLarga(c.fecha, "es")) + (c.motivo ? " · " + esc(c.motivo) : "") + "</li>";
      }).join("") + "</ul>") : "") +
      "</div></div>";
    return { titulo: "Inicio", html: h };
  };

  /* Reservas */
  VISTAS.reservas = function (p, q) {
    if (p[0]) return fichaReserva(p[0]);
    var cuando = q.cuando || "proximas", hoy = F.hoyISO(), man = F.sumarDias(hoy, 1);
    var lista = D.reservas.filter(function (r) {
      if (q.fecha) { if (r.fecha !== q.fecha) return false; }
      else if (cuando === "hoy" && r.fecha !== hoy) return false;
      else if (cuando === "manana" && r.fecha !== man) return false;
      else if (cuando === "proximas" && r.fecha < hoy) return false;
      else if (cuando === "pasadas" && r.fecha >= hoy) return false;
      if (q.estado && r.estado !== q.estado) return false;
      return coincide(q.q, [r.nombre, r.telefono, r.email]);
    }).sort(function (a, b) {
      var x = (a.fecha + a.hora) < (b.fecha + b.hora) ? -1 : 1;
      return cuando === "pasadas" ? -x : x;
    });
    var conf = lista.filter(function (r) { return r.estado === "confirmada"; });
    var base = "#/admin/reservas";
    var h = chips(base, "cuando", q.fecha ? "" : cuando, [["hoy", "Hoy"], ["manana", "Mañana"], ["proximas", "Próximas"], ["pasadas", "Pasadas"], ["todas", "Todas"]], { estado: q.estado, q: q.q }) +
      filtros(base, q, '<input type="hidden" name="cuando" value="' + esc(cuando) + '">' +
        sel("estado", [["", "Todos los estados"], ["confirmada", "Confirmadas"], ["cancelada", "Canceladas"]], q.estado || "")) +
      (q.fecha ? '<p class="pn-sutil">Mostrando solo el ' + esc(F.fechaLarga(q.fecha, "es")) + '. <a href="' + base + '">Quitar</a></p>' : "");
    h += tarjeta("", '<p class="pn-resumen">' + lista.length + " reservas · " + sumaPersonas(conf) + " personas confirmadas</p>" +
      barraAcciones([["cancelar", "Cancelar y avisar al cliente por email"]]) +
      tabla([selTodos, "Fecha", "Hora", "Nombre", "Pers.", "Teléfono", "Estado", "Coment."], lista.map(function (r) {
        return [columnaSel(r.id), '<a href="' + base + "/" + r.id + '">' + esc(F.fechaCorta(r.fecha)) + "</a>", esc(r.hora),
          '<a href="' + base + "/" + r.id + '">' + esc(r.nombre) + "</a>", r.personas, esc(r.telefono),
          r.estado === "confirmada" ? badge("Confirmada", "ok") : badge("Cancelada", "mal"), si(r.comentarios)];
      }), "No hay reservas con estos filtros."));
    return {
      titulo: "Reservas", accion: '<a class="pn-boton" href="' + base + '/nueva">' + ico("add") + "Añadir reserva</a>", html: h,
      despues: function (raiz) {
        activarFiltros(raiz);
        activarAcciones(raiz, function (accion, ids) {
          var n = 0;
          ids.forEach(function (id) { var r = porId(D.reservas, id); if (r && r.estado === "confirmada") { r.estado = "cancelada"; n++; } });
          aviso(n + " reserva(s) cancelada(s). En la web real se avisa a cada cliente por email.");
          ir(location.hash);
        });
      }
    };
  };

  function fichaReserva(id) {
    var nueva = id === "nueva";
    var r = nueva ? { fecha: F.hoyISO(), hora: "21:00", personas: 2, estado: "confirmada", nombre: "", telefono: "", email: "", comentarios: "", notas: "", idioma: "es" } : porId(D.reservas, id);
    if (!r) return noExiste();
    var h = '<form class="pn-form" novalidate>' +
      tarjeta("Reserva", fila(campo("Fecha", inp("fecha", r.fecha, "date", " required")), campo("Hora", inp("hora", r.hora, "time", " required step=\"300\"")),
                              campo("Personas", inp("personas", r.personas, "number", ' min="1" max="200" required'))) +
        campo("Estado", sel("estado", [["confirmada", "Confirmada"], ["cancelada", "Cancelada"]], r.estado))) +
      tarjeta("Cliente", fila(campo("Nombre", inp("nombre", r.nombre, "text", " required")), campo("Teléfono", inp("telefono", r.telefono, "tel")),
                              campo("Email", inp("email", r.email, "email"))) + campo("Comentarios del cliente", area("comentarios", r.comentarios))) +
      tarjeta("Interno", campo("Notas internas", area("notas", r.notas), "Solo las ve el restaurante.") +
        (nueva ? "" : '<dl class="pn-datos"><div><dt>Hecha el</dt><dd>' + esc(hora(r.creada)) + "</dd></div><div><dt>Idioma</dt><dd>" + (r.idioma === "en" ? "Inglés" : "Español") + "</dd></div>" +
          '<div><dt>Enlace de cancelación del cliente</dt><dd><a href="#/cancelar/' + esc(r.token) + '">Abrir la página que ve el cliente</a></dd></div></dl>')) +
      '<p class="pn-error" hidden></p>' + botones("#/admin/reservas", !nueva) + "</form>";
    return {
      titulo: nueva ? "Añadir reserva" : r.nombre, migas: [["Reservas", "#/admin/reservas"]], html: h,
      despues: function (raiz) {
        var form = raiz.querySelector("form"), err = raiz.querySelector(".pn-error");
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          var d = leerForm(form), fallos = [];
          if (!F.esFechaValida(d.fecha)) fallos.push("la fecha");
          if (!F.esHoraValida(d.hora)) fallos.push("la hora");
          if (!(+d.personas >= 1)) fallos.push("las personas");
          if (d.nombre.trim().length < 2) fallos.push("el nombre");
          if (fallos.length) { err.textContent = "Revisa " + fallos.join(", ") + "."; err.hidden = false; return; }
          d.personas = +d.personas; d.nombre = d.nombre.trim();
          var obj = nueva ? D.crearReserva(d) : Object.assign(r, d);
          var libres = D.plazasLibres(obj.fecha, obj.hora);
          aviso("Reserva guardada." + (obj.estado === "confirmada" && libres < 0 ? " Ojo: a las " + obj.hora + " ya hay " + (cfg.capacidad_por_hora - libres) +
            " personas y el aforo por franja es " + cfg.capacidad_por_hora + "." : ""), libres < 0 && obj.estado === "confirmada" ? "aviso" : "ok");
          ir("#/admin/reservas" + (nueva ? "?cuando=todas&fecha=" + obj.fecha : ""));
        });
        var b = raiz.querySelector("[data-borrar]");
        if (b) b.addEventListener("click", function () {
          if (!confirm("¿Eliminar esta reserva? Mejor cancélala si quieres conservar el historial.")) return;
          quitar(D.reservas, r); aviso("Reserva eliminada."); ir("#/admin/reservas");
        });
      }
    };
  }

  /* Mensajes de contacto */
  VISTAS.mensajes = function (p, q) {
    if (p[0]) {
      var m = porId(D.mensajes, p[0]);
      if (!m) return noExiste();
      m.leido = true;
      return {
        titulo: m.nombre, migas: [["Mensajes", "#/admin/mensajes"]],
        html: tarjeta("", '<dl class="pn-datos"><div><dt>Nombre</dt><dd>' + esc(m.nombre) + "</dd></div><div><dt>Email</dt><dd>" + esc(m.email) +
          "</dd></div><div><dt>Teléfono</dt><dd>" + esc(m.telefono || "—") + "</dd></div><div><dt>Recibido</dt><dd>" + esc(hora(m.creado)) + "</dd></div></dl>" +
          '<div class="pn-mensaje-texto">' + esc(m.mensaje).replace(/\n/g, "<br>") + "</div>" +
          '<p><a class="pn-boton" href="mailto:' + esc(m.email) + '?subject=Re:%20tu%20mensaje">' + ico("mail") + "Responder por email a " + esc(m.email) + "</a></p>") +
          '<div class="pn-botonera"><a class="pn-boton pn-boton--suave" href="#/admin/mensajes">Volver</a><button type="button" class="pn-boton pn-boton--suave" data-no-leido>Marcar como no leído</button>' +
          '<button class="pn-boton pn-boton--peligro" type="button" data-borrar>' + ico("delete") + "Eliminar</button></div>",
        despues: function (raiz) {
          actualizarContadores();
          raiz.querySelector("[data-no-leido]").addEventListener("click", function () { m.leido = false; aviso("Marcado como no leído."); ir("#/admin/mensajes"); });
          raiz.querySelector("[data-borrar]").addEventListener("click", function () {
            if (!confirm("¿Eliminar este mensaje?")) return;
            quitar(D.mensajes, m); aviso("Mensaje eliminado."); ir("#/admin/mensajes");
          });
        }
      };
    }
    var lista = D.mensajes.filter(function (m) {
      if (q.leido === "no" && m.leido) return false;
      if (q.leido === "si" && !m.leido) return false;
      return coincide(q.q, [m.nombre, m.email, m.mensaje]);
    }).sort(function (a, b) { return a.creado < b.creado ? 1 : -1; });
    var h = filtros("#/admin/mensajes", q, sel("leido", [["", "Todos"], ["no", "Sin leer"], ["si", "Leídos"]], q.leido || "")) +
      tarjeta("", barraAcciones([["leidos", "Marcar como leídos"]]) +
        tabla([selTodos, "Recibido", "Nombre", "Email", "Mensaje", "Leído"], lista.map(function (m) {
          return [columnaSel(m.id), esc(hora(m.creado)), '<a href="#/admin/mensajes/' + m.id + '"' + (m.leido ? "" : ' class="pn-negrita"') + ">" + esc(m.nombre) + "</a>",
            esc(m.email), esc(corto(m.mensaje, 80)), interruptor("mensajes:" + m.id + ":leido", m.leido, "Leído")];
        }), "No hay mensajes."));
    return {
      titulo: "Mensajes de contacto", html: h,
      despues: function (raiz) {
        activarFiltros(raiz);
        activarAcciones(raiz, function (a, ids) { ids.forEach(function (id) { porId(D.mensajes, id).leido = true; }); aviso("Marcados como leídos."); ir(location.hash); });
      }
    };
  };

  /* Días cerrados */
  VISTAS.cerrados = function () {
    var hoy = F.hoyISO();
    var lista = D.cerrados.slice().sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
    var h = tarjeta("Cerrar un día", '<form class="pn-form pn-form--linea" novalidate>' +
        fila(campo("Fecha", inp("fecha", "", "date", ' min="' + hoy + '" required')), campo("Motivo (solo lo ves tú)", inp("motivo", "", "text", ' placeholder="Vacaciones, evento privado…"'), "", "ancho")) +
        '<p class="pn-error" hidden></p><div class="pn-botonera"><button class="pn-boton" type="submit">' + ico("add") + "Cerrar ese día</button></div></form>" +
        '<p class="pn-sutil">Ese día la web no ofrecerá horas para reservar. Las reservas que ya existan no se tocan.</p>') +
      tarjeta("Días cerrados", tabla(["Fecha", "Motivo", ""], lista.map(function (c) {
        return [esc(fechaES(c.fecha)) + ' <span class="pn-sutil">' + esc(F.DIAS_ES[F.diaSemana(c.fecha)]) + "</span>" + (c.fecha < hoy ? " " + badge("Pasado", "gris") : ""),
          esc(c.motivo || "—"), '<button type="button" class="pn-enlace pn-enlace--peligro" data-quitar="' + c.id + '">Quitar</button>'];
      }), "No hay días cerrados."));
    return {
      titulo: "Días cerrados", html: h,
      despues: function (raiz) {
        var form = raiz.querySelector("form"), err = raiz.querySelector(".pn-error");
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          var d = leerForm(form);
          if (!F.esFechaValida(d.fecha)) { err.textContent = "Elige una fecha."; err.hidden = false; return; }
          if (D.cerrados.some(function (c) { return c.fecha === d.fecha; })) { err.textContent = "Ese día ya está cerrado."; err.hidden = false; return; }
          D.cerrados.push({ id: D.nuevoId(), fecha: d.fecha, motivo: d.motivo.trim() });
          var afectadas = confirmadas().filter(function (r) { return r.fecha === d.fecha; }).length;
          aviso("Cerrado el " + F.fechaLarga(d.fecha, "es") + "." + (afectadas ? " Ojo: ese día hay " + afectadas + " reserva(s) confirmada(s)." : ""), afectadas ? "aviso" : "ok");
          ir("#/admin/cerrados");
        });
        raiz.querySelectorAll("[data-quitar]").forEach(function (b) {
          b.addEventListener("click", function () { quitar(D.cerrados, porId(D.cerrados, b.dataset.quitar)); aviso("Día abierto de nuevo."); ir("#/admin/cerrados"); });
        });
      }
    };
  };

  /* Platos */
  function nombreCategoria(id) { var c = porId(D.categorias, id); return c ? c.nombre_es : "—"; }
  VISTAS.platos = function (p, q) {
    if (p[0]) return fichaPlato(p[0], q);
    var cats = D.categorias.slice().sort(D.porOrden);
    var lista = D.platos.filter(function (x) {
      if (q.seccion && String(x.categoria) !== q.seccion) return false;
      if (q.ver === "ocultos" && x.visible) return false;
      if (q.ver === "destacados" && !x.destacado) return false;
      return coincide(q.q, [x.nombre_es, x.nombre_en, x.descripcion_es]);
    }).sort(function (a, b) {
      var ca = porId(D.categorias, a.categoria), cb = porId(D.categorias, b.categoria);
      return ((ca ? ca.orden : 0) - (cb ? cb.orden : 0)) || (a.orden - b.orden) || (a.id - b.id);
    });
    var h = filtros("#/admin/platos", q,
        sel("seccion", [["", "Todas las secciones"]].concat(cats.map(function (c) { return [c.id, c.nombre_es]; })), q.seccion || "") +
        sel("ver", [["", "Todos"], ["destacados", "Platos de la casa"], ["ocultos", "Ocultos"]], q.ver || "")) +
      tarjeta("", barraAcciones([["ocultar", "Ocultar en la carta"], ["mostrar", "Mostrar en la carta"]]) +
        tabla([selTodos, "", "Plato", "Sección", "Precio", "De la casa", "Visible", "Orden"], lista.map(function (x) {
          return [columnaSel(x.id), x.foto ? '<img class="pn-mini" src="' + esc(x.foto) + '" alt="">' : "",
            '<a href="#/admin/platos/' + x.id + '">' + esc(x.nombre_es) + "</a>", esc(nombreCategoria(x.categoria)), esc(precio(x)),
            interruptor("platos:" + x.id + ":destacado", x.destacado, "Plato de la casa"), interruptor("platos:" + x.id + ":visible", x.visible, "Visible"),
            '<input class="pn-input pn-input--num" type="number" min="0" value="' + x.orden + '" data-cambia="platos:' + x.id + ':orden" aria-label="Orden">'];
        }), "No hay platos con estos filtros.") +
        '<p class="pn-sutil">«De la casa» = sale en grande en la portada (máximo 7).</p>');
    return {
      titulo: "Platos", accion: '<a class="pn-boton" href="#/admin/platos/nuevo">' + ico("add") + "Añadir plato</a>", html: h,
      despues: function (raiz) {
        activarFiltros(raiz);
        activarAcciones(raiz, function (a, ids) {
          ids.forEach(function (id) { porId(D.platos, id).visible = a === "mostrar"; });
          aviso(ids.length + " plato(s) " + (a === "mostrar" ? "visibles" : "ocultos") + " en la carta."); ir(location.hash);
        });
      }
    };
  };

  function fichaPlato(id, q) {
    var nuevo = id === "nuevo";
    var x = nuevo ? { categoria: +(q.seccion || (D.categorias[0] || {}).id), nombre_es: "", nombre_en: "", descripcion_es: "", descripcion_en: "", precio: "",
                      precio_nota_es: "", precio_nota_en: "", foto: "", alergenos: [], destacado: false, visible: true, orden: 99 } : porId(D.platos, id);
    if (!x) return noExiste();
    var cats = D.categorias.slice().sort(D.porOrden).map(function (c) { return [c.id, c.nombre_es]; });
    var h = '<form class="pn-form" novalidate>' +
      tarjeta("", campo("Sección", sel("categoria", cats, x.categoria)) +
        fila(campo("Nombre (ES)", inp("nombre_es", x.nombre_es, "text", " required maxlength=\"100\"")), campo("Nombre (EN)", inp("nombre_en", x.nombre_en, "text", ' maxlength="100"'))) +
        fila(campo("Descripción (ES)", inp("descripcion_es", x.descripcion_es, "text", ' maxlength="240"')), campo("Descripción (EN)", inp("descripcion_en", x.descripcion_en, "text", ' maxlength="240"')))) +
      tarjeta("Precio", fila(campo("Precio (€)", inp("precio", x.precio, "number", ' step="0.01" min="0"')),
        campo("Junto al precio (ES)", inp("precio_nota_es", x.precio_nota_es), "Ej.: «/kg», «ración»."), campo("Junto al precio (EN)", inp("precio_nota_en", x.precio_nota_en)))) +
      tarjeta("Foto y alérgenos", campo("Foto", campoFoto("foto", x.foto)) +
        '<fieldset class="pn-alergenos"><legend class="pn-etq">Alérgenos</legend>' + D.alergenos.slice().sort(D.porOrden).map(function (a) {
          return '<label class="pn-check"><input type="checkbox" name="alergenos" data-multi="1" value="' + a.id + '"' + (x.alergenos.indexOf(a.id) !== -1 ? " checked" : "") + "> " + esc(a.nombre_es) + "</label>";
        }).join("") + "</fieldset>") +
      tarjeta("Dónde aparece", fila(chk("destacado", x.destacado, "Plato de la casa (sale en grande en la portada)"), chk("visible", x.visible, "Visible en la carta"),
        campo("Orden", inp("orden", x.orden, "number", ' min="0"'), "", "corto"))) +
      '<p class="pn-error" hidden></p>' + botones("#/admin/platos", !nuevo) + "</form>";
    return {
      titulo: nuevo ? "Añadir plato" : x.nombre_es, migas: [["Platos", "#/admin/platos"]], html: h,
      accion: nuevo ? "" : '<a class="pn-boton pn-boton--suave" href="#/carta/plato-' + x.id + '">' + ico("open_in_new") + "Ver en la carta</a>",
      despues: function (raiz) {
        activarFotos(raiz);
        var form = raiz.querySelector("form"), err = raiz.querySelector(".pn-error");
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          var d = leerForm(form);
          if (!d.nombre_es.trim()) { err.textContent = "Escribe el nombre del plato en español."; err.hidden = false; return; }
          d.categoria = +d.categoria; d.orden = +d.orden || 0; d.alergenos = d.alergenos || [];
          d.precio = d.precio === "" ? null : Math.max(0, +d.precio);
          if (nuevo) { d.id = D.nuevoId(); D.platos.push(d); } else Object.assign(x, d);
          aviso("Plato guardado. Ya se ve en la carta."); ir("#/admin/platos");
        });
        var b = raiz.querySelector("[data-borrar]");
        if (b) b.addEventListener("click", function () {
          if (!confirm("¿Eliminar «" + x.nombre_es + "»? Si solo quieres quitarlo un tiempo, desmarca «Visible».")) return;
          quitar(D.platos, x); aviso("Plato eliminado."); ir("#/admin/platos");
        });
      }
    };
  }

  /* Secciones de la carta */
  VISTAS.secciones = function (p) {
    if (p[0]) return fichaSeccion(p[0]);
    var lista = D.categorias.slice().sort(D.porOrden);
    var h = tarjeta("", tabla(["Sección (ES)", "Inglés", "Platos", "Visible", "Orden"], lista.map(function (c) {
      var n = D.platos.filter(function (x) { return x.categoria === c.id; }).length;
      return ['<a href="#/admin/secciones/' + c.id + '">' + esc(c.nombre_es) + "</a>", esc(c.nombre_en), '<a href="#/admin/platos?seccion=' + c.id + '">' + n + "</a>",
        interruptor("categorias:" + c.id + ":visible", c.visible, "Visible"),
        '<input class="pn-input pn-input--num" type="number" min="0" value="' + c.orden + '" data-cambia="categorias:' + c.id + ':orden" aria-label="Orden">'];
    })));
    return { titulo: "Secciones de la carta", accion: '<a class="pn-boton" href="#/admin/secciones/nueva">' + ico("add") + "Añadir sección</a>", html: h };
  };
  function fichaSeccion(id) {
    var nueva = id === "nueva";
    var c = nueva ? { nombre_es: "", nombre_en: "", nota_es: "", nota_en: "", foto: "", orden: D.categorias.length + 1, visible: true } : porId(D.categorias, id);
    if (!c) return noExiste();
    var suyos = nueva ? [] : D.platos.filter(function (x) { return x.categoria === c.id; }).sort(D.porOrden);
    var h = '<form class="pn-form" novalidate>' + tarjeta("",
        fila(campo("Nombre (ES)", inp("nombre_es", c.nombre_es, "text", " required")), campo("Nombre (EN)", inp("nombre_en", c.nombre_en))) +
        fila(campo("Nota (ES)", inp("nota_es", c.nota_es), "Ej.: «Mínimo dos personas»."), campo("Nota (EN)", inp("nota_en", c.nota_en))) +
        campo("Foto de la sección", campoFoto("foto", c.foto), "Opcional. Si no hay, se usa una imagen de ejemplo.") +
        fila(campo("Orden", inp("orden", c.orden, "number", ' min="0"'), "", "corto"), chk("visible", c.visible, "Visible"))) +
      (nueva ? "" : tarjeta("Platos de esta sección", tabla(["Plato", "Precio", "Visible"], suyos.map(function (x) {
        return ['<a href="#/admin/platos/' + x.id + '">' + esc(x.nombre_es) + "</a>", esc(precio(x)), si(x.visible)];
      }), "Todavía no tiene platos.") + '<p class="pn-pie"><a href="#/admin/platos/nuevo?seccion=' + c.id + '">+ Añadir un plato a esta sección</a></p>')) +
      '<p class="pn-error" hidden></p>' + botones("#/admin/secciones", !nueva) + "</form>";
    return {
      titulo: nueva ? "Añadir sección" : c.nombre_es, migas: [["Secciones de la carta", "#/admin/secciones"]], html: h,
      despues: function (raiz) {
        activarFotos(raiz);
        var form = raiz.querySelector("form"), err = raiz.querySelector(".pn-error");
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          var d = leerForm(form);
          if (!d.nombre_es.trim()) { err.textContent = "Escribe el nombre en español."; err.hidden = false; return; }
          d.orden = +d.orden || 0;
          if (nueva) { d.id = D.nuevoId(); D.categorias.push(d); } else Object.assign(c, d);
          aviso("Sección guardada."); ir("#/admin/secciones");
        });
        var b = raiz.querySelector("[data-borrar]");
        if (b) b.addEventListener("click", function () {
          if (!confirm("¿Eliminar la sección «" + c.nombre_es + "» y sus " + suyos.length + " platos?")) return;
          suyos.forEach(function (x) { quitar(D.platos, x); });
          quitar(D.categorias, c); aviso("Sección eliminada."); ir("#/admin/secciones");
        });
      }
    };
  }

  /* Alérgenos: edición en la propia lista */
  VISTAS.alergenos = function () {
    var lista = D.alergenos.slice().sort(D.porOrden);
    var h = '<form class="pn-form" novalidate>' + tarjeta("", tabla(["Nombre (ES)", "Nombre (EN)", "Orden"], lista.map(function (a) {
      return ['<input class="pn-input" name="es-' + a.id + '" value="' + esc(a.nombre_es) + '" aria-label="Nombre en español">',
        '<input class="pn-input" name="en-' + a.id + '" value="' + esc(a.nombre_en) + '" aria-label="Nombre en inglés">',
        '<input class="pn-input pn-input--num" type="number" name="orden-' + a.id + '" value="' + a.orden + '" aria-label="Orden">'];
    })) + '<p class="pn-sutil">Son los 14 alérgenos de declaración obligatoria. Se marcan en cada plato.</p>') + botones() + "</form>";
    return {
      titulo: "Alérgenos", html: h,
      despues: function (raiz) {
        var form = raiz.querySelector("form");
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          var d = leerForm(form);
          D.alergenos.forEach(function (a) {
            if (d["es-" + a.id].trim()) a.nombre_es = d["es-" + a.id].trim();
            a.nombre_en = d["en-" + a.id].trim(); a.orden = +d["orden-" + a.id] || 0;
          });
          aviso("Alérgenos guardados."); ir("#/admin/alergenos");
        });
      }
    };
  };

  /* Promociones */
  function vigente(pr) { return D.promosVigentes().indexOf(pr) !== -1; }
  VISTAS.promociones = function (p) {
    if (p[0]) return fichaPromo(p[0]);
    var lista = D.promociones.slice().sort(D.porOrden);
    var h = tarjeta("", tabla(["", "Promoción", "Precio", "Se ve ahora", "Activa", "Desde", "Hasta", "Orden"], lista.map(function (x) {
      return [x.foto ? '<img class="pn-mini" src="' + esc(x.foto) + '" alt="">' : "", '<a href="#/admin/promociones/' + x.id + '">' + esc(x.titulo_es) + "</a>",
        esc(x.precio_es), vigente(x) ? badge("Sí", "ok") : badge("No", "gris"), interruptor("promociones:" + x.id + ":activa", x.activa, "Activa"),
        esc(fechaES(x.desde) || "—"), esc(fechaES(x.hasta) || "—"),
        '<input class="pn-input pn-input--num" type="number" min="0" value="' + x.orden + '" data-cambia="promociones:' + x.id + ':orden" aria-label="Orden">'];
    }), "No hay promociones.") + '<p class="pn-sutil">Salen en la portada y al final de la carta mientras estén activas y dentro de sus fechas.</p>');
    return { titulo: "Promociones", accion: '<a class="pn-boton" href="#/admin/promociones/nueva">' + ico("add") + "Crear promoción</a>", html: h };
  };
  function fichaPromo(id) {
    var nueva = id === "nueva";
    var x = nueva ? { titulo_es: "", titulo_en: "", texto_es: "", texto_en: "", precio_es: "", precio_en: "", condiciones_es: "", condiciones_en: "",
                      foto: "", activa: true, desde: "", hasta: "", orden: D.promociones.length + 1 } : porId(D.promociones, id);
    if (!x) return noExiste();
    var h = '<form class="pn-form" novalidate>' + pestanas(["Español", "Inglés", "Foto y fechas"]) +
      panelPestana(0, tarjeta("", campo("Título (ES)", inp("titulo_es", x.titulo_es, "text", ' maxlength="80" required')) + campo("Texto (ES)", area("texto_es", x.texto_es, 4)) +
        fila(campo("Precio (ES)", inp("precio_es", x.precio_es), "Texto libre: «16,50 €», «Desde 32 €»."), campo("Condiciones (ES)", inp("condiciones_es", x.condiciones_es))))) +
      panelPestana(1, tarjeta("", campo("Título (EN)", inp("titulo_en", x.titulo_en, "text", ' maxlength="80"')) + campo("Texto (EN)", area("texto_en", x.texto_en, 4)) +
        fila(campo("Precio (EN)", inp("precio_en", x.precio_en)), campo("Condiciones (EN)", inp("condiciones_en", x.condiciones_en))) +
        '<p class="pn-sutil">Si dejas un campo en inglés vacío, se muestra el texto en español.</p>')) +
      panelPestana(2, tarjeta("", campo("Foto", campoFoto("foto", x.foto)) +
        fila(chk("activa", x.activa, "Activa"), campo("Orden", inp("orden", x.orden, "number", ' min="0"'), "", "corto")) +
        fila(campo("Desde", inp("desde", x.desde, "date")), campo("Hasta", inp("hasta", x.hasta, "date"), "Vacío = sin fecha de fin.")))) +
      '<p class="pn-error" hidden></p>' + botones("#/admin/promociones", !nueva) + "</form>";
    return {
      titulo: nueva ? "Crear promoción" : x.titulo_es, migas: [["Promociones", "#/admin/promociones"]], html: h,
      despues: function (raiz) {
        activarPestanas(raiz); activarFotos(raiz);
        var form = raiz.querySelector("form"), err = raiz.querySelector(".pn-error");
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          var d = leerForm(form);
          if (!d.titulo_es.trim()) { abrirPestana(raiz, 0); err.textContent = "Escribe el título en español."; err.hidden = false; return; }
          if (d.desde && d.hasta && d.hasta < d.desde) { abrirPestana(raiz, 2); err.textContent = "La fecha «Hasta» es anterior a «Desde»."; err.hidden = false; return; }
          d.orden = +d.orden || 0;
          if (nueva) { d.id = D.nuevoId(); D.promociones.push(d); } else Object.assign(x, d);
          var obj = nueva ? d : x;
          aviso("Promoción guardada. " + (vigente(obj) ? "Ya se ve en la web." : "Ahora mismo no se ve en la web (está inactiva o fuera de fechas)."));
          ir("#/admin/promociones");
        });
        var b = raiz.querySelector("[data-borrar]");
        if (b) b.addEventListener("click", function () {
          if (!confirm("¿Eliminar esta promoción?")) return;
          quitar(D.promociones, x); aviso("Promoción eliminada."); ir("#/admin/promociones");
        });
      }
    };
  }

  /* Datos, colores y fotos */
  var PALETAS = [
    ["Granate (la de la web)", { color_fondo: "#e2e2e2", color_superficie: "#d6d6d6", color_tinta: "#7d0c14", color_tinta_suave: "#6b3a3f", color_acento: "#7d0c14", color_sobre_acento: "#ececec" }],
    ["Verde oliva", { color_fondo: "#ecebe1", color_superficie: "#dfddcf", color_tinta: "#2f3a1f", color_tinta_suave: "#5b6146", color_acento: "#4d5b23", color_sobre_acento: "#f4f2e6" }],
    ["Azul marino", { color_fondo: "#eef0f2", color_superficie: "#dde2e7", color_tinta: "#14243b", color_tinta_suave: "#4a5a70", color_acento: "#1d3b66", color_sobre_acento: "#f1f4f8" }],
    ["Noche", { color_fondo: "#151312", color_superficie: "#24201e", color_tinta: "#f0e6d8", color_tinta_suave: "#b5a796", color_acento: "#d9973b", color_sobre_acento: "#1a1410" }],
    ["Terracota", { color_fondo: "#f3ebe3", color_superficie: "#e8dacd", color_tinta: "#3b1e12", color_tinta_suave: "#7a5443", color_acento: "#b4532a", color_sobre_acento: "#fbf3ec" }]
  ];
  var COLORES = [["color_fondo", "Fondo", "Color del papel de la página."], ["color_superficie", "Fondo secundario", "Un tono más oscuro que el fondo, para separar bloques."],
                 ["color_tinta", "Texto", "Color principal de los textos y del nombre."], ["color_tinta_suave", "Texto secundario", ""],
                 ["color_acento", "Color de marca", "Botones y bloques de color."], ["color_sobre_acento", "Texto sobre el color de marca", ""]];

  VISTAS.datos = function (p, q) {
    var c = cfg;
    var colores = COLORES.map(function (k) {
      return campo(k[1], '<span class="pn-color"><input type="color" name="' + k[0] + '" value="' + esc(c[k[0]]) + '"><code>' + esc(c[k[0]]) + "</code></span>", k[2]);
    });
    var h = '<form class="pn-form" novalidate>' + pestanas(["Restaurante", "Contacto", "Colores", "Fotos", "Reservas", "Datos legales"]) +
      panelPestana(0, tarjeta("", campo("Nombre del restaurante", inp("nombre", c.nombre, "text", ' maxlength="60" required'), "Sale en grande en la portada.") +
        fila(campo("Eslogan (ES)", inp("eslogan_es", c.eslogan_es)), campo("Eslogan (EN)", inp("eslogan_en", c.eslogan_en))) +
        fila(campo("Tipo de cocina (ES)", inp("tipo_cocina_es", c.tipo_cocina_es)), campo("Tipo de cocina (EN)", inp("tipo_cocina_en", c.tipo_cocina_en))) +
        fila(campo("Ciudad", inp("ciudad", c.ciudad)), campo("Barrio o zona", inp("barrio", c.barrio)), campo("Año de apertura", inp("ano_apertura", c.ano_apertura, "number", ' min="1800" max="2100"'))) +
        fila(campo("Descripción para Google (ES)", inp("descripcion_es", c.descripcion_es, "text", ' maxlength="200"')), campo("Descripción para Google (EN)", inp("descripcion_en", c.descripcion_en, "text", ' maxlength="200"'))))) +
      panelPestana(1, tarjeta("", campo("Dirección", inp("direccion", c.direccion)) + campo("Enlace a Google Maps", inp("url_mapa", c.url_mapa, "url")) +
        fila(campo("Teléfono", inp("telefono", c.telefono, "tel")), campo("Segundo teléfono", inp("telefono_2", c.telefono_2, "tel"))) + campo("Email público", inp("email", c.email, "email")) +
        fila(campo("Instagram", inp("instagram", c.instagram, "url")), campo("Facebook", inp("facebook", c.facebook, "url"))) +
        fila(campo("TikTok", inp("tiktok", c.tiktok, "url")), campo("Tripadvisor", inp("tripadvisor", c.tripadvisor, "url"))))) +
      panelPestana(2, tarjeta("", '<p class="pn-sutil">Los cambios se ven en la web al guardar. Consejo: mantén buen contraste entre fondo y texto.</p>' +
        '<div class="pn-paletas"><span class="pn-etq">Prueba una combinación:</span>' + PALETAS.map(function (pa, i) {
          var v = pa[1];
          return '<button type="button" class="pn-paleta" data-paleta="' + i + '"><span style="background:' + v.color_fondo + '"></span><span style="background:' + v.color_acento +
            '"></span><span style="background:' + v.color_tinta + '"></span>' + esc(pa[0]) + "</button>";
        }).join("") + "</div>" +
        '<div class="pn-colores">' + colores.join("") + "</div>" +
        '<div class="pn-muestra" data-muestra><p class="pn-muestra__nombre">' + esc(c.nombre) + '</p><p>Así se leen los textos sobre el fondo.</p><p class="pn-muestra__suave">Texto secundario: horarios, notas…</p>' +
        '<div class="pn-muestra__bloque">Fondo secundario</div><span class="pn-muestra__boton">Reservar mesa</span></div>')) +
      panelPestana(3, tarjeta("", '<p class="pn-sutil">Si dejas una foto vacía se usa la imagen de ejemplo. En esta maqueta la foto solo se ve en tu navegador: no se sube a ningún sitio.</p>' +
        '<div class="pn-fotos">' +
        campo("Foto de portada", campoFoto("foto_portada", c.foto_portada, "img/obras/bodegon-cerezas.jpg"), "Vertical. Se ve en el móvil bajo el nombre y en la galería.") +
        campo("Foto ancha (cocina, brasa, local)", campoFoto("foto_cocina", c.foto_cocina, "video/brasas-poster.jpg"), "Si está vacía, en la portada se ve el vídeo de las brasas.") +
        campo("Foto de la historia", campoFoto("foto_historia", c.foto_historia, "img/obras/bodegon-merienda.jpg")) +
        campo("Foto de la carta", campoFoto("foto_carta", c.foto_carta, "img/obras/bodegon-salmon.jpg")) + "</div>" +
        campo("Créditos de las fotos", area("creditos_fotos", c.creditos_fotos, 4), "Se muestra pequeño en el pie. Puede llevar enlaces HTML."))) +
      panelPestana(4, tarjeta("", chk("reservas_activas", c.reservas_activas, "Aceptar reservas online") +
        fila(campo("Comensales por franja", inp("capacidad_por_hora", c.capacidad_por_hora, "number", ' min="1"'), "Máximo de personas que pueden reservar a la misma hora."),
             campo("Máximo de personas por reserva", inp("max_personas", c.max_personas, "number", ' min="1" max="100"'), "Los grupos más grandes deberán llamar por teléfono.")) +
        fila(campo("Antelación mínima (horas)", inp("min_horas_antelacion", c.min_horas_antelacion, "number", ' min="0"')),
             campo("Se puede reservar hasta (días)", inp("max_dias_antelacion", c.max_dias_antelacion, "number", ' min="1"')),
             campo("Minutos entre horas de reserva", inp("intervalo_minutos", c.intervalo_minutos, "number", ' min="5" max="120"'))))) +
      panelPestana(5, tarjeta("", '<p class="pn-sutil">Se usan en el aviso legal y la política de privacidad.</p>' +
        fila(campo("Titular (razón social)", inp("titular", c.titular)), campo("CIF / NIF", inp("cif", c.cif))) + campo("Dirección fiscal", inp("direccion_fiscal", c.direccion_fiscal)) +
        campo("Email para protección de datos", inp("email_privacidad", c.email_privacidad, "email")))) +
      '<p class="pn-error" hidden></p>' + botones() + "</form>";
    return {
      titulo: "Datos, colores y fotos", html: h, accion: '<a class="pn-boton pn-boton--suave" href="#/">' + ico("open_in_new") + "Ver la web</a>",
      despues: function (raiz) {
        activarPestanas(raiz); activarFotos(raiz);
        if (q.tab) abrirPestana(raiz, q.tab);
        var form = raiz.querySelector("form"), err = raiz.querySelector(".pn-error"), muestra = raiz.querySelector("[data-muestra]");
        function pintarMuestra() {
          var v = leerForm(form);
          muestra.style.setProperty("--m-bg", v.color_fondo); muestra.style.setProperty("--m-sup", v.color_superficie);
          muestra.style.setProperty("--m-ink", v.color_tinta); muestra.style.setProperty("--m-suave", v.color_tinta_suave);
          muestra.style.setProperty("--m-acc", v.color_acento); muestra.style.setProperty("--m-sobre", v.color_sobre_acento);
          form.querySelectorAll(".pn-color").forEach(function (s) { s.querySelector("code").textContent = s.querySelector("input").value; });
        }
        form.querySelectorAll("input[type=color]").forEach(function (i) { i.addEventListener("input", pintarMuestra); });
        raiz.querySelectorAll("[data-paleta]").forEach(function (b) {
          b.addEventListener("click", function () {
            var v = PALETAS[+b.dataset.paleta][1];
            Object.keys(v).forEach(function (k) { form.elements[k].value = v[k]; });
            pintarMuestra();
          });
        });
        pintarMuestra();
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          var d = leerForm(form);
          if (!d.nombre.trim()) { abrirPestana(raiz, 0); err.textContent = "El nombre no puede estar vacío."; err.hidden = false; return; }
          ["capacidad_por_hora", "max_personas", "min_horas_antelacion", "max_dias_antelacion", "intervalo_minutos"].forEach(function (k) { d[k] = Math.max(0, parseInt(d[k], 10) || 0); });
          d.capacidad_por_hora = Math.max(1, d.capacidad_por_hora); d.max_personas = Math.min(100, Math.max(1, d.max_personas));
          d.max_dias_antelacion = Math.max(1, d.max_dias_antelacion); d.intervalo_minutos = Math.min(120, Math.max(5, d.intervalo_minutos || 30));
          d.ano_apertura = d.ano_apertura ? parseInt(d.ano_apertura, 10) : "";
          d.nombre = d.nombre.trim();
          Object.assign(cfg, d);
          window.WEB.refrescarTema();
          aviso('Guardado. Los cambios ya están en la web. <a href="#/">Ver la web →</a>', "ok", true);
          var activa = raiz.querySelector('[data-pestana][aria-selected="true"]');
          ir("#/admin/datos" + (activa && activa.dataset.pestana !== "0" ? "?tab=" + activa.dataset.pestana : ""));
        });
      }
    };
  };

  /* Horario */
  VISTAS.horario = function () {
    var lista = D.turnos.slice().sort(function (a, b) { return a.dia - b.dia || (a.apertura < b.apertura ? -1 : 1); });
    var dias = F.DIAS_ES.map(function (d, i) { return [i, d.charAt(0).toUpperCase() + d.slice(1)]; });
    var h = '<form class="pn-form" novalidate data-turnos>' + tarjeta("", tabla(["Día", "Turno", "Abre", "Cierra", "Última reserva", "Abierto", ""], lista.map(function (t) {
        return [esc(dias[t.dia][1]), '<input class="pn-input" name="nombre-' + t.id + '" value="' + esc(t.nombre_es) + '" aria-label="Nombre del turno">',
          '<input class="pn-input" type="time" name="apertura-' + t.id + '" value="' + t.apertura + '" aria-label="Abre">',
          '<input class="pn-input" type="time" name="cierre-' + t.id + '" value="' + t.cierre + '" aria-label="Cierra">',
          '<input class="pn-input" type="time" name="ultima-' + t.id + '" value="' + t.ultima_reserva + '" aria-label="Última hora de reserva">',
          '<input type="checkbox" name="activo-' + t.id + '"' + (t.activo ? " checked" : "") + ' aria-label="Abierto">',
          '<button type="button" class="pn-enlace pn-enlace--peligro" data-quitar="' + t.id + '">Quitar</button>'];
      })) + '<p class="pn-sutil">«Última reserva» es la última hora que se ofrece en el formulario. Desmarca «Abierto» para cerrar un turno sin borrarlo.</p>' +
      '<p class="pn-error" hidden></p>' + botones()) + "</form>" +
      tarjeta("Añadir un turno", '<form class="pn-form" novalidate data-nuevo>' +
        fila(campo("Día", sel("dia", dias, 6)), campo("Nombre (ES)", inp("nombre_es", "Cena")), campo("Nombre (EN)", inp("nombre_en", "Dinner"))) +
        fila(campo("Abre", inp("apertura", "20:30", "time")), campo("Cierra", inp("cierre", "23:30", "time")), campo("Última reserva", inp("ultima_reserva", "23:00", "time"))) +
        '<p class="pn-error" hidden></p><div class="pn-botonera"><button class="pn-boton" type="submit">' + ico("add") + "Añadir turno</button></div></form>");
    function revisar(ap, ci, ul) {
      if (!F.esHoraValida(ap) || !F.esHoraValida(ci) || !F.esHoraValida(ul)) return "Rellena todas las horas.";
      if (ci <= ap) return "La hora de cierre debe ser posterior a la de apertura.";
      if (ul < ap || ul > ci) return "La última reserva debe estar entre la apertura y el cierre.";
      return "";
    }
    return {
      titulo: "Horario", html: h,
      despues: function (raiz) {
        var form = raiz.querySelector("[data-turnos]"), err = form.querySelector(".pn-error");
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          var d = leerForm(form), fallo = "";
          D.turnos.forEach(function (t) {
            var f = revisar(d["apertura-" + t.id], d["cierre-" + t.id], d["ultima-" + t.id]);
            if (f && !fallo) fallo = F.DIAS_ES[t.dia] + " (" + t.nombre_es + "): " + f;
          });
          if (fallo) { err.textContent = fallo; err.hidden = false; return; }
          D.turnos.forEach(function (t) {
            t.nombre_es = d["nombre-" + t.id].trim() || t.nombre_es;
            t.apertura = d["apertura-" + t.id]; t.cierre = d["cierre-" + t.id]; t.ultima_reserva = d["ultima-" + t.id]; t.activo = d["activo-" + t.id];
          });
          aviso("Horario guardado. La web ya ofrece estas horas."); ir("#/admin/horario");
        });
        raiz.querySelectorAll("[data-quitar]").forEach(function (b) {
          b.addEventListener("click", function () {
            var t = porId(D.turnos, b.dataset.quitar);
            if (!confirm("¿Quitar el turno de " + t.nombre_es.toLowerCase() + " del " + F.DIAS_ES[t.dia] + "?")) return;
            quitar(D.turnos, t); aviso("Turno quitado."); ir("#/admin/horario");
          });
        });
        var nuevo = raiz.querySelector("[data-nuevo]"), err2 = nuevo.querySelector(".pn-error");
        nuevo.addEventListener("submit", function (e) {
          e.preventDefault();
          var d = leerForm(nuevo), f = revisar(d.apertura, d.cierre, d.ultima_reserva);
          if (f) { err2.textContent = f; err2.hidden = false; return; }
          D.turnos.push({ id: D.nuevoId(), dia: +d.dia, nombre_es: d.nombre_es.trim() || "Turno", nombre_en: d.nombre_en.trim(), apertura: d.apertura,
                          cierre: d.cierre, ultima_reserva: d.ultima_reserva, activo: true });
          aviso("Turno añadido."); ir("#/admin/horario");
        });
      }
    };
  };

  /* Textos de la web */
  VISTAS.textos = function (p, q) {
    if (p[0]) return fichaTexto(p[0]);
    var grupos = [];
    D.textos.forEach(function (t) { if (grupos.indexOf(t.grupo) === -1) grupos.push(t.grupo); });
    var lista = D.textos.filter(function (t) {
      if (q.grupo && t.grupo !== q.grupo) return false;
      return coincide(q.q, [t.clave, t.es, t.en, t.descripcion]);
    });
    var h = filtros("#/admin/textos", q, sel("grupo", [["", "Todos los grupos"]].concat(grupos.map(function (g) { return [g, g]; })), q.grupo || "")) +
      tarjeta("", tabla(["Texto", "Español", "Inglés", "Dónde sale"], lista.map(function (t) {
        return ['<a href="#/admin/textos/' + encodeURIComponent(t.clave) + '">' + esc(t.descripcion || t.clave) + "</a>", esc(corto(t.es, 90)), esc(corto(t.en, 90)), esc(t.grupo)];
      }), "No hay textos con estos filtros."));
    return { titulo: "Textos de la web", html: h, despues: activarFiltros };
  };
  function fichaTexto(clave) {
    var t = D.textos.filter(function (x) { return x.clave === clave; })[0];
    if (!t) return noExiste();
    var variables = (t.es.match(/\{[a-z_]+\}/g) || []).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var h = '<form class="pn-form" novalidate>' + tarjeta("",
      '<dl class="pn-datos"><div><dt>Para qué sirve</dt><dd>' + esc(t.descripcion || "—") + "</dd></div><div><dt>Dónde sale</dt><dd>" + esc(t.grupo) +
      "</dd></div><div><dt>Clave</dt><dd><code>" + esc(t.clave) + "</code></dd></div></dl>" +
      (variables.length ? '<p class="pn-sutil">Mantén ' + variables.map(function (v) { return "<code>" + esc(v) + "</code>"; }).join(", ") + ": se sustituyen por el dato real.</p>" : "") +
      campo("Español", area("es", t.es, 4)) + campo("Inglés", area("en", t.en, 4), "Si lo dejas vacío, se muestra el texto en español.")) +
      '<p class="pn-error" hidden></p>' + botones("#/admin/textos") + "</form>";
    return {
      titulo: t.descripcion || t.clave, migas: [["Textos de la web", "#/admin/textos"]], html: h,
      despues: function (raiz) {
        var form = raiz.querySelector("form"), err = raiz.querySelector(".pn-error");
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          var d = leerForm(form);
          if (!d.es.trim()) { err.textContent = "El texto en español no puede estar vacío."; err.hidden = false; return; }
          t.es = d.es.trim(); t.en = d.en.trim();
          aviso("Texto guardado. Ya se ve en la web."); ir("#/admin/textos?grupo=" + encodeURIComponent(t.grupo));
        });
      }
    };
  }

  /* Páginas legales */
  VISTAS.legales = function (p) {
    if (p[0]) return fichaLegal(p[0]);
    var lista = D.legales.slice().sort(D.porOrden);
    return {
      titulo: "Páginas legales",
      html: tarjeta("", tabla(["Título", "Dirección", "Orden", ""], lista.map(function (l) {
        return ['<a href="#/admin/legales/' + l.id + '">' + esc(l.titulo_es) + "</a>", "<code>/legal/" + esc(l.slug) + "/</code>", l.orden, '<a href="#/legal/' + esc(l.slug) + '">Ver en la web</a>'];
      })) + '<p class="pn-sutil">Rellena primero tus datos en <a href="#/admin/datos?tab=5">Datos legales</a>: se ponen solos en estos textos.</p>')
    };
  };
  function fichaLegal(id) {
    var l = porId(D.legales, id);
    if (!l) return noExiste();
    var ayuda = "Separa los párrafos con una línea en blanco. Puedes usar {titular}, {cif}, {direccion}, {email} y {nombre}: se rellenan con los datos legales.";
    var h = '<form class="pn-form" novalidate>' + pestanas(["Español", "Inglés", "Ajustes"]) +
      panelPestana(0, tarjeta("", campo("Título (ES)", inp("titulo_es", l.titulo_es)) + campo("Contenido (ES)", area("contenido_es", l.contenido_es, 16), ayuda))) +
      panelPestana(1, tarjeta("", campo("Título (EN)", inp("titulo_en", l.titulo_en)) + campo("Contenido (EN)", area("contenido_en", l.contenido_en, 16)))) +
      panelPestana(2, tarjeta("", fila(campo("Dirección", inp("slug", l.slug), "Aparece en la URL: /legal/<dirección>/"), campo("Orden", inp("orden", l.orden, "number"), "", "corto")))) +
      '<p class="pn-error" hidden></p>' + botones("#/admin/legales") + "</form>";
    return {
      titulo: l.titulo_es, migas: [["Páginas legales", "#/admin/legales"]], html: h,
      accion: '<a class="pn-boton pn-boton--suave" href="#/legal/' + esc(l.slug) + '">' + ico("open_in_new") + "Ver en la web</a>",
      despues: function (raiz) {
        activarPestanas(raiz);
        var form = raiz.querySelector("form"), err = raiz.querySelector(".pn-error");
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          var d = leerForm(form);
          d.slug = d.slug.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          if (!d.titulo_es.trim() || !d.contenido_es.trim() || !d.slug) { err.textContent = "Rellena el título, el contenido en español y la dirección."; err.hidden = false; return; }
          if (D.legales.some(function (o) { return o !== l && o.slug === d.slug; })) { abrirPestana(raiz, 2); err.textContent = "Ya hay otra página con esa dirección."; err.hidden = false; return; }
          d.orden = +d.orden || 0;
          Object.assign(l, d); aviso("Página guardada."); ir("#/admin/legales");
        });
      }
    };
  }

  function noExiste() {
    return { titulo: "No encontrado", html: tarjeta("", '<p>Esto ya no existe (quizá lo has borrado). <a href="#/admin">Volver al inicio del panel</a></p>') };
  }

  /* ---------------- Marco del panel ---------------- */
  var MENU = [
    ["Día a día", [["inicio", "Inicio", "dashboard"], ["reservas", "Reservas", "event_seat"], ["mensajes", "Mensajes", "mail"], ["cerrados", "Días cerrados", "event_busy"]]],
    ["Carta y promociones", [["platos", "Platos", "restaurant_menu"], ["secciones", "Secciones de la carta", "menu_book"], ["alergenos", "Alérgenos", "warning"], ["promociones", "Promociones", "sell"]]],
    ["La web", [["datos", "Datos, colores y fotos", "palette"], ["horario", "Horario", "schedule"], ["textos", "Textos de la web", "translate"], ["legales", "Páginas legales", "gavel"]]]
  ];

  function marco(seccion, res) {
    var n = sinLeer();
    var menu = MENU.map(function (g) {
      return '<p class="pn-grupo">' + esc(g[0]) + "</p>" + g[1].map(function (it) {
        return '<a href="#/admin' + (it[0] === "inicio" ? "" : "/" + it[0]) + '"' + (it[0] === seccion ? ' class="es-activo" aria-current="page"' : "") + ">" + ico(it[2]) +
          "<span>" + esc(it[1]) + "</span>" + (it[0] === "mensajes" ? '<span class="pn-contador" data-badge-mensajes' + (n ? "" : " hidden") + ">" + n + "</span>" : "") + "</a>";
      }).join("");
    }).join("");
    var migas = '<a href="#/admin">Inicio</a>' + (res.migas || []).map(function (m) { return ' <span aria-hidden="true">›</span> <a href="' + m[1] + '">' + esc(m[0]) + "</a>"; }).join("") +
      (seccion !== "inicio" ? ' <span aria-hidden="true">›</span> <span>' + esc(res.titulo) + "</span>" : "");
    var f = flash; flash = null;
    return '<div class="pn">' +
      '<aside class="pn-lateral" id="pn-lateral"><a class="pn-marca" href="#/admin">' + ico("restaurant") + "<span><strong>Panel del restaurante</strong><small>Gestión de la web</small></span></a>" +
      '<nav class="pn-menu" aria-label="Panel">' + menu + "</nav></aside>" +
      '<div class="pn-principal"><header class="pn-cabecera">' +
      '<button type="button" class="pn-abrir" aria-controls="pn-lateral" aria-expanded="false">' + ico("menu") + '<span class="sr">Menú</span></button>' +
      '<nav class="pn-migas" aria-label="Estás en">' + migas + "</nav>" +
      '<div class="pn-usuario"><a href="#/" class="pn-enlace">' + ico("open_in_new") + '<span class="pn-ocultar-movil">Ver la web</span></a>' +
      '<button type="button" class="pn-enlace" data-salir>' + ico("logout") + '<span class="pn-ocultar-movil">Salir</span></button></div></header>' +
      '<main class="pn-contenido" id="contenido">' +
      (f ? '<div class="pn-flash pn-flash--' + f.tipo + '" role="status">' + (f.html ? f.texto : esc(f.texto)) + "</div>" : "") +
      '<div class="pn-titulo"><h1>' + esc(res.titulo) + "</h1>" + (res.accion || "") + "</div>" + res.html + "</main></div></div>" +
      '<div class="pn-toast" id="pn-toast" role="status" aria-live="polite"></div>';
  }

  function login(error) {
    document.title = "Acceso · Panel del restaurante";
    app.innerHTML = '<div class="pn-login"><form class="pn-tarjeta pn-login__caja" novalidate>' +
      '<p class="pn-marca pn-marca--login">' + ico("restaurant") + "<span><strong>Panel del restaurante</strong><small>" + esc(cfg.nombre) + "</small></span></p>" +
      '<div class="pn-demo-cuenta">' + ico("lock") + "<span>Cuenta de ejemplo: usuario <code>" + USUARIO + "</code> · contraseña <code>" + CLAVE +
      '</code><br><button type="button" class="pn-enlace" data-rellenar>Rellenar por mí</button></span></div>' +
      campo("Usuario", '<input class="pn-input" name="usuario" autocomplete="username" required>') +
      campo("Contraseña", '<input class="pn-input" name="clave" type="password" autocomplete="current-password" required>') +
      '<p class="pn-error"' + (error ? "" : " hidden") + ">Usuario o contraseña incorrectos.</p>" +
      '<button class="pn-boton pn-boton--ancho" type="submit">Entrar</button>' +
      '<p class="pn-sutil pn-centro"><a href="#/">← Volver a la web</a></p></form></div>';
    var form = app.querySelector("form");
    app.querySelector("[data-rellenar]").addEventListener("click", function () {
      form.elements.usuario.value = USUARIO; form.elements.clave.value = CLAVE; form.querySelector("button[type=submit]").focus();
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.elements.usuario.value.trim() === USUARIO && form.elements.clave.value === CLAVE) { D.sesion.dentro = true; ir(location.hash); }
      else login(true);
    });
    form.elements.usuario.focus();
  }

  var rutaPanel = null;
  function pintar(ruta) {
    rutaPanel = ruta;
    document.body.className = "en-panel";
    document.documentElement.lang = "es";
    if (!D.sesion.dentro) { login(); window.scrollTo(0, 0); return; }
    var p = ruta.partes.slice(1), seccion = p[0] || "inicio";
    var vista = VISTAS[seccion] || noExiste;
    var res = vista(p.slice(1), ruta.query);
    document.title = res.titulo + " · Panel del restaurante";
    app.innerHTML = marco(VISTAS[seccion] ? seccion : "", res);
    var raiz = app.querySelector(".pn-contenido");
    activarInterruptores(raiz);
    if (res.despues) res.despues(raiz);

    var lateral = app.querySelector("#pn-lateral"), abrir = app.querySelector(".pn-abrir");
    abrir.addEventListener("click", function () {
      var si = lateral.classList.toggle("es-abierto");
      abrir.setAttribute("aria-expanded", si ? "true" : "false");
    });
    app.querySelector("[data-salir]").addEventListener("click", function () { D.sesion.dentro = false; ir("#/admin"); });
    window.scrollTo(0, 0);
  }

  return { pintar: pintar };
})();
