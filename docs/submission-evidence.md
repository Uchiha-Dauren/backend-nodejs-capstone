# Final-project evidence checklist

Use genuine source links and screenshots from the running project. A source file proves the implementation; a screenshot proves the particular execution shown. Do not substitute one for the other.

Repository: `https://github.com/Uchiha-Dauren/backend-nodejs-capstone`

| # | Requirement | Evidence |
| --- | --- | --- |
| 1 | User-story issue template | Public URL of `.github/ISSUE_TEMPLATE/user-story.md` |
| 2 | At least eight GitHub issues with planning labels | Screenshot of the repository's issues showing `new`, `backlog`, `icebox` and `technical debt` labels |
| 3 | Import sixteen supplied MongoDB items | Terminal screenshot of the first seed execution showing `Inserted documents: 16` |
| 4 | Connect to MongoDB | Public URL of `secondChance-backend/models/db.js`; includes `await client.connect()` |
| 5 | Item service operations | Public URL of `secondChance-backend/routes/secondChanceItemsRoutes.js`; connection, list/detail, create/upload and delete |
| 6 | Search category filter | Public URL of `secondChance-backend/routes/searchRoutes.js` |
| 7 | Mount the search route | Public URL of `secondChance-backend/app.js` |
| 8 | Sentiment analysis with natural | Public URL of `sentiment/index.js` |
| 9 | Registration, login and update routes | Public URL of `secondChance-backend/routes/authRoutes.js` |
| 10 | Deployed landing page | `deployed_landingpage.png`, with browser URL bar, title, tagline and Get Started button visible |
| 11 | Item-list API | Screenshot showing a real curl request and successful response for `/api/secondchance/items` |
| 12 | Registration API | Screenshot showing a real curl POST and successful response from `/api/auth/register` |
| 13 | Login API | Screenshot showing a real curl POST and successful response from `/api/auth/login` |
| 14 | Item-detail API | Screenshot showing a real curl request and successful response for `/api/secondchance/items/875` |
| 15 | Search API | Screenshot showing a real curl request and filtered result for `/api/secondchance/search?category=Kitchen&name=lamp` |
| 16 | Successful CI/CD workflow | Screenshot of the completed workflow's terminal output showing successful tests/build/deployment |

## Capture guidance

- Run registration and login with a dedicated demonstration account, not a personal password.
- Keep deployment URLs and relevant commands readable.
- The seed screenshot should show an actual clean first import. Running an idempotent seed twice properly reports zero new inserts on its second run.
- Verify the workflow associated with the submitted commit finishes successfully before recording the CI evidence.
- Check that source links are public and refer to the submitted implementation.
