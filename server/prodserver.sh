#!/bin/sh
python3 -m venv .venv
source .venv/bin/activate
gunicorn -b 0.0.0.0:8000 app:app

