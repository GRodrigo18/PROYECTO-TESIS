import * as XLSX from 'xlsx';
import { SEDES_VALIDAS } from './validacion';

/** Descarga filas como CSV (UTF-8 con BOM, separador ';' para Excel en español). */
export function descargarCsv(nombre: string, filas: Record<string, unknown>[]) {
  const ws = XLSX.utils.json_to_sheet(filas);
  const csv = XLSX.utils.sheet_to_csv(ws, { FS: ';' });
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const CURSOS_PLANTILLA = ['Comunicacion', 'Ingles', 'Matematica', 'Ciencia y Tecnologia', 'Ciencias Sociales'];

/**
 * Plantilla con el formato que necesita el pipeline: una fila por estudiante-año y,
 * por cada curso, B1, B2 y Final. Solo encabezados: no trae datos de ejemplo.
 */
export function descargarPlantilla() {
  const encabezados = ['ID_Estudiante', 'Sexo', 'Sede', 'Grado', 'Año_Academico',
    ...CURSOS_PLANTILLA.flatMap(c => [`${c}_B1`, `${c}_B2`, `${c}_Final`])];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([encabezados]), 'Notas');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Columna', 'Contenido'],
    ['ID_Estudiante', 'Código del estudiante (idealmente estable entre años)'],
    ['Sexo', 'Femenino / Masculino, tal como figura en el sistema'],
    ['Sede', SEDES_VALIDAS.join(' / ')],
    ['Grado', 'Número de grado'],
    ['Año_Academico', '2020 a 2026'],
    ['<Curso>_B1, <Curso>_B2', 'Nota de cada bimestre (no su promedio): 0-20 o AD/A/B/C'],
    ['<Curso>_Final', 'Nota de cierre del año (o <Curso>_B4). En 2026 se deja vacía.'],
    ['Escala', 'AD 18-20 · A 14-17 · B 11-13 · C 0-10'],
  ]), 'Instrucciones');
  XLSX.writeFile(wb, 'plantilla_notas_por_bimestre.xlsx');
}
