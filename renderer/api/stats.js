import { apiRequest } from './http';

export async function apiGetTodayStats(token, userId = null) {
  const params = userId ? `?userId=${userId}` : '';
  return apiRequest(`/stats/today${params}`, { token });
}

export async function apiGetMonthStats(token, year, month, userId = null) {
  const params = userId ? `?userId=${userId}` : '';
  return apiRequest(`/stats/month/${year}/${month}${params}`, { token });
}

export async function apiGetAllTimeStats(token, userId = null) {
  const params = userId ? `?userId=${userId}` : '';
  return apiRequest(`/stats/all-time${params}`, { token });
}

export async function apiGetTopServices(token, limit = 8, userId = null) {
  let params = `?limit=${limit}`;
  if (userId) params += `&userId=${userId}`;
  return apiRequest(`/stats/top-services${params}`, { token });
}

export async function apiGetTopBrands(token, limit = 8, userId = null) {
  let params = `?limit=${limit}`;
  if (userId) params += `&userId=${userId}`;
  return apiRequest(`/stats/top-brands${params}`, { token });
}

export async function apiGetMonthlyChart(token, year, userId = null) {
  const params = userId ? `?userId=${userId}` : '';
  return apiRequest(`/stats/monthly-chart/${year}${params}`, { token });
}

export async function apiGetCustomerCount(token, userId = null) {
  const params = userId ? `?userId=${userId}` : '';
  return apiRequest(`/stats/customers/count${params}`, { token });
}

export async function apiGetLowStockProducts(token, userId = null) {
  const params = userId ? `?userId=${userId}` : '';
  return apiRequest(`/stats/low-stock${params}`, { token });
}

export async function apiGetStockValue(token, userId = null) {
  const params = userId ? `?userId=${userId}` : '';
  return apiRequest(`/stats/stock-value${params}`, { token });
}

export async function apiGetTopSellingProducts(token, limit = 10, userId = null) {
  let params = `?limit=${limit}`;
  if (userId) params += `&userId=${userId}`;
  return apiRequest(`/stats/top-selling-products${params}`, { token });
}

export async function apiGetMonthlySalesChart(token, year, userId = null) {
  const params = userId ? `?userId=${userId}` : '';
  return apiRequest(`/stats/monthly-sales-chart/${year}${params}`, { token });
}

export async function apiGetSalesStats(token, startDate, endDate, userId = null) {
  let params = `?startDate=${startDate}&endDate=${endDate}`;
  if (userId) params += `&userId=${userId}`;
  return apiRequest(`/stats/sales${params}`, { token });
}

export async function apiGetMonthlyRevenue(token, year, userId = null) {
  const params = userId ? `?userId=${userId}` : '';
  return apiRequest(`/stats/monthly-revenue/${year}${params}`, { token });
}

export async function apiGetYearlyRevenue(token, userId = null) {
  const params = userId ? `?userId=${userId}` : '';
  return apiRequest(`/stats/yearly-revenue${params}`, { token });
}

export async function apiGetDebtStats(token, userId = null) {
  const params = userId ? `?userId=${userId}` : '';
  return apiRequest(`/stats/debt${params}`, { token });
}

export async function apiGetProductStats(token, userId = null) {
  const params = userId ? `?userId=${userId}` : '';
  return apiRequest(`/stats/products${params}`, { token });
}

export async function apiGetExpenseStats(token, startDate, endDate, userId = null) {
  let params = `?startDate=${startDate}&endDate=${endDate}`;
  if (userId) params += `&userId=${userId}`;
  return apiRequest(`/stats/expenses${params}`, { token });
}

export async function apiGetUnreadCount(token, userId = null) {
  const params = userId ? `?userId=${userId}` : '';
  return apiRequest(`/stats/notifications/unread${params}`, { token });
}

export async function apiGetLicenseStatus(token, machineId = null) {
  const params = machineId ? `?machine_id=${machineId}` : '';
  return apiRequest(`/licenses/status${params}`, { token });
}

export async function apiGetRecords(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);
  if (filters.orderBy) params.append('orderBy', filters.orderBy);
  if (filters.orderDir) params.append('orderDir', filters.orderDir);
  if (filters.userId) params.append('userId', filters.userId);
  if (filters.search) params.append('search', filters.search);
  if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.brand) params.append('brand', filters.brand);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/records${query}`, { token });
}

export async function apiGetCustomers(token, search = '', userId = null) {
  let params = search ? `?search=${encodeURIComponent(search)}` : '';
  if (userId) params += (params ? '&' : '?') + `userId=${userId}`;
  return apiRequest(`/customers${params}`, { token });
}
