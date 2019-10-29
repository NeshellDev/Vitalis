import { Command } from "../lib/Command";
import { Discord, infos } from "../requires";
import { Client } from "../lib/Client";
import { COLORS } from "../lib/constants";

export default class Info extends Command {
    constructor() {
        super({
            name: "info",
            description: "Get bot's informations"
        });
    }

    run(message: Discord.Message, args: string[], client: Client) {
        const embed = new Discord.RichEmbed()
            .setAuthor("Vitalis - Informations", client.user.avatarURL, "https://github.com/NeshellDev/Vitalis")
            .setColor(COLORS["gold"])
            .addField("**Author**", infos.author, true)
            .addField("**Version**", infos.version, true)
            .addField("**Library**", `[discord.js](https://discord.js.org/#/) ${infos.dependencies["discord.js"]}`, true)
            .addField("**Description**", infos.description)
            .setFooter(`Vitalis - ${infos.author} | Apache 2.0 license. Asked by ${message.author.tag}`, message.author.avatarURL);

        message.channel.send(embed);
    }
}