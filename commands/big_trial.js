const { EmbedBuilder, ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');

module.exports = {
	  data: new ContextMenuCommandBuilder()
      .setName('인민 재판 시도')
      .setType(ApplicationCommandType.User),

    async execute(interaction){
      const user = interaction.targetUser;
      const embed = new EmbedBuilder()
        .setTitle(`[${user.username}] 에 대한 인민 재판`)
        .setDescription(`${user.username} 님에 대한 인민 재판을 시작합니다.\n7표 이상이 모였을 때 재판의 결과가 발표되며, 2/3이상의 찬성이 필요합니다.`);
      
      await interaction.reply({ embeds: [embed] });
    }
}