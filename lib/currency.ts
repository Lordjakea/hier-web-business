const REGION_CURRENCY: Record<string, string> = {
  AU: "AUD",
  CA: "CAD",
  CH: "CHF",
  DE: "EUR",
  ES: "EUR",
  FR: "EUR",
  GB: "GBP",
  IE: "EUR",
  IT: "EUR",
  NL: "EUR",
  NZ: "NZD",
  US: "USD",
};

function getBrowserLocale() {
  if (typeof navigator === "undefined") return undefined;
  return navigator.languages?.[0] || navigator.language || undefined;
}

function getRegionFromLocale(locale?: string) {
  if (!locale) return null;

  try {
    const region = new Intl.Locale(locale).region;
    if (region) return region.toUpperCase();
  } catch {
    // Fall through to the simple parser below.
  }

  const match = locale.match(/[-_]([A-Za-z]{2})\b/);
  return match?.[1]?.toUpperCase() || null;
}

export function getLocaleCurrency(fallback = "GBP") {
  const region = getRegionFromLocale(getBrowserLocale());
  return (region && REGION_CURRENCY[region]) || fallback;
}

export function normalizeCurrencyCode(currency?: string | null, fallback?: string) {
  const code = String(currency || "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : fallback || getLocaleCurrency();
}

export function formatCurrency(
  amount?: number | null,
  options: {
    currency?: string | null;
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
    minorUnits?: boolean;
    fallbackCurrency?: string;
  } = {}
) {
  if (amount === null || amount === undefined) return "-";

  const value = options.minorUnits ? Number(amount) / 100 : Number(amount);
  const currency = normalizeCurrencyCode(
    options.currency,
    options.fallbackCurrency
  );

  try {
    return new Intl.NumberFormat(getBrowserLocale(), {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: options.maximumFractionDigits,
      minimumFractionDigits: options.minimumFractionDigits,
    }).format(value);
  } catch {
    const digits = options.maximumFractionDigits ?? 2;
    return `${currency} ${value.toFixed(digits)}`;
  }
}

export function formatCurrencyRange(
  min?: number | null,
  max?: number | null,
  currency?: string | null
) {
  if (min === null || min === undefined || max === null || max === undefined) {
    return null;
  }

  const sharedOptions = {
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  };

  if (Number(min) === Number(max)) {
    return formatCurrency(min, sharedOptions);
  }

  return `${formatCurrency(min, sharedOptions)}-${formatCurrency(
    max,
    sharedOptions
  )}`;
}
