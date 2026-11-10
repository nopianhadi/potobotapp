/**
 * Frame order for a boomerang capture: forward pass followed by the
 * reverse pass, skipping the repeated endpoints so the loop stays smooth.
 */
export function boomerangFrameOrder(frameCount: number): number[] {
  const total = Math.max(2, Math.floor(frameCount));
  const order: number[] = [];
  for (let frame = 0; frame < total; frame += 1) order.push(frame);
  for (let frame = total - 2; frame >= 1; frame -= 1) order.push(frame);
  return order;
}

export const boomerangFrameCount = 10;
export const boomerangFrameDelayMs = 160;
