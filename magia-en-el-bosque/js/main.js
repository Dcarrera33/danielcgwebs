/* JavaScript de la web: menú móvil, entrada de los contenidos al hacer scroll y carrusel de «Saber más». */
(function () {
  "use strict";

  // ---- Entrada al hacer scroll ----
  // Cada bloque sube y aparece al entrar en pantalla, uno detrás de otro. Sin JavaScript todo se ve igual, sin animar.
  if ("IntersectionObserver" in window) {
    document.documentElement.classList.add("js");
    var groups = document.querySelectorAll(
      ".split__photo, .split__text > *, .page-head > *, .section-head > *, .course-list, .course__main > *, .aside, " +
      ".carousel-wrap, .steps, .faq-layout__head, .faq, .cta-band__inner > *, .contact > *, " +
      ".candle-block__head, .candle-grid, .candle__media, .candle__info > *"
    );
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); observer.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    groups.forEach(function (el) {
      // Las listas entran elemento a elemento
      var items = el.matches(".course-list, .steps, .faq, .candle-grid") ? el.children : [el];
      Array.prototype.forEach.call(items, function (item) {
        var siblings = Array.prototype.indexOf.call(item.parentNode.children, item);
        item.classList.add("reveal");
        item.style.transitionDelay = Math.min(siblings, 6) * 80 + "ms";
        observer.observe(item);
      });
    });
  }

  // ---- Cabecera: se vuelve más opaca al bajar ----
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 12); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // ---- Brillo dorado que sigue al ratón dentro de las tarjetas ----
  if (window.matchMedia && window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".course-row__link, .candle-card__link, .steps li, .panel").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  // ---- Menú de una sola página: marca la sección que se está viendo ----
  var hashLinks = Array.prototype.filter.call(document.querySelectorAll(".menu a"), function (a) {
    return a.getAttribute("href").charAt(0) === "#";
  });
  if (hashLinks.length && "IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        hashLinks.forEach(function (a) {
          if (a.getAttribute("href") === "#" + e.target.id) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    hashLinks.forEach(function (a) {
      var target = document.getElementById(a.getAttribute("href").slice(1));
      if (target) spy.observe(target);
    });
  }

  // ---- Fotos de una vela: al pulsar una miniatura cambia la foto grande ----
  document.querySelectorAll("[data-gallery]").forEach(function (box) {
    var main = box.querySelector("[data-gallery-main]");
    var thumbs = box.querySelectorAll(".candle__thumbs button");
    if (!main) return;
    thumbs.forEach(function (t) {
      t.addEventListener("click", function () {
        main.src = t.dataset.src;
        thumbs.forEach(function (o) { o.setAttribute("aria-current", o === t ? "true" : "false"); });
      });
    });
  });

  // ---- Menú hamburguesa (móvil) ----
  var burger = document.querySelector(".burger");
  var nav = document.querySelector(".mainnav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // ---- Carrusel de fotos ----
  // Cambia solo cada data-seconds segundos; flechas, puntos y deslizar con el dedo.
  // Se pausa con el ratón encima y no se mueve solo si el usuario ha pedido "reducir movimiento".
  document.querySelectorAll("[data-carousel]").forEach(function (box) {
    var slides = box.querySelectorAll(".carousel__slide");
    if (slides.length < 2) return;
    var seconds = parseInt(box.dataset.seconds, 10) || 6;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var dotsBox = box.parentNode.querySelector(".carousel__dots");
    var dots = dotsBox ? dotsBox.querySelectorAll("button") : [];
    var current = 0, timer = null;

    function show(n) {
      slides[current].classList.remove("is-active");
      current = (n + slides.length) % slides.length;
      slides[current].classList.add("is-active");
      dots.forEach(function (d, i) { d.setAttribute("aria-current", i === current ? "true" : "false"); });
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function start() { stop(); if (!reduce) timer = setInterval(function () { show(current + 1); }, seconds * 1000); }
    function go(n) { show(n); start(); }

    var prev = box.querySelector(".carousel__btn--prev");
    var next = box.querySelector(".carousel__btn--next");
    if (prev) prev.addEventListener("click", function () { go(current - 1); });
    if (next) next.addEventListener("click", function () { go(current + 1); });
    dots.forEach(function (d, i) { d.addEventListener("click", function () { go(i); }); });

    box.addEventListener("mouseenter", stop);
    box.addEventListener("mouseleave", start);
    box.addEventListener("focusin", stop);
    box.addEventListener("focusout", start);

    var startX = null;
    box.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; stop(); }, { passive: true });
    box.addEventListener("touchend", function (e) {
      if (startX !== null) {
        var dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
      }
      startX = null; start();
    });
    box.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") go(current - 1);
      if (e.key === "ArrowRight") go(current + 1);
    });

    show(0);
    start();
  });
})();
