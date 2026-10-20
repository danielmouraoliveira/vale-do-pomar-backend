
import { IsInt, IsObject, Min } from 'class-validator';

export class SaveFarmDto {
  @IsObject()
  data!: Record<string, unknown>;

  @IsInt()
  @Min(1)
  version!: number;

  @IsInt()
  @Min(0)
  revision!: number;
}
