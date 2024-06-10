import {
  Button,
  Tab,
  TabList,
  TeachingPopoverHeader,
  TeachingPopoverSurface,
} from "@fluentui/react-components";
import { useStyles } from "./styles";
import { DeleteRegular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import React from "react";

export interface FunctionConfigurationPopoverProps {}

export const FunctionConfigurationPopover = () =>
  // props: FunctionConfigurationPopoverProps
  {
    const styles = useStyles();
    const [selectedTab, setSelectedTab] = useState("description");

    return (
      <TeachingPopoverSurface className={styles.surface}>
        <TeachingPopoverHeader className={styles.headerRow}>
          <div>idk</div>
          <Button
          className={styles.deleteButton}
            appearance="transparent"
            size="small"
            icon={<DeleteRegular className={styles.deleteIcon} />}
          />
        </TeachingPopoverHeader>
        <TabList onTabSelect={(e, data) => setSelectedTab(data.value as string)}>
          <Tab value="description">Details</Tab>
          <Tab value="input">Input</Tab>
          <Tab value="output">Output</Tab>
        </TabList>
      </TeachingPopoverSurface>
    );
  };

const DetailsTabContents = () => {
    return <div>Details</div>;
}
