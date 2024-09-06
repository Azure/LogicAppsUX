import type { LogicApps, LogicAppsV2, BoundParameters } from '@microsoft/logic-apps-shared';
import { getIntl, equals, UnsupportedException } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export default class ManualInputsBinder extends Binder {
  bind(inputs: LogicApps.ManualTriggerInputs | LogicAppsV2.GeofenceTriggerInputs, kind?: string): BoundParameters {
    if (!inputs) {
      return {};
    }

    const intl = getIntl();
    const intlMessages = {
      [constants.MANUAL.METHOD]: intl.formatMessage({
        defaultMessage: 'Method',
        id: 'PTBl5s',
        description: 'Method',
      }),
      [constants.MANUAL.RELATIVE_PATH]: intl.formatMessage({
        defaultMessage: 'Relative path',
        id: '9g8zOn',
        description: 'Relative path',
      }),
      [constants.MANUAL.SCHEMA]: intl.formatMessage({
        defaultMessage: 'Schema',
        id: 'Q7FyUc',
        description: 'Schema',
      }),
      [constants.GEOFENCE.CENTER_LATITUDE]: intl.formatMessage({
        defaultMessage: 'Center latitude',
        id: '39tGAg',
        description: 'Center latitude',
      }),
      [constants.GEOFENCE.CENTER_LONGITUDE]: intl.formatMessage({
        defaultMessage: 'Center longitude',
        id: 'lcGdP1',
        description: 'Center longitude',
      }),
      [constants.GEOFENCE.RADIUS]: intl.formatMessage({
        defaultMessage: 'Radius',
        id: '/vFxH5',
        description: 'Radius',
      }),
    };

    if (kind && equals(kind, constants.GEOFENCE.TYPE)) {
      const definition = (inputs as LogicAppsV2.GeofenceTriggerInputs).parameters!.serializedGeofence!;

      switch (definition.type) {
        case 'Circle': {
          const { centerLatitude, centerLongitude, radius } = definition;
          return {
            ...this.makeOptionalBoundParameter(
              constants.GEOFENCE.CENTER_LATITUDE,
              intlMessages[constants.GEOFENCE.CENTER_LATITUDE],
              centerLatitude
            ),
            ...this.makeOptionalBoundParameter(
              constants.GEOFENCE.CENTER_LONGITUDE,
              intlMessages[constants.GEOFENCE.CENTER_LONGITUDE],
              centerLongitude
            ),
            ...this.makeOptionalBoundParameter(constants.GEOFENCE.RADIUS, intlMessages[constants.GEOFENCE.RADIUS], radius),
          };
        }
        default: {
          throw new UnsupportedException(
            intl.formatMessage(
              {
                defaultMessage: 'Unsupported Geofence Type {geofenceType}. Supported Geofence Types are {supportedTypes}.',
                id: '4zhUP6',
                description: 'Alt text on action/trigger card when there is a connector name but no operation name',
              },
              {
                geofenceType: definition.type,
                supportedTypes: 'Circle',
              }
            )
          );
        }
      }
    }

    const { method, relativePath, schema } = inputs as LogicApps.ManualTriggerInputs;

    return {
      ...this.makeOptionalBoundParameter(constants.MANUAL.METHOD, intlMessages[constants.MANUAL.METHOD], method),
      ...this.makeOptionalBoundParameter(constants.MANUAL.RELATIVE_PATH, intlMessages[constants.MANUAL.RELATIVE_PATH], relativePath),
      ...this.makeOptionalBoundParameter(constants.MANUAL.SCHEMA, intlMessages[constants.MANUAL.SCHEMA], schema),
    };
  }
}
