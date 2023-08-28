import { Registry, Gauge } from "prom-client";

export class MonitorMetrics {
  constructor() {
    // Create a Registry which registers the metrics
    this.register = new Registry();

    // Add a default label which is added to all metrics
    this.register.setDefaultLabels({
      app: "doppelganger-checker",
    });

    // Create gauge for in doppleganger
    this.groupInDoppelganger = new Gauge({
      name: "group_in_doppleganger",
      help: "If the validator group is in submission",
      labelNames: ["group"],
    });

    // Register the gauges
    this.register.registerMetric(this.groupInDoppelganger);
  }

  /**
   * Function to update metrics
   * @param {string} validatorGroup validator index
   * @param {bool} inSubmission whether the oracle is in submission
   */
  updateMetricsValidator(
    validatorGroup,
    inSubmission
  ) {
    this.groupInDoppelganger.labels(validatorGroup).set(Number(inSubmission));
  }

}
