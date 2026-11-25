# LeArNCoDiNg

LeArNCoDiNg is a daily AI and coding learning site with a Python-powered Flask backend. It includes Google sign-in, an AI learning series, coding mini-games, a calendar, a reflection journal, and a guided creator quest with HTML, CSS, JavaScript, AI literacy, and beginner Python checkpoints.

## Python learning path

The premium creator quest includes three interactive Python checkpoints: output and variables, conditions, and lists and loops. Learners practice concepts, answer a checkpoint, and save progress. The daily AI series offers 14 concepts; after 14 days, the interface directs learners to the continuing course. Membership checkout is intentionally disabled until the site owner configures a real payment provider.

## Run locally

Install Python 3.10 or newer, then run:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
GOOGLE_CLIENT_ID="your-google-web-client-id" python app.py
```

Open <http://127.0.0.1:8000>. Google sign-in requires an OAuth web client ID with this local origin authorized. SQLite records are stored under `data/` unless `LEARN_DATABASE` is set.

## Publish with Render

An adult site owner can connect this public GitHub repository to Render and use the included `render.yaml` blueprint. Set `GOOGLE_CLIENT_ID` in Render and add the Render service URL as an authorized Google OAuth origin. Render provides an HTTPS `onrender.com` address after the service deploys. A custom domain can be connected later if the owner controls it.

Keep the persistent disk enabled for SQLite data. Never commit credentials, `.env` files, or the local `data/` folder. Membership checkout remains disabled in this Python build until a payment provider and cancellation flow are configured by the site owner.

## AI coach

Veritas opens in the compact side panel after sign-in. Its assistant runs at the existing hosted AI service; this repository holds only the public embed address, never its provider credentials.
