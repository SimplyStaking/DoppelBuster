import { getLatestEpoch } from "./helpers/beacon-api.js";
import { getValidatorsInDoppelganger, updateTable } from "./helpers/db.js";
import { logger } from "./helpers/logger.js";

/**
 * Controller for the checker
 */
export const makeCheckerController = (metrics) => {
  const oneSecInterval = 1_000;

  // Create an interval which checks every second
  setInterval(async () => {
    try {
      // Get latest epoch
      let epoch = await getLatestEpoch();

      // Get all validators in doppelganger
      let vals = await getValidatorsInDoppelganger();

      // For each validator
      vals.forEach(async (val) => {
        // Get epoch when doppelganger should be ready
        let enabled_epoch = val.enabled_epoch;

        // If we passed that epoch
        if (epoch > enabled_epoch){
          await updateTable("validators", {"in_doppelganger": false, "enabled_epoch": 0}, "val_index", val.val_index)
          metrics.updateMetricsValidator(val["val_group"].split(".")[0], false)
        } else {
          metrics.updateMetricsValidator(val["val_group"].split(".")[0], true)
        }
    });
        
    } catch (err) {
        logger.error("Checker Controller Error: " + err);
    }
    
  }, oneSecInterval * 60);

};
