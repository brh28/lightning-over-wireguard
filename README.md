# lightning-over-wireguard
Use lightning payments to facilitate a Wireguard tunnel between client and server

## Code overview

![LN-over-wg-poc](https://github.com/brh28/lightning-over-wireguard/assets/31115595/35e8d05c-731d-48c1-9a55-5f05531d1790)

This repository contains two components: the ln-over-wg-client and the ln-over-wg-server.

_Server_ - The server is an ExpressJS app. The root `app.js` defines server endpoints and their routes. Boltwall is Express middleware, which intercepts any calls to the endpoints defined after its own definition and responds according to the [L402](https://docs.lightning.engineering/the-lightning-network/l402) standard. This includes a "protected" router, which contains an endpoint to set wireguard configurations on the server. This endpoint is only accessible upon complettion of an invoice.

_Client_ - The client can create a wireguard tunnel with the server by running the `start.js` script. This sets the interface, then triggers the L402 control flow to add the server as a peer and pay for its session.

## Developer instructions
1. Create a regtest lightning network with at least 2 nodes with channels and liquidity between them. The easiest way to do this is with [Polar](https://lightningpolar.com/)
2. Create a .env for both the client and server which defines the LND_TLS_CERT_PATH, LND_MACAROON_PATH, and LND_SOCKET of their respective lightning nodes
3. Update the run scripts with the proper network configurations (network name and IPs)
4. From inside the `ln-over-wg-client` docker container, run `node start.js` to establish a payment authorized session with the server.
5. Use the `rebuild.sh` and `run.sh` to make changes to the client and server

*For quicker startups in the future, update the `start-all.sh` script with a reference to your lightning network docker compose file. Example: `$HOME/.polar/networks/1/docker-compose.yml`
