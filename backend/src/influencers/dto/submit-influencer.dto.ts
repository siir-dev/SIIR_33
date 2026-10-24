import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class WalletDto {
  @IsIn(['solana', 'robinhood'])
  chainKey: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  address: string;
}

export class SubmitInfluencerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @IsString()
  @Matches(/^@?[A-Za-z0-9_]{1,15}$/, { message: 'handle must be a valid X handle' })
  handle: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  bio?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => WalletDto)
  wallets: WalletDto[];

  @IsOptional()
  @IsUrl({ require_protocol: true })
  website?: string;

  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(600)
  rationale?: string;

  /** The wallet that signs the nomination. */
  @IsString()
  @IsNotEmpty()
  submitterWallet: string;

  /** Signature of `Nominate: <name> (@<handle>) by <submitterWallet>`; hex for Solana, 0x-hex for EVM. */
  @IsString()
  @IsNotEmpty()
  signature: string;
}
