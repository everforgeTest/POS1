const fs = require('fs');
const { SqliteDatabase } = require('./dbHandler');
const Tables = require('../../Constants/Tables');
const settings = require('../../settings.json').settings;

class UpgradeService {
  constructor(message) {
    this.message = message;
    this.dbPath = settings.dbPath;
    this.db = new SqliteDatabase(this.dbPath);
  }

  async upgradeContract(zipBuffer, version, description, ctxTimestamp) {
    const resObj = {};
    try {
      this.db.open();
      const row = await this.db.get(`SELECT Version FROM ${Tables.CONTRACTVERSION} ORDER BY Id DESC LIMIT 1`);
      const current = row ? row.Version : 1.0;
      if (!(version > current)) {
        resObj.error = { code: 403, message: 'Contract version must be greater than current.' };
        return resObj;
      }

      // Write the zip file
      fs.writeFileSync(settings.newContractZipFileName, zipBuffer);

      // Create post_exec.sh
      const script = `#!/bin/bash\
\
! command -v unzip &>/dev/null && apt-get update && apt-get install --no-install-recommends -y unzip\
\
zip_file=\"${settings.newContractZipFileName}\"\
unzip -o -d ./ \"$zip_file\" >>/dev/null\
rm \"$zip_file\" >>/dev/null\
`;
      fs.writeFileSync(settings.postExecutionScriptName, script);
      fs.chmodSync(settings.postExecutionScriptName, 0o777);

      const now = new Date(ctxTimestamp).toISOString();
      await this.db.insert(Tables.CONTRACTVERSION, {
        Version: version,
        Description: description,
        CreatedOn: now,
        LastUpdatedOn: now
      });

      resObj.success = { message: 'Contract upgraded', version: version };
      return resObj;
    } catch (e) {
      resObj.error = { code: 500, message: e.message || 'Failed to upgrade contract.' };
      return resObj;
    } finally {
      this.db.close();
    }
  }
}

module.exports = UpgradeService;
