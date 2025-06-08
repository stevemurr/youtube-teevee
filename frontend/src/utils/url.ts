/**
 * Ensures a URL has a protocol (https:) prepended
 * Handles protocol-relative URLs that start with //
 * Also handles cases where text appears before the //
 */
export function ensureProtocol(url: string | null | undefined): string {
  if (!url) return '';
  
  // Check if there's a protocol-relative URL anywhere in the string
  const protocolRelativeMatch = url.match(/\/\/[\w.-]+/);
  if (protocolRelativeMatch) {
    // Extract everything from // onwards
    const urlIndex = url.indexOf('//');
    const cleanUrl = url.substring(urlIndex);
    return `https:${cleanUrl}`;
  }
  
  // If it's already a full URL with protocol, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Otherwise return as-is (might be a relative path)
  return url;
}