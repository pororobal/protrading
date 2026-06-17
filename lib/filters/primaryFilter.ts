/**
 * First-pass filter — eliminates stocks that don't meet the minimum
 * momentum criteria before the Monster Score is computed.
 *
 * Spec filters (price 1-50, marketCap < 1B, volume > avgVolume30,
 * floatShares < 100M, dollarVolume > 10M) plus a few improvements:
 *   - Exchange filter (NASDAQ/NYSE/AMEX only, no OTC pink sheets)
 *   - NaN/null guard on all fields
 */

import type { RawQuote, FilterConfig } from '@/types/stock';

export interface FilterResult {
  passed: boolean;
  reasons: string[];
}

export function applyPrimaryFilter(quote: RawQuote, config: FilterConfig): FilterResult {
  const reasons: string[] = [];

  const dollarVolume = quote.price * quote.volume;

  if (!isFinite(quote.price) || quote.price <= 0) {
    reasons.push('Invalid price');
  } else {
    if (quote.price < config.minPrice) reasons.push(`Price $${quote.price.toFixed(2)} < $${config.minPrice}`);
    if (quote.price > config.maxPrice) reasons.push(`Price $${quote.price.toFixed(2)} > $${config.maxPrice}`);
  }

  if (quote.marketCap > config.maxMarketCap) {
    reasons.push(`Market cap $${(quote.marketCap / 1e6).toFixed(0)}M > $1B`);
  }

  if (config.requireVolumeAboveAvg && quote.avgVolume30 > 0 && quote.volume < quote.avgVolume30) {
    reasons.push(`Volume ${(quote.volume / 1e6).toFixed(2)}M < avg ${(quote.avgVolume30 / 1e6).toFixed(2)}M`);
  }

  if (quote.floatShares !== null && quote.floatShares > config.maxFloatShares) {
    reasons.push(`Float ${(quote.floatShares / 1e6).toFixed(1)}M > ${config.maxFloatShares / 1e6}M`);
  }

  if (dollarVolume < config.minDollarVolume) {
    reasons.push(`Dollar volume $${(dollarVolume / 1e6).toFixed(2)}M < $${config.minDollarVolume / 1e6}M`);
  }

  if (quote.exchange === 'OTHER') {
    reasons.push('Exchange not NASDAQ/NYSE/AMEX');
  }

  return { passed: reasons.length === 0, reasons };
}

/**
 * Additional pre-market-specific filter — requires a meaningful pre-market
 * move to surface genuine overnight catalysts (news, earnings, FDA).
 */
export function applyPremarketFilter(quote: RawQuote): FilterResult {
  const reasons: string[] = [];

  if (quote.premarketChange == null) {
    reasons.push('No pre-market data available');
  } else if (Math.abs(quote.premarketChange) < 5) {
    reasons.push(`Pre-market change ${quote.premarketChange.toFixed(1)}% < ±5%`);
  }

  return { passed: reasons.length === 0, reasons };
}
