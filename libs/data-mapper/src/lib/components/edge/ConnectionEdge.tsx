import { Button, makeStyles, shorthands, tokens, Tooltip } from '@fluentui/react-components';
import { Add20Filled } from '@fluentui/react-icons';
import React, { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { BaseEdge, getSmoothStepPath } from 'reactflow';
import type { EdgeProps } from 'reactflow';

const addFunctionBtnSize = 24;
const parentPadding = 4;
const parentTotalSize = addFunctionBtnSize + parentPadding * 2;

const getLineColor = (isSelected: boolean, isHovered: boolean) => {
  if (isSelected) {
    return tokens.colorCompoundBrandStroke;
  } else {
    return isHovered ? tokens.colorNeutralStroke1Hover : tokens.colorNeutralStroke1;
  }
};

const btnStyles = {
  height: addFunctionBtnSize,
  minHeight: addFunctionBtnSize,
  maxHeight: addFunctionBtnSize,
  width: addFunctionBtnSize,
  minWidth: addFunctionBtnSize,
  maxWidth: addFunctionBtnSize,
  padding: 0,
};

const useStyles = makeStyles({
  addFnBtn: {
    color: tokens.colorCompoundBrandForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow2,

    ':hover': {
      color: tokens.colorCompoundBrandForeground1Hover,
      backgroundColor: tokens.colorNeutralBackground1Hover,
      boxShadow: tokens.shadow4,
    },
  },
  addFnPlaceholder: {
    color: tokens.colorCompoundBrandForeground1,
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.border('1px', 'dashed', tokens.colorCompoundBrandStroke),
  },
});

export const ConnectionEdge = (props: EdgeProps) => {
  const { id, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, selected } = props;
  const intl = useIntl();
  const styles = useStyles();

  const [isHovered, setIsHovered] = useState(false);

  const [edgePath, labelX, labelY] = useMemo(
    () => getSmoothStepPath({ sourceX: sourceX + 10, sourceY, sourcePosition, targetX: targetX - 10, targetY, targetPosition }),
    [sourcePosition, sourceX, sourceY, targetX, targetY, targetPosition]
  );

  const insertFnLoc = intl.formatMessage({
    defaultMessage: 'Insert function',
    description: 'Message to insert function',
  });

  const onAddFunctionClick = (event: React.MouseEvent) => {
    event.stopPropagation();

    console.log(id);
  };

  return (
    <svg onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <BaseEdge
        path={edgePath}
        labelX={labelX}
        labelY={labelY}
        {...props}
        style={{
          strokeWidth: tokens.strokeWidthThick,
          stroke: getLineColor(!!selected, isHovered),
        }}
      />

      <foreignObject
        width={parentTotalSize}
        height={parentTotalSize}
        x={labelX - parentTotalSize / 2}
        y={labelY - parentTotalSize / 2}
        style={{
          borderRadius: tokens.borderRadiusCircular,
          padding: parentPadding,
        }}
      >
        {isHovered && (
          <Tooltip relationship="label" content={insertFnLoc}>
            <Button
              shape="circular"
              icon={<Add20Filled style={{ height: 16, width: 16 }} />}
              onClick={onAddFunctionClick}
              className={styles.addFnBtn}
              style={btnStyles}
            />
          </Tooltip>
        )}

        {false && ( // TODO: Hook up this condition (actually adding Fn)
          <Button shape="circular" icon={<Add20Filled />} className={styles.addFnPlaceholder} style={btnStyles} disabled />
        )}
      </foreignObject>
    </svg>
  );
};
