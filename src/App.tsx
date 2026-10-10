import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Paso1CargaSection } from './components/Paso1CargaSection';
import { Paso2EstandarizacionSection } from './components/Paso2EstandarizacionSection';
import { Paso3EntrenamientoSection } from './components/Paso3EntrenamientoSection';
import { Paso4ResultadosSection } from './components/Paso4ResultadosSection';
import { Paso5SimuladorSection } from './components/Paso5SimuladorSection';
import { StudentDetailModal } from './components/StudentDetailModal';
import { StudentRecord, ProjectPhase, ColabEvaluationMetrics } from './types';
import { 
  procesarDatasetColab, 
  entrenarYPredecirRandomForest, 
  descargarPlantillaEstandarColab, 
  exportarResultadosPrediccion 
} from './utils/colabEngine';
import { buildColabSampleRecords, INITIAL_COLAB_METRICS } from './data/colabMockData';
import { Check, Cpu, Download, Sparkles, FileSpreadsheet, ArrowRight, Building2, BarChart3, Database, Sliders } from 'lucide-react';

export default function App() {
  // Persistencia en localStorage para que la base de datos no se pierda al recargar
  const [records, setRecords] = useState<StudentRecord[]>(() => {
    try {
      const saved = localStorage.getItem('rf_academic_records');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return [];
  });

  const [metrics, setMetrics] = useState<ColabEvaluationMetrics>(() => {
    try {
      const savedM = localStorage.getItem('rf_academic_metrics');
      if (savedM) {
        const parsedM = JSON.parse(savedM);
        if (parsedM && parsedM.sensibilidad !== undefined) return parsedM;
      }
    } catch {
      // fallback
    }
    return INITIAL_COLAB_METRICS;
  });

  const [currentPhase, setCurrentPhase] = useState<ProjectPhase>('paso1_carga');
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Guardar datos en almacenamiento persistente
  const persistData = (newRecords: StudentRecord[], newMetrics: ColabEvaluationMetrics) => {
    setRecords(newRecords);
    setMetrics(newMetrics);
    try {
      localStorage.setItem('rf_academic_records', JSON.stringify(newRecords));
      localStorage.setItem('rf_academic_metrics', JSON.stringify(newMetrics));
    } catch (e) {
      console.warn('No se pudo guardar en almacenamiento local:', e);
    }
  };

  // Cargar Dataset Demo Colab (2020 a 2026 con 5 Sedes)
  const handleLoadDemo = () => {
    const demo = buildColabSampleRecords();
    const { records: trainedRecords, metrics: evaluatedMetrics } = entrenarYPredecirRandomForest(demo, 100);
    persistData(trainedRecords, evaluatedMetrics);
    showToast(`Dataset Demo cargado y guardado (${demo.length} registros en 5 Sedes). Partición 2020-2025 y 2026 aplicada.`);
  };

  // Limpiar / Reiniciar a modo sin datos
  const handleClear = () => {
    setRecords([]);
    try {
      localStorage.removeItem('rf_academic_records');
      localStorage.removeItem('rf_academic_metrics');
    } catch {}
    setCurrentPhase('paso1_carga');
    showToast('El sistema ha sido reiniciado a modo sin datos. Listo para cargar tu archivo.');
  };

  // Carga de archivo Excel o CSV final con guardado persistente
  const handleFileUpload = async (file: File) => {
    try {
      showToast(`Leyendo y procesando archivo "${file.name}"...`);
      const res = await procesarDatasetColab(file);
      persistData(res.records, res.metrics);
      showToast(`¡Éxito! Base de datos guardada con regla metodológica y 5 sedes (${res.records.length} registros guardados).`);
      setCurrentPhase('paso2_estandarizar');
    } catch (err: any) {
      showToast(err.message || 'Error al procesar el archivo.');
    }
  };

  // Reentrenar con número de árboles especificado y guardar
  const handleRetrain = (trees: number) => {
    if (records.length === 0) return;
    const { records: updated, metrics: newM } = entrenarYPredecirRandomForest(records, trees);
    persistData(updated, newM);
    showToast(`Random Forest reentrenado con ${trees} árboles y guardado.`);
  };

  // Agregar alumno desde el simulador y guardar
  const handleAddStudentRecord = (newRecord: StudentRecord) => {
    const updatedList = [newRecord, ...records];
    const { records: updated, metrics: newM } = entrenarYPredecirRandomForest(updatedList, metrics.n_estimators);
    persistData(updated, newM);
    showToast(`Alumno "${newRecord.nombre}" (${newRecord.sede}) guardado en la cohorte 2026.`);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      
      {/* Top Bar Contract */}
      <Navbar
        currentPhase={currentPhase}
        onSelectPhase={setCurrentPhase}
        onOpenImport={() => setCurrentPhase('paso1_carga')}
        totalStudents={records.length}
        onClearData={handleClear}
        onLoadDemoData={handleLoadDemo}
        records={records}
      />

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom-5 duration-300">
          <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Check className="h-3.5 w-3.5" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Pipeline Step Navigator */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 flex items-center justify-between gap-2 overflow-x-auto shadow-xs">
          <div className="flex items-center gap-1.5 min-w-max">
            <button
              onClick={() => setCurrentPhase('paso1_carga')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentPhase === 'paso1_carga'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>1. Ingesta (2020-2026)</span>
            </button>

            <button
              onClick={() => setCurrentPhase('paso2_estandarizar')}
              disabled={records.length === 0}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                currentPhase === 'paso2_estandarizar'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>2. Estandarización & Sedes</span>
            </button>

            <button
              onClick={() => setCurrentPhase('paso3_entrenamiento')}
              disabled={records.length === 0}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                currentPhase === 'paso3_entrenamiento'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>3. Validación & Gráficos</span>
            </button>

            <button
              onClick={() => setCurrentPhase('paso4_resultados')}
              disabled={records.length === 0}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                currentPhase === 'paso4_resultados'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>4. Predicciones 2026</span>
            </button>

            <button
              onClick={() => setCurrentPhase('paso5_simulador')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentPhase === 'paso5_simulador'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>5. Simulador en Vivo</span>
            </button>
          </div>

          {records.length > 0 && (
            <div className="hidden lg:flex items-center gap-3 text-xs text-slate-500 pr-2">
              <span>Sensibilidad: <strong className="text-blue-600 font-mono">{(metrics.sensibilidad * 100).toFixed(1)}%</strong></span>
              <span>·</span>
              <span>Precisión: <strong className="text-emerald-600 font-mono">{(metrics.precision * 100).toFixed(1)}%</strong></span>
              <span>·</span>
              <span>5 Sedes</span>
              <span>·</span>
              <span>Árboles: <strong className="font-mono">{metrics.n_estimators}</strong></span>
            </div>
          )}
        </div>

        {/* Phase content rendering with sleek transitions */}
        {currentPhase === 'paso1_carga' && (
          <Paso1CargaSection
            records={records}
            onFileUpload={handleFileUpload}
            onLoadDemoData={handleLoadDemo}
            onNextStep={() => setCurrentPhase('paso2_estandarizar')}
          />
        )}

        {currentPhase === 'paso2_estandarizar' && (
          <Paso2EstandarizacionSection
            records={records}
            onPrevStep={() => setCurrentPhase('paso1_carga')}
            onNextStep={() => setCurrentPhase('paso3_entrenamiento')}
            onSelectStudent={setSelectedStudent}
          />
        )}

        {currentPhase === 'paso3_entrenamiento' && (
          <Paso3EntrenamientoSection
            metrics={metrics}
            onPrevStep={() => setCurrentPhase('paso2_estandarizar')}
            onNextStep={() => setCurrentPhase('paso4_resultados')}
            onRetrain={handleRetrain}
          />
        )}

        {currentPhase === 'paso4_resultados' && (
          <Paso4ResultadosSection
            records={records}
            onPrevStep={() => setCurrentPhase('paso3_entrenamiento')}
            onGoToSimulator={() => setCurrentPhase('paso5_simulador')}
            onSelectStudent={setSelectedStudent}
          />
        )}

        {currentPhase === 'paso5_simulador' && (
          <Paso5SimuladorSection
            onPrevStep={() => setCurrentPhase('paso4_resultados')}
            onAddStudentRecord={handleAddStudentRecord}
            onGoToPredictions={() => setCurrentPhase('paso4_resultados')}
          />
        )}

      </main>

      {/* Student Detail Modal */}
      <StudentDetailModal
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <p>
            Pipeline Random Forest ({metrics.n_estimators} Árboles) · Partición Temporal: Entrenamiento (2020-2025) y Validación (2026) · 5 Sedes
          </p>
          <div className="flex items-center gap-3 text-[11px]">
            <button
              onClick={descargarPlantillaEstandarColab}
              className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Plantilla Oficial (.xlsx)
            </button>
            <span>·</span>
            <button
              onClick={() => exportarResultadosPrediccion(records, 'csv')}
              disabled={records.length === 0}
              className="text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-40 cursor-pointer"
            >
              Exportar Resultados_Prediccion_2026.csv
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
