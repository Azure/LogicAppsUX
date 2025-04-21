import type { RootState } from '../../store';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

const getCustomCodeState = (state: RootState) => state.customCode;

export const useCustomCodeFileNames = () => useSelector(createSelector(getCustomCodeState, (state) => Object.keys(state.files)));
