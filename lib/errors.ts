export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (
      message.includes('fetch failed') ||
      message.includes('econnreset') ||
      message.includes('network') ||
      message.includes('failed to fetch')
    ) {
      return 'We could not reach the server. Please check your connection and try again.'
    }

    return error.message || fallback
  }

  return fallback
}
