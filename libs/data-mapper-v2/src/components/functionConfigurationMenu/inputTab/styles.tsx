import { makeStyles } from '@fluentui/react-components';

export const useStyles = makeStyles({
  row: {
    width: '100%',
    paddingBottom: '18px',
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
    marginTop: '5px',
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
    width: '60%',
    display: 'block',
    marginTop: '15px',
  },
  controlButton: {
    paddingTop: '0px',
  },
  listButton: {
    width: '40px',
    maxWidth: '40px',
    paddingTop: '0px',
  },
  addButton: {
    paddingLeft: '0px',
  },
  addIcon: {
    fontSize: '12px',
  },
  draggableListContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  draggableListItem: {
    maxHeight: 'fit-content',
    marginTop: '5px',
  },
});
