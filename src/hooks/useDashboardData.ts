import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiGet, Filters } from '../services/api';
import { endpointMap, pendingState, projectDashboard, replaceBlock, tabEndpoints, validateBlock, type DashboardState, type DashboardTab } from './dashboardState';
export type { DashboardTab } from './dashboardState';

export function useDashboardData(filters: Filters, activeTab: DashboardTab, refreshKey: number, enabled = true, canViewInconsistencias = false) {
  const scope = JSON.stringify([filters, activeTab, refreshKey, enabled, canViewInconsistencias]);
  const keys = enabled ? tabEndpoints[activeTab].filter(key => canViewInconsistencias || !key.startsWith('inconsistencias')) : [];
  const [state, setState] = useState<DashboardState>(() => pendingState(scope, keys));
  const active = useRef({ scope: '', controllers: new Map<string, AbortController>() });
  const request = useCallback(async (key: string, controller: AbortController, force: boolean) => {
    const current = () => !controller.signal.aborted && active.current.scope === scope && active.current.controllers.get(key) === controller;
    const update = (block: Parameters<typeof replaceBlock>[3]) => setState(old => current() ? replaceBlock(old, scope, key, block) : old);
    try {
      const result = await apiGet(endpointMap[key], filters, undefined, { signal: controller.signal, cache: false, refresh: force });
      update({ status: 'success', data: validateBlock(key, result), updatedAt: Date.now() });
    } catch (error) {
      if (current()) update({ status: 'error', error: error instanceof Error && error.name !== 'AbortError' ? error.message : 'Consulta interrompida. Tente novamente.' });
    }
  }, [scope, filters]);

  useEffect(() => {
    const controllers = new Map<string, AbortController>();
    active.current = { scope, controllers };
    setState(pendingState(scope, keys));
    for (const key of keys) {
      const controller = new AbortController();
      controllers.set(key, controller);
      void request(key, controller, refreshKey > 0);
    }
    return () => { controllers.forEach(controller => controller.abort()); };
  }, [scope, request]);

  const retry = useCallback((key: string) => {
    if (active.current.scope !== scope || !keys.includes(key)) return;
    active.current.controllers.get(key)?.abort();
    const controller = new AbortController();
    active.current.controllers.set(key, controller);
    setState(old => replaceBlock(old, scope, key, { status: 'loading' }));
    void request(key, controller, true);
  }, [scope, request]);

  return useMemo(() => {
    // Hide the previous scope before effect cleanup or the next response.
    const visible = state.scope === scope ? state : pendingState(scope, keys);
    const result = projectDashboard(visible.blocks);
    return { ...result, retry, requestScope: scope, refreshingLabel: result.isUpdating ? 'Consultando dados...' : '' };
  }, [state, scope, retry]);
}
