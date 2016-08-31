/** NOTES
 * 
 * - discord.io: This module is a simple wrapper for the Discord API. You can find all you need to know about it here: https://github.com/izy521/discord.io
 * 
 */


/** RANDOM FACTS
 * 
 * - "@Username": When you call someone using @Username it translates into <@USER_ID> in the message
 * - The 'bot' object: It contains everything you need but you have to find it! If you think it would be cool to be able to find something quicker, please create a function to return it.
 * 
 */


/* MODULES */

var DiscordBot = require('discord.io');


/* VARIABLES */

/**
 * The list of commands added by the users that have a permission included in the 'authorized' array.
 */
var commands = {};
/**
 * The list of commands currently on repeat.
 */
var onRepeat = [];
/**
 * A list of words that will trigger an automatic answer from the bot.
 */
var greetings = ['hi', 'hey', 'hello', "sup'", 'greetings'];
/**
 * List of group IDs that will be considered as Administrators
 */
var authorized = [

    // Administrators ID
    '197085976303108097',

    // GDG Organizers ID
    '197082633673375744'

];
/**
 * The server object. Feel free to browse this one, it's part of the huge bot object.
 */
var server;


/* BOT INITIALIZATION */

var bot = new DiscordBot({
    // You can register your own app here: https://discordapp.com/developers/applications/me, and add your bot to a test server
    // More info about bots on Discord here: https://discordapp.com/developers/docs/topics/oauth2
    token: "YOUR_APP_TOKEN",
    autorun: true
});


/* BOT EVENTS */

/**
 * Runs once the bot is connected to the server.
 * We initialize the 'server' variable here.
 * 
 * @param {Object} rawEvent The Discord event object
 */
bot.on("ready", function(rawEvent) {
    console.log("Connected!");
    console.log("Logged in as: " + bot.username + " - (" + bot.id + ")");
    server = bot.servers[rawEvent.d.guilds[0].id];
});

/**
 * Runs when a message is posted on the server.
 * 
 * @param {string} usermame The user's name
 * @param {number} userID The user's ID
 * @param {number} channelID The ID of the channel where the message was posted
 * @param {string} message The content of the message
 * @param {Object} rawEvent The Discord event object
 */
bot.on("message", function(username, userID, channelID, message, rawEvent) {
    // Detects if the message contains our bot's name or its @botname which is translated into <@BOT_ID> in the message
    var botNameIndex = message.indexOf(bot.username);
    if (botNameIndex === -1) botNameIndex = message.indexOf('<@' + bot.id + '>');
    // Runs the command router if the message starts with "!"
    if (message[0] === '!') {
        // Set the command name and take it out of the message
        var firstSpace = message.indexOf(' ');
        if (firstSpace > -1) {
            command = message.substring(1, firstSpace);
            message = message.substring(firstSpace);
        } else {
            command = message.substring(1);
            message = "";
        }
        // Detects and remove the options from the command line put them into the 'args' array
        var args = [];
        var m;
        while (m = / \-\-[a-zA-Z0-9]+/g.exec(message)) {
            args.push(m[0].substring(3));
            message = message.replace(m[0], '');
        }
        router(command, args, message.substring(1), channelID, getUserByID(userID), isAuthorized(userID));
    } else if (botNameIndex > -1) {
        // This part is just for fun. We get the previous and the next word after our bot's name and one of them is in the 'greetings' array then we answer to the user using @Username
        // We can probably reuse that in some way
        var previousWord = message.wordBefore(botNameIndex);
        var nextWord = message.wordAfter(botNameIndex);
        if (greetings.indexOf(previousWord.toLowerCase()) > -1 || greetings.indexOf(nextWord.toLowerCase()) > -1) bot.sendMessage({ to: channelID, message: greetings[randBetween(0, greetings.length - 1)].capitalize() + ' <@' + userID + '>!' });
    }
});

/**
 * Runs when the status of a user changes:
 * - started playing a game
 * - connected / disconnected / idle
 * 
 * @param {string} username The user's name
 * @param {number} userID The user's ID
 * @param {string} status The user's status (connected, disconnected, idle)
 * @param {string} gameName The game that the user is currently playing
 */
bot.on("presence", function(username, userID, status, gameName, rawEvent) {
    console.log(username + " is now " + status + (gameName ? ' (' + gameName + ')' : ''));
});

/**
 * Runs every time an event is triggered.
 * 
 * @param {Object} rawEvent The Discord event object
 */
bot.on("debug", function(rawEvent) {
    //console.log(rawEvent);
});

/**
 * Runs when the bot is disconnected from the server.
 * It is currently automatically reconnecting if it is the case.
 */
bot.on("disconnected", function() {
    console.log("Bot disconnected");
    bot.connect(); //Auto reconnect
});


/* FUNCTIONS */

/**
 * Executes a piece of code depending on the 'cmd' parameter.
 * 
 * @param {string} cmd The command name
 * @param {string[]} options An array regrouping the options entered in the command line without their double dash prefix
 * @param {string} content What's left of the message after taking out the command name and the options
 * @param {number} channel The unique ID of the channel where the command line was posted
 */
function router(cmd, options, content, channel, user, authorized) {
    switch (cmd) {

        // Roll a number between a min and max (between 1 and 100 by default)
        case 'roll':
            var args = content.split(' ');
            roll(channel, args[0], args[1]);
            break;

            // Flip a coin, Heads or Tails
        case 'flip':
            flip(channel);
            break;

            /**
             * If authorized, !command allows you to add, edit, or delete a command.
             */
        case 'command':
            if (!authorized) break;
            var endCommand = content.indexOf(' ');
            if (endCommand > -1) {
                var command = content.substring(0, endCommand);
                var text = content.substring(endCommand + 1);
                if (command.length > 0 && content.length > 0) {
                    if (options.indexOf('edit') > -1 && commands[command]) {
                        commands[command].content = text;
                    } else if (options.indexOf('add') > -1 && !commands[command]) {
                        commands[command] = { type: 'text', content: text };
                    } else if (options.indexOf('delete') > -1 && commands[command]) {
                        var ic = onRepeat.indexOf(command);
                        if (ic > -1) onRepeat.splice(ic, 1);
                        delete commands[command];
                    }
                }
            }
            break;

            // Displays the commands currently on repeat
        case 'onrepeat':
            bot.sendMessage({ to: channel, message: onRepeat.length > 0 ? 'Command(s) currently on repeat: ' + onRepeat.join(', ') : "There is currently no command on repeat." });
            break;

            // If the command is not in our basic set of commands, we'll check if it's a custom command. If it is we will execute the command. If the repeat option is used, we'll repeat the command every x milliseconds (x is a parameter provided by the user). You can stop the auto repeat by using the 'stop' option.
        default:
            if (commands[cmd]) {
                var command = commands[cmd];
                var indexCommand = onRepeat.indexOf(cmd);
                if (options.indexOf('repeat') > -1) {
                    if (indexCommand > -1) {
                        bot.sendMessage({ to: channel, message: 'The command "!' + cmd + '" is already on repeat.' });
                    } else {
                        var interval = parseInt(content);
                        if (!isNaN(interval)) {
                            onRepeat.push(cmd);
                            repeatMessage(cmd, channel, command.content, interval);
                        }
                    }
                } else if (options.indexOf('stop') > -1 && indexCommand > -1) {
                    onRepeat.splice(indexCommand, 1);
                    bot.sendMessage({ to: channel, message: 'The command "!' + cmd + '" is not running anymore.' });
                } else {
                    bot.sendMessage({ to: channel, message: command.content });
                }
            }
            break;

    }
}

/**
 * Picks a random number between 'min' and 'max' and posts the result to the selected 'channel'.
 * If min or max are not set, min will be equal to 1 and max to 100.
 * If max is inferior to min, the result will be equal to min.
 * 
 * @param {number} channel The ID of the channel where the bot will answer
 * @param {number} min
 * @param {number} max
 */
function roll(channel, min, max) {
    min = parseInt(min);
    max = parseInt(max);
    if (isNaN(min)) min = 1;
    if (isNaN(max)) max = 100;
    if (max < min) max = min;
    var x = randBetween(min, max);
    bot.sendMessage({ to: channel, message: "You rolled a " + x + " (" + min + " - " + max + ")" });
}

/**
 * Simple coin toss, the bot will post the result on the selected 'channel'.
 * 
 * @param {number} channel The ID of the channel where the bot will answer
 */
function flip(channel) {
    var x = randBetween(0, 100);
    bot.sendMessage({ to: channel, message: (x >= 50 ? "Heads" : "Tails") + "!" });
}

/**
 * Returns the user object using the 'userID' parameter if the user exists, if not, returns false.
 * 
 * @param {number} userID The user's ID
 * @returns {Object|boolean} The user object
 */
function getUserByID(userID) {
    return server && server.members[userID] ? server.members[userID] : false;
}

/**
 * Returns true if one of the user's permission ID is in the 'authorized' array.
 * 
 * @param {number} userID The user's ID
 * @returns {boolean} True if authorized.
 */
function isAuthorized(userID) {
    var m = getUserByID(userID);
    if (m) {
        for (var i = 0; i < m.roles.length; i++) {
            if (authorized.indexOf(m.roles[i]) > -1) return true;
        }
    }
    return false;
}

/**
 * Repeats a message if it is in the 'onRepeat' array.
 * 
 * @param {string} command The command name
 * @param {number} channelID The ID of the channel where the bot will post
 * @param {string} message The content of the message
 * @param {number} repeat The amount of time between two repetitions of the message in milliseconds
 */
function repeatMessage(command, channelID, message, repeat) {
    if (onRepeat.indexOf(command) > -1) {
        bot.sendMessage({ to: channelID, message: message });
        setTimeout(function() { repeatMessage(command, channelID, message, repeat); }, repeat);
    }
}

/**
 * Returns a number between the 'min' and 'max' parameters.
 * 
 * @param {number} min The minimum number that we can get
 * @param {number} max The maximum number that we can get
 * @returns {number} A number between 'min' and 'max'.
 */
function randBetween(min, max) {
    if (max === min) return min;
    return Math.floor(Math.random() * (max - min + 1) + min);
}


/* STRING PROTOTYPES */

/**
 * Capitalize the first letter of the string and returns it.
 * 
 * @returns {string} The string starting with a capital letter.
 */
String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

/**
 * @param {string} expression
 * @returns {string} Returns the word before the 'expression' parameter in the string.
 */
String.prototype.wordBefore = function(expression) {
    var index;
    if (typeof expression === "string") index = this.indexOf(expression);
    else if (!isNaN(expression)) index = expression;
    else return;
    var previousWordIndex = this.lastIndexOf(' ', index - 2);
    if (previousWordIndex === -1) previousWordIndex = 0;
    else previousWordIndex++;
    return this.substring(previousWordIndex, index - 1);
}

/**
 * @param {string} expression
 * @returns Returns the word after the 'expression' parameter in the string.
 */
String.prototype.wordAfter = function(expression) {
    var index;
    if (typeof expression === "string") index = this.indexOf(expression);
    else if (!isNaN(expression)) index = expression;
    else return;
    var nextWordIndex = this.indexOf(' ', index);
    if (nextWordIndex === -1) return "";
    else nextWordIndex++;
    var end = this.indexOf(' ', nextWordIndex);
    if (end === -1) end = this.length;
    return this.substring(nextWordIndex, end);
}