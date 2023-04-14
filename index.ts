import { WechatyBuilder } from "wechaty";
import { bindListeners } from "./src/listeners";

const dotnev = require("dotenv");
dotnev.config();

const bot = WechatyBuilder.build({
  name: "chaty-wechat-bot",
});

bindListeners(bot).start();
