import { WechatyBuilder } from 'wechaty';
import { bindListeners } from './src/listeners';
import { PuppetPadlocal } from 'wechaty-puppet-padlocal';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.PAD_LOCAL_KEY;
const puppet = new PuppetPadlocal({
  token,
});

const bot = WechatyBuilder.build({
  name: 'chaty-wechat-bot',
  puppet,
});

bindListeners(bot).start();
