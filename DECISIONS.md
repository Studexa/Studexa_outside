
## Step 5 — Real decks, cards, review, and AI

- **The study data migration is phased.** Decks, cards, due-card review, saved-card quizzes, and AI generation move to the API now. XP, streaks, coins, notes, planner data, and mock game-layer state stay in Zustand until their own steps, so completed screens keep working while the schema grows.
- **`V4__decks_cards.sql` adds `decks`, `cards`, `card_progress`, and `ai_usage`.** Card source fields live on the card itself, so generated references survive later review sessions without a separate citation table.
- **New cards are immediately due.** Card creation inserts a `card_progress` row with `dueAt = now`, keeping the due query simple and making bulk imports reviewable right away.
- **Review scheduling is SM-2-inspired, not SM-2-exact.** `AGAIN` retries in 10 minutes; `HARD`, `GOOD`, and `EASY` grow the interval from 1/4 days using ease. `CardResponse.due` is always `false` after a review because the next due time is in the future.
- **The AI stays server-side.** `ANTHROPIC_API_KEY` is read only by the backend. `AiClient` is an interface so generation can be tested without a live model. Missing configuration returns `503 AI_NOT_CONFIGURED` with a clear message.
- **Generated cards are previewed, not saved automatically.** The editor lets the student select which cards to keep. Accepted cards go through the normal bulk-create path, so they get real `card_progress` rows and can be reviewed.
- **Grounding is enforced twice.** The prompt forbids outside facts, and the service only returns a `sourceExcerpt` when its normalized text is an exact substring of the supplied notes/deck context. Anything else is dropped instead of shown as a citation.
- **AI usage is limited per UTC day in `ai_usage`.** The default is 10 calls. This is a simple server-side guard for one instance; a shared store can replace it when the app scales out.
- **The quiz flow is AI-first with a saved-card fallback.** `Generate AI quiz` creates fresh multiple-choice questions; `Practise saved cards` turns existing card backs into distractors. This keeps review scheduling meaningful while still allowing on-demand practice.
- **The floating study pet reuses `Mascot` and `POST /ai/tutor`.** It is hidden on quiz and minigame screens where it would cover the primary controls, and it can accept pasted notes for grounded answers.
- **Explore catalog copies now create real decks and cards.** The catalog itself is still static seed data until a public-deck API exists, but copying a deck no longer writes to the mock store.
