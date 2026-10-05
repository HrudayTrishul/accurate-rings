# Company backend setup

The upgraded app defaults to sample mode and does not modify an existing company database.

## 1. Prepare a separate MySQL database

Create a database such as accurate_rings_v2. Copy backend/.env.example to backend/.env and configure:

~~~dotenv
APP_MODE=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=accurate_rings_v2
DB_USER=your_database_user
DB_PASSWORD=your_database_password
JWT_SECRET=at_least_32_random_characters
FRONTEND_URL=http://127.0.0.1:5173
~~~

Generate your own strong JWT secret. Never commit .env.

## 2. Initialize the schema

~~~sh
npm run db:init
~~~

Creates account and workspace tables in the configured database. It does not import the original application's tables. Back up before any separately planned migration.

## 3. Create an administrator

Set APP_ACCOUNT_PASSWORD in your terminal environment to a password of at least 12 characters, then run:

~~~sh
npm run user:create -- your_username "Your Name" admin
~~~

Clear the environment variable afterward. The script stores a bcrypt hash. Staff accounts use role staff; customer accounts require role customer followed by their workspace customer ID.

## 4. Start

~~~sh
npm run dev
~~~

Choose **Company login**. Business records begin empty, with a starter bearing product catalog. Add machines, create orders, add stock and begin production.

For HTTPS hosting, set NODE_ENV=production, configure the exact frontend origin and provide a trusted HTTPS reverse proxy. Secure cookies require HTTPS. Preserve MySQL and the JWT secret across restarts.

## Existing project

Original source was backed up before this upgrade and the local .env was retained. Demo mode is default when APP_MODE is absent. Use a separately configured v2 database; migration from the original schema must be planned and validated separately.
