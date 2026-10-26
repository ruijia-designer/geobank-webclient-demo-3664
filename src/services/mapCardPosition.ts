export interface MapProjectAnchor {
  x: number;
  y: number;
  viewportWidth: number;
  viewportHeight: number;
}

/** Place the card beside its marker, keeping its scrollable body inside the map. */
export function positionMapCard(anchor: MapProjectAnchor, cardHeight: number) {
  const { x, y, viewportWidth, viewportHeight } = anchor;
  const margin = 16, gap = 24;
  const preferredWidth = viewportWidth <= 800 ? 330 : 390;
  const leftSpace = x - gap - margin, rightSpace = viewportWidth - margin - x - gap;
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  if (Math.max(leftSpace, rightSpace) >= 280) {
    const placement = rightSpace >= preferredWidth || (leftSpace < preferredWidth && rightSpace >= leftSpace) ? 'right' : 'left';
    const width = Math.min(preferredWidth, placement === 'right' ? rightSpace : leftSpace);
    const maxHeight = Math.max(0, viewportHeight - margin * 2);
    const height = Math.min(cardHeight, maxHeight);
    return {
      placement, width, maxHeight,
      left: clamp(placement === 'right' ? x + gap : x - gap - width, margin, viewportWidth - margin - width),
      top: clamp(y - 56, margin, viewportHeight - margin - height),
    } as const;
  }
  const above = y - gap - margin, below = viewportHeight - margin - y - gap;
  const placement = above >= below ? 'top' : 'bottom';
  const width = Math.max(0, Math.min(preferredWidth, viewportWidth - margin * 2));
  const maxHeight = Math.max(0, placement === 'top' ? above : below);
  const height = Math.min(cardHeight, maxHeight);
  return {
    placement, width, maxHeight,
    left: clamp(x - width / 2, margin, viewportWidth - margin - width),
    top: clamp(placement === 'top' ? y - gap - height : y + gap, margin, viewportHeight - margin - height),
  } as const;
}
