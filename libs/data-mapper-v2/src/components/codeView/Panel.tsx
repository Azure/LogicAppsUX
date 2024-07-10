import { useMemo } from 'react';
import { useStyles } from './stylesv2';
import { useIntl } from 'react-intl';
import { InlineDrawer, Button, DrawerHeader, DrawerHeaderTitle } from '@fluentui/react-components';
import { useGlobalStyles } from '../../components/styles';
import { useSelector } from 'react-redux';
import type { RootState } from '../../core/state/Store';
import { Code24Regular, Dismiss20Regular } from '@fluentui/react-icons';

type PanelProps = {};

export const Panel = (_props: PanelProps) => {
  const styles = useStyles();
  const globalStyles = useGlobalStyles();
  const intl = useIntl();
  const isCodeViewOpen = useSelector((state: RootState) => state.panel.isCodeViewOpen);

  const stringResources = useMemo(
    () => ({
      CODE_VIEW: intl.formatMessage({
        defaultMessage: 'Code view',
        id: 'M0xrm+',
        description: 'Code view title',
      }),
      CLOSE_CODE_VIEW: intl.formatMessage({
        defaultMessage: 'Close code view',
        id: '3sJlV+',
        description: 'Close code view button',
      }),
    }),
    [intl]
  );

  return (
    <InlineDrawer className={styles.codePanel} open={isCodeViewOpen}>
      <DrawerHeader>
        <DrawerHeaderTitle heading={{ as: 'h5' }} action={<Button appearance="subtle" aria-label="Close" icon={<Dismiss20Regular />} />}>
          <Code24Regular className={globalStyles.panelTitleIcon} />
          {stringResources.CODE_VIEW}
        </DrawerHeaderTitle>
      </DrawerHeader>
      {/* <div className={styles.expandedDrawerBodyWrapper}>
        <div className={styles.drawerHeaderWrapper}>
          <div className={globalStyles.panelHeader}>
            <Code20Regular />
            <Subtitle2>{stringResources.CODE_VIEW}</Subtitle2>
            <Button
              appearance="transparent"
              className={styles.chevronButtonExpanded}
              aria-label={stringResources.CLOSE_CODE_VIEW}
              icon={
                <Dismiss20Regular
                  fontSize={14}
                  className={styles.functionsChevronIcon}
                />
              }
              onClick={() => {}}
            />
          </div>
        </div>
      </div> */}
    </InlineDrawer>
  );
};
