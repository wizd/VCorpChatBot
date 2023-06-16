import { WechatyBuilder } from 'wechaty';
import { bindListeners, startVcorp } from './src/listeners.js';
import { PuppetPadlocal } from 'wechaty-puppet-padlocal';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import dotenv from 'dotenv';

dotenv.config();

interface CommandLineArgs {
  NAME: string;
  MODE?: string;
  PAD_LOCAL_KEY?: string;
  VCORP_AI_KEY?: string;
  VCORP_AI_URL?: string;
}

// 解析命令行参数
const argv = yargs(hideBin(process.argv)).argv as Partial<CommandLineArgs>;

// 使用命令行参数覆盖 .env 配置
export const NAME = argv.NAME || process.env.NAME;
export const MODE = argv.MODE || process.env.MODE;
const PAD_LOCAL_KEY = argv.PAD_LOCAL_KEY || process.env.PAD_LOCAL_KEY;
export const VCORP_AI_KEY = argv.VCORP_AI_KEY || process.env.VCORP_AI_KEY;
export const VCORP_AI_URL = argv.VCORP_AI_URL || process.env.VCORP_AI_URL;

setWindowTitle(NAME!);

if (MODE === 'powerbot') {
  console.log("Using padlocal.");
  const puppet = new PuppetPadlocal({
    token: PAD_LOCAL_KEY,
  });

  const bot = WechatyBuilder.build({
    name: 'chaty-wechat-bot',
    puppet,
  });

  startVcorp();

  await bindListeners(bot).start();  
}
else {
  console.log(NAME + " started using default settings.");

  const bot = WechatyBuilder.build();

  startVcorp();
  
  await bindListeners(bot).start();
}


function setWindowTitle(title: string) {
  if (process.platform === 'win32') {
    process.stdout.write('\x1B]0;' + title + '\x07');
  } else {
    process.stdout.write('\x1B]2;' + title + '\x1B\\');
  }
}

