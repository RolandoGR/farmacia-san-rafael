/* Vista Mostrador: búsqueda rápida y checklist de alternativas. */
var Mostrador = (function () {
  var raiz;
  var st = {
    consulta: '',
    verResultados: false,
    resaltado: 0,
    seleccion: null,      // id del producto pedido
    paso: 0,              // 0 = sin checklist, 1 = indicación, 2 = seguridad, 3 = alternativas
    indicaciones: [],
    respuestas: {}
  };

  function iniciar(contenedor) {
    raiz = contenedor;
    raiz.innerHTML =
      '<section class="mostrador">' +
        '<div class="buscador">' +
          '<label class="buscador-etiqueta" for="busqueda-mostrador">¿Qué producto pide el cliente?</label>' +
          '<div class="campo-busqueda">' +
            '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
            '<input id="busqueda-mostrador" type="search" autocomplete="off" spellcheck="false" placeholder="Nombre comercial, principio activo o SKU" aria-controls="resultados-mostrador" aria-autocomplete="list">' +
            '<button type="button" class="boton-icono limpiar" data-accion="limpiar" aria-label="Limpiar búsqueda" hidden>&times;</button>' +
          '</div>' +
          '<ul class="resultados" id="resultados-mostrador" role="listbox" hidden></ul>' +
        '</div>' +
        '<div id="panel-mostrador" class="panel-mostrador"></div>' +
      '</section>';

    var entrada = raiz.querySelector('#busqueda-mostrador');
    entrada.addEventListener('input', function () {
      st.consulta = entrada.value;
      st.verResultados = true;
      st.resaltado = 0;
      pintarResultados();
    });
    entrada.addEventListener('focus', function () {
      if (st.consulta.trim()) { st.verResultados = true; pintarResultados(); }
    });
    entrada.addEventListener('keydown', function (e) {
      var items = raiz.querySelectorAll('.resultado');
      if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); st.resaltado = Math.min(st.resaltado + 1, items.length - 1); pintarResultados(); }
      else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); st.resaltado = Math.max(st.resaltado - 1, 0); pintarResultados(); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        var it = items[st.resaltado];
        if (it) seleccionar(it.getAttribute('data-id'));
      } else if (e.key === 'Escape' && !U.hayModal()) {
        if (st.verResultados) { st.verResultados = false; pintarResultados(); } else limpiar();
      }
    });
    document.addEventListener('click', function (e) {
      if (!raiz.contains(e.target) || !e.target.closest('.buscador')) {
        if (st.verResultados) { st.verResultados = false; pintarResultados(); }
      }
    });
    raiz.addEventListener('click', manejarClic);
    pintar();
  }

  function enfocar() {
    var e = raiz && raiz.querySelector('#busqueda-mostrador');
    if (e) e.focus();
  }

  function limpiar() {
    st.consulta = '';
    st.seleccion = null;
    st.paso = 0;
    st.verResultados = false;
    raiz.querySelector('#busqueda-mostrador').value = '';
    pintar();
    enfocar();
  }

  function seleccionar(id) {
    var p = Almacen.producto(id);
    if (!p) return;
    st.seleccion = id;
    st.verResultados = false;
    st.consulta = p.nombre;
    raiz.querySelector('#busqueda-mostrador').value = p.nombre;
    var sit = Almacen.situacion(p);
    st.indicaciones = p.indicaciones.filter(function (i) { var x = Almacen.indicacion(i); return x && x.activa; });
    st.respuestas = {};
    st.paso = sit.disponible ? 0 : 1;
    pintar();
    var panel = raiz.querySelector('#panel-mostrador');
    if (panel && panel.scrollIntoView && window.innerWidth < 900) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function manejarClic(e) {
    var b = e.target.closest('[data-accion]');
    if (!b) return;
    var accion = b.getAttribute('data-accion');
    if (accion === 'limpiar') limpiar();
    else if (accion === 'elegir') seleccionar(b.getAttribute('data-id'));
    else if (accion === 'abrir-checklist') { st.paso = 1; pintarPanel(); }
    else if (accion === 'indicacion') {
      var id = b.getAttribute('data-id');
      var i = st.indicaciones.indexOf(id);
      if (i >= 0) st.indicaciones.splice(i, 1); else st.indicaciones.push(id);
      pintarPanel();
    } else if (accion === 'responder') {
      var et = b.getAttribute('data-etiqueta');
      var valor = b.getAttribute('data-valor') === 'si';
      st.respuestas[et] = st.respuestas[et] === valor ? undefined : valor;
      if (st.respuestas[et] === undefined) delete st.respuestas[et];
      pintarPanel();
    } else if (accion === 'todas-no') {
      Almacen.preguntas(true).forEach(function (q) { if (!(q.etiqueta in st.respuestas)) st.respuestas[q.etiqueta] = false; });
      pintarPanel();
    } else if (accion === 'paso') {
      var destino = Number(b.getAttribute('data-paso'));
      if (destino >= 2 && !st.indicaciones.length) { U.aviso('Marque al menos una indicación.', 'error'); return; }
      st.paso = destino;
      pintarPanel();
      var cl = raiz.querySelector('.checklist');
      if (cl && cl.getBoundingClientRect().top < 0) cl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (accion === 'cerrar-checklist') { st.paso = 0; pintarPanel(); }
  }

  function chipsEstado(p, sit) {
    var h = '';
    if (sit.caducado) h += '<span class="chip chip-peligro">Caducado</span>';
    else if (sit.agotado) h += '<span class="chip chip-peligro">Agotado</span>';
    else h += '<span class="chip chip-ok">Disponible</span>';
    if (p.receta) h += '<span class="chip chip-receta">Con receta</span>';
    return h;
  }

  function pintarResultados() {
    var lista = raiz.querySelector('#resultados-mostrador');
    var boton = raiz.querySelector('[data-accion="limpiar"]');
    boton.hidden = !st.consulta;
    var q = st.consulta.trim();
    if (!st.verResultados || !q) { lista.hidden = true; lista.innerHTML = ''; return; }
    var encontrados = U.buscarProductos(q, Almacen.productos(), 12);
    lista.hidden = false;
    if (!encontrados.length) {
      lista.innerHTML = '<li class="resultado-vacio">Sin coincidencias para «' + U.esc(q) + '». Revise la escritura o busque por principio activo.</li>';
      return;
    }
    lista.innerHTML = encontrados.map(function (p, i) {
      var sit = Almacen.situacion(p);
      return '<li class="resultado' + (i === st.resaltado ? ' resaltado' : '') + '" role="option" aria-selected="' + (i === st.resaltado) + '" data-accion="elegir" data-id="' + U.esc(p.id) + '">' +
        '<div class="resultado-texto"><strong>' + U.esc(p.nombre) + '</strong>' +
        '<span>' + U.esc(p.activos) + ' · ' + U.esc(p.concentracion) + ' · ' + U.esc(p.forma) + '</span></div>' +
        '<div class="resultado-meta">' + chipsEstado(p, sit) + '<span class="precio">' + U.moneda(p.precio) + '</span></div>' +
      '</li>';
    }).join('');
  }

  function pintar() {
    pintarResultados();
    pintarPanel();
  }

  function pintarPanel() {
    var panel = raiz.querySelector('#panel-mostrador');
    if (!st.seleccion || !Almacen.producto(st.seleccion)) {
      st.seleccion = null;
      panel.innerHTML = pintarInicio();
      return;
    }
    var p = Almacen.producto(st.seleccion);
    var sit = Almacen.situacion(p);
    var h = fichaPedido(p, sit);
    if (st.paso > 0) h += checklist(p, sit);
    panel.innerHTML = h;
  }

  function pintarInicio() {
    return '<div class="inicio-mostrador">' +
      '<div class="inicio-paso"><span class="num">1</span><div><strong>Busque el producto</strong><p>Por nombre comercial o principio activo. No importan acentos ni errores menores.</p></div></div>' +
      '<div class="inicio-paso"><span class="num">2</span><div><strong>Si hay existencia</strong><p>Verá el precio y si requiere receta.</p></div></div>' +
      '<div class="inicio-paso"><span class="num">3</span><div><strong>Si no hay</strong><p>Se abre la checklist para ofrecer alternativas seguras.</p></div></div>' +
    '</div>';
  }

  function fichaPedido(p, sit) {
    var estadoTxt, estadoClase;
    if (sit.caducado) { estadoTxt = 'Caducado · no vender'; estadoClase = 'estado-peligro'; }
    else if (sit.agotado) { estadoTxt = 'Sin existencias'; estadoClase = 'estado-peligro'; }
    else { estadoTxt = 'Disponible'; estadoClase = 'estado-ok'; }
    var h = '<article class="ficha-pedido ' + estadoClase + '">' +
      '<div class="ficha-estado">' + estadoTxt + '</div>' +
      '<div class="ficha-cuerpo">' +
        '<div class="ficha-principal">' +
          '<h2>' + U.esc(p.nombre) + '</h2>' +
          '<p class="ficha-activo">' + U.esc(p.activos) + ' · ' + U.esc(p.concentracion) + ' · ' + U.esc(p.forma) + '</p>' +
          '<p class="ficha-lab">' + (p.tipo === 'generico' ? '<span class="chip chip-neutro">Genérico</span>' : '<span class="chip chip-neutro">Marca</span>') +
            (p.laboratorio ? ' ' + U.esc(p.laboratorio) : '') + ' · SKU ' + U.esc(p.sku) + '</p>' +
        '</div>' +
        '<dl class="ficha-datos">' +
          '<div><dt>Precio</dt><dd class="precio-grande">' + U.moneda(p.precio) + '</dd></div>' +
          '<div><dt>Existencias</dt><dd>' + p.existencias + '</dd></div>' +
          '<div><dt>Receta</dt><dd>' + (p.receta ? '<span class="chip chip-receta">Requiere receta</span>' : 'No requiere') + '</dd></div>' +
          '<div><dt>Caducidad</dt><dd>' + U.fecha(p.caducidad) + (sit.porCaducar ? ' <span class="chip chip-alerta">' + sit.dias + ' días</span>' : '') + '</dd></div>' +
        '</dl>' +
      '</div>';
    if (sit.disponible && st.paso === 0) {
      h += '<div class="ficha-acciones"><button type="button" class="boton" data-accion="abrir-checklist">Ver alternativas de todos modos</button></div>';
    }
    return h + '</article>';
  }

  function pasos() {
    var nombres = ['Indicación', 'Seguridad', 'Alternativas'];
    return '<ol class="pasos">' + nombres.map(function (n, i) {
      var num = i + 1;
      var clase = num === st.paso ? 'actual' : num < st.paso ? 'hecho' : '';
      var puede = num < st.paso || (num === 2 && st.indicaciones.length) || (num === 3 && st.paso === 2 && st.indicaciones.length);
      return '<li class="' + clase + '">' +
        (puede && num !== st.paso ? '<button type="button" data-accion="paso" data-paso="' + num + '">' : '<span>') +
        '<span class="pasos-num">' + num + '</span> ' + n +
        (puede && num !== st.paso ? '</button>' : '</span>') + '</li>';
    }).join('') + '</ol>';
  }

  function checklist(p, sit) {
    var h = '<section class="checklist" aria-label="Checklist de alternativas">' +
      '<header class="checklist-encabezado"><h3>Checklist de alternativas</h3>' +
      (sit.disponible ? '<button type="button" class="boton boton-chico" data-accion="cerrar-checklist">Cerrar</button>' : '') +
      '</header>' + pasos();
    if (st.paso === 1) h += paso1(p);
    else if (st.paso === 2) h += paso2();
    else h += paso3(p);
    return h + '</section>';
  }

  function paso1(p) {
    var propias = p.indicaciones;
    var lista = Almacen.indicaciones(true).slice().sort(function (a, b) {
      return (propias.indexOf(b.id) >= 0) - (propias.indexOf(a.id) >= 0);
    });
    return '<div class="paso-cuerpo">' +
      '<p class="paso-instruccion">¿Para qué lo necesita el cliente? <span class="tenue">Se precargan las indicaciones del producto pedido; puede cambiarlas.</span></p>' +
      '<div class="chips-seleccion">' + lista.map(function (i) {
        var on = st.indicaciones.indexOf(i.id) >= 0;
        return '<button type="button" class="chip-opcion' + (on ? ' activo' : '') + '" aria-pressed="' + on + '" data-accion="indicacion" data-id="' + U.esc(i.id) + '">' + U.esc(i.nombre) + '</button>';
      }).join('') + '</div>' +
      '<div class="paso-acciones"><span></span><button type="button" class="boton boton-primario" data-accion="paso" data-paso="2"' + (st.indicaciones.length ? '' : ' disabled') + '>Siguiente: seguridad</button></div>' +
    '</div>';
  }

  function paso2() {
    var qs = Almacen.preguntas(true);
    var sinResponder = qs.filter(function (q) { return !(q.etiqueta in st.respuestas); }).length;
    return '<div class="paso-cuerpo">' +
      '<div class="paso-instruccion-fila"><p class="paso-instruccion">Pregunte al cliente:</p>' +
      (sinResponder ? '<button type="button" class="boton boton-chico" data-accion="todas-no">Marcar pendientes como «No»</button>' : '') + '</div>' +
      '<ul class="preguntas">' + qs.map(function (q) {
        var r = st.respuestas[q.etiqueta];
        return '<li class="pregunta' + (r === true ? ' respondida-si' : r === false ? ' respondida-no' : '') + '">' +
          '<span class="pregunta-texto">' + U.esc(q.texto) + '</span>' +
          '<span class="si-no" role="group" aria-label="' + U.esc(q.texto) + '">' +
            '<button type="button" class="' + (r === true ? 'activo' : '') + '" aria-pressed="' + (r === true) + '" data-accion="responder" data-etiqueta="' + U.esc(q.etiqueta) + '" data-valor="si">Sí</button>' +
            '<button type="button" class="' + (r === false ? 'activo' : '') + '" aria-pressed="' + (r === false) + '" data-accion="responder" data-etiqueta="' + U.esc(q.etiqueta) + '" data-valor="no">No</button>' +
          '</span></li>';
      }).join('') + '</ul>' +
      (sinResponder ? '<p class="tenue nota-pendientes">' + sinResponder + (sinResponder === 1 ? ' pregunta sin responder.' : ' preguntas sin responder.') + ' Si no confirma la receta, los productos con receta se marcarán.</p>' : '') +
      '<div class="paso-acciones"><button type="button" class="boton" data-accion="paso" data-paso="1">Atrás</button>' +
      '<button type="button" class="boton boton-primario" data-accion="paso" data-paso="3">Ver alternativas</button></div>' +
    '</div>';
  }

  function resumenChecklist() {
    var ind = st.indicaciones.map(function (i) { return U.esc(Almacen.nombreIndicacion(i)); }).join(', ');
    var si = Almacen.preguntasPrecaucion(true).filter(function (q) { return st.respuestas[q.etiqueta] === true; })
      .map(function (q) { return U.esc(q.motivo); });
    var receta = st.respuestas.receta === true ? 'Sí' : st.respuestas.receta === false ? 'No' : 'Sin confirmar';
    return '<div class="resumen-checklist">' +
      '<div><span class="tenue">Indicación:</span> ' + ind + ' <button type="button" class="enlace" data-accion="paso" data-paso="1">Cambiar</button></div>' +
      '<div><span class="tenue">Precauciones:</span> ' + (si.length ? '<strong class="texto-peligro">' + si.join('; ') + '</strong>' : 'ninguna') +
      ' · <span class="tenue">Receta:</span> ' + receta + ' <button type="button" class="enlace" data-accion="paso" data-paso="2">Cambiar</button></div>' +
    '</div>';
  }

  function tarjeta(a, gris) {
    var p = a.producto;
    var noRec = a.advertencias.length > 0;
    var clases = 'alt-tarjeta' + (noRec ? ' alt-no-recomendada' : '') + (gris ? ' alt-sin-existencia' : '');
    var estado = '';
    if (gris) estado = a.situacion.caducado ? '<span class="chip chip-peligro">Caducado</span>' : '<span class="chip chip-peligro">Agotado</span>';
    else if (a.situacion.porCaducar) estado = '<span class="chip chip-alerta">Caduca en ' + a.situacion.dias + ' días</span>';
    return '<article class="' + clases + '" data-producto="' + U.esc(p.id) + '">' +
      '<div class="alt-encabezado">' +
        '<span class="chip-relacion rel-' + a.tipo.clave + '" title="' + U.esc(a.tipo.descripcion) + '">' + a.tipo.clave + ' · ' + U.esc(a.tipo.nombre) + '</span>' +
        (a.tipo.aviso ? '<span class="chip chip-validar">' + U.esc(a.tipo.aviso) + '</span>' : '') + estado +
      '</div>' +
      '<h4>' + U.esc(p.nombre) + '</h4>' +
      '<p class="alt-activo">' + U.esc(p.activos) + '</p>' +
      '<p class="alt-presentacion">' + U.esc(p.concentracion) + ' · ' + U.esc(p.forma) + ' · ' + (p.tipo === 'generico' ? 'Genérico' : 'Marca') + '</p>' +
      '<dl class="alt-datos">' +
        '<div><dt>Precio</dt><dd class="precio">' + U.moneda(p.precio) + '</dd></div>' +
        '<div><dt>Existencias</dt><dd>' + p.existencias + '</dd></div>' +
        '<div><dt>Receta</dt><dd>' + (p.receta ? 'Sí' : 'No') + '</dd></div>' +
      '</dl>' +
      (noRec ? '<p class="alt-alerta alt-alerta-roja"><strong>No recomendada:</strong> ' + U.esc(a.advertencias.join('; ')) + '</p>' : '') +
      (a.faltaReceta ? '<p class="alt-alerta alt-alerta-receta">Requiere receta</p>' : '') +
      (a.relacion.nota ? '<p class="alt-nota">' + U.esc(a.relacion.nota) + '</p>' : '') +
    '</article>';
  }

  function paso3(p) {
    var r = Almacen.alternativas(p.id, st.indicaciones, st.respuestas);
    var h = '<div class="paso-cuerpo">' + resumenChecklist();
    var viables = r.disponibles.filter(function (a) { return !a.advertencias.length && !a.faltaReceta; });

    if (!r.disponibles.length) {
      h += '<div class="sin-alternativas"><strong>No hay alternativas disponibles para esta indicación.</strong>' +
        '<p>Sugiera al cliente consultar al farmacéutico o a su médico.</p></div>';
    } else if (!viables.length) {
      h += '<div class="sin-alternativas"><strong>Ninguna alternativa en existencia es adecuada sin reservas.</strong>' +
        '<p>Revise las advertencias de cada opción y sugiera consultar al farmacéutico o a su médico.</p></div>';
    }

    if (r.disponibles.length) {
      h += '<h4 class="titulo-grupo">Alternativas en existencia <span class="contador">' + r.disponibles.length + '</span></h4>';
      var grupoActual = null;
      h += '<div class="alt-lista">';
      r.disponibles.forEach(function (a) {
        if (a.tipo.clave !== grupoActual) {
          grupoActual = a.tipo.clave;
          h += '<div class="alt-separador">' + U.esc(a.tipo.nombre) + '</div>';
        }
        h += tarjeta(a, false);
      });
      h += '</div>';
    }

    if (r.sinExistencia.length) {
      h += '<details class="alt-agotadas"><summary>Alternativas sin existencia o caducadas <span class="contador">' + r.sinExistencia.length + '</span></summary>' +
        '<div class="alt-lista">' + r.sinExistencia.map(function (a) { return tarjeta(a, true); }).join('') + '</div></details>';
    }

    if (r.noCoinciden.length) {
      h += '<p class="tenue nota-pendientes">' + r.noCoinciden.length + (r.noCoinciden.length === 1 ? ' producto relacionado no coincide' : ' productos relacionados no coinciden') + ' con la indicación seleccionada.</p>';
    }

    h += '<div class="paso-acciones"><button type="button" class="boton" data-accion="paso" data-paso="2">Atrás</button>' +
      '<button type="button" class="boton" data-accion="limpiar">Nueva búsqueda</button></div>';
    return h + '</div>';
  }

  function refrescar() {
    if (!raiz) return;
    pintar();
  }

  return { iniciar: iniciar, refrescar: refrescar, enfocar: enfocar, seleccionar: seleccionar };
})();
