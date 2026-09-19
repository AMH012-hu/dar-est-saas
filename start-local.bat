@echo off
cd /d "%~dp0"
where pnpm >nul 2>nul
if errorlevel 1 (
  echo pnpm is required. Install it with: npm install --global pnpm@10
  exit /b 1
)
if not exist .env (
  copy .env.example .env >nul
  echo Created .env. Review DATABASE_URL and JWT_SECRET, then run this file again.
  exit /b 1
)
if not exist node_modules (
  call pnpm install --frozen-lockfile
  if errorlevel 1 exit /b 1
)
call pnpm db:push
if errorlevel 1 exit /b 1
call pnpm dev
