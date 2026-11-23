FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    SKIP_DB_INIT_ON_IMPORT=true

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY database /database

EXPOSE 5000

# In local Docker Compose (APP_ENV=development), initializes DB once in the parent shell
# before replacing the process with Gunicorn. In staging/production, starts Gunicorn directly
# without running automatic migrations on container boot.
CMD ["sh", "-c", "if [ \"${APP_ENV:-development}\" = \"development\" ]; then python -m app.init_db; fi && exec gunicorn app.app:app --bind 0.0.0.0:${PORT:-5000} --workers 2 --threads 4 --timeout 60"]
