# VIGÍA

Aplicación web para gestionar el mantenimiento de equipos biomédicos: centraliza el inventario, las órdenes de trabajo, los planes preventivos y el historial de intervenciones.

> **Estado:** MVP académico. No está certificado ni debe utilizarse para operar o tomar decisiones clínicas. Los datos incluidos son de demostración; no cargues información real de pacientes ni credenciales de producción.

## Capturas

| Panel de control | Reportes |
| --- | --- |
| ![Panel de control de VIGÍA](docs/captura-panel.jpg) | ![Reportes de VIGÍA](docs/captura-reportes.jpg) |

## Funcionalidades

- **Equipos:** registro y consulta de equipos biomédicos, con estado, criticidad, ubicación e historial de mantenimiento. Incluye registro rápido, búsqueda por código/serie y ficha QR descargable para etiquetar el activo físicamente.
- **Órdenes de trabajo:** creación, asignación, seguimiento y cierre de órdenes preventivas y correctivas, con filtro por prioridad y cuenta regresiva del SLA comprometido.
- **Mantenimiento preventivo:** programación por equipo según frecuencia, consulta de próximos vencimientos y vista de calendario mensual con navegación entre meses.
- **Repuestos:** inventario del almacén biomédico con mínimos, nivel de stock, valorización en COP, movimientos de entrada/salida/ajuste y solicitud de reposición de las referencias bajo mínimo.
- **Proveedores:** directorio con especialidad, contacto, desempeño, contratos vigentes, valor contratado, SLA y próximas revisiones.
- **Reportes de falla con triaje asistido por IA:** el personal clínico reporta una falla y el sistema sugiere categoría, prioridad, tipo de orden y fecha de atención. Ingeniería biomédica acepta, ajusta o descarta la sugerencia antes de convertirla en orden. ([Detalle técnico](docs/ia-reportes.md))
- **Búsqueda global:** acceso con `Ctrl+K` para encontrar activos, órdenes, reportes, repuestos y proveedores desde cualquier pantalla.
- **Usuarios y roles:** administración de cuentas para técnicos biomédicos, administradores, gerencia y personal clínico.
- **Panel e informes:** indicadores MTTR y MTBF, cumplimiento preventivo, estado operativo, carga del equipo, alertas priorizadas y exportación de órdenes y reportes a CSV.

## Tecnologías

- [Next.js](https://nextjs.org/) 16 y React 19
- TypeScript y Tailwind CSS 4
- Prisma ORM 6 y SQLite
- Autenticación con sesiones y contraseñas con hash mediante bcrypt
- Vitest para pruebas unitarias del clasificador y de los indicadores
- Clasificador local determinista `vigia-triage-v1`, con enriquecimiento opcional mediante un LLM compatible con la API de OpenAI

## Requisitos

- Node.js 20.9 o posterior
- npm

## Instalación y ejecución local

1. Clona el repositorio e instala las dependencias:

   ```bash
   git clone https://github.com/danielromo2001/vigia-mvp.git
   cd vigia-mvp
   npm install
   ```

2. Crea el archivo local de variables de entorno:

   ```bash
   cp .env.example .env
   ```

   En Windows PowerShell, usa `Copy-Item .env.example .env`.

   `.env.example` configura SQLite local con `DATABASE_URL="file:./dev.db"`. Cambia `SESSION_SECRET` por un valor aleatorio antes de iniciar la aplicación. Por ejemplo:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. Crea la base de datos y carga los datos de demostración:

   ```bash
   npm run setup
   ```

4. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   Abre [http://localhost:3000](http://localhost:3000).

### Cuentas de demostración

El seed crea estas cuentas locales; todas usan la contraseña `Vigia2026*`:

| Rol | Correo |
| --- | --- |
| Técnico biomédico | `tecnico@vigia.co` |
| Administrador | `admin@vigia.co` |
| Gerencia | `gerencia@vigia.co` |
| Personal clínico | `clinico@vigia.co` |

Estas credenciales son únicamente para desarrollo local. **No las uses ni las publiques en una instancia accesible desde internet.**

## Comandos disponibles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia Next.js en modo desarrollo. |
| `npm run build` | Genera la compilación de producción. |
| `npm run start` | Sirve la compilación de producción. |
| `npm run lint` | Ejecuta ESLint. |
| `npm test` | Ejecuta las pruebas unitarias con Vitest. |
| `npm run setup` | Sincroniza el esquema y carga los datos de demostración. **El seed borra los datos existentes.** |
| `npm run db:push` | Sincroniza el esquema con la base de datos configurada. |
| `npm run db:seed` | Borra los datos existentes y vuelve a cargar la demostración. |
| `npm run db:studio` | Abre Prisma Studio. |
| `npm run db:reset` | **Destructivo:** elimina los datos y vuelve a cargar la demostración. |

## Estructura del proyecto

```text
src/
  app/          Rutas, páginas, acciones y API
  components/   Componentes de interfaz y formularios
  lib/          Autenticación, Prisma y utilidades
prisma/
  schema.prisma Modelo de datos
  seed.ts       Datos de demostración
docs/           Requerimientos, diagramas y capturas
```

Consulta el [plan del MVP](docs/mvp-plan.md), los [requerimientos](docs/requerimientos.txt), el [diagrama de arquitectura C4](docs/Diagramas_C4_Mantenimiento_Hospitalario.drawio), la [adaptación UX/UI a los mockups UPED](docs/ux-uped.md), el [detalle del triaje IA](docs/ia-reportes.md) y las [recomendaciones de IA](docs/ia-recomendaciones.md) para más contexto del proyecto.

## Seguridad y datos

- No subas `.env`, bases de datos locales ni secretos al repositorio.
- Configura un `SESSION_SECRET` único y seguro para cada entorno.
- El seed contiene datos y credenciales de demostración; no es una configuración de producción. Tanto `npm run setup` como `npm run db:seed` borran los datos actuales al ejecutar el seed.
- Revisa y reemplaza la configuración de SQLite antes de desplegar en un entorno compartido.
- El triaje de IA funciona **localmente** por defecto. Solo se envía información a un proveedor externo si se configura `AI_LLM_API_KEY`; en ese caso las descripciones no deben contener datos identificables del paciente. Ver [docs/ia-reportes.md](docs/ia-reportes.md).
