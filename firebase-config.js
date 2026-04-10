// ─────────────────────────────────────────────────────────────
//  STEP 1: Paste your Firebase project config here.
//  Get it from: Firebase Console → Project Settings → Your apps
// ─────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey: "AIzaSyAVt1oq8E7RqHx1rwZyveiz0rlydllv6Wg",
  authDomain: "shopping-d01d2.firebaseapp.com",
  projectId: "shopping-d01d2",
  storageBucket: "shopping-d01d2.firebasestorage.app",
  messagingSenderId: "566033855935",
  appId: "1:566033855935:web:7d59e480649d31ef019d0a"
};

firebase.initializeApp(firebaseConfig);

// ─────────────────────────────────────────────────────────────
//  STEP 2: Add the Gmail addresses allowed to use the app.
//          All lowercase. Add up to ~10, works fine.
// ─────────────────────────────────────────────────────────────

const ALLOWED_EMAILS = [
  "teo.dragovic@gmail.com",
  "majarezek@gmail.com",
  "svendragovic@gmail.com",
];
