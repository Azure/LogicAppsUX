import { setCurrentTargetNode } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import type { PathItem, SchemaExtended, SchemaNodeExtended } from '../../models/Schema';
import type { IBreadcrumbItem } from '@fluentui/react';
import { Breadcrumb } from '@fluentui/react';
import { Button, tokens } from '@fluentui/react-components';
import { Code20Regular } from '@fluentui/react-icons';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

const maxBreadcrumbItems = 3;
const overflowIndex = 1;

const baseBreadcrumbStyles = {
  height: '40px',
  padding: '4px 8px',
  marginBottom: '8px',
  backgroundColor: tokens.colorNeutralBackground1,
  borderRadius: tokens.borderRadiusMedium,
};

interface EditorBreadcrumbProps {
  isCodeViewOpen: boolean;
  setIsCodeViewOpen: (isOpen: boolean) => void;
}

export const EditorBreadcrumb = ({ isCodeViewOpen, setIsCodeViewOpen }: EditorBreadcrumbProps): JSX.Element => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const targetSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.targetSchema);
  const currentTargetNode = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentTargetNode);

  const breadcrumbItems = useMemo<IBreadcrumbItem[]>(() => {
    if (targetSchema) {
      return convertToBreadcrumbItems(dispatch, targetSchema, currentTargetNode);
    }

    return [];
  }, [dispatch, targetSchema, currentTargetNode]);

  return breadcrumbItems.length < 1 ? (
    // Breadcrumb doesn't display when empty, this is a breadcrumb space placeholder
    <div style={{ ...baseBreadcrumbStyles }}></div>
  ) : (
    <div
      style={{
        ...baseBreadcrumbStyles,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Breadcrumb
        style={{
          alignItems: 'flex-start',
          margin: '0px',
        }}
        // Returning undefined here stops the breadcrumb from shrinking
        onReduceData={() => undefined}
        items={breadcrumbItems}
        maxDisplayedItems={maxBreadcrumbItems}
        overflowIndex={currentTargetNode ? overflowIndex : 0}
      />
      <Button
        appearance="transparent"
        icon={<Code20Regular />}
        onClick={() => {
          setIsCodeViewOpen(!isCodeViewOpen);
        }}
      >
        {intl.formatMessage({
          defaultMessage: 'Show code view',
          description: 'Button to display the code view',
        })}
      </Button>
    </div>
  );
};

const convertToBreadcrumbItems = (dispatch: AppDispatch, schema: SchemaExtended, currentNode?: SchemaNodeExtended) => {
  const rootItem = {
    key: schema.name,
    text: schema.name,
    // TODO (14748905): Click root to view map overview, not top node
    onClick: () => {
      dispatch(setCurrentTargetNode({ schemaNode: schema.schemaTreeRoot, resetSelectedSourceNodes: true }));
    },
  };

  const breadcrumbItems = [rootItem];

  if (currentNode?.pathToRoot) {
    currentNode.pathToRoot.forEach((pathItem) => {
      breadcrumbItems.push({
        key: pathItem.key,
        text: pathItem.name,
        onClick: () => {
          const destinationNode = findChildNode(schema.schemaTreeRoot, [...currentNode.pathToRoot]);
          dispatch(setCurrentTargetNode({ schemaNode: destinationNode, resetSelectedSourceNodes: true }));
        },
      });
    });
  }

  return breadcrumbItems;
};

const findChildNode = (schemaNode: SchemaNodeExtended, pathItems: PathItem[]): SchemaNodeExtended => {
  if (pathItems.length > 1) {
    const nextPathItem = pathItems.shift();
    const nextChild = schemaNode.children.find((child) => child.key === nextPathItem?.key);
    if (nextChild) {
      return findChildNode(nextChild, pathItems);
    }
  }

  return schemaNode;
};
