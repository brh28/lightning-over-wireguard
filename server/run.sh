#!/bin/bash

docker run -d \
 -p 3000:3000 \
 --name ln-over-wg-server \
 --network=ivpn_poc \
 --ip 172.19.0.5 \
 --add-host=alice:172.19.0.2 \
 --cap-add=NET_ADMIN \
 --sysctl net.ipv4.conf.all.src_valid_mark=1 \
 brh28/ln-over-wg-server
