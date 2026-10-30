(() => {
  'use strict';
  const KEY = 'kevins-cookie-shop-v1';
  const $ = id => document.getElementById(id);
  const money = cents => (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const fresh = () => ({ cash: 10000, history: [], satisfaction: 75 });
  const signed = n => `${n > 0 ? '+' : ''}${n}`;
  let state = fresh();
  let serving = false;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && Number.isSafeInteger(saved.cash) && saved.cash >= 0 && Array.isArray(saved.history) && saved.history.length <= 30 && saved.history.every(r => ['day','baked','sold','revenue','expenses','profit','cash','ads','price'].every(k => Number.isFinite(r[k])))) state = saved;
  } catch (_) { /* The game also works when storage is unavailable. */ }
  // Old saves lack demand, so start tracking at 75 without inventing past feedback.
  state.satisfaction = 75;
  for (const r of state.history) {
    if (Number.isInteger(r.demand) && r.demand >= r.sold) {
      r.feedback = CookieSatisfaction.calculate(state.satisfaction, r.price, r.demand, r.sold);
      state.satisfaction = r.feedback.score;
    } else delete r.feedback;
  }
  function feedback(r) {
    const f = r.feedback;
    if (!f) return 'Not tracked on this day (older save).';
    return `${f.score}/100 (${signed(f.change)} points). ${f.reasons.join(' ')}${f.limited ? ' Score limited to the 0–100 range.' : ''}`;
  }
  const weather = [
    { name: 'A sunny stroll kind of day', demand: 1.12 },
    { name: 'Cloudy skies, cozy cookie cravings', demand: 1 },
    { name: 'Rain in the forecast • fewer walk-ins', demand: .78 },
    { name: 'Clear skies and a busy neighborhood', demand: 1.2 },
    { name: 'A quiet day on the block', demand: .9 }
  ];
  const forecast = () => weather[(state.history.length * 7 + 1) % weather.length];
  const over = () => state.history.length >= 30 || state.cash < 550;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {} }
  function estimate() {
    const bake = Number($('quantity').value), ads = Math.round(Number($('advertising').value) * 100);
    const cost = bake * 50 + ads + 500;
    $('ingredients').textContent = money(bake * 50);
    $('ad-cost').textContent = money(ads);
    $('upfront').textContent = money(cost);
    $('error').textContent = cost > state.cash ? 'This plan exceeds your cash. Bake fewer cookies or reduce advertising.' : '';
    $('open-shop').disabled = serving || over() || cost > state.cash;
  }
  async function serveCustomers(r) {
    serving = true;
    $('customer-scene').hidden = false;
    $('receipt').hidden = true;
    $('results-title').textContent = `Day ${r.day} • shop is open`;
    $('open-shop').textContent = 'Serving happy customers…';
    $('open-shop').disabled = true;
    for (const input of $('plan-form').querySelectorAll('input')) input.disabled = true;
    const lane = $('customer-lane');
    lane.replaceChildren();
    const count = Math.min(16, r.sold);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    $('sales-count').textContent = '0 cookies collected';
    $('scene-caption').textContent = r.sold ? 'A smile, a little dough, and a cookie to go!' : 'A quiet counter today. No cookies were sold.';
    const colors = ['#567f9a', '#b86c50', '#658759', '#ab799b', '#c39a48'];
    for (let i = 0; i < count; i++) {
      const customer = document.createElement('div');
      customer.className = 'customer';
      customer.style.setProperty('--delay', `${i * 140}ms`);
      customer.style.setProperty('--shirt', colors[i % colors.length]);
      const batch = Math.floor((i + 1) * r.sold / count) - Math.floor(i * r.sold / count);
      customer.innerHTML = `<span class="purchase">${money(batch * r.price)} ✓</span><span class="customer-face">${['😊', '😄', '☺️', '😁'][i % 4]}</span><span class="customer-body"></span><span class="cookie-bag">🍪${batch > 1 ? `<small>×${batch}</small>` : ''}</span>`;
      lane.appendChild(customer);
    }
    // Each visitor represents a small purchase; large days stay short and readable.
    const timers = [];
    if (!reduced) for (let i = 0; i < count; i++) {
      timers.push(setTimeout(() => {
        $('sales-count').textContent = `${Math.floor((i + 1) * r.sold / count)} cookies collected`;
      }, 1050 + i * 140));
    }
    if (reduced) {
      $('sales-count').textContent = `${r.sold} cookies collected`;
      $('scene-caption').textContent = r.sold ? 'Happy customers collected their cookies. Thanks for stopping by!' : 'A quiet counter today. No cookies were sold.';
    }
    await new Promise(resolve => setTimeout(resolve, reduced ? 150 : count ? 2500 + (count - 1) * 140 : 900));
    timers.forEach(clearTimeout);
    lane.replaceChildren();
    $('sales-count').textContent = `${r.sold} cookies collected`;
    $('scene-caption').textContent = r.sold ? 'That’s a wrap! Happy customers, happy cookie shop.' : 'A quiet counter today. No cookies were sold.';
    serving = false;
    $('receipt').hidden = false;
    render();
  }
  function receipt(r) {
    $('results-title').textContent = `Day ${r.day} receipt`;
    $('receipt').innerHTML = `<div class="receipt-day">KEVIN’S COOKIE SHOP • CLOSE OF BUSINESS</div><div class="sold">${r.sold} <span style="font-size:22px">/ ${r.baked}</span></div><p>cookies sold · ${r.baked - r.sold} donated</p><div class="receipt-lines"><div><span>Sales revenue</span><b>${money(r.revenue)}</b></div><div><span>Ingredients</span><span>${money(r.baked * 50)}</span></div><div><span>Advertising</span><span>${money(r.ads)}</span></div><div><span>Shop costs</span><span>$5.00</span></div><div><span>Total expenses</span><b>${money(r.expenses)}</b></div><div class="profit ${r.profit >= 0 ? 'positive' : 'negative'}"><span>Daily profit</span><span>${money(r.profit)}</span></div></div><div class="closing-cash"><span>Cash at closing</span><b>${money(r.cash)}</b></div><p>${r.sold === r.baked && r.baked > 0 ? 'Sold out! Try a larger batch tomorrow.' : r.sold < r.baked ? 'A few left on the tray. Try a smaller batch or a friendlier price.' : 'No cookies baked today. Tomorrow is another chance.'}</p><div class="satisfaction-feedback"><b>Customer satisfaction</b><p>${feedback(r)}</p></div>`;
  }
  function render() {
    const finished = over();
    $('day').innerHTML = `Day ${Math.min(state.history.length + 1, 30)} <small>/ 30</small>`;
    $('day-label').textContent = finished ? 'SHOP CLOSED' : state.history.length ? 'READY FOR ANOTHER BATCH' : 'OPENING DAY';
    $('cash').textContent = money(state.cash);
    $('satisfaction').innerHTML = `${state.satisfaction} <small>/ 100</small>`;
    const lastFeedback = state.history.at(-1)?.feedback;
    $('satisfaction-change').textContent = lastFeedback ? `${signed(lastFeedback.change)} points on day ${state.history.at(-1).day}` : 'Starting reputation';
    const profit = state.cash - 10000;
    $('total-profit').textContent = money(profit);
    $('total-profit').className = profit < 0 ? 'negative' : 'positive';
    $('forecast').textContent = finished ? state.history.length === 30 ? `Your 30-day run is complete! ${profit >= 0 ? 'You grew your little cookie business.' : 'Every batch taught you something.'} Start a new game to try again.` : 'You need at least $5.50 to open and bake one cookie. Your run has ended. Start a new game to try again.' : `${forecast().name}.`;
    for (const input of $('plan-form').querySelectorAll('input')) input.disabled = finished;
    $('open-shop').innerHTML = finished ? 'Run complete' : 'Open the shop <span>→</span>';
    $('history-count').textContent = `${state.history.length} ${state.history.length === 1 ? 'day' : 'days'} in the books`;
    if (state.history.length) {
      receipt(state.history.at(-1));
      $('history').innerHTML = [...state.history].reverse().map(r => `<tr><td>${r.day}</td><td>${r.baked} / ${r.sold}</td><td>${money(r.revenue)}</td><td>${money(r.expenses)}</td><td class="${r.profit >= 0 ? 'positive' : 'negative'}">${money(r.profit)}</td><td>${money(r.cash)}</td><td class="history-feedback">${feedback(r)}</td></tr>`).join('');
    }
    estimate();
  }
  $('plan-form').addEventListener('input', estimate);
  $('plan-form').addEventListener('submit', event => {
    event.preventDefault();
    if (serving || over() || !$('plan-form').reportValidity()) return;
    const baked = Number($('quantity').value), price = Math.round(Number($('price').value) * 100), ads = Math.round(Number($('advertising').value) * 100);
    const expenses = baked * 50 + ads + 500;
    if (!Number.isInteger(baked) || baked < 0 || baked > 10000 || price < 25 || price > 2000 || ads < 0 || !Number.isFinite(expenses) || expenses > state.cash) return;
    // Ads have diminishing returns; prices above $2 reduce customer demand.
    const demand = Math.max(0, Math.round((35 + 13 * Math.sqrt(ads / 100)) * Math.pow(200 / price, 1.35) * forecast().demand * (.88 + Math.random() * .24)));
    const sold = Math.min(baked, demand), revenue = sold * price, profit = revenue - expenses;
    const feedback = CookieSatisfaction.calculate(state.satisfaction, price, demand, sold);
    state.satisfaction = feedback.score;
    state.cash += profit;
    state.history.push({ day: state.history.length + 1, baked, sold, revenue, expenses, profit, cash: state.cash, ads, price, demand, feedback });
    save();
    serveCustomers(state.history.at(-1));
  });
  $('restart').addEventListener('click', () => $('reset-dialog').showModal());
  $('cancel-reset').addEventListener('click', () => $('reset-dialog').close());
  $('confirm-reset').addEventListener('click', () => { state = fresh(); save(); location.reload(); });
  render();
})();
