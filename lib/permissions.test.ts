import { describe, expect, it } from "vitest";

import { hasPermission } from "./permissions";

describe("operator permissions", () => {
  it("permits dispatchers to manage dispatch without allowing administration", () => {
    expect(hasPermission("Dispatcher", "dispatch:write")).toBe(true);
    expect(hasPermission("Dispatcher", "administration:write")).toBe(false);
  });

  it("permits super administrators to manage every protected workspace", () => {
    expect(hasPermission("Super Administrator", "fleet:write")).toBe(true);
    expect(hasPermission("Super Administrator", "zones:write")).toBe(true);
    expect(hasPermission("Super Administrator", "configuration:write")).toBe(true);
    expect(hasPermission("Super Administrator", "administration:write")).toBe(true);
  });
});