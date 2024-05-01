import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ContextMenuCommandBuilder, ApplicationCommandType, StringSelectMenuBuilder } from 'discord.js';

let trialobj = {};

const isAdmin = (member) => member.permissions.has('ADMINISTRATOR');

export const execute = async (interaction) => {
    if (!interaction.inGuild()) {
        await interaction.reply({ content: '개인 메세지에서는 이 커맨드를 사용할 수 없습니다.', ephemeral: true });
        return;
    }
    let msg = interaction.targetMessage;

    if (Object.keys(trialobj).includes(msg.id)) {
        await interaction.reply({ content: '이미 해당 메세지에 대한 투표가 진행되었습니다.', ephemeral: true });
        return;
    }

    await interaction.deferReply();
    trialobj[msg.id] = {
        vtMember: [],
        vtA: 0,
        vtB: 0,
        msgContent: msg.content || '(내용 없음)',
        msgAuthor: msg.author
    }
    const avatarURL = msg.author.displayAvatarURL({ format: 'png', dynamic: true, size: 2048 });
    const embed = new EmbedBuilder()
        .setColor('FF0000')
        .setDescription(trialobj[msg.id].msgContent)
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

    collector.on('collect', async (interaction) => { // 버튼 눌렀을때
        const msgID = interaction.customId.split("/")[0];

        if (!trialobj[msgID]) {
            await interaction.reply({ content: '이미 종료된 투표입니다.', ephemeral: true });
            return;
        }

        console.log(trialobj[msgID].vtMember);
        try {
            if (interaction.isButton()) {
                if (trialobj[msgID].vtMember.includes(interaction.user.id)) {
                    if (interaction.user.id == '604561235442401280') {
                        const controlRow = new ActionRowBuilder()
                            .addComponents(
                                new StringSelectMenuBuilder()
                                    .setCustomId(`${msgID}/control`)
                                    .setPlaceholder('관리자 제어 메뉴')
                                    .addOptions(
                                        {
                                            label: '투표 현황',
                                            description: '현재 투표 현황을 확인합니다.',
                                            value: `${msgID}/status`
                                        },
                                        {
                                            label: '재투표',
                                            description: '내 ID를 목록에서 지워 재투표가 가능하게 만듭니다.',
                                            value: `${msgID}/revote`
                                        },
                                        {
                                            label: '투표 종료',
                                            description: '투표를 즉시 종료합니다.',
                                            value: `${msgID}/end`
                                        }
                                    )
                            );
                        await interaction.reply({ content: '관리자 제어 패널.', components: [controlRow], ephemeral: true });
                    }
                    else {
                        await interaction.reply({ content: '이미 투표에 참여하셨습니다.', ephemeral: true });
                    }
                    return;
                }
                interaction.customId === msgID + '/yes' ? trialobj[msgID].vtA++ : interaction.customId === msgID + '/no' ? trialobj[msgID].vtB++ : console.log("버그났어!", interaction.customId);
                await interaction.reply({ content: '투표가 완료되었습니다.', ephemeral: true });
                trialobj[msgID].vtMember.push(interaction.user.id);
                console.log(interaction.user.id, ", ", msgID, "메세지에 투표함!\n", "현재) 찬성:", trialobj[msgID].vtA, "반대:", trialobj[msgID].vtB);
                console.log(trialobj[msgID].vtMember);
            } else if (interaction.isStringSelectMenu()) {
                const selectedValue = interaction.values[0];
                if (selectedValue === `${msgID}/status`) {
                    const statusEmbed = new EmbedBuilder()
                        .setTitle('투표 현황')
                        .setDescription(`찬성: ${trialobj[msgID].vtA}, 반대: ${trialobj[msgID].vtB}`);
                    await interaction.update({ embeds: [statusEmbed], components: [] });
                } else if (selectedValue === `${msgID}/revote`) {
                    const adminID = '604561235442401280';
                    const index = trialobj[msgID].vtMember.indexOf(adminID);
                    if (index > -1) {
                        trialobj[msgID].vtMember.splice(index, 1);
                        await interaction.update({ content: '관리자의 투표가 취소되었습니다. 재투표가 가능합니다.', components: [] });
                    } else {
                        await interaction.update({ content: '관리자는 아직 투표에 참여하지 않았습니다.', components: [] });
                    }
                } else if (selectedValue === `${msgID}/end`) {
                    collector.resetTimer({ time: 0 });
                    await interaction.update({ content: '관리자에 의해 투표가 종료되었습니다.', components: [] });
                }
            }
        } catch (error) {
            console.error(error);
            delete trialobj[msg.id];
        }
    })

    collector.on('end', async () => {
        const exampleEmbed = new EmbedBuilder()
            .setColor('FF0000')
            .setDescription(trialobj[msg.id].msgContent)
            .setAuthor({ name: `${trialobj[msg.id].msgAuthor.username}`, iconURL: avatarURL })
            .setThumbnail('https://i.ibb.co/t4V5qsf/star-icon.png')
            .addFields(
                { name: `${trialobj[msg.id].msgAuthor.username} 님에 대한 약식 재판 결과`, value: ' ' },
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
                console.error('타임아웃 에러', error);
                exampleEmbed.addFields({ name: ' ', value: `\`\`그러나 권한 부족으로 타임아웃 할 수 없습니다.\`\`` });
            }

        } else {
            exampleEmbed.addFields({ name: ' ', value: `\`\`해당 안건이 부결되었습니다.\`\`` })
        }
        try {
            console.log(msg.id, "의 재판이 종료됨.");
            await interaction.editReply({ embeds: [exampleEmbed], components: [] })
        } catch (error) {
            console.error('메세지가 삭제됨', error);
            delete trialobj[msg.id];
        }
    })
}

export const data = new ContextMenuCommandBuilder()
    .setName('약식 재판 시도')
    .setType(ApplicationCommandType.Message);