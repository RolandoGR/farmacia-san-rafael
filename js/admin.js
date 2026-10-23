/* Vista Administración. */
var Admin = (function () {
  var raiz;
  var PESTANAS = [
    { id: 'inventario', nombre: 'Inventario' },
    { id: 'importar', nombre: 'Importar' },
    { id: 'relaciones', nombre: 'Relaciones' },
    { id: 'catalogos', nombre: 'Checklist y catálogos' },
    { id: 'alertas', nombre: 'Alertas' },
    { id: 'respaldo', nombre: 'Respaldo' }
  ];
  var st = {
    pestana: 'inventario',
    inv: { texto: '', tipo: '', receta: '', estado: '', indicacion: '', orden: 'nombre', dir: 1 },
    rel: { texto: '', tipo: '' },
    imp: null,
    omitirPintado: false
  };

  function iniciar(contenedor) {
    raiz = contenedor;
    try { var g = localStorage.getItem(CONFIG.claveAlmacen + '.pestana'); if (g && PESTANAS.some(function (p) { return p.id === g; })) st.pestana = g; } catch (e) { /* sin preferencia */ }
    raiz.addEventListener('click', manejarClic);
    raiz.addEventListener('input', manejarEntrada);
    raiz.addEventListener('change', manejarCambio);
    pintar();
  }

  function cambiarPestana(id) {
    st.pestana = id;
    try { localStorage.setItem(CONFIG.claveAlmacen + '.pestana', id); } catch (e) { /* opcional */ }
    pintar();
  }

  /* ---------- Utilidades locales ---------- */
  function opcionProducto(p) { return p.sku + ' · ' + p.nombre; }

  function resolverProducto(valor) {
    valor = String(valor || '').trim();
    if (!valor) return null;
    var sku = valor.split(' · ')[0];
    var p = Almacen.productoPorSku(sku);
    if (p) return p;
    var n = U.normalizar(valor);
    return Almacen.productos().find(function (x) { return U.normalizar(x.nombre) === n; }) || null;
  }

  function datalistProductos() {
    return '<datalist id="lista-productos">' + Almacen.productos().slice()
      .sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); })
      .map(function (p) { return '<option value="' + U.esc(opcionProducto(p)) + '"></option>'; }).join('') + '</datalist>';
  }

  function chipsSituacion(p) {
    var s = Almacen.situacion(p), h = '';
    if (s.caducado) h += '<span class="chip chip-peligro">Caducado</span>';
    if (s.agotado) h += '<span class="chip chip-peligro">Agotado</span>';
    if (s.bajoMinimo) h += '<span class="chip chip-alerta">Bajo mínimo</span>';
    if (s.porCaducar) h += '<span class="chip chip-alerta">Caduca en ' + s.dias + ' d</span>';
    if (!h) h = '<span class="chip chip-ok">Normal</span>';
    return h;
  }

  function contarAlertas() {
    var n = 0;
    Almacen.productos().forEach(function (p) {
      var s = Almacen.situacion(p);
      if (s.agotado || s.bajoMinimo || s.porCaducar || s.caducado) n++;
    });
    return n;
  }

  function chipRelacion(tipo) {
    var t = Almacen.TIPOS_RELACION[tipo];
    return '<span class="chip-relacion rel-' + tipo + '" title="' + U.esc(t.descripcion) + '">' + tipo + ' · ' + U.esc(t.nombre) + '</span>' +
      (t.aviso ? ' <span class="chip chip-validar">' + U.esc(t.aviso) + '</span>' : '');
  }

  function opcionesTipoRelacion(sel) {
    return Object.keys(Almacen.TIPOS_RELACION).map(function (k) {
      var t = Almacen.TIPOS_RELACION[k];
      return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + k + ' · ' + U.esc(t.nombre) + '</option>';
    }).join('');
  }

  /* ---------- Pintado general ---------- */
  function pintar() {
    if (!raiz) return;
    var alertas = contarAlertas();
    var h = '<nav class="subnav" aria-label="Secciones de administración">' + PESTANAS.map(function (p) {
      return '<button type="button" class="subnav-boton' + (p.id === st.pestana ? ' activo' : '') + '" data-accion="pestana" data-id="' + p.id + '"' +
        (p.id === st.pestana ? ' aria-current="page"' : '') + '>' + p.nombre +
        (p.id === 'alertas' && alertas ? ' <span class="insignia">' + alertas + '</span>' : '') + '</button>';
    }).join('') + '</nav><div class="admin-contenido" id="admin-contenido"></div>' + datalistProductos();
    raiz.innerHTML = h;
    var c = raiz.querySelector('#admin-contenido');
    ({ inventario: pintarInventario, importar: pintarImportar, relaciones: pintarRelaciones, catalogos: pintarCatalogos, alertas: pintarAlertas, respaldo: pintarRespaldo })[st.pestana](c);
  }

  function refrescar() { if (!st.omitirPintado) pintar(); }

  /* ---------- Eventos delegados ---------- */
  function manejarClic(e) {
    var b = e.target.closest('[data-accion]');
    if (!b || !raiz.contains(b)) return;
    var a = b.getAttribute('data-accion');
    var id = b.getAttribute('data-id');
    switch (a) {
      case 'pestana': cambiarPestana(id); break;
      case 'ordenar':
        if (st.inv.orden === id) st.inv.dir *= -1; else { st.inv.orden = id; st.inv.dir = 1; }
        pintarTablaInventario();
        break;
      case 'nuevo-producto': formularioProducto(null); break;
      case 'editar-producto': formularioProducto(id); break;
      case 'ficha-producto': fichaProducto(id); break;
      case 'eliminar-producto': eliminarProducto(id); break;
      case 'limpiar-filtros':
        st.inv = { texto: '', tipo: '', receta: '', estado: '', indicacion: '', orden: st.inv.orden, dir: st.inv.dir };
        pintar();
        break;
      case 'agregar-relacion': agregarRelacionDesdeFormulario(); break;
      case 'editar-relacion': editarRelacion(id); break;
      case 'eliminar-relacion': eliminarRelacion(id); break;
      case 'agregar-indicacion': agregarIndicacion(); break;
      case 'agregar-pregunta': agregarPregunta(); break;
      case 'plantilla-csv': descargarPlantilla('csv'); break;
      case 'plantilla-xlsx': descargarPlantilla('xlsx'); break;
      case 'importar-ejecutar': ejecutarImportacion(); break;
      case 'importar-reiniciar': st.imp = null; pintar(); break;
      case 'exportar-json': exportarRespaldo(); break;
      case 'restablecer': restablecer(); break;
    }
  }

  function manejarEntrada(e) {
    var t = e.target;
    var filtro = t.getAttribute('data-filtro');
    if (filtro) {
      st.inv[filtro] = t.value;
      pintarTablaInventario();
      return;
    }
    var filtroRel = t.getAttribute('data-filtro-rel');
    if (filtroRel) {
      st.rel[filtroRel] = t.value;
      pintarTablaRelaciones();
    }
  }

  function manejarCambio(e) {
    var t = e.target;
    var cat = t.getAttribute('data-catalogo');
    if (cat) {
      var id = t.getAttribute('data-id');
      var campo = t.getAttribute('data-campo');
      var cambios = {};
      cambios[campo] = t.type === 'checkbox' ? t.checked : t.value;
      // Edición en línea: no se repinta la sección para no perder el foco al pasar al siguiente campo.
      st.omitirPintado = true;
      var r = cat === 'indicacion' ? Almacen.actualizarIndicacion(id, cambios) : Almacen.actualizarPregunta(id, cambios);
      st.omitirPintado = false;
      if (r && r.error) { U.aviso(r.error, 'error'); pintar(); return; }
      if (campo === 'activa') t.closest('li').classList.toggle('inactivo', !t.checked);
      U.aviso('Cambio guardado.');
      return;
    }
    if (t.id === 'archivo-importar' && t.files && t.files[0]) leerArchivoImportacion(t.files[0]);
    else if (t.id === 'archivo-respaldo' && t.files && t.files[0]) importarRespaldo(t.files[0], t);
    else if (t.getAttribute('data-mapeo')) {
      var campoMapeo = t.getAttribute('data-mapeo');
      st.imp.mapeo[campoMapeo] = t.value === '' ? null : Number(t.value);
      pintar();
    } else if (t.name === 'modo-importacion') {
      st.imp.modo = t.value;
      pintar();
    }
  }

  /* =====================================================================
   * INVENTARIO
   * ===================================================================== */
  function pintarInventario(c) {
    var f = st.inv;
    c.innerHTML =
      '<div class="encabezado-seccion"><div><h2>Inventario</h2><p class="tenue" id="conteo-inventario"></p></div>' +
        '<button type="button" class="boton boton-primario" data-accion="nuevo-producto">+ Nuevo producto</button></div>' +
      '<div class="filtros">' +
        '<label class="filtro-texto"><span class="sr">Buscar</span><input id="filtro-inv-texto" type="search" placeholder="Buscar por SKU, nombre, activo o laboratorio" data-filtro="texto" value="' + U.esc(f.texto) + '"></label>' +
        '<label><span class="sr">Tipo</span><select id="filtro-inv-tipo" data-filtro="tipo">' +
          opciones([['', 'Marca y genérico'], ['marca', 'Marca'], ['generico', 'Genérico']], f.tipo) + '</select></label>' +
        '<label><span class="sr">Receta</span><select id="filtro-inv-receta" data-filtro="receta">' +
          opciones([['', 'Con y sin receta'], ['si', 'Requiere receta'], ['no', 'Sin receta']], f.receta) + '</select></label>' +
        '<label><span class="sr">Situación</span><select id="filtro-inv-estado" data-filtro="estado">' +
          opciones([['', 'Cualquier situación'], ['disponible', 'Disponible'], ['agotado', 'Agotado'], ['bajo', 'Bajo mínimo'], ['caducar', 'Por caducar (' + CONFIG.diasAvisoCaducidad + ' días)'], ['caducado', 'Caducado']], f.estado) + '</select></label>' +
        '<label><span class="sr">Indicación</span><select id="filtro-inv-indicacion" data-filtro="indicacion">' +
          opciones([['', 'Todas las indicaciones']].concat(Almacen.indicaciones().map(function (i) { return [i.id, i.nombre]; })), f.indicacion) + '</select></label>' +
        '<button type="button" class="boton boton-chico" data-accion="limpiar-filtros">Limpiar filtros</button>' +
      '</div>' +
      '<div class="tabla-contenedor"><table class="tabla" id="tabla-inventario"></table></div>';
    pintarTablaInventario();
  }

  function opciones(lista, sel) {
    return lista.map(function (o) { return '<option value="' + U.esc(o[0]) + '"' + (o[0] === sel ? ' selected' : '') + '>' + U.esc(o[1]) + '</option>'; }).join('');
  }

  function filtrarInventario() {
    var f = st.inv;
    var tokens = U.normalizar(f.texto).split(/\s+/).filter(Boolean);
    // Coincidencia exacta de texto; si no hay ninguna, se usa la búsqueda tolerante a errores.
    var exactos = {};
    var hayExactos = false;
    if (tokens.length) {
      Almacen.productos().forEach(function (p) {
        var texto = U.normalizar([p.sku, p.nombre, p.activos, p.laboratorio, p.lote].join(' '));
        if (tokens.every(function (t) { return texto.indexOf(t) >= 0; })) { exactos[p.id] = true; hayExactos = true; }
      });
    }
    var lista = Almacen.productos().filter(function (p) {
      if (tokens.length && !(hayExactos ? exactos[p.id] : U.puntuarProducto(f.texto, p))) return false;
      if (f.tipo && p.tipo !== f.tipo) return false;
      if (f.receta && p.receta !== (f.receta === 'si')) return false;
      if (f.indicacion && p.indicaciones.indexOf(f.indicacion) < 0) return false;
      if (f.estado) {
        var s = Almacen.situacion(p);
        if (f.estado === 'disponible' && !s.disponible) return false;
        if (f.estado === 'agotado' && !s.agotado) return false;
        if (f.estado === 'bajo' && !s.bajoMinimo) return false;
        if (f.estado === 'caducar' && !s.porCaducar) return false;
        if (f.estado === 'caducado' && !s.caducado) return false;
      }
      return true;
    });
    var campo = f.orden, dir = f.dir;
    lista.sort(function (a, b) {
      var va = a[campo], vb = b[campo];
      if (campo === 'receta') { va = a.receta ? 1 : 0; vb = b.receta ? 1 : 0; }
      var r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va || '').localeCompare(String(vb || ''), 'es', { numeric: true });
      return r * dir || a.nombre.localeCompare(b.nombre, 'es');
    });
    return lista;
  }

  function pintarTablaInventario() {
    var tabla = raiz.querySelector('#tabla-inventario');
    if (!tabla) return;
    var lista = filtrarInventario();
    var total = Almacen.productos().length;
    raiz.querySelector('#conteo-inventario').textContent = lista.length === total ? total + ' productos' : lista.length + ' de ' + total + ' productos';
    var cols = [['sku', 'SKU'], ['nombre', 'Producto'], ['concentracion', 'Presentación'], ['tipo', 'Tipo'], ['receta', 'Receta'],
      ['existencias', 'Existencias'], ['precio', 'Precio'], ['caducidad', 'Caducidad'], [null, 'Situación'], [null, '']];
    var h = '<thead><tr>' + cols.map(function (c) {
      if (!c[0]) return '<th>' + c[1] + '</th>';
      var activo = st.inv.orden === c[0];
      return '<th aria-sort="' + (activo ? (st.inv.dir > 0 ? 'ascending' : 'descending') : 'none') + '"><button type="button" class="ordenar' + (activo ? ' activo' : '') + '" data-accion="ordenar" data-id="' + c[0] + '">' +
        c[1] + '<span class="flecha">' + (activo ? (st.inv.dir > 0 ? '▲' : '▼') : '↕') + '</span></button></th>';
    }).join('') + '</tr></thead><tbody>';
    if (!lista.length) h += '<tr><td colspan="10" class="tabla-vacia">No hay productos con estos filtros.</td></tr>';
    lista.forEach(function (p) {
      h += '<tr>' +
        '<td class="mono">' + U.esc(p.sku) + '</td>' +
        '<td><button type="button" class="enlace enlace-fuerte" data-accion="ficha-producto" data-id="' + U.esc(p.id) + '">' + U.esc(p.nombre) + '</button><div class="tenue chico">' + U.esc(p.activos) + '</div></td>' +
        '<td>' + U.esc(p.concentracion) + '<div class="tenue chico">' + U.esc(p.forma) + '</div></td>' +
        '<td>' + (p.tipo === 'generico' ? 'Genérico' : 'Marca') + '<div class="tenue chico">' + U.esc(p.laboratorio || '—') + '</div></td>' +
        '<td>' + (p.receta ? '<span class="chip chip-receta">Sí</span>' : 'No') + '</td>' +
        '<td class="num">' + p.existencias + '<div class="tenue chico">mín. ' + p.minimo + '</div></td>' +
        '<td class="num">' + U.moneda(p.precio) + '</td>' +
        '<td>' + U.fecha(p.caducidad) + '<div class="tenue chico">Lote ' + U.esc(p.lote || '—') + '</div></td>' +
        '<td class="chips-celda">' + chipsSituacion(p) + '</td>' +
        '<td class="acciones-celda">' +
          '<button type="button" class="boton boton-chico" data-accion="editar-producto" data-id="' + U.esc(p.id) + '">Editar</button>' +
          '<button type="button" class="boton-icono peligro" data-accion="eliminar-producto" data-id="' + U.esc(p.id) + '" aria-label="Eliminar ' + U.esc(p.nombre) + '" title="Eliminar">' + iconoBasura() + '</button>' +
        '</td></tr>';
    });
    tabla.innerHTML = h + '</tbody>';
  }

  function iconoBasura() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
  }

  /* ---------- Formulario de producto ---------- */
  function formularioProducto(id) {
    var p = id ? Almacen.producto(id) : null;
    var d = p || { sku: sugerirSku(), nombre: '', activos: '', concentracion: '', forma: '', laboratorio: '', tipo: 'marca', indicaciones: [], precauciones: [], receta: false, existencias: 0, minimo: 0, precio: 0, lote: '', caducidad: '' };
    var formas = {};
    Almacen.productos().forEach(function (x) { if (x.forma) formas[x.forma] = true; });

    var inds = Almacen.indicaciones().filter(function (i) { return i.activa || d.indicaciones.indexOf(i.id) >= 0; });
    var precs = Almacen.preguntasPrecaucion().filter(function (q) { return q.activa || d.precauciones.indexOf(q.etiqueta) >= 0; });

    function campo(nombre, etiqueta, valor, extra, clase) {
      return '<label class="campo ' + (clase || '') + '"><span>' + etiqueta + '</span><input name="' + nombre + '" value="' + U.esc(valor) + '" ' + (extra || '') + '></label>';
    }

    var html =
      '<form class="form-rejilla" id="form-producto" novalidate>' +
        campo('sku', 'SKU / código *', d.sku, 'required autocomplete="off"') +
        campo('nombre', 'Nombre comercial *', d.nombre, 'required', 'ancho-2') +
        campo('activos', 'Principio(s) activo(s) *', d.activos, 'required placeholder="Ej. Amoxicilina + ácido clavulánico"', 'ancho-2') +
        campo('concentracion', 'Concentración', d.concentracion, 'placeholder="Ej. 500 mg"') +
        campo('forma', 'Forma farmacéutica', d.forma, 'list="lista-formas"') +
        '<datalist id="lista-formas">' + Object.keys(formas).sort().map(function (f) { return '<option value="' + U.esc(f) + '">'; }).join('') + '</datalist>' +
        campo('laboratorio', 'Laboratorio', d.laboratorio) +
        '<label class="campo"><span>Tipo</span><select name="tipo">' + opciones([['marca', 'Marca'], ['generico', 'Genérico']], d.tipo) + '</select></label>' +
        '<label class="campo"><span>Requiere receta</span><select name="receta">' + opciones([['no', 'No'], ['si', 'Sí']], d.receta ? 'si' : 'no') + '</select></label>' +
        campo('existencias', 'Existencias', d.existencias, 'type="number" min="0" step="1" inputmode="numeric"') +
        campo('minimo', 'Existencia mínima', d.minimo, 'type="number" min="0" step="1" inputmode="numeric"') +
        campo('precio', 'Precio (MXN)', d.precio, 'type="number" min="0" step="0.01" inputmode="decimal"') +
        campo('lote', 'Lote', d.lote) +
        campo('caducidad', 'Fecha de caducidad', d.caducidad, 'type="date"') +
        '<fieldset class="ancho-total grupo-casillas"><legend>Indicaciones</legend>' + inds.map(function (i) {
          return '<label class="casilla"><input type="checkbox" name="indicaciones" value="' + U.esc(i.id) + '"' + (d.indicaciones.indexOf(i.id) >= 0 ? ' checked' : '') + '> ' + U.esc(i.nombre) + (i.activa ? '' : ' <em class="tenue">(inactiva)</em>') + '</label>';
        }).join('') + '</fieldset>' +
        '<fieldset class="ancho-total grupo-casillas"><legend>Precauciones <span class="tenue">(se comparan con la checklist de seguridad)</span></legend>' + precs.map(function (q) {
          return '<label class="casilla"><input type="checkbox" name="precauciones" value="' + U.esc(q.etiqueta) + '"' + (d.precauciones.indexOf(q.etiqueta) >= 0 ? ' checked' : '') + '> ' + U.esc(q.motivo) + ' <code>' + U.esc(q.etiqueta) + '</code>' + (q.activa ? '' : ' <em class="tenue">(inactiva)</em>') + '</label>';
        }).join('') + '</fieldset>' +
        '<div class="errores ancho-total" id="errores-producto" hidden></div>' +
      '</form>';

    var capa = U.abrirModal({
      titulo: p ? 'Editar producto' : 'Nuevo producto',
      clase: 'modal-grande',
      contenido: html,
      pie: '<button type="button" class="boton" data-cerrar-modal>Cancelar</button><button type="button" class="boton boton-primario" id="guardar-producto">Guardar</button>'
    });
    var form = capa.querySelector('#form-producto');
    function enviar() {
      var fd = new FormData(form);
      var datos = {
        sku: fd.get('sku'), nombre: fd.get('nombre'), activos: fd.get('activos'), concentracion: fd.get('concentracion'),
        forma: fd.get('forma'), laboratorio: fd.get('laboratorio'), tipo: fd.get('tipo'), receta: fd.get('receta') === 'si',
        existencias: fd.get('existencias'), minimo: fd.get('minimo'), precio: fd.get('precio'), lote: fd.get('lote'), caducidad: fd.get('caducidad'),
        indicaciones: fd.getAll('indicaciones'), precauciones: fd.getAll('precauciones')
      };
      var errores = [];
      ['existencias', 'minimo', 'precio'].forEach(function (k) {
        if (datos[k] !== '' && (isNaN(Number(datos[k])) || Number(datos[k]) < 0)) errores.push('El campo «' + ({ existencias: 'Existencias', minimo: 'Existencia mínima', precio: 'Precio' })[k] + '» debe ser un número mayor o igual a cero.');
      });
      var r = errores.length ? { ok: false, errores: errores } : Almacen.guardarProducto(datos, id);
      if (!r.ok) {
        var box = capa.querySelector('#errores-producto');
        box.hidden = false;
        box.innerHTML = '<ul>' + r.errores.map(function (x) { return '<li>' + U.esc(x) + '</li>'; }).join('') + '</ul>';
        return;
      }
      U.cerrarModal();
      U.aviso(p ? 'Producto actualizado.' : 'Producto agregado al inventario.');
    }
    capa.querySelector('#guardar-producto').addEventListener('click', enviar);
    form.addEventListener('submit', function (e) { e.preventDefault(); enviar(); });
  }

  function sugerirSku() {
    var max = 1000;
    Almacen.productos().forEach(function (p) {
      var m = /^SR-(\d+)$/.exec(p.sku);
      if (m) max = Math.max(max, Number(m[1]));
    });
    return 'SR-' + (max + 1);
  }

  function eliminarProducto(id) {
    var p = Almacen.producto(id);
    if (!p) return;
    var n = Almacen.relacionesDe(id).length;
    U.confirmar('Eliminar producto', '¿Eliminar <strong>' + U.esc(p.nombre) + '</strong> del inventario?' +
      (n ? ' También se eliminarán sus ' + n + (n === 1 ? ' relación.' : ' relaciones.') : ''), 'Eliminar', true)
      .then(function (ok) {
        if (!ok) return;
        Almacen.eliminarProducto(id);
        U.aviso('Producto eliminado.');
      });
  }

  /* ---------- Ficha de producto con sus relaciones ---------- */
  function fichaProducto(id) {
    var capa = U.abrirModal({
      titulo: 'Ficha de producto',
      clase: 'modal-grande',
      contenido: '<div id="ficha-contenido"></div>',
      alCerrar: function () { var i = fichasAbiertas.indexOf(render); if (i >= 0) fichasAbiertas.splice(i, 1); }
    });
    var cont = capa.querySelector('#ficha-contenido');

    function render() {
      var p = Almacen.producto(id);
      if (!p) { U.cerrarModal(); return; }
      var rels = Almacen.relacionesDe(id).sort(function (a, b) {
        return Almacen.TIPOS_RELACION[a.relacion.tipo].orden - Almacen.TIPOS_RELACION[b.relacion.tipo].orden || a.otro.nombre.localeCompare(b.otro.nombre, 'es');
      });
      cont.innerHTML =
        '<div class="ficha-admin">' +
          '<div class="ficha-admin-titulo"><h3>' + U.esc(p.nombre) + '</h3><div>' + chipsSituacion(p) + '</div></div>' +
          '<dl class="lista-datos">' +
            dato('SKU', '<span class="mono">' + U.esc(p.sku) + '</span>') +
            dato('Principio(s) activo(s)', U.esc(p.activos)) +
            dato('Presentación', U.esc(p.concentracion) + ' · ' + U.esc(p.forma)) +
            dato('Laboratorio / tipo', U.esc(p.laboratorio || '—') + ' · ' + (p.tipo === 'generico' ? 'Genérico' : 'Marca')) +
            dato('Precio', U.moneda(p.precio)) +
            dato('Existencias', p.existencias + ' (mínimo ' + p.minimo + ')') +
            dato('Requiere receta', p.receta ? 'Sí' : 'No') +
            dato('Lote / caducidad', U.esc(p.lote || '—') + ' · ' + U.fecha(p.caducidad)) +
            dato('Indicaciones', p.indicaciones.length ? p.indicaciones.map(function (i) { return '<span class="chip chip-neutro">' + U.esc(Almacen.nombreIndicacion(i)) + '</span>'; }).join(' ') : '—') +
            dato('Precauciones', p.precauciones.length ? p.precauciones.map(function (e) { return '<span class="chip chip-alerta">' + U.esc(Almacen.motivoPrecaucion(e)) + '</span>'; }).join(' ') : 'Ninguna registrada') +
          '</dl>' +
          '<div class="ficha-admin-acciones"><button type="button" class="boton" id="ficha-editar">Editar producto</button></div>' +
          '<h4 class="titulo-grupo">Relaciones <span class="contador">' + rels.length + '</span></h4>' +
          (rels.length ? '<ul class="lista-relaciones">' + rels.map(function (x) {
            var s = Almacen.situacion(x.otro);
            return '<li><div class="lista-relaciones-tipo">' + chipRelacion(x.relacion.tipo) + '</div>' +
              '<div class="lista-relaciones-prod"><strong>' + U.esc(x.otro.nombre) + '</strong> <span class="tenue chico">' + U.esc(x.otro.sku) + ' · ' + U.moneda(x.otro.precio) + ' · ' + (s.disponible ? x.otro.existencias + ' en existencia' : (s.caducado ? 'caducado' : 'agotado')) + '</span>' +
              (x.relacion.nota ? '<div class="alt-nota">' + U.esc(x.relacion.nota) + '</div>' : '') + '</div>' +
              '<button type="button" class="boton-icono peligro" data-quitar="' + U.esc(x.relacion.id) + '" aria-label="Quitar relación con ' + U.esc(x.otro.nombre) + '" title="Quitar relación">' + iconoBasura() + '</button></li>';
          }).join('') + '</ul>' : '<p class="tenue">Este producto aún no tiene relaciones.</p>') +
          '<form class="form-relacion" id="ficha-form-rel">' +
            '<label class="campo ancho-2"><span>Relacionar con</span><input name="otro" list="lista-productos" placeholder="Escriba SKU o nombre" autocomplete="off"></label>' +
            '<label class="campo"><span>Tipo</span><select name="tipo">' + opcionesTipoRelacion('G') + '</select></label>' +
            '<label class="campo ancho-2"><span>Nota (opcional)</span><input name="nota" maxlength="200"></label>' +
            '<button type="submit" class="boton boton-primario">Agregar relación</button>' +
          '</form>' +
        '</div>';
      cont.querySelector('#ficha-editar').addEventListener('click', function () { formularioProducto(id); });
      cont.querySelectorAll('[data-quitar]').forEach(function (b) {
        b.addEventListener('click', function () {
          Almacen.eliminarRelacion(b.getAttribute('data-quitar'));
          U.aviso('Relación eliminada.');
        });
      });
      cont.querySelector('#ficha-form-rel').addEventListener('submit', function (e) {
        e.preventDefault();
        var fd = new FormData(e.target);
        var otro = resolverProducto(fd.get('otro'));
        if (!otro) { U.aviso('Seleccione un producto válido de la lista.', 'error'); return; }
        var r = Almacen.agregarRelacion(id, otro.id, fd.get('tipo'), fd.get('nota'));
        if (!r.ok) { U.aviso(r.error, 'error'); return; }
        U.aviso('Relación agregada.');
      });
    }
    function dato(t, v) { return '<div><dt>' + t + '</dt><dd>' + v + '</dd></div>'; }

    render();
    fichasAbiertas.push(render);
  }
  var fichasAbiertas = [];
  function refrescarFichas() {
    fichasAbiertas.slice().forEach(function (f) { try { f(); } catch (e) { /* ficha cerrada */ } });
  }

  /* =====================================================================
   * RELACIONES
   * ===================================================================== */
  function pintarRelaciones(c) {
    c.innerHTML =
      '<div class="encabezado-seccion"><div><h2>Relaciones entre productos</h2>' +
        '<p class="tenue">Cada relación se guarda una sola vez y se usa en ambos sentidos.</p></div></div>' +
      '<form class="tarjeta form-relacion" id="form-nueva-relacion" onsubmit="return false">' +
        '<label class="campo ancho-2"><span>Producto A</span><input id="rel-a" list="lista-productos" placeholder="Escriba SKU o nombre" autocomplete="off"></label>' +
        '<label class="campo"><span>Tipo de relación</span><select id="rel-tipo">' + opcionesTipoRelacion('G') + '</select></label>' +
        '<label class="campo ancho-2"><span>Producto B</span><input id="rel-b" list="lista-productos" placeholder="Escriba SKU o nombre" autocomplete="off"></label>' +
        '<label class="campo ancho-2"><span>Nota (opcional)</span><input id="rel-nota" maxlength="200" placeholder="Ej. El cambio requiere seguimiento médico"></label>' +
        '<button type="button" class="boton boton-primario" data-accion="agregar-relacion">Agregar relación</button>' +
      '</form>' +
      '<div class="leyenda-tipos">' + Object.keys(Almacen.TIPOS_RELACION).map(function (k) {
        var t = Almacen.TIPOS_RELACION[k];
        return '<div>' + chipRelacion(k) + '<span class="tenue chico">' + U.esc(t.descripcion) + '</span></div>';
      }).join('') + '</div>' +
      '<div class="filtros">' +
        '<label class="filtro-texto"><span class="sr">Buscar</span><input id="filtro-rel-texto" type="search" placeholder="Filtrar por producto" data-filtro-rel="texto" value="' + U.esc(st.rel.texto) + '"></label>' +
        '<label><span class="sr">Tipo</span><select id="filtro-rel-tipo" data-filtro-rel="tipo">' + opciones([['', 'Todos los tipos']].concat(Object.keys(Almacen.TIPOS_RELACION).map(function (k) { return [k, k + ' · ' + Almacen.TIPOS_RELACION[k].nombre]; })), st.rel.tipo) + '</select></label>' +
        '<span class="tenue" id="conteo-relaciones"></span>' +
      '</div>' +
      '<div class="tabla-contenedor"><table class="tabla" id="tabla-relaciones"></table></div>';
    c.querySelector('#form-nueva-relacion').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); agregarRelacionDesdeFormulario(); }
    });
    pintarTablaRelaciones();
  }

  function pintarTablaRelaciones() {
    var tabla = raiz.querySelector('#tabla-relaciones');
    if (!tabla) return;
    var q = st.rel.texto;
    var lista = Almacen.relaciones().map(function (r) {
      return { r: r, a: Almacen.producto(r.a), b: Almacen.producto(r.b) };
    }).filter(function (x) {
      if (!x.a || !x.b) return false;
      if (st.rel.tipo && x.r.tipo !== st.rel.tipo) return false;
      if (q && !U.puntuarProducto(q, x.a) && !U.puntuarProducto(q, x.b)) return false;
      return true;
    }).sort(function (x, y) { return x.a.nombre.localeCompare(y.a.nombre, 'es') || Almacen.TIPOS_RELACION[x.r.tipo].orden - Almacen.TIPOS_RELACION[y.r.tipo].orden; });
    raiz.querySelector('#conteo-relaciones').textContent = lista.length + (lista.length === 1 ? ' relación' : ' relaciones');
    var h = '<thead><tr><th>Producto A</th><th>Tipo</th><th>Producto B</th><th>Nota</th><th></th></tr></thead><tbody>';
    if (!lista.length) h += '<tr><td colspan="5" class="tabla-vacia">No hay relaciones con este filtro.</td></tr>';
    lista.forEach(function (x) {
      h += '<tr><td><button type="button" class="enlace enlace-fuerte" data-accion="ficha-producto" data-id="' + U.esc(x.a.id) + '">' + U.esc(x.a.nombre) + '</button></td>' +
        '<td>' + chipRelacion(x.r.tipo) + '</td>' +
        '<td><button type="button" class="enlace enlace-fuerte" data-accion="ficha-producto" data-id="' + U.esc(x.b.id) + '">' + U.esc(x.b.nombre) + '</button></td>' +
        '<td>' + (x.r.nota ? U.esc(x.r.nota) : '<span class="tenue">—</span>') + '</td>' +
        '<td class="acciones-celda"><button type="button" class="boton boton-chico" data-accion="editar-relacion" data-id="' + U.esc(x.r.id) + '">Editar</button>' +
        '<button type="button" class="boton-icono peligro" data-accion="eliminar-relacion" data-id="' + U.esc(x.r.id) + '" aria-label="Eliminar relación" title="Eliminar">' + iconoBasura() + '</button></td></tr>';
    });
    tabla.innerHTML = h + '</tbody>';
  }

  function agregarRelacionDesdeFormulario() {
    var a = resolverProducto(raiz.querySelector('#rel-a').value);
    var b = resolverProducto(raiz.querySelector('#rel-b').value);
    if (!a || !b) { U.aviso('Seleccione ambos productos de la lista.', 'error'); return; }
    var r = Almacen.agregarRelacion(a.id, b.id, raiz.querySelector('#rel-tipo').value, raiz.querySelector('#rel-nota').value);
    if (!r.ok) { U.aviso(r.error, 'error'); return; }
    U.aviso('Relación agregada: ' + a.nombre + ' ↔ ' + b.nombre + '.');
  }

  function editarRelacion(id) {
    var r = Almacen.relaciones().find(function (x) { return x.id === id; });
    if (!r) return;
    var a = Almacen.producto(r.a), b = Almacen.producto(r.b);
    var capa = U.abrirModal({
      titulo: 'Editar relación',
      clase: 'modal-chico',
      contenido: '<p><strong>' + U.esc(a.nombre) + '</strong> ↔ <strong>' + U.esc(b.nombre) + '</strong></p>' +
        '<label class="campo"><span>Tipo</span><select id="editar-rel-tipo">' + opcionesTipoRelacion(r.tipo) + '</select></label>' +
        '<label class="campo"><span>Nota</span><input id="editar-rel-nota" maxlength="200" value="' + U.esc(r.nota) + '"></label>',
      pie: '<button type="button" class="boton" data-cerrar-modal>Cancelar</button><button type="button" class="boton boton-primario" id="editar-rel-guardar">Guardar</button>'
    });
    capa.querySelector('#editar-rel-guardar').addEventListener('click', function () {
      Almacen.actualizarRelacion(id, { tipo: capa.querySelector('#editar-rel-tipo').value, nota: capa.querySelector('#editar-rel-nota').value });
      U.cerrarModal();
      U.aviso('Relación actualizada.');
    });
  }

  function eliminarRelacion(id) {
    var r = Almacen.relaciones().find(function (x) { return x.id === id; });
    if (!r) return;
    var a = Almacen.producto(r.a), b = Almacen.producto(r.b);
    U.confirmar('Eliminar relación', '¿Eliminar la relación entre <strong>' + U.esc(a ? a.nombre : '') + '</strong> y <strong>' + U.esc(b ? b.nombre : '') + '</strong>?', 'Eliminar', true)
      .then(function (ok) { if (ok) { Almacen.eliminarRelacion(id); U.aviso('Relación eliminada.'); } });
  }

  /* =====================================================================
   * CHECKLIST Y CATÁLOGOS
   * ===================================================================== */
  function pintarCatalogos(c) {
    var usoInd = {}, usoPrec = {};
    Almacen.productos().forEach(function (p) {
      p.indicaciones.forEach(function (i) { usoInd[i] = (usoInd[i] || 0) + 1; });
      p.precauciones.forEach(function (e) { usoPrec[e] = (usoPrec[e] || 0) + 1; });
    });
    c.innerHTML =
      '<div class="encabezado-seccion"><div><h2>Checklist y catálogos</h2><p class="tenue">Los cambios se guardan al salir de cada campo. Desactivar un elemento lo oculta del mostrador sin borrarlo de los productos.</p></div></div>' +
      '<div class="dos-columnas">' +
        '<section class="tarjeta"><h3>Preguntas de seguridad</h3>' +
          '<p class="tenue chico">Cada pregunta corresponde a una etiqueta de precaución. Si el cliente responde «Sí», los productos con esa etiqueta se marcan como no recomendados.</p>' +
          '<ul class="lista-catalogo">' + Almacen.preguntas().map(function (q) {
            return '<li class="' + (q.activa ? '' : 'inactivo') + '">' +
              '<label class="campo"><span>Pregunta</span><input id="preg-texto-' + U.esc(q.id) + '" data-catalogo="pregunta" data-id="' + U.esc(q.id) + '" data-campo="texto" value="' + U.esc(q.texto) + '"></label>' +
              '<label class="campo"><span>Motivo que se muestra</span><input id="preg-motivo-' + U.esc(q.id) + '" data-catalogo="pregunta" data-id="' + U.esc(q.id) + '" data-campo="motivo" value="' + U.esc(q.motivo) + '"></label>' +
              '<div class="lista-catalogo-meta">' +
                (q.tipo === 'receta' ? '<span class="chip chip-receta">Valida productos con receta</span>' : '<code>' + U.esc(q.etiqueta) + '</code> <span class="tenue chico">' + (usoPrec[q.etiqueta] || 0) + ' productos</span>') +
                '<label class="interruptor"><input type="checkbox" id="preg-activa-' + U.esc(q.id) + '" data-catalogo="pregunta" data-id="' + U.esc(q.id) + '" data-campo="activa"' + (q.activa ? ' checked' : '') + (q.tipo === 'receta' ? ' disabled' : '') + '><span>Activa</span></label>' +
              '</div></li>';
          }).join('') + '</ul>' +
          '<div class="agregar-catalogo">' +
            '<label class="campo"><span>Nueva pregunta</span><input id="nueva-pregunta-texto" placeholder="¿…?"></label>' +
            '<label class="campo"><span>Motivo (aparece en «No recomendada: …»)</span><input id="nueva-pregunta-motivo" placeholder="Ej. hipertensión no controlada"></label>' +
            '<button type="button" class="boton boton-primario" data-accion="agregar-pregunta">Agregar pregunta</button>' +
          '</div>' +
        '</section>' +
        '<section class="tarjeta"><h3>Catálogo de indicaciones</h3>' +
          '<ul class="lista-catalogo lista-catalogo-compacta">' + Almacen.indicaciones().map(function (i) {
            return '<li class="' + (i.activa ? '' : 'inactivo') + '">' +
              '<label class="campo"><span class="sr">Nombre</span><input id="ind-nombre-' + U.esc(i.id) + '" data-catalogo="indicacion" data-id="' + U.esc(i.id) + '" data-campo="nombre" value="' + U.esc(i.nombre) + '"></label>' +
              '<span class="tenue chico">' + (usoInd[i.id] || 0) + ' prod.</span>' +
              '<label class="interruptor"><input type="checkbox" id="ind-activa-' + U.esc(i.id) + '" data-catalogo="indicacion" data-id="' + U.esc(i.id) + '" data-campo="activa"' + (i.activa ? ' checked' : '') + '><span>Activa</span></label>' +
            '</li>';
          }).join('') + '</ul>' +
          '<div class="agregar-catalogo fila">' +
            '<label class="campo"><span>Nueva indicación</span><input id="nueva-indicacion" placeholder="Ej. Migraña"></label>' +
            '<button type="button" class="boton boton-primario" data-accion="agregar-indicacion">Agregar</button>' +
          '</div>' +
        '</section>' +
      '</div>';
    c.querySelector('#nueva-indicacion').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); agregarIndicacion(); } });
  }

  function agregarIndicacion() {
    var r = Almacen.agregarIndicacion(raiz.querySelector('#nueva-indicacion').value);
    if (!r.ok) { U.aviso(r.error, 'error'); return; }
    U.aviso('Indicación agregada.');
  }

  function agregarPregunta() {
    var r = Almacen.agregarPregunta(raiz.querySelector('#nueva-pregunta-texto').value, raiz.querySelector('#nueva-pregunta-motivo').value);
    if (!r.ok) { U.aviso(r.error, 'error'); return; }
    U.aviso('Pregunta agregada con la etiqueta «' + r.etiqueta + '». Asígnela a los productos que corresponda.');
  }

  /* =====================================================================
   * ALERTAS
   * ===================================================================== */
  function pintarAlertas(c) {
    var agotados = [], bajos = [], porCaducar = [], caducados = [];
    Almacen.productos().forEach(function (p) {
      var s = Almacen.situacion(p);
      if (s.agotado) agotados.push(p);
      if (s.bajoMinimo) bajos.push(p);
      if (s.porCaducar) porCaducar.push(p);
      if (s.caducado) caducados.push(p);
    });
    porCaducar.sort(function (a, b) { return a.caducidad.localeCompare(b.caducidad); });
    caducados.sort(function (a, b) { return a.caducidad.localeCompare(b.caducidad); });
    var porNombre = function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); };
    agotados.sort(porNombre);
    bajos.sort(function (a, b) { return (a.existencias / (a.minimo || 1)) - (b.existencias / (b.minimo || 1)); });

    function bloque(titulo, clase, lista, columnas, fila, vacio) {
      return '<section class="tarjeta bloque-alerta ' + clase + '"><h3>' + titulo + ' <span class="contador">' + lista.length + '</span></h3>' +
        (lista.length ? '<div class="tabla-contenedor"><table class="tabla tabla-compacta"><thead><tr>' + columnas.map(function (x) { return '<th>' + x + '</th>'; }).join('') + '<th></th></tr></thead><tbody>' +
          lista.map(function (p) {
            return '<tr>' + fila(p).map(function (v) { return '<td>' + v + '</td>'; }).join('') +
              '<td class="acciones-celda"><button type="button" class="boton boton-chico" data-accion="editar-producto" data-id="' + U.esc(p.id) + '">Editar</button></td></tr>';
          }).join('') + '</tbody></table></div>' : '<p class="tenue">' + vacio + '</p>') + '</section>';
    }
    function nombre(p) { return '<button type="button" class="enlace enlace-fuerte" data-accion="ficha-producto" data-id="' + U.esc(p.id) + '">' + U.esc(p.nombre) + '</button><div class="tenue chico">' + U.esc(p.sku) + '</div>'; }

    c.innerHTML =
      '<div class="encabezado-seccion"><div><h2>Alertas de inventario</h2><p class="tenue">Productos que requieren atención. Fecha de referencia: ' + U.fecha(U.hoyIso()) + '.</p></div></div>' +
      '<div class="resumen-alertas">' +
        '<div class="kpi kpi-peligro"><span class="kpi-num">' + agotados.length + '</span><span>Agotados</span></div>' +
        '<div class="kpi kpi-alerta"><span class="kpi-num">' + bajos.length + '</span><span>Bajo mínimo</span></div>' +
        '<div class="kpi kpi-alerta"><span class="kpi-num">' + porCaducar.length + '</span><span>Caducan en ' + CONFIG.diasAvisoCaducidad + ' días</span></div>' +
        '<div class="kpi kpi-peligro"><span class="kpi-num">' + caducados.length + '</span><span>Caducados</span></div>' +
      '</div>' +
      '<div class="dos-columnas">' +
        bloque('Agotados', 'alerta-peligro', agotados, ['Producto', 'Mínimo', 'Precio'], function (p) { return [nombre(p), p.minimo, U.moneda(p.precio)]; }, 'Ningún producto agotado.') +
        bloque('Por debajo del mínimo', 'alerta-aviso', bajos, ['Producto', 'Existencias', 'Mínimo'], function (p) { return [nombre(p), '<strong>' + p.existencias + '</strong>', p.minimo]; }, 'Todos los productos están en su nivel mínimo o por encima.') +
        bloque('Caducan en los próximos ' + CONFIG.diasAvisoCaducidad + ' días', 'alerta-aviso', porCaducar, ['Producto', 'Lote', 'Caducidad', 'Exist.'], function (p) { var s = Almacen.situacion(p); return [nombre(p), U.esc(p.lote), U.fecha(p.caducidad) + '<div class="tenue chico">en ' + s.dias + ' días</div>', p.existencias]; }, 'Ningún producto caduca en este periodo.') +
        bloque('Caducados', 'alerta-peligro', caducados, ['Producto', 'Lote', 'Caducidad', 'Exist.'], function (p) { return [nombre(p), U.esc(p.lote), U.fecha(p.caducidad), p.existencias]; }, 'Ningún producto caducado.') +
      '</div>';
  }

  /* =====================================================================
   * RESPALDO
   * ===================================================================== */
  function pintarRespaldo(c) {
    var e = Almacen.exportar();
    c.innerHTML =
      '<div class="encabezado-seccion"><div><h2>Respaldo</h2><p class="tenue">Los datos se guardan en este navegador. Exporte un respaldo con regularidad.</p></div></div>' +
      '<div class="tres-columnas">' +
        '<section class="tarjeta"><h3>Exportar</h3><p>Descarga un archivo JSON con todo el estado: ' + e.productos.length + ' productos, ' + e.relaciones.length + ' relaciones, catálogos y checklist.</p>' +
          '<p class="tenue chico">Última modificación: ' + new Date(e.actualizado).toLocaleString(CONFIG.locale) + '</p>' +
          '<button type="button" class="boton boton-primario" data-accion="exportar-json">Descargar respaldo</button></section>' +
        '<section class="tarjeta"><h3>Importar respaldo</h3><p>Reemplaza todo el estado actual con el contenido de un archivo JSON exportado previamente.</p>' +
          '<label class="boton boton-archivo">Elegir archivo JSON<input type="file" id="archivo-respaldo" accept=".json,application/json"></label></section>' +
        '<section class="tarjeta tarjeta-peligro"><h3>Restablecer datos iniciales</h3><p>Borra todos los cambios y vuelve a cargar el inventario, relaciones y catálogos de origen.</p>' +
          '<button type="button" class="boton boton-peligro" data-accion="restablecer">Restablecer datos iniciales</button></section>' +
      '</div>';
  }

  function nombreBase() { return U.slug(CONFIG.nombreFarmacia).replace(/_/g, '-'); }

  function exportarRespaldo() {
    U.descargar('respaldo-' + nombreBase() + '-' + U.hoyIso() + '.json', JSON.stringify(Almacen.exportar(), null, 2), 'application/json');
    U.aviso('Respaldo descargado.');
  }

  function importarRespaldo(archivo, input) {
    var lector = new FileReader();
    lector.onload = function () {
      input.value = '';
      var datos;
      try { datos = JSON.parse(lector.result); } catch (e) { U.aviso('El archivo no es un JSON válido.', 'error'); return; }
      var error = Almacen.validarEstado(datos);
      if (error) { U.aviso('Respaldo no válido: ' + error, 'error'); return; }
      U.confirmar('Importar respaldo', 'Se reemplazará todo el estado actual con <strong>' + datos.productos.length + ' productos</strong> y <strong>' + datos.relaciones.length + ' relaciones</strong>. ¿Continuar?', 'Reemplazar', true)
        .then(function (ok) {
          if (!ok) return;
          Almacen.reemplazar(datos);
          U.aviso('Respaldo importado.');
        });
    };
    lector.readAsText(archivo, 'utf-8');
  }

  function restablecer() {
    U.confirmar('Restablecer datos iniciales', 'Se perderán <strong>todos</strong> los cambios hechos al inventario, relaciones, catálogos y checklist. Esta acción no se puede deshacer. ¿Desea continuar?', 'Restablecer', true)
      .then(function (ok) {
        if (!ok) return;
        Almacen.restablecer();
        st.imp = null;
        U.aviso('Datos iniciales restablecidos.');
      });
  }

  /* =====================================================================
   * IMPORTAR CSV / EXCEL
   * ===================================================================== */
  var CAMPOS_IMPORT = [
    { c: 'sku', t: 'SKU / código', req: true, enc: 'sku', sin: ['codigo', 'clave', 'codigo_de_barras', 'sku_codigo', 'codigo_sku'] },
    { c: 'nombre', t: 'Nombre comercial', req: true, enc: 'nombre_comercial', sin: ['nombre', 'producto', 'descripcion'] },
    { c: 'activos', t: 'Principio(s) activo(s)', req: true, enc: 'principios_activos', sin: ['principio_activo', 'principios_activo', 'activo', 'activos', 'sustancia_activa', 'sal'] },
    { c: 'concentracion', t: 'Concentración', enc: 'concentracion', sin: ['dosis'] },
    { c: 'forma', t: 'Forma farmacéutica', enc: 'forma_farmaceutica', sin: ['forma', 'presentacion'] },
    { c: 'laboratorio', t: 'Laboratorio', enc: 'laboratorio', sin: ['fabricante', 'lab'] },
    { c: 'tipo', t: 'Tipo (marca/genérico)', enc: 'tipo', sin: ['marca_o_generico', 'marca_generico', 'tipo_producto'] },
    { c: 'indicaciones', t: 'Indicaciones', enc: 'indicaciones', sin: ['indicacion', 'uso', 'usos'] },
    { c: 'precauciones', t: 'Precauciones', enc: 'precauciones', sin: ['precaucion', 'contraindicaciones'] },
    { c: 'receta', t: 'Requiere receta', enc: 'requiere_receta', sin: ['receta', 'con_receta'] },
    { c: 'existencias', t: 'Existencias', enc: 'existencias', sin: ['existencia', 'stock', 'inventario', 'cantidad'] },
    { c: 'minimo', t: 'Existencia mínima', enc: 'existencia_minima', sin: ['minimo', 'stock_minimo', 'existencia_min'] },
    { c: 'precio', t: 'Precio (MXN)', enc: 'precio_mxn', sin: ['precio', 'pvp', 'precio_venta', 'precio_publico'] },
    { c: 'lote', t: 'Lote', enc: 'lote', sin: ['no_lote', 'numero_de_lote', 'num_lote'] },
    { c: 'caducidad', t: 'Fecha de caducidad', enc: 'caducidad', sin: ['fecha_caducidad', 'fecha_de_caducidad', 'vencimiento', 'expiracion', 'caduca'] }
  ];

  function descargarPlantilla(formato) {
    var encabezados = CAMPOS_IMPORT.map(function (f) { return f.enc; });
    var base = 'plantilla-inventario-' + nombreBase();
    if (formato === 'xlsx') {
      if (!window.XLSX) { U.aviso('No se encontró el componente para Excel (vendor/xlsx.full.min.js).', 'error'); return; }
      var hoja = XLSX.utils.aoa_to_sheet([encabezados]);
      hoja['!cols'] = encabezados.map(function (e) { return { wch: Math.max(12, e.length + 2) }; });
      var libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, 'Inventario');
      XLSX.writeFile(libro, base + '.xlsx');
    } else {
      U.descargar(base + '.csv', '﻿' + encabezados.join(',') + '\r\n', 'text/csv;charset=utf-8');
    }
    U.aviso('Plantilla descargada.');
  }

  function parsearCsv(texto) {
    texto = texto.replace(/^﻿/, '');
    var primera = texto.split(/\r?\n/)[0] || '';
    var delim = [',', ';', '\t'].map(function (d) { return [d, primera.split(d).length]; }).sort(function (a, b) { return b[1] - a[1]; })[0][0];
    var filas = [], fila = [], celda = '', comillas = false;
    for (var i = 0; i < texto.length; i++) {
      var ch = texto[i];
      if (comillas) {
        if (ch === '"') {
          if (texto[i + 1] === '"') { celda += '"'; i++; } else comillas = false;
        } else celda += ch;
      } else if (ch === '"') comillas = true;
      else if (ch === delim) { fila.push(celda); celda = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && texto[i + 1] === '\n') i++;
        fila.push(celda); filas.push(fila); fila = []; celda = '';
      } else celda += ch;
    }
    if (celda !== '' || fila.length) { fila.push(celda); filas.push(fila); }
    return filas;
  }

  function leerArchivoImportacion(archivo) {
    var ext = (archivo.name.split('.').pop() || '').toLowerCase();
    var lector = new FileReader();
    lector.onerror = function () { U.aviso('No se pudo leer el archivo.', 'error'); };
    lector.onload = function () {
      var filas;
      try {
        if (ext === 'csv' || ext === 'txt') {
          var texto;
          try { texto = new TextDecoder('utf-8', { fatal: true }).decode(lector.result); }
          catch (e) { texto = new TextDecoder('windows-1252').decode(lector.result); }
          filas = parsearCsv(texto);
        } else {
          if (!window.XLSX) throw new Error('No se encontró el componente para Excel.');
          var libro = XLSX.read(new Uint8Array(lector.result), { type: 'array', cellDates: true });
          var hoja = libro.Sheets[libro.SheetNames[0]];
          filas = XLSX.utils.sheet_to_json(hoja, { header: 1, raw: true, defval: '', blankrows: false });
        }
      } catch (e) {
        U.aviso('No se pudo interpretar el archivo: ' + e.message, 'error');
        return;
      }
      filas = filas.filter(function (f) { return f.some(function (v) { return String(v).trim() !== ''; }); });
      if (filas.length < 2) {
        st.imp = { archivo: archivo.name, error: 'El archivo no tiene filas de datos debajo de los encabezados.' };
        pintar();
        return;
      }
      var encabezados = filas[0].map(function (h) { return String(h).trim(); });
      st.imp = {
        archivo: archivo.name,
        encabezados: encabezados,
        filas: filas.slice(1),
        mapeo: mapeoAutomatico(encabezados),
        modo: 'actualizar',
        resultado: null
      };
      pintar();
    };
    lector.readAsArrayBuffer(archivo);
  }

  function mapeoAutomatico(encabezados) {
    var norm = encabezados.map(function (h) { return U.slug(h); });
    var mapeo = {};
    CAMPOS_IMPORT.forEach(function (f) {
      var candidatos = [f.enc, f.c].concat(f.sin);
      var idx = -1;
      for (var i = 0; i < candidatos.length && idx < 0; i++) idx = norm.indexOf(candidatos[i]);
      mapeo[f.c] = idx >= 0 ? idx : null;
    });
    return mapeo;
  }

  function texto(v) {
    if (v instanceof Date) return '';
    return String(v == null ? '' : v).trim();
  }

  function parsearNumero(v) {
    if (typeof v === 'number') return v;
    var s = texto(v).replace(/mxn|\$|\s/gi, '');
    if (!s) return null;
    if (/^-?\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.');
    else s = s.replace(/,/g, '');
    var n = Number(s);
    return isNaN(n) ? NaN : n;
  }

  function iso(a, m, d) {
    var f = new Date(a, m - 1, d);
    if (f.getFullYear() !== a || f.getMonth() !== m - 1 || f.getDate() !== d) return null;
    return a + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }

  function parsearFecha(v) {
    if (v instanceof Date) {
      if (isNaN(v)) return null;
      var f = new Date(v.getTime() + 12 * 3600 * 1000);
      return iso(f.getFullYear(), f.getMonth() + 1, f.getDate());
    }
    if (typeof v === 'number') {
      if (v > 20000 && v < 80000) {
        var base = new Date(1899, 11, 30);
        var d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + Math.floor(v));
        return iso(d.getFullYear(), d.getMonth() + 1, d.getDate());
      }
      return null;
    }
    var s = texto(v);
    var m;
    if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s))) return iso(+m[1], +m[2], +m[3]);
    if ((m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(s))) {
      var anio = +m[3]; if (anio < 100) anio += 2000;
      return iso(anio, +m[2], +m[1]);
    }
    if ((m = /^(\d{1,2})[-/.](\d{4})$/.exec(s))) {
      // Mes/año: se toma el último día del mes.
      var ult = new Date(+m[2], +m[1], 0);
      return +m[1] >= 1 && +m[1] <= 12 ? iso(ult.getFullYear(), ult.getMonth() + 1, ult.getDate()) : null;
    }
    if (/^\d{5}$/.test(s)) return parsearFecha(Number(s));
    return null;
  }

  function parsearBooleano(v) {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    var s = U.normalizar(v);
    if (['si', 's', 'yes', 'y', 'true', 'verdadero', '1', 'x'].indexOf(s) >= 0) return true;
    if (['no', 'n', 'false', 'falso', '0', ''].indexOf(s) >= 0) return false;
    return null;
  }

  function parsearLista(v) {
    return texto(v).split(/[;|,]/).map(function (x) { return x.trim(); }).filter(Boolean);
  }

  function resolverIndicacion(t) {
    var n = U.normalizar(t), s = U.slug(t);
    var i = Almacen.indicaciones().find(function (x) { return x.id === t || x.id === s || U.normalizar(x.nombre) === n; });
    return i ? i.id : null;
  }

  function resolverPrecaucion(t) {
    var n = U.normalizar(t), s = U.slug(t);
    var q = Almacen.preguntasPrecaucion().find(function (x) { return x.etiqueta === t || x.etiqueta === s || U.normalizar(x.motivo) === n; });
    return q ? q.etiqueta : null;
  }

  function validarImportacion() {
    var imp = st.imp;
    var skusArchivo = {};
    var skusUsados = {};
    Almacen.productos().forEach(function (p) { skusUsados[U.normalizar(p.sku)] = true; });

    return imp.filas.map(function (fila, i) {
      var r = { num: i + 2, errores: [], advertencias: [], datos: {}, accion: 'agregar', idExistente: null };
      function val(c) { var idx = imp.mapeo[c]; return idx == null ? '' : fila[idx]; }
      function presente(c) { var v = val(c); return v instanceof Date || texto(v) !== '' || typeof v === 'number' || typeof v === 'boolean'; }

      var sku = texto(val('sku'));
      if (!sku) r.errores.push('Falta el SKU.');
      var clave = U.normalizar(sku);
      if (sku && skusArchivo[clave]) r.errores.push('SKU repetido en el archivo (fila ' + skusArchivo[clave] + ').');
      if (sku) skusArchivo[clave] = r.num;

      var existente = sku ? Almacen.productoPorSku(sku) : null;
      if (existente && imp.modo === 'actualizar') { r.accion = 'actualizar'; r.idExistente = existente.id; }
      var esNuevo = r.accion === 'agregar';

      ['nombre', 'activos', 'concentracion', 'forma', 'laboratorio', 'lote'].forEach(function (c) {
        if (presente(c)) r.datos[c] = texto(val(c));
      });
      if (esNuevo && !r.datos.nombre) r.errores.push('Falta el nombre comercial.');
      if (esNuevo && !r.datos.activos) r.errores.push('Falta el principio activo.');

      if (presente('tipo')) {
        var t = U.normalizar(val('tipo'));
        if (/^gen/.test(t) || t === 'g') r.datos.tipo = 'generico';
        else if (/^marc/.test(t) || t === 'm' || t === 'patente' || t === 'original') r.datos.tipo = 'marca';
        else r.errores.push('Tipo no reconocido: «' + texto(val('tipo')) + '» (use marca o genérico).');
      } else if (esNuevo) {
        r.datos.tipo = /gen[eé]rico/i.test(r.datos.nombre || '') ? 'generico' : 'marca';
        r.advertencias.push('Sin tipo; se registrará como ' + (r.datos.tipo === 'generico' ? 'genérico' : 'marca') + '.');
      }

      if (presente('receta')) {
        var b = parsearBooleano(val('receta'));
        if (b === null) r.errores.push('Valor de receta no válido: «' + texto(val('receta')) + '» (use sí o no).');
        else r.datos.receta = b;
      }

      [['existencias', 'Existencias', true], ['minimo', 'Existencia mínima', true], ['precio', 'Precio', false]].forEach(function (x) {
        if (!presente(x[0])) {
          if (esNuevo && x[0] === 'precio') r.advertencias.push('Sin precio; se registrará en $0.00.');
          return;
        }
        var n = parsearNumero(val(x[0]));
        if (n === null) return;
        if (isNaN(n) || n < 0) r.errores.push(x[1] + ' no válido: «' + texto(val(x[0])) + '».');
        else if (x[2] && Math.round(n) !== n) r.errores.push(x[1] + ' debe ser un número entero.');
        else r.datos[x[0]] = x[2] ? n : Math.round(n * 100) / 100;
      });

      if (presente('caducidad')) {
        var f = parsearFecha(val('caducidad'));
        if (!f) r.errores.push('Fecha de caducidad no válida: «' + (val('caducidad') instanceof Date ? 'fecha' : texto(val('caducidad'))) + '» (use AAAA-MM-DD o DD/MM/AAAA).');
        else {
          r.datos.caducidad = f;
          if (U.diasHasta(f) < 0) r.advertencias.push('El producto ya está caducado.');
        }
      } else if (esNuevo) r.advertencias.push('Sin fecha de caducidad.');

      if (presente('indicaciones')) {
        var inds = [];
        parsearLista(val('indicaciones')).forEach(function (t) {
          var id = resolverIndicacion(t);
          if (id) { if (inds.indexOf(id) < 0) inds.push(id); }
          else r.advertencias.push('Indicación no reconocida «' + t + '» (se omitió).');
        });
        r.datos.indicaciones = inds;
      }
      if (presente('precauciones')) {
        var precs = [];
        parsearLista(val('precauciones')).forEach(function (t) {
          var et = resolverPrecaucion(t);
          if (et) { if (precs.indexOf(et) < 0) precs.push(et); }
          else r.advertencias.push('Precaución no reconocida «' + t + '» (se omitió).');
        });
        r.datos.precauciones = precs;
      }

      if (sku) r.datos.sku = sku;
      if (existente && imp.modo === 'nuevos' && sku) {
        var n = 2, nuevo;
        do { nuevo = sku + '-' + n++; } while (skusUsados[U.normalizar(nuevo)] || skusArchivo[U.normalizar(nuevo)]);
        skusUsados[U.normalizar(nuevo)] = true;
        r.datos.sku = nuevo;
        r.advertencias.push('El SKU ya existe; se agregará como nuevo con el SKU ' + nuevo + '.');
      }
      if (!r.errores.length && r.accion === 'actualizar' && Object.keys(r.datos).length <= 1) r.advertencias.push('Sin datos para actualizar.');
      if (r.errores.length) r.accion = 'omitir';
      return r;
    });
  }

  function pintarImportar(c) {
    var imp = st.imp;
    var h = '<div class="encabezado-seccion"><div><h2>Importar productos</h2><p class="tenue">Acepta archivos CSV (separados por coma o punto y coma) y Excel (.xlsx, .xls).</p></div></div>' +
      '<section class="tarjeta"><h3>1. Archivo</h3>' +
        '<div class="fila-botones">' +
          '<label class="boton boton-primario boton-archivo">Elegir archivo CSV o Excel<input type="file" id="archivo-importar" accept=".csv,.txt,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></label>' +
          '<span class="tenue">' + (imp && imp.archivo ? 'Archivo: <strong>' + U.esc(imp.archivo) + '</strong>' : 'Ningún archivo seleccionado') + '</span>' +
          '<span class="separador-flex"></span>' +
          '<button type="button" class="boton" data-accion="plantilla-csv">Descargar plantilla CSV</button>' +
          '<button type="button" class="boton" data-accion="plantilla-xlsx">Descargar plantilla Excel</button>' +
        '</div>' +
        '<details class="ayuda"><summary>Formato de las columnas</summary><ul class="chico">' +
          '<li><strong>indicaciones</strong> y <strong>precauciones</strong>: varios valores separados por punto y coma. Ej. <code>Dolor; Fiebre</code> · <code>renal_hepatica; embarazo_lactancia</code></li>' +
          '<li><strong>tipo</strong>: marca o genérico. <strong>requiere_receta</strong>: sí o no.</li>' +
          '<li><strong>caducidad</strong>: AAAA-MM-DD, DD/MM/AAAA o MM/AAAA (se toma el último día del mes).</li>' +
          '<li>Al actualizar, las celdas vacías conservan el valor actual del producto.</li>' +
          '<li>Indicaciones válidas: ' + Almacen.indicaciones(true).map(function (i) { return U.esc(i.nombre); }).join(', ') + '.</li>' +
          '<li>Precauciones válidas: ' + Almacen.preguntasPrecaucion(true).map(function (q) { return '<code>' + U.esc(q.etiqueta) + '</code>'; }).join(', ') + '.</li>' +
        '</ul></details>' +
      '</section>';

    if (imp && imp.error) h += '<div class="sin-alternativas">' + U.esc(imp.error) + '</div>';

    if (imp && imp.resultado) {
      h += '<section class="tarjeta tarjeta-exito"><h3>Importación terminada</h3><p>' +
        imp.resultado.agregados + ' productos agregados, ' + imp.resultado.actualizados + ' actualizados' +
        (imp.resultado.omitidos ? ', ' + imp.resultado.omitidos + ' filas omitidas por errores' : '') + '.</p>' +
        '<div class="fila-botones"><button type="button" class="boton" data-accion="importar-reiniciar">Importar otro archivo</button>' +
        '<button type="button" class="boton boton-primario" data-accion="pestana" data-id="inventario">Ver inventario</button></div></section>';
    } else if (imp && imp.filas) {
      // Mapeo de columnas
      var ejemplo = imp.filas[0] || [];
      h += '<section class="tarjeta"><h3>2. Columnas</h3><p class="tenue chico">Se detectaron automáticamente; ajuste si es necesario.</p><div class="rejilla-mapeo">' +
        CAMPOS_IMPORT.map(function (f) {
          var idx = imp.mapeo[f.c];
          var muestra = idx == null ? '' : ejemplo[idx];
          if (muestra instanceof Date) muestra = parsearFecha(muestra);
          return '<label class="campo"><span>' + f.t + (f.req ? ' *' : '') + '</span><select id="mapeo-' + f.c + '" data-mapeo="' + f.c + '"><option value="">— No importar —</option>' +
            imp.encabezados.map(function (e, i) { return '<option value="' + i + '"' + (idx === i ? ' selected' : '') + '>' + U.esc(e || ('Columna ' + (i + 1))) + '</option>'; }).join('') +
            '</select><small class="tenue">' + (idx == null ? (f.req ? '<span class="texto-peligro">Sin asignar</span>' : '&nbsp;') : 'Ej. ' + U.esc(String(muestra).slice(0, 40) || '(vacío)')) + '</small></label>';
        }).join('') + '</div></section>';

      var filas = validarImportacion();
      var nAgregar = filas.filter(function (r) { return r.accion === 'agregar'; }).length;
      var nActualizar = filas.filter(function (r) { return r.accion === 'actualizar'; }).length;
      var nError = filas.filter(function (r) { return r.accion === 'omitir'; }).length;
      var nAdv = filas.filter(function (r) { return r.accion !== 'omitir' && r.advertencias.length; }).length;
      st.imp.validadas = filas;

      h += '<section class="tarjeta"><h3>3. Vista previa y validación</h3>' +
        '<fieldset class="modo-importacion"><legend>Si el SKU ya existe en el inventario:</legend>' +
          '<label class="casilla"><input type="radio" name="modo-importacion" value="actualizar"' + (imp.modo === 'actualizar' ? ' checked' : '') + '> Actualizar el producto existente</label>' +
          '<label class="casilla"><input type="radio" name="modo-importacion" value="nuevos"' + (imp.modo === 'nuevos' ? ' checked' : '') + '> Agregarlo como producto nuevo (con SKU distinto)</label>' +
        '</fieldset>' +
        '<div class="resumen-importacion">' +
          '<span class="chip chip-ok">' + nAgregar + ' nuevos</span>' +
          '<span class="chip chip-neutro">' + nActualizar + ' actualizaciones</span>' +
          '<span class="chip chip-alerta">' + nAdv + ' con advertencias</span>' +
          '<span class="chip chip-peligro">' + nError + ' con errores (se omitirán)</span>' +
        '</div>' +
        '<div class="tabla-contenedor tabla-alta"><table class="tabla tabla-compacta" id="tabla-importacion"><thead><tr><th>Fila</th><th>Acción</th><th>SKU</th><th>Nombre</th><th>Exist.</th><th>Precio</th><th>Caducidad</th><th>Mensajes</th></tr></thead><tbody>' +
        filas.map(function (r) {
          var d = r.datos;
          var actual = r.idExistente ? Almacen.producto(r.idExistente) : null;
          var accion = r.accion === 'omitir' ? '<span class="chip chip-peligro">Error</span>' : r.accion === 'actualizar' ? '<span class="chip chip-neutro">Actualizar</span>' : '<span class="chip chip-ok">Nuevo</span>';
          return '<tr class="' + (r.accion === 'omitir' ? 'fila-error' : r.advertencias.length ? 'fila-advertencia' : '') + '">' +
            '<td class="num">' + r.num + '</td><td>' + accion + '</td>' +
            '<td class="mono">' + U.esc(d.sku || texto((imp.mapeo.sku != null ? imp.filas[r.num - 2][imp.mapeo.sku] : ''))) + '</td>' +
            '<td>' + U.esc(d.nombre || (actual ? actual.nombre : '')) + '</td>' +
            '<td class="num">' + (d.existencias != null ? d.existencias : '') + '</td>' +
            '<td class="num">' + (d.precio != null ? U.moneda(d.precio) : '') + '</td>' +
            '<td>' + (d.caducidad ? U.fecha(d.caducidad) : '') + '</td>' +
            '<td class="mensajes">' + r.errores.map(function (x) { return '<div class="texto-peligro">' + U.esc(x) + '</div>'; }).join('') +
              r.advertencias.map(function (x) { return '<div class="texto-alerta">' + U.esc(x) + '</div>'; }).join('') + (r.errores.length || r.advertencias.length ? '' : '<span class="texto-ok">Correcto</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="fila-botones derecha">' +
          '<button type="button" class="boton" data-accion="importar-reiniciar">Cancelar</button>' +
          '<button type="button" class="boton boton-primario" id="boton-importar" data-accion="importar-ejecutar"' + (nAgregar + nActualizar ? '' : ' disabled') + '>Importar ' + (nAgregar + nActualizar) + (nAgregar + nActualizar === 1 ? ' producto' : ' productos') + '</button>' +
        '</div></section>';
    }
    c.innerHTML = h;
  }

  function ejecutarImportacion() {
    var filas = (st.imp && st.imp.validadas) || [];
    var validas = filas.filter(function (r) { return r.accion !== 'omitir'; });
    if (!validas.length) return;
    var omitidos = filas.length - validas.length;
    var res = Almacen.importarProductos(validas.map(function (r) {
      if (r.accion === 'actualizar') {
        var d = Object.assign({}, r.datos);
        delete d.sku;
        return { idExistente: r.idExistente, datos: d };
      }
      return { datos: r.datos };
    }));
    res.omitidos = omitidos;
    st.imp = { archivo: st.imp.archivo, resultado: res };
    pintar();
    U.aviso('Importación terminada: ' + res.agregados + ' nuevos, ' + res.actualizados + ' actualizados.');
  }

  return { iniciar: iniciar, refrescar: refrescar, refrescarFichas: refrescarFichas, contarAlertas: contarAlertas, cambiarPestana: cambiarPestana };
})();
