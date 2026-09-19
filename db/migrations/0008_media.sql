CREATE TABLE customer_files (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES organizations(id), customer_id uuid NOT NULL,
 filename text NOT NULL CHECK(char_length(filename) BETWEEN 1 AND 160), mime_type text NOT NULL CHECK(mime_type IN ('application/pdf','image/jpeg','image/png','image/webp')),
 content bytea NOT NULL CHECK(octet_length(content) BETWEEN 1 AND 5242880), sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 operation_id uuid NOT NULL, created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,operation_id), FOREIGN KEY(tenant_id,customer_id) REFERENCES customers(tenant_id,id)
);
CREATE INDEX customer_files_customer_idx ON customer_files(tenant_id,customer_id,created_at DESC);
