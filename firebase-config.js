// ─────────────────────────────────────────────────────────────
//  STEP 1: Paste your Firebase project config here.
//  Get it from: Firebase Console → Project Settings → Your apps
// ─────────────────────────────────────────────────────────────

const firebaseConfig = {
    apiKey: 'AIzaSyAVt1oq8E7RqHx1rwZyveiz0rlydllv6Wg',
    authDomain: 'shopping-d01d2.firebaseapp.com',
    projectId: 'shopping-d01d2',
    storageBucket: 'shopping-d01d2.firebasestorage.app',
    messagingSenderId: '566033855935',
    appId: '1:566033855935:web:7d59e480649d31ef019d0a',
};

firebase.initializeApp(firebaseConfig);

// ─────────────────────────────────────────────────────────────
//  Offline-first: keep a local IndexedDB copy of the data so the
//  app works with no connection. Writes made offline are queued
//  and synced automatically once the device is back online.
//  Must run before any other Firestore call (i.e. before app.js).
// ─────────────────────────────────────────────────────────────
firebase
    .firestore()
    .enablePersistence({ synchronizeTabs: true })
    .catch((err) => {
        // failed-precondition = multiple tabs without multi-tab support;
        // unimplemented = browser lacks IndexedDB. App still works online.
        console.warn('Offline persistence unavailable:', err.code || err);
    });

// ─────────────────────────────────────────────────────────────
//  STEP 2: Add the Gmail addresses allowed to use the app.
//          All lowercase. Add up to ~10, works fine.
// ─────────────────────────────────────────────────────────────

const ALLOWED_EMAILS = [
    'teo.dragovic@gmail.com',
    'maja.rezek@gmail.com',
    'sven.dragovic@gmail.com',
];
