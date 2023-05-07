import { WechatyBuilder } from 'wechaty';
import { bindListeners } from './src/listeners.js';
import { PuppetPadlocal } from 'wechaty-puppet-padlocal';
import dotenv from 'dotenv';
import { connectHumine } from './src/socksClient.js';

dotenv.config();

// first connect to humine engine
const socket = await connectHumine();

const token = process.env.PAD_LOCAL_KEY;
const puppet = new PuppetPadlocal({
  token,
});

const bot = WechatyBuilder.build({
  name: 'chaty-wechat-bot',
  puppet,
});

bindListeners(bot).start();
