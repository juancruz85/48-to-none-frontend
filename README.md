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

Start the Python backend in the backend repo:

    .venv/bin/python -m src.api      # http://127.0.0.1:8000

`app/api/report` returns the report for the signed-in user's own uploads (`FRAUD_API_URL` in
`.env.local`). The model takes a minute or so to load; results fill in as each file is checked.

Hello World!
