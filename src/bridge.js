import bodyParser from "body-parser";
import { createServer } from "http";
import express from "express";
import { parse } from "url";
import { 
    updateTable 
} from "./helpers/db.js";
import { logger } from "./helpers/logger.js";
import { readValidatorList } from "./helpers/utils.js";
import { getAttestationsForSlots, getBlockRoot, getCurrentJustifiedEpoch, getLatestEpoch, getSlotAttestationsBits, getValidatorDuties, getValidatorsIndexes } from "./helpers/beacon-api.js";
import { getValidator } from "./helpers/db.js";
import { Config } from "./helpers/config.js";
import { MonitorMetrics } from "./helpers/monitor-metrics.js";

// Load config
const config = new Config();

/**
 * Function to create a server
 * @param {number} PORT the port to listen on
 */
export const startBridge = (PORT, metrics) => {
  logger.info("Bridge started");

  startMetricsServer(metrics);
  const app = express();
  app.use(bodyParser.json());

  /**
   * POST /check endpoint
   * This is used to check a list of validators
   */
  app.get("/check", async (req, res) => {
      // Get filename from where to read validator list
      let filename = req.query.filename;

      // Validate the passed filename
      if (!filename || filename == ""){
        logger.info("Start validator for " + filename+": false");
        return res.status(400).json({error: "The filename of the file containing the validator pubkeys has to be passed", start: false})
      }

      let validators = []
      try {
        // Read list of validators
        validators = readValidatorList(filename)
      }
      catch (err) {
        logger.error("Could not get validator list file", err)
        logger.info("Start validator for " + filename+": false");
        return res.status(500).json({"error": err.message, start: false})
      }

      // Get validator indexes
      let indexes = await getValidatorsIndexes(validators);
      // Get latest epoch
      let epoch = await getLatestEpoch();
      // Set last attested to epoch -2
      let lastAttested = epoch-2;

      // Create epoch list to iterate
      let epochs = [epoch-1, epoch];

      // This holds a flag whether an attestation was found
      let foundAttestation = [false, false];
      // This holds a flag whether an attestation was actually found
      let foundNonErroredAttestation = false;
      // This holds an array of validators where a confirmed missed attestation was found
      let foundMissedAttestationVals = [[],[]];
      // This is a flag which is set to true if a validator is found to have actually missed attestations on two epochs
      let foundMissedAttestation = false;
      // This holds a flag whether the group is already in a doppelganger 
      // check
      let groupInDoppelganger = true;
      // Check for all 404s
      let counter404 = 0
      let counterReq = 0

      // Loop through epochs
      for (let j = 0; j < epochs.length; j++){
        let ep = epochs[j]
        // Get validator duties
        let duties = await getValidatorDuties(ep, indexes);
        indexes = duties.indexes;
        // Get attestations for slots
        let attestations = await getAttestationsForSlots(duties.slots)

        // Initialise an empty list of roots. This is done to avoid duplicate
        // requests
        let blockRoots = {}

        // For each duty
        for (let i =0; i < duties.duties.length; i++){
            // Get the validator index
            let valIndex = indexes[i]
            // Get the validator
            let valData = await getValidator(valIndex, filename);
            // Check if group is in check already
            groupInDoppelganger = valData.in_doppelganger

            // If group is already in check, do not start
            let epochEnabledCheck = valData.enabled_epoch - config.vc_doppelganger_epochs_down
            if (groupInDoppelganger && ep < epochEnabledCheck) {
              logger.info("Start validator for " + filename+": false");
              return res.status(200).json({start: false});
            }

            let duty = duties.duties[i]

            // If slot is not already requested, make a request
            if (!(duty["slot"] in blockRoots)){
              blockRoots[duty["slot"]] = await getBlockRoot(duty["slot"]-1)
            }

            // Set attested as default
            let attested = true

            // If a block root and attestations are found
            if (blockRoots[duty["slot"]] && attestations[duty["slot"]] && attestations[duty["slot"]] != "0x"){
                // Get the aggregation bits
                let aggBits = await getSlotAttestationsBits(duty, attestations[duty["slot"]], blockRoots[duty["slot"]]);
                
                // If aggregation bits were obtained successfully
                if (aggBits) {
                  // See if attested by getting relevant bit
                  attested = aggBits[duty["validator_committee_index"]] == "1"
                
                  // If attested, mark that we found an attestation successfully
                  if (attested){
                    logger.info("Found foundNonErroredAttestation for "+String(valIndex)+" in epoch "+String(ep))
                    foundNonErroredAttestation = true;
                  }
                  else{
                    foundMissedAttestationVals[j].push(valIndex);
                    if (foundMissedAttestationVals[0].includes(valIndex) && foundMissedAttestationVals[1].includes(valIndex)){
                      foundMissedAttestation = true
                    }
                  }
                }
            }

            // If block root was not found
            if (blockRoots[duty["slot"]] == "0x" || attestations[duty["slot"]] == "0x"){
              attested = false;
              counter404++;
            }
            
            // If attested, set lastAttested epoch and foundAttestation to true
            if (attested) {
              lastAttested = ep
              foundAttestation[j] = true
            }
            
            counterReq++;
            logger.info(`${indexes[i]} Attested epoch ${ep}: ${attested}`)
        }
    }

    // We start if (1 or 2) and 3
    // 1: we did not find an attestation in the first epoch (in the first epoch because it is assumed that it should not error with 404) and we did not find an actual attestation
    // 2: we did not find an actual attestation and we found a missed attestation for 1 validator in both epochs
    // 3: 45% of requests did not 404
    // Start if we did not found an actual attestation and the first epoch was missed or if no actual attestations were found but missed attestations were found
    let percentage404 = Number(counter404)/Number(counterReq)
    logger.info(`Percentage of 404ed requests ${percentage404}`)
    let toStart = ((!foundNonErroredAttestation && !foundAttestation[0]) || (!foundNonErroredAttestation && foundMissedAttestation)) && (percentage404 <= 0.45)
    // if group not in doppelganger
    if (!groupInDoppelganger){
      await updateTable("validators", {"in_doppelganger": true, "enabled_epoch": lastAttested + config.config.vc_doppelganger_epochs_down + 2}, "val_group", filename)
      metrics.updateMetricsValidator(filename.split(".")[0], true)
    }

    // If to start validator client
    if (toStart) {
      await updateTable("validators", {"started_vc": true}, "val_group", filename)
    }

    logger.info("Start validator for " + filename+" :" + toStart);
    // Start validator when we did not actually found an attestation or 
    return res.status(200).json({start: toStart});
  
  });

  const listener = app.listen(PORT, "0.0.0.0", () => {
    logger.info("External adapter listening on port " + PORT);
  });

  listener.on("error", (err) => {
    logger.error("Bridge error: " + err);
  });
};

/**
 * Creates the server for the metrics endpoint
 */
const startMetricsServer = (metrics) => {
  // Define the HTTP server
  const server = createServer(async (req, res) => {
    // Retrieve route from request object
    const route = parse(req.url).pathname;

    if (route === "/metrics") {
      // Return all metrics the Prometheus exposition format
      res.setHeader("Content-Type", metrics.register.contentType);
      res.end(await metrics.register.metrics());
    }
  });

  server.listen(config.config.metrics_port);
};

