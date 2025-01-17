import { type TemplateServiceOptions, TemplatesWrappedContext } from './TemplatesDesignerContext';
import type React from 'react';
import { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../state/templates/store';
import {
  lazyLoadManifests,
  loadManifestNames,
  loadManifests,
  setFilteredTemplateNames,
  templatesCountPerPage,
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

export interface TemplatesDataProviderProps {
  isConsumption: boolean | undefined;
  existingWorkflowName: string | undefined;
  resourceDetails: ResourceDetails;
  services: TemplateServiceOptions;
  connectionReferences: ConnectionReferences;
  children?: React.ReactNode;
}

const DataProviderInner = ({ isConsumption, children }: TemplatesDataProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { availableTemplateNames, availableTemplates, filters } = useSelector((state: RootState) => state?.manifest);

  useEffect(() => {
    if (!availableTemplateNames) {
      dispatch(loadManifestNames());
    }
  }, [dispatch, availableTemplateNames]);

  useEffect(() => {
    if (availableTemplateNames) {
      dispatch(loadManifests(templatesCountPerPage));

      if (availableTemplateNames.length > templatesCountPerPage) {
        dispatch(lazyLoadManifests(templatesCountPerPage));
      }
    }
  }, [dispatch, availableTemplateNames]);

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

    dispatch(setResourceDetails(props.resourceDetails));
    dispatch(initializeConnectionReferences(props.connectionReferences));
    dispatch(setConsumption(!!props.isConsumption));

    if (props.existingWorkflowName) {
      dispatch(setExistingWorkflowName(props.existingWorkflowName));
    }
  }, [
    dispatch,
    servicesInitialized,
    props.services,
    props.resourceDetails,
    props.connectionReferences,
    props.existingWorkflowName,
    props.isConsumption,
  ]);

  if (!servicesInitialized) {
    return null;
  }

  return <DataProviderInner {...props} />;
};
