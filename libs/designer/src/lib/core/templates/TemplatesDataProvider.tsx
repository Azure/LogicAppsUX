import { type TemplateServiceOptions, TemplatesWrappedContext } from './TemplatesDesignerContext';
import type React from 'react';
import { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../state/templates/store';
import {
  loadGithubManifestNames,
  loadGithubManifests,
  templatesCountPerPage,
  lazyLoadGithubManifests,
  setSubscriptionsFilters,
} from '../state/templates/manifestSlice';
import { type ResourceDetails, setInitialData } from '../state/templates/workflowSlice';
import type { ConnectionReferences } from '../../common/models/workflow';
import { initializeTemplateServices, initializeWorkflowMetadata, loadCustomTemplates } from '../actions/bjsworkflow/templates';
import type { Template } from '@microsoft/logic-apps-shared';
import { setEnableResourceSelection, setViewTemplateDetails } from '../state/templates/templateOptionsSlice';
import { changeCurrentTemplateName } from '../state/templates/templateSlice';

export interface TemplatesDataProviderProps {
  isConsumption: boolean | undefined;
  isCreateView: boolean;
  resourceDetails: ResourceDetails;
  services: TemplateServiceOptions;
  connectionReferences: ConnectionReferences;
  viewTemplate?: Template.ViewTemplateDetails;
  children?: React.ReactNode;
  servicesToReload?: Partial<TemplateServiceOptions>;
  enableResourceSelection?: boolean;
  onResourceChange?: () => void;
}

const DataProviderInner = ({ children }: TemplatesDataProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { githubTemplateNames, selectedSubs } = useSelector((state: RootState) => ({
    githubTemplateNames: state.manifest.githubTemplateNames,
    selectedSubs: state.manifest.filters.subscriptions,
  }));

  useEffect(() => {
    dispatch(loadGithubManifestNames());
  }, [dispatch]);

  useEffect(() => {
    dispatch(loadCustomTemplates());
  }, [dispatch, selectedSubs]);

  useEffect(() => {
    if (githubTemplateNames) {
      dispatch(loadGithubManifests(templatesCountPerPage));

      if (githubTemplateNames.length > templatesCountPerPage) {
        dispatch(lazyLoadGithubManifests(templatesCountPerPage));
      }
    }
  }, [dispatch, githubTemplateNames]);

  return <>{children}</>;
};

export const TemplatesDataProvider = (props: TemplatesDataProviderProps) => {
  const wrapped = useContext(TemplatesWrappedContext);
  const dispatch = useDispatch<AppDispatch>();
  const { servicesInitialized, subscriptionId, resourceGroup, location, workflowAppName, manifest } = useSelector((state: RootState) => ({
    servicesInitialized: state.templateOptions.servicesInitialized,
    subscriptionId: state.workflow.subscriptionId,
    resourceGroup: state.workflow.resourceGroup,
    location: state.workflow.location,
    workflowAppName: state.workflow.workflowAppName,
    manifest: state.template.manifest,
  }));
  const {
    services,
    isConsumption,
    resourceDetails,
    connectionReferences,
    isCreateView,
    viewTemplate,
    enableResourceSelection,
    onResourceChange,
  } = props;

  if (!wrapped) {
    throw new Error('TemplatesDataProvider must be used inside of a TemplatesWrappedContext');
  }

  useEffect(() => {
    if (!servicesInitialized) {
      dispatch(initializeTemplateServices(services));
    }
  }, [dispatch, servicesInitialized, services]);

  useEffect(() => {
    dispatch(
      setInitialData({
        isConsumption: !!isConsumption,
        subscriptionId: resourceDetails.subscriptionId,
        resourceGroup: resourceDetails.resourceGroup,
        location: resourceDetails.location,
        workflowAppName: resourceDetails.workflowAppName,
        references: connectionReferences,
        isCreateView: isCreateView,
      })
    );

    dispatch(setSubscriptionsFilters([{ value: resourceDetails.subscriptionId, displayName: resourceDetails.subscriptionId }]));
  }, [connectionReferences, dispatch, isConsumption, isCreateView, resourceDetails]);

  useEffect(() => {
    if (viewTemplate) {
      dispatch(changeCurrentTemplateName(viewTemplate.id));
      dispatch(setViewTemplateDetails(viewTemplate));
    }

    if (enableResourceSelection) {
      dispatch(setEnableResourceSelection(enableResourceSelection));
    }
  }, [dispatch, enableResourceSelection, viewTemplate]);

  useEffect(() => {
    if (
      onResourceChange &&
      (subscriptionId !== undefined || resourceGroup !== undefined || location !== undefined || workflowAppName !== undefined)
    ) {
      onResourceChange();
    }
  }, [onResourceChange, subscriptionId, resourceGroup, location, workflowAppName]);

  useEffect(() => {
    if (manifest) {
      dispatch(initializeWorkflowMetadata());
    }
  }, [dispatch, manifest]);

  if (!servicesInitialized) {
    return null;
  }

  return props.viewTemplate ? <>{props.children}</> : <DataProviderInner {...props} />;
};
