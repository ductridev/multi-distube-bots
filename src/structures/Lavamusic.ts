import fs from "node:fs";
import path from "node:path";
import { Api } from "@top-gg/sdk";
import {
  ApplicationCommandType,
  Client,
  ClientOptions,
  Collection,
  EmbedBuilder,
  Events,
  Interaction,
  PermissionsBitField,
  REST,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  Routes,
  Locale
} from "discord.js";
import config from "../config";
import ServerData from "../database/server";
import { env } from "../env";
import loadPlugins from "../plugin/index";
import { Utils } from "../utils/Utils";
import { T, i18n, initI18n, localization } from "./I18n";
import LavalinkClient from "./LavalinkClient";
import Logger from "./Logger";
import type { Command } from "./index";
import { registerBot } from "..";
import { BotConfig } from "@prisma/client";
import { PlayerSaver } from "./PlayerSaver";
import { ShardStateManager } from "./ShardStateManager";

export default class Lavamusic extends Client {
  public commands: Collection<string, any> = new Collection();
  public aliases: Collection<string, any> = new Collection();
  public db = new ServerData({} as BotConfig);
  public cooldown: Collection<string, any> = new Collection();
  public config = config;
  public readonly emoji = config.emoji;
  public readonly color = config.color;
  private body: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
  public topGG!: Api;
  public utils = Utils;
  public env: typeof env = env;
  public childEnv: BotConfig = {} as BotConfig;
  public manager!: LavalinkClient;
  public rest = new REST().setToken("");
  public playerSaver: PlayerSaver | null = null;
  public timeoutListenersMap: Map<string, NodeJS.Timeout> = new Map();
  public timeoutSongsMap: Map<string, NodeJS.Timeout> = new Map();
  public logger: Logger;
  public shardStateManager: ShardStateManager | null = null;
  public isShuttingDown: boolean = false;
  constructor(clientOptions: ClientOptions, bot: BotConfig) {
    super(clientOptions);
    this.logger = new Logger(bot.name);
    this.childEnv = bot;
  }
  public embed(): EmbedBuilder {
    return new EmbedBuilder();
  }

  public async start(): Promise<void> {
    initI18n(this.logger);
    this.playerSaver = new PlayerSaver(this.childEnv.name);
    this.db = new ServerData(this.childEnv);
    await this.db.connect();
    config.maintenance = await this.db.getMaintainMode();
    
    // Initialize ShardStateManager for cross-shard communication
    this.shardStateManager = new ShardStateManager(this);
    this.logger.info("ShardStateManager initialized");
    
    if (this.env.TOPGG) {
      this.topGG = new Api(this.env.TOPGG);
    } else {
      this.logger.warn("Top.gg token not found!");
    }
    this.rest = new REST().setToken(this.childEnv.token ?? "");
    this.manager = new LavalinkClient(this);
    await this.loadCommands();
    this.logger.info("Successfully loaded commands!");
    await this.loadEvents();
    this.logger.info("Successfully loaded events!");
    loadPlugins(this);
    await this.login(this.childEnv.token);
    registerBot(this);

    this.on(Events.InteractionCreate, async (interaction: Interaction) => {
      if (interaction.isButton() && interaction.guildId) {
        const setup = await this.db.getSetup(interaction.guildId);
        if (
          setup &&
          interaction.channelId === setup.textId &&
          interaction.message.id === setup.messageId
        ) {
          this.emit("setupButtons", interaction);
        }
      }
    });
  }

  private async loadCommands(): Promise<void> {
    const commandsPath = fs.readdirSync(
      path.join(process.cwd(), "dist", "commands")
    );

    for (const dir of commandsPath) {
      const commandFiles = fs
        .readdirSync(path.join(process.cwd(), "dist", "commands", dir))
        .filter((file) => file.endsWith(".js"));

      for (const file of commandFiles) {
        const cmdModule = require(
          path.join(process.cwd(), "dist", "commands", dir, file)
        );
        const command: Command = new cmdModule.default(this, file);
        command.category = dir;

        this.commands.set(command.name, command);
        command.aliases.forEach((alias: string) => {
          this.aliases.set(alias, command.name as any);
        });

        if (command.slashCommand) {
          const data: RESTPostAPIChatInputApplicationCommandsJSONBody = {
            name: command.name,
            description: T(Locale.Vietnamese, command.description.content),
            type: ApplicationCommandType.ChatInput,
            options: command.options || [],
            default_member_permissions:
              Array.isArray(command.permissions.user) &&
                command.permissions.user.length > 0
                ? PermissionsBitField.resolve(
                  command.permissions.user as any
                ).toString()
                : null,
            name_localizations: null,
            description_localizations: null,
          };

          const localizations: { name: any[]; description: string[] }[] = [];
          i18n.getLocales().map((locale: any) => {
            localizations.push(
              localization(locale, command.name, command.description.content)
            );
          });

          for (const localization of localizations) {
            const [language, name] = localization.name;
            const [language2, description] = localization.description;
            data.name_localizations = {
              ...data.name_localizations,
              [language]: name,
            };
            data.description_localizations = {
              ...data.description_localizations,
              [language2]: description,
            };
          }

          if (command.options.length > 0) {
            command.options.map((option) => {
              const optionsLocalizations: {
                name: any[];
                description: string[];
              }[] = [];
              i18n.getLocales().map((locale: any) => {
                optionsLocalizations.push(
                  localization(locale, option.name, option.description)
                );
              });

              for (const localization of optionsLocalizations) {
                const [language, name] = localization.name;
                const [language2, description] = localization.description;
                option.name_localizations = {
                  ...option.name_localizations,
                  [language]: name,
                };
                option.description_localizations = {
                  ...option.description_localizations,
                  [language2]: description,
                };
              }
              option.description = T(Locale.Vietnamese, option.description);
            });

            data.options?.map((option) => {
              if ("options" in option && option.options!.length > 0) {
                option.options?.map((subOption) => {
                  const subOptionsLocalizations: {
                    name: any[];
                    description: string[];
                  }[] = [];
                  i18n.getLocales().map((locale: any) => {
                    subOptionsLocalizations.push(
                      localization(
                        locale,
                        subOption.name,
                        subOption.description
                      )
                    );
                  });

                  for (const localization of subOptionsLocalizations) {
                    const [language, name] = localization.name;
                    const [language2, description] = localization.description;
                    subOption.name_localizations = {
                      ...subOption.name_localizations,
                      [language]: name,
                    };
                    subOption.description_localizations = {
                      ...subOption.description_localizations,
                      [language2]: description,
                    };
                  }
                  subOption.description = T(
                    Locale.Vietnamese,
                    subOption.description
                  );
                });
              }
            });
          }
          this.body.push(data);
        }

        const stay = await this.db.get_247(this.childEnv.clientId);
        if (!Array.isArray(stay)) return;

        await Promise.all(
          stay.map(async (s) => {
            try {
              const guild = await this.guilds.fetch(s.guildId).catch(() => null);
              if (!guild) {
                await this.db.delete_247(s.guildId, this.childEnv.clientId);
                return;
              }

              const channel = await guild.channels.fetch(s.voiceId).catch(() => null);
              if (!channel) {
                await this.db.delete_247(s.guildId, this.childEnv.clientId);
              }
            } catch (error) {
              await this.db.delete_247(s.guildId, this.childEnv.clientId);
            }
          })
        );
      }
    }
  }

  public async deployCommands(guildId?: string): Promise<void> {
    if (!this.application?.id) {
      this.logger.error("Bot is not ready yet—application ID is missing.");
      return;
    }

    const applicationId = this.application.id;
    const route = guildId
      ? Routes.applicationGuildCommands(applicationId, guildId)
      : Routes.applicationCommands(applicationId);

    try {
      // Fetch existing commands to preserve Entry Point commands
      const existingCommands = await this.rest.get(route) as any[];
      const entryPointCommands = existingCommands.filter((cmd: any) => 
        cmd.integration_types?.includes(1) || cmd.contexts?.includes(1)
      );
      
      // Merge our commands with existing Entry Point commands
      const commandsToUpdate = [
        ...this.body,
        ...entryPointCommands.filter((epc: any) => 
          !this.body.some((cmd: any) => cmd.name === epc.name)
        )
      ];
      
      await this.rest.put(route, { body: commandsToUpdate });
      this.logger.info("Successfully deployed slash commands!");
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async loadEvents(): Promise<void> {
    const eventsPath = fs.readdirSync(
      path.join(process.cwd(), "dist", "events")
    );

    for (const dir of eventsPath) {
      const eventFiles = fs
        .readdirSync(path.join(process.cwd(), "dist", "events", dir))
        .filter((file) => file.endsWith(".js"));

      for (const file of eventFiles) {
        const eventModule = require(
          path.join(process.cwd(), "dist", "events", dir, file)
        );
        const event = new eventModule.default(this, file);

        if (dir === "player") {
          this.manager.on(event.name, (...args: any) => event.run(...args));
        } else if (dir === "node") {
          this.manager.nodeManager.on(event.name, (...args: any) =>
            event.run(...args)
          );
        } else {
          this.on(event.name, (...args) => event.run(...args));
        }
      }
    }
  }
}