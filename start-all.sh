#!/bin/bash

docker compose -f /home/benhindman/.polar/networks/1/docker-compose.yml -p ivpn up -d

./server/rebuild.sh
./server/run.sh

./client/rebuild.sh
./client/run.sh
