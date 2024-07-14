const { REST } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

module.exports = async function deployCommands(client, logUpdates = true) {
    // TODO Add support for sharding
    while (!client.guilds.cache.size) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const clientId = client.user.id;
    const clientGuilds = client.guilds.cache;
    let commands = [];
    let privateCommands = [];

    const commandsPath = path.join(__dirname, "utility");
    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if (!("data" in command) || !("run" in command)) {
            console.error(
                `- Command "${command.name}" is missing the 'data' or 'run' property!`
            );
            continue;
        } else if (Boolean(command.ignore || false)) {
            if (logUpdates)
                console.log(`- Command "${command.name}" is ignored!`);
            continue;
        }

        if ((command.guildIds || []).length > 0) {
            privateCommands.push({
                data: command.data,
                guildIds: command.guildIds,
            });
            if (logUpdates)
                console.log({ data: command.data, guildIds: command.guildIds });
        } else {
            commands.push(command.data);
        }
    }

    if (logUpdates) console.log("privateCommands", privateCommands);
    const rest = new REST().setToken(client.token);

    try {
        if (logUpdates)
            console.log(
                `🔁 Started refreshing ${commands.length} global and ${privateCommands.length} guild commands.`
            );

        const currentCommands = await rest.get(
            `/applications/${clientId}/commands`
        );
        if (logUpdates) console.log("currentCommands", currentCommands);

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
            console.log(`🔁 Deleting ${toDelete.length} global commands...`);
        for (let cmd of toDelete) {
            await rest.delete(`/applications/${clientId}/commands/${cmd.id}`);
            if (logUpdates) console.log(`✔️ Deleted ${cmd.name}`);
        }

        if (logUpdates)
            console.log(`🔁 Creating ${_new.length} global commands...`);
        for (let cmd of _new) {
            data = await rest.post(`/applications/${clientId}/commands`, {
                body: cmd,
            });
            if (logUpdates) console.log(`✔️ Created ${cmd.name}`);
        }

        if (logUpdates)
            console.log(`🔁 Updating ${updated.length} global commands...`);
        data = await rest.put(`/applications/${client.id}/commands`, {
            body: updated,
        });
        if (logUpdates)
            console.log(`✔️ Updated ${data.length} global commands.`);

        if (logUpdates) console.log(`🔁 Updating guild commands...`);
        let updatedPrivates = 0;
        for (let command of privateCommands) {
            for (gid of command.guildIds) {
                if (clientGuilds.find((guild) => guild.id === gid)) {
                    data = await rest.post(
                        `/applications/${clientId}/guilds/${gid}/commands`,
                        {
                            body: command.data,
                        }
                    );
                    if (logUpdates)
                        console.log(
                            `✔️ Updated command "${command.data.name}" in guild ${gid}.`
                        );
                    updatedPrivates++;
                } else {
                    if (logUpdates)
                        console.log(
                            `❌ Couldn't update "${command.data.name}" since guild ${gid} wasn't found in the current guilds.`
                        );
                }
            }
        }
        if (logUpdates)
            console.log(
                `✅ Successfully updated ${updatedPrivates} guild commands.`
            );
    } catch (error) {
        console.error("Error", error);
    }
    return;
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
