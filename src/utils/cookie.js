export const setCookie = (name, value, days) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))};expires=${expires.toUTCString()};path=/`;
};

export const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(?:^|; )' + encodeURIComponent(name) + '=([^;]*)'));
  if (match) {
    try {
      return JSON.parse(decodeURIComponent(match[1]));
    } catch (e) {
      return null;
    }
  }
  return null;
};

export const getWeeklyResetTime = () => {
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntilSunday = (7 - day) % 7;
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilSunday, 16, 59, 59));
  return reset;
};

export const isCookieExpired = (expiry) => Date.now() > expiry;
