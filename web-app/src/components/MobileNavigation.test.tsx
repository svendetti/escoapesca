import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { MobileNavigation } from "./MobileNavigation";

function render(path: string, unreadCount = 0) {
  return renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [path] },
    createElement(MobileNavigation, { unreadCount })));
}

describe("mobile app navigation", () => {
  it.each(["/mie-uscite", "/crea-uscita", "/uscite/test", "/uscite/test/inviti", "/uscite/test/modifica"])(
    "keeps the Uscite tab active at %s, including deep links", (path) => {
      const html = render(path);
      expect(html.match(/aria-current="page"/g)).toHaveLength(1);
      expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*href="\/mie-uscite"/);
    },
  );

  it("offers five labeled destinations and marks Home exactly", () => {
    const html = render("/");
    expect(html.match(/<a /g)).toHaveLength(5);
    expect(html).toMatch(/aria-current="page"[^>]*href="\/"/);
    for (const label of ["Home", "Trova", "Uscite", "Avvisi", "Profilo"]) {
      expect(html).toContain(`aria-label="${label}"`);
    }
    expect(html).not.toContain("mobile-nav-badge");
  });

  it("caps only the visual badge and preserves the full unread count for assistive technology", () => {
    const html = render("/notifiche", 120);
    expect(html).toContain('aria-label="Avvisi, 120 non letti"');
    expect(html).toContain('aria-hidden="true">99+</span>');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });
});
