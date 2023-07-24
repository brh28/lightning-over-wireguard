var express = require('express');
var router = express.Router();
const requestIP = require('request-ip');

const PURCHASE_TIME = 10; // Time added per purchase in seconds

// On start-up, create wireguard server interface
const { WgConfig, generateKeyPair, getConfigObjectFromFile } = require('wireguard-tools');
// const filePath = path.join(__dirname, '/configs', '/wg-lightning.conf')
const filePath = '/usr/src/app/configs/wg-lightning.conf'

function findIPv4Address(str) {
  const ipv4Regex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  const matches = str.match(ipv4Regex);
  return matches[0] || [];
}

function setToHappen(fn, date){
  return setTimeout(fn, date - Date.now());
}

const sessions = [];

const getLocalConfig = async () => {
  const currentConfig = await getConfigObjectFromFile({filePath});
  const localConfig = new WgConfig({
    ...currentConfig,
    filePath
  });
  await localConfig.generateKeys({ overwrite: false }) // add pubkey to config
  return localConfig;
}

const endSession = async (config, peer) => {
  config.removePeer(peer)
  await config.save();
  console.log('Time expired. Peer removed: ', peer);
};

// Resets the session alarm + returns updated session info
const extendSession = (localConfig, peer) => {
  const { expiresAt, cancel } = sessions[peer];
  cancel();
  expiresAt.setSeconds(expiresAt.getSeconds() + PURCHASE_TIME); // Todo: get added time from lsat
  const timer = setToHappen(() => endSession(localConfig, peer), expiresAt);
  sessions[peer] = {
    expiresAt: expiresAt,
    cancel: () => clearTimeout(timer)
  }
  return sessions[peer];
}


// Can only be reached with a valid LSAT
router.get('/wireguard', async (req, res) => {  
      const peerPubKey = req.query.pubkey;
      const localConfig = await getLocalConfig();

      if (localConfig.getPeer(peerPubKey)){
        const { expiresAt } = extendSession(localConfig, peerPubKey);
        console.log('Session extended. Expires at: ', expiresAt);
        res.json({ 
          publicKey: localConfig.publicKey,
          expiresAt: expiresAt 
        }).end();
      } else { // start a new session
        const ipv4 = findIPv4Address(requestIP.getClientIp(req));
        const peer = new WgConfig({
          publicKey: peerPubKey
        }).createPeer({
          allowedIps: ['10.0.0.2/32'], // [ipv4 + '/32']
          endpoint: `${ipv4}:51820`
        });
        localConfig.addPeer(peer);

        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + PURCHASE_TIME); // Todo: get added time from lsat
        res.json({ 
          publicKey: localConfig.publicKey,
          expiresAt: expiresAt 
        });

        await localConfig.save();
        const timer = setToHappen(() => endSession(localConfig, peerPubKey), expiresAt);
        sessions[peerPubKey] = {
          expiresAt: expiresAt,
          cancel: () => clearTimeout(timer)
        }
        console.log('Peer added. Session expires at: ', expiresAt);
      }
  })

module.exports = router;