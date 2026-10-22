export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Attraction is confined to 26px around a target, with at most 4px of assistance. */
export function magneticOffset(x: number, y: number, rect: Rect, radius = 26) {
  const nearX = Math.max(rect.left, Math.min(rect.right, x));
  const nearY = Math.max(rect.top, Math.min(rect.bottom, y));
  const distance = Math.hypot(nearX - x, nearY - y);
  if (distance > radius) return null;
  const strength = (1 - distance / radius) * 0.18;
  return {
    distance,
    x: Math.max(-4, Math.min(4, (nearX - x) * strength)),
    y: Math.max(-4, Math.min(4, (nearY - y) * strength)),
  };
}

export function revealRadius(
  x: number,
  y: number,
  width: number,
  height: number,
) {
  return Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
}

export const paperEase = [0.22, 1, 0.36, 1] as const;
