/* Shared daily scoring rules. Prices are in cents; changes are score points. */
(function (root) {
  'use strict';
  function calculate(previous, price, demand, sold) {
    const priceChange = price <= 200 ? 3 : -Math.min(12, Math.ceil((price - 200) / 50) * 2);
    const missed = Math.max(0, demand - sold);
    const inventoryChange = demand === 0 ? 0 : missed === 0 ? 4 : -Math.ceil(20 * missed / demand);
    const raw = previous + priceChange + inventoryChange;
    const score = Math.max(0, Math.min(100, raw));
    const reasons = [
      price <= 200 ? 'Prices at $2 or less felt affordable (+3 points).' : `Prices above $2 felt expensive (${priceChange} points).`,
      demand === 0 ? 'No demand today; inventory had no effect (0 points).' : missed === 0 ? `Met all demand: ${sold} of ${demand} cookies (+4 points).` : `Inventory fell short: served ${sold} of ${demand} cookies; ${missed} unmet (${inventoryChange} points).`
    ];
    return { score, change: score - previous, priceChange, inventoryChange, reasons, limited: raw !== score };
  }
  root.CookieSatisfaction = { calculate };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.CookieSatisfaction;
})(globalThis);
