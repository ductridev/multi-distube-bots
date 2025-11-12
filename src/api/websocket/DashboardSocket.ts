import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'node:http';
import Logger from '../../structures/Logger';
import type {
	BotStatusPayload,
	BotStatsPayload,
	PlayerStartPayload,
	PlayerEndPayload,
	GuildJoinPayload,
	GuildLeavePayload,
	ErrorPayload,
} from '../types';

export class DashboardSocketManager {
	private io: SocketIOServer | null = null;
	private logger: Logger;

	constructor() {
		this.logger = new Logger('DashboardSocket');
	}

	public initialize(server: HTTPServer, corsOrigin: string): void {
		this.io = new SocketIOServer(server, {
			cors: {
				origin: corsOrigin,
				methods: ['GET', 'POST'],
				credentials: true,
			},
			path: '/socket.io',
			transports: ['polling', 'websocket'], // Support both transports
			allowUpgrades: true, // Allow upgrading from polling to websocket
			pingTimeout: 60000, // Increase ping timeout for stability
			pingInterval: 25000, // Ping every 25 seconds
		});

		this.io.on('connection', (socket: Socket) => {
			this.logger.info(`Client connected: ${socket.id}`);

			socket.on('disconnect', () => {
				this.logger.info(`Client disconnected: ${socket.id}`);
			});

			// Handle authentication
			socket.on('authenticate', (_token: string) => {
				// TODO: Verify JWT token
				this.logger.info(`Client authenticated: ${socket.id}`);
				socket.emit('authenticated', { success: true });
			});
		});

		this.logger.success('WebSocket server initialized');
	}

	// Bot Events
	public emitBotStatus(payload: BotStatusPayload): void {
		this.io?.emit('bot:status', payload);
	}

	public emitBotStats(payload: BotStatsPayload): void {
		this.io?.emit('bot:stats', payload);
	}

	// Player Events
	public emitPlayerStart(payload: PlayerStartPayload): void {
		this.io?.emit('player:start', payload);
	}

	public emitPlayerEnd(payload: PlayerEndPayload): void {
		this.io?.emit('player:end', payload);
	}

	// Guild Events
	public emitGuildJoin(payload: GuildJoinPayload): void {
		this.io?.emit('guild:join', payload);
	}

	public emitGuildLeave(payload: GuildLeavePayload): void {
		this.io?.emit('guild:leave', payload);
	}

	// Error Events
	public emitError(payload: ErrorPayload): void {
		this.io?.emit('error', payload);
	}

	// Stats Update Event
	public emitStatsUpdate(data: any): void {
		this.io?.emit('stats:update', data);
	}

	public getIO(): SocketIOServer | null {
		return this.io;
	}
}

// Singleton instance
export const dashboardSocket = new DashboardSocketManager();
