/**
 * Validación y exclusión del Excel de notas en el navegador.
 *
 * Es un port directo de tesis-rf/src/auditar_excel.py: mismas columnas, mismas reglas,
 * mismos motivos. Nunca imputa: un dato inválido excluye el registro y queda en el log.
 * No entrena nada; el modelo vive en el pipeline Python.
 */
import * as XLSX from 'xlsx';
import {
  FormatoDataset,
  NotaEstandar,
  PerfilDataset,
  RegistroExcluido,
  RegistroValido,
  ResultadoAuditoria,
  Sexo,
  ValorARevisar,
} from '../types';

export const SEDES_VALIDAS = ['Central', 'La Ascensión', 'Avantgard Lima', 'Industrial', 'Avantgard Huaura'];
export const ANIO_MIN = 2020;
export const ANIO_MAX = 2026;
export const LITERALES: Record<string, NotaEstandar> = { AD: 3, A: 2, B: 1, C: 0 };
export const ETIQUETA_NOTA: Record<NotaEstandar, string> = { 3: 'AD', 2: 'A', 1: 'B', 0: 'C' };
const VACIOS = new Set(['', '-', '--', '—', 'NA', 'N/A', 'NAN', 'NONE', 'S/N', 'EXO', 'EXONERADO']);

export function norm(s: unknown): string {
  return String(s)
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buscarColumna(cols: string[], ...candidatos: string[]): string | null {
  const mapa = new Map(cols.map(c => [norm(c).toUpperCase().replace(/ /g, '_'), c]));
  for (const c of candidatos) {
    const hit = mapa.get(c);
    if (hit !== undefined) return hit;
  }
  return null;
}

/** {curso: {etapa: columna}}; etapa = UNICA, B1..B4 o FINAL */
export function detectarCursos(cols: string[]): Record<string, Record<string, string>> {
  const cursos: Record<string, Record<string, string>> = {};
  for (const c of cols) {
    const n = norm(c);
    const m = n.match(/^(?:Curso_)?(.+?)_(B[1-4]|Final)$/i);
    if (m) {
      (cursos[m[1].trim()] ??= {})[m[2].toUpperCase()] = c;
    } else if (n.toUpperCase().startsWith('CURSO_') && !n.toUpperCase().includes('PROMEDIO')) {
      (cursos[n.slice(6).trim()] ??= {})['UNICA'] = c;
    }
  }
  return cursos;
}

const esNulo = (v: unknown) => v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v));

/** Devuelve [nota_0_3, motivo_error]. Nunca imputa. */
export function estandarizar(valor: unknown, escalaLiteral: boolean): [NotaEstandar | null, string | null] {
  if (esNulo(valor)) return [null, 'nulo'];
  const t = String(valor).trim().toUpperCase();
  if (VACIOS.has(t)) return [null, 'guion_o_vacio'];
  if (t in LITERALES) return [LITERALES[t], null];
  const limpio = t.replace(',', '.');
  const n = Number(limpio);
  if (limpio === '' || Number.isNaN(n)) return [null, `token_invalido(${t})`];
  if (!(n >= 0 && n <= 20)) return [null, 'fuera_de_rango_0_20'];
  // Un número 0-3 en un año que se registra en escala literal suele ser un error de
  // codificación (p. ej. '2' por 'A'), no un 2/20 real.
  if (escalaLiteral && n <= 3) return [null, 'numero_0_3_en_anio_con_escala_literal'];
  return [n >= 18 ? 3 : n >= 14 ? 2 : n >= 11 ? 1 : 0, null];
}

function contar<T>(items: T[], clave: (x: T) => string | number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) {
    const k = String(clave(it));
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

const ordenarDesc = (o: Record<string, number>) =>
  Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]));
const ordenarClave = (o: Record<string, number>) =>
  Object.fromEntries(Object.entries(o).sort((a, b) => Number(a[0]) - Number(b[0])));

export function auditarFilas(
  hojas: Record<string, Record<string, unknown>[]>,
  archivo: string,
): ResultadoAuditoria {
  const [nombreHoja, filas] = Object.entries(hojas).reduce((a, b) => (b[1].length > a[1].length ? b : a));
  if (!filas || filas.length === 0) throw new Error('El archivo no contiene registros legibles.');
  const cols = Array.from(new Set(filas.flatMap(f => Object.keys(f))));

  const cId = buscarColumna(cols, 'ID_ESTUDIANTE', 'CODIGO', 'ID');
  const cSexo = buscarColumna(cols, 'SEXO', 'GENERO', 'SEXO_BINARIO');
  const cSede = buscarColumna(cols, 'SEDE', 'CAMPUS', 'LOCAL', 'FILIAL');
  const cAnio = buscarColumna(cols, 'ANO_ACADEMICO', 'ANIO_ACADEMICO', 'ANO', 'ANIO', 'YEAR');
  const cGrado = buscarColumna(cols, 'GRADO');
  const cursos = detectarCursos(cols);
  const etapas = new Set(Object.values(cursos).flatMap(d => Object.keys(d)));
  const formato: FormatoDataset = etapas.has('B1') && etapas.has('B2') ? 'por_bimestre' : 'una_nota_por_curso';
  const colNotas = Object.values(cursos).flatMap(d => Object.values(d));

  const anioDe = (f: Record<string, unknown>): number | null => {
    if (!cAnio || esNulo(f[cAnio]) || String(f[cAnio]).trim() === '') return null;
    const n = Number(String(f[cAnio]).trim());
    return Number.isNaN(n) ? null : n;
  };

  // Escala predominante por año (literal vs vigesimal)
  const escalaLiteral: Record<string, boolean> = {};
  const porAnio = new Map<number, { lit: number; total: number }>();
  for (const f of filas) {
    const a = anioDe(f);
    if (a === null) continue;
    const acc = porAnio.get(a) ?? { lit: 0, total: 0 };
    for (const c of colNotas) {
      acc.total++;
      if (!esNulo(f[c]) && String(f[c]).trim().toUpperCase() in LITERALES) acc.lit++;
    }
    porAnio.set(a, acc);
  }
  for (const [a, acc] of [...porAnio.entries()].sort((x, y) => x[0] - y[0])) {
    escalaLiteral[String(Math.trunc(a))] = acc.total > 0 && acc.lit / acc.total > 0.5;
  }

  const sedesOk = new Map(SEDES_VALIDAS.map(s => [norm(s).toUpperCase(), s]));
  const excluidos: RegistroExcluido[] = [];
  const revisar: ValorARevisar[] = [];
  const validos: RegistroValido[] = [];
  const vistos = new Set<string>();

  filas.forEach((r, i) => {
    const filaExcel = i + 2;
    const motivos: string[] = [];
    const anio = anioDe(r);
    if (anio === null || Math.trunc(anio) < ANIO_MIN || Math.trunc(anio) > ANIO_MAX) motivos.push('anio_invalido');

    const sedeRaw = cSede && !esNulo(r[cSede]) ? norm(r[cSede]) : '';
    const sede = sedesOk.get(sedeRaw.toUpperCase().replace('SEDE ', ''));
    if (!sede) motivos.push('sede_invalida_o_vacia');

    const idEst = cId && !esNulo(r[cId]) ? String(r[cId]).trim() : '';
    const clave = `${idEst}|${anio}`;
    if (!idEst) motivos.push('sin_id');
    else if (vistos.has(clave)) motivos.push('duplicado_id_anio');
    vistos.add(clave);

    // Nunca se inventa el sexo: si no viene en la fuente queda "No registrado".
    const sexoRaw = cSexo && !esNulo(r[cSexo]) ? String(r[cSexo]).trim().toUpperCase() : '';
    const sexo: Sexo = sexoRaw.startsWith('F') || sexoRaw.startsWith('MUJ')
      ? 'Femenino'
      : sexoRaw.startsWith('M') || sexoRaw.startsWith('H') || sexoRaw.startsWith('VAR')
        ? 'Masculino'
        : 'No registrado';

    const lit = anio !== null ? (escalaLiteral[String(Math.trunc(anio))] ?? true) : true;
    const notas: Record<string, NotaEstandar> = {};
    for (const [cur, d] of Object.entries(cursos)) {
      for (const [etapa, col] of Object.entries(d)) {
        if (anio === 2026 && ['B3', 'B4', 'FINAL'].includes(etapa)) continue; // 2026 aún no tiene cierre
        const [v, err] = estandarizar(r[col], lit);
        if (v !== null) notas[`${cur}_${etapa}`] = v;
        if (err) {
          motivos.push(`${cur}_${etapa}:${err}`);
          revisar.push({
            fila_excel: filaExcel, ID_Estudiante: idEst, anio, sede: sedeRaw, columna: col,
            valor_original: esNulo(r[col]) ? '' : String(r[col]), problema: err,
          });
        }
      }
    }

    if (motivos.length) {
      excluidos.push({ fila_excel: filaExcel, ID_Estudiante: idEst, anio, sede: sedeRaw || '(vacía)', motivos: motivos.join(' | ') });
    } else {
      validos.push({
        fila_excel: filaExcel, ID_Estudiante: idEst, anio: anio as number, sede: sede as string, sexo,
        grado: cGrado && !esNulo(r[cGrado]) ? String(r[cGrado]) : null, notas,
      });
    }
  });

  const motivoSimple = excluidos.flatMap(e => e.motivos.split(' | ').map(m => m.replace(/^[^:]*:/, '')));
  const perfil: PerfilDataset = {
    archivo,
    hoja_usada: nombreHoja,
    hojas: Object.fromEntries(Object.entries(hojas).map(([k, v]) => [k, v.length])),
    formato_detectado: formato,
    advertencia_fuga: formato === 'por_bimestre' ? null
      : "Una sola nota por curso: si la etiqueta 'riesgo' se calcula con esas mismas notas, " +
        'el modelo tiene fuga de información. Se necesitan notas por bimestre (B1, B2 y Final).',
    columnas_identificadas: { id: cId, sexo: cSexo, sede: cSede, anio: cAnio, grado: cGrado },
    cursos: Object.fromEntries(Object.entries(cursos).map(([k, v]) => [k, Object.keys(v)])),
    total_bruto: filas.length,
    total_validos: validos.length,
    total_excluidos: excluidos.length,
    porcentaje_excluidos: Math.round((10000 * excluidos.length) / Math.max(filas.length, 1)) / 100,
    motivos_exclusion: ordenarDesc(contar(motivoSimple, m => m)),
    excluidos_por_sede: ordenarDesc(contar(excluidos, e => e.sede)),
    excluidos_por_anio: ordenarClave(contar(excluidos.filter(e => e.anio !== null), e => Math.trunc(e.anio as number))),
    validos_por_anio: ordenarClave(contar(validos, v => Math.trunc(v.anio))),
    validos_por_sede: ordenarDesc(contar(validos, v => v.sede)),
    sexo_no_registrado: validos.filter(v => v.sexo === 'No registrado').length,
    escala_literal_por_anio: escalaLiteral,
  };
  return { perfil, validos, excluidos, revisar };
}

export async function auditarArchivo(file: File): Promise<ResultadoAuditoria> {
  const data = await file.arrayBuffer();
  const esCsv = file.name.toLowerCase().endsWith('.csv');
  const wb = esCsv
    ? XLSX.read(new TextDecoder('utf-8').decode(data), { type: 'string', raw: true })
    : XLSX.read(data, { type: 'array' });
  const hojas: Record<string, Record<string, unknown>[]> = {};
  for (const nombre of wb.SheetNames) {
    // raw: el valor tal como está en la celda; defval null: una celda vacía es un nulo, no un 2
    hojas[esCsv ? 'csv' : nombre] = XLSX.utils.sheet_to_json(wb.Sheets[nombre], { defval: null, raw: true });
  }
  return auditarFilas(hojas, file.name);
}

/**
 * Riesgo observado (descriptivo, no es predicción): algún curso en C en la nota de cierre.
 * Por bimestre: columnas FINAL. Una nota por curso: esa única nota. 2026 no tiene cierre.
 */
export function riesgoObservado(r: RegistroValido, formato: FormatoDataset): 0 | 1 | null {
  if (r.anio === 2026) return null;
  const sufijos = formato === 'por_bimestre' ? ['_FINAL', '_B4'] : ['_UNICA'];
  // Igual que el pipeline: si no hay columna Final se usa B4 como nota de cierre.
  let finales: [string, NotaEstandar][] = [];
  for (const suf of sufijos) {
    finales = Object.entries(r.notas).filter(([k]) => k.endsWith(suf));
    if (finales.length) break;
  }
  if (!finales.length) return null;
  return finales.some(([, v]) => v === 0) ? 1 : 0;
}
