import modelExtend from 'dva-model-extend';
import { message } from 'antd';
import { model } from '@/common/model/BaseModel';
import {
  listDict,
  getDict,
  deleteDict,
  deleteDictItem,
  editDict,
  editDictItem,
  checkUnique,
} from '../services/DictService';

export default modelExtend(model, {
  namespace: 'dict',
  state: {
    currentItem: {},
    operateType: '',
    itemOperateType: '',
    itemValues: {},
    formValues: {},
    codeUnique: true,
  },
  effects: {
    // 校验编码唯一性
    *checkUnique({ payload }, { call, put }) {
      const response = yield call(checkUnique, payload);
      yield put({
        type: 'updateState',
        payload: {
          codeUnique: response.success,
        },
      });
    },
    // 加载字典分类
    *listDict({ payload }, { call, put }) {
      const response = yield call(listDict, payload);
      yield put({
        type: 'saveData',
        payload: response.data,
      });
    },
    // 加载字典项
    *getDict({ payload }, { call, put }) {
      const response = yield call(getDict, payload);
      yield put({
        type: 'updateState',
        payload: {
          currentItem: response.data,
          operateType: payload.operateType,
        },
      });
    },
    // 新增/编辑字典分类
    *editDict({ payload }, { call, put }) {
      const response = yield call(editDict, payload);
      if (response && response.data) {
        yield put({
          type: 'updateState',
          payload: {
            data: response.data,
            operateType: '',
            itemValues: {},
          },
        });
      } else {
        message.error(`操作失败： ${response.message ? response.message : '请联系管理员'}.`);
      }
    },
    // 新增/编辑字典项
    *editDictItem({ payload }, { call, put }) {
      const response = yield call(editDictItem, payload);
      if (response && response.data) {
        yield put({
          type: 'updateDictItem',
          payload: {
            formItem: response.data,
            itemOperateType: '',
          },
        });
      }
    },
    // 删除字典分类
    *deleteDict({ payload, callback }, { call, put }) {
      const response = yield call(deleteDict, payload);
      // 只有返回成功时才刷新
      if (response && response.success) {
        // 从当前数据对象中找到相应ID记录删除值
        yield put({
          type: 'updateState',
          payload: {
            data: response.data,
          },
        });
        if (callback) {
          callback();
        }
      } else {
        yield put({
          type: 'updateState',
          payload: {
            loading: { global: false },
          },
        });
      }
    },
    // 删除一条字典项
    *deleteDictItem({ payload }, { call, put }) {
      yield call(deleteDictItem, payload);
      const id = payload.id;
      yield put({
        type: 'removeDictItem',
        payload: {
          id,
        },
      });
    },
  },
  reducers: {
    // 更新字典项
    updateDictItem(state, action) {
      const currentItem = state.currentItem;
      // 更新/新增字典项列表
      let exist = false;
      if (currentItem && currentItem.items) {
        exist = currentItem.items.find((v, i, array) => {
          if (v.id === action.payload.formItem.id) {
            // eslint-disable-next-line no-param-reassign
            array[i] = action.payload.formItem;
            return true;
          }
          return false;
        });
      }
      if (!exist) {
        currentItem.items.push(action.payload.formItem);
      }

      return {
        ...state,
        itemOperateType: action.payload.itemOperateType,
        currentItem,
        itemValues: {},
      };
    },
    // 移除已删除得数据项
    removeDictItem(state, action) {
      const currentItem = state.currentItem;
      const id = action.payload.id;
      currentItem.items = currentItem.items.filter(i => id !== i.id);
      return {
        ...state,
        currentItem,
      };
    },
  },
});
