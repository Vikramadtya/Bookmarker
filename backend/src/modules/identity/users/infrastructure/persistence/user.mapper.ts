import { User } from '../../domain/entities/user.entity';
import { UserDocument } from './user.schema';

export class UserMapper {
  static toDomain(doc: UserDocument): User {
    return new User(
      doc._id.toString(),
      doc.email,
      doc.username,
      doc.name,
      doc.picture,
    );
  }

  static toDomainList(docs: UserDocument[]): User[] {
    return docs.map((doc) => UserMapper.toDomain(doc));
  }
}
