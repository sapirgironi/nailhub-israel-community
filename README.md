# Nailhub Israel Community

## Supabase authentication configuration

For local development, set `VITE_SUPABASE_URL` and either
`VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY` in `.env`.
The shared client prefers the publishable key when both are set. Server
functions require `SUPABASE_URL` and either `SUPABASE_PUBLISHABLE_KEY` or
`SUPABASE_ANON_KEY` for the same project. Privileged server operations
separately require that project's `SUPABASE_SERVICE_ROLE_KEY`; never expose
service-role or secret keys to the browser. Restart the dev server after
changing `.env`. Ensure the selected database has the required migrations.

OAuth defaults to the existing Lovable flow. Set `VITE_SUPABASE_OAUTH_MODE`
to `supabase` only after configuring the required providers and permitted
redirect URLs in the selected Supabase project. Both the main login and client
request flow then use that project's Supabase Auth. If Apple is temporarily
unavailable, set `VITE_APPLE_SIGNIN_ENABLED=false` to hide its login button;
the default retains Apple sign-in.

If email confirmation is enabled, signup may return no session: the user must
confirm the email before signing in. The signup trigger creates the profile;
profile reads require an authenticated session and the owner/admin RLS policy.
Check the Supabase project configuration, deployed migrations and Auth logs
when a request fails; do not log passwords, API keys or session tokens.

For machines under memory pressure, `npm run build:low-memory` runs the same
production build with a bounded Node heap and reduced native concurrency.
The standard `npm run build` remains unchanged.

## Local writing, pricing and comment review

Post drafts and feed suggestions use local category templates; they do not
analyze images or call a model. Templates are available to professional
accounts without a premium subscription, while publication permissions remain
unchanged. The pricing calculator uses entered material costs, package
quantities and hourly rates; length and decoration time additions are estimates.
Comment publication remains server-mediated, validates plain text and checks
account sanctions, post visibility and the database blocked-word list. It does
not perform semantic moderation: wording absent from that list may pass, so
maintainers must manage the list and continue community oversight.

## Cloudinary configuration

Copy `.env.example` to `.env` for local development and set the Cloudinary cloud
name, API key and API secret there. Store these values in server-side deployment
environment variables for deployed environments; never use a `VITE_` prefix for
the secret. The authenticated server function uploads images for active accounts
and keeps Cloudinary credentials on the server. Local `.env` files are ignored by
Git. A secret previously committed to Git must be rotated in Cloudinary even
after the file is removed from tracking.

## Database migration reconciliation and isolated checks

The migration journal is authoritative for the Drizzle migration runner; the
presence of a numbered SQL file alone does not mean that it runs. The journal
continues after `0026` with `0029`, `0033`–`0042`. Migration `0033`
reconciles the final feed and follow changes represented by `0027`, `0028`,
and `0030`–`0032`, which are intentionally not separate journal entries.
`0029` must run before `0033`. Migration `0034` protects post moderation and
creation-time fields; its compatibility with the definer-owned likes trigger
must be checked with the actual deployment roles. `0035` adds private academy
courses, a narrow public projection, and an import ledger.
`0036` restores the signup trigger function from `0003` on destinations where
it has drifted; it does not change existing profiles or roles.
`0037` enables profile RLS, revokes dangerous table privileges from client
roles, and revokes those privileges from the executing role's public-schema
default privileges. Default privileges belong to each creator role: review
and revoke equivalent grants for other creators separately with appropriate
authority. In particular, the inspected target also has such grants for
`supabase_admin`, which `postgres` cannot change.
`0038` adds restrictive insert policies for posts and stories: only profiles
with the nail technician or instructor role may publish. Existing read, like,
save and owner policies remain in force.
`0039` adds the guarded client-request function and a private rate-limit table;
it does not revoke existing direct client access to requests or deletions.
`0040` adds bounded followed-feed and image-visibility queries, database-side
blocked-word matching, and an administrator-checked supplier search and balance
lookup. The corresponding application changes require this migration; deploy
them together after independently reviewing the target's migration history.
`0041` disables the existing direct sticker-file deletion policy and adds a
restrictive delete policy for the sticker bucket, even when other permissive
policies grant deletion. A restrictive update policy also prevents sticker
objects from being moved or overwritten to bypass the deletion restriction.
Other buckets retain their existing policies and
the server's RLS-bypassing service role can still delete stickers. `0042`
revokes direct request inserts and content deletions. Apply both only after the
server-mediated code is deployed and verified. `0041` requires a database role
authorized to alter and create `storage.objects` policies; a service API key
does not provide this SQL authority. Verify the supported execution path on the
specific hosted project without changing ownership of managed tables. Both late
migrations fail unless the migration transaction explicitly sets
`nailhub.lockdown_approved` to `yes`;
this operator safeguard does not verify that deployment has occurred.
On the inspected target, four additional broad authenticated Storage policies
remain in place. `0041` limits sticker deletion and updates but does not fix
their broader read, upload, update or non-sticker delete access. The separate
pre-deployment security procedure below narrows those four reviewed policies.
The standard migrator attempts every pending entry and has no pause after `0040`;
without the setting, the late guard fails and the transaction rolls back. A
reviewed, journal-aware staged procedure is still required before production.
Image batches are capped at four and fall back to individual reads when a
batch would exceed the response size budget. Story stickers use short-lived
batched storage signatures and local blobs for canvas export.
Deploy the additive migrations before the corresponding application code, then
verify that code before applying the late access restrictions. Until the late
restrictions are applied, direct client access is not locked down.
Reconcile the existing target migration history first; never run the migrator
against that target without a separately approved deployment plan.

### Guarded staged migration runner

`scripts/staged-migrations.mjs` is pinned to the reviewed migration hashes,
timestamps, project identities and catalog fingerprints. It preserves the four
Supabase history rows and validates every Drizzle row in order. Stage A creates
the baseline and applies `0039`–`0040` in one transaction. Stage B verifies
that exact state, sets the lockdown flag locally and applies `0041`–`0042` and
their journal rows in one transaction. A mismatch or SQL error rolls back the
entire stage. It does not use the normal all-pending Drizzle migrator.

Production execution is blocked unless the four known Storage policies have
their exact reviewed disabled definitions, and while unsafe client default
privileges from other creators, existing client `MAINTAIN` grants or a missing
private `story-stickers` bucket remain. The owner approved retaining the hosted
`supabase_admin` default table grants to `anon` and `authenticated` in `public`;
the runner explicitly warns about this exception and still checks global and
`PUBLIC` grants and grants from other creators. This does not revoke those
privileges or remove their risk for future objects created by `supabase_admin`.
Review such objects and extension placement separately. Resolve and review other
blockers with approval; the runner does not change them. Other unreviewed schema or
policy changes fail its pinned fingerprint. The test target intentionally
allows the known synthetic exposure to exercise the restrictive policies.
These checks do not replace a complete security review.

#### Separate pre-deployment security procedure

`scripts/predeploy-storage-security.sql` is an independently approved security
procedure, not a Drizzle migration: it neither modifies the Drizzle journal nor
applies `0039`–`0042`. Before stage A, and only after verifying a current
database and Storage backup and reviewing effects on the deployed
application, the authorized SQL operator can run the **complete file in one
database transaction**, in a single SQL session:

1. Begin the transaction and set
   `SET LOCAL nailhub.predeploy_security_approved = 'yes';`.
2. Execute the entire file without splitting it into separate transactions.
3. Commit only if every statement succeeded; otherwise roll back the transaction.

For example, in the Supabase SQL Editor, submit one SQL statement batch
containing `BEGIN;`, the `SET LOCAL` statement above, the entire file contents,
and `COMMIT;` in that order. Confirm that the editor uses one session and
transaction for the complete batch. On an error, ensure the transaction is
rolled back; never run the file's individual statements separately. A Storage
service API key alone does not grant SQL authority. The executing database role
must have the necessary authority over the reviewed policies and grants.
For example, the following PowerShell command copies the complete transaction
batch to the clipboard for pasting into the correct project's SQL Editor:

```powershell
@('BEGIN;', "SET LOCAL nailhub.predeploy_security_approved = 'yes';", (Get-Content -Raw -ErrorAction Stop scripts\predeploy-storage-security.sql), 'COMMIT;') -join "`n" | Set-Clipboard
```

The procedure checks the original or already-disabled definitions of the four
reviewed policies before setting them to false, creates the private
`story-stickers` bucket if absent, rejects an existing public or mismatched
bucket, and revokes and verifies effective client `MAINTAIN` privileges on
existing public tables. It also revokes dangerous public-schema default grants
for objects created by `postgres`, but **does not change** defaults owned by
`supabase_admin` or another creator. `postgres` cannot change the managed
`supabase_admin` defaults, which remain in place under the approved exception.
Do not change managed-role ownership or assume the exception removes the risk.
Changing these policies can affect existing clients, so verify all required
Storage operations before any production execution. This procedure was tested
on the test project inside a transaction that was rolled back.

Use the session-mode connection URL for the selected project, provided through
`NAILHUB_MIGRATION_DATABASE_URL`, and a trusted Supabase root certificate via
`NODE_EXTRA_CA_CERTS`. Download the certificate from that project's database
settings; do not commit credentials or paste them into chat. TLS hostname and
certificate verification must remain enabled.

After addressing the blockers, pause writes and run the read-only preflight:

```powershell
node scripts\staged-migrations.mjs --target=production --stage=a --check
```

Only after explicit approval, verifying the backup and a successful preflight,
execute stage A. The preferred option requires a backup with verified restoration:

```powershell
node scripts\staged-migrations.mjs --target=production --stage=a --confirm=production-a --backup-verified --writes-paused
```

The owner may instead explicitly accept the risk of an unverified restore after
checking backup integrity. In that case use **both** `--backup-integrity-verified`
and `--restore-risk-accepted` in place of `--backup-verified`. The local backup
previously checked has not passed a full restore and does not include the Vault
key or project configuration; integrity checks do not prove recoverability.

Deploy and verify the corresponding server code before the second stage.
With a valid backup and writes paused again, use the read-only preflight and
then, only after explicit approval, execute:

```powershell
node scripts\staged-migrations.mjs --target=production --stage=b --check
node scripts\staged-migrations.mjs --target=production --stage=b --confirm=production-b --backup-verified --writes-paused --code-verified
```

The flags are operator assertions, not proof of backup, restoration, write pause
or code deployment. The runner is tied to the reviewed catalog and migration files; if
they change, re-review and re-test the fingerprints rather than bypassing them.
It serializes other instances of this runner but cannot stop unrelated SQL or
other migrators, so the maintenance window must prevent concurrent changes.

Public requests use the Vercel-provided `x-vercel-forwarded-for` address and
the server-side service-role key to derive keyed hashes, never raw IP addresses.
The limit is five accepted requests per source in a rolling hour; duplicate
requests from the same source in that window are rejected. Expired rate records are removed in
small batches on subsequent submissions, so a period with no submissions can
leave expired hashes in the database until traffic resumes. Outside Vercel,
production requests fail closed unless a trusted source is explicitly designed
and implemented; local development shares a single test source. Shared network
addresses share the limit. Test the actual Vercel proxy and isolated Supabase
storage and authorization configuration before deployment.

The feed repair represented by `0030`–`0032` was previously applied manually
to the existing database without Drizzle journal records, and also added a
duplicate `posts_safe_text` trigger. `0033` removes that duplicate while
retaining `validate_plain_text`. The manual change is not proof that any
particular Drizzle journal entry was applied.

Run `npm run test:database` to test a clean in-memory PGlite database, a
simulation of that manual feed repair, and a signup-function drift upgrade,
sequentially. The script models journal
timestamps and hashes but does not execute the actual Drizzle PostgreSQL
migrator. Its mock auth, storage and default privileges are approximations:
these checks do not replace integration tests against an isolated Supabase
project with the real Auth, PostgREST, storage, server functions and roles.

Before deploying, take and verify a restorable backup, inspect the target's
actual migration journal timestamps, schema, existing `client_requests`
objects, policies, ownership and data against the new constraints. Check for
other out-of-band changes and later migration timestamps. Resolve any
discrepancies explicitly rather than inserting journal records to skip SQL.
Exercise the actual PostgreSQL migrator and critical CRUD/RLS workflows on an
isolated copy first; do not apply the proposed migrations to a live project
until those checks and a deployment and rollback plan are approved.
Pasting SQL into the Supabase SQL Editor does not itself record a Drizzle
migration; in particular, `0029` and `0035` cannot simply be run twice.
Reconcile migration history using a reviewed deployment procedure, not
unverified manual journal entries.

When moving to another Supabase project, the database export is only a
point-in-time snapshot. It does not contain storage file bytes, provider
configuration, project API keys, or server secrets. Preserve storage paths and
access policies when copying files, and reconfigure authentication providers
and deployment variables before switching. Users must sign in again because
sessions are project-specific. Compare the destination's existing schema,
signup trigger and grants with the source; applying these migrations alone
does not reconcile every possible difference. Test the selective account and
data restore with the actual destination roles, then coordinate a write pause
and a current final export before switching traffic.

## Academy course storage

The proposed server-backed academy requires `0035`. On first use per account,
the browser backs up its existing local course data, then imports it as private
drafts. The server import ledger prevents old local copies from overwriting or
resurrecting server courses. Failed imports leave the backup in the browser
and are retried; they do not report success. Each browser with existing data
must be opened by its owner to import its own local courses. Backup keys remain
in local storage; clearing browser data also deletes those backups.

Publication requires a separate confirmation and makes a restricted course
page available to anyone with its link. The projection omits telephone numbers,
pricing calculations and instructor lesson plans. Uploaded course images are
stored in the course data and are visible when the page is published. An
isolated Supabase integration test is required before deploying this behavior.

import React, { useState } from 'react';

import {

Sparkles,

Search,

MapPin,

Phone,

ShieldCheck,

UserCheck,

Users,

User,

Layers,

Check,

ArrowRight,

SlidersHorizontal,

X

} from 'lucide-react';

// ==========================================

// 1. הגדרות תפקידים ותוויות (Constants & Roles)

// ==========================================

export const ROLES = {

NAIL_TECH: {

    id: 'nail_tech',

    label: 'בונת ציפורניים ומניקוריסטית',

    color: 'bg-rose-50 text-rose-700 border-rose-200'

},

INSTRUCTOR: {

    id: 'instructor',

    label: 'מדריכה מוסמכת ואקדמיה',

    color: 'bg-amber-50 text-amber-700 border-amber-200'

},

SUPPLIER: {

    id: 'supplier',

    label: 'ספק / מותג מורשה',

    color: 'bg-blue-50 text-blue-700 border-blue-200'

},

CLIENT: {

    id: 'client',

    label: 'לקוחה',

    color: 'bg-stone-100 text-stone-700 border-stone-200'

},

MODEL: {

    id: 'model',

    label: 'מודליסטית',

    color: 'bg-pink-50 text-pink-700 border-pink-200'

}

} as const;

type RoleKey = keyof typeof ROLES;

const ADDITIONAL_SERVICES_LIST = [

'פדיקור קוסמטי',

'פדיקור רפואי / טיפולי',

'לק ג\'ל רגליים',

'עיצוב ושיקום גבות',

'הרמת גבות',

'הרמת ריסים',

'שזירת ריסים',

'איפור קבוע',

'טיפולי פנים'

];

const SPECIALTIES_LIST = [

'מבנה אנטומי',

'בנייה באקריל',

'בנייה בג\'ל / פוליג\'ל',

'דיפ פאוודר',

'פרנץ\' מדויק',

'ציורי ציפורניים וארט',

'השלמת ציפורן שבורה',

'מיניקוריסטיות מתחילות'

];

interface Member {

id: string;

fullName: string;

businessName: string;

role: string;

city: string;

specialties: string[];

additionalServices: string[];

phone: string;

accountStatus?: 'active' | 'pending_approval';

}

export default function NailHubApp() {

// ניהול מצבי ניווט ומערכת

const [currentStep, setCurrentStep] = useState<'gate' | 'login' | 'onboarding' | 'app'>('gate');

const [activeTab, setActiveTab] = useState<'directory' | 'profile'>('directory');

const [inviteCode, setInviteCode] = useState('');

const [gateError, setGateError] = useState('');

// נתוני המשתמשת המחוברת

const [currentUser, setCurrentUser] = useState<Member | null>(null);

// טופס הרשמה

const [formData, setFormData] = useState({

    fullName: '',

    phone: '',

    city: 'קריית ביאליק',

    businessName: '',

    role: 'nail_tech',

    specialties: ['מבנה אנטומי', 'דיפ פאוודר'],

    additionalServices: ['פדיקור קוסמטי']

});

// מודאל בקשת שינוי תפקיד

const [showRoleChangeModal, setShowRoleChangeModal] = useState(false);

const [roleChangeData, setRoleChangeData] = useState({ requestedRole: 'instructor', reason: '' });

const [roleChangeSuccess, setRoleChangeSuccess] = useState(false);

// מאגר חברים לדוגמה בדירקטורי

const [members, setMembers] = useState<Member[]>([

    {

      id: '1',

      fullName: 'ספיר גירוני',

      businessName: 'ספיר גירוני ביוטי',

      role: 'nail_tech',

      city: 'קריית ביאליק',

      specialties: ['מבנה אנטומי', 'דיפ פאוודר', 'פרנץ\' מדויק'],

      additionalServices: ['פדיקור קוסמטי', 'עיצוב ושיקום גבות'],

      phone: '050-0000000',

      accountStatus: 'active'

    },

    {

      id: '2',

      fullName: 'גולן גירוני',

      businessName: 'ליליאור אספקת ציוד',

      role: 'supplier',

      city: 'קריית ביאליק',

      specialties: ['ציוד מניקור', 'אבקות דיפ'],

      additionalServices: [],

      phone: '054-3289555',

      accountStatus: 'active'

    }

]);

// פילטרים לדירקטורי

const [filterRole, setFilterRole] = useState('all');

const [searchQuery, setSearchQuery] = useState('');

// ------------------------------------------

// שלב 1: אימות שער כניסה (Invite Gate)

// ------------------------------------------

const handleVerifyInvite = (e: React.FormEvent) => {

    e.preventDefault();

    if (inviteCode.trim().toUpperCase() === 'NAILVIP') {

      setGateError('');

      setCurrentStep('onboarding');

    } else {

      setGateError('קוד הזמנה שגוי. הגישה כרגע היא למוזמנות פיילוט בלבד (קוד לדוגמה: NAILVIP)');

    }

};

// ------------------------------------------

// שלב 2: סיום הרשמה

// ------------------------------------------

const handleCompleteRegistration = (e: React.FormEvent) => {

    e.preventDefault();

    if (!formData.fullName.trim()) return alert('נא להזין שם מלא');

    const newUser: Member = {

      id: String(Date.now()),

      fullName: formData.fullName,

      businessName: formData.businessName || formData.fullName,

      role: formData.role,

      city: formData.city,

      phone: formData.phone,

      specialties: formData.specialties,

      additionalServices: formData.additionalServices,

      accountStatus: formData.role === 'supplier' ? 'pending_approval' : 'active'

    };

    setCurrentUser(newUser);

    setMembers(prev => [newUser, ...prev]);

    setCurrentStep('app');

};

// ------------------------------------------

// שלב 3: התחברות למשתמשת קיימת (Mock Login)

// ------------------------------------------

const handleLogin = (e: React.FormEvent) => {

    e.preventDefault();

    const existing = members[0];

    setCurrentUser(existing);

    setCurrentStep('app');

};

// עזר לבחירה מרובה (Toggle)

const toggleItem = (list: string[], item: string) => {

    return list.includes(item) ? list.filter(i => i !== item) : [...list, item];

};

const getRoleDetails = (roleId: string) => {

    const found = Object.values(ROLES).find(r => r.id === roleId);

    return found || ROLES.NAIL_TECH;

};

// ==========================================

// תצוגת שער הגישה (Invite Gate UI)

// ==========================================

if (currentStep === 'gate') {

    return (

      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 font-sans text-right" dir="rtl">

        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-stone-200">

          <div className="text-center mb-6">

            <div className="inline-flex items-center justify-center w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl mb-3 shadow-inner">

              <Sparkles className="w-7 h-7" />

            </div>

            <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">NailHub</h1>

            <p className="text-sm text-stone-500 mt-1">קהילת הציפורניים המקצועית של ישראל</p>

          </div>



          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-amber-900 text-sm leading-relaxed">

            האפליקציה נמצאת בשלב הרצה סגור (VIP Pilot). הכניסה באמצעות קוד גישה מורשה בלבד.

          </div>

          <form onSubmit={handleVerifyInvite} className="space-y-4">

            <div>

              <label className="block text-xs font-bold text-stone-700 mb-1">קוד הזמנה לפיילוט *</label>

              <input

                type="text"

                value={inviteCode}

                onChange={(e) => setInviteCode(e.target.value)}

                placeholder="הזיני קוד גישה (לדוגמה: NAILVIP)"

                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-900 outline-none text-center font-mono text-lg tracking-widest uppercase"

              />

            </div>

            {gateError && <p className="text-xs text-rose-600 font-medium">{gateError}</p>}

            <button

              type="submit"

              className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3.5 rounded-xl transition shadow-md"

            >

              אימות וכניסה

            </button>

          </form>

          <div className="mt-6 text-center pt-4 border-t border-stone-100">

            <button

              onClick={() => setCurrentStep('login')}

              className="text-xs text-stone-500 hover:text-stone-900 font-medium inline-flex items-center gap-1"

            >

              כבר חברה בקהילה? לחצי להתחברות

              <ArrowRight className="w-3.5 h-3.5 rotate-180" />

            </button>

          </div>

        </div>

      </div>

    );

}

// ==========================================

// תצוגת התחברות (Login Screen)

// ==========================================

if (currentStep === 'login') {

    return (

      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 font-sans text-right" dir="rtl">

        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-stone-200">

          <div className="text-center mb-6">

            <h1 className="text-2xl font-bold text-stone-900">התחברות ל-NailHub</h1>

            <p className="text-xs text-stone-500 mt-1">הזיני את פרטייך לכניסה למערכת</p>

          </div>

          <form onSubmit={handleLogin} className="space-y-4">

            <div>

              <label className="block text-xs font-bold text-stone-700 mb-1">מספר טלפון נייד</label>

              <input

                type="tel"

                defaultValue="050-0000000"

                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-900 outline-none text-left font-mono"

                dir="ltr"

              />

            </div>

            <button

              type="submit"

              className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3.5 rounded-xl transition shadow-md"

            >

              כניסה מהירה

            </button>

          </form>

          <div className="mt-6 text-center">

            <button

              onClick={() => setCurrentStep('gate')}

              className="text-xs text-stone-500 hover:text-stone-900"

            >

              חזרה לשער ההזמנות

            </button>

          </div>

        </div>

      </div>

    );

}

// ==========================================

// תצוגת אונבורדינג והרשמה (Onboarding)

// ==========================================

if (currentStep === 'onboarding') {

    return (

      <div className="min-h-screen bg-stone-50 py-10 px-4 font-sans text-right" dir="rtl">

        <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-stone-200">

          <div className="mb-6 pb-4 border-b border-stone-100">

            <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">שלב 2 מתוך 2</span>

            <h1 className="text-2xl font-black text-stone-900 mt-1">הגדרת הפרופיל המקצועי שלך</h1>

            <p className="text-xs text-stone-500 mt-1">המידע יוצג בדירקטורי החברות של NailHub</p>

          </div>

          <form onSubmit={handleCompleteRegistration} className="space-y-6">

            {/* פרטים בסיסיים */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>

                <label className="block text-xs font-bold text-stone-700 mb-1">שם מלא *</label>

                <input

                  type="text"

                  required

                  value={formData.fullName}

                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}

                  placeholder="לדוגמה: שרה ישראלי"

                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-900 outline-none text-sm"

                />

              </div>

              <div>

                <label className="block text-xs font-bold text-stone-700 mb-1">שם העסק / מותג</label>

                <input

                  type="text"

                  value={formData.businessName}

                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}

                  placeholder="לדוגמה: שרה ביוטי סטודיו"

                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-900 outline-none text-sm"

                />

              </div>

              <div>

                <label className="block text-xs font-bold text-stone-700 mb-1">עיר פעילות *</label>

                <input

                  type="text"

                  required

                  value={formData.city}

                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}

                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-900 outline-none text-sm"

                />

              </div>

              <div>

                <label className="block text-xs font-bold text-stone-700 mb-1">טלפון ליצירת קשר *</label>

                <input

                  type="tel"

                  required

                  value={formData.phone}

                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}

                  placeholder="050-0000000"

                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-900 outline-none text-sm text-left"

                  dir="ltr"

                />

              </div>

            </div>

            {/* בחירת תפקיד עיקרי */}

            <div>

              <label className="block text-xs font-bold text-stone-700 mb-2">תפקיד עיקרי בקהילה *</label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">

                {Object.values(ROLES).map((role) => (

                  <label

                    key={role.id}

                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${

                      formData.role === role.id

                        ? 'border-stone-900 bg-stone-900 text-white shadow-sm'

                        : 'border-stone-200 hover:border-stone-300 bg-stone-50/50 text-stone-800'

                    }`}

                  >

                    <input

                      type="radio"

                      name="role"

                      value={role.id}

                      checked={formData.role === role.id}

                      onChange={() => setFormData({ ...formData, role: role.id })}

                      className="hidden"

                    />

                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.role === role.id ? 'border-white' : 'border-stone-400'}`}>

                      {formData.role === role.id && <div className="w-2 h-2 rounded-full bg-white" />}

                    </div>

                    <span className="text-xs font-bold">{role.label}</span>

                  </label>

                ))}

              </div>

            </div>

            {/* תחומי התמחות */}

            <div>

              <label className="block text-xs font-bold text-stone-700 mb-2">תחומי התמחות מקצועיים</label>

              <div className="flex flex-wrap gap-2">

                {SPECIALTIES_LIST.map((spec) => {

                  const isSelected = formData.specialties.includes(spec);

                  return (

                    <button

                      type="button"

                      key={spec}

                      onClick={() => setFormData({ ...formData, specialties: toggleItem(formData.specialties, spec) })}

                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${

                        isSelected

                          ? 'bg-rose-50 text-rose-700 border-rose-300 font-bold'

                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'

                      }`}

                    >

                      {isSelected && '✓ '}

                      {spec}

                    </button>

                  );

                })}

              </div>

            </div>

            {/* שירותים נוספים */}

            <div>

              <label className="block text-xs font-bold text-stone-700 mb-2">שירותים וטיפולים נלווים בקליניקה</label>

              <div className="flex flex-wrap gap-2">

                {ADDITIONAL_SERVICES_LIST.map((srv) => {

                  const isSelected = formData.additionalServices.includes(srv);

                  return (

                    <button

                      type="button"

                      key={srv}

                      onClick={() => setFormData({ ...formData, additionalServices: toggleItem(formData.additionalServices, srv) })}

                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${

                        isSelected

                          ? 'bg-stone-900 text-white border-stone-900'

                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'

                      }`}

                    >

                      {isSelected && '✓ '}

                      {srv}

                    </button>

                  );

                })}

              </div>

            </div>

            <button

              type="submit"

              className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3.5 rounded-xl transition shadow-lg text-sm"

            >

              השלמת הרשמה וכניסה לאפליקציה

            </button>

          </form>

        </div>

      </div>

    );

}

// ==========================================

// תצוגת האפליקציה המרכזית (Main App UI)

// ==========================================

const filteredMembers = members.filter((m) => {

    const matchRole = filterRole === 'all' || m.role === filterRole;

    const matchQuery =

      m.fullName.includes(searchQuery) ||

      m.businessName.includes(searchQuery) ||

      m.city.includes(searchQuery) ||

      m.specialties.some(s => s.includes(searchQuery));

    return matchRole && matchQuery;

});

return (

    <div className="min-h-screen bg-stone-50 font-sans text-right" dir="rtl">

      {/* סרגל עליון */}

      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-stone-200 px-4 py-3">

        <div className="max-w-6xl mx-auto flex items-center justify-between">

          <div className="flex items-center gap-2">

            <div className="w-9 h-9 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center font-black">

              <Sparkles className="w-5 h-5" />

            </div>

            <div>

              <span className="font-extrabold text-base text-stone-900 block leading-tight">NailHub</span>

              <span className="text-[10px] text-stone-400 font-medium">קהילת הציפורניים של ישראל</span>

            </div>

          </div>

          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-bold">

            <button

              onClick={() => setActiveTab('directory')}

              className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'directory' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}

            >

              דירקטורי חברות

            </button>

            <button

              onClick={() => setActiveTab('profile')}

              className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'profile' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}

            >

              הפרופיל שלי

            </button>

          </div>

        </div>

      </header>

      {/* גוף האפליקציה */}

      <main className="max-w-6xl mx-auto p-4 md:p-6">

        {/* לשונית דירקטורי */}

        {activeTab === 'directory' && (

          <div className="space-y-6">

            {/* סרגל חיפוש ופילטור */}

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-3">

              <div className="flex flex-col md:flex-row gap-3">

                <div className="relative flex-1">

                  <input

                    type="text"

                    value={searchQuery}

                    onChange={(e) => setSearchQuery(e.target.value)}

                    placeholder="חיפוש לפי שם, עיר, סטודיו או התמחות..."

                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none text-xs"

                  />

                  <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-3 pointer-events-none" />

                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">

                  <button

                    onClick={() => setFilterRole('all')}

                    className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${

                      filterRole === 'all' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'

                    }`}

                  >

                    הכול ({members.length})

                  </button>

                  {Object.values(ROLES).map(r => (

                    <button

                      key={r.id}

                      onClick={() => setFilterRole(r.id)}

                      className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${

                        filterRole === r.id ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'

                      }`}

                    >

                      {r.label}

                    </button>

                  ))}

                </div>

              </div>

            </div>

            {/* רשימת כרטיסי חברות */}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              {filteredMembers.map((m) => {

                const role = getRoleDetails(m.role);

                return (

                  <div key={m.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">

                    <div>

                      <div className="flex items-start justify-between mb-3">

                        <div>

                          <h3 className="font-bold text-stone-900 text-base">{m.fullName}</h3>

                          <p className="text-xs text-stone-500">{m.businessName}</p>

                        </div>

                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${role.color}`}>

                          {role.label}

                        </span>

                      </div>

                      <div className="flex items-center gap-1 text-stone-500 text-xs mb-3">

                        <MapPin className="w-3.5 h-3.5" />

                        <span>{m.city}</span>

                      </div>

                      {/* התמחויות */}

                      {m.specialties.length > 0 && (

                        <div className="mb-3">

                          <span className="text-[10px] text-stone-400 block mb-1 font-bold">התמחויות:</span>

                          <div className="flex flex-wrap gap-1">

                            {m.specialties.map(s => (

                              <span key={s} className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded text-[11px]">

                                {s}

                              </span>

                            ))}

                          </div>

                        </div>

                      )}

                      {/* שירותים נלווים */}

                      {m.additionalServices.length > 0 && (

                        <div className="mb-4">

                          <span className="text-[10px] text-stone-400 block mb-1 font-bold">שירותים נוספים:</span>

                          <div className="flex flex-wrap gap-1">

                            {m.additionalServices.map(s => (

                              <span key={s} className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded text-[10px]">

                                {s}

                              </span>

                            ))}

                          </div>

                        </div>

                      )}

                    </div>

                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">

                      <a

                        href={`tel:${m.phone}`}

                        className="inline-flex items-center gap-1 text-stone-700 font-bold hover:text-stone-900"

                      >

                        <Phone className="w-3.5 h-3.5 text-rose-500" />

                        <span>{m.phone}</span>

                      </a>

                      <button className="text-[11px] text-stone-400 hover:text-stone-700 font-medium">

                        צפייה בפרופיל

                      </button>

                    </div>

                  </div>

                );

              })}

            </div>

          </div>

        )}

        {/* לשונית פרופיל אישי */}

        {activeTab === 'profile' && currentUser && (

          <div className="max-w-xl mx-auto bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-6">

            <div className="flex items-center justify-between pb-4 border-b border-stone-100">

              <div>

                <h2 className="text-xl font-black text-stone-900">{currentUser.fullName}</h2>

                <p className="text-xs text-stone-500">{currentUser.businessName} • {currentUser.city}</p>

              </div>

              <span className={`text-xs font-bold px-3 py-1 rounded-xl border ${getRoleDetails(currentUser.role).color}`}>

                {getRoleDetails(currentUser.role).label}

              </span>

            </div>

            <div className="space-y-4 text-xs text-stone-700">

              <div>

                <span className="text-stone-400 block mb-1 font-bold">תחומי התמחות:</span>

                <div className="flex flex-wrap gap-1.5">

                  {currentUser.specialties.map(s => (

                    <span key={s} className="bg-stone-100 px-2.5 py-1 rounded-lg font-medium">{s}</span>

                  ))}

                </div>

              </div>

              <div>

                <span className="text-stone-400 block mb-1 font-bold">שירותים נלווים:</span>

                <div className="flex flex-wrap gap-1.5">

                  {currentUser.additionalServices.map(s => (

                    <span key={s} className="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-lg font-medium">{s}</span>

                  ))}

                </div>

              </div>

              <div className="pt-2">

                <span className="text-stone-400 block mb-1 font-bold">טלפון לקביעת תורים / קשר:</span>

                <span className="font-mono text-sm font-bold text-stone-900">{currentUser.phone}</span>

              </div>

            </div>

            <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row gap-2">

              <button

                onClick={() => setShowRoleChangeModal(true)}

                className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold py-2.5 rounded-xl text-xs transition"

              >

                בקשת שינוי / שדרוג תפקיד

              </button>

              <button

                onClick={() => setCurrentStep('gate')}

                className="px-4 py-2.5 border border-stone-200 text-stone-500 hover:text-rose-600 rounded-xl text-xs transition font-medium"

              >

                התנתקות

              </button>

            </div>

          </div>

        )}

      </main>

      {/* מודאל בקשת שינוי תפקיד */}

      {showRoleChangeModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">

          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-stone-200">

            <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-100">

              <h3 className="font-bold text-stone-900 text-sm">בקשת שדרוג / שינוי תפקיד</h3>

              <button onClick={() => setShowRoleChangeModal(false)} className="text-stone-400 hover:text-stone-600">

                <X className="w-5 h-5" />

              </button>

            </div>

            {roleChangeSuccess ? (

              <div className="text-center py-6">

                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">

                  <Check className="w-6 h-6" />

                </div>

                <h4 className="font-bold text-stone-900 text-sm">הבקשה נשלחה בהצלחה!</h4>

                <p className="text-xs text-stone-500 mt-1">מנהלת הקהילה תבדוק את הפרטים ותעדכן את הסטטוס.</p>

                <button

                  onClick={() => {

                    setShowRoleChangeModal(false);

                    setRoleChangeSuccess(false);

                  }}

                  className="mt-4 px-6 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold"

                >

                  סגור

                </button>

              </div>

            ) : (

              <form

                onSubmit={(e) => {

                  e.preventDefault();

                  setRoleChangeSuccess(true);

                }}

                className="space-y-4"

              >

                <div>

                  <label className="block text-xs font-bold text-stone-700 mb-1">תפקיד מבוקש</label>

                  <select

                    value={roleChangeData.requestedRole}

                    onChange={(e) => setRoleChangeData({ ...roleChangeData, requestedRole: e.target.value })}

                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs outline-none"

                  >

                    <option value="instructor">מדריכה מוסמכת ואקדמיה</option>

                    <option value="supplier">ספק / מותג מורשה</option>

                    <option value="nail_tech">בונת ציפורניים ומניקוריסטית</option>

                  </select>

                </div>

                <div>

                  <label className="block text-xs font-bold text-stone-700 mb-1">נימוק או קישור לתעודות / מסמכים</label>

                  <textarea

                    rows={3}

                    required

                    value={roleChangeData.reason}

                    onChange={(e) => setRoleChangeData({ ...roleChangeData, reason: e.target.value })}

                    placeholder="פרטי מדוע את מבקשת לשנות תפקיד (למשל: סיום קורס מדריכות, פתיחת חנות וכו')..."

                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs outline-none"

                  />

                </div>

                <button

                  type="submit"

                  className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 rounded-xl text-xs transition"

                >

                  שליחת בקשה לאישור מנהלת

                </button>

              </form>

            )}

          </div>

        </div>

      )}

    </div>

);

}

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bc4f06b9-047d-53b1-b79e-961e18b39d90).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
