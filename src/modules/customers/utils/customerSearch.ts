const PHONE_SEARCH_PATTERN = /^[+\d\s().-]+$/;

export function phoneSearchDigits(search: string | null | undefined): string | null {
  const trimmed = search?.trim() ?? "";
  if (!trimmed || !PHONE_SEARCH_PATTERN.test(trimmed)) return null;

  const digits = trimmed.replace(/\D/g, "");
  return digits || null;
}
