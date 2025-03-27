import type { RootState } from '../../core/state/templates/store';
import { makeStyles, mergeClasses, Text, tokens } from '@fluentui/react-components';
import { useSelector } from 'react-redux';
import { useTemplatesStrings } from './templatesStrings';

const useStyles = makeStyles({
  actionName: {
    color: tokens.colorPaletteLavenderBorderActive,
  },
});

export interface TemplateDisplayProps {
  titleLabel?: string;
  descriptionLabel?: string;
  showDescription?: boolean;
  cssOverrides?: Record<string, string>;
}

export const TemplateDisplay = ({ titleLabel, descriptionLabel, showDescription, cssOverrides }: TemplateDisplayProps) => {
  const styles = useStyles();
  const { resourceStrings } = useTemplatesStrings();
  const templateTitle = useSelector((state: RootState) => state.template.manifest?.title);
  const templateDescription = useSelector((state: RootState) => state.template.manifest?.summary);

  return (
    <>
      <div className={mergeClasses('msla-templates-review-block', cssOverrides?.templateName)}>
        <Text>{titleLabel ?? resourceStrings.TEMPLATE_NAME}</Text>
        <Text weight="semibold" className={styles.actionName}>
          {templateTitle}
        </Text>
      </div>
      {showDescription && (
        <div className={mergeClasses('msla-templates-review-block', cssOverrides?.templateDescription)}>
          <Text>{descriptionLabel ?? resourceStrings.DESCRIPTION}</Text>
          <Text weight="semibold">{templateDescription}</Text>
        </div>
      )}
    </>
  );
};
