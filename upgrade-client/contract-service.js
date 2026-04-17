const HotPocket = require('hotpocket-js-client');
const bson = require('bson');
const sodium = require('libsodium-wrappers');

class ContractService {
  constructor(servers, keyPair) {
    this.servers = servers;
    this.userKeyPair = keyPair; // { publicKey: Uint8Array|Buffer, privateKey: Uint8Array|Buffer }
    this.client = null;
    this.promiseMap = new Map();
    this.connected = false;
  }

  async init() {
    if (!this.userKeyPair) {
      this.userKeyPair = await HotPocket.generateKeys();
    }

    this.client = await HotPocket.createClient(this.servers, this.userKeyPair, { protocol: HotPocket.protocols.bson });

    this.client.on(HotPocket.events.disconnect, () => {
      console.log('Disconnected');
      this.connected = false;
    });

    this.client.on(HotPocket.events.contractOutput, (r) => {
      r.outputs.forEach((o) => {
        let output;
        try { output = bson.deserialize(o); } catch (e) { try { output = JSON.parse(o.toString()); } catch(e2) { output = {}; } }
        const pId = output.promiseId;
        if (output.error) this.promiseMap.get(pId)?.rejecter(output.error);
        else this.promiseMap.get(pId)?.resolver(output.success || output);
        this.promiseMap.delete(pId);
      });
    });

    if (!this.connected) {
      const ok = await this.client.connect();
      if (!ok) {
        console.log('Connection failed.');
        return false;
      }
      this.connected = true;
      console.log('HotPocket Connected.');
    }
    return true;
  }

  async signBuffer(buf) {
    await sodium.ready;
    const sk = Buffer.from(this.userKeyPair.privateKey);
    const sig = sodium.crypto_sign_detached(new Uint8Array(buf), new Uint8Array(sk));
    return Buffer.from(sig);
  }

  submitInput(inp) {
    let resolver, rejecter;
    const promiseId = Math.random().toString(16).slice(2);
    const payload = bson.serialize({ promiseId, ...inp });

    this.client.submitContractInput(payload).then((input) => {
      input?.submissionStatus.then((s) => {
        if (s.status !== 'accepted') {
          console.log(`Ledger_Rejection: ${s.reason}`);
        }
      });
    });

    return new Promise((resolve, reject) => {
      resolver = resolve; rejecter = reject;
      this.promiseMap.set(promiseId, { resolver, rejecter });
    });
  }
}

module.exports = ContractService;
