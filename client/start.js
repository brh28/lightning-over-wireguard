require('dotenv').config()
const fetch = require('node-fetch');
const { Lsat } = require('lsat-js');
const LndNode = require('./LndNode');
const domain = 'http://172.19.0.5:3000';
const { WgConfig, generateKeyPair } = require('wireguard-tools');

const lnd = new LndNode({
  host: process.env.LND_SOCKET,
  cert: process.env.LND_TLS_CERT_PATH,
  macaroon: process.env.LND_MACAROON_PATH
})

var path = require('path'); // path and filepath are redundant
const filePath = path.join(__dirname, '/configs', '/wg-lightning.conf')

var prevLsat; // for malicious purposes
const purchaseTime = async (publicKey) => {
  const url = domain + '/protected/wireguard?' + new URLSearchParams({
    pubkey: publicKey,
  });
  console.log('Calling: ' + url);
  var headers = new Headers();
  headers.append('pragma', 'no-cache');
  headers.append('cache-control', 'no-cache');
  var r1 = await fetch(url, { method: 'GET', headers: headers });
  const header = r1.headers.get('www-authenticate')
  const lsat = Lsat.fromHeader(header)
  console.log('Received invoice: ', lsat.invoice);
  const preimage = (await lnd.payInvoice(lsat.invoice)).payment_preimage
  console.log('Payment complete. Preimage: ', preimage)
  lsat.setPreimage(preimage)
  prevLsat = lsat.toToken(); // for malicious purposes
  headers.append('Authorization', lsat.toToken())
  const r2 = await fetch(url, { method: 'GET', headers: headers});
  return await r2.json();
};

const maliciousPurchaseTime = async (publicKey) => {
  const url = domain + '/protected/wireguard?' + new URLSearchParams({
    pubkey: publicKey,
  });
  console.log('Calling: ' + url);
  var headers = new Headers();
  headers.append('pragma', 'no-cache');
  headers.append('cache-control', 'no-cache');
  headers.append('Authorization', prevLsat)
  var r1 = await fetch(url, { method: 'GET', headers: headers });
  return await r1.json();
};

const extendSession = async (config) => {
  const connectionInfo = (prevLsat && process.argv.indexOf('-m') > -1) 
    ? await maliciousPurchaseTime(config.publicKey)
    : await purchaseTime(config.publicKey)

  const serverPubKey = connectionInfo.publicKey;

  // Add peer
  if (!config.getPeer(serverPubKey.trim())) {
    const peer = new WgConfig({
      publicKey: serverPubKey
    }).createPeer({
      allowedIps: ['10.0.0.1/32'],
      endpoint: '172.19.0.5:51820'
    });
    config.addPeer(peer);
    await config.save();
  }

  // Update session details
  const timeToExtend = new Date(connectionInfo.expiresAt);
  timeToExtend.setSeconds(timeToExtend.getSeconds() - 5);
  console.log('tte: ', timeToExtend)  

  return new Promise((resolve, reject) => {
    setAlarm(async () => {
      resolve(await extendSession(config, connectionInfo.expiresAt));
    }, timeToExtend)
  });
}

function setAlarm(fn, date){
  return setTimeout(fn, date - Date.now());
}

const createInterface = async () => {
  const wgLightning = new WgConfig({
    wgInterface: {
      address: ['10.0.0.2/24'],
      listenPort: 51820
    },
    filePath
  });
  const { publicKey, privateKey } = await wgLightning.generateKeys({ preSharedKey: false })
  console.log('publickey = ', publicKey);
  console.log('privatekey = ', privateKey);
  await wgLightning.save(); // write file and start interface
  return wgLightning;
}

const endSession = async () => {
  if (process.argv.indexOf('-u') > -1) {
    console.log('Payments stopped. Interface is still up')
    process.exit();
  } else {
    const config = new WgConfig({
      filePath
    })
    await config.down()
    console.log('Interface down.')
    process.exit();
  }
};
process.on("SIGINT", endSession);

const run = async () => {
  await lnd.connect()
  const config = await createInterface()
  await extendSession(config);
}

run().catch(err => console.log(err));
