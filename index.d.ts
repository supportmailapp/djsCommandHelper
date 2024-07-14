import { Client } from "@discordjs/core";

export interface logOptions {
    ignored?: boolean,
    created?: boolean,
    updated?: boolean,
    deleted?: boolean,
    noLogs?: boolean
}

declare namespace djsCommandDeployer {
    export function deployCommands(client: Client, path: string, logOptions?: logOptions ): Promise<void>;
}