'use strict';
const path = require('path');
const Spinner = require('cli-spinner').Spinner;
const request = require('./request');
const log = require('./log');
const colors = require('colors/safe')
const { templateList } = require('./mock');

// 判断是否为 object对象 
function isObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]';
}

function exec (command, args, options) {
  //兼容windows系统
  const win32 = process.platform === 'win32';
  const cmd = win32 ? 'cmd': command;
  const cmdArgs = win32 ? ['/c'].concat(command, args) : args;
  return require('child_process').spawn(cmd, cmdArgs, options || {});
}

function spinnerStart(msg, spinnerString = '|/-\\') {
  const spinner = new Spinner(msg + ' %s');
  spinner.setSpinnerString(spinnerString);
  spinner.start();
  return spinner;
}

function sleep(timeout = 2000) {
  return new Promise(resolve => setTimeout(resolve, timeout));
}

function execAsync(command, args, options) {
  return new Promise((resolve, reject) => {
    const p = exec(command, args, options);
    p.on('error', e => {
      reject(e);
    });
    p.on('exit', c => {
      resolve(c);
    });
  });
}

function formatPath(p) {
  if(p && typeof p === 'string') {
    const sep = path.sep;
    // mac返回的是/ window返回的是 \
    // console.log(sep, 'sep');
    if (sep === '/') {
      return p;
    } else {
      return p.replace(/\\/g, '/');
    }
  }
}

async function getTemplate () {
  let result = [];
  try {
    result = await request({
      url: '/snow/template'
    });
    log.verbose('/snow/template ------  result: ', result);
  } catch (error) {
    log.verbose(colors.brightYellow('⏰: 请求http://mac.minn.snowlepoard:7001/ api接口获取模版列表失败~'));
    log.verbose(colors.brightWhite('提示: 正在启用兜底mock数据'));
    // log.warnner(colors.brightRed('启用兜底mock数据'));
    // log.warnner(colors.brightBlue('请求http://mac.minn.snowlepoard:7001/本地api接口失败'));
    // log.warnner(colors.brightCyan('请求http://mac.minn.snowlepoard:7001/本地api接口失败'));
    // log.warnner(colors.brightMagenta('重要提醒: 启用兜底mock数据'));
    // log.warnner(colors.brightGreen('重要提醒: 启用兜底mock数据'));
    // log.verbose(colors.brightBlue('mock模版列表templateList: ', templateList));
    result = [...templateList];
  } 
  return result;
}

module.exports = {
  isObject,
  spinnerStart,
  execAsync,
  sleep,
  exec,
  formatPath,
  getTemplate,
};