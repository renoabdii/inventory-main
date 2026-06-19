const buildOwnedCashierFilter = (adminId, cashierId) => ({
  ...(cashierId ? { _id: cashierId } : {}),
  role: 'kasir',
  adminId,
});

const isCashierOwnedByAdmin = (cashier, adminId) =>
  cashier?.role === 'kasir' &&
  Boolean(cashier.adminId) &&
  String(cashier.adminId) === String(adminId);

module.exports = { buildOwnedCashierFilter, isCashierOwnedByAdmin };
