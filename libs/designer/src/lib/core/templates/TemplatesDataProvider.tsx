import { TemplatesWrappedContext } from './TemplatesDesignerContext';
// import { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import type React from 'react';
import { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../state/templates/store';
import { loadManifestNames, loadManifests } from '../state/templates/manifestSlice';
import { setAppid, setConsumption, setWorkflowName } from '../state/templates/workflowSlice';

export interface TemplatesDataProviderProps {
  appId: string | undefined;
  isConsumption: boolean | undefined;
  workflowName: string | undefined;
  children?: React.ReactNode;
}

const DataProviderInner = ({ appId, isConsumption, workflowName, children }: TemplatesDataProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { availableTemplateNames } = useSelector((state: RootState) => state.manifest);

  useEffect(() => {
    if (availableTemplateNames) {
      dispatch(loadManifests({}));
    }
  }, [dispatch, availableTemplateNames]);

  useEffect(() => {
    dispatch(loadManifestNames());
  }, [dispatch]);

  useEffect(() => {
    if (appId) {
      dispatch(setAppid(appId));
    }
  }, [dispatch, appId]);

  useEffect(() => {
    dispatch(setConsumption(!!isConsumption));
  }, [dispatch, isConsumption]);

  useEffect(() => {
    if (workflowName) {
      dispatch(setWorkflowName(workflowName));
    }
  }, [dispatch, workflowName]);

  return <>{children}</>;
};

export const TemplatesDataProvider = (props: TemplatesDataProviderProps) => {
  const wrapped = useContext(TemplatesWrappedContext);

  if (!wrapped) {
    throw new Error('TemplatesDataProvider must be used inside of a TemplatesWrappedContext');
  }

  return <DataProviderInner {...props} />;
};
