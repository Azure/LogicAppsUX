import type { FunctionData } from '../../../models';
import { InputDropdown, type InputOptionProps } from '../inputDropdown/InputDropdown';
import { useStyles } from './styles';
import { Badge, Button } from '@fluentui/react-components';
import { DeleteRegular, ReOrderRegular } from '@fluentui/react-icons';
import type { SchemaType } from '@microsoft/logic-apps-shared';

type CustomListItemProps = {
  name?: string;
  value?: string;
  dragHandleProps?: object;
  type?: string;
  draggable?: boolean;
  remove: () => void;
  index: number;
  customValueAllowed?: boolean;
  schemaType: SchemaType;
  validateAndCreateConnection: (optionValue: string | undefined, option: InputOptionProps | undefined) => void;
  functionData: FunctionData;
  functionKey: string;
  key: string;
};

export const CustomListItem = (props: CustomListItemProps) => {
  const styles = useStyles();
  const {
    name,
    validateAndCreateConnection,
    customValueAllowed,
    index,
    functionKey,
    functionData,
    schemaType,
    value,
    type,
    remove,
    draggable,
    dragHandleProps,
  } = props;

  return (
    <div key={`input-${name}`} className={styles.draggableListItem}>
      <div className={styles.draggableListContainer}>
        <span className={styles.formControl}>
          <InputDropdown
            inputAllowsCustomValues={customValueAllowed}
            index={index}
            functionId={functionKey}
            currentNode={functionData}
            schemaListType={schemaType}
            inputName={name}
            inputValue={value}
            validateAndCreateConnection={validateAndCreateConnection}
          />
        </span>
        {type && (
          <Badge appearance="filled" color="informative">
            {type}
          </Badge>
        )}
        <span>
          <Button className={styles.listButton} appearance="transparent" icon={<DeleteRegular />} onClick={remove} />
          {draggable && dragHandleProps && (
            <Button className={styles.listButton} appearance="transparent" icon={<ReOrderRegular />} {...dragHandleProps} />
          )}
        </span>
      </div>
    </div>
  );
};
