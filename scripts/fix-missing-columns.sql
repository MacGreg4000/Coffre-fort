-- Script pour ajouter les colonnes manquantes aux tables inventories et coffres
-- À exécuter après avoir confirmé que les tables existent

-- Vérifier si la colonne 'date' existe dans inventories
SELECT 'Checking inventories.date...' as status;

-- Ajouter la colonne 'date' si elle n'existe pas
ALTER TABLE inventories
ADD COLUMN IF NOT EXISTS `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Vérifier si la colonne 'balance' existe dans coffres
SELECT 'Checking coffres.balance...' as status;

-- Ajouter la colonne 'balance' si elle n'existe pas
ALTER TABLE coffres
ADD COLUMN IF NOT EXISTS `balance` FLOAT NOT NULL DEFAULT 0;

-- Vérifier que les colonnes ont été ajoutées
SELECT 'Final check - inventories.date:' as check_type;
SELECT COUNT(*) as exists_count
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'safeguard_db'
  AND TABLE_NAME = 'inventories'
  AND COLUMN_NAME = 'date';

SELECT 'Final check - coffres.balance:' as check_type;
SELECT COUNT(*) as exists_count
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'safeguard_db'
  AND TABLE_NAME = 'coffres'
  AND COLUMN_NAME = 'balance';