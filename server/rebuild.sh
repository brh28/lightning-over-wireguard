#!/bin/bash

# Stop and remove the existing container
docker stop ln-over-wg-server && docker rm ln-over-wg-server

# Build the new Docker image
docker build . -t brh28/ln-over-wg-server