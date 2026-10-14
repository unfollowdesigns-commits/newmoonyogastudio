# Guide de la propriétaire — New Moon Yoga Studio

Tout se passe dans l'application, onglet **Espace équipe**. Vous n'avez jamais besoin d'ouvrir autre chose.

- **Appli clientes** : `https://newmoonyogastudio.vercel.app` (à partager sur Instagram, WhatsApp, en bio)
- **Espace équipe** : la même adresse + `/staff` → `https://newmoonyogastudio.vercel.app/staff`

> Astuce : sur votre téléphone, ouvrez l'Espace équipe puis « Partager → Sur l'écran d'accueil ».
> Il s'ouvre ensuite comme une vraie appli.

---

## 1. Se connecter

1. Ouvrez l'Espace équipe → **Se connecter**.
2. Tapez votre email → **Recevoir mon code**.
3. Ouvrez l'email « Votre code New Moon », recopiez les 6 chiffres → **Valider**.

Pas de mot de passe à retenir. Le téléphone reste connecté.

## 2. Comment une cliente s'inscrit (ce qu'elle voit)

1. Elle ouvre le lien, choisit un cours, appuie sur **Réserver ma place**.
2. La première fois seulement : email → code à 6 chiffres → prénom, nom, numéro WhatsApp, case d'accord.
3. C'est réservé. Les fois suivantes : **2 appuis** (le cours, puis « Réserver »).

Si le cours est complet, elle peut rejoindre la **liste d'attente**. Dès qu'une place se libère, la première
de la liste est inscrite automatiquement.

## 3. Où sont mes clientes ? → onglet **Membres**

- Toutes les personnes inscrites : nom, **WhatsApp** (touchez le numéro pour lui écrire), email, date
  d'inscription, nombre de cours suivis, absences, annulations tardives, cours à venir.
- La barre de recherche trouve un nom, un numéro ou un email.
- **Télécharger les membres (Excel)** : la liste complète, s'ouvre dans Excel ou Google Sheets.
- **Télécharger les réservations (Excel)** : toutes les réservations des 3 derniers mois et du mois à venir.
- **Exclure** : pour une cliente qui ne prévient pas de son absence (votre règle). Ses réservations à venir sont
  annulées (sa place va à la liste d'attente) et elle ne peut plus réserver. **Réintégrer** annule l'exclusion.

> Faites ces deux téléchargements **une fois par mois** et gardez-les (Google Drive par exemple) : c'est votre copie de sécurité.

## 4. Le jour du cours → onglet **Cours & listes**

1. Choisissez le jour, touchez le cours : la liste des inscrites s'affiche (elle se met à jour toute seule).
2. À l'arrivée de chaque élève, touchez le **✓** à côté de son nom.
3. Le bouton **⋯** permet : *Absente*, *Annulation tardive*, *Annuler (sans frais)*.
4. **Liste d'attente** : *Inscrire* fait passer quelqu'un dans le cours (s'il reste une place).
5. **Réservation invitée** : pour une amie venue sans compte → son nom → *Ajouter*.

À droite (ou en bas sur téléphone) : **Annulations tardives**. Touchez *Offrir les frais* si vous ne voulez
pas les faire payer.

## 5. Ajouter Rania ou l'accueil → onglet **Équipe**

1. Tapez son email.
2. Choisissez le rôle :
   - **Professeur** : voit les cours et les listes, fait l'appel. Choisissez aussi « Ses cours » (ex. Rania Sam).
   - **Accueil** : pareil, pour la réception.
   - **Propriétaire** : accès complet (à donner avec prudence).
3. **Donner l'accès**. Si la personne n'a pas encore de compte, l'accès s'active dès sa première connexion
   avec cet email.

Pour retirer un accès : **Retirer l'accès** à côté de son nom.

## 6. Les règles → onglet **Règles**

- **Délai d'annulation** : 2 heures avant la séance (votre règle actuelle)
- **Frais d'annulation tardive** : 0 DT (pas de frais : votre règle est l'exclusion en cas d'absence non signalée)
- **Inscription auto depuis la liste d'attente** (activé conseillé)

Les clientes voient ces règles dans leur profil.

## 7. Pleine lune et tarifs

- L'appli calcule toute seule la date de la **prochaine pleine lune** et l'affiche en haut du planning, avec un
  bouton « Réserver sur WhatsApp ». Les clientes vous écrivent directement pour l'événement.
- Vos **tarifs** (séance d'essai, carnets, accès illimité) sont affichés dans l'onglet Profil des clientes.
  Le paiement se fait toujours au studio.

## 8. Matériel et heures

- **Salles & matériel** : nombre de tapis, briques, bolsters, hamacs… et combien sont en réparation.
  Un message rouge prévient s'il manque du matériel pour le nombre d'inscrites.
- **Heures** : chaque membre de l'équipe pointe *Début de service* / *Fin de service*. Le tableau
  montre les heures des 7 derniers jours.

## 9. Modifier le planning

Le planning (jours, heures, cours) est enregistré dans la base de données. Pour ajouter, déplacer ou
supprimer un cours régulier, ou annuler une date précise (jour férié, vacances), envoyez simplement un
message à votre développeur·euse : c'est une modification de 2 minutes.

## 10. Données personnelles (loi tunisienne n° 2004-63)

- Chaque cliente donne son accord en cochant la case à l'inscription.
- Si une cliente demande la suppression de ses données : prévenez votre développeur·euse, qui supprime
  son compte (ses réservations passées restent anonymes dans les statistiques).
- Ne partagez pas les fichiers Excel en dehors de l'équipe.

## En cas de souci

| Problème | Solution |
|---|---|
| Une cliente ne reçoit pas le code | Vérifier ses **spams**, puis « Renvoyer le code ». Vérifier l'orthographe de l'email. |
| « Trop de tentatives » | Attendre une minute et réessayer. |
| L'Espace équipe dit « Espace réservé » | La personne n'a pas été ajoutée dans **Équipe**, ou elle utilise un autre email. |
| Le site est lent ou ne charge plus après de longues vacances | Se connecter sur supabase.com → le projet → **Restore**. |
