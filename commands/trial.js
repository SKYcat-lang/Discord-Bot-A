const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');
let vton = false;
module.exports = {
	  data: new ContextMenuCommandBuilder()
      .setName('약식 재판 시도')
      .setType(ApplicationCommandType.Message),

    async execute(interaction){
      let vtMember = [];
      let vtA = 0;
      let vtB = 0;
      const msg = interaction.targetMessage;
      const avatarURL  = msg.author.displayAvatarURL({ format: 'png', dynamic: true, size: 2048 });
      if (msg.content == '') {
        await interaction.reply({ content: '메세지 내용이 존재하지 않습니다. 따라서, 약식 재판을 시작할 수 없습니다.', ephemeral: true });
        return;
      }
      if (vton == true) {
        await interaction.reply({ content: '다른 투표가 진행중입니다.', ephemeral: true });
        return;
      }
      vton = true;
      const embed = new EmbedBuilder()
	      .setColor('FF0000')
        .setDescription(msg.content)
        .setAuthor({ name: `${msg.author.username}`, iconURL: avatarURL })
        .setThumbnail('https://i.ibb.co/t4V5qsf/star-icon.png')
	      .addFields(
          { name: `\u200B`, value: `해당 채팅에 대한 약식 재판을 시작합니다.\nhttps://discord.com/channels/${msg.guild.id}/${msg.channelId}/${msg.id}` },
          { name: '찬성표', value: String(vtA), inline: true },
          { name: '반대표', value: String(vtB), inline: true },)
        .setFooter({ text: '20초 후에 재판의 결과가 발표됩니다.' })
        .setTimestamp();
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(msg.id+'yes')
            .setLabel('찬성')
            .setStyle(ButtonStyle.Success),
        )
        .addComponents(
          new ButtonBuilder()
            .setCustomId(msg.id+'no')
            .setLabel('반대')
            .setStyle(ButtonStyle.Danger),
        );

      await interaction.reply({ embeds: [embed] , components: [row]});
      

      const collector = interaction.channel.createMessageComponentCollector({
        //몇 초동안 반응 할 수 있는지
        time: 10000
      });
      collector.on('collect', async (interaction) => {
        if(vtMember.indexOf(interaction.user.id) != -1){ // 버튼 눌렀을때
          await interaction.reply({ content: '당신은 이미 투표했습니다.', ephemeral: true });
          return;
        }
        if(interaction.customId == msg.id+'yes'){ // 버튼 눌렀을때
          vtA++
        }
        else if(interaction.customId == msg.id+'no'){ // 버튼 눌렀을때
          vtB++
        }
        await interaction.reply({ content: '투표했습니다.', ephemeral: true });
        vtMember.push(interaction.user.id);
        console.log(interaction.user.id);
        console.log(vtMember);
      })
      
			collector.on('end', async (collect) => {
        const exampleEmbed = new EmbedBuilder()
          .setColor('FF0000')
          .setDescription(msg.content)
          .setAuthor({ name: `${msg.author.username}`, iconURL: avatarURL })
          .setThumbnail('https://i.ibb.co/t4V5qsf/star-icon.png')
          .addFields(
            { name: `${msg.author.username} 님에 대한 약식 재판 결과`, value: ' '},
            { name: '찬성표', value: String(vtA), inline: true },
            { name: '반대표', value: String(vtB), inline: true },)
          .setFooter({ text: '투표가 끝났습니다.' })
          .setTimestamp();

				  if(vtA > vtB){
            exampleEmbed.addFields({name: ' ' , value:`\`\`해당 채팅에 대한 처벌이 가결되었습니다.\`\`\nhttps://discord.com/channels/${msg.guild.id}/${msg.channelId}/${msg.id}`})
            let member = await interaction.guild.members.fetch(msg.author.id);
            try {
              await member.timeout(60000); // 1분 동안 타임아웃
            } catch (error) {
              exampleEmbed.addFields({name: ' ' , value:`\`\`그러나 권한 부족으로 타임아웃 할 수 없습니다.\`\``});
            }
          } else {
            exampleEmbed.addFields({name: ' ' , value:`\`\`해당 안건이 부결되었습니다.\`\``})
          }
        try {
          await interaction.editReply({ embeds: [exampleEmbed] , components: [] })
        } catch {
          console.log('메세지가 삭제됨');
        }
        
        vton = false;
			})
    }
}