-- Add a dedicated permission for trip management.
-- This keeps dispatcher actions separate from route administration.

INSERT INTO permissions (name, description)
VALUES ('trips:write', 'Створення та редагування рейсів')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name = 'trips:write'
WHERE r.name IN ('dispatcher', 'admin')
ON CONFLICT DO NOTHING;
