# Nabu
Nabu (Mesopotamian/Babylonian) — scribe god of wisdom and writing. → Brand: NabuNote, Nabu

## About project

- **NextJS 15**
- **shadcn/ui** components with **Tailwind CSS**
- **Prisma ORM**

Test:

- **Jest**

Database:

- **PostgreSQL**

## Setup

- Local

```bash
npm install

cp .env.example .env
# Check env.ts file for validation

npm run prisma migrate reset

npm run dev
```

- Production

```bash
npm install

cp .env.example .env
# Check env.ts file for validation

npm run build

npm run start
```

- Preview

```bash
npm run preview
```

## Prisma

- Local

```bash
npm run prisma validate

npm run prisma format

npm run prisma migrate dev --name "name"
```

- Reset database and seed again

```bash
npm run prisma migrate reset
```

- Manually run seed

```bash
npm run seed
```

- Production

```bash
npm run prisma migrate deploy
```

## Test

- Jest

```bash
npm run test

npm run test:coverage
```

- Custom jest test runner

```bash
npm run test:file "<file_path>"

npm run test:file:coverage "<file_path>"
```

## Development docker

- docker-compose.yaml

```bash
docker compose up -d
docker compose stop
docker compose start

docker compose ps
```
