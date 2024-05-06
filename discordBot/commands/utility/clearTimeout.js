require('dotenv').config();
const { SlashCommandBuilder } = require('discord.js');
const { submitTimes } = require('../../submitTimes');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear-timeout')
        .setDescription('Clear the timeout for a specified user')
        .addUserOption((option) =>
            option.setName('user')
                .setDescription('Which user do you want to clear the timeout for?')
                .setRequired(true)
        ),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (interaction.user.id !== process.env.OWNER_ID) {
            console.log(interaction.user.globalName, 'tried to clear timeout for', user.globalName);

            await interaction.reply({
                content: `You're not authorized to run this command :upside_down:`,
                ephemeral: true,
            });
            return;
        }


        submitTimes[user.id] = undefined;

        await interaction.reply({
            content: `Timeout cleared for <@${user.id}>`,
            ephemeral: true,
        })

    },
};