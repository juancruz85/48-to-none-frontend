# Fraud Dashboard (Next.js)

    npm install
    npm run dev      # http://localhost:3000

## Sign-in and profiles

Users sign up and sign in at `/login` with Cognito. The routes under `app/api/auth/` talk to
Cognito from the server and keep the tokens in httpOnly cookies, so page JavaScript never sees them.
`app/api/profile` sends the token to the AWS profile API (`PROFILE_API_URL`) and creates the
profile on first sign-in. The dashboard redirects to `/login` when nobody is signed in.

## Accounts, tags and uploads

The Accounts panel manages the signed-in user's tags (folders) and accounts, stored by the AWS
profile API. Each account takes CSV uploads of its purchases (`Date`, `Amount`, and `Item` or
`Description` columns). Uploads go to the Python backend, which checks them for fraud.

## Fraud report

The fraud check runs on the user's own computer. Every user starts the Python backend from the
backend repo:

    .venv/bin/python -m src.api      # http://127.0.0.1:8000

The dashboard page calls that backend straight from the browser (`lib/fraudBackend.ts`), also when
the dashboard itself is hosted at lafluke.com: the Next.js server never talks to it. Uploads, the
report and the fraud labels therefore stay on the user's machine. The backend only answers pages
served from lafluke.com or `localhost:3000`; start it with `--allow-origin <url>` for another address.
`NEXT_PUBLIC_FRAUD_API_URL` changes where the page looks for it (default `http://127.0.0.1:8000`).

The browser may ask to let the site reach devices on the local network; that has to be allowed.

Safari blocks every plain-http call from an https page, 127.0.0.1 included, so on lafluke.com it
cannot call the backend directly. There the dashboard shows a **Connect to backend** button that
opens the backend's `/bridge` page in a small window; the dashboard hands its calls to that window
(`postMessage`) and the window makes them. The window has to stay open, and Safari must allow
pop-ups for the site. On `http://localhost:3000` Safari needs none of this.
The model takes a minute or so to load; results fill in as each file is checked.

Hello World!
