# Plan de MVP — Aplicativo de gestión del mantenimiento hospitalario

**Proyecto:** Aplicativo de gestión del mantenimiento hospitalario para la Unidad Pediátrica Simón Bolívar IPS S.A.S. (Valledupar).
**Metodología:** XP. **Equipo:** Emanuel Campo y Daniel Rodríguez. **Cliente:** Roberto Fernández.
**Insumos:** conversación con Claude, documento de requerimientos (10 HU, 12 RF, 7 RNF, 20 casos de uso) y diagramas C4.

## 1. Alcance del MVP

El documento de XP define el MVP como lo entregado al final de las iteraciones 1 y 2: **20 de 39 puntos**.

| Historia | Módulo | Puntos | Incluida |
|---|---|---:|---|
| HU-08 Administrar usuarios y roles | Administración | 5 | Sí |
| HU-01 Registrar equipo biomédico | Activos | 3 | Sí |
| HU-02 Consultar hoja de vida | Activos | 2 | Sí |
| HU-03 Crear y gestionar orden de trabajo | Mantenimiento | 5 | Sí |
| HU-04 Programar mantenimiento preventivo | Mantenimiento | 5 | Sí |
| HU-05 Alertas de mantenimiento | Notificaciones | 3 | Recomendado: alerta en la app (sin correo) |
| HU-06 Inventario de repuestos | Inventario | 3 | Fuera del MVP |
| HU-07 Proveedores | Inventario | 2 | Fuera del MVP |
| HU-09 Reportes e indicadores | Reportes | 8 | Recomendado: dashboard básico (sin PDF) |
| HU-10 Exportar reporte de auditoría | Reportes | 3 | Fuera del MVP |

**Fuera del MVP:** integración con HIS, LDAP/AD, SMTP, WhatsApp Business, IoT, mantenimiento predictivo y exportación PDF completa.

## 2. Flujo demostrable

1. El técnico inicia sesión.
2. Registra un equipo biomédico con sus datos y hoja de vida.
3. Programa su mantenimiento preventivo (frecuencia y próxima fecha).
4. Crea una orden de trabajo correctiva o preventiva y la asigna.
5. Actualiza y cierra la orden; la intervención queda en la hoja de vida.
6. El personal clínico reporta una falla; la IA sugiere categoría y prioridad.
7. Ingeniería biomédica acepta, ajusta o descarta la sugerencia y, si aplica,
   convierte el reporte en una orden de trabajo.
8. El administrador gestiona usuarios y roles.
9. Gerencia consulta el dashboard: equipos, órdenes abiertas, preventivos
   próximos, MTTR, MTBF, cumplimiento y desempeño del triaje IA.

## 3. Roles

- **Técnico / ingeniero biomédico:** activos, hoja de vida, órdenes, planes
  preventivos y revisión del triaje IA.
- **Administrador (Oficina de TICs):** usuarios, roles, catálogos y revisión del
  triaje IA.
- **Gerencia:** consulta de dashboard y reportes.
- **Personal clínico:** reporta fallas de equipos (CU-05) sin acceso a la gestión
  de órdenes ni a la configuración del sistema.

## 4. Modelo de datos mínimo

- `usuarios` (id, nombre, email, password_hash, rol_id, activo)
- `roles` (id, nombre, descripción)
- `equipos` (id, nombre, marca, modelo, serie única, ubicación, fecha_adquisición, estado, criticidad)
- `hoja_vida` (id, equipo_id, fecha, tipo_evento, descripción, orden_id)
- `ordenes_trabajo` (id, equipo_id, tipo, responsable_id, fecha_apertura, fecha_estimada, fecha_cierre, observaciones, estado)
- `planes_preventivos` (id, equipo_id, frecuencia_días, última_fecha, próxima_fecha)
- `reportes_falla` (id, código, equipo_id, reportante_id, descripción, impacto,
  estado, sugerencia IA —categoría, prioridad, confianza, explicación—, decisión
  humana, categoría y prioridad finales, revisor_id, orden_id)
- `alertas` (id, equipo_id, tipo, fecha_programada, destinatario_id, estado) — opcional para el MVP
- `auditoria` (id, usuario_id, acción, entidad, entidad_id, fecha) — recomendado para trazabilidad

## 5. Stack recomendado

**Opción A (recomendada):** Next.js 15 + TypeScript + Tailwind CSS + Prisma + SQLite en local / PostgreSQL en la nube. Auth con sesión y bcrypt. Tests con Vitest y Playwright. Despliegue en Vercel + Neon (capas gratuitas).

**Alternativas:** Spring Boot + React/Thymeleaf + PostgreSQL (si el equipo ya usa Java); Django + DRF + PostgreSQL (si usan Python); Laravel + Blade + MySQL (si usan PHP).

## 6. Roadmap de construcción

| Fase | Entregable | Estimación |
|---|---|---|
| 0. Decisiones y base | Repositorio, stack, modelo de datos, entorno local | 0,5 día |
| 1. Auth y layout | Login, roles, navegación, usuarios (HU-08) | 1–2 días |
| 2. Activos | CRUD de equipos y hoja de vida (HU-01, HU-02) | 1–2 días |
| 3. Mantenimiento | Órdenes y planes preventivos (HU-03, HU-04) | 2 días |
| 4. Dashboard y demo | Indicadores, alertas en app, datos semilla, pruebas | 1 día |
| 5. Sustentación | Guion de demo, README y evidencias | 0,5 día |

**Total estimado:** 6–8 días de trabajo efectivo.

## 7. Decisiones pendientes

1. Stack definitivo (o restricción del docente).
2. Fecha de entrega o sustentación.
3. ¿Solo local o desplegado en una URL?
4. ¿Ya existe código/repositorio o se parte de cero?
5. ¿El MVP debe incluir reportes PDF o basta el dashboard?

## 8. Ampliación implementada: triaje asistido por IA

Se agregó un módulo de **Reportes de falla** con un clasificador determinista y
explicable (`vigia-triage-v1`) que sugiere categoría, prioridad, tipo de orden y
fecha de atención a partir del relato, la criticidad del equipo y el impacto
declarado. La sugerencia se guarda junto con la decisión humana para conservar
trazabilidad. El módulo se integra con:

- el formulario de creación de órdenes (autocompleta categoría, prioridad y
  vencimiento);
- el panel operativo (reportes pendientes de triaje);
- los reportes de gestión (MTTR, MTBF, aceptación de la IA y confianza promedio);
- la exportación CSV de reportes de falla.

El enriquecimiento con un modelo de lenguaje externo es **opcional y está
desactivado por defecto**. Ver [ia-reportes.md](ia-reportes.md) y las
[recomendaciones de IA](ia-recomendaciones.md).
