import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  private products: any[] = [];

  findAll() {
    return this.products;
  }

  findOne(id: number) {
    const product = this.products.find((p) => p.id === id);
    if (!product) throw new NotFoundException(`Product #${id} not found`);
    return product;
  }

  create(createProductDto: CreateProductDto) {
    const product = { id: Date.now(), ...createProductDto };
    this.products.push(product);
    return product;
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) throw new NotFoundException(`Product #${id} not found`);
    this.products[index] = { ...this.products[index], ...updateProductDto };
    return this.products[index];
  }

  remove(id: number) {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) throw new NotFoundException(`Product #${id} not found`);
    this.products.splice(index, 1);
    return { message: `Product #${id} removed` };
  }
}
