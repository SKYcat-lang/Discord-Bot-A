import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ContextMenuCommandBuilder, ApplicationCommandType } from 'discord.js';

let trialobj = {};

export const execute = async (interaction) => {
    if (!interaction.inGuild()) {
        await interaction.reply({ content: '개인 메세지에서는 이 커맨드를 사용할 수 없습니다.', ephemeral: true });
        return;
    }
    let msg = interaction.targetMessage;

    if (msg.content == '') {
        await interaction.reply({ content: '메세지 내용이 존재하지 않습니다. 따라서, 약식 재판을 시작할 수 없습니다.', ephemeral: true });
        return;
    }
    if (Object.keys(trialobj).indexOf(msg.id) != -1) {
        await interaction.reply({ content: '이미 해당 메세지에 대한 투표가 진행되었습니다.', ephemeral: true });
        return;
    }
    
    await interaction.deferReply();
    trialobj[msg.id] = {
        vtMember: [],
        vtA: 0,
        vtB: 0
    }
    const avatarURL = msg.author.displayAvatarURL({ format: 'png', dynamic: true, size: 2048 });
    const embed = new EmbedBuilder()
        .setColor('FF0000')
        .setDescription(msg.content)
        .setAuthor({ name: `${msg.author.username}`, iconURL: avatarURL })
        .setThumbnail('https://i.ibb.co/t4V5qsf/star-icon.png')
        .addFields(
            { name: `\u200B`, value: `해당 채팅에 대한 약식 재판을 시작합니다.\nhttps://discord.com/channels/${msg.guild.id}/${msg.channelId}/${msg.id}` },
        )
        .setFooter({ text: '1분 30초 후에 재판의 결과가 발표됩니다.' })
        .setTimestamp();
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(msg.id + '/yes')
                .setLabel('찬성')
                .setStyle(ButtonStyle.Success),
        )
        .addComponents(
            new ButtonBuilder()
                .setCustomId(msg.id + '/no')
                .setLabel('반대')
                .setStyle(ButtonStyle.Danger),
        );
    try {
        await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
        console.error(error);
        delete trialobj[msg.id];
    }
    console.log(msg.id + "에 대한 약식 재판이 시작되었습니다.");

    const collector = interaction.channel.createMessageComponentCollector({
        filter: i => i.customId.startsWith(msg.id),
        time: 90000
    });
    
    collector.on('collect', async (interaction) => {
        const msgID = interaction.customId.split("/")[0];

        if (!trialobj[msgID]) {
            await interaction.reply({ content: '이미 종료된 투표입니다.', ephemeral: true });
            return;
        }

        console.log(trialobj[msgID].vtMember);
        try {
            if (trialobj[msgID].vtMember.indexOf(interaction.user.id) != -1) { // 버튼 눌렀을때
                await interaction.reply({ content: '이미 투표에 참여하셨습니다.', ephemeral: true });
                return;
            }
            interaction.customId === msgID+'/yes' ? trialobj[msgID].vtA++ : interaction.customId === msgID+'/no' ? trialobj[msgID].vtB++ : console.log("버그났어!",interaction.customId);
            await interaction.reply({ content: '투표가 완료되었습니다.', ephemeral: true });
            trialobj[msgID].vtMember.push(interaction.user.id);
            console.log(interaction.user.id, ", ",msgID,"메세지에 투표함!\n","현재) 찬성:",trialobj[msgID].vtA,"반대:",trialobj[msgID].vtB);
            console.log(trialobj[msgID].vtMember);
        } catch (error) {
            console.error(error);
            delete trialobj[msg.id];
        }
    })

    collector.on('end', async () => {
        const exampleEmbed = new EmbedBuilder()
            .setColor('FF0000')
            .setDescription(msg.content)
            .setAuthor({ name: `${msg.author.username}`, iconURL: avatarURL })
            .setThumbnail('https://i.ibb.co/t4V5qsf/star-icon.png')
            .addFields(
                { name: `${msg.author.username} 님에 대한 약식 재판 결과`, value: ' ' },
                { name: '찬성표', value: String(trialobj[msg.id].vtA), inline: true },
                { name: '반대표', value: String(trialobj[msg.id].vtB), inline: true },)
            .setFooter({ text: '투표가 끝났습니다.' })
            .setTimestamp();

        if (trialobj[msg.id].vtA > trialobj[msg.id].vtB && trialobj[msg.id].vtA > 2) {
            let member = await interaction.guild.members.fetch(msg.author.id);
            let credit = Number((trialobj[msg.id].vtA - 1) * (-1));
            exampleEmbed.addFields({ name: ' ', value: `\`\`해당 채팅에 대한 처벌이 가결되었습니다. (소셜 크레딧 ${credit * (-1)} 차감)\`\`\nhttps://discord.com/channels/${msg.guild.id}/${msg.channelId}/${msg.id}` })

            try {
                await member.timeout(60000 * 3.5); // 1분 30초 동안 타임아웃
            } catch (error) {
                exampleEmbed.addFields({ name: ' ', value: `\`\`그러나 권한 부족으로 타임아웃 할 수 없습니다.\`\`` });
                console.error('타임아웃 에러', error);
            }

        } else {
            exampleEmbed.addFields({ name: ' ', value: `\`\`해당 안건이 부결되었습니다.\`\`` })
        }
        try {
            await interaction.editReply({ embeds: [exampleEmbed], components: [] })
        } catch(error) {
            console.error('메세지가 삭제됨', error);
            delete trialobj[msg.id];
        }
    })
}

export const data = new ContextMenuCommandBuilder()
    .setName('약식 재판 시도')
    .setType(ApplicationCommandType.Message);