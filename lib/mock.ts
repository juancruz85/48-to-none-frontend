import { Txn } from "./types";

const merchants = ["Amazon", "Uber", "Steam", "Shell", "Walmart", "Binance", "Airbnb", "Target"];
const countries = ["US", "GB", "DE", "NG", "BR", "IN", "RU", "JP"];

export function mockTransactions(n = 60): Txn[] {
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => {
    const risky = Math.random() < 0.15;
    return {
      id: `TX-${10000 + i}`,
      time: new Date(now - i * 7 * 60_000).toISOString(),
      merchant: merchants[Math.floor(Math.random() * merchants.length)],
      amount: Math.round((risky ? 400 + Math.random() * 4000 : 5 + Math.random() * 250) * 100) / 100,
      country: countries[Math.floor(Math.random() * countries.length)],
      score: Math.round((risky ? 0.7 + Math.random() * 0.3 : Math.random() * 0.6) * 100) / 100,
    };
  });
}
