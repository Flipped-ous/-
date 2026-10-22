export type GestureIntent = 'idle' | 'horizontal' | 'vertical' | 'reorder';
export function gestureIntent(dx: number, dy: number): GestureIntent {
  if (Math.hypot(dx, dy) <= 8) return 'idle';
  return Math.abs(dx) > Math.abs(dy) * 1.15 ? 'horizontal' : 'vertical';
}
export function releaseAction(
  intent: GestureIntent,
  dx: number,
  width: number,
  cancelled = false,
): 'complete' | 'delete' | 'cancel' {
  if (
    cancelled ||
    intent !== 'horizontal' ||
    width <= 0 ||
    Math.abs(dx) < width * 0.45
  )
    return 'cancel';
  return dx > 0 ? 'complete' : 'delete';
}
