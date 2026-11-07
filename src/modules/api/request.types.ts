/** Настройки запроса. */
export interface RequestOptions {
  method?: string;
  data?: object | FormData;
  responseType?: 'json' | 'empty';
}
