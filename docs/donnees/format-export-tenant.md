# Format d'export tenant (réversibilité / portabilité)

Version du schéma : `1.0.0`

Archive chiffrée (AES-256-GCM, DEK dérivée / fournie hors bande) contenant :

```
manifest.json          — métadonnées (tenantId, exportedAt, schemaVersion, checksums)
patients/*.json        — un fichier par dossier (identité + chronologie + examens + documents TipDoc)
documents-pdf/*.pdf    — PDF des documents validés / signés (si générés)
README.txt             — instructions de réimport
```

`manifest.json` (extrait) :

```json
{
  "schemaVersion": "1.0.0",
  "tenantId": "…",
  "exportedAt": "ISO-8601",
  "scope": "tenant" | "patient",
  "patientIds": ["…"],
  "files": [{ "path": "patients/CC-000184.json", "sha256": "…" }]
}
```

Réimport : le consommateur crée un tenant de test et charge les JSON via l'outil `importTenantExport` (démo / CI). Aucune donnée réelle en développement.
