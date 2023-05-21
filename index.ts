import { WechatyBuilder } from 'wechaty';
import { bindListeners } from './src/listeners.js';
import { PuppetPadlocal } from 'wechaty-puppet-padlocal';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.PAD_LOCAL_KEY;
if(token){
  console.log("Using padlocal.");
  const puppet = new PuppetPadlocal({
    token,
  });

  const bot = WechatyBuilder.build({
    name: 'chaty-wechat-bot',
    puppet,
  });

  bindListeners(bot).start();
}
else{
  console.log("Using default settings.");
  const bot = WechatyBuilder.build();

  bindListeners(bot).start();
}