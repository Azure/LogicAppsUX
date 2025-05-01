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
} from '../state/templates/manifestSlice';
import { type ResourceDetails, setInitialData } from '../state/templates/workflowSlice';
import type { ConnectionReferences } from '../../common/models/workflow';
import {
  initializeTemplateServices,
  initializeWorkflowMetadata,
  loadCustomTemplates,
  reloadTemplates,
} from '../actions/bjsworkflow/templates';
import { InitTemplateService, type Template } from '@microsoft/logic-apps-shared';
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
  reload?: boolean;
  servicesToReload?: Partial<TemplateServiceOptions>;
  enableResourceSelection?: boolean;
  onResourceChange?: () => void;
}

const DataProviderInner = ({ children, reload, services }: TemplatesDataProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { githubTemplateNames, servicesInitialized } = useSelector((state: RootState) => ({
    githubTemplateNames: state.manifest.githubTemplateNames,
    servicesInitialized: state.templateOptions.servicesInitialized,
  }));

  useEffect(() => {
    dispatch(loadGithubManifestNames());
    dispatch(loadCustomTemplates());
  }, [dispatch]);

  useEffect(() => {
    if (reload !== undefined) {
      if (servicesInitialized && services.templateService) {
        InitTemplateService(services.templateService);
      }
      dispatch(reloadTemplates({ clear: true }));
    }
  }, [reload, dispatch, services.templateService, servicesInitialized]);

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
  }, [dispatch, servicesInitialized, isConsumption, resourceDetails, connectionReferences, isCreateView, services]);

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
