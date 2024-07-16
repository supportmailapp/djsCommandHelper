const { REST } = require("@discordjs/rest");
const { readdirSync } = require("node:fs");
const path = require("node:path");

const Routes = {
    commands: (appId) => {
        return `/applications/${appId}/commands`;
    },
    command: (appId, cmdId) => {
        return `/applications/${appId}/commands/${cmdId}`;
    },
    guildCommands: (appId, guildId) => {
        return `/applications/${appId}/commands/guilds/${guildId}/commands`;
    },
    guildCommand: (appId, guildId, cmdId) => {
        return `/applications/${appId}/commands/guilds/${guildId}/commands/${cmdId}`;
    },
};

/**
 * @typedef {Object} ClientData
 * @property {string} token - The token of your Discord bot.
 * @property {string} id - The ID of your Discord bot.
 */

/**
 * Create, update and delete global and guild application commands.
 *
 * To update guild-specific commands correctly, make sure the bot is logged in.\
 * Otherwise the check for a guild ID is omitted, and you could make pointless requests which can also result in an error
 *
 * @param {string} folderPath The absolute path to your commands folder (the command files have to be directly in it!)
 * @param {boolean} logs Whether to log what command was ignored, created, updated or deleted
 * @param {ClientData} clientDetails The client's details
 * @returns {Promise<boolean>} `true` if the operation was successfull. Otherwise `false`.
 */
module.exports.deployCommands = async function deployCommands(
    folderPath,
    logs = false,
    clientDetails
) {
    const clientId = clientDetails.id;

    let commands = [];
    let privateCommands = [];

    const commandFiles = readdirSync(folderPath).filter((file) =>
        file.endsWith(".js")
    );

    if (logs) console.log(`🔁 Started refreshing global and guild commands.`);

    try {
        const currentCommands = await rest.get(Routes.commands(clientId));
        let currentMap = new Map();
        currentCommands.forEach((cmd) => {
            currentMap.set(cmd.name, cmd);
        });

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if (!("data" in command)) {
                console.error(
                    `- Command '${command.name}' is missing the 'data' property!`
                );
                continue;
            } else if ("data" in command && Boolean(command.ignore ?? false)) {
                if (logs)
                    console.log(`- Command '${command.name}' is ignored!`);
                continue;
            }

            if ((command.guildIds ?? []).length > 0) {
                privateCommands.push({
                    data: command.data,
                    guildIds: command.guildIds,
                });
            } else {
                commands.push(command.data);
            }
        }

        const rest = new REST().setToken(clientDetails.token);

        let data;

        data = await rest.put(Routes.commands(clientId), { body: commands });
        if (logs) console.log(`✅ Global commands '${data.length}' refreshed`);

        for (let cmd of privateCommands) {
            for (let gid of cmd.guildIds) {
                data = await rest.post(Routes.guildCommands(clientId, gid), {
                    body: cmd.data,
                });
                if (logs)
                    console.log(`✅ Guild command '${data.name}' refreshed`);
            }
        }
        return true;
    } catch (err) {
        console.error("❌ Error while refreshing commands:", err);
        return false;
    }
};

/**
 * Shortcut method to delete an application command by its name or ID. **The client needs to be logged in!**
 *
 * @param {string} command The commands's name or ID
 * @param {string | null} guildId The guild's ID to delete the command in (not needed for a global command)
 * @param {ClientData} clientDetails The client's details
 * @returns {Promise<boolean>} `true` if the operation was successfull. Otherwise `false`.
 */
module.exports.deleteCommand = async function deleteCommand(
    command,
    guildId = null,
    clientDetails
) {
    const commandPath = (cmdId, guildId = null) => {
        if (guildId)
            return Routes.guildCommand(clientDetails.id, guildId, cmdId);
        return Routes.command(clientDetails.id, cmdId);
    };

    try {
        const rest = new REST().setToken(clientDetails.token);

        if (/^\d+$/i.test(command)) {
            await rest.delete(commandPath(command, guildId));
        } else {
            const theCommand =
                this.application.commands.cache.get(command) ??
                (await this.application.commands.fetch({
                    guildId: guildId,
                    cache: true,
                }));

            if (!theCommand) {
                console.error(
                    `❌ Command '${command}' not found in guild '${guildId}'`
                );
                return;
            }

            await rest.delete(commandPath(theCommand.id, guildId));
            if (logs) console.log(`✅ Guild command '${data.name}' deleted`);
        }
        return true;
    } catch (err) {
        console.error(
            `❌ Error while deleting a command in guild '${guildId}':`,
            err
        );
        return false;
    }
};
