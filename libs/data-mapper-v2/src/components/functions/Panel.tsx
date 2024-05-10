import { useState, useMemo } from 'react';
import { useStyles } from './styles';
import { ChevronDoubleRightRegular, ChevronDoubleLeftRegular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { Button, InlineDrawer } from '@fluentui/react-components';
import { Text } from '@fluentui/react';
import { FunctionList } from '../functionList/FunctionList';
import { FunctionsSVG } from '../functionList/styles';

type PanelProps = {};

export const Panel = (_props: PanelProps) => {
  const [expandFunctionsPanel, setExpandFunctionsPanel] = useState(false);
  const styles = useStyles();
  const intl = useIntl();

  const stringResources = useMemo(
    () => ({
      FUNCTIONS: intl.formatMessage({
        defaultMessage: 'Functions',
        id: 'zsc+jp',
        description: 'Functions',
      }),
      DRAWER_CHEVRON_OPEN: intl.formatMessage({
        defaultMessage: 'open functions drawer',
        id: '1Xke9D',
        description: 'aria label to open functions drawer',
      }),
      COLLAPSE_FUNCTIONS_DRAWER: intl.formatMessage({
        defaultMessage: 'collapse functions drawer',
        id: 'iBArTB',
        description: 'aria label to collapse functions drawer',
      }),
    }),
    [intl]
  );

  return (
    <InlineDrawer
      className={expandFunctionsPanel ? styles.expandedDataMapperFunctionPanel : styles.collapsedDataMapperFunctionPanel}
      open={true}
      size="small"
    >
      {expandFunctionsPanel ? (
        <div className={styles.expandedDrawerBodyWrapper}>
          <div className={styles.drawerHeaderWrapper}>
            <Text className={styles.drawerHeader}>{stringResources.FUNCTIONS}</Text>
            <Button
              appearance="transparent"
              className={styles.chevronButton}
              aria-label={stringResources.DRAWER_CHEVRON_OPEN}
              icon={<ChevronDoubleLeftRegular fontSize={18} className={styles.functionsChevronIcon} />}
              onClick={() => {
                setExpandFunctionsPanel(false);
              }}
            />
          </div>
          <div className={styles.functionList}>
            <FunctionList />
          </div>
        </div>
      ) : (
        <div
          className={styles.collapsedDrawerBodyWrapper}
          onClick={() => {
            setExpandFunctionsPanel(true);
          }}
        >
          <FunctionsSVG />
          <Button
            className={styles.chevronButton}
            appearance="transparent"
            aria-label={stringResources.DRAWER_CHEVRON_OPEN}
            icon={<ChevronDoubleRightRegular fontSize={18} className={styles.functionsChevronIcon} />}
            onClick={() => {
              setExpandFunctionsPanel(true);
            }}
          />
        </div>
      )}
    </InlineDrawer>
  );
};
