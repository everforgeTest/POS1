const POSService = require('../Services/Domain.Services/POS.Service');

class POSController {
  constructor(message) {
    this.message = message;
    this.service = new POSService(message);
  }

  async handleRequest() {
    const action = this.message.Action;
    switch (action) {
      case 'AddProduct':
        return await this.service.addProduct();
      case 'ListProducts':
        return await this.service.listProducts();
      case 'CreateOrder':
        return await this.service.createOrder();
      case 'AddItem':
        return await this.service.addItem();
      case 'Checkout':
        return await this.service.checkout();
      case 'GetOrder':
        return await this.service.getOrder();
      default:
        return { error: { code: 400, message: 'Invalid action.' } };
    }
  }
}

module.exports = POSController;
