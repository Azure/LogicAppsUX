import { FlowPreview } from './flowPreview';
import { ActionButton, IconButton } from '@fluentui/react';
import { useRefEffect } from '@fluentui/react-hooks';
import { format } from '@fluentui/react/lib/Utilities';
import React, { useState } from 'react';
import { useIntl } from 'react-intl';

export const SuggestedFlowsSection: React.FC = () => {
  const autoFocusAndScrollOnceOneRef = useSmoothScrollOnceRef();
  const [canShowNextSuggestion] = useState(false);
  const [shouldShowFlowSuggestionNavigator] = useState(false);
  const [canSelectPreviousFlowSuggestion] = useState(false);
  const [canSelectNextFlowSuggestion] = useState(false);
  const [selectedFlowSuggestionIndex] = useState(0);
  const [maxNavigatedFlowSuggestionIndex] = useState(1);

  const intl = useIntl();
  const intlText = {
    suggestedFlow: intl.formatMessage({
      defaultMessage: 'Suggested flow',
      id: 'Uxckds',
      description: 'Title for the suggested flow section',
    }),
    suggestedFlowDescriptionPart1: intl.formatMessage({
      defaultMessage: 'After you review this AI generated flow suggestion, select',
      id: 'id4DBb',
      description: 'First part of the Copilot Get Started description for Suggested Flow section',
    }),
    suggestedFlowDescriptionPart2: intl.formatMessage({
      defaultMessage: 'to configure it',
      id: 'O7HhyP',
      description: 'Second part of the Copilot Get Started description for Suggested Flow section',
    }),
    nextButtonText: intl.formatMessage({
      defaultMessage: 'Next',
      id: 'W+mUyI',
      description: 'Placeholder text for the Next button in the suggested workflow description',
    }),
    suggestedFlowNavigationPagination: intl.formatMessage(
      {
        defaultMessage: '{s1} of {s2}',
        id: 'GZ8MDP',
        description: 'Shows how many suggested flows there are',
      },
      {
        s1: (selectedFlowSuggestionIndex ?? 0) + 1,
        s2: maxNavigatedFlowSuggestionIndex + 1,
      }
    ),
    showDifferentSuggestion: intl.formatMessage({
      defaultMessage: 'Show a different suggestion',
      id: 'ZyDq4/',
      description: 'Text for the show different suggestion flow button',
    }),
    automationSuggestionDoesNotWork: intl.formatMessage({
      defaultMessage: `This isn't what I'm looking for`,
      id: 'hbOvB4',
      description: 'Dislike button text for suggested flow',
    }),
    previousSuggestedFlow: intl.formatMessage({
      defaultMessage: 'Previous flow suggestion',
      id: 'qy5WqY',
      description: 'Text for button that shows the previous flow suggestion',
    }),
    nextSuggestedFlow: intl.formatMessage({
      defaultMessage: 'Next flow suggestion',
      id: 'LElaX3',
      description: 'Text for button that shows the next flow suggestion',
    }),
  };

  const suggestionNavigationButtonStyles = {
    rootDisabled: [
      {
        backgroundColor: 'transparent',
      },
    ],
  };

  const suggestionDoesNotWorkButtonStyles = {
    root: [
      {
        marginTop: 16,
        color: 'rgb(0, 102, 255)',
      },
    ],
    label: [
      {
        textDecoration: 'underline',
      },
    ],
  };
  return (
    <div className={'msla-suggestedflowSection'} ref={autoFocusAndScrollOnceOneRef}>
      <h3 className={'msla-suggestedflowSection-title'}>{intlText.suggestedFlow}</h3>
      <div className={'msla-suggestedflowSection-description'}>
        {intlText.suggestedFlowDescriptionPart1}
        <div className="msla-suggestedflowSection-descriptionPadding">{intlText.nextButtonText}</div>
        {intlText.suggestedFlowDescriptionPart2}
      </div>
      <div className={'msla-suggestedflowSection-suggestedFlow'}>
        <FlowPreview
          definition={{
            triggers: { operationName: 'When a new channel message is added', connectionName: 'Microsoft Teams' },
            actions: [
              { operationName: 'Get User', connectionName: 'Office 365 Users' },
              { operationName: 'Send an email', connectionName: 'Office 365 Outlook' },
            ],
          }}
        />
      </div>
      <div className={'msla-suggestedflowSection-suggestedFlowActions'}>
        {canShowNextSuggestion ? (
          <ActionButton
            text={intlText.showDifferentSuggestion}
            iconProps={{ iconName: 'Sync' }}
            styles={suggestionDoesNotWorkButtonStyles}
          />
        ) : (
          <ActionButton
            text={intlText.automationSuggestionDoesNotWork}
            iconProps={{ iconName: 'Dislike' }}
            styles={suggestionDoesNotWorkButtonStyles}
          />
        )}
        {shouldShowFlowSuggestionNavigator && (
          <div className={'msla-suggestedflowSection-suggestedFlowNavigator'}>
            <IconButton
              title={intlText.previousSuggestedFlow}
              ariaLabel={intlText.previousSuggestedFlow}
              disabled={!canSelectPreviousFlowSuggestion}
              iconProps={{ iconName: 'ChevronLeft' }}
              styles={suggestionNavigationButtonStyles}
            />
            <span>
              {format(
                intlText.suggestedFlowNavigationPagination,
                (selectedFlowSuggestionIndex ?? 0) + 1,
                maxNavigatedFlowSuggestionIndex + 1
              )}
            </span>
            <IconButton
              title={intlText.nextSuggestedFlow}
              ariaLabel={intlText.nextSuggestedFlow}
              disabled={!canSelectNextFlowSuggestion}
              iconProps={{ iconName: 'ChevronRight' }}
              styles={suggestionNavigationButtonStyles}
            />
          </div>
        )}
      </div>
    </div>
  );
};

function useSmoothScrollOnceRef() {
  const focusSet = React.useRef(false);
  return useRefEffect<HTMLDivElement>(($el) => {
    if (!focusSet.current) {
      $el.scrollIntoView({ behavior: 'smooth' });
      $el.focus({ preventScroll: true });
      focusSet.current = true;
    }
  });
}
