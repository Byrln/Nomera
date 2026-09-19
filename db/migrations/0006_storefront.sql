CREATE TABLE storefront_settings (
 tenant_id uuid PRIMARY KEY REFERENCES organizations(id),
 version integer NOT NULL DEFAULT 0 CHECK(version>=0),
 draft jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE storefront_routes (
 slug text PRIMARY KEY CHECK(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 tenant_id uuid NOT NULL REFERENCES organizations(id),
 UNIQUE (tenant_id,slug)
);
CREATE TABLE storefront_publications (
 tenant_id uuid NOT NULL REFERENCES organizations(id),
 version integer NOT NULL CHECK(version>0),
 slug text NOT NULL,
 data jsonb NOT NULL,
 effective_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 cancelled_at timestamptz,
 PRIMARY KEY(tenant_id,version),
 FOREIGN KEY(tenant_id,slug) REFERENCES storefront_routes(tenant_id,slug)
);
CREATE INDEX storefront_publications_active ON storefront_publications(tenant_id,effective_at DESC,version DESC) WHERE cancelled_at IS NULL;
CREATE FUNCTION protect_storefront_publication() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR ROW(NEW.tenant_id,NEW.version,NEW.slug,NEW.data,NEW.effective_at,NEW.created_at) IS DISTINCT FROM ROW(OLD.tenant_id,OLD.version,OLD.slug,OLD.data,OLD.effective_at,OLD.created_at) THEN
  RAISE EXCEPTION 'Published storefront content is immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER storefront_publication_immutable BEFORE UPDATE OR DELETE ON storefront_publications FOR EACH ROW EXECUTE FUNCTION protect_storefront_publication();
