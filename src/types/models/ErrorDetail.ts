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
 * @interface ErrorDetail
 */
export interface ErrorDetail {
    /**
     * 
     * @type {string}
     * @memberof ErrorDetail
     */
    senderId: string;
    /**
     * 
     * @type {string}
     * @memberof ErrorDetail
     */
    requestJson: string;
    /**
     * 
     * @type {string}
     * @memberof ErrorDetail
     */
    errorSummary: string;
    /**
     * 
     * @type {string}
     * @memberof ErrorDetail
     */
    errorMessage: string;
}

/**
 * Check if a given object implements the ErrorDetail interface.
 */
export function instanceOfErrorDetail(value: object): value is ErrorDetail {
    if (!('senderId' in value) || value['senderId'] === undefined) return false;
    if (!('requestJson' in value) || value['requestJson'] === undefined) return false;
    if (!('errorSummary' in value) || value['errorSummary'] === undefined) return false;
    if (!('errorMessage' in value) || value['errorMessage'] === undefined) return false;
    return true;
}

export function ErrorDetailFromJSON(json: any): ErrorDetail {
    return ErrorDetailFromJSONTyped(json, false);
}

export function ErrorDetailFromJSONTyped(json: any, ignoreDiscriminator: boolean): ErrorDetail {
    if (json == null) {
        return json;
    }
    return {
        
        'senderId': json['senderId'],
        'requestJson': json['requestJson'],
        'errorSummary': json['errorSummary'],
        'errorMessage': json['errorMessage'],
    };
}

  export function ErrorDetailToJSON(json: any): ErrorDetail {
      return ErrorDetailToJSONTyped(json, false);
  }

  export function ErrorDetailToJSONTyped(value?: ErrorDetail | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'senderId': value['senderId'],
        'requestJson': value['requestJson'],
        'errorSummary': value['errorSummary'],
        'errorMessage': value['errorMessage'],
    };
}

