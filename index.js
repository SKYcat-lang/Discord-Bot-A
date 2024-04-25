import { Client, Collection, GatewayIntentBits, Partials, REST, Routes } from 'discord.js';
import fs from 'node:fs';
import { readFile } from 'fs/promises';

const loadConfig = async () => {
    try {
        const data = await readFile('./Config.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Failed to load config:', error);
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
    const { clientId, prefix, TOKEN } = config || {};  // config가 undefined일 경우를 대비

    if (!clientId || !prefix || !TOKEN) {
        console.error('Configuration is missing essential values.');
        return;
    }

    const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
        partials: [Partials.Channel]
    });

    client.commands = new Collection();
    const commands = await loadCommands(client);

    client.once('ready', async () => {
        console.log('디스코드 봇이 준비되었습니다.');
        const rest = new REST({ version: '10' }).setToken(TOKEN);
        try {
            await rest.put(Routes.applicationCommands(clientId), { body: commands });
            console.log('Commands registered successfully');
        } catch (error) {
            console.error('Commands registration failed:', error);
        }
    });

    client.on('interactionCreate', async interaction => {
        if (!interaction.isCommand()) return;
        if (!client.commands.has(interaction.commandName)) return;

        const command = client.commands.get(interaction.commandName);
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error('Command execution error:', error);
        }
    });

    await client.login(TOKEN);
};

main();
