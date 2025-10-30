import { QueryKeys } from '../../../run-service';
import type { IValidationData } from '../../../run-service';
import { ApiService } from '../../../run-service/export';
import { updateValidationState } from '../../../state/WorkflowSlice';
import type { AppDispatch, RootState } from '../../../state/store';
import { VSCodeContext } from '../../../webviewCommunication';
import { ReviewList } from '../../components/reviewList/reviewList';
import { getOverallValidationStatus, parseValidationData } from './helper';
import { useContext, useMemo } from 'react';
import { useIntlMessages, exportMessages } from '../../../intl';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { LargeText, XLargeText } from '@microsoft/designer-ui';
import { MessageBar, MessageBarBody } from '@fluentui/react-components';
import { useExportStyles } from '../exportStyles';

export const Validation: React.FC = () => {
  const vscode = useContext(VSCodeContext);
  const workflowState = useSelector((state: RootState) => state.workflow);
  const { baseUrl, accessToken, exportData, cloudHost } = workflowState;
  const { selectedWorkflows, location, selectedSubscription, selectedAdvanceOptions } = exportData;
  const styles = useExportStyles();
  const dispatch: AppDispatch = useDispatch();

  const intlText = useIntlMessages(exportMessages);

  const apiService = useMemo(() => {
    return new ApiService({
      baseUrl,
      accessToken,
      cloudHost,
      vscodeContext: vscode,
    });
  }, [accessToken, baseUrl, cloudHost, vscode]);

  const validateWorkflows = () => {
    return apiService.validateWorkflows(selectedWorkflows, selectedSubscription, location, selectedAdvanceOptions);
  };

  const onValidationSuccess = (successData: { properties: IValidationData }) => {
    const overallValidationStatus = getOverallValidationStatus(successData?.properties);
    dispatch(
      updateValidationState({
        validationState: overallValidationStatus,
      })
    );
  };

  const {
    data: validationData,
    isLoading: isValidationLoading,
    error,
    isError,
  } = useQuery<any>([QueryKeys.validation, { selectedWorkflows: selectedWorkflows }], validateWorkflows, {
    refetchOnWindowFocus: false,
    onSuccess: onValidationSuccess,
  });

  const { validationGroups = [] }: any =
    isValidationLoading || !validationData ? {} : parseValidationData(validationData?.properties, intlText.WORKFLOW_GROUP_DISPLAY_NAME);

  const validationError = useMemo(
    () => (
      <MessageBar intent="error" layout={'multiline'}>
        <MessageBarBody>{(error as any)?.message}</MessageBarBody>
      </MessageBar>
    ),
    [error]
  );

  return (
    <div className={styles.validationContainer}>
      <XLargeText text={intlText.REVIEW_TITLE} style={{ display: 'block' }} />
      <LargeText text={intlText.REVIEW_DESCRIPTION} style={{ display: 'block' }} />
      <div className={styles.validationList}>
        {isError ? validationError : null}
        <ReviewList isValidationLoading={isValidationLoading} validationGroups={validationGroups} />
      </div>
    </div>
  );
};
