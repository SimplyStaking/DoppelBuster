/* eslint-disable func-names */

import { startBridge } from './bridge.js'
import { makeCheckerController } from './checker.js';
import { initialiseState } from './helpers/checker-helper.js';
import { Config } from './helpers/config.js';
import { MonitorMetrics } from './helpers/monitor-metrics.js';
const config = new Config();
let metrics = new MonitorMetrics();

/**
  * This is the function which runs the doppelganger checker
  */
export const main = async () => {
  // Init
  await initialiseState()

  // Start the bridge
  startBridge(config.config.checker_port, metrics);

  makeCheckerController(metrics);
};