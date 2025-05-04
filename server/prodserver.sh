#!/bin/sh
PORT="${PORT:-8000}"

python3 -m venv .venv
source .venv/bin/activate
gunicorn -b 0.0.0.0:$PORT app:app

