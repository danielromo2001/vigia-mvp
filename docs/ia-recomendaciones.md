# Recomendaciones de funcionalidades de IA para VIGÍA

Priorizadas por relación valor/esfuerzo para un MVP académico. Todas respetan
el principio actual: **la IA sugiere, una persona decide**.

## Corto plazo (1–2 semanas, alto valor)

### 1. Detección de reportes duplicados
Comparar el relato nuevo con reportes abiertos del mismo equipo usando similitud
de texto (TF-IDF o embeddings). Mostrar «posible duplicado de RP-2026-0004» antes
de registrar. Reduce ruido en el triaje y evita órdenes repetidas.

### 2. Casos históricos similares
Dado un reporte, buscar las órdenes cerradas más parecidas y mostrar qué se hizo,
cuánto tardó y qué repuesto se usó. Es recuperación de conocimiento, no
predicción: muy útil para técnicos nuevos. Se puede implementar con búsqueda
léxica (SQLite FTS) antes de invertir en embeddings.

### 3. Resumen automático del cierre
Al cerrar una orden, generar un resumen de una frase a partir de la descripción,
las observaciones y los repuestos. Ahorra tiempo y mejora la hoja de vida. El
técnico puede editarlo antes de guardar.

### 4. Priorización dinámica de la cola
Ordenar las órdenes abiertas combinando prioridad declarada, criticidad del
equipo, días vencidos, impacto asistencial y disponibilidad de repuestos. No es
un modelo complejo: una regla ponderada explicable ya aporta valor.

## Medio plazo (3–6 semanas)

### 5. Predicción de mantenimiento basada en MTBF
Con suficientes fallas por equipo, estimar la probabilidad de falla en los
próximos 30 días y sugerir adelantar el preventivo. Empezar con promedios
móviles y alertas por desviación; pasar a un modelo solo cuando haya datos.

### 6. Detección de anomalías en la hoja de vida
Marcar equipos con aumento anómalo de correctivos, reincidencia de la misma
falla o tiempos de reparación crecientes. Sirve para decidir reemplazo o
recalibración sin depender de revisar todos los registros.

### 7. Predicción de consumo de repuestos
Con el historial de consumibles y la frecuencia de uso, estimar cuándo se agotará
un insumo y generar una alerta de compra. Se conecta con el inventario de
repuestos (HU-06, fuera del MVP actual).

### 8. Asistente conversacional para el personal clínico
Un chat que responda «¿cómo reporto una falla?», «¿en qué estado está el monitor
de UCI?» o «¿cuándo es el próximo preventivo?» usando solo datos internos y
enlaces a las pantallas. Requiere control de acceso por rol y respuestas
citadas.

### 9. Búsqueda semántica de manuales y protocolos
Indexar manuales del fabricante y protocolos internos para responder dudas
técnicas con la fuente citada (RAG). Muy útil, pero exige curaduría documental y
cuidado con derechos de autor.

## Largo plazo / exploratorio

### 10. Transcripción de voz a reporte
El personal clínico dicta la falla y el sistema genera el texto del reporte. En
entornos ruidosos la precisión puede ser baja; conviene mantener edición manual y
no enviar audio a terceros sin consentimiento.

### 11. Análisis de imágenes del equipo
Clasificar fotos de pantallas de error, etiquetas o daños visibles. Alto costo,
requiere dataset etiquetado y validación biomédica. No recomendado para el MVP.

### 12. Predicción de riesgo de incumplimiento de SLA
Estimar qué órdenes tienen riesgo de vencer para redistribuir carga de trabajo.
Se puede construir primero con reglas y luego con un modelo supervisado.

## Recomendación inmediata

1. **Duplicados** y **casos históricos similares** son los de mejor relación
   costo/beneficio y reutilizan los datos que VIGÍA ya guarda.
2. **Resumen automático del cierre** mejora la calidad de la hoja de vida con
   muy poco esfuerzo.
3. Antes de agregar más modelos, construir un **conjunto de evaluación** con
   reportes reales etiquetados y medir precisión por categoría, tasa de ajuste y
   tiempo ahorrado. Sin esa métrica no se puede demostrar valor.

## Gobernanza y privacidad

- Mantener el modo local por defecto y el LLM externo como opción explícita.
- No enviar datos identificables del paciente a proveedores externos.
- Registrar la fuente (`heuristic` o `llm`) y la versión del modelo en cada
  sugerencia.
- Permitir que cualquier usuario vea por qué se sugirió una categoría.
- Definir un responsable de revisar periódicamente los ajustes y descartes para
  detectar sesgos o léxico desactualizado.
- No usar la IA para decidir sola el reemplazo de un equipo ni para priorizar
  riesgo clínico sin validación humana.
