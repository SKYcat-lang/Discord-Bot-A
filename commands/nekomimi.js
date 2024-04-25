import axios from 'axios';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
	.setName('네코')
	.setDescription('무작위로 귀여운 고양이 귀 소녀의 사진을 출력합니다.');

export async function execute(interaction) {
	const html = await axios.get('https://nekos.life/api/v2/img/neko');
	console.log(html.data.url);
	const exampleEmbed = new EmbedBuilder()
		.setColor('#ffffff')
		.setTitle('Neko Image!')
		.setImage(html.data.url);

	await interaction.reply({ embeds: [exampleEmbed] });
}
