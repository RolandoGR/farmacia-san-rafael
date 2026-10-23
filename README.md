# Farmacia San Rafael · Inventario y alternativas

Aplicación web local para administrar el inventario de una farmacia y, cuando un producto no está disponible, guiar al empleado de mostrador con una checklist para ofrecer alternativas.

## Cómo usarla

Abra `index.html` con doble clic. No necesita servidor, internet ni instalación. Funciona en Chrome, Edge y Firefox recientes, en computadora y en tableta.

Los datos se guardan en el almacenamiento local del navegador. En el primer arranque se cargan los datos iniciales (94 productos y 74 relaciones). Para llevar los datos a otro equipo use **Administración › Respaldo**.

## Vistas

- **Mostrador**: búsqueda por nombre comercial, principio activo o SKU (sin importar acentos ni errores menores). Si el producto está agotado o caducado se abre la checklist: indicación, preguntas de seguridad y alternativas ordenadas G → P → C → T y por precio.
- **Administración**: inventario (búsqueda, filtros, orden, alta, edición y baja), importación de CSV/Excel con plantilla, relaciones entre productos, checklist y catálogos, alertas (agotados, bajo mínimo, caducidad en 60 días) y respaldo JSON.

## Configuración

El nombre de la farmacia y otros parámetros están en `js/config.js`.

## Estructura

```
index.html
css/estilos.css
js/config.js            Nombre de la farmacia y parámetros
js/datos-iniciales.js   Productos, relaciones, indicaciones y checklist de origen
js/utilidades.js        Búsqueda tolerante, formatos, modales y avisos
js/almacen.js           Estado, persistencia y reglas de alternativas
js/mostrador.js         Vista Mostrador
js/admin.js             Vista Administración
js/app.js               Arranque y selector de vistas
vendor/xlsx.full.min.js SheetJS Community Edition 0.20.3 (Apache 2.0, ver vendor/LICENSE-sheetjs.txt)
```
