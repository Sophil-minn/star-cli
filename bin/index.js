#! /usr/bin/env node
const path = require('path');
const fs = require('fs')

async function installDep() {
  return new Promise((resolve, reject) => {
    const child = require('child_process').exec('npm i', {
      cwd: path.resolve(path.resolve(__dirname, '../node_modules/'), '..'),
      stdio: 'inherit'
    });
    child.on('error', e => {
      reject(e);
    });
    child.on('exit', c => {
      console.log('依赖安装完毕');
      resolve(c);
    });
  })
}
async function installNpminit() {
  console.log('npm init ...');
  return new Promise((resolve, reject) => {
    
    const child = require('child_process').exec('npm init -y', {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    child.on('error', e => {
      reject(e);
    });
    child.on('exit', c => {
      console.log('npm init完毕');
      resolve(c);
    });
  })
}

async function checkDependencies() {
  if (!fs.existsSync(path.resolve(__dirname, '../node_modules/'))) {
    console.log('监测到依赖不存在~');
    console.log('正在安装依赖... 请稍等');
    await installDep();
  }
  console.log(process.cwd(), 888);
  if (!fs.existsSync(path.resolve(process.cwd(), '../package.json/'))) {
    console.log('监测到当前目录不存在package.json~');
    console.log('正在npm init... 请稍等');
    await installNpminit();
  }
  const colors = require('colors/safe')
  const log = require('../lib/log');
  // const importLocal = require('import-local');
  // console.log('time: ', new Date().getDate());
  log.snow(colors.bgBlack(colors.brightBlue('welcome to star-cli  -  snow lepoard Just to Run!')));
  log.snow(colors.brightGreen('contact me on github@Sophil-minn'));
  log.snow(colors.brightRed('A single spark can start a prairie fire !'));
  // if (importLocal(__filename)) {
  //   log.snow(colors.bgBlack(colors.brightGreen('you are using snow-cli local version +++++++++++++')))
  // } else {
  //   // console.log(77777)
  //   log.snow(colors.bgBlack(colors.green('now using snow-cli development version ----------- ')))
  //   require('../lib')(process.argv.slice(2));
  // }
  console.log('today is:', (new Date() + '').slice(0, 10))
  console.log('正在初始化数据...')

  require('../lib')(process.argv.slice(2));
}


// console.log(path.resolve(__dirname, '../node_modules/'), 111111);
checkDependencies();