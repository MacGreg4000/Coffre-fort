# Guide de Dépannage - SafeGuard

## 🔴 Erreur d'authentification à la base de données

### Symptôme
```
Error: P1000: Authentication failed against database server
```

### Solutions

#### 1. Vérifier que l'utilisateur existe dans MariaDB

Connectez-vous à phpMyAdmin sur votre NAS Synology et exécutez :

```sql
-- Vérifier si l'utilisateur existe
SELECT User, Host FROM mysql.user WHERE User = 'safeguard_user';

-- Si l'utilisateur n'existe pas, créez-le :
CREATE USER 'safeguard_user'@'%' IDENTIFIED BY 'Secotech2023!';
GRANT ALL PRIVILEGES ON safeguard_db.* TO 'safeguard_user'@'%';
FLUSH PRIVILEGES;
```

#### 2. Vérifier que la base de données existe

```sql
-- Vérifier si la base existe
SHOW DATABASES LIKE 'safeguard_db';

-- Si elle n'existe pas, créez-la :
CREATE DATABASE safeguard_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 3. Tester la connexion

Utilisez le script de test :

```bash
npm install
node scripts/test-db-connection.js
```

#### 4. Vérifier les permissions réseau sur Synology

1. **Panneau de configuration** → **Sécurité** → **Pare-feu**
2. Vérifiez que le port **3306** (ou **3307** selon votre config) est autorisé
3. Autorisez les connexions depuis votre réseau local

#### 5. Vérifier la configuration MariaDB sur Synology

1. **Centre de paquets** → **MariaDB 10**
2. Ouvrez l'application
3. Vérifiez que :
   - MariaDB est **démarré**
   - Le port est **3306** (ou **3307**)
   - Les connexions réseau sont **autorisées**

#### 6. Utiliser l'adresse IP au lieu du domaine

Si `secotech.synology.me` ne fonctionne pas, essayez avec l'IP locale :

```env
DATABASE_URL="mysql://safeguard_user:Secotech2023!@192.168.1.XX:3306/safeguard_db"
```

#### 7. Vérifier le mot de passe

Le mot de passe dans `.env` doit correspondre exactement à celui dans MariaDB.

**Attention** : Les caractères spéciaux dans les mots de passe peuvent nécessiter un encodage URL :
- `!` devient `%21`
- `@` devient `%40`
- `#` devient `%23`
- etc.

Exemple avec mot de passe `Secotech2023!` :
```env
DATABASE_URL="mysql://safeguard_user:Secotech2023%21@secotech.synology.me:3306/safeguard_db"
```

### Script SQL complet de création

Exécutez ce script dans phpMyAdmin :

```sql
-- Créer la base de données
CREATE DATABASE IF NOT EXISTS safeguard_db 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- Créer l'utilisateur (si n'existe pas)
CREATE USER IF NOT EXISTS 'safeguard_user'@'%' IDENTIFIED BY 'Secotech2023!';

-- Donner les permissions
GRANT ALL PRIVILEGES ON safeguard_db.* TO 'safeguard_user'@'%';

-- Appliquer les changements
FLUSH PRIVILEGES;

-- Vérifier
SHOW GRANTS FOR 'safeguard_user'@'%';
```

### Vérification finale

Après avoir créé l'utilisateur et la base, testez avec :

```bash
node scripts/test-db-connection.js
```

Puis lancez la migration Prisma :

```bash
npx prisma db push
```

## 🔴 Autres erreurs courantes

### Port 3306 vs 3307

Synology utilise parfois le port **3307** pour MariaDB 10. Vérifiez dans :
- **Centre de paquets** → **MariaDB 10** → **Port**

Si c'est le port 3307, modifiez `.env` :
```env
DATABASE_URL="mysql://safeguard_user:Secotech2023!@secotech.synology.me:3307/safeguard_db"
```

### Connexion refusée (ECONNREFUSED)

1. Vérifiez que MariaDB est démarré
2. Vérifiez le pare-feu
3. Vérifiez que le port est correct
4. Essayez de vous connecter depuis votre PC avec un client MySQL

### Base de données n'existe pas (ER_BAD_DB_ERROR)

Créez la base de données avec le script SQL ci-dessus.




