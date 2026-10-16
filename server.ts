import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

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

function ejecutarPredecir(entrada: unknown): Promise<any> {
  return new Promise((resolve, reject) => {
    const p = spawn(PYTHON, [PREDECIR_PY, '--modelo', MODELO], { env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
    let out = '';
    let err = '';
    p.stdout.on('data', d => (out += d));
    p.stderr.on('data', d => (err += d));
    p.on('error', reject);
    p.on('close', code => {
      try {
        const json = JSON.parse(out);
        if (code !== 0 || json.error) return reject(new Error(json.error || err || `predecir.py salió con código ${code}`));
        resolve(json);
      } catch {
        reject(new Error(err || 'Respuesta inválida de predecir.py'));
      }
    });
    p.stdin.end(JSON.stringify(entrada));
  });
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Permitir payloads grandes para datasets completos
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  const dataDir = path.resolve(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dataFilePath = path.join(dataDir, 'saved_dataset.json');

  // GET: Obtener dataset guardado en el servidor para cualquier navegador
  app.get('/api/dataset', (_req, res) => {
    try {
      if (fs.existsSync(dataFilePath)) {
        const fileContent = fs.readFileSync(dataFilePath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        return res.json({
          success: true,
          hasData: Boolean(parsed.auditoria),
          auditoria: parsed.auditoria || null,
          savedAt: parsed.savedAt || null,
        });
      }
      return res.json({ success: true, hasData: false, auditoria: null, savedAt: null });
    } catch (err: any) {
      console.error('Error al leer dataset del servidor:', err);
      return res.status(500).json({ error: 'Error al leer el dataset guardado' });
    }
  });

  // POST: Guardar información persistente en el servidor
  app.post('/api/dataset', (req, res) => {
    try {
      const { auditoria } = req.body;
      if (!auditoria || !auditoria.perfil || !Array.isArray(auditoria.validos)) {
        return res.status(400).json({ error: 'Falta el resultado de la validación' });
      }
      const payload = { auditoria, savedAt: new Date().toISOString() };
      fs.writeFileSync(dataFilePath, JSON.stringify(payload, null, 2), 'utf-8');
      return res.json({
        success: true,
        message: 'Información guardada exitosamente en el servidor.',
        savedAt: payload.savedAt,
        totalRecords: auditoria.validos.length,
      });
    } catch (err: any) {
      console.error('Error al guardar dataset en el servidor:', err);
      return res.status(500).json({ error: 'Error al persistir el dataset' });
    }
  });

  // DELETE: Reiniciar dataset del servidor
  app.delete('/api/dataset', (_req, res) => {
    try {
      if (fs.existsSync(dataFilePath)) {
        fs.unlinkSync(dataFilePath);
      }
      return res.json({ success: true, message: 'Datos eliminados del servidor correctamente.' });
    } catch (err: any) {
      console.error('Error al reiniciar dataset:', err);
      return res.status(500).json({ error: 'Error al limpiar dataset' });
    }
  });

  // GET: resultados reales del pipeline (si ya se ejecutó)
  app.get('/api/resultados', (_req, res) => {
    try {
      const rutaInforme = path.join(RESULTADOS_DIR, 'informe_metricas.json');
      const hayInforme = fs.existsSync(rutaInforme);
      const num = (v: string) => (v === '' ? NaN : Number(v));
      return res.json({
        disponible: hayInforme,
        generado_en: hayInforme ? fs.statSync(rutaInforme).mtime.toISOString() : null,
        informe: hayInforme ? JSON.parse(fs.readFileSync(rutaInforme, 'utf-8')) : null,
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
      return res.json(await ejecutarPredecir({ info: true }));
    } catch (err: any) {
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
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
  });
}

startServer();
