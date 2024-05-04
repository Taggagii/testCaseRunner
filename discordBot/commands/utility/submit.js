const { SlashCommandBuilder } = require('discord.js');



module.exports = {
    data: new SlashCommandBuilder()
        .setName('submit')
        .setDescription('Submit code attempt for weekly coding challenge!')
        .addIntegerOption((option) =>
            option.setName('week')
                .setDescription('Which week are you answering for?')
                .setMinValue(1)
                .setMaxValue(
                    Math.floor((Date.now() - (new Date('2024/04/04'))) / (7 * 24 * 60 * 60 * 1000))
                )
                .setRequired(true)
        )
        .addStringOption((option) =>
            option.setName('code')
                .setDescription('The code you are submitting for this problem')
                .setRequired(true)
        ),

    async execute(interaction) {
        console.log(interaction.options)

        

        await interaction.reply({
            content: 'WOWOOWOWOWOW!',
            ephemeral: true,
        });
    },
};