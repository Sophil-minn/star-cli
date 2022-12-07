'use strict';

const axios = require('axios');
const urlJoin = require('url-join');
const semver = require('semver');
const log = require('./log');

// const { getCoreData, versions } = require('./mockData');
// console.log('getCoreData: ', getCoreData);

function getNpmInfo(npmName, registry) {
  log.verbose('registry: ', registry);
  log.verbose('npmName: ', npmName);
  if (!npmName) {
    return null;
  }
  const registryUrl = registry || getDefaultRegistry();
  const npmInfoUrl = urlJoin(registryUrl, npmName);
  // console.log('请求 npmInfoUrl: ', npmInfoUrl);
  // return new Promise(resolve => resolve(getCoreData));
  return axios.get(npmInfoUrl).then(response => {
    log.verbose('npmInfoUrl', npmInfoUrl);
    log.verbose(`请求${npmName}数据信息成功`);
    if(response.status === 200) {
      // console.log(response, 'response');
      return response.data;
    }
    return null;
  }).catch(
    err => {
      console.log('npmInfoUrl', npmInfoUrl);
      console.log(`请求${npmName}数据失败`);
      // console.log('err: ', err);
      return Promise.reject(err);
    }
  );
}

function getDefaultRegistry(isOriginal = false) {
  return isOriginal ? 'https://registry.npmjs.org/': 'https://registry.npmmirror.com/'
}

async function getNpmVersions(npmName, registry){
  const data = await getNpmInfo(npmName);
  if (data) {
    return Object.keys(data.versions);
  } else {
    return [];
  }
}
// 获取大于baseVersion当前版本号所有版本
function getSemverVersions(baseVersion, versions) {
  versions = versions
  .filter(version => {
    return semver.satisfies(version, `^${baseVersion}`);
  })
  .sort((a, b) => {
    return semver.gt(b, a) ? 0 : -1;
  });
  return versions;
}
// 提取所有版本号，比对那些版本号是大于baseVersion当前版本号
async function getNpmSemverVersions(baseVersion, npmName, registry) {
  const versions = await getNpmVersions(npmName, registry);
  log.verbose(versions, 'versions');
  const semverVersions = getSemverVersions(baseVersion, versions);
  return semverVersions;
 }

async function getNpmLatestVersion(npmName, registry) {
  let versions = await getNpmVersions(npmName, registry);
  log.verbose('getNpmLatestVersion ---------  versions: ', versions);
  if (versions) {
    return versions.sort(
      (a, b) => {
        // console.log(semver.gt(b, a), 'semver.gt(b, a)');
        return semver.gt(b, a) ? 0 : -1;
      }
    )[0];
  }
  return null;
}


module.exports = { 
  getNpmInfo,
  getNpmSemverVersions,
  getNpmVersions,
  getDefaultRegistry,
  getNpmLatestVersion
};