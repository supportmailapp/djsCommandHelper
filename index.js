import { Client, ClientOptions } from "@discordjs/core";
import { REST } from "@discordjs/rest";
import { readdirSync } from "node:fs";
import "node:path";

const DEFAULT_OPTS = {
    ignored: true,
    created: true,
    updated: true,
    deleted: true,
    noLogs: false,
};

// TODO: Error "Client is not a constructor"

/**
 * A Discord Client, that is basically [discord.js' ``Client``](https://discord.js.org/docs/packages/discord.js/main/Client:Class) but with two functions added for command handling.
 */
module.exports = class cDClient extends Client {
    /**
     * Create, update and delete global and guild application commands.
     *
     * To update guild-specific commands correctly, make sure the bot is logged in.\
     * Otherwise the check for a guild ID is omitted, and you could make pointless requests which can also result in an error
     *
     * @param {string} folderPath The relative path to your commands folder (the command files have to be directly in it!)
     * @param {string} token The bot's token (if the client isn't logged in yet)
     * @param {DEFAULT_OPTS} logOptions Whether to log what command was ignored, created, updated or deleted
     */
    async deployCommands(
        folderPath = "./commands/utility",
        token = null,
        logOptions = DEFAULT_OPTS
    ) {
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

        const commandsPath = path.join(__dirname, folderPath);
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
            rest = client.rest;
        } else {
            rest = new REST().setToken(token);
        }

        try {
            if (logOptions.status)
                console.log(
                    `🔁 Started refreshing ${commands.length} global and ${privateCommands.length} guild commands.`
                );

            // TODO: Update it to client.application.commands and fetch
            let currentCommands = client.application.commands.cache;
            if (!currentCommands)
                if (client) {
                    currentCommands = await client.application.commands.fetch();
                } else {
                    currentCommands = await rest.get(
                        `/applications/${clientId}/commands`
                    );
                }

            const _new = [];
            const updated = [];
            const toDelete = [];
            let data, gid;

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

            if (logUpdates)
                console.log(
                    `🔁 Deleting ${toDelete.length} global commands...`
                );
            for (let cmd of toDelete) {
                await rest.delete(
                    `/applications/${clientId}/commands/${cmd.id}`
                );
                if (logUpdates) console.log(`✔️ Deleted '${cmd.name}'`);
            }

            if (logUpdates)
                console.log(`🔁 Creating ${_new.length} global commands...`);
            for (let cmd of _new) {
                data = await rest.post(`/applications/${clientId}/commands`, {
                    body: cmd,
                });
                if (logUpdates) console.log(`✔️ Created '${cmd.name}'`);
            }

            if (logUpdates)
                console.log(`🔁 Updating ${updated.length} global commands...`);
            data = await rest.put(`/applications/${client.id}/commands`, {
                body: updated,
            });
            if (logUpdates)
                updated.forEach((cmd) =>
                    console.log(`✔️ Updated '${cmd.name}' global commands.`)
                );

            if (privateCommands.length) {
                // TODO: Add support for sharding

                let clientGuilds = [];

                // TODO: Only do this, if the client is present so that no client is needed
                // Wait for the guilds to cache before continuing
                while (!client.guilds.cache.size) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
                clientGuilds = client.guilds.cache;

                if (logUpdates) console.log(`🔁 Updating guild commands...`);
                let updatedPrivates = 0;
                for (let command of privateCommands) {
                    for (gid of command.guildIds) {
                        // TODO: Only check the bot's guilds if they are present + add something to catch an error if a guild's ID is not found
                        if (clientGuilds.find((guild) => guild.id === gid)) {
                            data = await rest.post(
                                `/applications/${clientId}/guilds/${gid}/commands`,
                                {
                                    body: command.data,
                                }
                            );
                            if (logUpdates)
                                console.log(
                                    `✔️ Updated command '${command.data.name}' in guild ${gid}.`
                                );
                            updatedPrivates++;
                        } else {
                            if (logUpdates)
                                console.log(
                                    `❌ Couldn't update '${command.data.name}' since guild ${gid} wasn't found in the current guilds.`
                                );
                        }
                    }
                }
                if (logOptions.status)
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
     *
     * @param {string} command The commands's name or ID | the name will be parsed first
     * @param {string} guildId The guild's ID to delete the command in
     * @returns {Promise<void>}
     */
    async deleteGuildCommand(commandName, guildId) {
        try {
        } catch (err) {
            console.error("Error while deleting a guild command", error);
        }
        return;
    }
};

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
