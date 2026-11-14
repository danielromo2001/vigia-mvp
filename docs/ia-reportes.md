# Triaje asistido por IA en VIGÍA

## 1. Qué hace

Cuando una persona reporta una falla, VIGÍA analiza el relato y propone:

- **Categoría:** hardware, software, red y conectividad, eléctrico, consumibles,
  infraestructura u otro.
- **Prioridad:** alta, media o baja.
- **Tipo de orden:** preventiva o correctiva.
- **Fecha límite sugerida:** 1, 3 o 7 días según la prioridad.
- **Explicación:** términos detectados, comparación de categorías y motivos.

La sugerencia **no crea nada por sí sola**. El reporte queda en estado
`pendiente` hasta que un técnico o administrador la acepta, la ajusta o la
descarta. Solo después de una decisión humana se puede convertir en una orden de
trabajo.

## 2. Flujo funcional

1. **Personal clínico, técnico o administrador** entra a *Reportes de falla* y
   registra el equipo, el impacto y la descripción.
2. Al guardar, el servidor ejecuta el clasificador y persiste la sugerencia.
3. *Ingeniería biomédica* abre el reporte y decide:
   - **Aceptar:** se usan la categoría y la prioridad sugeridas.
   - **Ajustar:** se corrigen categoría y/o prioridad y se deja una nota.
   - **Descartar:** no corresponde a una falla real o ya fue atendida.
4. Si se aceptó o ajustó, se puede **crear la orden de trabajo** con un clic. La
   orden conserva la trazabilidad (`aiAssisted`, `aiConfidence`) y queda
   vinculada al reporte original.
5. El reporte convertido aparece en la hoja de vida del equipo a través de su
   orden.

## 3. Cómo clasifica (`vigia-triage-v1`)

El motor es determinista y explicable. Combina tres señales:

| Señal | Uso |
| --- | --- |
| Léxico ponderado en español | Palabras y frases como «no enciende», «wifi», «olor a quemado», «set de infusión». Se normalizan tildes, mayúsculas y signos. |
| Prior del activo | El nombre, la marca y el modelo del equipo inclinan la categoría (monitor → hardware, servidor → red, aire acondicionado → infraestructura). |
| Contexto y urgencia | Impacto declarado, criticidad del equipo, estado fuera de servicio y términos de riesgo (UCI, paciente, fuga, incendio, paro). |

### Categoría

Se suman los pesos del léxico y los priors del equipo. La categoría con mayor
puntaje gana. La confianza combina:

- la proporción del puntaje ganador sobre el total, y
- la ventaja sobre la segunda categoría.

Si no hay ninguna coincidencia, la categoría es `otro` y la confianza es baja.

### Prioridad

```
puntaje = base(impacto) + bonus(criticidad) + bonus(estado) + urgencia(relato)
```

| Componente | Valores |
| --- | --- |
| Impacto | crítico 50 · alto 34 · medio 18 · bajo 5 |
| Criticidad | alta 18 · media 8 · baja 0 |
| Estado | fuera de servicio 10 · en mantenimiento 4 |
| Urgencia | hasta 30 puntos por términos de riesgo |

Cortes: **alta ≥ 65**, **media ≥ 32**, **baja < 32**.

### Tipo de orden

Si el relato contiene señales de actividad programada («mantenimiento
preventivo», «calibración», «revisión programada») y ninguna señal de falla, se
propone una orden **preventiva**. En caso contrario, **correctiva**.

## 4. Modelo de datos

`FailureReport` guarda dos bloques separados:

- **Sugerencia original:** `aiCategory`, `aiPriority`, `aiConfidence`,
  `aiScores`, `aiKeywords`, `aiReasons`, `aiSuggestedType`,
  `aiSuggestedDueDate`, `aiModel`, `aiSource`.
- **Decisión humana:** `status`, `decision`, `finalCategory`, `finalPriority`,
  `reviewNotes`, `reviewedById`, `reviewedAt`, `workOrderId`.

La sugerencia nunca se sobrescribe. Eso permite auditar aciertos, ajustes y
descarte, y calcular la tasa de aceptación.

## 5. Enriquecimiento opcional con un LLM

Por defecto **no se usa ningún servicio externo**. Si un administrador configura:

```env
AI_LLM_API_KEY="..."
AI_LLM_BASE_URL="https://api.openai.com/v1"
AI_LLM_MODEL="gpt-4o-mini"
```

el clasificador local se contrasta con un modelo de lenguaje compatible con la
API de chat completions. Reglas de seguridad:

- Timeout de 4,5 segundos.
- Si el proveedor falla o devuelve valores fuera del catálogo, se usa la
  sugerencia local sin interrumpir el registro.
- El modelo solo puede devolver categorías y prioridades válidas.
- La respuesta se normaliza y se marca como `source = "llm"`.

> **Privacidad:** al activar el LLM, la descripción del reporte se envía al
> proveedor. Las descripciones deben hablar del equipo y del servicio, nunca de
> datos identificables del paciente (nombre, documento, historia clínica).

## 6. Indicadores

- **MTTR:** promedio de horas de las órdenes correctivas cerradas.
- **MTBF:** promedio de días entre fallas correctivas por equipo, calculado a
  partir de la hoja de vida.
- **Tasa de aceptación de la IA:** aceptadas / (aceptadas + ajustadas). Mide
  cuánto confía el equipo técnico en la sugerencia sin corregirla.
- **Confianza promedio:** media de `aiConfidence` de los reportes registrados.

Todos se muestran en *Reportes* y en la lista de *Reportes de falla*.

## 7. Pruebas

```bash
npm test
```

`tests/triage.test.ts` cubre categorías, prioridad, tipo de orden, relatos
ambiguos, determinismo y fechas sugeridas. `tests/metrics.test.ts` cubre MTTR,
MTBF y tasa de aceptación.

## 8. Límites conocidos

- El léxico es finito: un relato muy técnico o con errores graves de escritura
  puede quedar en `otro` y debe revisarse manualmente.
- No reemplaza el criterio clínico ni biomédico.
- No procesa imágenes, audio ni integraciones con el HIS.
- La calidad mejora con un conjunto de reportes reales etiquetados; hoy el seed
  incluye seis casos de demostración.
