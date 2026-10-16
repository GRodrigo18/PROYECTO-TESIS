# Tesis: Predicción temprana de riesgo académico con Random Forest

Proyecto de tesis. Modelo Random Forest que predice qué estudiantes terminarán el año
con al menos un curso en C, usando las notas tempranas. Cinco sedes, datos 2020-2026.
Responder siempre en español.

## Auditoría del 15-oct-2026 (estado previo del sitio)

El dashboard publicado en AI Studio (`prediccion-rf-rendimiento26.ai.studio`) **no ejecutaba
un Random Forest real**. Hallazgos verificados en el código publicado y en los 10 322 registros
de `/api/dataset` (ya corregidos en este repo; se dejan como referencia de lo que no debe volver):

1. **Predicción simulada.** Los "votos de 100 árboles" salen de
   `Math.sin((n+1)*997 + e*37)` comparado con umbrales fijos según la nota mínima
   (0.88 si es C; 0.10–0.38 si es B; 0.03 si es A/AD). No hay `fit` y 2020-2025 no se usa.
2. **Fuga de información.** Etiqueta = `min(5 notas) == C` y esas 5 notas son las variables.
   Una regla trivial acierta el 100%.
3. **Métricas alteradas.** Si FN = 0, el código fija FN = 8% de TP. Si FP = 0, fija FP = 7% de TP.
   En 2026 los valores reales eran FN 0 → mostrados 10. Las tarjetas del Paso 4 muestran
   `98.26%`, `100.00%`, `99.12%` como texto fijo. Hay métricas por defecto
   (0.9215 / 0.9142 / 0.9178 / 0.938) y un objeto de demo con otra matriz.
4. **Exclusión ficticia.** `total_excluidos: 424`, los motivos (268 / 114 / 42) y el reparto
   por sede (112 / 104 / 78 / 69 / 61) son constantes en el código.
5. **Limpieza incorrecta.**
   - Vacío, "-" o token inválido se convierte en 2 (A) en vez de excluirse: 50 "-" y 1 "d".
   - Un número como "2" se lee como 2/20 → C. Hay 95 valores 0–2, y 53 de los 887 casos de riesgo existen solo por eso.
   - El sexo se asigna alternando por número de fila.
   - Una sede vacía se asigna por turno entre las 5 sedes.
   - Un año inválido pasa a ser 2026.
6. **`importancia_rf`** es el porcentaje de notas C por curso, no la importancia del modelo.
7. **El simulador en vivo** usa `Math.random()`, así que no es reproducible.
8. **2026 se usa como "prueba"** con métricas, pero aún no tiene nota de cierre.

## Reglas obligatorias

- **Nunca imputar ni inventar** notas, sexo, sede o año. Si un dato es inválido, se excluye el registro y se registra el motivo fila por fila.
- **Toda cifra que se muestre debe calcularse** desde los datos. Nada de porcentajes escritos a mano ni de "ajustes" a la matriz de confusión.
- **Sin fuga:**
  - Variables (X) = notas B1 y B2 y sus derivadas, más grado, sede y sexo.
  - Etiqueta (y) = algún curso con nota FINAL en C.
  - La nota final nunca entra en X.
- **Partición temporal:**
  - 2020–2024: entrenamiento, con CV dejando un año fuera para los hiperparámetros.
  - 2025: prueba (holdout).
  - Modelo final: reentrenado con 2020–2025.
  - 2026: solo predicción, sin métricas.
- **Reproducibilidad:** `random_state=42` aplicado de verdad. Las predicciones salen del modelo entrenado.
- **Escala MINEDU:** AD 18–20, A 14–17, B 11–13, C 0–10. Un número 0–3 en un año registrado en escala literal se marca como sospechoso; no es una nota válida.
- Si el Excel solo trae una nota por curso (sin bimestres), **detenerse y avisar**. No entrenar con fuga.

## Datos en bruto (exportados del sistema académico, uno por año)

El primer Excel consolidado traía un promedio anual por curso (sin bimestres); con ese formato el
pipeline se detiene (código de salida 2). Los datos en bruto sí traen bimestres:

```
<AÑO>/Consolidado_Notas_Curso/<SEDE>/<g> SECUNDARIA_<n>.xlsx      # 1, 2, 3, 4, PF por curso
<AÑO>/Consolidado_Datos_Estudiante/<SEDE>/[SECUNDARIA/]<g> ....xlsx  # DNI, sexo, sede, grado, sección
```

`src/consolidar_notas.py` los une (por sede, grado y nombre "Apellido1 I. Nombre") y produce el
Excel del pipeline. Solo secundaria (1º-5º). Decisiones:

- Áreas del modelo: COMUNICACIÓN, INGLÉS, MATEMÁTICA, CIENCIA Y TECNOLOGÍA, CIENCIAS SOCIALES
  (las 5 presentes en todos los grados y sedes). Final = columna PF.
- No limpia notas: copia los valores; la validación es de `auditar_excel.py` / el pipeline.
- El DNI no sale del script: `ID_Estudiante` = HMAC-SHA256 con `tesis-rf/data/clave_id.txt`
  (fuera de git). Usar **la misma clave para todos los años** o los ID no coincidirán.
- Estudiante con notas pero sin ficha: se conserva sin sexo, con ID `SINDNI-…`, y queda en el log.
- Un área duplicada con valores distintos no se resuelve a mano: queda vacía y se excluye.

- Una sección copiada en la carpeta de otra sede (mismos alumnos y notas) se conserva solo donde
  los alumnos tienen ficha; la copia se descarta y queda en el log (`seccion_copiada_descartada`).
- La sede se reconoce por palabra clave (las carpetas traen "HUAHURA", "INDUSTRIIAL", "ASECENSION").

Hallazgos por año (consolidado → válidos tras auditar; riesgo = algún Final en C):

| Año  | Consolidados | Válidos | Riesgo | Notas |
|------|-------------:|--------:|-------:|-------|
| 2020 | 726  | 666  | 3.9%  | Falta ficha de Avantgard Lima 3º (14 sin sexo). Industrial solo 1º-2º. MATEMÁTICA duplicada idéntica en Industrial 2º. Año de pandemia. |
| 2021 | 878  | 856  | 15.1% | Sin incidencias. Escala mixta (letras y números). |
| 2022 | 1094 | 1035 | 5.2%  | La carpeta de notas de Industrial es copia de la de Avantgard Lima (216 alumnos): descartada; faltan las notas reales de Industrial 2022 (307 fichas sin notas). Escala mixta. |
| 2023 | 1709 | 1602 | 8.6%  | MATEMÁTICA se llama "MATEMÁTICA-SINGAPUR" en Avantgard Huaura 1º-2º y CIENCIAS SOCIALES viene como "Ciencias Sociales" en La Ascensión 1º (mismas notas que el sub-curso). Gemelas "Flores P. Maria" en Central: se desempata por la sección. |
| 2024 | 1862 | 1700 | 6.0%  | Sin incidencias (mismas gemelas, desempatadas por sección). |

Los totales consolidados de 2021, 2023 y 2024 coinciden con los del dashboard original (878, 1709,
1862); 2020 suma 14 alumnos más (Avantgard Lima 3º sin ficha). 2,003 estudiantes aparecen en 2 a 5
años con el mismo ID. La Ascensión concentra el riesgo todos los años. La regla "alguna C en B1-B2"
detecta 408 de 448 casos de riesgo 2020-2024 con 821 falsas alarmas: es la línea base a superar.

Regla de exclusión por etapa: B1, B2 y Final inválidos excluyen el registro; B3 y B4 solo se
reportan en `valores_a_revisar` (no entran al modelo), salvo B4 cuando hace de nota de cierre.

## Estructura

```
tesis-rf/
  data/                    # Excel original (no modificarlo; ignorado por git)
  src/consolidar_notas.py  # Excel en bruto por año (notas + fichas) -> Excel del pipeline
  src/auditar_excel.py     # diagnóstico + validación + log de exclusiones (cualquier formato)
  src/pipeline_rf_tesis.py # validación, RF, hiperparámetros, métricas, predicción 2026, modelo_rf.joblib
  src/predecir.py          # predicción con modelo_rf.joblib (lo usa el simulador vía server.ts)
  salida/                  # resultados de auditar_excel.py (ignorado por git)
  resultados/              # resultados del pipeline; el dashboard los lee
server.ts                  # Express + Vite; /api/resultados, /api/modelo, /api/predecir, /api/dataset
src/                       # dashboard React
  utils/validacion.ts      # port de auditar_excel.py (mismas reglas y motivos)
scripts/verificar_validacion.ts  # compara validacion.ts con auditar_excel.py sobre un mismo archivo
```

## Comandos

```bash
# Python
cd tesis-rf
pip install -r requirements.txt
python src/consolidar_notas.py --anio-dir data/bruto/2020 data/bruto/2021 ... --salida data/notas.xlsx
python src/auditar_excel.py --datos data/<archivo>.xlsx --salida salida/
python src/pipeline_rf_tesis.py --datos data/<archivo>.xlsx --salida resultados/ --n-iter 40
python src/pipeline_rf_tesis.py --demo --n-iter 8   # prueba rápida con datos sintéticos (no copiar a resultados/)

# Web
npm install
npm run dev          # http://localhost:3000
npm run lint         # tsc --noEmit
npx tsx scripts/verificar_validacion.ts <archivo> salida/perfil_dataset.json salida/registros_excluidos.csv
```

`pipeline_rf_tesis.py` espera estas columnas:

- `ID_Estudiante`, `Sexo`, `Sede`, `Grado`, `Año_Academico`
- Por cada curso: `<Curso>_B1`, `<Curso>_B2`, `<Curso>_Final` (o `_B4`)

Si el Excel real usa otros nombres, adaptar la detección de columnas sin cambiar las reglas.
Si se cambia una regla de validación, cambiarla en `auditar_excel.py`, `pipeline_rf_tesis.py`
y `src/utils/validacion.ts`, y volver a correr `scripts/verificar_validacion.ts`.

## Métricas a reportar (implementadas en el pipeline y mostradas en el Paso 3)

- Sensibilidad, especificidad, precisión, VPN
- F1, F2
- Exactitud balanceada, MCC, kappa
- ROC-AUC, PR-AUC (métrica principal)
- Brier y curva de calibración
- IC 95% por bootstrap
- Métricas por sede, sexo y grado
- Líneas base (regla "alguna C en B1-B2", dummy, regresión logística) con prueba de McNemar
- Importancia por permutación
- Umbral elegido con predicciones fuera de muestra: mayor precisión con sensibilidad ≥ 0.90
- PR-AUC por año en la validación cruzada, brecha entrenamiento-validación y curvas de validación de `max_depth` y `min_samples_leaf`

## Dashboard

El dashboard no calcula ni ajusta ninguna métrica del modelo. Valida el Excel en el navegador
(`validacion.ts`) y muestra lo que el pipeline escribió en `tesis-rf/resultados/`. Si no hay
resultados, lo dice y muestra los comandos. El simulador llama a `predecir.py` con el modelo
guardado; sin `modelo_rf.joblib` queda deshabilitado. No volver a agregar datos de demostración,
valores por defecto ni métricas de respaldo.
