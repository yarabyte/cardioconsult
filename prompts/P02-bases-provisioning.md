# P02 — Bases de données, chiffrement et provisioning des tenants

**Prérequis** : P01.

## À livrer
- Schémas Drizzle `db/control` et `db/tenant` (règle 04), migrations initiales et seeds **synthétiques** (`db/seed`, faker `fr`) reprenant les patients des maquettes.
- `server/db/control-db.ts` et `server/db/tenant-db.ts` (`getTenantDb(tenantId)`, cache de pools borné). C'est le seul point d'accès aux bases.
- `server/crypto/` :
  - chiffrement par enveloppe (AES-256-GCM, DEK par tenant enveloppée par une KEK) ;
  - interface `KeyManager` avec une implémentation `LocalDevKeyManager` (développement uniquement) et une implémentation KMS/Vault à configurer en production ;
  - index aveugle HMAC pour la recherche par nom.
- Colonnes chiffrées : identité patient et textes libres cliniques. Types Drizzle personnalisés `encryptedText` et `blindIndex`.
- Job pg-boss `tenant.provision`, idempotent, avec les étapes et l'état `provisioning_failed` de la règle 04.
- Script `pnpm db:migrate:tenants` (lots, verrou consultatif, reprise).
- Table `audit_event` append-only : trigger anti-`UPDATE`/`DELETE`, chaîne de hachage, droits SQL minimaux.

## Sécurité (bloquant)
- Rôle PostgreSQL par tenant, `REVOKE ALL ON DATABASE … FROM PUBLIC`, aucun accès croisé.
- Aucun secret ou mot de passe de base en clair dans le control-plane : stockés chiffrés par la KEK.

## Tests
- Intégration : provisionner deux tenants. Le rôle du tenant A ne peut pas se connecter à la base B.
- Chiffrement : aller-retour, altération du texte chiffré détectée (GCM), rotation de la KEK (ré-enveloppement des DEK) sans perte.
- Audit : un `UPDATE` sur `audit_event` échoue et la chaîne de hachage reste vérifiable.
