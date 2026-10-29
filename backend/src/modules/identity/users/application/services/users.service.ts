import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { User } from '../../domain/entities/user.entity';

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;
const isDuplicateKey = (err: any) => err?.code === 11000;

@Injectable()
export class UsersService {
  constructor(
    @Inject('IUserRepository')
    private readonly usersRepository: IUserRepository,
  ) {}

  async findOrCreateUser(profile: {
    email: string;
    name?: string;
    picture?: string;
  }): Promise<User> {
    const email = profile.email.toLowerCase();
    const existing = await this.usersRepository.findByEmail(email);
    if (existing) return existing;

    const base =
      email
        .split('@')[0]
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase()
        .slice(0, 24) || 'user';

    // Rely on the unique indexes instead of probing for a free username first.
    for (let attempt = 0; attempt < 5; attempt++) {
      const username =
        attempt === 0 ? base : `${base}${randomInt(1000, 99999)}`;
      try {
        return await this.usersRepository.create({
          email,
          username,
          name: profile.name,
          picture: profile.picture,
        });
      } catch (err) {
        if (!isDuplicateKey(err)) throw err;
        const raced = await this.usersRepository.findByEmail(email);
        if (raced) return raced; // another request created this user first
      }
    }
    throw new ConflictException('Could not allocate a username');
  }

  async updateUsername(userId: string, newUsername: string) {
    if (!USERNAME_PATTERN.test(newUsername)) {
      throw new BadRequestException(
        'Username must be 3-30 characters: letters, numbers and underscores only',
      );
    }
    const username = newUsername.toLowerCase();

    const taken = await this.usersRepository.findByUsername(username);
    if (taken && taken.id !== userId)
      throw new ConflictException('Username is already taken');

    try {
      return await this.usersRepository.update(userId, { username });
    } catch (err) {
      if (isDuplicateKey(err))
        throw new ConflictException('Username is already taken');
      throw err;
    }
  }

  findByUsername(username: string) {
    return this.usersRepository.findByUsername(username.toLowerCase());
  }

  findByEmail(email: string) {
    return this.usersRepository.findByEmail(email.toLowerCase());
  }
}
