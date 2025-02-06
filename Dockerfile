FROM python:3.10-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv venv
ENV VIRTUAL_ENV=/app/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

COPY server/requirements.txt .
RUN pip install -r requirements.txt

# Stage 2
FROM python:3.10-slim AS runner

WORKDIR /app

COPY --from=builder /app/venv venv
COPY server/ server/

ENV VIRTUAL_ENV=/app/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
ENV FLASK_APP=server/wsgi.py

EXPOSE 8080

CMD ["gunicorn", "--bind", ":8080", "--workers", "2", "server.wsgi:app"]