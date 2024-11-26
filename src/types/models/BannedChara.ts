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

import { mapValues } from '../runtime';
/**
 * 
 * @export
 * @interface BannedChara
 */
export interface BannedChara {
    /**
     * 
     * @type {string}
     * @memberof BannedChara
     */
    chara: string;
    /**
     * 
     * @type {string}
     * @memberof BannedChara
     */
    playerId: string;
}

/**
 * Check if a given object implements the BannedChara interface.
 */
export function instanceOfBannedChara(value: object): value is BannedChara {
    if (!('chara' in value) || value['chara'] === undefined) return false;
    if (!('playerId' in value) || value['playerId'] === undefined) return false;
    return true;
}

export function BannedCharaFromJSON(json: any): BannedChara {
    return BannedCharaFromJSONTyped(json, false);
}

export function BannedCharaFromJSONTyped(json: any, ignoreDiscriminator: boolean): BannedChara {
    if (json == null) {
        return json;
    }
    return {
        
        'chara': json['chara'],
        'playerId': json['playerId'],
    };
}

  export function BannedCharaToJSON(json: any): BannedChara {
      return BannedCharaToJSONTyped(json, false);
  }

  export function BannedCharaToJSONTyped(value?: BannedChara | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'chara': value['chara'],
        'playerId': value['playerId'],
    };
}
