import React, { useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  Save, 
  RotateCcw, 
  Calendar, 
  User, 
  Globe, 
  BookOpen, 
  ShieldAlert,
  Sliders,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { StudentPrediction, Gender, RiskLevel } from '../types';
import { predictStudentRisk } from '../utils/randomForestSimulator';

interface SimulatorSectionProps {
  onAddStudent: (student: StudentPrediction) => void;
  onGoToTest2026: () => void;
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

export const SimulatorSection: React.FC<SimulatorSectionProps> = ({
  onAddStudent,
  onGoToTest2026,
}) => {
  const [nombreCodigo, setNombreCodigo] = useState('EST-2026-701 - Marcelo Echevarría');
  const [sexo, setSexo] = useState<Gender>('Masculino');
  const [pais, setPais] = useState('Perú');
  const [cursos, setCursos] = useState<number>(6);
  const [b1, setB1] = useState<number>(10.5);
  const [b2, setB2] = useState<number>(11.0);
  const [asistencia, setAsistencia] = useState<number>(72);
  const [horas, setHoras] = useState<number>(8);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const promB1B2 = Number(((Number(b1) + Number(b2)) / 2).toFixed(2));

  // Inferencia en tiempo real reactiva
  const livePrediction = predictStudentRisk({
    nombre_codigo: nombreCodigo.trim() || 'EST-2026-AUTO',
    sexo,
    pais,
    cursos: Number(cursos),
    b1: Number(b1),
    b2: Number(b2),
    promedio_previo: promB1B2,
    asistencia_pct: Number(asistencia),
    horas_estudio_semanal: Number(horas),
    anio: 2026,
  });

  const handleSave = () => {
    onAddStudent(livePrediction);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const loadPreset = (type: 'critico' | 'regular' | 'destacado') => {
    if (type === 'critico') {
      setNombreCodigo('EST-2026-702 - Leonardo Falconi');
      setSexo('Masculino');
      setPais('Colombia');
      setCursos(7);
      setB1(9.0);
      setB2(9.5);
      setAsistencia(62);
      setHoras(5);
    } else if (type === 'regular') {
      setNombreCodigo('EST-2026-703 - Mariana Sotomayor');
      setSexo('Femenino');
      setPais('México');
      setCursos(5);
      setB1(13.0);
      setB2(13.5);
      setAsistencia(82);
      setHoras(11);
    } else {
      setNombreCodigo('EST-2026-704 - Santiago Del Solar');
      setSexo('Masculino');
      setPais('Chile');
      setCursos(4);
      setB1(16.5);
      setB2(17.0);
      setAsistencia(96);
      setHoras(16);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <Sliders className="w-4 h-4" />
              <span>FASE 05 · SIMULADOR Y LABORATORIO DE INFERENCIA EN VIVO</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Simulación de Evaluación para Estudiante Individual (2026)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
              Prueba reactiva de cómo votan los 150 árboles del bosque aleatorio ante variaciones en el promedio consolidado de B1 y B2, carga de cursos y asistencia. Puedes guardar el resultado en el dataset activo de 2026.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadPreset('critico')}
              className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-semibold text-xs border border-red-200 dark:border-red-900/50 cursor-pointer"
            >
              Caso Alto Riesgo
            </button>
            <button
              type="button"
              onClick={() => loadPreset('destacado')}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold text-xs border border-emerald-200 dark:border-emerald-900/50 cursor-pointer"
            >
              Caso Bajo Riesgo
            </button>
          </div>
        </div>
      </div>

      {/* Simulator Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Interactive Input Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Parámetros del Alumno</span>
          </h3>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Nombre o Código del Estudiante *
            </label>
            <input
              type="text"
              value={nombreCodigo}
              onChange={(e) => setNombreCodigo(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Sexo</label>
              <select
                value={sexo}
                onChange={(e) => setSexo(e.target.value as Gender)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="Femenino">Femenino</option>
                <option value="Masculino">Masculino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">País</label>
              <select
                value={pais}
                onChange={(e) => setPais(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
              >
                {COUNTRIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Cursos</label>
              <input
                type="number"
                min="1"
                max="10"
                value={cursos}
                onChange={(e) => setCursos(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Bimestres 1 y 2 */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Calificaciones 2026 (Consolidado Bimestres 1 y 2)
              </span>
              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                Promedio B1+B2: {promB1B2}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500">Bimestre 1 (0 a 20):</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  value={b1}
                  onChange={(e) => setB1(Number(e.target.value))}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500">Bimestre 2 (0 a 20):</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  value={b2}
                  onChange={(e) => setB2(Number(e.target.value))}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Asistencia & Horas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Asistencia (%):</label>
              <input
                type="number"
                min="0"
                max="100"
                value={asistencia}
                onChange={(e) => setAsistencia(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Horas Estudio / Semana:</label>
              <input
                type="number"
                min="0"
                max="40"
                value={horas}
                onChange={(e) => setHoras(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Save Action */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Guardar en Dataset Activo (Cohorte 2026)</span>
            </button>
            {savedSuccess && (
              <p className="text-center text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-2 animate-in fade-in">
                ✓ Estudiante agregado exitosamente al dataset 2026
              </p>
            )}
          </div>
        </div>

        {/* Right: Live Inferred Diagnosis & Tree Voting */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5 text-xs">
          
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Diagnóstico en Tiempo Real de Random Forest
            </h3>
            <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
              Inferencia Reactiva
            </span>
          </div>

          {/* Primary Inferred Result Card */}
          <div className={`p-4 rounded-xl border ${
            livePrediction.riesgo_academico === 'Alto'
              ? 'bg-red-50/70 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-900 dark:text-red-300'
              : livePrediction.riesgo_academico === 'Medio'
              ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300'
              : 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold opacity-75">
                  Riesgo Predicho para 2026
                </span>
                <div className="text-xl font-bold mt-0.5">
                  Riesgo {livePrediction.riesgo_academico}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] uppercase tracking-wider font-semibold opacity-75">
                  Probabilidad
                </span>
                <div className="text-xl font-bold font-mono">
                  {(livePrediction.probabilidad_riesgo * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </div>

          {/* Voting Breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Distribución de Votos (150 Árboles):
              </span>
              <span className="text-slate-400">
                {livePrediction.votos_arboles?.alto} Alto · {livePrediction.votos_arboles?.medio} Medio · {livePrediction.votos_arboles?.bajo} Bajo
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
              <div 
                style={{ width: `${((livePrediction.votos_arboles?.alto || 0) / 150) * 100}%` }}
                className="bg-red-500 h-full"
              />
              <div 
                style={{ width: `${((livePrediction.votos_arboles?.medio || 0) / 150) * 100}%` }}
                className="bg-amber-500 h-full"
              />
              <div 
                style={{ width: `${((livePrediction.votos_arboles?.bajo || 0) / 150) * 100}%` }}
                className="bg-emerald-500 h-full"
              />
            </div>
          </div>

          {/* Key Factors Detected */}
          <div className="space-y-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300 block">
              Factores Críticos Detectados:
            </span>
            <div className="space-y-1.5">
              {livePrediction.factores_clave?.map((factor, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-2">
                  <span className="text-blue-500 font-bold">•</span>
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
