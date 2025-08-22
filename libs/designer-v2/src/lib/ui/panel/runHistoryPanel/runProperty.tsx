import { Tooltip, InteractionTag, InteractionTagSecondary, Body1Strong, Tag } from '@fluentui/react-components';
import { useCallback, useState } from 'react';
import { useIntl } from 'react-intl';

import { bundleIcon, CopyFilled, CopyRegular, FilterAddFilled, FilterAddRegular } from '@fluentui/react-icons';

const CopyIcon = bundleIcon(CopyFilled, CopyRegular);
const AddFilterIcon = bundleIcon(FilterAddFilled, FilterAddRegular);

export const RunProperty = (props: {
  label: string;
  text: string;
  copyable?: boolean;
  addFilterCallback?: () => void;
}) => {
  const intl = useIntl();

  const [showingTooltip, setShowTooltip] = useState(false);
  const [tooltipText, setTooltipText] = useState('');

  const showTooltip = useCallback((text: string) => {
    setTooltipText(text);
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 2000);
  }, []);

  const copiedText = intl.formatMessage({
    defaultMessage: 'Copied!',
    description: 'Copied text',
    id: 'NE54Uu',
  });
  const filteredText = intl.formatMessage({
    defaultMessage: 'Filtered!',
    description: 'Filtered text',
    id: 'QT4IaP',
  });

  const onCopyClick = useCallback(
    (e: any) => {
      e.stopPropagation();
      navigator.clipboard.writeText(props.text);
      showTooltip(copiedText);
    },
    [props.text, showTooltip, copiedText]
  );

  const onFilterClick = useCallback(
    (e: any) => {
      e.stopPropagation();
      props.addFilterCallback?.();
      showTooltip(filteredText);
    },
    [props, showTooltip, filteredText]
  );

  return (
    <div className={'run-property'}>
      <Body1Strong>{props.label}</Body1Strong>
      <Tooltip visible={showingTooltip} content={tooltipText} relationship={'inaccessible'} withArrow positioning={'before'}>
        <InteractionTag>
          <Tag>{props.text}</Tag>
          {props.copyable ? (
            <InteractionTagSecondary onClick={onCopyClick}>
              <CopyIcon />
            </InteractionTagSecondary>
          ) : null}
          {props.addFilterCallback ? (
            <InteractionTagSecondary onClick={onFilterClick}>
              <AddFilterIcon />
            </InteractionTagSecondary>
          ) : null}
        </InteractionTag>
      </Tooltip>
    </div>
  );
};
