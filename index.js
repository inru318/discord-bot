const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');
require('dotenv').config();
const express = require('express');
const axios = require("axios");

// ====== Discord Bot Setup ======
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // ✅ 需要這個才能讀訊息內容
    ]
});

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const NEWBIE_ROLE_ID = '1417142705024274576';

// 你要監聽的驗證頻道 & 管理員頻道 ID
const VERIFY_CHANNEL_ID = '1419952528065429565';
const ADMIN_CHANNEL_ID = '1419952679886524466';

client.once(Events.ClientReady, c => {
    console.log(`✅ 已登入：${c.user.tag}`);
});

// ====== Keep Alive ======
setInterval(() => {
    axios.get(process.env.RENDER_EXTERNAL_URL || "https://discord-bot-twc1.onrender.com")
        .then(() => console.log("Keep-alive ping sent"))
        .catch(err => console.error("Keep-alive error:", err.message));
}, 5 * 60 * 1000);

// ====== 成員角色更新 → 移除新人角色 ======
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    if (newMember.roles.cache.has(NEWBIE_ROLE_ID)) {
        const hadRolesBefore = oldMember.roles.cache.filter(r => r.id !== NEWBIE_ROLE_ID).size;
        const hasRolesNow = newMember.roles.cache.filter(r => r.id !== NEWBIE_ROLE_ID).size;

        if (hasRolesNow > hadRolesBefore) {
            try {
                await newMember.roles.remove(NEWBIE_ROLE_ID);
                console.log(`已移除 ${newMember.user.tag} 的新人角色`);
            } catch (err) {
                console.error('移除新人失敗:', err);
            }
        }
    }
});

// ====== 新人訊息轉發功能 ======
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== VERIFY_CHANNEL_ID) return;

    // 發送提示訊息
    let reply;
    try {
        await message.author.send("好耶！✅ 妳的訊息已傳送給管理員，1 秒後會自動刪除原始訊息，其他人看不到這則提示～");
    } catch (err) {
        console.error("無法傳送 DM，可能使用者關閉了私訊:", err);
    }

    // 建立 embed
    try {
        const embed = new EmbedBuilder()
            .setTitle("📩 叮咚叮咚！來了一封新人驗證訊息🐈‍⬛")
            .setColor(0x3498db)
            .setAuthor({
                name: message.author.tag,
                iconURL: message.author.displayAvatarURL()
            })
            .setTimestamp();

        // 如果有文字
        if (message.content) {
            embed.setDescription(message.content);
        }

        const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);

        // 如果有附件 (語音或圖片)
        if (message.attachments.size > 0) {
            // 將所有附件直接轉發
            for (const attachment of message.attachments.values()) {
                await adminChannel.send({
                    content: `來自 ${message.author} 的語音訊息`,
                    embeds: [embed],
                    files: [attachment.url] // 或 attachment.attachment
                });
            }
        } else {
            await adminChannel.send({ embeds: [embed] });
        }

        console.log("→ 發送給管理員完成");
    } catch (err) {
        console.error("發送給管理員失敗:", err);
    }

    // 延遲刪除原訊息
    setTimeout(async () => {
        try {
            await message.delete();
        } catch (err) {
            if (err.code === 10008) {
                console.warn("使用者訊息已不存在，無法刪除");
            } else {
                console.error("刪除使用者訊息失敗:", err);
            }
        }
    }, 1200);
});

// ====== Express Server ======
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Discord Bot is running!');
});

app.listen(PORT, () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});

// ====== (可選) 成員加入 → 自動加新人角色 ======
// client.on(Events.GuildMemberAdd, async (member) => {
//     try {
//         await member.roles.add(NEWBIE_ROLE_ID);
//         console.log(`已給 ${member.user.tag} 新人角色`);
//     } catch (err) {
//         console.error('加角色失敗:', err);
//     }
// });

client.login(TOKEN);
