#!/usr/bin/env bash
# Plan B: corre el sistema completo en esta computadora (sin Render ni base de datos externa).
# Uso: ./iniciar_demo.sh   (la primera vez instala lo necesario; luego arranca sin internet)
# Guía completa: PLAN_B_DEMO.md
set -u
cd "$(dirname "$0")"

falla() { echo "[ERROR] $*"; exit 1; }

command -v node >/dev/null || falla "No se encontró Node.js. Instale la versión LTS desde https://nodejs.org"
echo "[OK] Node.js $(node -v)"

VENV="$PWD/tesis-rf/.venv"
PY="$VENV/bin/python"
if [ ! -x "$PY" ]; then
  BASE=""
  for c in python3.13 python3; do
    if command -v "$c" >/dev/null && "$c" -c 'import sys; sys.exit(0 if sys.version_info[:2]==(3,13) else 1)'; then BASE="$c"; break; fi
  done
  [ -n "$BASE" ] || falla "No se encontró Python 3.13 (el modelo se entrenó con 3.13): https://www.python.org/downloads/"
  echo "[..] Creando el entorno de Python (solo la primera vez)"
  "$BASE" -m venv "$VENV" || falla "No se pudo crear tesis-rf/.venv"
fi
if ! "$PY" -c 'import sklearn, pandas, numpy, scipy, joblib, openpyxl' 2>/dev/null; then
  echo "[..] Instalando paquetes de Python (solo la primera vez)"
  "$PY" -m pip install --disable-pip-version-check -r tesis-rf/requirements.txt || falla "Falló pip install (¿internet?)"
fi
"$PY" -c "import sys, sklearn; print('[OK] Python', sys.version.split()[0], '/ scikit-learn', sklearn.__version__)"

if [ ! -x node_modules/.bin/tsx ]; then
  echo "[..] Instalando paquetes de Node (solo la primera vez)"
  npm install --no-audit --no-fund || falla "Falló npm install (¿internet?)"
fi
echo "[..] Preparando el dashboard"
if ! npm run build >/tmp/riesgo_rf_build.log 2>&1; then
  [ -f dist/index.html ] || { cat /tmp/riesgo_rf_build.log; falla "No se pudo compilar el dashboard"; }
  echo "[AVISO] No se pudo recompilar; se usa la versión anterior del dashboard."
fi

[ -f tesis-rf/resultados/modelo_rf.joblib ] || echo "[AVISO] Falta modelo_rf.joblib: el simulador quedará deshabilitado."
[ -f tesis-rf/resultados/predicciones_2026.csv ] || echo "[AVISO] Falta tesis-rf/resultados/predicciones_2026.csv: el Paso 4 saldrá vacío (ver PLAN_B_DEMO.md)."

PORT="$(node scripts/puerto_libre.cjs 3000)"
[ "$PORT" = 3000 ] || echo "[AVISO] El puerto 3000 está ocupado; se usa el $PORT."

echo
echo "  Abriendo http://localhost:$PORT ... Para apagar: Ctrl+C."
node scripts/abrir_navegador.cjs "$PORT" &
unset DATABASE_URL PREDICCIONES_2026
NODE_ENV=production PYTHON="$PY" PYTHONUTF8=1 DATA_DIR="$PWD/data" PORT="$PORT" exec node_modules/.bin/tsx server.ts
