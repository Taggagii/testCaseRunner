const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { runTask } = require('../../../runner')
const { weeksTable } = require('../../databaseHandler');

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
        ),

    async handleModal(interaction) {
        const code = interaction.fields.getTextInputValue('code');
        const week = interaction.fields.getTextInputValue('week');

        (async () => {
            const res = await runTask(code, week, 60 * 5);
            console.log('STUFF OUTPUT');
            console.log('USER SUBMITTED CODE: ', interaction.user.globalName);
            console.log('WEEK:', week);
            console.log(`CODE:\n${code}`);

            if (res.exitCode === 0) {
                const oldRecord = await weeksTable.getRecord(interaction.user.id, week);

                if (!oldRecord?.finished || res.upTimeSeconds < oldRecord.executionTime) {
                    await weeksTable.updateRecord(
                        interaction.user.id,
                        week,
                        res.upTimeSeconds,
                        1,
                        code
                    );
                }

                // await interaction.channel.send(`
                await interaction.user.send(`
Your code: \`\`\`py
${code}
\`\`\`
for week ${week} PASSED the test cases! :tada:
Your code took ${res.upTimeSeconds} seconds to run!
`);
            } else {
                const reasoningMap = {
                    124: 'because it timed out :hourglass:',
                    1: 'because it failed a test case :x:',
                    2: 'because it threw an error',
                    '-1': 'because it was killed (what did you do?)',
                }

                let reasoning = 'for some reason I dunno man :face_with_diagonal_mouth:';

                if (Object.prototype.hasOwnProperty.call(reasoningMap, res.exitCode)) {
                    reasoning = reasoningMap[res.exitCode];
                }


                await interaction.user.send(`
Your code \`\`\`py
${code}
\`\`\`
for week ${week} FAILED.
It failed ${reasoning}
                `)
            }

        })();

        await interaction.reply({
            content: `Running your code for week ${week}. Please wait :blush:`,
            ephemeral: true,
        });

    },

    async execute(interaction) {        
        const week = interaction.options.get('week').value;

        const modal = new ModalBuilder()
            .setCustomId('submit')
            .setTitle(`Submit Code`);

        const weekInput = new TextInputBuilder()
            .setCustomId('week')
            .setLabel('Week')
            .setValue(week.toString())
            .setStyle(TextInputStyle.Short);

        const codeInput = new TextInputBuilder()
            .setCustomId('code')
            .setLabel('The code you are submitting for this problem')
            .setStyle(TextInputStyle.Paragraph);

        const firstActionRow = new ActionRowBuilder().addComponents(weekInput);
        const secondActionRow = new ActionRowBuilder().addComponents(codeInput);

        modal.addComponents(firstActionRow, secondActionRow);

        await interaction.showModal(modal);
    },
};