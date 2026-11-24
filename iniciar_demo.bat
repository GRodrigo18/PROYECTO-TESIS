@echo off
rem Plan B: corre el sistema completo en esta computadora (sin Render ni base de datos externa).
rem Doble clic para abrirlo. La primera vez instala lo necesario (requiere internet);
rem despues arranca sin internet. Guia completa: PLAN_B_DEMO.md
setlocal EnableExtensions
title Riesgo academico RF - modo local
cd /d "%~dp0"

echo ============================================================
echo   Riesgo academico temprano - Random Forest - modo local
echo ============================================================
echo.

rem ---------- 1. Node.js ----------
where node >nul 2>nul
if errorlevel 1 goto :sin_node
for /f "delims=" %%v in ('node -v') do echo [OK] Node.js %%v

rem ---------- 2. Python 3.13 en tesis-rf\.venv ----------
set "VENV=%CD%\tesis-rf\.venv"
set "PY=%VENV%\Scripts\python.exe"
if exist "%PY%" goto :python_listo
echo [..] Creando el entorno de Python - solo la primera vez
set "PYBASE="
py -3.13 -c "import sys" >nul 2>nul
if not errorlevel 1 set "PYBASE=py -3.13"
if defined PYBASE goto :crear_venv
python -c "import sys; sys.exit(0 if sys.version_info[:2] == (3, 13) else 1)" >nul 2>nul
if not errorlevel 1 set "PYBASE=python"
if not defined PYBASE goto :sin_python
:crear_venv
%PYBASE% -m venv "%VENV%"
if errorlevel 1 goto :error_venv
:python_listo

"%PY%" -c "import sklearn, pandas, numpy, scipy, joblib, openpyxl" >nul 2>nul
if not errorlevel 1 goto :paquetes_ok
echo [..] Instalando paquetes de Python - solo la primera vez, unos minutos
"%PY%" -m pip install --disable-pip-version-check -r tesis-rf\requirements.txt
if errorlevel 1 goto :error_pip
:paquetes_ok
"%PY%" -c "import sys, sklearn; print('[OK] Python', sys.version.split()[0], '/ scikit-learn', sklearn.__version__)"

rem ---------- 3. Paquetes de Node y compilacion del dashboard ----------
if exist "node_modules\.bin\tsx.cmd" goto :npm_ok
echo [..] Instalando paquetes de Node - solo la primera vez, unos minutos
call npm install --no-audit --no-fund
if errorlevel 1 goto :error_npm
:npm_ok
echo [..] Preparando el dashboard
call npm run build >"%TEMP%\riesgo_rf_build.log" 2>&1
if not errorlevel 1 goto :build_ok
if exist "dist\index.html" goto :build_viejo
type "%TEMP%\riesgo_rf_build.log"
goto :error_build
:build_viejo
echo [AVISO] No se pudo recompilar; se usa la version anterior del dashboard.
:build_ok
echo [OK] Dashboard listo

rem ---------- 4. Archivos de resultados ----------
if not exist "tesis-rf\resultados\modelo_rf.joblib" echo [AVISO] Falta tesis-rf\resultados\modelo_rf.joblib: el simulador quedara deshabilitado.
if exist "tesis-rf\resultados\predicciones_2026.csv" goto :pred_ok
echo.
echo [AVISO] Falta tesis-rf\resultados\predicciones_2026.csv
echo         El Paso 4 - Predicciones 2026 - saldra vacio. Copie ese archivo a la carpeta
echo         tesis-rf\resultados\ y vuelva a abrir este programa. Ver PLAN_B_DEMO.md
echo.
goto :puerto
:pred_ok
echo [OK] predicciones_2026.csv encontrado

rem ---------- 5. Arranque ----------
:puerto
for /f "delims=" %%p in ('node scripts\puerto_libre.cjs 3000') do set "PORT=%%p"
if not "%PORT%"=="3000" echo [AVISO] El puerto 3000 esta ocupado - quiza quedo abierta otra ventana del sistema. Se usa el %PORT%.

set "NODE_ENV=production"
set "PYTHON=%PY%"
set "PYTHONUTF8=1"
set "DATA_DIR=%CD%\data"
set "DATABASE_URL="
set "PREDICCIONES_2026="

echo.
echo   Abriendo http://localhost:%PORT% en el navegador...
echo   Para apagar: cierre esta ventana o pulse Ctrl+C.
echo.
start "" /b node scripts\abrir_navegador.cjs %PORT%
call "node_modules\.bin\tsx.cmd" server.ts
echo.
echo El servidor se detuvo.
pause
exit /b 0

rem ---------- Errores ----------
:sin_node
echo [ERROR] No se encontro Node.js.
echo         Instale la version LTS desde https://nodejs.org - opciones por defecto -
echo         y vuelva a hacer doble clic en este archivo.
goto :fin_error
:sin_python
echo [ERROR] No se encontro Python 3.13. El modelo se entreno con Python 3.13.
echo         Instalelo desde https://www.python.org/downloads/ - elija 3.13 y marque
echo         "Add python.exe to PATH" - y vuelva a hacer doble clic en este archivo.
goto :fin_error
:error_venv
echo [ERROR] No se pudo crear el entorno de Python en tesis-rf\.venv
goto :fin_error
:error_pip
echo [ERROR] Fallo la instalacion de paquetes de Python. Revise su conexion a internet.
echo         Si el error persiste, borre la carpeta tesis-rf\.venv y vuelva a intentar.
goto :fin_error
:error_npm
echo [ERROR] Fallo "npm install". Revise su conexion a internet y vuelva a intentar.
goto :fin_error
:error_build
echo [ERROR] No se pudo compilar el dashboard. Copie el mensaje de arriba.
goto :fin_error
:fin_error
echo.
pause
exit /b 1
