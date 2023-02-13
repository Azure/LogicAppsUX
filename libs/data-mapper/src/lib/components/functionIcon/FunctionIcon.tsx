import type { FunctionCategory } from '../../models';
import { iconForFunctionCategory, iconUriForIconImageName } from '../../utils/Icon.Utils';
import { LogCategory, LogService } from '../../utils/Logging.Utils';
import { Image, ImageLoadState } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';

export interface FunctionIconProps {
  name: string;
  categoryName: FunctionCategory;
  fileName: string | undefined;
  color?: string;
}

export const FunctionIcon = ({ name, categoryName, fileName, color }: FunctionIconProps) => {
  const CategoryIcon = iconForFunctionCategory(categoryName);
  const [isError, { setFalse: setNotError, setTrue: setIsError }] = useBoolean(false);

  const loadBackupFunctionCategory = (loadState: ImageLoadState) => {
    if (loadState === ImageLoadState.error) {
      LogService.error(LogCategory.FunctionIcon, 'loadBackupFunctionCategory', {
        message: `Failed to load remote icon '${fileName}' for function '${name}'`,
      });

      setIsError();
    } else {
      setNotError();
    }
  };

  return fileName && !isError ? (
    <Image src={iconUriForIconImageName(fileName)} height={20} width={20} alt={name} onLoadingStateChange={loadBackupFunctionCategory} />
  ) : (
    <CategoryIcon title={name} primaryFill={color} />
  );
};
