import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import axios from 'axios'; // axios 모듈을 임포트해야 합니다.
const API_KEY = '8A159EA0-32D6-4960-81EB-C8F9FC3A940D';

export const data = new SlashCommandBuilder()
    .setName('크레딧')
    .setDescription('자신의 현재 소셜 크레딧을 표시합니다.');

export async function execute(interaction) {
    /*
    await axios.delete(`http://localhost:3000/api/users/undefined/social-credit`, {
        headers: { 'api-key': API_KEY }, // API_KEY 변수가 정의되어 있어야 합니다.
    });

    
    const user = interaction.user;
    const amount = 5;
    const getSocialCredit = async (userId) => {
        try {
            const response = await axios.post(`http://localhost:3000/api/users/${userId}/social-credit/increase`, { amount }, {
                headers: { 'api-key': API_KEY }, // API_KEY 변수가 정의되어 있어야 합니다.
            });
            console.log (response);
            return response.data;
        } catch (error) {
            console.error('사회 신용 점수 조회에 실패했습니다. : ', error);
            return null;
        }
    };

    const socialCredit = await getSocialCredit(user.id); // 사용자의 ID를 전달하여 소셜 크레딧 조회

    if (socialCredit !== null) {
        const avatarURL = user.displayAvatarURL({ format: 'png', dynamic: true, size: 2048 });
        const embed = new EmbedBuilder()
            .setColor('FF0000')
            .setDescription(`\`\`소셜 크레딧: ${socialCredit}\`\``)
            .setAuthor({ name: `${user.username}`, iconURL: avatarURL });
        await interaction.reply({ embeds: [embed], components: [] });
    } else {
        await interaction.reply(`${user.username}의 소셜 크레딧을 조회하는데 실패했습니다.`);
    }
    */
    const user = interaction.user;
    const getSocialCredit = async (userId) => {
        try {
            const response = await axios.get(`http://localhost:3000/api/users/${userId}/social-credit`, {
                headers: { 'api-key': API_KEY }, // API_KEY 변수가 정의되어 있어야 합니다.
            });
            return response.data.social_credit;
        } catch (error) {
            console.error('사회 신용 점수 조회에 실패했습니다. : ', error);
            return null;
        }
    };

    const socialCredit = await getSocialCredit(user.id); // 사용자의 ID를 전달하여 소셜 크레딧 조회

    if (socialCredit !== null) {
        const avatarURL = user.displayAvatarURL({ format: 'png', dynamic: true, size: 2048 });
        const embed = new EmbedBuilder()
            .setColor('FF0000')
            .setDescription(`\`\`소셜 크레딧: ${socialCredit}\`\``)
            .setAuthor({ name: `${user.username}`, iconURL: avatarURL });
        await interaction.reply({ embeds: [embed], components: [] });
    } else {
        await interaction.reply(`${user.username}의 소셜 크레딧을 조회하는데 실패했습니다.`);
    }
}
