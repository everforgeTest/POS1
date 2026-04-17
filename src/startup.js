const HotPocket = require('hotpocket-nodejs-contract');
const bson = require('bson');
const Controller = require('./controller');
const { initDB } = require('./Data.Deploy/initDB');
const { loadEnv } = require('./Utils/EnvLoader');
const Tables = require('./Constants/Tables');
const settings = require('./settings.json').settings;
const { SqliteDatabase } = require('./Services/Common.Services/dbHandler');

const posContract = async (ctx) => {
  console.log('POS contract is running.');

  // Load env
  loadEnv('.env');

  // Initialize DB
  try {
    await initDB();
  } catch (e) {
    console.error('DB init error:', e);
  }

  // Log current version
  const db = new SqliteDatabase(settings.dbPath);
  try {
    db.open();
    const row = await db.get(`SELECT Version FROM ${Tables.CONTRACTVERSION} ORDER BY Id DESC LIMIT 1`);
    console.log('Current contract version:', row ? row.Version : 'unknown');
  } catch (e) {
    console.error('Version read error:', e);
  } finally {
    db.close();
  }

  const controller = new Controller();
  const isReadOnly = ctx.readonly;

  for (const user of ctx.users.list()) {
    for (const input of user.inputs) {
      const buf = await ctx.users.read(input);
      let msg = null;
      try {
        msg = JSON.parse(buf);
      } catch (e) {
        try {
          msg = bson.deserialize(buf);
        } catch (e2) {
          await user.send({ error: { code: 400, message: 'Invalid message format.' } });
          continue;
        }
      }
      await controller.handleRequest(user, msg, isReadOnly, ctx.timestamp);
    }
  }
};

const hpc = new HotPocket.Contract();
hpc.init(posContract, HotPocket.clientProtocols.JSON, true);
