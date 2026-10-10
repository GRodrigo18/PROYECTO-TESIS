import React, { useState } from 'react';
import { 
  Sliders, 
  ArrowRight, 
  ArrowLeft,
  Search, 
  Building2, 
  Filter,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { StudentRecord } from '../types';

interface Paso2EstandarizacionSectionProps {
  records: StudentRecord[];
  onNextStep: () => void;
  onPrevStep?: () => void;
  onSelectStudent: (record: StudentRecord) => void;
}

export const Paso2EstandarizacionSection: React.FC<Paso2EstandarizacionSectionProps> = ({
  records,
  onNextStep,
  onPrevStep,
  onSelectStudent,
}) => {
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState<'Todos' | 'train' | 'test'>('Todos');
  const [sedeFilter, setSedeFilter] = useState<string>('Todas');

  const df_train = records.filter(r => r.anio_academico <= 2025);
  const df_test = records.filter(r => r.anio_academico === 2026);

  // Sedes disponibles
  const availableSedes = Array.from(new Set(records.map(r => r.sede).filter(Boolean)));

  const filtered = records.filter(r => {
    if (yearFilter === 'train' && r.anio_academico > 2025) return false;
    if (yearFilter === 'test' && r.anio_academico !== 2026) return false;
    if (sedeFilter !== 'Todas' && r.sede !== sedeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const m = r.nombre.toLowerCase().includes(q) || 
                r.ID_Estudiante.toLowerCase().includes(q) ||
                (r.sede && r.sede.toLowerCase().includes(q));
      if (!m) return false;
    }
    return true;
  });

  // Lista de cursos disponibles
  const sampleCursos = records[0] ? Object.keys(records[0].cursos) : [];

  return (
    <div className="space-y-6 tab-content-enter">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-600 dark:text-blue-400 mb-1">
              <span>⚙️ PASO 2</span>
              <span>·</span>
              <span>ESTANDARIZACIÓN Y REGLA METODOLÓGICA</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Estandarización de Notas (0 a 3) y Partición Temporal
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {onPrevStep && (
              <button
                type="button"
                onClick={onPrevStep}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Paso 1: Carga</span>
              </button>
            )}

            <button
              type="button"
              onClick={onNextStep}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <span>Ir a Paso 3: Entrenar Random Forest</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-4xl">
          Como los datos de 2020 a 2025 combinan letras (AD, A, B, C) y notas numéricas vigesimales (0 a 20), el algoritmo estandariza todo a la escala numérica <strong>0 a 3</strong>. Si la nota mínima de cualquiera de sus asignaturas es <strong>0 (C)</strong>, se activa la etiqueta de <strong>Estado_Riesgo = 1</strong> en cualquiera de las 5 sedes.
        </p>

        {/* Equivalencias Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block font-mono">
              AD · 18 a 20 → 3
            </span>
            <span className="text-xs text-emerald-800 dark:text-emerald-200 font-semibold mt-0.5 block">
              Logro Muy Destacado
            </span>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
            <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 block font-mono">
              A · 14 a 17 → 2
            </span>
            <span className="text-xs text-blue-800 dark:text-blue-200 font-semibold mt-0.5 block">
              Logro Esperado (Promedio)
            </span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 block font-mono">
              B · 11 a 13 → 1
            </span>
            <span className="text-xs text-amber-800 dark:text-amber-200 font-semibold mt-0.5 block">
              En Proceso
            </span>
          </div>

          <div className="p-3 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
            <span className="text-[11px] font-bold text-red-700 dark:text-red-400 block font-mono">
              C · 0 a 10 → 0
            </span>
            <span className="text-xs text-red-800 dark:text-red-200 font-semibold mt-0.5 block">
              En Inicio (Activa Riesgo)
            </span>
          </div>
        </div>

        {/* Partición Temporal Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-400 block text-[11px]">df_train (Entrenamiento):</span>
              <strong className="text-slate-800 dark:text-slate-200 font-mono text-sm">
                {df_train.length} registros (2020-2025)
              </strong>
            </div>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <div>
              <span className="text-slate-400 block text-[11px]">df_test (Validación):</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                {df_test.length} registros (2026)
              </strong>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-mono bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            Regla: np.where(min(cursos) == 0, 1, 0)
          </div>
        </div>
      </div>

      {/* Table with Original vs Standardized Grades & Sede */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setYearFilter('Todos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  yearFilter === 'Todos'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Todos ({records.length})
              </button>
              <button
                onClick={() => setYearFilter('train')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  yearFilter === 'train'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Entrenamiento (2020-2025: {df_train.length})
              </button>
              <button
                onClick={() => setYearFilter('test')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  yearFilter === 'test'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Validación (2026: {df_test.length})
              </button>
            </div>

            {/* Sede Selector */}
            <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sedeFilter}
                onChange={(e) => setSedeFilter(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="Todas">Todas las Sedes ({records.length})</option>
                {availableSedes.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ID, nombre o sede..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Data Grid with Sede Column */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-2.5 px-3">ID Estudiante</th>
                <th className="py-2.5 px-3">Nombre</th>
                <th className="py-2.5 px-3">Sede</th>
                <th className="py-2.5 px-3">Año</th>
                <th className="py-2.5 px-3">Sexo</th>
                {sampleCursos.map(c => (
                  <th key={c} className="py-2.5 px-3 text-center">
                    {c} (Orig → Std)
                  </th>
                ))}
                <th className="py-2.5 px-3 text-center">Nota Mínima</th>
                <th className="py-2.5 px-3 text-center">Estado_Riesgo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono tabular-nums">
              {filtered.map(student => {
                const enRiesgo = student.estado_riesgo_real === 1;
                return (
                  <tr 
                    key={student.id}
                    onClick={() => onSelectStudent(student)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {student.ID_Estudiante}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-800 dark:text-slate-200">
                      {student.nombre}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {student.sede}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold">
                      {student.anio_academico}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-500">
                      {student.sexo}
                    </td>
                    {sampleCursos.map(c => {
                      const cData = student.cursos[c];
                      const esZero = cData?.estandarizada === 0;
                      return (
                        <td key={c} className="py-2.5 px-3 text-center">
                          <span className={esZero ? 'text-red-600 dark:text-red-400 font-bold' : ''}>
                            {cData?.original} → <strong>{cData?.estandarizada}</strong>
                          </span>
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-3 text-center font-bold">
                      <span className={student.nota_minima === 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                        {student.nota_minima}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-sans font-bold">
                      {enRiesgo ? (
                        <span className="text-red-600 dark:text-red-400">1 (En Riesgo)</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">0 (Normal)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
