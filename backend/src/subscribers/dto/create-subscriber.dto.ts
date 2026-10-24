import { IsEmail, MaxLength } from 'class-validator';

export class CreateSubscriberDto {
  @IsEmail()
  @MaxLength(160)
  email: string;
}
