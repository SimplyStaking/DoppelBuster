# DoppelBuster - An Ethereum doppelganger checker tool

## What is this tool?

1. This tool operates independently from the Ethereum validator client, providing an extra layer of protection. By running externally, it remains vigilant against potential risks, ensuring the integrity of your validator operations.
2. It only requires a docker container for the server and a pre-execution script for the validator client service.
3.  The core functionality of this tool revolves around safeguarding against double signing. By examining attestations from the previous two epochs, it meticulously checks if any validator has already made an attestation. If even a single attestation is found from the validator list, the tool acts as a gatekeeper, disallowing the validator client from starting, effectively mitigating the risk of double signing incidents.


## Why should one run this tool in addition to the client's built in doopelganger check?

1. <b>Not all clients have a doppelganger check:</b> For example, despite having Dirk to avoid double signatures,Vouch does not have an inbuilt doppelganger check.

2. <b>Eliminating Double-Sign Risks:</b> Imagine two clients with identical keys, both missing recent attestations, starting simultaneously. A regular doppelganger check would overlook this, solely focusing on attestations. As a result, both clients could start unknowingly, increasing the likelihood of a double-sign. Assuming all your clients are connected to the same instance of the tool, the tool addresses this by tracking recent key activities, preventing the validator client from starting if it detects recent activity by another validator.

3. <b>Ensuring Key Exclusivity:</b> Our tool goes beyond mere attestations. It scans for key usage across clients and acts as a gatekeeper for the validator client. If a key is already associated with another client in our database, it restricts the validator client from starting, ensuring key exclusivity and reducing the risk of unauthorized usage.

4. <b>Smart Alert Management:</b> Alerts during a doppelganger check can be disruptive and unnecessary. Our tool provides a valuable metric that indicates whether a group of validators is currently undergoing a doppelganger check. By utilizing this metric alongside alert queries, you can avoid triggering alerts during these critical checks, allowing validators to focus on the task at hand without needless distractions.

## Requirements on host machine

1. jq
2. docker-compose

## How to use it

1. Add the validator files inside /validators with a comma separated list of public keys you want to check. Ideally, the file is named as the hostname of the validator VM so that you can query that hostname in the script with no confusion. You can take a look at the .sample file to get an idea
2. Set the beacon-chain endpoint in <b>config/config.json</b>
3. Turn on the server using

```bash
docker-compose up -d
```

4. Setup script for validator client<br>
    A. <b>If you are running the validator client as a service file</b>

    - Add this line to the service file
        ```bash
        StartLimitInterval=60s
        StartLimitBurst=999999
        
        [Service]
        RestartSec=30
        ExecStartPre=/path/to/dir/scripts/preservice.sh <SERVER_IP>:<SERVER_PORT> <FILENAME_STEP_1>
        ```
    <br>

    B. <b>If you are running the validator client as a docker command</b>

    - We suggest adding your <b>docker run</b> command to a service file and follow the step above as this is considered the safest way not to start multiple validator clients.


## How it works:

The system operates by taking in validator public keys as comma-separated lists, which are stored in different files named after the hostname of the corresponding virtual machine (VM) where they should run. It exposes an endpoint called "/check".

When the "/check" endpoint is queried, it performs the following actions:

1. Retrieves the list of validator public keys by providing the filename from which to obtain these keys.
2. Fetches the latest epoch from the system.
3. Retrieves the duties of all validators in the last two epochs.
4. Checks whether any attestation requests were made by the validators in the past two epochs.

The "/check" endpoint returns true, allowing the validator client in the service file to start, if it meets the following two criteria:

1. The percentage of requests resulting in a 404 error (indicating that the requested data is not finalized yet) does not exceed 45%. This threshold is set to ensure that at least one correct request is available for each epoch, even if some requests are not yet finalized.
2. One of the following conditions is met:
   - No valid attestation, without any errors, is found for any validator in the last two epochs, and no attestation is found in the first epoch. This is because the first epoch is assumed to have a higher chance of including all relevant data, as it is less likely to be affected by 404 errors.
   - No valid attestation, without any errors, is found for any validator in the last two epochs, and there is a validator who missed attestation in both of the preceding epochs.

By ensuring these criteria are met, the system can determine whether it is appropriate to start the validator client.