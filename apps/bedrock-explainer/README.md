# Bedrock explanation API

This Lambda owns the only Bedrock call. The Fire TV app sends the deterministic
recommendation payload to `POST /explain`; AWS credentials never ship to the app.

## Deploy

1. Create a Lambda function using `src/handler.handler` and an API Gateway HTTP API route `POST /explain`.
2. Set `BEDROCK_MODEL_ID` to a model enabled in the AWS account. The default is DeepSeek V3.2 (`deepseek.v3.2`).
3. Give the Lambda role `bedrock:InvokeModel` permission for that model.
4. Put the deployed route in `apps/expo-multi-tv/.env`:

```text
EXPO_PUBLIC_BEDROCK_EXPLANATION_URL=https://your-api-id.execute-api.your-region.amazonaws.com/explain
```

Run `yarn install` after cloning, then build the app so Expo inlines the public
endpoint variable. Keep AWS keys and the Bedrock model permission server-side.
