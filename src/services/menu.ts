import request from '@/utils/request';

export async function getMenuData(): Promise<any> {
  return request('/auth/menus');
}
