export const deleteByVoiceChannelId = (map: Map<string, string>, voiceChannelId: string) => {
    for (const [guildId, vcId] of map.entries()) {
        if (vcId === voiceChannelId) {
            map.delete(guildId);
            break;
        }
    }
}