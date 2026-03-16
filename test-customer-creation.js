
const { app } = require('electron');
const path = require('path');

// App hazır olanda işə düşsün
app.whenReady().then(async () => {
  try {
    console.log('Test başlayır...');
    const { createCustomer, findCustomerByNameOrPhone, getAllCustomers } = require('./src/database/customers');
    
    // 1. Yeni müştəri yaratmağa cəhd edək
    const testName = 'Avtomatik Test Müştəri ' + Date.now();
    console.log(`Müştəri yaradılır: "${testName}"`);
    
    const created = createCustomer({
      name: testName,
      phone: '0500000000',
      notes: 'Test qeydi',
      created_by: 1
    });
    
    console.log('Yaradıldı nəticəsi:', created);

    if (!created) {
      console.error('XƏTA: createCustomer null qaytardı!');
    } else {
      console.log('Müştəri ID:', created.id);
    }

    // 2. Axtarış yoxlayaq
    const found = findCustomerByNameOrPhone(testName, null, 1);
    console.log('Axtarış nəticəsi (adla):', found ? 'Tapıldı' : 'Tapılmadı');

    // 3. Hamısını siyahıya alaq
    const all = getAllCustomers(testName, 1);
    console.log('Siyahıda varmı:', all.length > 0 ? 'Bəli' : 'Xeyr');

  } catch (err) {
    console.error('Test zamanı xəta:', err);
  } finally {
    console.log('Test bitdi.');
    app.quit();
  }
});
