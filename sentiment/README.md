# Sentiment service

An Express service using the `natural` library's English AFINN analyzer and Porter stemmer. It runs locally without an AI provider or API key.

```sh
npm ci
npm test
npm start
```

The default port is 5000. Override it with `PORT`.

```sh
curl -X POST http://localhost:5000/sentiment \
  -H 'Content-Type: application/json' \
  -d '{"sentence":"I love this wonderful beautiful gift!"}'
```

Response:

```json
{"sentimentScore":1.8333333333333333,"sentiment":"positive"}
```

The numerical score varies with the exact sentence. A positive score maps to `positive`, a negative score to `negative`, and zero to `neutral`. Blank/non-string input and sentences longer than 10,000 characters return 400. `GET /health` reports service health. The backend can expose this endpoint through its `/api/sentiment` proxy.
