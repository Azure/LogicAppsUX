import { makeStyles } from '@fluentui/react-components';

export const useBoundedInputStyles = makeStyles({
  row: {
    width: '100%',
    paddingBottom: '20px',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
  },
  titleContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleText: {
    display: 'inline',
    fontSize: '12px',
  },
  titleLabelText: {
    fontStyle: 'italic',
  },
  titleRequiredLabelText: {
    color: 'red',
  },
  descriptionContainer: {
    display: 'flex',
    flexDirection: 'row',
    width: '60%',
  },
  descriptionText: {
    display: 'inline',
    fontSize: '10px',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
  },
  formControlWrapper: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formControl: {
    display: 'inline-block',
    width: '60%',
  },
  formControlDescription: {
    display: 'inline-block',
    width: '60%',
  },
  controlButton: {
    paddingTop: '0px',
  },
});

export const useStyles = makeStyles({
  unlimitedInputHeaderCell: {
    width: '170px',
    display: 'inline-block',
    paddingRight: '5px',
  },
  draggableListItem: {
    display: 'inline-block',
    width: '100%',
  },
  inputDropdownWrapper: {
    display: 'inline-block',
    width: '270px',
    paddingRight: '8px',
  },
  inputDropdown: {
    width: '220px',
    display: 'inline-block',
  },
  boundedInputTopRow: {
    display: 'flex',
    flexDirection: 'row',
    height: '40px',
  },
  boundedInputRow: {
    paddingBottom: '25px',
  },
  allowedTypesComponent: {
    width: '170px',
    textAlign: 'end',
  },
  typesParent: {
    fontSize: '11px',
  },
  inputNameDiv: {
    width: '200px',
  },
  inputName: {
    display: 'block',
  },
  inputDescription: {
    fontSize: '11px',
  },
  addButton: {
    marginLEft: '0px',
  },
  addIcon: {
    fontSize: '12px',
  },
  tabWrapper: {
    paddingTop: '8px',
  },
  listButtons: {
    paddingLeft: '8px',
  },
  badgeWrapper: {
    width: '70px',
    display: 'inline-block',
  },
  listButton: {
    width: '40px',
    maxWidth: '40px',
  },
});
