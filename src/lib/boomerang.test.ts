import { describe, expect, it } from "vitest";
import { boomerangFrameCount, boomerangFrameDelayMs, boomerangFrameOrder } from "./boomerang";

describe("boomerangFrameOrder", () => {
  it("plays frames forward then backward without repeating endpoints", () => {
    expect(boomerangFrameOrder(5)).toEqual([0, 1, 2, 3, 4, 3, 2, 1]);
  });

  it("treats fewer than two frames as a minimal two-frame loop", () => {
    expect(boomerangFrameOrder(0)).toEqual([0, 1]);
    expect(boomerangFrameOrder(1)).toEqual([0, 1]);
  });

  it("keeps every source frame reachable", () => {
    const order = boomerangFrameOrder(boomerangFrameCount);
    expect(new Set(order).size).toBe(boomerangFrameCount);
    expect(order).toHaveLength(boomerangFrameCount * 2 - 2);
  });

  it("uses a frame delay suited for a smooth loop", () => {
    expect(boomerangFrameDelayMs).toBeGreaterThan(60);
    expect(boomerangFrameDelayMs).toBeLessThanOrEqual(400);
  });
});
