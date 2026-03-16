const { createRecord, updateRecord, deleteRecord, deleteMultipleRecords, getAllRecords, getRecordById } = require('../database/records');
const { findCustomerByNameOrPhone, createCustomer } = require('../database/customers');
const { findVehicleByPlate, createVehicle } = require('../database/vehicles');
const { lookupPrice } = require('../database/prices');
const { parseInput } = require('../ai/parser');
const { createSale } = require('../database/sales');
const { findProductByName } = require('../database/products');

async function processSmartInput(input) {
  const parseResult = await parseInput(input);
  if (!parseResult.success) return { success: false, error: parseResult.error };
  return { success: true, parsed: parseResult.data, usedAI: parseResult.usedAI };
}

async function createRecordFromParsed(parsedData, overrides = {}) {
  const data = { ...parsedData, ...overrides };

  const createdBy = data.created_by || null;

  let customerId = null;
  if (data.customer_name || data.customer_phone) {
    let customer = findCustomerByNameOrPhone(data.customer_name, data.customer_phone, createdBy);
    if (!customer && (data.customer_name || data.customer_phone)) {
      customer = createCustomer({ name: data.customer_name, phone: data.customer_phone, created_by: createdBy });
    }
    if (customer) customerId = customer.id;
  }

  let vehicleId = null;
  if (data.car_plate) {
    let vehicle = findVehicleByPlate(data.car_plate, createdBy);
    if (!vehicle) {
      vehicle = createVehicle({
        customer_id: customerId,
        brand: data.car_brand,
        model: data.car_model,
        plate: data.car_plate,
        created_by: createdBy,
      });
    }
    if (vehicle) vehicleId = vehicle.id;
  }

  let finalPrice = data.price !== undefined && data.price !== null ? data.price : null;
  let priceSource = 'manual';

  if (finalPrice === null && data.service_type) {
    const priceEntry = lookupPrice(data.car_brand, data.service_type, createdBy);
    if (priceEntry && priceEntry.price) {
      finalPrice = priceEntry.price;
      priceSource = 'base';
    }
  }

  // Handle quantity and unit price
  const quantity = data.quantity || 1;
  let unitPrice = data.unit_price || null;
  let totalPrice = finalPrice;

  // If unit_price is provided but total is not, calculate total
  if (unitPrice !== null && totalPrice === null) {
    totalPrice = unitPrice * quantity;
  }
  // If total is provided but unit_price is not, calculate unit_price
  else if (totalPrice !== null && unitPrice === null) {
    unitPrice = quantity > 0 ? totalPrice / quantity : totalPrice;
  }

  const paymentStatus = data.payment_status || 'gozleyir';
  const paidAmount = data.paid_amount || 0;
  const remainingAmount = totalPrice !== null ? Math.max(0, totalPrice - paidAmount) : 0;

  const record = createRecord({
    date: data.date || new Date().toISOString().split('T')[0],
    time: data.time || new Date().toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }),
    customer_id: customerId,
    customer_name: data.customer_name || null,
    customer_phone: data.customer_phone || null,
    vehicle_id: vehicleId,
    car_brand: data.car_brand || null,
    car_model: data.car_model || null,
    car_plate: data.car_plate || null,
    service_type: data.service_type || null,
    extra_services: data.extra_services || null,
    quantity: quantity,
    unit_price: unitPrice,
    total_price: totalPrice,
    payment_status: paymentStatus,
    paid_amount: paidAmount,
    remaining_amount: remainingAmount,
    notes: data.notes || null,
    raw_input: data.raw_input || null,
    created_by: createdBy,
  });

  return { record, priceSource };
}

async function createSaleFromParsed(parsedData, overrides = {}) {
  const data = { ...parsedData, ...overrides };
  const createdBy = data.created_by || null;

  // 1. Müştəri tap və ya yarat
  let customerId = null;
  if (data.customer_name || data.customer_phone) {
    let customer = findCustomerByNameOrPhone(data.customer_name, data.customer_phone, createdBy);
    if (!customer && (data.customer_name || data.customer_phone)) {
      customer = createCustomer({ name: data.customer_name, phone: data.customer_phone, created_by: createdBy });
    }
    if (customer) customerId = customer.id;
  }

  // 2. Məhsulları tap
  let items = [];
  if (data.items && Array.isArray(data.items)) {
     items = data.items;
  } else if (data.product_name) {
     items.push({
        product_name: data.product_name,
        quantity: data.quantity || 1,
        price: data.price || null
     });
  }

  // Məhsulları bazadan tap və qiymətləndir
  let saleItems = [];
  let totalAmount = 0;

  for (const item of items) {
     const product = findProductByName(item.product_name, createdBy);
     let unitPrice = item.price || (product ? product.sell_price : 0);
     let qty = item.quantity || 1;
     let subtotal = unitPrice * qty;

     saleItems.push({
        product_id: product ? product.id : null,
        product_name: item.product_name,
        qty,
        unit_price: unitPrice,
     });
     totalAmount += subtotal;
  }

  // 3. Satış yarat
  const sale = createSale({
     customer_id: customerId,
     items: saleItems,
     discount: data.discount || 0,
     payment_method: data.payment_method || 'cash',
     payment_status: data.payment_status || ((data.paid_amount || 0) >= totalAmount ? 'odenilib' : 'gozleyir'),
     paid_amount: data.paid_amount || 0,
     notes: data.notes || null,
     created_by: createdBy,
     date: data.date || new Date().toISOString().split('T')[0],
     time: data.time || new Date().toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }),
  });

  return { sale };
}

function updateRecordWithPayment(id, paymentData) {
  const existing = getRecordById(id);
  if (!existing) return null;

  const totalPrice = existing.total_price || 0;
  const paidAmount = paymentData.paid_amount !== undefined ? paymentData.paid_amount : existing.paid_amount;
  const remainingAmount = Math.max(0, totalPrice - paidAmount);

  let paymentStatus = paymentData.payment_status || existing.payment_status;
  if (paidAmount >= totalPrice && totalPrice > 0) paymentStatus = 'odenilib';
  else if (paidAmount > 0 && paidAmount < totalPrice) paymentStatus = 'qismen';
  else if (paidAmount === 0) paymentStatus = 'gozleyir';

  return updateRecord(id, {
    ...paymentData,
    paid_amount: paidAmount,
    remaining_amount: remainingAmount,
    payment_status: paymentStatus,
  });
}

module.exports = {
  processSmartInput,
  createRecordFromParsed,
  createSaleFromParsed,
  updateRecordWithPayment
};
