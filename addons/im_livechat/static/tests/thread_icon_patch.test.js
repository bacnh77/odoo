const test = QUnit.test; // QUnit.test()

import { rpc } from "@web/core/network/rpc";

import { startServer } from "@bus/../tests/helpers/mock_python_environment";

import { Command } from "@mail/../tests/helpers/command";
import { openDiscuss, start } from "@mail/../tests/helpers/test_utils";

import { contains } from "@web/../tests/utils";

QUnit.module("thread icon (patch)");

test("Public website visitor is typing", async () => {
    const pyEnv = await startServer();
    const guestId = pyEnv["mail.guest"].create({ name: "Visitor 20" });
    const channelId = pyEnv["discuss.channel"].create({
        anonymous_name: "Visitor 20",
        channel_member_ids: [
            Command.create({ partner_id: pyEnv.currentPartnerId }),
            Command.create({ guest_id: guestId }),
        ],
        channel_type: "livechat",
        livechat_operator_id: pyEnv.currentPartnerId,
    });
    await start();
    await openDiscuss(channelId);
    await contains(".o-mail-ThreadIcon .fa.fa-comments");
    const channel = pyEnv["discuss.channel"].searchRead([["id", "=", channelId]])[0];
    // simulate receive typing notification from livechat visitor "is typing"
    pyEnv.withGuest(guestId, () =>
        rpc("/im_livechat/notify_typing", {
            is_typing: true,
            channel_id: channel.id,
        })
    );
    await contains(".o-mail-Discuss-header .o-discuss-Typing-icon");
    await contains(
        ".o-mail-Discuss-header .o-discuss-Typing-icon[title='Visitor 20 is typing...']"
    );
});
