# Submission evidence

These files record actual project execution on 20 October 2026.

- [GitHub Actions run 39393705341](https://github.com/Uchiha-Dauren/backend-nodejs-capstone/actions/runs/39393705341) succeeded for commit `6b3ea1079114504023e548cf0e958d20e07effcc`. The **Install and Run Linter** step successfully ran immediately after Node.js setup and before service dependencies and tests. All **29 tests passed**: 18 MongoDB/API tests, 7 sentiment tests and 4 frontend tests. The production build, both container builds and deployment verification also passed.
- The [captured lab deployment](https://notomaridepe-3060.theiadockernext-0-labs-prod-theiak8s-4-tor01.proxy.cognitiveclass.ai) is temporary and depends on the Skills Network lab session remaining available. Its visible URL, title, tagline and Get Started button appear in [deployed_landingpage.png](deployed_landingpage.png).
- [userstories.png](userstories.png) shows the real GitHub issues and planning labels.
- [inserted_items](inserted_items), [mainpage](mainpage), [register](register), [login](login), [item_detail](item_detail) and [search_item](search_item) are **plain-text terminal evidence**, including the commands and their output. The API transcripts use the local demonstration deployment shown in their commands.
- [CICD](CICD) contains the run link, all workflow step results and actual timestamped excerpts from the downloaded CI log. Repetitive download and request logs were omitted. [ci-jobs.json](ci-jobs.json) preserves the job metadata used to verify every step's successful conclusion.

Temporary JWTs and the dedicated demonstration account's password are explicitly redacted in the registration/login transcripts. The HTTP headers are retained from the original execution; their content lengths therefore describe the original response rather than the redacted text.
