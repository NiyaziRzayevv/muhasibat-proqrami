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

      case 'search_customer': {
        const customers = customersDb.getAllCustomers(params.query || '', userId);
        if (!customers || customers.length === 0) return { success: true, message: 'Müştəri tapılmadı', data: [] };
        const list = customers.slice(0, 10).map(c => `- ${c.name}${c.phone ? ' (' + c.phone + ')' : ''}`).join('\n');
        return { success: true, message: `${customers.length} müştəri tapıldı:\n${list}`, data: customers.slice(0, 10) };
      }

      case 'search_product': {
        const products = productsDb.getAllProducts({ search: params.query || '', userId });
        if (!products || products.length === 0) return { success: true, message: 'Məhsul tapılmadı', data: [] };
        const list = products.slice(0, 10).map(p => `- ${p.name} | ${p.price} AZN | Stok: ${p.stock_qty}`).join('\n');
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
  text += '\nVACİB: Action JSON-u yalnız istifadəçi açıq şəkildə bir əməliyyat istədikdə göndər.\n';
  text += 'Məsələn: "Elvin adlı müştəri əlavə et" → ```action\n{"action": "add_customer", "params": {"name": "Elvin"}}\n```\n';
  text += 'Normal söhbətdə action göndərmə, sadəcə cavab ver.\n';
  return text;
}

module.exports = { executeAction, getActionsPrompt, AVAILABLE_ACTIONS };
