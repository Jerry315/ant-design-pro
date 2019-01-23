import { notification } from 'antd';
import router from 'umi/router';
import hash from 'hash.js';
import cookie from 'react-cookies';


import { isAntdPro } from './utils';
import * as AppInfo from '@/common/config/AppInfo';
import ax from './axiosWrap';

const codeMessage = {
  200: '服务器成功返回请求的数据。',
  201: '新建或修改数据成功。',
  202: '一个请求已经进入后台排队（异步任务）。',
  204: '删除数据成功。',
  400: '发出的请求有错误，服务器没有进行新建或修改数据的操作。',
  401: '用户权限不足。',
  403: '禁止访问。',
  404: '发出的请求针对的是不存在的记录，服务器没有进行操作。',
  406: '请求的格式不可得。',
  410: '请求的资源被永久删除，且不会再得到的。',
  422: '当创建一个对象时，发生一个验证错误。',
  500: '服务器发生错误，请检查服务器。',
  502: '网关错误。',
  503: '服务不可用，服务器暂时过载或维护。',
  504: '网关超时。',
};
const checkStatus = response => {
  if (response.status && response.status >= 200 && response.status < 300) {
    return response;
  }

  const errortext = codeMessage[response.status] || response.statusText;
  notification.error({
    message: `请求错误 ${response.status}: ${response.url}`,
    description: errortext,
  });
  const error = new Error(errortext);
  error.name = response.status;
  error.response = response.status;
  error.response = response;
  throw error;
};

const cachedSave = (response, hashcode) => {
  /**
   * Clone a response data and store it in sessionStorage
   * Does not support data other than json, Cache only json
   */
  const contentType = response.headers['content-type'] || response.headers.get('Content-Type');
  if (contentType && contentType.match(/application\/json/i)) {
    // All data is saved as text
    sessionStorage.setItem(hashcode, response.data);
    sessionStorage.setItem(`${hashcode}:timestamp`, Date.now());
  }
  return response;
};

/**
 * Requests a URL, returning a promise.
 *
 * @param  {string} url       The URL we want to request
 * @param  {object} [option] The options we want to pass to "fetch"
 * @return {object}           An object containing either "data" or "err"
 */
export default function request(url, option) {
  const options = {
    expirys: isAntdPro(),
    ...option,
  };
  /**
   * Produce fingerprints based on url and parameters
   * Maybe url has the same parameters
   */
  const fingerprint = url + (options.body ? JSON.stringify(options.body) : '');
  const hashcode = hash
    .sha256()
    .update(fingerprint)
    .digest('hex');

  const defaultOptions = {
    credentials: 'include',
    headers: {
      Authorization: (cookie.load('eva_token') ? 'Bearer'+cookie.load('eva_token') : ''),
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json',
    }
  };
  const newOptions = { ...defaultOptions, ...options };
  if (
    newOptions.method === 'POST' ||
    newOptions.method === 'PUT' ||
    newOptions.method === 'DELETE'
  ) {
    if (!(newOptions.body instanceof FormData)) {
      newOptions.headers = {
        ...newOptions.headers,
        'Content-Type': 'application/json; charset=utf-8',
      };
      newOptions.data = JSON.stringify(newOptions.body);
    } else {
      // newOptions.body is FormData
      newOptions.headers = {
        ...newOptions.headers,
      };
    }
  }
  const config = {
    url: AppInfo.url + AppInfo.request_prefix + url,
    ...newOptions,
  };

  const expirys = options.expirys && 60;
  // options.expirys !== false, return the cache,
  if (options.expirys !== false) {
    const cached = sessionStorage.getItem(hashcode);
    const whenCached = sessionStorage.getItem(`${hashcode}:timestamp`);
    if (cached !== null && whenCached !== null) {
      const age = (Date.now() - whenCached) / 1000;
      if (age < expirys) {
        const response = new Response(new Blob([cached]));
        return response.json();
      }
      sessionStorage.removeItem(hashcode);
      sessionStorage.removeItem(`${hashcode}:timestamp`);
    }
  }
  return ax
    .request(config)
    .then(checkStatus)
    .then(response => cachedSave(response, hashcode))
    .then(response => {
      return response.data;
    })
    .catch(e => {
      const response = e.response;
      let status = "", errortext = "", requestUrl = "";

      if(response){
        status = response? response.status: 400;
        errortext = response.statusText ? response.statusText : codeMessage[response.status];
        requestUrl = response.config.url;
      }


      notification.error({
        message: `请求错误 : ${requestUrl}`,
        description: errortext || '请求服务器失败',
      });

      if (401 === status) {
        window.g_app._store.dispatch({
          type: 'login/logout',
        });
      }
    });
}
