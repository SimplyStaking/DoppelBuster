import fs from 'fs';
import { URL } from "url";
import { logger } from "./logger.js";
import axios from 'axios';

/**
 * Function to make a GET request
 * @param {string} url URL to query
 * @returns {object} response from query
 */
export async function getRequest(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    let err = `Error making GET request to ${url}: ${error}`
    logger.error(err);
    throw Error(error.response.status)
  }
}

/**
 * Function to make a POST request
 * @param {string} url URL to query
 * @param {object} payload data payload to send
 * @returns {object} response from query
 */
export async function postRequest(url, payload) {
  try {
    const response = await axios.post(url, payload);
    return response.data;
  } catch (error) {
    let err = `Error making POST request to ${url}: ${error}`
    logger.error(err);
    throw Error(error.response.status)
  }
}

/**
 * Function to get list of validators
 * @param {string} filename  file name or path to read
 * @returns {array} list of validators
 */
export const readValidatorList = (filename) => {
  let rawData = fs.readFileSync("./validators/"+filename);
  return String(rawData).split(",")
};

/**
 * Function to read a json file
 * @param {string} filename  file name or path to read
 * @returns {object} the JSON data in the file
 */
export const readJSONFile = (filename) => {
  let rawData = fs.readFileSync(filename);
  return JSON.parse(String(rawData));
};

/**
 * Function to save JSON data to a file
 * @param {object} newData new JSON data to save
 * @param {string} filename filename to save data to
 */
export const saveJSONDataToFile = (newData, filename) => {
  let data = JSON.stringify(newData);
  fs.writeFileSync(filename, data);
};

/**
   * Function to check if a file exists
   * @param {string} path filepath
   * @returns {boolean} true if file exists, false otherwise
   */
export const checkFileExists = (path) => {
  try {
    fs.accessSync(path, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Function to check whether a URL is valid or not
 * @param {string} url the URL to check
 * @returns {boolean} whether the url is valid or not
 */
export const validUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Function to get bit string from bytes
 * @param {array} bytes array of bytes to convert
 * @returns {string} bit string from bytes
 */
export const bytesToLittleEndianBitString = (bytes) => {
  let bitString = '';
  for (let i = bytes.length - 1; i >= 0; i--) {
    const byte = bytes[i];
    for (let j = 0; j < 8; j++) {
      const bit = (byte >> j) & 1;
      bitString += bit.toString();
    }
  }
  return bitString;
}