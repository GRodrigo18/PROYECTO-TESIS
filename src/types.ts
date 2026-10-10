export type RiskStatus = 'Normal' | 'En Riesgo';

export type ScaleStandard = 0 | 1 | 2 | 3; // 0=C, 1=B, 2=A, 3=AD

export type ProjectPhase = 
  | 'paso1_carga'        // PASO 1: Ingesta de datos (Excel / CSV con las columnas oficiales incluyendo Sede)
  | 'paso2_estandarizar' // PASO 2: Estandarización de Notas (0-3) y Regla de Riesgo
  | 'paso3_entrenamiento'// PASO 3: Entrenamiento Random Forest (100 árboles) y Gráficos de Validación
  | 'paso4_resultados'   // PASO 4: Predicciones 2026 y Exportación
  | 'paso5_simulador';   // PASO 5: Simulador interactivo en tiempo real

export interface StudentCourseGrade {
  original: string | number;
  estandarizada: ScaleStandard;
}

export interface StudentRecord {
  id: string;
  ID_Estudiante: string;
  nombre: string;
  anio_academico: number; // Año_Academico (2020..2026)
  sexo: 'Femenino' | 'Masculino' | 'Otro'; // Sexo
  sede: string;          // Sede (5 sedes: Sede Central, Sede Norte, Sede Sur, Sede Este, Sede Callao)
  grado?: string;        // Grado (opcional)
  
  // Cursos estandarizados
  cursos: Record<string, StudentCourseGrade>;
  cantidad_cursos: number;
  
  // Regla metodológica del Colab: Si min(cursos) == 0 (C), Estado_Riesgo = 1
  nota_minima: ScaleStandard;
  promedio_estandarizado: number; // 0.00 a 3.00
  
  estado_riesgo_real: 0 | 1; // 0 = Normal, 1 = En Riesgo
  estado_riesgo_real_texto: RiskStatus;
  
  // Predicción del Ensamble Random Forest (100 Árboles)
  riesgo_predicho_ia?: 0 | 1;
  riesgo_predicho_texto?: 'Normal' | 'Alerta de Riesgo';
  probabilidad_riesgo?: number; // 0.00 a 1.00
  votos_arboles?: {
    riesgo: number;
    normal: number;
    total_arboles: number; // 100
  };
  cursos_en_riesgo?: string[]; // Cursos con nota 0 (C)
  tipo_conjunto: 'entrenamiento' | 'prueba_2026';
}

export interface ColabEvaluationMetrics {
  sensibilidad: number; // Recall
  precision: number;
  f1_score: number;
  accuracy: number;
  total_train: number; // Registros 2020-2025
  total_test: number;  // Registros 2026
  n_estimators: number; // 100 árboles
  class_weight: string; // 'balanced'
  random_state: number; // 42
  matriz_confusion: {
    tn: number; // Normal predicho Normal
    fp: number; // Normal predicho En Riesgo
    fn: number; // En Riesgo predicho Normal
    tp: number; // En Riesgo predicho En Riesgo
  };
  distribucion_test: {
    normal: number;
    en_riesgo: number;
  };
  distribucion_train: {
    normal: number;
    en_riesgo: number;
  };
  // Análisis y validación por las 5 Sedes
  sedes_analisis: Array<{
    sede: string;
    total: number;
    en_riesgo: number;
    normal: number;
    tasa_riesgo: number; // Porcentaje 0 a 100
  }>;
  // Detonantes por curso (frecuencia de C / 0 y feature importance)
  cursos_falla: Array<{
    curso: string;
    total_reprobados: number; // Veces con nota 0 (C)
    porcentaje: number;
    importancia_rf: number; // 0.00 a 1.00
  }>;
  // Distribución global de notas en escala 0 a 3
  distribucion_notas: Array<{
    escala: string;
    etiqueta: string;
    cantidad: number;
    porcentaje: number;
  }>;
  // Tendencia anual histórica (2020 a 2026)
  tendencia_anual: Array<{
    anio: number;
    total: number;
    en_riesgo: number;
    normal: number;
    tasa_riesgo: number;
    fase: 'Entrenamiento' | 'Prueba';
  }>;
  fecha_ejecucion: string;
}

export interface FilterState {
  searchQuery: string;
  year: number | 'Todos' | 'Entrenamiento (2020-2025)' | 'Prueba (2026)';
  sede: string; // 'Todas' o una de las 5 sedes
  risk: any;
  gender: any;
  country?: string;
  minCourses?: number;
  maxCourses?: number;
}

// -------------------------------------------------------------
// Legacy types compatibility
// -------------------------------------------------------------
export type RiskLevel = 'Alto' | 'Medio' | 'Bajo';
export type Gender = 'Femenino' | 'Masculino' | 'Otro';
export type DatasetCohortType = 'entrenamiento' | 'prueba_2026';

export interface StudentPrediction {
  id: string;
  anio: number;
  codigo: string;
  nombre: string;
  nombre_codigo: string;
  sexo: Gender;
  sede?: string;
  pais?: string;
  grado?: string;
  cursos: number;
  bimestre_1: number;
  bimestre_2: number;
  bimestre_3?: number;
  bimestre_4?: number;
  promedio_b1_b2: number;
  promedio_final?: number;
  promedio_previo?: number;
  asistencia_pct: number;
  horas_estudio_semanal: number;
  cursos_detalle?: string[];
  riesgo_academico: RiskLevel;
  probabilidad_riesgo: number;
  tipo_conjunto: DatasetCohortType;
  votos_arboles?: {
    alto: number;
    medio: number;
    bajo: number;
    total_arboles: number;
  };
  factores_clave?: string[];
  fecha_evaluacion?: string;
}

export interface ModelHyperparameters {
  n_estimators: number;
  max_depth: number;
  criterion: 'gini' | 'entropy';
  min_samples_split: number;
}

export interface ConfusionMatrix {
  matrix: {
    alto_alto: number;
    alto_medio: number;
    alto_bajo: number;
    medio_alto: number;
    medio_medio: number;
    medio_bajo: number;
    bajo_alto: number;
    bajo_medio: number;
    bajo_bajo: number;
  };
}

export interface ModelMetrics {
  nombreModelo: string;
  version: string;
  hyperparameters: ModelHyperparameters;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  total_entrenamiento: number;
  total_prueba: number;
  confusionMatrix: ConfusionMatrix;
  distribucion_entrenamiento: {
    alto: number;
    medio: number;
    bajo: number;
  };
  distribucion_prueba_2026: {
    alto: number;
    medio: number;
    bajo: number;
  };
  fecha_ultimo_entrenamiento: string;
  n_estimators?: number;
  max_depth?: number;
  total_evaluados?: number;
}

export interface FeatureImportance {
  feature: string;
  label: string;
  importance: number;
  impacto: 'Alto' | 'Medio' | 'Bajo';
}
