# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- CI workflow for lint and build checks on push/PR
- Project quality scripts (`lint`, `lint:fix`, `typecheck`, `check`)

### Changed
- Unified backend/frontend service architecture with `server/api.js`
- Runtime defaults now start with empty `groups` and `agents`
- Group color configuration removed from persisted config and APIs
- Additional i18n coverage for language switch label and time units

## [1.0.0] - 2024-01-01

### Added
- Initial release
- Real-time agent status monitoring with SSE
- Office-themed UI with day/night cycle
- Agent editing (name, avatar, group)
- Group management (add/delete/filter)
- Chinese/English bilingual support
- Docker support
