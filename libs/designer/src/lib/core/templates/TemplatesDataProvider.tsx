import { type TemplateServiceOptions, TemplatesWrappedContext } from './TemplatesDesignerContext';
import type React from 'react';
import { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../state/templates/store';
import {
  loadGithubManifestNames,
  loadGithubManifests,
  setCustomTemplates,
  setFilteredTemplateNames,
} from '../state/templates/manifestSlice';
import {
  type ResourceDetails,
  setConsumption,
  setExistingWorkflowName,
  setResourceDetails,
  initializeConnectionReferences,
} from '../state/templates/workflowSlice';
import { useAreServicesInitialized } from '../state/templates/templateselectors';
import type { ConnectionReferences } from '../../common/models/workflow';
import { getFilteredTemplates } from './utils/helper';
import { initializeTemplateServices } from '../actions/bjsworkflow/templates';
import type { Template } from '@microsoft/logic-apps-shared';

export interface TemplatesDataProviderProps {
  isConsumption: boolean | undefined;
  existingWorkflowName?: string;
  resourceDetails: ResourceDetails;
  services: TemplateServiceOptions;
  connectionReferences: ConnectionReferences;
  customTemplates?: Record<string, Template.Manifest>;
  children?: React.ReactNode;
}

const DataProviderInner = ({ customTemplates, isConsumption, existingWorkflowName, children }: TemplatesDataProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { githubTemplateNames, availableTemplates, filters } = useSelector((state: RootState) => state?.manifest);

  useEffect(() => {
    dispatch(loadGithubManifestNames());
  }, [dispatch]);

  useEffect(() => {
    if (githubTemplateNames) {
      dispatch(loadGithubManifests());
    }
  }, [dispatch, githubTemplateNames]);

  useEffect(() => {
    if (customTemplates) {
      dispatch(setCustomTemplates(customTemplates));
    }
  }, [dispatch, customTemplates]);

  useEffect(() => {
    if (!availableTemplates) {
      dispatch(setFilteredTemplateNames(undefined));
      return;
    }
    const filteredTemplateNames = getFilteredTemplates(availableTemplates, filters, !!isConsumption);
    dispatch(setFilteredTemplateNames(filteredTemplateNames));
  }, [dispatch, availableTemplates, filters, isConsumption]);

  useEffect(() => {
    dispatch(setConsumption(!!isConsumption));
  }, [dispatch, isConsumption]);

  useEffect(() => {
    if (existingWorkflowName) {
      dispatch(setExistingWorkflowName(existingWorkflowName));
    }
  }, [dispatch, existingWorkflowName]);

  return <>{children}</>;
};

export const TemplatesDataProvider = (props: TemplatesDataProviderProps) => {
  const wrapped = useContext(TemplatesWrappedContext);
  const dispatch = useDispatch<AppDispatch>();
  const servicesInitialized = useAreServicesInitialized();

  if (!wrapped) {
    throw new Error('TemplatesDataProvider must be used inside of a TemplatesWrappedContext');
  }

  useEffect(() => {
    if (!servicesInitialized) {
      dispatch(initializeTemplateServices(props.services));
    }

    dispatch(setResourceDetails(props.resourceDetails));
    dispatch(initializeConnectionReferences(props.connectionReferences));
  }, [dispatch, servicesInitialized, props.services, props.resourceDetails, props.connectionReferences]);

  if (!servicesInitialized) {
    return null;
  }

  return <DataProviderInner {...props} />;
};
