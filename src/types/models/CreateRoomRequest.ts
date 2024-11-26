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
 * @interface CreateRoomRequest
 */
export interface CreateRoomRequest {
    /**
     * 
     * @type {string}
     * @memberof CreateRoomRequest
     */
    name: string;
    /**
     * 
     * @type {number}
     * @memberof CreateRoomRequest
     */
    numberOfPlayers: number;
}

/**
 * Check if a given object implements the CreateRoomRequest interface.
 */
export function instanceOfCreateRoomRequest(value: object): value is CreateRoomRequest {
    if (!('name' in value) || value['name'] === undefined) return false;
    if (!('numberOfPlayers' in value) || value['numberOfPlayers'] === undefined) return false;
    return true;
}

export function CreateRoomRequestFromJSON(json: any): CreateRoomRequest {
    return CreateRoomRequestFromJSONTyped(json, false);
}

export function CreateRoomRequestFromJSONTyped(json: any, ignoreDiscriminator: boolean): CreateRoomRequest {
    if (json == null) {
        return json;
    }
    return {
        
        'name': json['name'],
        'numberOfPlayers': json['numberOfPlayers'],
    };
}

  export function CreateRoomRequestToJSON(json: any): CreateRoomRequest {
      return CreateRoomRequestToJSONTyped(json, false);
  }

  export function CreateRoomRequestToJSONTyped(value?: CreateRoomRequest | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'name': value['name'],
        'numberOfPlayers': value['numberOfPlayers'],
    };
}
