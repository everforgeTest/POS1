const ServiceTypes = require('./Constants/ServiceTypes');
const POSController = require('./Controllers/POS.Controller');
const UpgradeController = require('./Controllers/Upgrade.Controller');

class Controller {
  async handleRequest(user, message, isReadOnly, ctxTimestamp) {
    let result = {};
    try {
      const svc = message.Service || message.service;
      if (svc === ServiceTypes.POS) {
        const pos = new POSController(message);
        result = await pos.handleRequest();
      } else if (svc === ServiceTypes.UPGRADE) {
        const userPubKeyHex = user.pubKey || user.publicKey || user.pubkey;
        const up = new UpgradeController(message, ctxTimestamp);
        result = await up.handleRequest(userPubKeyHex);
      } else {
        result = { error: { code: 400, message: 'Invalid service.' } };
      }
    } catch (e) {
      result = { error: { code: 500, message: e.message || 'Server error.' } };
    }

    await user.send(result);
  }
}

module.exports = Controller;
