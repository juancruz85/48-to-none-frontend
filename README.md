# Fraud Dashboard (Next.js)

    npm install
    npm run dev      # http://localhost:3000

Copy `.env.local.example` to `.env.local` and set `FRAUD_API_URL` to your Python API
(must return a JSON array of `{id, time, merchant, amount, country, score}`).
Without it, the dashboard shows mock data.
