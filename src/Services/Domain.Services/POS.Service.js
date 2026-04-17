const Tables = require('../../Constants/Tables');
const { SqliteDatabase } = require('../Common.Services/dbHandler');
const settings = require('../../settings.json').settings;

class POSService {
  constructor(message) {
    this.message = message;
    this.dbPath = settings.dbPath;
    this.db = new SqliteDatabase(this.dbPath);
  }

  async addProduct() {
    const res = {};
    const d = this.message.data || {};
    if (!d.name || typeof d.price !== 'number') {
      res.error = { code: 400, message: 'Invalid product data.' };
      return res;
    }
    try {
      this.db.open();
      const now = new Date().toISOString();
      const r = await this.db.insert(Tables.PRODUCT, {
        Name: d.name,
        Price: d.price,
        Sku: d.sku || null,
        CreatedOn: now,
        LastUpdatedOn: now
      });
      res.success = { productId: r.lastId };
      return res;
    } catch (e) {
      res.error = { code: 500, message: e.message };
      return res;
    } finally {
      this.db.close();
    }
  }

  async listProducts() {
    const res = {};
    try {
      this.db.open();
      const rows = await this.db.all(`SELECT Id, Name, Price, Sku, CreatedOn, LastUpdatedOn FROM ${Tables.PRODUCT}`);
      res.success = rows.map(r => ({ id: r.Id, name: r.Name, price: r.Price, sku: r.Sku, createdOn: r.CreatedOn, lastUpdatedOn: r.LastUpdatedOn }));
      return res;
    } catch (e) {
      res.error = { code: 500, message: e.message };
      return res;
    } finally {
      this.db.close();
    }
  }

  async createOrder() {
    const res = {};
    try {
      this.db.open();
      const now = new Date().toISOString();
      const r = await this.db.insert(Tables.ORDER, {
        Status: 'OPEN',
        Total: 0,
        CreatedOn: now,
        LastUpdatedOn: now
      });
      res.success = { orderId: r.lastId };
      return res;
    } catch (e) {
      res.error = { code: 500, message: e.message };
      return res;
    } finally {
      this.db.close();
    }
  }

  async addItem() {
    const res = {};
    const d = this.message.data || {};
    if (!d.orderId || !d.productId || !d.quantity) {
      res.error = { code: 400, message: 'orderId, productId, quantity are required.' };
      return res;
    }
    try {
      this.db.open();
      // Validate order exists and is OPEN
      const order = await this.db.get(`SELECT Id, Status FROM ${Tables.ORDER} WHERE Id = ?`, [d.orderId]);
      if (!order) {
        res.error = { code: 404, message: 'Order not found.' };
        return res;
      }
      if (order.Status !== 'OPEN') {
        res.error = { code: 403, message: 'Order is not open.' };
        return res;
      }

      // Validate product
      const prod = await this.db.get(`SELECT Id, Price FROM ${Tables.PRODUCT} WHERE Id = ?`, [d.productId]);
      if (!prod) {
        res.error = { code: 404, message: 'Product not found.' };
        return res;
      }

      const now = new Date().toISOString();
      await this.db.insert(Tables.ORDERITEM, {
        OrderId: d.orderId,
        ProductId: d.productId,
        Quantity: d.quantity,
        UnitPrice: prod.Price,
        CreatedOn: now,
        LastUpdatedOn: now
      });

      res.success = { message: 'Item added' };
      return res;
    } catch (e) {
      res.error = { code: 500, message: e.message };
      return res;
    } finally {
      this.db.close();
    }
  }

  async checkout() {
    const res = {};
    const d = this.message.data || {};
    if (!d.orderId) {
      res.error = { code: 400, message: 'orderId is required.' };
      return res;
    }
    try {
      this.db.open();
      const order = await this.db.get(`SELECT Id, Status FROM ${Tables.ORDER} WHERE Id = ?`, [d.orderId]);
      if (!order) {
        res.error = { code: 404, message: 'Order not found.' };
        return res;
      }
      if (order.Status !== 'OPEN') {
        res.error = { code: 403, message: 'Order is not open.' };
        return res;
      }

      const items = await this.db.all(`SELECT Quantity, UnitPrice FROM ${Tables.ORDERITEM} WHERE OrderId = ?`, [d.orderId]);
      const total = items.reduce((acc, it) => acc + (it.Quantity * it.UnitPrice), 0);
      const now = new Date().toISOString();
      await this.db.update(Tables.ORDER, { Status: 'PAID', Total: total, LastUpdatedOn: now }, { Id: d.orderId });

      res.success = { orderId: d.orderId, total: total };
      return res;
    } catch (e) {
      res.error = { code: 500, message: e.message };
      return res;
    } finally {
      this.db.close();
    }
  }

  async getOrder() {
    const res = {};
    const d = this.message.data || {};
    if (!d.orderId) {
      res.error = { code: 400, message: 'orderId is required.' };
      return res;
    }
    try {
      this.db.open();
      const order = await this.db.get(`SELECT Id, Status, Total, CreatedOn, LastUpdatedOn FROM ${Tables.ORDER} WHERE Id = ?`, [d.orderId]);
      if (!order) {
        res.error = { code: 404, message: 'Order not found.' };
        return res;
      }
      const items = await this.db.all(`SELECT Id, ProductId, Quantity, UnitPrice, CreatedOn, LastUpdatedOn FROM ${Tables.ORDERITEM} WHERE OrderId = ?`, [d.orderId]);
      res.success = {
        id: order.Id,
        status: order.Status,
        total: order.Total,
        items: items.map(i => ({ id: i.Id, productId: i.ProductId, quantity: i.Quantity, unitPrice: i.UnitPrice, createdOn: i.CreatedOn, lastUpdatedOn: i.LastUpdatedOn })),
        createdOn: order.CreatedOn,
        lastUpdatedOn: order.LastUpdatedOn
      };
      return res;
    } catch (e) {
      res.error = { code: 500, message: e.message };
      return res;
    } finally {
      this.db.close();
    }
  }
}

module.exports = POSService;
