# Onboarding Banner Lifecycle

- **Purpose:** guide owners through first-time setup without blocking normal use.
- **Visibility:** show only when onboarding is incomplete *and* the banner has not been dismissed.
- **Dismissal:** `POST /api/onboarding/dismiss-banner` sets `onboarding_banner_dismissed_at`; once set, banner stays hidden for that tenant.
- **Completion:** when all onboarding checks pass, the progress card is replaced with the admin alerts slot (reserved for reminders/alerts).
- **Persistence:** dismissal is tenant-level, not user-level; it survives refresh, logout, and device changes.
- **Do not:** re-show the onboarding banner after dismissal or completion.
