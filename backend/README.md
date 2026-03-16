# Collaboration Analytics Platform Backend

## Run
- Copy `.env.example` to `.env` and update values.
- Install: `npm install`
- Dev: `npm run dev`
- Start: `npm start`

## Response Shape
```
{
  "success": true,
  "data": {},
  "message": "Optional message"
}
```

## Core Endpoints
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

- `GET /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `PATCH /api/users/:id/status`

- `POST /api/teams`
- `GET /api/teams`
- `GET /api/teams/:id`

- `POST /api/projects`
- `GET /api/projects`
- `GET /api/projects/:id`
- `PATCH /api/projects/:id`
- `DELETE /api/projects/:id`

- `POST /api/tasks`
- `GET /api/tasks`
- `GET /api/tasks/:id`
- `PATCH /api/tasks/:id`
- `PATCH /api/tasks/:id/status`
- `DELETE /api/tasks/:id`

- `GET /api/analytics/summary`
- `GET /api/analytics/team-productivity`
- `GET /api/analytics/project-progress`

- `GET /api/activity`
