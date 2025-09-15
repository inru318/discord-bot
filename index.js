const { Client, GatewayIntentBits, Events } = require('discord.js');
require('dotenv').config();
const express = require('express');

// ====== Discord Bot Setup ======
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
    ]
});

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const NEWBIE_ROLE_ID = '1417142705024274576';

client.once(Events.ClientReady, c => {
    console.log(`✅ 已登入：${c.user.tag}`);
});

// 成員角色更新 → 移除新人角色
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

client.login(TOKEN);

// ====== Express Server ======
// 保持 Render 進程活著
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Discord Bot is running!');
});

app.listen(PORT, () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});

// 成員加入 → 自動加新人角色
// client.on(Events.GuildMemberAdd, async (member) => {
//     try {
//         await member.roles.add(NEWBIE_ROLE_ID);
//         console.log(`已給 ${member.user.tag} 新人角色`);
//     } catch (err) {
//         console.error('加角色失敗:', err);
//     }
// });

