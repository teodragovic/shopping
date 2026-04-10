# sharedlist — setup guide

A minimal shared todo app for 2–3 people. Runs on GitHub Pages + Firebase (both free).

## Files
```
index.html          — app shell
style.css           — styles
app.js              — logic
firebase-config.js  — YOUR config (edit this)
```

---

## 1. Create a Firebase project (free)

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project**, give it a name, disable Google Analytics (optional), create.

---

## 2. Enable Google Sign-In

1. In Firebase Console → **Authentication** → **Sign-in method**
2. Enable **Google** → save.

---

## 3. Create Firestore database

1. Firebase Console → **Firestore Database** → **Create database**
2. Choose **Start in production mode** → pick a region → done.
3. Go to **Rules** tab and replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /todos/{doc} {
      allow read, write: if request.auth != null
        && request.auth.token.email in [
          "user1@gmail.com",
          "user2@gmail.com",
          "user3@gmail.com"
        ];
    }
  }
}
```

Replace the emails with your actual ones. This adds server-side security on top of the client-side allowlist.

---

## 4. Add your web app

1. Firebase Console → Project Overview → click **</>** (Web)
2. Register the app (no need for Firebase Hosting)
3. Copy the `firebaseConfig` object shown.

---

## 5. Edit firebase-config.js

Paste the config and add your allowed emails:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  // ...
};

const ALLOWED_EMAILS = [
  "you@gmail.com",
  "friend@gmail.com",
];
```

---

## 6. Add your domain to Firebase Auth

1. Firebase Console → Authentication → **Settings** → **Authorized domains**
2. Add: `YOUR_USERNAME.github.io`

---

## 7. Deploy to GitHub Pages

```bash
# Create a repo and push all 4 files to the main branch
git init
git add .
git commit -m "init"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Then in GitHub → repo Settings → **Pages** → Source: `main` branch, `/ (root)` → Save.

Your app will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO/`

---

## Firebase free tier limits (Spark plan)

| What | Free limit |
|------|-----------|
| Firestore reads | 50,000/day |
| Firestore writes | 20,000/day |
| Auth users | Unlimited |

For 2–3 people sharing 30 items, you'll never come close to any limit.
