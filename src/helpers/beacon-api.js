import { Config } from "./config.js";
import {
  bytesToLittleEndianBitString,
  getRequest,
  postRequest,
} from "./utils.js";
import { logger } from "./logger.js";

// Load the config
const config = new Config();

/**
 * Function to get the latest epoch
 */
export const getLatestEpoch = async () => {
  // Get slot from request
  let head = await getRequest(
    `${config.config.beacon_url}/eth/v2/beacon/blocks/head`
  );
  let slot = Number(head.data.message.slot);
  // Get epoch by dividing by 32 and flooring it
  let epoch = Math.floor(slot / 32);
  return epoch;
};

/**
 * Function to get the validators duties
 * @param {string} epoch epoch to get duties for
 * @param {array} validators String array of validator indexes
 * @returns {object} an object containing the different slots, duties and indexes
 * @returns {object[]} returns.duties Array of duties where the index matches 
 *                     the index of validators
 * @returns {object[]} returns.slots Array of different slots
 */
export const getValidatorDuties = async (epoch, validators) => {
  let duties = await postRequest(
    `${config.config.beacon_url}/eth/v1/validator/duties/attester/${epoch}`,
    validators
  );

  let dutiesToReturn = [];
  let slotsToReturn = [];
  let indexesToReturn = [];

  // For each validator
  for (let i = 0; i < duties.data.length; i++) {
    // Get the inclusion slot (slot + 1)
    // TODO: Is inclusion slot always + 1?
    let slot = Number(duties.data[i].slot) + 1;
    dutiesToReturn.push({
      slot: slot,
      committee_index: duties.data[i].committee_index,
      validator_committee_index: duties.data[i].validator_committee_index,
      committee_length: duties.data[i].committee_length,
    });
    // If slot is not added to array, add it
    if (!slotsToReturn.includes(slot)) {
      slotsToReturn.push(slot);
    }

    indexesToReturn.push(duties.data[i].validator_index)
  }

  return {
    duties: dutiesToReturn,
    slots: slotsToReturn,
    indexes: indexesToReturn
  };
};

/**
 * Function to get attestations for slots
 * @param {array} slots String array containing the slots to get attestations
 * @returns {object} Object containing attestations where the key is the slot 
 */
export const getAttestationsForSlots = async (slots) => {
  let attestations = {};
  // For each slot
  for (let slot of slots) {
    // Get the slot
    try {
      let slotAttestations = await getRequest(
        `${config.config.beacon_url}/eth/v1/beacon/blocks/${slot}/attestations`
      );
      attestations[String(slot)] = slotAttestations;
    } catch (err) {
      logger.error("Could not get attestations for " + String(slot));
      if (err.message == "404"){
        attestations[String(slot)] = "0x";
      }
    }
  }
  return attestations;
};

/**
 * Function to get attestation bits for a duty
 * @param {object} duty duty to get attestation bits for
 * @param {array} attestations array of attestations
 * @param {string} blockRoot block root to get attestation bits for
 * @returns {string} String containing attestation bits
 */
export const getSlotAttestationsBits = async (
  duty,
  attestations,
  blockRoot
) => {
  // For each attestation
  for (let attestation of attestations.data) {
    // if attestation committee index and block root matches
    if (
      attestation.data.index == duty.committee_index &&
      blockRoot == attestation.data.beacon_block_root
    ) {
      let agg_bits = attestation.aggregation_bits;
      let agg_bits_bytes = Buffer.from(agg_bits.split("0x")[1], "hex");
      if (Number(duty["committee_length"]) < 280){
        agg_bits_bytes = agg_bits_bytes.slice(0, agg_bits_bytes.length - 1);
      }
      let agg_bits_string = bytesToLittleEndianBitString(agg_bits_bytes);
      let agg_bits_array = agg_bits_string.match(/(.{8})/g, "$1 ");
      agg_bits = agg_bits_array.reverse().join("");
      return agg_bits;
    }
  }
  return null;
};


// export const getBlockAttestations = async (duty, blockRoot) => {
//   let attestations = null;
//   try {
//     attestations = await getRequest(
//       `${config.config.beacon_url}/eth/v1/beacon/blocks/${duty.slot}/attestations`
//     );
//   } catch (err) {
//     logger.error("Error getting block attestations: " + err.message);
//     return null;
//   }

//   for (let attestation of attestations.data) {
//     if (
//       attestation.data.index == duty.committee_index &&
//       blockRoot == attestation.data.beacon_block_root
//     ) {
//       let agg_bits = attestation.aggregation_bits;
//       let agg_bits_bytes = Buffer.from(agg_bits.split("0x")[1], "hex");
//       agg_bits_bytes = agg_bits_bytes.slice(0, agg_bits_bytes.length - 1);
//       let agg_bits_string = bytesToLittleEndianBitString(agg_bits_bytes);
//       let agg_bits_array = agg_bits_string.match(/(.{8})/g, "$1 ");
//       agg_bits = agg_bits_array.reverse().join("");
//       return agg_bits;
//     }
//   }
//   return null;
// };

/**
 * Function to get validator indexes
 * @param {array} validators array of validator public keys
 * @returns array of validator indexes and strings
 */
export const getValidatorsIndexes = async (validators) => {
  let indexes = [];
  for (let val of validators) {
    try{
      let valState = await getRequest(
        `${config.config.beacon_url}/eth/v1/beacon/states/head/validators/${val}`
      );
      indexes.push(valState.data.index);
    }
    catch(err){
      logger.error(`Error getting validator ${val} info ${err.message}`)
    }
    
  }
  return indexes;
};

/**
 * Function to get block root
 * @param {string} slot slot to get root for
 * @returns string with block root
 */
export const getBlockRoot = async (slot) => {
  try {
    let blockData = await getRequest(
      `${config.config.beacon_url}/eth/v1/beacon/blocks/${slot}/root`
    );
    return blockData.data.root;
  } catch (err) {
    logger.error("Error getting block root: " + err.message);
    if (err.message == "404"){
        return "0x";
    }
    return null;
  }
};

/**
 * Function to get current justified epoch
 * @returns {String} current justified epoch
 */
export const getCurrentJustifiedEpoch = async () => {
    try {
      let blockData = await getRequest(
        `${config.config.beacon_url}/eth/v1/beacon/states/head/finality_checkpoints`
      );
      return blockData.data.current_justified.epoch;
    } catch (err) {
      logger.error("Error getting current justified: " + err.message);
      return null;
    }
  };