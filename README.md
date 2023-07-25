# lightning-over-wireguard
Use lightning payments to facilitate a Wireguard tunnel between client and server

## Developer instructions
1. Create a regtest lightning network with at least 2 nodes with channels and liquidity between them. The easiest way to do this is with [Polar](https://lightningpolar.com/)
2. Create a .env for both the client and server which defines the LND_TLS_CERT_PATH, LND_MACAROON_PATH, and LND_SOCKET of their respective lightning nodes
3. Update the run scripts with the proper network configurations (network name and IPs)
4. Use the `rebuild.sh` and `run.sh` to make changes to the client and server
5. From inside the `ln-over-wg-client` docker container, run `node start.js` to establish a payment authorized session with the server.

*For quicker startups in the future, update the `start-all.sh` script with a reference to your lightning network docker compose file. Example: `$HOME/.polar/networks/1/docker-compose.yml`
