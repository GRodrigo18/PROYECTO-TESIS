import * as XLSX from 'xlsx';
import { StudentPrediction, Gender, RiskLevel } from '../types';
import { predictStudentRisk } from './randomForestSimulator';

/**
 * Parsea un archivo Excel (.xlsx, .xls) o CSV a una lista de StudentPrediction.
 */
export async function parseExcelOrCsvFile(file: File): Promise<StudentPrediction[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  let allStudents: StudentPrediction[] = [];

  // Recorrer las hojas del libro de Excel
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

    const parsedRows = parseRawRows(rawRows, sheetName);
    allStudents = [...allStudents, ...parsedRows];
  }

  return allStudents;
}

/**
 * Normaliza y mapea filas leídas de una hoja de cálculo
 */
function parseRawRows(rows: Record<string, any>[], sheetName: string): StudentPrediction[] {
  const students: StudentPrediction[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // Normalizar claves a minúsculas y sin acentos para flexibilidad
    const normalizedMap: Record<string, any> = {};
    for (const key of Object.keys(row)) {
      const cleanKey = key
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_');
      normalizedMap[cleanKey] = row[key];
    }

    // Detectar Nombre / Código
    const rawNombreCodigo = 
      normalizedMap['nombre_o_codigo_estudiante'] ||
      normalizedMap['nombre_codigo'] ||
      normalizedMap['estudiante'] ||
      normalizedMap['nombre'] ||
      normalizedMap['codigo'] ||
      `EST-AUTO-${i + 1}`;

    const rawSexo = normalizedMap['sexo'] || normalizedMap['genero'] || 'Otro';
    const rawPais = normalizedMap['pais'] || normalizedMap['nacionalidad'] || 'Perú';
    const rawCursos = Number(normalizedMap['cursos'] || normalizedMap['asignaturas'] || normalizedMap['materias'] || 5);

    // Año de cohorte
    let anio = Number(normalizedMap['anio'] || normalizedMap['ano'] || normalizedMap['year'] || 0);
    if (!anio || isNaN(anio) || anio < 2018 || anio > 2030) {
      if (sheetName.includes('2026') || rawNombreCodigo.includes('2026')) {
        anio = 2026;
      } else if (sheetName.includes('2025')) {
        anio = 2025;
      } else if (sheetName.includes('2024')) {
        anio = 2024;
      } else {
        anio = 2026; // Si no se especifica, por defecto año de prueba
      }
    }

    // Bimestres
    const b1 = normalizedMap['bimestre_1'] !== '' ? Number(normalizedMap['bimestre_1']) : undefined;
    const b2 = normalizedMap['bimestre_2'] !== '' ? Number(normalizedMap['bimestre_2']) : undefined;
    const b3 = normalizedMap['bimestre_3'] !== '' ? Number(normalizedMap['bimestre_3']) : undefined;
    const b4 = normalizedMap['bimestre_4'] !== '' ? Number(normalizedMap['bimestre_4']) : undefined;

    // Calcular promedio B1 y B2
    let promB1B2 = 13.0;
    if (normalizedMap['promedio_b1_b2'] !== '' && !isNaN(Number(normalizedMap['promedio_b1_b2']))) {
      promB1B2 = Number(normalizedMap['promedio_b1_b2']);
    } else if (b1 !== undefined && b2 !== undefined && !isNaN(b1) && !isNaN(b2)) {
      promB1B2 = Number(((b1 + b2) / 2).toFixed(2));
    } else if (b1 !== undefined && !isNaN(b1)) {
      promB1B2 = b1;
    } else if (normalizedMap['promedio_previo'] !== '' && !isNaN(Number(normalizedMap['promedio_previo']))) {
      promB1B2 = Number(normalizedMap['promedio_previo']);
    }

    // Asistencia y horas de estudio
    const asistencia = Number(normalizedMap['asistencia_pct'] || normalizedMap['asistencia'] || 80);
    const horasEstudio = Number(normalizedMap['horas_estudio_semanal'] || normalizedMap['horas_estudio'] || 10);

    // Mapeo de sexo
    let sexo: Gender = 'Otro';
    const sLower = String(rawSexo).toLowerCase();
    if (sLower.startsWith('f') || sLower.includes('fem') || sLower.includes('muj')) {
      sexo = 'Femenino';
    } else if (sLower.startsWith('m') || sLower.includes('masc') || sLower.includes('var')) {
      sexo = 'Masculino';
    }

    // Mapeo de riesgo
    let riesgoAcademico: RiskLevel | null = null;
    const rawRiesgo = String(normalizedMap['riesgo_academico'] || normalizedMap['riesgo'] || '').toLowerCase();
    if (rawRiesgo.includes('alt')) riesgoAcademico = 'Alto';
    else if (rawRiesgo.includes('med')) riesgoAcademico = 'Medio';
    else if (rawRiesgo.includes('baj')) riesgoAcademico = 'Bajo';

    // Determinar cohorte
    const esPrueba2026 = anio === 2026;

    // Si no trae riesgo o es 2026 (cohorte de prueba), predecir con el modelo Random Forest
    const prediction = predictStudentRisk({
      nombre_codigo: String(rawNombreCodigo),
      sexo,
      pais: String(rawPais).trim(),
      cursos: isNaN(rawCursos) ? 5 : rawCursos,
      promedio_previo: promB1B2,
      asistencia_pct: isNaN(asistencia) ? 80 : asistencia,
      horas_estudio_semanal: isNaN(horasEstudio) ? 10 : horasEstudio,
      anio,
      b1,
      b2,
      b3: esPrueba2026 ? undefined : b3,
      b4: esPrueba2026 ? undefined : b4,
    });

    // Si viene riesgo histórico en 2020-2025, respetarlo
    if (riesgoAcademico && !esPrueba2026) {
      prediction.riesgo_academico = riesgoAcademico;
    }

    prediction.id = `import-${Date.now()}-${i}`;
    prediction.tipo_conjunto = esPrueba2026 ? 'prueba_2026' : 'entrenamiento';
    prediction.anio = anio;
    prediction.bimestre_1 = b1 ?? (promB1B2 + 0.5);
    prediction.bimestre_2 = b2 ?? (promB1B2 - 0.5);
    prediction.promedio_b1_b2 = promB1B2;
    if (!esPrueba2026) {
      prediction.bimestre_3 = b3 ?? promB1B2;
      prediction.bimestre_4 = b4 ?? promB1B2;
      prediction.promedio_final = Number((((prediction.bimestre_1 + prediction.bimestre_2 + (prediction.bimestre_3 ?? promB1B2) + (prediction.bimestre_4 ?? promB1B2)) / 4)).toFixed(2));
    }

    students.push(prediction);
  }

  return students;
}

/**
 * Genera y descarga el archivo Excel oficial (.xlsx) de plantilla para el proyecto
 */
export function downloadOfficialExcelTemplate() {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Datos Históricos de Entrenamiento (2020 - 2025)
  const trainingData = [
    {
      'año': 2020,
      'nombre o codigo estudiante': 'EST-2020-001 - Sofía Montenegro',
      'sexo': 'Femenino',
      'pais': 'Perú',
      'cursos': 6,
      'bimestre_1': 14.5,
      'bimestre_2': 15.0,
      'bimestre_3': 16.0,
      'bimestre_4': 16.5,
      'promedio_b1_b2': 14.75,
      'promedio_final': 15.5,
      'asistencia_pct': 92,
      'horas_estudio_semanal': 16,
      'riesgo_academico': 'Bajo'
    },
    {
      'año': 2021,
      'nombre o codigo estudiante': 'EST-2021-042 - Carlos Becerra',
      'sexo': 'Masculino',
      'pais': 'Colombia',
      'cursos': 7,
      'bimestre_1': 9.5,
      'bimestre_2': 10.0,
      'bimestre_3': 9.0,
      'bimestre_4': 10.5,
      'promedio_b1_b2': 9.75,
      'promedio_final': 9.75,
      'asistencia_pct': 62,
      'horas_estudio_semanal': 5,
      'riesgo_academico': 'Alto'
    },
    {
      'año': 2022,
      'nombre o codigo estudiante': 'EST-2022-108 - Mariana Torres',
      'sexo': 'Femenino',
      'pais': 'Chile',
      'cursos': 5,
      'bimestre_1': 12.0,
      'bimestre_2': 13.0,
      'bimestre_3': 13.5,
      'bimestre_4': 14.0,
      'promedio_b1_b2': 12.5,
      'promedio_final': 13.1,
      'asistencia_pct': 84,
      'horas_estudio_semanal': 11,
      'riesgo_academico': 'Medio'
    },
    {
      'año': 2023,
      'nombre o codigo estudiante': 'EST-2023-215 - Diego Valenzuela',
      'sexo': 'Masculino',
      'pais': 'México',
      'cursos': 7,
      'bimestre_1': 8.5,
      'bimestre_2': 9.0,
      'bimestre_3': 10.0,
      'bimestre_4': 9.5,
      'promedio_b1_b2': 8.75,
      'promedio_final': 9.25,
      'asistencia_pct': 58,
      'horas_estudio_semanal': 6,
      'riesgo_academico': 'Alto'
    },
    {
      'año': 2024,
      'nombre o codigo estudiante': 'EST-2024-301 - Valentina Ríos',
      'sexo': 'Femenino',
      'pais': 'Perú',
      'cursos': 4,
      'bimestre_1': 17.0,
      'bimestre_2': 16.5,
      'bimestre_3': 17.5,
      'bimestre_4': 18.0,
      'promedio_b1_b2': 16.75,
      'promedio_final': 17.25,
      'asistencia_pct': 96,
      'horas_estudio_semanal': 18,
      'riesgo_academico': 'Bajo'
    },
    {
      'año': 2025,
      'nombre o codigo estudiante': 'EST-2025-412 - Lucas Santillán',
      'sexo': 'Masculino',
      'pais': 'Argentina',
      'cursos': 6,
      'bimestre_1': 11.5,
      'bimestre_2': 12.0,
      'bimestre_3': 12.5,
      'bimestre_4': 12.0,
      'promedio_b1_b2': 11.75,
      'promedio_final': 12.0,
      'asistencia_pct': 78,
      'horas_estudio_semanal': 9,
      'riesgo_academico': 'Medio'
    }
  ];

  const wsTraining = XLSX.utils.json_to_sheet(trainingData);
  XLSX.utils.book_append_sheet(wb, wsTraining, 'Entrenamiento_2020_2025');

  // Hoja 2: Datos de Prueba 2026 (Solo Bimestres 1 y 2 consolidados)
  const testData2026 = [
    {
      'año': 2026,
      'nombre o codigo estudiante': 'EST-2026-001 - Gabriel Salcedo',
      'sexo': 'Masculino',
      'pais': 'Perú',
      'cursos': 7,
      'bimestre_1': 10.0,
      'bimestre_2': 10.5,
      'promedio_b1_b2': 10.25,
      'asistencia_pct': 66,
      'horas_estudio_semanal': 6,
      'nota': 'Bimestres 3 y 4 aún en curso (Objetivo de Alerta Temprana)'
    },
    {
      'año': 2026,
      'nombre o codigo estudiante': 'EST-2026-002 - Daniela Navarro',
      'sexo': 'Femenino',
      'pais': 'Colombia',
      'cursos': 5,
      'bimestre_1': 13.0,
      'bimestre_2': 13.5,
      'promedio_b1_b2': 13.25,
      'asistencia_pct': 82,
      'horas_estudio_semanal': 10,
      'nota': 'Listo para evaluar por el modelo Random Forest'
    },
    {
      'año': 2026,
      'nombre o codigo estudiante': 'EST-2026-003 - Esteban Prieto',
      'sexo': 'Masculino',
      'pais': 'Chile',
      'cursos': 4,
      'bimestre_1': 16.5,
      'bimestre_2': 17.0,
      'promedio_b1_b2': 16.75,
      'asistencia_pct': 95,
      'horas_estudio_semanal': 15,
      'nota': 'Listo para evaluar por el modelo Random Forest'
    },
    {
      'año': 2026,
      'nombre o codigo estudiante': 'EST-2026-004 - Valeria Cárdenas',
      'sexo': 'Femenino',
      'pais': 'México',
      'cursos': 6,
      'bimestre_1': 9.0,
      'bimestre_2': 9.5,
      'promedio_b1_b2': 9.25,
      'asistencia_pct': 60,
      'horas_estudio_semanal': 5,
      'nota': 'Listo para evaluar por el modelo Random Forest'
    },
    {
      'año': 2026,
      'nombre o codigo estudiante': 'EST-2026-005 - Lucas Santander',
      'sexo': 'Masculino',
      'pais': 'Argentina',
      'cursos': 5,
      'bimestre_1': 15.0,
      'bimestre_2': 15.5,
      'promedio_b1_b2': 15.25,
      'asistencia_pct': 89,
      'horas_estudio_semanal': 12,
      'nota': 'Listo para evaluar por el modelo Random Forest'
    }
  ];

  const wsTest = XLSX.utils.json_to_sheet(testData2026);
  XLSX.utils.book_append_sheet(wb, wsTest, 'Prueba_2026_B1_B2');

  // Hoja 3: Diccionario de Variables
  const dictData = [
    { 'Columna': 'año', 'Tipo': 'Entero', 'Descripción': 'Año lectivo del estudiante (2020 al 2026)' },
    { 'Columna': 'nombre o codigo estudiante', 'Tipo': 'Texto', 'Descripción': 'Identificador oficial único del estudiante' },
    { 'Columna': 'sexo', 'Tipo': 'Texto', 'Descripción': 'Femenino / Masculino / Otro' },
    { 'Columna': 'pais', 'Tipo': 'Texto', 'Descripción': 'País de procedencia (Perú, Colombia, Chile, México, etc.)' },
    { 'Columna': 'cursos', 'Tipo': 'Entero', 'Descripción': 'Número de asignaturas matriculadas (1 a 10)' },
    { 'Columna': 'bimestre_1', 'Tipo': 'Numérico', 'Descripción': 'Calificación obtenida en el Bimestre 1 (0 a 20)' },
    { 'Columna': 'bimestre_2', 'Tipo': 'Numérico', 'Descripción': 'Calificación obtenida en el Bimestre 2 (0 a 20)' },
    { 'Columna': 'promedio_b1_b2', 'Tipo': 'Numérico', 'Descripción': 'Promedio consolidado de Bimestres 1 y 2' },
    { 'Columna': 'riesgo_academico', 'Tipo': 'Texto', 'Descripción': 'Alto, Medio, Bajo (Etiqueta real en entrenamiento 2020-2025; objetivo a predecir en 2026)' }
  ];

  const wsDict = XLSX.utils.json_to_sheet(dictData);
  XLSX.utils.book_append_sheet(wb, wsDict, 'Diccionario_Variables');

  // Descargar archivo
  XLSX.writeFile(wb, 'Plantilla_Rendimiento_Academico_2020_2026.xlsx');
}

/**
 * Exporta un dataset filtrado o de predicción a archivo Excel (.xlsx)
 */
export function exportPredictionsToExcelFile(students: StudentPrediction[], fileName: string) {
  const wb = XLSX.utils.book_new();

  const formattedRows = students.map((s, index) => ({
    'N°': index + 1,
    'Año': s.anio,
    'Cohorte': s.tipo_conjunto === 'prueba_2026' ? 'Prueba (2026)' : 'Entrenamiento (Histórico)',
    'Nombre o Código Estudiante': s.nombre_codigo,
    'Código': s.codigo,
    'Nombre': s.nombre,
    'Sexo': s.sexo,
    'País': s.pais,
    'Cursos': s.cursos,
    'Bimestre 1': s.bimestre_1,
    'Bimestre 2': s.bimestre_2,
    'Promedio B1+B2': s.promedio_b1_b2,
    'Bimestre 3': s.bimestre_3 ?? 'En curso',
    'Bimestre 4': s.bimestre_4 ?? 'En curso',
    'Riesgo Académico': s.riesgo_academico,
    'Probabilidad de Riesgo': `${(s.probabilidad_riesgo * 100).toFixed(1)}%`,
    'Tasa de Asistencia': `${s.asistencia_pct}%`,
    'Horas Estudio/Semana': s.horas_estudio_semanal,
    'Diagnóstico del Modelo': s.factores_clave?.join(' | ') || 'Sin observaciones'
  }));

  const ws = XLSX.utils.json_to_sheet(formattedRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Predicciones');

  XLSX.writeFile(wb, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
}
