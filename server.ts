import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
          hasData: true,
          records: parsed.records || [],
          metrics: parsed.metrics || null,
          currentPhase: parsed.currentPhase || 'paso4_resultados',
          savedAt: parsed.savedAt || null,
        });
      }
      return res.json({
        success: true,
        hasData: false,
        records: [],
        metrics: null,
        currentPhase: 'paso1_carga',
        savedAt: null,
      });
    } catch (err: any) {
      console.error('Error al leer dataset del servidor:', err);
      return res.status(500).json({ error: 'Error al leer el dataset guardado' });
    }
  });

  // POST: Guardar información persistente en el servidor
  app.post('/api/dataset', (req, res) => {
    try {
      const { records, metrics, currentPhase } = req.body;
      const payload = {
        records: Array.isArray(records) ? records : [],
        metrics: metrics || null,
        currentPhase: currentPhase || 'paso4_resultados',
        savedAt: new Date().toISOString(),
      };
      fs.writeFileSync(dataFilePath, JSON.stringify(payload, null, 2), 'utf-8');
      return res.json({
        success: true,
        message: 'Información guardada exitosamente en el servidor.',
        savedAt: payload.savedAt,
        totalRecords: payload.records.length,
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
