import { StudentPrediction, ModelMetrics, FeatureImportance } from '../types';
import { 
  MULTI_YEAR_STUDENTS_SAMPLE, 
  INITIAL_MULTI_YEAR_METRICS, 
  MULTI_YEAR_FEATURE_IMPORTANCES 
} from './multiYearData';

export const INITIAL_MODEL_METRICS: ModelMetrics = INITIAL_MULTI_YEAR_METRICS;
export const FEATURE_IMPORTANCES: FeatureImportance[] = MULTI_YEAR_FEATURE_IMPORTANCES;
export const INITIAL_STUDENTS: StudentPrediction[] = MULTI_YEAR_STUDENTS_SAMPLE;
