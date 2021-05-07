const Discord = require('discord.js');
const db = require('quick.db');
const { main } = require('./general/token.json');
const { guildId, prefix } = require('./general/config.json');
const client = new Discord.Client();

const floor = (input = Number) => {
  let result = '';
  if (input >= 1440 && input < 525600) {
    result += `${Math.floor(input / 1440)}d `;
    input %= 1440;
  }
  if (input >= 60 && input < 1440) {
    result += `${Math.floor(input / 60)}h `;
    input %= 60;
  }
  if (input < 60) {
    result += `${Math.floor(input)}m`;
  }
  return result.trim();
};

const reply = (chId = String, description = String, color = String) => {
  const ch = client.channels.cache.get(chId);
  var embed = new Discord.MessageEmbed().setColor(color).setDescription(description);
  ch.send(embed);
};

const resetVoice = (member = Discord.GuildMember) => {
  db.set(`discord.members.${member.id}.voice`, {
    inVoice: 0,
    deafened: 0,
    muted: 0,
    selfVideo: 0,
    streamed: 0
  });
};

const resetPresence = (member = Discord.GuildMember) => {
  db.set(`discord.members.${member.id}.presence`, {
    totalOnline: 0,
    online: 0,
    away: 0,
    dnd: 0,
    offline: 0,
    desktop: 0,
    mobile: 0,
    web: 0,
  });
};

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  setInterval(() => {
    const members = client.guilds.cache.get(guildId).members.cache;
    members.forEach(member => {
      if (member.user.bot) return;
      db.add(`discord.members.${member.id}.inServer`, 1);
      var temptData = db.get(`discord.members.${member.id}`);
      if (temptData.voice == undefined) resetVoice(member);
      if (temptData.presence == undefined) resetPresence(member);
      var data = db.get(`discord.members.${member.id}`);
      if (!data.optIn) return;
      if (member.voice.channel != null) {
        data.voice.inVoice += 1;
        if (member.voice.deaf != null) data.voice.deafened += 1;
        else if (member.voice.mute != null) data.voice.muted += 1;
        if (member.voice.selfVideo != null) data.voice.selfVideo += 1;
        if (member.voice.streaming != null) data.voice.streamed += 1;
      }
      if (member.presence.status != 'offline') data.presence.totalOnline += 1;
      if (member.presence.status == 'online') data.presence.online += 1;
      else if (member.presence.status == 'idle') data.presence.away += 1;
      else if (member.presence.status == 'dnd') data.presence.dnd += 1;
      else if (member.presence.status == 'offline') data.presence.offline += 1;
      if (member.presence.clientStatus.desktop) data.presence.desktop += 1;
      if (member.presence.clientStatus.mobile) data.presence.mobile += 1;
      if (member.presence.clientStatus.web) data.presence.web += 1;
      db.set(`discord.members.${member.id}`, data);
    });
  }, 60000);
  client.user.setActivity('a!stats');
  console.log('Bot init complete');
});

client.on('message', msg => {
  if (msg.author.bot || msg.webhookID) return;

  //Counts the messages
  db.add(`discord.members.${msg.member.id}.messages`, 1);

  if (!msg.content.toLowerCase().startsWith(prefix)) return;
  const args = msg.content.slice(prefix.length).trim().split(' ');
  const command = args.shift().toLowerCase();

  if (['stats', 'analytics'].includes(command)) {
    const member = db.get(`discord.members.${msg.member.id}`);
    var embed = new Discord.MessageEmbed()
      .setFooter('All data is safely stored and can only be accessed by you! All tracking started on 5/7 1PM EST')
      .setColor('#1434A4')
      .setTitle(`${msg.author.tag}'s Analytics`)
      .addField(`Opt Status`, `opt-${member.optIn || false}`.replace('true', 'in').replace('false', 'out'), true)
      .addField(`Time in server`, `${floor(member.inServer)}`, true)
      .addField('\u200B', '\u200B', false)
      .addField('Everything bellow this line is only tracked if you are opt-in', '!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!i!', false)
      .addField(`TIme in voice`, `In Voice: ${floor(member.voice.inVoice)}\nMuted: ${floor(member.voice.muted)}\nDeafened: ${floor(member.voice.deafened)}\nVideo: ${floor(member.voice.selfVideo)}\nStreaming: ${floor(member.voice.streamed)}\nVoice to Server ratio: ${Math.floor((member.voice.inVoice / member.inServer) * 10000) / 100}%`, true)
      .addField(`Time online`, `Total online: ${floor(member.presence.totalOnline)}\nOnline: ${floor(member.presence.online)}\nAway: ${floor(member.presence.away)}\nDo not Disturb: ${floor(member.presence.dnd)}\nOffline: ${floor(member.presence.offline)}\nTotal Online to Server ratio: ${(Math.floor((member.presence.totalOnline / (member.presence.offline + member.presence.totalOnline)) * 10000) / 100) || 0}%`, true)
      .addField('\u200B', '\u200B', false)
      .addField(`Client Status`, `Desktop: ${floor(member.presence.desktop)}\nMobile: ${floor(member.presence.mobile)}\nWeb: ${floor(member.presence.web)}`, true)
      .addField(`Messages Sent`, `${member.messages} messages sent`, true);
    msg.channel.send(embed);
  } else if (['opt'].includes(command)) {
    const current = db.get(`discord.members.${msg.member.id}.optIn`) || false;
    db.set(`discord.members.${msg.member.id}.optIn`, !current);
    reply(msg.channel.id, `You're now opt-${!current} to the in depth data collection from me.`.replace('true', 'in').replace('false', 'out'), '#9e9d9d')
  }
});

client.login(main);