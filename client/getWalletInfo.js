require('dotenv').config()
const LndGrpc = require('lnd-grpc') // wrapper for Lnd gRPC API

const run = async () => {
    const lnd = new LndGrpc({
        host: process.argv[2] || process.env.LND_SOCKET,
        cert: process.argv[3] || process.env.LND_TLS_CERT_PATH,
        macaroon: process.argv[4] || process.env.LND_MACAROON_PATH
    })
    await lnd.connect()
    const { Lightning } = lnd.services
    console.log(await Lightning.getInfo()) 
}

run()
