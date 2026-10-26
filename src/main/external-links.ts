// Only https links are handed to the OS: other schemes (file:, ms-settings:…) could launch
// local programs once the app displays remote content
export function isSafeExternalUrl(url: string): boolean {
  return URL.canParse(url) && new URL(url).protocol === 'https:'
}
