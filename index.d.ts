declare module "djs-command-deployer" {
    import { Client } from "@discordjs/core";

    export function deployCommands(client: Client, logUpdates?: boolean): null;
}