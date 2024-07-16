# djsCommandDeployer

A simple, easy to use module that houses functions to can refresh global and guild specific commands for your Discord App.

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
// Don't forget to load all things from discord.js

const { deployCommands } = require("djs-command-deployer");
const path = require("node:path");
require("dotenv").config(); // load your token and app's id

// Set up your client
// Use the guide as an example if you need help
// https://discordjs.guide/creating-your-bot/main-file

// When the client is ready, run this code once.
client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);

    // Call deployCommands to refresh your commands
    deployCommands(
        path.join(__dirname, "commands", "utility")
        {
            appToken: process.env.DISCORD_TOKEN,
            appId: process.env.ClientId,
        }
        // logs are optional
    );
});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
```

### Delete a guild-command

The name of a command of an application is unique, but only in its type.
Make sure that **you** have command's id and not it's name.

In this example we are building a manager-command that has StringOptions for the command and the guild id where one can paste in the ID or the name.

````js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { deleteCommand } = require("djs-command-helper");

module.exports = {
    guildIds: ["1114825999155200101"],
    data: new SlashCommandBuilder()
        .setName("manage-commands")
        .setDescription("Replies with Pong!")
        .addStringOption((op) =>
            op
                .setName("command-id")
                .setDescription(
                    "The ID of the command to be removed"
                )
        )
        .addStringOption((op) =>
            op
                .setName("server-id")
                .setDescription("The ID of the server from which the command is to be removed")
        ),

    // This function is called whenever an interactionCreate event is triggered.
    async run(interaction) {
        const guildId = interaction.options.getString("server-id");
        const command = interaction.options.getString("command-id");
        await interaction.deferReply({ ephemeral: true }); // Defer to remove the risk of not responding in time

        
        try {
            const response = await deleteCommand(command, {
                appToken: interaction.client.token,
                appId: interaction.application.id,
                guildId: guildId,
            });
        } catch (err) {  // respond with an error if the operation fails in some way
            return await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("❌ Command not deleted due to an error")
                        .setDescription("```" + err + "```")
                        .setColor(0xee0000),
                ],
            });
        }

        // Success!
        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("✅ Command deleted")
                    .setColor(0x44ff44),
            ],
        });
    },
};
````
