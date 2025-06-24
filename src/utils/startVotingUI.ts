import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    Message,
    MessageComponentInteraction,
} from 'discord.js';
import { DisTube } from 'distube';
import { clearSession, getSession, setVoteExpire } from './sessionStore';
import { replyWithEmbed } from './embedHelper';

type VoteAction = 'skip' | 'stop';

export async function startVotingUI(
    message: Message,
    distube: DisTube,
    action: VoteAction,
    onPassed: () => Promise<void>
) {
    const queue = distube.getQueue(message);
    if (!queue) {
        await replyWithEmbed(message, 'error', 'Không có bài hát nào đang phát.');
        return;
    }

    const guildId = message.guild!.id;
    const session = await getSession(guildId); // ✅ Now async
    const vc = message.member?.voice.channel;
    const userId = message.author.id;

    if (!vc || !session) {
        await replyWithEmbed(message, 'error', 'Không xác định được kênh thoại hoặc phiên bot.');
        return;
    }

    if(userId === session.initiatorId) {
        onPassed();
        return;
    }

    const members = vc.members.filter(m => !m.user.bot);
    const requiredVotes = Math.ceil((members.size + 1) * 0.8);

    const votes = new Set<string>();
    const voters = new Set<string>();
    votes.add(userId);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('vote_yes').setLabel('👍 Bỏ qua').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('vote_no').setLabel('👎 Giữ nguyên').setStyle(ButtonStyle.Danger),
    );

    const voteMsg = await message.reply({
        content: `🗳️ **Bình chọn để \`${action}\` bài hát**\nYêu cầu: ${requiredVotes} phiếu từ người trong kênh thoại.\n✅ Hiện tại: (1/${requiredVotes})`,
        components: [row],
    });

    const collector = voteMsg.createMessageComponentCollector({
        time: 5 * 60 * 1000,
    });

    collector.on('collect', async (i: MessageComponentInteraction) => {
        if (!(i instanceof ButtonInteraction)) return;
        if (!vc.members.has(i.user.id)) {
            await i.reply({ content: '⛔ Bạn không có trong kênh thoại.', ephemeral: true });
            return;
        }
        if (i.user.id === session.initiatorId) {
            await i.reply({ content: '⚠️ Bạn là người thêm bot, không cần bỏ phiếu.', ephemeral: true });
            return;
        }
        if (voters.has(i.user.id)) {
            await i.reply({ content: '⚠️ Bạn đã bỏ phiếu rồi.', ephemeral: true });
            return;
        }

        if (i.customId === 'vote_yes') {
            votes.add(i.user.id);
        }
        voters.add(i.user.id);

        const current = votes.size;
        const passed = current >= requiredVotes;

        await i.update({
            content: passed
                ? `✅ Đã đạt ${current}/${requiredVotes} phiếu. Hành động \`${action}\` sẽ được thực hiện.`
                : `🗳️ **Bình chọn để \`${action}\` bài hát**\nYêu cầu: ${requiredVotes} phiếu\n✅ Hiện tại: (${current}/${requiredVotes})`,
            components: passed ? [] : [row],
        });

        if (passed) {
            collector.stop('passed');
            await onPassed();
        }
    });

    // ⏱️ Create timeout locally and store its expiry timestamp in MongoDB
    const timeoutMs = 5 * 60 * 1000;
    const timeout = setTimeout(() => {
        if (!collector.ended) collector.stop('timeout');
    }, timeoutMs);

    await setVoteExpire(message.guildId!, timeoutMs); // ✅ Update DB with expiration

    collector.on('end', async (_, reason) => {
        clearTimeout(timeout);

        if (reason !== 'passed') {
            await voteMsg.edit({
                content: `⏰ Hết thời gian bình chọn cho hành động \`${action}\`.`,
                components: [],
            });
        } else {
            await clearSession(message.guildId!);
        }
    });
}
