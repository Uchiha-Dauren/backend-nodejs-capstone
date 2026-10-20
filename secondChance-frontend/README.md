# SecondChance frontend

The provided React application is integrated with the SecondChance Express API. It includes a landing page, item listing and details, filtered search, account registration/login, profile editing, and authenticated item creation.

## Development

Run the backend on port 3060, then:

```sh
npm ci
npm start
```

The development proxy forwards `/api` and `/images` requests to `http://localhost:3060`. Production uses relative URLs on the same origin. Set `REACT_APP_BACKEND_URL` only when intentionally using a separate API origin.

## Production

```sh
npm run build
```

The backend serves `build/home.html` at `/` and the React application at `/app` and `/app/*`. Static assets are local; the landing page does not require a third-party CSS, font or script CDN.

## Validation

```sh
CI=true npm test -- --watchAll=false --runInBand
```

Regression tests cover session restoration, search filters and item links, rejected login, and profile updates. Browser acceptance should also verify real registration/login, uploaded images, mobile navigation, and server persistence.
