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
const { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder, 
  Events 
} = require('discord.js');

// 例如 Bot 啟動後自動送出
client.once(Events.ClientReady, async () => {
    const verifyChannel = await client.channels.fetch(VERIFY_CHANNEL_ID);

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('verify_button')
                .setLabel('送出驗證')
                .setStyle(ButtonStyle.Primary)
        );

    await verifyChannel.send({
        content: "👋 歡迎新人！請點擊下方按鈕送出驗證訊息～",
        components: [row]
    });
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'verify_button') return;

    // 建立 embed
    const embed = new EmbedBuilder()
        .setTitle("📩 叮咚叮咚！來了一封新人驗證訊息🐈‍⬛")
        .setColor(0x3498db)
        .setAuthor({
            name: interaction.user.tag,
            iconURL: interaction.user.displayAvatarURL()
        })
        .setDescription("新人點擊了驗證按鈕！")
        .setTimestamp();

    try {
        const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
        await adminChannel.send({ embeds: [embed] });
        console.log("→ 發送給管理員完成");
    } catch (err) {
        console.error("發送給管理員失敗:", err);
    }

    // ✅ 只給本人看的 ephemeral 提示
    await interaction.reply({
        content: "✅ 妳的驗證已送出，只有自己能看到這則提示！",
        ephemeral: true
    });
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
