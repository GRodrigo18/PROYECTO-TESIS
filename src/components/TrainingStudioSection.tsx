import React, { useState } from 'react';
import { 
  Cpu, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  Sliders, 
  BarChart, 
  HelpCircle,
  ArrowRight,
  TrendingUp,
  Layers
} from 'lucide-react';
import { ModelMetrics, ModelHyperparameters, StudentPrediction, FeatureImportance } from '../types';

interface TrainingStudioSectionProps {
  students: StudentPrediction[];
  metrics: ModelMetrics;
  featureImportances: FeatureImportance[];
  onTrainModel: (hyperparameters: ModelHyperparameters) => void;
  onGoToTest2026: () => void;
}

export const TrainingStudioSection: React.FC<TrainingStudioSectionProps> = ({
  students,
  metrics,
  featureImportances,
  onTrainModel,
  onGoToTest2026,
}) => {
  const [nEstimators, setNEstimators] = useState<number>(metrics.hyperparameters.n_estimators || 150);
  const [maxDepth, setMaxDepth] = useState<number>(metrics.hyperparameters.max_depth || 8);
  const [criterion, setCriterion] = useState<'gini' | 'entropy'>(metrics.hyperparameters.criterion || 'gini');
  const [isTraining, setIsTraining] = useState(false);

  const trainingCohort = students.filter(s => s.anio < 2026);
  const testCohort2026 = students.filter(s => s.anio === 2026);

  const handleRunTraining = () => {
    setIsTraining(true);
    setTimeout(() => {
      onTrainModel({
        n_estimators: nEstimators,
        max_depth: maxDepth,
        criterion,
        min_samples_split: 2,
      });
      setIsTraining(false);
    }, 600);
  };

  const cm = metrics.confusionMatrix.matrix;

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <Cpu className="w-4 h-4" />
              <span>FASE 02 · ENTRENAMIENTO DEL MODELO PREDICTIVO</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Entrenamiento y Ajuste del Ensamble Random Forest (2020 - 2025)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
              El algoritmo se alimenta con los datos recopilados de los años <strong>2020 al 2025</strong>. En este período los estudiantes tienen calificaciones consolidadas en sus 4 bimestres y resultado académico etiquetado. Ajusta los hiperparámetros y entrena el ensamble para optimizar la detección precoz de riesgo.
            </p>
          </div>

          <button
            type="button"
            onClick={onGoToTest2026}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-semibold text-xs tracking-wide shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 self-start lg:self-auto shrink-0"
          >
            <span>Ir a Prueba 2026 (B1 + B2)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Training Data Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Muestra de Entrenamiento:</span>
            <span className="text-base font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              {trainingCohort.length} alumnos (2020-2025)
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Validación Cruzada (k-fold):</span>
            <span className="text-base font-bold text-blue-600 dark:text-blue-400 font-mono">
              k = 5 folds
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Exactitud (Accuracy):</span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {(metrics.accuracy * 100).toFixed(1)}%
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">ROC-AUC Multiclase:</span>
            <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">
              {metrics.roc_auc.toFixed(3)}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Hyperparameter Panel & Validation Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Interactive Hyperparameters Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Hiperparámetros de Random Forest
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* N Estimators */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Número de Árboles (n_estimators):
                </label>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{nEstimators}</span>
              </div>
              <input
                type="range"
                min="50"
                max="300"
                step="25"
                value={nEstimators}
                onChange={(e) => setNEstimators(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>50 árboles</span>
                <span>150 (Estándar)</span>
                <span>300 árboles</span>
              </div>
            </div>

            {/* Max Depth */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Profundidad Máxima (max_depth):
                </label>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{maxDepth}</span>
              </div>
              <input
                type="range"
                min="4"
                max="16"
                step="2"
                value={maxDepth}
                onChange={(e) => setMaxDepth(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>4 (Menor sobreajuste)</span>
                <span>8</span>
                <span>16 (Mayor detalle)</span>
              </div>
            </div>

            {/* Criterion */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                Criterio de División (Split Criterion):
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCriterion('gini')}
                  className={`py-2 px-3 rounded-xl font-medium text-xs border transition-colors cursor-pointer ${
                    criterion === 'gini'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Impureza Gini
                </button>
                <button
                  type="button"
                  onClick={() => setCriterion('entropy')}
                  className={`py-2 px-3 rounded-xl font-medium text-xs border transition-colors cursor-pointer ${
                    criterion === 'entropy'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Entropía / Ganancia
                </button>
              </div>
            </div>
          </div>

          {/* Trigger Button */}
          <button
            type="button"
            disabled={isTraining || trainingCohort.length === 0}
            onClick={handleRunTraining}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs tracking-wide shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Play className={`w-3.5 h-3.5 ${isTraining ? 'animate-spin' : ''}`} />
            <span>{isTraining ? 'Entrenando Ensamble...' : 'Reentrenar Modelo con Datos 2020-2025'}</span>
          </button>
        </div>

        {/* Right: Validation Metrics & Confusion Matrix */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Key Metrics Grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Métricas de Rendimiento del Algoritmo
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Exactitud (Accuracy)</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-0.5">
                  {(metrics.accuracy * 100).toFixed(1)}%
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Precisión (Precision)</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums mt-0.5">
                  {(metrics.precision * 100).toFixed(1)}%
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Sensibilidad (Recall)</div>
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono tabular-nums mt-0.5">
                  {(metrics.recall * 100).toFixed(1)}%
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">F1-Score Ponderado</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums mt-0.5">
                  {metrics.f1_score.toFixed(3)}
                </div>
              </div>
            </div>
          </div>

          {/* Confusion Matrix Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Matriz de Confusión (Clasificación Multiclase)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Filas: Valor Real Histórico · Columnas: Predicción del Bosque Aleatorio
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-center text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-2 px-3 text-left">Real \ Predicho</th>
                    <th className="py-2 px-3 text-red-600 dark:text-red-400 font-bold">Riesgo Alto</th>
                    <th className="py-2 px-3 text-amber-600 dark:text-amber-400 font-bold">Riesgo Medio</th>
                    <th className="py-2 px-3 text-emerald-600 dark:text-emerald-400 font-bold">Riesgo Bajo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono tabular-nums">
                  <tr>
                    <td className="py-2.5 px-3 text-left font-bold text-red-600 dark:text-red-400">Real Alto</td>
                    <td className="py-2.5 px-3 bg-red-50 dark:bg-red-950/30 font-bold text-red-700 dark:text-red-300">
                      {cm.alto_alto}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                      {cm.alto_medio}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {cm.alto_bajo}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-left font-bold text-amber-600 dark:text-amber-400">Real Medio</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                      {cm.medio_alto}
                    </td>
                    <td className="py-2.5 px-3 bg-amber-50 dark:bg-amber-950/30 font-bold text-amber-700 dark:text-amber-300">
                      {cm.medio_medio}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                      {cm.medio_bajo}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-left font-bold text-emerald-600 dark:text-emerald-400">Real Bajo</td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {cm.bajo_alto}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                      {cm.bajo_medio}
                    </td>
                    <td className="py-2.5 px-3 bg-emerald-50 dark:bg-emerald-950/30 font-bold text-emerald-700 dark:text-emerald-300">
                      {cm.bajo_bajo}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      {/* Feature Importance explanation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Importancia de Variables (Feature Importance - Gini Impurity Reduction)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Pesos calculados por el ensamble para la clasificación de riesgo académico:
        </p>

        <div className="space-y-3">
          {featureImportances.map((item) => (
            <div key={item.feature} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">{item.label}</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                  {(item.importance * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${item.importance * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
