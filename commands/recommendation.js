import { ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder } from 'discord.js';
import axios from 'axios';
const userLog = {};
const API_KEY = '8A159EA0-32D6-4960-81EB-C8F9FC3A940D';

export const data = new ContextMenuCommandBuilder()
    .setName('Recommend Post')
    .setNameLocalizations({
      'ko': '이 글 추천',  // 한국어 이름
      'en-US': 'Recommend Post',  // 한국어 이름
      'ja': 'この投稿を推薦',  // 일본어 이름
      'fr': 'Recommander ce message'  // 프랑스어 이름
    })
    .setType(ApplicationCommandType.Message);

export const execute = async (interaction) => {
    const msg = interaction.targetMessage;
    const user = interaction.user;
    const today = new Date().toISOString().split('T')[0];

    if (!userLog[today]) {
        userLog[today] = [];
    }

    if (userLog[today].includes(user.id)) {
        await interaction.reply({ content: '이미 오늘 다른 글을 추천했습니다.', ephemeral: true });
        return false;
    }

    if (user.id === msg.author.id) {
        await interaction.reply({ content: '자기 자신을 추천할 수 없습니다.', ephemeral: true });
        return false;
    }

    const getSocialCredit = async (userId) => {
        try {
            const response = await axios.get(
                `http://localhost:3000/api/users/${userId}/social-credit`,
                { headers: { 'api-key': API_KEY } }
            );
            return response.data.social_credit;
        } catch (error) {
            console.error('사회 신용 점수 조회에 실패했습니다. : ', error);
            return null;
        }
    };
    const postIncreaseSocialCredit = async (userId, amount) => {
        try {
            await axios.post(
                `http://localhost:3000/api/users/${userId}/social-credit/increase`,
                { amount },
                { headers: { 'api-key': API_KEY } }
            );
            return amount; // 감소된 크레딧 값 반환
        } catch (error) {
            console.error('사회 신용 점수 감소에 실패했습니다. : ', error);
            return null;
        }
    };
    
    await postIncreaseSocialCredit(msg.author.id, 2);
    userLog[today].push(user.id);

    const avatarURL = msg.author.displayAvatarURL({ format: 'png', dynamic: true, size: 2048 });
    const embed = new EmbedBuilder()
        .setColor('00FF00')
        .setDescription(msg.content || "(내용 없음)")
        .setAuthor({ name: `${msg.author.username}`, iconURL: avatarURL })
        .addFields({ name: `\u200B`, value: `해당 채팅이 추천되었습니다!\nhttps://discord.com/channels/${msg.guild.id}/${msg.channelId}/${msg.id}` })
        .setFooter({ text: '소셜 크레딧 2 증가' });

    await interaction.reply({ embeds: [embed], components: [] });
}
