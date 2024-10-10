import { useState } from 'react';
import type { IIconProps } from '@fluentui/react';
import { IconButton, TextField, TooltipHost } from '@fluentui/react';
import './stringstack.less';
import { useIntl } from 'react-intl';

interface StringStackProps {
  advancedStringParameterTitle: string;
  initialStrings: (schemaKey: string) => string[];
  schemaKey: string;
  onStringListUpdate: (schemaKey: string, newValue: string[]) => void;
  onDeleteStringListValue?: (schemaKey: string, index: number) => void;
}

const StringStack: React.FC<StringStackProps> = ({ advancedStringParameterTitle, initialStrings, schemaKey, onStringListUpdate }) => {
  const intl = useIntl();
  const [strings, setStrings] = useState([...initialStrings(schemaKey), '']);

  const handleInputChange = (index: number, value: string) => {
    const newStrings = [...strings];
    newStrings[index] = value;
    if (index === strings.length - 1) {
      newStrings.push('');
    }
    setStrings(newStrings);
  };

  const handleInputBlur = (index: number, value: string) => {
    const newStrings = [...strings];
    newStrings[index] = value;

    setStrings(newStrings);
    onStringListUpdate(schemaKey, newStrings.slice(0, newStrings.length - 1));
  };

  const handleStringDelete = (index: number) => {
    strings.splice(index, 1);
    onStringListUpdate(schemaKey, strings);
  };

  const deleteText = intl.formatMessage({
    defaultMessage: 'Delete',
    id: 'gkY5ya',
    description: 'Delete dynamic parameter corresponding to this row',
  });

  const deleteIcon: IIconProps = { iconName: 'Delete' };

  return (
    <div className="msla-string-stack-container">
      <div className="msla-string-stack-title">{advancedStringParameterTitle}</div>
      <div className="msla-string-stack-body">
        {strings.map((str, index) => (
          <div className="msla-string-stack-input-row" key={`string-stack-${index}`}>
            <div className="msla-string-stack-input">
              <TextField
                key={index}
                type="text"
                value={str}
                placeholder="Enter another option"
                onChange={(e, newValue?: string) => handleInputChange(index, newValue || '')}
                onBlur={(e) => handleInputBlur(index, e.target.value)}
                className="msla-string-stack-input-textfield"
              />
            </div>
            {index !== strings.length - 1 && (
              <div className="msla-string-stack-delete">
                <TooltipHost content={deleteText}>
                  <IconButton
                    iconProps={deleteIcon}
                    ariaLabel={deleteText}
                    onClick={() => handleStringDelete(index)}
                    disabled={strings.length === 2}
                  />
                </TooltipHost>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StringStack;
