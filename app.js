// ─── Preact + HTM (no build tools, no separate preact/hooks import)
// Everything comes from the single standalone bundle so there is only
// one Preact instance. Importing hooks from a second URL would give
// "__H undefined" crashes because the two copies don't share state.
import {
    html,
    render,
    useState,
    useEffect,
    useRef,
    useCallback,
} from 'https://esm.sh/htm/preact/standalone';

// ─── Firebase shortcuts (loaded via compat <script> tags in index.html) ───────
const auth = firebase.auth();
const db = firebase.firestore();
const todosRef = db.collection('todos');

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ message, onDone }) {
    useEffect(() => {
        const t = setTimeout(onDone, 3000);
        return () => clearTimeout(t);
    }, [message]);

    return html`<div class="toast">${message}</div>`;
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ onSignIn }) {
    return html`
        <div class="screen">
            <div class="auth-card">
                <div class="auth-brand">
                    <span class="brand-dot"></span>
                    <h1>shared<em>list</em></h1>
                </div>
                <p class="auth-sub">A todo list for people who trust each other.</p>
                <button class="btn-google" onClick=${onSignIn}>
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                            fill="#4285F4"
                        />
                        <path
                            d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
                            fill="#34A853"
                        />
                        <path
                            d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
                            fill="#EA4335"
                        />
                    </svg>
                    Sign in with Google
                </button>
                <p class="auth-note">Only approved users can access the list.</p>
            </div>
        </div>
    `;
}

// ─── DENIED SCREEN ────────────────────────────────────────────────────────────
function DeniedScreen({ email, onSignOut }) {
    return html`
        <div class="screen">
            <div class="auth-card">
                <div class="auth-brand">
                    <span class="brand-dot red"></span>
                    <h1>access<em>denied</em></h1>
                </div>
                <p class="auth-sub">Your account isn't on the list.</p>
                <p class="denied-email">${email}</p>
                <button class="btn-outline" onClick=${onSignOut}>Sign out</button>
            </div>
        </div>
    `;
}

// ─── TODO ITEM ────────────────────────────────────────────────────────────────
function TodoItem({ todo, onToggle, onEdit, onDelete }) {
    const creator = (todo.createdBy || todo.createdByEmail || '').split(' ')[0];
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(todo.text);
    const editRef = useRef(null);
    // Leaving edit mode unmounts the focused input, which fires a trailing
    // blur. This flag makes sure Enter/Escape finalize once and that stray
    // blur is ignored (otherwise Enter would write twice and Escape would
    // commit the text it was meant to discard).
    const finalizedRef = useRef(false);

    // Focus + select the text when entering edit mode.
    useEffect(() => {
        if (editing && editRef.current) {
            editRef.current.focus();
            editRef.current.select();
        }
    }, [editing]);

    const startEdit = () => {
        finalizedRef.current = false;
        setDraft(todo.text);
        setEditing(true);
    };

    // save=true commits the draft; save=false discards it.
    const finish = (save) => {
        if (finalizedRef.current) return;
        finalizedRef.current = true;
        const next = draft.trim();
        if (save && next && next !== todo.text) onEdit(todo.id, next);
        else setDraft(todo.text); // revert display if discarded/empty/unchanged
        setEditing(false);
    };

    const onKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            finish(true);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            finish(false);
        }
    };

    return html`
        <li class=${`todo-item${todo.done ? ' done' : ''}${editing ? ' editing' : ''}`}>
            <div
                class=${`todo-check${todo.done ? ' checked' : ''}`}
                onClick=${() => onToggle(todo.id, todo.done)}
            ></div>
            ${editing
                ? html`<input
                      ref=${editRef}
                      class="todo-edit-input"
                      type="text"
                      maxlength="120"
                      autocomplete="off"
                      value=${draft}
                      onInput=${(e) => setDraft(e.target.value)}
                      onKeyDown=${onKeyDown}
                      onBlur=${() => finish(true)}
                  />`
                : html`<span class="todo-text" title="Click to edit" onClick=${startEdit}>
                      ${todo.text}
                  </span>`}
            <span class="todo-meta">${creator}</span>
            <button class="todo-delete" title="Delete" onClick=${() => onDelete(todo.id)}>×</button>
        </li>
    `;
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function App() {
    const [authState, setAuthState] = useState('loading'); // loading | auth | denied | app
    const [user, setUser] = useState(null);
    const [todos, setTodos] = useState([]);
    const [inputVal, setInputVal] = useState('');
    const [toast, setToast] = useState(null);
    const [online, setOnline] = useState(navigator.onLine);
    const [pending, setPending] = useState(false); // unsynced local writes
    const inputRef = useRef(null);
    const unsubRef = useRef(null);

    const showToast = (msg) => setToast(msg);

    // ── Online / offline listener ──────────────────────────────
    useEffect(() => {
        const goOnline = () => {
            setOnline(true);
            showToast('Back online — syncing');
        };
        const goOffline = () => {
            setOnline(false);
            showToast('Offline — changes saved locally');
        };
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    // ── Auth listener ──────────────────────────────────────────
    useEffect(() => {
        const unsub = auth.onAuthStateChanged((firebaseUser) => {
            if (!firebaseUser) {
                setAuthState('auth');
                setUser(null);
                if (unsubRef.current) {
                    unsubRef.current();
                    unsubRef.current = null;
                }
                return;
            }
            if (!ALLOWED_EMAILS.includes(firebaseUser.email.toLowerCase())) {
                setAuthState('denied');
                setUser(firebaseUser);
                return;
            }
            setUser(firebaseUser);
            setAuthState('app');
        });
        return unsub;
    }, []);

    // ── Firestore subscription ─────────────────────────────────
    useEffect(() => {
        if (authState !== 'app') return;

        if (unsubRef.current) unsubRef.current();
        unsubRef.current = todosRef.orderBy('createdAt', 'asc').onSnapshot(
            { includeMetadataChanges: true },
            (snap) => {
                setTodos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
                // Local writes not yet acknowledged by the server = still syncing.
                setPending(snap.metadata.hasPendingWrites);
            },
            (err) => {
                console.error(err);
                showToast('Error loading todos');
            }
        );

        return () => {
            if (unsubRef.current) unsubRef.current();
        };
    }, [authState]);

    // ── Actions ────────────────────────────────────────────────
    const signIn = useCallback(() => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch((e) => showToast(e.message));
    }, []);

    const signOut = useCallback(() => auth.signOut(), []);

    const addTodo = useCallback(async () => {
        const text = inputVal.trim();
        if (!text) return;
        const snap = await todosRef.get();
        if (snap.size >= 30) {
            showToast('List is full (30 item max)');
            return;
        }
        setInputVal('');
        try {
            await todosRef.add({
                text,
                done: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: user.displayName || user.email,
                createdByEmail: user.email,
            });
        } catch (e) {
            showToast('Could not add item');
            console.error(e);
        }
    }, [inputVal, user]);

    const toggleTodo = useCallback((id, done) => {
        todosRef.doc(id).update({ done: !done });
    }, []);

    const editTodo = useCallback((id, text) => {
        todosRef.doc(id).update({ text });
    }, []);

    const deleteTodo = useCallback((id) => {
        todosRef.doc(id).delete();
    }, []);

    const clearDone = useCallback(async () => {
        const snap = await todosRef.where('done', '==', true).get();
        const batch = db.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
    }, []);

    const handleKeyDown = useCallback(
        (e) => {
            if (e.key === 'Enter') addTodo();
        },
        [addTodo]
    );

    // ── Derived ────────────────────────────────────────────────
    const active = todos.filter((t) => !t.done);
    const done = todos.filter((t) => t.done);

    const netStatus = !online ? 'offline' : pending ? 'syncing' : 'online';
    const netLabel = { offline: 'offline', syncing: 'syncing…', online: 'online' }[netStatus];

    // ── Render ─────────────────────────────────────────────────
    if (authState === 'loading')
        return html`
            <div class="screen">
                <div class="auth-card" style="align-items:center">
                    <span class="brand-dot"></span>
                </div>
            </div>
        `;

    if (authState === 'auth') return html`<${AuthScreen} onSignIn=${signIn} />`;

    if (authState === 'denied')
        return html` <${DeniedScreen} email=${user?.email} onSignOut=${signOut} /> `;

    // ── Full app ───────────────────────────────────────────────
    return html`
        <div class="screen app-layout">
            <header>
                <div class="header-left">
                    <span class="brand-dot"></span>
                    <span class="header-title">shared<em>list</em></span>
                </div>
                <div class="header-right">
                    <span class=${`net-status ${netStatus}`} title=${netLabel}>
                        <span class="net-dot"></span>
                        <span class="net-label">${netLabel}</span>
                    </span>
                    ${user?.photoURL && html`<img class="avatar" src=${user.photoURL} alt="" />`}
                    <span class="user-name">${user?.displayName || user?.email}</span>
                    <button class="btn-sm" onClick=${signOut}>out</button>
                </div>
            </header>

            <main>
                <div class="list-meta">
                    <span class="todo-count">${active.length} active · ${done.length} done</span>
                </div>

                <div class="add-row">
                    <input
                        ref=${inputRef}
                        type="text"
                        class="new-todo-input"
                        placeholder="Add a task…"
                        maxlength="120"
                        autocomplete="off"
                        value=${inputVal}
                        onInput=${(e) => setInputVal(e.target.value)}
                        onKeyDown=${handleKeyDown}
                    />
                    <button class="add-btn" onClick=${addTodo}>+</button>
                </div>

                <ul class="todo-list">
                    ${todos.length === 0
                        ? html`<li class="todo-empty">The list is empty.</li>`
                        : todos.map(
                              (todo) => html`
                                  <${TodoItem}
                                      key=${todo.id}
                                      todo=${todo}
                                      onToggle=${toggleTodo}
                                      onEdit=${editTodo}
                                      onDelete=${deleteTodo}
                                  />
                              `
                          )}
                </ul>

                <div class="list-footer">
                    <button class="btn-ghost" onClick=${clearDone}>Clear completed</button>
                </div>
            </main>

            ${toast && html` <${Toast} message=${toast} onDone=${() => setToast(null)} /> `}
        </div>
    `;
}

// ─── Mount ────────────────────────────────────────────────────────────────────
render(html`<${App} />`, document.getElementById('app'));
