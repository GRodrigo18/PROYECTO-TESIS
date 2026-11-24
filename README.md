# Predicción temprana de riesgo académico (Random Forest)

Proyecto de tesis. Hay dos partes:

- **`tesis-rf/`**: pipeline Python con scikit-learn. Valida el Excel, entrena el Random Forest
  sin fuga de información y escribe métricas, predicciones 2026 y el modelo en `tesis-rf/resultados/`.
- **Dashboard web** (raíz del repo): valida el Excel en el navegador con las mismas reglas y muestra
  los resultados reales del pipeline. No calcula ni inventa métricas.

Las reglas metodológicas y la auditoría que motivó estos cambios están en [`CLAUDE.md`](CLAUDE.md).

## Plan B: correrlo en tu computadora

Si el despliegue no responde, doble clic en `iniciar_demo.bat` (Windows) o `./iniciar_demo.sh`
(Mac/Linux). Guía paso a paso: [`PLAN_B_DEMO.md`](PLAN_B_DEMO.md).

## Uso

```bash
# 1. Pipeline (con el Excel por bimestre en tesis-rf/data/)
cd tesis-rf
pip install -r requirements.txt
python src/auditar_excel.py --datos data/notas.xlsx --salida salida/
python src/pipeline_rf_tesis.py --datos data/notas.xlsx --salida resultados/ --n-iter 40

# 2. Dashboard
cd ..
npm install
npm run dev   # http://localhost:3000
```

Si el Excel trae una sola nota por curso (promedio anual), el pipeline se detiene y explica
qué columnas hay que exportar: B1, B2 y Final de cada curso para 2020-2025.

El simulador (Paso 5) necesita Python en el servidor (`PYTHON=python3` por defecto) y
`tesis-rf/resultados/modelo_rf.joblib`.

Los Excel de `tesis-rf/data/` y las salidas fila por fila de `tesis-rf/salida/` están en
`.gitignore` porque contienen datos de estudiantes.

## Que el Excel no se borre en Render

El plan gratuito de Render no tiene disco persistente: lo que el servidor escribe se pierde cuando
el servicio se duerme (~15 min sin visitas), se reinicia o se redespliega. Para que la validación
guardada sobreviva:

1. Cree una base PostgreSQL gratuita en [Neon](https://neon.tech) o [Supabase](https://supabase.com)
   y copie su cadena de conexión (`postgresql://...?sslmode=require`).
2. En Render > el servicio > Environment, agregue `DATABASE_URL` con esa cadena y guarde.

La tabla `validacion_guardada` se crea sola. Sin `DATABASE_URL` la app sigue funcionando: guarda
en el navegador (IndexedDB) y vuelve a subir la validación al servidor cuando este la perdió, pero
la copia solo existe en el navegador donde se subió el Excel.
