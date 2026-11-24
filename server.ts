import express from 'express';
import compression from 'compression';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { crearAlmacenamiento } from './almacenamiento';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Salidas del pipeline Python (tesis-rf/src/pipeline_rf_tesis.py). El servidor solo las lee:
// ninguna métrica se calcula ni se ajusta aquí.
const RESULTADOS_DIR = path.resolve(__dirname, process.env.RESULTADOS_DIR || 'tesis-rf/resultados');
const PREDECIR_PY = path.resolve(__dirname, 'tesis-rf/src/predecir.py');
const MODELO = path.join(RESULTADOS_DIR, 'modelo_rf.joblib');
// Una fila por alumno: en el despliegue se lee de un archivo secreto, no del repositorio público.
const PREDICCIONES_2026 = process.env.PREDICCIONES_2026 && fs.existsSync(process.env.PREDICCIONES_2026)
  ? process.env.PREDICCIONES_2026
  : path.join(RESULTADOS_DIR, 'predicciones_2026.csv');
const PYTHON = process.env.PYTHON || 'python3';

/** CSV simple con comillas (lo que escribe pandas.to_csv). */
function leerCsv(ruta: string): Record<string, string>[] {
  if (!fs.existsSync(ruta)) return [];
  const texto = fs.readFileSync(ruta, 'utf-8').replace(/^\uFEFF/, '');
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (comillas) {
      if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') comillas = false;
      else campo += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === ',') { fila.push(campo); campo = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo); campo = '';
      if (fila.some(c => c !== '')) filas.push(fila);
      fila = [];
    } else campo += ch;
  }
  if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
  const [cab, ...resto] = filas;
  return cab ? resto.map(f => Object.fromEntries(cab.map((c, j) => [c, f[j] ?? '']))) : [];
}

/**
 * predecir.py queda abierto (--servidor) con el modelo cargado: una línea JSON por petición.
 * Así cada predicción del simulador tarda milisegundos en vez de volver a cargar Python y el modelo.
 * Si el proceso muere, se vuelve a lanzar en la siguiente petición.
 */
let trabajador: ReturnType<typeof spawn> | null = null;
let pendientes: Array<{ resolve: (v: any) => void; reject: (e: Error) => void }> = [];
let bufferSalida = '';
let ultimoError = '';

function iniciarTrabajador() {
  const p = spawn(PYTHON, [PREDECIR_PY, '--modelo', MODELO, '--servidor'], {
    // UTF-8 explícito: en Windows Python usa cp1252 para stdin/stdout y "La Ascensión" llega
    // deformada (sede_invalida en el simulador). En Linux (Render) no cambia nada.
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
  });
  bufferSalida = '';
  ultimoError = '';
  p.stdout!.setEncoding('utf-8');
  p.stdout!.on('data', (d: string) => {
    bufferSalida += d;
    let i;
    while ((i = bufferSalida.indexOf('\n')) >= 0) {
      const linea = bufferSalida.slice(0, i);
      bufferSalida = bufferSalida.slice(i + 1);
      const pend = pendientes.shift();
      if (!pend) continue;
      try {
        const json = JSON.parse(linea);
        json.error ? pend.reject(new Error(json.error)) : pend.resolve(json);
      } catch {
        pend.reject(new Error('Respuesta inválida de predecir.py'));
      }
    }
  });
  p.stderr!.on('data', d => (ultimoError = (ultimoError + d).slice(-2000)));
  const caer = (motivo: string) => {
    if (trabajador === p) trabajador = null;
    const err = new Error(ultimoError.trim() || motivo);
    pendientes.splice(0).forEach(x => x.reject(err));
  };
  // Escribir a un proceso que acaba de morir no debe tumbar el servidor (EPIPE); 'close' ya avisa.
  p.stdin!.on('error', () => {});
  p.on('error', e => caer(e.message));
  p.on('close', code => caer(`predecir.py terminó con código ${code}`));
  trabajador = p;
}

const TIEMPO_MAX_PREDICCION_MS = 60_000;

function ejecutarPredecir(entrada: unknown): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!trabajador) iniciarTrabajador();
    const p = trabajador!;
    // Si Python se cuelga, el simulador muestra un error en vez de quedarse cargando para siempre:
    // se detiene el proceso (rechaza las peticiones pendientes) y la siguiente lo vuelve a lanzar.
    const reloj = setTimeout(() => {
      ultimoError = 'predecir.py no respondió a tiempo; vuelva a intentar.';
      p.kill();
    }, TIEMPO_MAX_PREDICCION_MS);
    pendientes.push({
      resolve: v => { clearTimeout(reloj); resolve(v); },
      reject: e => { clearTimeout(reloj); reject(e); },
    });
    p.stdin!.write(JSON.stringify(entrada) + '\n');
  });
}

// La información del modelo no cambia mientras el servidor corre.
let infoModelo: Promise<any> | null = null;

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Respuestas comprimidas (la validación guardada pesa varios MB en JSON)
  app.use(compression());
  // Permitir payloads grandes para datasets completos
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Validación guardada: PostgreSQL si hay DATABASE_URL; si no, archivo en DATA_DIR (ver almacenamiento.ts)
  const almacen = await crearAlmacenamiento(__dirname);
  console.log(`Validación guardada en: ${almacen.descripcion}`);
  const estado = () => ({ almacenamiento: almacen.tipo, persistente: almacen.persistente });

  // GET: validación guardada en el servidor (la ve cualquier navegador)
  app.get('/api/dataset', async (_req, res) => {
    try {
      const g = (await almacen.leer()) as { auditoria?: any; savedAt?: string } | null;
      return res.json({
        success: true,
        hasData: Boolean(g?.auditoria),
        auditoria: g?.auditoria || null,
        savedAt: g?.savedAt || null,
        ...estado(),
      });
    } catch (err: any) {
      console.error('Error al leer la validación guardada:', err);
      return res.status(500).json({ error: 'Error al leer la validación guardada', ...estado() });
    }
  });

  // POST: guardar la validación
  app.post('/api/dataset', async (req, res) => {
    try {
      const { auditoria } = req.body;
      if (!auditoria || !auditoria.perfil || !Array.isArray(auditoria.validos)) {
        return res.status(400).json({ error: 'Falta el resultado de la validación' });
      }
      const savedAt = new Date().toISOString();
      await almacen.guardar({ auditoria, savedAt });
      return res.json({
        success: true,
        message: 'Validación guardada en el servidor.',
        savedAt,
        totalRecords: auditoria.validos.length,
        ...estado(),
      });
    } catch (err: any) {
      console.error('Error al guardar la validación:', err);
      return res.status(500).json({ error: 'Error al guardar la validación en el servidor' });
    }
  });

  // DELETE: borrar la validación guardada
  app.delete('/api/dataset', async (_req, res) => {
    try {
      await almacen.borrar();
      return res.json({ success: true, message: 'Validación eliminada del servidor.' });
    } catch (err: any) {
      console.error('Error al borrar la validación:', err);
      return res.status(500).json({ error: 'Error al borrar la validación' });
    }
  });

  // GET: resultados reales del pipeline (si ya se ejecutó)
  app.get('/api/resultados', (_req, res) => {
    try {
      const rutaInforme = path.join(RESULTADOS_DIR, 'informe_metricas.json');
      const hayInforme = fs.existsSync(rutaInforme);
      const num = (v: string) => (v === '' ? NaN : Number(v));
      const informe = hayInforme ? JSON.parse(fs.readFileSync(rutaInforme, 'utf-8')) : null;
      return res.json({
        disponible: hayInforme,
        // Fecha que escribe el pipeline. No se usa la fecha del archivo: en el despliegue es la de la copia, no la del entrenamiento.
        generado_en: informe?.generado_en ?? null,
        informe,
        predicciones_2026: leerCsv(PREDICCIONES_2026).map(r => ({
          ...r,
          probabilidad_riesgo: num(r.probabilidad_riesgo),
          alerta_riesgo: num(r.alerta_riesgo),
          votos_arboles_riesgo: num(r.votos_arboles_riesgo),
          total_arboles: num(r.total_arboles),
        })),
        importancia_permutacion: leerCsv(path.join(RESULTADOS_DIR, 'importancia_permutacion.csv')).map(r => ({
          variable: r.variable,
          importancia_media: num(r.importancia_media),
          desv_std: num(r.desv_std),
        })),
        modelo_disponible: fs.existsSync(MODELO),
      });
    } catch (err: any) {
      console.error('Error al leer resultados del pipeline:', err);
      return res.status(500).json({ error: 'Error al leer los resultados del pipeline' });
    }
  });

  // GET: cursos, sedes y umbral del modelo entrenado
  app.get('/api/modelo', async (_req, res) => {
    if (!fs.existsSync(MODELO)) return res.status(404).json({ error: 'Aún no hay un modelo entrenado.' });
    try {
      infoModelo ??= ejecutarPredecir({ info: true });
      return res.json(await infoModelo);
    } catch (err: any) {
      infoModelo = null;
      return res.status(500).json({ error: err.message });
    }
  });

  // POST: predicción con el modelo entrenado (simulador)
  app.post('/api/predecir', async (req, res) => {
    if (!fs.existsSync(MODELO)) return res.status(404).json({ error: 'Aún no hay un modelo entrenado.' });
    try {
      return res.json(await ejecutarPredecir({ registros: req.body?.registros ?? [] }));
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Health endpoint
  // Sirve para revisar el despliegue antes de una presentación: todo debe salir en true / > 0.
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      ...estado(),
      informe_metricas: fs.existsSync(path.join(RESULTADOS_DIR, 'informe_metricas.json')),
      modelo: fs.existsSync(MODELO),
      predicciones_2026: leerCsv(PREDICCIONES_2026).length,
    });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Servidor activo en http://0.0.0.0:${PORT}`);
    // Carga el modelo en segundo plano al arrancar: la primera predicción del simulador ya no espera a Python.
    if (fs.existsSync(MODELO)) {
      infoModelo = ejecutarPredecir({ info: true });
      infoModelo.catch(err => {
        infoModelo = null;
        console.error('No se pudo cargar el modelo al arrancar:', err.message);
      });
    }
  });
}

startServer();
