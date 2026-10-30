# Kevin's Cookie Shop Tycoon

Open **index.html** in any modern web browser. No installation, build, or internet connection is required. Optional web fonts fall back to system fonts offline.

You start with $100. Plan each day's batch, price, and advertising for up to 30 days. Ingredients cost $0.50 per cookie and the shop costs $5 per day. All expenses are paid before sales, so your plan must fit your available cash. Unsold cookies are donated. The run ends after day 30 or when you cannot afford the $5.50 minimum to open and bake one cookie.

Demand responds to price, advertising (with diminishing returns), the daily forecast, and a small random variation. Results include sales, every expense, profit, and closing cash. Progress saves automatically in browser local storage when available. Use **New game** to reset.

Customer satisfaction starts at 75/100. Each day, prices at or below $2 add 3 points; higher prices subtract 2 points per $0.50 (or part thereof) above $2, capped at 12 points. Meeting all demand adds 4 points. Shortages subtract up to 20 points in proportion to unmet demand, rounded up. With no demand, inventory has no effect. Scores stay between 0 and 100. The overview shows the current score; receipts and history explain each day's price and inventory effects, including score limits. Older saves retain progress and begin tracking satisfaction at 75; prior days are marked as untracked.

Run automated scoring and Chromium browser checks with `node tests/game.test.cjs` (requires Playwright and Chromium at `/usr/bin/chromium`). The game itself still needs no dependencies.
