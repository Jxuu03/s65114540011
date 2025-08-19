FROM python:3.12-slim


# Install dependencies for PostgreSQL + pg_isready
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    postgresql-client \
    build-essential \
    curl \
    && apt-get clean


WORKDIR /app


# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# Copy source code
COPY . .


EXPOSE 8000


CMD sh -c "\
until pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; do \
  echo 'Waiting for PostgreSQL...'; sleep 2; \
done && \
python manage.py migrate && \
gunicorn freshyfishy.wsgi:application --bind 0.0.0.0:8000 --workers 3"
