/* Arranque de la aplicación y cambio entre vistas. */
var App = (function () {
  var vista = 'mostrador';

  function iniciar() {
    document.title = CONFIG.nombreFarmacia + ' · Inventario y alternativas';
    document.querySelectorAll('[data-nombre-farmacia]').forEach(function (el) { el.textContent = CONFIG.nombreFarmacia; });
    document.getElementById('version-app').textContent = 'v' + CONFIG.version;

    Almacen.cargar();
    Mostrador.iniciar(document.getElementById('vista-mostrador'));
    Admin.iniciar(document.getElementById('vista-admin'));

    try { var g = localStorage.getItem(CONFIG.claveAlmacen + '.vista'); if (g === 'admin' || g === 'mostrador') vista = g; } catch (e) { /* sin preferencia */ }

    document.querySelectorAll('.selector-vista [data-vista]').forEach(function (b) {
      b.addEventListener('click', function () { if (vista !== b.getAttribute('data-vista')) mostrarVista(b.getAttribute('data-vista')); });
    });
    document.getElementById('boton-acerca').addEventListener('click', acercaDe);

    Almacen.alCambiar(refrescar);
    mostrarVista(vista, true);
    actualizarInsignia();

    if (!Almacen.guardadoDisponible()) {
      U.aviso('Este navegador no permite guardar datos locales; los cambios se perderán al cerrar.', 'error');
    }
  }

  function mostrarVista(v, inicial) {
    vista = v;
    try { localStorage.setItem(CONFIG.claveAlmacen + '.vista', v); } catch (e) { /* opcional */ }
    document.getElementById('vista-mostrador').hidden = v !== 'mostrador';
    document.getElementById('vista-admin').hidden = v !== 'admin';
    document.querySelectorAll('.selector-vista [data-vista]').forEach(function (b) {
      var activo = b.getAttribute('data-vista') === v;
      b.classList.toggle('activo', activo);
      b.setAttribute('aria-pressed', String(activo));
    });
    document.body.setAttribute('data-vista-actual', v);
    if (v === 'mostrador') { Mostrador.refrescar(); if (!inicial || window.innerWidth > 700) Mostrador.enfocar(); }
    else Admin.refrescar();
  }

  // Vuelve a pintar tras cualquier cambio, conservando el foco del campo activo.
  function refrescar() {
    var activo = document.activeElement;
    var idFoco = activo && activo.id && !activo.closest('.modal-capa') ? activo.id : null;
    var seleccion = null;
    try { if (idFoco && typeof activo.selectionStart === 'number') seleccion = [activo.selectionStart, activo.selectionEnd]; } catch (e) { /* tipo sin selección */ }
    if (vista === 'admin') Admin.refrescar(); else Mostrador.refrescar();
    Admin.refrescarFichas();
    actualizarInsignia();
    if (idFoco) {
      var el = document.getElementById(idFoco);
      if (el && el !== document.activeElement) {
        el.focus();
        if (seleccion) { try { el.setSelectionRange(seleccion[0], seleccion[1]); } catch (e) { /* sin selección */ } }
      }
    }
  }

  function actualizarInsignia() {
    var n = Admin.contarAlertas();
    var ins = document.getElementById('insignia-alertas');
    ins.textContent = n;
    ins.hidden = !n;
    ins.title = n + ' productos con alertas';
  }

  function acercaDe() {
    U.abrirModal({
      titulo: 'Acerca de',
      clase: 'modal-mediano',
      contenido:
        '<div class="acerca">' +
          '<p><strong>' + U.esc(CONFIG.nombreFarmacia) + '</strong> · Inventario y alternativas · versión ' + U.esc(CONFIG.version) + '</p>' +
          '<div class="nota-prototipo">' +
            '<h3>Prototipo con información de ejemplo</h3>' +
            '<p>Esta aplicación es un prototipo. Los productos, precios, existencias, lotes, fechas de caducidad y relaciones entre medicamentos que contiene son <strong>de ejemplo, con fines ilustrativos</strong>, y no constituyen información clínica ni comercial vigente.</p>' +
            '<p>Las alternativas que sugiere la checklist son orientativas. <strong>Cualquier sustitución de un medicamento debe validarla un profesional farmacéutico</strong>, y en su caso el médico tratante, considerando las condiciones particulares de cada paciente.</p>' +
          '</div>' +
          '<h3>Cómo se guardan los datos</h3>' +
          '<p>Toda la información se almacena en este navegador (almacenamiento local). No se envía a ningún servidor. Use <em>Administración › Respaldo</em> para exportar una copia.</p>' +
          '<h3>Componentes</h3>' +
          '<p class="chico">Lectura y escritura de Excel con SheetJS Community Edition (licencia Apache 2.0), incluido localmente.</p>' +
        '</div>',
      pie: '<button type="button" class="boton boton-primario" data-cerrar-modal>Cerrar</button>'
    });
  }

  return { iniciar: iniciar, mostrarVista: mostrarVista };
})();

document.addEventListener('DOMContentLoaded', App.iniciar);
