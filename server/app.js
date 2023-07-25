var express = require('express');
var path = require('path');
var logger = require('morgan');
const cors = require('cors')
require('dotenv').config()
const LndGrpc = require('lnd-grpc') // wrapper for Lnd gRPC API
var protectedRouter = require('./routes/protected');
const { boltwall, TIME_CAVEAT_CONFIGS, ORIGIN_CAVEAT_CONFIGS } = require('boltwall')
const { Lsat } = require('lsat-js');

var app = express();
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors())

const { WgConfig, generateKeyPair } = require('wireguard-tools');
const filePath = path.join(__dirname, '/configs', '/wg-lightning.conf')

async function startup() {
  const lnd = new LndGrpc({
    host: process.env.LND_SOCKET,
    cert: process.env.LND_TLS_CERT_PATH,
    macaroon: process.env.LND_MACAROON_PATH
  })
  await lnd.connect()
  const { Lightning } = lnd.services
  console.log('Connected to LND node: ', (await Lightning.getInfo()).alias) 

  const wgLightning = new WgConfig({
    wgInterface: {
      address: ['10.0.0.1/24'],
      listenPort: 51820
    },
    filePath
  });
  const { publicKey, privateKey } = await wgLightning.generateKeys({ preSharedKey: false })
  console.log('publickey = ', publicKey);
  console.log('privatekey = ', privateKey);
  await wgLightning.save(); // write file and start interface
}

startup().then(() => {
  console.log('Interface wgLightning created.')
}).catch(err => {
  console.log('Error creating wireguard interface')
  console.log(err)
});

app.use('/index', function(req, res, next) {
  res.json('Hello world');
});

app.use(boltwall({...ORIGIN_CAVEAT_CONFIGS, ...TIME_CAVEAT_CONFIGS}));

// Tracks authorized payment_hashes to ensure 1-time token use 
const payment_hashes = new Map();
app.use((req, resp, next) => {
  const lsat = Lsat.fromToken(req.headers.authorization);
  if (payment_hashes.get(lsat.paymentHash)) {
    resp.status(402).send('Lsat already used');
  } else {
    payment_hashes.set(lsat.paymentHash, lsat);
    next();
  }
});

app.use('/testprotected', (req, resp) => resp.send("Accessed protected area"));
app.use('/protected', protectedRouter);

module.exports = app;
