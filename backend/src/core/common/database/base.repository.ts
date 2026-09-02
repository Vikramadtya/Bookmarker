import { Document, Model } from 'mongoose';

export abstract class BaseRepository<T extends Document<any>> {
  constructor(protected readonly model: Model<T>) {}

  async create(createEntityData: unknown): Promise<T> {
    const entity = new this.model(createEntityData as any);
    return entity.save();
  }

  async findOne(filterQuery: Record<string, any>): Promise<T | null> {
    return this.model.findOne(filterQuery).lean({ virtuals: true }).exec();
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findById(id).lean({ virtuals: true }).exec();
  }

  async findAll(filterQuery: Record<string, any> = {}): Promise<T[]> {
    return this.model.find(filterQuery).lean({ virtuals: true }).exec();
  }

  async update(
    filterQuery: Record<string, any>,
    updateData: Record<string, any>,
  ): Promise<T | null> {
    return this.model
      .findOneAndUpdate(filterQuery, updateData, {
        new: true,
        runValidators: true,
      })
      .lean({ virtuals: true })
      .exec();
  }

  async updateById(
    id: string,
    updateData: Record<string, any>,
  ): Promise<T | null> {
    return this.model
      .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .lean({ virtuals: true })
      .exec();
  }

  async delete(filterQuery: Record<string, any>): Promise<boolean> {
    const result = await this.model.deleteOne(filterQuery).exec();
    return result.deletedCount >= 1;
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }

  async deleteMany(filterQuery: Record<string, any>): Promise<boolean> {
    const result = await this.model.deleteMany(filterQuery).exec();
    return result.deletedCount >= 1;
  }
}
