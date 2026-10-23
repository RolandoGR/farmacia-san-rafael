/*
 * Estado de la aplicación y reglas de negocio.
 * Todo cambio se guarda de inmediato en localStorage.
 */
var Almacen = (function () {
  var estado = null;
  var oyentes = [];
  var guardadoDisponible = true;

  var TIPOS_RELACION = {
    G: { clave: 'G', nombre: 'Genérico / mismo activo', corto: 'Genérico', orden: 1, descripcion: 'Mismo principio activo, concentración y forma.' },
    P: { clave: 'P', nombre: 'Otra presentación', corto: 'Otra presentación', orden: 2, descripcion: 'Mismo principio activo con otra concentración o forma.' },
    C: { clave: 'C', nombre: 'Combinación', corto: 'Combinación', orden: 3, descripcion: 'Contiene el activo junto con otros, o viceversa.' },
    T: { clave: 'T', nombre: 'Misma clase terapéutica', corto: 'Misma clase', orden: 4, descripcion: 'Molécula distinta con indicación similar.', aviso: 'Validar con farmacéutico' }
  };

  function cargar() {
    var crudo = null;
    try { crudo = localStorage.getItem(CONFIG.claveAlmacen); } catch (e) { guardadoDisponible = false; }
    if (crudo) {
      try {
        var datos = JSON.parse(crudo);
        var error = validarEstado(datos);
        if (!error) { estado = datos; return; }
        console.warn('Estado guardado inválido:', error);
      } catch (e) { console.warn('No se pudo leer el estado guardado', e); }
    }
    estado = DATOS_INICIALES.construir(new Date());
    guardar(true);
  }

  function guardar(silencioso) {
    estado.actualizado = new Date().toISOString();
    try {
      localStorage.setItem(CONFIG.claveAlmacen, JSON.stringify(estado));
      guardadoDisponible = true;
    } catch (e) {
      guardadoDisponible = false;
      if (!silencioso && window.U) U.aviso('No se pudieron guardar los cambios en este navegador.', 'error');
    }
    if (!silencioso) oyentes.forEach(function (f) { f(); });
  }

  function alCambiar(f) { oyentes.push(f); }

  function validarEstado(d) {
    if (!d || typeof d !== 'object') return 'El archivo no contiene un objeto válido.';
    if (!Array.isArray(d.productos)) return 'Falta la lista de productos.';
    if (!Array.isArray(d.relaciones)) return 'Falta la lista de relaciones.';
    if (!Array.isArray(d.indicaciones)) return 'Falta el catálogo de indicaciones.';
    if (!Array.isArray(d.preguntas)) return 'Faltan las preguntas de la checklist.';
    for (var i = 0; i < d.productos.length; i++) {
      var p = d.productos[i];
      if (!p || !p.id || !p.sku || !p.nombre) return 'Producto incompleto en la posición ' + (i + 1) + '.';
    }
    return null;
  }

  function restablecer() {
    estado = DATOS_INICIALES.construir(new Date());
    guardar();
  }

  function reemplazar(datos) {
    var error = validarEstado(datos);
    if (error) throw new Error(error);
    estado = datos;
    guardar();
  }

  /* ---------- Consultas ---------- */
  function productos() { return estado.productos; }
  function producto(id) { return estado.productos.find(function (p) { return p.id === id; }) || null; }
  function productoPorSku(sku) {
    var n = U.normalizar(sku);
    return estado.productos.find(function (p) { return U.normalizar(p.sku) === n; }) || null;
  }
  function indicaciones(soloActivas) {
    return estado.indicaciones.filter(function (i) { return !soloActivas || i.activa; });
  }
  function indicacion(id) { return estado.indicaciones.find(function (i) { return i.id === id; }) || null; }
  function preguntas(soloActivas) {
    return estado.preguntas.filter(function (q) { return !soloActivas || q.activa; });
  }
  function preguntasPrecaucion(soloActivas) {
    return preguntas(soloActivas).filter(function (q) { return q.tipo === 'precaucion'; });
  }
  function preguntaPorEtiqueta(et) { return estado.preguntas.find(function (q) { return q.etiqueta === et; }) || null; }
  function relaciones() { return estado.relaciones; }

  function relacionesDe(id) {
    return estado.relaciones
      .filter(function (r) { return r.a === id || r.b === id; })
      .map(function (r) { return { relacion: r, otro: producto(r.a === id ? r.b : r.a) }; })
      .filter(function (x) { return x.otro; });
  }

  function relacionEntre(a, b) {
    return estado.relaciones.find(function (r) { return (r.a === a && r.b === b) || (r.a === b && r.b === a); }) || null;
  }

  function situacion(p) {
    var dias = U.diasHasta(p.caducidad);
    var caducado = dias !== null && dias < 0;
    var agotado = !(p.existencias > 0);
    return {
      dias: dias,
      caducado: caducado,
      porCaducar: dias !== null && dias >= 0 && dias <= CONFIG.diasAvisoCaducidad,
      agotado: agotado,
      bajoMinimo: !agotado && p.existencias < (p.minimo || 0),
      disponible: !agotado && !caducado
    };
  }

  function nombreIndicacion(id) {
    var i = indicacion(id);
    return i ? i.nombre : id;
  }

  function motivoPrecaucion(et) {
    var q = preguntaPorEtiqueta(et);
    return q ? q.motivo : et.replace(/_/g, ' ');
  }

  /* ---------- Productos ---------- */
  var CAMPOS_TEXTO = ['sku', 'nombre', 'activos', 'concentracion', 'forma', 'laboratorio', 'lote', 'caducidad'];

  function limpiarProducto(datos) {
    var p = {};
    CAMPOS_TEXTO.forEach(function (c) { p[c] = String(datos[c] == null ? '' : datos[c]).trim(); });
    p.tipo = datos.tipo === 'generico' ? 'generico' : 'marca';
    p.indicaciones = (datos.indicaciones || []).slice();
    p.precauciones = (datos.precauciones || []).slice();
    p.receta = !!datos.receta;
    p.existencias = Math.max(0, Math.round(Number(datos.existencias) || 0));
    p.minimo = Math.max(0, Math.round(Number(datos.minimo) || 0));
    p.precio = Math.max(0, Math.round((Number(datos.precio) || 0) * 100) / 100);
    return p;
  }

  function validarProducto(p, idActual) {
    var errores = [];
    if (!p.sku) errores.push('El SKU es obligatorio.');
    if (!p.nombre) errores.push('El nombre comercial es obligatorio.');
    if (!p.activos) errores.push('Indique al menos un principio activo.');
    var otro = p.sku && productoPorSku(p.sku);
    if (otro && otro.id !== idActual) errores.push('El SKU ' + p.sku + ' ya está asignado a «' + otro.nombre + '».');
    if (p.caducidad && !U.parseIso(p.caducidad)) errores.push('La fecha de caducidad no es válida.');
    return errores;
  }

  function guardarProducto(datos, id) {
    var p = limpiarProducto(datos);
    var errores = validarProducto(p, id);
    if (errores.length) return { ok: false, errores: errores };
    if (id) {
      var actual = producto(id);
      Object.assign(actual, p);
      guardar();
      return { ok: true, producto: actual };
    }
    p.id = U.uid('p');
    estado.productos.push(p);
    guardar();
    return { ok: true, producto: p };
  }

  function eliminarProducto(id) {
    estado.productos = estado.productos.filter(function (p) { return p.id !== id; });
    estado.relaciones = estado.relaciones.filter(function (r) { return r.a !== id && r.b !== id; });
    guardar();
  }

  // Importación masiva: un solo guardado al final.
  function importarProductos(filas) {
    var agregados = 0, actualizados = 0;
    filas.forEach(function (f) {
      if (f.idExistente) {
        var actual = producto(f.idExistente);
        if (!actual) return;
        Object.keys(f.datos).forEach(function (k) { actual[k] = f.datos[k]; });
        actualizados++;
      } else {
        var nuevo = limpiarProducto(f.datos);
        nuevo.id = U.uid('p');
        estado.productos.push(nuevo);
        agregados++;
      }
    });
    guardar();
    return { agregados: agregados, actualizados: actualizados };
  }

  /* ---------- Relaciones ---------- */
  function agregarRelacion(a, b, tipo, nota) {
    if (!a || !b) return { ok: false, error: 'Seleccione los dos productos.' };
    if (a === b) return { ok: false, error: 'Un producto no puede relacionarse consigo mismo.' };
    if (!TIPOS_RELACION[tipo]) return { ok: false, error: 'Seleccione un tipo de relación.' };
    if (!producto(a) || !producto(b)) return { ok: false, error: 'Alguno de los productos no existe.' };
    var existente = relacionEntre(a, b);
    if (existente) return { ok: false, error: 'Ya existe una relación entre estos productos (' + TIPOS_RELACION[existente.tipo].nombre + ').' };
    var r = { id: U.uid('r'), a: a, b: b, tipo: tipo, nota: String(nota || '').trim() };
    estado.relaciones.push(r);
    guardar();
    return { ok: true, relacion: r };
  }

  function actualizarRelacion(id, cambios) {
    var r = estado.relaciones.find(function (x) { return x.id === id; });
    if (!r) return;
    if (cambios.tipo && TIPOS_RELACION[cambios.tipo]) r.tipo = cambios.tipo;
    if ('nota' in cambios) r.nota = String(cambios.nota || '').trim();
    guardar();
  }

  function eliminarRelacion(id) {
    estado.relaciones = estado.relaciones.filter(function (r) { return r.id !== id; });
    guardar();
  }

  /* ---------- Catálogos ---------- */
  function agregarIndicacion(nombre) {
    nombre = String(nombre || '').trim();
    if (!nombre) return { ok: false, error: 'Escriba el nombre de la indicación.' };
    var n = U.normalizar(nombre);
    if (estado.indicaciones.some(function (i) { return U.normalizar(i.nombre) === n; })) return { ok: false, error: 'Esa indicación ya existe.' };
    var id = U.slug(nombre) || U.uid('i');
    while (indicacion(id)) id += '_2';
    estado.indicaciones.push({ id: id, nombre: nombre, activa: true });
    guardar();
    return { ok: true };
  }

  function actualizarIndicacion(id, cambios) {
    var i = indicacion(id);
    if (!i) return { ok: false };
    if ('nombre' in cambios) {
      var nombre = String(cambios.nombre || '').trim();
      if (!nombre) return { ok: false, error: 'El nombre no puede quedar vacío.' };
      var n = U.normalizar(nombre);
      if (estado.indicaciones.some(function (x) { return x.id !== id && U.normalizar(x.nombre) === n; })) return { ok: false, error: 'Ya existe otra indicación con ese nombre.' };
      i.nombre = nombre;
    }
    if ('activa' in cambios) i.activa = !!cambios.activa;
    guardar();
    return { ok: true };
  }

  function agregarPregunta(texto, motivo) {
    texto = String(texto || '').trim();
    motivo = String(motivo || '').trim();
    if (!texto) return { ok: false, error: 'Escriba la pregunta.' };
    if (!motivo) return { ok: false, error: 'Escriba el motivo que se mostrará en las alertas.' };
    var etiqueta = U.slug(motivo).slice(0, 40) || U.uid('q');
    while (preguntaPorEtiqueta(etiqueta)) etiqueta += '_2';
    estado.preguntas.splice(estado.preguntas.length - 1, 0, { id: etiqueta, etiqueta: etiqueta, texto: texto, motivo: motivo, tipo: 'precaucion', activa: true });
    // Mantiene la pregunta de receta al final.
    estado.preguntas.sort(function (a, b) { return (a.tipo === 'receta') - (b.tipo === 'receta'); });
    guardar();
    return { ok: true, etiqueta: etiqueta };
  }

  function actualizarPregunta(id, cambios) {
    var q = estado.preguntas.find(function (x) { return x.id === id; });
    if (!q) return { ok: false };
    if ('texto' in cambios) {
      var t = String(cambios.texto || '').trim();
      if (!t) return { ok: false, error: 'La pregunta no puede quedar vacía.' };
      q.texto = t;
    }
    if ('motivo' in cambios) {
      var m = String(cambios.motivo || '').trim();
      if (!m) return { ok: false, error: 'El motivo no puede quedar vacío.' };
      q.motivo = m;
    }
    if ('activa' in cambios) {
      if (q.tipo === 'receta' && !cambios.activa) return { ok: false, error: 'La pregunta de receta no puede desactivarse.' };
      q.activa = !!cambios.activa;
    }
    guardar();
    return { ok: true };
  }

  /* ---------- Alternativas para el mostrador ---------- */
  /*
   * Devuelve las alternativas de un producto según la checklist.
   * indicacionesMarcadas: arreglo de ids. respuestas: { etiqueta: true|false }.
   */
  function alternativas(idProducto, indicacionesMarcadas, respuestas) {
    var marcadas = {};
    (indicacionesMarcadas || []).forEach(function (i) { marcadas[i] = true; });
    var preguntasActivas = preguntasPrecaucion(true);
    var tieneReceta = respuestas && respuestas.receta === true;

    var todas = relacionesDe(idProducto).map(function (x) {
      var p = x.otro;
      var sit = situacion(p);
      var advertencias = [];
      preguntasActivas.forEach(function (q) {
        if (respuestas && respuestas[q.etiqueta] === true && p.precauciones.indexOf(q.etiqueta) >= 0) advertencias.push(q.motivo);
      });
      return {
        producto: p,
        relacion: x.relacion,
        tipo: TIPOS_RELACION[x.relacion.tipo],
        situacion: sit,
        coincide: p.indicaciones.some(function (i) { return marcadas[i]; }),
        advertencias: advertencias,
        faltaReceta: p.receta && !tieneReceta
      };
    });

    function ordenar(a, b) {
      return a.tipo.orden - b.tipo.orden || a.producto.precio - b.producto.precio || a.producto.nombre.localeCompare(b.producto.nombre, 'es');
    }
    var coinciden = todas.filter(function (x) { return x.coincide; });
    return {
      disponibles: coinciden.filter(function (x) { return x.situacion.disponible; }).sort(ordenar),
      sinExistencia: coinciden.filter(function (x) { return !x.situacion.disponible; }).sort(ordenar),
      noCoinciden: todas.filter(function (x) { return !x.coincide; }).sort(ordenar)
    };
  }

  function exportar() { return JSON.parse(JSON.stringify(estado)); }

  return {
    TIPOS_RELACION: TIPOS_RELACION,
    cargar: cargar, alCambiar: alCambiar, restablecer: restablecer, reemplazar: reemplazar, validarEstado: validarEstado,
    exportar: exportar, guardadoDisponible: function () { return guardadoDisponible; },
    productos: productos, producto: producto, productoPorSku: productoPorSku, situacion: situacion,
    indicaciones: indicaciones, indicacion: indicacion, nombreIndicacion: nombreIndicacion,
    preguntas: preguntas, preguntasPrecaucion: preguntasPrecaucion, preguntaPorEtiqueta: preguntaPorEtiqueta, motivoPrecaucion: motivoPrecaucion,
    relaciones: relaciones, relacionesDe: relacionesDe, relacionEntre: relacionEntre,
    limpiarProducto: limpiarProducto, guardarProducto: guardarProducto, eliminarProducto: eliminarProducto, importarProductos: importarProductos,
    agregarRelacion: agregarRelacion, actualizarRelacion: actualizarRelacion, eliminarRelacion: eliminarRelacion,
    agregarIndicacion: agregarIndicacion, actualizarIndicacion: actualizarIndicacion,
    agregarPregunta: agregarPregunta, actualizarPregunta: actualizarPregunta,
    alternativas: alternativas
  };
})();
