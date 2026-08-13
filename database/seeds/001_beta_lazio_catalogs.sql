BEGIN;

INSERT INTO legal_documents (document_type, version, content_url, published_at)
VALUES
  ('privacy', 'beta-0.1-2026-08-13', 'https://www.escoapesca.it/privacy-beta.html', '2026-08-13T00:00:00Z'),
  ('terms', 'beta-0.1-2026-08-13', 'https://www.escoapesca.it/termini.html', '2026-08-13T00:00:00Z')
ON CONFLICT (document_type, version) DO UPDATE
SET
  content_url = EXCLUDED.content_url,
  published_at = EXCLUDED.published_at,
  retired_at = NULL;

INSERT INTO provinces (code, name, region_code, region_name, active)
VALUES
  ('FR', 'Frosinone', 'LAZ', 'Lazio', true),
  ('LT', 'Latina', 'LAZ', 'Lazio', true),
  ('RI', 'Rieti', 'LAZ', 'Lazio', true),
  ('RM', 'Roma', 'LAZ', 'Lazio', true),
  ('VT', 'Viterbo', 'LAZ', 'Lazio', true)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  region_code = EXCLUDED.region_code,
  region_name = EXCLUDED.region_name,
  active = EXCLUDED.active;

INSERT INTO fishing_techniques (slug, name, active, sort_order)
VALUES
  ('surfcasting', 'Surfcasting', true, 10),
  ('spinning', 'Spinning', true, 20),
  ('bolognese', 'Bolognese', true, 30),
  ('feeder', 'Feeder', true, 40),
  ('carpfishing', 'Carpfishing', true, 50),
  ('ledgering', 'Ledgering', true, 60),
  ('trout-area', 'Trout Area', true, 70),
  ('fly-fishing', 'Pesca a mosca', true, 80),
  ('eging', 'Eging', true, 90),
  ('bolentino', 'Bolentino', true, 100),
  ('trolling', 'Traina', true, 110),
  ('kayak-fishing', 'Kayak fishing', true, 120),
  ('other', 'Altro', true, 999)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order;

INSERT INTO availability_slots (slug, label, category, active, sort_order)
VALUES
  ('weekdays', 'Giorni feriali', 'day', true, 10),
  ('weekend', 'Weekend', 'day', true, 20),
  ('morning', 'Mattina', 'time', true, 30),
  ('afternoon', 'Pomeriggio', 'time', true, 40),
  ('evening-night', 'Sera/notte', 'time', true, 50)
ON CONFLICT (slug) DO UPDATE
SET
  label = EXCLUDED.label,
  category = EXCLUDED.category,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order;

COMMIT;
