import { HttpClient } from '../utils/http-client';
import type {
  AddProductRequest,
  EditProductRequest,
  DeleteProductRequest,
  ChangeProductImageRequest,
  AddProductImageRequest,
  RemoveProductImageRequest,
  CreateCollectionRequest,
  EditCollectionRequest,
  DeleteCollectionRequest,
  SetProductVisibilityRequest,
  SetCartEnabledRequest,
  Product,
} from '../types';

export class BusinessAPI {
  constructor(
    private http: HttpClient,
    private session: string
  ) {}

  /**
   * Get products from catalog
   */
  async getProducts(phone?: string, qnt?: number): Promise<Product[]> {
    const params = new URLSearchParams();
    if (phone) params.append('phone', phone);
    if (qnt) params.append('qnt', qnt.toString());
    return this.http.get(`/api/${this.session}/get-products${params.toString() ? `?${params}` : ''}`);
  }

  /**
   * Get product by ID
   */
  async getProductById(phone: string, id: string): Promise<Product> {
    const params = new URLSearchParams({ phone, id });
    return this.http.get(`/api/${this.session}/get-product-by-id?${params}`);
  }

  /**
   * Add product to catalog
   */
  async addProduct(request: AddProductRequest): Promise<{ success: boolean; productId: string }> {
    return this.http.post(`/api/${this.session}/add-product`, request);
  }

  /**
   * Edit product
   */
  async editProduct(request: EditProductRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/edit-product`, request);
  }

  /**
   * Delete products
   */
  async deleteProducts(request: DeleteProductRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/del-products`, request);
  }

  /**
   * Change product image
   */
  async changeProductImage(request: ChangeProductImageRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/change-product-image`, request);
  }

  /**
   * Add product image
   */
  async addProductImage(request: AddProductImageRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/add-product-image`, request);
  }

  /**
   * Remove product image
   */
  async removeProductImage(request: RemoveProductImageRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/remove-product-image`, request);
  }

  /**
   * Get collections
   */
  async getCollections(phone?: string, qnt?: number, max?: number): Promise<unknown[]> {
    const params = new URLSearchParams();
    if (phone) params.append('phone', phone);
    if (qnt) params.append('qnt', qnt.toString());
    if (max) params.append('max', max.toString());
    return this.http.get(`/api/${this.session}/get-collections${params.toString() ? `?${params}` : ''}`);
  }

  /**
   * Create collection
   */
  async createCollection(request: CreateCollectionRequest): Promise<{ success: boolean; collectionId: string }> {
    return this.http.post(`/api/${this.session}/create-collection`, request);
  }

  /**
   * Edit collection
   */
  async editCollection(request: EditCollectionRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/edit-collection`, request);
  }

  /**
   * Delete collection
   */
  async deleteCollection(request: DeleteCollectionRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/del-collection`, request);
  }

  /**
   * Set product visibility
   */
  async setProductVisibility(request: SetProductVisibilityRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/set-product-visibility`, request);
  }

  /**
   * Set cart enabled
   */
  async setCartEnabled(request: SetCartEnabledRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/set-cart-enabled`, request);
  }
}
