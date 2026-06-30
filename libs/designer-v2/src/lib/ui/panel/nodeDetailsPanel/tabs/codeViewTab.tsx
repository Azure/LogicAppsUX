import constants from '../../../../common/constants';
import { serializeOperation } from '../../../../core/actions/bjsworkflow/serializer';
import { updateNodeFromCodeView } from '../../../../core/actions/bjsworkflow/updateNodeFromCodeView';
import { useReadOnly } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import { useActionMetadata } from '../../../../core/state/workflow/workflowSelectors';
import type { AppDispatch, RootState } from '../../../../core/store';
import type { PanelTabFn, PanelTabProps } from '@microsoft/designer-ui';
import { EditableCodeView, Peek } from '@microsoft/designer-ui';
import { isNullOrEmpty } from '@microsoft/logic-apps-shared';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useStore } from 'react-redux';

export const CodeViewTab: React.FC<PanelTabProps> = (props) => {
  const { nodeId } = props;
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const readOnly = useReadOnly();
  const nodeMetaData = useActionMetadata(nodeId) as any;
  // Read the store directly so that each (re)serialization—including the refetch after a
  // save—reflects the latest state rather than a snapshot captured at render time.
  const store = useStore<RootState>();
  const queryData = useQuery(['serialization', { nodeId }], () => serializeOperation(store.getState(), nodeId), {
    retry: false,
    cacheTime: 0,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const serializedContent = useMemo(
    () => JSON.stringify(isNullOrEmpty(queryData.data) ? { inputs: nodeMetaData?.inputs ?? {} } : queryData.data, null, 2),
    [queryData.data, nodeMetaData?.inputs]
  );

  const [editedContent, setEditedContent] = useState<string>(serializedContent);
  const [isSaving, setIsSaving] = useState(false);

  // Re-sync the editor when the underlying serialization changes (e.g. node switch, external edits).
  useEffect(() => {
    setEditedContent(serializedContent);
  }, [serializedContent]);

  const isDirty = editedContent !== serializedContent;

  const validationError = useMemo(() => {
    if (!isDirty) {
      return undefined;
    }
    try {
      JSON.parse(editedContent);
      return undefined;
    } catch {
      return intl.formatMessage({
        defaultMessage: 'Invalid JSON. Fix the errors before saving.',
        id: 'eaI2mF',
        description: 'Validation error shown when the edited action code is not valid JSON',
      });
    }
  }, [editedContent, isDirty, intl]);

  const labels = useMemo(
    () => ({
      save: intl.formatMessage({ defaultMessage: 'Save', id: 'SUqh1Y', description: 'Button to save the edited action code' }),
      saving: intl.formatMessage({
        defaultMessage: 'Saving…',
        id: 'OMW+Rg',
        description: 'Label shown while saving the edited action code',
      }),
      discard: intl.formatMessage({
        defaultMessage: 'Discard',
        id: 'kWpQvf',
        description: 'Button to discard edits made to the action code',
      }),
    }),
    [intl]
  );

  const handleDiscard = useCallback(() => {
    setEditedContent(serializedContent);
  }, [serializedContent]);

  const handleSave = useCallback(async () => {
    if (validationError) {
      return;
    }
    let parsed: any;
    try {
      parsed = JSON.parse(editedContent);
    } catch {
      return;
    }
    setIsSaving(true);
    try {
      await dispatch(updateNodeFromCodeView({ nodeId, serializedOperation: parsed })).unwrap();
      await queryData.refetch();
    } finally {
      setIsSaving(false);
    }
  }, [dispatch, editedContent, nodeId, queryData, validationError]);

  if (queryData.isLoading) {
    return <Peek input={'Loading ...'} />;
  }

  if (readOnly) {
    return <Peek input={serializedContent} />;
  }

  return (
    <EditableCodeView
      value={editedContent}
      onChange={setEditedContent}
      onSave={handleSave}
      onDiscard={handleDiscard}
      isDirty={isDirty}
      isSaving={isSaving}
      errorMessage={validationError}
      labels={labels}
    />
  );
};

export const codeViewTab: PanelTabFn = (intl, props) => ({
  id: constants.PANEL_TAB_NAMES.CODE_VIEW,
  title: intl.formatMessage({
    defaultMessage: 'Code preview',
    id: 'fAty0o',
    description: 'The tab label for the code view tab on the operation panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Code view tab',
    id: '2On4Xu',
    description: 'An accessibility label that describes the code view tab',
  }),
  visible: true,
  content: <CodeViewTab {...props} />,
  order: 3,
  icon: 'Info',
});
