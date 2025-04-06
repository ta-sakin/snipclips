#!/bin/sh
# python3 -m venv .venv
source .venv/bin/activate
flask run --port=5000 --reload
# python -m flask --app app run --debug