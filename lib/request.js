'use strict';
const axios = require('axios');
const log = require('./log');
const BASE_URL = process.env.SNOW_CLI_BASE_URL ? process.env.SNOW_CLI_BASE_URL : 'http://mac.minn.snowlepoard.error:7001';

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 5000
});

request.interceptors.response.use(
  response => {
    console.log('response: ', response);
    return response.data;
  },
  error => {
    log.verbose('request.interceptors.response. error--- ');
    return Promise.reject();
  }
);

module.exports = request;