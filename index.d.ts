import { Client as dClient } from "@discordjs/core";

export interface logOptions {
    ignored?: boolean;
    created?: boolean;
    updated?: boolean;
    deleted?: boolean;
    noLogs?: boolean;
}

export class Client extends dClient {
    deployCommands(folderPath: string, token?: string, logOptions?: logOptions): Promise<void>;
}
