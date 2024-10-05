import { REST } from "@discordjs/rest";
import { readdirSync } from "node:fs";
import path from "node:path";
import { DeleteOptions, DeployOptions } from "./types.js";

const Routes = {
  commands: (appId: string): `/${string}` => {
    return `/applications/${appId}/commands`;
  },
  command: (appId: string, cmdId: string): `/${string}` => {
    return `/applications/${appId}/commands/${cmdId}`;
  },
  guildCommands: (appId: string, guildId: string): `/${string}` => {
    return `/applications/${appId}/guilds/${guildId}/commands`;
  },
  guildCommand: (
    appId: string,
    guildId: string,
    cmdId: string
  ): `/${string}` => {
    return `/applications/${appId}/guilds/${guildId}/commands/${cmdId}`;
  },
};

/**
 * Create, update and delete global and guild application commands.
 *
 * To update guild-specific commands correctly, make sure the bot is logged in.\
 * Otherwise the check for a guild ID is omitted, and you could make pointless requests which can also result in an error
 */
export async function deployCommands(
  folderPath: string,
  opts: DeployOptions
): Promise<boolean> {
  if (!opts.appToken || !opts.appId) {
    throw new Error("Missing 'appToken' or 'appId' in 'opts'!");
  }
  let commands = [];
  let privateCommands = [];

  const commandFiles = readdirSync(folderPath).filter((file) =>
    file.endsWith(".js")
  );

  if (opts.logs)
    console.log(`🔁 Started refreshing global and guild commands.`);

  try {
    const rest = new REST().setToken(opts.appToken);

    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      const command = (await import(filePath)).default;
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

      if ((command.guildIds || []).length > 0) {
        privateCommands.push({
          data: command.data,
          guildIds: command.guildIds,
        });
      } else {
        commands.push(command.data);
      }
    }

    let data: any = await rest.put(Routes.commands(opts.appId), {
      body: commands,
    });
    if (opts.logs) console.log(`✅ ${data.length} global commands refreshed`);

    for (let cmd of privateCommands) {
      for (let gid of cmd.guildIds) {
        data = null;
        data = await rest.post(Routes.guildCommands(opts.appId, gid), {
          body: cmd.data,
        });
        if (opts.logs) console.log(`✅ Guild command '${data.name}' refreshed`);
      }
    }
    return true;
  } catch (err) {
    console.error("❌ Error while refreshing commands:", err);
    return false;
  }
}

/**
 * Shortcut method to delete an application command by its ID. **The client needs to be logged in!**
 */
export async function deleteCommand(
  commandId: string,
  opts: DeleteOptions
): Promise<void> {
  const guildId = opts.guildId ?? null;

  const commandPath = guildId
    ? Routes.guildCommand(opts.appId, guildId, commandId)
    : Routes.command(opts.appId, commandId);

  if (commandId.match(/^\d+$/i)) {
    await new REST({ version: "10" })
      .setToken(opts.appToken)
      .delete(commandPath);
  } else {
    throw new Error("'commandId' is not a only-number-string!");
  }
  return;
}
