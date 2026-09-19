CREATE TABLE ledger_entries (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES organizations(id), booking_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('payment','refund')), amount_minor bigint NOT NULL CHECK(amount_minor BETWEEN 1 AND 9007199254740991),
 currency text NOT NULL CHECK(currency IN ('MNT','USD')), method text NOT NULL CHECK(method IN ('cash','bank_transfer','other')),
 reference text NOT NULL CHECK(char_length(reference) BETWEEN 1 AND 120), request_id uuid NOT NULL,
 created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), reconciled_at timestamptz, reconciled_by uuid REFERENCES users(id),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,request_id), FOREIGN KEY(tenant_id,booking_id) REFERENCES bookings(tenant_id,id)
);
CREATE INDEX ledger_tenant_booking_idx ON ledger_entries(tenant_id,booking_id);
CREATE INDEX ledger_tenant_created_idx ON ledger_entries(tenant_id,created_at DESC);
CREATE TABLE invoices (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES organizations(id), booking_id uuid NOT NULL,
 number text NOT NULL, customer_name text NOT NULL, total_minor bigint NOT NULL CHECK(total_minor BETWEEN 0 AND 9007199254740991),
 currency text NOT NULL CHECK(currency IN ('MNT','USD')), due_on date NOT NULL, issued_at timestamptz NOT NULL DEFAULT now(), created_by uuid NOT NULL REFERENCES users(id),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,number), UNIQUE(tenant_id,booking_id), FOREIGN KEY(tenant_id,booking_id) REFERENCES bookings(tenant_id,id)
);
CREATE TABLE promotions (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES organizations(id), code text NOT NULL CHECK(code ~ '^[A-Z0-9_-]{3,40}$'),
 kind text NOT NULL CHECK(kind IN ('percent','fixed')), value bigint NOT NULL CHECK(value BETWEEN 1 AND 9007199254740991),
 currency text NOT NULL CHECK(currency IN ('MNT','USD')), starts_at timestamptz NOT NULL, ends_at timestamptz,
 max_uses integer CHECK(max_uses>0), uses integer NOT NULL DEFAULT 0 CHECK(uses>=0), active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), created_by uuid NOT NULL REFERENCES users(id),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,code), CHECK(kind <> 'percent' OR value <= 100), CHECK(ends_at IS NULL OR ends_at>starts_at), CHECK(max_uses IS NULL OR uses<=max_uses)
);
CREATE TABLE campaigns (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES organizations(id), name text NOT NULL CHECK(char_length(name) BETWEEN 1 AND 120),
 source text NOT NULL CHECK(source IN ('direct','website','agent','other')), budget_minor bigint NOT NULL CHECK(budget_minor BETWEEN 0 AND 9007199254740991),
 currency text NOT NULL CHECK(currency IN ('MNT','USD')), starts_on date NOT NULL, ends_on date NOT NULL CHECK(ends_on>=starts_on),
 created_at timestamptz NOT NULL DEFAULT now(), created_by uuid NOT NULL REFERENCES users(id), UNIQUE(tenant_id,id)
);
