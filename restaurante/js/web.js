/* Web pública de la demo: las mismas páginas que las plantillas Django (templates/web/),
   pintadas en el navegador. Rutas con # para que todo sea una sola página y el estado
   (reservas, cambios del panel) se comparta sin guardar nada. */
(function () {
  "use strict";
  var D = window.DEMO, cfg = D.cfg, F = D.f;
  var app = document.getElementById("app");

  var lang = "es";
  try { lang = (navigator.language || "es").toLowerCase().indexOf("en") === 0 ? "en" : "es"; } catch (e) {}

  /* ---------------- Utilidades ---------------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function rellenar(texto, datos) {
    texto = String(texto || "");
    Object.keys(datos).forEach(function (k) { texto = texto.split("{" + k + "}").join(datos[k]); });
    return texto;
  }
  function tr(o, c) { return D.tr(o, c, lang); }
  function euros(v) {
    if (v === null || v === undefined || v === "") return "";
    v = +v;
    var entero = v === Math.round(v);
    if (lang === "en") return "€" + (entero ? v.toFixed(0) : v.toFixed(2));
    return (entero ? v.toFixed(0) : v.toFixed(2).replace(".", ",")) + " €";
  }
  function telEnlace(t) { return String(t || "").replace(/[^\d+]/g, ""); }
  function parrafos(t) {
    return String(t || "").replace(/\r\n/g, "\n").split("\n\n").map(function (p) { return p.trim(); }).filter(Boolean);
  }
  function capfirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function limpiar(v, max, multilinea) {
    v = String(v || "").trim();
    v = multilinea ? v.replace(/[^\n\P{C}]/gu, "") : v.split(/\s+/).join(" ").replace(/\p{C}/gu, "");
    return v.slice(0, max);
  }
  // Créditos de fotos: solo se permiten enlaces <a href>, el resto se escapa
  function htmlSeguro(t) {
    var plantilla = document.createElement("template");
    plantilla.innerHTML = t || "";
    (function limpiarNodo(n) {
      Array.prototype.slice.call(n.childNodes).forEach(function (h) {
        if (h.nodeType === 1) {
          if (h.tagName !== "A") { h.replaceWith(document.createTextNode(h.textContent)); return; }
          var href = h.getAttribute("href") || "";
          Array.prototype.slice.call(h.attributes).forEach(function (a) { h.removeAttribute(a.name); });
          if (/^https?:\/\//i.test(href)) { h.setAttribute("href", href); h.setAttribute("rel", "noopener"); h.setAttribute("target", "_blank"); }
          limpiarNodo(h);
        }
      });
    })(plantilla.content);
    return plantilla.innerHTML;
  }

  function fotos() {
    return {
      portada: cfg.foto_portada || "img/obras/bodegon-cerezas.jpg",
      cocina: cfg.foto_cocina || "img/obras/brasas.jpg",
      historia: cfg.foto_historia || "img/obras/bodegon-merienda.jpg",
      carta: cfg.foto_carta || "img/obras/bodegon-salmon.jpg",
      promo: "img/obras/bodegon-naranjas.jpg"
    };
  }

  /* Colores del panel -> variables CSS, como el <style> de base.html */
  function aplicarTema() {
    var r = document.documentElement.style;
    r.setProperty("--bg", cfg.color_fondo);
    r.setProperty("--surface", cfg.color_superficie);
    r.setProperty("--ink", cfg.color_tinta);
    r.setProperty("--muted", cfg.color_tinta_suave);
    r.setProperty("--accent", cfg.color_acento);
    r.setProperty("--accent-ink", cfg.color_sobre_acento);
    var icono = document.getElementById("favicon");
    if (icono) {
      icono.href = "data:image/svg+xml," + encodeURIComponent(
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='" + cfg.color_acento +
        "'/><text x='32' y='50' font-family='Arial Black,Arial' font-weight='900' font-size='46' text-anchor='middle' fill='" +
        cfg.color_sobre_acento + "'>" + esc((cfg.nombre || "?").charAt(0).toUpperCase()) + "</text></svg>");
    }
    var meta = document.querySelector("meta[name=description]");
    if (meta) meta.content = tr(cfg, "descripcion");
  }

  /* ---------------- Trozos comunes (base.html, _enlaces, _cta, _franja) ---------------- */
  function enlaces(t, pagina) {
    var otro = lang === "es" ? "en" : "es";
    return '<a href="#/carta"' + (pagina === "carta" ? ' aria-current="page"' : "") + ">" + esc(t.nav_carta) + "</a>" +
      '<a href="#/reservas"' + (pagina === "reservas" ? ' aria-current="page"' : "") + ">" + esc(t.nav_reservas) + "</a>" +
      '<a href="#/contacto"' + (pagina === "contacto" ? ' aria-current="page"' : "") + ">" + esc(t.nav_contacto) + "</a>" +
      '<a href="#" data-idioma="' + otro + '" lang="' + otro + '" hreflang="' + otro + '">' + (otro === "en" ? "English" : "Español") + "</a>";
  }

  function cabecera(t, pagina) {
    return '<header class="barra">' +
      '<a class="barra__marca" href="#/">' + esc(cfg.nombre) + "</a>" +
      '<nav class="barra__nav" aria-label="' + esc(t.nav_abrir) + '">' + enlaces(t, pagina) + "</nav>" +
      '<a class="boton barra__boton" href="#/reservas">' + esc(t.nav_reservar) + "</a>" +
      '<details class="menu-movil"><summary>' + esc(t.nav_abrir) + "</summary>" +
      '<nav class="menu-movil__panel" aria-label="' + esc(t.nav_abrir) + '"><a href="#/">' + esc(t.nav_inicio) + "</a>" +
      enlaces(t, pagina) + "</nav></details></header>";
  }

  function pie(t) {
    var redes = [["instagram", "Instagram"], ["facebook", "Facebook"], ["tiktok", "TikTok"], ["tripadvisor", "Tripadvisor"]]
      .filter(function (r) { return cfg[r[0]]; })
      .map(function (r) { return '<li><a href="' + esc(cfg[r[0]]) + '" rel="noopener" target="_blank">' + r[1] + "</a></li>"; }).join("");
    var legales = D.legales.slice().sort(D.porOrden).map(function (p) {
      return '<a href="#/legal/' + esc(p.slug) + '">' + esc(tr(p, "titulo")) + "</a>";
    }).join("");
    return '<footer class="pie" data-revela>' +
      '<div class="pie__arriba"><div class="pie__invitacion"><p class="pie__frase">' + esc(t.pie_invitacion) + "</p>" +
      '<a class="boton boton--claro" href="#/reservas">' + esc(t.pie_boton) + "</a></div>" +
      '<ul class="pie__enlaces"><li><a href="#/carta">' + esc(t.nav_carta) + '</a></li><li><a href="#/contacto">' + esc(t.nav_contacto) + "</a></li>" +
      (cfg.url_mapa ? '<li><a href="' + esc(cfg.url_mapa) + '" rel="noopener" target="_blank">' + esc(t.pie_mapa) + "</a></li>" : "") +
      redes + "</ul>" +
      '<address class="pie__datos">' +
      (cfg.direccion ? esc(cfg.direccion) + "<br>" : "") +
      (cfg.telefono ? '<a href="tel:' + esc(telEnlace(cfg.telefono)) + '">' + esc(cfg.telefono) + "</a><br>" : "") +
      (cfg.email ? '<a href="mailto:' + esc(cfg.email) + '">' + esc(cfg.email) + "</a>" : "") +
      "</address></div>" +
      '<div class="pie__legal"><p>© ' + new Date().getFullYear() + " " + esc(cfg.nombre) + ". " + esc(t.pie_derechos) + " " + legales + "</p>" +
      (cfg.creditos_fotos ? '<p class="pie__creditos">' + esc(t.pie_imagenes) + " " + htmlSeguro(cfg.creditos_fotos) + "</p>" : "") +
      '</div><p class="pie__nombre" aria-hidden="true">' + esc(cfg.nombre) + "</p></footer>";
  }

  function cta(t) {
    if (!cfg.reservas_activas) return "";
    return '<a class="cta" href="#/reservas" aria-labelledby="cta-palabra"><span class="cta__frase">' + esc(t.cta_frase) + "</span>" +
      '<svg class="cta__flecha" viewBox="0 0 48 48" width="48" height="48" aria-hidden="true"><path d="M12 36 36 12M16 12h20v20" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="square"/></svg>' +
      '<h2 class="cta__palabra" id="cta-palabra">' + esc(t.cta_palabra) + "</h2></a>";
  }

  function franja(t) {
    var f = fotos();
    return '<section class="franja" aria-labelledby="franja-titulo"><h2 id="franja-titulo" class="titulo-seccion" data-revela>' + esc(t.galeria_titulo) + "</h2>" +
      '<div class="franja__fotos" data-revela>' +
      '<figure><img src="' + esc(f.historia) + '" alt="" width="1600" height="1103" loading="lazy"></figure>' +
      '<figure><img src="' + esc(f.portada) + '" alt="" width="1218" height="1600" loading="lazy"></figure>' +
      '<figure><img src="' + esc(f.promo) + '" alt="" width="1600" height="1204" loading="lazy"></figure></div></section>';
  }

  function listaDatos(filas) {
    return filas.map(function (f) { return "<li><span>" + esc(f[0]) + "</span><span>" + esc(f[1]) + "</span></li>"; }).join("");
  }

  function titular(t1, intro, clase) {
    return '<section class="titular' + (clase ? " " + clase : "") + '" aria-labelledby="titulo"><div class="titular__texto" data-revela>' +
      '<h1 id="titulo" class="titular__h1">' + esc(t1) + "</h1>" + (intro ? '<p class="titular__intro">' + esc(intro) + "</p>" : "") + "</div></section>";
  }

  // Nota amarilla que solo existe en la maqueta para explicar lo que pasaría en la web real
  function notaDemo(html) { return '<aside class="nota-demo" role="note">' + html + "</aside>"; }

  /* ---------------- Páginas ---------------- */
  function pInicio(t) {
    var hoy = D.estadoHoy(lang), f = fotos();
    var destacados = D.platos.filter(function (p) {
      var c = D.categorias.filter(function (c) { return c.id === p.categoria; })[0];
      return p.destacado && p.visible && c && c.visible;
    }).sort(ordenPlatos).slice(0, 7);
    var promos = D.promosVigentes();

    var h = '<section class="portada" aria-labelledby="nombre">' +
      '<div class="portada__arriba-izq"><p class="portada__frase">' + esc(t.inicio_frase) + "</p>" +
      '<a class="boton" href="#/reservas">' + esc(t.inicio_boton) + "</a></div>" +
      '<nav class="portada__nav" aria-label="' + esc(t.nav_abrir) + '">' + enlaces(t, "inicio") + "</nav>" +
      '<h1 class="portada__nombre" id="nombre"><span class="ajuste" data-ajustar>' +
      String(cfg.nombre).split(/\s+/).filter(Boolean).map(function (p) { return '<span class="linea">' + esc(p) + "</span>"; }).join(" ") +
      "</span></h1>" +
      '<figure class="portada__foto"><img src="' + esc(f.portada) + '" alt="" width="1218" height="1600"></figure>' +
      '<div class="portada__hoy">';
    if (hoy.abierto) {
      h += '<p class="hoy__titulo"><span class="hoy__punto" aria-hidden="true"></span>' + esc(rellenar(t.hoy_abierto, { dia: hoy.dia })) + "</p>" +
        "<p>" + hoy.turnos.map(function (x) { return esc(x.nombre + " " + x.desde + "–" + x.hasta); }).join(" · ") + "</p>";
      if (cfg.reservas_activas) {
        h += hoy.quedan_horas && hoy.plazas > 0
          ? '<p><a href="#/reservas?fecha=hoy">' + esc(rellenar(t.hoy_plazas, { n: hoy.plazas })) + "</a></p>"
          : "<p>" + esc(t.hoy_completo) + "</p>";
      }
    } else {
      h += '<p class="hoy__titulo"><span class="hoy__punto hoy__punto--apagado" aria-hidden="true"></span>' +
        esc(rellenar(t.hoy_cerrado, { dia: hoy.dia, proximo: hoy.proximo || "" })) + "</p>";
    }
    h += "</div>" +
      '<address class="portada__donde">' +
      (cfg.direccion ? '<a href="' + esc(cfg.url_mapa || "#") + '" rel="noopener" target="_blank">' + esc(cfg.direccion) + "</a>" : "") +
      (cfg.telefono ? '<a href="tel:' + esc(telEnlace(cfg.telefono)) + '">' + esc(cfg.telefono) + "</a>" : "") +
      "</address></section>";

    // Quiénes somos
    h += '<section class="historia" aria-labelledby="historia-titulo"><div class="historia__fila" data-revela><dl class="historia__datos">' +
      (cfg.ano_apertura ? "<div><dt>" + esc(t.dato_desde) + "</dt><dd>" + esc(cfg.ano_apertura) + "</dd></div>" : "") +
      "<div><dt>" + esc(t.dato_donde) + "</dt><dd>" + (cfg.barrio ? esc(cfg.barrio) + ", " : "") + esc(cfg.ciudad) + "</dd></div>" +
      (cfg.tipo_cocina_es ? "<div><dt>" + esc(t.dato_cocina) + "</dt><dd>" + esc(tr(cfg, "tipo_cocina")) + "</dd></div>" : "") +
      '</dl><div class="historia__texto"><h2 id="historia-titulo" class="titulo-seccion">' + esc(t.historia_titulo) + "</h2>" +
      parrafos(t.historia_texto).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div></div>" +
      '<div class="historia__fila historia__fila--listas" data-revela><h3 class="historia__palabra">' + esc(t.horario_titulo) + "</h3>" +
      '<div class="historia__listas"><ul class="lista-datos" aria-label="' + esc(t.horario_titulo) + '">' + listaDatos(D.horarioPorDia(lang)) + "</ul>" +
      '<div><h3 class="historia__palabra historia__palabra--movil">' + esc(t.reservar_titulo) + "</h3>" +
      '<ul class="lista-datos" aria-label="' + esc(t.reservar_titulo) + '">' +
      "<li><span>" + esc(rellenar(t.dato_online, { n: cfg.max_personas })) + "</span></li>" +
      "<li><span>" + esc(t.dato_grupos) + "</span>" + (cfg.telefono ? '<a href="tel:' + esc(telEnlace(cfg.telefono)) + '">' + esc(cfg.telefono) + "</a>" : "") + "</li>" +
      "<li><span>" + esc(rellenar(t.dato_antelacion, { dias: cfg.max_dias_antelacion })) + "</span></li>" +
      "<li><span>" + esc(t.dato_confirmacion) + "</span></li></ul></div></div></div></section>";

    // Platos de la casa
    if (destacados.length) {
      h += '<section class="casa" aria-labelledby="casa-titulo"><div class="casa__cabeza" data-revela><h2 id="casa-titulo" class="titulo-seccion">' +
        esc(t.casa_titulo) + '</h2></div><ul class="casa__lista" data-revela>' +
        destacados.map(function (p) {
          return '<li class="casa__plato"><a href="#/carta/plato-' + p.id + '"><span class="casa__nombre">' + esc(tr(p, "nombre")) + "</span>" +
            '<span class="casa__precio">' + esc(euros(p.precio)) + (p.precio_nota_es ? " " + esc(tr(p, "precio_nota")) : "") + "</span></a></li>";
        }).join("") +
        '</ul><p class="casa__pie"><a class="enlace-flecha" href="#/carta">' + esc(t.casa_ver_carta) + "</a></p></section>";
    }

    // Galería
    h += '<section class="galeria" aria-labelledby="galeria-titulo"><h2 id="galeria-titulo" class="titulo-seccion galeria__titulo" data-revela>' +
      esc(t.galeria_titulo) + '</h2><figure class="galeria__grande" data-revela>' +
      (cfg.foto_cocina ? '<img src="' + esc(f.cocina) + '" alt="" width="1600" height="1067" loading="lazy">'
                       : '<video src="video/brasas.webm" poster="video/brasas-poster.jpg" autoplay muted loop playsinline preload="metadata" aria-hidden="true" width="854" height="480"></video>') +
      '</figure><figure class="galeria__a" data-revela><img src="' + esc(f.historia) + '" alt="" width="1600" height="1103" loading="lazy"></figure>' +
      '<figure class="galeria__b" data-revela><img src="' + esc(f.carta) + '" alt="" width="1600" height="1046" loading="lazy"></figure></section>';

    // Promociones
    if (promos.length) {
      var varias = promos.length > 1;
      h += '<section class="promos" aria-labelledby="promos-titulo" data-pestanas><div class="promos__fotos" data-revela>' +
        promos.map(function (p, i) {
          return '<figure class="promos__foto' + (i === 0 ? " es-activa" : "") + '" data-panel-foto="' + i + '"><img src="' + esc(p.foto || f.promo) +
            '" alt="" width="1200" height="1200" loading="lazy"></figure>';
        }).join("") +
        '</div><div class="promos__texto" data-revela><div><h2 id="promos-titulo" class="titulo-seccion">' + esc(t.promos_titulo) + "</h2>" +
        (varias ? '<div class="promos__pestanas" role="tablist" aria-label="' + esc(t.promos_titulo) + '">' +
          promos.map(function (p, i) {
            return '<button type="button" role="tab" id="pestana-' + i + '" aria-controls="promo-' + i + '" aria-selected="' + (i === 0) + '"' +
              (i ? ' tabindex="-1"' : "") + ' data-pestana="' + i + '">' + esc(tr(p, "titulo")) + "</button>";
          }).join("") + "</div>" : "") + "</div>" +
        promos.map(function (p, i) {
          return '<article class="promos__panel' + (i === 0 ? " es-activa" : "") + '" id="promo-' + i + '"' +
            (varias ? ' role="tabpanel" aria-labelledby="pestana-' + i + '"' : "") + ' data-panel="' + i + '">' +
            '<h3 class="promos__titulo">' + esc(tr(p, "titulo")) + "</h3>" +
            (p.precio_es ? '<p class="promos__precio">' + esc(tr(p, "precio")) + "</p>" : "") +
            '<p class="promos__desc">' + esc(tr(p, "texto")) + "</p>" +
            (p.condiciones_es ? '<p class="promos__cond">' + esc(tr(p, "condiciones")) + "</p>" : "") + "</article>";
        }).join("") +
        '<div class="promos__acciones"><a class="celda celda--tinta" href="#/reservas">' + esc(t.promo_reservar) + "</a>" +
        '<a class="celda" href="#/carta">' + esc(t.promo_carta) + "</a></div></div></section>";
    }

    h += cta(t);

    if (cfg.email) {
      h += '<section class="escribe" aria-labelledby="escribe-titulo"><div class="escribe__arriba" data-revela>' +
        '<h2 id="escribe-titulo" class="titulo-seccion">' + esc(t.contacto_bloque_titulo) + "</h2><p>" + esc(t.contacto_bloque_frase) + "</p></div>" +
        '<a class="escribe__email' + (cfg.email.length > 22 ? " escribe__email--dos" : "") + '" href="mailto:' + esc(cfg.email) + '" data-revela>' + esc(cfg.email) + "</a>" +
        '<div class="escribe__abajo"><p>' + (cfg.telefono ? '<a href="tel:' + esc(telEnlace(cfg.telefono)) + '">' + esc(cfg.telefono) + "</a> · " : "") + esc(cfg.ciudad) + "</p>" +
        '<p><a href="#/contacto">' + esc(t.nav_contacto) + "</a></p></div></section>";
    }
    return { titulo: cfg.nombre + " · " + tr(cfg, "eslogan"), html: h, sinCabecera: true };
  }

  function ordenPlatos(a, b) {
    var ca = D.categorias.filter(function (c) { return c.id === a.categoria; })[0] || { orden: 0 };
    var cb = D.categorias.filter(function (c) { return c.id === b.categoria; })[0] || { orden: 0 };
    return (ca.orden - cb.orden) || (a.orden - b.orden) || (a.id - b.id);
  }

  function pCarta(t) {
    var obras = ["bodegon-merienda.jpg", "brasas.jpg", "bodegon-cerezas.jpg", "bodegon-naranjas.jpg"];
    var cats = D.categorias.filter(function (c) { return c.visible; }).sort(D.porOrden).map(function (c) {
      return { c: c, platos: D.platos.filter(function (p) { return p.categoria === c.id && p.visible; }).sort(D.porOrden) };
    }).filter(function (x) { return x.platos.length; });
    var promos = D.promosVigentes();

    var h = '<section class="titular titular--foto" aria-labelledby="titulo"><div class="titular__texto" data-revela>' +
      '<h1 id="titulo" class="titular__h1">' + esc(t.carta_titulo) + '</h1><p class="titular__intro">' + esc(t.carta_intro) + "</p>" +
      '<nav class="carta__indice" aria-label="' + esc(t.carta_titulo) + '">' +
      cats.map(function (x) { return '<a href="#/carta/seccion-' + x.c.id + '">' + esc(tr(x.c, "nombre")) + "</a>"; }).join("") +
      '</nav></div><figure class="titular__foto" data-revela><img src="' + esc(fotos().carta) + '" alt="" width="1600" height="1046"></figure></section>';

    cats.forEach(function (x, i) {
      var c = x.c;
      h += '<section class="carta__seccion" id="seccion-' + c.id + '" aria-labelledby="cat-' + c.id + '"><div class="carta__cabeza" data-revela>' +
        '<h2 id="cat-' + c.id + '" class="carta__categoria">' + esc(tr(c, "nombre")) + "</h2>" +
        (c.nota_es ? '<p class="carta__nota">' + esc(tr(c, "nota")) + "</p>" : "") +
        '<figure class="carta__foto"><img src="' + esc(c.foto || "img/obras/" + obras[i % obras.length]) + '" alt="" width="800" height="1000" loading="lazy"></figure></div>' +
        '<ul class="carta__platos" data-revela>' +
        x.platos.map(function (p) {
          var als = D.alergenos.filter(function (a) { return p.alergenos.indexOf(a.id) !== -1; }).sort(D.porOrden);
          return '<li class="plato' + (p.foto ? " plato--foto" : "") + '" id="plato-' + p.id + '">' +
            (p.foto ? '<img class="plato__foto" src="' + esc(p.foto) + '" alt="" width="160" height="160" loading="lazy">' : "") +
            '<div class="plato__linea"><h3 class="plato__nombre">' + esc(tr(p, "nombre")) + "</h3>" +
            '<span class="plato__precio">' + esc(euros(p.precio)) + (p.precio_nota_es ? " " + esc(tr(p, "precio_nota")) : "") + "</span></div>" +
            (p.descripcion_es ? '<p class="plato__desc">' + esc(tr(p, "descripcion")) + "</p>" : "") +
            (als.length ? '<p class="plato__alergenos">' + als.map(function (a) { return esc(tr(a, "nombre")); }).join(" · ") + "</p>" : "") +
            "</li>";
        }).join("") + "</ul></section>";
    });

    if (promos.length) {
      h += '<section class="carta__seccion carta__seccion--promos" aria-labelledby="carta-promos"><div class="carta__cabeza" data-revela>' +
        '<h2 id="carta-promos" class="carta__categoria">' + esc(t.promos_titulo) + '</h2></div><ul class="carta__platos" data-revela>' +
        promos.map(function (p) {
          return '<li class="plato"><div class="plato__linea"><h3 class="plato__nombre">' + esc(tr(p, "titulo")) + "</h3>" +
            '<span class="plato__precio">' + esc(tr(p, "precio")) + '</span></div><p class="plato__desc">' + esc(tr(p, "texto")) + "</p>" +
            (p.condiciones_es ? '<p class="plato__alergenos">' + esc(tr(p, "condiciones")) + "</p>" : "") + "</li>";
        }).join("") + "</ul></section>";
    }

    h += '<section class="alergenos" aria-labelledby="alergenos-titulo"><div data-revela><h2 id="alergenos-titulo" class="titulo-seccion">' +
      esc(t.alergenos_titulo) + "</h2><p>" + esc(t.alergenos_nota) + '</p></div><ul class="alergenos__lista" data-revela>' +
      D.alergenos.slice().sort(D.porOrden).map(function (a) { return "<li>" + esc(tr(a, "nombre")) + "</li>"; }).join("") + "</ul></section>";
    h += cta(t);
    return { titulo: t.carta_titulo + " · " + cfg.nombre, html: h };
  }

  function lateralHoy(t) {
    var hoy = D.estadoHoy(lang);
    return '<div class="lateral__bloque"><h2 class="lateral__titulo">' +
      esc(hoy.abierto ? rellenar(t.hoy_abierto, { dia: hoy.dia }) : rellenar(t.hoy_cerrado, { dia: hoy.dia, proximo: hoy.proximo || "" })) + "</h2>" +
      (hoy.abierto ? "<p>" + esc(hoy.quedan_horas && hoy.plazas > 0 ? rellenar(t.hoy_plazas, { n: hoy.plazas }) : t.hoy_completo) + "</p>" : "") + "</div>";
  }

  function campoError(t, errores, campo, id) {
    return errores[campo] ? '<p class="error" id="' + id + '">' + esc(t[errores[campo]] || "") + "</p>" : "";
  }
  function inv(errores, campo, id) { return errores[campo] ? ' aria-invalid="true" aria-describedby="' + id + '"' : ""; }

  function pReservas(t, ctx) {
    ctx = ctx || {};
    var errores = ctx.errores || {}, form = ctx.form || {}, lim = D.limites();
    var h = titular(t.res_titulo, t.res_intro);
    h += '<section class="dos-columnas" aria-label="' + esc(t.res_titulo) + '"><aside class="lateral" data-revela>' +
      '<div class="lateral__bloque"><h2 class="lateral__titulo">' + esc(t.horario_titulo) + '</h2><ul class="lista-datos">' + listaDatos(D.horarioAgrupado(lang)) + "</ul></div>" +
      lateralHoy(t) +
      (cfg.telefono ? '<div class="lateral__bloque"><p>' + esc(rellenar(t.res_grupos, { n: cfg.max_personas, tel: cfg.telefono })) + "</p>" +
        '<p><a class="enlace-grande" href="tel:' + esc(telEnlace(cfg.telefono)) + '">' + esc(cfg.telefono) + "</a></p></div>" : "") +
      '<figure class="lateral__foto"><img src="' + esc(fotos().cocina) + '" alt="" width="1600" height="1067" loading="lazy"></figure></aside>' +
      '<div class="formulario" data-revela>';

    if (!cfg.reservas_activas) {
      h += '<p class="aviso">' + esc(rellenar(t.res_cerradas, { tel: cfg.telefono })) + "</p>";
    } else {
      var personasSel = form.personas ? String(form.personas) : "2";
      var opciones = "";
      for (var n = 1; n <= cfg.max_personas; n++) opciones += '<option value="' + n + '"' + (String(n) === personasSel ? " selected" : "") + ">" + n + "</option>";
      h += (ctx.error_general ? '<p class="aviso aviso--error" role="alert">' + esc(t[ctx.error_general]) + "</p>" : "") +
        '<form novalidate id="form-reserva" data-hora-elegida="' + esc(form.hora || "") + '">' +
        '<div class="campo campo--trampa" aria-hidden="true"><label>Web <input name="web" tabindex="-1" autocomplete="off"></label></div>' +
        '<div class="fila-campos"><div class="campo' + (errores.fecha ? " con-error" : "") + '"><label for="f-fecha">' + esc(t.f_fecha) + "</label>" +
        '<input type="date" id="f-fecha" name="fecha" required min="' + lim[0] + '" max="' + lim[1] + '" value="' + esc(form.fecha || "") + '"' + inv(errores, "fecha", "e-fecha") + ">" +
        campoError(t, errores, "fecha", "e-fecha") + "</div>" +
        '<div class="campo' + (errores.personas ? " con-error" : "") + '"><label for="f-personas">' + esc(t.f_personas) + "</label>" +
        '<select id="f-personas" name="personas" required>' + opciones + "</select>" + campoError(t, errores, "personas", "e-personas") + "</div></div>" +
        '<fieldset class="campo horas' + (errores.hora ? " con-error" : "") + '"' + (errores.hora ? ' aria-describedby="e-hora"' : "") + "><legend>" + esc(t.f_hora) + "</legend>" +
        '<div class="horas__lista" id="horas" aria-live="polite"></div>' + campoError(t, errores, "hora", "e-hora") + "</fieldset>" +
        '<div class="campo' + (errores.nombre ? " con-error" : "") + '"><label for="f-nombre">' + esc(t.f_nombre) + "</label>" +
        '<input id="f-nombre" name="nombre" required maxlength="120" autocomplete="name" value="' + esc(form.nombre || "") + '"' + inv(errores, "nombre", "e-nombre") + ">" +
        campoError(t, errores, "nombre", "e-nombre") + "</div>" +
        '<div class="fila-campos"><div class="campo' + (errores.telefono ? " con-error" : "") + '"><label for="f-telefono">' + esc(t.f_telefono) + "</label>" +
        '<input id="f-telefono" name="telefono" type="tel" required maxlength="30" autocomplete="tel" value="' + esc(form.telefono || "") + '"' + inv(errores, "telefono", "e-telefono") + ">" +
        campoError(t, errores, "telefono", "e-telefono") + "</div>" +
        '<div class="campo' + (errores.email ? " con-error" : "") + '"><label for="f-email">' + esc(t.f_email) + "</label>" +
        '<input id="f-email" name="email" type="email" required maxlength="160" autocomplete="email" value="' + esc(form.email || "") + '"' + inv(errores, "email", "e-email") + ">" +
        campoError(t, errores, "email", "e-email") + "</div></div>" +
        '<div class="campo"><label for="f-comentarios">' + esc(t.f_comentarios) + '</label><textarea id="f-comentarios" name="comentarios" rows="3" maxlength="500">' +
        esc(form.comentarios || "") + "</textarea></div>" +
        '<div class="campo campo--check' + (errores.acepto ? " con-error" : "") + '"><input type="checkbox" id="f-acepto" name="acepto" value="1"' + (form.acepto ? " checked" : "") +
        inv(errores, "acepto", "e-acepto") + '><label for="f-acepto">' + esc(t.f_acepto) + ' <a href="#/legal/privacidad">' + esc(t.f_privacidad) + "</a>.</label>" +
        campoError(t, errores, "acepto", "e-acepto") + "</div>" +
        '<button class="boton boton--grande" type="submit">' + esc(t.btn_reservar) + "</button></form>";
    }
    h += "</div></section>" + franja(t);
    return { titulo: t.res_titulo + " · " + cfg.nombre, html: h };
  }

  function resumen(t, r) {
    return '<dl class="resumen__datos"><div><dt>' + esc(t.ok_cuando) + "</dt><dd>" + esc(capfirst(F.fechaLarga(r.fecha, lang)) + " · " + r.hora) + "</dd></div>" +
      "<div><dt>" + esc(t.ok_personas) + "</dt><dd>" + esc(r.personas) + "</dd></div>" +
      "<div><dt>" + esc(t.ok_nombre) + "</dt><dd>" + esc(r.nombre) + "</dd></div></dl>";
  }

  function porToken(tk) { return D.reservas.filter(function (r) { return r.token === tk; })[0]; }

  function pReservaOk(t, token) {
    var r = porToken(token);
    if (!r) return pError(t);
    var en = lang === "en";
    var h = titular(t.ok_titulo, rellenar(t.ok_texto, { email: r.email }), "titular--pequeno") +
      '<section class="resumen" aria-label="' + esc(t.ok_titulo) + '" data-revela>' + resumen(t, r) +
      "<p>" + esc(t.ok_aviso_cancelar) + "</p>" +
      notaDemo(en
        ? "<p><strong>Demo:</strong> on the real website the guest now gets a confirmation email and the restaurant gets a notice. The email includes a cancellation link.</p>" +
          '<p><a href="#/cancelar/' + esc(r.token) + '">Open the cancellation link</a> · <a href="#/admin/reservas/' + r.id + '">See it in the admin panel</a></p>'
        : "<p><strong>Maqueta:</strong> en la web real el cliente recibe ahora un email de confirmación y el restaurante un aviso. El email lleva un enlace para cancelar.</p>" +
          '<p><a href="#/cancelar/' + esc(r.token) + '">Abrir el enlace de cancelación</a> · <a href="#/admin/reservas/' + r.id + '">Verla en el panel del restaurante</a></p>') +
      '<a class="boton" href="#/">' + esc(t.volver_inicio) + "</a></section>";
    return { titulo: t.ok_titulo + " · " + cfg.nombre, html: h };
  }

  var recienCancelada = null;
  function pCancelar(t, token) {
    var r = porToken(token);
    if (!r) return pError(t);
    var estado = null;
    if (recienCancelada === r.token) estado = "cancel_hecha";
    else if (r.estado === "cancelada") estado = "cancel_ya";
    else if (!esFutura(r)) estado = "cancel_pasada";
    recienCancelada = null;
    var h = titular(t.cancel_titulo, estado ? t[estado] : t.cancel_pregunta, "titular--pequeno") +
      '<section class="resumen" aria-label="' + esc(t.cancel_titulo) + '" data-revela>' + resumen(t, r) +
      (estado ? '<a class="boton" href="#/">' + esc(t.volver_inicio) + "</a>"
              : '<form id="form-cancelar" data-token="' + esc(r.token) + '"><button class="boton boton--grande" type="submit">' + esc(t.cancel_boton) + "</button></form>") +
      "</section>";
    return { titulo: t.cancel_titulo + " · " + cfg.nombre, html: h };
  }
  function esFutura(r) {
    var p = r.fecha.split("-"), h = r.hora.split(":");
    return new Date(+p[0], +p[1] - 1, +p[2], +h[0], +h[1]).getTime() >= Date.now();
  }

  function pContacto(t, ctx) {
    ctx = ctx || {};
    var errores = ctx.errores || {}, form = ctx.form || {};
    var h = titular(t.contacto_titulo, t.contacto_intro);
    h += '<section class="dos-columnas" aria-label="' + esc(t.contacto_titulo) + '"><aside class="lateral" data-revela>' +
      (cfg.direccion ? '<div class="lateral__bloque"><h2 class="lateral__titulo">' + esc(t.contacto_direccion) + "</h2><p>" + esc(cfg.direccion) + "</p>" +
        (cfg.url_mapa ? '<p><a class="enlace-flecha" href="' + esc(cfg.url_mapa) + '" rel="noopener" target="_blank">' + esc(t.pie_mapa) + "</a></p>" : "") + "</div>" : "") +
      (cfg.telefono ? '<div class="lateral__bloque"><h2 class="lateral__titulo">' + esc(t.contacto_telefono) + "</h2>" +
        '<p><a class="enlace-grande" href="tel:' + esc(telEnlace(cfg.telefono)) + '">' + esc(cfg.telefono) + "</a></p>" +
        (cfg.telefono_2 ? "<p>" + esc(cfg.telefono_2) + "</p>" : "") + "</div>" : "") +
      (cfg.email ? '<div class="lateral__bloque"><h2 class="lateral__titulo">' + esc(t.contacto_email) + "</h2>" +
        '<p><a class="enlace-grande" href="mailto:' + esc(cfg.email) + '">' + esc(cfg.email) + "</a></p></div>" : "") +
      '<figure class="lateral__foto"><img src="' + esc(fotos().cocina) + '" alt="" width="1600" height="1067" loading="lazy"></figure>' +
      '<div class="lateral__bloque"><h2 class="lateral__titulo">' + esc(t.horario_titulo) + '</h2><ul class="lista-datos">' + listaDatos(D.horarioAgrupado(lang)) + "</ul></div></aside>" +
      '<div class="formulario" id="formulario" data-revela><h2 class="titulo-seccion">' + esc(t.contacto_formulario) + "</h2>" +
      (ctx.enviado ? '<p class="aviso aviso--ok" role="status">' + esc(t.contacto_enviado) + "</p>" +
        notaDemo(lang === "en"
          ? '<p><strong>Demo:</strong> the restaurant gets this message by email and in its panel. <a href="#/admin/mensajes">See it in the admin panel</a></p>'
          : '<p><strong>Maqueta:</strong> el restaurante recibe este mensaje por email y en su panel. <a href="#/admin/mensajes">Verlo en el panel</a></p>') : "") +
      (ctx.error_general ? '<p class="aviso aviso--error" role="alert">' + esc(t[ctx.error_general]) + "</p>" : "") +
      '<form novalidate id="form-contacto"><div class="campo campo--trampa" aria-hidden="true"><label>Web <input name="web" tabindex="-1" autocomplete="off"></label></div>' +
      '<div class="campo' + (errores.nombre ? " con-error" : "") + '"><label for="c-nombre">' + esc(t.f_nombre) + "</label>" +
      '<input id="c-nombre" name="nombre" required maxlength="120" autocomplete="name" value="' + esc(form.nombre || "") + '"' + inv(errores, "nombre", "ce-nombre") + ">" +
      campoError(t, errores, "nombre", "ce-nombre") + "</div>" +
      '<div class="fila-campos"><div class="campo' + (errores.email ? " con-error" : "") + '"><label for="c-email">' + esc(t.f_email) + "</label>" +
      '<input id="c-email" name="email" type="email" required maxlength="160" autocomplete="email" value="' + esc(form.email || "") + '"' + inv(errores, "email", "ce-email") + ">" +
      campoError(t, errores, "email", "ce-email") + "</div>" +
      '<div class="campo"><label for="c-telefono">' + esc(t.f_telefono) + '</label><input id="c-telefono" name="telefono" type="tel" maxlength="30" autocomplete="tel" value="' + esc(form.telefono || "") + '"></div></div>' +
      '<div class="campo' + (errores.mensaje ? " con-error" : "") + '"><label for="c-mensaje">' + esc(t.f_mensaje) + "</label>" +
      '<textarea id="c-mensaje" name="mensaje" rows="6" maxlength="2000" required' + inv(errores, "mensaje", "ce-mensaje") + ">" + esc(form.mensaje || "") + "</textarea>" +
      campoError(t, errores, "mensaje", "ce-mensaje") + "</div>" +
      '<div class="campo campo--check' + (errores.acepto ? " con-error" : "") + '"><input type="checkbox" id="c-acepto" name="acepto" value="1"' + (form.acepto ? " checked" : "") + ">" +
      '<label for="c-acepto">' + esc(t.f_acepto_contacto) + ' <a href="#/legal/privacidad">' + esc(t.f_privacidad) + "</a>.</label>" +
      (errores.acepto ? '<p class="error">' + esc(t[errores.acepto]) + "</p>" : "") + "</div>" +
      '<button class="boton boton--grande" type="submit">' + esc(t.btn_enviar) + "</button></form></div></section>" + franja(t);
    return { titulo: t.contacto_titulo + " · " + cfg.nombre, html: h };
  }

  function pLegal(t, slug) {
    var p = D.legales.filter(function (l) { return l.slug === slug; })[0];
    if (!p) return pError(t);
    var texto = tr(p, "contenido"), datos = D.datosLegales();
    Object.keys(datos).forEach(function (k) { texto = texto.split("{" + k + "}").join(datos[k]); });
    return {
      titulo: tr(p, "titulo") + " · " + cfg.nombre, pagina: "legal",
      html: titular(tr(p, "titulo"), "", "titular--pequeno") +
        '<article class="texto-largo" data-revela>' + parrafos(texto).map(function (x) { return "<p>" + esc(x) + "</p>"; }).join("") + "</article>"
    };
  }

  function pError(t) {
    return {
      titulo: t.error_404_titulo + " · " + cfg.nombre, pagina: "error",
      html: '<section class="titular titular--pequeno" aria-labelledby="titulo"><div class="titular__texto">' +
        '<h1 id="titulo" class="titular__h1">' + esc(t.error_404_titulo) + '</h1><p class="titular__intro">' + esc(t.error_404_texto) + "</p>" +
        '<p><a class="boton" href="#/">' + esc(t.volver_inicio) + "</a></p></div></section>"
    };
  }

  /* ---------------- Formularios (misma validación que views.py) ---------------- */
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

  function leer(form) {
    var datos = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === "checkbox") { if (el.checked) datos[el.name] = el.value; }
      else if (el.type === "radio") { if (el.checked) datos[el.name] = el.value; }
      else datos[el.name] = el.value;
    });
    return datos;
  }

  function validarReserva(post) {
    var errores = {};
    var nombre = limpiar(post.nombre, 120);
    if (nombre.length < 2) errores.nombre = "err_nombre";
    var telefono = limpiar(post.telefono, 30), digitos = telefono.replace(/\D/g, "");
    if (!(digitos.length >= 9 && digitos.length <= 15) || !/^[0-9+()\-\s.]+$/.test(telefono)) errores.telefono = "err_telefono";
    var email = limpiar(post.email, 160).toLowerCase();
    if (!EMAIL_RE.test(email)) errores.email = "err_email";
    var comentarios = limpiar(post.comentarios, 500, true);
    var personas = parseInt(post.personas, 10) || 0;
    if (personas < 1 || personas > cfg.max_personas) errores.personas = "err_personas";
    var dia = post.fecha, hora = null;
    if (!F.esFechaValida(dia)) { errores.fecha = "err_fecha"; dia = null; }
    if (dia) {
      var lim = D.limites(), motivo;
      if (dia < lim[0]) errores.fecha = "err_fecha_pasada";
      else if (dia > lim[1]) errores.fecha = "err_fecha_lejana";
      else if ((motivo = D.motivoCerrado(dia))) errores.fecha = motivo;
      else {
        hora = post.hora;
        if (!F.esHoraValida(hora) || D.horasDelDia(dia).indexOf(hora) === -1) { errores.hora = "err_hora"; hora = null; }
        else if (D.demasiadoPronto(dia, hora)) errores.hora = "err_hora_tarde";
      }
    }
    if (!post.acepto) errores.acepto = "err_acepto";
    return { datos: { nombre: nombre, telefono: telefono, email: email, comentarios: comentarios, personas: personas, fecha: dia, hora: hora }, errores: errores };
  }

  function enviarReserva(form) {
    var post = leer(form);
    if (post.web) { ir("#/"); return; }
    var v = validarReserva(post);
    if (!Object.keys(v.errores).length && D.plazasLibres(v.datos.fecha, v.datos.hora) < v.datos.personas) v.errores.hora = "err_completo";
    if (!Object.keys(v.errores).length) {
      var r = D.crearReserva(Object.assign({ idioma: lang }, v.datos));
      ir("#/reserva/" + r.token);
      return;
    }
    pintar({ errores: v.errores, form: post, error_general: "err_formulario" });
    var aviso = app.querySelector(".aviso--error");
    if (aviso) aviso.scrollIntoView({ block: "center" });
  }

  function enviarContacto(form) {
    var post = leer(form);
    if (post.web) { ir("#/"); return; }
    var nombre = limpiar(post.nombre, 120), email = limpiar(post.email, 160).toLowerCase();
    var telefono = limpiar(post.telefono, 30), mensaje = limpiar(post.mensaje, 2000, true), errores = {};
    if (nombre.length < 2) errores.nombre = "err_nombre";
    if (!EMAIL_RE.test(email)) errores.email = "err_email";
    if (mensaje.length < 5) errores.mensaje = "err_mensaje";
    if (!post.acepto) errores.acepto = "err_acepto";
    if (Object.keys(errores).length) {
      pintar({ errores: errores, form: post, error_general: "err_formulario" });
      var aviso = app.querySelector(".aviso--error");
      if (aviso) aviso.scrollIntoView({ block: "center" });
      return;
    }
    D.mensajes.unshift({ id: D.nuevoId(), nombre: nombre, email: email, telefono: telefono, mensaje: mensaje, leido: false, creado: new Date().toISOString() });
    ir("#/contacto?enviado=1", "formulario");
  }

  /* ---------------- Comportamiento (static/js/web.js) ---------------- */
  function ajustar() {
    app.querySelectorAll("[data-ajustar]").forEach(function (el) {
      var caja = el.parentElement, estilo = getComputedStyle(caja);
      var ancho = caja.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
      if (!ancho) return;
      caja.style.fontSize = "100px";
      var medido = el.getBoundingClientRect().width;
      if (!medido) return;
      caja.style.fontSize = Math.floor(100 * ancho / medido * 0.995) + "px";
    });
  }

  var io = null;
  function entradas() {
    var bloques = app.querySelectorAll("[data-revela]");
    bloques.forEach(function (b) {
      if (!b.children.length) b.classList.add("revela-solo");
      Array.prototype.forEach.call(b.children, function (hijo, i) { hijo.style.setProperty("--i", i); });
    });
    if (!("IntersectionObserver" in window)) { bloques.forEach(function (b) { b.classList.add("dentro"); }); return; }
    if (io) io.disconnect();
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("dentro"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    bloques.forEach(function (b) { io.observe(b); });
  }
  function mostrarTodo() { app.querySelectorAll("[data-revela]").forEach(function (b) { b.classList.add("dentro"); }); }

  function pestanas() {
    app.querySelectorAll("[data-pestanas]").forEach(function (zona) {
      var botones = zona.querySelectorAll("[data-pestana]");
      function activar(i, foco) {
        botones.forEach(function (b) {
          var si = b.dataset.pestana === String(i);
          b.setAttribute("aria-selected", si ? "true" : "false");
          b.tabIndex = si ? 0 : -1;
          if (si && foco) b.focus();
        });
        zona.querySelectorAll("[data-panel]").forEach(function (p) { p.classList.toggle("es-activa", p.dataset.panel === String(i)); });
        zona.querySelectorAll("[data-panel-foto]").forEach(function (p) { p.classList.toggle("es-activa", p.dataset.panelFoto === String(i)); });
      }
      botones.forEach(function (b, n) {
        b.addEventListener("click", function () { activar(b.dataset.pestana); });
        b.addEventListener("keydown", function (e) {
          var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
          if (!d) return;
          e.preventDefault();
          activar((n + d + botones.length) % botones.length, true);
        });
      });
    });
  }

  function horasFormulario(t, query) {
    var form = document.getElementById("form-reserva");
    if (!form) return;
    var fecha = form.querySelector("[name=fecha]"), personas = form.querySelector("[name=personas]");
    var lista = document.getElementById("horas"), elegida = form.dataset.horaElegida || "";
    function mensaje(txt) { lista.innerHTML = ""; var p = document.createElement("p"); p.textContent = txt; lista.appendChild(p); }
    function pintarHoras(horas) {
      lista.innerHTML = "";
      if (!horas.length) { mensaje(t.f_sin_horas); return; }
      horas.forEach(function (h) {
        var label = document.createElement("label"), input = document.createElement("input"), span = document.createElement("span");
        label.className = "hora";
        input.type = "radio"; input.name = "hora"; input.value = h; input.required = true;
        if (h === elegida) input.checked = true;
        input.addEventListener("change", function () { elegida = h; });
        span.textContent = h;
        label.appendChild(input); label.appendChild(span); lista.appendChild(label);
      });
    }
    function cargar() { // lo que hacía /reservas/horas/ en el servidor
      if (!fecha.value) { mensaje(t.f_elige_fecha); return; }
      var dia = fecha.value, lim = D.limites(), motivo;
      if (!F.esFechaValida(dia)) { mensaje(t.err_fecha); return; }
      if (dia < lim[0]) { mensaje(t.err_fecha_pasada); return; }
      if (dia > lim[1]) { mensaje(t.err_fecha_lejana); return; }
      if ((motivo = D.motivoCerrado(dia))) { mensaje(t[motivo]); return; }
      var n = Math.min(Math.max(parseInt(personas.value, 10) || 2, 1), cfg.max_personas);
      pintarHoras(D.horasLibres(dia, n));
    }
    if (query.fecha === "hoy" && !fecha.value) fecha.value = fecha.min;
    cargar();
    fecha.addEventListener("change", cargar);
    personas.addEventListener("change", cargar);
  }

  /* ---------------- Router ---------------- */
  var rutaActual = { partes: [], query: {} };
  function leerRuta() {
    var h = location.hash.replace(/^#/, "") || "/";
    var q = {}, i = h.indexOf("?");
    if (i !== -1) {
      h.slice(i + 1).split("&").forEach(function (par) {
        var kv = par.split("=");
        if (kv[0]) q[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || "").replace(/\+/g, " "));
      });
      h = h.slice(0, i);
    }
    return { partes: h.split("/").filter(Boolean).map(decodeURIComponent), query: q };
  }

  var anclaPendiente = null;
  function ir(hash, ancla) {
    anclaPendiente = ancla || null;
    if (location.hash === hash) cambio(); else location.hash = hash;
  }

  function pintar(ctx, mantenerScroll) {
    var r = rutaActual, p = r.partes, t = D.textos_(lang), res;
    document.documentElement.lang = lang;
    aplicarTema();
    var pagina = p[0] || "inicio";
    if (!p.length) res = pInicio(t);
    else if (p[0] === "carta") { res = pCarta(t); if (p[1]) anclaPendiente = p[1]; }
    else if (p[0] === "reservas" && p.length === 1) res = pReservas(t, ctx);
    else if (p[0] === "reserva" && p[1]) { res = pReservaOk(t, p[1]); pagina = "reservas"; }
    else if (p[0] === "cancelar" && p[1]) { res = pCancelar(t, p[1]); pagina = "reservas"; }
    else if (p[0] === "contacto" && p.length === 1) res = pContacto(t, Object.assign({ enviado: r.query.enviado === "1" }, ctx || {}));
    else if (p[0] === "legal" && p[1]) res = pLegal(t, p[1]);
    else res = pError(t);
    pagina = res.pagina || pagina;

    document.body.className = "p-" + pagina;
    document.title = res.titulo;
    var scroll = window.scrollY;
    app.innerHTML = '<a class="saltar" href="#contenido">' + esc(t.saltar) + "</a>" +
      (res.sinCabecera ? "" : cabecera(t, pagina)) + '<main id="contenido">' + res.html + "</main>" + pie(t);

    entradas(); pestanas(); horasFormulario(t, r.query); ajustar();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustar);

    var fr = document.getElementById("form-reserva");
    if (fr) fr.addEventListener("submit", function (e) { e.preventDefault(); enviarReserva(fr); });
    var fc = document.getElementById("form-contacto");
    if (fc) fc.addEventListener("submit", function (e) { e.preventDefault(); enviarContacto(fc); });
    var fx = document.getElementById("form-cancelar");
    if (fx) fx.addEventListener("submit", function (e) {
      e.preventDefault();
      var res2 = porToken(fx.dataset.token);
      if (res2 && res2.estado === "confirmada") { res2.estado = "cancelada"; recienCancelada = res2.token; }
      pintar(null, true);
    });

    if (ctx) mostrarTodo();
    if (mantenerScroll) { mostrarTodo(); window.scrollTo(0, scroll); }
    else if (anclaPendiente) {
      var destino = document.getElementById(anclaPendiente);
      anclaPendiente = null;
      if (destino) {
        mostrarTodo();
        destino.classList.add("es-destino");
        requestAnimationFrame(function () { destino.scrollIntoView(); });
        return;
      }
      window.scrollTo(0, 0);
    } else if (!ctx) window.scrollTo(0, 0);
  }

  function cambio() {
    rutaActual = leerRuta();
    if (rutaActual.partes[0] === "admin") {
      if (io) io.disconnect();
      window.PANEL.pintar(rutaActual);
      return;
    }
    pintar();
  }

  // Clics: cambio de idioma y anclas dentro de la página (#contenido)
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a");
    if (!a) return;
    if (a.hasAttribute("data-idioma")) {
      e.preventDefault();
      lang = a.getAttribute("data-idioma");
      pintar(null, true);
      return;
    }
    var href = a.getAttribute("href") || "";
    if (href.length > 1 && href.charAt(0) === "#" && href.charAt(1) !== "/") {
      e.preventDefault();
      var el = document.getElementById(href.slice(1));
      if (el) { if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1"); el.focus(); el.scrollIntoView(); }
    } else if (href === location.hash && href.indexOf("#/") === 0) {
      // Enlace a la página en la que ya estás (p. ej. otro plato destacado): se vuelve a pintar
      e.preventDefault();
      ir(href);
    }
  });

  var espera;
  window.addEventListener("resize", function () { clearTimeout(espera); espera = setTimeout(ajustar, 80); });
  window.addEventListener("hashchange", cambio);

  window.WEB = { esc: esc, refrescarTema: aplicarTema, ir: ir };
  document.documentElement.classList.add("js");
  cambio();
})();
