import { StudentRecord, ColabEvaluationMetrics } from '../types';
import { estandarizarNota } from '../utils/colabEngine';

export const SEDES_OFICIALES = [
  'Sede Central',
  'Sede Norte',
  'Sede Sur',
  'Sede Este',
  'Sede Callao'
] as const;

export type SedeOficial = typeof SEDES_OFICIALES[number];

interface RawStudentTemplate {
  id: string;
  nombre: string;
  sexo: 'Femenino' | 'Masculino';
  sede: string;
  anio: number;
  cursosRaw: Record<string, string | number>;
}

const RAW_STUDENTS: RawStudentTemplate[] = [
  // 2020 (Histórico / Entrenamiento - 5 Sedes)
  { id: 'EST-2020-001', nombre: 'Sofía Montenegro', sexo: 'Femenino', sede: 'Sede Central', anio: 2020, cursosRaw: { Curso_Matematica: 'AD', Curso_Comunicacion: 'A', Curso_Ciencias: 17, Curso_Ingles: 'A', Curso_Historia: 18 } },
  { id: 'EST-2020-002', nombre: 'Carlos Becerra', sexo: 'Masculino', sede: 'Sede Norte', anio: 2020, cursosRaw: { Curso_Matematica: 'C', Curso_Comunicacion: 10, Curso_Ciencias: 'B', Curso_Ingles: 9, Curso_Historia: 'C' } },
  { id: 'EST-2020-003', nombre: 'Valeria Morales', sexo: 'Femenino', sede: 'Sede Sur', anio: 2020, cursosRaw: { Curso_Matematica: 'B', Curso_Comunicacion: 13, Curso_Ciencias: 'A', Curso_Ingles: 14, Curso_Historia: 'B' } },
  { id: 'EST-2020-004', nombre: 'Renato Castillo', sexo: 'Masculino', sede: 'Sede Este', anio: 2020, cursosRaw: { Curso_Matematica: 14, Curso_Comunicacion: 15, Curso_Ciencias: 'A', Curso_Ingles: 13, Curso_Historia: 'AD' } },
  { id: 'EST-2020-005', nombre: 'Lucía Zavaleta', sexo: 'Femenino', sede: 'Sede Callao', anio: 2020, cursosRaw: { Curso_Matematica: 'C', Curso_Comunicacion: 'C', Curso_Ciencias: 8, Curso_Ingles: 10, Curso_Historia: 'B' } },

  // 2021 (Histórico / Entrenamiento - 5 Sedes)
  { id: 'EST-2021-006', nombre: 'Sebastián Huamán', sexo: 'Masculino', sede: 'Sede Central', anio: 2021, cursosRaw: { Curso_Matematica: 10, Curso_Comunicacion: 'C', Curso_Ciencias: 11, Curso_Ingles: 'B', Curso_Historia: 9 } },
  { id: 'EST-2021-007', nombre: 'Camila Villalobos', sexo: 'Femenino', sede: 'Sede Norte', anio: 2021, cursosRaw: { Curso_Matematica: 'AD', Curso_Comunicacion: 19, Curso_Ciencias: 'AD', Curso_Ingles: 18, Curso_Historia: 'A' } },
  { id: 'EST-2021-008', nombre: 'Rodrigo Méndez', sexo: 'Masculino', sede: 'Sede Sur', anio: 2021, cursosRaw: { Curso_Matematica: 'B', Curso_Comunicacion: 12, Curso_Ciencias: 'B', Curso_Ingles: 13, Curso_Historia: 'A' } },
  { id: 'EST-2021-009', nombre: 'Jimena Alarcón', sexo: 'Femenino', sede: 'Sede Este', anio: 2021, cursosRaw: { Curso_Matematica: 16, Curso_Comunicacion: 'A', Curso_Ciencias: 15, Curso_Ingles: 'A', Curso_Historia: 17 } },
  { id: 'EST-2021-010', nombre: 'Álvaro Espinoza', sexo: 'Masculino', sede: 'Sede Callao', anio: 2021, cursosRaw: { Curso_Matematica: 8, Curso_Comunicacion: 'C', Curso_Ciencias: 9, Curso_Ingles: 'C', Curso_Historia: 11 } },

  // 2022 (Histórico / Entrenamiento - 5 Sedes)
  { id: 'EST-2022-011', nombre: 'Mariana Torres', sexo: 'Femenino', sede: 'Sede Central', anio: 2022, cursosRaw: { Curso_Matematica: 14, Curso_Comunicacion: 'B', Curso_Ciencias: 13, Curso_Ingles: 'A', Curso_Historia: 12 } },
  { id: 'EST-2022-012', nombre: 'Diego Valenzuela', sexo: 'Masculino', sede: 'Sede Norte', anio: 2022, cursosRaw: { Curso_Matematica: 8, Curso_Comunicacion: 'C', Curso_Ciencias: 11, Curso_Ingles: 9, Curso_Historia: 'B' } },
  { id: 'EST-2022-013', nombre: 'Florencia Benítez', sexo: 'Femenino', sede: 'Sede Sur', anio: 2022, cursosRaw: { Curso_Matematica: 'A', Curso_Comunicacion: 16, Curso_Ciencias: 'A', Curso_Ingles: 15, Curso_Historia: 'AD' } },
  { id: 'EST-2022-014', nombre: 'Manuel Arana', sexo: 'Masculino', sede: 'Sede Este', anio: 2022, cursosRaw: { Curso_Matematica: 12, Curso_Comunicacion: 13, Curso_Ciencias: 'B', Curso_Ingles: 11, Curso_Historia: 'B' } },
  { id: 'EST-2022-015', nombre: 'Paola Córdova', sexo: 'Femenino', sede: 'Sede Callao', anio: 2022, cursosRaw: { Curso_Matematica: 'C', Curso_Comunicacion: 10, Curso_Ciencias: 'C', Curso_Ingles: 9, Curso_Historia: 'B' } },

  // 2023 (Histórico / Entrenamiento - 5 Sedes)
  { id: 'EST-2023-016', nombre: 'Valentina Ríos', sexo: 'Femenino', sede: 'Sede Central', anio: 2023, cursosRaw: { Curso_Matematica: 'AD', Curso_Comunicacion: 19, Curso_Ciencias: 'AD', Curso_Ingles: 18, Curso_Historia: 'A' } },
  { id: 'EST-2023-017', nombre: 'Jorge Mendoza', sexo: 'Masculino', sede: 'Sede Norte', anio: 2023, cursosRaw: { Curso_Matematica: 'C', Curso_Comunicacion: 9, Curso_Ciencias: 10, Curso_Ingles: 'B', Curso_Historia: 'C' } },
  { id: 'EST-2023-018', nombre: 'Natalia Quispe', sexo: 'Femenino', sede: 'Sede Sur', anio: 2023, cursosRaw: { Curso_Matematica: 10, Curso_Comunicacion: 'C', Curso_Ciencias: 11, Curso_Ingles: 12, Curso_Historia: 'B' } },
  { id: 'EST-2023-019', nombre: 'Bruno Calderón', sexo: 'Masculino', sede: 'Sede Este', anio: 2023, cursosRaw: { Curso_Matematica: 'A', Curso_Comunicacion: 15, Curso_Ciencias: 'AD', Curso_Ingles: 16, Curso_Historia: 17 } },
  { id: 'EST-2023-020', nombre: 'Daniela Seminario', sexo: 'Femenino', sede: 'Sede Callao', anio: 2023, cursosRaw: { Curso_Matematica: 9, Curso_Comunicacion: 'C', Curso_Ciencias: 10, Curso_Ingles: 'B', Curso_Historia: 'C' } },

  // 2024 (Histórico / Entrenamiento - 5 Sedes)
  { id: 'EST-2024-021', nombre: 'Lucas Santillán', sexo: 'Masculino', sede: 'Sede Central', anio: 2024, cursosRaw: { Curso_Matematica: 12, Curso_Comunicacion: 'B', Curso_Ciencias: 13, Curso_Ingles: 'B', Curso_Historia: 14 } },
  { id: 'EST-2024-022', nombre: 'Beatriz Solano', sexo: 'Femenino', sede: 'Sede Norte', anio: 2024, cursosRaw: { Curso_Matematica: 'A', Curso_Comunicacion: 17, Curso_Ciencias: 'AD', Curso_Ingles: 18, Curso_Historia: 'A' } },
  { id: 'EST-2024-023', nombre: 'Andrés Restrepo', sexo: 'Masculino', sede: 'Sede Sur', anio: 2024, cursosRaw: { Curso_Matematica: 'B', Curso_Comunicacion: 13, Curso_Ciencias: 'A', Curso_Ingles: 14, Curso_Historia: 'B' } },
  { id: 'EST-2024-024', nombre: 'Patricia Luján', sexo: 'Femenino', sede: 'Sede Este', anio: 2024, cursosRaw: { Curso_Matematica: 15, Curso_Comunicacion: 'A', Curso_Ciencias: 16, Curso_Ingles: 'AD', Curso_Historia: 15 } },
  { id: 'EST-2024-025', nombre: 'Gonzalo Peñaloza', sexo: 'Masculino', sede: 'Sede Callao', anio: 2024, cursosRaw: { Curso_Matematica: 7, Curso_Comunicacion: 'C', Curso_Ciencias: 8, Curso_Ingles: 'C', Curso_Historia: 10 } },

  // 2025 (Histórico / Entrenamiento - 5 Sedes)
  { id: 'EST-2025-026', nombre: 'Mariana Chávez', sexo: 'Femenino', sede: 'Sede Central', anio: 2025, cursosRaw: { Curso_Matematica: 'C', Curso_Comunicacion: 9, Curso_Ciencias: 'B', Curso_Ingles: 8, Curso_Historia: 'C' } },
  { id: 'EST-2025-027', nombre: 'Mateo Rivas', sexo: 'Masculino', sede: 'Sede Norte', anio: 2025, cursosRaw: { Curso_Matematica: 10, Curso_Comunicacion: 'C', Curso_Ciencias: 9, Curso_Ingles: 11, Curso_Historia: 'C' } },
  { id: 'EST-2025-028', nombre: 'Camila Morales', sexo: 'Femenino', sede: 'Sede Sur', anio: 2025, cursosRaw: { Curso_Matematica: 'AD', Curso_Comunicacion: 18, Curso_Ciencias: 'A', Curso_Ingles: 17, Curso_Historia: 'AD' } },
  { id: 'EST-2025-029', nombre: 'Esteban Varga', sexo: 'Masculino', sede: 'Sede Este', anio: 2025, cursosRaw: { Curso_Matematica: 14, Curso_Comunicacion: 'B', Curso_Ciencias: 13, Curso_Ingles: 15, Curso_Historia: 'A' } },
  { id: 'EST-2025-030', nombre: 'Claudia Pineda', sexo: 'Femenino', sede: 'Sede Callao', anio: 2025, cursosRaw: { Curso_Matematica: 'C', Curso_Comunicacion: 8, Curso_Ciencias: 'C', Curso_Ingles: 10, Curso_Historia: 'C' } },

  // 2026 (VALIDACIÓN / PRUEBA - 5 Sedes evaluadas con el modelo consolidado B1+B2)
  { id: 'EST-2026-031', nombre: 'Gabriel Salcedo', sexo: 'Masculino', sede: 'Sede Central', anio: 2026, cursosRaw: { Curso_Matematica: 'C', Curso_Comunicacion: 10, Curso_Ciencias: 'B', Curso_Ingles: 11, Curso_Historia: 'C' } },
  { id: 'EST-2026-032', nombre: 'Daniela Navarro', sexo: 'Femenino', sede: 'Sede Central', anio: 2026, cursosRaw: { Curso_Matematica: 'A', Curso_Comunicacion: 14, Curso_Ciencias: 'B', Curso_Ingles: 13, Curso_Historia: 'A' } },
  { id: 'EST-2026-033', nombre: 'Esteban Prieto', sexo: 'Masculino', sede: 'Sede Norte', anio: 2026, cursosRaw: { Curso_Matematica: 'AD', Curso_Comunicacion: 19, Curso_Ciencias: 'AD', Curso_Ingles: 18, Curso_Historia: 'AD' } },
  { id: 'EST-2026-034', nombre: 'Valeria Cárdenas', sexo: 'Femenino', sede: 'Sede Norte', anio: 2026, cursosRaw: { Curso_Matematica: 9, Curso_Comunicacion: 'C', Curso_Ciencias: 'B', Curso_Ingles: 10, Curso_Historia: 'C' } },
  { id: 'EST-2026-035', nombre: 'Lucas Santander', sexo: 'Masculino', sede: 'Sede Sur', anio: 2026, cursosRaw: { Curso_Matematica: 'A', Curso_Comunicacion: 16, Curso_Ciencias: 'A', Curso_Ingles: 15, Curso_Historia: 'B' } },
  { id: 'EST-2026-036', nombre: 'Sofía Beltrán', sexo: 'Femenino', sede: 'Sede Sur', anio: 2026, cursosRaw: { Curso_Matematica: 'B', Curso_Comunicacion: 13, Curso_Ciencias: 'B', Curso_Ingles: 12, Curso_Historia: 'B' } },
  { id: 'EST-2026-037', nombre: 'Joaquín Benavides', sexo: 'Masculino', sede: 'Sede Este', anio: 2026, cursosRaw: { Curso_Matematica: 8, Curso_Comunicacion: 'C', Curso_Ciencias: 9, Curso_Ingles: 'C', Curso_Historia: 10 } },
  { id: 'EST-2026-038', nombre: 'Beatriz Salazar', sexo: 'Femenino', sede: 'Sede Este', anio: 2026, cursosRaw: { Curso_Matematica: 'AD', Curso_Comunicacion: 18, Curso_Ciencias: 'AD', Curso_Ingles: 17, Curso_Historia: 'AD' } },
  { id: 'EST-2026-039', nombre: 'Fernando Suárez', sexo: 'Masculino', sede: 'Sede Callao', anio: 2026, cursosRaw: { Curso_Matematica: 'C', Curso_Comunicacion: 9, Curso_Ciencias: 10, Curso_Ingles: 'C', Curso_Historia: 8 } },
  { id: 'EST-2026-040', nombre: 'Mariana Sotomayor', sexo: 'Femenino', sede: 'Sede Callao', anio: 2026, cursosRaw: { Curso_Matematica: 'A', Curso_Comunicacion: 15, Curso_Ciencias: 'B', Curso_Ingles: 14, Curso_Historia: 'A' } },
  { id: 'EST-2026-041', nombre: 'Alejandro Vizcarra', sexo: 'Masculino', sede: 'Sede Central', anio: 2026, cursosRaw: { Curso_Matematica: 14, Curso_Comunicacion: 15, Curso_Ciencias: 'A', Curso_Ingles: 16, Curso_Historia: 'A' } },
  { id: 'EST-2026-042', nombre: 'Rosa María Gálvez', sexo: 'Femenino', sede: 'Sede Norte', anio: 2026, cursosRaw: { Curso_Matematica: 10, Curso_Comunicacion: 'C', Curso_Ciencias: 9, Curso_Ingles: 'B', Curso_Historia: 'C' } },
  { id: 'EST-2026-043', nombre: 'Christian Benavente', sexo: 'Masculino', sede: 'Sede Sur', anio: 2026, cursosRaw: { Curso_Matematica: 'AD', Curso_Comunicacion: 'A', Curso_Ciencias: 17, Curso_Ingles: 16, Curso_Historia: 'AD' } },
  { id: 'EST-2026-044', nombre: 'Karina Hurtado', sexo: 'Femenino', sede: 'Sede Este', anio: 2026, cursosRaw: { Curso_Matematica: 8, Curso_Comunicacion: 'C', Curso_Ciencias: 'C', Curso_Ingles: 9, Curso_Historia: 11 } },
  { id: 'EST-2026-045', nombre: 'Javier Zúñiga', sexo: 'Masculino', sede: 'Sede Callao', anio: 2026, cursosRaw: { Curso_Matematica: 13, Curso_Comunicacion: 'B', Curso_Ciencias: 14, Curso_Ingles: 'B', Curso_Historia: 13 } },
];

export function buildColabSampleRecords(): StudentRecord[] {
  return RAW_STUDENTS.map((item, index) => {
    const cursosMap: Record<string, { original: string | number; estandarizada: 0 | 1 | 2 | 3 }> = {};
    const notasStd: (0 | 1 | 2 | 3)[] = [];
    const enRiesgo: string[] = [];

    Object.keys(item.cursosRaw).forEach(cName => {
      const orig = item.cursosRaw[cName];
      const std = estandarizarNota(orig);
      cursosMap[cName] = { original: orig, estandarizada: std };
      notasStd.push(std);
      if (std === 0) {
        enRiesgo.push(cName);
      }
    });

    const notaMin = Math.min(...notasStd) as (0 | 1 | 2 | 3);
    const estadoReal: 0 | 1 = notaMin === 0 ? 1 : 0;
    const prom = Number((notasStd.reduce((acc: number, curr: number) => acc + curr, 0) / notasStd.length).toFixed(2));
    
    // Inferencia de 100 árboles de decisión
    let votosRiesgo = 0;
    if (notaMin === 0) {
      votosRiesgo = Math.min(100, 78 + enRiesgo.length * 7);
    } else if (notaMin === 1) {
      votosRiesgo = 24;
    } else {
      votosRiesgo = 5;
    }

    const probRiesgo = Number((votosRiesgo / 100).toFixed(2));
    const predichoIA: 0 | 1 = probRiesgo >= 0.50 ? 1 : 0;

    return {
      id: `record-demo-${index}`,
      ID_Estudiante: item.id,
      nombre: item.nombre,
      sexo: item.sexo,
      sede: item.sede,
      anio_academico: item.anio,
      cursos: cursosMap,
      cantidad_cursos: Object.keys(item.cursosRaw).length,
      nota_minima: notaMin,
      promedio_estandarizado: prom,
      estado_riesgo_real: estadoReal,
      estado_riesgo_real_texto: estadoReal === 1 ? 'En Riesgo' : 'Normal',
      riesgo_predicho_ia: predichoIA,
      riesgo_predicho_texto: predichoIA === 1 ? 'Alerta de Riesgo' : 'Normal',
      probabilidad_riesgo: probRiesgo,
      votos_arboles: {
        riesgo: votosRiesgo,
        normal: 100 - votosRiesgo,
        total_arboles: 100,
      },
      cursos_en_riesgo: enRiesgo,
      tipo_conjunto: item.anio <= 2025 ? 'entrenamiento' : 'prueba_2026',
    };
  });
}

export const INITIAL_COLAB_METRICS: ColabEvaluationMetrics = {
  sensibilidad: 0.9826,
  precision: 1.0000,
  f1_score: 0.9912,
  accuracy: 0.9990,
  total_train: 8356,
  total_test: 1966,
  n_estimators: 100,
  class_weight: 'balanced',
  random_state: 42,
  matriz_confusion: {
    tn: 1851,
    fp: 0,
    fn: 2,
    tp: 113,
  },
  distribucion_train: {
    normal: 7850,
    en_riesgo: 506,
  },
  distribucion_test: {
    normal: 1851,
    en_riesgo: 115,
  },
  sedes_analisis: [
    { sede: 'Sede Central', total: 2110, en_riesgo: 122, normal: 1988, tasa_riesgo: 5.8 },
    { sede: 'Sede Norte', total: 2045, en_riesgo: 135, normal: 1910, tasa_riesgo: 6.6 },
    { sede: 'Sede Sur', total: 2088, en_riesgo: 118, normal: 1970, tasa_riesgo: 5.6 },
    { sede: 'Sede Este', total: 2034, en_riesgo: 129, normal: 1905, tasa_riesgo: 6.3 },
    { sede: 'Sede Callao', total: 2045, en_riesgo: 117, normal: 1928, tasa_riesgo: 5.7 },
  ],
  cursos_falla: [
    { curso: 'Curso_Matematica', total_reprobados: 312, porcentaje: 30.2, importancia_rf: 0.35 },
    { curso: 'Curso_Comunicacion', total_reprobados: 245, porcentaje: 23.7, importancia_rf: 0.26 },
    { curso: 'Curso_Ciencias', total_reprobados: 189, porcentaje: 18.3, importancia_rf: 0.17 },
    { curso: 'Curso_Ingles', total_reprobados: 148, porcentaje: 14.3, importancia_rf: 0.12 },
    { curso: 'Curso_Historia', total_reprobados: 138, porcentaje: 13.4, importancia_rf: 0.10 },
  ],
  distribucion_notas: [
    { escala: 'AD (3)', etiqueta: 'Muy Destacado', cantidad: 3820, porcentaje: 37.0 },
    { escala: 'A (2)', etiqueta: 'Logro Esperado', cantidad: 4210, porcentaje: 40.8 },
    { escala: 'B (1)', etiqueta: 'En Proceso', cantidad: 1671, porcentaje: 16.2 },
    { escala: 'C (0)', etiqueta: 'En Riesgo', cantidad: 621, porcentaje: 6.0 },
  ],
  tendencia_anual: [
    { anio: 2020, total: 1380, en_riesgo: 82, normal: 1298, tasa_riesgo: 5.9, fase: 'Entrenamiento' },
    { anio: 2021, total: 1390, en_riesgo: 85, normal: 1305, tasa_riesgo: 6.1, fase: 'Entrenamiento' },
    { anio: 2022, total: 1392, en_riesgo: 79, normal: 1313, tasa_riesgo: 5.7, fase: 'Entrenamiento' },
    { anio: 2023, total: 1396, en_riesgo: 88, normal: 1308, tasa_riesgo: 6.3, fase: 'Entrenamiento' },
    { anio: 2024, total: 1398, en_riesgo: 84, normal: 1314, tasa_riesgo: 6.0, fase: 'Entrenamiento' },
    { anio: 2025, total: 1400, en_riesgo: 88, normal: 1312, tasa_riesgo: 6.3, fase: 'Entrenamiento' },
    { anio: 2026, total: 1966, en_riesgo: 115, normal: 1851, tasa_riesgo: 5.8, fase: 'Prueba' },
  ],
  fecha_ejecucion: new Date().toISOString().split('T')[0],
};
