const { EmbedBuilder, ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');
module.exports = {
	  data: new ContextMenuCommandBuilder()
      .setName('메세지 고정')
      .setType(ApplicationCommandType.Message),

    async execute(interaction){
      const msg = interaction.targetMessage;
      const avatarURL  = msg.author.displayAvatarURL({ format: 'png', dynamic: true, size: 2048 });
      msg.pin();
      const embed = new EmbedBuilder()
	      .setColor('FFFFFF')
        .setDescription(msg.content)
        .setAuthor({ name: `${msg.author.username}`, iconURL: avatarURL })
        .setThumbnail('https://i.ibb.co/t4V5qsf/star-icon.png')
	      .addFields(
          { name: `\u200B`, value: `메세지가 고정되었습니다. \nhttps://discord.com/channels/${msg.guild.id}/${msg.channelId}/${msg.id}` },
        )
        .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    }
}