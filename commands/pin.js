import { ContextMenuCommandBuilder, ApplicationCommandType } from 'discord.js';

export const data = new ContextMenuCommandBuilder()
    .setName('채팅 고정')
    .setType(ApplicationCommandType.Message);

export async function execute(interaction) {
    const msg = interaction.targetMessage;
    await msg.pin();
    await interaction.reply(`https://discord.com/channels/${msg.guild.id}/${msg.channelId}/${msg.id} 채팅이 고정되었습니다.`);
}
