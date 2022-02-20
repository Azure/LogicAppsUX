export function isHighContrastBlack(): boolean {
  return window.getComputedStyle(document.body).backgroundColor === 'rgb(0, 0, 0)';
}
