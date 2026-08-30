/**
 * Fetches accurate global time (Asia/Jakarta / WIB, UTC+7) from authoritative internet time APIs or server HTTP headers,
 * bypassing local device clock tampering.
 * Falls back safely if offline.
 */
export const getGlobalWibDate = async () => {
  // 1. Try WorldTimeAPI (Asia/Jakarta)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Jakarta', {
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data.datetime) {
        return new Date(data.datetime);
      }
    }
  } catch (err) {
    // Continue to next fallback
  }

  // 2. Try TimeAPI.io (Asia/Jakarta)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://timeapi.io/api/time/current/zone?timeZone=Asia/Jakarta', {
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data.dateTime) {
        return new Date(data.dateTime);
      }
    }
  } catch (err) {
    // Continue to next fallback
  }

  // 3. Try HTTP Date header from server / current origin
  try {
    const headRes = await fetch(window.location.origin + window.location.pathname, {
      method: 'HEAD',
      cache: 'no-store'
    });
    const serverDate = headRes.headers.get('date');
    if (serverDate) {
      return new Date(serverDate);
    }
  } catch (err) {}

  // 4. Fallback: current Date
  return new Date();
};
