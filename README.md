# find-latest-discord-msg-in-guild

## About
Finds the latest Message sent in a specific Discord Guild by a specific Discord User. Written in [response to this StackOverflow Question](https://stackoverflow.com/questions/72764610/how-do-i-get-the-last-message-sent-by-a-specific-user/72796357#72796357). I likely will not be updating this repository, but if you have a specific feature request or bug to report just open up an Issue and I will see what I can do, if I have time. PRs are welcome if you'd prefer to DIY.

## Requirements
Requires [Discord.JS](https://github.com/discordjs/discord.js) (`npm install discord.js`).

## Installation
```
npm install find-latest-discord-msg-in-guild --save
```

## Example usage
Install required dependencies:
```
npm install discord.js find-latest-discord-msg-in-guild --save
```

Find a [Guild](https://discord.js.org/#/docs/discord.js/main/class/Guild) (or [GuildResolvable](https://discord.js.org/#/docs/discord.js/main/typedef/GuildResolvable)) and a [User](https://discord.js.org/#/docs/discord.js/main/class/User) (or [UserResolvable](https://discord.js.org/#/docs/discord.js/main/typedef/UserResolvable)) that you want to find the latest message for in said Guild.

```js
const { Client, Message } = require(`discord.js`)
const { getLatestMessageInGuildForUser } = require(`find-latest-discord-msg-in-guild`)

const client = new Client({ intents: [ 'GUILDS', 'GUILD_MESSAGES' ] })
await client.login(`my-discord-bot-token`)

// Could also be a GuildResolvable Object, so a Guild ID, GuildChannel, GuildEmoji, Role, Invite, etc.
const guild = await client.guilds.fetch('some-guild-id')

// Could also be any UserResolvable Object, so a User ID, GuildMember, ThreadMember, etc.
const user = await client.users.fetch('some-user-id')

const options = {
  client: client, // Required so the Function can resolve the User and Guild
  user: user, // The UserResolvable who we want to find the latest message for
  guild: guild, // The GuildResolvable we want to find the latest message for the User in
  logging: false, // Whether or not we want the Function to log what it is doing to console (optional, defaults to false)  
}

// latestMessage will either be a Discord Message if it finds any Message sent by User in Guild,
// or null if that User has never sent any Message in that Guild (or I have some thus-far undetected
// bug in my code).
const latestMessage = await getLatestMessageInGuildForUser(options)
if (latestMessage instanceof Message) {
  console.log(`The latest Message that ${user.tag} has sent was sent on ${latestMessage.createdAt.toLocaleString()} with ID ${latestMessage.id}`)
} else {
  console.error(`User ${user.tag} has never sent any message in Guild with ID ${guild.id}.`)
}
```

## Links
- [Discord.JS Repository](https://github.com/discordjs/discord.js)
- [Discord.JS Documentation](https://discord.js.org/#/docs/discord.js/main/general/welcome)
- [Package on NPM](https://www.npmjs.com/package/find-latest-discord-msg-in-guild)

## Contributing
Make an Issue. Format it however you like. If you're capable, make a Pull Request with whatever changes you have in mind while you're at it.

## Help
Make an Issue. Format it however you like. I'll respond when I have some time. 🍻