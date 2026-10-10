import React from 'react';
import { 
  Users, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  BookOpen, 
  TrendingUp,
  Percent
} from 'lucide-react';
import { StudentPrediction } from '../types';

interface KPICardsProps {
  students: StudentPrediction[];
  filteredCount: number;
}

export const KPICards: React.FC<KPICardsProps> = ({ students, filteredCount }) => {
  const total = students.length;

  const altoCount = students.filter(s => s.riesgo_academico === 'Alto').length;
  const medioCount = students.filter(s => s.riesgo_academico === 'Medio').length;
  const bajoCount = students.filter(s => s.riesgo_academico === 'Bajo').length;

  const altoPct = total > 0 ? ((altoCount / total) * 100).toFixed(1) : '0';
  const medioPct = total > 0 ? ((medioCount / total) * 100).toFixed(1) : '0';
  const bajoPct = total > 0 ? ((bajoCount / total) * 100).toFixed(1) : '0';

  const totalCursos = students.reduce((acc, s) => acc + s.cursos, 0);
  const avgCursos = total > 0 ? (totalCursos / total).toFixed(1) : '0';

  const avgProb = total > 0 
    ? ((students.reduce((acc, s) => acc + s.probabilidad_riesgo, 0) / total) * 100).toFixed(1) 
    : '0';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      
      {/* Total Card */}
      <div 
        id="kpi-total-estudiantes"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 shadow-xs flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Estudiantes
          </span>
          <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Users className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {total}
            </span>
            {filteredCount !== total && (
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                ({filteredCount} filtrados)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            En base de datos de predicción
          </p>
        </div>
      </div>

      {/* Riesgo Alto Card */}
      <div 
        id="kpi-riesgo-alto"
        className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/40 rounded-xl p-4.5 shadow-xs flex flex-col justify-between bg-gradient-to-br from-red-50/40 to-transparent dark:from-red-950/10"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
            Riesgo Alto
          </span>
          <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">
              {altoCount}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
              {altoPct}%
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Intervención y tutoría urgente
          </p>
        </div>
      </div>

      {/* Riesgo Medio Card */}
      <div 
        id="kpi-riesgo-medio"
        className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4.5 shadow-xs flex flex-col justify-between bg-gradient-to-br from-amber-50/40 to-transparent dark:from-amber-950/10"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Riesgo Medio
          </span>
          <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertCircle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {medioCount}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
              {medioPct}%
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Seguimiento de rendimiento
          </p>
        </div>
      </div>

      {/* Riesgo Bajo Card */}
      <div 
        id="kpi-riesgo-bajo"
        className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-4.5 shadow-xs flex flex-col justify-between bg-gradient-to-br from-emerald-50/40 to-transparent dark:from-emerald-950/10"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Riesgo Bajo
          </span>
          <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {bajoCount}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
              {bajoPct}%
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Progreso académico óptimo
          </p>
        </div>
      </div>

      {/* Promedio Cursos & Probabilidad */}
      <div 
        id="kpi-promedio-cursos"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 shadow-xs flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Cursos Promedio
          </span>
          <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <BookOpen className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {avgCursos}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              RF Prob: {avgProb}%
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Asignaturas por estudiante
          </p>
        </div>
      </div>

    </div>
  );
};
