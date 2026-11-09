/** The experience is desktop-only: phones and tablets get a notice instead of the scene. */
export function isDesktop() {
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod|Mobile|Tablet|Silk|Kindle/i.test(ua)) return false;
  // iPadOS reports itself as a Mac, but Macs have no touch screen.
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return false;
  // Phones using "request desktop site" send a desktop user agent; their touch-only input gives them away.
  // Touch-screen laptops are unaffected because their primary pointer is the trackpad or mouse.
  return !window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}
