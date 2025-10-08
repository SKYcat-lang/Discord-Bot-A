import { Client, Collection, GatewayIntentBits, Partials, REST, Routes } from 'discord.js';
import fs from 'node:fs';
import { readFile } from 'fs/promises';
import api from './api.js';
import { registerMessageTracker } from './commands/trial.js';

const loadConfig = async () => {
    try {
        const data = await readFile('./Config.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Config 파일 로딩 실패: ', error);
        return {};  // 오류 발생 시 빈 객체 반환
    }
};

const loadCommands = async (client) => {
    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
    return Promise.all(commandFiles.map(async (file) => {
        const command = await import(`./commands/${file}`);
        client.commands.set(command.data.name, command);
        return command.data.toJSON();
    }));
};

const main = async () => {
    const config = await loadConfig();
    const { clientId, prefix, TOKEN, API_PORT, API_KEY } = config || {};  // config가 undefined일 경우를 대비

    if (!clientId || !prefix || !TOKEN || !API_PORT || !API_KEY) {
        console.error('Config 파일의 필수 값이 누락되었습니다.');
        return;
    }

    const port = API_PORT || 3000;
    api.listen(port, () => {
      console.log(`API 서버가 ${port} 포트에서 실행중입니다.`);
    });

    const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
        partials: [Partials.Channel]
    });

    client.commands = new Collection();
    const commands = await loadCommands(client);
    
    registerMessageTracker(client);

    client.once('ready', async () => {
        console.log('디스코드 봇이 준비되었습니다.');
        const rest = new REST({ version: '10' }).setToken(TOKEN);
        try {
            await rest.put(Routes.applicationCommands(clientId), { body: commands });
            console.log('명령어가 성공적으로 등록되었습니다.');
        } catch (error) {
            console.error('명령어 등록에 실패했습니다: ', error);
        }
    });

    client.on('interactionCreate', async interaction => {
        try {
            // 슬래시 명령어 처리
            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command) return;
                await command.execute(interaction);
                return;
            }
            // 컨텍스트 메뉴(메시지/유저) 처리
            if (interaction.isMessageContextMenuCommand() || interaction.isUserContextMenuCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command) return;
                await command.execute(interaction);
                return;
            }
        } catch (error) {
            console.error('명령어 실행 오류: ', error);
        }
    });

    await client.login(TOKEN);
};

main();
