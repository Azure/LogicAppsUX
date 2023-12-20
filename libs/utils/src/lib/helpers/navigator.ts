export function isEdge(): boolean {
  return /Edg\/\d+/.test(navigator.userAgent);
}

export function isFirefox(): boolean {
  return /Firefox\/\d+/.test(navigator.userAgent);
}

export function isApple(): boolean {
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}
