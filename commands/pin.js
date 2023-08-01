const { ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');
module.exports = {
	  data: new ContextMenuCommandBuilder()
      .setName('채팅 고정')
      .setType(ApplicationCommandType.Message),

    async execute(interaction){
      const msg = interaction.targetMessage;
      msg.pin();
      await interaction.reply(`https://discord.com/channels/${msg.guild.id}/${msg.channelId}/${msg.id} 채팅이 고정되었습니다.`);
    }
}