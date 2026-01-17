-- Script pour vérifier et nettoyer les données orphelines dans la table reserves
-- Exécuter ce script AVANT de faire la migration Prisma

-- 1. Vérifier les réserves orphelines (userId qui n'existe pas dans users)
SELECT r.id, r.userId, r.year, r.amount
FROM reserves r
LEFT JOIN users u ON r.userId = u.id
WHERE u.id IS NULL;

-- 2. Si des réserves orphelines existent, vous pouvez :
-- Option A: Les supprimer (si elles ne sont pas importantes)
-- DELETE FROM reserves WHERE userId NOT IN (SELECT id FROM users);

-- Option B: Les assigner à un utilisateur admin (si vous avez un admin)
-- UPDATE reserves SET userId = (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1) WHERE userId NOT IN (SELECT id FROM users);

-- Option C: Créer un utilisateur "système" pour ces réserves
-- INSERT INTO users (id, email, password, name, role, isActive, createdAt, updatedAt)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'system@internal', 'no-password', 'Système', 'ADMIN', false, NOW(), NOW());
-- UPDATE reserves SET userId = '00000000-0000-0000-0000-000000000000' WHERE userId NOT IN (SELECT id FROM users);

-- 3. Vérifier qu'il n'y a plus de réserves orphelines
SELECT COUNT(*) as orphaned_count
FROM reserves r
LEFT JOIN users u ON r.userId = u.id
WHERE u.id IS NULL;
