const { SlashCommandBuilder } = require('discord.js');
const { weeksTable } = require('../../databaseHandler');
const { makeCleanTable } = require('../../cleanTableMaker');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('scores')
        .setDescription('Get the recoded week data for a given user')
        .addUserOption((option) =>
            option.setName('user')
                .setDescription('Which user do you want the week data for?')
                .setRequired(true)
        ),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        let records = await weeksTable.getUserRecords(user.id);

        if (records === undefined) {
            await interaction.reply({
                content: 'User has no records',
                ephemeral: true,
            });
            return;
        }

        const tableOfRecords = makeCleanTable(records);

        await interaction.reply({
            content: `Test case records for user: <@${user.id}>
\`\`\`
${tableOfRecords}
\`\`\``,
            ephemeral: true,
        })

    },
};