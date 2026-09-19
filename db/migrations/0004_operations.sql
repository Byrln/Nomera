CREATE TABLE customers (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES organizations(id),
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 200),
 email text NOT NULL DEFAULT '' CHECK(length(email)<=254),
 phone text NOT NULL DEFAULT '' CHECK(length(phone)<=80),
 country text NOT NULL DEFAULT '' CHECK(length(country)<=120),
 archived boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id)
);
CREATE INDEX customers_directory_idx ON customers(tenant_id,updated_at DESC);
ALTER TABLE bookings ADD COLUMN customer_id uuid, ADD COLUMN customer_email text NOT NULL DEFAULT '',
 ADD COLUMN customer_phone text NOT NULL DEFAULT '', ADD COLUMN version integer NOT NULL DEFAULT 1,
 ADD COLUMN unit_price_minor bigint NOT NULL DEFAULT 0 CHECK(unit_price_minor BETWEEN 0 AND 9007199254740991),
 ADD COLUMN discount_minor bigint NOT NULL DEFAULT 0 CHECK(discount_minor BETWEEN 0 AND 9007199254740991),
 ADD COLUMN cost_minor bigint CHECK(cost_minor BETWEEN 0 AND 9007199254740991),
 ADD COLUMN tour_snapshot jsonb,
 ADD FOREIGN KEY (tenant_id,customer_id) REFERENCES customers(tenant_id,id);
ALTER TABLE inquiries ADD COLUMN customer_id uuid,
 ADD COLUMN title text NOT NULL DEFAULT '', ADD COLUMN stage text NOT NULL DEFAULT 'new' CHECK(stage IN ('new','follow_up','proposal_sent','negotiation','won','lost')),
 ADD COLUMN follow_up_at date, ADD COLUMN notes text NOT NULL DEFAULT '',
 ADD COLUMN version integer NOT NULL DEFAULT 1,
 ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
 ADD FOREIGN KEY(tenant_id,customer_id) REFERENCES customers(tenant_id,id);
CREATE TABLE customer_activities (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL, customer_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('note','interaction','document')),
 body text NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 10000),
 url text NOT NULL DEFAULT '', actor_id uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,customer_id) REFERENCES customers(tenant_id,id)
);
CREATE TABLE sales_quotes (
 id uuid PRIMARY KEY,tenant_id uuid NOT NULL,inquiry_id uuid NOT NULL,departure_id uuid NOT NULL,
 travelers integer NOT NULL CHECK(travelers>0),total_minor bigint NOT NULL CHECK(total_minor BETWEEN 0 AND 9007199254740991),
 currency text NOT NULL CHECK(currency IN ('MNT','USD')),created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,inquiry_id) REFERENCES inquiries(tenant_id,id),
 FOREIGN KEY(tenant_id,departure_id) REFERENCES departures(tenant_id,id)
);
CREATE TABLE operation_receipts (
 tenant_id uuid NOT NULL REFERENCES organizations(id), operation_id uuid NOT NULL,
 digest text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,operation_id)
);
CREATE TABLE booking_access_tokens (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL, booking_id uuid NOT NULL,
 token_digest text NOT NULL UNIQUE,expires_at timestamptz NOT NULL,revoked_at timestamptz,
 FOREIGN KEY(tenant_id,booking_id) REFERENCES bookings(tenant_id,id)
);
CREATE INDEX booking_access_idx ON booking_access_tokens(tenant_id,booking_id);
