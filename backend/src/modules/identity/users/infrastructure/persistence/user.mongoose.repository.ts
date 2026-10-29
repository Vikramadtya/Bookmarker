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
    const created = await this.model.create(data as any);
    return UserMapper.toDomain(created);
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = (await this.model
      .findOne({ email })
      .lean({ virtuals: true })
      .exec()) as UserDocument | null;
    if (!doc) return null;
    return UserMapper.toDomain(doc);
  }

  async findByUsername(username: string): Promise<User | null> {
    const doc = (await this.model
      .findOne({ username })
      .lean({ virtuals: true })
      .exec()) as UserDocument | null;
    if (!doc) return null;
    return UserMapper.toDomain(doc);
  }

  async findById(id: string): Promise<User | null> {
    const doc = (await this.model
      .findById(id)
      .lean({ virtuals: true })
      .exec()) as UserDocument | null;
    if (!doc) return null;
    return UserMapper.toDomain(doc);
  }

  async update(
    filter: Record<string, unknown>,
    data: Partial<User>,
  ): Promise<User | null> {
    const updated = (await this.model
      .findOneAndUpdate(filter, data, { new: true })
      .lean({ virtuals: true })
      .exec()) as UserDocument | null;
    if (!updated) return null;
    return UserMapper.toDomain(updated);
  }
}
