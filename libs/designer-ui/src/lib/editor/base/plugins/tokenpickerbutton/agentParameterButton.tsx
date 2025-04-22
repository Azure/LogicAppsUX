import { css } from '@fluentui/react';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { useRef } from 'react';
import { useIntl } from 'react-intl';
import { bundleIcon, Sparkle24Filled, Sparkle24Regular } from '@fluentui/react-icons';
import { Button, Tooltip } from '@fluentui/react-components';
import { TokenPickerMode } from '../../../../tokenpicker';

const SparkleIcon = bundleIcon(Sparkle24Filled, Sparkle24Regular);

export interface AgentParameterButtonProps {
  openTokenPicker: (mode: TokenPickerMode) => void;
  shifted?: boolean;
  showAgentParameterButton?: boolean;
}

export const AgentParameterButton = ({ openTokenPicker, shifted }: AgentParameterButtonProps): JSX.Element => {
  const intl = useIntl();
  const boxRef = useRef<HTMLDivElement>(null);

  const agentParameterButtonText = intl.formatMessage({
    defaultMessage: 'Click to generate Agent Parameter',
    id: 'fgeXzC',
    description: 'Button label to automaticlaly generate agent parameter',
  });

  return (
    <div
      className={css('msla-agent-parameter-entrypoint-button-container', shifted && 'shifted')}
      ref={boxRef}
      onMouseDown={(e) => e.preventDefault()}
    >
      <Tooltip content={agentParameterButtonText} relationship="label">
        <Button
          icon={<SparkleIcon />}
          appearance="primary"
          className={'msla-agent-parameter-entrypoint-button'}
          onClick={() => {
            LoggerService().log({
              area: 'AgentParaemterButton:generateAgentParameter',
              level: LogEntryLevel.Verbose,
              message: 'Agent Parameter Generated.',
            });
            openTokenPicker?.(TokenPickerMode.AGENT_PARAMETER_CREATE);
          }}
        />
      </Tooltip>
    </div>
  );
};
