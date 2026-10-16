import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { auditarFilas } from '../src/utils/validacion.ts';
const [archivo, perfilPy, exclPy] = process.argv.slice(2);
const esCsv = archivo.endsWith('.csv');
const wb = esCsv ? XLSX.read(fs.readFileSync(archivo, 'utf-8'), { type: 'string', raw: true }) : XLSX.read(fs.readFileSync(archivo), { type: 'buffer' });
const hojas: any = {};
for (const n of wb.SheetNames) hojas[esCsv ? 'csv' : n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: null, raw: true });
const r = auditarFilas(hojas, archivo);
const py = JSON.parse(fs.readFileSync(perfilPy, 'utf-8'));
const claves = ['formato_detectado','total_bruto','total_validos','total_excluidos','porcentaje_excluidos','motivos_exclusion','excluidos_por_sede','excluidos_por_anio','validos_por_anio','validos_por_sede','sexo_no_registrado','escala_literal_por_anio','cursos','columnas_identificadas'];
let ok = true;
const norm = (o: any) => JSON.stringify(o && typeof o === 'object' && !Array.isArray(o) ? Object.fromEntries(Object.entries(o).sort()) : o);
for (const k of claves) {
  const a = norm((r.perfil as any)[k]), b = norm(py[k]);
  if (a !== b) { ok = false; console.log('DIFF', k, '\n TS:', a, '\n PY:', b); }
}
const exPy = XLSX.utils.sheet_to_json<any>(XLSX.read(fs.readFileSync(exclPy, 'utf-8').replace(/^﻿/, ''), { type: 'string', raw: true }).Sheets.Sheet1, { raw: false });
const fa = r.excluidos.map(e => `${e.fila_excel}:${e.motivos}`).join('\n');
const fb = exPy.map((e: any) => `${e.fila_excel}:${e.motivos}`).join('\n');
if (fa !== fb) { ok = false; console.log('DIFF filas excluidas'); }
console.log(ok ? 'IGUALES' : 'DISTINTOS', r.perfil.total_validos, r.excluidos.length);
