export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const tenDigits = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

  if (tenDigits.length !== 10) {
    return raw;
  }

  return `(${tenDigits.slice(0, 3)})${tenDigits.slice(3, 6)}-${tenDigits.slice(6)}`;
}
