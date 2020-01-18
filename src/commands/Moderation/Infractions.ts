import * as dateFns from "date-fns";
import { GuildMember, Message, RichEmbed } from "discord.js";
import { Command } from "../../classes/Command";
import { Client } from "../../classes/Client";
import { db } from "../../lib/database";
import { COLORS } from "../../lib/constants";
import { sendError } from "../../functions/sendError";
import { Infraction } from "../../typings";

export default class Infractions extends Command {
	constructor() {
		super({
			name: "infractions",
			description: "See a member's infractions",
			usage: "infractions <member mention> [warn|kick|mute|ban]",
			aliases: ["sanctions"],
			permission: "VIEW_AUDIT_LOG",
		});
	}

	async run(message: Message, args: string[], client: Client) {
		if (!args[0]) return sendError(`Wrong command usage.\n\n${this.usage}`, message.channel);

		const id = args[0].slice(3, args[0].length - 1);
		const member = message.mentions.members.get(id);

		if (!member) return sendError("Please mention the member. Note that they must be on the server.", message.channel);

		const type = args[1]?.toLowerCase();

		const embed = new RichEmbed()
			.setColor(COLORS.orange)
			.setFooter(`Asked by ${message.author.tag}`, message.author.avatarURL)
			.setTimestamp();

		await Infractions.getList(message, member, embed, type);
	}

	private static async getList(message: Message, member: GuildMember, embed: RichEmbed, type?: string) {
		const infractionsType = type || "infraction";
		const infractions: Infraction[] = type
			? await db.from("infractions").where({ discord_id: member.id, type })
			: await db.from("infractions").where({ discord_id: member.id });

		const infractionsNumber = infractions.length;

		embed.setAuthor(`${infractionsNumber} Infraction(s) - ${member.user.tag}`, message.guild.iconURL);

		if (infractionsNumber === 0) {
			embed.setTitle(`No ${infractionsType} found.`);
			return message.channel.send(embed);
		}

		embed.setTitle(`Last 10 ${infractionsType}s`);

		const sortedInfractions = infractions.sort((a, b) => b.id - a.id);

		Infractions.getInfractions(sortedInfractions, embed);

		message.channel.send(embed);
	}

	private static getInfractions(infractions: Infraction[], embed: RichEmbed) {
		for (let i = 0; i < infractions.length; i++) {
			if (i >= 10) break;

			const created = dateFns.format(infractions[i].created, "dd/MM/yyyy 'at' HH:mm");
			const { moderator } = infractions[i];
			const reason = infractions[i].infraction || "No reason.";
			const duration = infractions[i].duration
				? ` for ${infractions[i].duration}`
				: "";

			embed.addField(`**${created}${duration} - by ${moderator}**`, reason);
		}
	}
}