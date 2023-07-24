#!/bin/bash

docker run -it \
    --name ln-over-wg-client \
    --network=ivpn_poc \
    --add-host=bob:172.19.0.3 \
    --cap-add=NET_ADMIN \
    --sysctl net.ipv4.conf.all.src_valid_mark=1 \
    brh28/ln-over-wg-client \
    /bin/bash