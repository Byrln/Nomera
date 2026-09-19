CREATE TABLE departure_journeys (
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  departure_id uuid NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  steps jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(steps) = 'array'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NOT NULL REFERENCES users(id),
  PRIMARY KEY (tenant_id, departure_id),
  FOREIGN KEY (tenant_id, departure_id) REFERENCES departures(tenant_id,id)
);
