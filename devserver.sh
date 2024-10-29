#!/bin/sh
source .venv/bin/activate
# python -m flask --app app run --debug
flask run --port=5000 --reload