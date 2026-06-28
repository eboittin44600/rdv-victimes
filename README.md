# Plateforme RDV Victimes — Barreau de Saint-Nazaire

Système de prise de rendez-vous gratuit en ligne pour les victimes de violences.

---

## Architecture

- **Frontend + API** : Next.js 14 → déployé sur **Vercel** (gratuit)
- **Base de données** : PostgreSQL → hébergé sur **Supabase** (gratuit, région Europe)
- **SMS** : Twilio (quelques centimes par SMS)
- **E-mail** : Brevo / SMTP (forfait gratuit jusqu'à 300 emails/jour)

---

## Déploiement pas à pas (sans ligne de commande)

### Étape 1 — Créer la base de données sur Supabase

1. Aller sur [supabase.com](https://supabase.com) → créer un compte gratuit
2. Créer un nouveau projet → choisir la région **Europe West (Frankfurt)**
3. Noter le mot de passe de la base (vous en aurez besoin)
4. Dans le dashboard Supabase → **Settings** → **Database**
5. Copier les deux URLs :
   - `Transaction pooler` → c'est votre `DATABASE_URL`
   - `Session pooler` → c'est votre `DIRECT_URL`

### Étape 2 — Déployer sur Vercel

1. Aller sur [vercel.com](https://vercel.com) → créer un compte (avec GitHub)
2. Créer un nouveau repository GitHub et y pousser ce code
3. Sur Vercel → **Add New Project** → importer votre repository
4. Dans **Environment Variables**, ajouter toutes les variables du fichier `.env.example`
5. Cliquer **Deploy**

### Étape 3 — Initialiser la base de données

Après le premier déploiement :

1. Dans Vercel → votre projet → **Functions** → chercher `db:push`
2. Ou dans le dashboard Supabase → **SQL Editor** → coller et exécuter le contenu de `prisma/schema.prisma`

> Alternative : dans Supabase → **SQL Editor**, utiliser le bouton "Run migrations"

### Étape 4 — Configurer Twilio (SMS)

1. Créer un compte sur [twilio.com](https://twilio.com)
2. Vérifier votre numéro de téléphone
3. Acheter un numéro français (+33)
4. Copier `Account SID`, `Auth Token`, et le numéro dans vos variables Vercel

### Étape 5 — Configurer Brevo (e-mails)

1. Créer un compte sur [brevo.com](https://brevo.com)
2. **SMTP & API** → **SMTP** → activer et copier les identifiants
3. Mettre à jour les variables `SMTP_*` dans Vercel

### Étape 6 — Ajouter le premier avocat admin

Dans Supabase → **Table Editor** → table `avocats` → **Insert row** :
```
nom: Boittin
prenom: Etienne  
email: etienne.boittin@avocatlantic.fr
actif: true
visioOk: true
```

---

## Structure des fichiers

```
rdv-victimes/
├── prisma/
│   └── schema.prisma          ← Schéma de base de données
├── src/
│   ├── app/
│   │   ├── victime/
│   │   │   ├── page.tsx       ← Portail victime (formulaire + choix parcours)
│   │   │   ├── choisir-avocat/ ← Liste des avocats (parcours A)
│   │   │   └── confirmation/  ← Page de confirmation
│   │   ├── avocat/            ← Espace avocat (créneaux, RDV)
│   │   ├── admin/             ← Dashboard administrateur
│   │   └── api/
│   │       ├── bookings/      ← POST : créer un RDV
│   │       │   └── cancel/    ← POST : annuler, DELETE : RGPD
│   │       ├── slots/         ← GET : créneaux disponibles
│   │       ├── lawyers/       ← Gestion des créneaux avocat
│   │       ├── admin/stats/   ← Statistiques dashboard
│   │       └── cron/          ← CRON : RGPD + rappels SMS
│   └── lib/
│       ├── db.ts              ← Client Prisma + algo tour de rôle (parcours B)
│       ├── auth.ts            ← JWT + lien magique
│       ├── crypto.ts          ← Chiffrement AES-256 données victimes
│       └── notifications.ts   ← SMS Twilio + e-mails Brevo
├── .env.example               ← Template variables d'environnement
├── vercel.json                ← CRON + headers sécurité
└── package.json
```

---

## Variables d'environnement requises

Voir `.env.example` pour la liste complète.

Les variables à configurer en priorité :
- `DATABASE_URL` et `DIRECT_URL` (Supabase)
- `JWT_SECRET` (générer avec : `openssl rand -hex 32`)
- `ENCRYPTION_KEY` (générer avec : `openssl rand -hex 32`)
- `TWILIO_*` (SMS)
- `SMTP_*` (e-mails)

---

## Sécurité

- Données personnelles des victimes chiffrées AES-256 en base
- HTTPS enforced (Vercel gère le certificat TLS automatiquement)
- Suppression automatique RGPD 30 jours après chaque RDV (CRON quotidien)
- Authentification avocats par lien magique (sans mot de passe)
- Protection race condition sur les créneaux (transaction PostgreSQL)

---

## Nom de domaine (quand vous l'aurez)

1. Acheter le domaine sur [OVH](https://ovh.com) ou [Gandi](https://gandi.net)
2. Dans Vercel → votre projet → **Settings** → **Domains** → ajouter votre domaine
3. Vercel affiche les enregistrements DNS à configurer chez votre registrar
4. Le certificat TLS (HTTPS) est généré automatiquement par Vercel

Suggestion de nom : `rdv-victimes-saintnazaire.fr` ou `victimes.barreau-saintnazaire.fr`

---

## Support

Pour toute question technique sur ce code, conserver ce dossier de projet
et le soumettre à un développeur ou à une agence web locale.
44
