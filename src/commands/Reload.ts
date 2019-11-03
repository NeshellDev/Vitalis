import { Command } from "../lib/Command";
import { Discord } from "../requires";
import { Client } from "../lib/Client";
import { sendError, sendEmbed } from "../lib/functions";

export default class Reload extends Command {
	constructor() {
		super({
			name: "reload",
			description: "Reload a command",
			usage: "reload <command>",
			category: "Bot owner",
			permission: "BOT_OWNER",
		});
	}

	async run(message: Discord.Message, args: string[], client: Client) {
		if (!args[0]) return sendError(`Missing argument. Usage: \`${this.usage}\``, message.channel);
		if (!client.commands.has(args[0].toLowerCase())) return sendError(`Command \`${args[0]}\` not found.`, message.channel);

		try {
			await client.reloadCommand(args[0].toLowerCase());
			sendEmbed({ text: `✅ Command ${args[0].toLowerCase()} reloaded.`, color: "light_green", channel: message.channel });
		} catch (error) {
			return sendError(error, message.channel);
		}
	}
}
