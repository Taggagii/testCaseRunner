const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { runTask } = require('../../../runner')
const { weeksTable } = require('../../databaseHandler');
const { submitTimes, timeUntilClear, remainingTime } = require('../../submitTimes');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('submit')
        .setDescription('Submit code attempt for weekly coding challenge!')
        .addIntegerOption((option) =>
            option.setName('week')
                .setDescription('Which week are you answering for?')
                .setMinValue(1)
                .setRequired(true)
        ),

    async handleModal(interaction) {
        submitTimes[interaction.user.id].currentlyRunningCode = true;

        const code = interaction.fields.getTextInputValue('code');
        const week = interaction.fields.getTextInputValue('week');

        (async () => {
            let res;
            try {
                res = await runTask(code, week, 60 * 5);

                submitTimes[interaction.user.id].cumulativeExecutionTime += res.upTimeSeconds * 1000;

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
    // Your code: \`\`\`py
    // ${code}
    // \`\`\`
                    await interaction.user.send(`
Your code for ${week} PASSED the test cases! :tada:
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
    
                    // Your code \`\`\`py
                    // ${code}
                    // \`\`\`
                    await interaction.user.send(`
Your code for week ${week} FAILED.
It failed ${reasoning}
You have ${remainingTime(interaction.user.id)}ms of execution time remaining until your next refresh.
                    `)
// (this is temporary for you jacob ${JSON.stringify(res.logs)})
                }
            } catch (error) {
                console.error('Hit an error while running code', error);
                await interaction.user.send('You caused an error in the bot... :sweat_smile: stop')
            } finally {
                submitTimes[interaction.user.id].currentlyRunningCode = false;
                console.log('USER SUBMITTED CODE: ', interaction.user.globalName);
                console.log('WEEK:', week);
                console.log(`CODE:\n${code}`);
                console.log('RES:', res)
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
