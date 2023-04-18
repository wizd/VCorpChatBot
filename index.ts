import { WechatyBuilder } from "wechaty";
import { bindListeners } from "./src/listeners";
import { PuppetPadlocal } from "wechaty-puppet-padlocal";

const token = "puppet_padlocal_1d71f93437fd431cb6dd5df92e5c3dcc";
const puppet = new PuppetPadlocal({
  token,
});

const bot = WechatyBuilder.build({
  name: "chaty-wechat-bot",
  puppet,
});

bindListeners(bot).start();
