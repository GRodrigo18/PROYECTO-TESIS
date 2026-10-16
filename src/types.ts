// ---------------------------------------------------------------------------
// Validación del Excel (mismas reglas que tesis-rf/src/auditar_excel.py)
// ---------------------------------------------------------------------------
export type ProjectPhase =
  | 'paso1_carga'
  | 'paso2_validacion'
  | 'paso3_modelo'
  | 'paso4_predicciones'
  | 'paso5_simulador';

export type Sexo = 'Femenino' | 'Masculino' | 'No registrado';
export type FormatoDataset = 'por_bimestre' | 'una_nota_por_curso';

/** Nota estandarizada: 0=C, 1=B, 2=A, 3=AD */
export type NotaEstandar = 0 | 1 | 2 | 3;

export interface RegistroValido {
  fila_excel: number;
  ID_Estudiante: string;
  anio: number;
  sede: string;
  sexo: Sexo;
  grado: string | null;
  /** clave `${curso}_${etapa}` (etapa = UNICA, B1..B4 o FINAL) */
  notas: Record<string, NotaEstandar>;
}

export interface RegistroExcluido {
  fila_excel: number;
  ID_Estudiante: string;
  anio: number | null;
  sede: string;
  motivos: string;
}

export interface ValorARevisar {
  fila_excel: number;
  ID_Estudiante: string;
  anio: number | null;
  sede: string;
  columna: string;
  valor_original: string;
  problema: string;
}

export interface PerfilDataset {
  archivo: string;
  hoja_usada: string;
  hojas: Record<string, number>;
  formato_detectado: FormatoDataset;
  advertencia_fuga: string | null;
  columnas_identificadas: Record<'id' | 'sexo' | 'sede' | 'anio' | 'grado', string | null>;
  cursos: Record<string, string[]>;
  total_bruto: number;
  total_validos: number;
  total_excluidos: number;
  porcentaje_excluidos: number;
  motivos_exclusion: Record<string, number>;
  excluidos_por_sede: Record<string, number>;
  excluidos_por_anio: Record<string, number>;
  validos_por_anio: Record<string, number>;
  validos_por_sede: Record<string, number>;
  sexo_no_registrado: number;
  escala_literal_por_anio: Record<string, boolean>;
}

export interface ResultadoAuditoria {
  perfil: PerfilDataset;
  validos: RegistroValido[];
  excluidos: RegistroExcluido[];
  revisar: ValorARevisar[];
}

// ---------------------------------------------------------------------------
// Salidas del pipeline Python (tesis-rf/resultados/)
// ---------------------------------------------------------------------------
export interface MetricasBinarias {
  umbral: number;
  matriz_confusion: { tn: number; fp: number; fn: number; tp: number };
  sensibilidad_recall: number;
  especificidad: number;
  precision: number;
  valor_predictivo_negativo: number;
  f1: number;
  f2: number;
  accuracy: number;
  balanced_accuracy: number;
  mcc: number;
  kappa_cohen: number;
  roc_auc: number | null;
  pr_auc: number | null;
  brier: number;
  log_loss: number;
  prevalencia: number;
}

export interface McNemar {
  a_acierta_b_falla: number;
  b_acierta_a_falla: number;
  chi2: number;
  p_valor: number;
}

export interface PuntoCurva {
  valor: string;
  pr_auc_validacion: number;
  pr_auc_entrenamiento: number;
  n_combinaciones: number;
}

export interface InformeMetricas {
  cursos?: string[];
  n_arboles_modelo_final?: number;
  validacion_exclusion: {
    total_bruto: number;
    total_validos: number;
    total_excluidos: number;
    porcentaje_excluidos: number;
    motivos: Record<string, number>;
    por_sede: Record<string, number>;
    por_anio: Record<string, number>;
  };
  particion: {
    entrenamiento: string;
    prueba: number;
    prediccion: number;
    n_train: number;
    n_test: number;
    n_2026: number;
    prevalencia_train: number;
    prevalencia_test: number;
  };
  mejores_hiperparametros: Record<string, string | number | null>;
  cv_leave_one_year_out_pr_auc: number;
  cv_pr_auc_por_anio_validacion?: Record<string, number>;
  brecha_entrenamiento_validacion_pr_auc?: number;
  curvas_validacion_marginales?: Record<string, PuntoCurva[]>;
  umbral: { valor: number; criterio: string };
  test: {
    'umbral_0.5': MetricasBinarias;
    umbral_optimo: MetricasBinarias;
    ic95_bootstrap_umbral_optimo: Record<string, [number, number]>;
  };
  lineas_base: Record<string, MetricasBinarias>;
  pruebas_mcnemar: Record<string, McNemar>;
  por_subgrupo: Record<string, Record<string, {
    sensibilidad_recall: number; precision: number; f1: number; pr_auc: number; prevalencia: number;
  }>>;
  calibracion: { prob_media_predicha: number[]; fraccion_real: number[] };
  importancia_gini_top10: Record<string, number>;
  importancia_permutacion_top10: Array<{ variable: string; importancia_media: number; desv_std: number }>;
}

export interface Prediccion2026 {
  ID_Estudiante: string;
  sede: string;
  sexo: string;
  grado: string;
  probabilidad_riesgo: number;
  alerta_riesgo: number;
  votos_arboles_riesgo: number;
  total_arboles: number;
}

export interface ImportanciaPermutacion {
  variable: string;
  importancia_media: number;
  desv_std: number;
}

export interface ResultadosPipeline {
  disponible: boolean;
  generado_en: string | null;
  informe: InformeMetricas | null;
  predicciones_2026: Prediccion2026[];
  importancia_permutacion: ImportanciaPermutacion[];
  modelo_disponible: boolean;
}

export interface InfoModelo {
  cursos: string[];
  sedes: string[];
  umbral: number;
  criterio_umbral: string | null;
  total_arboles: number;
}

export interface ResultadoPrediccion {
  ok: boolean;
  errores?: string[];
  probabilidad_riesgo?: number;
  alerta_riesgo?: number;
  votos_arboles_riesgo?: number;
  total_arboles?: number;
  variables?: Record<string, number | string | null>;
}
