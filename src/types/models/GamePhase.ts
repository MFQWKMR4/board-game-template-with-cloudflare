/* tslint:disable */
/* eslint-disable */
/**
 * Bodoge API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 1.0.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


/**
 * 
 * @export
 */
export const GamePhase = {
    Waiting: 'WAITING',
    Playing: 'PLAYING',
    End: 'END'
} as const;
export type GamePhase = typeof GamePhase[keyof typeof GamePhase];


export function instanceOfGamePhase(value: any): boolean {
    for (const key in GamePhase) {
        if (Object.prototype.hasOwnProperty.call(GamePhase, key)) {
            if (GamePhase[key as keyof typeof GamePhase] === value) {
                return true;
            }
        }
    }
    return false;
}

export function GamePhaseFromJSON(json: any): GamePhase {
    return GamePhaseFromJSONTyped(json, false);
}

export function GamePhaseFromJSONTyped(json: any, ignoreDiscriminator: boolean): GamePhase {
    return json as GamePhase;
}

export function GamePhaseToJSON(value?: GamePhase | null): any {
    return value as any;
}

export function GamePhaseToJSONTyped(value: any, ignoreDiscriminator: boolean): GamePhase {
    return value as GamePhase;
}
