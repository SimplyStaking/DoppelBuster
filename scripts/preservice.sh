#!/bin/bash

endpoint=$1
hostname=$2
response=$(curl -sS $endpoint/check?filename=$hostname | jq '.start')

if [[ $response == *"true"* ]]; then
    echo "Success! Starting the service..."
    exit 0
else
    echo "Endpoint did not return success. Service will not start."
    exit 1
fi