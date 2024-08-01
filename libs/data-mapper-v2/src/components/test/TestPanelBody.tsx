import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useStyles } from './styles';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../core/state/Store';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel } from '@fluentui/react-components';
import { type EditorContentChangedEventArgs, MonacoEditor } from '@microsoft/designer-ui';
import { EditorLanguage, SchemaFileFormat } from '@microsoft/logic-apps-shared';
import { saveSampleData } from '../../core/state/PanelSlice';

type TestPanelBodyProps = {};

export const TestPanelBody = (_props: TestPanelBodyProps) => {
  const intl = useIntl();
  const styles = useStyles();
  const dispatch = useDispatch<AppDispatch>();
  const { sampleDataContent, result } = useSelector((state: RootState) => state.panel.testPanel);

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
        defaultMessage: 'Paste your sample data to test the mapping.',
        id: '33U26u',
        description: 'Sample test data placeholder',
      }),
      RESULT: intl.formatMessage({
        defaultMessage: 'Result',
        id: '3hHkAn',
        description: 'Result',
      }),
      RESULT_PLACEHOLDER: intl.formatMessage({
        defaultMessage: 'Paste and Test sample data to get the latest results',
        id: 'iKzxth',
        description: 'Placeholder result',
      }),
    }),
    [intl]
  );

  const onSampleDataChange = useCallback(
    (e: EditorContentChangedEventArgs) => {
      dispatch(saveSampleData(e.value ?? ''));
    },
    [dispatch]
  );

  return (
    <div className={styles.bodyWrapper}>
      <Accordion multiple={true} collapsible={true} defaultOpenItems={['sample-data', 'result']}>
        <AccordionItem value={'sample-data'}>
          <AccordionHeader className={styles.accordianHeader} expandIconPosition={'end'}>
            {stringResources.SAMPLE_TEST_DATA}
          </AccordionHeader>
          <AccordionPanel>
            <MonacoEditor
              language={sourceSchema?.type === SchemaFileFormat.JSON ? EditorLanguage.json : EditorLanguage.xml}
              value={sampleDataContent ?? ''}
              className={styles.editorStyle}
              lineNumbers={'on'}
              scrollbar={{ horizontal: 'hidden', vertical: 'auto' }}
              height="200px"
              wordWrap="on"
              wrappingIndent="same"
              onContentChanged={onSampleDataChange}
            />
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem value={'result'}>
          <AccordionHeader className={styles.accordianHeader} expandIconPosition={'end'}>
            {stringResources.RESULT}
          </AccordionHeader>
          <AccordionPanel>
            <MonacoEditor
              language={targetSchema?.type === SchemaFileFormat.JSON ? EditorLanguage.json : EditorLanguage.xml}
              value={result ?? ''}
              className={styles.editorStyle}
              lineNumbers={'on'}
              scrollbar={{ horizontal: 'hidden', vertical: 'auto' }}
              height="200px"
              wordWrap="on"
              wrappingIndent="same"
              readOnly
            />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
