const sqlite3 = require('sqlite3').verbose();

class SqliteDatabase {
  constructor(dbFile) {
    this.dbFile = dbFile;
    this.db = null;
    this.openConnections = 0;
  }

  open() {
    if (this.openConnections <= 0) {
      this.db = new sqlite3.Database(this.dbFile);
      this.openConnections = 1;
    } else this.openConnections++;
  }

  close() {
    if (this.openConnections <= 1) {
      if (this.db) this.db.close();
      this.db = null;
      this.openConnections = 0;
    } else this.openConnections--;
  }

  run(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function (err) {
        if (err) return reject(err);
        resolve({ lastId: this.lastID, changes: this.changes });
      });
    });
  }

  get(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  all(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }

  async insert(table, obj) {
    const keys = Object.keys(obj);
    const placeholders = keys.map(() => '?').join(',');
    const values = keys.map(k => obj[k]);
    const sql = `INSERT INTO ${table}(${keys.join(',')}) VALUES(${placeholders})`;
    return this.run(sql, values);
  }

  async update(table, obj, filter) {
    const setKeys = Object.keys(obj);
    const setSql = setKeys.map(k => `${k} = ?`).join(', ');
    const setValues = setKeys.map(k => obj[k]);

    const filterKeys = Object.keys(filter || {});
    const filterSql = filterKeys.length ? (' WHERE ' + filterKeys.map(k => `${k} = ?`).join(' AND ')) : '';
    const filterValues = filterKeys.map(k => filter[k]);

    const sql = `UPDATE ${table} SET ${setSql}${filterSql}`;
    return this.run(sql, [...setValues, ...filterValues]);
  }

  async delete(table, filter) {
    const fkeys = Object.keys(filter || {});
    const fsql = fkeys.length ? (' WHERE ' + fkeys.map(k => `${k} = ?`).join(' AND ')) : '';
    const fvals = fkeys.map(k => filter[k]);
    const sql = `DELETE FROM ${table}${fsql}`;
    return this.run(sql, fvals);
  }
}

module.exports = { SqliteDatabase };
