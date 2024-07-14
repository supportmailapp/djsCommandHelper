# djsCommandDeployer

A simple, easy to use module that makes use of @discord.js/rest and creates, updates and deletes commands for your Discord App.

## Installation

```bash
npm i git+ssh://git@github.com:The-LukeZ/djsCommandDeployer.git
```

## Usage

#### Folder structure

```tree
yourApp
+-- index.js
|
+-- commands
|   +-- utility
|       +-- ping.js
|       +-- private-command.js
```

#### The command file

> **Note that for using this you need to install [discord.js](https://discordjs.guide/)!**

```js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    ignore: true, // If set to true, this command will not ignored when refreshing all commands
    guildIds: ["1234567890"], // If set, the command will be registered/updated in all guilds | You need to manually delete this
    data: new SlashCommandBuilder() // Your command data
        .setName('ping')
        .setDescription('Replies with Pong!'),
    run: async (interaction) => { // The function to call whenever the command is executed
        await interaction.reply('Pong!');
    },
    // Other option
    async run(interaction) => { // The function to call whenever the command is executed
        await interaction.reply('Pong!');
    },
};
```

### Deploy the commands

```js
const { Events, GatewayIntentBits } = require("discord.js");
// Name it whatever you want
const CommandClient = require("djsCommandDeployer");

const { token } = require("./config.json");

// Set up your client like shown in (https://discordjs.guide/creating-your-bot/main-file)

// Create a new client instance
let client = new CommandClient({ intents: [GatewayIntentBits.Guilds] });

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);

    // Call the CommandDeployer to refresh your commands
    client.deployCommands("commands/utility"); // Optional: logOptions object
});

// Log in to Discord with your client's token
client.login(token);
```

#### `logOptions`

| Option name | Description / Example                            | Default |
| ----------- | ------------------------------------------------ | ------- |
| `status`    | Logs like `Started refreshing X global commands` | `true`  |
| `ignored`   | Logs like `Command 'user' ignored`               | `true`  |
| `created`   | Logs like `Created 'user'`                       | `true`  |
| `updated`   | Logs like `Updated 'user'`                       | `true`  |
| `deleted`   | Logs like `Deleted 'user'`                       | `true`  |
| `noLogs`    | No logs at all (besides errors)                  | `false` |

### TODO

-   [ ] L93 | Update it to client.application.commands and fetch

-   [ ] L162 | Add support for sharding

-   [ ] L166 | Only do this, if the client is logged in so that no client is needed

-   [ ] L177 | Only check the bot's guilds if they are present + add something to catch an error if a guild's ID is not found

Feel free to help me with the TODOs, I will merge any useful pull requests :)
