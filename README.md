# ⚡ Momentum Monster Scanner

> Real-time US low-float momentum stock scanner for day traders. Built with Next.js 15 + Vercel.

![Demo](https://img.shields.io/badge/status-live-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4)

---

## 🎯 What It Does

Scans NASDAQ / NYSE / AMEX for stocks with the strongest intraday momentum using a proprietary **Monster Score** (0–100) that combines:

| Factor | Weight | Signal |
|--------|--------|--------|
| Float Rotation | 35% | Volume ÷ Float — how many times the float has traded |
| RVOL | 20% | Today's volume vs 30-day average |
| VWAP Strength | 15% | % of session held above VWAP |
| ORB Breakout | 10% | 5/15/30-min opening range breakout |
| Gap Strength | 10% | Open vs previous close |
| Short Interest | 10% | % of float short (squeeze potential) |
| **Bonuses** | +0–20 | Halts, 52w high, sector momentum, RS vs SPY |
| **Penalties** | −0–20 | VWAP loss, pullback from high, volume decline, dilution |

---

## 📱 Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/dashboard` | Overview: top 10 Monster stocks, float rotation, RVOL, gaps, premarket, short squeeze |
| Premarket | `/premarket` | Pre-market movers with ±5%+ move |
| Monster Score | `/monster` | Full leaderboard by Monster Score with grade filter |
| ORB Scanner | `/orb` | Opening Range Breakout by 5/15/30-min window |
| VWAP Scanner | `/vwap` | VWAP hold/above/reclaim/below filter |
| Float Rotation | `/float-rotation` | Ranked by float rotation with float-size tier filter |
| Halt Monitor | `/halts` | Stocks with trading halts |
| Watchlist | `/watchlist` | Personal saved stocks with notes (localStorage) |

---

## 🚀 Quick Start

### Local Development (Demo Mode)

```bash
git clone https://github.com/YOUR_USERNAME/momentum-monster-scanner
cd momentum-monster-scanner
npm install

# Copy env (demo mode = simulated data, no Yahoo API calls)
cp .env.example .env.local

npm run dev
# Open http://localhost:3000
```

### Enable Live Data

Edit `.env.local`:
```
NEXT_PUBLIC_MOCK_DATA=false
```

> **Note:** Live mode calls Yahoo Finance's unofficial endpoints. These are rate-limited and may occasionally return empty results (especially after market hours). The scanner falls back to demo data gracefully.

---

## ☁️ Deploy to Vercel

### Option 1: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

### Option 2: GitHub → Vercel (Recommended)

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repo
4. Add environment variables:
   - `NEXT_PUBLIC_MOCK_DATA` = `false` (for live data) or `true` (for demo)
5. Click **Deploy**

### Environment Variables in Vercel

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_MOCK_DATA` | `true` / `false` | `true` = simulated data |

---

## 🔧 Upgrading to Production-Grade Data

Yahoo Finance's unofficial API is suitable for prototyping but **not for production trading use**. For a real scanner, swap `lib/data/yahoo.ts` for:

### Polygon.io (Recommended)
- Full symbol universe (all NASDAQ/NYSE/AMEX tickers)
- Real-time quotes, trades, aggregates
- Accurate float shares and short interest
- [polygon.io](https://polygon.io) — free tier available

### Finnhub
- Real-time quotes + company fundamentals
- [finnhub.io](https://finnhub.io) — free tier available

### Alpaca Market Data
- Real-time + historical bars
- Great for ORB calculations with accurate 1-min candles
- [alpaca.markets](https://alpaca.markets) — free tier available

The rest of the app (`lib/scoring/`, `lib/filters/`, all components) only depends on the `RawQuote` and `IntradayBar` types — swap the data source without changing anything else.

---

## 📐 Architecture

```
app/
├── api/
│   ├── scan/route.ts      # Main scan endpoint (GET /api/scan)
│   ├── quote/route.ts     # Individual quote lookup
│   └── intraday/route.ts  # 1-min intraday bars
├── dashboard/page.tsx     # Dashboard
├── premarket/page.tsx     # Premarket scanner
├── monster/page.tsx       # Monster Score leaderboard
├── orb/page.tsx           # ORB scanner
├── vwap/page.tsx          # VWAP scanner
├── float-rotation/page.tsx# Float rotation scanner
├── halts/page.tsx         # Halt monitor
└── watchlist/page.tsx     # Watchlist

lib/
├── data/
│   ├── yahoo.ts           # Yahoo Finance client (swap for other providers)
│   ├── universe.ts        # Seed ticker universe
│   ├── scanPipeline.ts    # Main scan orchestration
│   └── mockData.ts        # Demo/development data generator
├── scoring/
│   ├── derived.ts         # RVOL, float rotation, VWAP%, ORB calcs
│   └── monsterScore.ts    # Monster Score engine (0-100)
├── filters/
│   └── primaryFilter.ts   # First-pass filter (price/float/vol/cap)
├── store/
│   └── watchlist.ts       # Zustand watchlist (localStorage)
└── utils/
    └── format.ts          # Formatters, color helpers, market status

components/
├── layout/
│   ├── Sidebar.tsx        # Navigation sidebar
│   └── TopBar.tsx         # Market status header
├── scanner/
│   ├── ScannerTable.tsx   # Reusable sortable/filterable stock table
│   └── ScoreDetailPanel.tsx # Score breakdown detail
├── charts/
│   └── MiniChart.tsx      # Intraday sparkline (Recharts)
└── ui/
    └── atoms.tsx           # Shared micro-components

hooks/
└── useScan.ts             # SWR hooks with 60s auto-refresh

types/
└── stock.ts               # All TypeScript types
```

---

## 🎓 Monster Score Grades

| Score | Grade | Meaning |
|-------|-------|---------|
| 95+ | **SSS** | Historic — rare, maximum conviction |
| 90+ | **SS** | Exceptional momentum |
| 85+ | **S** | Strong setup — buy signal eligible |
| 75+ | **A** | Good momentum |
| 65+ | **B** | Moderate setup |
| <65 | **C** | Weak / not recommended |

### Buy Signal Requirements (All must be true)
- Monster Score ≥ 85
- RVOL ≥ 5x
- Float Rotation ≥ 3x
- Price > VWAP
- ORB Breakout confirmed

---

## ⚠️ Disclaimer

**This tool is for informational and educational purposes only. It does not constitute financial advice. Day trading stocks, especially low-float penny stocks, carries extreme risk including total loss of capital. Past momentum patterns are no guarantee of future returns. Always do your own research and risk management. Never trade with money you cannot afford to lose.**

---

## 📄 License

MIT — free to use and modify. Attribution appreciated.
