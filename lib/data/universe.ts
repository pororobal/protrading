/**
 * Static seed universe of small-cap / low-float tickers frequently active in
 * momentum scans (biotech, Chinese ADRs, SPAC remnants, penny-stock runners).
 *
 * This is NOT exhaustive and tickers rotate constantly — it exists to widen
 * the scan beyond Yahoo's predefined screeners (which skew toward large/mid
 * cap "day gainers"). Combine with fetchScreenerSymbols() for broader
 * coverage. For true full-market coverage, ingest the NASDAQ-listed /
 * NYSE-listed / AMEX symbol directories (e.g. from nasdaqtrader.com's
 * nasdaqlisted.txt / otherlisted.txt) on a daily cron and store in KV.
 */
export const LOW_FLOAT_SEED_UNIVERSE: string[] = [
  // Biotech / pharma — frequent low-float runners
  'ATNF', 'BPTH', 'ENVB', 'TNXP', 'PHIO', 'OCGN', 'INVO', 'CYCC', 'VERU',
  'BIOX', 'NUZE', 'SNGX', 'ADXN', 'TENX', 'PASG', 'ABVC', 'AIKI', 'NVOS',
  'PTPI', 'TRXC', 'CRBP', 'XELB', 'TLRY', 'NAOV', 'IMTE', 'GNUS', 'MULN',
  // Chinese small caps — common gap/squeeze names
  'YTRA', 'TIRX', 'AMTD', 'NCTY', 'AGBA', 'GFAI', 'BON', 'CETX', 'CXAI',
  'TOP', 'JFU', 'MEGL', 'WTO', 'KXIN', 'SOS', 'BTBT', 'NISN', 'GDHG',
  // SPAC remnants / micro-cap tech
  'IMPP', 'IMPPP', 'ATER', 'SOND', 'SOUN', 'BBAI', 'AIFF', 'WORX', 'INDP',
  'NXTC', 'PHUN', 'COSM', 'BIVI', 'PRZO', 'CISO', 'BTAI',
  // Energy / mining micro-caps
  'NCPL', 'NEGG', 'SLNH', 'GREE', 'HUSA', 'CEI', 'INDO', 'PHX', 'VTNR',
  // Cannabis
  'SNDL', 'HEXO', 'ACB', 'CGC', 'TLRY', 'GRWG', 'IIPR',
  // Frequently-mentioned momentum names (rotate based on news cycle)
  'AAOI', 'NVTS', 'FFIE', 'MEGAW', 'BENF', 'LGCB', 'HOLO', 'DJT', 'SAVA',
];
