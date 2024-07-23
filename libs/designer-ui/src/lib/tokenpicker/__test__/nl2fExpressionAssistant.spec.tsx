import * as React from 'react';
import { describe, vi, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { Nl2fExpressionAssistant } from '../nl2fExpressionAssistant';
import { IntlProvider } from '../../../../../logic-apps-shared/src/intl/src/IntlProvider';
import { getReactQueryClient } from '../../../../../designer/src/lib/core/ReactQueryProvider';
import { QueryClientProvider } from '@tanstack/react-query';
import { ExpressionEditorEvent } from '../../expressioneditor';
import { CopilotServiceOptions, ICopilotService, InitCopilotService, Nl2fExpressionResult } from '@microsoft/logic-apps-shared';

describe('lib/nl2fExpressionAssistant', () => {
  const dataTestIds = {
    panelHeaderBackButton: 'expression-assistant-panel-header-back-button',
    panelHeaderTitle: 'expression-assistant-panel-header-title',
    panelHeaderCloseButton: 'expression-assistant-panel-header-close-button',

    inputBoxTextField: 'expression-assistant-input-box-text',
    inputBoxSubmitButton: 'expression-assistant-input-box-submit',

    progressCard: 'expression-assistant-progress-card',
    resultSection: 'expression-assistant-result-section',
    outputBoxTitle: 'expression-assistant-output-box-title',
    outputBox: 'expression-assistant-output-box',

    resultCarousel: 'expression-assistant-result-carousel',
    resultFooter: 'expression-assistant-result-footer',
    feedbackComponent: 'expression-assistant-result-feedback',

    okButton: 'expression-assistant-ok-button',
  };

  const setExpression = vi.fn();
  const setFullScreen = vi.fn();
  const setExpressionEditorError = vi.fn();
  const setSelectedMode = vi.fn();
  const intlOnError = vi.fn();

  const queryClient = getReactQueryClient();

  it('Should have the expected header for expression assistant panel', () => {
    const { getByTestId } = render(
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale={''} defaultLocale={''} onError={intlOnError}>
          <Nl2fExpressionAssistant
            isFullScreen={false}
            expression={''}
            isFixErrorRequest={false}
            setFullScreen={setFullScreen}
            setSelectedMode={setSelectedMode}
            setExpression={setExpression}
            setExpressionEditorError={setExpressionEditorError}
          />
        </IntlProvider>
      </QueryClientProvider>
    );

    const backButton = getByTestId(dataTestIds.panelHeaderBackButton) as HTMLButtonElement;
    const headerTitle = getByTestId(dataTestIds.panelHeaderTitle) as HTMLElement;
    const closeButton = getByTestId(dataTestIds.panelHeaderCloseButton) as HTMLButtonElement;

    expect(backButton).toBeDefined();
    expect(headerTitle.textContent).toMatch('Create an expression with Copilot');
    expect(closeButton).toBeDefined();
    // NOTE: functionality should be tested in separate file for TokenPickerHeader component
  });

  it('Should open in create UX if the original expression was empty', () => {
    const { getByTestId } = render(
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale={''} defaultLocale={''} onError={intlOnError}>
          <Nl2fExpressionAssistant
            isFullScreen={false}
            expression={''}
            isFixErrorRequest={false}
            setFullScreen={setFullScreen}
            setSelectedMode={setSelectedMode}
            setExpression={setExpression}
            setExpressionEditorError={setExpressionEditorError}
          />
        </IntlProvider>
      </QueryClientProvider>
    );

    const inputBoxText = getByTestId(dataTestIds.inputBoxTextField) as HTMLInputElement;
    expect(inputBoxText.placeholder).toMatch(
      'Describe the expression you want Copilot to create. You can reference data from other actions in the flow. For example, “Combine the first and last name of the person who went the email” or “Check the status of the current job.”'
    );
    const inputBoxSubmitButton = getByTestId(dataTestIds.inputBoxSubmitButton) as HTMLButtonElement;
    expect(inputBoxSubmitButton.title).toMatch('Create expression');
    expect(inputBoxSubmitButton.disabled).toBeTruthy();

    // these shouldn't exist at this point
    expect(() => getByTestId(dataTestIds.progressCard)).toThrow();
    expect(() => getByTestId(dataTestIds.resultSection)).toThrow();
    expect(() => getByTestId(dataTestIds.okButton)).toThrow();
  });

  it('Should open in edit UX if the original expression was valid and non-empty', () => {
    const dummyExpression: ExpressionEditorEvent = {
      value: 'some valid expression',
      selectionStart: 0,
      selectionEnd: 0,
    };
    const { getByTestId } = render(
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale={''} defaultLocale={''} onError={intlOnError}>
          <Nl2fExpressionAssistant
            isFullScreen={false}
            expression={dummyExpression}
            isFixErrorRequest={false} // this is determined by expression editor before going into expression assistant
            setFullScreen={setFullScreen}
            setSelectedMode={setSelectedMode}
            setExpression={setExpression}
            setExpressionEditorError={setExpressionEditorError}
          />
        </IntlProvider>
      </QueryClientProvider>
    );

    const inputBoxText = getByTestId(dataTestIds.inputBoxTextField) as HTMLInputElement;
    expect(inputBoxText.placeholder).toMatch("Describe how you'd like to update your expression.");
    const inputBoxSubmitButton = getByTestId(dataTestIds.inputBoxSubmitButton) as HTMLButtonElement;
    expect(inputBoxSubmitButton.title).toMatch('Create expression');
    expect(inputBoxSubmitButton.disabled).toBeTruthy();

    const outputBoxTitle = getByTestId(dataTestIds.outputBoxTitle) as HTMLElement;
    expect(outputBoxTitle.textContent).toMatch('Original expression');
    const outputBoxTextArea = getByTestId(dataTestIds.outputBox) as HTMLTextAreaElement;
    expect(outputBoxTextArea.textContent).toMatch(dummyExpression.value);
    // this shouldn't be displayed as there's no actual results yet - we are just showing original expression
    const resultFooter = getByTestId(dataTestIds.resultFooter);
    expect(resultFooter.style['visibility']).toMatch('hidden');

    // user should be able to 'accept' result, which is just original expression at this point
    const okButton = getByTestId(dataTestIds.okButton) as HTMLButtonElement;
    expect(okButton.disabled).toBeFalsy();

    // this shouldn't exist at this point
    expect(() => getByTestId(dataTestIds.progressCard)).toThrow();
  });

  it('Should open in fix UX if the original expression was invalid', async () => {
    class TestCopilotService implements ICopilotService {
      constructor(public readonly options: CopilotServiceOptions) {}
      async getNl2fExpressions(query: string, originalExpression?: string): Promise<Nl2fExpressionResult> {
        return Promise.resolve({
          suggestions: [{ suggestedExpression: 'suggested fix' }],
        });
      }
    }
    InitCopilotService(new TestCopilotService({}));
    const dummyExpression: ExpressionEditorEvent = {
      value: 'some invalid expression',
      selectionStart: 0,
      selectionEnd: 0,
    };

    const { getByTestId } = render(
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale={'en-us'} defaultLocale={''} onError={intlOnError}>
          <Nl2fExpressionAssistant
            isFullScreen={false}
            expression={dummyExpression}
            isFixErrorRequest={true} // this is determined by expression editor before going into expression assistant
            setFullScreen={setFullScreen}
            setSelectedMode={setSelectedMode}
            setExpression={setExpression}
            setExpressionEditorError={setExpressionEditorError}
          />
        </IntlProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      const inputBoxText = getByTestId(dataTestIds.inputBoxTextField) as HTMLInputElement;
      // NOTE: it doesn't seem like intl formats/interpolates strings during unit tests
      expect(inputBoxText.textContent).toMatch('Fix my expression: {expression}');
      const inputBoxSubmitButton = getByTestId(dataTestIds.inputBoxSubmitButton) as HTMLButtonElement;
      expect(inputBoxSubmitButton.title).toMatch('Create expression');

      const outputBoxTitle = getByTestId(dataTestIds.outputBoxTitle) as HTMLElement;
      expect(outputBoxTitle.textContent).toMatch('Suggested expression');
      const outputBoxTextArea = getByTestId(dataTestIds.outputBox) as HTMLTextAreaElement;
      expect(outputBoxTextArea.textContent).toMatch('suggested fix');

      // result(s) are present, user should be able to provide feedback on them
      const feedbackComponent = getByTestId(dataTestIds.feedbackComponent) as HTMLElement;
      expect(feedbackComponent).toBeDefined();

      // single result returned, this should be hidden
      const resultCarousel = getByTestId(dataTestIds.resultCarousel) as HTMLDivElement;
      expect(resultCarousel.style['visibility']).toMatch('hidden');

      // result(s) are present, user should be able to accept one of them
      const okButton = getByTestId(dataTestIds.okButton) as HTMLButtonElement;
      expect(okButton.disabled).toBeFalsy();
    });
  });

  it('Should show error messages in result box when encountering errors', async () => {
    class TestCopilotService implements ICopilotService {
      constructor(public readonly options: CopilotServiceOptions) {}
      async getNl2fExpressions(query: string, originalExpression?: string): Promise<Nl2fExpressionResult> {
        return Promise.resolve({
          errorMessage: 'some error',
        });
      }
    }
    InitCopilotService(new TestCopilotService({}));

    const { getByTestId } = render(
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale={'en-us'} defaultLocale={''} onError={intlOnError}>
          <Nl2fExpressionAssistant
            isFullScreen={false}
            expression={''}
            isFixErrorRequest={true} // will start UI in fix state which automatically sends copilot request
            setFullScreen={setFullScreen}
            setSelectedMode={setSelectedMode}
            setExpression={setExpression}
            setExpressionEditorError={setExpressionEditorError}
          />
        </IntlProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      const outputBoxTitle = getByTestId(dataTestIds.outputBoxTitle) as HTMLElement;
      expect(outputBoxTitle.textContent).toMatch('Suggested expression');
      const outputBoxTextArea = getByTestId(dataTestIds.outputBox) as HTMLTextAreaElement;
      expect(outputBoxTextArea.textContent).toMatch('some error');

      // error implies single output of that error message - so no carousel in this case
      const resultCarousel = getByTestId(dataTestIds.resultCarousel) as HTMLElement;
      expect(resultCarousel.style['visibility']).toMatch('hidden');

      // error is present, user should be able to provide feedback
      const feedbackComponent = getByTestId(dataTestIds.feedbackComponent) as HTMLElement;
      expect(feedbackComponent).toBeDefined();

      // shouldn't be able to 'accept' an error
      const okButton = getByTestId(dataTestIds.okButton) as HTMLButtonElement;
      expect(okButton.disabled).toBeTruthy();
    });
  });

  it('Should show carousel if copilot returns multiple suggestions', async () => {
    class TestCopilotService implements ICopilotService {
      constructor(public readonly options: CopilotServiceOptions) {}
      async getNl2fExpressions(query: string, originalExpression?: string): Promise<Nl2fExpressionResult> {
        return Promise.resolve({
          suggestions: [{ suggestedExpression: 'suggested fix 1' }, { suggestedExpression: 'suggested fix 2' }],
        });
      }
    }
    InitCopilotService(new TestCopilotService({}));

    const { getByTestId } = render(
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale={'en-us'} defaultLocale={''} onError={intlOnError}>
          <Nl2fExpressionAssistant
            isFullScreen={false}
            expression={''}
            isFixErrorRequest={true} // will start UI in fix state which automatically sends copilot request
            setFullScreen={setFullScreen}
            setSelectedMode={setSelectedMode}
            setExpression={setExpression}
            setExpressionEditorError={setExpressionEditorError}
          />
        </IntlProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      const resultCarousel = getByTestId(dataTestIds.resultCarousel) as HTMLElement;
      expect(resultCarousel.style['visibility']).toMatch('visible');
    });
  });
});
