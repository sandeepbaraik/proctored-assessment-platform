import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class ProctoringRulesDto {
  @IsOptional()
  @IsBoolean()
  captureTabSwitch?: boolean;

  @IsOptional()
  @IsBoolean()
  captureWindowBlur?: boolean;

  @IsOptional()
  @IsBoolean()
  captureFullscreenExit?: boolean;

  @IsOptional()
  @IsBoolean()
  captureCopyPaste?: boolean;

  @IsOptional()
  @IsBoolean()
  captureRightClick?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  violationLimit?: number;
}
