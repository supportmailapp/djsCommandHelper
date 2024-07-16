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
 * @typedef {Object} deployOptions
 * @property {string} appToken - The token of your Discord bot.
 * @property {string} appId - The ID of your Discord bot.
 * @property {boolean?} logs Whether to log what command was ignored, created, updated or deleted
 */

/**
 * @typedef {Object} DeleteOptions
 * @property {string} appToken The token of your Discord bot.
 * @property {string} appId The ID of your Discord bot.
 * @property {string | null} guildId The guild's ID to delete the command in (not needed for a global command)
 */

const DEFAULT_OPTS = {
    appToken: "",
    appId: "",
    logs: true,
};

/**
 * Create, update and delete global and guild application commands.
 *
 * To update guild-specific commands correctly, make sure the bot is logged in.\
 * Otherwise the check for a guild ID is omitted, and you could make pointless requests which can also result in an error
 *
 * @param {string} folderPath The absolute path to your commands folder (the command files have to be directly in it!)
 * @param {deployOptions} opts the appId, appToken and if the actions should be logged
 * @returns {Promise<boolean>} `true` if the operation was successfull. Otherwise `false`.
 */
module.exports.deployCommands = async function deployCommands(
    folderPath,
    opts = DEFAULT_OPTS
) {
    opts = Object.assign({}, DEFAULT_OPTS, opts || {});
    const clientId = opts.appId;

    let commands = [];
    let privateCommands = [];

    const commandFiles = readdirSync(folderPath).filter((file) =>
        file.endsWith(".js")
    );

    if (opts.logs)
        console.log(`🔁 Started refreshing global and guild commands.`);

    try {
        const rest = new REST().setToken(opts.appToken);

        const currentCommands = await rest.get(Routes.commands(clientId));
        let currentMap = new Map();
        currentCommands.forEach((cmd) => {
            currentMap.set(cmd.name, cmd);
        });

        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            const command = require(filePath);
            if (!("data" in command)) {
                console.error(
                    `- Command '${command.name}' is missing the 'data' property!`
                );
                continue;
            } else if ("data" in command && Boolean(command.ignore ?? false)) {
                if (opts.logs)
                    console.log(`- Command '${command.data.name}' is ignored!`);
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

        let data;

        data = await rest.put(Routes.commands(clientId), { body: commands });
        if (opts.logs)
            console.log(`✅ ${data.length} global commands refreshed`);

        for (let cmd of privateCommands) {
            for (let gid of cmd.guildIds) {
                data = await rest.post(Routes.guildCommands(clientId, gid), {
                    body: cmd.data,
                });
                if (opts.logs)
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
 * @param {string} commandId The commands id. Note, that command names can only be unique among their command type.
 * @param {DeleteOptions} opts the bot's token, ID and the guildId (if applicable)
 * @returns {Promise<void>}
 */
module.exports.deleteCommand = async function deleteCommand(commandId, opts) {
    const guildId = opts.guildId ?? null;

    const commandPath = guildId
        ? Routes.guildCommand(opts.appId, guildId, commandId)
        : Routes.command(opts.appId, commandId);

    if (commandId.match(/^\d+$/i)) {
        await new REST()
            .setToken(opts.appToken)
            .delete(commandPath(commandId, guildId));
    } else {
        throw new Error("command id is not a bigInt!");
    }
    return;
};
