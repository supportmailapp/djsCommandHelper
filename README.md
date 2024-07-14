# djsCommandDeployer

A simple, easy to use module that makes use of @discord.js/rest and creates, updates and deletes commands for your Discord App.

## Installation

```bash
npm i git+ssh://git@github.com:The-LukeZ/djs-command-deployer.git
```

## Usage

```js
const CommandDeployer = require("djs-command-deployer");

// Set up your client (https://discordjs.guide/creating-your-bot/main-file)

// Log in to Discord with your client's token
client.login(token);

// Call the CommandDeployer to deploy your commands
CommandDeployer(
    client,
    "commands/utility", // The (sub-)folder where your command files sit
    {
        // Set logOptions if you want (details in the next header)
        status: false,
        ignored: false,
    }
);
```

#### `logOptions`

| Option name | Description / Example                            | Default |
| ----------- | ------------------------------------------------ | ------- |
| `status`    | Logs like `Started refreshing X global commands` | `true`  |
| `ignored`   | Logs like `Command 'user' ignored`               | `true`  |
| `created`   | Logs like `Created 'user`'                       | `true`  |
| `updated`   | Logs like `Updated 'user'`                       | `true`  |
| `deleted`   | Logs like `Deleted 'user'`                       | `true`  |
| `noLogs`    | No logs at all (besides errors)                  | `false` |

Feel free to help me, I will merge any useful pull requests :)
