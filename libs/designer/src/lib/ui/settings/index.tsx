// this should have all settings sections together in one place unde
// later on will include the logic to render certain settings and/or sections
// for now should show and export:
// <General>
// <Run After>
// <Networking>
// <Data Handling>
// <Security>
// <Tracking>
import { DataHandling } from './sections/datahandling';
import { General } from './sections/general';
import { Security } from './sections/security';

export const SettingsPanel = (): JSX.Element => {
  return (
    <>
      <DataHandling />
      <General />
      <Security />
    </>
  );
};
