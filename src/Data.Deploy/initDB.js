const fs = require('fs');
const path = require('path');
const { SqliteDatabase } = require('../Services/Common.Services/dbHandler');
const Tables = require('../Constants/Tables');
const settings = require('../settings.json').settings;

async function initDB() {
  const dbPath = settings.dbPath;
  const db = new SqliteDatabase(dbPath);
  const exists = fs.existsSync(dbPath);

  db.open();
  try {
    // Ensure core tables
    await db.run(`CREATE TABLE IF NOT EXISTS ${Tables.CONTRACTVERSION} (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      Version FLOAT NOT NULL,
      Description TEXT,
      CreatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
      LastUpdatedOn DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS ${Tables.PRODUCT} (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT NOT NULL,
      Price REAL NOT NULL,
      Sku TEXT,
      CreatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
      LastUpdatedOn DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS ${Tables.ORDER} (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      Status TEXT NOT NULL,
      Total REAL DEFAULT 0,
      CreatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
      LastUpdatedOn DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS ${Tables.ORDERITEM} (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      OrderId INTEGER NOT NULL,
      ProductId INTEGER NOT NULL,
      Quantity INTEGER NOT NULL,
      UnitPrice REAL NOT NULL,
      CreatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
      LastUpdatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(OrderId) REFERENCES ${Tables.ORDER}(Id),
      FOREIGN KEY(ProductId) REFERENCES ${Tables.PRODUCT}(Id)
    )`);

    // Initialize version row if empty
    const row = await db.get(`SELECT Id FROM ${Tables.CONTRACTVERSION} LIMIT 1`);
    if (!row) {
      const now = new Date().toISOString();
      await db.insert(Tables.CONTRACTVERSION, { Version: 1.0, Description: 'Initial version', CreatedOn: now, LastUpdatedOn: now });
    }

    // Migrations runner (optional): Execute script files in Scripts/ if needed
    const scriptsPath = path.join(__dirname, 'Scripts');
    if (fs.existsSync(scriptsPath)) {
      const files = fs.readdirSync(scriptsPath).filter(f => f.endsWith('.sql')).sort();
      for (const f of files) {
        const sql = fs.readFileSync(path.join(scriptsPath, f), 'utf8');
        const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
        for (const stmt of statements) {
          await db.run(stmt);
        }
      }
    }
  } finally {
    db.close();
  }
}

module.exports = { initDB };
