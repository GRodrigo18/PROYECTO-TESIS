import React from 'react';
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Building2,
  Calendar, 
  BookOpen, 
  Cpu, 
  ShieldAlert 
} from 'lucide-react';
import { StudentRecord } from '../types';
import { escalaATexto } from '../utils/colabEngine';

interface StudentDetailModalProps {
  student: StudentRecord | null;
  onClose: () => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  onClose,
}) => {
  if (!student) return null;

  const enRiesgo = student.estado_riesgo_real === 1;
  const votosRiesgo = student.votos_arboles?.riesgo || 0;
  const votosNormal = student.votos_arboles?.normal || 100;
  const totalArboles = student.votos_arboles?.total_arboles || 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner ${
              enRiesgo 
                ? 'bg-red-500/20 text-red-400 border border-red-500/40' 
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            }`}>
              {enRiesgo ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{student.nombre}</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {student.ID_Estudiante}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Año Académico {student.anio_academico} · {student.tipo_conjunto === 'prueba_2026' ? 'Cohorte 2026 (Validación)' : 'Entrenamiento Histórico'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          
          {/* Status summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block flex items-center gap-1">
                <Building2 className="w-3 h-3 text-indigo-500" />
                <span>Sede</span>
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5 block truncate" title={student.sede}>
                {student.sede || 'Sede Central'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block">Sexo</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5 block">
                {student.sexo}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block">Nota Mínima</span>
              <span className={`font-bold font-mono text-xs mt-0.5 block ${student.nota_minima === 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {student.nota_minima} ({escalaATexto(student.nota_minima)})
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block">Prom. Estandarizado</span>
              <span className="font-bold font-mono text-blue-600 text-xs mt-0.5 block">
                {student.promedio_estandarizado} / 3.0
              </span>
            </div>
          </div>

          {/* Random Forest Voting Breakdown */}
          <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                <span className="font-bold">Inferencia Ensamble Random Forest ({totalArboles} Árboles)</span>
              </div>
              <span className="font-mono font-bold text-blue-400">
                {((student.probabilidad_riesgo || 0) * 100).toFixed(0)}% Alerta
              </span>
            </div>

            {/* Voting Bar */}
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div 
                className="bg-red-500 h-full transition-all" 
                style={{ width: `${(votosRiesgo / totalArboles) * 100}%` }}
                title={`Votos Riesgo: ${votosRiesgo}`}
              />
              <div 
                className="bg-emerald-500 h-full transition-all" 
                style={{ width: `${(votosNormal / totalArboles) * 100}%` }}
                title={`Votos Normal: ${votosNormal}`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="text-red-400 font-mono">
                {votosRiesgo} árboles votan Riesgo
              </span>
              <span className="text-emerald-400 font-mono">
                {votosNormal} árboles votan Normal
              </span>
            </div>
          </div>

          {/* Cursos del Estudiante */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Desglose de Calificaciones por Asignatura</span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-2 px-3">Asignatura</th>
                    <th className="py-2 px-3 text-center">Nota Original</th>
                    <th className="py-2 px-3 text-center">Escala Oficial (0 a 3)</th>
                    <th className="py-2 px-3 text-center">Impacto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {Object.keys(student.cursos).map(cName => {
                    const cData = student.cursos[cName];
                    const esZero = cData.estandarizada === 0;

                    return (
                      <tr key={cName} className={esZero ? 'bg-red-50/50 dark:bg-red-950/20' : ''}>
                        <td className="py-2 px-3 font-sans font-medium text-slate-800 dark:text-slate-200">
                          {cName}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400 font-bold">
                          {cData.original}
                        </td>
                        <td className="py-2 px-3 text-center font-bold">
                          <span className={esZero ? 'text-red-600' : 'text-slate-800 dark:text-slate-200'}>
                            {cData.estandarizada}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-sans text-[11px]">
                          {esZero ? (
                            <span className="text-red-600 font-bold">Detona Riesgo (C)</span>
                          ) : (
                            <span className="text-emerald-600">Aprobado</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Regla Metodológica */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 leading-relaxed">
            <strong>Regla Aplicada:</strong> Si la nota mínima en cualquiera de sus cursos es 0 (C), el estudiante es etiquetado en Estado_Riesgo = 1.
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cerrar Detalle
          </button>
        </div>

      </div>
    </div>
  );
};
