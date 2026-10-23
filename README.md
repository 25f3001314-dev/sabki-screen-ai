# Sbki Screen

**Math decides. AI explains. Everyone gets a voice.**

Sbki Screen ("everyone's screen") is a Fire TV app that ends the "what should we watch?" argument. It blends every viewer's taste into three fair picks, lets anyone veto, explains each pick in plain English with Amazon Bedrock, and plays the best group match when a 2-minute timer runs out.

Built for the Amazon Developer Hackathon (Fire TV track, AWS Builder mini challenge).

## How it works

1. Everyone on the couch has a viewer profile (genre tastes, optional hard limits).
2. A deterministic **group engine** scores every title for every viewer and builds three cards: **Best Group Match**, **Balanced Alternative** and **Wildcard Choice**.
3. Each card shows every viewer's match score and a one-line "why this pick" written by **Amazon Bedrock**.
4. Press OK on a card to play it, or Veto to drop it. If the timer reaches 0:00, the top match plays automatically.
5. After a pick, a **fairness ledger** gives extra weight next time to whoever got the least out of tonight's choice.

### The group engine (`packages/shared-ui/src/engine/groupEngine.ts`)

The engine is fully deterministic: the same group always gets the same answer.

- **Hard constraints:** titles are excluded if they break a runtime limit, any viewer's `maxAge`, or any viewer's `blockedGenres`. Vetoed titles are never scored.
- **Per-viewer satisfaction:** `0.7 x average genre score + 0.3 x worst genre score`. A genre a viewer has no preference for scores 0.65.
- **Group score:** the mean of the weighted average and the **least-misery** score (the unhappiest viewer), so a pick one person hates cannot win.
- **Fairness ledger:** viewers below the mean satisfaction of the chosen title earn credit (max 0.3, decays by 0.7 each round) that raises their weight in the next average.
- **Slate:** best group score; then the highest least-misery among titles with a different genre mix than the best pick; then the first remaining title that adds a new genre.

### The AI layer (`apps/bedrock-explainer`, `packages/shared-ui/src/services/bedrockExplanation.ts`)

Bedrock never ranks anything. It only explains a ranking that is already decided.

```
Fire TV app --POST /explain--> API Gateway --> AWS Lambda --Converse API--> Amazon Bedrock
```

- The Lambda calls the Bedrock **Converse** API. The model comes from `BEDROCK_MODEL_ID` (default `deepseek.v3.2`), with `temperature 0.3` and `maxTokens 200`.
- The prompt tells the model the ranking is final, that it must not rank or suggest another title, and to write 1-2 friendly sentences using the match scores and the age-safety flag.
- **What is sent:** movie title, genres, runtime and age rating; each viewer's first name and match score; an `ageSafe` flag; the card rank. No accounts, no sign-in, no contact details.
- **No AWS credentials in the app.** Only the Lambda role holds `bedrock:InvokeModel`.
- If the call fails or is slow, the card shows a built-in fallback line, so the screen never blocks on the network.

## Run it

Prerequisites: Node.js 18+, Yarn 4.5.0, and the tooling for your target (Android tooling for Fire OS builds).

```bash
yarn install
cp apps/expo-multi-tv/.env.example apps/expo-multi-tv/.env   # then set EXPO_PUBLIC_BEDROCK_EXPLANATION_URL
yarn dev:android   # Fire TV / Android TV device or emulator (Fire OS is Android-based)
yarn dev:web       # quick preview in a browser
```

Without `EXPO_PUBLIC_BEDROCK_EXPLANATION_URL` the app still works and shows the fallback explanation.

### Deploy the explainer

See `apps/bedrock-explainer/README.md`. In short: create a Lambda with handler `src/handler.handler`, expose `POST /explain` through an API Gateway HTTP API, enable a Bedrock model in your account, grant the Lambda role `bedrock:InvokeModel`, and set `BEDROCK_MODEL_ID`.

## What is new in this project

Sbki Screen is built on top of Amazon's open-source [React Native Multi-TV app sample](https://github.com/AmazonAppDev) (navigation shell, Home and Player screens). Added for this hackathon:

- `packages/shared-ui/src/screens/DecisionScreen.tsx` - the group decision screen
- `packages/shared-ui/src/engine/groupEngine.ts` - the rule engine and fairness ledger
- `packages/shared-ui/src/services/bedrockExplanation.ts` - the client for the explainer
- `packages/shared-ui/src/data/demoCatalog.json` - the demo catalogue
- `apps/bedrock-explainer` - the Lambda that calls Amazon Bedrock

## License

MIT. See [LICENSE](LICENSE).