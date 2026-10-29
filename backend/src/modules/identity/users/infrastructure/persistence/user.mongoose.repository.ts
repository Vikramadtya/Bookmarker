import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User as UserSchema, UserDocument } from './user.schema';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { User } from '../../domain/entities/user.entity';
import { UserMapper } from './user.mapper';

@Injectable()
export class UserMongooseRepository implements IUserRepository {
  constructor(
    @InjectModel(UserSchema.name) private model: Model<UserDocument>,
  ) {}

  async create(data: Partial<User>): Promise<User> {
    const { id: _id, ...rest } = data;
    const created: any = await this.model.create(rest);
    return UserMapper.toDomain(created.toObject());
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await this.model.findOne({ email }).lean().exec();
    return doc ? UserMapper.toDomain(doc) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const doc = await this.model.findOne({ username }).lean().exec();
    return doc ? UserMapper.toDomain(doc) : null;
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const { id: _id, ...rest } = data;
    const doc = await this.model
      .findByIdAndUpdate(id, { $set: rest }, { returnDocument: 'after' })
      .lean()
      .exec();
    return doc ? UserMapper.toDomain(doc) : null;
  }
}
