const { ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');
module.exports = {
	  data: new ContextMenuCommandBuilder()
      .setName('메세지 고정')
      .setType(ApplicationCommandType.Message),

    async execute(interaction){
      const msg = interaction.targetMessage;
      msg.pin();
    }
}