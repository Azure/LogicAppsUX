import { mergeClasses, Spinner, Text, useId } from '@fluentui/react-components';
import { Checkmark16Filled, Dismiss16Filled } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { useProgressStepperStyles } from './styles';

export type ProgressStepperStep = { id: string; label: string } & (
  | { status?: undefined; error?: never }
  | { status: 'in-progress' | 'success'; error?: never }
  | { status: 'error'; error: string }
);

export interface ProgressStepperProps {
  steps: readonly ProgressStepperStep[];
  'aria-label': string;
  className?: string;
}

/**
 * Informational, controlled milestones in display order. Step IDs must be unique
 * and stable within a stepper; labels and contextual errors are supplied localized.
 * Requires FluentProvider and IntlProvider. Omit status until a milestone starts;
 * no pending state is inferred from other steps. The host owns transaction state.
 * Milestones use equal horizontal columns when their container is at least 480px
 * wide, otherwise a vertical rail. Labels and errors wrap without truncation.
 *
 * @example
 * <ProgressStepper
 *   aria-label={progressLabel}
 *   steps={[
 *     { id: 'validate', label: validationLabel, status: 'success' },
 *     { id: 'create', label: creationLabel, status: 'in-progress' },
 *     { id: 'save', label: saveLabel },
 *   ]}
 * />
 */
export const ProgressStepper = ({ steps, 'aria-label': ariaLabel, className }: ProgressStepperProps) => {
  const styles = useProgressStepperStyles();
  const instanceId = useId('progress-stepper');
  const intl = useIntl();
  const statusLabels = {
    'in-progress': intl.formatMessage({
      defaultMessage: 'In progress',
      id: 'BdQfl1',
      description: 'Status of a milestone currently being performed in a progress stepper',
    }),
    success: intl.formatMessage({
      defaultMessage: 'Completed',
      id: '0VEuib',
      description: 'Status of a successfully completed milestone in a progress stepper',
    }),
    error: intl.formatMessage({
      defaultMessage: 'Error',
      id: 'k9fjDp',
      description: 'Status of a failed milestone in a progress stepper',
    }),
  };

  return (
    <div className={styles.container}>
      <ol role="list" aria-label={ariaLabel} className={mergeClasses(styles.root, className)}>
        {steps.map((step, index) => {
          const stepId = `${instanceId}-${encodeURIComponent(step.id)}`;
          const labelId = `${stepId}-label`;
          const statusId = `${stepId}-status`;
          const errorId = `${stepId}-error`;

          return (
            <li
              key={step.id}
              className={styles.step}
              aria-labelledby={labelId}
              aria-describedby={step.status === 'error' ? `${statusId} ${errorId}` : step.status ? statusId : undefined}
              aria-current={step.status === 'in-progress' ? 'step' : undefined}
              aria-posinset={index + 1}
              aria-setsize={steps.length}
            >
              <span
                aria-hidden="true"
                className={mergeClasses(
                  styles.indicator,
                  step.status === 'in-progress' && styles.active,
                  step.status === 'success' && styles.success,
                  step.status === 'error' && styles.error
                )}
              >
                {step.status === 'in-progress' ? (
                  <Spinner size="extra-tiny" aria-hidden="true" role="presentation" />
                ) : step.status === 'success' ? (
                  <Checkmark16Filled />
                ) : step.status === 'error' ? (
                  <Dismiss16Filled />
                ) : (
                  <Text size={200}>{index + 1}</Text>
                )}
              </span>
              <div className={styles.content} aria-live="polite" aria-atomic="true">
                <Text id={labelId} size={300} weight="semibold" className={styles.label}>
                  {step.label}
                </Text>
                <div className={styles.details}>
                  {step.status && (
                    <Text id={statusId} size={200} className={styles.status}>
                      {statusLabels[step.status]}
                    </Text>
                  )}
                  {step.status === 'error' && (
                    <Text id={errorId} size={200} className={styles.errorMessage}>
                      {step.error}
                    </Text>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
