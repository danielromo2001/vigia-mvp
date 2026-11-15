# Adaptación UX/UI a los mockups "Mockups UPED"

Este documento resume cómo se alineó la interfaz de VIGÍA con el prototipo de Figma
[Mockups UPED](https://www.figma.com/design/BcwZ9JMMDXLpcyhn6JuWOn/Mockups-UPED) y qué
funcionalidad nueva se incorporó a partir de él.

El nombre del producto se mantiene como **VIGÍA**; del prototipo se adoptaron la
estructura de navegación, el lenguaje visual (azul marino, acento teal, tarjetas y
píldoras de estado) y los módulos que faltaban en el MVP.

## Estructura de navegación

| Sección | Rutas | Pantalla del prototipo |
| --- | --- | --- |
| Operación | `/panel` | Dashboard |
| Operación | `/equipos` | Activos / equipos |
| Operación | `/ordenes` | Órdenes de trabajo |
| Operación | `/preventivos` | Mantenimientos |
| Operación | `/repuestos` | Repuestos |
| Operación | `/proveedores` | Proveedores |
| Análisis | `/reportes-falla`, `/reportes` | Reportes |
| Administración | `/usuarios` | Usuarios y roles |

La barra lateral se agrupó en **Operación / Análisis / Administración**, con contadores
de alertas, estado operativo y tarjeta de turno. El encabezado incorpora búsqueda global,
píldora de estado y fecha.

## Cambios por pantalla

### Inicio de sesión

- Selector visual de perfiles de demostración (técnico, administrador, gerencia y
  personal clínico) que rellena las credenciales al hacer clic.
- Se mantiene el acceso por correo y contraseña con sesión firmada.

### Panel (`/panel`)

- Hero con saludo por turno, estado operativo y accesos rápidos.
- Tres franjas de estado: operación estable, atención prioritaria y crítico.
- KPIs: MTTR, MTBF, cumplimiento preventivo y órdenes pendientes.
- Gráfico de barras de mantenimientos de las últimas 6 semanas (preventivo vs.
  correctivo).
- Activos críticos, carga del equipo, próximos mantenimientos (72 h), alertas
  priorizadas, reportes de falla por triar, inventario crítico y actividad reciente.

### Activos (`/equipos`)

- Registro rápido en modal (solo datos esenciales) y registro completo.
- Escaneo simulado de QR: se ingresa o pega el código del activo y se abre su hoja de
  vida. La cámara real queda fuera del alcance del MVP.
- Ficha QR generada en el servidor con `qrcode` y descargable como PNG desde la hoja de
  vida del equipo.

### Órdenes (`/ordenes`)

- Banda de SLA con órdenes vencidas y próximo vencimiento.
- Filtro por prioridad además de estado, tipo, equipo y texto.
- Cuenta regresiva por orden en la tabla de detalle.

### Mantenimientos (`/preventivos`)

- Alternancia lista/calendario sin perder filtros ni búsqueda.
- Calendario mensual con navegación anterior/siguiente, marcas de hoy y colores por
  vencimiento (al día, próximo, vencido, inactivo).

### Repuestos (`/repuestos`)

- Inventario con referencias, ubicación, stock vs. mínimo, nivel y estado.
- Valorización del inventario en COP y filtros por categoría y estado.
- Movimientos de entrada, salida, ajuste y solicitud con orden de trabajo asociada.
- Reposición prioritaria y botón para generar solicitudes de las referencias bajo mínimo.

### Proveedores (`/proveedores`)

- Directorio con especialidad, contacto, desempeño y estado.
- Contratos con vigencia, valor, SLA y próxima revisión.
- Indicadores de contratos vigentes, valor contratado y desempeño promedio.

### Búsqueda global (`/buscar`)

- Modal `Ctrl+K` con accesos a módulos y búsqueda unificada.
- Resultados agrupados de activos, órdenes, reportes de falla, repuestos y proveedores.

## Modelo de datos añadido

Se agregaron a `prisma/schema.prisma`:

- `SparePart` y `PartMovement` (inventario y trazabilidad).
- `Supplier` y `SupplierContract` (directorio y contratos).

El seed incluye 4 proveedores, 3 contratos, 10 repuestos y 5 movimientos de ejemplo.

## Utilidades nuevas

- `src/lib/operation-status.ts`: estado operativo derivado de equipos críticos,
  preventivos vencidos, órdenes vencidas, reportes pendientes y stock bajo.
- `src/lib/labels.ts`: `stockLevel()`, `orderSla()`, `formatDuration()`, `formatCop()` y
  `formatCompactCop()`.
- Pruebas unitarias en `tests/inventory.test.ts` para niveles de stock, SLA y estado
  operativo.

## Fuera de alcance

- Carga real de archivos o evidencias fotográficas.
- Lectura de QR con cámara del dispositivo (el escaneo es una búsqueda simulada).
- Integración con pasarelas de pago o facturación electrónica.
