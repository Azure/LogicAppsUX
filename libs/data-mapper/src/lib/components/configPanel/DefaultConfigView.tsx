import { openUpdateSourceSchemaPanelView, openUpdateTargetSchemaPanelView } from '../../core/state/PanelSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { LogCategory, LogService } from '../../utils/Logging.Utils';
import type { IChoiceGroupOption } from '@fluentui/react';
import { ChoiceGroup, IconButton, Stack, StackItem, Text } from '@fluentui/react';
import { useId, Label } from '@microsoft/designer-ui';
import { SchemaType } from '@microsoft/logic-apps-shared';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export interface DefaultConfigViewProps {
  setFunctionDisplayExpanded: (isFunctionDisplaySimple: boolean) => void;
  useExpandedFunctionCards: boolean;
}

export const DefaultConfigView = ({ setFunctionDisplayExpanded, useExpandedFunctionCards }: DefaultConfigViewProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();

  const sourceSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchema);

  const schemasSectionTitleLoc = intl.formatMessage({
    defaultMessage: 'Schemas',
    id: 'msc42d738370b2',
    description: 'Section header for the schema section',
  });

  const schemasSectionDescLoc = intl.formatMessage({
    defaultMessage: 'Add or replace your schemas.',
    id: 'ms4d8e07cd9a8c',
    description: 'Description for the schema section',
  });

  const sourceSchemaLabel = intl.formatMessage({
    defaultMessage: 'Source schema',
    id: 'ms527aebcc5867',
    description: 'Label to inform the below schema name is for source schema',
  });

  const targetSchemaLabel = intl.formatMessage({
    defaultMessage: 'Target schema',
    id: 'ms8d40e16ec0c9',
    description: 'Label to inform the below schema name is for target schema',
  });

  const noSchemaAddedLoc = intl.formatMessage({
    defaultMessage: 'No schema is added.',
    id: 'ms9cd580021187',
    description: 'Placeholder when no schema has been added',
  });

  const pencilIconLoc = intl.formatMessage({
    defaultMessage: 'Pencil icon',
    id: 'ms41d25469288e',
    description: 'Pencil icon aria label',
  });

  const functionsSectionTitleLoc = intl.formatMessage({
    defaultMessage: 'Functions',
    id: 'ms951ed5f3b81c',
    description: 'Section header for the functions section',
  });

  const functionsSectionDescriptionLoc = intl.formatMessage({
    defaultMessage: 'Modify options regarding functions',
    id: 'ms1b251ee0252d',
    description: 'Description for the functions section',
  });

  const functionDisplayLoc = intl.formatMessage({
    defaultMessage: 'Function display',
    id: 'msfb4cb1951609',
    description: 'Label for the function display radio group',
  });

  const functionDisplaySimpleLoc = intl.formatMessage({
    defaultMessage: 'Simple',
    id: 'msb4078a36165a',
    description: 'Function display radio group option for simple',
  });

  const functionDisplayExpandedLoc = intl.formatMessage({
    defaultMessage: 'Expanded',
    id: 'ms183de6e175eb',
    description: 'Function display radio group option for expanded',
  });

  const onEditSchemaClick = (schemaType: SchemaType) => {
    if (schemaType === SchemaType.Source) {
      dispatch(openUpdateSourceSchemaPanelView());
    } else {
      dispatch(openUpdateTargetSchemaPanelView());
    }
  };

  const functionDisplayLabelId = useId();
  const functionDisplayOptions: IChoiceGroupOption[] = [
    { key: 'simple', text: functionDisplaySimpleLoc },
    { key: 'expanded', text: functionDisplayExpandedLoc },
  ];
  const choiceGroupOnChange = useCallback(
    (_event?: any, option?: IChoiceGroupOption) => {
      if (option) {
        LogService.log(LogCategory.FunctionUtils, 'choiceGroupOnChange', {
          message: `Changing function style: ${option.key}`,
        });

        setFunctionDisplayExpanded(option.key === 'expanded');
      }
    },
    [setFunctionDisplayExpanded]
  );

  return (
    <>
      <Stack
        tokens={{
          childrenGap: 's1',
          padding: 's1',
        }}
      >
        <StackItem>
          <Text block={true} variant="xLarge">
            {schemasSectionTitleLoc}
          </Text>
          <Text>{schemasSectionDescLoc}</Text>
        </StackItem>
        <StackItem>
          <div style={{ display: 'flex' }}>
            <Text className="subsection-label-text">{sourceSchemaLabel}</Text>
            <IconButton
              iconProps={{ iconName: 'Edit' }}
              title={pencilIconLoc}
              ariaLabel={pencilIconLoc}
              onClick={() => onEditSchemaClick(SchemaType.Source)}
            />
          </div>
          <div>{sourceSchema?.name ?? noSchemaAddedLoc}</div>
        </StackItem>
        <StackItem>
          <div style={{ display: 'flex' }}>
            <Text className="subsection-label-text">{targetSchemaLabel}</Text>
            <IconButton
              iconProps={{ iconName: 'Edit' }}
              title={pencilIconLoc}
              ariaLabel={pencilIconLoc}
              onClick={() => onEditSchemaClick(SchemaType.Target)}
            />
          </div>
          <div>{targetSchema?.name ?? noSchemaAddedLoc}</div>
        </StackItem>
      </Stack>
      <Stack
        tokens={{
          childrenGap: 's1',
          padding: 's1',
        }}
      >
        <StackItem>
          <Text block={true} variant="xLarge">
            {functionsSectionTitleLoc}
          </Text>
          <Text>{functionsSectionDescriptionLoc}</Text>
        </StackItem>
        <StackItem>
          <Label id={functionDisplayLabelId} className="subsection-label-text" text={functionDisplayLoc} />
          <ChoiceGroup
            ariaLabelledBy={functionDisplayLabelId}
            defaultSelectedKey={useExpandedFunctionCards ? 'expanded' : 'simple'}
            options={functionDisplayOptions}
            onChange={choiceGroupOnChange}
          />
        </StackItem>
      </Stack>
    </>
  );
};
