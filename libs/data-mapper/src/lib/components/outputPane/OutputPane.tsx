import { Panel, PanelType } from '@fluentui/react';
import { tokens, makeStyles, Button, Text } from '@fluentui/react-components';
import type { FunctionComponent } from 'react';

export type OutputPaneProps = {
  isOpen: boolean;
};

const useStyles = makeStyles({
  root: {
    color: tokens.colorNeutralBackground4,
  },
  contentPane: {
    display: 'flex',
  },
  topbar: {
    height: '80px',
  },
});

export const OutputPane: FunctionComponent<OutputPaneProps> = (props: OutputPaneProps) => {
  const isOpen = props.isOpen;
  const classes = useStyles();

  return (
    <Panel className={classes.contentPane} type={PanelType.custom} customWidth={'430px'} isOpen={isOpen}>
      <div className="topbar">
        <Button color={tokens.colorNeutralForeground2} appearance="transparent">
          test
        </Button>
        <Text>Sample Text</Text>
      </div>
    </Panel>
  );
};
