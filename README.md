# TCM One App

Separated React Native frontend and MongoDB backend for Talent & Career Mission.

## Structure

- `frontend` - Expo React Native app with splash, login, and home screens.
- `backend` - Express API using MongoDB through Mongoose.

## Product direction

The first launch target is a small, instructor-led cybersecurity basics cohort. See the [cohort MVP brief](docs/product/CYBERSECURITY_COHORT_MVP.md), [critical user journeys](docs/product/CRITICAL_USER_JOURNEYS.md), and [research notes](docs/product/RESEARCH_NOTES.md). Architecture decisions live in [`docs/adr`](docs/adr).

## Setup

1. Copy backend environment values:

```bash
cp backend/.env.example backend/.env
```

2. Install dependencies:

```bash
npm install
```

3. Start MongoDB locally or update `MONGODB_URI` in `backend/.env`.

For local development against the backend on your laptop, use the Android
emulator loopback host:

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api
```

`10.0.2.2` points from the Android emulator back to your laptop. Note this is
only for local dev — production builds bake the API URL from the `TCM_API_URL`
repo variable at build time (see [docs/CI-CD.md](docs/CI-CD.md)).

4. Run the backend:

```bash
npm run dev:backend
```

5. Run the React Native app:

```bash
npm run dev:frontend
```

For Android:

```bash
npm run android
```

If `adb` or `emulator` is not available in your terminal, use these Windows paths or add them to PATH:

```powershell
$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe devices
$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe -list-avds
```

## Demo Login

After seeding MongoDB, use:

- Email: `student@tcm.com`
- Password: `password123`

If the backend is not running, the mobile app opens the home screen with demo fallback data.

## Default API

The frontend uses `EXPO_PUBLIC_API_URL` when present, otherwise it falls back to `http://localhost:5000/api`. In CI/CD, `EXPO_PUBLIC_API_URL` is baked into builds at build time from the `TCM_API_URL` repo variable (default `https://api.thecodemunk.in/api`).

## Production and CI/CD

Production serves the website at `https://app.thecodemunk.in`, the admin dashboard at `https://admin.thecodemunk.in`, and the API at `https://api.thecodemunk.in/api`.

See [Production operations](docs/PRODUCTION.md) for hosting inventory, persistent uploads, backups, monitoring and recovery. See [CI/CD](docs/CI-CD.md) for deployment workflows. Demo credentials above apply only to local development; production does not create demo accounts.
