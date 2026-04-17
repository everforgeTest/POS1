const fs = require('fs');
const path = require('path');
const sodium = require('libsodium-wrappers');
const HotPocket = require('hotpocket-js-client');
const ContractService = require('./contract-service');

// Usage: node index.js <contractUrl> <zipFilePath> <privateKeyHex> <version> <description>

async function buildKeyPairFromPrivateKeyHex(pvkHex) {
  await sodium.ready;
  const sk = Buffer.from(pvkHex, 'hex');
  if (sk.length === 32) {
    const kp = sodium.crypto_sign_seed_keypair(new Uint8Array(sk));
    return { publicKey: Buffer.from(kp.publicKey), privateKey: Buffer.from(kp.privateKey) };
  } else if (sk.length === 64) {
    const pk = sodium.crypto_sign_ed25519_sk_to_pk(new Uint8Array(sk));
    return { publicKey: Buffer.from(pk), privateKey: Buffer.from(sk) };
  } else {
    throw new Error('Private key must be 32-byte seed or 64-byte ed25519 secret key (hex).');
  }
}

async function main() {
  const contractUrl = process.argv[2];
  const zipPath = process.argv[3];
  const privateKeyHex = process.argv[4];
  const versionStr = process.argv[5];
  const description = process.argv[6] || '';

  if (!contractUrl || !zipPath || !privateKeyHex || !versionStr) {
    console.log('Usage: node index.js <contractUrl> <zipFilePath> <privateKeyHex> <version> <description>');
    process.exit(1);
  }

  const keyPair = await buildKeyPairFromPrivateKeyHex(privateKeyHex);
  const service = new ContractService([contractUrl], keyPair);
  const ok = await service.init();
  if (!ok) process.exit(1);

  const zipBuffer = fs.readFileSync(path.resolve(zipPath));
  const signature = await service.signBuffer(zipBuffer);

  const submitData = {
    service: 'Upgrade',
    Action: 'UpgradeContract',
    data: {
      version: parseFloat(versionStr),
      description: description,
      zipBase64: zipBuffer.toString('base64'),
      zipSignatureHex: signature.toString('hex')
    }
  };

  try {
    const res = await service.submitInput(submitData);
    console.log('Upgrade response:', res);
  } catch (e) {
    console.error('Upgrade failed:', e);
  } finally {
    process.exit(0);
  }
}

main();
