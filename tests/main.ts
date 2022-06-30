import 'dotenv/config'
import assert from 'assert'
import { expect } from 'chai'
import { Client, Message } from 'discord.js'
import * as mocha from 'mocha'
import { getLatestMessageInGuildForUser } from '../src/index'

(async function() {
  const client  = new Client({ intents: [ `GUILDS`, `GUILD_MESSAGES`, `GUILD_MEMBERS` ] })
  const guild   = await client.guilds.fetch(`899115180569546762`)
  const user    = await client.users.fetch(`817186249000878122`)
  const message = await getLatestMessageInGuildForUser({ client, guild, user, logging: true })
  console.log(message)
})()