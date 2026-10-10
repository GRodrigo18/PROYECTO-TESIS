import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Globe, 
  BookOpen, 
  Clock, 
  Calendar,
  Save
} from 'lucide-react';
import { StudentPrediction, Gender } from '../types';
import { predictStudentRisk } from '../utils/randomForestSimulator';

interface PredictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStudent: (student: StudentPrediction) => void;
}

const COUNTRIES = [
  'Perú',
  'Colombia',
  'México',
  'Chile',
  'Argentina',
  'Ecuador',
  'España',
  'Bolivia',
  'Uruguay',
  'Costa Rica',
  'Panamá',
];

export const PredictModal: React.FC<PredictModalProps> = ({
  isOpen,
  onClose,
  onAddStudent,
}) => {
  const [nombreCodigo, setNombreCodigo] = useState('');
  const [sexo, setSexo] = useState<Gender>('Femenino');
  const [pais, setPais] = useState('Perú');
  const [cursos, setCursos] = useState<number>(6);
  const [bimestre1, setBimestre1] = useState<number>(12.0);
  const [bimestre2, setBimestre2] = useState<number>(12.5);
  const [asistencia, setAsistencia] = useState<number>(80);
  const [horas, setHoras] = useState<number>(10);

  const [predictionResult, setPredictionResult] = useState<StudentPrediction | null>(null);

  if (!isOpen) return null;

  const promB1B2 = Number(((Number(bimestre1) + Number(bimestre2)) / 2).toFixed(2));

  const handlePredict = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreCodigo.trim()) return;

    const result = predictStudentRisk({
      nombre_codigo: nombreCodigo.trim(),
      sexo,
      pais,
      cursos: Number(cursos),
      b1: Number(bimestre1),
      b2: Number(bimestre2),
      promedio_previo: promB1B2,
      asistencia_pct: Number(asistencia),
      horas_estudio_semanal: Number(horas),
      anio: 2026,
    });

    setPredictionResult(result);
  };

  const handleSaveAndAdd = () => {
    if (predictionResult) {
      onAddStudent(predictionResult);
      onClose();
    }
  };

  const loadExample = (type: 'critico' | 'regular' | 'destacado') => {
    if (type === 'critico') {
      setNombreCodigo('EST-2026-901 - Fernando Suárez');
      setSexo('Masculino');
      setPais('Colombia');
      setCursos(7);
      setBimestre1(9.0);
      setBimestre2(9.5);
      setAsistencia(62);
      setHoras(5);
    } else if (type === 'regular') {
      setNombreCodigo('EST-2026-902 - Mariana Benítez');
      setSexo('Femenino');
      setPais('México');
      setCursos(5);
      setBimestre1(13.0);
      setBimestre2(13.5);
      setAsistencia(82);
      setHoras(11);
    } else {
      setNombreCodigo('EST-2026-903 - Santiago Valenzuela');
      setSexo('Masculino');
      setPais('Chile');
      setCursos(4);
      setBimestre1(16.5);
      setBimestre2(17.0);
      setAsistencia(96);
      setHoras(16);
    }
    setPredictionResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">
              Simulador de Predicción 2026 (Bimestres 1 y 2)
            </h2>
            <p className="text-xs text-slate-400">
              Evaluación temprana con las columnas del modelo de Random Forest
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick presets */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">Cargar caso de prueba rápido:</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => loadExample('critico')}
              className="px-2 py-1 rounded bg-red-100 hover:bg-red-200 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-medium text-[11px] cursor-pointer"
            >
              Riesgo Alto
            </button>
            <button
              type="button"
              onClick={() => loadExample('regular')}
              className="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium text-[11px] cursor-pointer"
            >
              Riesgo Medio
            </button>
            <button
              type="button"
              onClick={() => loadExample('destacado')}
              className="px-2 py-1 rounded bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium text-[11px] cursor-pointer"
            >
              Riesgo Bajo
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handlePredict} className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
          
          {/* Nombre o Código */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Nombre o Código del Estudiante *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: EST-2026-601 - Andrea Gómez"
              value={nombreCodigo}
              onChange={(e) => setNombreCodigo(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Sexo */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Sexo *
              </label>
              <select
                value={sexo}
                onChange={(e) => setSexo(e.target.value as Gender)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
              >
                <option value="Femenino">Femenino</option>
                <option value="Masculino">Masculino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            {/* País */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                País *
              </label>
              <select
                value={pais}
                onChange={(e) => setPais(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Cursos */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Cursos Matriculados *
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={cursos}
                onChange={(e) => setCursos(Number(e.target.value))}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Bimestres 1 y 2 */}
          <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-900 dark:text-blue-300">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Calificaciones Año 2026 (Consolidado de los 2 primeros bimestres)
              </span>
              <span className="font-mono text-blue-600 dark:text-blue-400">
                Promedio B1+B2: <strong>{promB1B2}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400 text-[11px] font-medium">
                  Calificación Bimestre 1 (0 a 20)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  value={bimestre1}
                  onChange={(e) => setBimestre1(Number(e.target.value))}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400 text-[11px] font-medium">
                  Calificación Bimestre 2 (0 a 20)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  value={bimestre2}
                  onChange={(e) => setBimestre2(Number(e.target.value))}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Asistencia y Horas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Asistencia (%):
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={asistencia}
                onChange={(e) => setAsistencia(Number(e.target.value))}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Horas Estudio/Semana:
              </label>
              <input
                type="number"
                min="0"
                max="40"
                value={horas}
                onChange={(e) => setHoras(Number(e.target.value))}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Predict Button */}
          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs tracking-wide shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            <span>Calcular Predicción con Random Forest</span>
          </button>

          {/* Prediction Result Display */}
          {predictionResult && (
            <div className="p-4 rounded-xl border space-y-3 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Riesgo Predicho:</span>
                  <span className={`text-base font-bold ${
                    predictionResult.riesgo_academico === 'Alto'
                      ? 'text-red-600 dark:text-red-400'
                      : predictionResult.riesgo_academico === 'Medio'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {predictionResult.riesgo_academico} (Probabilidad: {(predictionResult.probabilidad_riesgo * 100).toFixed(0)}%)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSaveAndAdd}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs tracking-wide shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar en Dataset 2026</span>
                </button>
              </div>

              {/* Explanatory bullet factors */}
              <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                {predictionResult.factores_clave?.map((f, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </form>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
