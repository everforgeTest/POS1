const HotPocket = require('hotpocket-js-client');
const { assertSuccessResponse } = require('../test-utils');
//wdsfdsf
async function runPOSTests() {
  console.log('Running POS tests...');
  const kp = await HotPocket.generateKeys();
  const client = await HotPocket.createClient(['wss://localhost:8081'], kp);
  if (!await client.connect()) throw new Error('Connection failed');

  // Add product
  await client.submitContractInput(Buffer.from(JSON.stringify({ Service: 'POS', Action: 'AddProduct', data: { name: 'Coffee', price: 3.5, sku: 'COF-001' } })));
  // Read list
  let list = await client.submitContractReadRequest(Buffer.from(JSON.stringify({ Service: 'POS', Action: 'ListProducts' })));
  try { list = JSON.parse(list.toString()); } catch (e) {}
  assertSuccessResponse(list, 'ListProducts');
  const products = list.success || [];
  const coffee = products.find(p => p.name === 'Coffee');
  if (!coffee) throw new Error('Coffee product not found after AddProduct');

  // Create order
  await client.submitContractInput(Buffer.from(JSON.stringify({ Service: 'POS', Action: 'CreateOrder' })));
  let ordersRes = await client.submitContractReadRequest(Buffer.from(JSON.stringify({ Service: 'POS', Action: 'CreateOrder' })));
  // Above call actually creates another order; Instead, let's just create one and immediately add item using a separate create flow.
  let createRes = await client.submitContractReadRequest(Buffer.from(JSON.stringify({ Service: 'POS', Action: 'CreateOrder' })));
  try { createRes = JSON.parse(createRes.toString()); } catch(e) {}
  assertSuccessResponse(createRes, 'CreateOrder read path');
  const orderId = createRes.success.orderId;

  // Add item
  await client.submitContractInput(Buffer.from(JSON.stringify({ Service: 'POS', Action: 'AddItem', data: { orderId: orderId, productId: coffee.id, quantity: 2 } })));

  // Checkout
  await client.submitContractInput(Buffer.from(JSON.stringify({ Service: 'POS', Action: 'Checkout', data: { orderId: orderId } })));
  let order = await client.submitContractReadRequest(Buffer.from(JSON.stringify({ Service: 'POS', Action: 'GetOrder', data: { orderId: orderId } })));
  try { order = JSON.parse(order.toString()); } catch(e) {}
  assertSuccessResponse(order, 'GetOrder');
  console.log('POS tests passed.');
}

module.exports = { runPOSTests };
