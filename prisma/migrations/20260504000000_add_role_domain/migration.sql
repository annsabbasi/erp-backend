-- AddColumn: domain (nullable text) on roles table
-- Marks a role as belonging to a specific department domain (e.g. 'HR', 'FINANCE').
-- Null means the role is a general/cross-department role.
ALTER TABLE "roles" ADD COLUMN "domain" TEXT;
