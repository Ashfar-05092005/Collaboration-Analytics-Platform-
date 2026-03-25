# Collaboration Analytics Platform

The Collaboration Analytics Platform provides a centralized web-based solution to manage projects and tasks while analyzing team collaboration activities.

This repository is split into two apps:
- `frontend/` (React)
- `backend/` (Node.js + Express)

## Running the code

## Node.js version

This project targets Node.js 20.x (frontend and backend both declare `engines.node: 20.x`).

- Recommended: use Node.js 20 LTS
- Version file included: `.nvmrc` (set to `20`)

Windows (recommended with nvm-windows):
- Install nvm-windows from: https://github.com/coreybutler/nvm-windows/releases
- Open a new terminal and run:
	- `nvm install 20.18.3`
	- `nvm use 20.18.3`
	- `node -v`

If you stay on Node 22, the app may still run, but you can get compatibility warnings.

Frontend and backend startup scripts now run an automatic version check and will exit early if Node is not 20.x.

Frontend:
- `cd frontend`
- `npm i`
- `npm start`

Backend:
- `cd backend`
- `npm i`
- `npm run dev`
