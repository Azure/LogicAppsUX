import type { IconProps } from './IconModel';
import { wrapIcon } from '@fluentui/react-icons';
import React from 'react';

const Count32RegularIcon = (props: IconProps) => {
  const { fill: primaryFill = 'currentColor', className } = props;
  return React.createElement(
    'svg',
    Object.assign({}, props, {
      width: 32,
      height: 32,
      viewBox: '0 0 2048 2048',
      xmlns: 'http://www.w3.org/2000/svg',
      className: className,
    }),
    <path
      d="M1917 221l-253 254v1445h-128V603l-256 255v1062h-128V986l-256 256v678H768v-550l-256 256v294H384v-166l-163 163-90-91 253-253V128h128v1317l256-256V128h128v933l256-256V128h128v549l256-256V128h128v165l163-162 90 90z"
      fill={primaryFill}
    />
  );
};

export const Count32Regular = wrapIcon(Count32RegularIcon, 'Count32Regular');

const GreaterThan32RegularIcon = (props: IconProps) => {
  const { fill: primaryFill = 'currentColor', className } = props;
  return React.createElement(
    'svg',
    Object.assign({}, props, {
      width: 32,
      height: 32,
      viewBox: '0 0 2048 2048',
      xmlns: 'http://www.w3.org/2000/svg',
      className: className,
    }),
    <path
      d="M384 1472q0-19 10-35t28-24l1020-453L422 506q-38-17-38-58 0-27 19-45t46-19q13 0 25 5l1152 512q17 8 27 24t11 35q0 20-10 35t-28 23L474 1530q-12 6-26 6-26 0-45-19t-19-45z"
      fill={primaryFill}
    />
  );
};

export const GreaterThan32Regular = wrapIcon(GreaterThan32RegularIcon, 'GreaterThan32Regular');

const GreaterThanOrEqual32RegularIcon = (props: IconProps) => {
  const { fill: primaryFill = 'currentColor', className } = props;
  return React.createElement(
    'svg',
    Object.assign({}, props, {
      width: 32,
      height: 32,
      viewBox: '0 0 2048 2048',
      xmlns: 'http://www.w3.org/2000/svg',
      className: className,
    }),
    <path
      d="M384 1344q0-19 10-35t28-24l1020-453L422 378q-38-17-38-58 0-27 19-45t46-19q13 0 25 5l1152 512q17 8 27 24t11 35q0 20-10 35t-28 23L474 1402q-12 6-26 6-26 0-45-19t-19-45zm-64 448q-26 0-45-19t-19-45q0-26 19-45t45-19h1280q26 0 45 19t19 45q0 26-19 45t-45 19H320z"
      fill={primaryFill}
    />
  );
};

export const GreaterThanOrEqual32Regular = wrapIcon(GreaterThanOrEqual32RegularIcon, 'GreaterThanOrEqual32Regular');

const LessThan32RegularIcon = (props: IconProps) => {
  const { fill: primaryFill = 'currentColor', className } = props;
  return React.createElement(
    'svg',
    Object.assign({}, props, {
      width: 32,
      height: 32,
      viewBox: '0 0 2048 2048',
      xmlns: 'http://www.w3.org/2000/svg',
      className: className,
    }),
    <path
      d="M384 960q0-19 10-35t28-24l1152-512q13-5 25-5 26 0 45 18t20 45q0 42-38 59L606 960l1020 453q17 8 27 24t11 36q0 26-19 44t-45 19q-14 0-26-6L422 1018q-17-8-27-23t-11-35z"
      fill={primaryFill}
    />
  );
};

export const LessThan32Regular = wrapIcon(LessThan32RegularIcon, 'LessThan32Regular');

const LessThanOrEqual32RegularIcon = (props: IconProps) => {
  const { fill: primaryFill = 'currentColor', className } = props;
  return React.createElement(
    'svg',
    Object.assign({}, props, {
      width: 32,
      height: 32,
      viewBox: '0 0 2048 2048',
      xmlns: 'http://www.w3.org/2000/svg',
      className: className,
    }),
    <path
      d="M384 832q0-19 10-35t28-24l1152-512q13-5 25-5 26 0 45 18t20 45q0 42-38 59L606 832l1020 453q17 8 27 24t11 36q0 26-19 44t-45 19q-14 0-26-6L422 890q-17-8-27-23t-11-35zm64 960q-26 0-45-19t-19-45q0-26 19-45t45-19h1280q26 0 45 19t19 45q0 26-19 45t-45 19H448z"
      fill={primaryFill}
    />
  );
};

export const LessThanOrEqual32Regular = wrapIcon(LessThanOrEqual32RegularIcon, 'LessThanOrEqual32Regular');

const AbsoluteValue32RegularIcon = (props: IconProps) => {
  const { fill: primaryFill = 'currentColor', className } = props;
  return React.createElement(
    'svg',
    Object.assign({}, props, {
      viewBox: '0 0 2048 2048',
      xmlns: 'http://www.w3.org/2000/svg',
      className: className,
    }),
    <path
      d="M0 1856V192q0-26 19-45t45-19q26 0 45 19t19 45v1664q0 26-19 45t-45 19q-26 0-45-19t-19-45zm1920 0V192q0-26 19-45t45-19q26 0 45 19t19 45v1664q0 26-19 45t-45 19q-26 0-45-19t-19-45zM469 1439q0-37 23-61t61-24q19 0 36 9t31 21 27 21 25 10q17 0 43-25t55-63 58-82 53-82 39-65 17-29q14-24 27-53l-49-191q-13-49-25-90t-33-71-57-46-96-17q-29 0-59 3v-40l295-52q35 38 57 75t38 75 26 81 25 92l97-145q18-26 46-57t63-58 70-45 70-18q19 0 38 5t33 17 24 27 9 38q0 42-23 63t-64 22q-16 0-30-4t-29-10-30-9-30-5q-20 0-43 16t-46 40-45 55-40 58-32 51-20 33l90 379q3 11 7 31t12 40 19 35 26 15q21 0 45-18t47-43 39-51 27-45l38 19q-18 30-49 75t-68 87-80 73-81 30q-34 0-56-17t-37-44-24-56-16-56q-5-20-9-38t-10-39q-11-48-22-95t-20-95q-18 32-43 77t-57 93-68 97-76 87-81 62-81 24q-21 0-40-7t-34-19-24-31-9-40z"
      fill={primaryFill}
    />
  );
};

export const AbsoluteValue32Regular = wrapIcon(AbsoluteValue32RegularIcon, 'AbsoluteValue32Regular');

const FloorValue32RegularIcon = (props: IconProps) => {
  const { fill: primaryFill = 'currentColor', className } = props;
  return React.createElement(
    'svg',
    Object.assign({}, props, {
      width: 32,
      height: 32,
      viewBox: '0 0 2048 2048',
      xmlns: 'http://www.w3.org/2000/svg',
      className: className,
    }),
    <path
      d="M251 1920q-50 0-95-20t-80-55-55-80-21-96V192q0-26 19-45t45-19q26 0 45 19t19 45v1472q0 27 10 50t27 41 40 27 51 10h320q26 0 45 19t19 45q0 26-19 45t-45 19H251zm1166-64q0-26 19-45t45-19h311q27 0 50-10t40-27 28-41 10-50V192q0-26 19-45t45-19q26 0 45 19t19 45v1477q0 50-20 95t-55 80-80 55-96 21h-316q-26 0-45-19t-19-45zm-948-417q0-37 23-61t61-24q19 0 36 9t31 21 27 21 25 10q17 0 43-25t55-63 58-82 53-82 39-65 17-29q14-24 27-53l-49-191q-13-49-25-90t-33-71-57-46-96-17q-29 0-59 3v-40l295-52q35 38 57 75t38 75 26 81 25 92l97-145q18-26 46-57t63-58 70-45 70-18q19 0 38 5t33 17 24 27 9 38q0 42-23 63t-64 22q-16 0-30-4t-29-10-30-9-30-5q-20 0-43 16t-46 40-45 55-40 58-32 51-20 33l90 379q3 11 7 31t12 40 19 35 26 15q21 0 45-18t47-43 39-51 27-45l38 19q-18 30-49 75t-68 87-80 73-81 30q-34 0-56-17t-37-44-24-56-16-56q-5-20-9-38t-10-39q-11-48-22-95t-20-95q-18 32-43 77t-57 93-68 97-76 87-81 62-81 24q-21 0-40-7t-34-19-24-31-9-40z"
      fill={primaryFill}
    />
  );
};

export const FloorValue32Regular = wrapIcon(FloorValue32RegularIcon, 'FloorValue32Regular');

const CeilingValue32RegularIcon = (props: IconProps) => {
  const { fill: primaryFill = 'currentColor', className } = props;
  return React.createElement(
    'svg',
    Object.assign({}, props, {
      width: 32,
      height: 32,
      viewBox: '0 0 2048 2048',
      xmlns: 'http://www.w3.org/2000/svg',
      className: className,
    }),
    <path
      d="M0 1856V379q0-50 20-95t55-80 80-55 96-21h325q26 0 45 19t19 45q0 26-19 45t-45 19H256q-27 0-50 10t-40 27-28 41-10 50v1472q0 26-19 45t-45 19q-26 0-45-19t-19-45zM1417 192q0-26 19-45t45-19h316q50 0 95 20t80 55 55 80 21 96v1477q0 26-19 45t-45 19q-26 0-45-19t-19-45V384q0-26-10-49t-28-41q-18-18-41-28t-49-10h-311q-26 0-45-19t-19-45zM469 1439q0-37 23-61t61-24q19 0 36 9t31 21 27 21 25 10q17 0 43-25t55-63 58-82 53-82 39-65 17-29q14-24 27-53l-49-191q-13-49-25-90t-33-71-57-46-96-17q-29 0-59 3v-40l295-52q35 38 57 75t38 75 26 81 25 92l97-145q18-26 46-57t63-58 70-45 70-18q19 0 38 5t33 17 24 27 9 38q0 42-23 63t-64 22q-16 0-30-4t-29-10-30-9-30-5q-20 0-43 16t-46 40-45 55-40 58-32 51-20 33l90 379q3 11 7 31t12 40 19 35 26 15q21 0 45-18t47-43 39-51 27-45l38 19q-18 30-49 75t-68 87-80 73-81 30q-34 0-56-17t-37-44-24-56-16-56q-5-20-9-38t-10-39q-11-48-22-95t-20-95q-18 32-43 77t-57 93-68 97-76 87-81 62-81 24q-21 0-40-7t-34-19-24-31-9-40z"
      fill={primaryFill}
    />
  );
};

export const CeilingValue32Regular = wrapIcon(CeilingValue32RegularIcon, 'CeilingValue32Regular');

const SquareRoot32RegularIcon = (props: IconProps) => {
  const { fill: primaryFill = 'currentColor', className } = props;
  return React.createElement(
    'svg',
    Object.assign({}, props, {
      width: 32,
      height: 32,
      viewBox: '0 0 2304 2048',
      xmlns: 'http://www.w3.org/2000/svg',
      className: className,
    }),
    <path
      d="M120 921h502v103H0v-50q0-29 3-57t11-57q17-63 57-110t91-87 104-77 98-81 73-97 29-127q0-88-49-135T280 98q-35 0-68 9t-65 27-58 39-50 48V97q56-53 117-75T294 0q62 0 115 18t91 53 61 85 22 115q0 71-20 125t-52 98-74 78-85 66-85 60-74 62-53 71-20 88v2zm2184-66q0 42-22 63t-65 22q-16 0-30-4t-29-10-29-9-31-5q-19 0-41 14t-44 37-44 51-40 57-34 53-23 41l90 379q3 11 7 31t12 41 19 34 26 15q22 0 46-18t46-43 39-51 27-45l38 19q-11 20-29 47t-40 57-49 59-53 51-54 37-53 14q-35 0-58-20t-41-49q-7-12-16-39t-18-63-19-75-17-77-15-68-10-49q-24 42-56 96t-69 109-76 102-75 78q-28 23-60 39t-70 16q-21 0-40-7t-34-19-24-31-9-40q0-36 23-60t61-25q20 0 37 9t31 21 27 21 24 10q16 0 42-25t57-63 61-86 58-91 47-81 27-53l-49-191q-12-49-24-90t-34-71-57-46-96-17q-29 0-59 3v-40l295-52q35 37 57 74t38 77 27 82 24 90l97-145q17-26 46-57t63-58 70-45 70-18q20 0 38 5t33 17 24 27 9 38zM473 1144l263 562 415-1450h1153v128H1221L767 1920h-72l-304-635-140 62-35-84 257-119z"
      fill={primaryFill}
    />
  );
};

export const SquareRoot32Regular = wrapIcon(SquareRoot32RegularIcon, 'SquareRoot32Regular');

const RightTriangleRegularIcon = (props: IconProps) => {
  const { fill: primaryFill = 'currentColor', className } = props;
  return React.createElement(
    'svg',
    Object.assign({}, props, {
      width: 20,
      height: 20,
      viewBox: '0 0 20 20',
      xmlns: 'http://www.w3.org/2000/svg',
      className: className,
    }),
    <path
      d="M 3.4547685,17.5 17.454769,3.5 v 14 z m 13.0000005,-1 v -3 h -3 v 3 z m 0,-4 V 5.91406 L 5.8688285,16.5 h 6.5859405 v -4 z"
      fill={primaryFill}
    />
  );
};

export const RightTriangleRegular = wrapIcon(RightTriangleRegularIcon, 'RightTriangleRegular');

const IndexRegularIcon = (props: IconProps) => {
  const { fill: primaryFill = 'currentColor', className } = props;
  return React.createElement(
    'svg',
    Object.assign({}, props, {
      width: 20,
      height: 20,
      viewBox: '0 0 20 20',
      xmlns: 'http://www.w3.org/2000/svg',
      className: className,
    }),
    <path
      d="m 8.5,16.5 c 0.1354,0 0.2526,0.0495 0.3516,0.1484 C 8.9505,16.7474 9,16.8646 9,17 9,17.1354 8.9505,17.2526 8.8516,17.3516 8.7526,17.4505 8.6354,17.5 8.5,17.5 8.3646,17.5 8.2474,17.4505 8.1484,17.3516 8.0495,17.2526 8,17.1354 8,17 8,16.8646 8.0495,16.7474 8.1484,16.6484 8.2474,16.5495 8.3646,16.5 8.5,16.5 Z M 8,7.5156 V 8.5469 C 8,8.7031 7.9818,8.862 7.9453,9.0234 7.9141,9.1849 7.8594,9.3333 7.7812,9.4688 7.7083,9.599 7.6094,9.7057 7.4844,9.7891 7.3594,9.8724 7.2031,9.9141 7.0156,9.9141 V 9.4453 C 7.125,9.4453 7.2135,9.4141 7.2812,9.3516 7.349,9.2891 7.401,9.2135 7.4375,9.125 7.474,9.0312 7.4974,8.9323 7.5078,8.8281 7.5234,8.724 7.5312,8.6302 7.5312,8.5469 H 7 V 7.5156 Z M 5.10156,4.64844 C 4.94531,4.73698 4.76823,4.81771 4.57031,4.89062 4.3724,4.96354 4.18229,5 4,5 V 4 C 4.05729,4 4.13802,3.98438 4.24219,3.95312 4.34635,3.92188 4.45052,3.88281 4.55469,3.83594 4.65885,3.78385 4.7526,3.72917 4.83594,3.67188 4.92448,3.61458 4.98177,3.55729 5.00781,3.5 H 6 v 5 H 5.10156 Z M 6.3438,14.8672 c 0.2343,0.0781 0.4218,0.2161 0.5624,0.414 0.1459,0.198 0.2188,0.4193 0.2188,0.6641 0,0.2448 -0.0521,0.4636 -0.1562,0.6563 C 6.8646,16.7943 6.7266,16.9583 6.5547,17.0938 6.3828,17.224 6.1875,17.3255 5.96875,17.3984 5.75521,17.4661 5.53646,17.5 5.3125,17.5 5.09375,17.5 4.88021,17.4635 4.67188,17.3906 4.46875,17.3177 4.27604,17.2214 4.09375,17.1016 v -0.9922 c 0.10417,0.0781 0.19531,0.1458 0.27344,0.2031 0.08333,0.0573 0.16406,0.1042 0.24219,0.1406 0.08333,0.0365 0.17447,0.0625 0.27343,0.0781 0.09896,0.0157 0.21615,0.0235 0.35157,0.0235 0.11458,0 0.22395,-0.0104 0.32812,-0.0313 0.10417,-0.026 0.19531,-0.0651 0.27344,-0.1172 C 5.91927,16.349 5.98438,16.276 6.0312,16.1875 6.0781,16.099 6.1016,15.9896 6.1016,15.8594 6.1016,15.75 6.0703,15.6615 6.0078,15.5938 5.94531,15.526 5.86458,15.4766 5.76562,15.4453 5.66667,15.4089 5.55469,15.3854 5.42969,15.375 5.3099,15.3594 5.19271,15.3516 5.07812,15.3516 c -0.10416,0 -0.20312,0.0026 -0.29687,0.0078 -0.08854,0.0052 -0.16406,0.0078 -0.22656,0.0078 v -0.7578 h 0.26562 c 0.13021,0 0.26302,-0.0052 0.39844,-0.0156 0.13542,-0.0105 0.25781,-0.0391 0.36719,-0.086 0.10937,-0.0469 0.19791,-0.1172 0.26562,-0.2109 0.06771,-0.0938 0.10156,-0.224 0.10156,-0.3907 0,-0.1093 -0.01822,-0.2005 -0.05468,-0.2734 C 5.86198,13.5599 5.8125,13.5052 5.75,13.4688 5.6875,13.4271 5.61198,13.3984 5.52344,13.3828 5.4401,13.3672 5.35156,13.3594 5.25781,13.3594 5.05469,13.3594 4.875,13.4062 4.71875,13.5 4.5625,13.5938 4.41146,13.7057 4.26562,13.8359 v -1.0156 c 0.1823,-0.1198 0.37761,-0.2031 0.58594,-0.25 C 5.0651,12.5234 5.28125,12.5 5.5,12.5 c 0.1875,0 0.36979,0.026 0.5469,0.0781 0.1771,0.0521 0.3333,0.1302 0.4687,0.2344 0.1406,0.099 0.2526,0.2266 0.336,0.3828 0.0833,0.1511 0.125,0.3281 0.125,0.5313 0,0.25 -0.0495,0.4739 -0.1485,0.6718 -0.0989,0.1927 -0.2604,0.349 -0.4843,0.4688 z M 11.1641,7.5 H 13 v 1 H 10 V 7.9141 C 10,7.6849 10.0495,7.474 10.1484,7.2812 10.2474,7.0885 10.3698,6.9115 10.5156,6.75 10.6667,6.5833 10.8281,6.42708 11,6.28125 11.1719,6.13021 11.3307,5.98698 11.4766,5.85156 11.6276,5.71094 11.7526,5.57292 11.8516,5.4375 11.9505,5.29688 12,5.15104 12,5 12,4.86458 11.9505,4.7474 11.8516,4.64844 11.7526,4.54948 11.6354,4.5 11.5,4.5 11.3802,4.5 11.2734,4.53646 11.1797,4.60938 11.0911,4.68229 11.0339,4.77865 11.0078,4.89844 L 10.0312,4.69531 c 0.0313,-0.17187 0.0912,-0.33073 0.1797,-0.47656 0.0938,-0.14583 0.2058,-0.27083 0.336,-0.375 0.1354,-0.10937 0.2838,-0.19271 0.4453,-0.25 C 11.1589,3.53125 11.3281,3.5 11.5,3.5 c 0.2083,0 0.4036,0.03906 0.5859,0.11719 0.1823,0.07812 0.3412,0.18489 0.4766,0.32031 0.1354,0.13542 0.2422,0.29427 0.3203,0.47656 C 12.9609,4.59635 13,4.79167 13,5 13,5.30208 12.9349,5.5651 12.8047,5.78906 12.6745,6.00781 12.5156,6.21094 12.3281,6.39844 12.1406,6.5859 11.9401,6.7656 11.7266,6.9375 11.5182,7.1094 11.3307,7.2969 11.1641,7.5 Z M 14,7.5156 h 1 v 1.0313 c 0,0.1562 -0.0182,0.3151 -0.0547,0.4765 -0.0312,0.1615 -0.0859,0.3099 -0.1641,0.4454 -0.0729,0.1302 -0.1718,0.2369 -0.2968,0.3203 -0.125,0.0833 -0.2813,0.125 -0.4688,0.125 V 9.4453 c 0.1094,0 0.1979,-0.0312 0.2656,-0.0937 C 14.349,9.2891 14.401,9.2135 14.4375,9.125 14.474,9.0312 14.4974,8.9323 14.5078,8.8281 14.5234,8.724 14.5312,8.6302 14.5312,8.5469 H 14 Z M 12.5,16.5 c 0.1354,0 0.2526,0.0495 0.3516,0.1484 C 12.9505,16.7474 13,16.8646 13,17 13,17.1354 12.9505,17.2526 12.8516,17.3516 12.7526,17.4505 12.6354,17.5 12.5,17.5 12.3646,17.5 12.2474,17.4505 12.1484,17.3516 12.0495,17.2526 12,17.1354 12,17 12,16.8646 12.0495,16.7474 12.1484,16.6484 12.2474,16.5495 12.3646,16.5 12.5,16.5 Z m -2,0 c 0.1354,0 0.2526,0.0495 0.3516,0.1484 C 10.9505,16.7474 11,16.8646 11,17 11,17.1354 10.9505,17.2526 10.8516,17.3516 10.7526,17.4505 10.6354,17.5 10.5,17.5 10.3646,17.5 10.2474,17.4505 10.1484,17.3516 10.0495,17.2526 10,17.1354 10,17 10,16.8646 10.0495,16.7474 10.1484,16.6484 10.2474,16.5495 10.3646,16.5 10.5,16.5 Z"
      fill={primaryFill}
    />
  );
};

export const IndexRegular = wrapIcon(IndexRegularIcon, 'IndexRegular');

const Divide32RegularIcon = (props: IconProps) => {
  const { fill: primaryFill = 'currentColor', className } = props;
  return React.createElement(
    'svg',
    Object.assign({}, props, {
      width: 32,
      height: 32,
      viewBox: '0 0 2048 2048',
      xmlns: 'http://www.w3.org/2000/svg',
      className: className,
    }),

    <path
      d="M896 384q0-27 10-50t27-40 41-28 50-10q26 0 49 10t41 27 28 41 10 50q0 27-10 50t-27 40-41 28-50 10q-27 0-50-10t-41-27-27-40-10-51zM64 1024q-26 0-45-19T0 960q0-26 19-45t45-19h1920q26 0 45 19t19 45q0 26-19 45t-45 19H64zm832 512q0-27 10-50t27-40 41-28 50-10q26 0 49 10t41 27 28 41 10 50q0 27-10 50t-27 40-41 28-50 10q-27 0-50-10t-41-27-27-40-10-51z"
      fill={primaryFill}
    />
  );
};

export const Divide32Regular = wrapIcon(Divide32RegularIcon, 'Divide32Regular');

const EPowerX32RegularIcon = (props: IconProps) => {
  const { fill: primaryFill = 'currentColor', className } = props;
  return React.createElement(
    'svg',
    Object.assign({}, props, {
      width: 32,
      height: 32,
      viewBox: '0 0 2048 2048',
      xmlns: 'http://www.w3.org/2000/svg',
      className: className,
    }),

    <path
      d="M599 768q107 0 183 36t125 101 71 149 23 183v82H310q2 75 22 138t59 108 99 70 139 25q86 0 162-27t142-82v147q-75 54-162 74t-179 20q-116 0-199-39t-138-108-81-161-26-200q0-100 30-193t87-165 142-115 192-43zm-287 418h528q0-59-14-111t-43-91-76-61-111-23q-62 0-111 23t-85 63-58 91-30 109zm1251-685l56 233q2 8 4 20t7 25 10 21 18 9q13 0 28-11t28-26 24-32 17-28l24 12q-10 19-29 46t-44 54-50 44-49 19q-22 0-36-12t-25-30q-6-12-15-43t-17-67-16-69-11-50q-11 20-27 47t-35 58-41 59-47 54-49 38-51 15q-26 0-46-16t-20-43q0-23 14-38t38-15q12 0 22 6t19 13 17 13 15 6q10 0 26-15t34-39 38-53 35-56 29-50 18-33q-5-21-12-56t-18-72-24-67-32-43q-16-11-34-14t-37-4h-19q-9 0-20 1v-24l181-32q22 23 36 46t23 47 17 50 15 56q17-25 39-59t50-65 59-53 65-22q24 0 44 13t20 41q0 26-14 39t-40 13q-20 0-36-8t-37-9q-19 0-39 19t-40 44-35 52-25 41z"
      fill={primaryFill}
    />
  );
};

export const EPowerX32Regular = wrapIcon(EPowerX32RegularIcon, 'EPowerX32Regular');

const TenPowerX32RegularIcon = (props: IconProps) => {
  const { fill: primaryFill = 'currentColor', className } = props;
  return React.createElement(
    'svg',
    Object.assign({}, props, {
      width: 32,
      height: 32,
      viewBox: '0 0 2560 2048',
      xmlns: 'http://www.w3.org/2000/svg',
      className: className,
    }),

    <path
      d="M512 384v1408H355V602q-28 25-67 50t-84 48-88 39-80 26V606q52-15 108-38t111-53 105-62 92-69h60zm1138 702q0 74-7 155t-27 159-53 150-83 124-121 86-163 32q-89 0-155-30t-113-82-79-119-49-143-25-152-7-147q0-76 7-159t25-164 50-154 83-128 122-89 169-33q93 0 161 31t115 85 77 123 45 147 22 156 6 152zm-159 15q0-46-2-106t-11-125-26-127-48-111-76-79-111-30q-68 0-116 30t-80 79-51 112-28 128-12 127-3 112q0 48 2 107t13 121 28 118 50 103 78 72 113 28q65 0 111-28t77-75 50-106 27-121 12-122 3-107zm429-813l181-32q22 23 36 46t23 47 17 50 15 56q17-25 39-59t50-65 59-53 65-22q24 0 44 13t20 41q0 26-14 39t-40 13q-20 0-36-8t-37-9q-19 0-39 19t-40 44-35 52-25 41l56 233q2 8 4 20t7 25 10 21 18 9q13 0 28-11t28-26 24-32 17-28l24 12q-10 19-29 46t-44 54-50 44-49 19q-22 0-36-12t-25-30q-6-12-15-43t-17-67-16-69-11-50q-11 20-27 47t-35 58-41 59-47 54-49 38-51 15q-26 0-46-16t-20-43q0-23 14-38t38-15q12 0 22 6t19 13 17 13 15 6q10 0 26-15t34-39 38-53 35-56 29-50 18-33q-5-21-12-56t-18-72-24-67-32-43q-16-11-34-14t-37-4h-19q-9 0-20 1v-24z"
      fill={primaryFill}
    />
  );
};

export const TenPowerX32Regular = wrapIcon(TenPowerX32RegularIcon, 'TenPowerX32Regular');

const XDivide132RegularIcon = (props: IconProps) => {
  const { fill: primaryFill = 'currentColor', className } = props;
  return React.createElement(
    'svg',
    Object.assign({}, props, {
      width: 32,
      height: 32,
      viewBox: '0 0 2048 2048',
      xmlns: 'http://www.w3.org/2000/svg',
      className: className,
    }),

    <path
      d="M1597 1165l90 379q3 11 7 31t12 41 19 34 26 15q22 0 46-18t46-43 39-51 27-45l38 19q-11 20-29 47t-40 57-49 59-53 51-54 37-53 14q-35 0-58-20t-41-49q-7-12-16-39t-18-63-19-75-17-77-15-69-10-48q-24 42-56 96t-69 108-76 103-75 78q-28 23-60 39t-70 16q-21 0-40-7t-34-19-24-31-9-40q0-37 23-61t61-24q21 0 38 9t31 21 27 21 23 10q16 0 42-25t57-63 61-86 58-91 47-81 27-53l-47-187q-6-24-12-49t-15-48q-11-28-25-55t-41-46q-26-19-57-24t-63-6q-29 0-59 3v-40l295-52q35 37 57 74t38 77 27 82 24 90l97-145q17-26 46-57t63-58 70-45 70-18q20 0 38 5t33 17 24 27 9 38q0 42-22 63t-65 22q-16 0-30-4t-29-10-29-9-31-5q-20 0-41 14t-44 37-43 51-40 57-34 53-24 41zM384 1024H270V159q-21 18-49 36t-61 35-64 28-59 19V161q38-10 79-26t81-38 77-46 67-51h43v1024zm-9 736l-110-64 896-1536 110 64-896 1536z"
      fill={primaryFill}
    />
  );
};

export const XDivide132Regular = wrapIcon(XDivide132RegularIcon, 'XDivide132Regular');

const LogYX32RegularIcon = (props: IconProps) => {
  const { fill: primaryFill = 'currentColor', className } = props;
  return React.createElement(
    'svg',
    Object.assign({}, props, {
      width: 32,
      height: 32,
      viewBox: '0 0 3712 2048',
      xmlns: 'http://www.w3.org/2000/svg',
      className: className,
    }),

    <path
      d="M1154 1270q0 86-24 159t-72 128-116 84-160 31q-89 0-157-30t-116-82-71-125-25-158q0-89 25-164t73-129 120-85 164-31q91 0 158 31t112 85 67 127 22 159zm-99 1q0-66-14-124t-45-101-83-69-124-25q-72 0-124 26t-86 70-50 103-17 125q0 64 17 121t51 100 86 68 121 25q73 0 124-25t83-68 46-102 15-124zm828-271h3V886h96v709q0 102-22 180t-70 132-123 80-181 28q-125 0-239-56v-98q55 31 115 50t124 20q78 0 135-21t93-62 54-100 18-135v-92h-3q-45 78-113 114t-157 37q-83 0-143-31t-99-85-58-122-19-144q0-82 21-158t64-134 110-94 157-36q78 0 138 31t99 101zm3 321v-133q0-49-17-92t-49-75-73-50-92-19q-70 0-120 28t-81 75-46 106-15 121q0 56 13 111t43 99 74 71 111 27q58 0 104-21t80-57 50-86 18-105zm778-44q28 0 41 23t13 47q0 25-8 48t-20 45q-15 27-44 70t-67 94-80 104-84 100-76 83-60 51q-14 9-30 16t-33 7q-16 0-28-12t-12-28q0-20 16-36t36-17q17 0 22 12t13 24l6 2q15-4 36-22t43-40 41-45 29-35l-29-323q-2-19-3-39t-7-37-20-28-39-11q-10 0-19 1t-20 2l-4-19 149-37q23 36 28 75t10 82l22 251q9-11 27-34t39-52 44-61 40-61 30-52 12-36q0-7-9-11t-19-9-20-16-9-29q0-20 11-33t32-14zm709-99l72 300q2 9 6 25t10 32 14 28 21 12q17 0 36-14t36-35 31-41 22-35l31 15q-13 24-38 60t-56 69-64 57-64 24q-28 0-46-16t-32-39q-9-16-19-55t-21-85-20-88-16-66q-15 25-35 60t-45 75-54 77-60 68-63 50-65 19q-34 0-59-21t-26-56q0-29 19-48t48-19q16 0 29 7t25 17 21 16 19 8q13 0 34-19t44-51 49-68 46-72 37-64 22-43l-38-151q-12-48-24-81t-30-55-47-31-73-10h-20q-10 0-21 1v-31l234-42q28 30 46 59t30 61 21 65 19 72q21-31 51-75t65-85 76-68 83-29q32 0 57 17t25 53q0 33-18 50t-51 17q-12 0-24-3t-23-8-23-7-24-4q-24 0-50 24t-52 58-45 66-33 53zM220 517v1137h-96V517h96z"
      fill={primaryFill}
    />
  );
};

export const LogYX32Regular = wrapIcon(LogYX32RegularIcon, 'LogYX32Regular');

const XPowerY32RegularIcon = (props: IconProps) => {
  const { fill: primaryFill = 'currentColor', className } = props;
  return React.createElement(
    'svg',
    Object.assign({}, props, {
      width: 32,
      height: 32,
      viewBox: '0 0 2048 2048',
      xmlns: 'http://www.w3.org/2000/svg',
      className: className,
    }),

    <path
      d="M1067 855q0 42-22 63t-65 22q-16 0-30-4t-29-10-29-9-31-5q-19 0-41 14t-44 37-44 51-40 57-34 53-23 41l90 379q3 11 7 31t12 41 19 34 26 15q22 0 46-18t46-43 39-51 27-45l38 19q-11 20-29 47t-40 57-49 59-53 51-54 37-53 14q-35 0-58-20t-41-49q-7-12-16-39t-18-63-19-75-17-77-15-69-10-48q-24 42-56 96t-69 108-76 103-75 78q-28 23-60 39t-70 16q-21 0-40-7t-34-19-24-31-9-40q0-37 23-61t61-24q20 0 37 9t31 21 27 21 24 10q16 0 41-25t56-63 62-86 59-91 47-81 27-53l-47-187q-6-24-12-49t-15-48q-11-28-25-55t-41-46q-26-19-57-24t-63-6q-29 0-59 3v-40l295-52q35 37 57 74t38 77 27 82 24 90l97-145q17-26 46-57t63-58 70-45 70-18q20 0 38 5t33 17 24 27 9 38zm981-679q0 38-13 76t-31 71q-17 32-48 79t-72 104-87 120-97 125-100 122-96 108-85 87-69 55q-23 14-48 25t-54 11q-25 0-44-19t-19-44q0-16 7-31t19-27 27-19 31-7q19 0 27 9t13 21 9 20 16 10q10 0 29-14t43-35 50-49 49-52 40-45 25-31l-45-515q-1-13-3-35t-7-46-10-44-14-30q-15-17-35-22t-42-6q-15 0-30 1t-31 4l-7-30 238-58q18 29 28 59t16 61 9 64 6 65l36 400q15-18 43-54t63-83 69-98 65-97 47-84 19-55q0-13-14-19t-31-14-32-24-14-47q0-32 17-53t51-21q22 0 38 10t27 26 16 36 5 39z"
      fill={primaryFill}
    />
  );
};

export const XPowerY32Regular = wrapIcon(XPowerY32RegularIcon, 'XPowerY32Regular');

const RoundRegularIcon = (props: IconProps) => {
  const { fill: primaryFill = 'currentColor', className } = props;
  return React.createElement(
    'svg',
    Object.assign({}, props, {
      width: 28,
      height: 28,
      viewBox: '0 0 28 28',
      xmlns: 'http://www.w3.org/2000/svg',
      className: className,
    }),
    <>
      <path
        d="M15.499 18H11.5C11.224 18 11 17.776 11 17.5C11 15.681 12.248 14.656 13.349 13.753L13.3511 13.7513C14.2362 13.025 15 12.3983 15 11.5C15 10.673 14.327 10 13.5 10C12.673 10 12 10.673 12 11.5C12 11.776 11.776 12 11.5 12C11.224 12 11 11.776 11 11.5C11 10.121 12.121 9 13.5 9C14.879 9 16 10.121 16 11.5C16 12.873 14.9839 13.7057 13.9959 14.5154L13.9809 14.5277C13.0947 15.2551 12.2518 15.9468 12.046 17H15.499C15.775 17 15.999 17.224 15.999 17.5C15.999 17.776 15.775 18 15.499 18Z"
        fill={primaryFill}
      />
      <path
        d="M8.49961 18C8.22384 17.9998 8.00011 17.7759 8.00011 17.5V10.776C7.66211 11.032 7.22211 11.286 6.65811 11.474C6.39711 11.561 6.11311 11.419 6.02511 11.158C5.93811 10.896 6.08011 10.613 6.34111 10.525C7.59979 10.1058 8.03247 9.31177 8.05386 9.27251C8.16186 9.06851 8.39611 8.96105 8.61711 9.01605C8.84111 9.07205 8.99911 9.26905 8.99911 9.49905V17.5C8.99911 17.7759 8.77538 17.9998 8.49961 18Z"
        fill={primaryFill}
      />
      <path
        d="M17.5 15.5C17.5 16.879 18.621 18 20 18C21.379 18 22.5 16.879 22.5 15.5C22.5 14.684 22.106 13.956 21.498 13.5C22.106 13.044 22.5 12.316 22.5 11.5C22.5 10.121 21.379 9 20 9C18.621 9 17.5 10.121 17.5 11.5C17.5 11.776 17.724 12 18 12C18.276 12 18.5 11.776 18.5 11.5C18.5 10.673 19.173 10 20 10C20.827 10 21.5 10.673 21.5 11.5C21.5 12.327 20.827 13 20 13C19.724 13 19.5 13.224 19.5 13.5C19.5 13.776 19.724 14 20 14C20.827 14 21.5 14.673 21.5 15.5C21.5 16.327 20.827 17 20 17C19.173 17 18.5 16.327 18.5 15.5C18.5 15.224 18.276 15 18 15C17.724 15 17.5 15.224 17.5 15.5Z"
        fill={primaryFill}
      />
    </>
  );
};

export const RoundRegular = wrapIcon(RoundRegularIcon, 'RoundRegular');
