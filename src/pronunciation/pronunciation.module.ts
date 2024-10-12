import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PronunciationController } from './pronunciation.controller';
import { PronunciationService } from './pronunciation.service';
import { Pronunciation } from './entities/pronunciation.entity'; // Import entity của bạn

@Module({
  imports: [
    TypeOrmModule.forFeature([Pronunciation]), // Đăng ký entity Pronunciation
  ],
  controllers: [PronunciationController],
  providers: [PronunciationService],
})
export class PronunciationModule {}
