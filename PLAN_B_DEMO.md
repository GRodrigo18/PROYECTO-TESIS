# Plan B: correr el sistema en tu computadora para la sustentación

Si Render no responde, el mismo sistema (dashboard, métricas, predicciones 2026 y simulador
con el Random Forest real) corre en tu laptop con un doble clic, **sin internet y sin base de
datos externa**. La preparación se hace **una vez, con internet, antes del día de la sustentación**.

---

## A. Preparación (una sola vez, con internet, ~15 minutos)

### 1. Instalar dos programas

| Programa | Dónde | Qué marcar |
|---|---|---|
| **Node.js** (versión LTS) | https://nodejs.org | Opciones por defecto |
| **Python 3.13** | https://www.python.org/downloads/ (busca "Python 3.13.x") | Marca **"Add python.exe to PATH"** en la primera pantalla |

Usa Python **3.13**, no 3.14: el modelo se entrenó con 3.13 y esas versiones de paquetes.
Si ya los tienes, no hace falta reinstalar.

### 2. Bajar el proyecto

1. Entra a https://github.com/GRodrigo18/PROYECTO-TESIS
2. Botón verde **Code → Download ZIP**.
3. Descomprímelo en una carpeta corta y **fuera de OneDrive**, por ejemplo `C:\tesis\`.
   Quedará `C:\tesis\PROYECTO-TESIS-main\`. (El Escritorio suele estar sincronizado con
   OneDrive y eso vuelve lenta y frágil la instalación.)

### 3. Copiar el archivo de predicciones 2026

`predicciones_2026.csv` no está en GitHub (tiene una fila por alumno). Copia tu archivo a:

```
C:\tesis\PROYECTO-TESIS-main\tesis-rf\resultados\predicciones_2026.csv
```

Es el mismo que subiste a Render como *Secret File*. Sin él, todo funciona menos el Paso 4.

### 4. Primer arranque

Doble clic en **`iniciar_demo.bat`** (en la carpeta del proyecto).

- La primera vez instala los paquetes de Python y Node: tarda unos minutos. Las siguientes
  veces arranca en segundos y **ya no necesita internet**.
- Si Windows pregunta por el **Firewall**, pulsa *Permitir* (o *Cancelar*: en tu propia
  laptop funciona igual).
- Si Windows muestra *"Windows protegió su PC"*, pulsa *Más información → Ejecutar de todas formas*.
- Se abre solo el navegador en **http://localhost:3000**. En la ventana negra debe decir:

```
  Listo: http://localhost:3000
  Modelo: OK | Metricas: OK | Predicciones 2026: 1932 alumnos
```

### 5. Cargar el Excel una vez

La validación que estaba guardada en Render no se copia a tu laptop. En el **Paso 1**, sube el
Excel de notas como en la web. Queda guardado en la carpeta `data\` del proyecto, así que al
volver a abrir el programa ya aparece cargado.

### 6. Ensayo completo

Recorre los 5 pasos como en la sustentación, incluido el simulador con una alumna de
**La Ascensión**. Luego **desconecta el wifi** y repite: debe funcionar igual.

---

## B. El día de la sustentación

1. Laptop **conectada a la corriente**.
2. Doble clic en `iniciar_demo.bat` **antes** de empezar y espera el mensaje `Listo`.
3. **No cierres la ventana negra** mientras presentas (puedes minimizarla).
4. Si se cerró el navegador, abre http://localhost:3000 a mano.
5. Para apagar: cierra la ventana negra.

Si Render volvió a funcionar, puedes usar la web y dejar esto abierto como respaldo.

---

## C. Si algo falla

| Mensaje o síntoma | Qué hacer |
|---|---|
| `No se encontro Node.js` | Instala Node.js (paso A.1), **cierra** la ventana y vuelve a hacer doble clic. |
| `No se encontro Python 3.13` | Instala Python 3.13 marcando "Add python.exe to PATH". |
| `Fallo la instalacion de paquetes de Python` | Revisa internet. Borra la carpeta `tesis-rf\.venv` y vuelve a intentar. |
| `El puerto 3000 esta ocupado ... Se usa el 3001` | Quedó otra ventana abierta. Sirve igual: usa la dirección que indica (`localhost:3001`). |
| `Predicciones 2026: 0 alumnos` | Falta `tesis-rf\resultados\predicciones_2026.csv` (paso A.3). |
| El Paso 1-2 aparece vacío | Sube el Excel de nuevo (paso A.5). |
| El simulador muestra un error | Cierra la ventana negra y vuelve a abrir `iniciar_demo.bat`. |

En Mac o Linux, el equivalente es `./iniciar_demo.sh` desde la terminal.

---

## D. Recuperar Render (cuando haya tiempo)

En https://dashboard.render.com → servicio **riesgo-academico-rf**:

1. **Events**: busca la causa del último corte.
   - *"Out of memory (used over 512Mi)"*: el plan gratuito tiene 512 MB y el servicio carga
     Node + Python + el modelo. Pasar a *Starter* (pago) lo resuelve.
   - *"Deploy failed"*: abre ese deploy y mira el final del log de compilación. **Manual Deploy →
     Clear build cache & deploy** suele bastar.
   - Servicio **suspendido**: en el plan gratuito, al acabarse las 750 horas del mes, Render
     suspende el servicio hasta el día 1 del mes siguiente. Revisa *Billing → Free usage*.
2. **Logs**: tras un arranque correcto aparecen `Servidor activo en http://0.0.0.0:...`.
   Si no aparece, la línea anterior dice por qué.
3. Cuando cargue, abre `https://riesgo-academico-rf.onrender.com/api/health`: `modelo` y
   `informe_metricas` deben salir en `true` y `predicciones_2026` mayor que 0.
4. El plan gratuito se duerme tras 15 minutos sin visitas y tarda en despertar. Si lo usas en
   la sustentación, ábrelo 5 minutos antes y déjalo abierto.
