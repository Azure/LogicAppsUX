import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const dataMapApi = createApi({
  reducerPath: 'dataMapApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://management.azure.com/',
    prepareHeaders: (headers, { getState }) => {
      const armToken = ''; // XXX

      headers.set('authorization', `Bearer ${armToken}`);

      return headers;
    },
  }),
  endpoints: (builder) => ({
    // TODO get data map type
    getMap: builder.query<string, string>({
      query: (resourceId) => `${resourceId}?api-version=2022-03-01`,
    }),
  }),
});

export const { useGetMapQuery } = dataMapApi;
