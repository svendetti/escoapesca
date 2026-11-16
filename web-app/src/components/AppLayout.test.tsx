import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("../contexts/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../lib/notifications", () => ({ loadUnreadNotificationCount: vi.fn() }));
vi.mock("../lib/signOut", () => ({ signOutLocally: vi.fn() }));
import { useAuth } from "../contexts/AuthContext";
import { AppLayout } from "./AppLayout";

function render(user: { id: string } | null, accountStatus: string | null, isAdmin = false) {
  vi.mocked(useAuth).mockReturnValue({ user, accountStatus, isAdmin, configured: true } as never);
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AppLayout)));
}

describe("app navigation availability", () => {
  it("does not expose authenticated navigation for guests or disabled accounts", () => {
    for (const html of [render(null, null), render({ id: "disabled" }, "disabled")]) {
      expect(html).not.toContain('aria-label="Navigazione principale mobile"');
      expect(html).not.toContain("mobile-create-link");
    }
  });

  it("keeps creation, profile, logout and the mobile tab bar available for active accounts", () => {
    const html = render({ id: "active" }, "active");
    expect(html).toContain('aria-label="Navigazione principale mobile"');
    expect(html).toContain('class="mobile-create-link"');
    expect(html).toContain("Esci dall’account");
    expect(html).not.toContain("Amministrazione");
    expect(html).toContain('id="app-main"');
  });

  it("preserves administration access in the compact account menu", () => {
    expect(render({ id: "admin" }, "active", true)).toContain("Amministrazione");
  });
});
