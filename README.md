# djsCommandDeployer

A simple, easy to use module that houses a Discord Client class that has two additional functions that can create, update and delete global and guild specific commands for your Discord App.

## Installation

```bash
npm install git+ssh://git@github.com:The-LukeZ/djsCommandDeployer.git
npm install djs-command-deployer
```

## Usage

#### Folder structure

_The `src` folder it can be any folder. Just the `commands` folder should be a subfolder of the directory your `index.js` is located in._

```
📂src
 ┣ 📄index.js
 ┗ 📂commands
   ┗📂utility
     ┣ 📄ping.js
     ┗ 📄your-private-command.js
```

#### The command file

> **Note that for using this you need to install [discord.js](https://discordjs.guide/)!**

```js
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    ignore: true, // If set to true, this command will not ignored when refreshing all commands
    guildIds: [
        // If set, the command will be registered/updated in all guilds | This wont automatically delete them from guilds!
        "123456789",
        "987654321",
    ],
    data: new SlashCommandBuilder() // Your command data
        .setName("ping")
        .setDescription("Replies with Pong!"),
    run: async (interaction) => {
        // The function to call whenever the command is executed
        await interaction.reply("Pong!");
    },
    // Other way if you dont want an anonymous function
    async run(interaction) {
        // The function to call whenever the command is executed
        await interaction.reply("Pong!");
    },
};
```

### Deploy the commands

```js
const { Events, GatewayIntentBits } = require("discord.js");
// Name it whatever you want
const Client = require("djs-command-deployer");
const { join: pathJoin } = require("node:path");

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
    readyClient.deployCommands(
        pathJoin(__dirname, "commands", "utility")
        // Optional: logOptions object
    );
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

-   [ ] L164 | Add support for sharding

-   [ ] Finish `this.deleteCommand`

Feel free to help me with the TODOs, I will merge any useful pull requests :)
