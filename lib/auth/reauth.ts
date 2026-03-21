export const REAUTH_COOKIE = 'cashin_reauth_at'
export const REAUTH_MAX_AGE_MS = 60 * 60 * 1000

export function getReauthExpiry(timestamp: number) {
  return timestamp + REAUTH_MAX_AGE_MS
}

export function isReauthExpired(timestamp: number, now = Date.now()) {
  return Number.isNaN(timestamp) || getReauthExpiry(timestamp) <= now
}

export function setReauthCookie(timestamp = Date.now()) {
  if (typeof document === 'undefined') {
    return
  }

  const expires = new Date(getReauthExpiry(timestamp)).toUTCString()
  document.cookie = `${REAUTH_COOKIE}=${timestamp}; path=/; expires=${expires}; SameSite=Lax`
}

export function clearReauthCookie() {
  if (typeof document === 'undefined') {
    return
  }

  document.cookie = `${REAUTH_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
}

export function getReauthTimestampFromCookie(cookieHeader: string) {
  const cookies = cookieHeader.split(';')

  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')

    if (name === REAUTH_COOKIE) {
      return Number(value)
    }
  }

  return Number.NaN
}
