import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useStyles } from './styles';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../core/state/Store';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel } from '@fluentui/react-components';
import { type EditorContentChangedEventArgs, MonacoEditor } from '@microsoft/designer-ui';
import { EditorLanguage, SchemaFileFormat } from '@microsoft/logic-apps-shared';
import { updateTestInput } from '../../core/state/PanelSlice';

const sampleDataPlaceHolderEditorId = 'sample-data-editor-placeholder';
const resultPlaceHolderEditorId = 'result-editor-placeholder';

type TestPanelBodyProps = {};
export const TestPanelBody = (_props: TestPanelBodyProps) => {
  const intl = useIntl();
  const styles = useStyles();
  const dispatch = useDispatch<AppDispatch>();
  const { testMapInput, testMapOutput, testMapOutputError } = useSelector((state: RootState) => state.panel.testPanel);

  const sourceSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchema);

  const stringResources = useMemo(
    () => ({
      SAMPLE_TEST_DATA: intl.formatMessage({
        defaultMessage: 'Sample test data',
        id: 'zR2qGG',
        description: 'Sample test data for testing',
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

  const error = useMemo(() => {
    let error: any;

    if (testMapOutputError) {
      error = testMapOutputError;
    }

    if (testMapOutput?.statusCode && testMapOutput?.statusCode >= 300) {
      error = testMapOutput?.outputInstance?.$content;
    }

    if (error) {
      try {
        return JSON.stringify(JSON.parse(error), null, 2);
      } catch (_err) {
        return error;
      }
    }

    return undefined;
  }, [testMapOutput, testMapOutputError]);

  return (
    <div className={styles.bodyWrapper}>
      <Accordion multiple={true} collapsible={true} defaultOpenItems={['sample-data', 'result']}>
        <AccordionItem value={'sample-data'}>
          <AccordionHeader className={styles.accordianHeader} expandIconPosition={'end'}>
            {stringResources.SAMPLE_TEST_DATA}
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
            <div id={sampleDataPlaceHolderEditorId} className={styles.monacoEditorPlaceHolder}>
              {stringResources.SAMPLE_TEST_DATA_PLACEHOLDER}
            </div>
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem value={'result'}>
          <AccordionHeader className={styles.accordianHeader} expandIconPosition={'end'}>
            {stringResources.RESULT}
          </AccordionHeader>
          <AccordionPanel className={styles.accordianPanel}>
            <MonacoEditor
              language={
                error ? EditorLanguage.json : targetSchema?.type === SchemaFileFormat.JSON ? EditorLanguage.json : EditorLanguage.xml
              }
              value={
                error ??
                testMapOutput?.outputInstance?.$content ??
                (testMapOutput?.statusCode && testMapOutput?.statusText
                  ? `${testMapOutput?.statusCode} - ${testMapOutput?.statusText}`
                  : '')
              }
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
            <div id={resultPlaceHolderEditorId} className={styles.monacoEditorPlaceHolder}>
              {stringResources.RESULT_PLACEHOLDER}
            </div>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
