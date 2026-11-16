import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/max';

export const DEFAULT_DEMO_PHONE_COUNTRY: CountryCode = 'US';

const regionNames =
  typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;

export type DemoPhoneCountryOption = {
  code: CountryCode;
  name: string;
  dialCode: string;
};

export const demoPhoneCountryOptions: DemoPhoneCountryOption[] = getCountries()
  .map((code) => ({
    code,
    name: regionNames?.of(code) || code,
    dialCode: `+${getCountryCallingCode(code)}`,
  }))
  .sort((left, right) => left.name.localeCompare(right.name));

export const parseDemoPhone = (value: string, country: CountryCode = DEFAULT_DEMO_PHONE_COUNTRY) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = parsePhoneNumberFromString(trimmed, country);
  return parsed?.isValid() ? parsed : null;
};

export const normalizeDemoPhone = (
  value: string,
  country: CountryCode = DEFAULT_DEMO_PHONE_COUNTRY,
): string | null => parseDemoPhone(value, country)?.number ?? null;

export const detectDemoPhoneCountry = (value: string): CountryCode | null =>
  parsePhoneNumberFromString(value.trim())?.country ?? null;
