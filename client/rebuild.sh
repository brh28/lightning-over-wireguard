#!/bin/bash

# Stop and remove the existing container
docker stop ln-over-wg-client && docker rm ln-over-wg-client

# Build the new Docker image
docker build . -t brh28/ln-over-wg-client