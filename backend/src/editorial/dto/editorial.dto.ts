import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateDossierDto {
  @IsString()
  @IsNotEmpty()
  influencerId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  /** "Why they're Seen": 2-3 editorial sentences. */
  @IsString()
  @IsNotEmpty()
  body: string;

  @IsString()
  @IsNotEmpty()
  verdict: string;

  @IsString()
  @IsNotEmpty()
  methodologyVersion: string;

  @IsOptional()
  @IsBoolean()
  aiDrafted?: boolean;

  /** Narrative lead, 0-100. Only an editor can judge whether a mind called a theme before it trended. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  narrativeLead?: number;
}

export class PublishEpochDto {
  /** Defaults to the next epoch number. */
  @IsOptional()
  @IsInt()
  @Min(1)
  number?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  durationDays?: number;
}

export class DecohereDto {
  @IsString()
  @IsNotEmpty()
  influencerId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
