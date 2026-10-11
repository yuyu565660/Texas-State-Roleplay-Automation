# Texas State Roleplay Automation

This is a separate Discord bot repository. It does not replace or delete files from the original Texas State Roleplay bot.

## Requirements

- Node.js 24.x (use the same major version on your host and local machine)
- A Discord application/bot with the required intents enabled
- The repository's tracked `config.json`
- Host environment variables configured outside GitHub

## Install and run

```sh
npm install
npm start
```

The package start script runs `node start.js`, which loads `index.js`. The bot needs the full repository tree, not only the `commands/` directory: startup loads JavaScript files from `commands/` and `events/` and imports supporting modules such as `utils/persistenceManager.js`.

## Required environment variables

Set these in the hosting provider's environment settings. Do not commit a real `.env` file or any tokens/keys.

- `TOKEN` — Discord bot token (required)
- `CLIENT_ID` — Discord application ID (required by startup; may fall back to `config.json`)
- `GUILD_ID` — Discord server ID (required by startup; may fall back to `config.json`)
- `PORT` — optional HTTP listener port; defaults to `3000`
- `ERLC_SERVER_KEY` — optional ER:LC server API key if the enabled systems need it
- `ERLC_GLOBAL_KEY` — optional ER:LC global API key if the enabled systems need it
- `MELONLY_API_KEY` — optional Melonly API key if the enabled systems need it

See `.env.example` for a placeholder template. Environment variables should be configured separately for each bot deployment.

## Deploy slash commands

```sh
npm run deploy
```

Run this only after configuring the correct bot token and verifying the application/server IDs. The running bot also attempts to deploy its loaded slash commands at startup.

## Host setup

Configure the host to install dependencies with `npm install` and start with `npm start`. Enable automatic restart on process exit and persistent storage if the bot's data/backup files must survive restarts. Run only one instance of this bot against the same data directory; the process lock is a safeguard, not a hosting service.

## Two-bot plan

Keep this repository and the original bot repository separate. Do not copy tokens, `.env` files, private keys, or Jarvis features. When integrating the bots later, use a deliberate shared interface (for example, a scoped webhook or authenticated service) instead of having both bots independently handle the same Discord interaction.

## Verification status

A successful GitHub commit does not prove the bot is online. After deployment, check the host logs for a successful Discord login, command/event loading, and slash-command deployment. Test important commands and event flows in a test server before relying on them.
