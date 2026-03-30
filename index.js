const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, Partials } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.User]
});

// When bot is ready
client.once('ready', async () => {
  console.log(`✅ Bot is online! Logged in as ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('say')
      .setDescription('Send a message (with optional reply-to)')
      .addStringOption(option => option.setName('text').setDescription('The message to send').setRequired(true))
      .addStringOption(option => option.setName('reply_to').setDescription('Message ID to reply to (optional)').setRequired(false)),

    new SlashCommandBuilder()
      .setName('poll')
      .setDescription('Create a simple poll')
      .addStringOption(option => option.setName('title').setDescription('Poll title/question').setRequired(true))
      .addStringOption(option => option.setName('option1').setDescription('First option').setRequired(true))
      .addStringOption(option => option.setName('option2').setDescription('Second option').setRequired(true))
      .addStringOption(option => option.setName('option3').setDescription('Third option (optional)').setRequired(false))
      .addStringOption(option => option.setName('option4').setDescription('Fourth option (optional)').setRequired(false)),

    new SlashCommandBuilder()
      .setName('react')
      .setDescription('React to a message with an emoji')
      .addStringOption(option => option.setName('emoji').setDescription('The emoji to react with').setRequired(true))
      .addStringOption(option => option.setName('message_id').setDescription('The ID of the message to react to').setRequired(true)),
  ];

  const guild = client.guilds.cache.get('1487913391694807074');
  if (guild) {
    await guild.commands.set(commands);
    console.log('✅ Slash commands registered in your server!');
  } else {
    await client.application.commands.set(commands);
    console.log('✅ Slash commands registered globally!');
  }
});

// ====================== Slash Commands ======================
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // ====================== /say Command ======================
  if (interaction.commandName === 'say') {
    const text = interaction.options.getString('text');
    const replyToId = interaction.options.getString('reply_to');

    try {
      let messageContent = text;

      if (replyToId) {
        const repliedMessage = await interaction.channel.messages.fetch(replyToId).catch(() => null);
        if (repliedMessage) {
          messageContent = `> ${repliedMessage.content}\n\n${text}`;
        } else {
          await interaction.reply({ content: 'Could not find the message with that ID.', ephemeral: true });
          return;
        }
      }

      await interaction.channel.send(messageContent);
      // Success → No reply (silent)
      
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'Failed to send message.', ephemeral: true });
    }
  }

  // ====================== /poll Command ======================
  if (interaction.commandName === 'poll') {
    const title = interaction.options.getString('title');
    const opt1 = interaction.options.getString('option1');
    const opt2 = interaction.options.getString('option2');
    const opt3 = interaction.options.getString('option3');
    const opt4 = interaction.options.getString('option4');

    const options = [opt1, opt2];
    if (opt3) options.push(opt3);
    if (opt4) options.push(opt4);

    const pollEmbed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(
        options.map((option, index) => `**${String.fromCharCode(65 + index)}.** ${option}`).join('\n')
      )
      .setColor(0x5865F2)
      .setTimestamp();

    try {
      const pollMessage = await interaction.channel.send({ embeds: [pollEmbed] });

      const emojis = ['🇦', '🇧', '🇨', '🇩'];
      for (let i = 0; i < options.length; i++) {
        await pollMessage.react(emojis[i]);
      }

      // Success → No reply (silent)

    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'Failed to create poll.', ephemeral: true });
    }
  }

  // ====================== /react Command ======================
  if (interaction.commandName === 'react') {
    const emoji = interaction.options.getString('emoji');
    const messageId = interaction.options.getString('message_id');

    try {
      const targetMessage = await interaction.channel.messages.fetch(messageId);
      await targetMessage.react(emoji);
      // Success → No reply (silent)

    } catch (error) {
      console.error(error);
      await interaction.reply({ 
        content: 'Failed to react.', 
        ephemeral: true 
      });
    }
  }
});

// ====================== kc_gem Pin System (3 reactions) ======================
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Error fetching partial reaction:', error);
      return;
    }
  }

  const emojiName = reaction.emoji.name;

  // Changed to trigger at 3 reactions as you originally wanted
  if (emojiName === 'kc_gem' && reaction.count >= 3) {
    const originalMessage = reaction.message;

    try {
      const pinsChannel = await client.channels.fetch('1487913781487993044');
      if (!pinsChannel) return;

      const pinEmbed = new EmbedBuilder()
        .setAuthor({
          name: originalMessage.author.username,
          iconURL: originalMessage.author.displayAvatarURL({ dynamic: true })
        })
        .setDescription(originalMessage.content || '*No text content*')
        .setColor(0xFFD700)
        .setTimestamp(originalMessage.createdAt);

      if (originalMessage.attachments.size > 0) {
        const firstAttachment = originalMessage.attachments.first();
        if (firstAttachment.contentType?.startsWith('image/')) {
          pinEmbed.setImage(firstAttachment.url);
        }
      }

      const pinMessage = await pinsChannel.send({
        embeds: [pinEmbed],
        files: originalMessage.attachments.map(att => att)
      });

      // React with kc_gem on the pinned message
      const gemEmoji = originalMessage.guild.emojis.cache.find(e => e.name === 'kc_gem');
      if (gemEmoji) {
        await pinMessage.react(gemEmoji);
      } else {
        await pinMessage.react('kc_gem');
      }

      console.log(`✅ Pinned message to #pins (3x kc_gem reached)`);

    } catch (error) {
      console.error('Error pinning message:', error);
    }
  }
});

// Login
client.login(process.env.TOKEN);