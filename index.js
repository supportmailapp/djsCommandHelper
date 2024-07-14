const { Client, REST } = require("discord.js");
const { readdirSync } = require("node:fs");
const path = require("node:path");

const DEFAULT_OPTS = {
    ignored: true,
    created: true,
    updated: true,
    deleted: true,
    noLogs: false,
};

/**
 * A Discord Client, that is basically [discord.js' ``Client``](https://discord.js.org/docs/packages/discord.js/main/Client:Class) but with two functions added for command handling.
 */
class cDClient extends Client {
    /**
     * Create, update and delete global and guild application commands.
     *
     * To update guild-specific commands correctly, make sure the bot is logged in.\
     * Otherwise the check for a guild ID is omitted, and you could make pointless requests which can also result in an error
     *
     * @param {string} folderPath The absolute path to your commands folder (the command files have to be directly in it!)
     * @param {string} token The bot's token (if the client isn't logged in yet)
     * @param {DEFAULT_OPTS} logOptions Whether to log what command was ignored, created, updated or deleted
     */
    async deployCommands(folderPath, token = null, logOptions = DEFAULT_OPTS) {
        if (!(this.token || token || this.isReady())) {
            console.error(
                "Either token must be given or the client must be logged in!"
            );
            return;
        }

        if (logOptions.noLogs) {
            logOptions.ignored = false;
            logOptions.created = false;
            logOptions.updated = false;
            logOptions.deleted = false;
        }
        logOptions = Object.assign({}, DEFAULT_OPTS, logOptions || {});

        if (!this.isReady()) {
            console.error("The client isn't logged in!");
            return;
        }

        const clientId = this.user.id;
        let commands = [];
        let privateCommands = [];

        const commandsPath = folderPath;
        const commandFiles = readdirSync(commandsPath).filter((file) =>
            file.endsWith(".js")
        );

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if (!("data" in command) || !("run" in command)) {
                console.error(
                    `- Command '${command.name}' is missing the 'data' or 'run' property!`
                );
                continue;
            } else if (Boolean(command.ignore || false)) {
                if (logOptions.ignored)
                    console.log(`- Command '${command.name}' is ignored!`);
                continue;
            }

            if ((command.guildIds || []).length > 0) {
                privateCommands.push({
                    data: command.data,
                    guildIds: command.guildIds,
                });
            } else {
                commands.push(command.data);
            }
        }

        let rest;
        if (this.token) {
            rest = this.rest;
        } else {
            rest = new REST().setToken(token);
        }

        try {
            if (logOptions.status)
                console.log(
                    `🔁 Started refreshing ${commands.length} global and ${privateCommands.length} guild commands.`
                );

            // TODO: Update it to client.application.commands and fetch
            let currentCommands = this.application.commands.cache;
            if (!currentCommands.size)
                if (this.isReady()) {
                    currentCommands = await this.application.commands.fetch();
                } else {
                    currentCommands = await rest.get(
                        `/applications/${clientId}/commands`
                    );
                }

            const _new = [];
            const updated = [];
            const toDelete = [];

            // Initialising
            for (const command of commands) {
                if (!currentCommands.some((c) => c.name == command.name)) {
                    _new.push(command);
                }
            }

            for (const command of commands) {
                const currentCommand = currentCommands.find(
                    (c) => c.name === command.name
                );
                if (currentCommand && !deepEqual(command, currentCommand)) {
                    updated.push(command);
                }
            }

            for (const currentCommand of currentCommands) {
                if (!commands.some((c) => c.name == currentCommand.name)) {
                    toDelete.push(currentCommand);
                }
            }

            let data;

            if (logOptions.status)
                console.log(
                    `🔁 Deleting ${toDelete.length} global commands...`
                );
            for (let cmd of toDelete) {
                await rest.delete(
                    `/applications/${clientId}/commands/${cmd.id}`
                );
                if (logOptions.deleted) console.log(`✔️ Deleted '${cmd.name}'`);
            }

            if (logOptions.status)
                console.log(`🔁 Creating ${_new.length} global commands...`);
            for (let cmd of _new) {
                data = await rest.post(`/applications/${clientId}/commands`, {
                    body: cmd,
                });
                if (logOptions.created) console.log(`✔️ Created '${cmd.name}'`);
            }

            if (logOptions.status)
                console.log(`🔁 Updating ${updated.length} global commands...`);
            data = await rest.put(`/applications/${clientId}/commands`, {
                body: updated,
            });
            if (logOptions.updated)
                updated.forEach((cmd) =>
                    console.log(`✔️ Updated '${cmd.name}' global commands.`)
                );

            let gid;

            if (privateCommands.length) {
                // TODO: Add support for sharding

                let clientGuilds = [];

                if (!this.isReady()) {
                    // Wait for the guilds to cache before continuing
                    while (!this.guilds.cache.size) {
                        await new Promise((resolve) =>
                            setTimeout(resolve, 1000)
                        );
                    }
                    clientGuilds = this.guilds.cache;
                }

                if (logOptions.status)
                    console.log(`🔁 Updating guild commands...`);

                let updatedPrivates = 0;
                for (let command of privateCommands) {
                    for (gid of command.guildIds) {
                        if (
                            !clientGuilds ||
                            (clientGuilds &&
                                clientGuilds.find((guild) => guild.id === gid))
                        ) {
                            try {
                                data = await rest.post(
                                    `/applications/${clientId}/guilds/${gid}/commands`,
                                    {
                                        body: command.data,
                                    }
                                );
                                if (logOptions.updated)
                                    console.log(
                                        `✔️ Updated command '${command.data.name}' in guild '${gid}'.`
                                    );
                                updatedPrivates++;
                            } catch (err) {
                                console.error(
                                    `❌ Couldn't update '${command.data.name}'; Maybe the guild '${gid}' wasn't found in the current guilds.`
                                );
                            }
                        } else {
                            console.warn(
                                `⚠️ Couldn't update '${command.data.name}' since guild '${gid}' wasn't found in the current guilds.`
                            );
                        }
                    }
                }
                if (logOptions.updated)
                    console.log(
                        `✅ Updated ${updatedPrivates} guild commands.`
                    );
            }
        } catch (error) {
            console.error("Error while deploying commands", error);
        }
        return;
    }

    /**
     * Shortcut method to delete an application command by its name or ID. **The client needs to be logged in!**
     *
     * @param {string} command The commands's name or ID
     * @param {string | null} guildId The guild's ID to delete the command in (not needed for a global command)
     * @returns {Promise<void>}
     */
    async deleteCommand(command, guildId = null) {
        if (!this.isReady()) {
            console.error("The client must be logged in!");
            return;
        } else if (guildId && !/^\d+$/i.test(guildId)) {
            console.error("The guildId is invalid! Must be a numerous string.");
            return;
        }

        try {
            if (/^\d+$/i.test(command)) {
                await this.application.commands.delete(command, guildId);
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

                await this.application.commands.delete(theCommand.id, guildId);
            }
        } catch (err) {
            console.error(
                `❌ Error while deleting a command in guild '${guildId}'`,
                err
            );
        }
        return;
    }
}

module.exports = cDClient;

function deepEqual(obj1, obj2) {
    if (obj1 === obj2) {
        return true;
    }

    if (
        !obj1 ||
        !obj2 ||
        typeof obj1 !== "object" ||
        typeof obj2 !== "object"
    ) {
        return false;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
        return false;
    }

    for (const key of keys1) {
        if (!keys2.includes(key)) {
            return false;
        }

        if (!deepEqual(obj1[key], obj2[key])) {
            return false;
        }
    }

    return true;
}
