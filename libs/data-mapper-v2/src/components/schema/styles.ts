import { makeStyles, tokens } from '@fluentui/react-components';
import { panelWidth, panelWidthWithoutHandles } from '../../utils/ReactFlow.Util';
import { customTokens } from '../../core/ThemeConect';

export const useStyles = makeStyles({
  root: {
    width: `${panelWidth}px`,
    height: '100%',
  },
  targetScehmaRoot: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
});

export const usePanelStyles = makeStyles({
  root: {
    width: `${panelWidthWithoutHandles}px`,
    height: '100%',
    overflow: 'visible',
  },
  schemaSelection: {
    backgroundColor: tokens.colorNeutralBackground1,
  },
  schemaTree: {
    backgroundColor: customTokens['panelBackground'],
  },
  header: {
    paddingLeft: '20px',
    fontWeight: 'initial',
    fontSize: '20px',
  },
  body: {
    paddingRight: '0px',
    paddingLeft: '0px',
    width: `${panelWidth}px`,
    scrollbarWidth: 'none',
  },
  targetSchemaBody: {
    position: 'relative',
    left: '-16px',
  },
});

export const usePanelBodyStyles = makeStyles({
  root: {
    display: 'flex',
    width: '100%',
    flexDirection: 'column',
    height: '100%',
  },
  treeContainer: {
    display: 'flex',
    width: '100%',
    flexDirection: 'column',
    height: '100%',
  },
});
