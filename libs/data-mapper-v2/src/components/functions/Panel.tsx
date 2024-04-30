import { useStyles } from './styles';
import FunctionIcon from './../../images/svg/function.svg';
import { Image } from '@fluentui/react';

type PanelProps = {};

export const Panel = (_props: PanelProps) => {
  const styles = useStyles();

  return (
    <div className={styles.dataMapperFunctionPanel}>
      <Image src={FunctionIcon} />
    </div>
  );
};
