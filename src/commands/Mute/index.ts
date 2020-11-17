import { Guild, Message, MessageEmbed } from "discord.js";

import { Client } from "../../classes/Client";
import { Command } from "../../classes/Command";
import { ArgumentError } from "../../exceptions/ArgumentError";
import { MemberError } from "../../exceptions/MemberError";
import { SanctionError } from "../../exceptions/SanctionError";
import { UsageError } from "../../exceptions/UsageError";
import { getUserIdFromString } from "../../functions/getUserIdFromString";
import { log } from "../../functions/log";
import { longTimeout } from "../../functions/longTimeout";
import { getMuteRole } from "../../functions/muteRole";
import { canSanction, getSanctionValues } from "../../functions/sanction";
import { COLORS } from "../../misc/constants";
import { db, getValueFromDB, userExistsInDB } from "../../misc/database";

export default class Mute extends Command {
	constructor(client: Client) {
		super(
			{
				name: "mute",
				description: "Mute a member with a specified reason",
				category: "Moderation",
				usage: (prefix) => `${prefix}mute <member ID | member mention> [duration] <reason>`,
				permission: "MUTE_MEMBERS",
			},
			client,
		);
	}

	async run(message: Message, args: string[]): Promise<void> {
		if (!message.guild || !message.member) {
			return;
		}

		const prefix = await getValueFromDB<string>("servers", "prefix", { server_id: message.guild?.id });

		if (!args[1]) {
			throw new ArgumentError(`Argument missing. Usage: ${this.informations.usage?.(prefix)}`);
		}

		const memberSnowflake = getUserIdFromString(args[0]);
		const member = await this.client.fetchMember(message.guild, memberSnowflake as string);

		if (!member) {
			throw new MemberError();
		}

		const muteRole = await getMuteRole(message.guild, this.client);

		if (member.user.bot) {
			throw new SanctionError("You can't mute a bot.");
		}

		if (!(await canSanction(member, message.member, "mute", this.client))) {
			return;
		}

		if (member.roles.cache.get(muteRole.id)) {
			throw new SanctionError("This member is already muted.");
		}

		const [durationString, duration, reason, embedDescription, dmDescription] = getSanctionValues(
			args,
			"muted",
			member.user,
			message.guild,
		);
		const durationNumber = Number(duration);

		if (durationNumber && !args[2]) {
			throw new UsageError(`Wrong command usage. Usage: ${this.informations.usage?.(prefix)}`);
		}

		const muteEmbed = new MessageEmbed()
			.setAuthor("Moderation", message.guild?.iconURL({ dynamic: true }) as string)
			.setColor(COLORS.lightGreen)
			.setTitle("Mute")
			.setDescription(embedDescription)
			.setTimestamp()
			.setFooter(`Moderator: ${message.author.tag}`, message.author.displayAvatarURL({ dynamic: true }));

		const userEmbed = new MessageEmbed(muteEmbed).setDescription(dmDescription);

		try {
			await member.roles.add(muteRole);
		} catch (error) {
			throw new SanctionError(`For some reason, this member couldn't have been muted; ${error.message}`);
		}

		try {
			await member.user.send(userEmbed);
		} catch {}

		const memberID = member.user.id;

		const created = Date.now();

		const expiration = duration ? created + durationNumber : null;

		await db
			.insert({
				server_id: message.guild?.id,
				discord_id: memberID,
				infraction: reason,
				type: "mute",
				created,
				expiration,
				duration: durationString,
				moderator: message.author.id,
			})
			.into("infractions");

		await userExistsInDB(memberID, message.guild);

		await db
			.update({
				pseudo: member.user.tag,
				actual_sanction: "muted",
				created,
				expiration,
			})
			.into("users")
			.where({ server_id: message.guild?.id, discord_id: memberID });

		await log("mod_log", muteEmbed, message.guild, this.client);

		await message.channel.send(muteEmbed);

		if (!expiration) {
			return;
		}

		longTimeout(async () => {
			await this.client.unsanction(memberID, message.guild as Guild, "muted", false);
		}, expiration - created);
	}
}
