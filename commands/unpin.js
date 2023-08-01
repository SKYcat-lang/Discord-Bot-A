const { ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');
module.exports = {
	  data: new ContextMenuCommandBuilder()
      .setName('채팅 고정해제')
      .setType(ApplicationCommandType.Message),

    async execute(interaction){
      const msg = interaction.targetMessage;
      msg.unpin();
      await interaction.reply(`https://discord.com/channels/${msg.guild.id}/${msg.channelId}/${msg.id} 채팅이 고정 해제되었습니다.`);
    }
}