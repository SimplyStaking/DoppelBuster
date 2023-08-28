import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { Config } from "./config.js";

// Load config
const config = new Config();
// Open db
let db;

/**
 * Function to load DB
 */
const loadDB = async () => {
  if (!db) {
    db = await open({
      filename: config.config.db_path,
      driver: sqlite3.Database,
    });
  }
};

/**
 * Function to create required DBs if they do not exist
 */
export const createDBs = async () => {
  try {
    await loadDB();

    await db.migrate({
      migrationsPath: "./migrations",
      table: "migrations",
    });

    await db.exec("PRAGMA foreign_keys=ON");
  } catch (err) {
    throw new Error("DB ERROR when creating DBs: " + err);
  }
};

/**
 * Function to get all validators from the DB
 * @returns {object[]} array of validators in DB
 * @returns {number} returns[].val_index The validator index
 * @returns {string} returns[].val_group The name of the validator group
 * @returns {number} returns[].enabled_epoch The epoch when to be enabled
 * @returns {bool} returns[].in_doppelganger Whether the validator is in doppelganger
 * @returns {bool} returns[].started_vc Whether the validator client was already started
 */
export const getAllValidators = async () => {
  await loadDB();

  return await db.all("SELECT * FROM validators");
};

/**
 * Function to get all validators in doppelganger check from the DB
 * @returns {object[]} array of validators in DB
 * @returns {number} returns[].val_index The validator index
 * @returns {string} returns[].val_group The name of the validator group
 * @returns {number} returns[].enabled_epoch The epoch when to be enabled
 * @returns {bool} returns[].in_doppelganger Whether the validator is in doppelganger
 * @returns {bool} returns[].started_vc Whether the validator client was already started
 */
export const getValidatorsInDoppelganger = async () => {
  await loadDB();

  return await db.all("SELECT * FROM validators where in_doppelganger=1");
};

/**
 * Function to get a validator from the DB
 * @param {number} validator the index of the validator
 * @param {string} valGroup the group of the validator
 * @returns {object} array of jobs in DB
 * @returns {number} returns.val_index The validator index
 * @returns {string} returns[].val_group The name of the validator group
 * @returns {number} returns.enabled_epoch The epoch when to be enabled
 * @returns {bool} returns.in_doppelganger Whether the validator is in doppelganger
 * @returns {bool} returns[].started_vc Whether the validator client was already started
 */
export const getValidator = async (validator, valGroup) => {
  await loadDB();

  let validatorData =  await db.get("SELECT * FROM validators WHERE val_index="+String(validator));
  if(!validatorData){
    await createValidator(validator, valGroup);
    return await db.get("SELECT * FROM validators WHERE val_index="+String(validator));
  }

  return validatorData
};

/**
 * Function to add a validator to the DB
 * @param {number} index index of the validator
 * @param {string} valGroup group of the validator
 */
export const createValidator = async (index, valGroup) => {
  try {
    await loadDB();

    await db.run("INSERT INTO validators (val_index, val_group) VALUES (?,?)", [index, valGroup]);
  } catch (err) {
    throw new Error("DB ERROR when creating validator: " + err);
  }
};

/**
 * Function to make an update to a validator
 * @param {string} table table name
 * @param {object} values values to update in a JSON object. The properties
 *                        would be the column names and the values would be the
 *                        values to set
 * @param {string} key field to update
 * @param {string} group validator group of the records to update
 */
export const updateTable = async (table, values, key, group) => {
  await loadDB();
  let actualFields = Object.keys(values);
  let actualValues = Object.values(values);

  // Create string
  let update = "";
  for (let i = 0; i < actualFields.length; i++) {
    update += actualFields[i] + " = ?";

    // If not last element
    if (i !== actualFields.length - 1) {
      update += ", ";
    }
  }

  let matcher = key == "val_index" ? Number(group) : "'"+group+"'"
  try {
    await db.run(
      `UPDATE ${table} SET ${update} WHERE ${key} = ${matcher};`, actualValues
    );
  } catch (err) {
    throw new Error("DB ERROR when updating table: " + err);
  }
};
