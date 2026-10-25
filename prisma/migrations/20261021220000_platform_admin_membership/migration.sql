-- Only clear the compatibility membership assigned by the original organization migration.
-- Accounts with explicitly combined school permissions retain their membership and permissions.
UPDATE "users"
SET "organizationId" = NULL
WHERE "organizationId" = 'legacy'
  AND "role" = 'ADMIN'
  AND "roles" = ARRAY['ADMIN']::"UserRole"[];
