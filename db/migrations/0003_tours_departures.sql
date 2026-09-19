-- Existing dashboard records remain intact and become incomplete, editable drafts.
ALTER TABLE tours
  ADD COLUMN code text,
  ADD COLUMN destination text NOT NULL DEFAULT '',
  ADD COLUMN category text NOT NULL DEFAULT '',
  ADD COLUMN duration_days integer NOT NULL DEFAULT 1 CHECK (duration_days BETWEEN 1 AND 365),
  ADD COLUMN description text NOT NULL DEFAULT '',
  ADD COLUMN base_price_minor bigint NOT NULL DEFAULT 0 CHECK (base_price_minor BETWEEN 0 AND 9007199254740991),
  ADD COLUMN currency text NOT NULL DEFAULT 'MNT' CHECK (currency IN ('MNT','USD')),
  ADD COLUMN itinerary jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(itinerary) = 'array'),
  ADD COLUMN media jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(media) = 'array'),
  ADD COLUMN status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
UPDATE tours SET code = id::text WHERE code IS NULL;
ALTER TABLE tours ALTER COLUMN code SET NOT NULL;
ALTER TABLE tours ADD CONSTRAINT tours_code_length CHECK (char_length(code) BETWEEN 1 AND 64);
CREATE UNIQUE INDEX tours_tenant_code_idx ON tours (tenant_id, lower(code));
CREATE INDEX tours_tenant_catalog_idx ON tours (tenant_id,status,updated_at DESC,id);
CREATE INDEX tours_tenant_destination_idx ON tours (tenant_id,destination);
CREATE INDEX tours_tenant_category_idx ON tours (tenant_id,category);

ALTER TABLE departures
  ADD COLUMN price_minor bigint NOT NULL DEFAULT 0 CHECK (price_minor BETWEEN 0 AND 9007199254740991),
  ADD COLUMN currency text NOT NULL DEFAULT 'MNT' CHECK (currency IN ('MNT','USD')),
  ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX departures_tenant_tour_idx ON departures (tenant_id,tour_id,starts_on,id);

-- All booking writers participate in the same departure lock used by the service.
-- This prevents a concurrent confirmation from racing a capacity reduction.
CREATE FUNCTION guard_booking_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE departure_capacity integer; departure_status text; reserved bigint;
BEGIN
  IF NEW.status IN ('confirmed','completed') THEN
    SELECT capacity,status INTO departure_capacity,departure_status FROM departures
      WHERE tenant_id=NEW.tenant_id AND id=NEW.departure_id FOR UPDATE;
    IF FOUND THEN
      SELECT coalesce(sum(travelers),0) INTO reserved FROM bookings
        WHERE tenant_id=NEW.tenant_id AND departure_id=NEW.departure_id
          AND status IN ('confirmed','completed') AND id<>NEW.id;
      IF reserved+NEW.travelers > departure_capacity OR departure_status='cancelled' THEN
        RAISE EXCEPTION 'Departure capacity conflict' USING ERRCODE='23514';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER bookings_capacity_guard BEFORE INSERT OR UPDATE OF travelers,status,departure_id,tenant_id ON bookings
FOR EACH ROW EXECUTE FUNCTION guard_booking_capacity();

CREATE FUNCTION guard_departure_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE reserved bigint;
BEGIN
  SELECT coalesce(sum(travelers),0) INTO reserved FROM bookings
    WHERE tenant_id=NEW.tenant_id AND departure_id=NEW.id AND status IN ('confirmed','completed');
  IF NEW.capacity < reserved OR (NEW.status='cancelled' AND reserved>0) THEN
    RAISE EXCEPTION 'Departure capacity conflict' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER departures_capacity_guard BEFORE UPDATE OF capacity,status ON departures
FOR EACH ROW EXECUTE FUNCTION guard_departure_capacity();

CREATE TABLE tour_publications (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  tour_id uuid NOT NULL,
  version integer NOT NULL CHECK (version >= 1),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  published_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,tour_id,version),
  FOREIGN KEY (tenant_id,tour_id) REFERENCES tours(tenant_id,id)
);
CREATE FUNCTION protect_tour_publication() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Tour publications are immutable' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER tour_publications_immutable BEFORE UPDATE OR DELETE ON tour_publications
FOR EACH ROW EXECUTE FUNCTION protect_tour_publication();

CREATE TABLE tour_operations (
  tenant_id uuid NOT NULL,
  operation_id uuid NOT NULL,
  actor_id uuid NOT NULL REFERENCES users(id),
  tour_id uuid NOT NULL,
  request_digest text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id,operation_id),
  FOREIGN KEY (tenant_id,tour_id) REFERENCES tours(tenant_id,id)
);
