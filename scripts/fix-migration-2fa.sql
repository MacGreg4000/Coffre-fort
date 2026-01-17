-- Script SQL pour ajouter manuellement les colonnes 2FA à la table users
-- À exécuter si prisma db push échoue à cause de contraintes de clé étrangère

-- 1. Ajouter les colonnes 2FA une par une (sans recréer les contraintes)
ALTER TABLE users 
ADD COLUMN twoFactorEnabled BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN twoFactorSecret VARCHAR(255) NULL,
ADD COLUMN twoFactorBackupCodes JSON NULL,
ADD COLUMN trustedDevices JSON NULL;

-- 2. Vérifier que les colonnes ont été ajoutées
-- DESCRIBE users;
