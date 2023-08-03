import { getFileNameAndPath } from '../../utils';
import type { IStackTokens } from '@fluentui/react';
import type { ComboboxProps } from '@fluentui/react-components';
import { Combobox, makeStyles, shorthands, Text, tokens, Option } from '@fluentui/react-components';
import { StackShim } from '@fluentui/react-migration-v8-v9';
import React, { useCallback } from 'react';

export type FileDropdownProps = {
  allPathOptions: string[];
  errorMessage: string;
  setSelectedPath: (item: string | undefined) => void;
  relativePathMessage: string;
  placeholder: string;
  ariaLabel: string;
};

const useStyles = makeStyles({
  option: {
    ...shorthands.borderBottom('.5px', 'solid', tokens.colorNeutralStroke1),
  },
  combobox: {
    width: '290px',
  },
  errorMessage: {
    color: tokens.colorPaletteRedForeground1,
  },
});

export const FileDropdown: React.FC<FileDropdownProps> = (props: FileDropdownProps) => {
  const styles = useStyles();
  // intl
  //  const intl = useIntl();

  //   const folderLocationLabel = intl.formatMessage({
  //     defaultMessage: 'Existing schemas from',
  //     description: 'Schema dropdown aria label',
  //   });
  //   const dropdownAriaLabel = intl.formatMessage({
  //     defaultMessage: 'Select the schema for dropdown',
  //     description: 'Schema dropdown aria label',
  //   });
  //   const schemaDropdownPlaceholder = useMemo(() => {
  //     if (props.schemaType === SchemaType.Source) {
  //       return intl.formatMessage({
  //         defaultMessage: 'Select a source schema',
  //         description: 'Source schema dropdown placeholder',
  //       });
  //     } else {
  //       return intl.formatMessage({
  //         defaultMessage: 'Select a target schema',
  //         description: 'Target schema dropdown placeholder',
  //       });
  //     }
  //   }, [intl, props.schemaType]);

  const [matchingOptions, setMatchingOptions] = React.useState([...props.allPathOptions]);

  const setSelectedSchema = props.setSelectedPath;

  const onSelectOption = useCallback(
    (option?: string) => {
      setSelectedSchema(option);
    },
    [setSelectedSchema]
  );

  const updateOptions: ComboboxProps['onChange'] = (event) => {
    const value = event.target.value.trim();
    if (value && value.length > 0) {
      const matches = props.allPathOptions.filter((o) => o.toLowerCase().indexOf(value?.toLowerCase()) !== -1);
      setMatchingOptions(matches);
    }
    if (value.length === 0) {
      setMatchingOptions(props.allPathOptions);
    }
    onSelectOption(value);
  };

  const sortedOptions: string[] = matchingOptions;
  const formattedOptions =
    sortedOptions.length !== 0
      ? sortedOptions.map((option) => OptionWithPath(option))
      : props.allPathOptions.map((option) => OptionWithPath(option));

  return (
    <>
      <Text size={200}>{props.relativePathMessage}</Text>
      <Text className={styles.errorMessage}>{props.errorMessage}</Text>
      <Combobox
        aria-label={props.ariaLabel}
        placeholder={props.placeholder}
        onChange={updateOptions}
        onOptionSelect={(e, data) => props.setSelectedPath(data.optionValue)}
        freeform={true}
        autoComplete="on"
        className={styles.combobox}
        appearance="outline"
      >
        {formattedOptions}
      </Combobox>
    </>
  );
};

const OptionWithPath: React.FC<string> = (option: string) => {
  const [fileName, filePath] = getFileNameAndPath(option);

  // styling
  const stackTokens: IStackTokens = {
    childrenGap: 5,
  };

  const styles = useStyles();

  return (
    <Option text={option} value={option} className={styles.option}>
      <StackShim tokens={stackTokens} style={{ width: '100%' }}>
        <Text size={200}>{fileName}</Text>
        {filePath.length !== 0 && <Text size={100}>{filePath}</Text>}
      </StackShim>
    </Option>
  );
};
