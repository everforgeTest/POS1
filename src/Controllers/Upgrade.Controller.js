const UpgradeService = require('../Services/Common.Services/Upgrade.Service');
const nacl = require('tweetnacl');

function isMaintainer(userPubKeyHex) {
  if (!userPubKeyHex) return false;
  const expected = (process.env.MAINTAINER_PUBKEY || '').toLowerCase();
  if (!expected || expected.length === 0) return false;
  return userPubKeyHex.toLowerCase() === expected;
}

class UpgradeController {
  constructor(message, ctxTimestamp) {
    this.message = message;
    this.service = new UpgradeService(message);
    this.ctxTimestamp = ctxTimestamp;
  }

  async handleRequest(userPubKeyHex) {
    try {
      if (this.message.Action !== 'UpgradeContract') {
        return { error: { code: 400, message: 'Invalid action.' } };
      }

      if (!isMaintainer(userPubKeyHex)) {
        return { error: { code: 401, message: 'Unauthorized' } };
      }

      const data = this.message.data || {};
      const { version, description, zipBase64, zipSignatureHex } = data;
      if (!version || !zipBase64 || !zipSignatureHex) {
        return { error: { code: 400, message: 'Missing version, zipBase64 or zipSignatureHex.' } };
      }

      // Verify signature (Ed25519 detached)
      const zipBuffer = Buffer.from(zipBase64, 'base64');
      const sig = Buffer.from(zipSignatureHex, 'hex');
      const pub = Buffer.from(userPubKeyHex, 'hex');
      const ok = nacl.sign.detached.verify(new Uint8Array(zipBuffer), new Uint8Array(sig), new Uint8Array(pub));
      if (!ok) {
        return { error: { code: 401, message: 'Signature verification failed.' } };
      }

      return await this.service.upgradeContract(zipBuffer, parseFloat(version), description || '', this.ctxTimestamp);
    } catch (e) {
      return { error: { code: 500, message: e.message || 'Upgrade failed.' } };
    }
  }
}

module.exports = UpgradeController;
