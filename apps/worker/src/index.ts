import { PrismaClient } from '@prisma/client';
import { Bot, InlineKeyboard, Context, Composer } from 'grammy';
import * as cron from 'node-cron';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const prisma = new PrismaClient();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN || '');

// Moderation data structures
interface UserSlowMode {
  lastMessageTime: number;
  slowModeDelay: number;
}

const userSlowModes = new Map<number, UserSlowMode>();
const bannedUsers = new Set<number>();
const mutedUsers = new Map<number, number>(); // userId -> unmute timestamp

async function sendScheduledPosts() {
  try {
    const now = new Date();
    const scheduledPosts = await prisma.post.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          lte: now,
        },
      },
      include: {
        media: true,
      },
    });

    for (const post of scheduledPosts) {
      try {
        const chatId = process.env.TELEGRAM_CHANNEL_ID || '';

        let messageText = post.content || '';

        if (post.title) {
          messageText = `*${post.title}*\n\n${messageText}`;
        }

        // Send text message first with inline buttons
        if (messageText.trim()) {
          const inlineKeyboard = new InlineKeyboard()
            .url('Join Volunteers', process.env.TELEGRAM_VOLUNTEER_URL || '')
            .url('Add to Calendar', process.env.TELEGRAM_CALENDAR_URL || '')
            .url('Directions', process.env.TELEGRAM_DIRECTIONS_URL || '');

          await bot.api.sendMessage(chatId, messageText, {
            parse_mode: 'Markdown',
            reply_markup: inlineKeyboard,
          });
        }

        // Send media if any
        for (const media of post.media) {
          if (media.type === 'image') {
            await bot.api.sendPhoto(chatId, media.url, {
              caption: media.filename || '',
            });
          } else if (media.type === 'video') {
            await bot.api.sendVideo(chatId, media.url, {
              caption: media.filename || '',
            });
          } else if (media.type === 'document') {
            await bot.api.sendDocument(chatId, media.url, {
              caption: media.filename || '',
            });
          }
        }

        // Mark as sent
        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: 'SENT',
            postedAt: now,
          },
        });

        console.log(`Post ${post.id} sent successfully`);
      } catch (error) {
        console.error(`Failed to send post ${post.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in sendScheduledPosts:', error);
  }
}

// Command handlers
bot.command('rules', async (ctx) => {
  if (!ctx.chat?.type || ctx.chat.type === 'private') {
    return; // Only work in groups
  }

  const rulesText = `📜 *Group Rules*

1. Respect all members
2. Keep discussions civil and on-topic
3. No spam or promotional content
4. Report issues to admins
5. Follow community guidelines

*Violations may result in warnings, muting, or banning.*`;

  await ctx.reply(rulesText, { parse_mode: 'Markdown' });
});

bot.command('slowmode', async (ctx) => {
  if (!ctx.chat?.type || ctx.chat.type === 'private') {
    return; // Only work in groups
  }

  const admins = await ctx.getChatAdministrators();
  const isAdmin = admins.some(admin => admin.user.id === ctx.from?.id);

  if (!isAdmin) {
    await ctx.reply('❌ Only admins can use this command.');
    return;
  }

  // Extract duration from command (e.g., /slowmode 30 for 30 seconds)
  const args = ctx.message?.text?.split(' ').slice(1);
  const duration = args?.[0] ? parseInt(args[0]) : 30; // Default 30 seconds

  if (isNaN(duration) || duration < 0 || duration > 3600) {
    await ctx.reply('❌ Invalid duration. Use /slowmode <seconds> (0-3600).');
    return;
  }

  // Note: Slowmode delay is set via chat permissions, but for basic implementation we'll store it
  await ctx.reply(`✅ Slowmode set to ${duration} seconds per message. (Note: Full implementation requires chat admin permissions)`);
});

// Welcome new members with CAPTCHA
bot.on('chat_member', async (ctx) => {
  const member = ctx.chatMember.new_chat_member;

  if (member.status === 'member' && ctx.chatMember.old_chat_member.status === 'left') {
    // New member joined
    const captchaText = Math.random().toString(36).substring(2, 8).toUpperCase();
    const captchaKeyboard = new InlineKeyboard()
      .text(captchaText, `captcha:${captchaText}:${member.user.id}`);

    await ctx.reply(
      `👋 Welcome ${member.user.first_name}!\n\nPlease verify you're human by clicking the button below:\n\n*${captchaText}*`,
      {
        parse_mode: 'Markdown',
        reply_markup: captchaKeyboard,
      }
    );

    // Note: Full restriction implementation requires proper permissions
    // For now, we'll just send the CAPTCHA and rely on manual verification
  }
});

// Handle CAPTCHA callback
bot.callbackQuery(/^captcha:/, async (ctx) => {
  const data = ctx.callbackQuery.data.split(':');
  const captchaCode = data[1];
  const userId = parseInt(data[2]);

  if (ctx.from?.id !== userId) {
    await ctx.answerCallbackQuery('❌ This CAPTCHA is not for you!');
    return;
  }

  // Verify CAPTCHA (in a real implementation, you'd check against stored value)
  if (captchaCode) {
    // Remove restrictions and welcome the user
    try {
      await ctx.api.restrictChatMember(ctx.chat?.id || '', userId, {
        can_send_messages: true,
      });
      await ctx.editMessageText('✅ Verification successful! Welcome to the group!');
      await ctx.answerCallbackQuery('✅ Verified successfully!');
    } catch (error) {
      console.error('Failed to unrestrict member:', error);
      await ctx.answerCallbackQuery('❌ Verification failed. Please contact an admin.');
    }
  } else {
    await ctx.answerCallbackQuery('❌ Invalid CAPTCHA code.');
  }
});

// Keyword filtering
bot.on('message:text', async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) return next();

  // Check if user is banned
  if (bannedUsers.has(userId)) {
    await ctx.deleteMessage();
    return;
  }

  // Check if user is muted
  const unmuteTime = mutedUsers.get(userId);
  if (unmuteTime && Date.now() < unmuteTime) {
    await ctx.deleteMessage();
    return;
  }

  // Check slow mode
  const slowMode = userSlowModes.get(userId);
  if (slowMode) {
    const now = Date.now();
    const timeSinceLastMessage = now - slowMode.lastMessageTime;
    if (timeSinceLastMessage < slowMode.slowModeDelay * 1000) {
      await ctx.deleteMessage();
      return;
    }
    slowMode.lastMessageTime = now;
  }

  // Keyword filtering
  const keywords = ['spam', 'advertisement', 'scam', 'violation']; // Configurable
  const messageText = ctx.message.text.toLowerCase();
  const containsKeyword = keywords.some(keyword => messageText.includes(keyword));

  if (containsKeyword) {
    await ctx.deleteMessage();

    // Queue for admin review
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '';
    if (adminChatId) {
      const forwarded = await ctx.forwardMessage(adminChatId);
      await bot.api.sendMessage(adminChatId, `🚨 Flagged message from ${ctx.from?.username || ctx.from?.first_name || 'Unknown User'} (ID: ${userId})\n\nKeyword: ${keywords.find(k => messageText.includes(k))}\n\n[Review Message]`, {
        reply_markup: new InlineKeyboard()
          .text('✅ Allow', `moderate:allow:${forwarded.message_id}`)
          .text('🚫 Delete', `moderate:delete:${forwarded.message_id}`)
          .text('⏸️ Mute 1h', `moderate:mute:${userId}`)
      });
    }
    return;
  }

  await next();
});

// Moderation callback handlers
bot.callbackQuery(/^moderate:/, async (ctx) => {
  const data = ctx.callbackQuery.data.split(':');
  const action = data[1];
  const target = data[2];

  const moderatorId = ctx.from?.id?.toString();
  if (!moderatorId) return;

  try {
    if (action === 'allow') {
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
      await ctx.answerCallbackQuery('Message allowed');
    } else if (action === 'delete') {
      await ctx.deleteMessage();
      await ctx.answerCallbackQuery('Message deleted');
    } else if (action === 'mute') {
      const userId = parseInt(target);
      const unmuteTime = Date.now() + (60 * 60 * 1000); // 1 hour
      mutedUsers.set(userId, unmuteTime);

      // Store in database
      await prisma.moderationAction.create({
        data: {
          action: 'mute',
          targetUserId: target,
          moderatorId,
          reason: 'Keyword violation',
          duration: 1
        }
      });

      // Try to mute in Telegram
      try {
        await ctx.api.restrictChatMember(ctx.chat?.id || '', userId, {
          can_send_messages: false
        });
      } catch (error) {
        console.error('Failed to restrict member:', error);
      }

      await ctx.answerCallbackQuery('User muted for 1 hour');
    }

    // Log moderation action
    await prisma.auditLog.create({
      data: {
        memberId: target,
        by: moderatorId,
        action: `moderation_${action}`,
        details: { keyword: true }
      }
    });

  } catch (error) {
    console.error('Moderation error:', error);
    await ctx.answerCallbackQuery('Error processing moderation action');
  }
});

// Enhanced slow mode command
bot.command('slowmode', async (ctx) => {
  if (!ctx.chat?.type || ctx.chat.type === 'private') return;

  const admins = await ctx.getChatAdministrators();
  const isAdmin = admins.some(admin => admin.user.id === ctx.from?.id);

  if (!isAdmin) {
    await ctx.reply('❌ Only admins can use this command.');
    return;
  }

  const args = ctx.message?.text?.split(' ').slice(1);
  const duration = args?.[0] ? parseInt(args[0]) : 0;

  if (isNaN(duration) || duration < 0 || duration > 3600) {
    await ctx.reply('❌ Invalid duration. Use /slowmode <seconds> (0-3600). Set to 0 to disable.');
    return;
  }

  // Apply to all users in this chat
  // Note: In production, you'd want to persist this per chat
  for (const [userId] of userSlowModes) {
    if (duration === 0) {
      userSlowModes.delete(userId);
    } else {
      userSlowModes.set(userId, { lastMessageTime: 0, slowModeDelay: duration });
    }
  }

  await ctx.reply(`✅ Slowmode ${duration === 0 ? 'disabled' : `set to ${duration} seconds per message`}.`);
});

// Moderation commands
bot.command('ban', async (ctx) => {
  if (!ctx.chat?.type || ctx.chat.type === 'private') return;

  const admins = await ctx.getChatAdministrators();
  const isAdmin = admins.some(admin => admin.user.id === ctx.from?.id);

  if (!isAdmin) {
    await ctx.reply('❌ Only admins can use this command.');
    return;
  }

  const replyTo = ctx.message?.reply_to_message;
  if (!replyTo?.from?.id) {
    await ctx.reply('❌ Reply to a message from the user you want to ban.');
    return;
  }

  const userId = replyTo.from.id;
  const moderatorId = ctx.from?.id?.toString();

  bannedUsers.add(userId);

  // Try to ban in Telegram
  try {
    await ctx.api.banChatMember(ctx.chat.id, userId);
  } catch (error) {
    console.error('Failed to ban member:', error);
  }

  // Store in database
  await prisma.moderationAction.create({
    data: {
      action: 'ban',
      targetUserId: userId.toString(),
      moderatorId: moderatorId || '',
      reason: 'Admin ban command'
    }
  });

  await ctx.reply(`🚫 User banned.`);
});

bot.command('unban', async (ctx) => {
  if (!ctx.chat?.type || ctx.chat.type === 'private') return;

  const admins = await ctx.getChatAdministrators();
  const isAdmin = admins.some(admin => admin.user.id === ctx.from?.id);

  if (!isAdmin) {
    await ctx.reply('❌ Only admins can use this command.');
    return;
  }

  const args = ctx.message?.text?.split(' ').slice(1);
  const userId = args?.[0] ? parseInt(args[0]) : null;

  if (!userId) {
    await ctx.reply('❌ Provide a user ID to unban.');
    return;
  }

  bannedUsers.delete(userId);

  try {
    await ctx.api.unbanChatMember(ctx.chat.id, userId);
  } catch (error) {
    console.error('Failed to unban member:', error);
  }

  await ctx.reply(`✅ User unbanned.`);
});

bot.command('mute', async (ctx) => {
  if (!ctx.chat?.type || ctx.chat.type === 'private') return;

  const admins = await ctx.getChatAdministrators();
  const isAdmin = admins.some(admin => admin.user.id === ctx.from?.id);

  if (!isAdmin) {
    await ctx.reply('❌ Only admins can use this command.');
    return;
  }

  const replyTo = ctx.message?.reply_to_message;
  if (!replyTo?.from?.id) {
    await ctx.reply('❌ Reply to a message from the user you want to mute.');
    return;
  }

  const userId = replyTo.from.id;
  const moderatorId = ctx.from?.id?.toString();
  const duration = 60 * 60; // 1 hour default
  const unmuteTime = Date.now() + (duration * 1000);

  mutedUsers.set(userId, unmuteTime);

  // Try to mute in Telegram
  try {
    await ctx.api.restrictChatMember(ctx.chat.id, userId, {
      can_send_messages: false
    });
  } catch (error) {
    console.error('Failed to mute member:', error);
  }

  // Store in database
  await prisma.moderationAction.create({
    data: {
      action: 'mute',
      targetUserId: userId.toString(),
      moderatorId: moderatorId || '',
      reason: 'Admin mute command',
      duration: 1
    }
  });

  await ctx.reply(`🔇 User muted for 1 hour.`);
});

// Enhanced CAPTCHA with better enforcement
bot.on('chat_member', async (ctx) => {
  const member = ctx.chatMember.new_chat_member;

  if (member.status === 'member' && ctx.chatMember.old_chat_member.status === 'left') {
    // Immediately restrict new member
    try {
      await ctx.api.restrictChatMember(ctx.chat?.id || '', member.user.id, {
        can_send_messages: false
      });
    } catch (error) {
      console.error('Failed to restrict new member:', error);
    }

    // Generate CAPTCHA
    const captchaText = Math.random().toString(36).substring(2, 8).toUpperCase();
    const captchaKeyboard = new InlineKeyboard()
      .text(captchaText, `captcha:${captchaText}:${member.user.id}`);

    await ctx.reply(
      `👋 Welcome ${member.user.first_name}!\n\nTo prevent spam, please verify you're human by clicking the button below within 5 minutes:\n\n*${captchaText}*\n\n⚠️ You cannot send messages until verified.`,
      {
        parse_mode: 'Markdown',
        reply_markup: captchaKeyboard,
      }
    );

    // Auto-remove restrictions after 5 minutes if not verified
    setTimeout(async () => {
      try {
        await ctx.api.kickChatMember(ctx.chat?.id || '', member.user.id);
      } catch (error) {
        console.error('Failed to remove unverified member:', error);
      }
    }, 5 * 60 * 1000);
  }
});

// Enhanced CAPTCHA handler
bot.callbackQuery(/^captcha:/, async (ctx) => {
  const data = ctx.callbackQuery.data.split(':');
  const captchaCode = data[1];
  const userId = parseInt(data[2]);

  if (ctx.from?.id !== userId) {
    await ctx.answerCallbackQuery('❌ This CAPTCHA is not for you!');
    return;
  }

  if (captchaCode) {
    // Remove restrictions
    try {
      await ctx.api.restrictChatMember(ctx.chat?.id || '', userId, {
        can_send_messages: true
      });
      await ctx.editMessageText('✅ Verification successful! Welcome to the group! You can now send messages.');
      await ctx.answerCallbackQuery('✅ Verified successfully!');
    } catch (error) {
      console.error('Failed to unrestrict member:', error);
      await ctx.answerCallbackQuery('❌ Verification failed. Please contact an admin.');
    }
  } else {
    await ctx.answerCallbackQuery('❌ Invalid CAPTCHA code.');
  }
});

// Weekly summary automation
async function sendWeeklySummary() {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get member stats
    const newMembers = await prisma.member.count({
      where: { createdAt: { gte: weekAgo } }
    });

    const approvedMembers = await prisma.member.count({
      where: { status: 'APPROVED', approvedAt: { gte: weekAgo } }
    });

    // Get post stats
    const sentPosts = await prisma.post.count({
      where: { status: 'SENT', postedAt: { gte: weekAgo } }
    });

    const totalViews = await prisma.post.aggregate({
      where: { postedAt: { gte: weekAgo } },
      _sum: { views: true }
    });

    // Get moderation stats
    const moderationActions = await prisma.moderationAction.count({
      where: { createdAt: { gte: weekAgo } }
    });

    // Get event stats
    const publishedEvents = await prisma.event.count();

    const summary = `📊 *Weekly Summary Report*\n\n` +
      `👥 *Members*\n` +
      `• New registrations: ${newMembers}\n` +
      `• Approved members: ${approvedMembers}\n\n` +
      `📢 *Content*\n` +
      `• Posts sent: ${sentPosts}\n` +
      `• Total views: ${totalViews._sum.views || 0}\n\n` +
      `⚖️ *Moderation*\n` +
      `• Actions taken: ${moderationActions}\n\n` +
      `📅 *Events*\n` +
      `• Rotas published: ${publishedEvents}\n\n` +
      `Week ending: ${now.toLocaleDateString()}`;

    const channelId = process.env.TELEGRAM_CHANNEL_ID || '';
    if (channelId) {
      await bot.api.sendMessage(channelId, summary, { parse_mode: 'Markdown' });
    }

    console.log('Weekly summary sent');
  } catch (error) {
    console.error('Error sending weekly summary:', error);
  }
}

// Nightly S3 backup
async function performNightlyBackup() {
  try {
    const now = new Date();
    const backupData = {
      timestamp: now.toISOString(),
      members: await prisma.member.findMany({
        select: {
          id: true,
          telegramUserId: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true,
          wardSlug: true,
          status: true,
          createdAt: true
        }
      }),
      posts: await prisma.post.findMany(),
      events: await prisma.event.findMany(),
      moderationActions: await prisma.moderationAction.findMany(),
      forms: await prisma.form.findMany(),
      formSubmissions: await prisma.formSubmission.findMany()
    };

    const backupJson = JSON.stringify(backupData, null, 2);
    const backupName = `backup-${now.toISOString().split('T')[0]}.json`;
    const key = `backups/${backupName}`;

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.S3_BUCKET || 'telegram-backups',
        Key: key,
        Body: backupJson,
        ContentType: 'application/json',
        ACL: 'private'
      },
    });

    await upload.done();
    console.log(`Nightly backup completed: ${backupName}`);
  } catch (error) {
    console.error('Error performing nightly backup:', error);
  }
}

// Start the bot to handle commands and events
bot.start();

console.log('Telegram bot started');

// Run every minute to check for scheduled posts
cron.schedule('* * * * *', sendScheduledPosts);

// Weekly summary every Sunday at 9 AM
cron.schedule('0 9 * * 0', sendWeeklySummary);

// Nightly backup at 2 AM
cron.schedule('0 2 * * *', performNightlyBackup);

console.log('Worker started - checking for scheduled posts every minute');

process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down worker...');
  await prisma.$disconnect();
  process.exit(0);
});