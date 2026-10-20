# SecondChance

A full-stack gift-sharing application for the IBM JavaScript Back-end Capstone Project. Visitors can browse and search donated items; registered users can create gifts and update their own profiles and listings. The project includes MongoDB persistence, a React interface, an Express API, and a local sentiment-analysis microservice built with `natural`.

Based on the [IBM course template](https://github.com/ibm-developer-skills-network/kjriu-backend-nodejs-capstone).

## Project structure

- `secondChance-backend/`: MongoDB connection, seed data, authentication, gift and search routes.
- `secondChance-frontend/`: React application and the standalone `public/home.html` landing page.
- `sentiment/`: English sentiment analysis with `natural`; no external AI credentials are required.
- `.github/ISSUE_TEMPLATE/user-story.md`: reusable user-story template.
- `.github/user-stories.json`: fourteen story definitions used to create the GitHub backlog.
- `.github/workflows/ci.yml`: real MongoDB integration tests, sentiment tests, production build, container builds and deployment smoke checks.
- `tests/`: real-database API, authentication, concurrency and upload integration tests.
- `docs/submission-evidence.md`: the sixteen grading requirements and evidence checklist.

## Local setup

Requirements: Node.js 22, npm, and a running MongoDB 7 instance. Run these commands from the repository root:

```sh
npm ci --prefix secondChance-backend
npm ci --prefix secondChance-frontend
npm ci --prefix sentiment
```

Configure the backend in `secondChance-backend/.env` (this file is ignored by Git):

```dotenv
MONGO_URL=mongodb://127.0.0.1:27017
MONGO_DB=secondChance
PORT=3060
JWT_SECRET=replace-with-your-own-random-secret-at-least-32-characters-long
SENTIMENT_URL=http://127.0.0.1:5000/sentiment
CORS_ORIGINS=http://localhost:3000,http://localhost:3060
```

Generate a fresh secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Replace the example value; do not publish the real secret.

Seed the supplied sixteen gifts and build the frontend:

```sh
npm run seed --prefix secondChance-backend
npm run build --prefix secondChance-frontend
```

Start the services in separate terminals:

```sh
npm start --prefix sentiment
npm start --prefix secondChance-backend
```

Open `http://localhost:3060/` for the landing page, then select **Get Started** to enter the React application at `/app`. Uploaded and seeded images are served from `/images/`. During frontend development, `npm start --prefix secondChance-frontend` uses its localhost proxy to reach the backend.

The seed is idempotent: the first run inserts sixteen gifts; subsequent runs add missing seed records without creating duplicates or replacing existing user data.

## API

| Method and path | Purpose | Authentication |
| --- | --- | --- |
| `GET /health` | Database readiness | Public |
| `GET /api/secondchance/items` | List gifts | Public |
| `GET /api/secondchance/items/:id` | Gift detail | Public |
| `POST /api/secondchance/items` | Create a gift; optional multipart `file` image | Bearer JWT |
| `PUT /api/secondchance/items/:id` | Update a gift | Owner JWT |
| `DELETE /api/secondchance/items/:id` | Delete a gift | Owner JWT |
| `GET /api/secondchance/search` | Filter by `name`, `category`, `condition`, `age_years` | Public |
| `POST /api/auth/register` | Create an account | Public |
| `POST /api/auth/login` | Sign in | Public |
| `GET /api/auth/profile` | Read the current account | Bearer JWT |
| `PUT /api/auth/update` | Change the current account's name | Bearer JWT |
| `POST /api/sentiment` | Proxy a `{ "sentence": "..." }` to sentiment analysis | Public |

Registration accepts `firstName`, `lastName`, `email`, and `password`. Registration and login return `authtoken` plus a public `user` object. Passwords are hashed with bcrypt and never returned. Email addresses are normalized and uniquely indexed. Profile updates derive the account identity from the JWT and cannot change another user's account.

The standalone sentiment service also accepts `POST http://localhost:5000/sentiment` and returns `sentimentScore` and `sentiment`.

## Tests and CI

```sh
MONGO_URL=mongodb://127.0.0.1:27017 npm test --prefix secondChance-backend
npm test --prefix sentiment
CI=true npm run build --prefix secondChance-frontend
```

Backend tests start an ephemeral HTTP listener and use a real MongoDB database with a unique test-only name. They verify the sixteen records, seed idempotency, filters, password hashing, login, authorization, profile updates, upload validation and concurrent writes. Only the unique test database is deleted after the run.

GitHub Actions runs on pushes, pull requests and manual dispatch. After the tests and build, it starts disposable MongoDB, backend and sentiment containers and verifies the deployed landing page, React entry, image serving, API and sentiment response. Success in the workflow is reported only after all commands have passed.

## Container deployment

Install Docker with Compose, then set a random runtime secret and start the application:

```sh
export JWT_SECRET=$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")
docker compose up --build -d
```

The website is exposed at `http://localhost:3060/`. MongoDB is internal to the Compose network. Named volumes retain the database and uploaded images, while the seed service runs before the app becomes available. Use `docker compose down` to stop the deployment without removing those volumes.

To reproduce the CI deployment check:

```sh
docker build --target backend -t secondchance-backend:ci .
docker build --target sentiment -t secondchance-sentiment:ci .
bash scripts/verify-deployment.sh
```

The deployment check creates and cleans up only its own containers and network. `node scripts/smoke-deployment.cjs` can also check an existing clean seeded deployment by setting `API_BASE_URL`.

## Scope

The application is a capstone demonstration. Registration, login and profile updates are implemented; email verification, account recovery, refresh-token rotation and production abuse protection are future work tracked by the authentication research story. The sentiment score is a simple lexicon-based English analysis, not a factual assessment of a gift or its donor.
