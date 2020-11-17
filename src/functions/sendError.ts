import { Message, MessageEmbed, MessageReaction, User } from "discord.js";

import { Client } from "../classes/Client";
import { COLORS } from "../misc/constants";
import { collectReaction } from "./collectReaction";
import { react } from "./react";

export async function sendError(message: Message, error: Error, client: Client): Promise<void> {
	const embed = new MessageEmbed()
		.setAuthor("Error", client.user?.displayAvatarURL({ dynamic: true }))
		.setColor(COLORS.darkRed)
		.setDescription(error);

	const errorMessage = await message.channel.send(embed).catch(() => {});

	if (!errorMessage) {
		return;
	}

	await react("🔍", errorMessage);

	const filter = (reaction: MessageReaction, user: User): boolean =>
		reaction.message.id === errorMessage.id && user === message.author && !user.bot && reaction.emoji.name === "🔍";

	const reaction = await collectReaction(errorMessage, filter, {
		max: 1,
		time: 10000,
	});

	if (!reaction) {
		await errorMessage.reactions.removeAll();
		return;
	}

	// V8 actually writes error.message inside error.stack, so I remove it
	const stackTrace = error.stack?.split("\n").slice(1).join("\n");

	const completeEmbed = new MessageEmbed(embed).setDescription(`${error}\`\`\`${stackTrace}\`\`\``);

	await errorMessage.edit(completeEmbed);
	await errorMessage.reactions.removeAll();
}
