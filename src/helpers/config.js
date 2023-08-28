import assert from "assert";
import { readJSONFile, validUrl } from "./utils.js";
import { logger } from "./logger.js"
import { exit } from "process";

export const CONFIG_FILE = "./config/config.json";

export class Config {
  /**
   * Constructor for the class
   */
  constructor() {
    try {
      this.config = readJSONFile(CONFIG_FILE);
      this.validate();
    } catch (err) {
      logger.error(`Cannot load config from ${CONFIG_FILE}: ${err}`);
      exit(1)
    }
  }

  /**
   * Function to validate config
   */
  validate() {
    // If no url
    assert(validUrl(this.config.beacon_url), `Invalid beacon URL`);
    assert(this.config.db_path && this.config.db_path !== "", "Database path cannot be empty");
    assert(!isNaN(this.config.vc_doppelganger_epochs_down), "The number of epochs down during doppelganger by the validator client should be a valid number");
    assert(!isNaN(this.config.checker_port), "The checker port should be a valid number");
    assert(!isNaN(this.config.metrics_port), "The metrics port should be a valid number");
    assert(this.config.checker_port != this.config.metrics_port, "The metrics and checker ports must be different");
  }
}
