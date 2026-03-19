/**
 * AI Assistant Response Engine
 * Data Access Layer-dən gələn məlumatları formatlaşdırıb
 * istifadəçiyə göstərmək üçün cavab hazırlayır.
 */

function fmt(amount) {
  return Number(amount || 0).toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' AZN';
}

function fmtInt(n) {
  return Number(n || 0).toLocaleString('az-AZ');
}

function formatTodaySales(data) {
  if (!data || data.count === 0) {
    return {
      text: 'Bu gün hələ satış olmayıb.',
      type: 'info',
      icon: 'shopping-cart',
    };
  }
  let text = `Bu gün **${fmtInt(data.count)} satış** olub. Ümumi satış məbləği **${fmt(data.total)}**-dir. Orta çek **${fmt(data.avgCheck)}**-dir.`;
  if (data.topProduct) {
    text += ` Ən çox satılan məhsul: **${data.topProduct}** (${fmtInt(data.topProductQty)} ədəd).`;
  }
  return { text, type: 'success', icon: 'shopping-cart', stats: [
    { label: 'Satış sayı', value: fmtInt(data.count) },
    { label: 'Ümumi məbləğ', value: fmt(data.total) },
    { label: 'Orta çek', value: fmt(data.avgCheck) },
  ]};
}

function formatWeeklySales(data) {
  if (!data || data.count === 0) {
    return { text: 'Son 7 gündə satış olmayıb.', type: 'info', icon: 'bar-chart' };
  }
  let text = `Son 7 gündə **${fmtInt(data.count)} satış** olub. Ümumi məbləğ **${fmt(data.total)}**. Orta çek **${fmt(data.avgCheck)}**.`;
  return { text, type: 'success', icon: 'bar-chart', stats: [
    { label: 'Satış sayı', value: fmtInt(data.count) },
    { label: 'Ümumi məbləğ', value: fmt(data.total) },
    { label: 'Orta çek', value: fmt(data.avgCheck) },
  ], daily: data.daily };
}

function formatMonthlySales(data) {
  if (!data || data.count === 0) {
    return { text: 'Bu ay hələ satış olmayıb.', type: 'info', icon: 'calendar' };
  }
  return {
    text: `Bu ay **${fmtInt(data.count)} satış** olub. Ümumi məbləğ **${fmt(data.total)}**.`,
    type: 'success', icon: 'calendar', stats: [
      { label: 'Satış sayı', value: fmtInt(data.count) },
      { label: 'Ümumi məbləğ', value: fmt(data.total) },
    ]
  };
}

function formatDebtors(data) {
  if (!data || data.count === 0) {
    return { text: 'Hazırda borclu müştəri yoxdur.', type: 'success', icon: 'credit-card' };
  }
  let text = `Hazırda **${data.count} borclu müştəri** var. Ümumi borc **${fmt(data.totalDebt)}**.`;
  if (data.customers.length > 0) {
    text += ` Ən çox borcu olan: **${data.customers[0].name}** – ${fmt(data.customers[0].amount)}.`;
  }
  return { text, type: 'warning', icon: 'credit-card', list: data.customers.slice(0, 10).map(c => ({
    title: c.name,
    value: fmt(c.amount),
  })), stats: [
    { label: 'Borclu müştəri', value: fmtInt(data.count) },
    { label: 'Ümumi borc', value: fmt(data.totalDebt) },
  ]};
}

function formatLowStock(data) {
  if (!data || data.count === 0) {
    return { text: 'Stokda problem yoxdur — bütün məhsullar yetərli səviyyədədir.', type: 'success', icon: 'package' };
  }
  let text = `**${data.count} məhsul** stokda az qalıb və ya tükənmək üzrədir.`;
  return { text, type: 'warning', icon: 'package', list: data.products.slice(0, 10).map(p => ({
    title: p.name,
    value: `${fmtInt(p.stock_qty)} / ${fmtInt(p.min_stock)} ${p.unit || 'ədəd'}`,
  }))};
}

function formatTopProducts(data) {
  if (!data || !data.products || data.products.length === 0) {
    return { text: 'Satış məlumatı tapılmadı.', type: 'info', icon: 'trending-up' };
  }
  let text = `Ən çox satılan məhsullar:`;
  return { text, type: 'success', icon: 'trending-up', list: data.products.map((p, i) => ({
    title: `${i + 1}. ${p.product_name}`,
    value: `${fmtInt(p.total_qty)} ədəd · ${fmt(p.total_revenue)}`,
  }))};
}

function formatProductStats(data) {
  return {
    text: `Ümumi **${fmtInt(data.total)} məhsul** var. Stok dəyəri: **${fmt(data.stock_value)}**. Stok maya dəyəri: **${fmt(data.stock_cost)}**.`,
    type: 'info', icon: 'package', stats: [
      { label: 'Məhsul sayı', value: fmtInt(data.total) },
      { label: 'Stok dəyəri', value: fmt(data.stock_value) },
      { label: 'Maya dəyəri', value: fmt(data.stock_cost) },
    ]
  };
}

function formatNewCustomers(data) {
  if (!data || data.count === 0) {
    return { text: 'Bu gün yeni müştəri əlavə olunmayıb.', type: 'info', icon: 'users' };
  }
  let text = `Bu gün **${data.count} yeni müştəri** əlavə olunub.`;
  return { text, type: 'success', icon: 'users', list: data.customers.map(c => ({
    title: c.name || 'Naməlum',
    value: c.phone || '',
  }))};
}

function formatCustomerStats(data) {
  return {
    text: `Ümumi **${fmtInt(data.total)} müştəri** qeydiyyatdan keçib.`,
    type: 'info', icon: 'users',
  };
}

function formatTodayTasks(data) {
  if (!data || data.total === 0) {
    return { text: 'Bu gün üçün tapşırıq yoxdur.', type: 'info', icon: 'check-square' };
  }
  let text = `Bu gün **${data.completed} tapşırıq tamamlanıb**, **${data.pending} tapşırıq** isə gözləmədədir.`;
  return { text, type: data.pending > 0 ? 'warning' : 'success', icon: 'check-square', stats: [
    { label: 'Ümumi', value: fmtInt(data.total) },
    { label: 'Tamamlanıb', value: fmtInt(data.completed) },
    { label: 'Gözləmədə', value: fmtInt(data.pending) },
  ], list: data.tasks.slice(0, 8).map(t => ({
    title: t.title,
    value: t.status === 'done' ? '✓ Tamamlanıb' : `⏳ ${t.priority}`,
  }))};
}

function formatOverdueTasks(data) {
  if (!data || data.count === 0) {
    return { text: 'Gecikmiş tapşırıq yoxdur.', type: 'success', icon: 'alert-circle' };
  }
  let text = `**${data.count} gecikmiş tapşırıq** var.`;
  return { text, type: 'error', icon: 'alert-circle', list: data.tasks.slice(0, 10).map(t => ({
    title: t.title,
    value: `Son tarix: ${t.due_date} · ${t.priority}`,
  }))};
}

function formatTodayExpenses(data) {
  if (!data || data.count === 0) {
    return { text: 'Bu gün xərc qeyd olunmayıb.', type: 'info', icon: 'trending-down' };
  }
  let text = `Bu gün **${fmtInt(data.count)} xərc** olub. Ümumi xərc **${fmt(data.total)}**.`;
  return { text, type: 'info', icon: 'trending-down', stats: [
    { label: 'Xərc sayı', value: fmtInt(data.count) },
    { label: 'Ümumi xərc', value: fmt(data.total) },
  ], list: data.categories.map(c => ({
    title: c.category,
    value: fmt(c.total),
  }))};
}

function formatMonthlyExpenses(data) {
  if (!data || data.count === 0) {
    return { text: 'Bu ay xərc qeyd olunmayıb.', type: 'info', icon: 'trending-down' };
  }
  return {
    text: `Bu ay **${fmtInt(data.count)} xərc**, ümumi **${fmt(data.total)}**.`,
    type: 'info', icon: 'trending-down', stats: [
      { label: 'Xərc sayı', value: fmtInt(data.count) },
      { label: 'Ümumi xərc', value: fmt(data.total) },
    ]
  };
}

function formatCashBalance(data) {
  const balanceType = data.balance >= 0 ? 'success' : 'error';
  return {
    text: `Kassa balansı: **${fmt(data.balance)}**. Gəlir: ${fmt(data.income)}, Xərc: ${fmt(data.expense)}.`,
    type: balanceType, icon: 'dollar-sign', stats: [
      { label: 'Gəlir', value: fmt(data.income) },
      { label: 'Xərc', value: fmt(data.expense) },
      { label: 'Balans', value: fmt(data.balance) },
    ]
  };
}

function formatTodayAppointments(data) {
  if (!data || data.total === 0) {
    return { text: 'Bu gün üçün randevu yoxdur.', type: 'info', icon: 'calendar' };
  }
  let text = `Bu gün **${data.total} randevu** var. ${data.completed} tamamlanıb, ${data.pending} gözləmədədir.`;
  return { text, type: 'info', icon: 'calendar', list: data.appointments.slice(0, 8).map(a => ({
    title: `${a.time} - ${a.title}`,
    value: a.customer_name || '',
  }))};
}

function formatAssetSummary(data) {
  return {
    text: `**${fmtInt(data.total)} aktiv** qeydə alınıb. Alış dəyəri: ${fmt(data.total_cost)}. Cari dəyər: ${fmt(data.total_value)}.`,
    type: 'info', icon: 'building', stats: [
      { label: 'Aktiv sayı', value: fmtInt(data.total) },
      { label: 'Alış dəyəri', value: fmt(data.total_cost) },
      { label: 'Cari dəyər', value: fmt(data.total_value) },
    ]
  };
}

function formatSupplierStats(data) {
  return {
    text: `Ümumi **${fmtInt(data.total)} təchizatçı** qeydə alınıb.`,
    type: 'info', icon: 'truck',
  };
}

function formatDashboardSummary(data) {
  const parts = [];
  parts.push(`📊 **Bugünün xülasəsi** (${data.date})`);
  parts.push(`• Satış: ${fmtInt(data.sales.count)} satış, ${fmt(data.sales.total)}`);
  parts.push(`• Xərc: ${fmtInt(data.expenses.count)} xərc, ${fmt(data.expenses.total)}`);
  parts.push(`• Kassa: ${fmt(data.cash.balance)}`);
  parts.push(`• Tapşırıq: ${data.tasks.completed} tamamlanıb, ${data.tasks.pending} gözləmədə`);
  parts.push(`• Randevu: ${data.appointments.total} randevu`);
  parts.push(`• Yeni müştəri: ${data.newCustomers.count}`);
  if (data.lowStock.count > 0) parts.push(`• ⚠️ ${data.lowStock.count} məhsul stokda azdır`);
  if (data.debtors.count > 0) parts.push(`• ⚠️ ${data.debtors.count} borclu müştəri, ${fmt(data.debtors.totalDebt)}`);

  return {
    text: parts.join('\n'),
    type: 'info',
    icon: 'layout-dashboard',
    stats: [
      { label: 'Satış', value: fmt(data.sales.total) },
      { label: 'Xərc', value: fmt(data.expenses.total) },
      { label: 'Kassa', value: fmt(data.cash.balance) },
      { label: 'Borclar', value: fmt(data.debtors.totalDebt) },
    ]
  };
}

function formatHelp() {
  return {
    text: `Mən **SmartQeyd AI köməkçisiyəm**. Sizə proqram haqqında məlumat verə bilərəm. Məsələn:\n\n• "Bugünkü satışlar" — günlük satış hesabatı\n• "Borclu müştərilər" — borc siyahısı\n• "Az qalan stok" — tükənmək üzrə olan məhsullar\n• "Həftəlik nəticə" — son 7 günün xülasəsi\n• "Kassada nə qədər pul var" — balans\n• "Bugünkü xərclər" — xərc hesabatı\n• "Gecikmiş tapşırıqlar" — vaxtı keçmiş işlər\n• "Yeni müştərilər" — bu gün əlavə olunanlar\n• "Ən çox satılan məhsul" — top məhsullar\n• "Ümumi vəziyyət" — günlük xülasə`,
    type: 'info',
    icon: 'help-circle',
  };
}

function formatUnknown(raw) {
  return {
    text: `Sualınızı tam başa düşə bilmədim. "${raw}" sorğusu üçün uyğun məlumat tapılmadı.\n\nMənə bu tip suallar verə bilərsiniz:\n• Bugünkü satışlar\n• Borclu müştərilər\n• Az qalan stok\n• Kassada nə qədər pul var\n• Həftəlik nəticə\n\n"Kömək" yazaraq tam siyahını görə bilərsiniz.`,
    type: 'info',
    icon: 'help-circle',
  };
}

module.exports = {
  formatTodaySales,
  formatWeeklySales,
  formatMonthlySales,
  formatDebtors,
  formatLowStock,
  formatTopProducts,
  formatProductStats,
  formatNewCustomers,
  formatCustomerStats,
  formatTodayTasks,
  formatOverdueTasks,
  formatTodayExpenses,
  formatMonthlyExpenses,
  formatCashBalance,
  formatTodayAppointments,
  formatAssetSummary,
  formatSupplierStats,
  formatDashboardSummary,
  formatHelp,
  formatUnknown,
};
