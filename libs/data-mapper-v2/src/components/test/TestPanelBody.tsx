import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useStyles } from './styles';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../core/state/Store';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, MessageBar, MessageBarBody, Spinner } from '@fluentui/react-components';
import { type EditorContentChangedEventArgs, MonacoEditor } from '@microsoft/designer-ui';
import { EditorLanguage, LogEntryLevel, LoggerService, SchemaFileFormat } from '@microsoft/logic-apps-shared';
import { updateTestInput } from '../../core/state/PanelSlice';
import { LogCategory } from '../../utils/Logging.Utils';

const sampleDataPlaceHolderEditorId = 'sample-data-editor-placeholder';
const resultPlaceHolderEditorId = 'result-editor-placeholder';

type TestPanelBodyProps = {
  loading: boolean;
};
export const TestPanelBody = (props: TestPanelBodyProps) => {
  const { loading } = props;
  const intl = useIntl();
  const styles = useStyles();
  const dispatch = useDispatch<AppDispatch>();
  const { testMapInput, testMapOutput, testMapOutputError } = useSelector((state: RootState) => state.panel.testPanel);

  const sourceSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchema);

  const { isDirty } = useSelector((state: RootState) => state.dataMap.present);

  const stringResources = useMemo(
    () => ({
      SAMPLE_DATA: intl.formatMessage({
        defaultMessage: 'Sample data',
        id: 'nRjpgk',
        description: 'Sample data for testing',
      }),
      SAMPLE_TEST_DATA_PLACEHOLDER: intl.formatMessage({
        defaultMessage: 'Paste your sample data to test the mapping',
        id: 'S5kFNK',
        description: 'Sample test data placeholder',
      }),
      RESULT: intl.formatMessage({
        defaultMessage: 'Result',
        id: '3hHkAn',
        description: 'Result',
      }),
      RESULT_PLACEHOLDER: intl.formatMessage({
        defaultMessage: 'Test your map to see a result',
        id: 'UVr0mL',
        description: 'Placeholder result',
      }),
      TEST_INFO_MESSAGE: intl.formatMessage({
        defaultMessage: 'To generate and test with the latest XSLT, please save the map first.',
        id: 'DIwFTo',
        description: 'Save map info',
      }),
    }),
    [intl]
  );

  const updatePlaceHolder = useCallback((id: string, value?: string) => {
    const placeholder = document.getElementById(id);
    if (placeholder) {
      placeholder.style.display = value ? 'none' : 'block';
    }
  }, []);

  const onSampleDataChange = useCallback(
    (e: EditorContentChangedEventArgs) => {
      const value = e?.value ?? '';
      dispatch(updateTestInput(value));
      updatePlaceHolder(sampleDataPlaceHolderEditorId, value);
    },
    [dispatch, updatePlaceHolder]
  );

  const onSampleDataEditorLoaded = useCallback(() => {
    updatePlaceHolder(sampleDataPlaceHolderEditorId, testMapInput);
  }, [testMapInput, updatePlaceHolder]);

  const onResultContentChange = useCallback(
    (e: EditorContentChangedEventArgs) => {
      updatePlaceHolder(resultPlaceHolderEditorId, e?.value ?? '');
    },
    [updatePlaceHolder]
  );

  const onResultEditorLoaded = useCallback(() => {
    updatePlaceHolder(resultPlaceHolderEditorId, testMapInput);
  }, [testMapInput, updatePlaceHolder]);

  const content = useMemo(() => {
    let content: any;

    // If there's an error, show the error message
    if (testMapOutputError) {
      content = testMapOutputError;
    }

    // If there's a response, show the response content
    if (!content && testMapOutput?.outputInstance?.$content) {
      content = testMapOutput?.outputInstance?.$content;
    }

    // If there's neither of the above, show the status code and status text
    if (!content && testMapOutput?.statusCode) {
      content = testMapOutput?.statusCode;

      if (testMapOutput?.statusText) {
        content = `${content} - ${testMapOutput?.statusText}`;
      }
    }

    if (content) {
      try {
        return JSON.stringify(JSON.parse(content), null, 2);
      } catch (err) {
        LoggerService().logErrorWithFormatting(err, `${LogCategory.DataMapperDesigner}/testPanelMessage`, LogEntryLevel.Verbose);
        return content;
      }
    }

    return undefined;
  }, [testMapOutput, testMapOutputError]);

  return (
    <div className={styles.bodyWrapper}>
      {isDirty && (
        <MessageBar key={'test-panel-info'} intent={'info'} className={styles.messageBar}>
          <MessageBarBody>{stringResources.TEST_INFO_MESSAGE}</MessageBarBody>
        </MessageBar>
      )}
      <Accordion multiple={true} collapsible={true} defaultOpenItems={['sample-data', 'result']}>
        <AccordionItem value={'sample-data'}>
          <AccordionHeader className={styles.accordianHeader} expandIconPosition={'end'}>
            {stringResources.SAMPLE_DATA}
          </AccordionHeader>
          <AccordionPanel className={styles.accordianPanel}>
            <MonacoEditor
              language={sourceSchema?.type === SchemaFileFormat.JSON ? EditorLanguage.json : EditorLanguage.xml}
              value={testMapInput ?? ''}
              className={styles.editorStyle}
              lineNumbers={'on'}
              scrollbar={{ horizontal: 'hidden', vertical: 'visible' }}
              height="200px"
              width="100%"
              wordWrap="on"
              wrappingIndent="same"
              onContentChanged={onSampleDataChange}
              onEditorLoaded={onSampleDataEditorLoaded}
            />
            {!testMapInput && (
              <div id={sampleDataPlaceHolderEditorId} className={styles.monacoEditorPlaceHolder}>
                {stringResources.SAMPLE_TEST_DATA_PLACEHOLDER}
              </div>
            )}
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem value={'result'}>
          <AccordionHeader className={styles.accordianHeader} expandIconPosition={'end'}>
            {stringResources.RESULT}
            {loading && <Spinner className={styles.bodySpinner} size={'tiny'} />}
          </AccordionHeader>
          <AccordionPanel className={styles.accordianPanel}>
            <MonacoEditor
              language={
                content ? EditorLanguage.json : targetSchema?.type === SchemaFileFormat.JSON ? EditorLanguage.json : EditorLanguage.xml
              }
              value={content}
              className={styles.editorStyle}
              lineNumbers={'on'}
              scrollbar={{ horizontal: 'hidden', vertical: 'visible' }}
              height="200px"
              width="100%"
              wordWrap="on"
              onContentChanged={onResultContentChange}
              onEditorLoaded={onResultEditorLoaded}
              readOnly
            />
            {!content && (
              <div id={resultPlaceHolderEditorId} className={styles.monacoEditorPlaceHolder}>
                {stringResources.RESULT_PLACEHOLDER}
              </div>
            )}
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
