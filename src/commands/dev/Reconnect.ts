import util from 'node:util';
import { Command, type Context, type Lavamusic } from '../../structures/index';

export default class Reconnect extends Command {
    constructor(client: Lavamusic) {
        super(client, {
            name: 'reconnect',
            description: {
                content: 'Reconnect to disconnected nodes',
                examples: ['reconnect'],
                usage: 'reconnect',
            },
            category: 'dev',
            aliases: ['rc', 'rconnect'],
            cooldown: 3,
            args: false,
            player: {
                voice: false,
                dj: false,
                active: false,
                djPerm: null,
            },
            permissions: {
                dev: true,
                client: ['SendMessages', 'ReadMessageHistory', 'ViewChannel', 'EmbedLinks'],
                user: [],
            },
            slashCommand: false,
            options: [],
        });
    }

    public async run(client: Lavamusic, ctx: Context, args: string[]): Promise<any> {
        // Get nodes if provided, else get all disconnected nodes
        let nodesToReconnect = args.length
            ? args.map((arg) => arg.trim().replaceAll('_', ' '))
            : client.manager.nodeManager.nodes.filter((node) => !node.connected).map((node) => node.id);

        if (nodesToReconnect.length === 0) {
            return ctx.sendMessage({
                content: 'All nodes are currently connected. No nodes to reconnect.',
            });
        }

        const reconnectResults: Record<string, string> = {};
        for (const nodeId of nodesToReconnect) {
            const node = client.manager.nodeManager.nodes.get(nodeId);
            if (!node) {
                reconnectResults[nodeId] = 'Node not found.';
                continue;
            }
            if (node.connected) {
                reconnectResults[nodeId] = 'Node is already connected.';
                continue;
            }
            try {
                const sessionId = client.playerSaver!.getAllLastNodeSessions().get(node.id!);
                node.connect(sessionId);
                reconnectResults[nodeId] = 'Reconnected successfully.';
            } catch (error) {
                reconnectResults[nodeId] = `Failed to reconnect: ${util.inspect(error)}`;
            }
        }

        // Format the results
        const resultMessages = Object.entries(reconnectResults).map(
            ([nodeId, result]) => `Node ${nodeId}: ${result}`
        ).join('\n');

        return ctx.sendMessage({
            content: `**Reconnect Results:**\n${resultMessages}`,
        });
    }
}


