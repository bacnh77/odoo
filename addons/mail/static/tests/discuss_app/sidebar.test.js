/** @odoo-module alias=@mail/../tests/discuss_app/sidebar_tests default=false */
const test = QUnit.test; // QUnit.test()

import { rpc } from "@web/core/network/rpc";

import { startServer } from "@bus/../tests/helpers/mock_python_environment";

import { Command } from "@mail/../tests/helpers/command";
import { openDiscuss, openFormView, start } from "@mail/../tests/helpers/test_utils";

import { deserializeDateTime } from "@web/core/l10n/dates";
import { getOrigin } from "@web/core/utils/urls";
import { assertSteps, click, contains, insertText, step } from "@web/../tests/utils";
import { triggerHotkey } from "@web/../tests/helpers/utils";

QUnit.module("discuss sidebar");

test("toggling category button hide category items", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({
        name: "general",
        channel_type: "channel",
    });
    await start();
    await openDiscuss();
    await contains("button.o-active", { text: "Inbox" });
    await contains(".o-mail-DiscussSidebarChannel");

    await click(
        ":nth-child(1 of .o-mail-DiscussSidebarCategory) .o-mail-DiscussSidebarCategory-icon"
    );
    await contains(".o-mail-DiscussSidebarChannel", { count: 0 });
});

test("toggling category button does not hide active category items", async () => {
    const pyEnv = await startServer();
    const [channelId] = pyEnv["discuss.channel"].create([
        { name: "abc", channel_type: "channel" },
        { name: "def", channel_type: "channel" },
    ]);
    await start();
    await openDiscuss(channelId);
    await contains(".o-mail-DiscussSidebarChannel", { count: 2 });
    await contains(".o-mail-DiscussSidebarChannel.o-active");

    await click(
        ":nth-child(1 of .o-mail-DiscussSidebarCategory) .o-mail-DiscussSidebarCategory-icon"
    );
    await contains(".o-mail-DiscussSidebarChannel");
    await contains(".o-mail-DiscussSidebarChannel.o-active");
});

test("Closing a category sends the updated user setting to the server.", async (assert) => {
    await start({
        mockRPC(route, args) {
            if (route === "/web/dataset/call_kw/res.users.settings/set_res_users_settings") {
                assert.step(route);
                assert.strictEqual(
                    args.kwargs.new_settings.is_discuss_sidebar_category_channel_open,
                    false
                );
            }
        },
    });
    await openDiscuss();
    await click(
        ":nth-child(1 of .o-mail-DiscussSidebarCategory) .o-mail-DiscussSidebarCategory-icon"
    );
    assert.verifySteps(["/web/dataset/call_kw/res.users.settings/set_res_users_settings"]);
});

test("Opening a category sends the updated user setting to the server.", async (assert) => {
    const pyEnv = await startServer();
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_channel_open: false,
    });
    await start({
        mockRPC(route, args) {
            if (route === "/web/dataset/call_kw/res.users.settings/set_res_users_settings") {
                assert.step(route);
                assert.ok(args.kwargs.new_settings.is_discuss_sidebar_category_channel_open);
            }
        },
    });
    await openDiscuss();
    await click(
        ".o-mail-DiscussSidebarCategory-channel .o-mail-DiscussSidebarCategory-icon.oi-chevron-right"
    );
    assert.verifySteps(["/web/dataset/call_kw/res.users.settings/set_res_users_settings"]);
});

test("channel - command: should have view command when category is unfolded", async () => {
    await start();
    await openDiscuss();
    await contains("i[title='View or join channels']");
});

test("channel - command: should have view command when category is folded", async () => {
    const pyEnv = await startServer();
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_channel_open: false,
    });
    await start();
    await openDiscuss();
    await click(".o-mail-DiscussSidebarCategory-channel .btn", { text: "Channels" });
    await contains("i[title='View or join channels']");
});

test("channel - command: should have add command when category is unfolded", async () => {
    await start();
    await openDiscuss();
    await contains("i[title='Add or join a channel']");
});

test("channel - command: should not have add command when category is folded", async () => {
    const pyEnv = await startServer();
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_channel_open: false,
    });
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarCategory", { text: "Channels" });
    await contains("i[title='Add or join a channel']", { count: 0 });
});

test("channel - states: close manually by clicking the title", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "general" });
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_channel_open: true,
    });
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarChannel", { text: "general" });
    await click(".o-mail-DiscussSidebarCategory-channel .btn", { text: "Channels" });
    await contains(".o-mail-DiscussSidebarChannel", { count: 0, text: "general" });
});

test("channel - states: open manually by clicking the title", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "general" });
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_channel_open: false,
    });
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarCategory-channel", { text: "Channels" });
    await contains(".o-mail-DiscussSidebarChannel", { count: 0, text: "general" });

    await click(".o-mail-DiscussSidebarCategory-channel .btn", { text: "Channels" });
    await contains(".o-mail-DiscussSidebarChannel", { text: "general" });
});

test("sidebar: inbox with counter", async () => {
    const pyEnv = await startServer();
    pyEnv["mail.notification"].create({
        notification_type: "inbox",
        res_partner_id: pyEnv.currentPartnerId,
    });
    await start();
    await openDiscuss();
    await contains("button", { text: "Inbox", contains: [".badge", { text: "1" }] });
});

test("default thread rendering", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss();
    await contains("button", { text: "Inbox" });
    await contains("button", { text: "Starred" });
    await contains("button", { text: "History" });
    await contains(".o-mail-DiscussSidebarChannel", { text: "General" });
    await contains("button.o-active", { text: "Inbox" });
    await contains(".o-mail-Thread", {
        text: "Your inbox is empty Change your preferences to receive new notifications in your inbox.",
    });

    await click("button", { text: "Starred" });
    await contains("button.o-active", { text: "Starred" });
    await contains(".o-mail-Thread", {
        text: "No starred messages  You can mark any message as 'starred', and it shows up in this mailbox.",
    });

    await click("button", { text: "History" });
    await contains("button.o-active", { text: "History" });
    await contains(".o-mail-Thread", {
        text: "No history messages  Messages marked as read will appear in the history.",
    });

    await click(".o-mail-DiscussSidebarChannel", { text: "General" });
    await contains(".o-mail-DiscussSidebarChannel.o-active", { text: "General" });
    await contains(".o-mail-Thread", { text: "There are no messages in this conversation." });
});

test("sidebar quick search at 20 or more pinned channels", async () => {
    const pyEnv = await startServer();
    for (let id = 1; id <= 20; id++) {
        pyEnv["discuss.channel"].create({ name: `channel${id}` });
    }
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarChannel", { count: 20 });
    await contains(".o-mail-DiscussSidebar input[placeholder='Quick search...']");

    await insertText(".o-mail-DiscussSidebar input[placeholder='Quick search...']", "1");
    await contains(".o-mail-DiscussSidebarChannel", { count: 11 });

    await insertText(".o-mail-DiscussSidebar input[placeholder='Quick search...']", "12", {
        replace: true,
    });
    await contains(".o-mail-DiscussSidebarChannel");
    await contains(".o-mail-DiscussSidebarChannel", { text: "channel12" });

    await insertText(".o-mail-DiscussSidebar input[placeholder='Quick search...']", "123", {
        replace: true,
    });
    await contains(".o-mail-DiscussSidebarChannel", { count: 0 });

    // search should work in case-insensitive
    await insertText(".o-mail-DiscussSidebar input[placeholder='Quick search...']", "C", {
        replace: true,
    });
    await contains(".o-mail-DiscussSidebarChannel", { count: 20 });
});

test("sidebar: basic chat rendering", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Demo" });
    pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ partner_id: pyEnv.currentPartnerId }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "chat",
    });
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarChannel");
    await contains(".o-mail-DiscussSidebarChannel", { text: "Demo" });
    await contains(".o-mail-DiscussSidebarChannel img[data-alt='Thread Image']");
    await contains(
        ".o-mail-DiscussSidebarChannel .o-mail-DiscussSidebarChannel-commands div[title='Unpin Conversation']"
    );
    await contains(".o-mail-DiscussSidebarChannel .badge", { count: 0 });
});

test("sidebar: show pinned channel", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarChannel", { text: "General" });
});

test("sidebar: open pinned channel", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss();
    await click(".o-mail-DiscussSidebarChannel", { text: "General" });
    await contains(".o-mail-Composer-input[placeholder='Message #General…']");
    await contains(".o-mail-Discuss-threadName", { value: "General" });
});

test("sidebar: open channel and leave it", async (assert) => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        name: "General",
        channel_member_ids: [
            Command.create({
                fold_state: "open",
                partner_id: pyEnv.currentPartnerId,
            }),
        ],
    });
    await start({
        async mockRPC(route, args) {
            if (args.method === "action_unfollow") {
                assert.step("action_unfollow");
                assert.deepEqual(args.args[0], channelId);
            }
        },
    });
    await openDiscuss();
    await click(".o-mail-DiscussSidebarChannel", { text: "General" });
    await contains(".o-mail-Discuss-threadName", { value: "General" });
    assert.verifySteps([]);
    await click(".btn[title='Leave this channel']", {
        parent: [".o-mail-DiscussSidebarChannel.o-active", { text: "General" }],
    });
    await contains(".o-mail-DiscussSidebarChannel", { count: 0, text: "General" });
    await contains(".o-mail-Discuss-threadName", { value: "Inbox" });
    assert.verifySteps(["action_unfollow"]);
});

test("sidebar: unpin chat from bus", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Demo" });
    const channelId = pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ partner_id: pyEnv.currentPartnerId }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "chat",
    });
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarChannel", { text: "Demo" });

    await click(".o-mail-DiscussSidebarChannel", { text: "Demo" });
    await contains(".o-mail-Composer-input[placeholder='Message Demo…']");
    await contains(".o-mail-Discuss-threadName", { value: "Demo" });

    // Simulate receiving a unpin chat notification
    // (e.g. from user interaction from another device or browser tab)
    pyEnv["bus.bus"]._sendone(pyEnv.currentPartner, "discuss.channel/unpin", { id: channelId });
    await contains(".o-mail-DiscussSidebarChannel", { count: 0, text: "Demo" });

    await contains(".o-mail-Discuss-threadName", { count: 0, value: "Demo" });
});

test("chat - channel should count unread message [REQUIRE FOCUS]", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({
        name: "Demo",
        im_status: "offline",
    });
    const channelId = pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ message_unread_counter: 1, partner_id: pyEnv.currentPartnerId }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "chat",
    });
    pyEnv["mail.message"].create({
        author_id: partnerId,
        body: "<p>Test</p>",
        model: "discuss.channel",
        res_id: channelId,
    });
    await start();
    await openDiscuss();
    await contains(".o-discuss-badge", { text: "1" });
    await click(".o-mail-DiscussSidebarChannel", { text: "Demo" });
    await contains(".o-discuss-badge", { count: 0 });
});

test("mark channel as seen on last message visible [REQUIRE FOCUS]", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        name: "test",
        channel_member_ids: [
            Command.create({ message_unread_counter: 1, partner_id: pyEnv.currentPartnerId }),
        ],
    });
    pyEnv["mail.message"].create({
        body: "not empty",
        model: "discuss.channel",
        res_id: channelId,
    });
    await start();
    await openDiscuss();
    await click(".o-mail-DiscussSidebarChannel.o-unread", { text: "test" });
    await contains(".o-mail-DiscussSidebarChannel:not(.o-unread)", { text: "test" });
});

test("channel - counter: should not have a counter if the category is unfolded and without needaction messages", async () => {
    const pyEnv = await startServer();
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_channel_open: true,
    });
    pyEnv["discuss.channel"].create({ name: "general" });
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarCategory", {
        contains: [
            ["i.oi.oi-chevron-down"],
            ["span", { text: "Channels" }],
            [".badge", { count: 0 }],
        ],
    });
});

test("channel - counter: should not have a counter if the category is unfolded and with needaction messages", async () => {
    const pyEnv = await startServer();
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_channel_open: true,
    });
    const [channelId_1, channelId_2] = pyEnv["discuss.channel"].create([
        { name: "channel1" },
        { name: "channel2" },
    ]);
    const [messageId_1, messageId_2] = pyEnv["mail.message"].create([
        {
            body: "message 1",
            model: "discuss.channel",
            res_id: channelId_1,
        },
        {
            body: "message_2",
            model: "discuss.channel",
            res_id: channelId_2,
        },
    ]);
    pyEnv["mail.notification"].create([
        {
            mail_message_id: messageId_1,
            notification_type: "inbox",
            res_partner_id: pyEnv.currentPartnerId,
        },
        {
            mail_message_id: messageId_2,
            notification_type: "inbox",
            res_partner_id: pyEnv.currentPartnerId,
        },
    ]);
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarCategory", {
        contains: [
            ["i.oi.oi-chevron-down"],
            ["span", { text: "Channels" }],
            [".badge", { count: 0 }],
        ],
    });
});

test("channel - counter: should not have a counter if category is folded and without needaction messages", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({});
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_channel_open: false,
    });
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarCategory", {
        contains: [
            ["i.oi.oi-chevron-right"],
            ["span", { text: "Channels" }],
            [".badge", { count: 0 }],
        ],
    });
});

test("channel - counter: should have correct value of needaction threads if category is folded and with needaction messages", async () => {
    const pyEnv = await startServer();
    const [channelId_1, channelId_2] = pyEnv["discuss.channel"].create([
        { name: "Channel_1" },
        { name: "Channel_2" },
    ]);
    const [messageId_1, messageId_2] = pyEnv["mail.message"].create([
        {
            body: "message 1",
            model: "discuss.channel",
            res_id: channelId_1,
        },
        {
            body: "message_2",
            model: "discuss.channel",
            res_id: channelId_2,
        },
    ]);
    pyEnv["mail.notification"].create([
        {
            mail_message_id: messageId_1,
            notification_type: "inbox",
            res_partner_id: pyEnv.currentPartnerId,
        },
        {
            mail_message_id: messageId_2,
            notification_type: "inbox",
            res_partner_id: pyEnv.currentPartnerId,
        },
    ]);
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_channel_open: false,
    });
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarCategory", {
        contains: [
            ["i.oi.oi-chevron-right"],
            ["span", { text: "Channels" }],
            [".badge", { text: "2" }],
        ],
    });
});

test("chat - counter: should not have a counter if the category is unfolded and without unread messages", async () => {
    const pyEnv = await startServer();
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_chat_open: true,
    });
    pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ message_unread_counter: 0, partner_id: pyEnv.currentPartnerId }),
        ],
        channel_type: "chat",
    });
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarCategory", {
        contains: [
            ["i.oi.oi-chevron-down"],
            ["span", { text: "Direct messages" }],
            [".badge", { count: 0 }],
        ],
    });
});

test("chat - counter: should not have a counter if the category is unfolded and with unread messagens", async () => {
    const pyEnv = await startServer();
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_chat_open: true,
    });
    pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({
                message_unread_counter: 10,
                partner_id: pyEnv.currentPartnerId,
            }),
        ],
        channel_type: "chat",
    });
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarCategory", {
        contains: [
            ["i.oi.oi-chevron-down"],
            ["span", { text: "Direct messages" }],
            [".badge", { count: 0 }],
        ],
    });
});

test("chat - counter: should not have a counter if category is folded and without unread messages", async () => {
    const pyEnv = await startServer();
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_chat_open: false,
    });
    pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ message_unread_counter: 0, partner_id: pyEnv.currentPartnerId }),
        ],
        channel_type: "chat",
    });
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarCategory", {
        contains: [
            ["i.oi.oi-chevron-right"],
            ["span", { text: "Direct messages" }],
            [".badge", { count: 0 }],
        ],
    });
});

test("chat - counter: should have correct value of unread threads if category is folded and with unread messages", async () => {
    const pyEnv = await startServer();
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_chat_open: false,
    });
    pyEnv["discuss.channel"].create([
        {
            channel_member_ids: [
                Command.create({
                    message_unread_counter: 10,
                    partner_id: pyEnv.currentPartnerId,
                }),
            ],
            channel_type: "chat",
        },
        {
            channel_member_ids: [
                Command.create({
                    message_unread_counter: 20,
                    partner_id: pyEnv.currentPartnerId,
                }),
            ],
            channel_type: "chat",
        },
    ]);
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarCategory", {
        contains: [
            ["i.oi.oi-chevron-right"],
            ["span", { text: "Direct messages" }],
            [".badge", { text: "2" }],
        ],
    });
});

test("chat - command: should have add command when category is unfolded", async () => {
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarCategory", {
        contains: [
            ["i.oi.oi-chevron-down"],
            ["span", { text: "Direct messages" }],
            ["i[title='Start a conversation']"],
        ],
    });
});

test("chat - command: should not have add command when category is folded", async () => {
    const pyEnv = await startServer();
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_chat_open: false,
    });
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarCategory", { text: "Direct messages" });
    await contains(".o-mail-DiscussSidebarCategory", {
        contains: [
            ["i.oi.oi-chevron-right"],
            ["span", { text: "Direct messages" }],
            ["i[title='Start a conversation']", { count: 0 }],
        ],
    });
});

test("chat - states: close manually by clicking the title", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ channel_type: "chat" });
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_chat_open: true,
    });
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarChannel");
    await click(".o-mail-DiscussSidebarCategory .btn", { text: "Direct messages" });
    await contains(".o-mail-DiscussSidebarChannel", { count: 0 });
});

test("sidebar channels should be ordered case insensitive alphabetically", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create([
        { name: "Xyz" },
        { name: "abc" },
        { name: "Abc" },
        { name: "Est" },
        { name: "Xyz" },
        { name: "Équipe" },
        { name: "époque" },
    ]);
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarChannel", {
        text: "abc",
        before: [".o-mail-DiscussSidebarChannel", { text: "Abc" }],
    });
    await contains(".o-mail-DiscussSidebarChannel", {
        text: "Abc",
        before: [".o-mail-DiscussSidebarChannel", { text: "époque" }],
    });
    await contains(".o-mail-DiscussSidebarChannel", {
        text: "époque",
        before: [".o-mail-DiscussSidebarChannel", { text: "Équipe" }],
    });
    await contains(".o-mail-DiscussSidebarChannel", {
        text: "Équipe",
        before: [".o-mail-DiscussSidebarChannel", { text: "Est" }],
    });
    await contains(".o-mail-DiscussSidebarChannel", {
        text: "Est",
        before: [".o-mail-DiscussSidebarChannel", { text: "Xyz", count: 2 }],
    });
});

test("sidebar: public channel rendering", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({
        name: "channel1",
        channel_type: "channel",
        group_public_id: false,
    });
    await start();
    await openDiscuss();
    await contains("button", { text: "channel1", contains: [".fa-globe"] });
});

test("channel - avatar: should have correct avatar", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        name: "test",
        avatarCacheKey: "notaDateCache",
    });
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarChannel img");
    await contains(
        `img[data-src='${getOrigin()}/web/image/discuss.channel/${channelId}/avatar_128?unique=notaDateCache']`
    );
});

test("channel - avatar: should update avatar url from bus", async (assert) => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        avatarCacheKey: "notaDateCache",
        name: "test",
    });
    const { env } = await start();
    await openDiscuss(channelId);
    await contains(
        `img[data-src='${getOrigin()}/web/image/discuss.channel/${channelId}/avatar_128?unique=notaDateCache']`,
        { count: 2 }
    );
    await env.services.orm.call("discuss.channel", "write", [
        [channelId],
        { image_128: "This field does not matter" },
    ]);
    const result = pyEnv["discuss.channel"].searchRead([["id", "=", channelId]]);
    const newCacheKey = result[0]["avatarCacheKey"];
    await contains(
        `img[data-src='${getOrigin()}/web/image/discuss.channel/${channelId}/avatar_128?unique=${newCacheKey}']`,
        { count: 2 }
    );
});

test("channel - states: close should update the value on the server", async (assert) => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "test" });
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_channel_open: true,
    });
    const currentUserId = pyEnv.currentUserId;
    const { env } = await start();
    await openDiscuss();
    const initalSettings = await env.services.orm.call(
        "res.users.settings",
        "_find_or_create_for_user",
        [[currentUserId]]
    );
    assert.ok(initalSettings.is_discuss_sidebar_category_channel_open);
    await click(".o-mail-DiscussSidebarCategory .btn", { text: "Channels" });
    const newSettings = await env.services.orm.call(
        "res.users.settings",
        "_find_or_create_for_user",
        [[currentUserId]]
    );
    assert.notOk(newSettings.is_discuss_sidebar_category_channel_open);
});

test("channel - states: open should update the value on the server", async (assert) => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "test" });
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_channel_open: false,
    });
    const currentUserId = pyEnv.currentUserId;
    const { env } = await start();
    await openDiscuss();
    const initalSettings = await env.services.orm.call(
        "res.users.settings",
        "_find_or_create_for_user",
        [[currentUserId]]
    );
    assert.notOk(initalSettings.is_discuss_sidebar_category_channel_open);

    await click(".o-mail-DiscussSidebarCategory .btn", { text: "Channels" });
    const newSettings = await env.services.orm.call(
        "res.users.settings",
        "_find_or_create_for_user",
        [[currentUserId]]
    );
    assert.ok(newSettings.is_discuss_sidebar_category_channel_open);
});

test("channel - states: close from the bus", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "channel1" });
    const userSettingsId = pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_channel_open: true,
    });
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarCategory-channel .oi-chevron-down");
    await contains("button", { text: "channel1" });
    pyEnv["bus.bus"]._sendone(pyEnv.currentPartner, "res.users.settings", {
        id: userSettingsId,
        is_discuss_sidebar_category_channel_open: false,
    });
    await contains(".o-mail-DiscussSidebarCategory-channel .oi-chevron-right");
    await contains("button", { count: 0, text: "channel1" });
});

test("channel - states: open from the bus", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "channel1" });
    const userSettingsId = pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_channel_open: false,
    });
    await start({
        async mockRPC(route, args, originalRpc) {
            if (route === "/mail/action" && args.init_messaging) {
                const res = await originalRpc(...arguments);
                step(`/mail/action - ${JSON.stringify(args)}`);
                return res;
            }
        },
    });
    await assertSteps([
        `/mail/action - ${JSON.stringify({
            init_messaging: {},
            failures: true,
            systray_get_activities: true,
            context: { lang: "en", tz: "taht", uid: pyEnv.currentUserId },
        })}`,
    ]);
    // send after init_messaging because bus subscription is done after init_messaging
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarCategory-channel .oi-chevron-right");
    pyEnv["bus.bus"]._sendone(pyEnv.currentPartner, "res.users.settings", {
        id: userSettingsId,
        is_discuss_sidebar_category_channel_open: true,
    });
    await contains(".o-mail-DiscussSidebarCategory-channel .oi-chevron-down");
    await contains("button", { text: "channel1" });
});

test("channel - states: the active category item should be visible even if the category is closed", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "channel1" });
    await start();
    await openDiscuss();
    await click(".o-mail-DiscussSidebarChannel", { text: "channel1" });
    await contains("button.o-active", { text: "channel1" });

    await click(".o-mail-DiscussSidebarCategory .btn", { text: "Channels" });
    await contains(".o-mail-DiscussSidebarCategory-channel .oi-chevron-right");
    await contains("button", { text: "channel1" });

    await click("button", { text: "Inbox" });
    await contains("button", { count: 0, text: "channel1" });
});

test("chat - states: open manually by clicking the title", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({
        channel_type: "chat",
    });
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_chat_open: false,
    });
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarCategory-chat .oi-chevron-right");
    await contains(".o-mail-DiscussSidebar button", { count: 0, text: "Mitchell Admin" });
    await click(".o-mail-DiscussSidebarCategory-chat .btn", { text: "Direct messages" });
    await contains(".o-mail-DiscussSidebarCategory-chat .oi-chevron-down");
    await contains(".o-mail-DiscussSidebar button", { text: "Mitchell Admin" });
});

test("chat - states: close should call update server data", async (assert) => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "test" });
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_chat_open: true,
    });
    const currentUserId = pyEnv.currentUserId;
    const { env } = await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarCategory-chat .oi-chevron-down");
    const initalSettings = await env.services.orm.call(
        "res.users.settings",
        "_find_or_create_for_user",
        [[currentUserId]]
    );
    assert.ok(initalSettings.is_discuss_sidebar_category_chat_open);

    await click(".o-mail-DiscussSidebarCategory-chat .btn", { text: "Direct messages" });
    await contains(".o-mail-DiscussSidebarCategory-chat .oi-chevron-right");
    const newSettings = await env.services.orm.call(
        "res.users.settings",
        "_find_or_create_for_user",
        [[currentUserId]]
    );
    assert.notOk(newSettings.is_discuss_sidebar_category_chat_open);
});

test("chat - states: open should call update server data", async (assert) => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "test" });
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_chat_open: false,
    });
    const { env } = await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarCategory-chat .oi-chevron-right");
    const currentUserId = pyEnv.currentUserId;
    const initalSettings = await env.services.orm.call(
        "res.users.settings",
        "_find_or_create_for_user",
        [[currentUserId]]
    );
    assert.notOk(initalSettings.is_discuss_sidebar_category_chat_open);

    await click(".o-mail-DiscussSidebarCategory-chat .btn", { text: "Direct messages" });
    await contains(".o-mail-DiscussSidebarCategory-chat .oi-chevron-down");
    const newSettings = await env.services.orm.call(
        "res.users.settings",
        "_find_or_create_for_user",
        [[currentUserId]]
    );
    assert.ok(newSettings.is_discuss_sidebar_category_chat_open);
});

test("chat - states: close from the bus", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ channel_type: "chat" });
    const userSettingsId = pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_chat_open: true,
    });
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarCategory-chat .oi-chevron-down");
    await contains(".o-mail-DiscussSidebar button", { text: "Mitchell Admin" });
    pyEnv["bus.bus"]._sendone(pyEnv.currentPartner, "res.users.settings", {
        id: userSettingsId,
        is_discuss_sidebar_category_chat_open: false,
    });
    await contains(".o-mail-DiscussSidebarCategory-chat .oi-chevron-right");
    await contains(".o-mail-DiscussSidebar button", { count: 0, text: "Mitchell Admin" });
});

test("chat - states: open from the bus", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ channel_type: "chat" });
    const userSettingsId = pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_chat_open: false,
    });
    await start({
        async mockRPC(route, args, originalRpc) {
            if (route === "/mail/action" && args.init_messaging) {
                const res = await originalRpc(...arguments);
                step(`/mail/action - ${JSON.stringify(args)}`);
                return res;
            }
        },
    });
    await assertSteps([
        `/mail/action - ${JSON.stringify({
            init_messaging: {},
            failures: true,
            systray_get_activities: true,
            context: { lang: "en", tz: "taht", uid: pyEnv.currentUserId },
        })}`,
    ]);
    // send after init_messaging because bus subscription is done after init_messaging
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarCategory-chat .oi-chevron-right");
    await contains(".o-mail-DiscussSidebar button", { count: 0, text: "Mitchell Admin" });
    pyEnv["bus.bus"]._sendone(pyEnv.currentPartner, "res.users.settings", {
        id: userSettingsId,
        is_discuss_sidebar_category_chat_open: true,
    });
    await contains(".o-mail-DiscussSidebarCategory-chat .oi-chevron-down");
    await contains(".o-mail-DiscussSidebar button", { text: "Mitchell Admin" });
});

test("chat - states: the active category item should be visible even if the category is closed", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ channel_type: "chat" });
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarCategory-chat .oi-chevron-down");
    await contains(".o-mail-DiscussSidebar button", { text: "Mitchell Admin" });

    await click(".o-mail-DiscussSidebar button", { text: "Mitchell Admin" });
    await contains("button.o-active", { text: "Mitchell Admin" });

    await click(".o-mail-DiscussSidebarCategory-chat .btn", { text: "Direct messages" });
    await contains(".o-mail-DiscussSidebarCategory-chat .oi-chevron-right");
    await contains(".o-mail-DiscussSidebar button", { text: "Mitchell Admin" });

    await click("button", { text: "Inbox" });
    await contains(".o-mail-DiscussSidebarCategory-chat .oi-chevron-right");
    await contains(".o-mail-DiscussSidebar button", { count: 0, text: "Mitchell Admin" });
});

test("chat - avatar: should have correct avatar", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({
        name: "Demo",
        im_status: "offline",
    });
    const partner = pyEnv["res.partner"].searchRead([["id", "=", partnerId]])[0];
    pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ partner_id: pyEnv.currentPartnerId }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "chat",
    });
    await start();
    await openDiscuss();

    await contains(".o-mail-DiscussSidebarChannel img");
    await contains(
        `img[data-src='${getOrigin()}/web/image/res.partner/${partnerId}/avatar_128?unique=${
            deserializeDateTime(partner.write_date).ts
        }']`
    );
});

test("chat should be sorted by last activity time [REQUIRE FOCUS]", async () => {
    const pyEnv = await startServer();
    const [demo_id, yoshi_id] = pyEnv["res.partner"].create([{ name: "Demo" }, { name: "Yoshi" }]);
    pyEnv["res.users"].create([{ partner_id: demo_id }, { partner_id: yoshi_id }]);
    pyEnv["discuss.channel"].create([
        {
            channel_member_ids: [
                Command.create({
                    last_interest_dt: "2021-01-01 10:00:00",
                    partner_id: pyEnv.currentPartnerId,
                }),
                Command.create({ partner_id: demo_id }),
            ],
            channel_type: "chat",
        },
        {
            channel_member_ids: [
                Command.create({
                    last_interest_dt: "2021-02-01 10:00:00",
                    partner_id: pyEnv.currentPartnerId,
                }),
                Command.create({ partner_id: yoshi_id }),
            ],
            channel_type: "chat",
        },
    ]);
    await start();
    await openDiscuss();
    await contains(
        ".o-mail-DiscussSidebarChannel",
        { text: "Yoshi" },
        { before: [".o-mail-DiscussSidebarChannel", { text: "Demo" }] }
    );
    await click(".o-mail-DiscussSidebarChannel", { text: "Demo" });
    // post a new message on the last channel
    await insertText(".o-mail-Composer-input[placeholder='Message Demo…']", "Blabla");
    await click(".o-mail-Composer-send:enabled");
    await contains(
        ".o-mail-DiscussSidebarChannel",
        { text: "Demo" },
        { before: [".o-mail-DiscussSidebarChannel", { text: "Yoshi" }] }
    );
});

test("Can unpin chat channel", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ channel_type: "chat" });
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarChannel", { text: "Mitchell Admin" });
    await click(".o-mail-DiscussSidebarChannel [title='Unpin Conversation']");
    await contains(".o-mail-DiscussSidebarChannel", { count: 0, text: "Mitchell Admin" });
});

test("Unpinning chat should display notification", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ channel_type: "chat" });
    await start();
    await openDiscuss();
    await click(".o-mail-DiscussSidebarChannel [title='Unpin Conversation']");
    await contains(".o-mail-DiscussSidebarChannel", { count: 0 });
    await contains(".o_notification:has(.o_notification_bar.bg-info)", {
        text: "You unpinned your conversation with Mitchell Admin",
    });
});

test("Can leave channel", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(channelId);
    await contains(".o-mail-DiscussSidebarChannel", { text: "General" });
    await click("[title='Leave this channel']");
    await contains(".o-mail-DiscussSidebarChannel", { count: 0, text: "General" });
});

test("Do no channel_info after unpin", async (assert) => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General", channel_type: "chat" });
    await start({
        mockRPC(route, args, originalRPC) {
            if (route === "/discuss/channel/info") {
                assert.step("channel_info");
            }
            return originalRPC(route, args);
        },
    });
    await openDiscuss(channelId);
    await click(".o-mail-DiscussSidebarChannel-commands [title='Unpin Conversation']");
    rpc("/mail/message/post", {
        thread_id: channelId,
        thread_model: "discuss.channel",
        post_data: {
            body: "Hello world",
            message_type: "comment",
        },
    });
    // weak test, no guarantee that we waited long enough for the potential rpc to be done
    assert.verifySteps([]);
});

test("Group unread counter up to date after mention is marked as seen", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Chuck" });
    const channelId = pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ partner_id: pyEnv.currentPartnerId }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "group",
    });
    const messageId = pyEnv["mail.message"].create({
        author_id: partnerId,
        model: "discuss.channel",
        res_id: channelId,
        body: "@Mitchell Admin",
        needaction: true,
    });
    pyEnv["mail.notification"].create([
        {
            mail_message_id: messageId,
            notification_type: "inbox",
            res_partner_id: pyEnv.currentPartnerId,
        },
    ]);
    await start();
    await openDiscuss();
    await contains(".o-mail-DiscussSidebarChannel .o-discuss-badge");
    click(".o-mail-DiscussSidebarChannel");
    await contains(".o-discuss-badge", { count: 0 });
});

test("Unpinning channel closes its chat window", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "Sales" });
    await start();
    await openFormView("discuss.channel");
    await click(".o_menu_systray i[aria-label='Messages']");
    await click(".o-mail-NotificationItem");
    await contains(".o-mail-ChatWindow", { text: "Sales" });
    await openDiscuss();
    await click("[title='Leave this channel']", {
        parent: [".o-mail-DiscussSidebarChannel", { text: "Sales" }],
    });
    await openFormView("discuss.channel");
    await contains(".o-mail-ChatWindow", { count: 0, text: "Sales" });
});

test("Update channel data via bus notification", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        name: "Sales",
        channel_member_ids: [Command.create({ partner_id: pyEnv.currentPartnerId })],
        channel_type: "channel",
        create_uid: pyEnv.currentUserId,
    });
    const tab1 = await start({ asTab: true });
    const tab2 = await start({ asTab: true });
    tab1.openDiscuss(channelId);
    tab2.openDiscuss(channelId);
    await contains(".o-mail-DiscussSidebarChannel", { text: "Sales", target: tab1.target });
    await insertText(".o-mail-Discuss-threadName", "test", { target: tab1.target });
    await triggerHotkey("Enter");
    await contains(".o-mail-DiscussSidebarChannel", { text: "Salestest", target: tab2.target });
});
