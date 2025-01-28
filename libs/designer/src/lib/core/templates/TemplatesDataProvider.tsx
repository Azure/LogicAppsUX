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
import { initializeTemplateServices, loadTemplate } from '../actions/bjsworkflow/templates';
import type { Template } from '@microsoft/logic-apps-shared';
import { lockTemplate } from '../state/templates/templateSlice';
import { openCreateWorkflowPanelView } from '../state/templates/panelSlice';

export interface TemplatesDataProviderProps {
  isConsumption: boolean | undefined;
  existingWorkflowName: string | undefined;
  resourceDetails: ResourceDetails;
  services: TemplateServiceOptions;
  connectionReferences: ConnectionReferences;
  customTemplates?: Record<string, Template.Manifest>;
  viewTemplate?: {
    templateName: string;
  };
  children?: React.ReactNode;
}

const DataProviderInner = ({
  customTemplates,
  isConsumption,
  existingWorkflowName,
  viewTemplate,
  children,
}: TemplatesDataProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { githubTemplateNames, availableTemplates, filters } = useSelector((state: RootState) => state?.manifest);
  const { isTemplateNameLocked } = useSelector((state: RootState) => state.template);

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

  useEffect(() => {
    if (viewTemplate?.templateName && githubTemplateNames?.includes(viewTemplate.templateName) && !isTemplateNameLocked) {
      const templateManifest = availableTemplates?.[viewTemplate.templateName];
      if (templateManifest) {
        dispatch(lockTemplate(viewTemplate.templateName));
        dispatch(loadTemplate({ preLoadedManifest: templateManifest, isCustomTemplate: false }));

        if (Object.keys(templateManifest?.workflows ?? {}).length === 0) {
          dispatch(openCreateWorkflowPanelView());
        }
      }
    }
  }, [dispatch, availableTemplates, viewTemplate, isTemplateNameLocked, githubTemplateNames]);

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
