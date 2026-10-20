import { getRequestConfig } from "next-intl/server";

import { locales, defaultLocale, type Locale } from "./routing";
export { locales, defaultLocale, type Locale } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const locale = locales.includes(requestedLocale as Locale) ? requestedLocale as Locale : defaultLocale;
  const messages = (await import(`../messages/${locale}.json`)).default;
  return {
    locale,
    messages,
    timeZone: "Europe/Prague",
    now: new Date(),
  };
});
