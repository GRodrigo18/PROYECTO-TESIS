/**
 * Copia de la validación en el navegador (IndexedDB). Sirve de respaldo si el servidor
 * perdió lo guardado (p. ej. Render gratuito sin base de datos borra el disco al dormirse).
 * Solo vive en este navegador; si falla (modo privado, datos bloqueados) no rompe nada.
 */
import { ResultadoAuditoria } from '../types';

const BD = 'riesgo-academico-rf';
const ALMACEN = 'validacion';
const CLAVE = 'ultima';

export interface GuardadoLocal {
  auditoria: ResultadoAuditoria;
  savedAt: string;
}

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BD, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(ALMACEN);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function operar<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T | null> {
  try {
    const db = await abrir();
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(ALMACEN, modo);
      const req = fn(tx.objectStore(ALMACEN));
      tx.oncomplete = () => { db.close(); resolve((req.result as T) ?? null); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch {
    return null;
  }
}

export const leerLocal = () => operar<GuardadoLocal>('readonly', s => s.get(CLAVE));
export const guardarLocal = (g: GuardadoLocal) => operar('readwrite', s => s.put(g, CLAVE));
export const borrarLocal = () => operar('readwrite', s => s.delete(CLAVE));
