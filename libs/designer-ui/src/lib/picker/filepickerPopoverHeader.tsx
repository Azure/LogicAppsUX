import type { FilePickerBreadcrumb } from "./types";
import { Breadcrumb, BreadcrumbButton, BreadcrumbDivider, BreadcrumbItem } from "@fluentui/react-components";

interface FilePickerPopoverHeaderProps {
  currentPathSegments: FilePickerBreadcrumb[];
}

export const FilePickerPopoverHeader: React.FC<FilePickerPopoverHeaderProps> = (props) => {
  const { currentPathSegments } = props;

  return (
    <Breadcrumb>
      {currentPathSegments.map((segment, index) => (
        <>
          {index > 0 ? <BreadcrumbDivider key={`FilePicker.breadcrumbDivider.${segment.key}`} /> : null}
          <BreadcrumbItem key={`FilePicker.breadcrumb.${segment.key}`}>
            <BreadcrumbButton current={index === currentPathSegments.length - 1} onClick={segment.onSelect}>
              {segment.text}
            </BreadcrumbButton>
          </BreadcrumbItem>
        </>
      ))}
    </Breadcrumb>
  );
}