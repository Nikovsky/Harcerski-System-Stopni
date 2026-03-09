// @file: apps/api/src/app.controller.ts
import { Controller, Get, Header } from '@nestjs/common';
import { Public } from './decorators/public.decorator';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @Header('Content-Type', 'application/json')
  @Public()
  getHealth() {
    return this.appService.getHealth();
  }
}
