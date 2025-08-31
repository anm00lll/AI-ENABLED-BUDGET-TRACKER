# MY BUDGET TRACKER

A modern budget tracking web app built with **Next.js 14**, **TypeScript**, and **TailwindCSS**. It helps you log income/expenses, categorize spending, and visualize trends with interactive charts. The app also includes optional **AI-powered insights** via the OpenAI API.

---

## ✨ Features

* Expense Tracking
* Income Tracking
* Budget Categories
* Interactive Charts
* Date Utilities
* AI Insights (Optional)
* Fast & Responsive
* Type-safe (TypeScript + ESLint)

---

## 🛠️ Technology Used

* Next.js 14
* React 18
* TypeScript
* TailwindCSS 3
* PostCSS
* Autoprefixer
* Recharts
* date-fns
* OpenAI Node SDK
* ESLint (Next.js config)
* npm scripts
* Node.js (v18+)
* .env.local

---

## ✅ Requirements

* Node.js v18.17+ (recommended LTS 18 or 20)
* npm v9+

The app lives in the `nextjs-app/` folder.

---

## 🚀 Quick Start (Local)

### 1) Clone & enter the app

```bash
git clone https://github.com/anm00lll/AI-ENABLED-BUDGET-TRACKER.git
cd AI-ENABLED-BUDGET-TRACKER/nextjs-app
```

### 2) Install dependencies

```bash
npm install
```

### 3) Configure environment

Create a file named **`.env.local`** in `nextjs-app/`:

```env
# Required only if you want AI insights
OPENAI_API_KEY=your_openai_api_key_here
```

### 4) Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5) Production build

```bash
npm run build
npm start
```

---

## 🔧 NPM Scripts

* `npm run dev` – Start Next.js in development mode.
* `npm run build` – Create an optimized production build.
* `npm start` – Run the production server.
* `npm run lint` – Run ESLint.

---

## 🧠 How It Works

1. **Transactions** → Add income/expense entries (amount, date, category, notes).
2. **Categorization** → Data is grouped by category and time period using **date-fns** utilities.
3. **Visualization** → **Recharts** renders charts (bar, line, pie) to show totals and category shares.
4. **AI Insights** → If `OPENAI_API_KEY` is set, prompts are sent to OpenAI API via the SDK to generate suggestions.
5. **Responsive App** → Next.js 14 + TailwindCSS ensure a clean responsive experience.

---

## 📁 Project Structure (high level)

```
AI-ENABLED-BUDGET-TRACKER/
└─ nextjs-app/
   ├─ app/ or pages/           # Routes
   ├─ components/              # UI components
   ├─ public/                  # Static assets
   ├─ styles/ or globals.css   # Tailwind styles
   ├─ package.json             # Dependencies & scripts
   └─ ...                      # .next/ build cache, configs, etc.
```

---

## 🔐 Environment Variables

* `OPENAI_API_KEY` (optional) → Enables AI features via OpenAI.

Store secrets in **`.env.local`** (not committed to git).

---

## 🧪 Linting & Quality

* ESLint (`eslint-config-next`)
* TypeScript (`.ts / .tsx`)

Run:

```bash
npm run lint
```

---

## 🛡️ License

MIT License

---

## 🙋 FAQ

* **Do I need an OpenAI key?** → Only if you want AI-generated insights.
* **Which Node version is supported?** → Node 18.17+ (Next.js 14 requirement). LTS 18/20 recommended.
* **Where do I start editing?** → Explore `app/` or `pages/` and `components/` inside `nextjs-app/`.
