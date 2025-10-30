Erdington Telegram Powerhouse — What “Ultimate” Looks Like
Structure (single ecosystem, ward-first)
Public News Channel — Reform UK Erdington — Updates (broadcast only; discussion linked)
Community Forum Supergroup (Topics enabled) — “Erdington Community”
Ward Topics: Castle Vale, Erdington, Gravelly Hill, Kingstanding, Perry Common, Pype Hayes, Stockland Green, Oscott
HQ Topics: “Announcements (Read-Only)”, “Resources & Maps”, “Helpdesk”, “Press & Clips”
Volunteer Ops Supergroup — invite-only; rota, kit, shifts (no politics chat)
Committee War-Room — private core team chat (chair, secretary, media, events, treasurer, data)
Admin Approvals Room — private group where the bot posts join-request cards with Approve/Reject buttons
Ward maps & resources
Each Ward Topic has a pinned “Ward Pack” post containing:
Latest PDF map, PNG overview, polling districts list (CSV/Sheet link), and /map command hint
A bot command: /map <ward_slug> returns the current pack + quick links
Optional: /route <ward_slug> returns walking route cards
Membership-gated entry (manual verification)
Community & Volunteer groups use “Request to Join” mode (no immediate entry)
On join request, the bot DMs a wizard asking for:
Full name, email (consent), Reform UK membership number, postcode, ward, availability
It writes to Firestore + Google Sheet and posts an approval card into Admin Approvals Room with:
Member snapshot + buttons Approve / Reject / Needs Info
Deep-link to your external system for cross-check
Any admin can approve from the card. Bot then programmatically approves via Telegram’s ApproveChatJoinRequest and posts a welcome in the right Ward Topic.
Admin UX (fast & bulletproof)
Inline buttons open a Telegram WebApp “Admin Console” (inside Telegram) for search, filter, audit log
Notifications to all admins (or a configurable subset) on new requests, escalations, and flagged duplicates
Role-based: Chair has global; Ward Leads can approve only for their ward
Compliance & privacy
Phone numbers hidden by policy; bot enforces a pre-check on admin privacy settings
GDPR: explicit consent copy in the wizard; retention & deletion timers; audit trails
No voter data stored in Telegram; sensitive data lives in GCP (Firestore) with access controls
Automation highlights
Scheduled posts with inline CTA buttons (Controller-style scheduling baked into bot)
Cross-post pipeline (Channel → X/Facebook + UTM) and content log in Sheets
Weekly analytics summary auto-posted to Committee War-Room (subs, reach, CTR, joins, approvals, event RSVPs)
Elite Google Dev Prompt (hand this to your AI Software Engineer)
Goal: Build a production-grade, ward-centric Telegram system for Reform UK — Erdington with join-gating by membership number, manual admin approval, ward topics, resource library, maps delivery, analytics, and GDPR compliance. Deliver as GCP-native, IaC-provisioned, with CI/CD.
1) Architecture & Stack
Cloud: Google Cloud Platform
Runtime: Cloud Run (container), Node.js 20 + TypeScript using grammY or Telegraf
Datastore: Firestore (Native mode)
Secrets: Secret Manager
Jobs: Cloud Scheduler → Pub/Sub → Cloud Run (cron endpoints)
Storage: Google Drive (maps, PDFs) + signed links; optional Cloud Storage bucket mirror
Dashboards: Looker Studio (reads from BigQuery or Sheets)
Admin mini-app: Telegram WebApp (React + Vite) served from Cloud Run (same repo, different path)
2) Telegram Entities (precreated, IDs provided via env)
CHANNEL_PUBLIC_ID — “Reform UK Erdington — Updates” (broadcast)
GROUP_FORUM_ID — “Erdington Community” supergroup with Topics enabled
GROUP_OPS_ID — “Erdington Volunteer Ops”
GROUP_COMMITTEE_ID — “Erdington Committee (War-Room)”
GROUP_APPROVALS_ID — “Admin Approvals”
Topics (by thread_id) created under GROUP_FORUM_ID:
castle_vale, erdington, gravelly_hill, kingstanding, perry_common, pype_hayes, stockland_green, oscott
resources_maps, announcements_ro, helpdesk, press_clips
Provide a /tools/get_ids admin command to print chat IDs and topic IDs once created.
3) Environment Variables (Secret Manager)
TELEGRAM_BOT_TOKEN
PUBLIC_BASE_URL             # Cloud Run URL for webhook + webapp
ADMIN_USER_IDS              # CSV of Telegram numeric IDs with superadmin
GROUP_*_ID                  # as above
TOPIC_<WARD>_ID             # per-topic/thread id
DRIVE_FOLDER_WARD_MAPS      # parent folder with subfolders per ward
SHEETS_SPREADSHEET_ID       # membership ledger + content log
EXTERNAL_CHECK_URL          # deep-link to verify membership in external system
4) Data Model (Firestore)
collections:
  members/{telegram_user_id}:
    username, first_name, last_name, email, email_consent:boolean
    membership_number, postcode, ward_slug
    status: "pending" | "approved" | "rejected"
    approved_by, approved_at, notes, created_at, updated_at
    audit_log: [ { at, by, action, details } ]

  join_requests/{req_id}:
    telegram_user_id, chat_id, ward_slug, source:"community|ops"
    payload_snapshot, status, created_at, resolved_at, resolver_id

  posts/{post_id}:
    channel_msg_id, type, title, utm_url, posted_at, metrics:{views, clicks}

  events/{event_id}:
    title, start_ts, end_ts, location, ward_slug, rota:[{name, role, contact}]
5) Webhook & Bot Behaviour
Webhook endpoint /telegram/webhook on Cloud Run; set via setWebhook on deploy
Handle updates:
chat_join_request:
DM applicant with onboarding wizard (reply keyboard / WebApp form)
Validate basic format (membership #, email)
Persist to Firestore & Sheets
Post approval card to GROUP_APPROVALS_ID:
Text block with applicant summary + buttons: Approve, Reject, Needs Info
Buttons call signed callback endpoints /approve?req_id=.. etc.
Include external check URL button: ${EXTERNAL_CHECK_URL}?membership=XXXX
callback_query (admin actions): permission-check; update Firestore; call approveChatJoinRequest or declineChatJoinRequest; notify applicant; post result to GROUP_COMMITTEE_ID
commands (admin only):
/member <@username|id> → fetch profile, status, audit
/map <ward_slug> → returns latest ward pack from Drive
/postcheck → last 10 posts + metrics
/get_ids → dump chat & topic IDs
commands (public DM to bot):
/start wizard; /help; /join (deep-link supports ?ward=oscott)
Forum Topics routing: All bot messages tagged to correct thread_id via message_thread_id.
6) Onboarding Wizard (DM)
Steps (stateful via Firestore):
Collect full name
Collect email + consent checkbox text
Collect membership number (regex + checksum hook placeholder)
Collect postcode → determine default ward_slug (use provided ward map/lookup table)
Let user confirm ward or choose different one
Summary + Submit → write ledger + notify Approvals
Timeouts & retries built-in; “Edit info” path allowed.
7) Ward Maps Delivery
Google Drive folder DRIVE_FOLDER_WARD_MAPS with subfolders per ward slug
Each ward folder contains overview.png, map.pdf, polling_districts.csv, optional routes/ images
/map <ward_slug>:
Bot fetches latest files by name pattern and returns a media group + quick buttons:
Download PDF, Open CSV, View Routes
A nightly job syncs Drive file metadata → Firestore cache for instant responses.
8) Content Scheduling & CTAs
Endpoint /scheduler/publish accepts JSON:
{
  "thread":"announcements_ro",
  "title":"Erdington Stall — Saturday",
  "text":"📢 This Saturday 10–2 Kingstanding Circle. Come talk to us.",
  "buttons":[
     {"text":"🗺️ Directions","url":"https://maps.google.com/?q=..."},
     {"text":"Volunteer","url":"https://forms.gle/.../?utm_source=telegram&utm_medium=channel&utm_campaign=erdington_stall"}
  ],
  "when":"2025-11-01T09:00:00Z"
}
Cloud Scheduler hits /scheduler/run to flush due posts.
All outbound links auto-append UTM.
9) Analytics & Reporting
Every post writes to posts/ with channel_msg_id
A Cloud Scheduler job reads Telegram getChat/getMessage stats (views) + short-link clicks (Bitly/GA4 Measurement Protocol) → writes to BigQuery or Sheets
Weekly digest bot posts to GROUP_COMMITTEE_ID:
Subs gained/lost, views/post, CTR, joins, approvals, event RSVPs
10) Roles & Permissions
ADMIN_USER_IDS (superadmins)
WARD_LEADS: map of ward_slug → array of user IDs; Ward Leads can approve only for their ward
Approvals are logged with approved_by and mirrored to Sheets (“Membership Ledger” tab)
11) Moderation
Turn on Slow Mode for Community
Built-in flood/URL filters (grammY middlewares)
Optional integrate Shieldy for human checks at join (in addition to membership gate)
/mod mute @user 24h, /mod ban @user, with audit to Firestore
12) GDPR & Policy
Wizard shows consent copy; store email_consent:boolean
/privacy command returns policy & deletion instructions
Implement /erase (DM): queues 7-day deletion (Firestore doc tombstone, Sheets row strike-through, optional Drive redaction)
Retention: default 12 months, configurable
13) WebApp Admin Console (inside Telegram)
Opened via inline button on approval cards (“Open Console”)
Views:
Queue (pending joins, filter by ward)
Members (search, status, export CSV)
Audit (actions timeline)
Auth: only Telegram users whose IDs are in ADMIN_USER_IDS or WARD_LEADS[*]
Approvals happen without leaving Telegram (WebApp → signed backend callback)
14) CI/CD & IaC
Repo layout
/bot        # Node TS bot (grammY)
/webapp     # React WebApp (Telegram WebApp)
/infra      # Terraform for GCP (Cloud Run, Firestore, Scheduler, Pub/Sub, Secret Manager)
/scripts    # deployment, setWebhook, seed topics
Terraform provisions:
Firestore (Native), Cloud Run services, Secret Manager vars, Scheduler jobs, Pub/Sub topics, IAM bindings
GitHub Actions:
Lint/test → build images → push to Artifact Registry → deploy Cloud Run → run setWebhook
Post-deploy smoke tests: /healthz, /telegram/selftest
15) Acceptance Tests (must pass)
New user can request to join, complete wizard, appear in Approvals, be approved, auto-welcomed into correct Ward Topic
Admin receives notifications; any admin can approve/reject; Ward Lead can approve their ward only
/map oscott returns correct pack within 1s P95
Weekly analytics digest posts automatically
/erase deletes member data within 7 days and confirms
All secrets in Secret Manager, no tokens in logs
16) Seed Data & Ward Lookup
Provide a JSON for wards:
[
  {"slug":"castle_vale","name":"Castle Vale","postcodes":["B35","..."]},
  {"slug":"erdington","name":"Erdington","postcodes":["B23","..."]},
  ...
]
Use postcode prefix match for defaulting ward in wizard (admin can override on approval).
17) Documentation & Handover
README.md with:
Creating chats/topics and capturing IDs
Setting secrets, running Terraform, first deploy, setWebhook
Admin guide (approvals, commands, WebApp)
Privacy policy template (UK GDPR)
Backup/restore plan (Firestore export + Drive structure)
Launch Checklist (for you today)
Create: Channel, Community (Topics on), Volunteer Ops, Committee, Approvals groups
Promote 1–2 trusted Ward Leads per ward
Drop ward packs (PDF/PNG/CSV) into Drive subfolders
Share chat IDs with the engineer; run deploy; set webhook
Post the first pinned “How this works” in Community + Ward Pack pins
