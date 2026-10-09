export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const tenDigits = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

  if (tenDigits.length !== 10) {
    return raw;
  }

  return `(${tenDigits.slice(0, 3)})${tenDigits.slice(3, 6)}-${tenDigits.slice(6)}`;
}

/** A `tel:` href for click-to-call — leads are all US numbers, so a clean
 *  10-digit match gets the +1 country code; anything else (already has a
 *  country code, or a malformed/short number) is passed through as digits
 *  only rather than guessing. */
export function telHref(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const tenDigits = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return `tel:${tenDigits.length === 10 ? `+1${tenDigits}` : digits}`;
}
