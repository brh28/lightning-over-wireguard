#!/bin/bash

docker stop ln-over-wg-server
docker stop ln-over-wg-client
docker compose -f /home/benhindman/.polar/networks/1/docker-compose.yml -p ivpn down