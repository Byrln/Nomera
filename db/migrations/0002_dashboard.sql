-- Minimal normalized records for the dashboard read slice. No seeded business data.
CREATE TABLE tours (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(trim(title)) >= 1 AND char_length(title) <= 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id)
);

CREATE TABLE departures (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tour_id uuid NOT NULL,
  starts_on date NOT NULL CHECK (starts_on BETWEEN DATE '0001-01-01' AND DATE '9999-12-31'),
  ends_on date NOT NULL CHECK (ends_on >= starts_on AND ends_on <= DATE '9999-12-31'),
  status text NOT NULL CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  capacity integer NOT NULL CHECK (capacity >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, tour_id) REFERENCES tours (tenant_id, id)
);
CREATE INDEX departures_tenant_dates_idx ON departures (tenant_id, starts_on, ends_on);

CREATE TABLE bookings (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  departure_id uuid NOT NULL,
  reference text NOT NULL CHECK (length(trim(reference)) >= 1 AND char_length(reference) <= 64),
  customer_name text NOT NULL CHECK (length(trim(customer_name)) >= 1 AND char_length(customer_name) <= 200),
  booked_at timestamptz NOT NULL DEFAULT now() CHECK (isfinite(booked_at)),
  status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  channel text NOT NULL CHECK (channel IN ('direct', 'website', 'agent', 'other')),
  total_minor bigint NOT NULL CHECK (total_minor BETWEEN 0 AND 9007199254740991),
  currency text NOT NULL CHECK (currency IN ('MNT', 'USD')),
  travelers integer NOT NULL CHECK (travelers > 0),
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, reference),
  FOREIGN KEY (tenant_id, departure_id) REFERENCES departures (tenant_id, id)
);
CREATE INDEX bookings_tenant_currency_booked_idx ON bookings (tenant_id, currency, booked_at DESC, id);
CREATE INDEX bookings_tenant_departure_idx ON bookings (tenant_id, departure_id) WHERE status IN ('confirmed', 'completed');
CREATE INDEX bookings_pending_idx ON bookings (tenant_id, currency) WHERE status = 'pending';

CREATE TABLE inquiries (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now() CHECK (isfinite(created_at)),
  booking_id uuid,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, booking_id) REFERENCES bookings (tenant_id, id)
);
CREATE INDEX inquiries_tenant_created_idx ON inquiries (tenant_id, created_at);
