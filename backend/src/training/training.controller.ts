import { Controller, Get } from '@nestjs/common';

@Controller('training-hub')
export class TrainingController {
  @Get()
  findAll() {
    return [
      {
        moduleId: 'TH001',
        title: 'Safe Excavation Practices',
        format: 'article',
        content: '...',
      },
    ];
  }
}
