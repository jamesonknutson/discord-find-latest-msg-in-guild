import type {
  Client, Guild, GuildResolvable,
  GuildTextBasedChannel, UserResolvable,
} from 'discord.js'
import { Collection, Message } from 'discord.js'

/**
 * Finds the latest Message sent by a specific User in a specific Guild.
 * 
 * @param {GetLatestMessageOpts} opts - Function Options
 * @returns {Promise<Message | null>} The latest Message sent by the User in the Guild, or `null` if no latest Message could
 * be found (e.g. the User has never sent a Message in that Guild before).
 */
export async function getLatestMessageInGuildForUser (opts: GetLatestMessageOpts): Promise<Message | null> {
  const logging = typeof opts?.logging === 'boolean' ? opts.logging : false 
  const userId  = typeof opts.user === 'string' ? opts.user : opts.client.users.resolveId(opts.user)
  if (!userId) {
    if (logging) console.error(`Could not resolve \`opts.user\` UserResolvable object to a UserID: `, opts.user)
    return null
  }
  
  const resolved = opts.client.guilds.resolve(opts.guild)
  const guild = resolved ? resolved : typeof opts.guild === 'string'
    ? await opts.client.guilds.fetch(opts.guild).catch(error => {
      if (logging) console.error(`Could not fetch Guild from \`opts.guild\` GuildResolvable object, encoutered Error: `, error)
      return null
    })
    : null
  
  if (!guild) {
    if (logging) console.error(`Could not resolve \`opts.guild\` GuildResolvable object to a Guild: `, opts.guild)
    return null
  }
  
  // Start recursion
  return await recursiveFindLatest({ guild, userId, logging })
}

function reduceColl (opts: {
  messages   : Collection<string, Message>
  condition  : 'LATEST' | 'EARLIEST'
  initValue? : Message | null
  userId?    : string | null
}, logging = false): Message | null {
  return opts.messages.reduce((best, message) => {
    if (typeof opts?.userId === 'string' && message.author.id !== opts.userId) {
      if (logging) console.log(`Message ID '${message.id}' was not sent by User ID '${opts.userId}', returning best.`)
      return best
    }
    
    if (!best) {
      if (logging) console.log(`No best value found yet, so returning Message ID '${message.id}' as best to init.`)
      return message
    }
    
    if (opts.condition === 'LATEST' && message.createdTimestamp > best.createdTimestamp) {
      if (logging) console.log(`Message ID '${message.id}' was created after best (created @ ${best.createdTimestamp}), returning current message in place of best.`)
      return message
    }
    
    if (opts.condition === 'EARLIEST' && message.createdTimestamp < best.createdTimestamp) {
      if (logging) console.log(`Message ID '${message.id}' was created before best (created @ ${best.createdTimestamp}), returning current message in place of best.`)
      return message
    }
    
    if (logging) console.log(`Message ID '${message.id}' did not pass any preference conditions, returning best.`)
    return best
  }, opts?.initValue ?? null as Message | null)
}

async function loadEarlierMessages (opts: ChannelState, logging = false): Promise<Collection<string, Message>> {
  if (!opts.more) {
    if (logging) console.error(`loadEarlierMessages was passed a ChannelState with \`more\` set to false, skipping fetch for this State.`)
    return opts.channel.messages.cache
  }
  
  return await opts.channel.messages.fetch(
    opts.earliest ? { before: opts.earliest.id } : undefined
  )
}

async function loadChannelStates (opts: RecursiveLatestMessageOpts): Promise<Required<RecursiveLatestMessageOpts>> {
  const states = opts?.states
  if (states) return { ...opts, states }
  
  const channels   = await opts.guild.channels.fetch()
  const textOnly   = [ ...channels.filter(c => c.isText()) as Collection<string, GuildTextBasedChannel> ]
  const collection = new Collection<string, ChannelState>()
  
  for (const [ id, channel ] of textOnly) {
    const messages = channel.messages.cache.size > 0
      ? channel.messages.cache
      : await channel.messages.fetch()
    
    if (messages.size > 0) {
      if (opts.logging) console.log(`Found ${messages.size} Messages in Channel ID: ${id}, initializing State.`)
      collection.set(id, {
        channel  : channel,
        more     : true,
        earliest : reduceColl({ condition: 'LATEST', messages, userId: opts.userId }),
        recent   : reduceColl({ condition: 'EARLIEST', messages }),
      })
    } else if (opts.logging) {
      console.log(`No messages found in Channel ID: ${id}, skipping this Channel entirely.`)
    }
  }
  
  return {
    ...opts,
    states: collection
  }
}

/**
 * Finds the best ChannelState (has the most Recent Valid Message), or returns null
 * if no ChannelState in the Collection is valid.
 */
function getBestState (opts: { states: Collection<string, ChannelState>, initValue?: ChannelStateRecent | null }): ChannelStateRecent | null {
  return opts.states.reduce((best, curr) => {
    return ((curr.recent instanceof Message) && (!best || best.recent.createdTimestamp < curr.recent.createdTimestamp))
      ? curr as ChannelStateRecent
      : best
  }, opts?.initValue ?? null)
}

function excludeDisqualifiedStates (opts: { states: Collection<string, ChannelState>, initValue?: ChannelStateRecent | null }): {
  states    : Collection<string, ChannelState>
  initValue : ChannelStateRecent | null
} {
  const bestState = getBestState(opts)
  if (!bestState) return { states: opts.states, initValue: null }
  
  const filtered = opts.states.filter((state) => {
    return (
      // Returns true (includes) any State that has a recent valid message that is at least
      // as recent as our most recent valid message
      (state.recent && state.recent.createdTimestamp >= bestState.recent.createdTimestamp) ||
      // Returns true (includes) any State that has more messages to look through, and either
      // has not yet had it's earliest message found yet, or it's earliest message found was
      // created after (more recently) than our most recent valid message
      (state.more && (
        !(state.earliest instanceof Message) ||
        state.earliest.createdTimestamp >= bestState.recent.createdTimestamp
      ))
    )
  })
  
  return {
    states    : filtered,
    initValue : bestState
  }
}

function toLoggingString (opts: ChannelState): string {
  return [
    `More Messages in Channel: ${opts.more}`,
    opts.recent
      ? `Most Recent (Valid) Message in Channel: ID '${opts.recent.id}' created at ${opts.recent.createdAt.toLocaleString()}`
      : `Most Recent (Valid) Message in Channel: None so far`,
    opts.earliest
      ? `Earliest Message in Channel: ID '${opts.earliest.id}' created at ${opts.earliest.createdAt.toLocaleString()}`
      : `Earliest Message in Channel: None so far`
  ].join('\n\t')
}

async function recursiveFindLatest (opts: RecursiveLatestMessageOpts, iteration = 0, initValue: ChannelStateRecent | null = null): Promise<Message | null> {
  const prefix0 = `[Iteration ${iteration}]:`
  if (opts.logging) console.log(`${prefix0} Starting iteration ${iteration}`)
  const loaded     = await loadChannelStates(opts)
  const firstState = loaded.states.first()
  if (loaded.states.size === 0) {
    if (opts.logging) console.log(`${prefix0} No valid states left, the User has never sent a Message in any TextChannel in this Guild. Returning null.`)
    return null
  } else if (loaded.states.size === 1 && firstState && firstState.recent) {
    if (opts.logging) console.log(`${prefix0} Only left with one valid state that has a recent valid Message in it. Returning Message ID ${firstState.recent.id} in Channel ID ${firstState.channel.id}`)
    return firstState.recent
  }
  
  if (opts.logging) console.log(`${prefix0} Have ${loaded.states.size} possible Channels. Iterating over each Channel and checking if we need to update it (get more messages), keep it the same, or filter it from possible channels.`)
  const index = { current: 1, final: loaded.states.size }
  for (const [ key, value ] of loaded.states.entries()) {
    const prefix1 = `${prefix0} (${index.current}/${index.final}, channelID ${key})`
    if (value.recent instanceof Message) {
      if (opts.logging) console.log(`${prefix1} Channel has a recent Message found in it. Not going to update / fetch earlier Messages for this Channel, as there's no point-- we're not going to find any more recent Message in Messages posted earlier in the Channel. Keeping Channel in the Collection, will be filtered out or crowned winner later on.`)
    } else if (value.more) {
      if (opts.logging) console.log(`${prefix1} Channel has more Messages in it, but does not have a recent valid Message found in it yet. Fetching earlier Messages now.`)
      const messages     = await loadEarlierMessages(value)
      const recent       = reduceColl({ condition: 'LATEST', messages, userId: opts.userId, initValue: value.recent })
      const earliest     = reduceColl({ condition: 'EARLIEST', messages, initValue: value.earliest })
      const updatedState = {
        channel  : value.channel,
        recent   : recent,
        earliest : earliest,
        more     : messages.size !== 0
      }
      
      if (opts.logging) {
        console.log(`${prefix1} Updating State From: \n${toLoggingString(value)}`)
        console.log(`${prefix1} Updating State To: \n${toLoggingString(updatedState)}`)
      }
      
      loaded.states.set(key, updatedState)
    } else {
      if (opts.logging) console.log(`${prefix1} Channel is marked as having no more Messages in it to load. It also does not have a recent valid message in it. Removing this Channel from the Collection as it cannot possibly be valid at this point.`)
      loaded.states.delete(key)
    }
    
    index.current++
  }
  const beforeExclusion = loaded.states.size
  
  if (opts.logging) console.log(`${prefix0} Finished updating / filtering all Channels in the Collection. Running excludeDisqualifiedStates on the Collection then recursing with the return value.`)
  const excluded = excludeDisqualifiedStates({ states: loaded.states, initValue: initValue })
  
  if (opts.logging) console.log(`${prefix0} Finished excluding disqualified Channels. Started with Collection Size of ${index.final}, filtered that down to ${beforeExclusion} before running exclusion, exclusion filtered that down to a total of ${excluded.states.size} possible states for the next recursion.`)
  
  const recurseOpts: RecursiveLatestMessageOpts = { ...opts, states: excluded.states }
  const nextIteration                           = iteration + 1
  const nextValue                               = excluded.initValue
  
  return recursiveFindLatest(recurseOpts, nextIteration, nextValue)
}

/**
 * Options passed to the {@link getLatestMessageInGuildForUser Get Latest Message in Guild for User} Function.
 */
export interface GetLatestMessageOpts {
  /**
   * The Discord Bot Client to make requests with.
   * @type {Client}
   */
  client: Client
  /**
   * A GuildResolvable of the Guild we want to find the latest Message for the User in
   * @type {GuildResolvable}
   */
  guild: GuildResolvable
  /**
   * A UserResolvable of the User who we want to find the latest Message for in the Guild
   * @type {UserResolvable}
   */
  user: UserResolvable
  /**
   * Whether or not you want this Function to log what it is doing to the Console. Defaults to false.
   * @type {boolean}
   */
  logging?: boolean
}

interface ChannelState {
  channel   : GuildTextBasedChannel
  more      : boolean
  earliest? : Message | null
  recent?   : Message | null
}

interface ChannelStateRecent extends ChannelState {
  recent : Message
}

interface RecursiveLatestMessageOpts {
  guild   : Guild
  userId  : string
  logging : boolean
  states? : Collection<string, ChannelState>
}