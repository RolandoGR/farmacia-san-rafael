/* Funciones auxiliares compartidas por todas las vistas. */
var U = (function () {
  var formatoMoneda = new Intl.NumberFormat(CONFIG.locale, { style: 'currency', currency: CONFIG.moneda });
  var formatoFecha = new Intl.DateTimeFormat(CONFIG.locale, { day: '2-digit', month: 'short', year: 'numeric' });

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Minúsculas y sin acentos, para comparar textos.
  function normalizar(t) {
    return String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  function slug(t) {
    return normalizar(t).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  function moneda(n) { return formatoMoneda.format(Number(n) || 0); }

  function hoyIso() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function parseIso(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }

  function fecha(s) {
    var d = parseIso(s);
    return d ? formatoFecha.format(d) : '—';
  }

  // Días entre hoy y la fecha dada (negativo si ya pasó).
  function diasHasta(s) {
    var d = parseIso(s);
    if (!d) return null;
    var h = parseIso(hoyIso());
    return Math.round((d - h) / 86400000);
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    var prev2 = null, prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      for (j = 1; j <= b.length; j++) {
        var costo = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + costo);
        // Transposición de letras contiguas cuenta como un solo error.
        if (prev2 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          cur[j] = Math.min(cur[j], prev2[j - 2] + 1);
        }
      }
      prev2 = prev;
      prev = cur;
    }
    return prev[b.length];
  }

  /*
   * Puntaje de coincidencia entre una consulta y un producto.
   * Tolera acentos, mayúsculas y errores menores de escritura.
   * Devuelve 0 si no coincide.
   */
  function puntuarProducto(consulta, p) {
    var q = normalizar(consulta);
    if (!q) return 0;
    var nombre = normalizar(p.nombre);
    var activos = normalizar(p.activos);
    if (normalizar(p.sku) === q) return 200;
    if (nombre.indexOf(q) === 0) return 120;
    if (activos.indexOf(q) === 0) return 110;
    if (nombre.indexOf(q) >= 0) return 100;
    if (activos.indexOf(q) >= 0) return 95;

    var tokens = q.split(/[^a-z0-9.%/]+/).filter(Boolean);
    var palabras = (nombre + ' ' + activos).split(/[^a-z0-9.%/]+/).filter(Boolean);
    var total = 0;
    for (var t = 0; t < tokens.length; t++) {
      var tok = tokens[t];
      var mejor = 0;
      for (var w = 0; w < palabras.length; w++) {
        var pal = palabras[w];
        if (pal.indexOf(tok) === 0) { mejor = 1; break; }
        if (pal.indexOf(tok) > 0) { mejor = Math.max(mejor, 0.9); continue; }
        // Errores de escritura: solo si la primera letra coincide, para no mezclar palabras distintas.
        var tolerancia = tok.length <= 3 ? 0 : tok.length <= 6 ? 1 : 2;
        if (!tolerancia || tok[0] !== pal[0]) continue;
        var d = Math.min(levenshtein(tok, pal), levenshtein(tok, pal.slice(0, tok.length)));
        if (d <= tolerancia) mejor = Math.max(mejor, 1 - d * 0.2);
      }
      if (!mejor) return 0;
      total += mejor;
    }
    return Math.round(80 * total / tokens.length);
  }

  function buscarProductos(consulta, productos, limite) {
    return productos
      .map(function (p) { return { p: p, s: puntuarProducto(consulta, p) }; })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s || a.p.nombre.localeCompare(b.p.nombre, 'es'); })
      .slice(0, limite || 50)
      .map(function (x) { return x.p; });
  }

  function descargar(nombre, contenido, tipo) {
    var blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
  }

  function uid(prefijo) {
    return (prefijo || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /* ---------- Avisos breves ---------- */
  function aviso(mensaje, tipo) {
    var cont = document.getElementById('avisos');
    var el = document.createElement('div');
    el.className = 'aviso aviso-' + (tipo || 'ok');
    el.setAttribute('role', 'status');
    el.textContent = mensaje;
    cont.appendChild(el);
    setTimeout(function () { el.classList.add('saliendo'); }, 3200);
    setTimeout(function () { el.remove(); }, 3700);
  }

  /* ---------- Ventanas modales ---------- */
  var pilaModales = [];
  function abrirModal(opciones) {
    var capa = document.createElement('div');
    capa.className = 'modal-capa';
    capa.innerHTML =
      '<div class="modal ' + (opciones.clase || '') + '" role="dialog" aria-modal="true" aria-labelledby="modal-titulo-' + pilaModales.length + '">' +
        '<header class="modal-encabezado">' +
          '<h2 id="modal-titulo-' + pilaModales.length + '">' + esc(opciones.titulo) + '</h2>' +
          '<button type="button" class="boton-icono" data-cerrar-modal aria-label="Cerrar">&times;</button>' +
        '</header>' +
        '<div class="modal-cuerpo"></div>' +
        (opciones.pie ? '<footer class="modal-pie">' + opciones.pie + '</footer>' : '') +
      '</div>';
    var cuerpo = capa.querySelector('.modal-cuerpo');
    if (typeof opciones.contenido === 'string') cuerpo.innerHTML = opciones.contenido;
    else if (opciones.contenido) cuerpo.appendChild(opciones.contenido);
    document.body.appendChild(capa);
    document.body.classList.add('con-modal');
    var registro = { capa: capa, alCerrar: opciones.alCerrar };
    pilaModales.push(registro);
    capa.addEventListener('mousedown', function (e) { if (e.target === capa) cerrarModal(); });
    capa.querySelectorAll('[data-cerrar-modal]').forEach(function (b) { b.addEventListener('click', function () { cerrarModal(); }); });
    var enfocable = capa.querySelector('[autofocus], input, select, textarea, button:not([data-cerrar-modal])');
    if (enfocable) setTimeout(function () { enfocable.focus(); }, 30);
    return capa;
  }

  function cerrarModal() {
    var r = pilaModales.pop();
    if (!r) return;
    r.capa.remove();
    if (!pilaModales.length) document.body.classList.remove('con-modal');
    if (r.alCerrar) r.alCerrar();
  }

  function hayModal() { return pilaModales.length > 0; }

  function confirmar(titulo, mensaje, textoBoton, peligro) {
    return new Promise(function (resolver) {
      var resuelto = false;
      var capa = abrirModal({
        titulo: titulo,
        clase: 'modal-chico',
        contenido: '<p>' + mensaje + '</p>',
        pie: '<button type="button" class="boton" data-cerrar-modal>Cancelar</button>' +
             '<button type="button" class="boton ' + (peligro ? 'boton-peligro' : 'boton-primario') + '" data-confirmar>' + esc(textoBoton || 'Aceptar') + '</button>',
        alCerrar: function () { if (!resuelto) resolver(false); }
      });
      capa.querySelector('[data-confirmar]').addEventListener('click', function () {
        resuelto = true;
        cerrarModal();
        resolver(true);
      });
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pilaModales.length) cerrarModal();
  });

  return {
    esc: esc, normalizar: normalizar, slug: slug, moneda: moneda, hoyIso: hoyIso, parseIso: parseIso,
    fecha: fecha, diasHasta: diasHasta, levenshtein: levenshtein, puntuarProducto: puntuarProducto,
    buscarProductos: buscarProductos, descargar: descargar, uid: uid, aviso: aviso,
    abrirModal: abrirModal, cerrarModal: cerrarModal, hayModal: hayModal, confirmar: confirmar
  };
})();
