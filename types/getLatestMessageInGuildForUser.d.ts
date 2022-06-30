import type { Client, GuildResolvable, UserResolvable } from 'discord.js';
import { Message } from 'discord.js';
/**
 * Finds the latest Message sent by a specific User in a specific Guild.
 *
 * @param {GetLatestMessageOpts} opts - Function Options
 * @returns {Promise<Message | null>} The latest Message sent by the User in the Guild, or `null` if no latest Message could
 * be found (e.g. the User has never sent a Message in that Guild before).
 */
export declare function getLatestMessageInGuildForUser(opts: GetLatestMessageOpts): Promise<Message | null>;
/**
 * Options passed to the {@link getLatestMessageInGuildForUser Get Latest Message in Guild for User} Function.
 */
export interface GetLatestMessageOpts {
    /**
     * The Discord Bot Client to make requests with.
     * @type {Client}
     */
    client: Client;
    /**
     * A GuildResolvable of the Guild we want to find the latest Message for the User in
     * @type {GuildResolvable}
     */
    guild: GuildResolvable;
    /**
     * A UserResolvable of the User who we want to find the latest Message for in the Guild
     * @type {UserResolvable}
     */
    user: UserResolvable;
    /**
     * Whether or not you want this Function to log what it is doing to the Console. Defaults to false.
     * @type {boolean}
     */
    logging?: boolean;
}
//# sourceMappingURL=getLatestMessageInGuildForUser.d.ts.map