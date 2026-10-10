import { StudentPrediction, RiskLevel, Gender, DatasetCohortType } from '../types';

/**
 * Simula la inferencia de un ensamble Random Forest de 150 árboles de decisión
 * entrenado para clasificación multiclase de riesgo de rendimiento académico.
 * Soporta la cohorte de prueba 2026 (solo con B1 y B2) y cohortes históricas (2020-2025).
 */
export function predictStudentRisk(data: {
  nombre_codigo: string;
  sexo: Gender;
  pais: string;
  cursos: number;
  promedio_previo?: number;
  asistencia_pct?: number;
  horas_estudio_semanal?: number;
  anio?: number;
  b1?: number;
  b2?: number;
  b3?: number;
  b4?: number;
}): StudentPrediction {
  const totalArboles = 150;
  const anio = data.anio ?? 2026;
  const esPrueba2026 = anio === 2026;
  
  // Calcular notas de bimestres y promedio consolidado B1 + B2
  let b1 = data.b1;
  let b2 = data.b2;
  let promB1B2 = data.promedio_previo ?? 13.0;

  if (b1 !== undefined && b2 !== undefined) {
    promB1B2 = Number(((b1 + b2) / 2).toFixed(2));
  } else if (b1 !== undefined) {
    promB1B2 = b1;
    b2 = Number(Math.max(0, Math.min(20, b1 + (Math.random() * 2 - 1))).toFixed(1));
  } else if (data.promedio_previo !== undefined) {
    promB1B2 = data.promedio_previo;
    b1 = Number(Math.max(0, Math.min(20, promB1B2 + 0.4)).toFixed(1));
    b2 = Number(Math.max(0, Math.min(20, promB1B2 - 0.4)).toFixed(1));
  } else {
    b1 = 13.5;
    b2 = 12.5;
    promB1B2 = 13.0;
  }

  const asistencia = data.asistencia_pct ?? 80;
  const horas = data.horas_estudio_semanal ?? 10;
  const cursos = data.cursos;

  // Cálculo del score de riesgo continuo entre 0.0 y 1.0
  // Ponderaciones inspiradas en Feature Importance del modelo Random Forest
  // 1. Promedio consolidado de Bimestres 1 y 2 (escala 0 - 20) -> Menor promedio = más riesgo
  const scorePromedio = Math.max(0, Math.min(1, (18 - promB1B2) / 10)); // Si promedio es 8 -> 1.0, si es 18 -> 0.0
  
  // 2. Asistencia (escala 0 - 100%) -> Menor asistencia = más riesgo
  const scoreAsistencia = Math.max(0, Math.min(1, (95 - asistencia) / 45)); // Si 50% -> 1.0, si 95% -> 0.0
  
  // 3. Cantidad de Cursos -> Más de 5 cursos incrementa significativamente la sobrecarga
  let scoreCursos = 0.2;
  if (cursos >= 7) scoreCursos = 0.95;
  else if (cursos === 6) scoreCursos = 0.65;
  else if (cursos === 5) scoreCursos = 0.35;
  else scoreCursos = 0.15;

  // 4. Horas de estudio semanal -> Menos de 8 hrs es crítico
  const scoreHoras = Math.max(0, Math.min(1, (16 - horas) / 12));

  // Combinación ponderada con leve varianza estocástica propia de ensamble bootstrap (bagging)
  const scoreTotal = (
    scorePromedio * 0.40 +
    scoreAsistencia * 0.24 +
    scoreCursos * 0.20 +
    scoreHoras * 0.16
  );

  const probRiesgo = Math.max(0.05, Math.min(0.96, Number(scoreTotal.toFixed(2))));

  // Votación de árboles del bosque aleatorio
  let riesgo: RiskLevel = 'Bajo';
  let votosAlto = 0;
  let votosMedio = 0;
  let votosBajo = 0;

  if (probRiesgo >= 0.65) {
    riesgo = 'Alto';
    votosAlto = Math.round(totalArboles * (0.75 + (probRiesgo - 0.65) * 0.6));
    votosMedio = Math.round((totalArboles - votosAlto) * 0.7);
    votosBajo = totalArboles - votosAlto - votosMedio;
  } else if (probRiesgo >= 0.38) {
    riesgo = 'Medio';
    votosMedio = Math.round(totalArboles * 0.55);
    votosAlto = Math.round(totalArboles * (probRiesgo * 0.4));
    votosBajo = totalArboles - votosMedio - votosAlto;
  } else {
    riesgo = 'Bajo';
    votosBajo = Math.round(totalArboles * (0.75 + (0.38 - probRiesgo) * 0.5));
    votosMedio = Math.round((totalArboles - votosBajo) * 0.75);
    votosAlto = totalArboles - votosBajo - votosMedio;
  }

  // Garantizar suma exacta de árboles
  votosBajo = Math.max(0, totalArboles - votosAlto - votosMedio);

  // Generar factores explicativos del modelo
  const factores: string[] = [];
  if (cursos >= 7) factores.push(`Sobrecarga académica alta (${cursos} asignaturas matriculadas)`);
  else if (cursos <= 4) factores.push(`Carga académica controlada (${cursos} asignaturas)`);

  if (asistencia < 70) factores.push(`Asistencia deficiente (${asistencia}% por debajo del umbral mínimo de 70%)`);
  else if (asistencia >= 90) factores.push(`Excelente tasa de asistencia (${asistencia}%)`);

  if (promB1B2 < 11.5) factores.push(`Promedio consolidado B1+B2 en zona crítica (${promB1B2.toFixed(1)})`);
  else if (promB1B2 >= 15.0) factores.push(`Rendimiento destacado en B1 y B2 (${promB1B2.toFixed(1)})`);

  if (horas < 8) factores.push(`Dedicación semanal insuficiente (${horas} hrs/semana)`);
  else if (horas >= 14) factores.push(`Buena disciplina de estudio autónomo (${horas} hrs/semana)`);

  if (factores.length === 0) {
    factores.push('Parámetros académicos dentro de los rangos promedios esperados');
  }

  // Separar código y nombre si viene en formato "COD - Nombre"
  let codigo = `EST-${anio}-${Math.floor(100 + Math.random() * 900)}`;
  let nombre = data.nombre_codigo;
  if (data.nombre_codigo.includes('-')) {
    const parts = data.nombre_codigo.split('-');
    if (parts.length >= 2) {
      codigo = parts[0].trim();
      nombre = parts.slice(1).join('-').trim();
    }
  }

  const tipo_conjunto: DatasetCohortType = esPrueba2026 ? 'prueba_2026' : 'entrenamiento';

  return {
    id: `pred-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    anio,
    nombre_codigo: data.nombre_codigo,
    codigo,
    nombre,
    sexo: data.sexo,
    pais: data.pais,
    cursos: data.cursos,
    bimestre_1: b1 ?? promB1B2,
    bimestre_2: b2 ?? promB1B2,
    bimestre_3: esPrueba2026 ? undefined : data.b3,
    bimestre_4: esPrueba2026 ? undefined : data.b4,
    promedio_b1_b2: promB1B2,
    promedio_final: esPrueba2026 ? undefined : (data.b3 && data.b4 ? Number(((b1 + b2 + data.b3 + data.b4) / 4).toFixed(2)) : promB1B2),
    riesgo_academico: riesgo,
    probabilidad_riesgo: probRiesgo,
    asistencia_pct: asistencia,
    horas_estudio_semanal: horas,
    tipo_conjunto,
    votos_arboles: {
      alto: votosAlto,
      medio: votosMedio,
      bajo: votosBajo,
      total_arboles: totalArboles,
    },
    factores_clave: factores,
    fecha_evaluacion: new Date().toISOString().split('T')[0],
  };
}

/**
 * Exporta la lista de predicciones a un archivo CSV con cabeceras estándar
 * y codificación UTF-8 con BOM para perfecta visualización en Excel y LibreOffice.
 */
export function exportToCSV(students: StudentPrediction[], filename = 'predicciones_random_forest.csv') {
  const headers = [
    'anio',
    'cohorte',
    'nombre_o_codigo_estudiante',
    'sexo',
    'pais',
    'cursos',
    'bimestre_1',
    'bimestre_2',
    'promedio_b1_b2',
    'riesgo_academico',
    'probabilidad_riesgo',
    'asistencia_pct',
    'horas_estudio_semanal',
    'fecha_evaluacion',
  ];

  const rows = students.map((s) => [
    s.anio,
    s.tipo_conjunto === 'prueba_2026' ? 'Prueba 2026 (B1+B2)' : 'Entrenamiento (2020-2025)',
    `"${(s.nombre_codigo || `${s.codigo} - ${s.nombre}`).replace(/"/g, '""')}"`,
    `"${s.sexo}"`,
    `"${s.pais}"`,
    s.cursos,
    s.bimestre_1,
    s.bimestre_2,
    s.promedio_b1_b2,
    `"${s.riesgo_academico}"`,
    s.probabilidad_riesgo,
    s.asistencia_pct,
    s.horas_estudio_semanal,
    `"${s.fecha_evaluacion || ''}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parser de CSV inteligente que reconoce años 2020 a 2026 y bimestres
 */
export function parseCSV(csvText: string): StudentPrediction[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('El archivo CSV debe contener al menos una cabecera y una fila de datos.');
  }

  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') ? ';' : ',';

  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const headers = parseLine(lines[0]).map((h) =>
    h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  );

  const findIndex = (patterns: string[]): number => {
    return headers.findIndex((h) =>
      patterns.some((pattern) => h.includes(pattern) || pattern.includes(h))
    );
  };

  const idxAnio = findIndex(['anio', 'ano', 'year']);
  const idxNombreCodigo = findIndex(['nombre', 'codigo', 'estudiante', 'student', 'id']);
  const idxSexo = findIndex(['sexo', 'genero', 'gender']);
  const idxPais = findIndex(['pais', 'country', 'nacion']);
  const idxCursos = findIndex(['curso', 'asignatura', 'materia', 'subject']);
  const idxB1 = findIndex(['bimestre_1', 'b1', 'bimestre 1']);
  const idxB2 = findIndex(['bimestre_2', 'b2', 'bimestre 2']);
  const idxB3 = findIndex(['bimestre_3', 'b3', 'bimestre 3']);
  const idxB4 = findIndex(['bimestre_4', 'b4', 'bimestre 4']);
  const idxPromB1B2 = findIndex(['promedio_b1_b2', 'promedio', 'nota', 'gpa']);
  const idxRiesgo = findIndex(['riesgo', 'risk', 'prediccion']);
  const idxAsistencia = findIndex(['asistencia', 'attendance']);
  const idxHoras = findIndex(['horas', 'estudio']);

  const parsedStudents: StudentPrediction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    const values = parseLine(rawLine);

    let anio = idxAnio !== -1 && values[idxAnio] ? parseInt(values[idxAnio], 10) : 2026;
    if (isNaN(anio) || anio < 2018 || anio > 2030) anio = 2026;

    const rawNombreCodigo = idxNombreCodigo !== -1 && values[idxNombreCodigo] 
      ? values[idxNombreCodigo] 
      : `EST-${anio}-${100 + i}`;
      
    const rawSexoStr = idxSexo !== -1 && values[idxSexo] ? values[idxSexo].toLowerCase() : 'femenino';
    const sexo: Gender = rawSexoStr.startsWith('m') ? 'Masculino' : rawSexoStr.startsWith('o') ? 'Otro' : 'Femenino';

    const pais = idxPais !== -1 && values[idxPais] ? values[idxPais] : 'Perú';
    const cursosNum = idxCursos !== -1 && values[idxCursos] ? parseInt(values[idxCursos], 10) || 5 : 5;

    const b1 = idxB1 !== -1 && values[idxB1] ? parseFloat(values[idxB1]) : undefined;
    const b2 = idxB2 !== -1 && values[idxB2] ? parseFloat(values[idxB2]) : undefined;
    const b3 = idxB3 !== -1 && values[idxB3] ? parseFloat(values[idxB3]) : undefined;
    const b4 = idxB4 !== -1 && values[idxB4] ? parseFloat(values[idxB4]) : undefined;

    let prom = 13.0;
    if (idxPromB1B2 !== -1 && values[idxPromB1B2]) {
      prom = parseFloat(values[idxPromB1B2]) || 13.0;
    } else if (b1 !== undefined && b2 !== undefined) {
      prom = Number(((b1 + b2) / 2).toFixed(2));
    }

    const asistencia = idxAsistencia !== -1 && values[idxAsistencia] ? parseFloat(values[idxAsistencia]) : 80;
    const horas = idxHoras !== -1 && values[idxHoras] ? parseFloat(values[idxHoras]) : 10;

    const rawRiesgo = idxRiesgo !== -1 && values[idxRiesgo] ? values[idxRiesgo].toLowerCase() : '';
    let riesgoAcademico: RiskLevel | null = null;
    if (rawRiesgo.includes('alto') || rawRiesgo.includes('high')) riesgoAcademico = 'Alto';
    else if (rawRiesgo.includes('medio') || rawRiesgo.includes('med')) riesgoAcademico = 'Medio';
    else if (rawRiesgo.includes('bajo') || rawRiesgo.includes('low')) riesgoAcademico = 'Bajo';

    const esPrueba2026 = anio === 2026;

    const pred = predictStudentRisk({
      nombre_codigo: rawNombreCodigo,
      sexo,
      pais,
      cursos: cursosNum,
      promedio_previo: prom,
      asistencia_pct: asistencia,
      horas_estudio_semanal: horas,
      anio,
      b1,
      b2,
      b3: esPrueba2026 ? undefined : b3,
      b4: esPrueba2026 ? undefined : b4,
    });

    if (riesgoAcademico && !esPrueba2026) {
      pred.riesgo_academico = riesgoAcademico;
    }

    parsedStudents.push(pred);
  }

  return parsedStudents;
}
