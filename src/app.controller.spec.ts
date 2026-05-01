import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return API status object', () => {
      const result = appController.getStatus();
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('status', 'healthy');
      expect(result).toHaveProperty('endpoints');
    });
  });
});
