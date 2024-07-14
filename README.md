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

**Example:**

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

<details>
<summary>Fields in the command file (Click to expand)</summary>

| Key name | Description                                                                                               | Default |
| -------- | --------------------------------------------------------------------------------------------------------- | ------- |
| ignore   | If set to `true` then this command will be ignored upon refreshing                                        | `false` |
| guildIds | An Array of guild ids in which the command should be registered/updated ; command is global if not set    | []      |
| data     | The raw command data [Learn more about it here](https://discordjs.guide/creating-your-bot/slash-commands) | `-`     |
| run      | The function to call (It's only important for your own logic - so name this whatever you want)            | `-`     |

`-` means that it doesn't have a default value

</details>

```js
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    ignore: true,
    guildIds: ["123456789", "987654321"], // Note: This wont automatically delete them from guilds!
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with Pong!"),

    // The function to call whenever the command is executed (Doesnt matter when calling client.deployCommands())
    async run(interaction) {
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
require("dotenv").config();

// Set up your client ; use the guide for example (https://discordjs.guide/creating-your-bot/main-file)

// Create a new client instance
let client = new Client({ intents: [GatewayIntentBits.Guilds] });

// When the client is ready, run this code (only once).
client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);

    // Call deployCommands to refresh your commands
    readyClient.deployCommands(
        pathJoin(__dirname, "commands", "utility")
        // Optional: logOptions object
    );
});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
```

### Delete a guild-command

There are two options to do this: Either with the command's ID or his name.

In this example we are building a manager-command that has StringOptions for the command and the guild id where one can paste in the ID or the name.\

Please see [the example code](https://github.com/The-LukeZ/djs-command-deployer-tests/blob/main/commands/command.js) for the command file and the [`index.js`](https://github.com/The-LukeZ/djs-command-deployer-tests/blob/main/index.js) on how to do this in general.

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

-   [ ] L94 | Fix that currentCommands is correct (currently doesn't work and therefore checking for current commands doesn't really work)

-   [ ] L166 | Add support for sharding

-   [ ] Finish `this.deleteCommand`

Feel free to help me with the TODOs, I will merge any useful pull requests :)
