import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Database, Sliders, BarChart3, Bell, Cpu } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Paso1CargaSection } from './components/Paso1CargaSection';
import { ProjectPhase, ResultadoAuditoria, ResultadosPipeline } from './types';
import { borrarLocal, guardarLocal, leerLocal } from './utils/guardadoLocal';
import { pct, num } from './components/ui';

// Los pasos 2-5 (gráficos) y el lector de Excel se cargan cuando se usan: la primera carga pesa menos.
const Paso2ValidacionSection = lazy(() => import('./components/Paso2ValidacionSection').then(m => ({ default: m.Paso2ValidacionSection })));
const Paso3ModeloSection = lazy(() => import('./components/Paso3ModeloSection').then(m => ({ default: m.Paso3ModeloSection })));
const Paso4PrediccionesSection = lazy(() => import('./components/Paso4PrediccionesSection').then(m => ({ default: m.Paso4PrediccionesSection })));
const Paso5SimuladorSection = lazy(() => import('./components/Paso5SimuladorSection').then(m => ({ default: m.Paso5SimuladorSection })));

const PASOS: Array<{ id: ProjectPhase; label: string; icon: React.FC<{ className?: string }>; requiereDatos: boolean }> = [
  { id: 'paso1_carga', label: '1. Carga', icon: Database, requiereDatos: false },
  { id: 'paso2_validacion', label: '2. Validación y exclusión', icon: Sliders, requiereDatos: true },
  { id: 'paso3_modelo', label: '3. Modelo y métricas', icon: BarChart3, requiereDatos: false },
  { id: 'paso4_predicciones', label: '4. Predicciones 2026', icon: Bell, requiereDatos: false },
  { id: 'paso5_simulador', label: '5. Simulador', icon: Cpu, requiereDatos: false },
];

export default function App() {
  const [auditoria, setAuditoria] = useState<ResultadoAuditoria | null>(null);
  const [resultados, setResultados] = useState<ResultadosPipeline | null>(null);
  const [currentPhase, setCurrentPhase] = useState<ProjectPhase>('paso1_carga');
  const [toastMessage, setToastMessage] = useState<{ texto: string; error: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [persistente, setPersistente] = useState<boolean | null>(null);

  // Cada aviso reinicia el temporizador: uno anterior ya no borra antes de tiempo al siguiente.
  const showToast = useCallback((msg: string, error = false) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage({ texto: msg, error });
    toastTimer.current = setTimeout(() => setToastMessage(null), error ? 8000 : 4500);
  }, []);

  // Guarda en el servidor (lo ve cualquier navegador) y deja una copia en este navegador.
  const guardar = useCallback(async (a: ResultadoAuditoria, silencioso = false): Promise<boolean> => {
    setIsSaving(true);
    try {
      const resp = await fetch('/api/dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditoria: a }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || 'Error al guardar en el servidor');
      setIsSaved(true);
      setLastSavedAt(data.savedAt);
      if (typeof data.persistente === 'boolean') setPersistente(data.persistente);
      await guardarLocal({ auditoria: a, savedAt: data.savedAt });
      if (!silencioso) showToast('Validación guardada en el servidor y en este navegador.');
      return true;
    } catch (err: any) {
      // Sin servidor queda al menos la copia del navegador
      const savedAt = new Date().toISOString();
      await guardarLocal({ auditoria: a, savedAt });
      setIsSaved(false);
      showToast(`${err.message}. Quedó una copia en este navegador.`, true);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [showToast]);

  useEffect(() => {
    // Validación guardada: la del servidor, o la copia de este navegador si es más reciente
    // (o si el servidor la perdió al reiniciarse); en ese caso se vuelve a subir.
    (async () => {
      const [srv, local] = await Promise.all([
        fetch('/api/dataset').then(r => (r.ok ? r.json() : null)).catch(() => null),
        leerLocal(),
      ]);
      if (typeof srv?.persistente === 'boolean') setPersistente(srv.persistente);
      const srvAt = srv?.hasData ? Date.parse(srv.savedAt || '') || 0 : -1;
      const localAt = local ? Date.parse(local.savedAt) || 0 : -1;
      if (srvAt >= 0 && srvAt >= localAt) {
        setAuditoria(srv.auditoria);
        setIsSaved(true);
        setLastSavedAt(srv.savedAt);
        if (localAt < srvAt) guardarLocal({ auditoria: srv.auditoria, savedAt: srv.savedAt });
      } else if (local) {
        setAuditoria(local.auditoria);
        setLastSavedAt(local.savedAt);
        showToast('Se recuperó la última validación guardada en este navegador.');
        if (srv) guardar(local.auditoria, true);
      }
    })();
    // Resultados reales del pipeline Python
    fetch('/api/resultados')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setResultados(d))
      .catch(() => {});
  }, [guardar, showToast]);

  const handleFileUpload = async (file: File) => {
    try {
      const { auditarArchivo } = await import('./utils/validacion');
      const res = await auditarArchivo(file);
      setAuditoria(res);
      setIsSaved(false);
      setLastSavedAt(null);
      // Se guarda al momento: antes había que pulsar «Guardar» y, si no, se perdía al recargar.
      const resumen = `«${file.name}»: ${res.perfil.total_validos} válidos, ${res.perfil.total_excluidos} excluidos.`;
      showToast(`${resumen} Guardando…`);
      if (await guardar(res, true)) showToast(`${resumen} Guardado.`);
    } catch (err: any) {
      showToast(err.message || 'No se pudo leer el archivo.', true);
    }
  };

  const handleSaveData = async () => {
    if (auditoria) await guardar(auditoria);
  };

  const handleClear = async () => {
    try {
      await fetch('/api/dataset', { method: 'DELETE' });
    } catch {}
    await borrarLocal();
    setAuditoria(null);
    setIsSaved(false);
    setLastSavedAt(null);
    setCurrentPhase('paso1_carga');
    showToast('Se borró el archivo validado. Los resultados del pipeline no se tocan.');
  };

  const opt = resultados?.informe?.test.umbral_optimo;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased">
      <Navbar
        hayDatos={auditoria !== null}
        modeloEntrenado={Boolean(resultados?.disponible)}
        onInicio={() => setCurrentPhase('paso1_carga')}
        onClearData={handleClear}
        onSaveData={handleSaveData}
        isSaving={isSaving}
        isSaved={isSaved}
        lastSavedAt={lastSavedAt}
      />

      {/* Solo en el Paso 1: en los demás pasos (lo que se muestra al jurado) no hace falta */}
      {auditoria && persistente === false && currentPhase === 'paso1_carga' && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            El servidor guarda la validación en un disco temporal: si se reinicia o se duerme por inactividad, se borra.
            Queda una copia en este navegador y se vuelve a subir sola. Para que dure en el servidor, configure <code>DATABASE_URL</code>.
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs max-w-md">
          {toastMessage.error
            ? <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            : <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
          <span className="leading-tight">{toastMessage.texto}</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 flex items-center justify-between gap-2 overflow-x-auto shadow-xs">
          <div className="flex items-center gap-1.5 min-w-max">
            {PASOS.map(({ id, label, icon: Icon, requiereDatos }) => (
              <button key={id} onClick={() => setCurrentPhase(id)} disabled={requiereDatos && !auditoria}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                  currentPhase === id ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                <Icon className="w-3.5 h-3.5" /><span>{label}</span>
              </button>
            ))}
          </div>
          {opt && (
            <div className="hidden lg:flex items-center gap-3 text-xs text-slate-500 pr-2">
              <span>Prueba {resultados?.informe?.particion.prueba}:</span>
              <span>PR-AUC <strong className="text-blue-600 font-mono">{num(opt.pr_auc)}</strong></span>
              <span>Sensibilidad <strong className="text-emerald-600 font-mono">{pct(opt.sensibilidad_recall)}</strong></span>
              <span>Precisión <strong className="font-mono">{pct(opt.precision)}</strong></span>
              <span>F1 <strong className="font-mono">{num(opt.f1)}</strong></span>
            </div>
          )}
        </div>

        <Suspense fallback={<div className="text-xs text-slate-500 p-6">Cargando…</div>}>
        {currentPhase === 'paso1_carga' && (
          <Paso1CargaSection auditoria={auditoria} onFileUpload={handleFileUpload} onNextStep={() => setCurrentPhase('paso2_validacion')} />
        )}
        {currentPhase === 'paso2_validacion' && auditoria && (
          <Paso2ValidacionSection auditoria={auditoria} onPrevStep={() => setCurrentPhase('paso1_carga')} onNextStep={() => setCurrentPhase('paso3_modelo')} />
        )}
        {currentPhase === 'paso3_modelo' && (
          <Paso3ModeloSection resultados={resultados}
            formatoSinBimestres={auditoria?.perfil.formato_detectado === 'una_nota_por_curso'}
            onPrevStep={() => setCurrentPhase(auditoria ? 'paso2_validacion' : 'paso1_carga')}
            onNextStep={() => setCurrentPhase('paso4_predicciones')} />
        )}
        {currentPhase === 'paso4_predicciones' && (
          <Paso4PrediccionesSection resultados={resultados} onPrevStep={() => setCurrentPhase('paso3_modelo')} onNextStep={() => setCurrentPhase('paso5_simulador')} />
        )}
        {currentPhase === 'paso5_simulador' && (
          <Paso5SimuladorSection modeloDisponible={Boolean(resultados?.modelo_disponible)} onPrevStep={() => setCurrentPhase('paso4_predicciones')} />
        )}
        </Suspense>
      </main>

      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 text-center sm:text-left">
          Validación en el navegador con las reglas de <code>auditar_excel.py</code> · Modelo, métricas y predicciones: <code>tesis-rf/src/pipeline_rf_tesis.py</code> (scikit-learn, random_state=42)
        </div>
      </footer>
    </div>
  );
}
