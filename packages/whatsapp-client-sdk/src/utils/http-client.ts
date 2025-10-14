import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  WhatsAppAPIError,
  WhatsAppAuthenticationError,
  WhatsAppValidationError,
  WhatsAppNetworkError,
} from './errors';

export interface HttpClientOptions {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export class HttpClient {
  private client: AxiosInstance;

  constructor(options: HttpClientOptions) {
    this.client = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;

          if (status === 401) {
            throw new WhatsAppAuthenticationError(
              data?.message || 'Authentication failed',
              data
            );
          } else if (status === 400) {
            throw new WhatsAppValidationError(
              data?.message || 'Validation error',
              data
            );
          } else {
            throw new WhatsAppAPIError(
              data?.message || 'API request failed',
              status,
              data
            );
          }
        } else if (error.request) {
          throw new WhatsAppNetworkError(
            'Network error: No response received',
            error
          );
        } else {
          throw new WhatsAppNetworkError(
            `Request setup error: ${error.message}`,
            error
          );
        }
      }
    );
  }

  public setAuthToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  public removeAuthToken(): void {
    delete this.client.defaults.headers.common['Authorization'];
  }

  public async get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  public async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }

  public async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  public async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config);
    return response.data;
  }

  public async delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }
}
