import { ContextMenuCommandBuilder, ApplicationCommandType } from 'discord.js';

export const data = new ContextMenuCommandBuilder()
    .setName('채팅 고정해제')
    .setType(ApplicationCommandType.Message);

export async function execute(interaction) {
    const msg = interaction.targetMessage;
    await msg.unpin();
    await interaction.reply(`https://discord.com/channels/${msg.guild.id}/${msg.channelId}/${msg.id} 채팅이 고정 해제되었습니다.`);
}
