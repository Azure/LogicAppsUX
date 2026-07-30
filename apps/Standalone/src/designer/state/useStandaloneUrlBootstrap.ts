import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from './store';
import { shouldLoadWorkflowFromUrl, standaloneUrlParams } from './store';
import { loadStandaloneUrlWorkflow } from './urlParams';

/**
 * Loads the mock workflow (and optional run instance) requested through URL query parameters
 * so automation and shared repro links can skip the Dev Toolbox entirely. Everything that can
 * be applied synchronously has already been handled while creating the store.
 */
export const useStandaloneUrlBootstrap = (): void => {
  const dispatch = useDispatch<AppDispatch>();
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!shouldLoadWorkflowFromUrl || hasLoaded.current) {
      return;
    }
    hasLoaded.current = true;
    loadStandaloneUrlWorkflow(dispatch, standaloneUrlParams);
  }, [dispatch]);
};
