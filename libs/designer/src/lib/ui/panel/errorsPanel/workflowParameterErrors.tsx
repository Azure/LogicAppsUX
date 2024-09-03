import { openPanel } from '../../../core/state/panelV2/panelSlice';
import { WorkflowParametersErrorCard } from '@microsoft/designer-ui';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

interface WorkflowParameterErrorsProps {
  parameterNames?: Record<string, string>;
  errors?: Record<string, Record<string, string | undefined>>;
}

export const WorkflowParameterErrors = (props: WorkflowParameterErrorsProps) => {
  const { parameterNames, errors } = props;

  const dispatch = useDispatch();

  const onClick = useCallback(() => {
    dispatch(openPanel({ panelMode: 'WorkflowParameters' }));
  }, [dispatch]);

  return <WorkflowParametersErrorCard parameterNames={parameterNames} errors={errors} onClick={onClick} />;
};
