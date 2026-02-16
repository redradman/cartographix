# Contributing to Cartographix

Thanks for your interest in contributing to Cartographix! This guide will help you get started.

## Getting Started

See the [README](README.md) for setup instructions and local development.

## Submitting Issues

Please use the provided [issue templates](.github/ISSUE_TEMPLATE/) when opening a new issue:

- **Bug report** — for broken functionality or unexpected behavior
- **Feature request** — for new ideas or enhancements

## Submitting Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Test locally (both frontend and backend)
5. Open a pull request against `main`

Keep PRs focused on a single change. Include a clear description of what changed and why.

## Code Style

**Python (backend):**
- `snake_case` for variables and functions
- Type hints on all functions
- Pydantic models for request/response schemas
- `async` where possible

**React (frontend):**
- Functional components only
- `camelCase` for variables and functions
- Tailwind utility classes for styling
- shadcn/ui components over custom ones

**API:**
- All routes prefixed with `/api/`
- JSON responses with standard HTTP status codes

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
