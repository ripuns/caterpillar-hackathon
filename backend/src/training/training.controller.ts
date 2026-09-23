import { Controller, Get, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

interface TrainingModule {
  moduleId: string;
  title: string;
  format: 'article';
  content: string;
}

@Controller('training-hub')
export class TrainingController implements OnModuleInit {
  private readonly logger = new Logger(TrainingController.name);
  private modules: TrainingModule[] = [];

  onModuleInit() {
    const filePath = join(process.cwd(), '..', 'data-ml', 'data', 'training-content.json');
    const raw = readFileSync(filePath, 'utf-8');
    this.modules = JSON.parse(raw);
    this.logger.log(`Loaded ${this.modules.length} training modules`);
  }

  @Get()
  findAll(): TrainingModule[] {
    return this.modules;
  }
}
