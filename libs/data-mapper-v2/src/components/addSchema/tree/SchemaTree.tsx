import {
  type SchemaExtended,
  SchemaType,
  equals,
} from "@microsoft/logic-apps-shared";
import { Tree, mergeClasses } from "@fluentui/react-components";
import { useStyles } from "./styles";
import { useState, useMemo, useRef, useEffect } from "react";
import { useIntl } from "react-intl";
import RecursiveTree from "./RecursiveTree";
import { flattenSchemaIntoSortArray, flattenSchemaNodeMap } from "../../../utils";

export type SchemaTreeProps = {
  schemaType?: SchemaType;
  schema: SchemaExtended;
};

export const SchemaTree = (props: SchemaTreeProps) => {
  const styles = useStyles();
  const {
    schemaType,
    schema: { schemaTreeRoot },
  } = props;

  const isLeftDirection = useMemo(
    () => equals(schemaType, SchemaType.Source),
    [schemaType]
  );
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const intl = useIntl();
  const treeRef = useRef<HTMLDivElement | null>(null);
  const flattenedScehma = useMemo(() => flattenSchemaNodeMap(schemaTreeRoot), [schemaTreeRoot]);

  const treeAriaLabel = intl.formatMessage({
    defaultMessage: "Schema tree",
    id: "t2Xi1/",
    description: "tree showing schema nodes",
  });

  useEffect(() => {
    const allNodes = flattenSchemaIntoSortArray(schemaTreeRoot);
    setOpenKeys(new Set<string>(allNodes));
  }, [schemaTreeRoot, setOpenKeys]);
  return schemaTreeRoot ? (
    <Tree
      ref={treeRef}
      className={
        isLeftDirection
          ? mergeClasses(styles.leftWrapper, styles.wrapper)
          : mergeClasses(styles.rightWrapper, styles.wrapper)
      }
      aria-label={treeAriaLabel}
    >
      <RecursiveTree
        root={schemaTreeRoot}
        isLeftDirection={isLeftDirection}
        setOpenKeys={setOpenKeys}
        openKeys={openKeys}
        flattenedScehmaMap={flattenedScehma}
      />
    </Tree>
  ) : null;
};
