/**
 * AI Action Executor
 * AI-dan gələn əməliyyat əmrlərini icra edir
 * Müştəri əlavə etmə, məhsul əlavə etmə, satış, xərc və s.
 */

const customersDb = require('../database/customers');
const productsDb = require('../database/products');
const expensesDb = require('../database/expenses');
const tasksDb = require('../database/tasks');
const appointmentsDb = require('../database/appointments');
const recordsDb = require('../database/records');

/**
 * Mövcud action-ların siyahısı (LLM system prompt üçün)
 */
const AVAILABLE_ACTIONS = [
  // ─── ƏLAVƏ ETMƏ ───
  {
    name: 'add_customer',
    description: 'Yeni müştəri əlavə et',
    params: { name: 'string (məcburi)', phone: 'string', notes: 'string' },
  },
  {
    name: 'add_product',
    description: 'Yeni məhsul əlavə et',
    params: { name: 'string (məcburi)', sell_price: 'number', buy_price: 'number', stock_qty: 'number', unit: 'string', barcode: 'string', min_stock: 'number' },
  },
  {
    name: 'add_expense',
    description: 'Yeni xərc əlavə et',
    params: { description: 'string (məcburi)', amount: 'number (məcburi)', category: 'string', date: 'YYYY-MM-DD' },
  },
  {
    name: 'add_task',
    description: 'Yeni tapşırıq əlavə et',
    params: { title: 'string (məcburi)', description: 'string', due_date: 'YYYY-MM-DD', priority: 'low/medium/high' },
  },
  {
    name: 'add_appointment',
    description: 'Yeni randevu/görüş əlavə et',
    params: { title: 'string (məcburi)', customer_id: 'number', date: 'YYYY-MM-DD', time: 'HH:MM', notes: 'string' },
  },
  // ─── SİLMƏ ───
  {
    name: 'delete_customer',
    description: 'Müştəri sil (ID ilə)',
    params: { id: 'number (məcburi)' },
  },
  {
    name: 'delete_product',
    description: 'Məhsul sil (ID ilə)',
    params: { id: 'number (məcburi)' },
  },
  {
    name: 'delete_expense',
    description: 'Xərc sil (ID ilə)',
    params: { id: 'number (məcburi)' },
  },
  {
    name: 'delete_task',
    description: 'Tapşırıq sil (ID ilə)',
    params: { id: 'number (məcburi)' },
  },
  {
    name: 'delete_appointment',
    description: 'Randevu sil (ID ilə)',
    params: { id: 'number (məcburi)' },
  },
  // ─── SİYAHI / SORĞU ───
  {
    name: 'list_customers',
    description: 'Müştəri siyahısını göstər (axtarış ilə filtirləmək olar)',
    params: { search: 'string (optional)', limit: 'number (default 20)' },
  },
  {
    name: 'list_products',
    description: 'Məhsul siyahısını göstər (axtarış ilə filtirləmək olar)',
    params: { search: 'string (optional)', limit: 'number (default 20)' },
  },
  {
    name: 'list_expenses',
    description: 'Xərc siyahısını göstər',
    params: { search: 'string (optional)', category: 'string (optional)', limit: 'number (default 20)' },
  },
  {
    name: 'list_tasks',
    description: 'Tapşırıq siyahısını göstər',
    params: { search: 'string (optional)', status: 'pending/in_progress/done (optional)', limit: 'number (default 20)' },
  },
  {
    name: 'list_appointments',
    description: 'Randevu siyahısını göstər',
    params: { search: 'string (optional)', date: 'YYYY-MM-DD (optional)', limit: 'number (default 20)' },
  },
  {
    name: 'search_customer',
    description: 'Müştəri axtar',
    params: { query: 'string' },
  },
  {
    name: 'search_product',
    description: 'Məhsul axtar',
    params: { query: 'string' },
  },
  // ─── NAVİQASİYA ───
  {
    name: 'navigate',
    description: 'Proqramda səhifəyə keç',
    params: { page: 'string (customers, products, pos, expenses, tasks, appointments, analytics, records, debts, settings, dashboard, ai-assistant)' },
  },
];

/**
 * Action-u icra et
 * @param {string} actionName
 * @param {object} params
 * @param {number} userId
 * @returns {{ success: boolean, message: string, data?: any, navigate?: string }}
 */
function executeAction(actionName, params, userId) {
  try {
    switch (actionName) {
      case 'add_customer': {
        if (!params.name) return { success: false, message: 'Müştəri adı məcburidir' };
        const customer = customersDb.createCustomer({
          name: params.name,
          phone: params.phone || null,
          notes: params.notes || null,
          created_by: userId,
        });
        return { success: true, message: `Müştəri "${params.name}" uğurla əlavə edildi (ID: ${customer.id})`, data: customer, navigate: '/customers' };
      }

      case 'add_product': {
        if (!params.name) return { success: false, message: 'Məhsul adı məcburidir' };
        const product = productsDb.createProduct({
          name: params.name,
          sell_price: Number(params.sell_price || params.price) || 0,
          buy_price: Number(params.buy_price || params.cost_price) || 0,
          stock_qty: Number(params.stock_qty) || 0,
          unit: params.unit || 'ədəd',
          barcode: params.barcode || null,
          min_stock: Number(params.min_stock) || 5,
          created_by: userId,
        });
        return { success: true, message: `Məhsul "${params.name}" uğurla əlavə edildi (ID: ${product.id})`, data: product, navigate: '/products' };
      }

      case 'add_expense': {
        if (!params.description || !params.amount) return { success: false, message: 'Xərcin təsviri və məbləği məcburidir' };
        const expense = expensesDb.createExpense({
          description: params.description,
          amount: Number(params.amount),
          category: params.category || 'Digər',
          date: params.date || new Date().toISOString().split('T')[0],
          user_id: userId,
          payment_method: params.payment_method || 'cash',
        });
        return { success: true, message: `Xərc "${params.description}" (${params.amount} AZN) uğurla əlavə edildi`, data: expense, navigate: '/expenses' };
      }

      case 'add_task': {
        if (!params.title) return { success: false, message: 'Tapşırıq adı məcburidir' };
        const task = tasksDb.createTask({
          title: params.title,
          description: params.description || '',
          due_date: params.due_date || null,
          priority: params.priority || 'medium',
          status: 'pending',
          created_by: userId,
        });
        return { success: true, message: `Tapşırıq "${params.title}" uğurla əlavə edildi`, data: task, navigate: '/tasks' };
      }

      case 'add_appointment': {
        if (!params.title) return { success: false, message: 'Randevu adı məcburidir' };
        const appt = appointmentsDb.createAppointment({
          title: params.title,
          customer_id: params.customer_id || null,
          customer_name: params.customer_name || null,
          phone: params.phone || null,
          date: params.date || new Date().toISOString().split('T')[0],
          time: params.time || '10:00',
          duration: params.duration || 60,
          notes: params.notes || null,
          status: 'pending',
          created_by: userId,
        });
        return { success: true, message: `Randevu "${params.title}" uğurla əlavə edildi`, data: appt, navigate: '/appointments' };
      }

      // ─── SİLMƏ ───
      case 'delete_customer': {
        if (!params.id) return { success: false, message: 'Müştəri ID-si məcburidir' };
        const cust = customersDb.getCustomerById(Number(params.id));
        if (!cust) return { success: false, message: `ID ${params.id} ilə müştəri tapılmadı` };
        const deleted = customersDb.deleteCustomer(Number(params.id));
        if (!deleted) return { success: false, message: 'Müştəri silinə bilmədi' };
        return { success: true, message: `Müştəri "${cust.name}" (ID: ${params.id}) uğurla silindi`, navigate: '/customers' };
      }

      case 'delete_product': {
        if (!params.id) return { success: false, message: 'Məhsul ID-si məcburidir' };
        const prod = productsDb.getProductById(Number(params.id));
        if (!prod) return { success: false, message: `ID ${params.id} ilə məhsul tapılmadı` };
        productsDb.deleteProduct(Number(params.id), userId);
        return { success: true, message: `Məhsul "${prod.name}" (ID: ${params.id}) uğurla silindi`, navigate: '/products' };
      }

      case 'delete_expense': {
        if (!params.id) return { success: false, message: 'Xərc ID-si məcburidir' };
        const exp = expensesDb.getExpenseById(Number(params.id));
        if (!exp) return { success: false, message: `ID ${params.id} ilə xərc tapılmadı` };
        expensesDb.deleteExpense(Number(params.id), userId);
        return { success: true, message: `Xərc "${exp.description}" (${exp.amount} AZN) uğurla silindi`, navigate: '/expenses' };
      }

      case 'delete_task': {
        if (!params.id) return { success: false, message: 'Tapşırıq ID-si məcburidir' };
        const task = tasksDb.getTaskById(Number(params.id));
        if (!task) return { success: false, message: `ID ${params.id} ilə tapşırıq tapılmadı` };
        tasksDb.deleteTask(Number(params.id));
        return { success: true, message: `Tapşırıq "${task.title}" (ID: ${params.id}) uğurla silindi`, navigate: '/tasks' };
      }

      case 'delete_appointment': {
        if (!params.id) return { success: false, message: 'Randevu ID-si məcburidir' };
        const appt = appointmentsDb.getAppointmentById(Number(params.id));
        if (!appt) return { success: false, message: `ID ${params.id} ilə randevu tapılmadı` };
        appointmentsDb.deleteAppointment(Number(params.id));
        return { success: true, message: `Randevu "${appt.title}" (ID: ${params.id}) uğurla silindi`, navigate: '/appointments' };
      }

      // ─── SİYAHI / SORĞU ───
      case 'list_customers': {
        const customers = customersDb.getAllCustomers(params.search || '', userId);
        const lim = Number(params.limit) || 20;
        if (!customers || customers.length === 0) return { success: true, message: 'Heç bir müştəri tapılmadı', data: [] };
        const items = customers.slice(0, lim);
        const list = items.map(c => `- **${c.name}** (ID: ${c.id})${c.phone ? ' | Tel: ' + c.phone : ''}${c.notes ? ' | Qeyd: ' + c.notes : ''}`).join('\n');
        return { success: true, message: `${customers.length} müştəri tapıldı (ilk ${items.length}):\n${list}`, data: items };
      }

      case 'list_products': {
        const products = productsDb.getAllProducts({ search: params.search || '', userId });
        const lim = Number(params.limit) || 20;
        if (!products || products.length === 0) return { success: true, message: 'Heç bir məhsul tapılmadı', data: [] };
        const items = products.slice(0, lim);
        const list = items.map(p => `- **${p.name}** (ID: ${p.id}) | Satış: ${p.sell_price || p.price || 0} AZN | Alış: ${p.buy_price || 0} AZN | Stok: ${p.stock_qty || 0}`).join('\n');
        return { success: true, message: `${products.length} məhsul tapıldı (ilk ${items.length}):\n${list}`, data: items };
      }

      case 'list_expenses': {
        const filters = { limit: Number(params.limit) || 20, offset: 0 };
        if (params.search) filters.search = params.search;
        if (params.category) filters.category = params.category;
        if (userId) filters.userId = userId;
        const expenses = expensesDb.getAllExpenses(filters);
        if (!expenses || expenses.length === 0) return { success: true, message: 'Heç bir xərc tapılmadı', data: [] };
        const list = expenses.map(e => `- **${e.description}** (ID: ${e.id}) | ${e.amount} AZN | ${e.category || 'Digər'} | ${e.date}`).join('\n');
        return { success: true, message: `${expenses.length} xərc tapıldı:\n${list}`, data: expenses };
      }

      case 'list_tasks': {
        const filters = {};
        if (params.search) filters.search = params.search;
        if (params.status) filters.status = params.status;
        if (userId) filters.createdBy = userId;
        const tasks = tasksDb.getAllTasks(filters);
        const lim = Number(params.limit) || 20;
        if (!tasks || tasks.length === 0) return { success: true, message: 'Heç bir tapşırıq tapılmadı', data: [] };
        const items = tasks.slice(0, lim);
        const statusMap = { pending: '⏳', in_progress: '🔄', done: '✅' };
        const list = items.map(t => `- ${statusMap[t.status] || '⏳'} **${t.title}** (ID: ${t.id}) | ${t.priority} | ${t.due_date || 'Son tarix yoxdur'}`).join('\n');
        return { success: true, message: `${tasks.length} tapşırıq tapıldı (ilk ${items.length}):\n${list}`, data: items };
      }

      case 'list_appointments': {
        const filters = {};
        if (params.search) filters.search = params.search;
        if (params.date) filters.date = params.date;
        if (userId) filters.createdBy = userId;
        const appts = appointmentsDb.getAllAppointments(filters);
        const lim = Number(params.limit) || 20;
        if (!appts || appts.length === 0) return { success: true, message: 'Heç bir randevu tapılmadı', data: [] };
        const items = appts.slice(0, lim);
        const list = items.map(a => `- **${a.title}** (ID: ${a.id}) | ${a.date} ${a.time || ''} | ${a.customer_name || ''} | ${a.status}`).join('\n');
        return { success: true, message: `${appts.length} randevu tapıldı (ilk ${items.length}):\n${list}`, data: items };
      }

      case 'search_customer': {
        const customers = customersDb.getAllCustomers(params.query || '', userId);
        if (!customers || customers.length === 0) return { success: true, message: 'Müştəri tapılmadı', data: [] };
        const list = customers.slice(0, 10).map(c => `- **${c.name}** (ID: ${c.id})${c.phone ? ' | Tel: ' + c.phone : ''}`).join('\n');
        return { success: true, message: `${customers.length} müştəri tapıldı:\n${list}`, data: customers.slice(0, 10) };
      }

      case 'search_product': {
        const products = productsDb.getAllProducts({ search: params.query || '', userId });
        if (!products || products.length === 0) return { success: true, message: 'Məhsul tapılmadı', data: [] };
        const list = products.slice(0, 10).map(p => `- **${p.name}** (ID: ${p.id}) | ${p.sell_price || p.price || 0} AZN | Stok: ${p.stock_qty}`).join('\n');
        return { success: true, message: `${products.length} məhsul tapıldı:\n${list}`, data: products.slice(0, 10) };
      }

      case 'navigate': {
        const pageMap = {
          'customers': '/customers', 'products': '/products', 'pos': '/pos', 'expenses': '/expenses',
          'tasks': '/tasks', 'appointments': '/appointments', 'analytics': '/analytics', 'records': '/records',
          'debts': '/debts', 'settings': '/settings', 'dashboard': '/', 'ai-assistant': '/ai-assistant',
        };
        const route = pageMap[params.page] || null;
        if (!route) return { success: false, message: `"${params.page}" səhifəsi tapılmadı` };
        return { success: true, message: `${params.page} səhifəsinə keçilir...`, navigate: route };
      }

      default:
        return { success: false, message: `Naməlum əməliyyat: ${actionName}` };
    }
  } catch (e) {
    return { success: false, message: `Əməliyyat xətası: ${e.message}` };
  }
}

/**
 * LLM system prompt-a əlavə ediləcək action təsviri
 */
function getActionsPrompt() {
  let text = '\n\nMÖVCUD ƏMƏLİYYATLAR (action-lar):\n';
  text += 'İstifadəçi bir əməliyyat istədikdə, cavabında JSON bloku daxil et:\n';
  text += '```action\n{"action": "action_name", "params": {...}}\n```\n\n';
  text += 'Action siyahısı:\n';
  for (const a of AVAILABLE_ACTIONS) {
    text += `- ${a.name}: ${a.description}\n`;
    text += `  Parametrlər: ${JSON.stringify(a.params)}\n`;
  }
  text += '\nVACİB QAYDALAR:\n';
  text += '1. Action JSON-u yalnız istifadəçi açıq şəkildə bir əməliyyat istədikdə göndər.\n';
  text += '2. Normal söhbətdə action göndərmə, sadəcə cavab ver.\n';
  text += '3. SİLMƏ: İstifadəçi "sil" desə, əvvəlcə list action ilə siyahını göstər ki ID-ni bilsin. Sonra delete action ilə sil.\n';
  text += '4. Əgər istifadəçi ad ilə silmək istəyirsə, əvvəlcə search/list ilə tapıb ID-ni göstər, sonra sil.\n';
  text += '5. SİYAHI: İstifadəçi "göstər", "siyahı", "nə var", "hansılar" kimi sözlər istifadə edərsə, list action istifadə et.\n';
  text += '\nNÜMUNƏLƏR:\n';
  text += '"Elvin adlı müştəri əlavə et" → ```action\n{"action": "add_customer", "params": {"name": "Elvin"}}\n```\n';
  text += '"Müştəriləri göstər" → ```action\n{"action": "list_customers", "params": {}}\n```\n';
  text += '"ID 5 müştərini sil" → ```action\n{"action": "delete_customer", "params": {"id": 5}}\n```\n';
  text += '"Xərcləri göstər" → ```action\n{"action": "list_expenses", "params": {}}\n```\n';
  text += '"Tapşırıqları göstər" → ```action\n{"action": "list_tasks", "params": {}}\n```\n';
  text += '"Məhsulları göstər" → ```action\n{"action": "list_products", "params": {}}\n```\n';
  return text;
}

module.exports = { executeAction, getActionsPrompt, AVAILABLE_ACTIONS };
