# Feedback Privacy Note

The `Copy Feedback` button creates a reproducibility bundle for beta reports. It is meant to help debug a run without asking testers to explain every detail manually.

## Included

- Build version.
- Seed.
- Faction.
- Ascension.
- Act and phase.
- HP and gold.
- Deck, relic, potion, and run modifier ids.
- Aggregate meta stats.
- Recent telemetry events.
- Browser user agent and app path.

## Not Included

- Name.
- Email.
- Account id.
- Payment data.
- Full localStorage dump.
- Anything outside the game feedback bundle.

## Tester Guidance

Testers should skim the copied JSON before posting it publicly. If they add their own notes, screenshots, or videos, those attachments may contain extra personal information that the game did not add.

## Telemetry Setting

The in-game Privacy panel has a `Send remote playtest events` toggle. Turning it off prevents network telemetry from being sent to the playtest endpoint. Local event history still stays on the device so the tester can choose to copy a feedback bundle manually.
