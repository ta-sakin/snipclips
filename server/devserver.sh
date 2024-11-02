#!/bin/sh
source .venv/bin/activate
flask run --port=5000 --reload
# python -m flask --app app run --debug