import { createDBs } from "./db.js";

/**
 * Function to initialise state
 */
export const initialiseState = async () => {
    // Create tables if they do not exist
    await createDBs();
  };
  