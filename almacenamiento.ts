/**
 * Dónde se guarda la validación del Excel (Paso 1-2) en el servidor.
 *
 * - Con DATABASE_URL (PostgreSQL, p. ej. Neon o Supabase gratis): sobrevive a reinicios,
 *   redespliegues y a que Render apague el servicio por inactividad. Es lo recomendado en Render.
 * - Sin DATABASE_URL: un archivo JSON en DATA_DIR (por defecto ./data). En el plan gratuito de
 *   Render ese disco es efímero: se borra cada vez que el servicio se duerme (~15 min sin visitas),
 *   se reinicia o se redespliega. Con un Persistent Disk (plan de pago) montado en DATA_DIR sí persiste.
 *
 * Se guarda una sola validación (la última). El contenido se comprime con gzip.
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

export interface Guardado {
  auditoria: unknown;
  savedAt: string;
}

export interface Almacenamiento {
  tipo: 'postgres' | 'disco';
  /** true si lo guardado sobrevive a reinicios del servicio. */
  persistente: boolean;
  descripcion: string;
  leer(): Promise<Guardado | null>;
  guardar(g: Guardado): Promise<void>;
  borrar(): Promise<void>;
}

const comprimir = (g: Guardado) => zlib.gzipSync(Buffer.from(JSON.stringify(g), 'utf-8'));
const descomprimir = (b: Buffer): Guardado => JSON.parse(zlib.gunzipSync(b).toString('utf-8'));

function enDisco(dir: string, persistente: boolean): Almacenamiento {
  fs.mkdirSync(dir, { recursive: true });
  const ruta = path.join(dir, 'saved_dataset.json.gz');
  const antigua = path.join(dir, 'saved_dataset.json'); // formato anterior, sin comprimir
  return {
    tipo: 'disco',
    persistente,
    descripcion: persistente
      ? `archivo en ${dir}`
      : `archivo en ${dir} (disco efímero: se borra al reiniciar el servicio; configure DATABASE_URL)`,
    async leer() {
      if (fs.existsSync(ruta)) return descomprimir(fs.readFileSync(ruta));
      if (fs.existsSync(antigua)) return JSON.parse(fs.readFileSync(antigua, 'utf-8'));
      return null;
    },
    async guardar(g) {
      const tmp = `${ruta}.tmp`;
      fs.writeFileSync(tmp, comprimir(g));
      fs.renameSync(tmp, ruta); // escritura atómica: nunca queda un archivo a medias
      if (fs.existsSync(antigua)) fs.unlinkSync(antigua);
    },
    async borrar() {
      for (const r of [ruta, antigua]) if (fs.existsSync(r)) fs.unlinkSync(r);
    },
  };
}

async function enPostgres(url: string): Promise<Almacenamiento> {
  const { default: pg } = await import('pg');
  const local = /localhost|127\.0\.0\.1/.test(url);
  const pool = new pg.Pool({
    connectionString: url,
    ssl: local || /sslmode=disable/.test(url) ? undefined : { rejectUnauthorized: false },
    max: 3,
  });
  await pool.query(`CREATE TABLE IF NOT EXISTS validacion_guardada (
    id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    guardado_en timestamptz NOT NULL,
    contenido bytea NOT NULL
  )`);
  return {
    tipo: 'postgres',
    persistente: true,
    descripcion: 'base de datos PostgreSQL',
    async leer() {
      const r = await pool.query('SELECT contenido FROM validacion_guardada WHERE id = 1');
      return r.rows[0] ? descomprimir(r.rows[0].contenido) : null;
    },
    async guardar(g) {
      await pool.query(
        `INSERT INTO validacion_guardada (id, guardado_en, contenido) VALUES (1, $1, $2)
         ON CONFLICT (id) DO UPDATE SET guardado_en = EXCLUDED.guardado_en, contenido = EXCLUDED.contenido`,
        [g.savedAt, comprimir(g)],
      );
    },
    async borrar() {
      await pool.query('DELETE FROM validacion_guardada');
    },
  };
}

export async function crearAlmacenamiento(raiz: string): Promise<Almacenamiento> {
  const url = process.env.DATABASE_URL;
  if (url) {
    try {
      return await enPostgres(url);
    } catch (err: any) {
      // No se cae el servicio: se avisa en el log y en /api/dataset que no es persistente.
      console.error('No se pudo conectar a DATABASE_URL; se usa el disco local (efímero):', err.message);
    }
  }
  const dir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(raiz, 'data');
  return enDisco(dir, Boolean(process.env.DATA_DIR));
}
