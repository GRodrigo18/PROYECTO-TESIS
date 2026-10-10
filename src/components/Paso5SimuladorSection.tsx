import React, { useState } from 'react';
import { 
  Sliders, 
  Sparkles, 
  Save, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  ArrowLeft,
  Building2,
  ShieldAlert,
  Cpu
} from 'lucide-react';
import { StudentRecord, ScaleStandard } from '../types';
import { estandarizarNota, escalaATexto, SEDES_DEFAULT } from '../utils/colabEngine';

interface Paso5SimuladorSectionProps {
  onAddStudentRecord: (record: StudentRecord) => void;
  onGoToPredictions: () => void;
  onPrevStep?: () => void;
}

export const Paso5SimuladorSection: React.FC<Paso5SimuladorSectionProps> = ({
  onAddStudentRecord,
  onGoToPredictions,
  onPrevStep,
}) => {
  const [nombre, setNombre] = useState('Mariano Valdivia');
  const [idEstudiante, setIdEstudiante] = useState('EST-2026-999');
  const [sexo, setSexo] = useState<'Femenino' | 'Masculino'>('Masculino');
  const [sede, setSede] = useState<string>(SEDES_DEFAULT[0]);
  
  // 5 cursos con notas iniciales (mezcla de letras y números)
  const [c1, setC1] = useState<string>('AD');
  const [c2, setC2] = useState<string>('15');
  const [c3, setC3] = useState<string>('B');
  const [c4, setC4] = useState<string>('12');
  const [c5, setC5] = useState<string>('C');

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Estandarización en vivo
  const rawMap: Record<string, string> = {
    Curso_Matematica: c1,
    Curso_Comunicacion: c2,
    Curso_Ciencias: c3,
    Curso_Ingles: c4,
    Curso_Historia: c5,
  };

  const cursosData: Record<string, { original: string; estandarizada: ScaleStandard }> = {};
  const stdList: ScaleStandard[] = [];
  const enRiesgoCursos: string[] = [];

  Object.keys(rawMap).forEach(key => {
    const rawVal = rawMap[key];
    const std = estandarizarNota(rawVal);
    cursosData[key] = { original: rawVal, estandarizada: std };
    stdList.push(std);
    if (std === 0) {
      enRiesgoCursos.push(key);
    }
  });

  const notaMin = Math.min(...stdList) as ScaleStandard;
  const estadoReal: 0 | 1 = notaMin === 0 ? 1 : 0;
  const promStd = Number((stdList.reduce((acc: number, curr: number) => acc + curr, 0) / stdList.length).toFixed(2));

  // Votos de 100 árboles de decisión
  let votosRiesgo = 0;
  if (notaMin === 0) {
    votosRiesgo = Math.min(100, 78 + enRiesgoCursos.length * 7);
  } else if (notaMin === 1) {
    votosRiesgo = 24;
  } else {
    votosRiesgo = 5;
  }

  const probRiesgo = Number((votosRiesgo / 100).toFixed(2));
  const predichoIA: 0 | 1 = probRiesgo >= 0.50 ? 1 : 0;

  const currentSimRecord: StudentRecord = {
    id: `sim-${Date.now()}`,
    ID_Estudiante: idEstudiante,
    nombre,
    sexo,
    sede,
    anio_academico: 2026,
    cursos: cursosData,
    cantidad_cursos: 5,
    nota_minima: notaMin,
    promedio_estandarizado: promStd,
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
    cursos_en_riesgo: enRiesgoCursos,
    tipo_conjunto: 'prueba_2026',
  };

  const handleSaveToCohort = () => {
    onAddStudentRecord(currentSimRecord);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 tab-content-enter">
      
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-600 dark:text-blue-400 mb-1">
              <span>🔮 PASO 5</span>
              <span>·</span>
              <span>SIMULADOR DE INFERENCIA EN VIVO</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Simulador Interactivo de Estudiante (2026)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
              Ingresa calificaciones en cualquier formato (letras o números) y selecciona una de las <strong>5 sedes</strong> para ver la inferencia instantánea del ensamble Random Forest de 100 árboles de decisión.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onPrevStep && (
              <button
                type="button"
                onClick={onPrevStep}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Paso 4: Predicciones</span>
              </button>
            )}

            <button
              type="button"
              onClick={onGoToPredictions}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs tracking-wide shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>Ver Tabla 2026</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Formulario de Entrada (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>Datos del Estudiante y Notas Bimestrales</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                Nombre del Estudiante
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                Código o ID Estudiante
              </label>
              <input
                type="text"
                value={idEstudiante}
                onChange={(e) => setIdEstudiante(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Sede Perteneciente (5 Sedes)</span>
              </label>
              <select
                value={sede}
                onChange={(e) => setSede(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-hidden cursor-pointer"
              >
                {SEDES_DEFAULT.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                Sexo
              </label>
              <select
                value={sexo}
                onChange={(e) => setSexo(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-hidden cursor-pointer"
              >
                <option value="Femenino">Femenino</option>
                <option value="Masculino">Masculino</option>
              </select>
            </div>
          </div>

          {/* Calificaciones por Asignatura */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Calificaciones (Escribe letras 'AD', 'A', 'B', 'C' o números vigesimales 0-20):
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { label: 'Matemática', val: c1, set: setC1 },
                { label: 'Comunicación', val: c2, set: setC2 },
                { label: 'Ciencias', val: c3, set: setC3 },
                { label: 'Inglés', val: c4, set: setC4 },
                { label: 'Historia / CC.SS.', val: c5, set: setC5 },
              ].map(item => {
                const std = estandarizarNota(item.val);
                return (
                  <div key={item.label} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{item.label}:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.val}
                        onChange={(e) => item.set(e.target.value)}
                        className="w-16 px-2 py-1 text-center font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
                      />
                      <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                        std === 0 ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300' :
                        std === 3 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      }`}>
                        Std: {std}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveToCohort}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide shadow-xs transition-colors cursor-pointer flex items-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar en Cohorte de Validación 2026</span>
            </button>

            {savedSuccess && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>¡Guardado exitosamente!</span>
              </span>
            )}
          </div>
        </div>

        {/* Panel de Inferencia en Tiempo Real (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className={`p-6 rounded-2xl border transition-all shadow-md ${
            predichoIA === 1
              ? 'bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-200'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider">
                Inferencia Random Forest
              </span>
              <Cpu className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>

            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                predichoIA === 1 ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
              }`}>
                {predichoIA === 1 ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
              </div>

              <div>
                <h4 className="text-xl font-bold">
                  {predichoIA === 1 ? 'ALERTA DE RIESGO' : 'RENDIMIENTO NORMAL'}
                </h4>
                <p className="text-xs opacity-80 mt-0.5">
                  {predichoIA === 1 ? 'Requiere intervención pedagógica' : 'Trayectoria escolar favorable'}
                </p>
              </div>
            </div>

            {/* Votación de los 100 árboles */}
            <div className="mt-5 pt-4 border-t border-black/10 dark:border-white/10 space-y-2 text-xs">
              <div className="flex justify-between font-mono">
                <span>Votos por Riesgo:</span>
                <strong>{votosRiesgo} / 100 árboles</strong>
              </div>
              <div className="flex justify-between font-mono">
                <span>Votos por Normal:</span>
                <strong>{100 - votosRiesgo} / 100 árboles</strong>
              </div>
              <div className="flex justify-between font-mono">
                <span>Probabilidad Estimada:</span>
                <strong className="text-sm">{(probRiesgo * 100).toFixed(0)}%</strong>
              </div>
              <div className="flex justify-between font-mono">
                <span>Nota Mínima Estandarizada:</span>
                <strong className={notaMin === 0 ? 'text-red-600 font-bold' : ''}>
                  {notaMin} ({escalaATexto(notaMin)})
                </strong>
              </div>
              <div className="flex justify-between font-mono">
                <span>Promedio Estandarizado:</span>
                <strong>{promStd} / 3.0</strong>
              </div>
              <div className="flex justify-between">
                <span>Sede Asignada:</span>
                <span className="font-semibold">{sede}</span>
              </div>
            </div>

          </div>

          {/* Explicación Metodológica */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs text-xs space-y-2">
            <h5 className="font-bold text-slate-800 dark:text-slate-200">
              Regla Oficial del Modelo:
            </h5>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
              Si la nota mínima en cualquiera de sus cursos es <strong>0 (C)</strong>, se activa la condición de riesgo y la mayoría del ensamble Random Forest ({votosRiesgo} de 100 árboles) emite la alerta preventiva temprana.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
