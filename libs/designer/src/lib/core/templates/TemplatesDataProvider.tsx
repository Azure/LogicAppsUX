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
import { type ResourceDetails, setInitialData } from '../state/templates/workflowSlice';
import { useAreServicesInitialized } from '../state/templates/templateselectors';
import type { ConnectionReferences } from '../../common/models/workflow';
import { getFilteredTemplates } from './utils/helper';
import { initializeTemplateServices } from '../actions/bjsworkflow/templates';
import type { Template } from '@microsoft/logic-apps-shared';
import { setViewTemplateDetails } from '../state/templates/templateOptionsSlice';
import { changeCurrentTemplateName } from '../state/templates/templateSlice';

export interface TemplatesDataProviderProps {
  isConsumption: boolean | undefined;
  isCreateView: boolean;
  existingWorkflowName?: string;
  resourceDetails: ResourceDetails;
  services: TemplateServiceOptions;
  connectionReferences: ConnectionReferences;
  customTemplates?: Record<string, Template.Manifest>;
  viewTemplate?: Template.ViewTemplateDetails;
  children?: React.ReactNode;
}

const DataProviderInner = ({ isConsumption, children }: TemplatesDataProviderProps) => {
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
    if (!availableTemplates) {
      dispatch(setFilteredTemplateNames(undefined));
      return;
    }
    const filteredTemplateNames = getFilteredTemplates(availableTemplates, filters, !!isConsumption);
    dispatch(setFilteredTemplateNames(filteredTemplateNames));
  }, [dispatch, availableTemplates, filters, isConsumption]);

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

    dispatch(
      setInitialData({
        existingWorkflowName: props.existingWorkflowName,
        isConsumption: !!props.isConsumption,
        subscriptionId: props.resourceDetails.subscriptionId,
        resourceGroup: props.resourceDetails.resourceGroup,
        location: props.resourceDetails.location,
        workflowAppName: props.resourceDetails.workflowAppName,
        references: props.connectionReferences,
        isCreateView: props.isCreateView,
      })
    );
  }, [
    dispatch,
    servicesInitialized,
    props.services,
    props.existingWorkflowName,
    props.isConsumption,
    props.resourceDetails,
    props.connectionReferences,
    props.isCreateView,
  ]);

  useEffect(() => {
    if (props.viewTemplate) {
      dispatch(changeCurrentTemplateName(props.viewTemplate.id));
      dispatch(setViewTemplateDetails(props.viewTemplate));
    }
  }, [dispatch, props.viewTemplate]);

  useEffect(() => {
    if (props.customTemplates) {
      dispatch(setCustomTemplates(props.customTemplates));
    }
  }, [dispatch, props.customTemplates]);

  if (!servicesInitialized) {
    return null;
  }

  return props.viewTemplate ? <>{props.children}</> : <DataProviderInner {...props} />;
};
