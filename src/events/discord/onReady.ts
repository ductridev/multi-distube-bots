import ExtendedClient from "../../@types/extendedClient";
import { BotConfigModel } from "../../models/BotConfig";

export const onReady = async (client: ExtendedClient, name: string) => {
    console.log(`[${name}] Đã đăng nhập với ${client.user?.tag}`);

    const botConfig = await BotConfigModel.findOne({ name });

    if (!botConfig) return;

    if (botConfig.displayName && client.user?.username !== botConfig.displayName) {
        try {
            await client.user.setUsername(botConfig.displayName);
            console.log(`✅ Updated bot name to ${botConfig.displayName}`);
        } catch (err) {
            console.warn(`⚠️ Could not update username:`, err);
        }
    }

    if (botConfig.avatarURL) {
        try {
            const currentAvatarURL = client.user.displayAvatarURL({ extension: 'png', forceStatic: true });
            if (currentAvatarURL.includes(botConfig.avatarURL) || currentAvatarURL === botConfig.avatarURL) return;

            await client.user.setAvatar(botConfig.avatarURL);
            console.log(`✅ Updated bot avatar`, client.user.id);
        } catch (err) {
            console.warn(`⚠️ Could not update avatar:`, err);
        }
    }
}