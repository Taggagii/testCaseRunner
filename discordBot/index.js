require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Client, Collection, Events, GatewayIntentBits, Partials } = require('discord.js');
const client = new Client({
    intents: Object.values(GatewayIntentBits),
    partials: Object.values(Partials)
});
client.commands = new Collection();

const { weeksTable } = require('./databaseHandler');
const { submitTimes, timeUntilClear, canUserSubmit } = require('./submitTimes');

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

commandFolders.forEach((folder) => {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

    commandFiles.forEach((file) => {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            console.log(`Accepting: "/${command.data.name}"`)
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property`);
        }
    });
});

client.once(Events.ClientReady, async (readyClient) => {
    await weeksTable.init();
    console.log(`Logged in as ${readyClient.user.tag}!`);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isModalSubmit()) {
        return;
    }
  
    if (interaction.customId !== 'submit') {
        return;
    }

    if (!canUserSubmit(interaction.user.id)) {
        await interaction.user.send("What are you trying to pull? :rage:");
        return;
    }

    const command = interaction.client.commands.get(interaction.customId);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found`);
        return;
    }


    try {
        await command.handleModal(interaction);
    } catch (error) {
        console.error(error);

        const responsePayload = {
            content: 'There was an error while handling this modal',
            ephemeral: true,
        };
        
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(responsePayload);
            } else {
                await interaction.reply(responsePayload)
            }
        } catch (error) {
            // console.log('Error while handling error', error);
            console.log(interaction);
        }
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
        return;
    }

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found`);
        return;
    }

    if (interaction.commandName === 'submit') {
        if (!canUserSubmit(interaction.user.id)) {
            if (submitTimes[interaction.user.id].currentlyRunningCode) {
                await interaction.reply({
                    content: 'You can only run one piece of code at once :smile:',
                    ephemeral: true,
                });
                return;
            }

            const msPerMinute = 60 * 1000;

            const remainingTimeMs = timeUntilClear(interaction.user.id);
            const remainingTimeMin = Math.floor(remainingTimeMs / msPerMinute);
            const remainingTimeSeconds = Math.floor((remainingTimeMs % msPerMinute) / 1000);

            const minutesString = (remainingTimeMin) ? `${remainingTimeMin} minutes and` : '';

            await interaction.reply({
                content: `You've used up your execution time for now. You can resubmit in ${minutesString} ${remainingTimeSeconds} seconds :clock:`,
                ephemeral: true,
            });
            return;
        }
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);

        const responsePayload = {
            content: 'There was an error while executing this command',
            ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(responsePayload);
        } else {
            await interaction.reply(responsePayload)
        }
    }
});


client.login(process.env.TOKEN);
