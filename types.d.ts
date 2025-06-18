export interface DeployOptions {
  /**
   * The token of the application that will deploy the commands.
   */
  appToken: string;
  /**
   * The ID of the application that the commands will be deployed to.
   */
  appId: string;
  /**
   * If set to true, the function will log the deployment process.
   *
   * @default true
   */
  logs?: boolean;
  /**
   * The file extension of the command files to be deployed.
   *
   * This can be useful in development environments where you might use `tsx` which allows you to use TypeScript files directly.
   *
   * @default ".js"
   */
  fileExtension?: `.${string}`;
}

export interface DeleteOptions {
  /**
   * The token of the application that will delete the command.
   */
  appToken: string;
  /**
   * The ID of the application that the command will be deleted from.
   */
  appId: string;
  /**
   * The ID of the guild where the command will be deleted. If not set, it is assumed that the command is global.
   *
   * @default null
   */
  guildId?: string | null;
}

/**
 * Create, update and delete global and guild application commands.
 *
 * This will overwrite all commands. Non-supplied commands are deleted if they are registered globally.
 *
 * Guild-commands have to be deleted manually.
 */
export function deployCommands(
  folderPath: string,
  opts: DeployOptions
): Promise<boolean>;

/**
 * Delete a command from Discord.
 */
export function deleteCommand(
  commandId: string,
  opts: DeleteOptions
): Promise<void>;

/**
 * A generic command object that can be used to deploy commands to Discord.
 */
export interface GenericCommand {
  /**
   * The command data, as defined by the Discord API or a discord.js-SlashCommandBuilder.
   * For more information, check the [Discord API documentation](https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-structure) or the [discord.js documentation](https://discord.js.org/docs/packages/builders/1.9.0/SlashCommandBuilder:Class).
   */
  data: any;
  /**
   * An array of guild IDs where the command should be deployed. If empty, the command will be deployed globally.
   */
  guildIds?: string[];
  /**
   * If set to true, the command will be ignored during deployment.
   *
   * ### This will mean that the command will be removed when it's registered globally.
   */
  ignore?: boolean;
}
