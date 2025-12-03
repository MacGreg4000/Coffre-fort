-- ============================================
-- Script de configuration de la base de données SafeGuard
-- À exécuter dans phpMyAdmin sur votre NAS Synology
-- ============================================

-- 1. Créer la base de données
CREATE DATABASE IF NOT EXISTS safeguard_db 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- 2. Créer l'utilisateur (supprimer d'abord s'il existe pour éviter les erreurs)
DROP USER IF EXISTS 'safeguard_user'@'%';
DROP USER IF EXISTS 'safeguard_user'@'localhost';

-- 3. Créer l'utilisateur avec accès depuis n'importe quelle IP
CREATE USER 'safeguard_user'@'%' IDENTIFIED BY 'Secotech2023!';

-- 4. Donner tous les privilèges sur la base de données
GRANT ALL PRIVILEGES ON safeguard_db.* TO 'safeguard_user'@'%';

-- 5. Appliquer les changements
FLUSH PRIVILEGES;

-- 6. Vérifier la création
SELECT User, Host FROM mysql.user WHERE User = 'safeguard_user';

-- 7. Vérifier les permissions
SHOW GRANTS FOR 'safeguard_user'@'%';

-- 8. Vérifier que la base existe
SHOW DATABASES LIKE 'safeguard_db';

-- ============================================
-- Si vous avez des problèmes de connexion :
-- ============================================
-- 1. Vérifiez que MariaDB accepte les connexions externes
-- 2. Vérifiez le pare-feu sur Synology (port 3306 ou 3307)
-- 3. Vérifiez que le mot de passe est correct dans .env
-- ============================================


