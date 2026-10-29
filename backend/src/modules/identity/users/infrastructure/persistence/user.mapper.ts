import { User } from '../../domain/entities/user.entity';

export class UserMapper {
  static toDomain(doc: any): User {
    return {
      id: String(doc._id),
      email: doc.email,
      username: doc.username,
      name: doc.name,
      picture: doc.picture,
    };
  }
}
