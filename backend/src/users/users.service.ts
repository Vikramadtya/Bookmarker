import { Injectable, ConflictException } from '@nestjs/common';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findOrCreateUser(profile: {
    email: string;
    name?: string;
    picture?: string;
  }) {
    let user = await this.usersRepository.findByEmail(profile.email);
    if (!user) {
      let baseUsername = profile.email
        .split('@')[0]
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase();
      if (!baseUsername) {
        baseUsername = 'user';
      }

      let username = baseUsername;
      let counter = 1;

      while (await this.usersRepository.findByUsername(username)) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      user = await this.usersRepository.create({
        email: profile.email,
        username,
        name: profile.name,
        picture: profile.picture,
      });
    }
    return user;
  }

  async updateUsername(userId: string, newUsername: string) {
    // Validate username (only alphanumeric and underscores)
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(newUsername)) {
      throw new ConflictException(
        'Username must be between 3 and 30 characters and contain only letters, numbers, and underscores',
      );
    }

    newUsername = newUsername.toLowerCase();

    const existing = await this.usersRepository.findByUsername(newUsername);
    if (existing && existing._id !== userId) {
      throw new ConflictException('Username is already taken');
    }

    return this.usersRepository.update(
      { _id: userId },
      { username: newUsername },
    );
  }

  async findByUsername(username: string) {
    return this.usersRepository.findByUsername(username.toLowerCase());
  }

  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }
}
