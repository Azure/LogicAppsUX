import { setCurrentOutputNode } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import type { PathItem, SchemaExtended, SchemaNodeExtended } from '../../models/Schema';
import type { IBreadcrumbItem } from '@fluentui/react';
import { Breadcrumb } from '@fluentui/react';
import { Button } from '@fluentui/react-components';
import { Code20Regular } from '@fluentui/react-icons';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

const maxBreadcrumbItems = 3;
const overflowIndex = 1;

export const EditorBreadcrumb = (): JSX.Element => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const outputSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.outputSchema);
  const currentOutputNode = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentOutputNode);

  const breadcrumbItems = useMemo<IBreadcrumbItem[]>(() => {
    if (outputSchema) {
      return convertToBreadcrumbItems(dispatch, outputSchema, currentOutputNode);
    }

    return [];
  }, [dispatch, outputSchema, currentOutputNode]);

  return breadcrumbItems.length < 1 ? (
    // Breadcrumb doesn't display when empty, this is a breadcrumb space placeholder
    <div style={{ height: '40px', padding: '4px 8px' }}></div>
  ) : (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 8px',
        height: '40px',
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
        overflowIndex={currentOutputNode ? overflowIndex : 0}
      />
      <Button
        appearance="transparent"
        icon={<Code20Regular />}
        onClick={() => {
          // TODO (refortie) #14887351 - Create the code view
          console.log('Code view button clicked');
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
      dispatch(setCurrentOutputNode(schema.schemaTreeRoot));
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
          dispatch(setCurrentOutputNode(destinationNode));
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
