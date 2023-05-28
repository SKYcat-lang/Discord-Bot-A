const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds], partials: [Partials.Channel] });
const { REST, Routes } = require('discord.js');

const {clientId, prefix, TOKEN} = require('./Config.json');
const fs = require('node:fs');
const axios = require('axios');


client.commands = new Collection();

const commands = [];

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	commands.push(command.data.toJSON());
  client.commands.set(command.data.name, command);
}
const rest = new REST({ version: '10' }).setToken(TOKEN_ENV);
/*
function randomarray(a) { //배열값에서 랜덤으로 값 하나를 가져오는 함수
  return a[Math.floor(Math.random() * a.length)];
}
function randomNum(min, max){ //랜덤한 숫자를 정수단위로 뽑아주는 함수
  var randNum = Math.floor(Math.random()*(max-min+1)) + min;
  return randNum;
}
*/
client.once('ready', async () => {
  console.log('디스코드 봇이 공산주의에 감화되었습니다.')
  const data = await rest.put(
          Routes.applicationCommands(clientId),
          { body: commands },
      );
})

client.on('interactionCreate',async interaction => {
  if(!interaction.isCommand()) return;
  if(!client.commands.has(interaction.commandName)) return;
  const command = client.commands.get(interaction.commandName);
  try{
      await command.execute(interaction)
  }catch(error){
      console.log("error\n"+error)
      
  }
})
client.on('messageCreate', async msg => {
 if(msg.content == "가나다테스트"){
  var taget = client.channels.cache.get(msg.channelId);
  console.log(taget)
  taget.send("a")
 }
})

client.login(TOKEN_ENV)