import { childOutputNodeCardWidth, nodeCardWidth } from '../../constants/NodeConstants';
import { setCurrentOutputNode } from '../../core/state/DataMapSlice';
import type { AppDispatch } from '../../core/state/Store';
import { store } from '../../core/state/Store';
import type { SchemaNodeExtended } from '../../models';
import { SchemaTypes } from '../../models';
import { icon24ForSchemaNodeType } from '../../utils/Icon.Utils';
import type { CardProps } from './NodeCard';
import { getStylesForSharedState } from './NodeCard';
import { Text } from '@fluentui/react';
import {
  Badge,
  Button,
  createFocusOutlineStyle,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import { bundleIcon, ChevronRight16Regular, Important12Filled } from '@fluentui/react-icons';
import type { FunctionComponent } from 'react';
import type { Connection as ReactFlowConnection, NodeProps } from 'react-flow-renderer';
import { Handle, Position } from 'react-flow-renderer';
import { useDispatch } from 'react-redux';

export type SchemaCardProps = {
  schemaNode: SchemaNodeExtended;
  schemaType: SchemaTypes;
  displayHandle: boolean;
  isLeaf: boolean;
  isChild: boolean;
} & CardProps;

const useStyles = makeStyles({
  container: {
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'flex',
    flexDirection: 'row',
    height: '48px',
    opacity: 1,
    width: `${nodeCardWidth}px`,
    alignItems: 'center',
    justifyContent: 'left',
    ...shorthands.gap('8px'),
    ...shorthands.margin('2px'),
    isolation: 'isolate',
    '&:hover': {
      boxShadow: tokens.shadow8,
    },
    '&:active': {
      '&:hover': {
        backgroundColor: tokens.colorNeutralBackground1,
      },
    },
    '&:focus-within': {
      outlineWidth: tokens.strokeWidthThick,
      outlineColor: tokens.colorBrandStroke1,
      outlineStyle: 'solid',
      opacity: 1,
      boxShadow: tokens.shadow4,
    },
  },
  badge: {
    position: 'absolute',
    top: '-7px',
    right: '-10px',
    zIndex: '1',
  },
  contentButton: {
    height: '48px',
    width: '170px',
    ...shorthands.border('0px'),
    ...shorthands.padding('0px'),
    marginRight: '0px',
  },
  cardIcon: {
    backgroundColor: tokens.colorBrandBackground2,
    width: '48px',
    borderStartStartRadius: tokens.borderRadiusMedium,
    borderEndStartRadius: tokens.borderRadiusMedium,
    color: tokens.colorBrandForeground1,
    fontSize: '24px',
    lineHeight: '48px',
    textAlign: 'center',
    flexGrow: '0',
    flexShrink: '0',
    flexBasis: '44px',
    marginRight: '8px',
  },
  cardText: {
    ...typographyStyles.body1Strong,
    display: 'inline-block',
    alignSelf: 'center',
    color: tokens.colorNeutralForeground1,
    textAlign: 'left',
    width: '100%',
  },
  cardChevron: {
    color: tokens.colorNeutralForeground3,
    display: 'flex',
    fontSize: '16px',
    flexBasis: '48px',
    justifyContent: 'right',
  },
  disabled: {
    opacity: 0.38,
  },
  outputChildCard: {
    width: `${childOutputNodeCardWidth}px`,
  },

  focusIndicator: createFocusOutlineStyle({
    style: {
      outlineRadius: '5px',
    },
  }),
});

const cardInputText = makeStyles({
  cardText: {
    width: '136px',
  },
});

const handleStyle: React.CSSProperties = { zIndex: 5, width: '10px', height: '10px' };

const isValidConnection = (connection: ReactFlowConnection): boolean => {
  const flattenedInputSchema = store.getState().dataMap.curDataMapOperation.flattenedInputSchema;
  const flattenedOutputSchema = store.getState().dataMap.curDataMapOperation.flattenedOutputSchema;

  if (connection.source && connection.target && flattenedInputSchema && flattenedOutputSchema) {
    const inputNode = flattenedInputSchema[connection.source];
    const outputNode = flattenedOutputSchema[connection.target];

    // If we have no outputNode that means it's an expression and just allow the connection for now
    // TODO validate expression allowed input types
    return !outputNode || inputNode.schemaNodeDataType === outputNode.schemaNodeDataType;
  }

  return false;
};

export const SchemaCard: FunctionComponent<NodeProps<SchemaCardProps>> = (props: NodeProps<SchemaCardProps>) => {
  const { schemaNode, schemaType, isLeaf, isChild, onClick, disabled, error, displayHandle } = props.data;
  const dispatch = useDispatch<AppDispatch>();
  const classes = useStyles();
  const sharedStyles = getStylesForSharedState();
  const mergedInputText = mergeClasses(classes.cardText, cardInputText().cardText);

  const isOutputChildNode = schemaType === SchemaTypes.Output && isChild;

  const containerStyleClasses = [sharedStyles.root, classes.container];
  if (isOutputChildNode) {
    containerStyleClasses.push(classes.outputChildCard);
  }

  if (disabled) {
    containerStyleClasses.push(classes.disabled);
  }

  const containerStyle = mergeClasses(...containerStyleClasses);

  const showOutputChevron = schemaType === SchemaTypes.Output && !isLeaf;

  const ExclamationIcon = bundleIcon(Important12Filled, Important12Filled);
  const BundledTypeIcon = icon24ForSchemaNodeType(schemaNode.schemaNodeDataType);

  const outputChevronOnClick = (newCurrentSchemaNode: SchemaNodeExtended) => {
    dispatch(setCurrentOutputNode({ schemaNode: newCurrentSchemaNode, resetSelectedInputNodes: true }));
  };

  return (
    <div className={containerStyle}>
      {displayHandle && isLeaf ? (
        <Handle
          type={schemaType === SchemaTypes.Input ? 'source' : 'target'}
          position={schemaType === SchemaTypes.Input ? Position.Right : Position.Left}
          style={handleStyle}
          isValidConnection={isValidConnection}
        />
      ) : null}
      {error && <Badge size="small" icon={<ExclamationIcon />} color="danger" className={classes.badge}></Badge>}{' '}
      <Button disabled={!!disabled} onClick={onClick} appearance={'transparent'} className={classes.contentButton}>
        <span className={classes.cardIcon}>
          <BundledTypeIcon />
        </span>
        <Text className={schemaType === SchemaTypes.Output ? classes.cardText : mergedInputText} block={true} nowrap={true}>
          {schemaNode.name}
        </Text>
      </Button>
      {showOutputChevron && (
        <Button
          className={classes.cardChevron}
          onClick={() => outputChevronOnClick(schemaNode)}
          icon={<ChevronRight16Regular />}
          appearance={'transparent'}
        />
      )}
    </div>
  );
};
