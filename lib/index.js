'use strict';

module.exports = core;

const path = require('path');
const pkg = require('../package.json');
const semver = require('semver');
const colors = require('colors/safe')
const userHome = require('user-home');
const rootCheck = require('root-check');
const dotenv = require('dotenv');
const pathExists = require('path-exists').sync;

const log = require('./log');
const exec = require('./exec');
const { getNpmLatestVersion } = require('./getNpmInfo');
const constant = require('./const');


const commander = require('commander');

const program = new commander.Command();

function registerCommand() {
  // 没有输入命令时,打印帮助文档
  console.log(colors.green('⏰: process.argv...', process.argv));
  if(process.argv.length < 3) {
    console.log(colors.red('⏰: 命令后面需要输入参数...'));
    // program.outputHelp();
  } 
  console.log('registerCommand: ', 'start');
  // console.log('pkg: ', pkg);
  console.log(colors.green('program help info init'));
  program
    .name(`${Object.keys(pkg?.bin)[0]}----min`)
    .usage('<command> [options]')
    .version(pkg.version)
    .option('-d, --debug', '是否开启调试模式', false)
    .option('-tp, --targetPath <targetPath>', '是否指定本地调试文件路径', '')

  console.log(colors.green('program debug 模式监听 事件注册'));
  program.on('option:debug', function() {
    console.log(colors.red('⏰: ..debug..', 1));
    log.verbose(program.rawArgs, 'option:debug');
    if (program.opts().debug) {
      process.env.LOG_LEVEL = 'verbose';
      if(program.rawArgs?.length < 4) {
        program.outputHelp();
      }
    } else {
      process.env.LOG_LEVEL = 'info';
    }
    log.level = process.env.LOG_LEVEL;
    console.log('debug mode');
  });
 
  console.log(colors.green('program targetPath 属性监听 事件注册'));
  program.on('option:targetPath', function () {
    console.log(colors.green('监听--targetPath: ', program.opts().targetPath));
    process.env.CLI_TARGET_PATH = program.opts().targetPath;
  });
 
  // 对未知命令监听
  console.log(colors.green('program 对未知命令监听 事件注册'));
  program.on('command:*', function(obj) {
    const avaiableCommands = program.commands.map(cmd => cmd.name());
    console.log(colors.red('未知的命令：' + obj[0]));
    if(avaiableCommands.length) {
      console.log(colors.red('可用命令：' + avaiableCommands.join(',')));
    }
  });

  console.log('program init 命令注册init');
  program 
    .command('init [projectName]')
    .option('-f, --force', '是否 强制初始化项目', false)
    .action(exec)
  // .action((projectName, cmdObj) => {
  //   log.verbose('init', projectName, cmdObj);
  // })
  // program.parse(process.argv) 表示对传入 Node.js 的命令行参数进行解析。
  // 其中 process.argv 是 Node.js 进程接受到的原始的参数。
  console.log('registerCommand: ', 'end');
  program.parse(process.argv);
}

async function core() {
  try {
    await prepare();
    registerCommand();
  } catch (e) {
    log.verbose('core/cli/lib/index.js 捕获的异常');
    log.error(e);
  } 
  log.verbose('core end...! ');
}


async function prepare() {
  console.log('准备阶段-----------start ~ ');
  //1、 检查版本号
  checkPkgVersion();
  //2、 检查root启动,并进行用户权限降级
  checkRoot();
  //3、 检查用户主目录
  checkUserHome();
  //4、 检查环境变量
  checkEnv();
  //5、 检查是否为最新版本, 进行全局更新
  await checkGlobalUpdate();
  console.log('准备阶段-----------end ~ ');
}

// 1、检查版本号
function checkPkgVersion() {
  console.log(`1、检查${pkg.name}版本号`, pkg.version);
}
// 2、检查是否root启动,如果是则进行用户权限降级
function checkRoot() {
  console.log(`2、检查是否root启动,如果是则进行用户权限降级`);
  console.log('当前登陆用户UID?', process.geteuid())
  rootCheck(); // root 降级
  console.log('root 降级后用户UID?', process.geteuid())
}
// 3、3、检查用户主目录, 为初始化项目做准备
function checkUserHome() {
  console.log('3、检查用户主目录, 为初始化项目做准备 ')
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red('当前登陆用户主目录不存在！'))
  }
}
// 4、检查环境变量
function checkEnv() {
  console.log('4、检查环境变量');
  const dotenvPath = path.resolve(userHome, '.env');
  console.log('环境配置文件dotenvPath: ', dotenvPath);
  if (pathExists(dotenvPath)) {
    dotenv.config({ path: dotenvPath });
  }
  // 生成环境配置
  createDefaultConfig();
}
// 生成环境配置
function createDefaultConfig() {
  console.log('生成环境配置: ');
  const cliConfig = {
    home: userHome,
  }
  if (process.env.STAR_CLI_HOME) {
    cliConfig['cliHome'] = path.join(userHome, process.env.STAR_CLI_HOME);
    console.log('通过配置文件拿到环境路径: ', cliConfig['cliHome']);
  } else {
    cliConfig['cliHome'] = path.join(userHome, constant.DEFAULT_CLI_HOME);
    console.log('使用默认环境路径: ', cliConfig['cliHome'] );
  }
  // 赋值给环境变量
  process.env.CLI_HOME_PATH = cliConfig.cliHome;
  return cliConfig;
}
// 5、检查是否为最新版本, 如果否则进行全局更新
async function checkGlobalUpdate() {
  console.log('5、检查是否为最新版本, 如果否则提醒用户是否进行全局更新');
  //1. 获取当前版本和模块
  const currentVersion = pkg.version;
  const npmName = pkg.name;
  // const testNpmName = '@snowlepoard520/core'
  // 获取最新的版本号，提示用户更新到该版本
  console.log(`通过npm接口api获取${npmName}最新的版本号...  `);
  const lastVersion = await getNpmLatestVersion(npmName);
  console.log('npm最新的版本号: ', lastVersion);
  console.log('当前版本号: ', currentVersion);
  if (lastVersion && semver.gt(lastVersion, currentVersion)) {
    log.warn(colors.yellow(`请手动更新${npmName}, 当前版本：${currentVersion} ， 最新版本： ${lastVersion}
    更新命令： npm install -g ${npmName}
    `));
  } else {
    log.verbose('当前版本不需要更新', );
  }
}
